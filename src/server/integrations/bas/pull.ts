import "server-only";
import type { ZodType } from "zod";
import type { BasAckAnswer, BasAckResult, QueueKind } from "@/components/admin/integrations/types";
import { HttpError, json } from "../../http";
import { AckEnvelope, PullQuery, describeIssues, issueList, rawId } from "./contract";
import { countOutcomes } from "./batch";
import type { BasCall } from "./handler";
import { orderPackets, returnPackets } from "./packets";
import { ackEntry, markMissing, pendingEntries } from "./queue";

// The two directions of the queue as BAS sees them: GET pulls the pending
// entries after a cursor, POST .../ack confirms them.

export function pullQuery(url: URL): { after: number; limit: number } {
  const parsed = PullQuery.safeParse({
    after: url.searchParams.get("after") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) throw new HttpError(400, "bad-request", { issues: issueList(parsed.error) });
  return parsed.data;
}

export async function runPull<C>(call: BasCall<C>, kind: QueueKind): Promise<Response> {
  const { after, limit } = pullQuery(call.url);
  const entries = await pendingEntries(kind, after, limit);
  const page = kind === "order" ? await orderPackets(entries) : await returnPackets(entries);
  await markMissing(page.missing);
  const nextAfter = entries.length ? entries[entries.length - 1].seq : after;
  call.note({ action: "pull", counts: { received: page.packets.length } });
  return json({ ok: true, items: page.packets, nextAfter });
}

type AckItem = { externalId?: string | null; number?: string; error?: string };

export async function runAck<T extends AckItem, C>(
  call: BasCall<C>,
  kind: QueueKind,
  item: ZodType<T>,
  idOf: (item: T) => string,
): Promise<Response> {
  const envelope = await call.body(AckEnvelope);
  const idField = kind === "order" ? "orderId" : "returnId";
  const results: BasAckResult[] = [];
  const seen = new Set<string>();
  // One at a time: each ack writes the queue entry and the record.
  for (const raw of envelope.items) {
    const parsed = item.safeParse(raw);
    if (!parsed.success) {
      results.push({ id: rawId(raw, [idField]), status: "error", error: `invalid: ${describeIssues(parsed.error)}` });
      continue;
    }
    const id = idOf(parsed.data);
    if (seen.has(id)) {
      results.push({ id, status: "error", error: "duplicate-in-batch" });
      continue;
    }
    seen.add(id);
    const outcome = await ackEntry(
      kind,
      {
        entityId: id,
        externalId: parsed.data.externalId ?? null,
        number: parsed.data.number || null,
        error: parsed.data.error || null,
      },
      call.actor,
    );
    results.push(outcome.status === "error" ? { id, status: "error", error: outcome.error } : { id, status: outcome.status });
  }
  // An ack is an update of the entry; repeated acks are "unchanged".
  const counts = countOutcomes(
    results.map((row) => (row.status === "acked" ? "updated" : row.status === "unchanged" ? "unchanged" : "error")),
  );
  const answer: BasAckAnswer = { ok: true, results, counts };
  call.note({
    action: "ack",
    batchId: envelope.batchId ?? null,
    counts,
    details: results.filter((row) => row.status === "error").map((row) => ({ id: row.id, error: row.error ?? "" })),
  });
  return json(answer);
}
