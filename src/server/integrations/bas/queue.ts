import "server-only";
import type { Filter, UpdateFilter } from "mongodb";
import type { ExchangeQueueDto, QueueKind, QueueState } from "@/components/admin/integrations/types";
import type { ListQuery } from "../../admin/list";
import { getSettings } from "../../admin/settings";
import {
  collection,
  type Actor,
  type ErpLink,
  type ExchangeQueueDoc,
  type OrderDoc,
  type OrderHistoryEntry,
  type ReturnDoc,
} from "../../db/collections";
import { newId } from "../../ids";
import { lineSum, sum } from "../../money";

// The queue of what BAS has to pick up (collection `exchange_queue`): new
// orders and return requests. BAS reads it in `seq` order
// (GET /orders?after=<seq>) and acknowledges each entry; an entry stays
// "pending" until then, so a pull that failed on BAS's side is simply
// repeated.
//
// `enqueueErp` is how a record gets in: the storefront calls it when an
// order is placed or a return requested, the panel when staff send one by
// hand. It is idempotent (the unique index on kind + entityId), takes its
// seq from the counters collection, and marks the record's ERP link
// "pending". The automatic path respects the settings: nothing is queued
// while the exchange is off, and an order of a channel that is not
// exported is marked "skipped". Staff sending a record by hand override
// both.

export const QUEUE_COUNTER = "exchange-queue";

export async function nextQueueSeq(): Promise<number> {
  const counters = await collection("counters");
  const doc = await counters.findOneAndUpdate(
    { _id: QUEUE_COUNTER },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) throw new Error("queue counter missing");
  return doc.seq;
}

export type EnqueueOutcome =
  | { state: "queued"; entry: ExchangeQueueDoc }
  | { state: "exists"; entry: ExchangeQueueDoc }
  | { state: "skipped" }
  | { state: "disabled" }
  | { state: "not-found" };

export type EnqueueOptions = {
  // Staff sent it by hand: the exchange switch and the export settings do
  // not apply.
  manual?: boolean;
  // Who queued it, for the record's history (the system by default).
  actor?: Actor;
};

const SYSTEM: Actor = { id: "system", name: "Система", kind: "system" };

function pendingLink(now: Date): ErpLink {
  return { externalId: null, number: null, state: "pending", queuedAt: now, ackedAt: null, error: null };
}

export async function enqueueErp(kind: QueueKind, entityId: string, options: EnqueueOptions = {}): Promise<EnqueueOutcome> {
  const queue = await collection("exchangeQueue");
  const existing = await queue.findOne({ kind, entityId });
  if (existing) return { state: "exists", entry: existing };

  const orders = await collection("orders");
  const returns = await collection("returns");
  const target =
    kind === "order"
      ? await orders.findOne({ _id: entityId }, { projection: { channel: 1, erp: 1 } })
      : await returns.findOne({ _id: entityId }, { projection: { erp: 1 } });
  if (!target) return { state: "not-found" };

  const now = new Date();
  if (!options.manual) {
    const settings = await getSettings("bas");
    if (!settings.enabled) return { state: "disabled" };
    if (kind === "order") {
      const channel = (target as Pick<OrderDoc, "channel">).channel;
      const exported = channel === "retail" ? settings.exportRetailOrders : settings.exportPartnerOrders;
      if (!exported) {
        await orders.updateOne(
          { _id: entityId },
          { $set: { erp: { ...pendingLink(now), state: "skipped", queuedAt: null } } },
        );
        return { state: "skipped" };
      }
    }
  }

  const entry: ExchangeQueueDoc = {
    _id: newId("q"),
    seq: await nextQueueSeq(),
    kind,
    entityId,
    state: "pending",
    attempts: 0,
    createdAt: now,
    ackedAt: null,
    ack: null,
    error: null,
  };
  try {
    await queue.insertOne(entry);
  } catch (error) {
    // Queued meanwhile by a parallel call: that entry stands (its seq is
    // used, this one is simply skipped).
    if ((error as { code?: number }).code !== 11000) throw error;
    const raced = await queue.findOne({ kind, entityId });
    if (raced) return { state: "exists", entry: raced };
    throw error;
  }

  const actor = options.actor ?? SYSTEM;
  const history: OrderHistoryEntry = { at: now, by: actor, type: "erp", to: "pending", text: "Передано в чергу обміну з BAS" };
  // What BAS called the record before (a status push) stays known.
  const link: ErpLink = { ...pendingLink(now), externalId: target.erp?.externalId ?? null, number: target.erp?.number ?? null };
  const update = { $set: { erp: link, updatedAt: now }, $push: { history } };
  if (kind === "order") await orders.updateOne({ _id: entityId }, update as UpdateFilter<OrderDoc>);
  else await returns.updateOne({ _id: entityId }, update as UpdateFilter<ReturnDoc>);
  return { state: "queued", entry };
}

