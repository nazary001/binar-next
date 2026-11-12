// The contract of the products API of the staff area (/api/admin/products/*):
// what the routes answer and accept. Shared by the routes, the panel's
// repository (src/server/admin/repos/products.ts) and the screens of
// /admin/products. Types and plain constants only: no "use client", no
// server import, so both sides can read it.
//
// Routes (permission in brackets):
//   GET    /products                  [catalog.view]  ProductListAnswer  (filters: ProductListFilters)
//   GET    /products/options          [catalog.view]  ProductOptionsAnswer
//   GET    /products/export           [catalog.view]  text/csv of the filtered list (same filters, no paging)
//   POST   /products                  [catalog.edit]  ProductCreateInput -> 201 ProductAnswer
//   GET    /products/<id>             [catalog.view]  ProductAnswer
//   PATCH  /products/<id>             [catalog.edit]  ProductPatchInput -> ProductAnswer & { changed }
//   DELETE /products/<id>             [catalog.edit]  -> { ok, id }   (archived and in no order only)
//   POST   /products/<id>/duplicate   [catalog.edit]  -> 201 ProductAnswer (id "<id>-copy", unlisted)
//   POST   /products/<id>/archive     [catalog.edit]  -> ProductAnswer
//   POST   /products/<id>/restore     [catalog.edit]  -> ProductAnswer (stays unlisted)
//   POST   /products/bulk             [catalog.edit]  ProductBulkInput -> ProductBulkAnswer
//   POST   /products/reorder          [catalog.edit]  ProductReorderInput -> ProductReorderAnswer
//
// Refusals: { ok: false, error, ...extra } with
//   400 "bad-request"  a body of the wrong shape (unknown key, wrong type)
//   400 "fields"       { fields: { "<field path>": "<Ukrainian sentence>" } }; a path
//                      names the field without array positions ("details.images",
//                      "packages.name", "files.file"), a key of PRODUCT_FIELD_LABELS
//                      or a sub-field of one
//   404 "not-found"    no such product (or a related id in reorder)
//   409 "exists"       the id, the article or the ERP code is taken ({ fields })
//   409 "state"        archive of an archived product, restore of a live one,
//                      delete of a product that is not archived
//   409 "in-use"       delete of a product orders reference ({ usage: ProductUsage })

// --- list -------------------------------------------------------------------

// The "traffic light" of a product's stock: stockQty against the threshold
// of its category (taxonomy meta) or of the shop (settings shop.stockThreshold).
//   in       stockQty > 0 and >= threshold
//   low      0 < stockQty < threshold
//   out      stockQty <= 0
//   unknown  no stock figure (the ERP never sent one)
export type StockState = "in" | "low" | "out" | "unknown";

export const STOCK_STATES: { value: StockState; label: string }[] = [
  { value: "in", label: "Є в наявності" },
  { value: "low", label: "Закінчується" },
  { value: "out", label: "Немає на складі" },
  { value: "unknown", label: "Залишок невідомий" },
];

export const PRODUCT_SORT_FIELDS = ["sort", "title", "price", "updatedAt", "stockQty"] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

// Query string of GET /products and GET /products/export. Booleans are
// "true" / "false" (or "1" / "0"); absent = no filter.
export type ProductListFilters = {
  // Title, article (details.sku), id or brand contains the text.
  q?: string;
  // A direction slug ("hotels" | "protect" | "cleaning").
  direction?: string;
  // A category slug; with `direction` it names one card, without it every
  // card of that slug ("inshi-tovary" exists in two directions).
  category?: string;
  // Exact brand.
  brand?: string;
  listed?: boolean;
  available?: boolean;
  preorder?: boolean;
  // Has an old price (a promo).
  promo?: boolean;
  // false (default) = only live products, true = only archived ones,
  // "all" = both.
  archived?: boolean | "all";
  stock?: StockState;
  // true = only products whose category matches no card of the taxonomy.
  orphan?: boolean;
  // A ProductSortField, "-" in front for descending. Default "sort".
  sort?: string;
  page?: number;
  limit?: number;
};

