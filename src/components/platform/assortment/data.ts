// «Мій асортимент» — Figma section 4209:74148 (frames 4202:36108
// default, 4929:65033 empty, 4204:54233 rows selected, 4204:55408 added
// to the cart). The assortment is the list of products a partner buys
// regularly; the CRM will form it from the order history. Until then the
// placeholder list below is the demo partner's assortment (store.ts);
// any other B2B account starts empty, like a partner without orders.
//
// Every row points at a product of the shop catalog (catalog/data.ts +
// product/data.ts EXTRA_PRODUCTS) so the cart drawer can resolve the
// lines the bulk «Додати у кошик» puts there. The three price columns
// are the B2B trio of the catalog (`b2bPrices`): «Оптова ціна» =
// wholesale, «Роздрібна ціна» = retail, «Ваша ціна» = the partner price
// that the row sum and the selection sum multiply by the quantity.
import { b2bPrices, type Product } from "@/components/catalog/data";
import { findProduct } from "@/components/product/data";
import type { StatusTone } from "@/components/platform/ui";

// The availability badge set «Badge / Мі1 асортимент» (4204:42283 /
// 4204:42284 / 4204:42294): the r40 StatusPill (pl-8 pr-10 py-8, a
// 16-px box with the 6-px dot, 14/22 Medium label); the colours live in
// StatusPill's tones, verbatim from the contexts:
//   «В наявності»        mint   #eaf7ee / #197a4d / dot #219653 (ctx 4202-37038)
//   «Обмежена кількість» orange #fff1eb / #d94e0b / dot #f85a0b (ctx 4204-54090)
//   «Під замовлення»     red    #fff0f0 / #b33a3a / dot #d9534f (ctx 4202-37038)
// «Обмежена кількість» is the 172-px instance of row 5 in every table
// frame (4204:54107 / 4204:54571 / 4204:55753).
export type Availability = "in-stock" | "limited" | "preorder";

export const AVAILABILITY: Record<Availability, { label: string; tone: StatusTone }> = {
  "in-stock": { label: "В наявності", tone: "mint" },
  limited: { label: "Обмежена кількість", tone: "orange" },
  preorder: { label: "Під замовлення", tone: "red" },
};

// Products the placeholder stock marks as running low (row 5 of the
// master, «Шампунь для волосся і тіла, 40мл, Botanica» shampoo-1). The
// CRM stock levels replace this set.
const LIMITED_STOCK: ReadonlySet<string> = new Set(["shampoo-1"]);

// One saved line of the assortment: the product and the quantity the
// partner usually orders (the stepper edits it).
export type AssortmentLine = { id: string; qty: number };

// A line resolved against the catalog, with everything a table row
// draws.
export type AssortmentRow = {
  id: string;
  product: Product;
  name: string;
  sku: string;
  availability: Availability;
  wholesale: number;
  retail: number;
  partner: number;
  qty: number;
  sum: number;
};

// Placeholder assortment: 48 lines, so the default view (10 per page)
// shows the five numbered page buttons of the master's pager
// (4204:41363: prev, 1-5, next). The first row is the master's
// «Шампунь для волосся і тіла, 40мл, Botanica» x 50 = 1 449,50 ₴; row 5
// carries the 172-px «Обмежена кількість» badge (LIMITED_STOCK) and row
// 9 is «Під замовлення» like the 145-px badge of 4204:54012. Quantities
// default to the master's 50 for small-pack cosmetics and to box sizes
// for textiles.
const LEAD: AssortmentLine[] = [
  { id: "shampoo-alt-1", qty: 50 },
  { id: "soap-1", qty: 50 },
  { id: "lotion-1", qty: 50 },
  { id: "conditioner-1", qty: 50 },
  { id: "shampoo-1", qty: 50 },
  { id: "slippers-1", qty: 20 },
  { id: "robe-1", qty: 10 },
  { id: "shampoo-5", qty: 50 },
  { id: "shampoo-4", qty: 50 },
  { id: "shampoo-6", qty: 50 },
];

export const DEFAULT_LINES: AssortmentLine[] = [
  ...LEAD,
  // shampoo-7 .. shampoo-44: the catalog's placeholder cards (their
  // brands and categories cycle, so search has something to find).
  ...Array.from({ length: 38 }, (_, i) => ({ id: `shampoo-${i + 7}`, qty: 50 })),
];

// «Артикул:» — the master leaves the value empty; a stable placeholder
// code per product until the CRM feeds the real one.
export function skuOf(product: Product): string {
  const n = [...product.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100000, 7);
  return `BN-${String(n).padStart(5, "0")}`;
}

// «Шампунь для волосся і тіла, 40мл, Botanica» — title, volume and
// brand; the master writes the volume without a space before мл / л / г.
export function rowName(product: Product): string {
  const volume = product.volume.replace(/(\d)\s+(мл|л|г|кг)$/u, "$1$2");
  return `${product.title}, ${volume}, ${product.brand}`;
}

export function availabilityOf(product: Product): Availability {
  if (product.preorder || !product.available) return "preorder";
  return LIMITED_STOCK.has(product.id) ? "limited" : "in-stock";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function resolveRows(lines: AssortmentLine[]): AssortmentRow[] {
  return lines.flatMap((line) => {
    const product = findProduct(line.id);
    if (!product) return [];
    const { wholesale, retail, partner } = b2bPrices(product);
    return [
      {
        id: line.id,
        product,
        name: rowName(product),
        sku: skuOf(product),
        availability: availabilityOf(product),
        wholesale,
        retail,
        partner,
        qty: line.qty,
        sum: round2(partner * line.qty),
      },
    ];
  });
}

export function rowsTotal(rows: AssortmentRow[]): number {
  return round2(rows.reduce((s, r) => s + r.sum, 0));
}

// The Excel import of the empty state and the head button. The CRM
// endpoint does not exist yet: the picker accepts .xlsx and the chosen
// file is ignored.
export const EXCEL_ACCEPT =
  ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