// The pending entries after a cursor, in seq order.
export async function pendingEntries(kind: QueueKind, after: number, limit: number): Promise<ExchangeQueueDoc[]> {
  return (await collection("exchangeQueue"))
    .find({ kind, state: "pending", seq: { $gt: after } })
    .sort({ seq: 1 })
    .limit(limit)
    .toArray();
}

// Entries whose order or return no longer exists leave the queue as
// failed, so they do not stall every pull.
export async function markMissing(entries: ExchangeQueueDoc[]): Promise<void> {
  if (entries.length === 0) return;
  await (await collection("exchangeQueue")).updateMany(
    { _id: { $in: entries.map((entry) => entry._id) }, state: "pending" },
    { $set: { state: "error", error: "record-missing" } },
  );
}

export type AckInput = { entityId: string; externalId: string | null; number: string | null; error: string | null };

export type AckOutcome = { status: "acked" | "unchanged" } | { status: "error"; error: string };

// BAS took the record (or could not: `error`). Repeating an ack is a
// no-op; an ack of an entry that is not in the queue is an error row.
export async function ackEntry(kind: QueueKind, input: AckInput, actor: Actor): Promise<AckOutcome> {
  const queue = await collection("exchangeQueue");
  const entry = await queue.findOne({ kind, entityId: input.entityId });
  if (!entry) return { status: "error", error: "not-queued" };
  const now = new Date();
  const orders = await collection("orders");
  const returns = await collection("returns");
  const target =
    kind === "order"
      ? await orders.findOne({ _id: input.entityId }, { projection: { erp: 1 } })
      : await returns.findOne({ _id: input.entityId }, { projection: { erp: 1 } });

  if (input.error) {
    if (entry.state === "error" && entry.error === input.error) return { status: "unchanged" };
    await queue.updateOne(
      { _id: entry._id },
      { $set: { state: "error", error: input.error, ackedAt: null }, $inc: { attempts: 1 } },
    );
    if (target) {
      const link: ErpLink = { ...(target.erp ?? pendingLink(now)), state: "error", error: input.error };
      const history: OrderHistoryEntry = { at: now, by: actor, type: "erp", to: "error", text: `BAS не прийняв: ${input.error}` };
      const update = { $set: { erp: link, updatedAt: now }, $push: { history } };
      if (kind === "order") await orders.updateOne({ _id: input.entityId }, update as UpdateFilter<OrderDoc>);
      else await returns.updateOne({ _id: input.entityId }, update as UpdateFilter<ReturnDoc>);
    }
    return { status: "error", error: "recorded: the entry is marked as failed" };
  }

  const ack = { externalId: input.externalId, number: input.number };
  if (entry.state === "acked" && entry.ack?.externalId === ack.externalId && entry.ack?.number === ack.number) {
    return { status: "unchanged" };
  }
  await queue.updateOne({ _id: entry._id }, { $set: { state: "acked", ackedAt: now, ack, error: null } });
  if (target) {
    const link: ErpLink = {
      externalId: ack.externalId,
      number: ack.number ?? target.erp?.number ?? null,
      state: "acked",
      queuedAt: target.erp?.queuedAt ?? entry.createdAt,
      ackedAt: now,
      error: null,
    };
    const history: OrderHistoryEntry = {
      at: now,
      by: actor,
      type: "erp",
      to: "acked",
      text: ack.number ? `Прийнято в BAS: №${ack.number}` : "Прийнято в BAS",
    };
    const update = { $set: { erp: link, updatedAt: now }, $push: { history } };
    if (kind === "order") await orders.updateOne({ _id: input.entityId }, update as UpdateFilter<OrderDoc>);
    else await returns.updateOne({ _id: input.entityId }, update as UpdateFilter<ReturnDoc>);
  }
  return { status: "acked" };
}

