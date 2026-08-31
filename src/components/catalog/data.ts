// Placeholder catalog data mirroring the Figma template state
// («Каталог :: картки товарів», 3603:11640 / filters-applied variant
// 3677:40553): the master B2C card repeated with the same product.
// Swap for the real product source when the e-commerce backend lands.

// The three catalog directions with their subcategory link lists —
// single source of truth shared by the header mega-menu (CatalogMenu)
// and the /catalog filters. Labels are verbatim from the Figma
// «Меню каталогу» columns (3603:11515).
// A subcategory card in the direction-page carousel («Напрям»,
// 3685:54317): the 393×260 zones-style photo card. `crop` is the exact
// Figma fill placement (percent box relative to the card) for masters
// that zoom the photo; absent = plain centred cover. `bg` paints an
// underlay for photos with transparent/white padding.
export type SubcategoryCard = {
  label: string;
  // URL segment of the subcategory page (/catalog/<direction>/<slug>).
  slug: string;
  image: string;
  crop?: { left: string; top: string; width: string; height: string };
  bg?: string;
};

export type CatalogDirection = {
  // Marketing landing (/hotels, /protect, /cleaning).
  href: string;
  // Catalog listing scoped to the direction (/catalog/<slug>).
  slug: string;
  icon: string;
  title: string;
  links: string[];
  // Product-type chips shown in the hover panel over the /catalog
  // banners («Каталог :: ховер на напрям», 3677:42133). The hotels
  // list is verbatim from that frame; protect/cleaning reuse their
  // mega-menu product lists (the designer drew only the hotels panel).
  panelItems: string[];
  // Direction-page carousel cards. Hotels photos are exact exports
  // from the «Напрям» frame; protect/cleaning reuse existing site
  // assets until the designer draws their carousels.
  carousel: SubcategoryCard[];
  // The filters-drawer context facet (Figma «Фільтри» frames): hotel
  // zones / industrial risks / cleaning zones.
  facet: { title: string; options: string[] };
  // The filters-drawer «Товари» checklist for this direction.
  productFilters: string[];
};

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

// «Фільтри :: ЗІЗ» (3424:32503) context facet.
const PROTECT_INDUSTRIES = [
  "Харчова промисловість",
  "Медичні заклади",
  "Салони краси",
  "Склади",
];

// «Фільтри :: Прибирання» (3424:32651) context facet.
const CLEANING_ZONES = [
  "Кухня",
  "Громадські санвузли",
  "Прибирання приміщень",
  "Прибирання територій",
  "Пральня",
];

const PROTECT_LINKS = [
  "Бахіли, шапочки, нарукавники",
  "Маски та респіратори",
  "Одноразова білизна",
  "Одноразові халати та комбінезони",
  "Рукавички",
];

const CLEANING_LINKS = [
  "Дезінфекція та санітарія",
  "Диспенсери та дозатори",
  "Інвентар для прибирання",
  "Маски та респіратори",
  "Мийні засоби та пральні рішення",
  "Паперова гігієна",
  "Супутні витратні матеріали",
  "Хімія для кухні та харчових зон (HoReCa)",
];

// Hotels carousel — verbatim from Figma «Карусель» (3685:54317): the
// card order, photos and the two zoom-crops match the master (the
// card box is the same 393×260 aspect, so the percent crops reproduce
// the exact framing).
const HOTELS_CAROUSEL: SubcategoryCard[] = [
  {
    label: "Готельна косметика",
    slug: "hotelna-kosmetyka",
    image: "/figma-export/catalog/carousel/hotels-cosmetics.png",
  },
  {
    label: "Одноразові аксесуари та гігієнічні набори",
    slug: "odnorazovi-aksesuary",
    image: "/figma-export/catalog/carousel/hotels-accessories.png",
  },
  {
    label: "Готельні тапочки",
    slug: "hotelni-tapochky",
    image: "/figma-export/catalog/carousel/hotels-slippers.png",
    bg: "#ffffff",
  },
  {
    label: "Дрібне обладнання та техніка",
    slug: "dribne-obladnannia",
    image: "/figma-export/catalog/carousel/hotels-equipment.png",
    crop: { left: "-2.88%", top: "-10%", width: "109.84%", height: "110%" },
  },
  {
    label: "Готельний текстиль",
    slug: "hotelnyi-tekstyl",
    image: "/figma-export/catalog/carousel/hotels-textile.png",
  },
  {
    label: "Готельний інвентар",
    slug: "hotelnyi-inventar",
    image: "/figma-export/catalog/carousel/hotels-inventory.png",
    crop: { left: "-1.99%", top: "-22.19%", width: "111.7%", height: "126.63%" },
  },
  {
    label: "Арома-маркетинг",
    slug: "aroma-marketynh",
    image: "/figma-export/catalog/carousel/hotels-aroma.png",
  },
  {
    label: "Інші товари для готелів",
    slug: "inshi-tovary",
    image: "/figma-export/catalog/carousel/hotels-other.png",
  },
];

