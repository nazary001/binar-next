import "server-only";
import { BRANDS, CATALOG_DIRECTIONS, type Product } from "@/components/catalog/data";
import type { SpecRow } from "@/components/product/data";
import type { ProductDetailsDoc } from "../../db/collections";

// The placeholder catalog that used to ship in the browser bundle
// (components/catalog/data.ts PRODUCTS and components/product/data.ts
// EXTRA_PRODUCTS + getProductDetails), moved here verbatim so the seed
// writes exactly the products and product pages the site showed before.
// Only src/server/seed/catalog.ts reads this module.
//
// Figma sources: "Katalog :: B2C" 4329:39002 (the master B2C card
// repeated with the same product), "PDP B2C" 4329:51336 (the product page
// copy).

// --- listing products (132) ---------------------------------------------------

// Every category label (the 18 carousel cards of the three directions).
const TAXONOMY_SUBS: string[] = [
  ...new Set(CATALOG_DIRECTIONS.flatMap((d) => d.carousel.map((c) => c.label))),
];

// Placeholder distribution. Product i sits in category c = i mod 18
// (round r = floor(i / 18)), so every category page holds 7-8 items.
// The first 90 cover every (category, manufacturer) pair once (brand =
// round), the rest cycle the manufacturers. Inside a category the
// rounds walk the direction's zones (r + c) and product types (3r + c),
// so each zone / type / brand checkbox of a category page finds
// something and the Figma example «Косметика в малій упаковці» +
// «Allegrini» (4329:39587) matches shampoo-20.
const FULL_COVERAGE = TAXONOMY_SUBS.length * BRANDS.length;

export const LISTING_PRODUCTS: Product[] = Array.from({ length: 132 }, (_, i) => {
  const c = i % TAXONOMY_SUBS.length;
  const r = Math.floor(i / TAXONOMY_SUBS.length);
  const subcategory = TAXONOMY_SUBS[c];
  const dir = CATALOG_DIRECTIONS.find((d) => d.carousel.some((card) => card.label === subcategory));
  const zones = dir?.facet.options ?? [];
  const types = dir?.productFilters ?? [];
  return {
    id: `shampoo-${i + 1}`,
    title: "Шампунь для волосся і тіла",
    image: "/figma-export/catalog/product-shampoo.png",
    volume: "40 мл",
    brand:
      i < FULL_COVERAGE
        ? BRANDS[r % BRANDS.length]
        : BRANDS[(i - FULL_COVERAGE) % BRANDS.length],
    subcategory,
    zone: zones.length ? zones[(r + c) % zones.length] : undefined,
    productType: types.length ? types[(3 * r + c) % types.length] : undefined,
    price: 31.65,
    retailPrice: 36,
    partnerPrice: 28.99,
    available: true,
  };
});

// Mock storefront states for the product page (Figma «PDP B2C» section
// 4329:51336): the second placeholder carries a promotional price
// («Ціна з пропозицією», 4329:51621), the third is out of stock («Немає
// в наявності», 4329:51763). The catalog card already renders both.
// The master's literals are 24,50 / 31,65 / «-25%» (the designer's
// rounding - the prices compute to 22.6 %), so the label is pinned.
LISTING_PRODUCTS[1] = { ...LISTING_PRODUCTS[1], price: 24.5, oldPrice: 31.65, discount: 25, fxPrice: true };
LISTING_PRODUCTS[2] = { ...LISTING_PRODUCTS[2], available: false, preorder: true };
// The B2B «Напрям» frame (4329:56219) shows the fourth card «Під
// замовлення» too.
LISTING_PRODUCTS[3] = { ...LISTING_PRODUCTS[3], preorder: true };

// --- products with a page but no listing (8) ----------------------------------

const IMG = "/figma-export/product/";

// The photo the hero shows for the placeholder shampoo - the same
// four-piece Botanica shot as the catalog card, exported from the
// 627-px PDP box at 2x.
const HERO_SHAMPOO = `${IMG}hero-shampoo.jpg`;

