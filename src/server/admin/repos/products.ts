import "server-only";
import { MongoServerError, type AnyBulkWriteOperation, type Filter, type UpdateFilter } from "mongodb";
import { z, type ZodType } from "zod";
import { EMPTY_CATEGORY_META, type CategoryCounts, type TaxonomyAnswer } from "@/components/admin/catalog/types";
import { slugify } from "@/components/admin/lib/format";
import {
  CURRENCY_LINKS,
  PRODUCT_LIMITS as LIM,
  PRODUCT_SORT_FIELDS,
  RESERVED_PRODUCT_IDS,
  STOCK_STATES,
  type ProductBulkAction,
  type ProductDetail,
  type ProductDetailsDto,
  type ProductFileDto,
  type ProductOptionsAnswer,
  type ProductPackageDto,
  type ProductRow,
  type ProductUsage,
  type RelatedProductDto,
  type StockState,
} from "@/components/admin/products/types";
import {
  BRANDS,
  CATALOG_DIRECTIONS,
  categoryHref,
  directionCatalogHref,
  productHref,
  type CatalogDirection,
  type Product,
  type SubcategoryCard,
} from "@/components/catalog/data";
import { collection, type ProductDetailsDoc, type ProductDoc } from "../../db/collections";
import { HttpError, readJson } from "../../http";
import { round2 } from "../../money";
import { zId, zRequiredText, zText } from "../../validate";
import { UK_COLLATION, contains, flag, listQuery, oneOf, paginate, type ListQuery, type Page } from "../list";
import { getSettings, saveSettings } from "../settings";

// Database access of the panel's catalog: the products and the taxonomy
// view (directions and categories are code, src/components/catalog/data.ts;
// their staff metadata lives in the "catalog" settings group).
//
// The rule this file exists to keep: a product the panel saves can always
// be shown by the storefront. A product links to the taxonomy by LABEL
// strings (subcategory = a carousel card label; zone and productType = one
// of that direction's lists), the storefront derives the address from the
// label (productHref), and the B2B pages read `volume` and `brand` without
// guarding. So every write checks the labels against the code, keeps
// directionSlug / categorySlug equal to what productHref says, refuses an
// old price that would not read as a promo, and keeps the gallery and the
// related ids pointing at something real.
//
// Every write removes `seed` (otherwise npm run db:seed reverts it) and
// stamps updatedAt / updatedBy. The routes add the journal line and drop
// the public catalog cache.

// --- the taxonomy, indexed --------------------------------------------------

type CardRef = { direction: CatalogDirection; card: SubcategoryCard; key: string };

const CARDS: CardRef[] = CATALOG_DIRECTIONS.flatMap((direction) =>
  direction.carousel.map((card) => ({ direction, card, key: `${direction.slug}/${card.slug}` })),
);

// productHref files a product under the FIRST card with its label; the
// index keeps the same rule.
const BY_LABEL = new Map<string, CardRef>();
for (const ref of CARDS) if (!BY_LABEL.has(ref.card.label)) BY_LABEL.set(ref.card.label, ref);

const BY_KEY = new Map<string, CardRef>(CARDS.map((ref) => [ref.key, ref]));
const ALL_LABELS = [...BY_LABEL.keys()];
const DIRECTION_SLUGS = CATALOG_DIRECTIONS.map((direction) => direction.slug);
const CATEGORY_SLUGS = [...new Set(CARDS.map((ref) => ref.card.slug))];
const STOCK_VALUES = STOCK_STATES.map((state) => state.value);
const RESERVED = new Set<string>(RESERVED_PRODUCT_IDS);

export function isCategoryKey(key: string): boolean {
  return BY_KEY.has(key);
}

type Placement = { directionSlug: string; categorySlug: string; href: string; orphan: boolean };

// Where the storefront files a product: the same function the product page
// uses for its canonical-path check, so the panel never disagrees with it.
function placement(id: string, subcategory: string): Placement {
  const href = productHref({ id, subcategory } as Product);
  const [, , directionSlug = "", categorySlug = ""] = href.split("/");
  return { directionSlug, categorySlug, href, orphan: !BY_LABEL.has(subcategory) };
}

// --- small readers of stored values ----------------------------------------
// Documents written by hand in Atlas or by an older seed may lack fields or
// carry the wrong type; answers never pass that on.

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const iso = (value: unknown): string | null =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
const texts = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
// A business day "YYYY-MM-DD" as the exchange stores it, or null.
const day = (value: unknown): string | null =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
const isArchived = (doc: { archivedAt?: Date | null }): boolean => doc.archivedAt instanceof Date;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function specRows(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = record(item);
    return typeof row.label === "string" && typeof row.value === "string" ? [{ label: row.label, value: row.value }] : [];
  });
}

// The page content as the storefront reads it (repos/catalog.ts
// normalizeDetails): an empty gallery shows the card photo there, so the
// editor shows the same.
function detailsOf(raw: unknown, image: string): ProductDetailsDto {
  const d = record(raw);
  const scent = record(d.scent);
  const images = texts(d.images);
  const platformImages = texts(d.platformImages);
  return {
    sku: str(d.sku),
    description: str(d.description),
    benefits: texts(d.benefits),
    characteristics: specRows(d.characteristics),
    payment: specRows(d.payment),
    delivery: specRows(d.delivery),
    scent: { intro: str(scent.intro), top: str(scent.top), middle: str(scent.middle), base: str(scent.base) },
    images: images.length ? images : [image],
    platformImages: platformImages.length ? platformImages : images.length ? images : [image],
    boughtTogether: Array.isArray(d.boughtTogether)
      ? d.boughtTogether.flatMap((item) => {
          const entry = record(item);
          return typeof entry.productId === "string" ? [{ productId: entry.productId, benefits: texts(entry.benefits) }] : [];
        })
      : [],
    seriesIds: texts(d.seriesIds),
    similarIds: texts(d.similarIds),
  };
}

function packagesOf(value: unknown): ProductPackageDto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const p = record(item);
    if (typeof p.id !== "string") return [];
    return [
      {
        id: p.id,
        name: str(p.name),
        coefficient: num(p.coefficient) ?? 1,
        unitCode: str(p.unitCode),
        isDefault: p.isDefault === true,
        externalId: typeof p.externalId === "string" ? p.externalId : null,
      },
    ];
  });
}

function filesOf(value: unknown): ProductFileDto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const f = record(item);
    return typeof f.id === "string" && typeof f.file === "string" ? [{ id: f.id, name: str(f.name), file: f.file }] : [];
  });
}

function pricesOf(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, price] of Object.entries(record(value))) {
    const n = num(price);
    if (n !== null) out[key] = n;
  }
  return out;
}

// --- stock "traffic light" ---------------------------------------------------

// "number" (any numeric BSON type) is a $type alias MongoDB knows and the
// driver's typings do not list.
const IS_NUMBER = { $type: "number" } as unknown as { $type: "double" };

type StockRules = { shop: number; byLabel: Map<string, number> };

