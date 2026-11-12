import { z } from "zod";
import { CUSTOMER_PASSWORD_MAX } from "@/components/admin/customers/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { pathId, setAccountPassword } from "@/server/admin/repos/customers";

// POST /api/admin/customers/<id>/password [customers.edit] { password? }
// -> { password? }: sets the given password (at least 8 characters, else
// 400 "fields" { password: "short" }) or generates one, which the answer
// carries ONCE. Every session of the account and every unused reset link
// end; the customer signs in again with the new password.

type Context = { params: Promise<{ id: string }> };

const Body = z.object({ password: z.string().max(CUSTOMER_PASSWORD_MAX).optional() }).strict();

export const POST = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const body = await parseBody(request, Body);
  const change = await setAccountPassword(id, body.password);
  await audit(staff, request, {
    action: "customer.password",
    entity: { type: "customer", id, label: change.user.login },
    summary: change.generated
      ? `Згенеровано новий пароль акаунта ${change.user.login}, усі сесії завершено`
      : `Встановлено новий пароль акаунта ${change.user.login}, усі сесії завершено`,
    meta: { generated: change.generated },
  });
  return json({ ok: true, ...(change.generated ? { password: change.password } : {}) });
});