// Products that exist only on the product page: the two textile cards
// of «Купують разом» (4329:51395 / 4329:51425) and the three Botanica
// items opening the «З цієї серії» grid (4329:51459 / 51461 / 51463).
// Photos are the Figma exports pre-cropped to the master's zoom.
export const EXTRA_PRODUCTS: Product[] = [
  {
    id: "slippers-1",
    title: "Тапочки готельні",
    image: `${IMG}together-slippers.jpg`,
    volume: "1 пара",
    brand: "Binar",
    chips: ["Бавовна", "Кастомізація"],
    subcategory: "Готельні тапочки",
    price: 120.05,
    available: true,
    // The B2B band (4329:56686) draws this card with «ціна залежить від
    // курсу»; its partner price is the list price there.
    fxPrice: true,
    partnerPrice: 120.05,
  },
  {
    id: "robe-1",
    title: "Халат",
    image: `${IMG}together-robe.jpg`,
    volume: "1 шт",
    brand: "Binar",
    chips: ["Бавовна", "Кастомізація"],
    subcategory: "Готельний текстиль",
    price: 120.05,
    available: true,
    // The B2B band (4329:56720) prints «ваша ціна 120,05 ₴» on this card
    // too (not the derived 0.916 x list = 109,97).
    partnerPrice: 120.05,
  },
  {
    id: "soap-1",
    title: "Мило для рук",
    image: `${IMG}series-soap.jpg`,
    volume: "40 мл",
    brand: "Botanica",
    subcategory: "Готельна косметика",
    price: 31.65,
    available: true,
  },
  {
    id: "lotion-1",
    title: "Лосьйон для тіла",
    image: `${IMG}series-lotion.jpg`,
    volume: "40 мл",
    brand: "Botanica",
    subcategory: "Готельна косметика",
    price: 31.65,
    available: true,
  },
  {
    id: "conditioner-1",
    title: "Кондиціонер для волосся",
    image: `${IMG}series-conditioner.jpg`,
    volume: "40 мл",
    brand: "Botanica",
    subcategory: "Готельна косметика",
    price: 31.65,
    available: true,
  },
  // The in-stock alternative the cart's stock modal proposes for a
  // sold-out shampoo (Figma «Альтернативна пропозиція», 4329:40408) -
  // the designer's second shampoo photo, band-cropped to the 60-px thumb.
  {
    id: "shampoo-alt-1",
    title: "Шампунь для волосся і тіла",
    image: "/figma-export/cart/alt-shampoo.jpg",
    volume: "40 мл",
    brand: "Botanica",
    subcategory: "Готельна косметика",
    price: 31.65,
    available: true,
  },
  // Mock state «Піраміда запаху :: ноти в два рядки» (4329:52228): the
  // same Botanica shampoo with the master's long note lists, so the
  // scent tab shows the 96-px two-line rows. Reached by URL only
  // (productHref = /catalog/hotels/<Готельна косметика card>/shampoo-long-notes).
  {
    id: "shampoo-long-notes",
    title: "Шампунь для волосся і тіла",
    image: "/figma-export/catalog/product-shampoo.png",
    volume: "40 мл",
    brand: "Botanica",
    subcategory: "Готельна косметика",
    price: 31.65,
    available: true,
  },
  // A third sold-out line for the cart's stock modal: the master draws
  // «3 з 3» (4329:40304) and the catalog mock has only two lines the
  // stock rule flags (the «-25%» shampoo-2 and the unavailable
  // shampoo-3). URL only; its product page is a sold-out PDP too.
  {
    id: "shampoo-sold-out",
    title: "Шампунь для волосся і тіла",
    image: "/figma-export/catalog/product-shampoo.png",
    volume: "40 мл",
    brand: "Botanica",
    subcategory: "Готельна косметика",
    price: 31.65,
    available: false,
  },
];

// Listing products first, in listing order, then the extras: the order the
// seed gives `sort` and the one the SKUs count along.
export const SEED_PRODUCTS: Product[] = [...LISTING_PRODUCTS, ...EXTRA_PRODUCTS];

function findSeedProduct(id: string): Product | undefined {
  return SEED_PRODUCTS.find((p) => p.id === id);
}

// --- product page content -----------------------------------------------------
//
// Every text below is verbatim from the masters where the designer typed
// real copy (description, benefits, delivery and scent tables, the
// «Купують разом» cards); the characteristics table and the left column
// of the delivery tables were left as «Cell» placeholders in Figma, so
// those labels are sensible stand-ins until the product feed lands.

type Kind = "cosmetics" | "textile";

function kindOf(p: Product): Kind {
  return p.id === "slippers-1" || p.id === "robe-1" ? "textile" : "cosmetics";
}

