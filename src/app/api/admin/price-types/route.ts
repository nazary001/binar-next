import { PRICE_TYPE_ROLES } from "@/components/admin/catalog/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { PriceTypeCreateSchema, createPriceType, getPriceType, listPriceTypes } from "@/server/admin/repos/price-types";
import { parseInput } from "@/server/admin/repos/products";
import { HttpError } from "@/server/http";

// GET /api/admin/price-types - every price type with how many products
// carry a price of it and who uses it. ?q=&sort=name|createdAt|updatedAt
// Answer: PriceTypeListAnswer.
export const GET = adminHandler("catalog.view", async ({ url }) => {
  const page = await listPriceTypes(url);
  return json({ ok: true, ...page });
});

// POST /api/admin/price-types - PriceTypeCreateInput. A role given here is
// taken from the type that held it. Answer: 201 PriceTypeAnswer.
export const POST = adminHandler("catalog.edit", async ({ request, staff }) => {
  const input = await parseInput(request, PriceTypeCreateSchema);
  const { doc, roleTakenFrom } = await createPriceType(input);
  const role = PRICE_TYPE_ROLES.find((item) => item.value === doc.role)?.label;
  await audit(staff, request, {
    action: "price-type.create",
    entity: { type: "price-type", id: doc._id, label: doc.name },
    summary:
      `Створено тип цін «${doc.name}»` +
      (role ? `, роль «${role}»` : "") +
      (roleTakenFrom ? ` (раніше її мав «${roleTakenFrom.name}»)` : ""),
    meta: { role: doc.role, roleTakenFrom: roleTakenFrom?.id ?? null },
  });
  const priceType = await getPriceType(doc._id);
  if (!priceType) throw new HttpError(404, "not-found");
  return json({ ok: true, priceType, roleTakenFrom }, 201);
});