// An entry that failed, or one BAS should take again, goes back to the
// queue under a new seq: a BAS cursor already past its old seq still sees
// it.
export async function retryEntry(id: string, actor: Actor): Promise<ExchangeQueueDoc | "not-found" | "state"> {
  const queue = await collection("exchangeQueue");
  const entry = await queue.findOne({ _id: id });
  if (!entry) return "not-found";
  if (entry.state === "pending") return "state";
  const now = new Date();
  const updated = await queue.findOneAndUpdate(
    { _id: id, state: entry.state },
    { $set: { state: "pending", seq: await nextQueueSeq(), error: null, ackedAt: null } },
    { returnDocument: "after" },
  );
  if (!updated) return "state";
  const history: OrderHistoryEntry = { at: now, by: actor, type: "erp", to: "pending", text: "Повторно передано в чергу обміну з BAS" };
  const orders = await collection("orders");
  const returns = await collection("returns");
  const target =
    entry.kind === "order"
      ? await orders.findOne({ _id: entry.entityId }, { projection: { erp: 1 } })
      : await returns.findOne({ _id: entry.entityId }, { projection: { erp: 1 } });
  if (target) {
    // What BAS called the record before stays known.
    const link: ErpLink = { ...(target.erp ?? pendingLink(now)), state: "pending", error: null, queuedAt: now, ackedAt: null };
    const update = { $set: { erp: link, updatedAt: now }, $push: { history } };
    if (entry.kind === "order") await orders.updateOne({ _id: entry.entityId }, update as UpdateFilter<OrderDoc>);
    else await returns.updateOne({ _id: entry.entityId }, update as UpdateFilter<ReturnDoc>);
  }
  return updated;
}

export async function findQueueEntry(id: string): Promise<ExchangeQueueDoc | null> {
  return (await collection("exchangeQueue")).findOne({ _id: id });
}

export async function queueCounts(): Promise<{ pending: number; acked: number; errors: number; oldestPendingAt: string | null }> {
  const queue = await collection("exchangeQueue");
  const [pending, acked, errors, oldest] = await Promise.all([
    queue.countDocuments({ state: "pending" }),
    queue.countDocuments({ state: "acked" }),
    queue.countDocuments({ state: "error" }),
    queue.findOne({ state: "pending" }, { sort: { seq: 1 }, projection: { createdAt: 1 } }),
  ]);
  return { pending, acked, errors, oldestPendingAt: oldest ? oldest.createdAt.toISOString() : null };
}

// --- the panel's list ----------------------------------------------------------

type Summary = Pick<ExchangeQueueDto, "number" | "label" | "total" | "channel" | "missing">;

