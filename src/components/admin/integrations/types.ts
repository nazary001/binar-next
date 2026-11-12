// The contract between the BAS exchange (server) and the panel screens of
// "Інтеграції" (/admin/integrations/bas, the API keys, the exchange
// journal), plus the shapes of the machine API that the documentation
// page shows. Types and plain constants only: no "use client", no server
// import, so both sides read this file.
//
// The Nova Poshta settings (/api/admin/np/settings) are typed in
// shipping/types.ts; NpSettingsView below adds what the integrations page
// reads besides.
//
// Panel routes (prefix /api/admin/integrations):
//   GET  /bas/settings                 -> BasSettingsAnswer            integrations.view
//   PUT  /bas/settings  BasSettingsInput -> BasSettingsAnswer          integrations.edit
//   GET  /bas/status                   -> BasStatusAnswer              integrations.view
//   GET  /bas/queue?state=&kind=&page=&limit= -> ListAnswer<ExchangeQueueDto>
//   POST /bas/queue     QueueEnqueueInput -> QueueEntryAnswer (201)    integrations.edit
//   POST /bas/queue/<id>/retry         -> QueueEntryAnswer             integrations.edit
//   POST /bas/push-test                -> BasPushTestAnswer            integrations.edit
//   GET  /bas/spec                     -> BasSpecAnswer                integrations.view
//   GET  /log?system=&entity=&status=&direction=&from=&to=&q=&page=&limit= -> ListAnswer<ExchangeLogDto>
//   GET  /keys?page=&limit=&sort=      -> ListAnswer<ApiKeyDto>        integrations.view
//   POST /keys          ApiKeyCreateInput -> ApiKeyCreatedAnswer (201) integrations.edit
//   PATCH /keys/<id>    ApiKeyPatchInput -> ApiKeyAnswer               integrations.edit
//   DELETE /keys/<id>                  -> { ok: true }                 integrations.edit

import type { NpSettingsDto, NpSettingsInput, ParcelDimensions } from "@/components/admin/shipping/types";

// --- Nova Poshta settings as the integrations page reads them -----------------

// GET / PUT /api/admin/np/settings answer NpSettingsDto (the shipping
// section's contract) plus the typical size of a parcel, cm (null = not
// set); a waybill to a postomat needs one.
export type NpSettingsView = NpSettingsDto & { defaultDimensions: ParcelDimensions | null };
export type NpSettingsViewInput = NpSettingsInput & { defaultDimensions?: ParcelDimensions | null };
export type NpSettingsAnswer = { ok: true; settings: NpSettingsView };

// --- machine API -------------------------------------------------------------

export const BAS_API_BASE = "/api/integrations/bas/v1";
export const BAS_API_VERSION = "v1";

export const BAS_LIMITS = {
  // Items of one push batch.
  items: 500,
  // Items of one PUT /documents (each carries a whole PDF).
  documents: 20,
  // A request body (a Vercel function accepts 4.5 MB).
  bodyBytes: 4 * 1024 * 1024,
  // One decoded PDF of PUT /documents.
  pdfBytes: 3 * 1024 * 1024,
  // Entries of one queue pull.
  pullLimit: 100,
  // Calls of one key per minute.
  callsPerMinute: 600,
  // How long the answer of a batch is kept for a repeated batchId.
  batchDays: 7,
  // How long a journal row is kept.
  logDays: 90,
} as const;

// --- API keys ----------------------------------------------------------------

export type ApiKeyScope = "bas:read" | "bas:write";

export const API_KEY_SCOPES: { value: ApiKeyScope; label: string; hint: string }[] = [
  { value: "bas:read", label: "Читання", hint: "Забирати чергу нових замовлень і повернень." },
  {
    value: "bas:write",
    label: "Запис",
    hint: "Надсилати товари, ціни, залишки, клієнтів, розрахунки, статуси, документи та підтвердження.",
  },
];

// Every key starts with this; the panel shows the first PREFIX_LENGTH
// characters to tell keys apart.
export const API_KEY_PREFIX = "bnr_";
export const API_KEY_PREFIX_LENGTH = 12;

export type ApiKeyState = "active" | "revoked" | "expired";

export const API_KEY_STATE_LABELS: Record<ApiKeyState, string> = {
  active: "Активний",
  revoked: "Вимкнений",
  expired: "Термін дії минув",
};

// A key as the panel sees it. The key itself is shown once, in the answer
// of POST /keys; the stored hash never leaves the server.
export type ApiKeyDto = {
  id: string;
  name: string;
  // "bnr_Ab12Cd34"
  prefix: string;
  scopes: ApiKeyScope[];
  isActive: boolean;
  // isActive and the expiry, as of the answer.
  state: ApiKeyState;
  createdAt: string;
  // staff._id of who created it.
  createdBy: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  // The caller's address of the last use (null off Vercel, where it cannot
  // be trusted).
  lastUsedIp: string | null;
  // The name of who created it (null when the member of staff is gone or
  // the answer did not look it up).
  createdByName: string | null;
  // The last rename, change of scopes or switch off / on.
  updatedAt: string | null;
  updatedBy: string | null;
};