// Figma 4329:51387 (the Botanica shampoo copy) plus short stand-ins for
// the other placeholder items.
const DESCRIPTIONS: Record<string, string> = {
  "soap-1":
    "Мило для рук Botanica у компактній індивідуальній упаковці для готельних номерів. Делікатна формула м'яко очищає шкіру, не пересушуючи її, і залишає легкий свіжий аромат.",
  "lotion-1":
    "Лосьйон для тіла Botanica зволожує та пом'якшує шкіру після душу. Легка текстура швидко вбирається, а компактна туба зручна для індивідуального використання гостями.",
  "conditioner-1":
    "Кондиціонер для волосся Botanica полегшує розчісування та надає волоссю м'якості й блиску. Створений для щоденного використання в готелях, апартаментах та СПА.",
  "slippers-1":
    "Готельні тапочки з м'якої бавовняної махри з нековзною підошвою. Підходять для номерів, СПА-зон та басейнів, можливе брендування логотипом готелю.",
  "robe-1":
    "Махровий халат зі 100% бавовни для готелів та СПА. М'який, добре вбирає вологу та зберігає форму після багаторазового прання; можливе брендування.",
};

const SHAMPOO_DESCRIPTION =
  "Шампунь для волосся і тіла Botanica створений для щоденного використання в готелях, апартаментах та інших закладах гостинності. М'яка формула ефективно очищає волосся і шкіру, залишаючи приємне відчуття свіжості, а компактний формат ідеально підходить для індивідуального використання.";

// Figma 4329:51389 (the description tab) and the two «Купують разом»
// cards (4329:51410 / 4329:51440).
const BENEFITS: Record<string, string[]> = {
  "slippers-1": [
    "Мʼякі та приємні на дотик",
    "Можливість брендування",
    "Підходять для SPA та басейну",
  ],
  "robe-1": [
    "Мʼякий та приємний до тіла",
    "Комфортний крій",
    "Підходять для SPA та басейну",
  ],
};

const COSMETICS_BENEFITS = [
  "Дбайливе очищення волосся та шкіри.",
  "Приємний свіжий аромат.",
  "Підходить для щоденного використання.",
  "Компактний формат для готельних номерів.",
];

function benefitsOf(p: Product): string[] {
  return BENEFITS[p.id] ?? COSMETICS_BENEFITS;
}

// «УН-00005301» is the SKU on the master; the rest count on from it (in
// SEED_PRODUCTS order, which is what the site always used).
function skuOf(p: Product): string {
  const idx = SEED_PRODUCTS.findIndex((x) => x.id === p.id);
  return `УН-${String(5301 + Math.max(0, idx)).padStart(8, "0")}`;
}

function characteristicsOf(p: Product, sku: string): SpecRow[] {
  if (kindOf(p) === "textile") {
    return [
      { label: "Бренд", value: p.brand },
      { label: "Матеріал", value: "100% бавовна" },
      { label: "Тип продукту", value: p.title },
      { label: "Призначення", value: "Готелі, СПА, басейни" },
      { label: "Розмір", value: "Універсальний" },
      { label: "Колір", value: "Білий" },
      { label: "Брендування", value: "Вишивка логотипу" },
      { label: "Кількість в ящику", value: "100 шт" },
      { label: "Догляд", value: "Прання до 60 °C" },
      { label: "Артикул", value: sku },
    ];
  }
  return [
    { label: "Бренд", value: p.brand },
    { label: "Об'єм", value: p.volume },
    { label: "Тип продукту", value: p.title },
    { label: "Призначення", value: "Готелі, апартаменти, СПА" },
    { label: "Формат", value: "Індивідуальна упаковка" },
    { label: "Аромат", value: "Цитрусово-деревний" },
    { label: "Кількість в ящику", value: "500 шт" },
    { label: "Країна виробництва", value: "Україна" },
    { label: "Термін придатності", value: "36 місяців" },
    { label: "Артикул", value: sku },
  ];
}

// Figma 4329:51876 - the right column is verbatim; the left labels
// were «Cell» placeholders.
const PAYMENT: SpecRow[] = [
  {
    label: "Онлайн-оплата",
    value: "Visa, Mastercard під час оформлення замовлення.",
  },
  {
    label: "Безготівковий розрахунок",
    value: "Оплата за рахунком для фізичних та юридичних осіб.",
  },
  {
    label: "Післяплата",
    value:
      "Доступна для замовлень, що доставляються службою Нова Пошта (за умовами перевізника).",
  },
];

const DELIVERY: SpecRow[] = [
  {
    label: "Нова Пошта",
    value: "Доставка до відділення або кур'єром по всій Україні.",
  },
  {
    label: "Самовивіз",
    value: "Доступний зі складу компанії після підтвердження замовлення.",
  },
  {
    label: "Термін доставки",
    value: "Від 1 до 3 робочих днів для товарів у наявності.",
  },
];

type Scent = ProductDetailsDoc["scent"];

// Figma 4329:52093.
const SCENT: Scent = {
  intro:
    "Легка та освіжаюча композиція з цитрусовими нотами та м'яким деревним шлейфом.",
  top: "Бергамот, Зелений чай, М'ята, Лимон",
  middle: "Лаванда, Жасмин, Троянда",
  base: "Кедр, Мускус, Сандал, Ваніль",
};

