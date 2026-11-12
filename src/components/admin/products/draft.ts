import { slugify } from "../lib/format";
import {
  PRODUCT_LIMITS,
  RESERVED_PRODUCT_IDS,
  type CurrencyLink,
  type ProductCreateInput,
  type ProductDetail,
  type ProductEditable,
  type ProductOptionsDirection,
  type ProductPatchInput,
  type ScentDto,
  type SpecRowDto,
} from "./types";

// The product editor's form state and its way back to the API: what the
// fields hold (Draft), the shape the API takes (Normalized, compared field
// by field so a save sends only what changed), the checks done before a
// request, and which tab shows which field.

export type TextItem = { key: string; text: string };
export type SpecRowDraft = { key: string; label: string; value: string };
export type PackageDraft = {
  key: string;
  id: string;
  name: string;
  coefficient: number | null;
  unitCode: string;
  isDefault: boolean;
  externalId: string | null;
};
export type FileDraft = { key: string; id: string; name: string; file: string };
// One "Купують разом" line: the product and its benefits, one per line.
export type TogetherDraft = { key: string; productId: string; benefits: string };

export type Draft = {
  title: string;
  // Only while creating: the product's code (its page address).
  id: string;
  idTouched: boolean;
  image: string;
  volume: string;
  brand: string;
  // The direction picked in the form (the API stores only the category
  // label; the direction narrows the category, zone and type lists).
  direction: string | null;
  subcategory: string;
  zone: string | null;
  productType: string | null;
  price: number | null;
  promo: boolean;
  oldPrice: number | null;
  discount: number | null;
  retailPrice: number | null;
  partnerPrice: number | null;
  available: boolean;
  preorder: boolean;
  fxPrice: boolean;
  currencyLink: CurrencyLink | null;
  listed: boolean;
  chips: string[];
  sku: string;
  description: string;
  benefits: TextItem[];
  characteristics: SpecRowDraft[];
  payment: SpecRowDraft[];
  delivery: SpecRowDraft[];
  scent: ScentDto;
  images: string[];
  platformImages: string[];
  // The partner gallery is the retail one.
  mirror: boolean;
  boughtTogether: TogetherDraft[];
  seriesIds: string[];
  similarIds: string[];
  externalId: string;
  barcode: string;
  stockQty: number | null;
  leadTimeDays: number | null;
  unit: string;
  unitCode: string;
  packages: PackageDraft[];
  multiplicity: number | null;
  isCustomizable: boolean;
  minCustomQty: number | null;
  isNew: boolean;
  isFeatured: boolean;
  country: string;
  manufacturer: string;
  files: FileDraft[];
  seoTitle: string;
  seoDescription: string;
};

// Keys of rows added in the form (rows loaded from the record are keyed by
// their position). Bumped in event handlers only.
let rowSeq = 0;
export function newKey(prefix: string): string {
  rowSeq += 1;
  return `${prefix}-new-${rowSeq}`;
}

// A short id for a new package or file row (the API wants an id per row).
export function newRowId(prefix: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now());
  return `${prefix}-${random}`;
}

const specRows = (rows: SpecRowDto[], prefix: string): SpecRowDraft[] =>
  rows.map((row, index) => ({ key: `${prefix}-${index}`, label: row.label, value: row.value }));

const sameList = (a: string[], b: string[]): boolean => a.length === b.length && a.every((value, index) => value === b[index]);

