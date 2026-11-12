import "server-only";
import type { AnyBulkWriteOperation } from "mongodb";
import { z } from "zod";
import { slugify } from "@/components/admin/lib/format";
import {
  MATERIAL_LIMITS,
  MATERIAL_RESERVED_SLUGS,
  type MaterialCategoryRow,
  type MaterialFieldReason,
  type MaterialFileRow,
  type MaterialFileType,
  type MaterialMediaInfo,
  type MaterialSource,
} from "@/components/admin/materials/types";
import { mediaRef, parseMediaRef } from "@/components/admin/media/types";
import { DIRECTIONS, materialDownloadPath, type Direction } from "@/components/materials/data";
import { collection, type MaterialCategoryDoc, type MaterialFileDoc, type MediaDoc } from "../../db/collections";
import { newId } from "../../ids";
import { findMedia } from "../../media/store";
import { HttpError, notFound } from "../http";
import { contains, idParam, oneOf } from "../list";

// The materials library of the admin panel: folders (`material_categories`,
// _id = slug) and files (`material_files`).
//
// A stored file's bytes are named by `storagePath`: a path of the site (the
// seed), or "media:<id>" for an upload of the media library. The public
// `href` of a stored file is always the download route, which checks who
// asks before it delivers; a link ("url") keeps its https address in
// `href` and has no storagePath. `locked` / `partnerLocked` are written
// only when true and removed when false: the storefront reads absence as
// "open". File `sort` is one global order; each folder shows its files in
// that order.
//
// Every staff write stamps `updatedAt` and `updatedBy` (the id of the
// member of staff); seeded documents carry neither until someone edits them.

const FILE_TYPES: readonly MaterialFileType[] = ["pdf", "doc", "ppt", "url", "png"];
const STORED_TYPES = ["pdf", "doc", "ppt", "png"] as const;
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;
const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

// --- validation -------------------------------------------------------------

