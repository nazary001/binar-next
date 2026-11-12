// Cart domain helpers — Figma «Кошик» section (4329:39830).
import { b2bPrices, productsPlural, type Product } from "@/components/catalog/data";
import { allProducts, findProduct, type PartnerPrices } from "@/components/catalog/registry";

// A cart line: product id + quantity. Prices come from the product
// itself so a price change in the feed reprices the cart.
export type CartLine = { id: string; qty: number };

export type CartEntry = { line: CartLine; product: Product };

// Which price a line is charged at. A signed-in B2B partner pays the
// partner price («ваша ціна» of the catalog trio): the drawer of the
// «Мій асортимент :: Додано у кошик» frame (4204:56703) bills 50 x 28,99
// = «1 449,50 ₴» per line and «7 247,50 ₴» for five. Everyone else pays
// the shop price.
export type PriceMode = "retail" | "partner";

// `prices` = the partner's price map (usePartnerPrices() in CartProvider,
// so the sums follow the server's map); omitted = the mirror as it is now.
export function unitPrice(product: Product, mode: PriceMode = "retail", prices?: PartnerPrices | null): number {
  return mode === "partner" ? b2bPrices(product, prices).partner : product.price;
}

// «5 000 ₴» — the free-delivery threshold the summary's progress bar
// measures against (4329:40056).
export const FREE_DELIVERY_THRESHOLD = 5000;

export const CART_STORAGE_KEY = "binar-cart-v1";

// Limits of the cart a signed-in account keeps on the server (PUT
// /api/cart, server/repos/carts.ts): at most this many lines, at most this
// many units in one line. The browser never sends more; the server
// enforces both.
export const CART_MAX_LINES = 200;
export const CART_MAX_QTY = 100_000;

// Three-way merge of a signed-in account's cart; one rule, two callers (the
// cart store and PUT /api/cart, server/repos/carts.ts). `base` = the saved
// cart the browser last knew, `local` = the browser's lines now (base plus
// this browser's changes), `server` = the saved cart now (base plus what
// other devices changed meanwhile). A line this browser did not change
// follows the server, so a removal or a quantity made on another device
// sticks instead of being brought back by a stale copy; a line it did
// change keeps the local quantity (also when another device changed it
// too: this, the newer edit, wins). Quantity 0 = no line. Order: the local
// lines first, then the lines only the server has, in the server's order.
export function rebaseCartLines(
  base: readonly CartLine[],
  local: readonly CartLine[],
  server: readonly CartLine[],
): CartLine[] {
  const qtyOf = (lines: readonly CartLine[]) => {
    const map = new Map<string, number>();
    lines.forEach((l) => map.set(l.id, (map.get(l.id) ?? 0) + l.qty));
    return map;
  };
  const was = qtyOf(base);
  const mine = qtyOf(local);
  const theirs = qtyOf(server);
  const ids = new Set([...local.map((l) => l.id), ...server.map((l) => l.id)]);
  return [...ids].flatMap((id) => {
    const before = was.get(id) ?? 0;
    const here = mine.get(id) ?? 0;
    const qty = here === before ? (theirs.get(id) ?? 0) : here;
    return qty > 0 ? [{ id, qty }] : [];
  });
}

// The free-delivery meter's motion (drawer and phone sheet): the fill,
// the knob and the sum chip glide to the new sum on the curve the digits
// roll on (ui/RollingNumber.tsx), so the meter and the numbers move as
// one.
export const METER_MOTION =
  "transition-[left,width] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

export function resolveLines(lines: CartLine[]): CartEntry[] {
  return lines.flatMap((line) => {
    const product = findProduct(line.id);
    return product ? [{ line, product }] : [];
  });
}

export function lineTotal(entry: CartEntry, mode: PriceMode = "retail", prices?: PartnerPrices | null): number {
  return Math.round(unitPrice(entry.product, mode, prices) * entry.line.qty * 100) / 100;
}

export function cartSubtotal(entries: CartEntry[], mode: PriceMode = "retail", prices?: PartnerPrices | null): number {
  return Math.round(entries.reduce((sum, e) => sum + lineTotal(e, mode, prices), 0) * 100) / 100;
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

// One row of the «Деякі товари закінчилися» modal (4329:40304): the
// line that ran out, the in-stock alternative and the quantity the
// customer wants of it.
export type StockIssue = {
  lineId: string;
  product: Product;
  // Absent when nothing in stock is close enough — the row then offers
  // «Видалити» instead of «Замінити», so a sold-out line can never pass
  // the checkout gate silently.
  replacement?: Product;
  qty: number;
  resolved: boolean;
};

// Stock check at checkout. There is no backend yet, so the mock treats
// two things as «sold out while you were shopping»: products flagged
// unavailable in the feed, and PROMO lines (the item with an oldPrice —
// a sale running out is the realistic demo case; add the «-25%» shampoo
// from /catalog and press «Оформити замовлення» to see the modal).
// Retail only: a B2B partner orders on request, so an unavailable or
// preorder line is «Під замовлення» (B2BStatusLine) and stays orderable,
// and the partner price row has no promo - nothing ever sells out there.
export function checkStock(entries: CartEntry[], mode: PriceMode = "retail"): StockIssue[] {
  if (mode === "partner") return [];
  const inCart = new Set(entries.map((e) => e.line.id));
  return entries.flatMap((entry) => {
    const soldOut = !entry.product.available || entry.product.oldPrice !== undefined;
    if (!soldOut) return [];
    return [
      {
        lineId: entry.line.id,
        product: entry.product,
        replacement: suggestReplacement(entry.product, inCart),
        qty: entry.line.qty,
        resolved: false,
      },
    ];
  });
}

// The closest in-stock alternative: same title + volume first (the
// designer's alternative shampoo photo lives on «shampoo-alt-1», so it
// wins among equals), then the same subcategory, then anything in
// stock — never a promo, never something already in the cart.
export function suggestReplacement(
  product: Product,
  inCart: Set<string>,
): Product | undefined {
  const pool = allProducts().filter(
    (p) =>
      p.id !== product.id && p.available && p.oldPrice === undefined && !inCart.has(p.id),
  );
  const score = (p: Product) =>
    (p.title === product.title && p.volume === product.volume ? 4 : 0) +
    (p.id.startsWith("shampoo-alt") ? 2 : 0) +
    (p.subcategory === product.subcategory ? 1 : 0);
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

// «3 товари закінчилися» — noun + verb agreement for the modal copy.
export function soldOutPhrase(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} товар закінчився`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} товари закінчилися`;
  }
  return `${n} товарів закінчилося`;
}

// "6 товарів" - the phone cart sheet's head-row count (units, the same
// number as the header badge): 1 товар / 2-4 товари / 5+ товарів, 11-14
// товарів.
export function itemsPhrase(n: number): string {
  return `${n} ${productsPlural(n)}`;
}

// The phone line meta: the card chips as one wrapping text line, "40 мл,
// ALDA hotel cosmetics" (a nowrap chip does not fit a 320 row).
export function lineMeta(product: Product): string {
  return (product.chips ?? [product.volume, product.brand]).join(", ");
}
