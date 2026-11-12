import { z } from "zod";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { createCounterparty } from "@/server/repos/profile";
import { requireProfileAdmin } from "../guard";
import { zCode, zContractFile, zName, zNewId } from "../schemas";

// POST /api/profile/counterparties { id, name, code, signatory, file?, contractId? }
//   -> 201 { counterparty }
// Errors: 400 (fields the add form would not send), 401 (signed out), 403
// (not a partner, or not its company's admin), 409 "exists" (the id, or the
// first contract's id, is taken), 409 "limit" (the company has
// MAX_COUNTERPARTIES already), 429 "rate" (too many profile changes).
//
// The "Додати контрагента" form: a legal entity of the signed-in partner's
// company, waiting for the manager ("review"). `file` is the optional
// first contract's scan metadata ({ name, size, format }; the bytes are not
// uploaded); `contractId` is the id the browser gave that contract (made
// here when absent).

const Body = z
  .object({
    id: zNewId("cp"),
    name: zName,
    code: zCode,
    signatory: zName,
    file: zContractFile.nullable().optional(),
    contractId: zNewId("ct").optional(),
  })
  .strict();

export const POST = handler(async (request) => {
  const { clientId } = await requireProfileAdmin();
  const body = await parseBody(request, Body);
  const counterparty = await createCounterparty(clientId, body);
  if (counterparty === "exists" || counterparty === "limit") throw new HttpError(409, counterparty);
  return json({ counterparty }, 201);
});
