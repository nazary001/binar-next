import { z } from "zod";
import { fail, handler, HttpError, json, parseBody } from "@/server/http";
import { addContract } from "@/server/repos/profile";
import { requireProfileAdmin } from "../../../guard";
import { pathId, zContractFile, zNewId } from "../../../schemas";

// POST /api/profile/counterparties/<id>/contracts { id, file } -> 201 { contract }
// Errors: 400, 401, 403 (not a partner admin), 404 (no such counterparty in
// the partner's company), 409 "exists" (the contract id is taken in the
// company), 409 "limit" (the counterparty has MAX_CONTRACTS already), 429
// "rate".
//
// The "Додати договір" modal: a contract scan's metadata (the bytes are not
// uploaded). The stored contract waits for the manager ("review") with the
// mock number and today's date, as the page shows it.

type Context = { params: Promise<{ id: string }> };

const Body = z.object({ id: zNewId("ct"), file: zContractFile }).strict();

export const POST = handler<Context>(async (request, { params }) => {
  const { clientId } = await requireProfileAdmin();
  const counterpartyId = pathId((await params).id);
  if (!counterpartyId) return fail(404, "not-found");
  const body = await parseBody(request, Body);
  const contract = await addContract(clientId, counterpartyId, body);
  if (contract === "not-found") throw new HttpError(404, "not-found");
  if (contract === "exists" || contract === "limit") throw new HttpError(409, contract);
  return json({ contract }, 201);
});
