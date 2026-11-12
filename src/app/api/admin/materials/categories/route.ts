import type { MaterialCategoryAnswer } from "@/components/admin/materials/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { parseFields } from "@/server/admin/repos/blog";
import { CategoryCreateSchema, createMaterialCategory } from "@/server/admin/repos/materials";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

// POST /api/admin/materials/categories { title, slug?, tagline? } - a new
// folder at the end of the library. 409 "exists" when the slug is taken.
export const POST = adminHandler("content.edit", async ({ request, staff }) => {
  const input = await parseFields(request, CategoryCreateSchema);
  const category = await createMaterialCategory(input, staff.staff._id);
  revalidatePublicData([TAG.materials]);
  await audit(staff, request, {
    action: "materials.category.create",
    entity: { type: "material_category", id: category.id, label: category.title },
    summary: `Створено папку матеріалів «${category.title}»`,
    meta: { slug: category.id },
  });
  const answer: MaterialCategoryAnswer = { ok: true, category };
  return json(answer, 201);
});
