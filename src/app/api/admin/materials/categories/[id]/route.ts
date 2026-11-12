import type { MaterialCategoryAnswer } from "@/components/admin/materials/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { parseFields } from "@/server/admin/repos/blog";
import {
  CategoryPatchSchema,
  deleteMaterialCategory,
  materialIdParam,
  updateMaterialCategory,
} from "@/server/admin/repos/materials";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/admin/materials/categories/<id> { title?, tagline? } - renames
// a folder or changes its partner note ("" removes it). The slug stays.
export const PATCH = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  const id = materialIdParam((await context.params).id);
  const input = await parseFields(request, CategoryPatchSchema);
  const { before, after } = await updateMaterialCategory(id, input, staff.staff._id);
  revalidatePublicData([TAG.materials]);
  await audit(staff, request, {
    action: "materials.category.update",
    entity: { type: "material_category", id, label: after.title },
    summary:
      before.title !== after.title
        ? `Папку матеріалів «${before.title}» перейменовано на «${after.title}»`
        : `Змінено папку матеріалів «${after.title}»`,
    meta: { fields: Object.keys(input) },
  });
  const answer: MaterialCategoryAnswer = { ok: true, category: after };
  return json(answer);
});

// DELETE /api/admin/materials/categories/<id> - only an empty folder:
// 409 "in-use" ({ files }) while it holds files.
export const DELETE = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  const id = materialIdParam((await context.params).id);
  const doc = await deleteMaterialCategory(id);
  revalidatePublicData([TAG.materials]);
  await audit(staff, request, {
    action: "materials.category.delete",
    entity: { type: "material_category", id, label: doc.title },
    summary: `Видалено папку матеріалів «${doc.title}»`,
    meta: { slug: id },
  });
  return json({ ok: true });
});
