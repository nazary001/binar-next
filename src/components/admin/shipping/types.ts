// The contract of the shipping section and of the Nova Poshta integration:
// what the routes under /api/admin/shipping and /api/admin/np answer and
// accept. Shared by the routes (src/app/api/admin/{shipping,np}), the
// server side of the integration (src/server/integrations/nova-poshta) and
// the screens. Types and plain constants only: no "use client", no server
// import. Dates in answers are ISO strings.

import type { OrderStatus } from "@/components/admin/orders/types";
import type { Tone } from "@/components/admin/ui/tokens";

// --- shipment states ----------------------------------------------------------

// The same union as OrderShipment["status"] (server/db/collections.ts).
export type ShipmentStatusKey =
  | "draft"
  | "created"
  | "in_transit"
  | "arrived"
  | "received"
  | "refused"
  | "returning"
  | "cancelled"
  | "unknown";

export const SHIPMENT_STATUSES: readonly ShipmentStatusKey[] = [
  "draft",
  "created",
  "in_transit",
  "arrived",
  "received",
  "refused",
  "returning",
  "cancelled",
  "unknown",
];

// Labels and pill tones. Orange is kept for a parcel that waits for the
// recipient or comes back: both need someone to act.
export const SHIPMENT_STATUS_META: Record<ShipmentStatusKey, { label: string; tone: Tone }> = {
  draft: { label: "Створюється", tone: "neutral" },
  created: { label: "Накладну створено", tone: "blue" },
  in_transit: { label: "У дорозі", tone: "indigo" },
  arrived: { label: "У відділенні", tone: "orange" },
  received: { label: "Отримано", tone: "green" },
  refused: { label: "Відмова", tone: "red" },
  returning: { label: "Повертається", tone: "orange" },
  cancelled: { label: "Скасовано", tone: "neutral" },
  unknown: { label: "Не знайдено", tone: "amber" },
};

export type CarrierKey = "nova-poshta" | "other" | "pickup";

export const CARRIERS: readonly CarrierKey[] = ["nova-poshta", "other", "pickup"];

export const CARRIER_LABELS: Record<CarrierKey, string> = {
  "nova-poshta": "Нова Пошта",
  other: "Інший перевізник",
  pickup: "Самовивіз",
};

// How the parcel reaches the recipient. The sender always hands it in at
// its own branch (the sender profile), so the carrier's ServiceType is
// Warehouse + the recipient side.
export type ServiceKind = "branch" | "postomat" | "address";

export const SERVICE_KINDS: readonly ServiceKind[] = ["branch", "postomat", "address"];

export const SERVICE_KIND_LABELS: Record<ServiceKind, string> = {
  branch: "У відділення",
  postomat: "У поштомат",
  address: "На адресу (кур'єр)",
};

export type NpServiceType = "WarehouseWarehouse" | "WarehousePostomat" | "WarehouseDoors";

export const SERVICE_TYPE_OF: Record<ServiceKind, NpServiceType> = {
  branch: "WarehouseWarehouse",
  postomat: "WarehousePostomat",
  address: "WarehouseDoors",
};

export const NP_SERVICE_TYPES: readonly NpServiceType[] = ["WarehouseWarehouse", "WarehousePostomat", "WarehouseDoors"];

export type NpPayer = "Sender" | "Recipient";
export type NpPaymentMethod = "Cash" | "NonCash";

export const PAYER_LABELS: Record<NpPayer, string> = { Sender: "Відправник", Recipient: "Одержувач" };
export const PAYMENT_METHOD_LABELS: Record<NpPaymentMethod, string> = {
  Cash: "Готівкою",
  NonCash: "Безготівково (потрібен договір)",
};

// --- directory (GET /api/admin/np/cities | warehouses | streets) -------------

// One settlement of the carrier's search. `cityRef` is what waybills and
// the warehouse search take; `settlementRef` is the settlement itself.
export type NpCity = {
  label: string; // "м. Київ, Київська обл."
  name: string; // "Київ"
  area: string;
  cityRef: string;
  settlementRef: string;
  // Branches and postomats the carrier counts there.
  warehouses: number;
  addressDelivery: boolean;
};

export type NpWarehouseKind = "branch" | "postomat";

export const WAREHOUSE_KIND_FILTERS = ["branch", "postomat", "all"] as const;
export type NpWarehouseFilter = (typeof WAREHOUSE_KIND_FILTERS)[number];

export type NpWarehouse = {
  ref: string;
  // "Відділення №25 (до 30 кг): вул. ..." - the label the checkout uses too.
  label: string;
  number: string;
  kind: NpWarehouseKind;
  // The carrier's own category: "Branch", "Postomat", "DropOff", "Fulfillment".
  category: string;
  shortAddress: string;
  cityRef: string;
  city: string;
  // Limits, null = none (the carrier sends "0" for "no limit").
  maxWeightPerSeat: number | null;
  maxWeightTotal: number | null;
  maxDeclaredCost: number | null;
  // What the recipient side accepts, cm.
  maxDimensions: { width: number; height: number; length: number } | null;
  // "11/1001"
  index: string;
  working: boolean;
};

