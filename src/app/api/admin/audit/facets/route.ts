import type { JournalFacets } from "@/components/admin/audit/types";
import { adminHandler, json } from "@/server/admin/http";
import { journalFacets } from "@/server/admin/repos/journal";

// GET /api/admin/audit/facets - what the journal's filter selects offer:
// the actors, action prefixes, actions and entity types present.
export const GET = adminHandler("audit.view", async () => {
  const answer: JournalFacets = { ok: true, ...(await journalFacets()) };
  return json(answer);
});
