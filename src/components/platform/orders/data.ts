// «Мої замовлення» and «Мої повернення» - Figma «Мої Замовлення : Admin»
// 4573:37243 and «Повернення : Admin» 5192:79831. The cabinet of a
// signed-in partner. The orders and returns come from the database
// (GET /api/session -> SessionData.orders, read by ./store.ts); the demo
// company is seeded with the deterministic list the masters were drawn
// from (src/server/seed/data/orders.ts): all seven order states of the
// spec "Логіка статусів" 5192:85082, every payment state, 28 orders and
// returns in all eight states of "Статус повернення" 5070:75404.
// This module keeps the types, the vocabularies and the pure rules; the
// server imports the same rules to re-check every change.
import { formatPrice } from "@/components/catalog/data";
import type { OrderStatusKey } from "@/components/platform/ui/OrderStatusBadge";
import type { ReturnStatusKey } from "@/components/platform/ui/ReturnStatusBadge";

export type OrderStatus = OrderStatusKey;
export type ReturnStatus = ReturnStatusKey;

export type PaymentState =
  | { kind: "awaiting" }
  | { kind: "overdue"; days: number }
  | { kind: "partial"; paid: number; overdue?: number }
  | { kind: "paid"; late?: boolean };

// One order line (the details table 5052:56829 and the return wizard
// 5192:81135): «Шампунь для волосся і тіла, 40мл, Botanica» / «Артикул:».
export type OrderItem = {
  id: string;
  // Catalog product the line was ordered from («Повторити замовлення»
  // puts the lines back into the cart).
  productId: string;
  name: string;
  article: string;
  image: string;
  qty: number;
  unit: string;
  price: number;
};

// A tile of «Документи замовлення» (4990:76237 / 5052:56950): a ready
// PDF (title, date · size · PDF, eye + download) or a pending one
// («Надходження на рахунок» / «З'явиться після оплати»).
export type OrderDocument = {
  id: string;
  title: string;
  date: string;
  sizeMb: number;
  // The file type shown on the tile: "PDF" for everything the site
  // generates; a paper staff attach in the admin panel may be another
  // type ("DOCX", "XLSX", "JPG").
  format: string;
  ready: boolean;
  pendingNote?: string;
  href: string;
};

// «Інформація про доставку» (5052:56949): two read-only fields and the
// info line under them.
export type DeliveryInfo = {
  city: string;
  method: string;
  note: string;
};

// The parcel of an order once staff (or the carrier integration) gave it a
// waybill number: what the customer may see of order.shipment on the
// server. `statusText` is the carrier's own wording of the last tracking
// answer (null until the first one); `estimatedDate` ("YYYY-MM-DD") is the
// carrier's estimate while the parcel is still on its way.
export type OrderShipmentInfo = {
  carrier: "nova-poshta" | "pickup" | "other";
  ttn: string;
  statusText: string | null;
  estimatedDate: string | null;
};

// The sentence a branch or postomat delivery note ends with until the
// order has a waybill (server deliveryOf); the details page puts the
// number in its place once there is one.
export const TTN_PROMISE = "Ми надішлемо номер ТТН, щойно передамо замовлення перевізнику.";

// The carrier's public tracking page of a Nova Poshta waybill.
export function novaPoshtaTrackingHref(ttn: string): string {
  return `https://novaposhta.ua/tracking/?cargo_number=${encodeURIComponent(ttn)}`;
}

export type Order = {
  id: string;
  // Digits only; the tables print it bare («48291037»), titles and
  // modals with the sign («№48291037»).
  number: string;
  // ISO date; rendered as dd.mm.yyyy.
  date: string;
  total: number;
  counterparty: string;
  status: OrderStatus;
  payment: PaymentState;
  createdBy: string;
  paymentType: string;
  // ISO date of «Термін оплати» («до 24.07.2026»).
  paymentDue: string;
  delivery: DeliveryInfo;
  items: OrderItem[];
  documents: OrderDocument[];
};

// The cabinet's order as the server sends it (repos/orders.ts toOrderDto):
// an Order plus `shipment` once the order has a live waybill; every other
// order comes without the key, exactly as before. Order itself stays
// without it because the stored order (db/collections.ts B2bOrderDoc,
// built on Order) keeps the staff side's full shipment under that name.
export type OrderWithShipment = Order & { shipment?: OrderShipmentInfo | null };

const SHIPMENT_CARRIER_KEYS: readonly string[] = ["nova-poshta", "pickup", "other"];

