import { TRACK_BATCH_MAX } from "@/components/admin/shipping/types";
import { audit, staffActor } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { withNp } from "@/server/integrations/nova-poshta/http";
import { refreshOpenShipments } from "@/server/integrations/nova-poshta/shipments";

// POST /api/admin/shipping/track -> { ok, checked, changed, failed, more }
//
// Asks the carrier about every Nova Poshta parcel that is not final
// (received, refused, cancelled ... are left alone), the longest unchecked
// first, at most TRACK_BATCH_MAX per call; `more` says another call has
// work left. A changed status adds an event and an order history entry.
// 502 "np-unavailable" when the carrier does not answer.

export const POST = adminHandler("shipping.edit", async ({ request, staff }) => {
  const result = await withNp(() => refreshOpenShipments(staffActor(staff), TRACK_BATCH_MAX));
  if (result.checked > 0) {
    await audit(staff, request, {
      action: "shipment.track-all",
      entity: null,
      summary: `Оновлено статуси відправлень Нової Пошти: перевірено ${result.checked}, змінилося ${result.changed}`,
      meta: result,
    });
  }
  return json({ ok: true, ...result });
});
