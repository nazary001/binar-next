import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { productHref, type Product } from "@/components/catalog/data";
import type { ProductDetails, SpecRow } from "@/components/product/data";
import { PUBLIC_REVALIDATE_SECONDS, TAG } from "../cache-tags";
import { collection, type ProductDetailsDoc, type ProductDoc } from "../db/collections";
import { discounted } from "../money";

// Catalog repository (package B): the public product reads of the server
// pages and the root layout, and the partner price map of the session
// bootstrap.
//
// Public reads go through ONE cached snapshot of the whole `products`
// collection (140 documents today): unstable_cache with the `catalog` tag,
// so an edit shows up within PUBLIC_REVALIDATE_SECONDS or at once after
// POST /api/revalidate. Everything else is derived from it. The snapshot
// never holds `partnerPrice` (it is projected out in the query): the
// partner price of a product reaches only a signed-in partner, through
// SessionData.prices.

// One product as the snapshot keeps it: the public DTO plus what the
// derived reads need. Plain JSON only (unstable_cache stores it as JSON).
type CatalogEntry = {
  product: Product;
  listed: boolean;
  details: ProductDetailsDoc;
};

// The Product fields a public DTO may carry, in the type's order.
// partnerPrice is deliberately missing.
const PUBLIC_FIELDS = [
  "title",
  "image",
  "volume",
  "brand",
  "subcategory",
  "zone",
  "productType",
  "price",
  "oldPrice",
  "discount",
  "available",
  "chips",
  "retailPrice",
  "fxPrice",
  "preorder",
] as const satisfies readonly (keyof Product)[];

const PUBLIC_FIELD_SET: ReadonlySet<string> = new Set(PUBLIC_FIELDS);

type StoredProduct = Omit<ProductDoc, "partnerPrice" | "createdAt" | "updatedAt" | "seed">;

// Document -> public Product. Keeps the document's own field order (the
// seed writes the fields in the order the UI objects always had), drops
// technical fields, partnerPrice and empty optional values.
function toPublicProduct(doc: StoredProduct): Product {
  const product: Record<string, unknown> = { id: doc._id };
  for (const [key, value] of Object.entries(doc)) {
    if (!PUBLIC_FIELD_SET.has(key) || value === undefined || value === null) continue;
    product[key] = Array.isArray(value) ? [...value] : value;
  }
  return product as Product;
}

// The product page content as the page needs it, whatever the stored
// document holds. The seed always writes every key; a product added or
// edited by hand in Atlas Data Explorer may not (the validator only asks
// for an object), and its page must still render: a missing or mistyped
// text becomes "", a list keeps only its well-formed items, an empty
// gallery shows the card photo. One warning per such document and
// snapshot load.
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const texts = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
const rows = (value: unknown): SpecRow[] =>
  Array.isArray(value)
    ? value.flatMap((row) =>
        row && typeof row === "object" && typeof row.label === "string" && typeof row.value === "string"
          ? [{ label: row.label, value: row.value }]
          : [],
      )
    : [];

function normalizeDetails(raw: unknown, product: Product): ProductDetailsDoc {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const scent = (d.scent && typeof d.scent === "object" ? d.scent : {}) as Record<string, unknown>;
  const images = texts(d.images);
  const platformImages = texts(d.platformImages);
  return {
    sku: text(d.sku),
    description: text(d.description),
    benefits: texts(d.benefits),
    characteristics: rows(d.characteristics),
    payment: rows(d.payment),
    delivery: rows(d.delivery),
    scent: { intro: text(scent.intro), top: text(scent.top), middle: text(scent.middle), base: text(scent.base) },
    images: images.length ? images : [product.image],
    platformImages: platformImages.length ? platformImages : images.length ? images : [product.image],
    boughtTogether: Array.isArray(d.boughtTogether)
      ? d.boughtTogether.flatMap((item) =>
          item && typeof item === "object" && typeof item.productId === "string"
            ? [{ productId: item.productId, benefits: texts(item.benefits) }]
            : [],
        )
      : [],
    seriesIds: texts(d.seriesIds),
    similarIds: texts(d.similarIds),
  };
}

// Canonical JSON of a value (sorted keys): tells whether normalizing
// changed a stored document.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v,
  );
}

function toEntry(doc: StoredProduct): CatalogEntry {
  const product = toPublicProduct(doc);
  const details = normalizeDetails(doc.details, product);
  if (canonical(details) !== canonical(doc.details)) {
    console.warn(`catalog: product ${doc._id} has incomplete page content (details); missing parts render empty`);
  }
  return { product, listed: doc.listed !== false, details };
}

