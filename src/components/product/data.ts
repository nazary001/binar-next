// Product-page content for the placeholder catalog — Figma «PDP B2C»
// section (4329:51336). Every text below is verbatim from the masters
// where the designer typed real copy (description, benefits, delivery
// and scent tables, the «Купують разом» cards); the characteristics
// table and the left column of the delivery tables were left as «Cell»
// placeholders in Figma, so those labels are sensible stand-ins until
// the product feed lands.
import { PRODUCTS, type Product } from "@/components/catalog/data";

const IMG = "/figma-export/product/";

// The photo the hero shows for the placeholder shampoo — the same
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
  // sold-out shampoo (Figma «Альтернативна пропозиція», 4329:40408) —
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
];

export const ALL_PRODUCTS: Product[] = [...PRODUCTS, ...EXTRA_PRODUCTS];

export function findProduct(id: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id);
}

export type SpecRow = { label: string; value: string };

export type ProductDetails = {
  sku: string;
  description: string;
  benefits: string[];
  // «Характеристики» tab — label / value rows.
  characteristics: SpecRow[];
  // «Доставка та оплата» tab — two tables.
  payment: SpecRow[];
  delivery: SpecRow[];
  // «Піраміда запаху» tab.
  scent: { intro: string; top: string; middle: string; base: string };
  // Hero gallery: one image = the single 627-px photo (4329:51358);
  // several = the main 627×413 photo over a row of three thumbnails
  // («Галерея», 4329:51496).
  images: string[];
  boughtTogether: { product: Product; benefits: string[] }[];
  series: Product[];
  similar: Product[];
};

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

export function benefitsOf(p: Product): string[] {
  return BENEFITS[p.id] ?? COSMETICS_BENEFITS;
}

// «УН-00005301» is the SKU on the master; the rest count on from it.
function skuOf(p: Product): string {
  const idx = ALL_PRODUCTS.findIndex((x) => x.id === p.id);
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

// Figma 4329:51876 — the right column is verbatim; the left labels
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

// Figma 4329:52093.
const SCENT = {
  intro:
    "Легка та освіжаюча композиція з цитрусовими нотами та м'яким деревним шлейфом.",
  top: "Бергамот, Зелений чай, М'ята, Лимон",
  middle: "Лаванда, Жасмин, Троянда",
  base: "Кедр, Мускус, Сандал, Ваніль",
};

const TEXTILE_SCENT = {
  intro:
    "Текстиль без ароматизації — нейтральний запах чистої бавовни після прання.",
  top: "Без ароматизації",
  middle: "Без ароматизації",
  base: "Без ароматизації",
};

const SERIES_LEAD = ["soap-1", "lotion-1", "conditioner-1"];
const TOGETHER_LEAD = ["slippers-1", "robe-1"];

function byIds(ids: string[]): Product[] {
  return ids.map(findProduct).filter((p): p is Product => Boolean(p));
}

export function getProductDetails(product: Product): ProductDetails {
  const sku = skuOf(product);
  const kind = kindOf(product);
  const isShampoo = product.id.startsWith("shampoo-");
  const shampooIndex = isShampoo ? Number(product.id.slice("shampoo-".length)) : NaN;

  // Even-numbered placeholder shampoos open with the four-image gallery
  // (the Botanica set); the first one keeps the single master photo.
  const images =
    isShampoo && shampooIndex % 2 === 0
      ? [
          HERO_SHAMPOO,
          `${IMG}series-soap.jpg`,
          `${IMG}series-lotion.jpg`,
          `${IMG}series-conditioner.jpg`,
        ]
      : [isShampoo ? HERO_SHAMPOO : product.image];

  // Same-brand siblings fill the series grid; sale items stay out of it
  // (the master's «З цієї серії» cards carry no «-25%» chip).
  const sameBrand = PRODUCTS.filter(
    (p) =>
      p.id !== product.id && p.brand === product.brand && p.available && !p.oldPrice,
  );
  const series = [
    ...byIds(SERIES_LEAD).filter((p) => p.id !== product.id),
    ...(sameBrand.length ? sameBrand : PRODUCTS.filter((p) => p.available)),
  ].slice(0, 8);

  const together = byIds(
    TOGETHER_LEAD.includes(product.id)
      ? [...TOGETHER_LEAD.filter((id) => id !== product.id), "shampoo-1"]
      : TOGETHER_LEAD,
  );

  const sameSub = PRODUCTS.filter(
    (p) => p.id !== product.id && p.available && p.subcategory === product.subcategory,
  );
  const similar = (sameSub.length >= 4 ? sameSub : PRODUCTS.filter((p) => p.available)).slice(
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
    scent: kind === "textile" ? TEXTILE_SCENT : SCENT,
    images,
    boughtTogether: together.map((p) => ({ product: p, benefits: benefitsOf(p) })),
    series,
    similar,
  };
}
