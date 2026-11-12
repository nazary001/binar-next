import { z } from "zod";
import { countOf } from "@/components/admin/lib/format";
import { PERMISSION_GROUPS } from "@/components/admin/lib/permissions";
import { ROLE_DESCRIPTION_MAX, ROLE_NAME_MAX } from "@/components/admin/staff/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { createRole, listRoles, zPermissionKeys } from "@/server/admin/repos/roles";
import { zRequiredText, zText } from "@/server/validate";

// GET /api/admin/roles - every role with its members count, plus the
// catalogue of permissions the matrix is drawn from (RolesAnswer).
export const GET = adminHandler("staff.manage", async () =>
  json({ ok: true, items: await listRoles(), groups: PERMISSION_GROUPS }),
);

const CreateBody = z
  .object({
    name: zRequiredText(ROLE_NAME_MAX),
    description: zText(ROLE_DESCRIPTION_MAX).optional(),
    permissions: zPermissionKeys,
  })
  .strict();

// POST /api/admin/roles { name, description?, permissions } -> 201 { role }.
// A non-owner may only use permissions they hold themselves: 403
// "forbidden" { reason: "beyond-own" }.
export const POST = adminHandler("staff.manage", async ({ request, staff }) => {
  const body = await parseBody(request, CreateBody);
  const role = await createRole(staff, { name: body.name, description: body.description ?? "", permissions: body.permissions });
  await audit(staff, request, {
    action: "role.create",
    entity: { type: "role", id: role.id, label: role.name },
    summary: `Створено роль «${role.name}»: ${countOf(role.permissions.length, ["дозвіл", "дозволи", "дозволів"])}`,
    meta: { permissions: role.permissions },
  });
  return json({ ok: true, role }, 201);
});
