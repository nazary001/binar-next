import { CARRIER_LABELS } from "@/components/admin/shipping/types";
import { audit, staffActor } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { ManualBody, shippingOrderOr404, withNp } from "@/server/integrations/nova-poshta/http";
import { attachManualShipment, toShipmentDto } from "@/server/integrations/nova-poshta/shipments";

// POST /api/admin/shipping/orders/[orderId]/manual { carrier, ttn?, note? } -> { ok, shipment }
//
// Attaches a waybill number typed by hand (a Nova Poshta number made in
// its own cabinet: 14 digits, tracked like any other; another carrier's
// number) or marks a pickup at the shop. Nothing is sent to the carrier.
// 400 "fields" { fields: { ttn } }; 409 "exists" when the order has a
// live shipment.

type Context = { params: Promise<{ orderId: string }> };

export const POST = adminHandler<Context>("shipping.edit", async ({ request, context, staff }) => {
  const { orderId } = await context.params;
  const order = await shippingOrderOr404(orderId);
  const body = await parseBody(request, ManualBody);
  const shipment = await withNp(() => attachManualShipment(order, body, staffActor(staff)));
  await audit(staff, request, {
    action: "shipment.manual",
    entity: { type: "order", id: order._id, label: `№${order.number}` },
    summary:
      shipment.carrier === "pickup"
        ? `Замовлення №${order.number} позначено як самовивіз`
        : `Додано номер відправлення ${shipment.ttn} (${CARRIER_LABELS[shipment.carrier]}) до замовлення №${order.number}`,
    meta: { carrier: shipment.carrier, ttn: shipment.ttn },
  });
  return json({ ok: true, shipment: toShipmentDto(shipment) });
});
