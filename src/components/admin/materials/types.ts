import type { Direction, FileType } from "@/components/materials/data";

// The contract of the materials library API of the admin panel
// (/api/admin/materials/*). Shared by the routes, the repository
// (src/server/admin/repos/materials.ts) and the materials screen. Types and
// plain constants only: no "use client", no server import.
//
//   GET    /materials?category&type&q            -> MaterialsAnswer        content.view
//   POST   /materials/categories     MaterialCategoryCreateInput -> MaterialCategoryAnswer  content.edit
//   PATCH  /materials/categories/<id> MaterialCategoryPatchInput -> MaterialCategoryAnswer  content.edit
//   DELETE /materials/categories/<id>            -> { ok: true }           content.edit (409 "in-use" while it holds files)
//   POST   /materials/categories/reorder MaterialCategoriesReorderInput -> { ok: true }  content.edit
//   POST   /materials/files          MaterialFileCreateInput -> MaterialFileAnswer  content.edit
//   PATCH  /materials/files/<id>     MaterialFilePatchInput  -> MaterialFileAnswer  content.edit
//   DELETE /materials/files/<id>                 -> { ok: true }           content.edit
//   POST   /materials/files/reorder  MaterialFilesReorderInput -> { ok: true }  content.edit
//
// Refusals: 400 "bad-request" (a body of the wrong shape), 400 "fields"
// with { fields: { <name>: MaterialFieldReason } }, 404 "not-found", 409
// "exists" (the folder slug is taken), 409 "in-use" ({ files: n }), 403
// "forbidden". Every change refreshes the public library at once.

export type MaterialFileType = FileType;
export type MaterialDirection = Direction;

// Where the bytes of a file are.
// - "media": an upload of the media library (stored as "media:<id>");
// - "path": a file of the site (the seed: "/figma-export/materials/...");
// - "url": an external link (type "url"), opened as it is.
export type MaterialSource =
  | { kind: "media"; mediaId: string }
  | { kind: "path"; path: string }
  | { kind: "url"; url: string };

// What the media library holds for a "media" source (null when the record
// is gone). A locked file whose upload is "public" can still be fetched
// by anyone at /api/media/<id>: the screen should warn about it.
export type MaterialMediaInfo = {
  filename: string;
  contentType: string;
  size: number;
  access: "public" | "private";
};

export type MaterialCategoryRow = {
  // The slug: the folder's address (/materials/<id>).
  id: string;
  title: string;
  // B2B only: the note under the partner folder title ("" = none).
  tagline: string;
  sort: number;
  // Every file of the folder, whatever the filters.
  filesCount: number;
  seed: boolean;
};

export type MaterialFileRow = {
  id: string;
  category: string;
  name: string;
  type: MaterialFileType;
  // The size line the site prints ("14 MB", "850 KB"; "-" for a link).
  size: string;
  description: string;
  directions: MaterialDirection[];
  // The download needs an account (guests see a padlock).
  locked: boolean;
  // A signed-in partner gets the padlock (its agreement does not cover it).
  partnerLocked: boolean;
  // Order inside the folder (ascending).
  sort: number;
  source: MaterialSource;
  media: MaterialMediaInfo | null;
  // What the site links to: the download route, or the external link.
  href: string;
  // ISO; null for a file nobody changed in the panel yet.
  updatedAt: string | null;
  seed: boolean;
};

export type MaterialsAnswer = { ok: true; categories: MaterialCategoryRow[]; files: MaterialFileRow[] };

export type MaterialCategoryAnswer = { ok: true; category: MaterialCategoryRow };

export type MaterialFileAnswer = { ok: true; file: MaterialFileRow };

// slug: made from the title when left out (lower-case Latin, digits, "-").
export type MaterialCategoryCreateInput = { title: string; slug?: string; tagline?: string };

// tagline "" removes the note.
export type MaterialCategoryPatchInput = { title?: string; tagline?: string };

// The full new order of the folders: every folder id exactly once.
export type MaterialCategoriesReorderInput = { ids: string[] };

// Exactly one of mediaId / url:
// - mediaId: an upload of the media library. type is derived from its
//   content type (PDF -> "pdf", Word -> "doc", PowerPoint -> "ppt", an
//   image -> "png") unless given; the size line is made from its bytes.
//   Upload locked materials as "private" media.
// - url: an https address; the file becomes a link (type "url").
export type MaterialFileCreateInput = {
  category: string;
  name: string;
  type?: Exclude<MaterialFileType, "url">;
  description?: string;
  directions?: MaterialDirection[];
  locked?: boolean;
  partnerLocked?: boolean;
  mediaId?: string;
  url?: string;
};

// Any subset. mediaId replaces the file (and turns a link into a stored
// file); url turns it into a link or changes the link; type may correct
// the derived type of a stored file. A file moved to another folder goes
// to the end of it.
export type MaterialFilePatchInput = {
  name?: string;
  description?: string;
  directions?: MaterialDirection[];
  locked?: boolean;
  partnerLocked?: boolean;
  category?: string;
  type?: Exclude<MaterialFileType, "url">;
  mediaId?: string;
  url?: string;
};

// The full new order of one folder's files: every file of it exactly once.
export type MaterialFilesReorderInput = { category: string; ids: string[] };

export const MATERIAL_LIMITS = {
  slug: 64,
  title: 120,
  tagline: 300,
  name: 200,
  description: 2000,
  url: 2000,
} as const;

// Folder slugs that would collide with fixed addresses of the API
// (/api/admin/materials/categories/reorder).
export const MATERIAL_RESERVED_SLUGS = ["reorder"] as const;

export type MaterialFieldReason =
  | "required"
  | "invalid"
  | "unknown"
  | "reserved"
  | "too-long"
  | "mismatch"
  | "conflict";

// Wording of the codes only the materials routes answer, for
// errorMessage(..., own).
export const MATERIAL_ERROR_MESSAGES: Record<string, string> = {
  exists: "Папка з такою адресою вже існує.",
  "in-use": "У папці є файли. Перенесіть або видаліть їх, а тоді видаляйте папку.",
  fields: "Перевірте виділені поля.",
};

export const MATERIAL_FIELD_MESSAGES: Record<MaterialFieldReason, string> = {
  required: "Заповніть це поле.",
  invalid: "Значення не підходить.",
  unknown: "Такого запису немає.",
  reserved: "Ця адреса зайнята службовою сторінкою.",
  "too-long": "Задовге значення.",
  mismatch: "Список не збігається з поточним вмістом. Оновіть сторінку.",
  conflict: "Оберіть щось одне: файл або посилання.",
};
