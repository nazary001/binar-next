import type { JournalPage } from "@/components/admin/audit/types";
import { adminHandler, json } from "@/server/admin/http";
import { listJournal } from "@/server/admin/repos/journal";

// GET /api/admin/audit - the journal of actions, newest first. Filters and
// answer: JournalPage in src/components/admin/audit/types.ts.
export const GET = adminHandler("audit.view", async ({ url }) => {
  const answer: JournalPage = { ok: true, ...(await listJournal(url)) };
  return json(answer);
});
