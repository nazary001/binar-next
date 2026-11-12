import { z } from "zod";
import type { BasSettingsInput } from "@/components/admin/integrations/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { readBasSettings, writeBasSettings } from "@/server/integrations/bas/settings";
import { zText } from "@/server/validate";

// GET /api/admin/integrations/bas/settings [integrations.view]
// PUT /api/admin/integrations/bas/settings [integrations.edit] BasSettingsInput
// -> { ok, settings: BasSettingsDto }. The push password is sealed on the
// server and never answered (hasPassword + hint only).

const zUrl = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, "http(s) address expected"),
]);

const Body = z
  .object({
    enabled: z.boolean(),
    mode: z.enum(["pull", "push"]),
    pushUrl: zUrl,
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
  const { settings, changed } = await writeBasSettings(body, staff.staff._id);
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
      summary: switched,
      meta: { changed },
    });
  }
  return json({ ok: true, settings });
});