// Protect carousel — verbatim from the «Карусель» component set
// variant «Засоби індивідуального захисту» (3685:54257): six cards
// with the designer's photos and zoom-crops.
const PROTECT_CAROUSEL: SubcategoryCard[] = [
  {
    label: "Захист органів дихання",
    slug: "zakhyst-dykhannia",
    image: "/figma-export/catalog/carousel/protect-respiratory.png",
    crop: { left: "0%", top: "-27.19%", width: "100%", height: "148.23%" },
    bg: "#ffffff",
  },
  {
    label: "Захист рук",
    slug: "zakhyst-ruk",
    image: "/figma-export/catalog/carousel/protect-hands.png",
    crop: { left: "0%", top: "-66.53%", width: "100%", height: "251.51%" },
  },
  {
    label: "Санітарний одяг",
    slug: "sanitarnyi-odiah",
    image: "/figma-export/catalog/carousel/protect-sanitary.png",
    crop: { left: "0%", top: "0%", width: "100%", height: "151.54%" },
    bg: "#ffffff",
  },
  {
    label: "Захист голови, очей та слуху",
    slug: "zakhyst-holovy",
    image: "/figma-export/catalog/carousel/protect-head.png",
    crop: { left: "-26.87%", top: "-45.77%", width: "153.74%", height: "145.77%" },
  },
  {
    label: "Одноразова білизна",
    slug: "odnorazova-bilyzna",
    image: "/figma-export/catalog/carousel/protect-linen.png",
    crop: { left: "-5.32%", top: "-5.46%", width: "108.55%", height: "108.65%" },
  },
  {
    label: "Інші ЗІЗ товари",
    slug: "inshi-ziz",
    image: "/figma-export/catalog/carousel/protect-other.png",
  },
];

// Cleaning carousel — variant «Засоби та інвентар для прибирання»
// (3685:54256): four cards.
const CLEANING_CAROUSEL: SubcategoryCard[] = [
  {
    label: "Професійна хімія",
    slug: "profesiina-khimiia",
    image: "/figma-export/catalog/carousel/cleaning-chemistry.png",
    crop: { left: "-1.76%", top: "0%", width: "104.05%", height: "100%" },
  },
  {
    label: "Інвентар для прибирання",
    slug: "inventar",
    image: "/figma-export/catalog/carousel/cleaning-inventory.png",
    crop: { left: "-11.58%", top: "-24.62%", width: "123.66%", height: "124.62%" },
  },
  {
    label: "Паперові вироби та диспенсери",
    slug: "paperovi-vyroby",
    image: "/figma-export/catalog/carousel/cleaning-paper.png",
    bg: "#ffffff",
  },
  {
    label: "Інші товари",
    slug: "inshi-tovary",
    image: "/figma-export/catalog/carousel/cleaning-other.png",
    crop: { left: "0%", top: "-7.12%", width: "100%", height: "151.15%" },
  },
];

