import "server-only";
import { TAG } from "../../../cache-tags";
import { collection, type PriceTypeDoc, type ProductDoc } from "../../../db/collections";
import type { PriceInput } from "../contract";
import { failed, guarded, mapPool, ok, type ApplyResult, type Outcome } from "../batch";
import { indexProducts, resolveProduct } from "./lookup";

// PUT /prices: one price per product and price type.
//
// Every price lands in product.prices[<price type id>]. A price of the
// type whose role is "base" (set in the panel) is also the regular price
// of the shop:
// - no promo: it is the price the shop shows (product.price);
// - a promo is running (staff set oldPrice; the exchange never starts one):
//   the promo price stays as staff set it and the base price becomes the
//   struck regular price (product.oldPrice). The regular price is thus
//   always the current one: partner prices are counted from it, and it is
//   what the product costs again once staff end the promo;
// - the base price falls to the promo price or below: nothing is left of
//   the discount, so the promo ends and the base price is the shop price.
// Whenever the struck price moves, a discount label staff typed for the
// old pair of prices is dropped (the site then shows the real percentage).
// The roles are read here, at push time: giving the base role to another
// type in the panel changes nothing on the site until BAS next sends that
// type's prices. A price of the "individual" type is stored; partner prices
// read it live (repos/catalog.ts partnerPrices). Prices are in UAH: the
// site has no other currency.

const CONCURRENCY = 6;

type Row = { item: PriceInput; index: number; type: PriceTypeDoc };

export function priceRowId(item: Pick<PriceInput, "productExternalId" | "sku" | "priceTypeExternalId">): string {
  return `${item.productExternalId ?? item.sku ?? ""}:${item.priceTypeExternalId}`;
}

const usable = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export async function applyPrices(items: PriceInput[]): Promise<ApplyResult> {
  const outcomes: (Outcome | null)[] = items.map(() => null);
  const types = await (await collection("priceTypes"))
    .find({ externalId: { $in: [...new Set(items.map((item) => item.priceTypeExternalId))] } })
    .toArray();
  const typeByExternal = new Map(types.map((type) => [type.externalId, type]));
  const index = await indexProducts(
    items.flatMap((item) => (item.productExternalId ? [item.productExternalId] : [])),
    items.flatMap((item) => (item.sku ? [item.sku] : [])),
    { prices: 1, price: 1, oldPrice: 1, externalId: 1, "details.sku": 1 },
  );

  // The rows of each product, so a product is written once per batch.
  const groups = new Map<string, { doc: ProductDoc; rows: Row[] }>();
  items.forEach((item, i) => {
    if (item.currency && item.currency !== "UAH") {
      outcomes[i] = failed("currency: prices are kept in UAH");
      return;
    }
    const type = typeByExternal.get(item.priceTypeExternalId);
    if (!type) {
      outcomes[i] = failed(`unknown-price-type: ${item.priceTypeExternalId}`);
      return;
    }
    const doc = resolveProduct(index, item);
    if (doc === "unknown" || doc === "ambiguous") {
      outcomes[i] = failed(doc === "unknown" ? "unknown-product" : "ambiguous-sku");
      return;
    }
    const group = groups.get(doc._id) ?? { doc, rows: [] };
    // One product named twice for one price type (by GUID and by sku).
    if (group.rows.some((row) => row.type._id === type._id)) {
      outcomes[i] = failed("duplicate-in-batch");
      return;
    }
    group.rows.push({ item, index: i, type });
    groups.set(doc._id, group);
  });

  const products = await collection("products");
  let baseChanged = false;
  await mapPool([...groups.values()], CONCURRENCY, async ({ doc, rows }) => {
    const outcome = await guarded("prices", async (): Promise<Outcome> => {
      const stored = doc.prices && typeof doc.prices === "object" && !Array.isArray(doc.prices) ? doc.prices : null;
      const set: Record<string, unknown> = {};
      const changed: Record<string, number> = {};
      let price = doc.price;
      const promoOld = usable(doc.oldPrice) ? doc.oldPrice : null;
      let oldPrice = promoOld;
      for (const { item, type, index } of rows) {
        const before = stored?.[type._id];
        const status = before === undefined ? "created" : before === item.price ? "unchanged" : "updated";
        outcomes[index] = ok(status);
        if (status !== "unchanged") changed[type._id] = item.price;
        if (type.role !== "base") continue;
        if (oldPrice === null) price = item.price;
        else if (item.price > price) oldPrice = item.price;
        else {
          // No discount is left: the promo is over.
          price = item.price;
          oldPrice = null;
        }
      }
      // Without a stored map (or a broken one) the map is written whole.
      if (Object.keys(changed).length) {
        if (stored) for (const [id, value] of Object.entries(changed)) set[`prices.${id}`] = value;
        else set.prices = changed;
      }
      const unset: Record<string, ""> = { seed: "" };
      const oldMoves = oldPrice !== promoOld;
      const baseMoves = price !== doc.price || oldMoves;
      if (baseMoves) {
        if (price !== doc.price) set.price = price;
        if (oldMoves) {
          if (oldPrice !== null) set.oldPrice = oldPrice;
          else unset.oldPrice = "";
          unset.discount = "";
        }
        baseChanged = true;
        // A row that only moved the shop price is an update too.
        for (const { index, type } of rows) {
          if (type.role === "base" && outcomes[index]?.status === "unchanged") outcomes[index] = ok("updated");
        }
      }
      // A write is due when a field moves or goes: the end of a promo whose
      // price equals the new base price changes nothing but removes the
      // struck price and the label (the `seed` mark alone is no change).
      const removes = Object.keys(unset).some((field) => field !== "seed");
      if (Object.keys(set).length === 0 && !removes) return ok("unchanged");
      const now = new Date();
      const result = await products.updateOne(
        { _id: doc._id },
        { $set: { ...set, erpSyncedAt: now, updatedAt: now }, $unset: unset },
      );
      return result.matchedCount ? ok("updated") : failed("conflict: the product was removed meanwhile");
    });
    // A failed write fails every row of the product.
    if (outcome.status === "error") for (const { index } of rows) outcomes[index] = outcome;
  });

  return {
    outcomes: outcomes.map((outcome) => outcome ?? failed("not processed")),
    revalidate: baseChanged ? [TAG.catalog] : [],
  };
}
