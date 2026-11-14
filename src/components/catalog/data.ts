// Catalog vocabulary shared by the browser and the server: the Product
// type, the Figma-tuned taxonomy (directions, categories, menu, facets),
// the filter / sort vocabularies and the pure price and URL helpers.
// The products themselves live in MongoDB (collection `products`, seeded
// from src/server/seed/data/catalog.ts): server pages read them through
// src/server/repos/catalog.ts, client code through ./registry.ts.
// Figma: "Katalog :: B2C" section 4329:39002 (product cards 4329:39182,
// filters applied 4329:39587, the filter sheets 4329:39542 / 39659 /
// 39692).
import { partnerPriceMap, partnerPriceOf, type PartnerPrices } from "./registry";

// A subcategory card in the direction-page carousel («Напрям»,
// 4329:39333 - «Карусель» set 3685:54259): the 393×260 zones-style
// photo card. `crop` is the exact Figma fill placement (percent box
// relative to the card) for masters that zoom the photo; absent = plain
// centred cover. `bg` paints an underlay for photos with transparent /
// white padding.
export type SubcategoryCard = {
  label: string;
  // URL segment of the subcategory page (/catalog/<direction>/<slug>).
  slug: string;
  // Carousel card photo (2x the rendered 393 x 260 card, crop included).
  image: string;
  // The same photo at its native size: the «Категорія» hero falls back
  // to it (1550 x 640 cover) when the category has no `hero`.
  fullImage: string;
  crop?: { left: string; top: string; width: string; height: string };
  bg?: string;
  // Dedicated «Категорія» hero (4329:39421 / 4329:56334, 1550 x 640):
  // its own photo + object-position. Only «Готельна косметика» has a
  // designed hero (ctx/4329-39421.md); the other categories fall back
  // to their carousel photo, centred cover (NEEDED.md).
  hero?: { image: string; position?: string };
};

// A link in the header mega-menu column («Меню каталогу» 4329:39081):
// the verbatim Figma label and the «Категорія» page it opens (a
// carousel card slug of the same direction).
export type MenuLink = { label: string; category: string };

export type CatalogDirection = {
  // Marketing landing (/hotels, /protect, /cleaning).
  href: string;
  // Catalog listing scoped to the direction (/catalog/<slug>).
  slug: string;
  icon: string;
  title: string;
  // One-line subtitle under the direction title on the B2B platform
  // page (Figma «Напрям» 4329:56219 shows «Lorem ipsum» there).
  tagline: string;
  links: MenuLink[];
  // Product-type chips in the hover popover over the /catalog banners
  // («Каталог :: ховер на напрям» 4329:39318). The hotels list is
  // verbatim from that frame; protect/cleaning reuse their carousel
  // taxonomy (the designer drew only the hotels popover).
  panelItems: string[];
  // Direction-page carousel cards = the direction's categories (the
  // «Напрямки -> Категорії» spec 4329:39729).
  carousel: SubcategoryCard[];
  // The filters-sheet context facet («Динамічний фільтр» 4329:39756):
  // hotel zones / industrial risks / cleaning zones.
  facet: { title: string; options: string[] };
  // The filters-sheet «Товари» checklist for this direction.
  productFilters: string[];
};

// Carousel photos: JPEG re-encodes of the opaque Figma PNG exports
// (26.6 MB of PNG -> 1.1 MB of card files + 1.7 MB of full-size files).
// The card file is 2x the photo's rendered box in the desktop card
// (the crop box for zoomed masters, else the 393 x 260 cover), never
// upscaled; the full-size file keeps the source pixels for the hero
// fallback (Lanczos resize, JPEG q82 progressive; the PNG exports were
// fully opaque, so no alpha is lost).
function photo(name: string): Pick<SubcategoryCard, "image" | "fullImage"> {
  return {
    image: `/figma-export/catalog/carousel/${name}.jpg`,
    fullImage: `/figma-export/catalog/carousel/full/${name}.jpg`,
  };
}

// «Каталог :: ховер на напрям» popover chips (4329:39318), verbatim.
const HOTELS_PANEL_ITEMS = [
  "Готельна косметика",
  "Дрібне обладнання та техніка",
  "Одноразові аксесуари та гігієнічні набори",
  "Готельні тапочки",
  "Готельний текстиль",
  "Готельний інвентар",
  "Арома-маркетинг",
  "Інші товари для готелів",
];

// «Фільтри :: Готель» sheet (4329:39542) facet «Готельні зони» - the
// six zones of the «Динамічний фільтр» spec (4329:39756).
const HOTEL_ZONES = [
  "Ванна кімната",
  "Номер гостя",
  "Зона рецепції",
  "SPA",
  "Басейни",
  "Конференц-зали",
];

