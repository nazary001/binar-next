import { BatchEnvelope, PriceItem, rawId } from "@/server/integrations/bas/contract";
import { applyPrices, priceRowId } from "@/server/integrations/bas/apply/prices";
import { runBatch } from "@/server/integrations/bas/batch";
import { basHandler } from "@/server/integrations/bas/handler";

// PUT /api/integrations/bas/v1/prices [bas:write, acceptPrices]
// { batchId, items: [{ productExternalId | sku, priceTypeExternalId, price, currency? }] }
export const maxDuration = 60;

export const PUT = basHandler("bas:write", "prices", async (call) =>
  runBatch(call, {
    entity: "prices",
    envelope: await call.body(BatchEnvelope),
    item: PriceItem,
    idOf: priceRowId,
    rawIdOf: (raw) => rawId(raw, ["productExternalId", "sku"]),
    apply: (items) => applyPrices(items),
  }),
);
