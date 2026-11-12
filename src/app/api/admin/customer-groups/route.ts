import { z } from "zod";
import { GROUP_SORTS } from "@/components/admin/groups/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { listQuery } from "@/server/admin/list";
import { createGroup, groupDto, groupShape, listGroups } from "@/server/admin/repos/groups";

// GET /api/admin/customer-groups [customers.view] - the buyer groups with
// their company counts (CustomerGroupsPage, src/components/admin/groups/types.ts).
// POST /api/admin/customer-groups [customers.edit] -> 201 { group }.

export const GET = adminHandler("customers.view", async ({ url }) => {
  const query = listQuery(url, { sortable: GROUP_SORTS, defaultSort: "createdAt", defaultLimit: 100 });
  return json({ ok: true, ...(await listGroups(query)) });
});

const Body = z
  .object({
    name: groupShape.name,
    description: groupShape.description.optional(),
    priceTypeId: groupShape.priceTypeId.optional(),
    showStock: groupShape.showStock.optional(),
    paymentMethods: groupShape.paymentMethods.optional(),
    deliveryMethods: groupShape.deliveryMethods.optional(),
    hiddenCategories: groupShape.hiddenCategories.optional(),
  })
  .strict();

export const POST = adminHandler("customers.edit", async ({ request, staff }) => {
  const body = await parseBody(request, Body);
  const group = await createGroup(body);
  await audit(staff, request, {
    action: "customer-group.create",
    entity: { type: "customer-group", id: group._id, label: group.name },
    summary: `Створено групу покупців «${group.name}»`,
    meta: { hiddenCategories: group.hiddenCategories.length, priceTypeId: group.priceTypeId },
  });
  return json({ ok: true, group: await groupDto(group) }, 201);
});
