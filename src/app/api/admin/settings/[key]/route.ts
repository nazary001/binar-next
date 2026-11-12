import type { SettingsGroupResponse, SettingsSaveResponse } from "@/components/admin/settings/types";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, notFound, readJson } from "@/server/admin/http";
import { revalidatePublicData } from "@/server/revalidate";
import { checkGroupBody, describeChanges, groupTitle, isPlainSettingsKey, readGroup, readMeta, saveGroup, tagsOf } from "../groups";

// GET /api/admin/settings/<general|shop|blog|catalog> -> SettingsGroupResponse
// PUT /api/admin/settings/<key> with the group as the body
//   -> SettingsSaveResponse (the stored group and the changed fields).
//   Every field sent is checked against the group's schema without its
//   fallbacks; a field left out keeps its stored value. Refusals: 400
//   "bad-request" (not an object), 400 "fields" { fields: { <field>: reason } }
//   (an unknown field is an error, never silently dropped).
// Any other key is 404 (the integration groups have their own routes).

type Context = { params: Promise<{ key: string }> };

async function keyOf(context: Context) {
  const { key } = await context.params;
  if (!isPlainSettingsKey(key)) notFound();
  return key;
}

export const GET = adminHandler<Context>("settings.view", async ({ context }) => {
  const key = await keyOf(context);
  const [settings, meta] = await Promise.all([readGroup(key), readMeta([key])]);
  const answer: SettingsGroupResponse = { ok: true, key, settings, meta: meta[key] };
  return json(answer);
});

export const PUT = adminHandler<Context>("settings.edit", async ({ request, context, staff }) => {
  const key = await keyOf(context);
  // The catalog group's lists may hold several hundred names each.
  const body = await readJson(request, 256 * 1024);
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new HttpError(400, "bad-request");
  const record = body as Record<string, unknown>;

  const errors = await checkGroupBody(key, record);
  if (Object.keys(errors).length > 0) throw new HttpError(400, "fields", { fields: errors });

  const { settings, changes } = await saveGroup(key, record, staff.staff._id);
  if (changes.length > 0) {
    await audit(staff, request, {
      action: "settings.update",
      entity: { type: "settings", id: key, label: groupTitle(key) },
      summary: `Змінено налаштування «${groupTitle(key)}»: ${describeChanges(key, changes)}`,
      meta: { group: key, changes },
    });
    const tags = tagsOf(key);
    if (tags.length > 0) revalidatePublicData(tags);
  }
  const meta = await readMeta([key]);
  const answer: SettingsSaveResponse = { ok: true, key, settings, meta: meta[key], changed: changes };
  return json(answer);
});
