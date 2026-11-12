import { CONTRACT_STATUSES } from "@/components/admin/companies/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { contractDto, deleteContract, PatchContractSchema, updateContract } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// PATCH /api/admin/companies/<id>/counterparties/<cpId>/contracts/<contractId>
// [customers.edit] -> { contract }: any field of the contract tile and the
// ERP fields (null clears an ERP field).
// DELETE ... -> { id }; 409 "in-use" when the ledger refers to it.

type Context = { params: Promise<{ id: string; cpId: string; contractId: string }> };

const STATUS_LABEL = new Map(CONTRACT_STATUSES.map((status) => [status.value, status.label]));

export const PATCH = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const cpId = pathId(params.cpId);
  const contractId = pathId(params.contractId);
  const body = await parseBody(request, PatchContractSchema);
  const change = await updateContract(id, cpId, contractId, body);
  if (change.changed.length > 0) {
    const status = change.changed.includes("status")
      ? `, статус «${STATUS_LABEL.get(change.contract.status) ?? change.contract.status}»`
      : "";
    await audit(staff, request, {
      action: "company.contract-update",
      entity: { type: "contract", id: contractId, label: change.contract.number },
      summary: `Змінено договір ${change.contract.number} контрагента «${change.counterparty.name}» компанії «${change.client.name}»${status}`,
      meta: { clientId: id, counterpartyId: cpId, changed: change.changed },
    });
  }
  return json({ ok: true, contract: contractDto(change.contract) });
});

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const cpId = pathId(params.cpId);
  const contractId = pathId(params.contractId);
  const { client, counterparty, contract } = await deleteContract(id, cpId, contractId);
  await audit(staff, request, {
    action: "company.contract-delete",
    entity: { type: "contract", id: contractId, label: contract.number },
    summary: `Видалено договір ${contract.number} контрагента «${counterparty.name}» компанії «${client.name}»`,
    meta: { clientId: id, counterpartyId: cpId },
  });
  return json({ ok: true, id: contractId });
});
