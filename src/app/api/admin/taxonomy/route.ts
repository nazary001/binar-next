import { adminHandler, json } from "@/server/admin/http";
import { taxonomyView } from "@/server/admin/repos/products";

// GET /api/admin/taxonomy - the catalog tree from code with live product
// counts per category, the staff metadata of every category, brands with
// counts and the products whose category matches no card ("orphans").
// Answer: TaxonomyAnswer (src/components/admin/catalog/types.ts).
export const GET = adminHandler("catalog.view", async () => {
  return json({ ok: true, ...(await taxonomyView()) });
});
