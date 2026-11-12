import { z } from "zod";
import type { BasSettingsInput } from "@/components/admin/integrations/types";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, parseBody } from "@/server/admin/http";
import { PUSH_URL_TEXT, pushUrlProblem } from "@/server/integrations/bas/push";
import { readBasSettings, writeBasSettings } from "@/server/integrations/bas/settings";
import { zText } from "@/server/validate";

// GET /api/admin/integrations/bas/settings [integrations.view]
// PUT /api/admin/integrations/bas/settings [integrations.edit] BasSettingsInput
// -> { ok, settings: BasSettingsDto, passwordDropped }. The push password
// is sealed on the server and never answered (hasPassword only). It
// belongs to the address it was typed for: a new pushUrl of another origin
// without a new pushPassword in the same body removes the stored one
// (passwordDropped: true). The push address is checked by the rules of
// server/integrations/outbound.ts (https only, plus http://localhost and
// 127.0.0.1 for a receiver under test in development; no credentials
// inside it; no private network literal): a refused one is 400
// "bad-request" with fields.pushUrl (a sentence for the field) and `reason`.

const Body = z
  .object({
    enabled: z.boolean(),
    mode: z.enum(["pull", "push"]),
    pushUrl: z.string().trim().max(500),
    pushLogin: zText(120),
    pushPassword: z.string().max(200).nullable(),
    acceptProducts: z.boolean(),
    acceptPrices: z.boolean(),
    acceptStock: z.boolean(),
    acceptClients: z.boolean(),
    acceptLedger: z.boolean(),
    acceptOrderStatuses: z.boolean(),
    acceptDocuments: z.boolean(),
    publishNewProducts: z.boolean(),
    stockDrivesAvailability: z.boolean(),
    exportRetailOrders: z.boolean(),
    exportPartnerOrders: z.boolean(),
  })
  .partial()
  .strict() satisfies z.ZodType<BasSettingsInput>;

const LABELS: Record<string, string> = {
  enabled: "обмін",
  mode: "режим",
  pushUrl: "адреса надсилання",
  pushLogin: "логін",
  pushPassword: "пароль",
  acceptProducts: "товари",
  acceptPrices: "ціни",
  acceptStock: "залишки",
  acceptClients: "клієнти",
  acceptLedger: "взаєморозрахунки",
  acceptOrderStatuses: "статуси замовлень",
  acceptDocuments: "документи",
  publishNewProducts: "публікація нових товарів",
  stockDrivesAvailability: "наявність за залишком",
  exportRetailOrders: "роздрібні замовлення",
  exportPartnerOrders: "замовлення партнерів",
};

export const GET = adminHandler("integrations.view", async () => json({ ok: true, settings: await readBasSettings() }));

export const PUT = adminHandler("integrations.edit", async ({ request, staff }) => {
  const body = await parseBody(request, Body);
  if (body.pushUrl) {
    const reason = pushUrlProblem(body.pushUrl);
    if (reason) throw new HttpError(400, "bad-request", { fields: { pushUrl: PUSH_URL_TEXT[reason] }, reason });
  }
  const { settings, changed, passwordDropped } = await writeBasSettings(body, staff.staff._id);
  if (changed.length) {
    const switched =
      changed.includes("enabled") && changed.length === 1
        ? settings.enabled
          ? "Увімкнено обмін з BAS"
          : "Вимкнено обмін з BAS"
        : `Змінено налаштування обміну з BAS: ${changed.map((key) => LABELS[key] ?? key).join(", ")}`;
    await audit(staff, request, {
      action: "integration.bas.settings",
      entity: { type: "settings", id: "bas", label: "Обмін з BAS" },
      summary: passwordDropped ? `${switched} (збережений пароль видалено: адреса змінилася)` : switched,
      meta: { changed, passwordDropped },
    });
  }
  return json({ ok: true, settings, passwordDropped });
});
