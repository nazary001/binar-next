import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound } from "@/server/admin/http";
import { describeStaff, endOneSession, manageableStaff, staffEntity } from "@/server/admin/repos/staff-accounts";
import { zId } from "@/server/validate";

type Context = { params: Promise<{ id: string; sessionId: string }> };

// A public session id: the first characters of the stored hash (hex).
const SESSION_ID = /^[0-9a-f]{12}$/;

// DELETE /api/admin/staff/[id]/sessions/[sessionId] - ends one session of
// the person (one browser). The session of this request is refused with
// 409 "current".
export const DELETE = adminHandler<Context>("staff.manage", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = zId.safeParse(params.id);
  if (!id.success || !SESSION_ID.test(params.sessionId)) notFound();
  const target = await manageableStaff(staff, id.data);
  await endOneSession(staff, target._id, params.sessionId);
  await audit(staff, request, {
    action: "staff.session-end",
    entity: staffEntity(target),
    summary: `Завершено одну сесію співробітника ${await describeStaff(target)}`,
    meta: { session: params.sessionId },
  });
  return json({ ok: true });
});
