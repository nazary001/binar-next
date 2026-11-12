import { z } from "zod";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { inviteEmployee } from "@/server/repos/profile";
import { rateLimited, requireProfileAdmin } from "../guard";
import { zEmail, zNewId } from "../schemas";

// POST /api/profile/employees { id, email } -> 201 { employee }
// Errors: 400, 401, 403 (not a partner admin), 409 "exists" (the id is
// taken), 409 "email-exists" (the address is on the company's list already
// - the invite form's rule - or being invited right now), 409 "limit" (the
// company has MAX_EMPLOYEES rows), 429 "rate" (too many profile changes, or
// the company's daily invitation budget is spent).
//
// "Надіслати на пошту" of the invite modal: an "invited" row of the
// partner's company and an outbox message to that address (company name
// and employee id; nothing is sent yet).

const Body = z.object({ id: zNewId("emp"), email: zEmail }).strict();

export const POST = handler(async (request) => {
  const { clientId } = await requireProfileAdmin();
  const body = await parseBody(request, Body);
  const employee = await inviteEmployee(clientId, body);
  if (employee === "exists" || employee === "email-exists" || employee === "limit") throw new HttpError(409, employee);
  if ("retryAfter" in employee) rateLimited(employee.retryAfter);
  return json({ employee }, 201);
});
