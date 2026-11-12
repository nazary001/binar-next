import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { pathId, signOutEverywhere } from "@/server/admin/repos/customers";

// POST /api/admin/customers/<id>/sign-out [customers.edit] -> { ended }:
// ends every session of the account (every browser it is signed in on).
// The password stays; the customer can sign in again.

type Context = { params: Promise<{ id: string }> };

export const POST = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const { user, ended } = await signOutEverywhere(id);
  await audit(staff, request, {
    action: "customer.sign-out",
    entity: { type: "customer", id, label: user.login },
    summary: `Завершено всі сесії акаунта ${user.login} (${ended})`,
    meta: { ended },
  });
  return json({ ok: true, ended });
});
