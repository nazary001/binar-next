import { basHandler } from "@/server/integrations/bas/handler";
import { runPull } from "@/server/integrations/bas/pull";

// GET /api/integrations/bas/v1/orders?after=<seq>&limit=<1..100> [bas:read]
// -> { ok, items: BasOrderPacket[], nextAfter }. Entries stay pending
// until POST /orders/ack confirms them.
export const GET = basHandler("bas:read", "orders", async (call) => runPull(call, "order"), {
  direction: "out",
  action: "pull",
});
