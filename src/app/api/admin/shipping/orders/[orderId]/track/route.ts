import { staffActor } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { shippingOrderOr404, withNp } from "@/server/integrations/nova-poshta/http";
import { refreshOrderShipment, toShipmentDto } from "@/server/integrations/nova-poshta/shipments";

// POST /api/admin/shipping/orders/[orderId]/track -> { ok, shipment, changed }
//
// Asks the carrier about this order's parcel now. A view permission: it
// only brings the carrier's own news in (a change is written to the
// shipment events and the order history as "Нова Пошта"). 409 "state" when
// the order has no Nova Poshta waybill to track; 502 "np-unavailable".

type Context = { params: Promise<{ orderId: string }> };

export const POST = adminHandler<Context>("shipping.view", async ({ context, staff }) => {
  const { orderId } = await context.params;
  const order = await shippingOrderOr404(orderId);
  const { shipment, changed } = await withNp(() => refreshOrderShipment(order, staffActor(staff)));
  return json({ ok: true, shipment: toShipmentDto(shipment), changed });
});
