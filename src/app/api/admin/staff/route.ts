import { z } from "zod";
import { STAFF_EMAIL_MAX, STAFF_NAME_MAX, STAFF_SORTS } from "@/components/admin/staff/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { flag, idParam, listQuery } from "@/server/admin/list";
import { createStaffAccount, listStaff, mailStaffAccess, staffEntity, staffWords } from "@/server/admin/repos/staff-accounts";
import { zId, zRequiredText } from "@/server/validate";

// GET /api/admin/staff?q=&role=&active=&sort=&page=&limit= - every member
// of staff (StaffRow), the whole team on one page by default.
export const GET = adminHandler("staff.manage", async ({ url }) => {
  const query = listQuery(url, { sortable: STAFF_SORTS, defaultSort: "name", defaultLimit: 100, maxLimit: 200 });
  const page = await listStaff(query, {
    roleId: idParam(query.params, "role"),
    active: flag(query.params, "active"),
  });
  return json({ ok: true, ...page });
});

// POST /api/admin/staff { email, name, roleId, notify? } - a new account
// with a generated password, answered once (StaffCreateAnswer). With
// notify: true the password and the sign-in address also go to the
// person's e-mail, and the answer says whether the mail went out
// ({ mailed, mailError? }; absent without notify).
const CreateBody = z
  .object({
    email: z.string().trim().max(STAFF_EMAIL_MAX),
    name: zRequiredText(STAFF_NAME_MAX),
    roleId: zId,
    notify: z.boolean().optional(),
  })
  .strict();

export const POST = adminHandler("staff.manage", async ({ request, staff }) => {
  const { notify, ...input } = await parseBody(request, CreateBody);
  const created = await createStaffAccount(staff, input);
  const account = created.staff;
  const mail = notify
    ? await mailStaffAccess(
        staff,
        "staff-invite",
        { id: account.id, email: account.email, name: account.name, roleName: account.roleName },
        created.password,
      )
    : null;
  await audit(staff, request, {
    action: "staff.create",
    entity: staffEntity({ _id: account.id, email: account.email }),
    summary: `Створено обліковий запис співробітника ${staffWords(account)}${mail?.mailed ? "; доступ надіслано на e-mail" : ""}`,
    meta: { roleId: account.roleId, ...(mail ? { mailed: mail.mailed } : {}) },
  });
  return json({ ok: true, staff: account, password: created.password, ...(mail ?? {}) }, 201);
});
