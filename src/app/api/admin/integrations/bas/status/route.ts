import { adminHandler, json } from "@/server/admin/http";
import { basStatus } from "@/server/integrations/bas/log";

// GET /api/admin/integrations/bas/status [integrations.view] -> BasStatusAnswer:
// the switch, the keys, the queue, the last call of every entity and the
// totals since midnight (Kyiv).
export const GET = adminHandler("integrations.view", async () => json({ ok: true, ...(await basStatus()) }));
