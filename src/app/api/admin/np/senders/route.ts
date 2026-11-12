import { staffActor } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { withNp } from "@/server/integrations/nova-poshta/http";
import { listSenders } from "@/server/integrations/nova-poshta/sender";

// GET /api/admin/np/senders -> { ok, items: NpSender[] }
//
// The senders of the stored key's business cabinet, for the sender profile
// form. 409 "np-not-configured" without a stored key; 422 "np-auth" when
// the carrier refuses it.

export const GET = adminHandler("integrations.view", async ({ staff }) => {
  const items = await withNp(() => listSenders(staffActor(staff)));
  return json({ ok: true, items });
});
