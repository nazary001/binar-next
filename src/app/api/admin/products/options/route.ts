import { adminHandler, json } from "@/server/admin/http";
import { productOptions } from "@/server/admin/repos/products";

// GET /api/admin/products/options - what the product editor's selects
// offer: the taxonomy from code (directions with their categories, zones
// and product types), brands, makers, countries, units and price types.
// Answer: ProductOptionsAnswer.
export const GET = adminHandler("catalog.view", async () => {
  return json({ ok: true, ...(await productOptions()) });
});
