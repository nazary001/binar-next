import { fail, handler, requirePartner } from "@/server/http";
import { returnDocumentLocation } from "@/server/repos/returns";
import { zId } from "@/server/validate";

// GET /api/returns/<id>/documents/<docId> - the link of a tile of
// "Документи повернення". A partner gets a 302 to the stored file of a
// ready document of its own company's return (the return's tiles are its
// order's documents); anything else is 404. A guest gets 401, a retail
// customer 403.

type Context = { params: Promise<{ id: string; docId: string }> };

export const GET = handler<Context>(async (_request, { params }) => {
  const partner = await requirePartner();
  const { id, docId } = await params;
  const returnId = zId.safeParse(id);
  const document = zId.safeParse(docId);
  if (!returnId.success || !document.success) return fail(404, "not-found");

  const location = await returnDocumentLocation(partner.clientId, returnId.data, document.data);
  if (!location) return fail(404, "not-found");
  // no-referrer: the file host (a blob store later) never learns which
  // cabinet page the link was opened from.
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
});
