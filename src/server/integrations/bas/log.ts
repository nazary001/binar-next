import "server-only";
import type { Filter } from "mongodb";
import {
  BAS_ENTITIES,
  BAS_LIMITS,
  type BasEntity,
  type BasLastCall,
  type BasStatusDto,
  type ExchangeCounts,
  type ExchangeLogDto,
} from "@/components/admin/integrations/types";
import { getSettings } from "../../admin/settings";
import { collection, type ExchangeLogDoc } from "../../db/collections";
import { newId } from "../../ids";
import { kyivToday } from "../../time";
import { countApiKeys } from "../keys";
import { queueCounts } from "./queue";
import { kyivMidnight } from "./values";

// The journal of the exchanges (collection `exchange_log`): one row per
// call of the machine API, written by bas/handler.ts, and the reads the
// panel's journal and status card make of it. Rows expire after 90 days
// (TTL index on expiresAt).

export const EMPTY_COUNTS: ExchangeCounts = { received: 0, created: 0, updated: 0, unchanged: 0, failed: 0 };

export type NewLogRow = Omit<ExchangeLogDoc, "_id" | "expiresAt">;

// A failed journal write must never turn a good answer into an error.
export async function writeExchangeLog(row: NewLogRow): Promise<void> {
  try {
    await (await collection("exchangeLog")).insertOne({
      ...row,
      _id: newId("xl"),
      details: row.details.slice(0, 20),
      expiresAt: new Date(row.at.getTime() + BAS_LIMITS.logDays * 86_400_000),
    });
  } catch (error) {
    console.error("[bas] exchange log write failed:", error);
  }
}

export function toExchangeLogDto(doc: ExchangeLogDoc): ExchangeLogDto {
  return {
    id: doc._id,
    at: doc.at.toISOString(),
    system: doc.system,
    direction: doc.direction,
    entity: doc.entity,
    action: doc.action,
    status: doc.status,
    counts: { ...EMPTY_COUNTS, ...doc.counts },
    durationMs: doc.durationMs,
    actor: doc.actor ? { id: doc.actor.id, name: doc.actor.name, kind: doc.actor.kind } : null,
    batchId: doc.batchId,
    error: doc.error,
    details: Array.isArray(doc.details) ? doc.details.slice(0, 20) : [],
  };
}

export type LogFilter = {
  system?: ExchangeLogDoc["system"];
  entity?: string;
  status?: ExchangeLogDoc["status"];
  direction?: ExchangeLogDoc["direction"];
  // "YYYY-MM-DD", Kyiv days, both inclusive.
  from?: string;
  to?: string;
  // Matches the batch id or the key name (already escaped by contains()).
  q?: RegExp;
};

export function logFilter(input: LogFilter): Filter<ExchangeLogDoc> {
  const filter: Filter<ExchangeLogDoc> = {};
  if (input.system) filter.system = input.system;
  if (input.entity) filter.entity = input.entity;
  if (input.status) filter.status = input.status;
  if (input.direction) filter.direction = input.direction;
  if (input.from || input.to) {
    const at: { $gte?: Date; $lt?: Date } = {};
    if (input.from) at.$gte = kyivMidnight(input.from);
    if (input.to) at.$lt = new Date(kyivMidnight(input.to).getTime() + 86_400_000);
    filter.at = at;
  }
  if (input.q) filter.$or = [{ batchId: input.q }, { "actor.name": input.q }, { error: input.q }];
  return filter;
}

async function lastCall(entity: BasEntity): Promise<BasLastCall | null> {
  const doc = await (await collection("exchangeLog")).findOne(
    { system: "bas", entity },
    { sort: { at: -1 }, projection: { at: 1, action: 1, status: 1, counts: 1, error: 1 } },
  );
  if (!doc) return null;
  return {
    at: doc.at.toISOString(),
    action: doc.action,
    status: doc.status,
    counts: { ...EMPTY_COUNTS, ...doc.counts },
    error: doc.error ?? null,
  };
}

type DayTotals = BasStatusDto["today"];

async function todayTotals(): Promise<DayTotals> {
  const since = kyivMidnight(kyivToday());
  const rows = await (await collection("exchangeLog"))
    .aggregate<DayTotals>([
      { $match: { system: "bas", at: { $gte: since } } },
      {
        $group: {
          _id: null,
          calls: { $sum: 1 },
          errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
          received: { $sum: "$counts.received" },
          created: { $sum: "$counts.created" },
          updated: { $sum: "$counts.updated" },
          unchanged: { $sum: "$counts.unchanged" },
          failed: { $sum: "$counts.failed" },
        },
      },
      { $project: { _id: 0 } },
    ])
    .toArray();
  return rows[0] ?? { calls: 0, errors: 0, ...EMPTY_COUNTS };
}

// The status card of /admin/integrations/bas.
export async function basStatus(): Promise<BasStatusDto> {
  const [settings, keys, queue, today, ...last] = await Promise.all([
    getSettings("bas"),
    countApiKeys(),
    queueCounts(),
    todayTotals(),
    ...BAS_ENTITIES.map((entity) => lastCall(entity)),
  ]);
  return {
    enabled: settings.enabled,
    mode: settings.mode,
    keys,
    queue,
    last: Object.fromEntries(BAS_ENTITIES.map((entity, i) => [entity, last[i] ?? null])) as Record<
      BasEntity,
      BasLastCall | null
    >,
    today,
  };
}
