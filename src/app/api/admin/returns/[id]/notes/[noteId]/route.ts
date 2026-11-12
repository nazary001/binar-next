import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { routeId } from "@/server/admin/repos/orders";
import { removeReturnNote } from "@/server/admin/repos/returns";

type Context = { params: Promise<{ id: string; noteId: string }> };

// DELETE /api/admin/returns/<id>/notes/<noteId> [returns.edit] -> { ok: true }
// 404 "not-found" (no such request or note).
export const DELETE = adminHandler<Context>("returns.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const result = await removeReturnNote(staff, routeId(params.id), routeId(params.noteId));
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true });
});