function isHttpsUrl(value: string): boolean {
  if (value.length > MATERIAL_LIMITS.url || !VISIBLE_ASCII.test(value) || !value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1).max(max);
const zSlug = z.string().trim().min(1).max(MATERIAL_LIMITS.slug).regex(SLUG_PATTERN);
const zKey = z.string().min(1).max(64).regex(SLUG_PATTERN);
const zUrl = z.string().trim().refine(isHttpsUrl);
const zDirections = z.array(z.enum(DIRECTIONS)).max(DIRECTIONS.length * 2);

export const CategoryCreateSchema = z
  .object({ title: required(MATERIAL_LIMITS.title), slug: zSlug.optional(), tagline: text(MATERIAL_LIMITS.tagline).optional() })
  .strict();
export const CategoryPatchSchema = z
  .object({ title: required(MATERIAL_LIMITS.title).optional(), tagline: text(MATERIAL_LIMITS.tagline).optional() })
  .strict();
export const CategoriesReorderSchema = z.object({ ids: z.array(zKey).min(1).max(500) }).strict();

export const FileCreateSchema = z
  .object({
    category: zKey,
    name: required(MATERIAL_LIMITS.name),
    type: z.enum(STORED_TYPES).optional(),
    description: text(MATERIAL_LIMITS.description).optional(),
    directions: zDirections.optional(),
    locked: z.boolean().optional(),
    partnerLocked: z.boolean().optional(),
    mediaId: zKey.optional(),
    url: zUrl.optional(),
  })
  .strict();
export type FileCreate = z.infer<typeof FileCreateSchema>;

export const FilePatchSchema = z
  .object({
    name: required(MATERIAL_LIMITS.name).optional(),
    description: text(MATERIAL_LIMITS.description).optional(),
    directions: zDirections.optional(),
    locked: z.boolean().optional(),
    partnerLocked: z.boolean().optional(),
    category: zKey.optional(),
    type: z.enum(STORED_TYPES).optional(),
    mediaId: zKey.optional(),
    url: zUrl.optional(),
  })
  .strict();
export type FilePatch = z.infer<typeof FilePatchSchema>;

export const FilesReorderSchema = z.object({ category: zKey, ids: z.array(zKey).min(1).max(1000) }).strict();

function fieldError(fields: Record<string, MaterialFieldReason>): HttpError {
  return new HttpError(400, "fields", { fields });
}

// An id from the address bar: well-formed, or 404.
export function materialIdParam(raw: string): string {
  const parsed = zKey.safeParse(raw);
  if (!parsed.success) notFound();
  return parsed.data;
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

// --- derived values ---------------------------------------------------------

// The type of the library from the content type of an upload; null when
// the library has no type for it.
export function materialTypeOf(contentType: string): Exclude<MaterialFileType, "url"> | null {
  const type = contentType.toLowerCase().split(";")[0].trim();
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("image/")) return "png";
  if (
    type === "application/msword" ||
    type.includes("wordprocessingml") ||
    type === "application/rtf" ||
    type === "application/vnd.oasis.opendocument.text"
  ) {
    return "doc";
  }
  if (
    type === "application/vnd.ms-powerpoint" ||
    type.includes("presentationml") ||
    type === "application/vnd.oasis.opendocument.presentation"
  ) {
    return "ppt";
  }
  return null;
}

// The size line in the seed's wording: "850 KB", "1.4 MB", "14 MB".
export function materialSizeText(bytes: number): string {
  const kb = Math.max(1, Math.round(bytes / 1024));
  if (kb < 1024) return `${kb} KB`;
  const mb = bytes / (1024 * 1024);
  return mb < 10 ? `${(Math.round(mb * 10) / 10).toString()} MB` : `${Math.round(mb)} MB`;
}

const LINK_SIZE = "-";

function sourceOf(doc: MaterialFileDoc): MaterialSource {
  if (doc.type === "url") return { kind: "url", url: doc.href };
  const mediaId = parseMediaRef(doc.storagePath);
  if (mediaId) return { kind: "media", mediaId };
  return { kind: "path", path: doc.storagePath ?? "" };
}

function toMediaInfo(media: MediaDoc): MaterialMediaInfo {
  return { filename: media.filename, contentType: media.contentType, size: media.size, access: media.access };
}

async function mediaInfos(docs: readonly MaterialFileDoc[]): Promise<Map<string, MaterialMediaInfo>> {
  const ids = [...new Set(docs.map((doc) => parseMediaRef(doc.storagePath)).filter((id): id is string => id !== null))];
  if (ids.length === 0) return new Map();
  const found = await (await collection("media")).find({ _id: { $in: ids } }).toArray();
  return new Map(found.map((media) => [media._id, toMediaInfo(media)]));
}

function toFileRow(doc: MaterialFileDoc, media: Map<string, MaterialMediaInfo>): MaterialFileRow {
  const source = sourceOf(doc);
  const updatedAt = doc.updatedAt;
  return {
    id: doc._id,
    category: doc.category,
    name: doc.name,
    type: doc.type,
    size: doc.size ?? "",
    description: doc.description ?? "",
    directions: [...(doc.directions ?? [])],
    locked: doc.locked === true,
    partnerLocked: doc.partnerLocked === true,
    sort: doc.sort,
    source,
    media: source.kind === "media" ? (media.get(source.mediaId) ?? null) : null,
    href: doc.type === "url" ? doc.href : materialDownloadPath(doc._id),
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : null,
    seed: doc.seed === true,
  };
}

function toCategoryRow(doc: MaterialCategoryDoc, filesCount: number): MaterialCategoryRow {
  return {
    id: doc._id,
    title: doc.title,
    tagline: doc.tagline ?? "",
    sort: doc.sort,
    filesCount,
    seed: doc.seed === true,
  };
}

// --- reads --------------------------------------------------------------------

// The whole library in one answer (it is small): every folder with its
// number of files, and the files that pass ?category=&type=&q= (q looks in
// the name and the id).
export async function listMaterials(
  params: URLSearchParams,
): Promise<{ categories: MaterialCategoryRow[]; files: MaterialFileRow[] }> {
  const [categoryDocs, fileDocs] = await Promise.all([
    (await collection("materialCategories")).find({}).sort({ sort: 1, _id: 1 }).toArray(),
    (await collection("materialFiles")).find({}).sort({ sort: 1, _id: 1 }).toArray(),
  ]);
  const counts = new Map<string, number>();
  for (const doc of fileDocs) counts.set(doc.category, (counts.get(doc.category) ?? 0) + 1);

  const category = idParam(params, "category");
  const type = oneOf(params, "type", FILE_TYPES);
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const pattern = q ? contains(q) : null;
  const selected = fileDocs.filter(
    (doc) =>
      (!category || doc.category === category) &&
      (!type || doc.type === type) &&
      (!pattern || pattern.test(doc.name) || pattern.test(doc._id)),
  );
  const media = await mediaInfos(selected);
  return {
    categories: categoryDocs.map((doc) => toCategoryRow(doc, counts.get(doc._id) ?? 0)),
    files: selected.map((doc) => toFileRow(doc, media)),
  };
}

async function countFiles(category: string): Promise<number> {
  return (await collection("materialFiles")).countDocuments({ category });
}

async function categoryRow(doc: MaterialCategoryDoc): Promise<MaterialCategoryRow> {
  return toCategoryRow(doc, await countFiles(doc._id));
}

export async function fileRow(doc: MaterialFileDoc): Promise<MaterialFileRow> {
  return toFileRow(doc, await mediaInfos([doc]));
}

async function assertCategoryExists(id: string, field = "category"): Promise<void> {
  const found = await (await collection("materialCategories")).countDocuments({ _id: id }, { limit: 1 });
  if (found === 0) throw fieldError({ [field]: "unknown" });
}

async function requireMedia(mediaId: string): Promise<MediaDoc> {
  const media = await findMedia(mediaId);
  if (!media) throw fieldError({ mediaId: "unknown" });
  return media;
}

async function nextFileSort(): Promise<number> {
  const [last] = await (await collection("materialFiles"))
    .find({}, { projection: { sort: 1 } })
    .sort({ sort: -1 })
    .limit(1)
    .toArray();
  return last ? Math.floor(last.sort) + 1 : 0;
}

// --- folders ------------------------------------------------------------------

// A new folder at the end. Slug from the title unless given.
export async function createMaterialCategory(
  input: z.infer<typeof CategoryCreateSchema>,
  staffId: string | null,
): Promise<MaterialCategoryRow> {
  const slug = input.slug ?? slugify(input.title, MATERIAL_LIMITS.slug);
  if (!slug) throw fieldError({ slug: "required" });
  if ((MATERIAL_RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase())) throw fieldError({ slug: "reserved" });
  const categories = await collection("materialCategories");
  const [last] = await categories.find({}, { projection: { sort: 1 } }).sort({ sort: -1 }).limit(1).toArray();
  const row: MaterialCategoryDoc = {
    _id: slug,
    title: input.title,
    ...(input.tagline ? { tagline: input.tagline } : {}),
    sort: last ? Math.floor(last.sort) + 1 : 0,
    updatedAt: new Date(),
    updatedBy: staffId,
  };
  try {
    await categories.insertOne(row);
  } catch (error) {
    if (isDuplicateKey(error)) throw new HttpError(409, "exists", { field: "slug" });
    throw error;
  }
  return toCategoryRow(row, 0);
}

// title, tagline ("" removes it).
export async function updateMaterialCategory(
  id: string,
  input: z.infer<typeof CategoryPatchSchema>,
  staffId: string | null,
): Promise<{ before: MaterialCategoryDoc; after: MaterialCategoryRow }> {
  const categories = await collection("materialCategories");
  const set: Partial<MaterialCategoryDoc> = { updatedAt: new Date(), updatedBy: staffId };
  const unset: { seed: ""; tagline?: "" } = { seed: "" };
  if (input.title !== undefined) set.title = input.title;
  if (input.tagline !== undefined) {
    if (input.tagline) set.tagline = input.tagline;
    else unset.tagline = "";
  }
  const before = await categories.findOneAndUpdate({ _id: id }, { $set: set, $unset: unset }, { returnDocument: "before" });
  if (!before) notFound();
  const after = await categories.findOne({ _id: id });
  if (!after) notFound();
  return { before, after: await categoryRow(after) };
}

// Only an empty folder can go: 409 "in-use" while it holds files.
export async function deleteMaterialCategory(id: string): Promise<MaterialCategoryDoc> {
  const categories = await collection("materialCategories");
  const doc = await categories.findOne({ _id: id });
  if (!doc) notFound();
  const files = await countFiles(id);
  if (files > 0) throw new HttpError(409, "in-use", { files });
  await categories.deleteOne({ _id: id });
  return doc;
}

// The full new order of the folders. Only folders whose place changed are
// written.
export async function reorderMaterialCategories(ids: readonly string[], staffId: string | null): Promise<number> {
  const categories = await collection("materialCategories");
  const all = await categories.find({}, { projection: { _id: 1, sort: 1 } }).sort({ sort: 1, _id: 1 }).toArray();
  const known = new Set(all.map((doc) => doc._id));
  if (ids.length !== all.length || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
    throw fieldError({ ids: "mismatch" });
  }
  const current = new Map(all.map((doc) => [doc._id, doc.sort]));
  const now = new Date();
  const writes: AnyBulkWriteOperation<MaterialCategoryDoc>[] = [];
  ids.forEach((id, position) => {
    if (current.get(id) !== position) {
      writes.push({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sort: position, updatedAt: now, updatedBy: staffId }, $unset: { seed: "" } },
        },
      });
    }
  });
  if (writes.length > 0) await categories.bulkWrite(writes, { ordered: false });
  return writes.length;
}

