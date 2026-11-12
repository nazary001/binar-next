import { audit, staffActor } from "@/server/admin/audit";
import { HttpError, adminHandler, json, notFound } from "@/server/admin/http";
import { queueDto, retryEntry } from "@/server/integrations/bas/queue";
import { zId } from "@/server/validate";

// POST /api/admin/integrations/bas/queue/<id>/retry [integrations.edit]
// An entry BAS refused ("error") or already took ("acked") goes back to
// the queue under a new seq. 200 { ok, entry } | 404 | 409 "state" (it
// is still pending).

type Context = { params: Promise<{ id: string }> };

export const POST = adminHandler<Context>("integrations.edit", async ({ request, context, staff }) => {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  const outcome = await retryEntry(parsed.data, staffActor(staff));
  if (outcome === "not-found") notFound();
  if (outcome === "state") throw new HttpError(409, "state");
  const entry = await queueDto(outcome);
  const what = entry.kind === "order" ? `Замовлення №${entry.number ?? entry.entityId}` : `Заявку на повернення ${entry.entityId}`;
  await audit(staff, request, {
    action: "integration.bas.retry",
    entity: { type: entry.kind, id: entry.entityId, label: entry.number ? `№${entry.number}` : entry.entityId },
    summary: `${what} повторно передано в чергу обміну з BAS`,
    meta: { queueId: entry.id, seq: entry.seq },
  });
  return json({ ok: true, entry });
});
