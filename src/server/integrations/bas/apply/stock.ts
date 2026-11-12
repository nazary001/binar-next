import "server-only";
import { TAG } from "../../../cache-tags";
import { collection } from "../../../db/collections";
import type { StockInput } from "../contract";
import { failed, guarded, mapPool, ok, same, type ApplyResult, type Outcome } from "../batch";
import type { BasSettings } from "../handler";
import { daysUntil } from "../values";
import { indexProducts, resolveProduct } from "./lookup";

// PUT /stock: the free stock of a product in base units, and when more is
// expected. The stock figure itself is not public yet (the storefront
// decides by `available`); with the setting stockDrivesAvailability it
// also switches `available`: in stock = qty > 0.
//
// expectedDate is stored as the business day (YYYY-MM-DD) BAS named, null
// clears it, absent keeps it; and when the row carries no leadTimeDays,
// the days until that date also become the lead time.

const CONCURRENCY = 6;

export async function applyStock(items: StockInput[], settings: BasSettings): Promise<ApplyResult> {
  const index = await indexProducts(
    items.flatMap((item) => (item.productExternalId ? [item.productExternalId] : [])),
    items.flatMap((item) => (item.sku ? [item.sku] : [])),
    { stockQty: 1, leadTimeDays: 1, expectedDate: 1, available: 1, externalId: 1, "details.sku": 1 },
  );
  const products = await collection("products");
  const touched = new Set<string>();
  let availabilityMoved = false;

  const outcomes = await mapPool(items, CONCURRENCY, (item) =>
    guarded("stock", async (): Promise<Outcome> => {
      const doc = resolveProduct(index, item);
      if (doc === "unknown") return failed("unknown-product");
      if (doc === "ambiguous") return failed("ambiguous-sku");
      // One product named twice (by GUID and by sku) in one batch.
      if (touched.has(doc._id)) return failed("duplicate-in-batch");
      touched.add(doc._id);

      const fields: Record<string, unknown> = { stockQty: item.qty };
      if (item.leadTimeDays !== undefined) fields.leadTimeDays = item.leadTimeDays;
      else if (item.expectedDate) fields.leadTimeDays = daysUntil(item.expectedDate.day);
      if (item.expectedDate !== undefined) fields.expectedDate = item.expectedDate?.day ?? null;
      if (settings.stockDrivesAvailability) fields.available = item.qty > 0;

      const set: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(fields)) {
        if (!same((doc as unknown as Record<string, unknown>)[field], value)) set[field] = value;
      }
      if (Object.keys(set).length === 0) return ok("unchanged");
      if ("available" in set) availabilityMoved = true;
      const now = new Date();
      const result = await products.updateOne(
        { _id: doc._id },
        { $set: { ...set, erpSyncedAt: now, updatedAt: now }, $unset: { seed: "" } },
      );
      return result.matchedCount ? ok("updated") : failed("conflict: the product was removed meanwhile");
    }),
  );
  return { outcomes, revalidate: availabilityMoved ? [TAG.catalog] : [] };
}
