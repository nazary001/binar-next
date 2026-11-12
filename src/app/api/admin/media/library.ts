import "server-only";
import type { Collection, Filter } from "mongodb";
import type { Permission } from "@/components/admin/lib/permissions";
import {
  MEDIA_FOLDERS,
  MEDIA_MAX_BYTES,
  MEDIA_ORDER_FOLDER,
  isOrderDocument,
  parseMediaRef,
  type MediaDto,
  type MediaFolder,
  type MediaUsageItem,
} from "@/components/admin/media/types";
import { can, type StaffContext } from "@/server/admin/auth";
import { contains, listQuery, oneOf, paginate, type Page } from "@/server/admin/list";
import { collection, type MediaDoc } from "@/server/db/collections";
import { toMediaDto } from "@/server/media/store";
import { isOrderDocumentFile, orderDocumentsOutsideFolder } from "@/server/media/usage";
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

// The papers of the partners' orders (invoices, waybills: a file of the
// folder "orders", or any file an order document points at, see
// isOrderDocument) belong to the orders permissions instead: orders.view to
// list, open or download one; orders.edit to rename, move or delete one,
// to upload into the folder "orders" and to move a file into it. The
// routes of one file are guarded by MEDIA_CHANGE (MEDIA_EDIT and
// orders.edit, a literal for the route audit) and then decide per file.
export const ORDER_DOCUMENT_VIEW: Permission = "orders.view";
export const ORDER_DOCUMENT_EDIT: Permission = "orders.edit";
export const MEDIA_CHANGE: readonly Permission[] = ["content.edit", "catalog.edit", "orders.edit"];

function forbidden(): never {
  throw new HttpError(403, "forbidden");
}

// 403 unless the caller may see this file (its record, its bytes).
export function assertMayRead(staff: StaffContext, media: MediaDoc, usage: readonly MediaUsageItem[]): void {
  if (isOrderDocument(media, usage) && !can(staff, ORDER_DOCUMENT_VIEW)) forbidden();
}

// The same for a route without the usage list at hand (the file itself):
// one look at the orders, and only for a caller without orders.view.
export async function assertMayReadFile(staff: StaffContext, media: MediaDoc): Promise<void> {
  if (can(staff, ORDER_DOCUMENT_VIEW)) return;
  if (await isOrderDocumentFile(media)) forbidden();
}

// 403 unless the caller may rename, move or delete this file.
export function assertMayChange(staff: StaffContext, media: MediaDoc, usage: readonly MediaUsageItem[]): void {
  if (!can(staff, isOrderDocument(media, usage) ? ORDER_DOCUMENT_EDIT : MEDIA_EDIT)) forbidden();
}

// 403 unless the caller may put a file into `folder` (an upload, a move).
export function assertMayFileInto(staff: StaffContext, folder: string): void {
  if (folder === MEDIA_ORDER_FOLDER && !can(staff, ORDER_DOCUMENT_EDIT)) forbidden();
}

// The part of the library the caller may see: all of it with orders.view,
// otherwise everything but the papers of orders.
async function visibleScope(staff: StaffContext): Promise<Filter<MediaDoc>> {
  if (can(staff, ORDER_DOCUMENT_VIEW)) return {};
  const outside = await orderDocumentsOutsideFolder();
  return { $nor: [{ folder: MEDIA_ORDER_FOLDER }, ...(outside.length > 0 ? [{ _id: { $in: outside } }] : [])] };
}

type ByteSums = { total: { bytes: number }[]; filtered: { bytes: number }[] };

// The size of the visible library and of the filtered part of it, in one
// aggregation.
async function bytesOf(
  media: Collection<MediaDoc>,
  scope: Filter<MediaDoc>,
  filter: Filter<MediaDoc>,
): Promise<{ totalBytes: number; filteredBytes: number }> {
  const sum = { $group: { _id: null, bytes: { $sum: "$size" } } };
  const [row] = await media
    .aggregate<ByteSums>([{ $match: scope }, { $facet: { total: [sum], filtered: [{ $match: filter }, sum] } }])
    .toArray();
  return { totalBytes: row?.total[0]?.bytes ?? 0, filteredBytes: row?.filtered[0]?.bytes ?? 0 };
}

export function folderLabel(folder: string): string {
  return MEDIA_FOLDERS.find((item) => item.value === folder)?.label ?? folder;
}

export const FOLDER_VALUES = MEDIA_FOLDERS.map((folder) => folder.value) as [MediaFolder, ...MediaFolder[]];

const SORTABLE = ["createdAt", "size", "filename"] as const;

// GET /api/admin/media?folder=&kind=&access=&q=&sort=&page=&limit=, within
// what the caller may see (visibleScope).
export async function listMedia(
  url: URL,
  staff: StaffContext,
): Promise<Page<MediaDto> & { totalBytes: number; filteredBytes: number }> {
  const query = listQuery(url, { sortable: SORTABLE, defaultSort: "-createdAt", defaultLimit: 40 });
  const scope = await visibleScope(staff);
  const filter: Filter<MediaDoc> = { ...scope };
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
  const media = await collection("media");
  const [page, bytes] = await Promise.all([paginate(media, filter, query, { map: toMediaDto }), bytesOf(media, scope, filter)]);
  return { ...page, ...bytes };
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
