import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import {
  ProductCreateSchema,
  createProduct,
  listProducts,
  parseInput,
  requireProductDetail,
} from "@/server/admin/repos/products";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

// GET /api/admin/products - the product list of the panel.
//   ?q=&direction=&category=&brand=&listed=&available=&preorder=&promo=
//   &archived=false|true|all&stock=in|low|out|unknown&orphan=&sort=-price&page=&limit=
// Answer: ProductListAnswer (src/components/admin/products/types.ts).
export const GET = adminHandler("catalog.view", async ({ url }) => {
  const page = await listProducts(url);
  return json({ ok: true, ...page });
});

// POST /api/admin/products - a new product (ProductCreateInput). It starts
// unlisted unless the body says otherwise; the answer is 201 ProductAnswer.
export const POST = adminHandler("catalog.edit", async ({ request, staff }) => {
  const input = await parseInput(request, ProductCreateSchema);
  const doc = await createProduct(input, staff.staff._id);
  await audit(staff, request, {
    action: "product.create",
    entity: { type: "product", id: doc._id, label: doc.title },
    summary: `Створено товар «${doc.title}» (${doc._id})${doc.listed ? ", показується в каталозі" : ", поки не показується в каталозі"}`,
    meta: { listed: doc.listed, subcategory: doc.subcategory },
  });
  revalidatePublicData([TAG.catalog]);
  return json({ ok: true, product: await requireProductDetail(doc._id) }, 201);
});
