import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { hasPrice } from "@/components/cart/data";
import { productHref, type Product } from "@/components/catalog/data";
import type { ProductDetails, SpecRow } from "@/components/product/data";
import { PUBLIC_REVALIDATE_SECONDS, TAG } from "../cache-tags";
import { collection, type ProductDetailsDoc, type ProductDoc } from "../db/collections";
import { discounted } from "../money";

// Catalog repository (package B): the public product reads of the server
// pages and the root layout, and the partner price map of the session
// bootstrap.
//
// Public reads go through ONE cached snapshot of the `products` collection
// (140 documents today): unstable_cache with the `catalog` tag, so an edit
// shows up within PUBLIC_REVALIDATE_SECONDS or at once after POST
// /api/revalidate. Everything else is derived from it. The snapshot
// never holds `partnerPrice` (it is projected out in the query): the
// partner price of a product reaches only a signed-in partner, through
// SessionData.prices. Of the staff fields it keeps only the two SEO texts
// (for the product page's metadata), and only when they are set.
//
// The page content of a product (`details`, most of a document) is not in
// the snapshot: it is cached per product (productDetails below, same tag),
// read only by that product's page. Next keeps at most 2 MB in one data
// cache entry (an entry over it is not cached at all, and in dev
// unstable_cache throws); with the page content inside, the snapshot
// passed that at about 670 products, without it an entry is a few hundred
// characters, so the snapshot holds thousands.

// One product as the snapshot keeps it: the public DTO plus what the
// derived reads need. Plain JSON only (unstable_cache stores it as JSON).
type CatalogEntry = {
  product: Product;
  // Shown in the catalog's listings. A hidden product keeps its page (the
  // panel's promise: it opens by direct link) but stays out of the
  // listings, the sitemap and search engines' index.
  listed: boolean;
  // The SEO fields staff typed in the product editor, only when there is
  // something (most products have none, so most entries carry no extra
  // key). Read by the product page's generateMetadata only.
  seo?: ProductSeo;
};

// A warning well before the 2 MB a data cache entry may hold.
const SNAPSHOT_WARN_CHARS = 1_500_000;

// A product's own <title> and description (ProductStaffFields seoTitle /
// seoDescription), each present only when not empty.
export type ProductSeo = { title?: string; description?: string };

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

type StoredProduct = Omit<ProductDoc, "partnerPrice" | "createdAt" | "updatedAt" | "seed" | "details">;