export function draftOf(product: ProductDetail, directions: ProductOptionsDirection[]): Draft {
  const d = product.details;
  const direction = directions.find((item) => item.categories.some((card) => card.label === product.subcategory))?.slug ?? null;
  return {
    title: product.title,
    id: product.id,
    idTouched: true,
    image: product.image,
    volume: product.volume,
    brand: product.brand,
    direction,
    subcategory: product.subcategory,
    zone: product.zone,
    productType: product.productType,
    price: product.price,
    promo: product.oldPrice !== null,
    oldPrice: product.oldPrice,
    discount: product.discount,
    retailPrice: product.retailPrice,
    partnerPrice: product.partnerPrice,
    available: product.available,
    preorder: product.preorder,
    fxPrice: product.fxPrice,
    currencyLink: product.currencyLink,
    listed: product.listed,
    chips: product.chips ?? [],
    sku: d.sku,
    description: d.description,
    benefits: d.benefits.map((text, index) => ({ key: `benefit-${index}`, text })),
    characteristics: specRows(d.characteristics, "spec"),
    payment: specRows(d.payment, "payment"),
    delivery: specRows(d.delivery, "delivery"),
    scent: { ...d.scent },
    images: [...d.images],
    platformImages: [...d.platformImages],
    mirror: sameList(d.images, d.platformImages),
    boughtTogether: d.boughtTogether.map((item, index) => ({
      key: `together-${index}`,
      productId: item.productId,
      benefits: item.benefits.join("\n"),
    })),
    seriesIds: [...d.seriesIds],
    similarIds: [...d.similarIds],
    externalId: product.externalId ?? "",
    barcode: product.barcode,
    stockQty: product.stockQty,
    leadTimeDays: product.leadTimeDays,
    unit: product.unit,
    unitCode: product.unitCode,
    packages: product.packages.map((item, index) => ({ key: `package-${index}`, ...item })),
    multiplicity: product.multiplicity,
    isCustomizable: product.isCustomizable,
    minCustomQty: product.minCustomQty,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    country: product.country,
    manufacturer: product.manufacturer,
    files: product.files.map((item, index) => ({ key: `file-${index}`, ...item })),
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
  };
}

// A new product: available, unlisted, the category the list was filtered
// by (when it named one).
export function emptyDraft(directions: ProductOptionsDirection[], preset: { direction?: string; category?: string }): Draft {
  const direction = directions.find((item) => item.slug === preset.direction) ?? null;
  const card = direction?.categories.find((item) => item.slug === preset.category) ?? null;
  return {
    title: "",
    id: "",
    idTouched: false,
    image: "",
    volume: "",
    brand: "",
    direction: direction?.slug ?? null,
    subcategory: card?.label ?? "",
    zone: null,
    productType: null,
    price: null,
    promo: false,
    oldPrice: null,
    discount: null,
    retailPrice: null,
    partnerPrice: null,
    available: true,
    preorder: false,
    fxPrice: false,
    currencyLink: null,
    listed: false,
    chips: [],
    sku: "",
    description: "",
    benefits: [],
    characteristics: [],
    payment: [],
    delivery: [],
    scent: { intro: "", top: "", middle: "", base: "" },
    images: [],
    platformImages: [],
    mirror: true,
    boughtTogether: [],
    seriesIds: [],
    similarIds: [],
    externalId: "",
    barcode: "",
    stockQty: null,
    leadTimeDays: null,
    unit: "",
    unitCode: "",
    packages: [],
    multiplicity: 1,
    isCustomizable: false,
    minCustomQty: null,
    isNew: false,
    isFeatured: false,
    country: "",
    manufacturer: "",
    files: [],
    seoTitle: "",
    seoDescription: "",
  };
}

// --- to the API ------------------------------------------------------------------------

type DetailsInput = NonNullable<ProductEditable["details"]>;
type Normalized = Omit<ProductEditable, "details" | "price"> & { price: number | null; details: Required<DetailsInput> };

const trimRows = (rows: SpecRowDraft[]): SpecRowDto[] =>
  rows
    .map((row) => ({ label: row.label.trim(), value: row.value.trim() }))
    .filter((row) => row.label !== "" || row.value !== "");

export const benefitLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

