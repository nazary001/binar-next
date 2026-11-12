import { can } from "@/server/admin/auth";
import { adminHandler, json } from "@/server/admin/http";
import { collection } from "@/server/db/collections";

// GET /api/admin/nav-counts - what waits for staff, for the menu badges:
// new orders (plus cancel requests), return requests not decided yet, new
// form submissions. A counter the role may not see is left out.
export const GET = adminHandler(null, async ({ staff }) => {
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
