import type { OutboxDetailAnswer } from "@/components/admin/mail/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound } from "@/server/admin/http";
import { deleteMessage, deliveriesOf, findMessage, previewOf, toOutboxRow } from "@/server/mail/repo";
import { zId } from "@/server/validate";

// GET /api/admin/outbox/<id> - the message, its payload, the message as it
// would be mailed now and its delivery attempts (OutboxDetailAnswer).
// DELETE /api/admin/outbox/<id> - removes the message from the outbox.

type Context = { params: Promise<{ id: string }> };

async function idOf(context: Context): Promise<string> {
  const { id } = await context.params;
  const parsed = zId.safeParse(id);
  // An id that cannot exist is just not found.
  if (!parsed.success) notFound();
  return parsed.data;
}

export const GET = adminHandler<Context>("integrations.view", async ({ context }) => {
  const doc = await findMessage(await idOf(context));
  if (!doc) notFound();
  const [{ preview, previewError }, deliveries] = await Promise.all([previewOf(doc), deliveriesOf(doc._id)]);
  const answer: OutboxDetailAnswer = {
    ok: true,
    message: toOutboxRow(doc),
    payload: doc.payload ?? {},
    preview,
    previewError,
    deliveries,
  };
  return json(answer);
});

export const DELETE = adminHandler<Context>("integrations.edit", async ({ request, context, staff }) => {
  const doc = await findMessage(await idOf(context));
  if (!doc || !(await deleteMessage(doc._id))) notFound();
  const row = toOutboxRow(doc);
  await audit(staff, request, {
    action: "outbox.delete",
    entity: { type: "outbox", id: doc._id, label: `${row.kindLabel}: ${doc.to}` },
    summary: `Видалено лист «${row.kindLabel}» на ${doc.to} з черги пошти`,
    meta: { kind: doc.kind, state: row.state },
  });
  return json({ ok: true });
});
