import { LABEL_KINDS } from "@/components/admin/shipping/types";
import { staffActor } from "@/server/admin/audit";
import { HttpError, adminHandler } from "@/server/admin/http";
import { oneOf } from "@/server/admin/list";
import { shippingOrderOr404, withNp } from "@/server/integrations/nova-poshta/http";
import { fetchLabel } from "@/server/integrations/nova-poshta/labels";

// GET /api/admin/shipping/orders/[orderId]/label?kind=waybill|marking -> application/pdf
//
// The waybill (A4) or the 100x100 marking of the order's Nova Poshta
// parcel, fetched from the carrier by the server (its print address holds
// the key) and passed on as it came. 400 for another kind; 409 "state"
// without a printable waybill; 409 "np-not-configured" without a key;
// 422 "np-auth" / "np-error"; 502 "np-unavailable".

type Context = { params: Promise<{ orderId: string }> };

export const GET = adminHandler<Context>("shipping.view", async ({ context, staff, url }) => {
  const { orderId } = await context.params;
  const kind = oneOf(url.searchParams, "kind", LABEL_KINDS);
  if (!kind) throw new HttpError(400, "bad-request");
  const order = await shippingOrderOr404(orderId);
  const shipment = order.shipment;
  if (!shipment || shipment.carrier !== "nova-poshta" || !shipment.ttn || shipment.status === "cancelled" || shipment.status === "draft") {
    throw new HttpError(409, "state");
  }
  const ttn = shipment.ttn;
  const bytes = await withNp(() => fetchLabel(ttn, kind, staffActor(staff)));
  const name = `${kind === "waybill" ? "nakladna" : "marking"}-${ttn.replace(/[^0-9A-Za-z-]/g, "")}.pdf`;
  return new Response(new Blob([bytes as BlobPart], { type: "application/pdf" }), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
