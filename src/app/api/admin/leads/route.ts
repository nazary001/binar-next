import type { LeadsPage } from "@/components/admin/leads/types";
import { adminHandler, json } from "@/server/admin/http";
import { listLeads } from "@/server/admin/repos/leads";

// GET /api/admin/leads - the inbox of form submissions, newest first, with
// the per-status counts of the tabs. Filters and answer: LeadsPage in
// src/components/admin/leads/types.ts.
export const GET = adminHandler("leads.view", async ({ url, staff }) => {
  const page = await listLeads(url, staff.staff._id);
  const answer: LeadsPage = { ok: true, ...page };
  return json(answer);
});
