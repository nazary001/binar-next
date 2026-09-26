// «Матеріали» content — Figma section «Матеріали B2C» (4635:33058):
// the landing (4634:63597) lists the material categories as folder
// cards, a category page (4634:64897) lists its files. Everything here
// is placeholder data until the CMS feeds the real library; the shapes
// mirror what the masters show (name with extension, size, a short
// description for the preview panel, a lock for files that need an
// account).

export type FileType = "pdf" | "doc" | "ppt" | "url" | "png";

// Filter vocabularies of the drawer (4635:33009): the three site
// directions and the five document types.
export const DIRECTIONS = [
  "Усе для готелів",
  "Засоби індивідуального захисту",
  "Засоби та інвентар для прибирання",
] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const FILE_TYPE_LABELS: { value: FileType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "DOC" },
  { value: "ppt", label: "Презентація" },
  { value: "url", label: "Посилання" },
  { value: "png", label: "Фото" },
];

export type MaterialCategory = {
  slug: string;
  title: string;
};

export type MaterialFile = {
  id: string;
  category: string;
  name: string;
  type: FileType;
  // Shown as «Розмір: 14 MB» verbatim from the feed.
  size: string;
  description: string;
  directions: Direction[];
  // «Завантажити після авторизації.» — the download needs an account.
  locked?: boolean;
  // Download target (a placeholder document until the real files land);
  // `url` files open their link instead.
  href: string;
};

export const CATEGORIES: MaterialCategory[] = [
  { slug: "catalogs", title: "Каталоги" },
  { slug: "certificates", title: "Сертифікати" },
  { slug: "presentations", title: "Презентації" },
  { slug: "tech-cards", title: "Технічні карти" },
  { slug: "instructions", title: "Інструкції" },
  { slug: "price-lists", title: "Прайс-листи" },
  { slug: "brand", title: "Брендбук та логотипи" },
];

const PLACEHOLDER_PDF = "/figma-export/materials/placeholder.pdf";
const PLACEHOLDER_IMAGE = "/figma-export/materials/preview-doc.png";

const HOTELS: Direction = "Усе для готелів";
const PROTECT: Direction = "Засоби індивідуального захисту";
const CLEANING: Direction = "Засоби та інвентар для прибирання";

function file(
  id: string,
  category: string,
  name: string,
  type: FileType,
  directions: Direction[],
  description: string,
  extra: Partial<Pick<MaterialFile, "size" | "locked" | "href">> = {},
): MaterialFile {
  return {
    id,
    category,
    name,
    type,
    directions,
    description,
    size: extra.size ?? "14 MB",
    locked: extra.locked,
    href:
      extra.href ??
      (type === "url"
        ? "https://binar-2000.com"
        : type === "png"
          ? PLACEHOLDER_IMAGE
          : PLACEHOLDER_PDF),
  };
}

