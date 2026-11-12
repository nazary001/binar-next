import { PRODUCT_FIELD_LABELS } from "@/components/admin/products/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import {
  ProductPatchSchema,
  deleteProduct,
  parseInput,
  patchProduct,
  productIdParam,
  requireProductDetail,
} from "@/server/admin/repos/products";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// GET /api/admin/products/<id> - ProductAnswer: the whole product for the
// editor, with its storefront address, where it is used and the related
// products it names.
export const GET = adminHandler<Context>("catalog.view", async ({ context }) => {
  const id = productIdParam((await context.params).id);
  return json({ ok: true, product: await requireProductDetail(id) });
});

// PATCH /api/admin/products/<id> - ProductPatchInput (any editable field;
// the id itself never changes: carts, orders and assortments name it).
// Answer: ProductPatchAnswer with the fields that really changed.
export const PATCH = adminHandler<Context>("catalog.edit", async ({ request, context, staff }) => {
  const id = productIdParam((await context.params).id);
  const input = await parseInput(request, ProductPatchSchema);
  const { doc, changed } = await patchProduct(id, input, staff.staff._id);
  if (changed.length) {
    const names = changed.map((key) => PRODUCT_FIELD_LABELS[key] ?? key);
    await audit(staff, request, {
      action: "product.update",
      entity: { type: "product", id, label: doc.title },
      summary: `Змінено товар «${doc.title}» (${id}): ${names.join(", ")}`,
      meta: { changed },
    });
    revalidatePublicData([TAG.catalog]);
  }
  return json({ ok: true, product: await requireProductDetail(id), changed });
});

// DELETE /api/admin/products/<id> - removes an archived product that no
// order names. 409 "in-use" (with `usage`) when orders name it, 409
// "state" when it is not archived.
export const DELETE = adminHandler<Context>("catalog.edit", async ({ request, context, staff }) => {
  const id = productIdParam((await context.params).id);
  const { doc, usage } = await deleteProduct(id);
  await audit(staff, request, {
    action: "product.delete",
    entity: { type: "product", id, label: doc.title },
    summary: `Видалено товар «${doc.title}» (${id}) з архіву`,
    meta: { usage },
  });
  revalidatePublicData([TAG.catalog]);
  return json({ ok: true, id });
});