async function loadStockRules(): Promise<StockRules> {
  const [shop, catalog] = await Promise.all([getSettings("shop"), getSettings("catalog")]);
  const byLabel = new Map<string, number>();
  for (const [key, meta] of Object.entries(catalog.categories)) {
    const ref = BY_KEY.get(key);
    // A card whose label an earlier card already owns never gets products.
    if (ref && BY_LABEL.get(ref.card.label) === ref && typeof meta.stockThreshold === "number") {
      byLabel.set(ref.card.label, meta.stockThreshold);
    }
  }
  return { shop: shop.stockThreshold, byLabel };
}

function thresholdOf(rules: StockRules, subcategory: string): number {
  return rules.byLabel.get(subcategory) ?? rules.shop;
}

function stockStateOf(qty: unknown, threshold: number): StockState {
  const value = num(qty);
  if (value === null) return "unknown";
  if (value <= 0) return "out";
  return value >= threshold ? "in" : "low";
}

function stockCondition(state: StockState, threshold: number): Filter<ProductDoc> {
  if (state === "in") return { stockQty: { $gt: 0, $gte: threshold } };
  if (state === "low") return { stockQty: { $gt: 0, $lt: threshold } };
  if (state === "out") return { stockQty: { $lte: 0 } };
  return { stockQty: { $not: IS_NUMBER } };
}

// The threshold depends on the category, so "in" / "low" become one
// branch per category with its own threshold plus one for the rest.
function stockFilter(state: StockState, rules: StockRules): Filter<ProductDoc> {
  if (state === "out" || state === "unknown" || rules.byLabel.size === 0) return stockCondition(state, rules.shop);
  return {
    $or: [
      ...[...rules.byLabel].map(([label, threshold]) => ({ subcategory: label, ...stockCondition(state, threshold) })),
      { subcategory: { $nin: [...rules.byLabel.keys()] }, ...stockCondition(state, rules.shop) },
    ],
  };
}

// --- list -------------------------------------------------------------------

const LIVE: Filter<ProductDoc> = { archivedAt: { $not: { $type: "date" } } };
const ARCHIVED: Filter<ProductDoc> = { archivedAt: { $type: "date" } };

function productFilter(query: Pick<ListQuery, "q" | "params">, rules: StockRules): Filter<ProductDoc> {
  const params = query.params;
  const and: Filter<ProductDoc>[] = [];

  if (query.q) {
    const text = contains(query.q);
    and.push({ $or: [{ title: text }, { "details.sku": text }, { _id: text }, { brand: text }] });
  }

  const direction = oneOf(params, "direction", DIRECTION_SLUGS);
  const category = oneOf(params, "category", CATEGORY_SLUGS);
  if (direction || category) {
    const labels = CARDS.filter(
      (ref) =>
        (!direction || ref.direction.slug === direction) &&
        (!category || ref.card.slug === category) &&
        BY_LABEL.get(ref.card.label) === ref,
    ).map((ref) => ref.card.label);
    and.push({ subcategory: { $in: labels } });
  }

  const brand = (params.get("brand") ?? "").trim();
  if (brand && brand.length <= 120) and.push({ brand });

  const listed = flag(params, "listed");
  if (listed !== undefined) and.push(listed ? { listed: { $ne: false } } : { listed: false });
  const available = flag(params, "available");
  if (available !== undefined) and.push({ available });
  const preorder = flag(params, "preorder");
  if (preorder !== undefined) and.push(preorder ? { preorder: true } : { preorder: { $ne: true } });
  const promo = flag(params, "promo");
  if (promo !== undefined) {
    and.push(promo ? { oldPrice: IS_NUMBER } : { oldPrice: { $not: IS_NUMBER } });
  }

  if (params.get("archived") !== "all") and.push(flag(params, "archived") === true ? ARCHIVED : LIVE);

  const stock = oneOf(params, "stock", STOCK_VALUES);
  if (stock) and.push(stockFilter(stock, rules));

  const orphan = flag(params, "orphan");
  if (orphan !== undefined) and.push({ subcategory: orphan ? { $nin: ALL_LABELS } : { $in: ALL_LABELS } });

  return and.length ? { $and: and } : {};
}

const ROW_PROJECTION = {
  title: 1,
  image: 1,
  volume: 1,
  brand: 1,
  subcategory: 1,
  price: 1,
  oldPrice: 1,
  partnerPrice: 1,
  available: 1,
  preorder: 1,
  listed: 1,
  stockQty: 1,
  expectedDate: 1,
  sort: 1,
  updatedAt: 1,
  archivedAt: 1,
  seed: 1,
  "details.sku": 1,
} as const;

function toRow(doc: ProductDoc, rules: StockRules): ProductRow {
  const subcategory = str(doc.subcategory);
  const place = placement(doc._id, subcategory);
  return {
    id: doc._id,
    title: str(doc.title),
    image: str(doc.image),
    sku: str(record(doc.details).sku),
    brand: str(doc.brand),
    volume: str(doc.volume),
    subcategory,
    directionSlug: place.directionSlug,
    categorySlug: place.categorySlug,
    price: num(doc.price) ?? 0,
    oldPrice: num(doc.oldPrice),
    partnerPrice: num(doc.partnerPrice),
    available: doc.available === true,
    preorder: doc.preorder === true,
    listed: doc.listed !== false,
    stockQty: num(doc.stockQty),
    stock: stockStateOf(doc.stockQty, thresholdOf(rules, subcategory)),
    expectedDate: day(doc.expectedDate),
    sort: num(doc.sort) ?? 0,
    updatedAt: iso(doc.updatedAt),
    archived: isArchived(doc),
    orphan: place.orphan,
    href: place.href,
    seed: doc.seed === true,
  };
}

const LIST_OPTIONS = { sortable: PRODUCT_SORT_FIELDS, defaultSort: "sort", defaultLimit: 20, maxLimit: 200 };

// Titles sort the Ukrainian way (alphabet order, case ignored); every other
// sort keeps the plain order, which can use the indexes.
const collationOf = (query: ListQuery) => (query.sortKey.replace(/^-/, "") === "title" ? UK_COLLATION : undefined);

export async function listProducts(url: URL): Promise<Page<ProductRow>> {
  const query = listQuery(url, LIST_OPTIONS);
  const rules = await loadStockRules();
  const products = await collection("products");
  return paginate(products, productFilter(query, rules), query, {
    projection: ROW_PROJECTION,
    map: (doc) => toRow(doc, rules),
    collation: collationOf(query),
  });
}

export const EXPORT_MAX_ROWS = 5000;

// The filtered list without paging (GET /products/export), in the asked
// order, capped.
export async function exportProducts(url: URL): Promise<(ProductRow & { partnerPrice: number | null })[]> {
  const query = listQuery(url, LIST_OPTIONS);
  const rules = await loadStockRules();
  const products = await collection("products");
  const collation = collationOf(query);
  const docs = await products
    .find(productFilter(query, rules), { projection: ROW_PROJECTION, ...(collation ? { collation } : {}) })
    .sort(query.sort)
    .limit(EXPORT_MAX_ROWS)
    .toArray();
  return docs.map((doc) => toRow(doc, rules));
}

