import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { employeeDto, resendEmployeeInvite } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// POST /api/admin/companies/<id>/employees/<empId>/resend [customers.edit]
// -> { employee }: the invitation again (the cabinet's own resend, with
// its 15-minute cooldown: inside it nothing new is queued). 409
// "not-invited" for an active employee, 429 "rate" when the company's
// daily invitation budget is spent.

type Context = { params: Promise<{ id: string; empId: string }> };

export const POST = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const empId = pathId(params.empId);
  const { client, employee } = await resendEmployeeInvite(id, empId);
  await audit(staff, request, {
    action: "company.employee-resend",
    entity: { type: "employee", id: empId, label: employee.email },
    summary: `Повторно надіслано запрошення ${employee.email} від компанії «${client.name}»`,
    meta: { clientId: id },
  });
  return json({ ok: true, employee: employeeDto(employee) });
});
