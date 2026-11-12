// What the panel's system page shows (GET /api/admin/system) and the
// answers of its two buttons. Types and plain constants only. Nothing here
// ever carries a connection string, a host name or a secret value.

export type SystemCollection = {
  name: string;
  count: number;
  // Logical size of the documents; null when the database would not say.
  sizeBytes: number | null;
  // Space on disk (compressed) and the size of the indexes.
  storageBytes: number | null;
  indexBytes: number | null;
};

// "own": SECRETS_KEY is set and usable. "derived": the key is derived from
// REVALIDATE_SECRET. "invalid": SECRETS_KEY is set but is not 32 bytes, so
// nothing can be sealed. "missing": neither is set.
export type SecretsKeyState = "own" | "derived" | "invalid" | "missing";

export type SystemInfo = {
  database: {
    name: string;
    collections: SystemCollection[];
    dataBytes: number;
    storageBytes: number;
    indexBytes: number;
    // The quota of the free cluster (512 MB). Atlas counts the data and
    // the indexes against it, so usedBytes = dataBytes + indexBytes.
    limitBytes: number;
    usedBytes: number;
  };
  media: {
    count: number;
    bytes: number;
    byFolder: { folder: string; count: number; bytes: number }[];
  };
  runtime: {
    node: string;
    next: string;
    production: boolean;
    vercel: boolean;
    testMode: boolean;
    // The Vercel region of the function (null off Vercel).
    region: string | null;
  };
  security: {
    secretsKey: SecretsKeyState;
    revalidateSecret: boolean;
  };
  counts: {
    staff: number;
    // Live sessions (not yet expired).
    sessions: number;
    staffSessions: number;
    // Expired ones still stored (the database removes them within about a
    // minute; POST /api/admin/system/sessions/purge removes them at once).
    expiredSessions: number;
    expiredStaffSessions: number;
    auditLog: number;
    // Messages of the outbox not delivered yet.
    outboxPending: number;
  };
  generatedAt: string;
};

export const FREE_CLUSTER_LIMIT_BYTES = 512 * 1024 * 1024;

// GET /api/admin/system
export type SystemInfoResponse = { ok: true; system: SystemInfo };

// POST /api/admin/system/revalidate  { tags?: RevalidateTag[] } (all when left out)
export const REVALIDATE_TAGS = ["catalog", "materials", "blog"] as const;
export type RevalidateTag = (typeof REVALIDATE_TAGS)[number];
export const REVALIDATE_TAG_LABELS: Record<RevalidateTag, string> = {
  catalog: "Каталог",
  materials: "Матеріали",
  blog: "Блог",
};
export type RevalidateResponse = { ok: true; revalidated: RevalidateTag[] };

// POST /api/admin/system/sessions/purge (no body)
export type PurgeSessionsResponse = { ok: true; removed: { sessions: number; staffSessions: number } };

// What each collection of the database holds, in words, for the system
// page (the technical name is shown under it). A collection not listed is
// shown by its name only.
export const COLLECTION_LABELS: Record<string, string> = {
  users: "Акаунти клієнтів",
  sessions: "Сеанси клієнтів",
  password_resets: "Відновлення паролів",
  rate_limits: "Ліміти спроб",
  outbox: "Черга листів",
  clients: "Компанії",
  counterparties: "Контрагенти компаній",
  employees: "Працівники компаній",
  products: "Товари",
  carts: "Кошики",
  assortments: "Асортименти партнерів",
  orders: "Замовлення",
  returns: "Повернення",
  counters: "Лічильники номерів",
  material_categories: "Розділи матеріалів",
  material_files: "Файли матеріалів",
  blog_posts: "Статті блогу",
  leads: "Заявки з сайту",
  staff: "Співробітники",
  staff_sessions: "Сеанси співробітників",
  staff_roles: "Ролі співробітників",
  audit_log: "Журнал дій",
  settings: "Налаштування",
  media: "Медіатека: опис файлів",
  media_blobs: "Медіатека: вміст файлів",
  price_types: "Типи цін",
  customer_groups: "Групи покупців",
  ledger: "Взаєморозрахунки",
  api_keys: "Ключі доступу",
  exchange_log: "Журнал обміну з BAS",
  exchange_batches: "Пакети обміну з BAS",
  exchange_queue: "Черга обміну з BAS",
  carrier_cache: "Довідники Нової Пошти",
};
