import { OrderAckItem } from "@/server/integrations/bas/contract";
import { basHandler } from "@/server/integrations/bas/handler";
import { runAck } from "@/server/integrations/bas/pull";

// POST /api/integrations/bas/v1/orders/ack [bas:write]
// { batchId?, items: [{ orderId, externalId, number?, error? }] }
export const POST = basHandler(
  "bas:write",
  "orders",
  async (call) => runAck(call, "order", OrderAckItem, (item) => item.orderId),
  { action: "ack" },
);
