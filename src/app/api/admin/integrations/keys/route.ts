import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, parseBody } from "@/server/admin/http";
import { listQuery } from "@/server/admin/list";
import { createApiKey, listApiKeys, toApiKeyDto } from "@/server/integrations/keys";
import { kyivDayEnd } from "@/server/integrations/bas/values";
import { zRequiredText } from "@/server/validate";

// GET  /api/admin/integrations/keys?page=&limit=&sort= [integrations.view]
//      -> ListAnswer<ApiKeyDto> (never a hash, never a key).
// POST /api/admin/integrations/keys [integrations.edit] ApiKeyCreateInput
//      -> 201 ApiKeyCreatedAnswer: the full key, this once.

export const GET = adminHandler("integrations.view", async ({ url }) => {
  const query = listQuery(url, { sortable: ["createdAt", "name", "lastUsedAt"], defaultSort: "-createdAt" });
  return json({ ok: true, ...(await listApiKeys(query)) });
});

const MAX_YEARS = 5;

// "YYYY-MM-DD" = valid through that day (Kyiv): until the next Kyiv day
// starts (a clock-change day lasts 23 or 25 hours); a date-time = that
// moment.
function expiryOf(raw: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const end = kyivDayEnd(raw);
    return Number.isNaN(end.getTime()) ? null : end;
  }
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at;
}

const Body = z
  .object({
    name: zRequiredText(120),
    scopes: z
      .array(z.enum(["bas:read", "bas:write"]))
      .min(1)
      .max(2),
    expiresAt: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

export const POST = adminHandler("integrations.edit", async ({ request, staff }) => {
  const body = await parseBody(request, Body);
  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    expiresAt = expiryOf(body.expiresAt);
    const now = Date.now();
    if (!expiresAt || expiresAt.getTime() <= now || expiresAt.getTime() > now + MAX_YEARS * 366 * 86_400_000) {
      throw new HttpError(400, "fields", { fields: { expiresAt: "future" } });
    }
  }
  const { key, doc } = await createApiKey({
    name: body.name,
    scopes: body.scopes,
    expiresAt,
    createdBy: staff.staff._id,
  });
  await audit(staff, request, {
    action: "integration.key.create",
    entity: { type: "api-key", id: doc._id, label: doc.name },
    summary: `Створено ключ доступу «${doc.name}» (${doc.prefix}...) з дозволами ${doc.scopes.join(", ")}`,
    meta: { prefix: doc.prefix, scopes: doc.scopes, expiresAt: expiresAt?.toISOString() ?? null },
  });
  return json({ ok: true, key, record: { ...toApiKeyDto(doc), createdByName: staff.staff.name } }, 201);
});
