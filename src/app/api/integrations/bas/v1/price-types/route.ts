import { BatchEnvelope, PriceTypeItem, rawId } from "@/server/integrations/bas/contract";
import { applyPriceTypes } from "@/server/integrations/bas/apply/price-types";
import { runBatch } from "@/server/integrations/bas/batch";
import { basHandler } from "@/server/integrations/bas/handler";

// PUT /api/integrations/bas/v1/price-types [bas:write, acceptPrices]
// { batchId, items: [{ externalId, name, currency?, vatIncluded? }] }
export const PUT = basHandler("bas:write", "price-types", async (call) =>
  runBatch(call, {
    entity: "price-types",
    envelope: await call.body(BatchEnvelope),
    item: PriceTypeItem,
    idOf: (item) => item.externalId,
    rawIdOf: (raw) => rawId(raw, ["externalId"]),
    apply: (items) => applyPriceTypes(items),
  }),
);
