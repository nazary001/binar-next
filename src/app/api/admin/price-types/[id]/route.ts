import { PRICE_TYPE_ROLES } from "@/components/admin/catalog/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import {
  PriceTypePatchSchema,
  deletePriceType,
  getPriceType,
  patchPriceType,
} from "@/server/admin/repos/price-types";
import { parseInput, productIdParam } from "@/server/admin/repos/products";
import { HttpError } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

const LABELS: Record<string, string> = {
  name: "назва",
  externalId: "код BAS",
  currency: "валюта",
  vatIncluded: "ПДВ",
  role: "роль",
};

const roleLabel = (role: string | null): string =>
  PRICE_TYPE_ROLES.find((item) => item.value === role)?.label ?? "без ролі";

// The [id] segment: the same id rule as products (404 otherwise).
const idOf = async (context: Context): Promise<string> => productIdParam((await context.params).id);

// GET /api/admin/price-types/<id> - PriceTypeAnswer (roleTakenFrom null).
export const GET = adminHandler<Context>("catalog.view", async ({ context }) => {
  const priceType = await getPriceType(await idOf(context));
  if (!priceType) throw new HttpError(404, "not-found");
  return json({ ok: true, priceType, roleTakenFrom: null });
});

// PATCH /api/admin/price-types/<id> - PriceTypePatchInput. Answer:
// PriceTypeAnswer plus `changed`.
export const PATCH = adminHandler<Context>("catalog.edit", async ({ request, context, staff }) => {
  const id = await idOf(context);
  const input = await parseInput(request, PriceTypePatchSchema);
  const { before, doc, changed, roleTakenFrom } = await patchPriceType(id, input);
  if (changed.length) {
    const parts = changed.map((key) =>
      key === "role" ? `роль: «${roleLabel(before.role)}» -> «${roleLabel(doc.role)}»` : (LABELS[key] ?? key),
    );
    await audit(staff, request, {
      action: "price-type.update",
      entity: { type: "price-type", id, label: doc.name },
      summary:
        `Змінено тип цін «${doc.name}»: ${parts.join(", ")}` +
        (roleTakenFrom ? ` (роль знято з «${roleTakenFrom.name}»)` : ""),
      meta: { changed, roleTakenFrom: roleTakenFrom?.id ?? null },
    });
  }
  const priceType = await getPriceType(id);
  if (!priceType) throw new HttpError(404, "not-found");
  return json({ ok: true, priceType, roleTakenFrom, changed });
});

// DELETE /api/admin/price-types/<id> - 409 "in-use" (with `usedBy`) while a
// buyer group or a contract uses it. The prices products carry for it are
// removed with it.
export const DELETE = adminHandler<Context>("catalog.edit", async ({ request, context, staff }) => {
  const id = await idOf(context);
  const { doc, pricesRemoved } = await deletePriceType(id);
  await audit(staff, request, {
    action: "price-type.delete",
    entity: { type: "price-type", id, label: doc.name },
    summary: `Видалено тип цін «${doc.name}»` + (pricesRemoved ? `, прибрано його ціни в ${pricesRemoved} товарах` : ""),
    meta: { pricesRemoved },
  });
  return json({ ok: true, id, pricesRemoved });
});
