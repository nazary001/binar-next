import type { MaterialFileAnswer } from "@/components/admin/materials/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { parseFields } from "@/server/admin/repos/blog";
import { FileCreateSchema, createMaterialFile, fileRow } from "@/server/admin/repos/materials";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

// POST /api/admin/materials/files - a new file of a folder
// (MaterialFileCreateInput): an upload of the media library (mediaId) or
// an https link (url), exactly one of them. It goes to the end of the
// folder.
export const POST = adminHandler("content.edit", async ({ request, staff }) => {
  const input = await parseFields(request, FileCreateSchema);
  const doc = await createMaterialFile(input, staff.staff._id);
  revalidatePublicData([TAG.materials]);
  await audit(staff, request, {
    action: "materials.file.create",
    entity: { type: "material_file", id: doc._id, label: doc.name },
    summary:
      doc.type === "url"
        ? `Додано посилання «${doc.name}» до матеріалів (${doc.category})`
        : `Додано файл «${doc.name}» до матеріалів (${doc.category})`,
    meta: { category: doc.category, type: doc.type, mediaId: input.mediaId ?? null },
  });
  const answer: MaterialFileAnswer = { ok: true, file: await fileRow(doc) };
  return json(answer, 201);
});
