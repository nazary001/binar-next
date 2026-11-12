import type { SystemInfoResponse } from "@/components/admin/system/types";
import { adminHandler, json } from "@/server/admin/http";
import { systemInfo } from "./figures";

// GET /api/admin/system -> SystemInfoResponse: the database (collections,
// sizes against the free cluster's quota), the media library, the runtime,
// which secrets are configured (never their values) and a few counters.

export const GET = adminHandler("settings.view", async () => {
  const answer: SystemInfoResponse = { ok: true, system: await systemInfo() };
  return json(answer);
});
