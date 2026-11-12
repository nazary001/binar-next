import { z } from "zod";
import { ORDER_NOTE_MAX } from "@/components/admin/orders/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { addOrderNote, routeId } from "@/server/admin/repos/orders";
import { zRequiredText } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

const Body = z.object({ text: zRequiredText(ORDER_NOTE_MAX) }).strict();

// POST /api/admin/orders/<id>/notes { text } [orders.edit]
// -> 201 { ok: true, note: StaffNoteDto }
// An internal note of staff: kept on the order, never shown to the
// customer. 400 "bad-request", 404 "not-found", 409 "state" (too many).
export const POST = adminHandler<Context>("orders.edit", async ({ request, context, staff }) => {
  const id = routeId((await context.params).id);
  const body = await parseBody(request, Body);
  const result = await addOrderNote(staff, id, body.text);
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true, note: result.note }, 201);
});
