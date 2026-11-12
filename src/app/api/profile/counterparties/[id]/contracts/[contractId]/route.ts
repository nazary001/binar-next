import { fail, handler, noContent } from "@/server/http";
import { removeContract } from "@/server/repos/profile";
import { requireProfileAdmin } from "../../../../guard";
import { pathId } from "../../../../schemas";

// DELETE /api/profile/counterparties/<id>/contracts/<contractId> -> 204
// Errors: 401, 403 (not a partner admin), 404 (no such counterparty or
// contract in the partner's company), 429 "rate".
//
// The contract kebab's "Видалити" after the confirmation.

type Context = { params: Promise<{ id: string; contractId: string }> };

export const DELETE = handler<Context>(async (_request, { params }) => {
  const { clientId } = await requireProfileAdmin();
  const raw = await params;
  const counterpartyId = pathId(raw.id);
  const contractId = pathId(raw.contractId);
  if (!counterpartyId || !contractId) return fail(404, "not-found");
  if (!(await removeContract(clientId, counterpartyId, contractId))) return fail(404, "not-found");
  return noContent();
});
