import { staffActor } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { shippingOrderOr404 } from "@/server/integrations/nova-poshta/http";
import { shippingOrderView } from "@/server/integrations/nova-poshta/shipments";

// GET /api/admin/shipping/orders/[orderId] -> ShippingOrderDto
//
// What the "create a waybill" form starts from: the order summary, the
// recipient as the buyer typed it at checkout (or the cabinet's delivery
// of a partner order), the parcel defaults of the settings with the order
// total as the declared value (and as cash on delivery when the buyer
// chose "Післяплата"), whether the integration is ready, and the shipment
// if there is one. With settings.autoTrack a parcel on the way is
// re-checked first when its last check is older than 30 minutes.

type Context = { params: Promise<{ orderId: string }> };

export const GET = adminHandler<Context>("shipping.view", async ({ context, staff }) => {
  const { orderId } = await context.params;
  const order = await shippingOrderOr404(orderId);
  return json(await shippingOrderView(order, staffActor(staff)));
});
