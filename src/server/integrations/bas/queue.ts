import "server-only";
import type { ClientSession, Filter, UpdateFilter } from "mongodb";
import {
  QUEUE_STALE_MS,
  type BasPushOutcome,
  type ExchangeQueueDto,
  type QueueKind,
  type QueueState,
} from "@/components/admin/integrations/types";
import type { ListQuery } from "../../admin/list";
import { getSettings, type SettingsOf } from "../../admin/settings";
import { getClient } from "../../db/client";
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
import { activePushTarget, postQueueEntry, toOutcome } from "./push";

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
//
// The seq and the write that carries it are one transaction (withQueueSeq):
// BAS keeps the last seq it saw as its cursor, so an entry must never
// become visible after one with a higher seq. Two transactions that both
// take a seq conflict on the counter, the second one starts again after
// the first has committed, so seqs become visible in their own order and
// a cursor never passes one that is still being written.
//
// In the push mode (push.ts) a freshly queued entry is also posted to the
// BAS address at once, inside the same call (the storefront runs it in
// after(), so the post happens within that scope): a 2xx answer acks the
// entry, anything else leaves it pending with the error and one more
// attempt. The queue stays the fallback either way: an address that does
// not work never loses an order.

export const QUEUE_COUNTER = "exchange-queue";

// Takes the next seq and runs `write` with it in one transaction: the seq
// and the entry that carries it commit together (or not at all: a failed
// write takes nothing from the counter). `write` must do all its database
// work through `session`; the driver repeats the whole callback after a
// write conflict, so it must not have other effects.
export async function withQueueSeq<T>(write: (seq: number, session: ClientSession) => Promise<T>): Promise<T> {
  const session = (await getClient()).startSession();
  // What the last (the committed) run of the callback answered.
  const box: { done: boolean; value?: T } = { done: false };
  try {
    await session.withTransaction(async () => {
      box.done = false;
      const counters = await collection("counters");
      const doc = await counters.findOneAndUpdate(
        { _id: QUEUE_COUNTER },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after", session },
      );
      if (!doc) throw new Error("queue counter missing");
      box.value = await write(doc.seq, session);
      box.done = true;
    });
  } finally {
    await session.endSession();
  }
  if (!box.done) throw new Error("queue transaction did not run");
  return box.value as T;
}

export type EnqueueOutcome =
  // `push`: what the post to the BAS address came to (push mode only);
  // `entry` is then as it stands after that post.
  | { state: "queued"; entry: ExchangeQueueDoc; push?: BasPushOutcome }
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
  let settings: BasSettings | undefined;
  if (!options.manual) {
    settings = await getSettings("bas");
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

  let entry: ExchangeQueueDoc;
  try {
    entry = await withQueueSeq(async (seq, session) => {
      const doc: ExchangeQueueDoc = {
        _id: newId("q"),
        seq,
        kind,
        entityId,
        state: "pending",
        attempts: 0,
        createdAt: now,
        ackedAt: null,
        ack: null,
        error: null,
      };
      await queue.insertOne(doc, { session });
      return doc;
    });
  } catch (error) {
    // Queued meanwhile by a parallel call: that entry stands (the
    // transaction took nothing from the counter).
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
  const delivered = await deliverEntry(entry, actor, settings);
  return delivered ? { state: "queued", entry: delivered.entry, push: delivered.push } : { state: "queued", entry };
}

// --- the push mode ------------------------------------------------------------

type BasSettings = SettingsOf<"bas">;

// Who acknowledged an entry that BAS took at its push address.
const PUSH_ACTOR: Actor = { id: "bas-push", name: "BAS", kind: "integration" };

export type Delivery = { entry: ExchangeQueueDoc; push: BasPushOutcome };

// Posts a pending entry to the BAS address when the push mode is active
// (null when it is not, and then nothing happened). A 2xx answer acks the
// entry like POST /orders/ack would (with the GUID and number BAS answered,
// else the ones it gave before); anything else leaves it pending with the
// error and one more attempt, still served by the pull endpoints. Never
// throws: a broken address or database hiccup must not fail the order or
// the panel action that queued it.
export async function deliverEntry(
  entry: ExchangeQueueDoc,
  actor: Actor,
  settings?: BasSettings,
): Promise<Delivery | null> {
  try {
    const target = activePushTarget(settings ?? (await getSettings("bas")));
    if (!target) return null;
    const posted = await postQueueEntry(target, entry, actor);
    const queue = await collection("exchangeQueue");
    if (posted.ok) {
      const current = await queue.findOne({ _id: entry._id });
      // BAS may have pulled and acked it meanwhile: that ack stands.
      if (current?.state === "pending") {
        await ackEntry(
          entry.kind,
          {
            entityId: entry.entityId,
            externalId: posted.ack?.externalId ?? current.ack?.externalId ?? null,
            number: posted.ack?.number ?? current.ack?.number ?? null,
            error: null,
          },
          PUSH_ACTOR,
        );
      }
    } else {
      await queue.updateOne({ _id: entry._id, state: "pending" }, { $set: { error: posted.error }, $inc: { attempts: 1 } });
    }
    return { entry: (await queue.findOne({ _id: entry._id })) ?? entry, push: toOutcome(posted) };
  } catch (error) {
    console.error("[bas] push of a queue entry failed:", error);
    return null;
  }
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

// A pending entry BAS has not taken for this long may be put back under a
// new seq too: a cursor that went past it (an older version could hand
// out seqs out of order) would otherwise never see it again.
export function isStalePending(entry: Pick<ExchangeQueueDoc, "state" | "error" | "createdAt">, now: number = Date.now()): boolean {
  return entry.state === "pending" && !entry.error && entry.createdAt.getTime() <= now - QUEUE_STALE_MS;
}

// An entry that failed, or one BAS should take again, goes back to the
// queue under a new seq: a BAS cursor already past its old seq still sees
// it. A pending entry can be retried only when its last post to the push
// address failed (it carries that error; the route then posts it again)
// or when it has waited longer than QUEUE_STALE_MS.
export async function retryEntry(id: string, actor: Actor): Promise<ExchangeQueueDoc | "not-found" | "state"> {
  const queue = await collection("exchangeQueue");
  const entry = await queue.findOne({ _id: id });
  if (!entry) return "not-found";
  if (entry.state === "pending" && !entry.error && !isStalePending(entry)) return "state";
  const now = new Date();
  const updated = await withQueueSeq((seq, session) =>
    queue.findOneAndUpdate(
      { _id: id, state: entry.state, seq: entry.seq },
      { $set: { state: "pending", seq, error: null, ackedAt: null } },
      { returnDocument: "after", session },
    ),
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
    stale: isStalePending(entry),
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
