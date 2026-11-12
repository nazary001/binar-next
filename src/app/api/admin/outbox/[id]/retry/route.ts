import type { OutboxRetryAnswer } from "@/components/admin/mail/types";
import { audit, staffActor } from "@/server/admin/audit";
import { adminHandler, HttpError, json, notFound } from "@/server/admin/http";
import { retryMessage } from "@/server/mail/deliver";
import { toOutboxRow } from "@/server/mail/repo";
import { zId } from "@/server/validate";

// POST /api/admin/outbox/<id>/retry - the count of attempts starts again
// and one attempt is made now. Refusals: 404, 409 "state" (sent already,
// expired, or a kind that cannot be mailed from the outbox), 409 "busy"
// (being sent this moment), 409 "no-provider".

type Context = { params: Promise<{ id: string }> };

export const POST = adminHandler<Context>("integrations.edit", async ({ request, context, staff }) => {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  const outcome = await retryMessage(parsed.data, staffActor(staff));
  if (!outcome.ok) {
    if (outcome.error === "not-found") notFound();
    throw new HttpError(409, outcome.error);
  }
  const row = toOutboxRow(outcome.doc, staff.permissions);
  await audit(staff, request, {
    action: "outbox.retry",
    entity: { type: "outbox", id: row.id, label: `${row.kindLabel}: ${row.to}` },
    summary: outcome.result.ok
      ? `Повторно надіслано лист «${row.kindLabel}» на ${row.to}`
      : `Повторне надсилання листа «${row.kindLabel}» на ${row.to} не вдалося: ${outcome.result.error}`,
    meta: { kind: row.kind, ok: outcome.result.ok, error: outcome.result.ok ? null : outcome.result.error },
  });
  const answer: OutboxRetryAnswer = { ok: true, message: row, result: outcome.result };
  return json(answer);
});
