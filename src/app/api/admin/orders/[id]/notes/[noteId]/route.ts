import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { removeOrderNote, routeId } from "@/server/admin/repos/orders";

type Context = { params: Promise<{ id: string; noteId: string }> };

// DELETE /api/admin/orders/<id>/notes/<noteId> [orders.edit] -> { ok: true }
// The author removes a note, and so does an owner: 403 "not-author" for
// anybody else; 404 "not-found" (no such order or note).
export const DELETE = adminHandler<Context>("orders.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const result = await removeOrderNote(staff, routeId(params.id), routeId(params.noteId));
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true });
});