export type NpStreet = {
  // The city street ref Address.save expects (StreetRef).
  ref: string;
  label: string; // "вул. Хрещатик"
  name: string;
  type: string;
};

export type NpListAnswer<T> = { ok: true; items: T[] };

// --- settings (GET / PUT /api/admin/np/settings) -------------------------------

export type NpSenderProfile = {
  counterpartyRef: string;
  counterpartyName: string;
  contactRef: string;
  contactName: string;
  // 380XXXXXXXXX once saved.
  phone: string;
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseName: string;
};

export type NpSettingsDto = {
  enabled: boolean;
  // A key is stored (sealed). The key itself never leaves the server.
  hasKey: boolean;
  apiKeyHint: string;
  // false = a key is stored but cannot be opened (the sealing key of the
  // server changed): it has to be typed in again.
  keyReadable: boolean;
  // false = the server has no sealing key, a key cannot be saved at all.
  secretsAvailable: boolean;
  sender: NpSenderProfile;
  defaultWeight: number;
  defaultSeats: number;
  defaultDescription: string;
  defaultPayer: NpPayer;
  defaultPaymentMethod: NpPaymentMethod;
  // The size of a typical seat, cm, pre-filled where a waybill needs one
  // (a postomat); null = not set. PUT takes the same shape (or null).
  defaultDimensions: ParcelDimensions | null;
  checkoutSearch: boolean;
  autoTrack: boolean;
};

// PUT body: every field optional (absent = kept). `apiKey`: a new key is
// sealed, "" removes the stored one, absent keeps it. `sender` is merged
// field by field. Answer: { ok: true, settings: NpSettingsDto }.
export type NpSettingsInput = Partial<Omit<NpSettingsDto, "hasKey" | "apiKeyHint" | "keyReadable" | "secretsAvailable" | "sender">> & {
  apiKey?: string;
  sender?: Partial<NpSenderProfile>;
};

// What the settings screen says under each switch: what the switch really
// does today (the "no dead controls" rule of the design).
export const NP_SETTING_HINTS = {
  enabled: "Без цього накладні не створюються; пошук міст і відділень працює завжди.",
  checkoutSearch:
    "Покупець при оформленні замовлення обирає місто, відділення чи поштомат зі справжніх списків Нової Пошти; замовлення зберігає цей вибір разом із кодами довідника перевізника. Ввести назву вручну, як раніше, теж можна. Ключ API для цього не потрібен.",
  autoTrack: "Статус відправлення оновлюється, коли співробітник відкриває форму доставки замовлення (не частіше ніж раз на 30 хв).",
} as const;

// POST /api/admin/np/test { apiKey? } -> NpTestResult. Without apiKey the
// stored key is tested.
export type NpSender = { ref: string; name: string; city: string; edrpou: string; type: string };
export type NpContact = { ref: string; name: string; phones: string; email: string };
export type NpTestResult = { ok: true; valid: boolean; senders: NpSender[]; message?: string };

// POST /api/admin/np/estimate -> NpEstimateResult (cost and the date the
// carrier promises; the sender city comes from the sender profile).
export type NpEstimateInput = {
  cityRef: string;
  weight: number;
  declaredCost: number;
  serviceType?: NpServiceType;
  seats?: number;
  cod?: number | null;
  // A seat's size; the carrier wants it for a postomat.
  dimensions?: ParcelDimensions | null;
};
export type NpEstimateResult = {
  ok: true;
  cost: number | null;
  codCost: number | null;
  deliveryDate: string | null; // YYYY-MM-DD
  warnings: string[];
};

// --- shipments ---------------------------------------------------------------

export type ShipmentEventDto = { at: string; code: string; text: string };

export type ShipmentRecipientDto = {
  name: string;
  phone: string;
  city: string;
  cityRef: string | null;
  warehouse: string;
  warehouseRef: string | null;
  address: string | null;
};

export type ShipmentParamsDto = {
  weight: number;
  seats: number;
  declaredCost: number;
  description: string;
  payer: NpPayer;
  paymentMethod: NpPaymentMethod;
  serviceType: string;
  cod: number | null;
  // Where the parcel is handed over and the size of one seat, cm. null on
  // shipments stored before these were kept (serviceType still tells the
  // kind) and for parcels sent without a size.
  serviceKind: ServiceKind | null;
  dimensions: ParcelDimensions | null;
};

