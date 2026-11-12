import { adminHandler, json } from "@/server/admin/http";
import { basSpec } from "@/server/integrations/bas/spec";

// GET /api/admin/integrations/bas/spec [integrations.view] -> BasSpecAnswer:
// the contract of the machine API for the documentation page (every
// endpoint with example bodies and answers, the conventions, the error
// codes, code samples for the BAS side).
export const GET = adminHandler("integrations.view", async () => json({ ok: true, ...basSpec() }));
