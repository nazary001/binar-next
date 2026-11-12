import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { duplicateProduct, productIdParam, requireProductDetail } from "@/server/admin/repos/products";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/products/<id>/duplicate - a copy "<id>-copy" (or
// "<id>-copy-2"...), unlisted, without the article, the ERP code, the
// barcode and the stock of the original. Answer: 201 ProductAnswer.
export const POST = adminHandler<Context>("catalog.edit", async ({ request, context, staff }) => {
  const id = productIdParam((await context.params).id);
  const doc = await duplicateProduct(id, staff.staff._id);
  await audit(staff, request, {
    action: "product.duplicate",
    entity: { type: "product", id: doc._id, label: doc.title },
    summary: `Створено копію товару ${id}: «${doc.title}» (${doc._id})`,
    meta: { from: id },
  });
  // The copy has a product page (unlisted products do).
  revalidatePublicData([TAG.catalog]);
  return json({ ok: true, product: await requireProductDetail(doc._id) }, 201);
});