// --- the editor's vocabulary --------------------------------------------------

const byUkrainian = (a: string, b: string): number => a.localeCompare(b, "uk");

function union(...lists: unknown[][]): string[] {
  const out = new Set<string>();
  for (const list of lists) {
    for (const value of list) {
      if (typeof value === "string" && value.trim()) out.add(value.trim());
    }
  }
  return [...out].sort(byUkrainian);
}

export async function productOptions(): Promise<Omit<ProductOptionsAnswer, "ok">> {
  const products = await collection("products");
  const [brands, manufacturers, countries, units, catalog, types] = await Promise.all([
    products.distinct("brand"),
    products.distinct("manufacturer"),
    products.distinct("country"),
    products.distinct("unit"),
    getSettings("catalog"),
    (await collection("priceTypes")).find({}, { projection: { name: 1, role: 1 } }).sort({ name: 1, _id: 1 }).toArray(),
  ]);
  return {
    directions: CATALOG_DIRECTIONS.map((direction) => ({
      slug: direction.slug,
      title: direction.title,
      facetTitle: direction.facet.title,
      categories: direction.carousel
        .filter((card) => BY_LABEL.get(card.label)?.direction === direction)
        .map((card) => ({ slug: card.slug, label: card.label })),
      zones: [...direction.facet.options],
      productTypes: [...direction.productFilters],
    })),
    brands: union([...BRANDS], catalog.brands, brands),
    manufacturers: union(catalog.manufacturers, manufacturers),
    countries: union(catalog.countries, countries),
    units: union(units),
    currencyLinks: [...CURRENCY_LINKS],
    priceTypes: types.map((type) => ({ id: type._id, name: type.name, role: type.role ?? null })),
  };
}

// --- one product ------------------------------------------------------------

export async function productUsage(id: string): Promise<ProductUsage> {
  const [orders, assortments, carts] = await Promise.all([
    collection("orders").then((col) => col.countDocuments({ "items.productId": id })),
    collection("assortments").then((col) => col.countDocuments({ "lines.id": id })),
    collection("carts").then((col) => col.countDocuments({ "lines.id": id })),
  ]);
  return { orders, assortments, carts };
}

function relatedIdsOf(details: ProductDetailsDto): string[] {
  return [
    ...new Set([...details.boughtTogether.map((item) => item.productId), ...details.seriesIds, ...details.similarIds]),
  ];
}

// The product's place in the storefront's default listing: listed live
// products ordered by sort, ties by id (repos/catalog.ts reads them so).
async function listingPosition(doc: ProductDoc): Promise<ProductDetail["position"]> {
  if (doc.listed === false || isArchived(doc)) return null;
  const products = await collection("products");
  const sort = num(doc.sort) ?? 0;
  const shown: Filter<ProductDoc> = { listed: { $ne: false }, ...LIVE };
  const [before, total] = await Promise.all([
    products.countDocuments({ $and: [shown, { $or: [{ sort: { $lt: sort } }, { sort, _id: { $lt: doc._id } }] }] }),
    products.countDocuments(shown),
  ]);
  return { place: before + 1, total };
}

function toDetail(
  doc: ProductDoc,
  rules: StockRules,
  usage: ProductUsage,
  related: Record<string, RelatedProductDto>,
  position: ProductDetail["position"],
): ProductDetail {
  const subcategory = str(doc.subcategory);
  const image = str(doc.image);
  const place = placement(doc._id, subcategory);
  const currency = doc.currencyLink;
  return {
    id: doc._id,
    title: str(doc.title),
    image,
    volume: str(doc.volume),
    brand: str(doc.brand),
    subcategory,
    zone: typeof doc.zone === "string" ? doc.zone : null,
    productType: typeof doc.productType === "string" ? doc.productType : null,
    price: num(doc.price) ?? 0,
    oldPrice: num(doc.oldPrice),
    discount: num(doc.discount),
    available: doc.available === true,
    chips: Array.isArray(doc.chips) ? texts(doc.chips) : null,
    retailPrice: num(doc.retailPrice),
    partnerPrice: num(doc.partnerPrice),
    fxPrice: doc.fxPrice === true,
    preorder: doc.preorder === true,
    sort: num(doc.sort) ?? 0,
    listed: doc.listed !== false,
    directionSlug: str(doc.directionSlug),
    categorySlug: str(doc.categorySlug),
    details: detailsOf(doc.details, image),
    externalId: typeof doc.externalId === "string" ? doc.externalId : null,
    barcode: str(doc.barcode),
    stockQty: num(doc.stockQty),
    stock: stockStateOf(doc.stockQty, thresholdOf(rules, subcategory)),
    leadTimeDays: num(doc.leadTimeDays),
    expectedDate: day(doc.expectedDate),
    unit: str(doc.unit),
    unitCode: str(doc.unitCode),
    packages: packagesOf(doc.packages),
    multiplicity: num(doc.multiplicity) ?? 1,
    isCustomizable: doc.isCustomizable === true,
    minCustomQty: num(doc.minCustomQty),
    isNew: doc.isNew === true,
    isFeatured: doc.isFeatured === true,
    country: str(doc.country),
    manufacturer: str(doc.manufacturer),
    prices: pricesOf(doc.prices),
    currencyLink: currency === "USD" || currency === "EUR" ? currency : null,
    files: filesOf(doc.files),
    seoTitle: str(doc.seoTitle),
    seoDescription: str(doc.seoDescription),
    archived: isArchived(doc),
    archivedAt: iso(doc.archivedAt),
    updatedBy: typeof doc.updatedBy === "string" ? doc.updatedBy : null,
    erpSyncedAt: iso(doc.erpSyncedAt),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
    orphan: place.orphan,
    href: place.href,
    position,
    usage,
    related,
  };
}

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const products = await collection("products");
  const doc = await products.findOne({ _id: id });
  if (!doc) return null;
  const details = detailsOf(doc.details, str(doc.image));
  const relatedIds = relatedIdsOf(details);
  const [rules, usage, position, relatedDocs] = await Promise.all([
    loadStockRules(),
    productUsage(id),
    listingPosition(doc),
    relatedIds.length
      ? products
          .find(
            { _id: { $in: relatedIds } },
            { projection: { title: 1, image: 1, volume: 1, archivedAt: 1, "details.sku": 1 } },
          )
          .toArray()
      : Promise.resolve([] as ProductDoc[]),
  ]);
  const related: Record<string, RelatedProductDto> = {};
  for (const item of relatedDocs) {
    related[item._id] = {
      id: item._id,
      title: str(item.title),
      image: str(item.image),
      sku: str(record(item.details).sku),
      volume: str(item.volume),
      archived: isArchived(item),
    };
  }
  return toDetail(doc, rules, usage, related, position);
}

// The detail of a product that must exist (after a write): 404 otherwise.
export async function requireProductDetail(id: string): Promise<ProductDetail> {
  const product = await getProductDetail(id);
  if (!product) throw new HttpError(404, "not-found");
  return product;
}

