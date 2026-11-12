import { z } from "zod";
import { MAIL_PROVIDER_LABELS, type MailInboxes, type MailSettingsView } from "@/components/admin/mail/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, HttpError, json, parseBody } from "@/server/admin/http";
import { getSettings } from "@/server/admin/settings";
import { readMailSettings, mailSettingsAnswer, saveMailSettings, type MailField } from "@/server/mail/config";
import { zText } from "@/server/validate";

// GET /api/admin/integrations/mail/settings - the "mail" group without the
// sealed key (hasKey + keyHint) and what the mailer can do with it.
// PUT - any subset of the fields; `apiKey` is sealed, "" removes it.
// Answer of both: MailSettingsView (src/components/admin/mail/types.ts):
// MailSettingsAnswer plus the staff inboxes of the general settings the
// notices go to (shown on the mail page; edited under "Налаштування").

async function inboxes(): Promise<MailInboxes> {
  const general = await getSettings("general");
  return { leads: general.leadsInbox, orders: general.ordersInbox };
}

export const GET = adminHandler("integrations.view", async () => {
  const [answer, staffInboxes] = await Promise.all([readMailSettings(), inboxes()]);
  const view: MailSettingsView = { ...answer, inboxes: staffInboxes };
  return json(view);
});

const Body = z
  .object({
    provider: z.enum(["none", "resend", "webhook"]).optional(),
    from: zText(254).optional(),
    replyTo: zText(254).optional(),
    webhookUrl: zText(500).optional(),
    notifyNewOrder: z.boolean().optional(),
    notifyNewLead: z.boolean().optional(),
    confirmOrderToCustomer: z.boolean().optional(),
    apiKey: zText(500).optional(),
  })
  .strict();

const FIELD_NAMES: Record<MailField, string> = {
  provider: "сервіс",
  from: "адреса відправника",
  replyTo: "адреса для відповідей",
  webhookUrl: "адреса webhook",
  notifyNewOrder: "сповіщення про замовлення",
  notifyNewLead: "сповіщення про заявки",
  confirmOrderToCustomer: "підтвердження клієнту",
};

export const PUT = adminHandler("integrations.edit", async ({ request, staff }) => {
  const body = await parseBody(request, Body);
  const outcome = await saveMailSettings(body, staff.staff._id);
  if (!outcome.ok) {
    if (outcome.error === "fields") throw new HttpError(400, "fields", { fields: outcome.fields });
    throw new HttpError(503, "secrets-key");
  }

  const parts = outcome.changed.map((field) =>
    field === "provider" ? `сервіс «${MAIL_PROVIDER_LABELS[outcome.settings.provider]}»` : FIELD_NAMES[field],
  );
  if (outcome.key === "set") parts.push("ключ API оновлено");
  if (outcome.key === "removed") parts.push("ключ API видалено");
  if (parts.length > 0) {
    await audit(staff, request, {
      action: "mail.settings",
      entity: { type: "settings", id: "mail", label: "Пошта" },
      summary: `Змінено налаштування пошти: ${parts.join(", ")}`,
      // Never the key: only whether it changed.
      meta: { changed: outcome.changed, key: outcome.key, provider: outcome.settings.provider },
    });
  }
  const view: MailSettingsView = { ...mailSettingsAnswer(outcome.settings), inboxes: await inboxes() };
  return json(view);
});
