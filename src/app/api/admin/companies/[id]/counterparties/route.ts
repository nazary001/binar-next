import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { addCounterparty, counterpartyDto, counterpartyShape } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// POST /api/admin/companies/<id>/counterparties [customers.edit]
// { name, code, signatory?, status? = "active", externalId? }
// -> 201 { counterparty }. The code must be 8 or 10 digits (400 "fields"
// { code: "invalid" }); 409 "limit" at 100 counterparties, 409 "exists"
// when the externalId names another one.

type Context = { params: Promise<{ id: string }> };

const Body = z
  .object({
    name: counterpartyShape.name,
    code: counterpartyShape.code,
    signatory: counterpartyShape.signatory.optional(),
    status: counterpartyShape.status.optional(),
    externalId: counterpartyShape.externalId.optional(),
  })
  .strict();

export const POST = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const body = await parseBody(request, Body);
  const { client, counterparty } = await addCounterparty(id, body);
  await audit(staff, request, {
    action: "company.counterparty-create",
    entity: { type: "counterparty", id: counterparty._id, label: counterparty.name },
    summary: `Додано контрагента «${counterparty.name}» (${counterparty.code}) до компанії «${client.name}»`,
    meta: { clientId: id, status: counterparty.status },
  });
  return json({ ok: true, counterparty: counterpartyDto(counterparty) }, 201);
});
