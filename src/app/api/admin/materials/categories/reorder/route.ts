import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { parseFields } from "@/server/admin/repos/blog";
import { CategoriesReorderSchema, reorderMaterialCategories } from "@/server/admin/repos/materials";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

// POST /api/admin/materials/categories/reorder { ids } - the full new order
// of the folders (every folder exactly once; 400 "fields" { ids:
// "mismatch" } otherwise).
export const POST = adminHandler("content.edit", async ({ request, staff }) => {
  const { ids } = await parseFields(request, CategoriesReorderSchema);
  const changed = await reorderMaterialCategories(ids, staff.staff._id);
  if (changed > 0) {
    revalidatePublicData([TAG.materials]);
    await audit(staff, request, {
      action: "materials.category.reorder",
      entity: null,
      summary: "Змінено порядок папок матеріалів",
      meta: { ids, changed },
    });
  }
  return json({ ok: true, changed });
});
