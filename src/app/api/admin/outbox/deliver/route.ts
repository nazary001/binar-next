import { z } from "zod";
import type { DeliverAnswer } from "@/components/admin/mail/types";
import { audit, staffActor } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { deliverOutbox } from "@/server/mail/deliver";
import { outboxCounts } from "@/server/mail/repo";
import { zId } from "@/server/validate";

// POST /api/admin/outbox/deliver  { ids?: string[] }
// Runs the mailer now: the given messages, or the 20 oldest that are due.
// Answer: DeliverAnswer (the outcome and the new counts per state).

const Body = z.object({ ids: z.array(zId).min(1).max(100).optional() }).strict();

export const POST = adminHandler("integrations.edit", async ({ request, staff }) => {
  const { ids } = await parseBody(request, Body);
  const result = await deliverOutbox({ ids, actor: staffActor(staff) });
  const scope = ids ? `обрані листи (${ids.length})` : "черга";
  await audit(staff, request, {
    action: "outbox.deliver",
    entity: null,
    summary: result.configured
      ? `Запущено надсилання листів, ${scope}: надіслано ${result.sent}, з помилкою ${result.failed}, не надсилаються ${result.skipped}`
      : `Запущено надсилання листів, ${scope}: сервіс надсилання не підключено`,
    meta: { ...result, ids: ids ?? null },
  });
  const answer: DeliverAnswer = { ok: true, result, counts: await outboxCounts() };
  return json(answer);
});
