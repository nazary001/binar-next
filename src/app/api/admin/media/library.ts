import "server-only";
import type { Filter } from "mongodb";
import type { Permission } from "@/components/admin/lib/permissions";
import { MEDIA_FOLDERS, MEDIA_MAX_BYTES, parseMediaRef, type MediaDto, type MediaFolder } from "@/components/admin/media/types";
import { contains, listQuery, oneOf, paginate, type Page } from "@/server/admin/list";
import { collection, type MediaDoc } from "@/server/db/collections";
import { toMediaDto } from "@/server/media/store";
import { extensionForType, extensionOf, storedFilename } from "@/server/media/validate";
import { HttpError } from "@/server/http";

// Database work of the media library routes (/api/admin/media/**), kept
// out of the route files so they stay "parse, call, audit, answer". The
// bytes themselves are stored and read by server/media/store.ts.

// Who may read the library, and who may change it. Uploading is open to
// every editor whose screens attach files (a blog post, a product, an
// order document, the settings); renaming and removing to the editors of
// public content.
export const MEDIA_VIEW: readonly Permission[] = ["content.view", "catalog.view", "orders.view"];
export const MEDIA_UPLOAD: readonly Permission[] = ["content.edit", "catalog.edit", "orders.edit", "settings.edit"];
export const MEDIA_EDIT: readonly Permission[] = ["content.edit", "catalog.edit"];

export const FOLDER_VALUES = MEDIA_FOLDERS.map((folder) => folder.value) as [MediaFolder, ...MediaFolder[]];

export function folderLabel(folder: string): string {
  return MEDIA_FOLDERS.find((item) => item.value === folder)?.label ?? folder;
}

const SORTABLE = ["createdAt", "size", "filename"] as const;

// GET /api/admin/media?folder=&kind=&access=&q=&sort=&page=&limit=
export async function listMedia(url: URL): Promise<Page<MediaDto>> {
  const query = listQuery(url, { sortable: SORTABLE, defaultSort: "-createdAt", defaultLimit: 40 });
  const filter: Filter<MediaDoc> = {};
  const folder = oneOf(query.params, "folder", FOLDER_VALUES);
  if (folder) filter.folder = folder;
  const kind = oneOf(query.params, "kind", ["image", "file"] as const);
  if (kind) filter.kind = kind;
  const access = oneOf(query.params, "access", ["public", "private"] as const);
  if (access) filter.access = access;
  if (query.q) {
    // A pasted reference ("media:m-...") or a bare id finds the file itself.
    const id = parseMediaRef(query.q) ?? parseMediaRef(`media:${query.q}`);
    filter.$or = [{ filename: contains(query.q) }, { alt: contains(query.q) }, ...(id ? [{ _id: id }] : [])];
  }
  return paginate(await collection("media"), filter, query, { map: toMediaDto });
}

// --- reading an upload -----------------------------------------------------------------

// Room for the multipart framing and the small text fields around the file.
const FORM_OVERHEAD = 64 * 1024;

// The multipart body, read chunk by chunk and cut off as soon as it passes
// the cap: request.formData() alone would buffer a body of any size, and a
// chunked upload has no Content-Length to refuse it by.
export async function readUploadForm(request: Request): Promise<FormData> {
  const type = request.headers.get("content-type") ?? "";
  if (type.split(";")[0].trim().toLowerCase() !== "multipart/form-data") throw new HttpError(415, "content-type");
  const limit = MEDIA_MAX_BYTES + FORM_OVERHEAD;
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw new HttpError(413, "too-large", { maxBytes: MEDIA_MAX_BYTES });
  if (!request.body) throw new HttpError(400, "bad-request");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      throw new HttpError(413, "too-large", { maxBytes: MEDIA_MAX_BYTES });
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), { headers: { "content-type": type } }).formData();
  } catch {
    throw new HttpError(400, "bad-request");
  }
}

// --- changing a record -------------------------------------------------------------------

export type MediaPatch = { alt?: string; filename?: string; folder?: MediaFolder };

export type MediaChange = { field: "alt" | "filename" | "folder"; from: string; to: string };

// Applies a change of the description of a file (never its bytes or its
// access: a private file must not become public by a rename). A new name
// keeps the extension of the stored type. Null when there is no such file.
export async function updateMedia(
  id: string,
  patch: MediaPatch,
  staffId: string | null = null,
): Promise<{ media: MediaDoc; changes: MediaChange[] } | null> {
  const media = await collection("media");
  const current = await media.findOne({ _id: id });
  if (!current) return null;

  const next: Pick<MediaDoc, "alt" | "filename" | "folder"> = {
    alt: patch.alt !== undefined ? patch.alt.slice(0, 300) : current.alt,
    filename:
      patch.filename !== undefined
        ? storedFilename(patch.filename, extensionForType(current.contentType) ?? (extensionOf(current.filename) || "bin")).slice(0, 200)
        : current.filename,
    folder: patch.folder ?? current.folder,
  };
  const changes = (["alt", "filename", "folder"] as const)
    .filter((field) => next[field] !== current[field])
    .map((field) => ({ field, from: current[field], to: next[field] }));
  if (changes.length === 0) return { media: current, changes };

  const updated = await media.findOneAndUpdate(
    { _id: id },
    { $set: { ...next, updatedAt: new Date(), updatedBy: staffId } },
    { returnDocument: "after" },
  );
  return updated ? { media: updated, changes } : null;
}