// The [id] segment of a product route: an id the app could have made, or
// 404 (never a value that reaches a query unchecked).
export function productIdParam(raw: string): string {
  const parsed = zId.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, "not-found");
  return parsed.data;
}

// --- input ------------------------------------------------------------------

// Reads a JSON body against a schema. A body of the wrong shape (an unknown
// key, not an object) is "bad-request"; a value that breaks a rule is
// "fields" with a Ukrainian sentence per field path ("details.images"), so
// the editor can put it under the right input.
export async function parseInput<T>(request: Request, schema: ZodType<T>, maxBytes = 256 * 1024): Promise<T> {
  const parsed = schema.safeParse(await readJson(request, maxBytes));
  if (parsed.success) return parsed.data;
  const fields: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.filter((part): part is string => typeof part === "string");
    if (issue.code === "unrecognized_keys" || path.length === 0) throw new HttpError(400, "bad-request");
    const key = path.join(".");
    if (!fields[key]) fields[key] = issueMessage(issue as unknown as LooseIssue);
  }
  throw new HttpError(400, "fields", { fields });
}

type LooseIssue = { code: string; origin?: string; maximum?: unknown; expected?: string; message: string };

function issueMessage(issue: LooseIssue): string {
  const max = typeof issue.maximum === "number" || typeof issue.maximum === "bigint" ? String(issue.maximum) : "";
  switch (issue.code) {
    case "too_small":
      if (issue.origin === "string") return "Заповніть поле";
      if (issue.origin === "array") return "Додайте хоча б один елемент";
      return "Значення замале";
    case "too_big":
      if (issue.origin === "string") return `Не більше ${max} символів`;
      if (issue.origin === "array") return `Не більше ${max} елементів`;
      return `Не більше ${max}`;
    case "invalid_type":
      return issue.expected === "int" ? "Потрібне ціле число" : "Неправильний тип значення";
    case "invalid_format":
      return "Неправильний формат";
    case "invalid_value":
      return "Оберіть значення зі списку";
    case "custom":
      return issue.message;
    default:
      return "Перевірте значення";
  }
}

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

// A picture the storefront may put into <img src>: a path of this site
// ("/figma-export/x.jpg", "/api/media/<id>") or an https address. "//host"
// and "/\host" are other sites in disguise (a browser reads a backslash as
// a slash), so neither passes; nor does whitespace or any other scheme.
export function isPictureRef(value: string): boolean {
  if (hasControlChars(value) || /[\s\\]/.test(value)) return false;
  if (value.startsWith("/")) return value.length > 1 && !value.startsWith("//");
  if (!value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

const MEDIA_REF = /^media:[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const zPicture = z
  .string()
  .trim()
  .min(1)
  .max(LIM.url)
  .refine(isPictureRef, { message: "Вкажіть шлях сайту, що починається з «/», або адресу https://" });

const zFileRef = z
  .string()
  .trim()
  .min(1)
  .max(LIM.url)
  .refine((value) => isPictureRef(value) || MEDIA_REF.test(value), {
    message: "Вкажіть шлях сайту, адресу https:// або файл медіатеки",
  });

const zMoney = z.number().min(0).max(LIM.maxPrice).transform(round2);

// An ERP code: "" means none (stored as null, which the unique index skips).
const zErpCode = z
  .string()
  .trim()
  .max(64)
  .nullable()
  .transform((value) => (value ? value : null));

const zSpecRow = z
  .object({ label: zRequiredText(LIM.rowLabel), value: zRequiredText(LIM.rowValue) })
  .strict();
const zSpecRows = z.array(zSpecRow).max(LIM.listItems);

const DetailsInput = z
  .object({
    sku: zText(LIM.sku),
    description: zText(LIM.description),
    benefits: z.array(zRequiredText(LIM.listItem)).max(LIM.listItems),
    characteristics: zSpecRows,
    payment: zSpecRows,
    delivery: zSpecRows,
    scent: z
      .object({ intro: zText(LIM.scent), top: zText(LIM.scent), middle: zText(LIM.scent), base: zText(LIM.scent) })
      .strict(),
    images: z.array(zPicture).min(1).max(LIM.images),
    platformImages: z.array(zPicture).min(1).max(LIM.images),
    boughtTogether: z
      .array(z.object({ productId: zId, benefits: z.array(zRequiredText(200)).max(6) }).strict())
      .max(LIM.boughtTogether),
    seriesIds: z.array(zId).max(LIM.related),
    similarIds: z.array(zId).max(LIM.related),
  })
  .partial()
  .strict();

const PackageInput = z
  .object({
    id: zId,
    name: zRequiredText(60),
    coefficient: z.number().positive().max(1_000_000),
    unitCode: zText(10),
    isDefault: z.boolean(),
    externalId: z
      .string()
      .trim()
      .max(64)
      .nullable()
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .strict();

const PackagesInput = z
  .array(PackageInput)
  .max(LIM.packages)
  .refine((list) => list.filter((item) => item.isDefault).length <= 1, {
    message: "Основною може бути лише одна упаковка",
  })
  .refine((list) => new Set(list.map((item) => item.id)).size === list.length, {
    message: "Коди упаковок мають бути різними",
  });

const FileInput = z.object({ id: zId, name: zRequiredText(200), file: zFileRef }).strict();

const FilesInput = z
  .array(FileInput)
  .max(LIM.files)
  .refine((list) => new Set(list.map((item) => item.id)).size === list.length, {
    message: "Коди файлів мають бути різними",
  });

const EditableShape = z.object({
  title: zRequiredText(LIM.title),
  image: zPicture,
  volume: zRequiredText(LIM.volume),
  brand: zRequiredText(LIM.brand),
  subcategory: zRequiredText(120),
  zone: zRequiredText(120).nullable(),
  productType: zRequiredText(200).nullable(),
  price: zMoney,
  oldPrice: zMoney.nullable(),
  discount: z.number().int().min(1).max(99).nullable(),
  retailPrice: zMoney.nullable(),
  partnerPrice: zMoney.nullable(),
  available: z.boolean(),
  preorder: z.boolean(),
  fxPrice: z.boolean(),
  listed: z.boolean(),
  chips: z.array(zRequiredText(LIM.chip)).max(LIM.chips).nullable(),
  details: DetailsInput,
  externalId: zErpCode,
  barcode: zText(64),
  stockQty: z.number().min(0).max(1_000_000_000).nullable(),
  leadTimeDays: z.number().int().min(0).max(365).nullable(),
  unit: zText(20),
  unitCode: zText(10),
  packages: PackagesInput,
  multiplicity: z.number().int().min(1).max(100_000),
  isCustomizable: z.boolean(),
  minCustomQty: z.number().int().min(1).max(10_000_000).nullable(),
  isNew: z.boolean(),
  isFeatured: z.boolean(),
  country: zText(80),
  manufacturer: zText(120),
  currencyLink: z.enum(["USD", "EUR"]).nullable(),
  files: FilesInput,
  seoTitle: zText(LIM.seoTitle),
  seoDescription: zText(LIM.seoDescription),
});

export const ProductPatchSchema = EditableShape.partial().strict();

export const ProductCreateSchema = EditableShape.partial()
  .extend({
    id: zId.max(LIM.id).optional(),
    title: zRequiredText(LIM.title),
    image: zPicture,
    volume: zRequiredText(LIM.volume),
    brand: zRequiredText(LIM.brand),
    subcategory: zRequiredText(120),
  })
  .strict();

export type ProductPatch = z.infer<typeof ProductPatchSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
type DetailsPatch = NonNullable<ProductPatch["details"]>;

// Top-level fields in the order the storefront objects always had (the
// public DTO keeps the document's field order), then the staff fields.
const PUBLIC_ORDER = [
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
  "partnerPrice",
  "fxPrice",
  "preorder",
] as const;

const STAFF_ORDER = [
  "listed",
  "externalId",
  "barcode",
  "stockQty",
  "leadTimeDays",
  "unit",
  "unitCode",
  "packages",
  "multiplicity",
  "isCustomizable",
  "minCustomQty",
  "isNew",
  "isFeatured",
  "country",
  "manufacturer",
  "currencyLink",
  "files",
  "seoTitle",
  "seoDescription",
] as const;

type TopKey = (typeof PUBLIC_ORDER)[number] | (typeof STAFF_ORDER)[number];
const TOP_KEYS: readonly TopKey[] = [...PUBLIC_ORDER, ...STAFF_ORDER];

const DETAIL_KEYS = [
  "sku",
  "description",
  "benefits",
  "characteristics",
  "payment",
  "delivery",
  "scent",
  "images",
  "platformImages",
  "boughtTogether",
  "seriesIds",
  "similarIds",
] as const satisfies readonly (keyof ProductDetailsDoc)[];

// Optional public fields: null removes them from the document. The
// storefront reads a present `oldPrice` as a promo, so a cleared promo must
// not linger as a null.
const UNSET_ON_NULL = new Set<string>(["zone", "productType", "oldPrice", "discount", "retailPrice", "partnerPrice", "chips"]);

// JSON with sorted keys: tells whether a value really changed whatever the
// key order of the stored object.
function canonical(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v as Record<string, unknown>)
            .sort()
            .map((k) => [k, (v as Record<string, unknown>)[k]]),
        )
      : v,
  );
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)];
}

