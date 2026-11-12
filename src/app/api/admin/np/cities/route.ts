import type { Permission } from "@/components/admin/lib/permissions";
import { adminHandler, json } from "@/server/admin/http";
import { searchCities } from "@/server/integrations/nova-poshta/directory";
import { withNp } from "@/server/integrations/nova-poshta/http";

// GET /api/admin/np/cities?q=<text>&limit=20 -> { ok, items: NpCity[] }
//
// The carrier's settlement search for a picker (no key needed; cached for
// 24 hours). An empty q answers no items. 502 "np-unavailable" when the
// carrier does not answer.

const PICKER: readonly Permission[] = ["shipping.view", "orders.view", "integrations.view"];

export const GET = adminHandler(PICKER, async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const limit = Number(url.searchParams.get("limit"));
  const items = await withNp(() => searchCities(q, Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20));
  return json({ ok: true, items });
});
