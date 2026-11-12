import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { deleteEmployee } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// DELETE /api/admin/companies/<id>/employees/<empId> [customers.edit]
// -> { id }: removes a person (or a pending invitation) from the
// company's own list in the cabinet. Employees are not accounts: nobody
// loses a sign-in.

type Context = { params: Promise<{ id: string; empId: string }> };

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const empId = pathId(params.empId);
  const { client, employee } = await deleteEmployee(id, empId);
  const label = employee.fullName || employee.email;
  await audit(staff, request, {
    action: "company.employee-delete",
    entity: { type: "employee", id: empId, label },
    summary: `Видалено ${employee.status === "invited" ? "запрошення" : "співробітника"} ${label} компанії «${client.name}»`,
    meta: { clientId: id, status: employee.status },
  });
  return json({ ok: true, id: empId });
});