export type ApiKeyCreateInput = {
  name: string;
  scopes: ApiKeyScope[];
  // ISO date or date-time in the future; null / absent = never expires.
  expiresAt?: string | null;
};

// scopes: at least one; the key keeps working with the new set at once.
export type ApiKeyPatchInput = { name?: string; isActive?: boolean; scopes?: ApiKeyScope[] };

// How the keys table names the scopes (the badges of a key).
export const API_KEY_SCOPE_BADGES: Record<ApiKeyScope, string> = {
  "bas:read": "Читання черги",
  "bas:write": "Запис даних",
};

export type ApiKeyCreatedAnswer = { ok: true; key: string; record: ApiKeyDto };
export type ApiKeyAnswer = { ok: true; record: ApiKeyDto };

// --- settings ----------------------------------------------------------------

export type BasMode = "pull" | "push";

export type BasAcceptFlag =
  | "acceptProducts"
  | "acceptPrices"
  | "acceptStock"
  | "acceptClients"
  | "acceptLedger"
  | "acceptOrderStatuses"
  | "acceptDocuments";

// The "bas" settings group without the sealed password.
export type BasSettingsDto = {
  enabled: boolean;
  // "pull": BAS reads the queue. "push": besides, while the exchange is on,
  // the site posts every newly queued order and return request to pushUrl
  // (server/integrations/bas/push.ts); the queue stays the fallback.
  mode: BasMode;
  pushUrl: string;
  pushLogin: string;
  // A password is stored. Nothing of it is ever answered (no hint either).
  hasPassword: boolean;
  acceptProducts: boolean;
  acceptPrices: boolean;
  acceptStock: boolean;
  acceptClients: boolean;
  acceptLedger: boolean;
  acceptOrderStatuses: boolean;
  acceptDocuments: boolean;
  publishNewProducts: boolean;
  stockDrivesAvailability: boolean;
  exportRetailOrders: boolean;
  exportPartnerOrders: boolean;
};

// PUT /bas/settings: any subset of the fields. pushPassword: a new
// password (sealed on the server), null or "" removes the stored one,
// absent keeps it, except when pushUrl moves to another origin (scheme,
// host, port): the stored password then goes too (the answer says
// passwordDropped), so it never reaches an address it was not typed for.
export type BasSettingsInput = Partial<Omit<BasSettingsDto, "hasPassword">> & {
  pushPassword?: string | null;
};

export type BasSettingsAnswer = { ok: true; settings: BasSettingsDto; passwordDropped?: boolean };

// What the ERP may overwrite on the site, in the order the panel lists it.
export const BAS_ACCEPT_FLAGS: { key: BasAcceptFlag; label: string; hint: string }[] = [
  {
    key: "acceptProducts",
    label: "Товари",
    hint: "Артикул, штрихкод, одиниці, упаковки, кратність, виробник, країна. Назва, фото й опис лишаються сайтові.",
  },
  { key: "acceptPrices", label: "Типи цін і ціни", hint: "Ціни за типами цін; базовий тип змінює ціну на сайті." },
  { key: "acceptStock", label: "Залишки", hint: "Вільний залишок і термін постачання." },
  {
    key: "acceptClients",
    label: "Клієнти, контрагенти, договори",
    hint: "Компанії, юрособи, договори зі знижкою, кредитним лімітом і боргом.",
  },
  { key: "acceptLedger", label: "Взаєморозрахунки", hint: "Рядки акту звірки за договором." },
  { key: "acceptOrderStatuses", label: "Статуси замовлень", hint: "Статус, оплата, номер у BAS, ТТН." },
  { key: "acceptDocuments", label: "Документи", hint: "Рахунки, накладні, акти у PDF до замовлень." },
];

// --- entities, journal -------------------------------------------------------

export const BAS_ENTITIES = [
  "ping",
  "price-types",
  "products",
  "prices",
  "stock",
  "clients",
  "ledger",
  "order-statuses",
  "documents",
  "orders",
  "returns",
] as const;

export type BasEntity = (typeof BAS_ENTITIES)[number];

export const BAS_ENTITY_LABELS: Record<BasEntity, string> = {
  ping: "Перевірка зв'язку",
  "price-types": "Типи цін",
  products: "Товари",
  prices: "Ціни",
  stock: "Залишки",
  clients: "Клієнти",
  ledger: "Взаєморозрахунки",
  "order-statuses": "Статуси замовлень",
  documents: "Документи",
  orders: "Черга замовлень",
  returns: "Черга повернень",
};