async function loadSnapshot(): Promise<CatalogEntry[]> {
  const products = await collection("products");
  const docs = await products
    // An archived product (archivedAt is a date, set in the admin panel) is
    // out of the shop: no listing, no page. Without the field, or with
    // null (restored), it stays.
    .find(
      { archivedAt: { $not: { $type: "date" } } },
      { projection: { partnerPrice: 0, createdAt: 0, updatedAt: 0, seed: 0 } },
    )
    .sort({ sort: 1, _id: 1 })
    .toArray();
  return docs.map((doc) => toEntry(doc as StoredProduct));
}

const cachedSnapshot = unstable_cache(loadSnapshot, ["catalog:v1"], {
  tags: [TAG.catalog],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});

// Per request: the root layout, generateMetadata and the page share one
// read of the cache. Outside a Next server (the tsx check and seed
// scripts) there is no incremental cache, so the database is read
// directly; NEXT_RUNTIME is defined by Next for every server bundle.
const snapshot = cache(
  (): Promise<CatalogEntry[]> => (process.env.NEXT_RUNTIME ? cachedSnapshot() : loadSnapshot()),
);

// Every product for the client registry (catalog/registry.ts): the
// listing in listing order ("za populiarnistiu"), then the products that
// only have a page. Public DTOs only.
export async function getRegistryProducts(): Promise<{ listing: Product[]; extras: Product[] }> {
  const entries = await snapshot();
  return {
    listing: entries.filter((e) => e.listed).map((e) => e.product),
    extras: entries.filter((e) => !e.listed).map((e) => e.product),
  };
}

// The product page: the product and its page content, related products
// resolved to public DTOs (a related id that no longer exists is left
// out). null = no such product.
export async function getProductPage(
  id: string,
): Promise<{ product: Product; details: ProductDetails } | null> {
  const entries = await snapshot();
  const byId = new Map(entries.map((e) => [e.product.id, e.product]));
  const entry = entries.find((e) => e.product.id === id);
  if (!entry) return null;
  const d = entry.details;
  const resolve = (ids: string[]) =>
    ids.map((relatedId) => byId.get(relatedId)).filter((p): p is Product => Boolean(p));
  const details: ProductDetails = {
    sku: d.sku,
    description: d.description,
    benefits: d.benefits,
    characteristics: d.characteristics,
    payment: d.payment,
    delivery: d.delivery,
    scent: d.scent,
    images: d.images,
    platformImages: d.platformImages,
    boughtTogether: d.boughtTogether.flatMap(({ productId, benefits }) => {
      const product = byId.get(productId);
      return product ? [{ product, benefits }] : [];
    }),
    series: resolve(d.seriesIds),
    similar: resolve(d.similarIds),
  };
  return { product: entry.product, details };
}

// Every product page path, in sort order (generateStaticParams of the
// product page and the sitemap). Derived from productHref, the same rule
// the page uses for its canonical-path check, so a listed path always
// renders.
export async function listProductPaths(): Promise<{ direction: string; category: string; product: string }[]> {
  const entries = await snapshot();
  return entries.map((e) => {
    const [, , direction, category, product] = productHref(e.product).split("/");
    return { direction, category, product };
  });
}

// A company discount the price map can use: a percentage in [0, 100).
// Anything else (a typo such as 150 or -20 in Atlas, a missing or
// non-numeric value) counts as no discount, so a partner never sees a
// negative price or one above the list price.
function usableDiscount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 100 ? value : 0;
}

const usablePrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

// Product id -> the price this partner company pays. undefined = nothing to
// send (the client then falls back to the public numbers).
// A product's own partnerPrice wins; otherwise the company's discount off
// the wholesale list price (the pre-sale price for a promo item). Read for
// the session bootstrap only, straight from the database. A product
// without a usable price gets no entry.
export async function partnerPrices(clientId: string): Promise<Record<string, number> | undefined> {
  const clients = await collection("clients");
  const client = await clients.findOne({ _id: clientId }, { projection: { discountPercent: 1 } });
  if (!client) return undefined;
  const percent = usableDiscount(client.discountPercent);

  const products = await collection("products");
  const docs = await products
    .find({}, { projection: { price: 1, oldPrice: 1, partnerPrice: 1 } })
    .sort({ sort: 1, _id: 1 })
    .toArray();
  const prices: Record<string, number> = {};
  for (const doc of docs) {
    const list = usablePrice(doc.oldPrice) ? doc.oldPrice : doc.price;
    if (usablePrice(doc.partnerPrice)) prices[doc._id] = doc.partnerPrice;
    else if (usablePrice(list)) prices[doc._id] = discounted(list, percent);
  }
  return prices;
}