// The carrier's own records of the recipient (made by Counterparty.save and,
// for address delivery, Address.save), kept for a later update.
export type RecipientRefsDto = { counterpartyRef: string | null; contactRef: string | null; addressRef: string | null };

export type ShipmentDto = {
  carrier: CarrierKey;
  ttn: string | null;
  // The carrier's document ref: set = created through the API (it can be
  // deleted there and printed).
  ref: string | null;
  status: ShipmentStatusKey;
  statusCode: string | null;
  statusText: string | null;
  cost: number | null;
  estimatedDate: string | null;
  recipient: ShipmentRecipientDto;
  recipientRefs: RecipientRefsDto | null;
  params: ShipmentParamsDto | null;
  // What staff typed when attaching a number by hand ("Делівері, склад
  // на Подолі"); null when nothing was typed.
  note: string | null;
  createdAt: string;
  createdBy: string | null;
  checkedAt: string | null;
  events: ShipmentEventDto[];
  // Tracking stopped (received, refused, cancelled ...).
  final: boolean;
  // POST .../track does something.
  trackable: boolean;
  // DELETE .../waybill is allowed (at the carrier for an API waybill that
  // was not handed over yet; a mark only for a typed-in one).
  cancellable: boolean;
  // GET .../label can print it.
  printable: boolean;
};

// GET /api/admin/shipping: one row per order that has a shipment.
export type ShipmentRow = {
  orderId: string;
  orderNumber: string;
  channel: "b2b" | "retail";
  // The company (partner order) or the buyer's name (retail).
  customer: string;
  ttn: string | null;
  carrier: CarrierKey;
  status: ShipmentStatusKey;
  statusText: string | null;
  estimatedDate: string | null;
  cost: number | null;
  cod: number | null;
  // Who receives the parcel (as stored on the shipment; phones are
  // 380XXXXXXXXX once normalised).
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientWarehouse: string;
  note: string | null;
  createdAt: string;
  checkedAt: string | null;
  final: boolean;
};

// Query: status (several), carrier, q (waybill / order number, recipient
// name or phone), from / to (YYYY-MM-DD, Kyiv, by shipment.createdAt),
// sort (one of SHIPPING_SORTS, "-" = descending), page, limit.
// `counts` covers every shipment (not narrowed by the filters), per status,
// plus `all`.
export const SHIPPING_SORTS = ["shipment.createdAt", "shipment.checkedAt", "shipment.estimatedDate", "total"] as const;
export const SHIPPING_DEFAULT_SORT = "-shipment.createdAt";

export type ShippingListAnswer = {
  ok: true;
  items: ShipmentRow[];
  total: number;
  page: number;
  limit: number;
  counts: Record<ShipmentStatusKey | "all", number>;
};

// --- the "create a waybill" form (GET /api/admin/shipping/orders/[orderId]) --

export type ShippingOrderSummary = {
  id: string;
  number: string;
  channel: "b2b" | "retail";
  status: string;
  date: string;
  total: number;
  customer: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  // What the buyer chose at checkout (labels as stored).
  paymentType: string;
  deliveryMethod: string;
  itemsCount: number;
  units: number;
  // What PATCH /api/admin/orders/<id> { status } accepts now (the orders
  // section's ORDER_TRANSITIONS), so the form can offer "shipped" next to
  // the waybill.
  allowedStatuses: OrderStatus[];
};

// The recipient as the buyer gave it at checkout. The texts are always
// there; the carrier's references only when the customer picked the city
// (and the branch or postomat) from Nova Poshta's real lists (the checkout
// search switched on). The drawer then starts with those rows chosen,
// looked up again in the directory, so the manager only confirms them.
export type RecipientPrefill = {
  name: string;
  phone: string;
  city: string;
  // NpCity.cityRef of the picked city; absent when the city was typed.
  cityRef?: string;
  serviceKind: ServiceKind | null;
  // The branch or postomat text, "" for address delivery.
  warehouse: string;
  // NpWarehouse.ref of the picked branch or postomat (the kind of
  // serviceKind); absent when it was typed or for address delivery.
  warehouseRef?: string;
  street: string;
  house: string;
  flat: string;
  // One line ("м. Київ, вул. Хрещатик, 1, кв. 5"), "" when not by address.
  address: string;
  // True when the method is a pickup at the shop (no waybill needed).
  pickup: boolean;
};

export type ParcelDimensions = { width: number; length: number; height: number };

export type ParcelDefaults = {
  weight: number;
  seats: number;
  declaredCost: number;
  description: string;
  payer: NpPayer;
  paymentMethod: NpPaymentMethod;
  serviceKind: ServiceKind;
  // Cash on delivery, UAH: the order total when the buyer chose
  // "Післяплата", else null.
  cod: number | null;
  dimensions: ParcelDimensions | null;
};

