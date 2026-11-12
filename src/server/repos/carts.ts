import "server-only";
import { CART_MAX_LINES, CART_MAX_QTY, rebaseCartLines, type CartLine } from "@/components/cart/data";
import { collection } from "../db/collections";

// Saved carts of signed-in accounts (package D).
//
// The browser's cart (localStorage "binar-cart-v1", components/cart/store.ts)
// stays the working copy; carts[userId] is the durable copy of a signed-in
// account. PUT /api/cart writes it (debounced by the cart store), the
// session bootstrap sends it back, and placing an order empties it
// (package E). A stored cart only ever holds products the shop sells:
// unknown and archived ids are dropped on the way in, and on the way out
// too, so a product that later leaves the catalog leaves the cart with the
// next session answer.

function isLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as CartLine;
  return typeof line.id === "string" && Number.isInteger(line.qty) && line.qty > 0;
}

// The cart as it may be stored: one line per product id (quantities of a
// repeated id are summed, the first appearance keeps its place), only ids
// in `known`, at most CART_MAX_QTY units per line and CART_MAX_LINES lines.
// Pure, so the rule can be checked without a database.
export function normalizeCartLines(lines: readonly unknown[], known: ReadonlySet<string>): CartLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!isLine(line) || !known.has(line.id)) continue;
    merged.set(line.id, (merged.get(line.id) ?? 0) + line.qty);
  }
  return [...merged]
    .slice(0, CART_MAX_LINES)
    .map(([id, qty]) => ({ id, qty: Math.min(qty, CART_MAX_QTY) }));
}

// Which of these ids are products of the shop (`_id` in `products`, not
// archived: a product staff took out of the shop, archivedAt a date, leaves
// every cart with the next save or session answer, as the catalog snapshot
// leaves it out). Every id is a plain string here (isLine), never an
// operator object.
async function existingProductIds(lines: readonly CartLine[]): Promise<Set<string>> {
  const ids = [...new Set(lines.map((line) => line.id))];
  if (ids.length === 0) return new Set();
  const products = await collection("products");
  const docs = await products
    .find({ _id: { $in: ids }, archivedAt: { $not: { $type: "date" } } }, { projection: { _id: 1 } })
    .toArray();
  return new Set(docs.map((doc) => doc._id));
}

// The stored lines of this account; [] when it has no cart document yet.
export async function cartLines(userId: string): Promise<CartLine[]> {
  const carts = await collection("carts");
  const doc = await carts.findOne({ _id: userId }, { projection: { lines: 1 } });
  const stored = Array.isArray(doc?.lines) ? doc.lines.filter(isLine) : [];
  if (stored.length === 0) return [];
  return normalizeCartLines(stored, await existingProductIds(stored));
}

async function normalized(lines: readonly CartLine[]): Promise<CartLine[]> {
  return normalizeCartLines(lines, await existingProductIds(lines));
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 11000;
}

// Conditional writes that may lose a race before the save stops checking
// and writes its last merge (other devices saving the same cart this often
// at the same moment is not a real case; the loop must end anyway).
const MERGE_ATTEMPTS = 8;

// Stores the cart of this account and returns what was stored (lines of
// unknown products are dropped, repeated ids merged, quantities and the
// line count capped).
//
// Without `base` the lines replace the stored cart (an order placed empties
// it this way, package E: saveCartLines(userId, [])). With `base` (the saved
// cart the browser last knew, PUT /api/cart) the browser's changes are
// applied on top of the cart as it is stored NOW (rebaseCartLines): a
// device that missed another device's change does not undo it. The write
// is conditional on the document being the one the merge read (its
// updatedAt), and a lost race merges again.
export async function saveCartLines(userId: string, lines: CartLine[], base?: CartLine[]): Promise<CartLine[]> {
  const valid = lines.filter(isLine);
  const carts = await collection("carts");
  if (!base) {
    const stored = await normalized(valid);
    await carts.updateOne({ _id: userId }, { $set: { lines: stored, updatedAt: new Date() } }, { upsert: true });
    return stored;
  }

  const was = base.filter(isLine);
  for (let attempt = 1; ; attempt++) {
    const doc = await carts.findOne({ _id: userId }, { projection: { lines: 1, updatedAt: 1 } });
    const current = Array.isArray(doc?.lines) ? doc.lines.filter(isLine) : [];
    const stored = await normalized(rebaseCartLines(was, valid, current));
    const updatedAt = new Date();
    if (attempt >= MERGE_ATTEMPTS) {
      await carts.updateOne({ _id: userId }, { $set: { lines: stored, updatedAt } }, { upsert: true });
      return stored;
    }
    if (!doc) {
      try {
        await carts.insertOne({ _id: userId, lines: stored, updatedAt });
        return stored;
      } catch (error) {
        if (isDuplicateKey(error)) continue;
        throw error;
      }
    }
    const result = await carts.updateOne({ _id: userId, updatedAt: doc.updatedAt }, { $set: { lines: stored, updatedAt } });
    if (result.matchedCount === 1) return stored;
  }
}