export const CATALOG_DIRECTIONS: CatalogDirection[] = [
  {
    href: "/hotels",
    slug: "hotels",
    icon: "/figma-export/catalog/icon-hotels.svg",
    title: "Усе для готелів",
    links: [
      "Ванна кімната",
      "Засоби індивідуального захисту",
      "Інші зручності для гостей",
      "Кімната/спальня",
      "Мінібар",
      "Обслуговування номерів та приміщень",
      "Обслуговування територій",
      "Ресторан/Бар",
      "Рецепція",
      "Санвузли загального користування",
      "СПА",
    ],
    panelItems: HOTELS_PANEL_ITEMS,
    carousel: HOTELS_CAROUSEL,
    facet: {
      title: "Готельні зони",
      options: [
        "Ванна кімната",
        "Засоби індивідуального захисту",
        "Інші зручності для гостей",
        "Кімната/спальня",
        "Мінібар",
        "Обслуговування номерів та приміщень",
        "Обслуговування територій",
        "Ресторан/Бар",
        "Рецепція",
        "Санвузли загального користування",
        "СПА",
      ],
    },
    productFilters: HOTELS_PANEL_ITEMS,
  },
  {
    href: "/protect",
    slug: "protect",
    icon: "/figma-export/catalog/icon-protect.svg",
    title: "Засоби індивідуального захисту",
    links: PROTECT_LINKS,
    panelItems: PROTECT_CAROUSEL.map((c) => c.label),
    carousel: PROTECT_CAROUSEL,
    facet: { title: "Промислові ризики та галузі", options: PROTECT_INDUSTRIES },
    productFilters: PROTECT_LINKS,
  },
  {
    href: "/cleaning",
    slug: "cleaning",
    icon: "/figma-export/catalog/icon-cleaning.svg",
    title: "Засоби та інвентар для прибирання",
    links: CLEANING_LINKS,
    panelItems: CLEANING_CAROUSEL.map((c) => c.label),
    carousel: CLEANING_CAROUSEL,
    facet: { title: "Зони Клінінгу", options: CLEANING_ZONES },
    productFilters: CLEANING_LINKS,
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

// Every subcategory label that belongs to a direction (menu links +
// panel taxonomy + the hotels-only extra used by the Figma filter
// example) — the direction page filters products against this set.
export function directionSubcategorySet(d: CatalogDirection): Set<string> {
  const extra = d.slug === "hotels" ? ["Косметика в малій упаковці"] : [];
  return new Set([
    ...d.links,
    ...d.panelItems,
    ...d.carousel.map((c) => c.label),
    ...d.facet.options,
    ...extra,
  ]);
}

export type Product = {
  id: string;
  title: string;
  image: string;
  volume: string;
  brand: string;
  subcategory: string;
  // Price in UAH; rendered as «31,65 ₴» via formatPrice below.
  price: number;
  available: boolean;
};

// Filterable placeholder attributes. The manufacturer list is verbatim
// from the filters drawer («Фільтри :: Готель», 3685:53460) — real
// hotel-cosmetics suppliers, including the «Allegrini» the
// filters-applied frame shows in its chip. «Косметика в малій
// упаковці» is that frame's subcategory example, so it must exist in
// the data too. Subcategories otherwise cycle through every mega-menu
// link and taxonomy label, so any deep-link lands on a non-empty
// result.
export const BRANDS = [
  "ALDA hotel cosmetics",
  "Allegrini",
  "MARIE DANIELLE",
  "Papoutsanis",
  "S&R",
] as const;

export const SUBCATEGORIES: string[] = [
  ...new Set([
    "Косметика в малій упаковці",
    ...CATALOG_DIRECTIONS.flatMap((d) => d.links),
    ...CATALOG_DIRECTIONS.flatMap((d) => d.panelItems),
    ...CATALOG_DIRECTIONS.flatMap((d) => d.carousel.map((c) => c.label)),
    ...CATALOG_DIRECTIONS.flatMap((d) => d.facet.options),
  ]),
];

// Placeholder distribution: the first TAXONOMY×BRANDS block covers
// every (category, manufacturer) pair exactly once, so a category page
// never dead-ends on a brand checkbox from the filters drawer; the
// remaining products cycle the menu/zone labels so their deep-links
// stay non-empty too.
const TAXONOMY_SUBS: string[] = [
  ...new Set(CATALOG_DIRECTIONS.flatMap((d) => d.carousel.map((c) => c.label))),
];
const OTHER_SUBS: string[] = SUBCATEGORIES.filter(
  (s) => !TAXONOMY_SUBS.includes(s),
);
const FULL_COVERAGE = TAXONOMY_SUBS.length * BRANDS.length;

export const PRODUCTS: Product[] = Array.from({ length: 132 }, (_, i) => {
  const covered = i < FULL_COVERAGE;
  const j = i - FULL_COVERAGE;
  return {
    id: `shampoo-${i + 1}`,
    title: "Шампунь для волосся і тіла",
    image: "/figma-export/catalog/product-shampoo.png",
    volume: "40 мл",
    brand: covered
      ? BRANDS[Math.floor(i / TAXONOMY_SUBS.length) % BRANDS.length]
      : BRANDS[j % BRANDS.length],
    subcategory: covered
      ? TAXONOMY_SUBS[i % TAXONOMY_SUBS.length]
      : OTHER_SUBS[j % OTHER_SUBS.length],
    price: 31.65,
    available: true,
  };
});

export const SORT_OPTIONS = [
  "за популярністю",
  "за назвою",
  "за ціною",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

// «Кількість товарів на сторінці» — the Figma control shows 20.
export const PAGE_SIZES = [20, 40, 60] as const;

// 31.65 -> «31,65 ₴» (comma decimal, non-breaking space before ₴).
export function formatPrice(price: number): string {
  return `${price.toFixed(2).replace(".", ",")} ₴`;
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
