import { z } from "zod";
import { countOf } from "@/components/admin/lib/format";
import { ROLE_DESCRIPTION_MAX, ROLE_NAME_MAX } from "@/components/admin/staff/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import { deleteRole, roleRow, updateRole, zPermissionKeys } from "@/server/admin/repos/roles";
import { cleanPermissions } from "@/server/admin/staff";
import { zId, zRequiredText, zText } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

const MEMBER_FORMS = ["співробітник", "співробітники", "співробітників"] as const;

async function roleIdOf(context: Context): Promise<string> {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  return parsed.data;
}

// GET /api/admin/roles/[id] -> { ok: true, role } (RoleAnswer).
export const GET = adminHandler<Context>("staff.manage", async ({ context }) => {
  const role = await roleRow(await roleIdOf(context));
  if (!role) notFound();
  return json({ ok: true, role });
});

const PatchBody = z
  .object({
    name: zRequiredText(ROLE_NAME_MAX).optional(),
    description: zText(ROLE_DESCRIPTION_MAX).optional(),
    permissions: zPermissionKeys.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0);

// PATCH /api/admin/roles/[id] { name?, description?, permissions? }. The
// owner role answers 409 "locked"; a built-in role stays built-in. A
// non-owner gets 403 "forbidden" { reason: "own-role" } for the role they
// hold and { reason: "beyond-own" } for a role (before or after the change)
// with permissions they do not hold.
export const PATCH = adminHandler<Context>("staff.manage", async ({ request, context, staff }) => {
  const id = await roleIdOf(context);
  const body = await parseBody(request, PatchBody);
  const { before, role } = await updateRole(staff, id, body);

  const parts: string[] = [];
  if (role.name !== before.name) parts.push(`назва «${before.name}» -> «${role.name}»`);
  if (role.description !== (before.description ?? "")) parts.push("опис");
  const was = new Set(cleanPermissions(before.permissions ?? []));
  const now = new Set(role.permissions);
  const added = role.permissions.filter((key) => !was.has(key));
  const removed = [...was].filter((key) => !now.has(key));
  if (added.length > 0 || removed.length > 0) parts.push(`дозволи: +${added.length}, -${removed.length}`);

  // A save that changed nothing writes no journal line.
  if (parts.length > 0) {
    await audit(staff, request, {
      action: "role.update",
      entity: { type: "role", id: role.id, label: role.name },
      summary: `Змінено роль «${role.name}» (${countOf(role.members, MEMBER_FORMS)}): ${parts.join("; ")}`,
      meta: { added, removed, ...(role.name !== before.name ? { from: before.name, to: role.name } : {}) },
    });
  }
  return json({ ok: true, role });
});

// DELETE /api/admin/roles/[id]. Built-in roles: 409 "locked"; a role
// somebody has: 409 "in-use" { members }; a non-owner's own role or a role
// with more than they hold: 403 "forbidden" { reason }.
export const DELETE = adminHandler<Context>("staff.manage", async ({ request, context, staff }) => {
  const removed = await deleteRole(staff, await roleIdOf(context));
  await audit(staff, request, {
    action: "role.delete",
    entity: { type: "role", id: removed._id, label: removed.name },
    summary: `Видалено роль «${removed.name}»`,
  });
  return json({ ok: true });
});
