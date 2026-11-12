import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { parseFields } from "@/server/admin/repos/blog";
import { FilesReorderSchema, reorderMaterialFiles } from "@/server/admin/repos/materials";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

// POST /api/admin/materials/files/reorder { category, ids } - the full new
// order of one folder's files (every file of it exactly once; 400 "fields"
// { ids: "mismatch" } otherwise).
export const POST = adminHandler("content.edit", async ({ request, staff }) => {
  const { category, ids } = await parseFields(request, FilesReorderSchema);
  const changed = await reorderMaterialFiles(category, ids, staff.staff._id);
  if (changed > 0) {
    revalidatePublicData([TAG.materials]);
    await audit(staff, request, {
      action: "materials.file.reorder",
      entity: { type: "material_category", id: category, label: category },
      summary: `Змінено порядок файлів у папці матеріалів ${category}`,
      meta: { ids, changed },
    });
  }
  return json({ ok: true, changed });
});
