import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import { TAG, type PublicTag } from "@/server/cache-tags";
import { deleteMedia, findMedia, toMediaDto } from "@/server/media/store";
import { mediaUsage, type MediaUsageItem, type MediaUsageType } from "@/server/media/usage";
import { revalidatePublicData } from "@/server/revalidate";
import { zId, zRequiredText, zText } from "@/server/validate";
import {
  FOLDER_VALUES,
  MEDIA_CHANGE,
  MEDIA_VIEW,
  assertMayChange,
  assertMayFileInto,
  assertMayRead,
  folderLabel,
  updateMedia,
} from "../library";

// GET /api/admin/media/<id>
//   -> { ok: true, media: MediaDto, usage: MediaUsageItem[] }
//   usage = every record that references the file (server/media/usage.ts).
// PATCH /api/admin/media/<id>  { alt?, filename?, folder? }
//   -> { ok: true, media: MediaDto, changed: ("alt" | "filename" | "folder")[] }
//   A new filename keeps the extension of the stored type; the access of a
//   file never changes (upload it again instead).
// DELETE /api/admin/media/<id>[?force=1]
//   -> { ok: true }; 409 "in-use" { usage } while records reference it,
//   unless force=1 (the references then point at nothing, and the cached
//   public pages of those records are refreshed). A public file may stay in
//   browser caches for a while after it is gone (it was served as
//   immutable).
// A paper of an order (library.ts) answers 403 "forbidden" to a GET without
// orders.view and to a PATCH or DELETE without orders.edit; any other file
// needs MEDIA_EDIT for a change, and a move into the folder "orders" needs
// orders.edit.

type Context = { params: Promise<{ id: string }> };

async function idOf(context: Context): Promise<string> {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  return parsed.data;
}

export const GET = adminHandler<Context>(MEDIA_VIEW, async ({ context, staff }) => {
  const id = await idOf(context);
  const doc = await findMedia(id);
  if (!doc) notFound();
  const usage = await mediaUsage(id);
  assertMayRead(staff, doc, usage);
  return json({ ok: true, media: toMediaDto(doc), usage });
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

export const PATCH = adminHandler<Context>(MEDIA_CHANGE, async ({ request, context, staff }) => {
  const id = await idOf(context);
  const patch = await parseBody(request, Patch);
  const current = await findMedia(id);
  if (!current) notFound();
  assertMayChange(staff, current, await mediaUsage(id));
  if (patch.folder !== undefined && patch.folder !== current.folder) assertMayFileInto(staff, patch.folder);
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

// The cached public data that shows a record of each kind (orders are read
// per session and never cached).
const PUBLIC_TAG: Partial<Record<MediaUsageType, PublicTag>> = {
  blog: TAG.blog,
  product: TAG.catalog,
  material: TAG.materials,
};

function tagsOf(usage: readonly MediaUsageItem[]): PublicTag[] {
  return [...new Set(usage.map((item) => PUBLIC_TAG[item.type]).filter((tag): tag is PublicTag => tag !== undefined))];
}

export const DELETE = adminHandler<Context>(MEDIA_CHANGE, async ({ request, context, staff, url }) => {
  const id = await idOf(context);
  const doc = await findMedia(id);
  if (!doc) notFound();
  const usage = await mediaUsage(id);
  assertMayChange(staff, doc, usage);
  const force = url.searchParams.get("force") === "1";
  if (usage.length > 0 && !force) throw new HttpError(409, "in-use", { usage });

  await deleteMedia(id);
  // The pages that showed the file read their records again: a picture
  // block of an article whose upload is gone is left out, and the
  // materials lose the preview of a file they can no longer deliver.
  const tags = tagsOf(usage);
  if (tags.length > 0) revalidatePublicData(tags);
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
