import { plural } from "@/components/admin/lib/format";
import { ORDER_SORTS } from "@/components/admin/orders/types";
import { audit } from "@/server/admin/audit";
import { adminHandler } from "@/server/admin/http";
import { csvResponse, listQuery } from "@/server/admin/list";
import { ORDER_EXPORT_HEADER, exportOrders } from "@/server/admin/repos/orders";
import { kyivToday } from "@/server/time";

// GET /api/admin/orders/export?<the filters of GET /api/admin/orders>
// [orders.view] -> a CSV file (";" separated, UTF-8 with a BOM, Ukrainian
// column titles), at most ORDER_EXPORT_MAX rows in the list's sort.
// The file holds customers' contacts, so every export is written to the
// journal with the filters it used.
export const GET = adminHandler("orders.view", async ({ request, staff, url }) => {
  const query = listQuery(url, { sortable: ORDER_SORTS, defaultSort: "-createdAt" });
  const rows = await exportOrders(query);
  const filters = Object.fromEntries(
    [...query.params.entries()].filter(([key]) => key !== "page" && key !== "limit").map(([k, v]) => [k, v.slice(0, 100)]),
  );
  await audit(staff, request, {
    action: "order.export",
    entity: null,
    summary: `Експорт замовлень у CSV: ${rows.length} ${plural(rows.length, ["рядок", "рядки", "рядків"])}`,
    meta: { rows: rows.length, filters },
  });
  return csvResponse(`orders-${kyivToday()}.csv`, ORDER_EXPORT_HEADER, rows);
});
