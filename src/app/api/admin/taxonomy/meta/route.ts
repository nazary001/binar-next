import { categoriesSharingCode, sharedCodeText } from "@/components/admin/catalog/codes";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json } from "@/server/admin/http";
import { TaxonomyMetaSchema, parseInput, saveTaxonomyMeta, taxonomyView } from "@/server/admin/repos/products";

const LABELS: Record<string, string> = {
  categories: "дані категорій",
  brands: "бренди",
  manufacturers: "виробники",
  countries: "країни",
};

// "<direction>/<category>" -> the category's name, for the refusals.
const CATEGORY_LABELS = new Map<string, string>(
  CATALOG_DIRECTIONS.flatMap((direction) => direction.carousel.map((card) => [`${direction.slug}/${card.slug}`, card.label] as const)),
);

// PUT /api/admin/taxonomy/meta - stores what staff keep next to the
// taxonomy (TaxonomyMetaInput): per category the ERP group, its own stock
// threshold and a note; the extra brands, makers and countries the product
// editor offers. Keys must be existing "<direction>/<category>" pairs, and
// one ERP group code may stand on one category only (trimmed, case-blind:
// the exchange files a BAS product into the first category with its code),
// else 400 "fields" under "categories.<key>.externalId" of every category
// sharing it, naming the others. The map replaces the stored one whole, so
// the body alone is checked.
// Nothing on the storefront reads these yet, so no cache is dropped.
// Answer: TaxonomyAnswer.
export const PUT = adminHandler("catalog.edit", async ({ request, staff }) => {
  const input = await parseInput(request, TaxonomyMetaSchema);
  const shared = Object.entries(categoriesSharingCode(input.categories));
  if (shared.length) {
    const labelOf = (key: string) => CATEGORY_LABELS.get(key) ?? key;
    throw new HttpError(400, "fields", {
      fields: Object.fromEntries(shared.map(([key, others]) => [`categories.${key}.externalId`, sharedCodeText(others, labelOf)])),
    });
  }
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
