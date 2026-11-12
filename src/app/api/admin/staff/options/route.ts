import { adminHandler, json } from "@/server/admin/http";
import { staffOptions } from "@/server/admin/repos/staff-accounts";

// GET /api/admin/staff/options - the active staff ({ id, name, roleName }),
// for "assign to" selects on other screens. Any signed-in member of staff:
// a manager who assigns an order is not a staff manager.
export const GET = adminHandler(null, async () => json({ ok: true, items: await staffOptions() }));
