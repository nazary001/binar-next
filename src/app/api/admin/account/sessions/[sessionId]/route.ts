import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound } from "@/server/admin/http";
import { endOneSession, staffEntity } from "@/server/admin/repos/staff-accounts";

type Context = { params: Promise<{ sessionId: string }> };

// A public session id: the first characters of the stored hash (hex).
const SESSION_ID = /^[0-9a-f]{12}$/;

// DELETE /api/admin/account/sessions/[sessionId] - ends one of the own
// sessions (a browser left signed in elsewhere). The session of this
// request answers 409 "current": that one ends with the sign-out button.
export const DELETE = adminHandler<Context>(null, async ({ request, context, staff }) => {
  const { sessionId } = await context.params;
  if (!SESSION_ID.test(sessionId)) notFound();
  await endOneSession(staff, staff.staff._id, sessionId);
  await audit(staff, request, {
    action: "staff.session-end",
    entity: staffEntity(staff.staff),
    summary: `${staff.staff.name} (роль «${staff.role.name}») завершив(ла) одну зі своїх сесій`,
    meta: { session: sessionId, self: true },
  });
  return json({ ok: true });
});