// The same sheet's «Товари»: the first ten rows are verbatim (the first
// one wraps to two lines); «Показати більше» reveals the rest. The
// frame never shows what follows the tenth row, so the tail continues
// the alphabetical list with placeholder hotel product types
// (audit/figma-inventory/ctx/NEEDED.md).
const HOTEL_PRODUCT_TYPES = [
  "Аксесуари для ванної кімнати: гачки, полички, тримачі, дзеркала",
  "Вага",
  "Дзеркало над умивальником",
  "Косметика в дозаторах",
  "Косметика в малій упаковці",
  "Лоток під косметику",
  "Набір для гоління",
  "Набір для зубів",
  "Набори для гігієни",
  "Органайзер для серветок",
  "Рушники",
  "Тапочки",
  "Фени",
  "Халати",
];

// «ЗІЗ» sheet (4329:39659) facet «Промислові ризики та галузі», verbatim
// (the Figma «Склади » carries a stray trailing space).
const PROTECT_INDUSTRIES = [
  "Харчова промисловість",
  "Медичні заклади",
  "Салони краси",
  "Склади",
];

// «Прибирання» sheet (4329:39692) facet «Зони Клінінгу», verbatim.
const CLEANING_ZONES = [
  "Кухня",
  "Громадські санвузли",
  "Прибирання приміщень",
  "Прибирання територій",
  "Пральня",
];

// The ЗІЗ / Прибирання mega-menu columns (4329:39101 / 4329:39114) and
// the «Товари» groups of their filter sheets carry the same lists.
const PROTECT_PRODUCT_TYPES = [
  "Бахіли, шапочки, нарукавники",
  "Маски та респіратори",
  "Одноразова білизна",
  "Одноразові халати та комбінезони",
  "Рукавички",
];

const CLEANING_PRODUCT_TYPES = [
  "Дезінфекція та санітарія",
  "Диспенсери та дозатори",
  "Інвентар для прибирання",
  "Маски та респіратори",
  "Мийні засоби та пральні рішення",
  "Паперова гігієна",
  "Супутні витратні матеріали",
  "Хімія для кухні та харчових зон (HoReCa)",
];

// Mega-menu columns (4329:39081): label -> «Категорія» page. Figma
// gives the labels only; each one opens the closest category of its
// direction (the hotel column lists zones, so several share a page).
const HOTELS_MENU: MenuLink[] = [
  { label: "Ванна кімната", category: "hotelna-kosmetyka" },
  { label: "Засоби індивідуального захисту", category: "inshi-tovary" },
  { label: "Інші зручності для гостей", category: "odnorazovi-aksesuary" },
  { label: "Кімната/спальня", category: "hotelnyi-tekstyl" },
  { label: "Мінібар", category: "dribne-obladnannia" },
  { label: "Обслуговування номерів та приміщень", category: "hotelnyi-inventar" },
  { label: "Обслуговування територій", category: "hotelnyi-inventar" },
  { label: "Ресторан/Бар", category: "dribne-obladnannia" },
  { label: "Рецепція", category: "aroma-marketynh" },
  { label: "Санвузли загального користування", category: "odnorazovi-aksesuary" },
  // Figma text « СПА» starts with a stray space (4329:39098).
  { label: "СПА", category: "hotelnyi-tekstyl" },
];

const PROTECT_MENU: MenuLink[] = [
  { label: "Бахіли, шапочки, нарукавники", category: "sanitarnyi-odiah" },
  { label: "Маски та респіратори", category: "zakhyst-dykhannia" },
  { label: "Одноразова білизна", category: "odnorazova-bilyzna" },
  { label: "Одноразові халати та комбінезони", category: "sanitarnyi-odiah" },
  { label: "Рукавички", category: "zakhyst-ruk" },
];

const CLEANING_MENU: MenuLink[] = [
  { label: "Дезінфекція та санітарія", category: "profesiina-khimiia" },
  { label: "Диспенсери та дозатори", category: "paperovi-vyroby" },
  { label: "Інвентар для прибирання", category: "inventar" },
  { label: "Маски та респіратори", category: "inshi-tovary" },
  { label: "Мийні засоби та пральні рішення", category: "profesiina-khimiia" },
  { label: "Паперова гігієна", category: "paperovi-vyroby" },
  { label: "Супутні витратні матеріали", category: "inshi-tovary" },
  { label: "Хімія для кухні та харчових зон (HoReCa)", category: "profesiina-khimiia" },
];

