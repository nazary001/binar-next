// The contract of the catalog reference routes of the staff area: the
// taxonomy view (/api/admin/taxonomy) and the price types
// (/api/admin/price-types). Shared by the routes, the panel's repositories
// and the screens of /admin/categories and /admin/pricing. Types and plain
// constants only: no "use client", no server import.
//
// Routes (permission in brackets):
//   GET    /taxonomy              [catalog.view]  TaxonomyAnswer
//   PUT    /taxonomy/meta         [catalog.edit]  TaxonomyMetaInput -> TaxonomyAnswer
//   GET    /price-types           [catalog.view]  PriceTypeListAnswer (?q=, ?sort=name|createdAt)
//   POST   /price-types           [catalog.edit]  PriceTypeCreateInput -> 201 PriceTypeAnswer
//   PATCH  /price-types/<id>      [catalog.edit]  PriceTypePatchInput -> PriceTypeAnswer
//   DELETE /price-types/<id>      [catalog.edit]  -> { ok, id, pricesRemoved }
//
// Refusals: 400 "bad-request" / "fields", 404 "not-found", 409 "exists"
// (name or ERP code taken, { fields }), 409 "in-use" (a buyer group or a
// contract uses the price type, { usedBy: PriceTypeUsage }).

// --- taxonomy ---------------------------------------------------------------
//
// Directions and categories live in code (src/components/catalog/data.ts):
// adding or renaming one needs a deploy. A product links to its category by
// the category's LABEL. What staff keep next to a category is its meta,
// stored in the "catalog" settings group under "<direction>/<category>".

export type CategoryMeta = {
  // The product group of the ERP the category corresponds to.
  externalId: string | null;
  // Its own "traffic light" threshold; null = the shop setting.
  stockThreshold: number | null;
  note: string;
};

export const EMPTY_CATEGORY_META: CategoryMeta = { externalId: null, stockThreshold: null, note: "" };

// Products of one category. Archived ones count only as `archived`;
// `unavailable` counts live products marked "not available".
export type CategoryCounts = { listed: number; unlisted: number; archived: number; unavailable: number };

export type TaxonomyCategory = {
  slug: string;
  label: string;
  // "<direction>/<category>": the key of the meta, of buyer groups'
  // hidden categories, of the URL.
  key: string;
  // Storefront path of the category page.
  href: string;
  products: CategoryCounts;
  meta: CategoryMeta;
};

export type TaxonomyDirection = {
  slug: string;
  title: string;
  tagline: string;
  href: string;
  facetTitle: string;
  zones: string[];
  productTypes: string[];
  categories: TaxonomyCategory[];
};

export type BrandCount = {
  name: string;
  // Live products of the brand (archived ones excluded).
  products: number;
  // Offered by the storefront's "Виробник" filter (BRANDS in code).
  inCode: boolean;
  // Added by staff in the taxonomy meta (catalog settings).
  inSettings: boolean;
};

// A product whose category label matches no card: the storefront files it
// under the fallback address and leaves it out of every direction and
// category page.
export type TaxonomyOrphan = { id: string; title: string; subcategory: string; archived: boolean };

// A value live products carry (a maker, a country) and how many carry it.
export type ValueCount = { name: string; products: number };

export type TaxonomyAnswer = {
  ok: true;
  directions: TaxonomyDirection[];
  brands: BrandCount[];
  // The extra makers and countries staff added (catalog settings).
  manufacturers: string[];
  countries: string[];
  // The makers and countries live products already carry, with counts
  // (the product editor offers these too), sorted by name.
  manufacturersInUse: ValueCount[];
  countriesInUse: ValueCount[];
  orphans: TaxonomyOrphan[];
  // The shop's own threshold (settings shop.stockThreshold), for the hint
  // next to a category without its own.
  shopStockThreshold: number;
  totals: { products: number; live: number; archived: number };
};

// PUT /taxonomy/meta. `categories` replaces the stored map whole (a key
// left out loses its meta); keys must be existing "<direction>/<category>"
// pairs, and an ERP group code may stand on one category only (codes.ts:
// 400 "fields" under "categories.<key>.externalId" otherwise). The three
// lists replace the stored ones when given.
export type TaxonomyMetaInput = {
  categories: Record<string, CategoryMeta>;
  brands?: string[];
  manufacturers?: string[];
  countries?: string[];
};

// --- price types --------------------------------------------------------------

export type PriceTypeRole = "base" | "individual";

export const PRICE_TYPE_ROLES: { value: PriceTypeRole; label: string; hint: string }[] = [
  { value: "base", label: "Базова", hint: "Ціни, які бачать гості та покупці без договору." },
  {
    value: "individual",
    label: "Індивідуальна",
    hint: "Прайс партнерів, від якого рахується знижка за договором.",
  },
];

export type PriceTypeUsage = {
  // Buyer groups whose price type it is.
  groups: { id: string; name: string }[];
  // Contracts of partner companies that name it (counterparty contracts).
  contracts: number;
};

export type PriceTypeDto = {
  id: string;
  name: string;
  externalId: string | null;
  currency: string;
  vatIncluded: boolean;
  role: PriceTypeRole | null;
  // Products that carry a price of this type (products.prices[<id>]).
  productsCount: number;
  usedBy: PriceTypeUsage;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PriceTypeListAnswer = {
  ok: true;
  items: PriceTypeDto[];
  total: number;
  page: number;
  limit: number;
};

// Assigning a role takes it away from the type that held it: at most one
// type per role. `roleTakenFrom` names that type.
export type PriceTypeAnswer = {
  ok: true;
  priceType: PriceTypeDto;
  roleTakenFrom: { id: string; name: string } | null;
};

export type PriceTypeCreateInput = {
  name: string;
  externalId?: string | null;
  // ISO 4217, three capital letters. Default "UAH".
  currency?: string;
  // Default true.
  vatIncluded?: boolean;
  role?: PriceTypeRole | null;
};

export type PriceTypePatchInput = Partial<PriceTypeCreateInput>;

export const PRICE_TYPE_LIMITS = { name: 80, externalId: 64 } as const;

// Limits of a category's meta (TaxonomyMetaSchema) and of one entry of the
// brand / maker / country lists, for the inputs of /admin/categories.
export const CATEGORY_META_LIMITS = { externalId: 64, note: 300, stockThreshold: 100_000 } as const;
export const REFERENCE_LIST_LIMITS = { brands: 80, manufacturers: 120, countries: 80, items: 300 } as const;

export const CATALOG_ERRORS: Record<string, string> = {
  "in-use": "Тип цін використовується: його обрано в групі покупців або в договорі компанії. Спершу змініть їх.",
  exists: "Тип цін із такою назвою або кодом BAS уже є.",
};
