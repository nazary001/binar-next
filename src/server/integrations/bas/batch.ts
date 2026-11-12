import "server-only";
import type { ZodType } from "zod";
import {
  BAS_LIMITS,
  type BasEntity,
  type BasItemStatus,
  type BasPushAnswer,
  type BasPushResult,
  type ExchangeCounts,
} from "@/components/admin/integrations/types";
import type { PublicTag } from "../../cache-tags";
import { collection } from "../../db/collections";
import { json } from "../../http";
import { revalidatePublicData } from "../../revalidate";
import { describeIssues } from "./contract";
import type { BasCall } from "./handler";

// One push batch of the machine API, the same way for every entity:
//
// 1. A batchId answered before (within BAS_LIMITS.batchDays) gets the very
//    answer it got then, and nothing is applied: BAS may safely repeat a
//    batch whose answer it lost (a timeout, a dropped connection).
// 2. Every item is parsed on its own; one that does not parse becomes an
//    error row, the rest go on.
// 3. Items that name the same record as an earlier item of the batch are
//    refused ("duplicate-in-batch"), so the appliers may work on several
//    items at once without two of them racing for one document.
// 4. The entity's applier writes the valid items and reports one outcome
//    per item; the answer lists the results in the order of the items. It
//    is told how many items were refused in steps 2 and 3, so a step that
//    reads "what the batch does not carry" (the ledger's replace) never
//    takes a refused item for a missing one.
// 5. The answer is stored under "<entity>:<batchId>", public caches the
//    applier names are dropped once, and the journal row gets the counts.

export type Outcome = { status: Exclude<BasItemStatus, "error"> } | { status: "error"; error: string };

// `extra`: fields an entity adds to its answer (the ledger says what its
// replace step did).
export type ApplyResult = { outcomes: Outcome[]; revalidate?: PublicTag[]; extra?: Record<string, unknown> };

// What the runner knows about the batch besides the valid items: how many
// were refused before the applier saw them (did not parse, or named a
// record an earlier item of the batch named too).
export type BatchContext = { refused: number };

export type BatchSpec<T> = {
  entity: BasEntity;
  envelope: { batchId: string; items: unknown[] };
  item: ZodType<T>;
  // The id a result row names: from a parsed item, and from a raw one that
  // did not parse.
  idOf: (item: T) => string;
  rawIdOf: (raw: unknown) => string;
  // Keys of the records an item touches (for the duplicate rule).
  keysOf?: (item: T) => string[];
  apply: (items: T[], batch: BatchContext) => Promise<ApplyResult>;
};

export const ok = (status: Exclude<BasItemStatus, "error">): Outcome => ({ status });
export const failed = (error: string): Outcome => ({ status: "error", error: error.slice(0, 300) });

export function countOutcomes(statuses: BasItemStatus[]): ExchangeCounts {
  const counts: ExchangeCounts = { received: statuses.length, created: 0, updated: 0, unchanged: 0, failed: 0 };
  for (const status of statuses) {
    if (status === "error") counts.failed += 1;
    else counts[status] += 1;
  }
  return counts;
}

function batchKey(entity: BasEntity, batchId: string): string {
  return `${entity}:${batchId}`;
}

// The stored answer of a batch seen before, or null.
export async function replayedAnswer(entity: BasEntity, batchId: string): Promise<Record<string, unknown> | null> {
  const doc = await (await collection("exchangeBatches")).findOne({
    _id: batchKey(entity, batchId),
    expiresAt: { $gt: new Date() },
  });
  return doc ? doc.response : null;
}

export async function storeAnswer(entity: BasEntity, batchId: string, response: Record<string, unknown>): Promise<void> {
  const now = new Date();
  try {
    await (await collection("exchangeBatches")).updateOne(
      { _id: batchKey(entity, batchId) },
      {
        $set: { response, createdAt: now, expiresAt: new Date(now.getTime() + BAS_LIMITS.batchDays * 86_400_000) },
      },
      { upsert: true },
    );
  } catch (error) {
    // Not stored = a repeat is applied again, which the upserts survive.
    console.error("[bas] batch answer store failed:", error);
  }
}

function replayCounts(response: Record<string, unknown>): Partial<ExchangeCounts> {
  const counts = response.counts as Partial<ExchangeCounts> | undefined;
  return { received: typeof counts?.received === "number" ? counts.received : 0 };
}

export async function runBatch<T, C>(call: BasCall<C>, spec: BatchSpec<T>): Promise<Response> {
  const { entity, envelope } = spec;
  const batchId = envelope.batchId;

  const stored = await replayedAnswer(entity, batchId);
  if (stored) {
    call.note({ action: "replay", batchId, counts: replayCounts(stored), status: "ok" });
    return json(stored);
  }

  const results: (BasPushResult | null)[] = envelope.items.map(() => null);
  const valid: { index: number; item: T }[] = [];
  const seen = new Set<string>();
  envelope.items.forEach((raw, index) => {
    const parsed = spec.item.safeParse(raw);
    if (!parsed.success) {
      results[index] = { externalId: spec.rawIdOf(raw), status: "error", error: `invalid: ${describeIssues(parsed.error)}` };
      return;
    }
    const keys = spec.keysOf ? spec.keysOf(parsed.data) : [spec.idOf(parsed.data)];
    if (keys.some((key) => seen.has(key))) {
      results[index] = { externalId: spec.idOf(parsed.data), status: "error", error: "duplicate-in-batch" };
      return;
    }
    keys.forEach((key) => seen.add(key));
    valid.push({ index, item: parsed.data });
  });

  const refused = envelope.items.length - valid.length;
  const applied: ApplyResult = valid.length ? await spec.apply(valid.map((v) => v.item), { refused }) : { outcomes: [] };
  valid.forEach(({ index, item }, k) => {
    const outcome = applied.outcomes[k] ?? failed("not processed");
    results[index] =
      outcome.status === "error"
        ? { externalId: spec.idOf(item), status: "error", error: outcome.error }
        : { externalId: spec.idOf(item), status: outcome.status };
  });

  const rows = results as BasPushResult[];
  const counts = countOutcomes(rows.map((row) => row.status));
  const answer: BasPushAnswer = { ok: true, batchId, results: rows, counts, ...applied.extra };
  if (applied.revalidate?.length && (counts.created > 0 || counts.updated > 0)) revalidatePublicData(applied.revalidate);
  await storeAnswer(entity, batchId, answer as unknown as Record<string, unknown>);
  call.note({
    action: "push",
    batchId,
    counts,
    details: rows.filter((row) => row.status === "error").map((row) => ({ id: row.externalId, error: row.error ?? "" })),
  });
  return json(answer);
}

// Runs `fn` over `items` with at most `limit` running at once; results in
// item order.
export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

// An applier's step for one item, with any unexpected failure turned into
// an error row (logged on the server) instead of failing the batch.
export async function guarded(label: string, fn: () => Promise<Outcome>): Promise<Outcome> {
  try {
    return await fn();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return failed("conflict: the record was written meanwhile, retry");
    console.error(`[bas] ${label} failed:`, error);
    return failed("server: the item could not be stored");
  }
}

// Canonical JSON (sorted keys): tells whether a write would change anything.
export function same(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  return JSON.stringify(value === undefined ? null : value, (_key, v: unknown) => {
    if (v instanceof Date) return v.toISOString();
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
          .map((k) => [k, (v as Record<string, unknown>)[k]]),
      );
    }
    return v;
  });
}
