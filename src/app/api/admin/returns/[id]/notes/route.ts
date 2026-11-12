import { z } from "zod";
import { RETURN_NOTE_MAX } from "@/components/admin/returns/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { routeId } from "@/server/admin/repos/orders";
import { addReturnNote } from "@/server/admin/repos/returns";
import { zRequiredText } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

const Body = z.object({ text: zRequiredText(RETURN_NOTE_MAX) }).strict();

// POST /api/admin/returns/<id>/notes { text } [returns.edit]
// -> 201 { ok: true, note: StaffNoteDto }
// An internal note, never shown to the partner. Allowed on a withdrawn
// request too: it changes nothing the partner sees.
export const POST = adminHandler<Context>("returns.edit", async ({ request, context, staff }) => {
  const id = routeId((await context.params).id);
  const body = await parseBody(request, Body);
  const result = await addReturnNote(staff, id, body.text);
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true, note: result.note }, 201);
});
