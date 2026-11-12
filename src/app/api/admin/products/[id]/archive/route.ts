import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { productIdParam, requireProductDetail, setArchived } from "@/server/admin/repos/products";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/products/<id>/archive - takes the product out of the shop:
// unlisted and without a page (the public catalog skips archived products),
// kept for the orders that name it. 409 "state" when already archived.
export const POST = adminHandler<Context>("catalog.edit", async ({ request, context, staff }) => {
  const id = productIdParam((await context.params).id);
  const doc = await setArchived(id, true, staff.staff._id);
  await audit(staff, request, {
    action: "product.archive",
    entity: { type: "product", id, label: doc.title },
    summary: `Товар «${doc.title}» (${id}) перенесено в архів`,
  });
  revalidatePublicData([TAG.catalog]);
  return json({ ok: true, product: await requireProductDetail(id) });
});