function normalize(d: Draft): Normalized {
  const chips = d.chips.map((chip) => chip.trim()).filter(Boolean);
  return {
    title: d.title.trim(),
    image: d.image.trim(),
    volume: d.volume.trim(),
    brand: d.brand.trim(),
    subcategory: d.subcategory,
    zone: d.zone,
    productType: d.productType,
    price: d.price,
    oldPrice: d.promo ? d.oldPrice : null,
    discount: d.promo ? d.discount : null,
    retailPrice: d.retailPrice,
    partnerPrice: d.partnerPrice,
    available: d.available,
    preorder: d.preorder,
    fxPrice: d.fxPrice,
    listed: d.listed,
    chips: chips.length ? chips : null,
    details: {
      sku: d.sku.trim(),
      description: d.description.trim(),
      benefits: d.benefits.map((item) => item.text.trim()).filter(Boolean),
      characteristics: trimRows(d.characteristics),
      payment: trimRows(d.payment),
      delivery: trimRows(d.delivery),
      scent: { intro: d.scent.intro.trim(), top: d.scent.top.trim(), middle: d.scent.middle.trim(), base: d.scent.base.trim() },
      images: d.images,
      platformImages: d.mirror ? d.images : d.platformImages,
      boughtTogether: d.boughtTogether.map((item) => ({ productId: item.productId, benefits: benefitLines(item.benefits) })),
      seriesIds: d.seriesIds,
      similarIds: d.similarIds,
    },
    externalId: d.externalId.trim() || null,
    barcode: d.barcode.trim(),
    stockQty: d.stockQty,
    leadTimeDays: d.leadTimeDays,
    unit: d.unit.trim(),
    unitCode: d.unitCode.trim(),
    packages: d.packages.map((item) => ({
      id: item.id,
      name: item.name.trim(),
      coefficient: item.coefficient ?? 0,
      unitCode: item.unitCode.trim(),
      isDefault: item.isDefault,
      externalId: item.externalId,
    })),
    multiplicity: d.multiplicity ?? 1,
    isCustomizable: d.isCustomizable,
    minCustomQty: d.minCustomQty,
    isNew: d.isNew,
    isFeatured: d.isFeatured,
    country: d.country.trim(),
    manufacturer: d.manufacturer.trim(),
    currencyLink: d.currencyLink,
    files: d.files.map((item) => ({ id: item.id, name: item.name.trim(), file: item.file })),
    seoTitle: d.seoTitle.trim(),
    seoDescription: d.seoDescription.trim(),
  };
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// The PATCH body: only the fields (and the page-content keys) that differ
// from what was loaded. Empty when nothing changed.
export function patchOf(initial: Draft, current: Draft): ProductPatchInput {
  const a = normalize(initial);
  const b = normalize(current);
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(b) as (keyof Normalized)[]) {
    if (key === "details") continue;
    if (!same(a[key], b[key])) patch[key] = b[key];
  }
  const details: Record<string, unknown> = {};
  for (const key of Object.keys(b.details) as (keyof DetailsInput)[]) {
    if (!same(a.details[key], b.details[key])) details[key] = b.details[key];
  }
  if (Object.keys(details).length) patch.details = details;
  return patch as ProductPatchInput;
}

// The POST body of a new product: what the creation form holds. The code is
// sent only when staff typed it (otherwise the server derives a free one).
export function createOf(d: Draft): ProductCreateInput {
  const n = normalize(d);
  const body: ProductCreateInput = {
    title: n.title,
    image: n.image,
    volume: n.volume,
    brand: n.brand,
    subcategory: n.subcategory,
    price: n.price ?? 0,
    available: n.available,
    listed: n.listed,
  };
  if (d.idTouched && d.id.trim()) body.id = d.id.trim();
  if (n.zone) body.zone = n.zone;
  if (n.productType) body.productType = n.productType;
  if (n.details.sku) body.details = { sku: n.details.sku };
  return body;
}

// --- checks before a request ---------------------------------------------------------------

export type Errors = Record<string, string>;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const RESERVED = new Set<string>(RESERVED_PRODUCT_IDS);

export function suggestedId(title: string): string {
  return slugify(title, PRODUCT_LIMITS.id);
}

export function idError(id: string): string | null {
  const value = id.trim();
  if (!value) return null;
  if (value.length > PRODUCT_LIMITS.id) return `Не більше ${PRODUCT_LIMITS.id} символів`;
  if (!ID_PATTERN.test(value)) return "Лише латинські літери, цифри, дефіс і підкреслення; на початку літера або цифра";
  if (RESERVED.has(value)) return "Цей код зарезервований, оберіть інший";
  return null;
}

