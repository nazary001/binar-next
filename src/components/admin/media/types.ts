// What the panel knows about an uploaded file (GET / POST /api/admin/media).
// Shared by the media routes and the kit's upload widgets. Types and small
// pure helpers only.

export type MediaFolder = "blog" | "products" | "materials" | "orders" | "misc";

export const MEDIA_FOLDERS: { value: MediaFolder; label: string }[] = [
  { value: "blog", label: "Блог" },
  { value: "products", label: "Товари" },
  { value: "materials", label: "Матеріали" },
  { value: "orders", label: "Документи замовлень" },
  { value: "misc", label: "Інше" },
];

export type MediaAccess = "public" | "private";

export type MediaDto = {
  id: string;
  kind: "image" | "file";
  filename: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  folder: string;
  access: MediaAccess;
  alt: string;
  // The public address (/api/media/<id>); null for a private file.
  url: string | null;
  // The address staff read the file at, whatever its access
  // (/api/admin/media/<id>/file).
  adminUrl: string;
  createdAt: string;
  createdBy: string | null;
};

// POST /api/admin/media: multipart/form-data with the fields
//   file    the file (at most MEDIA_MAX_BYTES)
//   folder  one of MEDIA_FOLDERS (default "misc")
//   access  "public" | "private" (default "public")
//   alt     optional text
// Answer: MediaUploadAnswer.
export const MEDIA_MAX_BYTES = 4 * 1024 * 1024;

// --- answers of the media routes ---------------------------------------------
//
//   GET    /media                 MediaListAnswer  (?folder ?kind ?access ?q ?sort ?page ?limit)
//   POST   /media                 MediaUploadAnswer
//   GET    /media/<id>            MediaDetailAnswer
//   PATCH  /media/<id>            MediaPatchInput -> MediaPatchAnswer
//   DELETE /media/<id>[?force=1]  { ok: true }; 409 "in-use" { usage } unless forced
//   GET    /media/<id>/file       the bytes, for staff, whatever the access

export type MediaUsageType = "blog" | "product" | "material" | "order";

// One place a file is used. `href` is the panel page of the record.
export type MediaUsageItem = {
  type: MediaUsageType;
  id: string;
  label: string;
  // Which field of the record holds the file, in Ukrainian ("Обкладинка").
  field: string;
  href: string;
};

// totalBytes: the size of every file of the library the caller may see;
// filteredBytes: of the files that pass the filters (the same figure when
// nothing is filtered).
export type MediaListAnswer = {
  ok: true;
  items: MediaDto[];
  total: number;
  page: number;
  limit: number;
  totalBytes: number;
  filteredBytes: number;
};

// The folder the order screen and BAS file the papers of orders in.
export const MEDIA_ORDER_FOLDER: MediaFolder = "orders";

// A paper of an order: a file of the folder "orders", or any file an order
// document points at. Only the orders permissions reach it in the library
// (orders.view to see it, orders.edit to rename, move or delete it); the
// server applies the same rule (src/app/api/admin/media/library.ts).
export function isOrderDocument(media: Pick<MediaDto, "folder">, usage: readonly MediaUsageItem[]): boolean {
  return media.folder === MEDIA_ORDER_FOLDER || usage.some((item) => item.type === "order");
}

// `duplicate`: the same bytes were already stored in that folder with that
// access, and the existing record came back instead of a second copy.
export type MediaUploadAnswer = { ok: true; media: MediaDto; duplicate: boolean };

export type MediaDetailAnswer = { ok: true; media: MediaDto; usage: MediaUsageItem[] };

export type MediaPatchInput = { alt?: string; filename?: string; folder?: MediaFolder };

export type MediaPatchAnswer = { ok: true; media: MediaDto; changed: ("alt" | "filename" | "folder")[] };

// Wording for the refusals of the media routes, for errorMessage(result, MEDIA_ERRORS).
export const MEDIA_ERRORS: Record<string, string> = {
  empty: "Файл порожній.",
  type: "Такий тип файлу не підтримується. Можна завантажити JPG, PNG, WebP, GIF, PDF та документи Word, Excel, PowerPoint.",
  "too-large": "Файл завеликий: можна завантажити до 4 МБ.",
  "in-use": "Файл використовується на сайті, тому видалити його не можна.",
  "content-type": "Не вдалося надіслати файл. Спробуйте ще раз.",
};

// The largest side an image is scaled down to in the browser before upload.
export const MEDIA_IMAGE_MAX_SIDE = 2400;

export const MEDIA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

// How a stored file is referenced from another document (an order
// document's `file`, a material's `storagePath`): "media:<id>".
export const MEDIA_REF_PREFIX = "media:";

export function mediaRef(id: string): string {
  return `${MEDIA_REF_PREFIX}${id}`;
}

export function parseMediaRef(value: string | null | undefined): string | null {
  if (!value || !value.startsWith(MEDIA_REF_PREFIX)) return null;
  const id = value.slice(MEDIA_REF_PREFIX.length);
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id) ? id : null;
}

export function publicMediaUrl(id: string): string {
  return `/api/media/${id}`;
}
