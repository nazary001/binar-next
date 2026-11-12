import { countOf } from "@/components/admin/lib/format";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { signOutOthers, staffEntity } from "@/server/admin/repos/staff-accounts";

// POST /api/admin/account/sessions/sign-out-others - ends every own session
// except this one (SignOutAnswer).
export const POST = adminHandler(null, async ({ request, staff }) => {
  const ended = await signOutOthers(staff);
  await audit(staff, request, {
    action: "staff.sign-out-others",
    entity: staffEntity(staff.staff),
    summary: `${staff.staff.name} (роль «${staff.role.name}») завершив(ла) інші свої сесії: ${countOf(ended, ["сесія", "сесії", "сесій"])}`,
    meta: { ended, self: true },
  });
  return json({ ok: true, ended });
});