// What the API would refuse, said before the request (and under the field).
// `creating` checks only what the creation form shows.
export function validate(d: Draft, creating: boolean): Errors {
  const e: Errors = {};
  if (!d.title.trim()) e.title = "Вкажіть назву товару";
  if (!d.volume.trim()) e.volume = "Вкажіть об'єм або розмір: його показує картка товару";
  if (!d.brand.trim()) e.brand = "Вкажіть бренд";
  if (!d.subcategory) e.subcategory = "Оберіть категорію";
  if (!d.image.trim()) e.image = "Додайте фото товару";
  if (d.price === null) e.price = "Вкажіть ціну";
  if (creating) {
    const id = idError(d.id);
    if (d.idTouched && id) e.id = id;
    return e;
  }
  if (d.promo) {
    if (d.oldPrice === null) e.oldPrice = "Вкажіть ціну без акції";
    else if (d.price !== null && d.oldPrice <= d.price) e.oldPrice = "Стара ціна має бути більшою за ціну зі знижкою";
  }
  if (d.images.length === 0) e["details.images"] = "Додайте хоча б одне фото";
  if (!d.mirror && d.platformImages.length === 0) e["details.platformImages"] = "Додайте хоча б одне фото або ввімкніть «така сама, як роздрібна»";
  const rowsError = (rows: SpecRowDraft[]) =>
    rows.some((row) => (row.label.trim() === "") !== (row.value.trim() === "")) ? "Заповніть і назву, і значення в кожному рядку" : null;
  for (const key of ["characteristics", "payment", "delivery"] as const) {
    const message = rowsError(d[key]);
    if (message) e[`details.${key}`] = message;
  }
  if (d.boughtTogether.some((item) => benefitLines(item.benefits).length > 6)) {
    e["details.boughtTogether"] = "До 6 переваг на один товар";
  }
  if (d.packages.some((item) => !item.name.trim())) e["packages.name"] = "Назвіть кожну упаковку";
  if (d.packages.some((item) => item.coefficient === null || item.coefficient <= 0)) {
    e["packages.coefficient"] = "Вкажіть, скільки одиниць в упаковці";
  }
  if (d.files.some((item) => !item.name.trim())) e["files.name"] = "Назвіть кожен файл";
  if (d.files.some((item) => !item.file)) e["files.file"] = "Завантажте файл або приберіть рядок";
  if (d.multiplicity === null) e.multiplicity = "Вкажіть кратність (1 - будь-яка кількість)";
  return e;
}

// --- tabs ------------------------------------------------------------------------------------

export const EDITOR_TABS = [
  { key: "main", label: "Основне" },
  { key: "prices", label: "Ціни та наявність" },
  { key: "photos", label: "Фото" },
  { key: "description", label: "Опис" },
  { key: "related", label: "Пов'язані товари" },
  { key: "accounting", label: "Облік" },
  { key: "seo", label: "SEO" },
] as const;

export type EditorTab = (typeof EDITOR_TABS)[number]["key"];

const TAB_OF: Record<string, EditorTab> = {
  id: "main",
  title: "main",
  volume: "main",
  brand: "main",
  subcategory: "main",
  zone: "main",
  productType: "main",
  chips: "main",
  listed: "main",
  "details.sku": "main",
  price: "prices",
  oldPrice: "prices",
  discount: "prices",
  retailPrice: "prices",
  partnerPrice: "prices",
  available: "prices",
  preorder: "prices",
  fxPrice: "prices",
  currencyLink: "prices",
  stockQty: "prices",
  leadTimeDays: "prices",
  image: "photos",
  "details.images": "photos",
  "details.platformImages": "photos",
  "details.description": "description",
  "details.benefits": "description",
  "details.characteristics": "description",
  "details.payment": "description",
  "details.delivery": "description",
  "details.scent": "description",
  "details.boughtTogether": "related",
  "details.seriesIds": "related",
  "details.similarIds": "related",
  seoTitle: "seo",
  seoDescription: "seo",
};

// The tab that holds a field path ("packages.name" is under "packages").
export function tabOf(path: string): EditorTab {
  if (TAB_OF[path]) return TAB_OF[path];
  const parts = path.split(".");
  for (let length = parts.length - 1; length > 0; length -= 1) {
    const found = TAB_OF[parts.slice(0, length).join(".")];
    if (found) return found;
  }
  return "accounting";
}

// The first tab (in tab order) that holds one of the errors.
export function firstErrorTab(errors: Errors): EditorTab | null {
  const tabs = new Set(Object.keys(errors).map(tabOf));
  return EDITOR_TABS.find((tab) => tabs.has(tab.key))?.key ?? null;
}

// An error of a field or of any of its sub-fields ("details.scent.top").
export function errorOf(errors: Errors, path: string): string | undefined {
  if (errors[path]) return errors[path];
  const prefix = `${path}.`;
  const key = Object.keys(errors).find((name) => name.startsWith(prefix));
  return key ? errors[key] : undefined;
}