// What is missing for a real waybill: "enabled", "apiKey",
// "sender.counterpartyRef", "sender.contactRef", "sender.phone",
// "sender.cityRef", "sender.warehouseRef".
export type NpReadiness = { enabled: boolean; hasKey: boolean; ready: boolean; missing: string[] };

export type ShippingOrderDto = {
  ok: true;
  order: ShippingOrderSummary;
  recipient: RecipientPrefill;
  params: ParcelDefaults;
  integration: NpReadiness;
  sender: Pick<NpSenderProfile, "counterpartyName" | "contactName" | "phone" | "cityName" | "warehouseName">;
  shipment: ShipmentDto | null;
};

// --- create / attach / cancel -------------------------------------------------

// POST /api/admin/shipping/orders/[orderId]/waybill
// recipient.name is "Прізвище Ім'я [По батькові]" (the carrier wants the
// parts apart, Cyrillic). branch / postomat need warehouseRef; address
// needs streetRef and house. A postomat needs the dimensions of a seat.
export type WaybillRecipientInput = {
  name: string;
  phone: string;
  cityRef: string;
  city: string;
  warehouseRef?: string;
  warehouse?: string;
  streetRef?: string;
  street?: string;
  house?: string;
  flat?: string;
};

export type WaybillParamsInput = {
  weight: number;
  seats: number;
  declaredCost: number;
  description: string;
  payer: NpPayer;
  paymentMethod: NpPaymentMethod;
  serviceKind: ServiceKind;
  cod?: number | null;
  dimensions?: ParcelDimensions | null;
};

export type WaybillInput = {
  recipient: WaybillRecipientInput;
  params: WaybillParamsInput;
  // true: answer the requests that would be sent; nothing is stored and no
  // key is needed.
  dryRun?: boolean;
};

export const RECIPIENT_NAME_HINT = "Прізвище, ім'я та по батькові одержувача кирилицею, як у документі.";

// One call to the carrier: model, method and its properties.
export type NpRequestStep = { modelName: string; calledMethod: string; methodProperties: Record<string, unknown> };

// The values a dry run puts where the carrier's own answers will go (the
// recipient made by Counterparty.save, the address made by Address.save).
export const WAYBILL_PLACEHOLDERS = {
  counterparty: "<Counterparty.save: Ref>",
  contact: "<Counterparty.save: ContactPerson.Ref>",
  address: "<Address.save: Ref>",
} as const;

// Answer of a dry run: { ok: true, dryRun: true, preview }.
export type WaybillPreview = {
  // In order: Counterparty.save (the recipient), Address.save (address
  // delivery only), InternetDocument.save (the waybill itself).
  steps: NpRequestStep[];
  serviceType: NpServiceType;
  // What the integration still lacks for a real run (NpReadiness.missing).
  missing: string[];
};

// Answer of a real run: { ok: true, shipment: ShipmentDto, warnings }.
export type WaybillResult = { ok: true; shipment: ShipmentDto; warnings: string[] };

// POST /api/admin/shipping/orders/[orderId]/manual. A Nova Poshta number is
// 14 digits; another carrier's is 3-40 letters, digits or "-"; a pickup
// has none. Answer: { ok: true, shipment: ShipmentDto }.
export type ManualShipmentInput = { carrier: CarrierKey; ttn?: string; note?: string };

// DELETE .../waybill and POST .../track answer { ok: true, shipment, changed? }.
export type ShipmentAnswer = { ok: true; shipment: ShipmentDto; changed?: boolean };

// POST /api/admin/shipping/track: every parcel that is not final, oldest
// check first, at most TRACK_BATCH_MAX per call.
export const TRACK_BATCH_MAX = 100;
export type TrackAllResult = { ok: true; checked: number; changed: number; failed: number; more: boolean };

// GET .../label?kind=waybill|marking streams a PDF.
export const LABEL_KINDS = ["waybill", "marking"] as const;
export type LabelKind = (typeof LABEL_KINDS)[number];

// --- errors ------------------------------------------------------------------

// Codes these routes answer besides the common ones (lib/api.ts), for
// errorMessage(result, NP_ERROR_MESSAGES). "np-error" and "np-auth" also
// carry the carrier's own wording in `message`.
export const NP_ERROR_MESSAGES: Record<string, string> = {
  "np-not-configured": "Нову Пошту не налаштовано: увімкніть інтеграцію, додайте ключ API та профіль відправника.",
  "np-auth": "Нова Пошта не прийняла ключ API: він недійсний або прострочений. Введіть новий ключ.",
  "np-error": "Нова Пошта відхилила запит.",
  "np-unavailable": "Нова Пошта зараз не відповідає. Спробуйте ще раз за хвилину.",
  exists: "Для цього замовлення вже є відправлення.",
  state: "Цю дію з відправленням зараз виконати не можна.",
};