type Plan = { set: Record<string, unknown>; unset: string[]; changed: string[] };

// Checks a create / patch against the taxonomy and the other products and
// turns it into a MongoDB update. `current` is null for a new product.
// Throws 400 "fields" (rules) or 409 "exists" (taken article / ERP code).
async function planWrite(current: ProductDoc | null, input: ProductPatch, selfId: string): Promise<Plan> {
  const products = await collection("products");
  const cur: Partial<ProductDoc> = current ?? {};
  const fields: Record<string, string> = {};
  const touched = (key: keyof ProductPatch): boolean => input[key] !== undefined;

  // Category, then the direction's own lists.
  const subcategory = input.subcategory ?? str(cur.subcategory);
  const ref = BY_LABEL.get(subcategory);
  if ((touched("subcategory") || !current) && !ref) fields.subcategory = "Оберіть категорію зі списку";
  const checkList = (key: "zone" | "productType", allowed: readonly string[], what: string) => {
    const value = input[key] !== undefined ? input[key] : (cur[key] ?? null);
    if (value === null || value === undefined || !(touched(key) || touched("subcategory"))) return;
    if (!ref) {
      if (!fields.subcategory) fields[key] = "Спершу оберіть категорію";
    } else if (!allowed.includes(value)) {
      fields[key] = `${what} не належить до напряму «${ref.direction.title}»`;
    }
  };
  checkList("zone", ref?.direction.facet.options ?? [], "Зона");
  checkList("productType", ref?.direction.productFilters ?? [], "Тип товару");

  // A promo exists only when the old price is above the price.
  const price = input.price ?? num(cur.price) ?? 0;
  const oldPrice = input.oldPrice !== undefined ? input.oldPrice : num(cur.oldPrice);
  if ((touched("price") || touched("oldPrice")) && oldPrice !== null && oldPrice <= price) {
    fields.oldPrice = "Стара ціна має бути більшою за ціну";
  }

  if (input.listed === true) {
    if (current && isArchived(current)) fields.listed = "Товар в архіві: спершу поверніть його";
    else if (!ref && !fields.subcategory) fields.listed = "Товар без категорії каталогу не можна показати";
  }

  // Related products: real, live, not the product itself.
  const details: DetailsPatch = { ...(input.details ?? {}) };
  if (details.seriesIds) details.seriesIds = dedupe(details.seriesIds);
  if (details.similarIds) details.similarIds = dedupe(details.similarIds);
  if (details.boughtTogether) {
    const seen = new Set<string>();
    details.boughtTogether = details.boughtTogether.filter((item) => {
      if (seen.has(item.productId)) return false;
      seen.add(item.productId);
      return true;
    });
  }
  const relatedLists: [string, string[]][] = [
    ["details.boughtTogether", details.boughtTogether?.map((item) => item.productId) ?? []],
    ["details.seriesIds", details.seriesIds ?? []],
    ["details.similarIds", details.similarIds ?? []],
  ];
  const relatedIds = dedupe(relatedLists.flatMap(([, ids]) => ids));
  if (relatedIds.length) {
    const found = await products
      .find({ _id: { $in: relatedIds } }, { projection: { _id: 1, archivedAt: 1 } })
      .toArray();
    const live = new Set(found.filter((doc) => !isArchived(doc)).map((doc) => doc._id));
    const archived = new Set(found.filter((doc) => isArchived(doc)).map((doc) => doc._id));
    for (const [key, ids] of relatedLists) {
      if (ids.includes(selfId)) {
        fields[key] = "Товар не може посилатися сам на себе";
        continue;
      }
      const missing = ids.filter((id) => !live.has(id) && !archived.has(id));
      const gone = ids.filter((id) => archived.has(id));
      if (missing.length) fields[key] = `Немає таких товарів: ${missing.slice(0, 5).join(", ")}`;
      else if (gone.length) fields[key] = `Ці товари в архіві: ${gone.slice(0, 5).join(", ")}`;
    }
  }

  if (Object.keys(fields).length) throw new HttpError(400, "fields", { fields });

  // Unique article and ERP code (the ERP exchange finds products by them).
  const conflicts: Record<string, string> = {};
  const sku = details.sku;
  if (sku && sku !== str(record(cur.details).sku)) {
    const other = await products.findOne({ "details.sku": sku, _id: { $ne: selfId } }, { projection: { _id: 1 } });
    if (other) conflicts["details.sku"] = `Цей артикул уже має товар ${other._id}`;
  }
  const externalId = input.externalId;
  if (externalId && externalId !== cur.externalId) {
    const other = await products.findOne({ externalId, _id: { $ne: selfId } }, { projection: { _id: 1 } });
    if (other) conflicts.externalId = `Цей код BAS уже має товар ${other._id}`;
  }
  if (Object.keys(conflicts).length) throw new HttpError(409, "exists", { fields: conflicts });

  const set: Record<string, unknown> = {};
  const unset: string[] = [];
  const changed: string[] = [];
  for (const key of TOP_KEYS) {
    let value: unknown = input[key];
    if (value === undefined) continue;
    if (key === "chips" && Array.isArray(value) && value.length === 0) value = null;
    if (current && canonical(cur[key]) === canonical(value)) continue;
    changed.push(key);
    if (value === null && UNSET_ON_NULL.has(key)) {
      if (current && cur[key] !== undefined) unset.push(key);
    } else {
      set[key] = value;
    }
  }
  const storedDetails = record(cur.details);
  for (const key of DETAIL_KEYS) {
    const value = details[key];
    if (value === undefined) continue;
    if (current && canonical(storedDetails[key]) === canonical(value)) continue;
    changed.push(`details.${key}`);
    set[`details.${key}`] = value;
  }

  // directionSlug / categorySlug follow the label (nothing on the site
  // reads them, so they used to drift unnoticed).
  if (ref) {
    const place = placement(selfId, subcategory);
    if (cur.directionSlug !== place.directionSlug) set.directionSlug = place.directionSlug;
    if (cur.categorySlug !== place.categorySlug) set.categorySlug = place.categorySlug;
  }
  return { set, unset, changed };
}

