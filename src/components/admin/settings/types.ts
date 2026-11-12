// The plain settings of the site as the panel's settings screen sees them
// (GET / PUT /api/admin/settings/**). Types and plain constants only: read
// by the routes and by the screens. The groups of the integrations (Nova
// Poshta, BAS, mail) are not here: they hold sealed secrets and have their
// own routes under /api/admin/integrations.
//
// The shapes mirror the zod schemas of src/server/admin/settings.ts (the
// settings route checks at compile time that they still agree).

export type PlainSettingsKey = "general" | "shop" | "blog" | "catalog";

export const PLAIN_SETTINGS_KEYS: readonly PlainSettingsKey[] = ["general", "shop", "blog", "catalog"];

export type GeneralSettings = {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  workHours: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  leadsInbox: string;
  ordersInbox: string[];
};

export type ShopSettings = {
  freeDeliveryLimit: number;
  stockThreshold: number;
  stockDisplayMax: number;
  paymentTermDays: number;
  returnWindowDays: number;
  leadTimeBufferDays: number;
};

export type BlogSettings = {
  categories: string[];
  defaultAuthor: string;
};

// Per catalog category, keyed "<direction>/<category>" (edited on the
// categories screen, not on the settings screen).
export type CatalogCategorySettings = {
  externalId: string | null;
  stockThreshold: number | null;
  note: string;
};

export type CatalogSettings = {
  categories: Record<string, CatalogCategorySettings>;
  brands: string[];
  manufacturers: string[];
  countries: string[];
};

export type PlainSettings = {
  general: GeneralSettings;
  shop: ShopSettings;
  blog: BlogSettings;
  catalog: CatalogSettings;
};

// When a group was last saved and by whom (null = never saved: the values
// are the defaults).
export type SettingsMeta = {
  updatedAt: string | null;
  updatedBy: { id: string; name: string } | null;
};

// GET /api/admin/settings
export type SettingsAllResponse = {
  ok: true;
  settings: PlainSettings;
  meta: Record<PlainSettingsKey, SettingsMeta>;
};

// GET /api/admin/settings/<key>
export type SettingsGroupResponse<K extends PlainSettingsKey = PlainSettingsKey> = {
  ok: true;
  key: K;
  settings: PlainSettings[K];
  meta: SettingsMeta;
};

// One changed field of a save, as the journal records it.
export type SettingsChange = { field: string; from: unknown; to: unknown };

// PUT /api/admin/settings/<key> with the group as the body. Every field
// sent is checked; a field left out keeps its stored value. Answer: the
// group as stored (trimmed) and what changed (empty = nothing to save).
export type SettingsSaveResponse<K extends PlainSettingsKey = PlainSettingsKey> = {
  ok: true;
  key: K;
  settings: PlainSettings[K];
  meta: SettingsMeta;
  changed: SettingsChange[];
};

// Why a field was refused: 400 { ok: false, error: "fields", fields: {
// "<field>" | "<field>.<key>" | "<field>.<index>": SettingsFieldError } }.
export type SettingsFieldError =
  | "unknown" // the group has no such field
  | "type" // a number where text is expected, and so on
  | "too-long" // text or list longer than allowed
  | "too-short" // empty where a value is required
  | "too-big"
  | "too-small"
  | "format" // not an e-mail, a phone with letters, more than 2 decimals
  | "value" // not one of the allowed values
  | "key" // a per-category key that names no category of the catalog
  | "unknown-price-type" // no such price type
  | "invalid";

// --- what the settings screen renders ----------------------------------------------

export type SettingsFieldKind =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "money"
  | "days"
  | "emails"
  | "strings"
  | "priceType";

export type SettingsFieldDef = {
  key: string;
  label: string;
  hint: string;
  kind: SettingsFieldKind;
  // Where the value takes effect today (or that nothing reads it yet).
  usedBy: string;
  // The limits of the server's schema: text length, list size, number range.
  maxLength?: number;
  maxItems?: number;
  min?: number;
  max?: number;
};

export type SettingsGroupDef = {
  group: PlainSettingsKey;
  title: string;
  description: string;
  fields: SettingsFieldDef[];
};