// --- files --------------------------------------------------------------------

function storedFields(media: MediaDoc, id: string, type: Exclude<MaterialFileType, "url">) {
  return {
    type,
    size: materialSizeText(media.size),
    href: materialDownloadPath(id),
    storagePath: mediaRef(media._id),
  };
}

function cleanDirections(values: readonly Direction[]): Direction[] {
  return [...new Set(values)];
}

// A stored upload (mediaId) or a link (url): exactly one of them.
export async function createMaterialFile(input: FileCreate, staffId: string | null): Promise<MaterialFileDoc> {
  if (input.mediaId && input.url) throw fieldError({ source: "conflict" });
  if (!input.mediaId && !input.url) throw fieldError({ source: "required" });
  if (input.url && input.type) throw fieldError({ type: "invalid" });
  await assertCategoryExists(input.category);

  const id = newId("mf");
  let source: Pick<MaterialFileDoc, "type" | "size" | "href" | "storagePath">;
  if (input.mediaId) {
    const media = await requireMedia(input.mediaId);
    source = storedFields(media, id, input.type ?? materialTypeOf(media.contentType) ?? "doc");
  } else {
    source = { type: "url", size: LINK_SIZE, href: input.url ?? "" };
  }

  const row: MaterialFileDoc = {
    _id: id,
    category: input.category,
    name: input.name,
    description: input.description ?? "",
    directions: cleanDirections(input.directions ?? []),
    ...(input.locked ? { locked: true } : {}),
    ...(input.partnerLocked ? { partnerLocked: true } : {}),
    ...source,
    sort: await nextFileSort(),
    updatedAt: new Date(),
    updatedBy: staffId,
  };
  await (await collection("materialFiles")).insertOne(row);
  return row;
}