// Document -> public Product. Keeps the document's own field order (the
// seed writes the fields in the order the UI objects always had), drops
// technical fields, partnerPrice and empty optional values. A product
// without a price is not on sale (cart/data.ts hasPrice): the public
// catalog shows it out of stock until a manager prices it, whatever the
// panel's availability switch says.
function toPublicProduct(doc: StoredProduct): Product {
  const product: Record<string, unknown> = { id: doc._id };
  for (const [key, value] of Object.entries(doc)) {
    if (!PUBLIC_FIELD_SET.has(key) || value === undefined || value === null) continue;
    product[key] = Array.isArray(value) ? [...value] : value;
  }
  const result = product as Product;
  if (result.available && !hasPrice(result)) result.available = false;
  return result;
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

// `image` = the product's card photo (the gallery when it has none).
function normalizeDetails(raw: unknown, image: string): ProductDetailsDoc {
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
    images: images.length ? images : [image],
    platformImages: platformImages.length ? platformImages : images.length ? images : [image],
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

function seoOf(doc: StoredProduct): ProductSeo | undefined {
  const title = typeof doc.seoTitle === "string" ? doc.seoTitle.trim() : "";
  const description = typeof doc.seoDescription === "string" ? doc.seoDescription.trim() : "";
  if (!title && !description) return undefined;
  return { ...(title ? { title } : {}), ...(description ? { description } : {}) };
}

function toEntry(doc: StoredProduct): CatalogEntry {
  const product = toPublicProduct(doc);
  const seo = seoOf(doc);
  const entry: CatalogEntry = { product, listed: doc.listed !== false };
  if (seo) entry.seo = seo;
  return entry;
}

// An archived product (archivedAt is a date, set in the admin panel) is out
// of the shop: no listing, no page. Without the field, or with null
// (restored), it stays.
const LIVE = { archivedAt: { $not: { $type: "date" } } } as const;

async function loadSnapshot(): Promise<CatalogEntry[]> {
  const products = await collection("products");
  const docs = await products
    // The projection only leaves fields out, so seoTitle / seoDescription
    // are read; toEntry keeps nothing else of the staff fields. The page
    // content is read per product (loadDetails).
    .find(LIVE, { projection: { partnerPrice: 0, createdAt: 0, updatedAt: 0, seed: 0, details: 0 } })
    .sort({ sort: 1, _id: 1 })
    .toArray();
  const entries = docs.map((doc) => toEntry(doc as StoredProduct));
  const size = JSON.stringify(entries).length;
  if (size > SNAPSHOT_WARN_CHARS) {
    console.warn(
      `catalog: the snapshot of ${entries.length} products is ${size} characters; a data cache entry holds at most 2 MB, past it every catalog read goes to the database`,
    );
  }
  return entries;
}

// v3: entries no longer carry the page content. A new key part, so no
// entry cached in an older shape is served after a deploy.
const cachedSnapshot = unstable_cache(loadSnapshot, ["catalog:v3"], {
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

// The page content of one live product, normalized (normalizeDetails).
// null = no such live product.
async function loadDetails(id: string): Promise<ProductDetailsDoc | null> {
  const products = await collection("products");
  const doc = await products.findOne({ _id: id, ...LIVE }, { projection: { details: 1, image: 1 } });
  if (!doc) return null;
  const details = normalizeDetails(doc.details, text(doc.image));
  if (canonical(details) !== canonical(doc.details)) {
    console.warn(`catalog: product ${id} has incomplete page content (details); missing parts render empty`);
  }
  return details;
}

// One cache entry per product (the id is part of the key), under the same
// tag as the snapshot, so a revalidation refreshes both.
const cachedDetails = unstable_cache(loadDetails, ["catalog-details:v1"], {
  tags: [TAG.catalog],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});

const productDetails = cache(
  (id: string): Promise<ProductDetailsDoc | null> => (process.env.NEXT_RUNTIME ? cachedDetails(id) : loadDetails(id)),
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
// out), and whether the catalog lists it (a hidden product's page is
// noindex). null = no such product.
export async function getProductPage(
  id: string,
): Promise<{ product: Product; details: ProductDetails; listed: boolean } | null> {
  const entries = await snapshot();
  const entry = entries.find((e) => e.product.id === id);
  if (!entry) return null;
  const d = await productDetails(id);
  // Archived (or removed) since the snapshot was cached.
  if (!d) return null;
  const byId = new Map(entries.map((e) => [e.product.id, e.product]));
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
  return { product: entry.product, details, listed: entry.listed };
}

// The SEO fields of a product page (the product editor's SEO tab), from the
// same snapshot. null = no such product; {} = nothing typed.
export async function getProductSeo(id: string): Promise<ProductSeo | null> {
  const entry = (await snapshot()).find((e) => e.product.id === id);
  if (!entry) return null;
  return entry.seo ? { ...entry.seo } : {};
}

// Product page paths, in sort order. Derived from productHref, the same
// rule the page uses for its canonical-path check, so a listed path always
// renders. Every product with a page by default (generateStaticParams of
// the product page); `listedOnly` keeps the products the catalog shows
// (the sitemap: a hidden product's page opens by direct link only).
export async function listProductPaths(
  options: { listedOnly?: boolean } = {},
): Promise<{ direction: string; category: string; product: string }[]> {
  const entries = (await snapshot()).filter((e) => !options.listedOnly || e.listed);
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

// A price the accounting system sent for the partners' price type. 0 is
// how an ERP says "no price of this type", so only a positive one counts.
const usableErpPrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

// Price type ids are newId() values ("pt-..."). Only such a plain token is
// put into a projection path (no dots, no "$"); any other id reads the
// whole price map instead.
const PLAIN_ID = /^[A-Za-z0-9_-]{1,64}$/;

// Product id -> the price this partner company pays. undefined = nothing to
// send (the client then falls back to the public numbers). The one place
// partner prices are decided (the session bootstrap and placeOrder both
// read it), straight from the database:
// 1. the product's own partnerPrice wins;
// 2. else, when a price type holds the role "individual" (the partners'
//    list price, set on the panel's price types page) and the product has
//    a positive price of that type (products.prices, sent by BAS): that
//    price minus the company's discount;
// 3. else the company's discount off the wholesale list price (the
//    pre-sale price for a promo item).
// Without such a role, or without a price of that type on a product, the
// numbers are exactly what rule 3 always gave. The role is read once per
// call. A product without a usable price gets no entry.
export async function partnerPrices(clientId: string): Promise<Record<string, number> | undefined> {
  const clients = await collection("clients");
  const client = await clients.findOne({ _id: clientId }, { projection: { discountPercent: 1 } });
  if (!client) return undefined;
  const percent = usableDiscount(client.discountPercent);

  const individual = await (await collection("priceTypes")).findOne({ role: "individual" }, { projection: { _id: 1 } });
  const typeId = individual ? individual._id : null;
  const projection: Record<string, 1> = { price: 1, oldPrice: 1, partnerPrice: 1 };
  if (typeId) projection[PLAIN_ID.test(typeId) ? `prices.${typeId}` : "prices"] = 1;

  const products = await collection("products");
  const docs = await products.find({}, { projection }).sort({ sort: 1, _id: 1 }).toArray();
  const prices: Record<string, number> = {};
  for (const doc of docs) {
    const list = usablePrice(doc.oldPrice) ? doc.oldPrice : doc.price;
    const map = doc.prices && typeof doc.prices === "object" && !Array.isArray(doc.prices) ? doc.prices : null;
    const own = typeId && map ? map[typeId] : undefined;
    if (usablePrice(doc.partnerPrice)) prices[doc._id] = doc.partnerPrice;
    else if (usableErpPrice(own)) prices[doc._id] = discounted(own, percent);
    else if (usablePrice(list)) prices[doc._id] = discounted(list, percent);
  }
  return prices;
}
