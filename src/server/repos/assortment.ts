import "server-only";
import type { AssortmentLine } from "@/components/platform/assortment/data";
import { collection } from "../db/collections";

// "My assortment" of a signed-in buyer (package F): the products a partner
// orders regularly, each with its usual quantity, in the partner's order.
// One document per user (`_id` = user id). The selection and the "added to
// the cart" marker are page state and stay in the browser.

// At most this many lines are stored; a longer list is refused.
export const ASSORTMENT_MAX_LINES = 500;
const QTY_MAX = 100_000;

function isLine(value: unknown): value is AssortmentLine {
  const line = value as Partial<AssortmentLine> | null;
  return (
    typeof line === "object" &&
    line !== null &&
    typeof line.id === "string" &&
    typeof line.qty === "number" &&
    Number.isInteger(line.qty) &&
    line.qty > 0
  );
}

// One line per product, in first-seen order; the quantities of repeated
// ids add up (capped like a single line).
function mergeLines(lines: AssortmentLine[]): AssortmentLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) merged.set(line.id, Math.min(QTY_MAX, (merged.get(line.id) ?? 0) + line.qty));
  return [...merged].map(([id, qty]) => ({ id, qty }));
}

// The saved lines of this buyer ([] when nothing is stored).
export async function assortmentLines(userId: string): Promise<AssortmentLine[] | undefined> {
  const assortments = await collection("assortments");
  const doc = await assortments.findOne({ _id: userId });
  if (!doc || !Array.isArray(doc.lines)) return [];
  return mergeLines(doc.lines.filter(isLine));
}

// Replaces the buyer's lines (already shaped by the route's schema): lines
// of products the catalog does not have are dropped, repeated products are
// merged. Answers what was stored.
export async function saveAssortment(userId: string, lines: AssortmentLine[]): Promise<AssortmentLine[]> {
  const merged = mergeLines(lines);
  let known = new Set<string>();
  if (merged.length > 0) {
    const products = await collection("products");
    const found = await products
      .find({ _id: { $in: merged.map((line) => line.id) } }, { projection: { _id: 1 } })
      .toArray();
    known = new Set(found.map((p) => p._id));
  }
  const stored = merged.filter((line) => known.has(line.id));
  const assortments = await collection("assortments");
  await assortments.updateOne(
    { _id: userId },
    { $set: { lines: stored, updatedAt: new Date() } },
    { upsert: true },
  );
  return stored;
}
