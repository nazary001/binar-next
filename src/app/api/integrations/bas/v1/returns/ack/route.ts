import { ReturnAckItem } from "@/server/integrations/bas/contract";
import { basHandler } from "@/server/integrations/bas/handler";
import { runAck } from "@/server/integrations/bas/pull";

// POST /api/integrations/bas/v1/returns/ack [bas:write]
// { batchId?, items: [{ returnId, externalId, number?, error? }] }
export const POST = basHandler(
  "bas:write",
  "returns",
  async (call) => runAck(call, "return", ReturnAckItem, (item) => item.returnId),
  { action: "ack" },
);