// ping = a connection check; push = data applied; replay = a repeated
// batchId answered from memory, nothing applied; pull = the queue read;
// ack = the queue entries confirmed.
export type ExchangeAction = "ping" | "push" | "replay" | "pull" | "ack";

export const EXCHANGE_ACTION_LABELS: Record<ExchangeAction, string> = {
  ping: "Перевірка",
  push: "Надсилання",
  replay: "Повтор пакета",
  pull: "Отримання черги",
  ack: "Підтвердження",
};

export type ExchangeSystem = "bas" | "nova-poshta" | "mail";
export type ExchangeStatus = "ok" | "partial" | "error";
// From the site's point of view: "in" = data came to the site, "out" =
// the site handed data out (a queue pull, a call to a carrier).
export type ExchangeDirection = "in" | "out";

export const EXCHANGE_SYSTEM_LABELS: Record<ExchangeSystem, string> = {
  bas: "BAS",
  "nova-poshta": "Нова Пошта",
  mail: "Пошта",
};

export const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
  ok: "Успішно",
  partial: "Частково",
  error: "Помилка",
};

export type ExchangeCounts = { received: number; created: number; updated: number; unchanged: number; failed: number };

export type ExchangeLogDto = {
  id: string;
  at: string;
  system: ExchangeSystem;
  direction: ExchangeDirection;
  entity: string;
  action: string;
  status: ExchangeStatus;
  counts: ExchangeCounts;
  durationMs: number;
  // The key (kind "integration"), the member of staff, or null for a call
  // nobody could be told from (no or unknown key).
  actor: { id: string; name: string; kind: string } | null;
  batchId: string | null;
  // "<HTTP status> <code>" of a refused call, or the cause of a failure.
  error: string | null;
  // Up to 20 failed rows of a batch.
  details: { id: string; error: string }[];
};

// --- status ------------------------------------------------------------------

export type BasLastCall = {
  at: string;
  // "ping" rows go both ways: BAS checking its key, or the site checking
  // the push address.
  direction?: ExchangeDirection;
  action: string;
  status: ExchangeStatus;
  counts: ExchangeCounts;
  error: string | null;
};

export type BasStatusDto = {
  enabled: boolean;
  mode: BasMode;
  keys: { active: number; total: number };
  queue: { pending: number; acked: number; errors: number; oldestPendingAt: string | null };
  // The latest journal row of every entity (null = never called).
  last: Record<BasEntity, BasLastCall | null>;
  // Since midnight in Kyiv.
  today: { calls: number; errors: number } & ExchangeCounts;
};

export type BasStatusAnswer = { ok: true } & BasStatusDto;

// --- queue -------------------------------------------------------------------

export type QueueKind = "order" | "return";
export type QueueState = "pending" | "acked" | "error";

// A pending entry BAS has not taken for this long can be put back into the
// queue by hand ("Повторити"), under a new seq.
export const QUEUE_STALE_MS = 60 * 60_000;

export const QUEUE_KIND_LABELS: Record<QueueKind, string> = { order: "Замовлення", return: "Повернення" };

export const QUEUE_STATE_LABELS: Record<QueueState, string> = {
  pending: "Очікує BAS",
  acked: "Прийнято",
  error: "Помилка",
};

export type ExchangeQueueDto = {
  id: string;
  seq: number;
  kind: QueueKind;
  // orders._id / returns._id.
  entityId: string;
  state: QueueState;
  // How many times BAS answered the entry with an error, or a post to the
  // push address failed.
  attempts: number;
  createdAt: string;
  ackedAt: string | null;
  // What BAS called the document (its GUID and number).
  ack: { externalId: string | null; number: string | null } | null;
  // state "error": what BAS said. state "pending" with an error: the last
  // post to the push address failed (the entry still waits for a pull).
  error: string | null;
  // Pending without an error for longer than QUEUE_STALE_MS: BAS has not
  // taken it; "Повторити" puts it back under a new seq.
  stale: boolean;
  // Order: its number; return: the number of its order.
  number: string | null;
  // The company or the buyer.
  label: string;
  // Order total / return sum, UAH (null when the record is gone).
  total: number | null;
  channel: "b2b" | "retail" | null;
  // The order or return no longer exists.
  missing: boolean;
};

export type QueueEnqueueInput = { kind: QueueKind; entityId: string };

