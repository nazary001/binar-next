import { BatchEnvelope, ProductItem, rawId } from "@/server/integrations/bas/contract";
import { applyProducts } from "@/server/integrations/bas/apply/products";
import { runBatch } from "@/server/integrations/bas/batch";
import { basHandler } from "@/server/integrations/bas/handler";

// PUT /api/integrations/bas/v1/products [bas:write, acceptProducts]
// { batchId, mode?, items: [{ externalId, sku, name, ... }] } (spec.ts).
export const maxDuration = 60;

export const PUT = basHandler("bas:write", "products", async (call) =>
  runBatch(call, {
    entity: "products",
    envelope: await call.body(BatchEnvelope),
    item: ProductItem,
    idOf: (item) => item.externalId,
    rawIdOf: (raw) => rawId(raw, ["externalId", "sku"]),
    // A GUID or an article named twice would race for one product.
    keysOf: (item) => [`x:${item.externalId}`, `s:${item.sku}`],
    apply: (items) => applyProducts(items, call.settings),
  }),
);