// The texts below say where each value takes effect as of 2026-11-12
// (checked against the code that reads getSettings); a value nothing reads
// says so, as the panel's rule against dead controls asks.
const NOT_READ = "Збережено; сайт поки не використовує";
const FOR_BAS = "Збережено для обміну з BAS; сайт поки не використовує";
const IN_MAIL = "Підпис і контакти в листах, які надсилає сайт (коли в «Інтеграції - Пошта» підключено сервіс)";
const EDITOR_LISTS = "Редактор товарів пропонує ці значення разом із тими, що вже є в товарах. На вітрині не показуються.";

export const SETTINGS_FIELDS: SettingsGroupDef[] = [
  {
    group: "general",
    title: "Компанія",
    description: "Контакти компанії, менеджер для партнерів і адреси, на які надходять сповіщення.",
    fields: [
      {
        key: "companyName",
        label: "Назва компанії",
        hint: "Як компанія підписується в листах і сповіщеннях.",
        kind: "text",
        usedBy: `${IN_MAIL}. У шапці й підвалі сайту назва закладена в коді.`,
        maxLength: 200,
      },
      {
        key: "phone",
        label: "Телефон",
        hint: "Основний номер для клієнтів, у міжнародному форматі: +380 ...",
        kind: "phone",
        usedBy: `${IN_MAIL}. Телефон у підвалі сайту закладений у коді.`,
        maxLength: 64,
      },
      {
        key: "email",
        label: "Електронна пошта",
        hint: "Загальна адреса компанії.",
        kind: "email",
        usedBy: `${IN_MAIL}. Адреса в підвалі сайту закладена в коді.`,
        maxLength: 254,
      },
      {
        key: "address",
        label: "Адреса",
        hint: "Адреса офісу або складу, як її показувати клієнтам.",
        kind: "text",
        usedBy: `${IN_MAIL}. На сторінках сайту не показується.`,
        maxLength: 300,
      },
      {
        key: "workHours",
        label: "Графік роботи",
        hint: "Наприклад: Пн-Пт 9:00-18:00.",
        kind: "text",
        usedBy: `${NOT_READ}.`,
        maxLength: 200,
      },
      {
        key: "managerName",
        label: "Менеджер для партнерів: ім'я",
        hint: "Кого партнер бачить як свого менеджера.",
        kind: "text",
        usedBy: `${NOT_READ}: картка «Ваш менеджер» у кабінеті партнера закладена в коді.`,
        maxLength: 200,
      },
      {
        key: "managerPhone",
        label: "Менеджер для партнерів: телефон",
        hint: "Номер, за яким партнер дзвонить менеджеру.",
        kind: "phone",
        usedBy: `${NOT_READ}: картка «Ваш менеджер» у кабінеті партнера закладена в коді.`,
        maxLength: 64,
      },
      {
        key: "managerEmail",
        label: "Менеджер для партнерів: пошта",
        hint: "Адреса, на яку партнер пише менеджеру.",
        kind: "email",
        usedBy: `${NOT_READ}: картка «Ваш менеджер» у кабінеті партнера закладена в коді.`,
        maxLength: 254,
      },
      {
        key: "leadsInbox",
        label: "Пошта для заявок",
        hint: "Куди надходять сповіщення про заявки з форм сайту.",
        kind: "email",
        usedBy: `${NOT_READ}: сповіщення про заявку стає в чергу листів на адресу info@binar-2000.com, закладену в коді.`,
        maxLength: 254,
      },
      {
        key: "ordersInbox",
        label: "Пошта для нових замовлень",
        hint: "Одна або кілька адрес, куди надходять сповіщення про нові замовлення.",
        kind: "emails",
        usedBy: `${NOT_READ}: сповіщень про нові замовлення сайт поки не надсилає.`,
        maxLength: 254,
        maxItems: 10,
      },
    ],
  },
  {
    group: "shop",
    title: "Магазин",
    description:
      "Правила магазину: доставка, наявність, строки оплати й повернення. Яку ціну бачать гості і від якої рахуються ціни партнерів, задає роль типу цін у розділі «Типи цін».",
    fields: [
      {
        key: "freeDeliveryLimit",
        label: "Поріг безкоштовної доставки",
        hint: "Від якої суми кошика доставка безкоштовна, ₴.",
        kind: "money",
        usedBy: `${NOT_READ}: кошик рахує від порогу 5 000 ₴, закладеного в коді.`,
        min: 0,
        max: 100_000_000,
      },
      {
        key: "stockThreshold",
        label: "Поріг «є в наявності»",
        hint: "Більше цієї кількості - «є в наявності», менше - «закінчується», нуль - «під замовлення».",
        kind: "number",
        usedBy:
          "Панель: стан наявності в списку товарів, коли в категорії немає власного порогу. Вітрина поки показує наявність за позначками товару; залишки надходитимуть з BAS.",
        min: 0,
        max: 100_000,
      },
      {
        key: "stockDisplayMax",
        label: "Найбільший залишок, який бачить партнер",
        hint: "Більший залишок показується як «>1 000».",
        kind: "number",
        usedBy: `${FOR_BAS}.`,
        min: 0,
        max: 10_000_000,
      },
      {
        key: "paymentTermDays",
        label: "Термін оплати замовлення партнера",
        hint: "Скільки днів партнер має на оплату нового замовлення.",
        kind: "days",
        usedBy: `${NOT_READ}: нове замовлення партнера отримує термін 60 днів, закладений у коді.`,
        min: 0,
        max: 3650,
      },
      {
        key: "returnWindowDays",
        label: "Строк для заявки на повернення",
        hint: "Скільки днів після замовлення можна оформити повернення.",
        kind: "days",
        usedBy: `${NOT_READ}: кабінет дозволяє повернення протягом 14 днів, закладених у коді.`,
        min: 0,
        max: 3650,
      },
      {
        key: "leadTimeBufferDays",
        label: "Запас на логістику",
        hint: "Скільки днів додати до очікуваної дати надходження товару.",
        kind: "days",
        usedBy: `${FOR_BAS}.`,
        min: 0,
        max: 365,
      },
    ],
  },
  {
    group: "blog",
    title: "Блог",
    description: "Рубрики блогу та автор нових статей.",
    fields: [
      {
        key: "categories",
        label: "Рубрики",
        hint: "Кнопки-фільтри над списком статей, у цьому порядку (без «Всі статті»).",
        kind: "strings",
        usedBy:
          "Редактор статей пропонує лише ці рубрики (перша - для нової статті). Кнопки-фільтри списку статей на сайті поки закладені в коді.",
        maxLength: 60,
        maxItems: 20,
      },
      {
        key: "defaultAuthor",
        label: "Автор за замовчуванням",
        hint: "Підставляється в нову статтю.",
        kind: "text",
        usedBy: "Редактор статей: автор нової статті, якщо його не вказано.",
        maxLength: 120,
      },
    ],
  },
  {
    group: "catalog",
    title: "Каталог",
    description:
      "Довідники, які редактор товарів пропонує на додачу до значень, що вже є в товарах. Прив'язку категорій до груп BAS і їхні пороги наявності редагують у розділі «Категорії».",
    fields: [
      {
        key: "brands",
        label: "Бренди",
        hint: "Введіть назву і натисніть Enter; кілька назв можна вставити через кому.",
        kind: "strings",
        usedBy: EDITOR_LISTS,
        maxLength: 80,
        maxItems: 300,
      },
      {
        key: "manufacturers",
        label: "Виробники",
        hint: "Введіть назву і натисніть Enter; кілька назв можна вставити через кому.",
        kind: "strings",
        usedBy: EDITOR_LISTS,
        maxLength: 120,
        maxItems: 300,
      },
      {
        key: "countries",
        label: "Країни виробництва",
        hint: "Введіть назву і натисніть Enter; кілька назв можна вставити через кому.",
        kind: "strings",
        usedBy: EDITOR_LISTS,
        maxLength: 80,
        maxItems: 300,
      },
    ],
  },
];