// Hotels carousel — verbatim from Figma «Карусель» (3685:54317): the
// card order, photos and the two zoom-crops match the master (the
// card box is the same 393×260 aspect, so the percent crops reproduce
// the exact framing).
const HOTELS_CAROUSEL: SubcategoryCard[] = [
  {
    label: "Готельна косметика",
    slug: "hotelna-kosmetyka",
    ...photo("hotels-cosmetics"),
    // «Категорія» 4329:39421: the 832 x 1247 photo (cart/stock-
    // alternative.png) width-fit into the 1550 x 640 box, band y
    // 793.6..1433.6 of 2323.1 = cover at 47.15 %. Shipped pre-cropped to
    // source rows 380..820 (832 x 440 JPEG, 52 KB instead of 1.3 MB), so
    // the same band sits at 47.68 % (47.67 at 1550, 47.69 at B2B 1534).
    hero: { image: "/figma-export/catalog/hero-hotelna-kosmetyka.jpg", position: "50% 47.68%" },
  },
  {
    label: "Одноразові аксесуари та гігієнічні набори",
    slug: "odnorazovi-aksesuary",
    ...photo("hotels-accessories"),
  },
  {
    label: "Готельні тапочки",
    slug: "hotelni-tapochky",
    ...photo("hotels-slippers"),
    bg: "#ffffff",
  },
  {
    label: "Дрібне обладнання та техніка",
    slug: "dribne-obladnannia",
    ...photo("hotels-equipment"),
    crop: { left: "-2.88%", top: "-10%", width: "109.84%", height: "110%" },
  },
  {
    label: "Готельний текстиль",
    slug: "hotelnyi-tekstyl",
    ...photo("hotels-textile"),
  },
  {
    label: "Готельний інвентар",
    slug: "hotelnyi-inventar",
    ...photo("hotels-inventory"),
    crop: { left: "-1.99%", top: "-22.19%", width: "111.7%", height: "126.63%" },
  },
  {
    label: "Арома-маркетинг",
    slug: "aroma-marketynh",
    ...photo("hotels-aroma"),
  },
  {
    label: "Інші товари для готелів",
    slug: "inshi-tovary",
    ...photo("hotels-other"),
  },
];

// Protect carousel — verbatim from the «Карусель» component set
// variant «Засоби індивідуального захисту» (3685:54257): six cards
// with the designer's photos and zoom-crops.
const PROTECT_CAROUSEL: SubcategoryCard[] = [
  {
    label: "Захист органів дихання",
    slug: "zakhyst-dykhannia",
    ...photo("protect-respiratory"),
    crop: { left: "0%", top: "-27.19%", width: "100%", height: "148.23%" },
    bg: "#ffffff",
  },
  {
    label: "Захист рук",
    slug: "zakhyst-ruk",
    ...photo("protect-hands"),
    crop: { left: "0%", top: "-66.53%", width: "100%", height: "251.51%" },
  },
  {
    label: "Санітарний одяг",
    slug: "sanitarnyi-odiah",
    ...photo("protect-sanitary"),
    crop: { left: "0%", top: "0%", width: "100%", height: "151.54%" },
    bg: "#ffffff",
  },
  {
    label: "Захист голови, очей та слуху",
    slug: "zakhyst-holovy",
    ...photo("protect-head"),
    crop: { left: "-26.87%", top: "-45.77%", width: "153.74%", height: "145.77%" },
  },
  {
    label: "Одноразова білизна",
    slug: "odnorazova-bilyzna",
    ...photo("protect-linen"),
    crop: { left: "-5.32%", top: "-5.46%", width: "108.55%", height: "108.65%" },
  },
  {
    label: "Інші ЗІЗ товари",
    slug: "inshi-ziz",
    ...photo("protect-other"),
  },
];

// Cleaning carousel — variant «Засоби та інвентар для прибирання»
// (3685:54256): four cards.
const CLEANING_CAROUSEL: SubcategoryCard[] = [
  {
    label: "Професійна хімія",
    slug: "profesiina-khimiia",
    ...photo("cleaning-chemistry"),
    crop: { left: "-1.76%", top: "0%", width: "104.05%", height: "100%" },
  },
  {
    label: "Інвентар для прибирання",
    slug: "inventar",
    ...photo("cleaning-inventory"),
    crop: { left: "-11.58%", top: "-24.62%", width: "123.66%", height: "124.62%" },
  },
  {
    label: "Паперові вироби та диспенсери",
    slug: "paperovi-vyroby",
    ...photo("cleaning-paper"),
    bg: "#ffffff",
  },
  {
    label: "Інші товари",
    slug: "inshi-tovary",
    ...photo("cleaning-other"),
    crop: { left: "0%", top: "-7.12%", width: "100%", height: "151.15%" },
  },
];

