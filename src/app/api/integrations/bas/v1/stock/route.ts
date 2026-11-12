import { BatchEnvelope, StockItem, rawId } from "@/server/integrations/bas/contract";
import { productRefKey, productRefLabel } from "@/server/integrations/bas/apply/lookup";
import { applyStock } from "@/server/integrations/bas/apply/stock";
import { runBatch } from "@/server/integrations/bas/batch";
import { basHandler } from "@/server/integrations/bas/handler";

// PUT /api/integrations/bas/v1/stock [bas:write, acceptStock]
// { batchId, items: [{ productExternalId | sku, qty, leadTimeDays?, expectedDate? }] }
export const maxDuration = 60;

export const PUT = basHandler("bas:write", "stock", async (call) =>
  runBatch(call, {
    entity: "stock",
    envelope: await call.body(BatchEnvelope),
    item: StockItem,
    idOf: productRefLabel,
    rawIdOf: (raw) => rawId(raw, ["productExternalId", "sku"]),
    keysOf: (item) => [productRefKey(item)],
    apply: (items) => applyStock(items, call.settings),
  }),
);
