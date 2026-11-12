import { staffActor } from "@/server/admin/audit";
import { HttpError, adminHandler, json } from "@/server/admin/http";
import { isNpRef } from "@/server/integrations/nova-poshta/client";
import { withNp } from "@/server/integrations/nova-poshta/http";
import { listSenderContacts } from "@/server/integrations/nova-poshta/sender";

// GET /api/admin/np/senders/[ref]/contacts -> { ok, items: NpContact[] }
//
// The contact persons of one sender counterparty (the profile's "who
// hands the parcels in"). 400 for a ref that is not a carrier ref; 409
// "np-not-configured" without a stored key.

type Context = { params: Promise<{ ref: string }> };

export const GET = adminHandler<Context>("integrations.view", async ({ context, staff }) => {
  const { ref } = await context.params;
  if (!isNpRef(ref)) throw new HttpError(400, "bad-request");
  const items = await withNp(() => listSenderContacts(ref.toLowerCase(), staffActor(staff)));
  return json({ ok: true, items });
});
