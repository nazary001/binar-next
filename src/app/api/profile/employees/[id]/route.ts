import { z } from "zod";
import { fail, handler, HttpError, json, noContent, parseBody } from "@/server/http";
import { removeEmployee, updateEmployee } from "@/server/repos/profile";
import { requireProfileAdmin } from "../../guard";
import { pathId, TEXT_MAX, zEmail, zPhone } from "../../schemas";
import { zText } from "@/server/validate";

// PATCH /api/profile/employees/<id> { fullName?, position?, phone?, email? }
//   -> 200 { employee }
// DELETE /api/profile/employees/<id> -> 204
// Errors: 400 (a field the edit modal would not send: an invitation only
// has its e-mail, an active employee keeps a name), 401, 403 (not a partner
// admin), 404 (no such employee in the partner's company), 429 "rate".

type Context = { params: Promise<{ id: string }> };

const Patch = z
  .object({
    fullName: zText(TEXT_MAX),
    position: zText(TEXT_MAX),
    phone: zPhone,
    email: zEmail,
  })
  .partial()
  .strict();

export const PATCH = handler<Context>(async (request, { params }) => {
  const { clientId } = await requireProfileAdmin();
  const employeeId = pathId((await params).id);
  if (!employeeId) return fail(404, "not-found");
  const patch = await parseBody(request, Patch);
  const employee = await updateEmployee(clientId, employeeId, patch);
  if (employee === "not-found") throw new HttpError(404, "not-found");
  if (employee === "invalid") throw new HttpError(400, "bad-request");
  return json({ employee });
});

export const DELETE = handler<Context>(async (_request, { params }) => {
  const { clientId } = await requireProfileAdmin();
  const employeeId = pathId((await params).id);
  if (!employeeId) return fail(404, "not-found");
  if (!(await removeEmployee(clientId, employeeId))) return fail(404, "not-found");
  return noContent();
});
