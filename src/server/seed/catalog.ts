import "server-only";
import { productHref, type Product } from "@/components/catalog/data";
import type { ProductDoc } from "../db/collections";
import { LISTING_PRODUCTS, SEED_PRODUCTS, productDetailsDoc } from "./data/catalog";
import { replaceSeedDocs, type SeedContext } from "./util";

// The product document of one seed product: every Product field except
// the id (which becomes _id; undefined fields are left out, the driver
// would store them as null), its place in the listing, the direction /
// category slugs of its canonical page and the product page content.
export function productDoc(product: Product, sort: number, listed: boolean, now: Date): ProductDoc {
  const { id, ...fields } = product;
  const [, , directionSlug, categorySlug] = productHref(product).split("/");
  const defined = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Omit<Product, "id">;
  return {
    _id: id,
    ...defined,
    sort,
    listed,
    directionSlug,
    categorySlug,
    details: productDetailsDoc(product),
    seed: true,
    createdAt: now,
    updatedAt: now,
  };
}

// Every seed product document, in sort order: the 132 listing products
// first (sort = today's array order, which "za populiarnistiu" shows),
// then the 8 products that only have a page.
export function catalogSeedDocs(now: Date = new Date()): ProductDoc[] {
  const listed = new Set(LISTING_PRODUCTS.map((p) => p.id));
  return SEED_PRODUCTS.map((p, i) => productDoc(p, i, listed.has(p.id), now));
}

// Seeds the 140 products with their page content. Products without the
// seed flag (added later by hand or by an import) are never touched.
export async function seedCatalog(ctx: SeedContext): Promise<string> {
  void ctx;
  return replaceSeedDocs("products", catalogSeedDocs());
}
