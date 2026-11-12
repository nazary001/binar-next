import { z } from "zod";
import { ORDER_DOC_NOTE_MAX, ORDER_DOC_TITLE_MAX } from "@/components/admin/orders/types";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, parseBody } from "@/server/admin/http";
import {
  orderDocumentFile,
  removeOrderDocument,
  routeId,
  updateOrderDocument,
} from "@/server/admin/repos/orders";
import { mediaResponse } from "@/server/media/store";
import { zId, zRequiredText, zText } from "@/server/validate";

type Context = { params: Promise<{ id: string; docId: string }> };

// GET /api/admin/orders/<id>/documents/<docId>[?download=1] [orders.view]
// The file of a document, whether or not its tile is ready for the
// customer: an uploaded file is streamed (never cached by the browser), a
// stored path or https link answers a 302 to it. 404 "not-found" (no such
// order, document or file).
export const GET = adminHandler<Context>("orders.view", async ({ context, url }) => {
  const params = await context.params;
  const file = await orderDocumentFile(routeId(params.id), routeId(params.docId));
  if (!file) throw new HttpError(404, "not-found");
  if (file.kind === "media") {
    return mediaResponse(file.meta, file.bytes, { cache: "private", download: url.searchParams.get("download") === "1" });
  }
  // The host of a stored link must never learn the panel's address. The
  // panel-wide headers of next.config.ts replace this value with
  // "same-origin", which sends no referrer to another host either.
  return new Response(null, {
    status: 302,
    headers: { Location: file.location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
});

const Patch = z
  .object({
    title: zRequiredText(ORDER_DOC_TITLE_MAX).optional(),
    ready: z.boolean().optional(),
    pendingNote: zText(ORDER_DOC_NOTE_MAX).nullable().optional(),
    mediaId: zId.nullable().optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.title !== undefined ||
      body.ready !== undefined ||
      body.pendingNote !== undefined ||
      body.mediaId !== undefined,
  );

// PATCH /api/admin/orders/<id>/documents/<docId> { title?, ready?,
// pendingNote?, mediaId? } [orders.edit] -> { ok: true, document }
// mediaId null detaches the file (the tile turns pending). Refusals as for
// POST, plus 404 for an unknown document.
export const PATCH = adminHandler<Context>("orders.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = routeId(params.id);
  const docId = routeId(params.docId);
  const body = await parseBody(request, Patch);
  const result = await updateOrderDocument(staff, id, docId, body);
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true, document: result.document });
});

// DELETE /api/admin/orders/<id>/documents/<docId> [orders.edit] -> { ok: true }
// The tile goes; an uploaded file stays in the media library.
export const DELETE = adminHandler<Context>("orders.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const result = await removeOrderDocument(staff, routeId(params.id), routeId(params.docId));
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true });
});
