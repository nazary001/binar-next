import "server-only";
import { unstable_cache } from "next/cache";
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

const EXTERNAL_LINK = /^https?:\/\//i;

function toCategory(doc: MaterialCategoryDoc): MaterialCategory {
  return {
    slug: doc._id,
    title: doc.title,
    ...(doc.tagline ? { tagline: doc.tagline } : {}),
  };
}

function toFile(doc: MaterialFileDoc): MaterialFile {
  const external = doc.type === "url";
  const open = canDownloadMaterial(doc, null) && canDownloadMaterial(doc, "b2b");
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
    ...(doc.type === "png" && open && doc.storagePath ? { preview: doc.storagePath } : {}),
  };
}

// Uncached reads (scripts and tests call these; pages use the cached ones).
export async function readMaterialCategories(): Promise<MaterialCategory[]> {
  const docs = await (await collection("materialCategories")).find({}).sort({ sort: 1, _id: 1 }).toArray();
  return docs.map(toCategory);
}

export async function readMaterialFiles(): Promise<MaterialFile[]> {
  const docs = await (await collection("materialFiles")).find({}).sort({ sort: 1, _id: 1 }).toArray();
  return docs.map(toFile);
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
