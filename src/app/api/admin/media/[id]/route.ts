import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import { deleteMedia, findMedia, toMediaDto } from "@/server/media/store";
import { mediaUsage } from "@/server/media/usage";
import { zId, zRequiredText, zText } from "@/server/validate";
import { FOLDER_VALUES, MEDIA_EDIT, MEDIA_VIEW, folderLabel, updateMedia } from "../library";

// GET /api/admin/media/<id>
//   -> { ok: true, media: MediaDto, usage: MediaUsageItem[] }
//   usage = every record that references the file (server/media/usage.ts).
// PATCH /api/admin/media/<id>  { alt?, filename?, folder? }
//   -> { ok: true, media: MediaDto, changed: ("alt" | "filename" | "folder")[] }
//   A new filename keeps the extension of the stored type; the access of a
//   file never changes (upload it again instead).
// DELETE /api/admin/media/<id>[?force=1]
//   -> { ok: true }; 409 "in-use" { usage } while records reference it,
//   unless force=1 (the references then point at nothing). A public file
//   may stay in browser caches for a while after it is gone (it was served
//   as immutable).

type Context = { params: Promise<{ id: string }> };

async function idOf(context: Context): Promise<string> {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  return parsed.data;
}

export const GET = adminHandler<Context>(MEDIA_VIEW, async ({ context }) => {
  const id = await idOf(context);
  const doc = await findMedia(id);
  if (!doc) notFound();
  return json({ ok: true, media: toMediaDto(doc), usage: await mediaUsage(id) });
});

const Patch = z
  .object({
    alt: zText(300).optional(),
    filename: zRequiredText(200).optional(),
    folder: z.enum(FOLDER_VALUES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const FIELD_LABEL = { alt: "опис", filename: "назва", folder: "розділ" } as const;

export const PATCH = adminHandler<Context>(MEDIA_EDIT, async ({ request, context, staff }) => {
  const id = await idOf(context);
  const patch = await parseBody(request, Patch);
  const result = await updateMedia(id, patch, staff.staff._id);
  if (!result) notFound();
  const { media, changes } = result;
  if (changes.length > 0) {
    const show = (field: keyof typeof FIELD_LABEL, value: string) =>
      field === "folder" ? `«${folderLabel(value)}»` : `«${value.slice(0, 80)}»`;
    await audit(staff, request, {
      action: "media.update",
      entity: { type: "media", id: media._id, label: media.filename },
      summary: `Змінено файл медіатеки «${media.filename}»: ${changes
        .map((change) => `${FIELD_LABEL[change.field]} ${show(change.field, change.from)} -> ${show(change.field, change.to)}`)
        .join("; ")}`,
      meta: { changes },
    });
  }
  return json({ ok: true, media: toMediaDto(media), changed: changes.map((change) => change.field) });
});

export const DELETE = adminHandler<Context>(MEDIA_EDIT, async ({ request, context, staff, url }) => {
  const id = await idOf(context);
  const doc = await findMedia(id);
  if (!doc) notFound();
  const usage = await mediaUsage(id);
  const force = url.searchParams.get("force") === "1";
  if (usage.length > 0 && !force) throw new HttpError(409, "in-use", { usage });

  await deleteMedia(id);
  await audit(staff, request, {
    action: "media.delete",
    entity: { type: "media", id, label: doc.filename },
    summary:
      usage.length > 0
        ? `Видалено файл «${doc.filename}» з медіатеки, хоча на нього посилалися записи (${usage.length})`
        : `Видалено файл «${doc.filename}» з медіатеки`,
    meta: { size: doc.size, folder: doc.folder, access: doc.access, forced: usage.length > 0, usage },
  });
  return json({ ok: true });
});