// The nine catalog files are the master's list (4634:65131), in its
// order; the other categories follow the same pattern.
export const FILES: MaterialFile[] = [
  file("cat-1", "catalogs", "Каталог Leoniti 2026.pdf", "pdf", [HOTELS],
    "Каталог продукції Leoniti за 2026 рік з актуальним асортиментом, характеристиками товарів та основною інформацією для вибору продукції."),
  file("cat-2", "catalogs", "Leoniti Marketing Plan 2026.ppt", "ppt", [HOTELS],
    "Маркетинговий план Leoniti на 2026 рік: сезонні активності, рекламні матеріали та рекомендації для партнерів."),
  file("cat-3", "catalogs", "Leoniti Website Link 2026.url", "url", [HOTELS],
    "Посилання на офіційний сайт Leoniti з повним каталогом, новинками та контактами представництва."),
  file("cat-4", "catalogs", "Leoniti Product Overview 2026.doc", "doc", [HOTELS, CLEANING],
    "Огляд лінійок продукції Leoniti: призначення, формати пакування та ключові переваги кожної серії."),
  file("cat-5", "catalogs", "Leoniti Presentation Slides 2026.ppt", "ppt", [HOTELS],
    "Презентація бренду Leoniti для зустрічей із замовниками: історія, асортимент, кейси впровадження."),
  file("cat-6", "catalogs", "Leoniti Technical Manual 2026.doc", "doc", [HOTELS, PROTECT],
    "Технічний посібник Leoniti: склад продукції, умови зберігання, рекомендації щодо застосування."),
  file("cat-7", "catalogs", "Leoniti Logo Set 2026.png", "png", [HOTELS],
    "Набір логотипів Leoniti у форматі PNG для друкованих та цифрових матеріалів."),
  file("cat-8", "catalogs", "Leoniti Design Specs 2026.pdf", "pdf", [HOTELS],
    "Специфікації дизайну пакування Leoniti: розміри, кольори, розташування елементів брендування."),
  file("cat-9", "catalogs", "Leoniti Sales Report 2026.pdf", "pdf", [HOTELS],
    "Звіт з продажів Leoniti за 2026 рік для партнерів: динаміка попиту та найпопулярніші позиції.", { locked: true }),

  file("cert-1", "certificates", "Сертифікат відповідності ЗІЗ 2026.pdf", "pdf", [PROTECT],
    "Сертифікат відповідності засобів індивідуального захисту вимогам технічних регламентів України."),
  file("cert-2", "certificates", "Висновок СЕС на мийні засоби.pdf", "pdf", [CLEANING],
    "Висновок державної санітарно-епідеміологічної експертизи на професійні мийні засоби."),
  file("cert-3", "certificates", "Сертифікат ISO 9001 Binar 2000.pdf", "pdf", [HOTELS, PROTECT, CLEANING],
    "Сертифікат системи управління якістю ISO 9001 компанії Binar 2000."),
  file("cert-4", "certificates", "Декларація виробника Leoniti.doc", "doc", [HOTELS],
    "Декларація виробника про відповідність готельної косметики Leoniti."),
  file("cert-5", "certificates", "Реєстр сертифікатів 2026.pdf", "pdf", [HOTELS, PROTECT, CLEANING],
    "Зведений реєстр чинних сертифікатів та висновків на продукцію Binar 2000.", { locked: true }),

  file("pres-1", "presentations", "Binar 2000 Company Profile.ppt", "ppt", [HOTELS, PROTECT, CLEANING],
    "Презентація компанії Binar 2000: напрями роботи, виробництво, логістика та сервіс для партнерів."),
  file("pres-2", "presentations", "Готельний текстиль 2026.ppt", "ppt", [HOTELS],
    "Презентація колекцій готельного текстилю 2026 року з варіантами кастомізації під бренд готелю."),
  file("pres-3", "presentations", "Рішення для клінінгу.ppt", "ppt", [CLEANING],
    "Презентація професійних рішень для прибирання: хімія, інвентар, обладнання."),

  file("tech-1", "tech-cards", "Технічна карта: шампунь Leoniti 40 мл.pdf", "pdf", [HOTELS],
    "Технічна карта шампуню для волосся і тіла Leoniti: склад, показники, пакування."),
  file("tech-2", "tech-cards", "Технічна карта: рукавички нітрилові.pdf", "pdf", [PROTECT],
    "Технічна карта нітрилових рукавичок: розміри, товщина, стійкість до хімікатів."),
  file("tech-3", "tech-cards", "Технічна карта: засіб для скла.pdf", "pdf", [CLEANING],
    "Технічна карта професійного засобу для миття скла та дзеркал."),
  file("tech-4", "tech-cards", "Технічна карта: халат махровий.doc", "doc", [HOTELS],
    "Технічна карта махрового халата: щільність, склад тканини, догляд."),

  file("ins-1", "instructions", "Інструкція з дозування хімії.pdf", "pdf", [CLEANING],
    "Інструкція з дозування професійної хімії для щоденного та генерального прибирання."),
  file("ins-2", "instructions", "Інструкція з використання ЗІЗ.pdf", "pdf", [PROTECT],
    "Правила застосування та зберігання засобів індивідуального захисту."),
  file("ins-3", "instructions", "Догляд за готельним текстилем.doc", "doc", [HOTELS],
    "Рекомендації з прання та догляду за готельним текстилем для збереження зовнішнього вигляду."),
  file("ins-4", "instructions", "Відеоінструкція: прибирання номера.url", "url", [HOTELS, CLEANING],
    "Посилання на відеоінструкцію зі стандарту прибирання готельного номера."),

  file("price-1", "price-lists", "Прайс-лист: готелі 2026.pdf", "pdf", [HOTELS],
    "Актуальний прайс-лист на готельну косметику, текстиль та аксесуари.", { locked: true }),
  file("price-2", "price-lists", "Прайс-лист: ЗІЗ 2026.pdf", "pdf", [PROTECT],
    "Актуальний прайс-лист на засоби індивідуального захисту.", { locked: true }),
  file("price-3", "price-lists", "Прайс-лист: клінінг 2026.pdf", "pdf", [CLEANING],
    "Актуальний прайс-лист на засоби та інвентар для прибирання.", { locked: true }),

  file("brand-1", "brand", "Брендбук Binar 2000.pdf", "pdf", [HOTELS, PROTECT, CLEANING],
    "Брендбук Binar 2000: логотип, кольори, типографіка та правила використання фірмового стилю."),
  file("brand-2", "brand", "Логотипи Binar 2000.png", "png", [HOTELS, PROTECT, CLEANING],
    "Набір логотипів Binar 2000 у форматі PNG на прозорому фоні."),
  file("brand-3", "brand", "Шаблон презентації Binar 2000.ppt", "ppt", [HOTELS, PROTECT, CLEANING],
    "Фірмовий шаблон презентації для партнерів та відділу продажів."),
];

export function findCategory(slug: string): MaterialCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function filesOf(category: string): MaterialFile[] {
  return FILES.filter((f) => f.category === category);
}

// Ukrainian plural for «файл»: 1 файл / 2-4 файли / 5+ файлів (with
// the 11-14 exception). The master's «3 файлів» is a placeholder slip.
export function filesCount(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "файл"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "файли"
        : "файлів";
  return `${n} ${word}`;
}

export type MaterialsFilters = {
  directions: Direction[];
  types: FileType[];
};

export const EMPTY_FILTERS: MaterialsFilters = { directions: [], types: [] };

export function matchesFilters(f: MaterialFile, filters: MaterialsFilters): boolean {
  if (filters.directions.length && !filters.directions.some((d) => f.directions.includes(d))) {
    return false;
  }
  if (filters.types.length && !filters.types.includes(f.type)) return false;
  return true;
}

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || text.toLowerCase().includes(q);
}
