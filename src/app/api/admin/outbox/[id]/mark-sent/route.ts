import type { OutboxMessageAnswer } from "@/components/admin/mail/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, HttpError, json, notFound } from "@/server/admin/http";
import { markSent, toOutboxRow } from "@/server/mail/repo";
import { zId } from "@/server/validate";

// POST /api/admin/outbox/<id>/mark-sent - staff handled the message by
// hand (called, wrote from their own mailbox): it leaves the queue.
// Refusals: 404, 409 "state" (already sent).

type Context = { params: Promise<{ id: string }> };

export const POST = adminHandler<Context>("integrations.edit", async ({ request, context, staff }) => {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  const outcome = await markSent(parsed.data);
  if (outcome === "not-found") notFound();
  if (outcome === "state") throw new HttpError(409, "state");
  const row = toOutboxRow(outcome);
  await audit(staff, request, {
    action: "outbox.mark-sent",
    entity: { type: "outbox", id: row.id, label: `${row.kindLabel}: ${row.to}` },
    summary: `Лист «${row.kindLabel}» на ${row.to} позначено як опрацьований вручну`,
    meta: { kind: row.kind, attempts: row.attempts },
  });
  const answer: OutboxMessageAnswer = { ok: true, message: row };
  return json(answer);
});