export async function updateMaterialFile(
  id: string,
  input: FilePatch,
  staffId: string | null,
): Promise<{ before: MaterialFileDoc; after: MaterialFileDoc }> {
  const files = await collection("materialFiles");
  const before = await files.findOne({ _id: id });
  if (!before) notFound();
  if (input.mediaId && input.url) throw fieldError({ source: "conflict" });

  const set: Partial<MaterialFileDoc> = { updatedAt: new Date(), updatedBy: staffId };
  const unset: Partial<Record<"seed" | "locked" | "partnerLocked" | "storagePath", "">> = { seed: "" };
  if (input.name !== undefined) set.name = input.name;
  if (input.description !== undefined) set.description = input.description;
  if (input.directions !== undefined) set.directions = cleanDirections(input.directions);
  if (input.locked !== undefined) {
    if (input.locked) set.locked = true;
    else unset.locked = "";
  }
  if (input.partnerLocked !== undefined) {
    if (input.partnerLocked) set.partnerLocked = true;
    else unset.partnerLocked = "";
  }
  if (input.category !== undefined && input.category !== before.category) {
    await assertCategoryExists(input.category);
    set.category = input.category;
    // A moved file goes to the end of its new folder.
    set.sort = await nextFileSort();
  }

  if (input.mediaId) {
    const media = await requireMedia(input.mediaId);
    const keep = before.type !== "url" ? before.type : null;
    Object.assign(set, storedFields(media, id, input.type ?? materialTypeOf(media.contentType) ?? keep ?? "doc"));
  } else if (input.url) {
    if (input.type) throw fieldError({ type: "invalid" });
    set.type = "url";
    set.href = input.url;
    set.size = LINK_SIZE;
    unset.storagePath = "";
  } else if (input.type) {
    if (before.type === "url") throw fieldError({ type: "invalid" });
    set.type = input.type;
  }

  const after = await files.findOneAndUpdate({ _id: id }, { $set: set, $unset: unset }, { returnDocument: "after" });
  if (!after) notFound();
  return { before, after };
}

export async function deleteMaterialFile(id: string): Promise<MaterialFileDoc> {
  const doc = await (await collection("materialFiles")).findOneAndDelete({ _id: id });
  if (!doc) notFound();
  return doc;
}

// The full new order of one folder's files. The folder keeps the sort
// values it already had (so its place among the others in the global
// order does not move); they are only handed out in the new order.
export async function reorderMaterialFiles(category: string, ids: readonly string[], staffId: string | null): Promise<number> {
  await assertCategoryExists(category);
  const files = await collection("materialFiles");
  const docs = await files.find({ category }, { projection: { _id: 1, sort: 1 } }).sort({ sort: 1, _id: 1 }).toArray();
  const known = new Set(docs.map((doc) => doc._id));
  if (ids.length !== docs.length || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
    throw fieldError({ ids: "mismatch" });
  }
  const values = docs.map((doc) => doc.sort);
  // Equal values would leave the order to the id: spread them apart.
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] <= values[index - 1]) values[index] = values[index - 1] + 1;
  }
  const current = new Map(docs.map((doc) => [doc._id, doc.sort]));
  const now = new Date();
  const writes: AnyBulkWriteOperation<MaterialFileDoc>[] = [];
  ids.forEach((id, position) => {
    if (current.get(id) !== values[position]) {
      writes.push({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sort: values[position], updatedAt: now, updatedBy: staffId }, $unset: { seed: "" } },
        },
      });
    }
  });
  if (writes.length > 0) await files.bulkWrite(writes, { ordered: false });
  return writes.length;
}
