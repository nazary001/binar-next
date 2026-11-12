import "server-only";
import { materialDownloadPath, type MaterialFile } from "@/components/materials/data";
import type { MaterialCategoryDoc, MaterialFileDoc } from "../db/collections";
import { CATEGORIES, FILES } from "./data/materials";
import { replaceSeedDocs, type SeedContext } from "./util";

// A dataset file -> its document. The dataset's `href` is where the bytes
// are: for a stored file it becomes `storagePath` and the public `href` is
// the download route; a `url` file keeps its external link. Optional flags
// are written only when set (the driver would store `undefined` as null).
export function materialFileDoc(file: MaterialFile, sort: number): MaterialFileDoc {
  const external = file.type === "url";
  return {
    _id: file.id,
    category: file.category,
    name: file.name,
    type: file.type,
    size: file.size,
    description: file.description,
    directions: [...file.directions],
    ...(file.locked ? { locked: true } : {}),
    ...(file.partnerLocked ? { partnerLocked: true } : {}),
    href: external ? file.href : materialDownloadPath(file.id),
    ...(external ? {} : { storagePath: file.href }),
    sort,
  };
}

// Seeds the materials library (7 folders, 31 files), in today's order.
export async function seedMaterials(ctx: SeedContext): Promise<string> {
  void ctx;
  const categories: MaterialCategoryDoc[] = CATEGORIES.map((category, sort) => ({
    _id: category.slug,
    title: category.title,
    ...(category.tagline ? { tagline: category.tagline } : {}),
    sort,
  }));
  const files = FILES.map((file, sort) => materialFileDoc(file, sort));
  const lines = [
    await replaceSeedDocs("materialCategories", categories),
    await replaceSeedDocs("materialFiles", files),
  ];
  return lines.join("; ");
}
