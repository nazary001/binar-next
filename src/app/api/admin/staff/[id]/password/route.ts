import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound } from "@/server/admin/http";
import { describeStaff, resetStaffPassword, staffEntity } from "@/server/admin/repos/staff-accounts";
import { zId } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/staff/[id]/password - a new generated password for
// somebody who lost theirs. Every session of the person ends and the panel
// asks them for a new password on the next sign-in. The answer carries the
// password this once (StaffPasswordAnswer); it is stored only as a hash.
export const POST = adminHandler<Context>("staff.manage", async ({ request, context, staff }) => {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  const { target, password } = await resetStaffPassword(staff, parsed.data);
  await audit(staff, request, {
    action: "staff.password-reset",
    entity: staffEntity(target),
    summary: `Згенеровано новий пароль для співробітника ${await describeStaff(target)}; усі сесії завершено`,
  });
  return json({ ok: true, password });
});