export type ProductRow = {
  id: string;
  title: string;
  image: string;
  // details.sku ("" when none).
  sku: string;
  brand: string;
  volume: string;
  // The category label (a carousel card label).
  subcategory: string;
  // Where the storefront files it (derived from the label, the same rule as
  // the product URL; for an orphan, the fallback card).
  directionSlug: string;
  categorySlug: string;
  price: number;
  oldPrice: number | null;
  partnerPrice: number | null;
  available: boolean;
  preorder: boolean;
  listed: boolean;
  stockQty: number | null;
  stock: StockState;
  // The day (YYYY-MM-DD) the accounting system expects the next delivery,
  // when it said so; null otherwise.
  expectedDate: string | null;
  sort: number;
  updatedAt: string | null;
  archived: boolean;
  // The category label matches no card: the storefront shows it only in the
  // root listing, under the fallback address.
  orphan: boolean;
  // Storefront path of the product page (/catalog/<direction>/<category>/<id>).
  href: string;
  // The document is owned by the seed (npm run db:seed would overwrite it);
  // the first staff edit detaches it.
  seed: boolean;
};

export type ProductListAnswer = {
  ok: true;
  items: ProductRow[];
  total: number;
  page: number;
  limit: number;
};

// --- one product ------------------------------------------------------------

export type SpecRowDto = { label: string; value: string };

export type ScentDto = { intro: string; top: string; middle: string; base: string };

export type BoughtTogetherDto = { productId: string; benefits: string[] };

export type ProductDetailsDto = {
  sku: string;
  description: string;
  benefits: string[];
  characteristics: SpecRowDto[];
  payment: SpecRowDto[];
  delivery: SpecRowDto[];
  scent: ScentDto;
  images: string[];
  platformImages: string[];
  boughtTogether: BoughtTogetherDto[];
  seriesIds: string[];
  similarIds: string[];
};

export type ProductPackageDto = {
  id: string;
  name: string;
  coefficient: number;
  unitCode: string;
  isDefault: boolean;
  externalId: string | null;
};

// A certificate or another file of a product. `file` is a site path
// ("/docs/x.pdf"), an https URL or a media reference ("media:<id>").
export type ProductFileDto = { id: string; name: string; file: string };

export type CurrencyLink = "USD" | "EUR";

export const CURRENCY_LINKS: CurrencyLink[] = ["USD", "EUR"];

export type ProductUsage = {
  // Orders (either channel) with a line of this product.
  orders: number;
  // Partners' assortments that hold it.
  assortments: number;
  // Saved carts of signed-in customers that hold it.
  carts: number;
};

// A product named by this one (bought together, series, similar), for the
// editor's chips.
export type RelatedProductDto = {
  id: string;
  title: string;
  image: string;
  sku: string;
  volume: string;
  archived: boolean;
};

export type ProductDetail = {
  id: string;
  title: string;
  image: string;
  volume: string;
  brand: string;
  subcategory: string;
  zone: string | null;
  productType: string | null;
  price: number;
  oldPrice: number | null;
  discount: number | null;
  available: boolean;
  chips: string[] | null;
  retailPrice: number | null;
  partnerPrice: number | null;
  fxPrice: boolean;
  preorder: boolean;
  sort: number;
  listed: boolean;
  // As stored (written from the category on every save).
  directionSlug: string;
  categorySlug: string;
  // The page content, as the storefront reads it (an empty gallery falls
  // back to the card photo, as on the site).
  details: ProductDetailsDto;
  // Staff and ERP fields.
  externalId: string | null;
  barcode: string;
  stockQty: number | null;
  stock: StockState;
  leadTimeDays: number | null;
  // The day (YYYY-MM-DD) the accounting system expects the next delivery;
  // written by the exchange only (read-only in the panel).
  expectedDate: string | null;
  unit: string;
  unitCode: string;
  packages: ProductPackageDto[];
  multiplicity: number;
  isCustomizable: boolean;
  minCustomQty: number | null;
  isNew: boolean;
  isFeatured: boolean;
  country: string;
  manufacturer: string;
  // Price per price type (price_types id -> UAH), as the ERP sent it.
  // Read-only in the panel.
  prices: Record<string, number>;
  currencyLink: CurrencyLink | null;
  files: ProductFileDto[];
  seoTitle: string;
  seoDescription: string;
  archived: boolean;
  archivedAt: string | null;
  updatedBy: string | null;
  erpSyncedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  orphan: boolean;
  href: string;
  // Where the storefront lists it in the default order ("за популярністю"):
  // its place among the listed live products and how many there are. null
  // when it appears in no listing (unlisted or archived).
  position: { place: number; total: number } | null;
  usage: ProductUsage;
  // Every related id of `details` that exists, by id. An id missing here
  // names a product that no longer exists (the storefront skips it).
  related: Record<string, RelatedProductDto>;
};

