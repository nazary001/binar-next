import { z } from "zod";
import { MEDIA_MAX_BYTES } from "@/components/admin/media/types";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json } from "@/server/admin/http";
import { saveMedia, toMediaDto } from "@/server/media/store";
import { inspectUpload, storedFilename } from "@/server/media/validate";
import { zText } from "@/server/validate";
import { FOLDER_VALUES, MEDIA_UPLOAD, MEDIA_VIEW, folderLabel, listMedia, readUploadForm } from "./library";

// GET /api/admin/media - the media library, newest first.
//   ?folder=blog|products|materials|orders|misc  ?kind=image|file
//   ?access=public|private  ?q=<filename or alt text, or a media id>
//   ?sort=createdAt|-createdAt|size|-size|filename|-filename  ?page  ?limit
//   -> { ok: true, items: MediaDto[], total, page, limit }
//
// POST /api/admin/media - one upload, multipart/form-data:
//   file    the file (at most MEDIA_MAX_BYTES; its type is read from the bytes)
//   folder  one of MEDIA_FOLDERS (default "misc")
//   access  "public" | "private" (default "public")
//   alt     optional text (images)
//   -> { ok: true, media: MediaDto, duplicate: boolean }
// The same bytes uploaded again to the same folder with the same access are
// not stored twice: the existing record comes back with duplicate: true.
// Refusals: 415 "content-type" (not multipart), 413 "too-large" (with
// maxBytes), 400 "empty", 415 "type" (not an accepted image or document),
// 400 "fields" { fields: { file | folder | access | alt | <unknown>: reason } }.

export const GET = adminHandler(MEDIA_VIEW, async ({ url }) => {
  return json({ ok: true, ...(await listMedia(url)) });
});

const Fields = z
  .object({
    folder: z.enum(FOLDER_VALUES).default("misc"),
    access: z.enum(["public", "private"]).default("public"),
    alt: zText(300).default(""),
  })
  .strict();

const FIELD_NAMES = new Set(["file", "folder", "access", "alt"]);

export const POST = adminHandler(MEDIA_UPLOAD, async ({ request, staff }) => {
  const form = await readUploadForm(request);

  const fieldErrors: Record<string, string> = {};
  for (const name of new Set(form.keys())) {
    if (!FIELD_NAMES.has(name)) fieldErrors[name] = "unknown";
    else if (form.getAll(name).length > 1) fieldErrors[name] = "repeated";
  }
  const file = form.get("file");
  if (!(file instanceof File)) fieldErrors.file = "required";
  const text: Record<string, string> = {};
  for (const name of ["folder", "access", "alt"]) {
    const value = form.get(name);
    if (value === null) continue;
    if (typeof value !== "string") fieldErrors[name] = "type";
    else text[name] = value;
  }
  const parsed = Fields.safeParse(text);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] = "invalid";
  }
  if (Object.keys(fieldErrors).length > 0 || !(file instanceof File) || !parsed.success) {
    throw new HttpError(400, "fields", { fields: fieldErrors });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectUpload(bytes, file.name);
  if (!inspected.ok) {
    if (inspected.reason === "too-large") throw new HttpError(413, "too-large", { maxBytes: MEDIA_MAX_BYTES });
    if (inspected.reason === "empty") throw new HttpError(400, "empty");
    throw new HttpError(415, "type");
  }

  const startedAt = Date.now();
  const doc = await saveMedia(bytes, {
    kind: inspected.kind,
    filename: storedFilename(file.name, inspected.extension),
    contentType: inspected.contentType,
    width: inspected.width,
    height: inspected.height,
    folder: parsed.data.folder,
    access: parsed.data.access,
    alt: parsed.data.alt,
    createdBy: staff.staff._id,
  });
  // saveMedia hands back the record it already had for the same bytes.
  const duplicate = doc.createdAt.getTime() < startedAt;
  if (!duplicate) {
    await audit(staff, request, {
      action: "media.upload",
      entity: { type: "media", id: doc._id, label: doc.filename },
      summary: `Завантажено ${doc.kind === "image" ? "зображення" : "файл"} «${doc.filename}» до медіатеки (${folderLabel(doc.folder)}, ${doc.access === "public" ? "публічний" : "приватний"})`,
      meta: { kind: doc.kind, contentType: doc.contentType, size: doc.size, folder: doc.folder, access: doc.access },
    });
  }
  return json({ ok: true, media: toMediaDto(doc), duplicate });
});
