import type { PurgeSessionsResponse } from "@/components/admin/system/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { purgeExpiredSessions } from "../../figures";

// POST /api/admin/system/sessions/purge -> PurgeSessionsResponse. Removes
// the customer and staff sessions past their expiry now, instead of waiting
// for the database's own clean-up. Live sessions are never touched. No body.

export const POST = adminHandler("settings.edit", async ({ request, staff }) => {
  const removed = await purgeExpiredSessions();
  await audit(staff, request, {
    action: "system.sessions-purge",
    entity: null,
    summary: `Видалено прострочені сесії: клієнтів ${removed.sessions}, співробітників ${removed.staffSessions}`,
    meta: removed,
  });
  const answer: PurgeSessionsResponse = { ok: true, removed };
  return json(answer);
});