const TEXTILE_SCENT: Scent = {
  intro:
    "Текстиль без ароматизації — нейтральний запах чистої бавовни після прання.",
  top: "Без ароматизації",
  middle: "Без ароматизації",
  base: "Без ароматизації",
};

// Figma 4329:52276 - the master's long note lists (each wraps to two
// lines in the 428-px notes slot).
const LONG_SCENT: Scent = {
  intro: SCENT.intro,
  top: "Бергамот, Зелений чай, М'ята, Лимон, Бергамот, Зелений чай, М'ята, Лимон",
  middle:
    "Лаванда, Жасмин, Троянда, Лаванда, Жасмин, Троянда, Лаванда, Жасмин, Троянда",
  base: "Кедр, Мускус, Сандал, Ваніль, Кедр, Мускус, Сандал, Ваніль",
};

const SCENT_BY_ID: Record<string, Scent> = {
  "shampoo-long-notes": LONG_SCENT,
};

const SERIES_LEAD = ["soap-1", "lotion-1", "conditioner-1"];
const TOGETHER_LEAD = ["slippers-1", "robe-1"];

function byIds(ids: string[]): Product[] {
  return ids.map(findSeedProduct).filter((p): p is Product => Boolean(p));
}

// The product page content of one product, related products as ids (the
// repository resolves them when the page is rendered). The rules are the
// ones getProductDetails applied in the browser before.
export function productDetailsDoc(product: Product): ProductDetailsDoc {
  const sku = skuOf(product);
  const kind = kindOf(product);
  const isShampoo = product.id.startsWith("shampoo-");
  const shampooIndex = isShampoo ? Number(product.id.slice("shampoo-".length)) : NaN;

  // Even-numbered placeholder shampoos open with the four-image gallery
  // (the Botanica set, «Опис :: Галерея» 4329:51475); the first one keeps
  // the single master photo. The promo mock (shampoo-2) is the one
  // product both skins draw: the shop's «Ціна з пропозицією» (4329:51621)
  // puts the sale chip on a single 627x627 photo, while the partner page,
  // which has no sale, shows its gallery («Галерея + ціна залежить від
  // курсу», 4329:57538) - so a sale item keeps the single photo in the
  // shop only.
  const gallery = [
    HERO_SHAMPOO,
    `${IMG}series-soap.jpg`,
    `${IMG}series-lotion.jpg`,
    `${IMG}series-conditioner.jpg`,
  ];
  const single = [isShampoo ? HERO_SHAMPOO : product.image];
  const evenShampoo = isShampoo && shampooIndex % 2 === 0;
  const images = evenShampoo && product.oldPrice === undefined ? gallery : single;
  const platformImages = evenShampoo ? gallery : single;

  // Same-brand siblings fill the series grid; sale items stay out of it
  // (the master's «З цієї серії» cards carry no «-25%» chip).
  const sameBrand = LISTING_PRODUCTS.filter(
    (p) =>
      p.id !== product.id && p.brand === product.brand && p.available && !p.oldPrice,
  );
  const series = [
    ...byIds(SERIES_LEAD).filter((p) => p.id !== product.id),
    ...(sameBrand.length ? sameBrand : LISTING_PRODUCTS.filter((p) => p.available)),
  ].slice(0, 8);

  const together = byIds(
    TOGETHER_LEAD.includes(product.id)
      ? [...TOGETHER_LEAD.filter((id) => id !== product.id), "shampoo-1"]
      : TOGETHER_LEAD,
  );

  const sameSub = LISTING_PRODUCTS.filter(
    (p) => p.id !== product.id && p.available && p.subcategory === product.subcategory,
  );
  const similar = (sameSub.length >= 4 ? sameSub : LISTING_PRODUCTS.filter((p) => p.available)).slice(
    0,
    4,
  );

  return {
    sku,
    description: DESCRIPTIONS[product.id] ?? SHAMPOO_DESCRIPTION,
    benefits: benefitsOf(product),
    characteristics: characteristicsOf(product, sku),
    payment: PAYMENT,
    delivery: DELIVERY,
    scent: SCENT_BY_ID[product.id] ?? (kind === "textile" ? TEXTILE_SCENT : SCENT),
    images,
    platformImages,
    boughtTogether: together.map((p) => ({ productId: p.id, benefits: benefitsOf(p) })),
    seriesIds: series.map((p) => p.id),
    similarIds: similar.map((p) => p.id),
  };
}
