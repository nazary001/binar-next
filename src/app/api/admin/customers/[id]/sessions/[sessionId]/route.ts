import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { endAccountSession, pathId } from "@/server/admin/repos/customers";

// DELETE /api/admin/customers/<id>/sessions/<sessionId> [customers.edit]
// -> { ended }: ends one session of the account. `sessionId` is the
// 12-character prefix the account card shows (CustomerSession.id), looked
// up among this account's sessions only; 404 when none matches.

type Context = { params: Promise<{ id: string; sessionId: string }> };

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const { user, ended } = await endAccountSession(id, params.sessionId);
  await audit(staff, request, {
    action: "customer.session-end",
    entity: { type: "customer", id, label: user.login },
    summary: `Завершено сесію акаунта ${user.login}`,
    meta: { session: params.sessionId },
  });
  return json({ ok: true, ended });
});
