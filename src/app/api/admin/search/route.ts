import { SEARCH_MAX_LENGTH, type SearchAnswer } from "@/components/admin/search/types";
import { can } from "@/server/admin/auth";
import { adminHandler, json } from "@/server/admin/http";
import { searchPanel } from "@/server/admin/repos/search";

// GET /api/admin/search?q=<text> - the command palette. Any signed-in
// member of staff may ask; only the groups the role may open are searched
// (contract: src/components/admin/search/types.ts).
export const GET = adminHandler(null, async ({ url, staff }) => {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const answer: SearchAnswer = { ok: true, groups: await searchPanel(q, (permission) => can(staff, permission)) };
  return json(answer);
});
