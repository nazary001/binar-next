import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { productIdParam, requireProductDetail, setArchived } from "@/server/admin/repos/products";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/products/<id>/restore - brings an archived product back:
// its page works again, the listing waits until staff list it. 409 "state"
// when it is not archived.
export const POST = adminHandler<Context>("catalog.edit", async ({ request, context, staff }) => {
  const id = productIdParam((await context.params).id);
  const doc = await setArchived(id, false, staff.staff._id);
  await audit(staff, request, {
    action: "product.restore",
    entity: { type: "product", id, label: doc.title },
    summary: `Товар «${doc.title}» (${id}) повернуто з архіву, у каталозі поки не показується`,
  });
  revalidatePublicData([TAG.catalog]);
  return json({ ok: true, product: await requireProductDetail(id) });
});
