import { audit, staffActor } from "@/server/admin/audit";
import { HttpError, adminHandler, json, notFound } from "@/server/admin/http";
import { deliverEntry, queueDto, retryEntry } from "@/server/integrations/bas/queue";
import { zId } from "@/server/validate";

// The retry posts the entry to the accounting system (up to 10 s).
export const maxDuration = 60;

// POST /api/admin/integrations/bas/queue/<id>/retry [integrations.edit]
// An entry BAS refused ("error") or already took ("acked"), a pending one
// whose post to the push address failed, or one BAS has not taken for an
// hour (QUEUE_STALE_MS, entry.stale), goes back to the queue under a new
// seq; in the push mode it is posted to the BAS address again (`push`
// says how that went). 200 { ok, entry, push? } | 404 | 409 "state" (it
// is pending, nothing failed and it is not an hour old yet).

type Context = { params: Promise<{ id: string }> };

export const POST = adminHandler<Context>("integrations.edit", async ({ request, context, staff }) => {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  const actor = staffActor(staff);
  const outcome = await retryEntry(parsed.data, actor);
  if (outcome === "not-found") notFound();
  if (outcome === "state") throw new HttpError(409, "state");
  const delivered = await deliverEntry(outcome, actor);
  const entry = await queueDto(delivered?.entry ?? outcome);
  const what = entry.kind === "order" ? `Замовлення №${entry.number ?? entry.entityId}` : `Заявку на повернення ${entry.entityId}`;
  const pushed = delivered ? (delivered.push.ok ? " і надіслано на адресу BAS" : "; надіслати на адресу BAS не вдалося") : "";
  await audit(staff, request, {
    action: "integration.bas.retry",
    entity: { type: entry.kind, id: entry.entityId, label: entry.number ? `№${entry.number}` : entry.entityId },
    summary: `${what} повторно передано в чергу обміну з BAS${pushed}`,
    meta: { queueId: entry.id, seq: entry.seq, ...(delivered ? { pushed: delivered.push.ok } : {}) },
  });
  return json({ ok: true, entry, ...(delivered ? { push: delivered.push } : {}) });
});
