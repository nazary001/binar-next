import { z } from "zod";
import { COMPANY_CITY_MAX, COMPANY_NAME_MAX, COMPANY_REGION_MAX } from "@/components/admin/companies/types";
import {
  CUSTOMER_EMAIL_MAX,
  CUSTOMER_NAME_MAX,
  CUSTOMER_PASSWORD_MAX,
  CUSTOMER_POSITION_MAX,
  CUSTOMER_SORTS,
} from "@/components/admin/customers/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { flag, idParam, listQuery, oneOf } from "@/server/admin/list";
import { createAccount, listCustomers, requireCustomerDetail } from "@/server/admin/repos/customers";
import { zId, zRequiredText, zText } from "@/server/validate";

// GET /api/admin/customers [customers.view] - the accounts list
// (CustomersPage, src/components/admin/customers/types.ts).
// POST /api/admin/customers [customers.edit] - a new account, as
// `npm run user:create` makes it -> 201 { customer, password? }.

export const GET = adminHandler("customers.view", async ({ url }) => {
  const query = listQuery(url, { sortable: CUSTOMER_SORTS, defaultSort: "-createdAt" });
  const page = await listCustomers(query, {
    type: oneOf(query.params, "type", ["b2b", "b2c"] as const),
    active: flag(query.params, "active"),
    clientId: idParam(query.params, "clientId"),
  });
  return json({ ok: true, ...page });
});

const NewCompany = z
  .object({
    name: zRequiredText(COMPANY_NAME_MAX),
    edrpou: zText(32).optional(),
    region: zText(COMPANY_REGION_MAX).optional(),
    city: zText(COMPANY_CITY_MAX).optional(),
    discountPercent: z.number().min(0).lt(100).optional(),
  })
  .strict();

// Formats (login, e-mail, phone, password length, company rules) are
// checked by the repo, which answers 400 "fields" with a reason per field.
const Body = z
  .object({
    type: z.enum(["b2b", "b2c"]),
    login: z.string().max(320),
    name: z.string().max(CUSTOMER_NAME_MAX),
    email: z.string().max(CUSTOMER_EMAIL_MAX).optional(),
    phone: z.string().max(32).optional(),
    position: zText(CUSTOMER_POSITION_MAX).optional(),
    password: z.string().max(CUSTOMER_PASSWORD_MAX).optional(),
    company: z.union([z.object({ clientId: zId }).strict(), NewCompany]).optional(),
    role: z.enum(["b2b_admin", "b2b_manager"]).optional(),
  })
  .strict();

export const POST = adminHandler("customers.edit", async ({ request, staff }) => {
  const body = await parseBody(request, Body);
  const created = await createAccount(body);
  const { user, client } = created;

  if (client && created.createdCompany) {
    await audit(staff, request, {
      action: "company.create",
      entity: { type: "company", id: client._id, label: client.name },
      summary: `Створено компанію «${client.name}» разом з акаунтом ${user.login}`,
      meta: { discountPercent: client.discountPercent, withAccount: user._id },
    });
  }
  await audit(staff, request, {
    action: "customer.create",
    entity: { type: "customer", id: user._id, label: user.login },
    summary:
      user.type === "b2b"
        ? `Створено акаунт партнера ${user.login} у компанії «${client?.name ?? ""}»`
        : `Створено акаунт роздрібного покупця ${user.login}`,
    meta: {
      type: user.type,
      clientId: user.clientId,
      role: user.role,
      createdCompany: created.createdCompany,
      generatedPassword: created.password !== null,
    },
  });

  const customer = await requireCustomerDetail(user._id);
  return json({ ok: true, customer, ...(created.password !== null ? { password: created.password } : {}) }, 201);
});
