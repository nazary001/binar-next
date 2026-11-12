import type { Permission } from "@/components/admin/lib/permissions";
import { HttpError, adminHandler, json } from "@/server/admin/http";
import { searchStreets } from "@/server/integrations/nova-poshta/directory";
import { npRefParam, withNp } from "@/server/integrations/nova-poshta/http";

// GET /api/admin/np/streets?cityRef=<ref>&q=<text> -> { ok, items: NpStreet[] }
//
// Streets of a city for address delivery; `ref` is the StreetRef a waybill
// needs (no key needed; cached for 24 hours). An empty q answers no items;
// 400 without a valid cityRef.

const PICKER: readonly Permission[] = ["shipping.view", "orders.view", "integrations.view"];

export const GET = adminHandler(PICKER, async ({ url }) => {
  const cityRef = npRefParam(url.searchParams, "cityRef");
  if (!cityRef) throw new HttpError(400, "bad-request");
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const items = await withNp(() => searchStreets(cityRef, q));
  return json({ ok: true, items });
});
