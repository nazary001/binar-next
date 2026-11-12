import { BatchEnvelope, OrderStatusItem, rawId } from "@/server/integrations/bas/contract";
import { applyOrderStatuses, orderRowId } from "@/server/integrations/bas/apply/order-statuses";
import { runBatch } from "@/server/integrations/bas/batch";
import { basHandler } from "@/server/integrations/bas/handler";

// PUT /api/integrations/bas/v1/orders/statuses [bas:write, acceptOrderStatuses]
// { batchId, items: [{ orderNumber | orderExternalId, status, number?, externalId?, payment?, ttn?, expectedDate?, comment? }] }
export const maxDuration = 60;

export const PUT = basHandler("bas:write", "order-statuses", async (call) =>
  runBatch(call, {
    entity: "order-statuses",
    envelope: await call.body(BatchEnvelope),
    item: OrderStatusItem,
    idOf: orderRowId,
    rawIdOf: (raw) => rawId(raw, ["orderNumber", "orderExternalId"]),
    apply: (items) => applyOrderStatuses(items, call.actor),
  }),
);
