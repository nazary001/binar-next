import { SHIPPING_DEFAULT_SORT, SHIPPING_SORTS } from "@/components/admin/shipping/types";
import { adminHandler, json } from "@/server/admin/http";
import { listQuery } from "@/server/admin/list";
import { listShipments } from "@/server/integrations/nova-poshta/shipments";

// GET /api/admin/shipping?status=&carrier=&q=&from=&to=&sort=&page=&limit=
//   -> { ok, items: ShipmentRow[], total, page, limit, counts }
//
// Orders that have a shipment (any carrier, a cancelled one included).
// status: several (SHIPMENT_STATUSES); carrier: one (CARRIERS); q: the
// waybill number, the order number, the recipient's name or phone; from /
// to: Kyiv days of shipment.createdAt; sort: SHIPPING_SORTS, newest
// waybill first by default. `counts` are per status over every shipment.

export const GET = adminHandler("shipping.view", async ({ url }) => {
  const query = listQuery(url, { sortable: SHIPPING_SORTS, defaultSort: SHIPPING_DEFAULT_SORT });
  const { page, counts } = await listShipments(query);
  return json({ ok: true, ...page, counts });
});
