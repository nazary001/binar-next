import { fail, handler, HttpError, json } from "@/server/http";
import { resendInvite } from "@/server/repos/profile";
import { rateLimited, requireProfileAdmin } from "../../../guard";
import { pathId } from "../../../schemas";

// POST /api/profile/employees/<id>/resend -> 200 { employee }
// Errors: 401, 403 (not a partner admin), 404 (no such employee in the
// partner's company), 409 "not-invited" (an active employee has no
// invitation to resend), 429 "rate" (too many profile changes, or the
// invitation's / the company's daily budget is spent).
//
// "Надіслати повторно": the invitation's 48 hours start over (a new
// invitedAt) and another outbox message is written. Within the cooldown of
// the last invitation the stored row is answered and nothing is written.
// No body.

type Context = { params: Promise<{ id: string }> };

export const POST = handler<Context>(async (_request, { params }) => {
  const { clientId } = await requireProfileAdmin();
  const employeeId = pathId((await params).id);
  if (!employeeId) return fail(404, "not-found");
  const employee = await resendInvite(clientId, employeeId);
  if (employee === "not-found") throw new HttpError(404, "not-found");
  if (employee === "not-invited") throw new HttpError(409, "not-invited");
  if ("retryAfter" in employee) rateLimited(employee.retryAfter);
  return json({ employee });
});
