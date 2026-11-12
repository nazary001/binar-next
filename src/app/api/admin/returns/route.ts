import { RETURN_SORTS } from "@/components/admin/returns/types";
import { adminHandler, json } from "@/server/admin/http";
import { listQuery } from "@/server/admin/list";
import { listReturns } from "@/server/admin/repos/returns";

// GET /api/admin/returns?q=&status=&clientId=&from=&to=&sort=&page=&limit=
// [returns.view] -> { ok: true, items: ReturnRow[], total, page, limit }
// Return requests of every partner company, newest first by default
// (ReturnListFilters in src/components/admin/returns/types.ts).
export const GET = adminHandler("returns.view", async ({ url }) => {
  const query = listQuery(url, { sortable: RETURN_SORTS, defaultSort: "-createdAt" });
  const page = await listReturns(query);
  return json({ ok: true, ...page });
});
