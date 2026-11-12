import { BAS_API_VERSION } from "@/components/admin/integrations/types";
import { json } from "@/server/http";
import { basHandler } from "@/server/integrations/bas/handler";

// GET /api/integrations/bas/v1/ping [bas:read | bas:write] - the key works,
// the server's time, the API version and whether the exchange is on. It
// answers while the exchange is switched off too, so BAS can test its key.
export const GET = basHandler(
  ["bas:read", "bas:write"],
  "ping",
  async (call) =>
    json({ ok: true, time: new Date().toISOString(), version: BAS_API_VERSION, enabled: call.settings.enabled }),
  { action: "ping" },
);
