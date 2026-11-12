import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import { describeStaff, mailStaffAccess, resetStaffPassword, staffEntity } from "@/server/admin/repos/staff-accounts";
import { zId } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/staff/[id]/password { notify? } - a new generated
// password for somebody who lost theirs. Every session of the person ends
// and the panel asks them for a new password on the next sign-in. The
// answer carries the password this once (StaffPasswordAnswer); it is
// stored only as a hash. With notify: true the password also goes to the
// person's e-mail and the answer says whether the mail went out
// ({ mailed, mailError? }). A request without a body works as before.
const Body = z.object({ notify: z.boolean().optional() }).strict();

export const POST = adminHandler<Context>("staff.manage", async ({ request, context, staff }) => {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  const { notify } = request.headers.get("content-type") ? await parseBody(request, Body) : {};
  const { target, password } = await resetStaffPassword(staff, parsed.data);
  const mail = notify
    ? await mailStaffAccess(staff, "staff-password", { id: target._id, email: target.email, name: target.name }, password)
    : null;
  await audit(staff, request, {
    action: "staff.password-reset",
    entity: staffEntity(target),
    summary: `Згенеровано новий пароль для співробітника ${await describeStaff(target)}; усі сесії завершено${mail?.mailed ? "; пароль надіслано на e-mail" : ""}`,
    ...(mail ? { meta: { mailed: mail.mailed } } : {}),
  });
  return json({ ok: true, password, ...(mail ?? {}) });
});
