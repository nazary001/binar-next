import { PLAIN_SETTINGS_KEYS, type SettingsAllResponse } from "@/components/admin/settings/types";
import { adminHandler, json } from "@/server/admin/http";
import { readAllGroups, readMeta } from "./groups";

// GET /api/admin/settings - the plain settings groups (general, shop, blog,
// catalog) with every missing field filled by its default, and when each
// was last saved. -> SettingsAllResponse. The integration groups (Nova
// Poshta, BAS, mail) are served by their own routes.

export const GET = adminHandler("settings.view", async () => {
  const [settings, meta] = await Promise.all([readAllGroups(), readMeta(PLAIN_SETTINGS_KEYS)]);
  const answer: SettingsAllResponse = { ok: true, settings, meta };
  return json(answer);
});