export type ProductAnswer = { ok: true; product: ProductDetail };

// PATCH answer: which fields the request actually changed (field paths of
// ProductPatchInput, "details.images" for page content).
export type ProductPatchAnswer = ProductAnswer & { changed: string[] };

// --- writes -----------------------------------------------------------------

// Every field staff may change. In PATCH all are optional; `null` removes
// an optional value (oldPrice: null ends a promo).
// Rules the server enforces (400 "fields" otherwise):
// - subcategory is one of the carousel labels (GET /products/options);
//   zone / productType belong to that category's direction;
// - prices >= 0, rounded to 2 decimals; oldPrice > price; discount 1-99;
// - images (card, gallery) are a site path ("/x.jpg", not "//") or an
//   https URL; galleries hold 1-12 pictures;
// - related ids exist, are not archived and are not the product itself;
// - the article and the ERP code are unique (409 "exists").
export type ProductEditable = {
  title: string;
  image: string;
  volume: string;
  brand: string;
  subcategory: string;
  zone: string | null;
  productType: string | null;
  price: number;
  oldPrice: number | null;
  discount: number | null;
  retailPrice: number | null;
  partnerPrice: number | null;
  available: boolean;
  preorder: boolean;
  fxPrice: boolean;
  listed: boolean;
  chips: string[] | null;
  details: Partial<{
    sku: string;
    description: string;
    benefits: string[];
    characteristics: SpecRowDto[];
    payment: SpecRowDto[];
    delivery: SpecRowDto[];
    scent: ScentDto;
    images: string[];
    platformImages: string[];
    boughtTogether: BoughtTogetherDto[];
    seriesIds: string[];
    similarIds: string[];
  }>;
  externalId: string | null;
  barcode: string;
  stockQty: number | null;
  leadTimeDays: number | null;
  unit: string;
  unitCode: string;
  packages: ProductPackageDto[];
  multiplicity: number;
  isCustomizable: boolean;
  minCustomQty: number | null;
  isNew: boolean;
  isFeatured: boolean;
  country: string;
  manufacturer: string;
  currencyLink: CurrencyLink | null;
  files: ProductFileDto[];
  seoTitle: string;
  seoDescription: string;
};

export type ProductPatchInput = Partial<ProductEditable>;

// POST /products. `id` is optional: without it the server derives one from
// the title (transliterated, made unique with "-2", "-3"...). A new product
// is unlisted (unless `listed` says otherwise), available, sorted last, with
// empty page content and the card photo as its gallery.
export type ProductCreateInput = Partial<ProductEditable> & {
  id?: string;
  title: string;
  image: string;
  volume: string;
  brand: string;
  subcategory: string;
};

export const PRODUCT_BULK_ACTIONS = [
  { value: "list", label: "Показати в каталозі" },
  { value: "unlist", label: "Сховати з каталогу" },
  { value: "available", label: "Позначити: є в наявності" },
  { value: "unavailable", label: "Позначити: немає в наявності" },
  { value: "archive", label: "Перенести в архів" },
  { value: "restore", label: "Повернути з архіву" },
] as const;

export type ProductBulkAction = (typeof PRODUCT_BULK_ACTIONS)[number]["value"];

export type ProductBulkInput = { ids: string[]; action: ProductBulkAction };

// matched = ids that exist; changed = documents written; skipped = existing
// products the action does not apply to (an archived one cannot be listed,
// an orphan cannot be listed, a live one cannot be restored...).
export type ProductBulkAnswer = { ok: true; matched: number; changed: number; skipped: string[]; missing: string[] };

