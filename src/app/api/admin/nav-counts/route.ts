import { can } from "@/server/admin/auth";
import { adminHandler, json } from "@/server/admin/http";
import { collection } from "@/server/db/collections";
import { sweepOutboxSoon } from "@/server/mail/schedule";

// The sweep of the outbox runs after the answer, inside this route's time
// limit.
export const maxDuration = 60;

// GET /api/admin/nav-counts - what waits for staff, for the menu badges:
// new orders (plus cancel requests), return requests not decided yet, new
// form submissions. A counter the role may not see is left out.
//
// Every panel page asks this, so it is also where the outbox gets swept
// without a cron: at most once every 5 minutes per server instance, a run
// of the mailer is started after the answer (retries after a failure and
// messages their writer could not send; nothing when no provider is set
// up). The answer itself does not change and does not wait for it.
export const GET = adminHandler(null, async ({ staff }) => {
  sweepOutboxSoon();
  const counts: Record<string, number> = {};
  const [orders, returns, leads] = await Promise.all([
    can(staff, "orders.view")
      ? (await collection("orders")).countDocuments({
          $or: [{ status: "new" }, { "cancel.request": true, status: { $ne: "cancelled" } }],
        })
      : null,
    can(staff, "returns.view")
      ? (await collection("returns")).countDocuments({ status: { $in: ["created", "review"] } })
      : null,
    can(staff, "leads.view") ? (await collection("leads")).countDocuments({ status: "new" }) : null,
  ]);
  if (orders !== null) counts.orders = orders;
  if (returns !== null) counts.returns = returns;
  if (leads !== null) counts.leads = leads;
  return json({ ok: true, counts });
});
