import type { Permission } from "@/components/admin/lib/permissions";
import { WAREHOUSE_KIND_FILTERS } from "@/components/admin/shipping/types";
import { HttpError, adminHandler, json } from "@/server/admin/http";
import { oneOf } from "@/server/admin/list";
import { listWarehouses } from "@/server/integrations/nova-poshta/directory";
import { npRefParam, withNp } from "@/server/integrations/nova-poshta/http";

// GET /api/admin/np/warehouses?cityRef=<ref>&q=<number or street>&kind=branch|postomat|all&limit=50
//   -> { ok, items: NpWarehouse[] }
//
// Branches and postomats of a city (cityRef = NpCity.cityRef), with their
// weight and size limits (no key needed; cached for 24 hours). 400 without
// a valid cityRef.

const PICKER: readonly Permission[] = ["shipping.view", "orders.view", "integrations.view"];

export const GET = adminHandler(PICKER, async ({ url }) => {
  const params = url.searchParams;
  const cityRef = npRefParam(params, "cityRef");
  if (!cityRef) throw new HttpError(400, "bad-request");
  const kind = oneOf(params, "kind", WAREHOUSE_KIND_FILTERS) ?? "all";
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const limit = Number(params.get("limit"));
  const items = await withNp(() =>
    listWarehouses({ cityRef, query: q, kind, limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50 }),
  );
  return json({ ok: true, items });
});