// Moves `id` right before `beforeId` in the listing order (null = to the
// end). Sort values of the range in between are rewritten (integers).
export type ProductReorderInput = { id: string; beforeId: string | null };

export type ProductReorderAnswer = { ok: true; moved: boolean; sort: number; rewritten: number };

// --- editor vocabulary -------------------------------------------------------

export type ProductOptionsDirection = {
  slug: string;
  title: string;
  // The heading of the direction's zone facet ("Готельні зони").
  facetTitle: string;
  categories: { slug: string; label: string }[];
  zones: string[];
  productTypes: string[];
};

export type ProductOptionsAnswer = {
  ok: true;
  directions: ProductOptionsDirection[];
  // Code BRANDS + settings catalog.brands + brands in use, sorted.
  brands: string[];
  manufacturers: string[];
  countries: string[];
  units: string[];
  currencyLinks: CurrencyLink[];
  priceTypes: { id: string; name: string; role: "base" | "individual" | null }[];
};

// --- limits (the editor mirrors them) -----------------------------------------

export const PRODUCT_LIMITS = {
  id: 60,
  title: 200,
  volume: 60,
  brand: 80,
  sku: 64,
  description: 8000,
  listItems: 30,
  listItem: 500,
  rowLabel: 120,
  rowValue: 1000,
  scent: 1000,
  images: 12,
  related: 24,
  boughtTogether: 8,
  chips: 6,
  chip: 60,
  url: 500,
  seoTitle: 120,
  seoDescription: 300,
  packages: 20,
  files: 20,
  bulkIds: 200,
  maxPrice: 10_000_000,
} as const;

// Ids the product routes use for their own sub-paths: a product may not be
// called that (its address /api/admin/products/<id> would be shadowed).
export const RESERVED_PRODUCT_IDS = ["options", "export", "bulk", "reorder", "new"] as const;

// Field paths -> the Ukrainian name the journal and the editor use.
export const PRODUCT_FIELD_LABELS: Record<string, string> = {
  id: "код товару",
  title: "назва",
  image: "фото картки",
  volume: "об'єм",
  brand: "бренд",
  subcategory: "категорія",
  zone: "зона",
  productType: "тип товару",
  price: "ціна",
  oldPrice: "стара ціна",
  discount: "знижка",
  retailPrice: "роздрібна ціна",
  partnerPrice: "партнерська ціна",
  available: "наявність",
  preorder: "під замовлення",
  fxPrice: "ціна за курсом",
  listed: "показ у каталозі",
  chips: "мітки картки",
  "details.sku": "артикул",
  "details.description": "опис",
  "details.benefits": "переваги",
  "details.characteristics": "характеристики",
  "details.payment": "оплата",
  "details.delivery": "доставка",
  "details.scent": "піраміда запаху",
  "details.images": "галерея",
  "details.platformImages": "галерея B2B",
  "details.boughtTogether": "купують разом",
  "details.seriesIds": "товари серії",
  "details.similarIds": "схожі товари",
  externalId: "код у BAS",
  barcode: "штрихкод",
  stockQty: "залишок",
  leadTimeDays: "термін постачання",
  unit: "одиниця",
  unitCode: "код одиниці",
  packages: "упаковки",
  multiplicity: "кратність",
  isCustomizable: "брендування",
  minCustomQty: "мінімум для брендування",
  isNew: "новинка",
  isFeatured: "рекомендований",
  country: "країна",
  manufacturer: "виробник",
  currencyLink: "валюта ціни",
  files: "файли",
  seoTitle: "SEO-заголовок",
  seoDescription: "SEO-опис",
};

// Wording of the route-specific refusals, for errorMessage(result, own).
export const PRODUCT_ERRORS: Record<string, string> = {
  "in-use": "Товар є в замовленнях, тому його не можна видалити. Залиште його в архіві.",
  state: "Цю дію не можна виконати: спершу перенесіть товар в архів або поверніть його.",
  exists: "Товар із таким кодом, артикулом або кодом BAS уже є.",
};
