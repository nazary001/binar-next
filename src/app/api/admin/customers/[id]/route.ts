import { z } from "zod";
import {
  ACCESS_ROLES,
  CUSTOMER_EMAIL_MAX,
  CUSTOMER_NAME_MAX,
  CUSTOMER_POSITION_MAX,
} from "@/components/admin/customers/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { deleteAccount, pathId, requireCustomerDetail, updateAccount } from "@/server/admin/repos/customers";
import { zId, zText } from "@/server/validate";

// GET /api/admin/customers/<id> [customers.view] -> { customer: CustomerDetail }
// PATCH /api/admin/customers/<id> [customers.edit] -> { customer }
// DELETE /api/admin/customers/<id> [customers.edit] -> { id }
// (src/components/admin/customers/types.ts describes every rule.)

type Context = { params: Promise<{ id: string }> };

export const GET = adminHandler<Context>("customers.view", async ({ context }) => {
  const id = pathId((await context.params).id);
  return json({ ok: true, customer: await requireCustomerDetail(id) });
});

const Body = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(["b2b_admin", "b2b_manager"]).optional(),
    clientId: zId.optional(),
    person: z
      .object({
        fullName: zText(CUSTOMER_NAME_MAX).optional(),
        position: zText(CUSTOMER_POSITION_MAX).optional(),
        phone: z.string().max(32).optional(),
        email: z.string().max(CUSTOMER_EMAIL_MAX).optional(),
      })
      .strict()
      .optional(),
    welcomed: z.boolean().optional(),
  })
  .strict();

const ROLE_LABEL = new Map(ACCESS_ROLES.map((role) => [role.value, role.label]));

export const PATCH = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const body = await parseBody(request, Body);
  const change = await updateAccount(id, body);
  const customer = await requireCustomerDetail(id);
  if (change.changed.length === 0) return json({ ok: true, customer });

  const { after } = change;
  const parts: string[] = [];
  for (const key of change.changed) {
    if (key === "isActive") parts.push(after.isActive ? "розблоковано" : "заблоковано, усі сесії завершено");
    else if (key === "role") parts.push(`роль «${ROLE_LABEL.get(after.role ?? "b2b_admin") ?? after.role}»`);
    else if (key === "clientId") parts.push(`перенесено до компанії «${customer.company?.name ?? after.clientId}»`);
    else if (key === "person.fullName") parts.push(`ім'я «${after.person.fullName}»`);
    else if (key === "person.position") parts.push("посада");
    else if (key === "person.phone") parts.push("телефон");
    else if (key === "person.email") parts.push(`e-mail ${after.person.email || "прибрано"}`);
    else if (key === "welcomed") parts.push(after.welcomed ? "вітальне вікно позначено показаним" : "вітальне вікно покажеться знову");
  }
  const action =
    change.changed.length === 1 && change.changed[0] === "isActive"
      ? after.isActive
        ? "customer.unblock"
        : "customer.block"
      : "customer.update";
  await audit(staff, request, {
    action,
    entity: { type: "customer", id, label: after.login },
    summary: `Акаунт ${after.login}: ${parts.join(", ")}`,
    meta: {
      changed: change.changed,
      ...(change.changed.includes("clientId") ? { from: change.before.clientId, to: after.clientId } : {}),
      ...(change.changed.includes("role") ? { fromRole: change.before.role, toRole: after.role } : {}),
    },
  });
  return json({ ok: true, customer });
});

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const user = await deleteAccount(id);
  await audit(staff, request, {
    action: "customer.delete",
    entity: { type: "customer", id, label: user.login },
    summary: `Видалено акаунт ${user.login}${user.person?.fullName ? ` (${user.person.fullName})` : ""}`,
    meta: { type: user.type, clientId: user.clientId },
  });
  return json({ ok: true, id });
});