// The waybill of an order of the session payload, or null. The payload is
// mirrored in localStorage and outlives deploys, so the shape is checked.
export function orderShipment(order: Order): OrderShipmentInfo | null {
  const value: unknown = (order as OrderWithShipment).shipment;
  if (typeof value !== "object" || value === null) return null;
  const s = value as Record<string, unknown>;
  if (typeof s.ttn !== "string" || !s.ttn || typeof s.carrier !== "string" || !SHIPMENT_CARRIER_KEYS.includes(s.carrier)) {
    return null;
  }
  return {
    carrier: s.carrier as OrderShipmentInfo["carrier"],
    ttn: s.ttn,
    statusText: typeof s.statusText === "string" && s.statusText ? s.statusText : null,
    estimatedDate: typeof s.estimatedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.estimatedDate) ? s.estimatedDate : null,
  };
}

export type ReturnLine = {
  itemId: string;
  qty: number;
  reason: string;
};

export type ReturnRequest = {
  id: string;
  orderId: string;
  // ISO date the request was sent.
  date: string;
  status: ReturnStatus;
  lines: ReturnLine[];
  solution: string;
  delivery: string;
};

// What "Скасувати замовлення" recorded on an order. `request` = "Запит на
// скасування" of an order "В роботі": the manager still has to confirm
// it, so the order keeps its status meanwhile. `at` = the cabinet's
// today (YYYY-MM-DD).
export type CancelRecord = {
  reason: string;
  solution?: string;
  request?: boolean;
  at: string;
};

// The order-status vocabulary itself (labels, tones, spec order) lives
// with the badge in platform/ui/OrderStatusBadge.tsx.
export { ORDER_STATUS_KEYS, ORDER_STATUS_META } from "@/components/platform/ui/OrderStatusBadge";
export { RETURN_STATUS_KEYS, RETURN_STATUS_META } from "@/components/platform/ui/ReturnStatusBadge";

// Which actions an order offers, by status - the spec raster «1. Які
// статуси -> що доступно» (5192:85059 in section 5192:85082, transcribed
// in ctx/5192-85059.md):
//   Нове, Заблоковано  «Скасувати» - instant, no manager approval;
//   В роботі           «Запит на скасування» - the manager confirms or
//                      rejects, so the order keeps its status meanwhile;
//   Відвантажено       no buttons, hint «Повернення буде доступне після
//                      отримання»;
//   Отримано           «Повернення», within the return window, for the
//                      goods not yet in an active return request (all of
//                      them requested -> a hint instead of the button);
//   Завершено          «Повернення (обмежено)»: as Отримано while the
//                      window is open, else only «Звернутись до менеджера»;
//   Скасовано          nothing but «Повторити замовлення» (which every
//                      state keeps, 5052:56826 / 5192:77964).
export type OrderAction =
  | { kind: "cancel"; request: boolean }
  | { kind: "return" }
  | { kind: "hint"; text: string }
  | { kind: "manager" }
  | { kind: "none" };

// «Звернутись до менеджера»: the partner's B2B manager (the dashboard's
// «Ваш менеджер» card carries the same placeholder contact).
export const MANAGER_MAILTO = "mailto:sales@binar2000.com";

// The details pages' SignInPrompt line for visitors and B2C customers.
export const DETAILS_PROMPT_TEXT = "Замовлення та повернення доступні в особистому кабінеті бізнес-клієнта.";

// The return window the code always had (the spec names one without a
// length). Staff set the real one in the panel (shop.returnWindowDays); it
// reaches the cabinet with the session answer (lib/session/config.ts) and
// the server through its settings reader, and this value stands in until
// then.
export const RETURN_WINDOW_DAYS = 14;

