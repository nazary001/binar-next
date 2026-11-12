import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { TaxonomyMetaSchema, parseInput, saveTaxonomyMeta, taxonomyView } from "@/server/admin/repos/products";

const LABELS: Record<string, string> = {
  categories: "дані категорій",
  brands: "бренди",
  manufacturers: "виробники",
  countries: "країни",
};

// PUT /api/admin/taxonomy/meta - stores what staff keep next to the
// taxonomy (TaxonomyMetaInput): per category the ERP group, its own stock
// threshold and a note; the extra brands, makers and countries the product
// editor offers. Keys must be existing "<direction>/<category>" pairs.
// Nothing on the storefront reads these yet, so no cache is dropped.
// Answer: TaxonomyAnswer.
export const PUT = adminHandler("catalog.edit", async ({ request, staff }) => {
  const input = await parseInput(request, TaxonomyMetaSchema);
  const result = await saveTaxonomyMeta(input, staff.staff._id);
  if (result.changed.length) {
    await audit(staff, request, {
      action: "catalog.meta",
      entity: { type: "settings", id: "catalog", label: "Довідники каталогу" },
      summary: `Оновлено довідники каталогу: ${result.changed.map((key) => LABELS[key] ?? key).join(", ")}`,
      meta: { changed: result.changed, categories: result.categories },
    });
  }
  return json({ ok: true, ...(await taxonomyView()) });
});
