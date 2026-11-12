import { audit, staffActor } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { WaybillBody, shippingOrderOr404, withNp } from "@/server/integrations/nova-poshta/http";
import {
  cancelOrderShipment,
  createOrderWaybill,
  previewOrderWaybill,
  toShipmentDto,
} from "@/server/integrations/nova-poshta/shipments";

// POST /api/admin/shipping/orders/[orderId]/waybill WaybillInput
//   dryRun: true -> { ok, dryRun: true, preview: WaybillPreview }
//     The requests a real run would send (recipient, address, waybill),
//     with placeholders where the carrier's answers go. Needs no key and
//     stores nothing; `preview.missing` lists what a real run still lacks.
//   otherwise -> { ok, shipment: ShipmentDto, warnings }
//     Creates the waybill at Nova Poshta and stores it on the order
//     (status "created", number, ref, cost, estimated date, recipient,
//     parameters, events) with a history entry.
//   400 "fields" { fields }: the form's rules (name of two words, phone,
//   branch / postomat / street + house, a postomat's dimensions);
//   409 "exists": the order has a live shipment; 409 "np-not-configured"
//   { missing }: no key, integration off, sender profile incomplete;
//   422 "np-auth" / "np-error" { message }: the carrier refused;
//   502 "np-unavailable".
//
// DELETE /api/admin/shipping/orders/[orderId]/waybill -> { ok, shipment }
//   Deletes the waybill at the carrier when it was made there and not
//   handed over yet, or marks a typed-in shipment cancelled; the shipment
//   stays on the order as "cancelled". 409 "state" when there is nothing
//   to cancel or the parcel is already on its way.

type Context = { params: Promise<{ orderId: string }> };

export const POST = adminHandler<Context>("shipping.edit", async ({ request, context, staff }) => {
  const { orderId } = await context.params;
  const order = await shippingOrderOr404(orderId);
  const body = await parseBody(request, WaybillBody);
  const { dryRun, ...input } = body;
  if (dryRun) {
    const preview = await withNp(() => previewOrderWaybill(order, input));
    return json({ ok: true, dryRun: true, preview });
  }
  const created = await withNp(() => createOrderWaybill(order, input, staffActor(staff)));
  await audit(staff, request, {
    action: "shipment.create",
    entity: { type: "order", id: order._id, label: `№${order.number}` },
    summary: `Створено накладну Нової Пошти ${created.shipment.ttn} для замовлення №${order.number}`,
    meta: { ttn: created.shipment.ttn, serviceType: created.shipment.params?.serviceType ?? null, cost: created.shipment.cost },
  });
  return json({ ok: true, shipment: toShipmentDto(created.shipment), warnings: created.warnings });
});

export const DELETE = adminHandler<Context>("shipping.edit", async ({ request, context, staff }) => {
  const { orderId } = await context.params;
  const order = await shippingOrderOr404(orderId);
  const { shipment, atCarrier } = await withNp(() => cancelOrderShipment(order, staffActor(staff)));
  const number = shipment.ttn ? ` ${shipment.ttn}` : "";
  await audit(staff, request, {
    action: "shipment.cancel",
    entity: { type: "order", id: order._id, label: `№${order.number}` },
    summary: atCarrier
      ? `Видалено накладну Нової Пошти${number} замовлення №${order.number}`
      : `Скасовано відправлення${number} замовлення №${order.number}`,
    meta: { ttn: shipment.ttn, carrier: shipment.carrier, atCarrier },
  });
  return json({ ok: true, shipment: toShipmentDto(shipment) });
});
