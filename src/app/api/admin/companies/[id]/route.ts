import { z } from "zod";
import {
  COMPANY_CITY_MAX,
  COMPANY_NAME_MAX,
  COMPANY_REGION_MAX,
  CREDIT_LIMITS_MAX,
} from "@/components/admin/companies/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { deleteCompany, requireCompanyDetail, updateCompany, zExternalId } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";
import type { ClientDoc } from "@/server/db/collections";
import { zId, zRequiredText, zText } from "@/server/validate";

// GET /api/admin/companies/<id> [customers.view] -> { company: CompanyDetail }
// PATCH /api/admin/companies/<id> [customers.edit] -> { company }
// DELETE /api/admin/companies/<id> [customers.edit] -> { id }
// (src/components/admin/companies/types.ts describes every rule.)

type Context = { params: Promise<{ id: string }> };

export const GET = adminHandler<Context>("customers.view", async ({ context }) => {
  const id = pathId((await context.params).id);
  return json({ ok: true, company: await requireCompanyDetail(id) });
});

const Body = z
  .object({
    name: zRequiredText(COMPANY_NAME_MAX).optional(),
    edrpou: zText(32).optional(),
    region: zText(COMPANY_REGION_MAX).optional(),
    city: zText(COMPANY_CITY_MAX).optional(),
    // The database validator enforces the same 0 <= d < 100.
    discountPercent: z.number().min(0).lt(100).optional(),
    creditLimits: z
      .array(
        z
          .object({ counterparty: zRequiredText(COMPANY_NAME_MAX), limit: z.number().min(0).max(1_000_000_000_000) })
          .strict(),
      )
      .max(CREDIT_LIMITS_MAX)
      .optional(),
    groupId: zId.nullable().optional(),
    managerId: zId.nullable().optional(),
    isActive: z.boolean().optional(),
    showStock: z.boolean().optional(),
    stockDisplayMax: z.number().int().min(0).max(10_000_000).nullable().optional(),
    externalId: zExternalId.optional(),
    regenerateInvite: z.literal(true).optional(),
  })
  .strict();

// How the journal names each changed field.
function describe(key: string, before: ClientDoc, after: ClientDoc): string {
  switch (key) {
    case "name":
      return `назва «${before.name}» -> «${after.name}»`;
    case "edrpou":
      return `ЄДРПОУ ${after.edrpou || "прибрано"}`;
    case "region":
      return "область";
    case "city":
      return "місто";
    case "discountPercent":
      return `знижка ${before.discountPercent}% -> ${after.discountPercent}%`;
    case "creditLimits":
      return "кредитні ліміти";
    case "groupId":
      return "група покупців";
    case "managerId":
      return "менеджер";
    case "isActive":
      return after.isActive === false ? "кабінет вимкнено" : "кабінет увімкнено";
    case "showStock":
      return after.showStock ? "показ залишків увімкнено" : "показ залишків вимкнено";
    case "stockDisplayMax":
      return "межа показу залишків";
    case "externalId":
      return "код у BAS";
    case "inviteToken":
      return "нове посилання-запрошення";
    default:
      return key;
  }
}

export const PATCH = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const body = await parseBody(request, Body);
  const change = await updateCompany(id, body);
  if (change.changed.length > 0) {
    await audit(staff, request, {
      action: "company.update",
      entity: { type: "company", id, label: change.after.name },
      summary: `Компанія «${change.after.name}»: ${change.changed.map((key) => describe(key, change.before, change.after)).join(", ")}`,
      meta: {
        changed: change.changed,
        ...(change.changed.includes("discountPercent")
          ? { discountFrom: change.before.discountPercent, discountTo: change.after.discountPercent }
          : {}),
        ...(change.changed.includes("groupId") ? { groupFrom: change.before.groupId ?? null, groupTo: change.after.groupId ?? null } : {}),
        ...(change.changed.includes("managerId")
          ? { managerFrom: change.before.managerId ?? null, managerTo: change.after.managerId ?? null }
          : {}),
      },
    });
  }
  return json({ ok: true, company: await requireCompanyDetail(id) });
});

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const client = await deleteCompany(id);
  await audit(staff, request, {
    action: "company.delete",
    entity: { type: "company", id, label: client.name },
    summary: `Видалено компанію «${client.name}»`,
    meta: { edrpou: client.edrpou },
  });
  return json({ ok: true, id });
});
