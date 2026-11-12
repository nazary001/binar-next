import { z } from "zod";
import { API_KEY_SCOPE_BADGES, type ApiKeyScope } from "@/components/admin/integrations/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import { deleteApiKey, findApiKey, toApiKeyDto, updateApiKey, withCreatorNames } from "@/server/integrations/keys";
import { zId, zRequiredText } from "@/server/validate";

// PATCH  /api/admin/integrations/keys/<id> [integrations.edit] { name?, isActive?, scopes? }
//        -> ApiKeyAnswer. isActive: false revokes the key at once; scopes
//        (at least one) replace the key's permissions at once. A change
//        stamps updatedAt / updatedBy on the key.
// DELETE /api/admin/integrations/keys/<id> [integrations.edit] -> { ok: true }.

type Context = { params: Promise<{ id: string }> };

async function keyId(context: Context): Promise<string> {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  return parsed.data;
}

const Body = z
  .object({
    name: zRequiredText(120).optional(),
    isActive: z.boolean().optional(),
    scopes: z
      .array(z.enum(["bas:read", "bas:write"]))
      .min(1)
      .max(2)
      .optional(),
  })
  .strict();

const scopeWords = (scopes: string[]) =>
  scopes.map((scope) => API_KEY_SCOPE_BADGES[scope as ApiKeyScope] ?? scope).join(", ").toLowerCase();

export const PATCH = adminHandler<Context>("integrations.edit", async ({ request, context, staff }) => {
  const id = await keyId(context);
  const body = await parseBody(request, Body);
  const before = await findApiKey(id);
  if (!before) notFound();
  const after = await updateApiKey(id, body, staff.staff._id);
  if (!after) notFound();

  const changes: string[] = [];
  if (after.name !== before.name) changes.push(`перейменовано на «${after.name}»`);
  if (after.isActive !== before.isActive) changes.push(after.isActive ? "увімкнено" : "вимкнено");
  if ([...after.scopes].sort().join(",") !== [...before.scopes].sort().join(",")) {
    changes.push(`дозволи: ${scopeWords(after.scopes)}`);
  }
  if (changes.length) {
    await audit(staff, request, {
      action: "integration.key.update",
      entity: { type: "api-key", id, label: after.name },
      summary: `Ключ доступу «${before.name}» (${before.prefix}...): ${changes.join(", ")}`,
      meta: { name: body.name ?? null, isActive: body.isActive ?? null, scopes: body.scopes ?? null },
    });
  }
  const [record] = await withCreatorNames([toApiKeyDto(after)]);
  return json({ ok: true, record });
});

export const DELETE = adminHandler<Context>("integrations.edit", async ({ request, context, staff }) => {
  const id = await keyId(context);
  const removed = await deleteApiKey(id);
  if (!removed) notFound();
  await audit(staff, request, {
    action: "integration.key.delete",
    entity: { type: "api-key", id, label: removed.name },
    summary: `Видалено ключ доступу «${removed.name}» (${removed.prefix}...)`,
    meta: { prefix: removed.prefix },
  });
  return json({ ok: true });
});
