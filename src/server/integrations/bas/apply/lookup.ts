import "server-only";
import type { Document } from "mongodb";
import { collection, type ProductDoc } from "../../../db/collections";

// Finds the products a batch names, in two queries for the whole batch:
// by the GUID of BAS, and by the article (details.sku) for products the
// site had before the exchange (they have no externalId yet).

export type ProductRef = { productExternalId?: string | null; sku?: string };

export type ProductIndex = {
  byExternal: Map<string, ProductDoc>;
  bySku: Map<string, ProductDoc[]>;
};

export async function indexProducts(
  externalIds: string[],
  skus: string[],
  projection?: Document,
): Promise<ProductIndex> {
  const products = await collection("products");
  const or: Document[] = [];
  if (externalIds.length) or.push({ externalId: { $in: [...new Set(externalIds)] } });
  if (skus.length) or.push({ "details.sku": { $in: [...new Set(skus)] } });
  const docs = or.length
    ? ((await products.find({ $or: or }, projection ? { projection } : {}).toArray()) as ProductDoc[])
    : [];
  const byExternal = new Map<string, ProductDoc>();
  const bySku = new Map<string, ProductDoc[]>();
  for (const doc of docs) {
    if (typeof doc.externalId === "string") byExternal.set(doc.externalId, doc);
    const sku = doc.details?.sku;
    if (typeof sku === "string" && sku) bySku.set(sku, [...(bySku.get(sku) ?? []), doc]);
  }
  return { byExternal, bySku };
}

// The product a price or stock row names: by GUID first, else by an
// article that exactly one product carries.
export function resolveProduct(index: ProductIndex, ref: ProductRef): ProductDoc | "unknown" | "ambiguous" {
  if (ref.productExternalId) {
    const doc = index.byExternal.get(ref.productExternalId);
    if (doc) return doc;
    if (!ref.sku) return "unknown";
  }
  const matches = ref.sku ? (index.bySku.get(ref.sku) ?? []) : [];
  if (matches.length === 1) return matches[0];
  return matches.length > 1 ? "ambiguous" : "unknown";
}

export function productRefKey(ref: ProductRef): string {
  return ref.productExternalId ? `x:${ref.productExternalId}` : `s:${ref.sku ?? ""}`;
}

export function productRefLabel(ref: ProductRef): string {
  return ref.productExternalId ?? ref.sku ?? "";
}