function duplicateKeyOf(error: unknown): string | null {
  if (!(error instanceof MongoServerError) || error.code !== 11000) return null;
  const pattern = (error as unknown as { keyPattern?: Record<string, unknown> }).keyPattern ?? {};
  return Object.keys(pattern)[0] ?? "_id";
}

function conflictError(key: string): HttpError {
  if (key === "externalId") {
    return new HttpError(409, "exists", { fields: { externalId: "Цей код BAS уже має інший товар" } });
  }
  return new HttpError(409, "exists", { fields: { id: "Товар із таким кодом уже є" } });
}

async function idTaken(id: string): Promise<boolean> {
  if (RESERVED.has(id)) return true;
  const products = await collection("products");
  return (await products.countDocuments({ _id: id }, { limit: 1 })) > 0;
}

// The first free id among "<base>", "<base>-2", "<base>-3"... within the
// 60-character limit (B2B order lines are "<id>-<n>" and must stay ids).
async function freeId(raw: string): Promise<string> {
  const base = (slugify(raw, LIM.id) || "product").replace(/-+$/, "");
  if (!(await idTaken(base))) return base;
  for (let n = 2; n < 200; n += 1) {
    const suffix = `-${n}`;
    const id = `${base.slice(0, LIM.id - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!(await idTaken(id))) return id;
  }
  throw new HttpError(409, "exists", { fields: { id: "Не вдалося підібрати вільний код товару" } });
}

async function nextSort(): Promise<number> {
  const products = await collection("products");
  const [last] = await products.find({}, { projection: { sort: 1 } }).sort({ sort: -1 }).limit(1).toArray();
  const max = num(last?.sort);
  return max === null ? 0 : Math.floor(max) + 1;
}

const EMPTY_DETAILS = (image: string): ProductDetailsDoc => ({
  sku: "",
  description: "",
  benefits: [],
  characteristics: [],
  payment: [],
  delivery: [],
  scent: { intro: "", top: "", middle: "", base: "" },
  images: [image],
  platformImages: [image],
  boughtTogether: [],
  seriesIds: [],
  similarIds: [],
});

function buildNewDoc(id: string, set: Record<string, unknown>, sort: number, staffId: string): ProductDoc {
  const image = str(set.image);
  const details: Record<string, unknown> = { ...EMPTY_DETAILS(image) };
  for (const [key, value] of Object.entries(set)) {
    if (key.startsWith("details.")) details[key.slice("details.".length)] = value;
  }
  const now = new Date();
  const doc: Record<string, unknown> = { _id: id };
  for (const key of PUBLIC_ORDER) {
    if (set[key] !== undefined && set[key] !== null) doc[key] = set[key];
    else if (key === "price") doc.price = 0;
    else if (key === "available") doc.available = true;
  }
  doc.sort = sort;
  doc.listed = set.listed === true;
  doc.directionSlug = set.directionSlug;
  doc.categorySlug = set.categorySlug;
  doc.details = details;
  for (const key of STAFF_ORDER) {
    if (key !== "listed" && set[key] !== undefined) doc[key] = set[key];
  }
  doc.updatedBy = staffId;
  doc.createdAt = now;
  doc.updatedAt = now;
  return doc as unknown as ProductDoc;
}

export async function createProduct(input: ProductCreate, staffId: string): Promise<ProductDoc> {
  const { id: askedId, ...rest } = input;
  if (askedId) {
    if (RESERVED.has(askedId)) {
      throw new HttpError(400, "fields", { fields: { id: "Цей код зарезервований, оберіть інший" } });
    }
    if (await idTaken(askedId)) throw conflictError("_id");
  }
  let id = askedId ?? (await freeId(input.title));
  const plan = await planWrite(null, rest, id);
  const doc = buildNewDoc(id, plan.set, await nextSort(), staffId);
  const products = await collection("products");
  for (let attempt = 0; ; attempt += 1) {
    try {
      await products.insertOne(doc);
      return doc;
    } catch (error) {
      const key = duplicateKeyOf(error);
      if (key === null) throw error;
      // Another request took the derived id meanwhile: take the next one.
      if (key === "_id" && !askedId && attempt < 3) {
        id = await freeId(input.title);
        doc._id = id;
        continue;
      }
      throw conflictError(key);
    }
  }
}

export async function patchProduct(
  id: string,
  input: ProductPatch,
  staffId: string,
): Promise<{ doc: ProductDoc; changed: string[] }> {
  const products = await collection("products");
  const current = await products.findOne({ _id: id });
  if (!current) throw new HttpError(404, "not-found");
  const plan = await planWrite(current, input, id);
  if (plan.changed.length === 0) return { doc: current, changed: [] };
  const update = {
    $set: { ...plan.set, updatedAt: new Date(), updatedBy: staffId },
    $unset: { seed: "", ...Object.fromEntries(plan.unset.map((key) => [key, ""])) },
  } as UpdateFilter<ProductDoc>;
  try {
    const doc = await products.findOneAndUpdate({ _id: id }, update, { returnDocument: "after" });
    if (!doc) throw new HttpError(404, "not-found");
    return { doc, changed: plan.changed };
  } catch (error) {
    const key = duplicateKeyOf(error);
    if (key === null) throw error;
    throw conflictError(key);
  }
}

// A copy to start a similar product from: unlisted, last in the order,
// without what identifies the original item in the ERP and the warehouse
// (article, ERP code, barcode, stock, ERP prices).
export async function duplicateProduct(id: string, staffId: string): Promise<ProductDoc> {
  const products = await collection("products");
  const source = await products.findOne({ _id: id });
  if (!source) throw new HttpError(404, "not-found");
  // The expected delivery belongs to the original's stock, like stockQty.
  const dropped = new Set(["_id", "seed", "archivedAt", "erpSyncedAt", "prices", "stockQty", "expectedDate", "createdAt", "updatedAt", "updatedBy"]);
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) if (!dropped.has(key)) copy[key] = value;
  const now = new Date();
  const base = `${id.slice(0, LIM.id - "-copy".length)}-copy`;
  const doc = {
    _id: await freeId(base),
    ...copy,
    title: `${str(source.title)} (копія)`.slice(0, LIM.title),
    sort: await nextSort(),
    listed: false,
    externalId: null,
    barcode: "",
    details: { ...detailsOf(source.details, str(source.image)), sku: "" },
    updatedBy: staffId,
    createdAt: now,
    updatedAt: now,
  } as unknown as ProductDoc;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await products.insertOne(doc);
      return doc;
    } catch (error) {
      if (duplicateKeyOf(error) !== "_id" || attempt >= 3) throw error;
      doc._id = await freeId(base);
    }
  }
}

// Archive: out of the shop (no listing, no page: the public snapshot skips
// archived products), kept for the orders that name it. Restore brings the
// page back but leaves the product unlisted until staff list it.
export async function setArchived(id: string, archived: boolean, staffId: string): Promise<ProductDoc> {
  const products = await collection("products");
  const now = new Date();
  const doc = await products.findOneAndUpdate(
    { _id: id, ...(archived ? LIVE : ARCHIVED) },
    {
      $set: archived
        ? { archivedAt: now, listed: false, updatedAt: now, updatedBy: staffId }
        : { archivedAt: null, updatedAt: now, updatedBy: staffId },
      $unset: { seed: "" },
    },
    { returnDocument: "after" },
  );
  if (doc) return doc;
  if (!(await products.findOne({ _id: id }, { projection: { _id: 1 } }))) throw new HttpError(404, "not-found");
  throw new HttpError(409, "state", { archived: !archived });
}

// Removes a product for good: only an archived one no order names (orders
// keep a snapshot of their lines, but "repeat the order" and the ERP
// exchange still look the product up by id).
export async function deleteProduct(id: string): Promise<{ doc: ProductDoc; usage: ProductUsage }> {
  const products = await collection("products");
  const doc = await products.findOne({ _id: id });
  if (!doc) throw new HttpError(404, "not-found");
  const usage = await productUsage(id);
  if (usage.orders > 0) throw new HttpError(409, "in-use", { usage });
  if (!isArchived(doc)) throw new HttpError(409, "state", { archived: false });
  const result = await products.deleteOne({ _id: id, ...ARCHIVED });
  if (result.deletedCount === 0) throw new HttpError(409, "state", { archived: false });
  // Other products' related lists would keep a dead id (the site skips it,
  // the editor would show it as missing). The seed flag stays on purpose:
  // a reseed restores seeded products whole anyway, dead ids included.
  await products.updateMany(
    { $or: [{ "details.seriesIds": id }, { "details.similarIds": id }, { "details.boughtTogether.productId": id }] },
    {
      $pull: { "details.seriesIds": id, "details.similarIds": id, "details.boughtTogether": { productId: id } },
      $set: { updatedAt: new Date() },
    } as unknown as UpdateFilter<ProductDoc>,
  );
  return { doc, usage };
}

// --- bulk and order -----------------------------------------------------------

export type BulkResult = { matched: number; changed: number; skipped: string[]; missing: string[] };

export async function bulkProducts(ids: string[], action: ProductBulkAction, staffId: string): Promise<BulkResult> {
  const products = await collection("products");
  const unique = dedupe(ids);
  const docs = await products
    .find({ _id: { $in: unique } }, { projection: { _id: 1, subcategory: 1, archivedAt: 1 } })
    .toArray();
  const found = new Set(docs.map((doc) => doc._id));
  const missing = unique.filter((id) => !found.has(id));
  const skipped: string[] = [];
  let targets = docs.map((doc) => doc._id);
  // Only a live product with a real category can be listed.
  if (action === "list") {
    targets = [];
    for (const doc of docs) {
      if (isArchived(doc) || !BY_LABEL.has(str(doc.subcategory))) skipped.push(doc._id);
      else targets.push(doc._id);
    }
  }
  const now = new Date();
  const stamp = { updatedAt: now, updatedBy: staffId };
  const plan: Record<ProductBulkAction, { filter: Filter<ProductDoc>; set: Record<string, unknown> }> = {
    list: { filter: { listed: { $ne: true } }, set: { listed: true } },
    unlist: { filter: { listed: { $ne: false } }, set: { listed: false } },
    available: { filter: { available: { $ne: true } }, set: { available: true } },
    unavailable: { filter: { available: { $ne: false } }, set: { available: false } },
    archive: { filter: LIVE, set: { archivedAt: now, listed: false } },
    restore: { filter: ARCHIVED, set: { archivedAt: null } },
  };
  let changed = 0;
  if (targets.length) {
    const step = plan[action];
    const result = await products.updateMany(
      { _id: { $in: targets }, ...step.filter },
      { $set: { ...step.set, ...stamp }, $unset: { seed: "" } } as UpdateFilter<ProductDoc>,
    );
    changed = result.modifiedCount;
  }
  return { matched: docs.length, changed, skipped, missing };
}

// Moves `id` right before `beforeId` (null = to the end) in the listing
// order ("за популярністю" = sort ascending, ties by id). The products in
// between keep their own sort values, shifted by one place, so only that
// range is rewritten; when those values cannot be reused as they are (ties
// or fractions left by hand edits) the whole order is renumbered 0..n-1.
export async function reorderProduct(
  id: string,
  beforeId: string | null,
  staffId: string,
): Promise<{ moved: boolean; sort: number; rewritten: number; title: string }> {
  const products = await collection("products");
  const all = await products
    .find({}, { projection: { _id: 1, sort: 1, title: 1 } })
    .sort({ sort: 1, _id: 1 })
    .toArray();
  const from = all.findIndex((doc) => doc._id === id);
  if (from < 0) throw new HttpError(404, "not-found");
  if (beforeId !== null && !all.some((doc) => doc._id === beforeId)) {
    throw new HttpError(404, "not-found", { field: "beforeId" });
  }
  const currentSort = num(all[from].sort) ?? 0;
  const title = str(all[from].title);
  if (beforeId === id) return { moved: false, sort: currentSort, rewritten: 0, title };

  const order = all.map((doc) => doc._id);
  order.splice(from, 1);
  const to = beforeId === null ? order.length : order.indexOf(beforeId);
  order.splice(to, 0, id);
  if (to === from) return { moved: false, sort: currentSort, rewritten: 0, title };

  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const slots = all.slice(lo, hi + 1).map((doc) => doc.sort);
  const before = lo > 0 ? all[lo - 1].sort : -Infinity;
  const after = hi + 1 < all.length ? all[hi + 1].sort : Infinity;
  const reusable =
    slots.every((value, i) => Number.isInteger(value) && (i === 0 ? value > before : value > slots[i - 1])) &&
    slots[slots.length - 1] < after;

  const target = new Map<string, number>();
  if (reusable) for (let i = lo; i <= hi; i += 1) target.set(order[i], slots[i - lo]);
  else order.forEach((productId, i) => target.set(productId, i));

  const stored = new Map(all.map((doc) => [doc._id, doc.sort]));
  const now = new Date();
  const ops: AnyBulkWriteOperation<ProductDoc>[] = [];
  for (const [productId, sort] of target) {
    if (stored.get(productId) === sort) continue;
    ops.push({
      updateOne: {
        filter: { _id: productId },
        update: { $set: { sort, updatedAt: now, updatedBy: staffId }, $unset: { seed: "" } },
      },
    });
  }
  if (ops.length) await products.bulkWrite(ops, { ordered: false });
  return { moved: true, sort: target.get(id) ?? currentSort, rewritten: ops.length, title };
}

// --- taxonomy -------------------------------------------------------------------

export async function taxonomyView(): Promise<Omit<TaxonomyAnswer, "ok">> {
  const products = await collection("products");
  const [docs, catalog, shop] = await Promise.all([
    products
      .find(
        {},
        {
          projection: {
            title: 1,
            subcategory: 1,
            listed: 1,
            available: 1,
            archivedAt: 1,
            brand: 1,
            manufacturer: 1,
            country: 1,
          },
        },
      )
      .sort({ sort: 1, _id: 1 })
      .toArray(),
    getSettings("catalog"),
    getSettings("shop"),
  ]);

  const counts = new Map<string, CategoryCounts>();
  const brandCounts = new Map<string, number>();
  // Makers and countries live products carry, so the screen can show
  // which values are already in use next to the lists staff add.
  const makerCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const tally = (map: Map<string, number>, value: unknown) => {
    const name = str(value).trim();
    if (name) map.set(name, (map.get(name) ?? 0) + 1);
  };
  const inUse = (map: Map<string, number>) =>
    [...map].map(([name, products]) => ({ name, products })).sort((a, b) => byUkrainian(a.name, b.name));
  const orphans: TaxonomyAnswer["orphans"] = [];
  let archivedTotal = 0;
  for (const doc of docs) {
    const label = str(doc.subcategory);
    const archived = isArchived(doc);
    const c = counts.get(label) ?? { listed: 0, unlisted: 0, archived: 0, unavailable: 0 };
    if (archived) {
      c.archived += 1;
      archivedTotal += 1;
    } else {
      if (doc.listed !== false) c.listed += 1;
      else c.unlisted += 1;
      if (doc.available !== true) c.unavailable += 1;
      const brand = str(doc.brand).trim();
      if (brand) brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
      tally(makerCounts, doc.manufacturer);
      tally(countryCounts, doc.country);
    }
    counts.set(label, c);
    if (!BY_LABEL.has(label)) orphans.push({ id: doc._id, title: str(doc.title), subcategory: label, archived });
  }

  const codeBrands = new Set<string>(BRANDS);
  const settingsBrands = new Set(catalog.brands);
  const brands = union([...codeBrands], catalog.brands, [...brandCounts.keys()]).map((name) => ({
    name,
    products: brandCounts.get(name) ?? 0,
    inCode: codeBrands.has(name),
    inSettings: settingsBrands.has(name),
  }));

  return {
    directions: CATALOG_DIRECTIONS.map((direction) => ({
      slug: direction.slug,
      title: direction.title,
      tagline: direction.tagline,
      href: directionCatalogHref(direction),
      facetTitle: direction.facet.title,
      zones: [...direction.facet.options],
      productTypes: [...direction.productFilters],
      categories: direction.carousel.map((card) => {
        const key = `${direction.slug}/${card.slug}`;
        // A card whose label an earlier card owns gets no products.
        const owns = BY_LABEL.get(card.label)?.key === key;
        const meta = catalog.categories[key];
        return {
          slug: card.slug,
          label: card.label,
          key,
          href: categoryHref(direction, card),
          products: (owns ? counts.get(card.label) : undefined) ?? { listed: 0, unlisted: 0, archived: 0, unavailable: 0 },
          meta: meta
            ? { externalId: meta.externalId, stockThreshold: meta.stockThreshold, note: meta.note }
            : { ...EMPTY_CATEGORY_META },
        };
      }),
    })),
    brands,
    manufacturers: [...catalog.manufacturers],
    countries: [...catalog.countries],
    manufacturersInUse: inUse(makerCounts),
    countriesInUse: inUse(countryCounts),
    orphans,
    shopStockThreshold: shop.stockThreshold,
    totals: { products: docs.length, live: docs.length - archivedTotal, archived: archivedTotal },
  };
}

const zCategoryMeta = z
  .object({
    externalId: zErpCode,
    stockThreshold: z.number().int().min(0).max(100_000).nullable(),
    note: zText(300),
  })
  .strict();

export const TaxonomyMetaSchema = z
  .object({
    categories: z
      .record(z.string().max(120), zCategoryMeta)
      .refine((value) => Object.keys(value).length <= 200, { message: "Забагато категорій" }),
    brands: z.array(zRequiredText(80)).max(300).optional(),
    manufacturers: z.array(zRequiredText(120)).max(300).optional(),
    countries: z.array(zRequiredText(80)).max(300).optional(),
  })
  .strict();

export type TaxonomyMeta = z.infer<typeof TaxonomyMetaSchema>;

const sameList = (a: string[], b: string[]): boolean => canonical(a) === canonical(b);

// Stores the staff metadata of the taxonomy. Returns what changed, for the
// journal.
export async function saveTaxonomyMeta(
  input: TaxonomyMeta,
  staffId: string,
): Promise<{ categories: number; changed: string[] }> {
  const unknown = Object.keys(input.categories).filter((key) => !BY_KEY.has(key));
  if (unknown.length) {
    throw new HttpError(400, "fields", {
      fields: Object.fromEntries(unknown.map((key) => [`categories.${key}`, "Такої категорії немає в каталозі"])),
    });
  }
  const current = await getSettings("catalog");
  // An all-empty meta is the same as none: keep the stored map small.
  const categories = Object.fromEntries(
    Object.entries(input.categories).filter(
      ([, meta]) => meta.externalId !== null || meta.stockThreshold !== null || meta.note !== "",
    ),
  );
  const clean = (list: string[] | undefined, fallback: string[]): string[] =>
    list ? [...new Set(list.map((value) => value.trim()))] : fallback;
  const next = {
    ...current,
    categories,
    brands: clean(input.brands, current.brands),
    manufacturers: clean(input.manufacturers, current.manufacturers),
    countries: clean(input.countries, current.countries),
  };
  const changed: string[] = [];
  if (canonical(current.categories) !== canonical(categories)) changed.push("categories");
  if (!sameList(current.brands, next.brands)) changed.push("brands");
  if (!sameList(current.manufacturers, next.manufacturers)) changed.push("manufacturers");
  if (!sameList(current.countries, next.countries)) changed.push("countries");
  if (changed.length) await saveSettings("catalog", next, staffId);
  return { categories: Object.keys(categories).length, changed };
}