export const CATALOG_DIRECTIONS: CatalogDirection[] = [
  {
    href: "/hotels",
    slug: "hotels",
    icon: "/figma-export/catalog/icon-hotels.svg",
    title: "Усе для готелів",
    tagline: "Косметика, текстиль, аксесуари та обладнання для номерного фонду",
    links: HOTELS_MENU,
    panelItems: HOTELS_PANEL_ITEMS,
    carousel: HOTELS_CAROUSEL,
    facet: { title: "Готельні зони", options: HOTEL_ZONES },
    productFilters: HOTEL_PRODUCT_TYPES,
  },
  {
    href: "/protect",
    slug: "protect",
    icon: "/figma-export/catalog/icon-protect.svg",
    title: "Засоби індивідуального захисту",
    tagline: "Захист персоналу для виробництв, медицини, HoReCa та складів",
    links: PROTECT_MENU,
    panelItems: PROTECT_CAROUSEL.map((c) => c.label),
    carousel: PROTECT_CAROUSEL,
    facet: { title: "Промислові ризики та галузі", options: PROTECT_INDUSTRIES },
    productFilters: PROTECT_PRODUCT_TYPES,
  },
  {
    href: "/cleaning",
    slug: "cleaning",
    icon: "/figma-export/catalog/icon-cleaning.svg",
    title: "Засоби та інвентар для прибирання",
    tagline: "Хімія, інвентар та витратні матеріали для професійного клінінгу",
    links: CLEANING_MENU,
    panelItems: CLEANING_CAROUSEL.map((c) => c.label),
    carousel: CLEANING_CAROUSEL,
    facet: { title: "Зони Клінінгу", options: CLEANING_ZONES },
    productFilters: CLEANING_PRODUCT_TYPES,
  },
];

// Catalog listing scoped to a direction.
export function directionCatalogHref(d: CatalogDirection): string {
  return `/catalog/${d.slug}`;
}

// Subcategory («Категорія») page inside a direction.
export function categoryHref(d: CatalogDirection, card: SubcategoryCard): string {
  return `/catalog/${d.slug}/${card.slug}`;
}

export function findCategory(
  d: CatalogDirection,
  categorySlug: string,
): SubcategoryCard | undefined {
  return d.carousel.find((c) => c.slug === categorySlug);
}

// A mega-menu link's «Категорія» page; the direction page when the
// slug does not resolve (never with the lists above).
export function menuLinkHref(d: CatalogDirection, link: MenuLink): string {
  const card = findCategory(d, link.category);
  return card ? categoryHref(d, card) : directionCatalogHref(d);
}

// The category labels of a direction (its carousel cards) - the
// direction page lists the products filed under these.
export function directionSubcategorySet(d: CatalogDirection): Set<string> {
  return new Set(d.carousel.map((c) => c.label));
}

export type Product = {
  id: string;
  title: string;
  image: string;
  volume: string;
  brand: string;
  // The category = a carousel card label of one direction (it decides
  // the «Категорія» page and the direction).
  subcategory: string;
  // Filter attributes of the «Фільтри» sheets: the direction facet
  // option (zone / industry) and the «Товари» product type.
  zone?: string;
  productType?: string;
  // Price in UAH; rendered as «31,65 ₴» via formatPrice below.
  price: number;
  // Regular price when `price` is a promotional one (Figma PDP variant
  // «Ціна з пропозицією», 4329:51621): rendered struck-through next to
  // the orange sale price, with the discount chip on the photo.
  oldPrice?: number;
  // Discount label override (whole percent). Product feeds usually carry
  // the label they print; when absent it is computed from the prices.
  discount?: number;
  available: boolean;
  // Chip labels on the cards; defaults to [volume, brand] when absent
  // (the «Купують разом» textile cards show material + feature chips).
  chips?: string[];
  // B2B platform prices (Figma «B2B :: Product card» 4185:28174): the
  // wholesale / retail pair in the grey tile and the account's own
  // «ваша ціна». `price` doubles as the wholesale price.
  retailPrice?: number;
  partnerPrice?: number;
  // «ціна залежить від курсу» (USD-EUR variant 4186:33085).
  fxPrice?: boolean;
  // «Під замовлення» (disabled variant 4185:28255): not in stock, but
  // a partner can still order it - the card swaps the cart glyph for
  // the orders one.
  preorder?: boolean;
  // Lead time in days (the panel's «Термін постачання», or the BAS stock
  // feed): the «Термін виконання до N днів» chip of the «Під замовлення»
  // (i) (designer 2026-11-11, C23; catalog/tips.ts).
  leadTimeDays?: number;
};

