import { kyivDay } from "@/components/admin/lib/format";
import { adminHandler } from "@/server/admin/http";
import { csvResponse } from "@/server/admin/list";
import { exportProducts } from "@/server/admin/repos/products";

// GET /api/admin/products/export - the filtered product list as a CSV file
// (same query string as GET /products, without paging, at most
// EXPORT_MAX_ROWS rows). Numbers carry a decimal comma and booleans read
// "так" / "ні", as a Ukrainian spreadsheet expects.
const HEADER = [
  "Код",
  "Артикул",
  "Назва",
  "Бренд",
  "Об'єм",
  "Категорія",
  "Ціна",
  "Стара ціна",
  "Партнерська ціна",
  "Залишок",
  "В наявності",
  "Показується",
];

const decimal = (value: number | null): string => (value === null ? "" : String(value).replace(".", ","));
const yesNo = (value: boolean): string => (value ? "так" : "ні");

export const GET = adminHandler("catalog.view", async ({ url }) => {
  const rows = await exportProducts(url);
  return csvResponse(
    `products-${kyivDay()}.csv`,
    HEADER,
    rows.map((row) => [
      row.id,
      row.sku,
      row.title,
      row.brand,
      row.volume,
      row.subcategory,
      decimal(row.price),
      decimal(row.oldPrice),
      decimal(row.partnerPrice),
      decimal(row.stockQty),
      yesNo(row.available),
      yesNo(row.listed && !row.archived),
    ]),
  );
});
