import { z } from "zod";
import { ORDER_DOC_NOTE_MAX, ORDER_DOC_TITLE_MAX } from "@/components/admin/orders/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { addOrderDocument, routeId } from "@/server/admin/repos/orders";
import { zId, zIsoDate, zRequiredText, zText } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

const Body = z
  .object({
    title: zRequiredText(ORDER_DOC_TITLE_MAX),
    mediaId: zId.optional(),
    date: zIsoDate.optional(),
    ready: z.boolean().optional(),
    pendingNote: zText(ORDER_DOC_NOTE_MAX).optional(),
  })
  .strict();

// POST /api/admin/orders/<id>/documents { title, mediaId?, date?, ready?,
// pendingNote? } [orders.edit] -> 201 { ok: true, document }
// A new tile of "Документи замовлення" of an order of either channel. The
// file is an uploaded media record of any accepted type (stored as
// "media:<id>"); size and format come from it. Refusals
// (OrderDocumentCreateBody in the types file): 400 "bad-request" /
// "fields", 404 "not-found", 409 "state" (too many documents).
export const POST = adminHandler<Context>("orders.edit", async ({ request, context, staff }) => {
  const id = routeId((await context.params).id);
  const body = await parseBody(request, Body);
  const result = await addOrderDocument(staff, id, body);
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true, document: result.document }, 201);
});
