// Cart domain helpers — Figma «Кошик» section (4329:39830).
import { b2bPrices, productsPlural, type Product } from "@/components/catalog/data";
import { ALL_PRODUCTS, findProduct } from "@/components/product/data";

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

export function unitPrice(product: Product, mode: PriceMode = "retail"): number {
  return mode === "partner" ? b2bPrices(product).partner : product.price;
}

// «5 000 ₴» — the free-delivery threshold the summary's progress bar
// measures against (4329:40056).
export const FREE_DELIVERY_THRESHOLD = 5000;

export const CART_STORAGE_KEY = "binar-cart-v1";

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

export function lineTotal(entry: CartEntry, mode: PriceMode = "retail"): number {
  return Math.round(unitPrice(entry.product, mode) * entry.line.qty * 100) / 100;
}

export function cartSubtotal(entries: CartEntry[], mode: PriceMode = "retail"): number {
  return Math.round(entries.reduce((sum, e) => sum + lineTotal(e, mode), 0) * 100) / 100;
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
  const pool = ALL_PRODUCTS.filter(
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
