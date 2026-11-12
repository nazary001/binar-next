import { z } from "zod";
import {
  COMPANY_CITY_MAX,
  COMPANY_NAME_MAX,
  COMPANY_REGION_MAX,
  COMPANY_SORTS,
} from "@/components/admin/companies/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { flag, idParam, listQuery } from "@/server/admin/list";
import { createCompany, listCompanies, requireCompanyDetail } from "@/server/admin/repos/companies";
import { zRequiredText, zText } from "@/server/validate";

// GET /api/admin/companies [customers.view] - the partner companies
// (CompaniesPage, src/components/admin/companies/types.ts).
// POST /api/admin/companies [customers.edit] -> 201 { company }.

export const GET = adminHandler("customers.view", async ({ url }) => {
  const query = listQuery(url, { sortable: COMPANY_SORTS, defaultSort: "-createdAt" });
  const manager = query.params.get("managerId");
  const page = await listCompanies(query, {
    groupId: idParam(query.params, "groupId"),
    managerId: manager === "none" ? null : idParam(query.params, "managerId"),
    active: flag(query.params, "active"),
  });
  return json({ ok: true, ...page });
});

const Body = z
  .object({
    name: zRequiredText(COMPANY_NAME_MAX),
    // "" or 8 / 10 digits (checked by the repo: 400 "fields").
    edrpou: zText(32).optional(),
    region: zText(COMPANY_REGION_MAX).optional(),
    city: zText(COMPANY_CITY_MAX).optional(),
    discountPercent: z.number().min(0).lt(100).optional(),
  })
  .strict();

export const POST = adminHandler("customers.edit", async ({ request, staff }) => {
  const body = await parseBody(request, Body);
  const client = await createCompany(body);
  await audit(staff, request, {
    action: "company.create",
    entity: { type: "company", id: client._id, label: client.name },
    summary: `Створено компанію «${client.name}»`,
    meta: { edrpou: client.edrpou, discountPercent: client.discountPercent },
  });
  return json({ ok: true, company: await requireCompanyDetail(client._id) }, 201);
});
