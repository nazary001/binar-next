import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { addContract, contractDto, CreateContractSchema } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// POST /api/admin/companies/<id>/counterparties/<cpId>/contracts
// [customers.edit] { number, date, status? = "active", file?, ...ERP
// fields } -> 201 { contract } (ContractDto). 409 "limit" at 50 contracts,
// 409 "exists" when the externalId names another contract, 400 "fields"
// { priceTypeId: "not-found" }.

type Context = { params: Promise<{ id: string; cpId: string }> };

export const POST = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const cpId = pathId(params.cpId);
  const body = await parseBody(request, CreateContractSchema);
  const { client, counterparty, contract } = await addContract(id, cpId, body);
  await audit(staff, request, {
    action: "company.contract-create",
    entity: { type: "contract", id: contract.id, label: contract.number },
    summary: `Додано договір ${contract.number} контрагента «${counterparty.name}» компанії «${client.name}»`,
    meta: { clientId: id, counterpartyId: cpId, status: contract.status },
  });
  return json({ ok: true, contract: contractDto(contract) }, 201);
});