// "YYYY-MM-DD" -> that day's midnight UTC (the clock every rule here
// counts on: order dates, due dates and "today" are plain days).
export function dayDate(isoDate: string): Date {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`));
}

// `today` = the cabinet's today (OrdersPayload.today as dayDate);
// `windowDays` = the shop's return window.
export function returnWindowOpen(order: Pick<Order, "date">, today: Date, windowDays: number = RETURN_WINDOW_DAYS): boolean {
  const placed = Date.parse(`${order.date}T00:00:00Z`);
  return today.getTime() - placed <= windowDays * 86400000;
}

// `returnable` = the lines still free to return (returnableItems below);
// `today` = the cabinet's today (the return window counts from it);
// `windowDays` = the shop's return window (the server and the cabinet pass
// the configured one).
export function orderAction(
  order: Order,
  returnable: readonly OrderItem[],
  today: Date,
  windowDays: number = RETURN_WINDOW_DAYS,
): OrderAction {
  switch (order.status) {
    case "new":
    case "blocked":
      return { kind: "cancel", request: false };
    case "inProgress":
      return { kind: "cancel", request: true };
    case "shipped":
      return { kind: "hint", text: "Повернення буде доступне після отримання" };
    case "received":
    case "completed":
      if (!returnWindowOpen(order, today, windowDays)) return { kind: "manager" };
      return returnable.length > 0
        ? { kind: "return" }
        : { kind: "hint", text: "Повернення вже оформлено на всі товари" };
    default:
      return { kind: "none" };
  }
}

// A request that is neither rejected nor withdrawn still holds its goods
// (on the way back, accepted or already settled), so they cannot be
// returned a second time.
const RETURN_RELEASED: ReadonlySet<ReturnStatus> = new Set(["rejected", "cancelled"]);

// The order lines the partner may still return: each line's quantity
// minus what the active requests of this order already cover; fully
// covered lines drop out.
export function returnableItems(order: Order, returns: readonly ReturnRequest[]): OrderItem[] {
  const taken = new Map<string, number>();
  for (const r of returns) {
    if (r.orderId !== order.id || RETURN_RELEASED.has(r.status)) continue;
    for (const line of r.lines) taken.set(line.itemId, (taken.get(line.itemId) ?? 0) + line.qty);
  }
  return order.items.flatMap((item) => {
    const left = item.qty - (taken.get(item.id) ?? 0);
    return left > 0 ? [{ ...item, qty: left }] : [];
  });
}

// The cancel modal's second select «Бажане рішення» (what happens to the
// money already paid) - drawn only in 5192:81095: a new / blocked order
// with a partial payment. The in-progress frames keep one field even
// with a partial payment (5192:81074).
export function cancelAsksSolution(order: Order): boolean {
  return paidAmount(order) > 0 && (order.status === "new" || order.status === "blocked");
}

// A return request can be withdrawn («Скасувати повернення», 5192:79079)
// until the warehouse has the goods.
export const RETURN_WITHDRAWABLE: ReadonlySet<ReturnStatus> = new Set(["created", "review", "approved"]);

// Menu options, verbatim from the wizard menus: reasons 5192:81456,
// solutions 5192:82170, return delivery 5192:81994. The cancel modal's
// selects were never drawn open (section 5192:81030), so its reasons are
// stand-ins and its «Бажане рішення» reuses the refund options
// (ctx/NEEDED.md).
export const RETURN_REASONS = ["Брак", "Пошкоджено при доставці", "Не той товар", "Інше"] as const;
export const RETURN_SOLUTIONS = ["Кредит-нота на баланс", "Повернення коштів", "Заміна товару"] as const;
export const RETURN_DELIVERY = [
  "Відправити поштою (Нова Пошта)",
  "Привезти на склад самостійно",
  "Забере кур'єр",
] as const;
export const CANCEL_REASONS = [
  "Помилка в замовленні",
  "Змінилася потреба",
  "Довгий термін постачання",
  "Інше",
] as const;
export const CANCEL_SOLUTIONS = ["Кредит-нота на баланс", "Повернення коштів"] as const;

// The demo company's four counterparties (the seed's order generator and
// the parity dump). The /orders filters list the signed-in company's own
// ledger instead (store.ts useCounterpartyNames), which for the demo
// company is these four, in this order.
export const COUNTERPARTIES = [
  'ТОВ "Мережа готелів "Зоряний шлях"',
  "Mirotel LTD",
  "Готель «Дністер»",
  "Rixos Prykarpattya",
];

export const PERIODS = [
  { value: "30", label: "Останні 30 днів" },
  { value: "90", label: "Останні 90 днів" },
  { value: "year", label: "Цей рік" },
  { value: "all", label: "Увесь час" },
] as const;
export type PeriodValue = (typeof PERIODS)[number]["value"];

export const PAGE_SIZES = [10, 20, 50] as const;

// The download link of a document: the session-checked API routes, which
// redirect to the stored file (the stored location never reaches the
// browser).
export function orderDocumentHref(orderId: string, docId: string): string {
  return `/api/orders/${encodeURIComponent(orderId)}/documents/${encodeURIComponent(docId)}`;
}

export function returnDocumentHref(returnId: string, docId: string): string {
  return `/api/returns/${encodeURIComponent(returnId)}/documents/${encodeURIComponent(docId)}`;
}

// A document without its link (what the database stores, plus the
// location of the file on the server side).
export type OrderDocumentCore = Omit<OrderDocument, "href">;

// The three tiles of "Документи замовлення": the invoice, the waybill
// (its number derived from the order number) and the bank receipt,
// pending until the order is paid. `i` picks the waybill's placeholder
// size. Used by the seed for the orders and by returnDocuments below.
export function documentSet(number: string, date: string, paid: boolean, i: number): OrderDocumentCore[] {
  const invoiceNo = 5600 + ((Number(number) * 7) % 400);
  return [
    { id: "invoice", title: "Рахунок на оплату", date, sizeMb: 0.9, format: "PDF", ready: true },
    {
      id: "waybill",
      title: `Видаткова накладна №${invoiceNo}`,
      date,
      sizeMb: [0.9, 1.2, 0.6][i % 3],
      format: "PDF",
      ready: true,
    },
    {
      id: "receipt",
      title: "Надходження на рахунок",
      date,
      sizeMb: 0.4,
      format: "PDF",
      ready: paid,
      pendingNote: "З'явиться після оплати",
    },
  ];
}

function paidOf(payment: PaymentState, total: number): number {
  if (payment.kind === "paid") return total;
  if (payment.kind === "partial") return Math.min(payment.paid, total);
  return 0;
}

export function paidAmount(order: Order): number {
  return paidOf(order.payment, order.total);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function lineSum(item: OrderItem, qty: number = item.qty): number {
  return round2(qty * item.price);
}

export function returnTotal(ret: ReturnRequest, order: Order | undefined): number {
  if (!order) return 0;
  const sum = ret.lines.reduce((s, line) => {
    const item = order.items.find((it) => it.id === line.itemId);
    return item ? s + lineSum(item, line.qty) : s;
  }, 0);
  return Math.round(sum * 100) / 100;
}

// «Документи повернення» (5192:79167) - the master repeats the order's
// three tiles verbatim; the CRM will supply the real return papers. The
// links go through the return's own route (it serves the order's files),
// so only the tiles of documents the order really holds are listed: an
// order without stored documents (one placed at checkout) gives a return
// without tiles, never a link that answers 404.
export function returnDocuments(ret: ReturnRequest, order: Order): OrderDocument[] {
  const stored = new Set(order.documents.map((doc) => doc.id));
  return documentSet(order.number, ret.date, ret.status === "completed", Number(ret.id))
    .filter((doc) => stored.has(doc.id))
    .map((doc) => ({
      ...doc,
      href: returnDocumentHref(ret.id, doc.id),
    }));
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

// 3900 -> «3 900 ₴», 870.5 -> «870,50 ₴» (the list tables; a
// non-breaking space keeps the sign on the number's line).
export function formatSum(value: number): string {
  return `${formatAmount(value)}\u00a0₴`;
}

// 1500 -> «1 500» (no sign: the partial-payment caption «1 500 із 3 900 ₴»
// signs only the total, 5052:32112).
export function formatAmount(value: number): string {
  const whole = Number.isInteger(value);
  const [int, dec] = value.toFixed(whole ? 0 : 2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped}${dec ? `,${dec}` : ""}`;
}

// 31.65 -> «31,65 ₴», 263.75 -> «263,75 ₴» (the details pages always
// print kopiyky).
export const formatMoney = formatPrice;

// 0.9 -> «0.9 МБ» (the master writes the size with a point).
export function formatSize(mb: number): string {
  return `${mb.toFixed(1)} МБ`;
}

// «120 шт», «1 пара» / «2 пари» / «12 пар».
export function formatQty(qty: number, unit: string): string {
  if (unit !== "пар") return `${qty} ${unit}`;
  const mod10 = qty % 10;
  const mod100 = qty % 100;
  if (mod10 === 1 && mod100 !== 11) return `${qty} пара`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${qty} пари`;
  return `${qty} пар`;
}

export function daysPlural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дні";
  return "днів";
}

export function periodStart(period: PeriodValue, now: Date): Date | null {
  if (period === "all") return null;
  if (period === "year") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return new Date(now.getTime() - Number(period) * 86400000);
}

export function formatRange(start: Date | null, end: Date): string {
  const f = (d: Date) => formatDate(d.toISOString().slice(0, 10));
  return start ? `${f(start)} — ${f(end)}` : `до ${f(end)}`;
}
