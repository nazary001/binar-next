// Cart domain helpers — Figma «Кошик» section (4329:39830).
import type { Product } from "@/components/catalog/data";
import { ALL_PRODUCTS, findProduct } from "@/components/product/data";

// A cart line: product id + quantity. Prices come from the product
// itself so a price change in the feed reprices the cart.
export type CartLine = { id: string; qty: number };

export type CartEntry = { line: CartLine; product: Product };

// «5 000 ₴» — the free-delivery threshold the summary's progress bar
// measures against (4329:40056).
export const FREE_DELIVERY_THRESHOLD = 5000;

export const CART_STORAGE_KEY = "binar-cart-v1";

export function resolveLines(lines: CartLine[]): CartEntry[] {
  return lines.flatMap((line) => {
    const product = findProduct(line.id);
    return product ? [{ line, product }] : [];
  });
}

export function lineTotal(entry: CartEntry): number {
  return Math.round(entry.product.price * entry.line.qty * 100) / 100;
}

export function cartSubtotal(entries: CartEntry[]): number {
  return Math.round(entries.reduce((sum, e) => sum + lineTotal(e), 0) * 100) / 100;
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
export function checkStock(entries: CartEntry[]): StockIssue[] {
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
