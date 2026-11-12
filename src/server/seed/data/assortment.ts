import "server-only";
import type { AssortmentLine } from "@/components/platform/assortment/data";

// The demo partner's "My assortment", exactly as the browser mock shipped it
// (src/components/platform/assortment/data.ts DEFAULT_LINES before the
// database). Read by src/server/seed/assortment.ts only.
//
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
