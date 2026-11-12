import { auditAs } from "@/server/admin/audit";
import { endStaffSession, getStaff } from "@/server/admin/auth";
import { requestIp } from "@/server/admin/http";
import { handler, noContent } from "@/server/http";

// POST /api/admin/auth/sign-out - ends this browser's staff session.
// Works without a session too (the cookie is simply cleared).
export const POST = handler(async (request) => {
  const staff = await getStaff();
  await endStaffSession();
  if (staff) {
    await auditAs({ id: staff.staff._id, name: staff.staff.name, kind: "staff" }, requestIp(request), {
      action: "staff.sign-out",
      entity: { type: "staff", id: staff.staff._id, label: staff.staff.email },
      summary: `Вихід з панелі: ${staff.staff.name}`,
    });
  }
  return noContent();
});
