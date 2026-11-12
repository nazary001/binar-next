import { z } from "zod";
import { ACCOUNT_RECENT_LIMIT, STAFF_NAME_MAX } from "@/components/admin/staff/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { accountMeOf, liveSessionCount, renameSelf, sessionsOf, signInsOf, staffEntity } from "@/server/admin/repos/staff-accounts";
import { zRequiredText } from "@/server/validate";

// GET /api/admin/account - the signed-in person: who they are, their live
// sessions (this one flagged), how many there are in all (the list stops
// at 100) and their last sign-ins (AccountAnswer).
// Open before the first password change too: the password page shows it.
export const GET = adminHandler(
  null,
  async ({ staff }) => {
    const [sessions, sessionsTotal, recent] = await Promise.all([
      sessionsOf(staff.staff._id, staff.sessionId),
      liveSessionCount(staff.staff._id),
      signInsOf(staff.staff._id, ACCOUNT_RECENT_LIMIT),
    ]);
    return json({ ok: true, me: accountMeOf(staff.staff, staff.role), sessions, sessionsTotal, recent });
  },
  { allowPasswordChange: true },
);

const PatchBody = z.object({ name: zRequiredText(STAFF_NAME_MAX) }).strict();

// PATCH /api/admin/account { name } - the own display name.
export const PATCH = adminHandler(null, async ({ request, staff }) => {
  const { name } = await parseBody(request, PatchBody);
  const before = staff.staff.name;
  const me = await renameSelf(staff, name);
  if (name !== before) {
    await audit(staff, request, {
      action: "staff.rename",
      entity: staffEntity(staff.staff),
      summary: `${before} змінив(ла) своє ім'я на «${name}» (роль «${staff.role.name}»)`,
      meta: { from: before, to: name, self: true },
    });
  }
  return json({ ok: true, me });
});
