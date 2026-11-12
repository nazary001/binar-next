import { adminHandler, json, parseBody } from "@/server/admin/http";
import { getSettings } from "@/server/admin/settings";
import { EstimateBody, withNp } from "@/server/integrations/nova-poshta/http";
import { estimate } from "@/server/integrations/nova-poshta/waybill";

// POST /api/admin/np/estimate { cityRef, weight, declaredCost, serviceType?, seats?, cod?, dimensions? }
//   -> { ok, cost, codCost, deliveryDate, warnings }
//
// What a parcel from the sender's city would cost and when the carrier
// would deliver it (getDocumentPrice + getDocumentDeliveryDate, no key
// needed). 409 "np-not-configured" { missing: ["sender.cityRef"] } while
// the sender profile has no city. A POST because it carries a body; it
// changes nothing.

export const POST = adminHandler("shipping.view", async ({ request }) => {
  const body = await parseBody(request, EstimateBody);
  const settings = await getSettings("novaPoshta");
  const result = await withNp(() => estimate(settings, body));
  return json({ ok: true, ...result });
});