// Filterable placeholder attributes. The manufacturer list is verbatim
// from every «Фільтри» sheet (4329:39542 / 39659 / 39692) - real
// hotel-cosmetics suppliers, including the «Allegrini» the
// filters-applied frame (4329:39587) shows in its chip next to the
// «Косметика в малій упаковці» product type.
export const BRANDS = [
  "ALDA hotel cosmetics",
  "Allegrini",
  "MARIE DANIELLE",
  "Papoutsanis",
  "S&R",
] as const;

// Vocabularies of the two context groups (URL params `zone` / `type`).
export const ZONE_OPTIONS: string[] = [
  ...new Set(CATALOG_DIRECTIONS.flatMap((d) => d.facet.options)),
];
export const PRODUCT_TYPE_OPTIONS: string[] = [
  ...new Set(CATALOG_DIRECTIONS.flatMap((d) => d.productFilters)),
];

// B2B prices of a product: wholesale = the catalog price, the retail
// price defaults to the master's 36,00 ratio.
// The partner price is the signed-in partner's own one, which only the
// session sends (SessionData.prices, see registry.ts); the public DTO
// never carries partnerPrice. Without a map (it is written before the
// account is committed, so only a broken mirror gets here) the list
// price shows: no discount formula ships in the public bundle.
// `prices` = the map to read: a component passes usePartnerPrices()
// (CatalogRegistry.tsx) so it re-renders when the server's map replaces
// the mirrored one; omitted = the mirror as it is now.
export function b2bPrices(
  p: Product,
  prices: PartnerPrices | null = partnerPriceMap(),
): { wholesale: number; retail: number; partner: number } {
  // A B2C promotion does not touch the wholesale list: the regular
  // (pre-sale) price is the wholesale one.
  const list = p.oldPrice ?? p.price;
  return {
    wholesale: list,
    retail: p.retailPrice ?? Math.round(list * 1.1374 * 100) / 100,
    partner: partnerPriceOf(p.id, prices) ?? p.partnerPrice ?? list,
  };
}

export const SORT_OPTIONS = [
  "за популярністю",
  "за назвою",
  "за ціною",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

// «Кількість товарів на сторінці» — the Figma control shows 20.
export const PAGE_SIZES = [20, 40, 60] as const;

// 31.65 -> «31,65 ₴», 4736.25 -> «4 736,25 ₴» (comma decimal, thin
// thousands groups, non-breaking space before ₴).
export function formatPrice(price: number): string {
  const [int, dec] = price.toFixed(2).split(".");
  return `${groupThousands(int)},${dec}\u00a0₴`;
}

// 5000 -> «5 000 ₴» — the cart meter's threshold labels.
export function formatPriceWhole(price: number): string {
  return `${groupThousands(String(Math.round(price)))}\u00a0₴`;
}

function groupThousands(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

// Ukrainian plural for «товар»: 1 товар / 2-4 товари / 5+ товарів
// (with the 11-14 exception).
export function productsPlural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "товари";
  }
  return "товарів";
}

// Product page («Сторінка товару», Figma 4329:51337):
// /catalog/<direction>/<category>/<product-id>. The category is the
// carousel card whose label equals the product's subcategory; products
// filed under a menu-only subcategory fall back to their direction's
// last («Інші …») card so every card in the catalog has a page.
export function productHref(p: Product): string {
  for (const d of CATALOG_DIRECTIONS) {
    const card = d.carousel.find((c) => c.label === p.subcategory);
    if (card) return `/catalog/${d.slug}/${card.slug}/${p.id}`;
  }
  const dir =
    CATALOG_DIRECTIONS.find((d) => directionSubcategorySet(d).has(p.subcategory)) ??
    CATALOG_DIRECTIONS[0];
  const fallback = dir.carousel[dir.carousel.length - 1];
  return `/catalog/${dir.slug}/${fallback.slug}/${p.id}`;
}

// The «-25%» chip label: the feed's own label when it carries one,
// otherwise the whole percent computed from the two prices; null when
// the product is not on sale.
export function discountPercent(p: Product): number | null {
  if (!p.oldPrice || p.oldPrice <= p.price) return null;
  return p.discount ?? Math.round((1 - p.price / p.oldPrice) * 100);
}