// What one post to the push address came to. Present in the answers of
// POST /bas/queue and /retry only when the push mode is active.
export type BasPushOutcome = {
  ok: boolean;
  // HTTP status of BAS's answer; null when none came (no connection, the
  // 10-second timeout, or nothing was sent: a refused address, a password
  // that cannot be opened).
  status: number | null;
  // Why it did not work, a sentence for staff; null when it worked.
  error: string | null;
  durationMs: number;
  // The number BAS gave the document in its answer, when it gave one.
  number: string | null;
  // The beginning of BAS's answer (at most 300 characters).
  answer: string;
};

export type QueueEntryAnswer = { ok: true; entry: ExchangeQueueDto; push?: BasPushOutcome };

// POST /bas/push-test: { kind: "ping" } posted to the stored push address.
// 409 "no-address" when none is stored.
export type BasPushTestAnswer = { ok: true; result: BasPushOutcome };

export type ListAnswer<T> = { ok: true; items: T[]; total: number; page: number; limit: number };

// --- documentation page -------------------------------------------------------

export type BasSpecEndpoint = {
  // "products", "orders-pull", ...
  id: string;
  method: "GET" | "PUT" | "POST";
  // Relative to BAS_API_BASE: "/products".
  path: string;
  // Any of these scopes is enough.
  scopes: ApiKeyScope[];
  // The setting that must be on (besides "enabled"), null = none.
  acceptFlag: BasAcceptFlag | null;
  title: string;
  description: string;
  query: { name: string; description: string }[];
  // Example body (null for GET).
  request: unknown;
  // Example answer.
  response: unknown;
  notes: string[];
};

// The push mode seen from BAS: what the site posts to the address of the
// settings, with which headers, and what it expects back.
export type BasSpecPush = {
  description: string;
  headers: { name: string; value: string; description: string }[];
  examples: { label: string; body: unknown }[];
  rules: string[];
};

export type BasSpecDto = {
  version: string;
  basePath: string;
  auth: string;
  conventions: string[];
  errors: { status: number; code: string; meaning: string }[];
  statusMap: { bas: string; site: string; label: string }[];
  endpoints: BasSpecEndpoint[];
  // Optional so a contract downloaded before the push mode still reads.
  push?: BasSpecPush;
  codeSamples: { title: string; language: "bsl"; code: string }[];
};

export type BasSpecAnswer = { ok: true } & BasSpecDto;

// --- machine API answers (shown on the documentation page) --------------------

export type BasItemStatus = "created" | "updated" | "unchanged" | "error";

export type BasPushResult = { externalId: string; status: BasItemStatus; error?: string };

// PUT /ledger with replace: true: what the replace step did. It runs only
// once every item of the batch is stored: one item refused (it did not
// parse, it repeated another) or not stored leaves every entry of the
// period in place ({ done: false }), and BAS resends the corrected period
// under a new batchId.
export type BasLedgerReplace = { done: true; removed: number } | { done: false; reason: "items-failed" };

export type BasPushAnswer = {
  ok: true;
  batchId: string;
  results: BasPushResult[];
  counts: ExchangeCounts;
  // PUT /ledger with replace: true only.
  replace?: BasLedgerReplace;
};

export type BasAckResult = { id: string; status: "acked" | "unchanged" | "error"; error?: string };

export type BasAckAnswer = { ok: true; results: BasAckResult[]; counts: ExchangeCounts };

export type BasOrderPacketLine = {
  sku: string;
  productExternalId: string | null;
  name: string;
  quantity: number;
  // The packaging the line is counted in (the product's default package,
  // else its base unit) and how many base units one holds.
  unitCode: string;
  coefficient: number;
  price: number;
  sum: number;
};

export type BasOrderPacket = {
  seq: number;
  orderId: string;
  number: string;
  channel: "b2b" | "retail";
  createdAt: string;
  // YYYY-MM-DD, Kyiv.
  date: string;
  status: string;
  client: { externalId: string | null; name: string };
  counterparty: { externalId: string | null; name: string; edrpou: string } | null;
  contract: { externalId: string | null; number: string } | null;
  buyer: { userId: string | null; name: string; email: string; phone: string };
  items: BasOrderPacketLine[];
  total: number;
  delivery: { method: string; methodName: string; city: string; address: string; ttn: string | null };
  payment: { method: string };
  comment: string;
  // The two notices of the requirement: overdue debt, credit limit exceeded.
  warnings: string[];
};

export type BasReturnPacket = {
  seq: number;
  returnId: string;
  orderId: string;
  orderNumber: string;
  // What BAS called the order when it took it.
  orderExternalId: string | null;
  createdAt: string;
  date: string;
  status: string;
  client: { externalId: string | null; name: string };
  buyer: { userId: string | null; name: string; email: string; phone: string };
  lines: (BasOrderPacketLine & { itemId: string; reason: string })[];
  total: number;
  solution: string;
  delivery: string;
};

export type BasPullAnswer<T> = { ok: true; items: T[]; nextAfter: number };
