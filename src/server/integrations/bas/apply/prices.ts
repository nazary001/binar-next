import "server-only";
import { TAG } from "../../../cache-tags";
import { collection, type PriceTypeDoc, type ProductDoc } from "../../../db/collections";
import type { PriceInput } from "../contract";
import { failed, guarded, mapPool, ok, type ApplyResult, type Outcome } from "../batch";
import { indexProducts, resolveProduct } from "./lookup";

// PUT /prices: one price per product and price type.
//
// Every price lands in product.prices[<price type id>]. A price of the
// type whose role is "base" (set in the panel) is also the price the shop
// shows: product.price, or, while the product has a promo (oldPrice set),
// the regular price oldPrice, so the promo price staff set stays. A price
// of the "individual" type is only stored (the partner pricing that reads
// it is a later step). Prices are in UAH: the site has no other currency.

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
      let oldPrice = usable(doc.oldPrice) ? doc.oldPrice : null;
      for (const { item, type, index } of rows) {
        const before = stored?.[type._id];
        const status = before === undefined ? "created" : before === item.price ? "unchanged" : "updated";
        outcomes[index] = ok(status);
        if (status !== "unchanged") changed[type._id] = item.price;
        if (type.role === "base") {
          if (oldPrice !== null) oldPrice = item.price;
          else price = item.price;
        }
      }
      // Without a stored map (or a broken one) the map is written whole.
      if (Object.keys(changed).length) {
        if (stored) for (const [id, value] of Object.entries(changed)) set[`prices.${id}`] = value;
        else set.prices = changed;
      }
      const baseMoves = price !== doc.price || (oldPrice !== null && oldPrice !== doc.oldPrice);
      if (baseMoves) {
        set.price = price;
        if (oldPrice !== null) set.oldPrice = oldPrice;
        baseChanged = true;
        // A row that only moved the shop price is an update too.
        for (const { index, type } of rows) {
          if (type.role === "base" && outcomes[index]?.status === "unchanged") outcomes[index] = ok("updated");
        }
      }
      if (Object.keys(set).length === 0) return ok("unchanged");
      const now = new Date();
      const result = await products.updateOne(
        { _id: doc._id },
        { $set: { ...set, erpSyncedAt: now, updatedAt: now }, $unset: { seed: "" } },
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
