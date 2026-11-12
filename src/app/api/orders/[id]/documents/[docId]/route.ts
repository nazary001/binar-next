import { fail, handler, requirePartner } from "@/server/http";
import { orderDocumentLocation } from "@/server/repos/orders";
import { zId } from "@/server/validate";

// GET /api/orders/<id>/documents/<docId> - the link of a tile of
// "Документи замовлення" (preview, download, "Завантажити усі документи",
// "До оплати"). A partner gets a 302 to the stored file of a ready
// document of its own company's order; anything else (another company's
// order, an unknown order or document, a pending one) is 404. A guest gets
// 401, a retail customer 403.

type Context = { params: Promise<{ id: string; docId: string }> };

export const GET = handler<Context>(async (_request, { params }) => {
  const partner = await requirePartner();
  const { id, docId } = await params;
  const orderId = zId.safeParse(id);
  const document = zId.safeParse(docId);
  if (!orderId.success || !document.success) return fail(404, "not-found");

  const location = await orderDocumentLocation(partner.clientId, orderId.data, document.data);
  if (!location) return fail(404, "not-found");
  // no-referrer: the file host (a blob store later) never learns which
  // cabinet page the link was opened from.
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
});
