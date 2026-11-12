import type { MaterialFileAnswer } from "@/components/admin/materials/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { parseFields } from "@/server/admin/repos/blog";
import {
  FilePatchSchema,
  deleteMaterialFile,
  fileRow,
  materialIdParam,
  updateMaterialFile,
} from "@/server/admin/repos/materials";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/admin/materials/files/<id> (MaterialFilePatchInput) - edits a
// file: texts, directions, locks, folder; mediaId replaces the stored
// file, url turns it into a link.
export const PATCH = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  const id = materialIdParam((await context.params).id);
  const input = await parseFields(request, FilePatchSchema);
  const { before, after } = await updateMaterialFile(id, input, staff.staff._id);
  revalidatePublicData([TAG.materials]);
  const moved = before.category !== after.category;
  await audit(staff, request, {
    action: "materials.file.update",
    entity: { type: "material_file", id, label: after.name },
    summary: moved
      ? `Файл матеріалів «${after.name}» перенесено: ${before.category} -> ${after.category}`
      : input.mediaId
        ? `Замінено файл матеріалів «${after.name}»`
        : `Змінено файл матеріалів «${after.name}»`,
    meta: { fields: Object.keys(input), category: after.category, mediaId: input.mediaId ?? null },
  });
  const answer: MaterialFileAnswer = { ok: true, file: await fileRow(after) };
  return json(answer);
});

// DELETE /api/admin/materials/files/<id> - removes the file from the
// library. An upload it used stays in the media library.
export const DELETE = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  const id = materialIdParam((await context.params).id);
  const doc = await deleteMaterialFile(id);
  revalidatePublicData([TAG.materials]);
  await audit(staff, request, {
    action: "materials.file.delete",
    entity: { type: "material_file", id, label: doc.name },
    summary: `Видалено файл матеріалів «${doc.name}» (${doc.category})`,
    meta: { category: doc.category, storagePath: doc.storagePath ?? null },
  });
  return json({ ok: true });
});
