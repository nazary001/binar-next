import "server-only";
import { unstable_cache } from "next/cache";
import { parseMediaRef, publicMediaUrl } from "@/components/admin/media/types";
import {
  canDownloadMaterial,
  materialDownloadPath,
  type MaterialCategory,
  type MaterialFile,
} from "@/components/materials/data";
import { PUBLIC_REVALIDATE_SECONDS, TAG } from "../cache-tags";
import { collection, type MaterialCategoryDoc, type MaterialFileDoc } from "../db/collections";

// Materials library repository (package C). Server components read the
// cached lists (tag "materials", 5 minutes, POST /api/revalidate drops
// them); the download route reads one document uncached.
//
// The public DTOs have the shape of the UI types. A stored file's `href`
// is the download route, never its storage path, so the HTML holds no
// direct link to a file the viewer may not download. A `png` every viewer
// may download also carries `preview` (the picture the preview panel
// shows), exactly what the panel showed before.
//
// A file uploaded in the admin panel lives in the media library
// (storagePath "media:<id>"), which is not an address. Its preview is the
// public address of the upload (/api/media/<id>) when the upload is
// public; a private upload gets no preview (the panel then treats it like
// any file without one), so a private file's bytes are only ever served by
// the download route, after its access check.

const EXTERNAL_LINK = /^https?:\/\//i;

function toCategory(doc: MaterialCategoryDoc): MaterialCategory {
  return {
    slug: doc._id,
    title: doc.title,
    ...(doc.tagline ? { tagline: doc.tagline } : {}),
  };
}

// A path of this site (never "//host" or "/\host", which browsers send to
// another host) or an https address (a later blob store), visible ASCII
// only; anything else a bad record could hold never reaches an <img src>.
const SITE_PATH = /^\/(?![/\\])[\x21-\x7e]*$/;
const HTTPS_ADDRESS = /^https:\/\/[\x21-\x7e]+$/;

function isPictureAddress(value: string): boolean {
  return SITE_PATH.test(value) || HTTPS_ADDRESS.test(value);
}

// What the preview panel may show for a `png` every viewer may download.
function previewOf(storagePath: string | undefined, publicMedia: ReadonlySet<string>): string | null {
  if (!storagePath) return null;
  const mediaId = parseMediaRef(storagePath);
  if (mediaId) return publicMedia.has(mediaId) ? publicMediaUrl(mediaId) : null;
  return isPictureAddress(storagePath) ? storagePath : null;
}

function toFile(doc: MaterialFileDoc, publicMedia: ReadonlySet<string>): MaterialFile {
  const external = doc.type === "url";
  const open = canDownloadMaterial(doc, null) && canDownloadMaterial(doc, "b2b");
  const preview = doc.type === "png" && open ? previewOf(doc.storagePath, publicMedia) : null;
  return {
    id: doc._id,
    category: doc.category,
    name: doc.name,
    type: doc.type,
    directions: doc.directions,
    description: doc.description,
    size: doc.size,
    ...(doc.locked ? { locked: true } : {}),
    ...(doc.partnerLocked ? { partnerLocked: true } : {}),
    // A link that is not http(s) (a bad edit in the database) is dropped
    // rather than rendered into an <a href>.
    href: external ? (EXTERNAL_LINK.test(doc.href) ? doc.href : "#") : materialDownloadPath(doc._id),
    ...(preview ? { preview } : {}),
  };
}

// Uncached reads (scripts and tests call these; pages use the cached ones).
export async function readMaterialCategories(): Promise<MaterialCategory[]> {
  const docs = await (await collection("materialCategories")).find({}).sort({ sort: 1, _id: 1 }).toArray();
  return docs.map(toCategory);
}

// The ids of the public uploads among the files' media references.
async function publicMediaOf(docs: readonly MaterialFileDoc[]): Promise<Set<string>> {
  const ids = [...new Set(docs.map((doc) => parseMediaRef(doc.storagePath)).filter((id) => id !== null))];
  if (ids.length === 0) return new Set();
  const found = await (await collection("media"))
    .find({ _id: { $in: ids }, access: "public" }, { projection: { _id: 1 } })
    .toArray();
  return new Set(found.map((media) => media._id));
}

export async function readMaterialFiles(): Promise<MaterialFile[]> {
  const docs = await (await collection("materialFiles")).find({}).sort({ sort: 1, _id: 1 }).toArray();
  const publicMedia = await publicMediaOf(docs);
  return docs.map((doc) => toFile(doc, publicMedia));
}

const CACHE = { tags: [TAG.materials], revalidate: PUBLIC_REVALIDATE_SECONDS };

// The folders, in display order.
export const getMaterialCategories: () => Promise<MaterialCategory[]> = unstable_cache(
  readMaterialCategories,
  ["materials:categories"],
  CACHE,
);

// Every file, in display order (folder pages filter by `category`).
export const getMaterialFiles: () => Promise<MaterialFile[]> = unstable_cache(
  readMaterialFiles,
  ["materials:files"],
  CACHE,
);

// One stored document, uncached, for GET /api/materials/files/[id]/download.
// `id` must already be validated (zId).
export async function getMaterialFile(id: string): Promise<MaterialFileDoc | null> {
  return (await collection("materialFiles")).findOne({ _id: id });
}
