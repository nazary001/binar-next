import { ORDER_SORTS } from "@/components/admin/orders/types";
import { adminHandler, json } from "@/server/admin/http";
import { listQuery } from "@/server/admin/list";
import { listOrders } from "@/server/admin/repos/orders";

// GET /api/admin/orders?q=&channel=&status=&payment=&from=&to=&clientId=
//   &managerId=&cancelRequest=&sort=&page=&limit=  [orders.view]
// -> { ok: true, items: OrderRow[], total, page, limit }
// Every order of both channels, newest first by default. The filters are
// described in src/components/admin/orders/types.ts (OrderListFilters); a
// value outside a closed set is ignored.
export const GET = adminHandler("orders.view", async ({ url }) => {
  const query = listQuery(url, { sortable: ORDER_SORTS, defaultSort: "-createdAt" });
  const page = await listOrders(query);
  return json({ ok: true, ...page });
});
