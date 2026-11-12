import { z } from "zod";
import type { NpSettingsView } from "@/components/admin/integrations/types";
import type { NpSettingsDto } from "@/components/admin/shipping/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { getSettings, patchSettings } from "@/server/admin/settings";
import { npSettingsDto, updateNpSettings } from "@/server/integrations/nova-poshta/config";
import { SettingsBody, withNp } from "@/server/integrations/nova-poshta/http";

// GET /api/admin/np/settings -> { ok, settings: NpSettingsView }
//   The "novaPoshta" settings group without the sealed key: whether a key
//   is stored (hasKey), its hint, the sender profile and the defaults,
//   plus the typical size of a parcel (defaultDimensions, cm, or null).
// PUT /api/admin/np/settings NpSettingsInput & { defaultDimensions? } -> { ok, settings }
//   Every field optional. apiKey: a new key is sealed and stored, "" removes
//   the stored one, absent keeps it. defaultDimensions: { width, length,
//   height } in whole or decimal cm, 1..300 each, or null to clear. 400
//   "fields" { fields } for a sender ref that is not a carrier ref, a phone
//   that is not Ukrainian, a key of the wrong shape; 503 "secrets-key" when
//   the server cannot seal secrets.
// The key is never answered and never journalled.

// The settings group allows 1..300 cm a side (src/server/admin/settings.ts).
const zSide = z.number().min(1).max(300);
const zDimensions = z.object({ width: zSide, length: zSide, height: zSide }).strict();

const Body = SettingsBody.extend({ defaultDimensions: zDimensions.nullable().optional() }).strict();

type Dimensions = NpSettingsView["defaultDimensions"];

function view(dto: NpSettingsDto, defaultDimensions: Dimensions): NpSettingsView {
  return { ...dto, defaultDimensions };
}

const sameDimensions = (a: Dimensions, b: Dimensions) => JSON.stringify(a) === JSON.stringify(b);

export const GET = adminHandler("integrations.view", async () => {
  const [dto, stored] = await Promise.all([npSettingsDto(), getSettings("novaPoshta")]);
  return json({ ok: true, settings: view(dto, stored.defaultDimensions) });
});

export const PUT = adminHandler("integrations.edit", async ({ request, staff }) => {
  const { defaultDimensions, ...body } = await parseBody(request, Body);
  // The carrier fields first: their checks may refuse the whole save.
  const outcome = await withNp(() => updateNpSettings(body, staff.staff._id));
  const changed = [...outcome.changed];
  let dimensions = (await getSettings("novaPoshta")).defaultDimensions;
  if (defaultDimensions !== undefined && !sameDimensions(defaultDimensions, dimensions)) {
    dimensions = (await patchSettings("novaPoshta", { defaultDimensions }, staff.staff._id)).defaultDimensions;
    changed.push("defaultDimensions");
  }
  const summary =
    outcome.key === "set"
      ? "Збережено новий ключ API Нової Пошти"
      : outcome.key === "removed"
        ? "Видалено ключ API Нової Пошти"
        : "Змінено налаштування Нової Пошти";
  if (outcome.key !== "kept" || changed.length > 0) {
    await audit(staff, request, {
      action: "np.settings",
      entity: { type: "settings", id: "novaPoshta", label: "Нова Пошта" },
      summary: outcome.key !== "kept" && changed.length > 0 ? `${summary}; змінено налаштування` : summary,
      meta: { fields: changed, key: outcome.key },
    });
  }
  return json({ ok: true, settings: view(outcome.settings, dimensions) });
});
