import { basHandler } from "@/server/integrations/bas/handler";
import { runPull } from "@/server/integrations/bas/pull";

// GET /api/integrations/bas/v1/returns?after=<seq>&limit=<1..100> [bas:read]
// -> { ok, items: BasReturnPacket[], nextAfter }.
export const GET = basHandler("bas:read", "returns", async (call) => runPull(call, "return"), {
  direction: "out",
  action: "pull",
});