async function summaries(entries: ExchangeQueueDoc[]): Promise<Map<string, Summary>> {
  const orderIds = entries.filter((e) => e.kind === "order").map((e) => e.entityId);
  const returnIds = entries.filter((e) => e.kind === "return").map((e) => e.entityId);
  const returns = returnIds.length
    ? await (await collection("returns"))
        .find({ _id: { $in: returnIds } }, { projection: { orderId: 1, clientId: 1, lines: 1 } })
        .toArray()
    : [];
  const allOrderIds = [...new Set([...orderIds, ...returns.map((r) => r.orderId)])];
  const orders = allOrderIds.length
    ? await (await collection("orders"))
        .find(
          { _id: { $in: allOrderIds } },
          { projection: { number: 1, channel: 1, clientId: 1, total: 1, items: 1, checkout: 1, counterparty: 1 } },
        )
        .toArray()
    : [];
  const orderById = new Map(orders.map((order) => [order._id, order]));
  const clientIds = [
    ...new Set([
      ...orders.flatMap((order) => (order.clientId ? [order.clientId] : [])),
      ...returns.map((r) => r.clientId),
    ]),
  ];
  const clients = clientIds.length
    ? await (await collection("clients")).find({ _id: { $in: clientIds } }, { projection: { name: 1 } }).toArray()
    : [];
  const clientName = new Map(clients.map((client) => [client._id, client.name]));

  const result = new Map<string, Summary>();
  for (const entry of entries) {
    if (entry.kind === "order") {
      const order = orderById.get(entry.entityId);
      if (!order) {
        result.set(entry._id, { number: null, label: "", total: null, channel: null, missing: true });
        continue;
      }
      const label =
        order.channel === "b2b"
          ? (clientName.get(order.clientId) ?? order.counterparty ?? "")
          : order.checkout?.company || order.checkout?.name || "";
      result.set(entry._id, { number: order.number, label, total: order.total, channel: order.channel, missing: false });
    } else {
      const ret = returns.find((r) => r._id === entry.entityId);
      const order = ret ? orderById.get(ret.orderId) : undefined;
      if (!ret) {
        result.set(entry._id, { number: null, label: "", total: null, channel: null, missing: true });
        continue;
      }
      let total: number | null = null;
      if (order && order.channel === "b2b") {
        total = sum(
          ret.lines.map((line) => {
            const item = order.items.find((it) => it.id === line.itemId);
            return item ? lineSum(item.price, line.qty) : 0;
          }),
        );
      }
      result.set(entry._id, {
        number: order?.number ?? ret.orderId,
        label: clientName.get(ret.clientId) ?? "",
        total,
        channel: order?.channel ?? null,
        missing: false,
      });
    }
  }
  return result;
}

export function toQueueDto(entry: ExchangeQueueDoc, summary: Summary | undefined): ExchangeQueueDto {
  return {
    id: entry._id,
    seq: entry.seq,
    kind: entry.kind,
    entityId: entry.entityId,
    state: entry.state,
    attempts: entry.attempts ?? 0,
    createdAt: entry.createdAt.toISOString(),
    ackedAt: entry.ackedAt ? entry.ackedAt.toISOString() : null,
    ack: entry.ack ? { externalId: entry.ack.externalId ?? null, number: entry.ack.number ?? null } : null,
    error: entry.error ?? null,
    ...(summary ?? { number: null, label: "", total: null, channel: null, missing: true }),
  };
}

export async function queueDto(entry: ExchangeQueueDoc): Promise<ExchangeQueueDto> {
  return toQueueDto(entry, (await summaries([entry])).get(entry._id));
}

export async function listQueue(
  query: Pick<ListQuery, "page" | "limit" | "sort">,
  filter: { state?: QueueState; kind?: QueueKind; entityId?: string },
): Promise<{ items: ExchangeQueueDto[]; total: number; page: number; limit: number }> {
  const where: Filter<ExchangeQueueDoc> = {};
  if (filter.state) where.state = filter.state;
  if (filter.kind) where.kind = filter.kind;
  if (filter.entityId) where.entityId = filter.entityId;
  const queue = await collection("exchangeQueue");
  const [docs, total] = await Promise.all([
    queue
      .find(where)
      .sort(query.sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray(),
    queue.countDocuments(where),
  ]);
  const map = await summaries(docs);
  return { items: docs.map((doc) => toQueueDto(doc, map.get(doc._id))), total, page: query.page, limit: query.limit };
}
