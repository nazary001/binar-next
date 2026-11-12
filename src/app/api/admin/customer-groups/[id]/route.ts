import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { pathId } from "@/server/admin/repos/customers";
import { deleteGroup, groupDto, groupShape, requireGroup, updateGroup } from "@/server/admin/repos/groups";

// GET /api/admin/customer-groups/<id> [customers.view] -> { group }
// PATCH /api/admin/customer-groups/<id> [customers.edit] -> { group }
//   (409 "system" when a system group would be renamed, 409 "exists")
// DELETE /api/admin/customer-groups/<id> [customers.edit] -> { id }
//   (409 "system", 409 "in-use" with { companies })

type Context = { params: Promise<{ id: string }> };

export const GET = adminHandler<Context>("customers.view", async ({ context }) => {
  const id = pathId((await context.params).id);
  return json({ ok: true, group: await groupDto(await requireGroup(id)) });
});

const Body = z.object(groupShape).partial().strict();

const LABELS: Record<string, string> = {
  name: "назва",
  description: "опис",
  priceTypeId: "тип цін",
  showStock: "показ залишків",
  paymentMethods: "способи оплати",
  deliveryMethods: "способи доставки",
  hiddenCategories: "приховані категорії",
};

export const PATCH = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const body = await parseBody(request, Body);
  const change = await updateGroup(id, body);
  if (change.changed.length > 0) {
    await audit(staff, request, {
      action: "customer-group.update",
      entity: { type: "customer-group", id, label: change.after.name },
      summary: `Група покупців «${change.after.name}»: ${change.changed.map((key) => LABELS[key] ?? key).join(", ")}`,
      meta: { changed: change.changed },
    });
  }
  return json({ ok: true, group: await groupDto(change.after) });
});

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const group = await deleteGroup(id);
  await audit(staff, request, {
    action: "customer-group.delete",
    entity: { type: "customer-group", id, label: group.name },
    summary: `Видалено групу покупців «${group.name}»`,
  });
  return json({ ok: true, id });
});
