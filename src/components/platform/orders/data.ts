// «Мої замовлення» and «Мої повернення» - Figma «Мої Замовлення : Admin»
// 4573:37243 and «Повернення : Admin» 5192:79831. The cabinet of a
// signed-in partner. There is no CRM feed yet, so the pages read a
// deterministic placeholder list shaped the way the masters draw it:
// all seven order states of the spec «Логіка статусів» 5192:85082, every
// payment state (awaiting, overdue, partial with an overdue remainder,
// paid late), several counterparties, 28 orders so «1-10 із 28» is real,
// order lines, documents, delivery and payment terms for the details
// page 5052:56810, and returns in all eight states of «Статус
// повернення» 5070:75404. Cancellations and new returns the partner
// makes are kept in localStorage (./store.ts) on top of this list.
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
  format: "PDF";
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

// Placeholder return window (the spec names one without a length).
export const RETURN_WINDOW_DAYS = 14;

export function returnWindowOpen(order: Order, today: Date = ANCHOR): boolean {
  const placed = Date.parse(`${order.date}T00:00:00Z`);
  return today.getTime() - placed <= RETURN_WINDOW_DAYS * 86400000;
}

// `returnable` = the lines still free to return (returnableItems below);
// the default treats every line as free.
export function orderAction(order: Order, returnable: readonly OrderItem[] = order.items): OrderAction {
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
      if (!returnWindowOpen(order)) return { kind: "manager" };
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

// The master's example list is dated 24.04.2026 - 24.05.2026 and counts
// «1-10 із 28»; the placeholder puts one order a day inside that window.
const ANCHOR = new Date(Date.UTC(2026, 4, 24));

function iso(daysBack: number, from: Date = ANCHOR): string {
  const d = new Date(from.getTime() - daysBack * 86400000);
  return d.toISOString().slice(0, 10);
}

// A placeholder document file (the materials library's one-page PDF).
const DOC_HREF = "/figma-export/materials/placeholder.pdf";

// Catalog lines the placeholder orders are made of. The shampoo uses the
// order frames' own «Product preview» photo (4101:35551, downscaled to
// 2x of the 60-px box); the series and textile items reuse the product
// page photos.
const POOL: Omit<OrderItem, "id" | "qty">[] = [
  {
    productId: "shampoo-alt-1",
    name: "Шампунь для волосся і тіла, 40мл, Botanica",
    article: "BT-SH-040",
    image: "/figma-export/orders/product-preview.png",
    unit: "шт",
    price: 31.65,
  },
  {
    productId: "conditioner-1",
    name: "Кондиціонер для волосся, 40мл, Botanica",
    article: "BT-CN-040",
    image: "/figma-export/product/series-conditioner.jpg",
    unit: "шт",
    price: 31.65,
  },
  {
    productId: "lotion-1",
    name: "Лосьйон для тіла, 40мл, Botanica",
    article: "BT-LT-040",
    image: "/figma-export/product/series-lotion.jpg",
    unit: "шт",
    price: 31.65,
  },
  {
    productId: "soap-1",
    name: "Мило для рук, 40мл, Botanica",
    article: "BT-SP-040",
    image: "/figma-export/product/series-soap.jpg",
    unit: "шт",
    price: 31.65,
  },
  {
    productId: "slippers-1",
    name: "Тапочки готельні, 1 пара, Binar",
    article: "BN-SL-001",
    image: "/figma-export/product/together-slippers.jpg",
    unit: "пар",
    price: 120.05,
  },
  {
    productId: "robe-1",
    name: "Халат, 1 шт, Binar",
    article: "BN-RB-001",
    image: "/figma-export/product/together-robe.jpg",
    unit: "шт",
    price: 120.05,
  },
];

const QTYS = [120, 60, 40, 200, 24, 10, 80];

function itemsFor(i: number): OrderItem[] {
  // The master's example order (the oldest one) carries five lines; the
  // rest cycle one to five lines through the pool.
  const count = i === 27 ? 5 : (i % 5) + 1;
  // The example order opens with the master's shampoo line.
  const start = i === 27 ? 0 : i;
  return Array.from({ length: count }, (_, k) => {
    const base = POOL[(start + k) % POOL.length];
    const qty = base.unit === "пар" || base.price > 100 ? QTYS[(i + k) % QTYS.length] / 10 : QTYS[(i + k) % QTYS.length];
    return { ...base, id: `${base.article}-${k + 1}`, qty: Math.max(1, Math.round(qty)) };
  });
}

// Status + payment per order, newest first. Every state of the spec and
// every cancel-modal variant has an example: Нове / Заблоковано with an
// unpaid and a partly paid order (one select vs the two of 5192:81095),
// В роботі both ways (5192:81053 / 5192:81074), Отримано (the return
// variant 5192:77948), and the oldest order = the master's №48291037
// (Нове, «Очікується оплата», Самовивіз, Післяплата).
const PLAN: [OrderStatus, PaymentState][] = [
  ["new", { kind: "awaiting" }],
  ["shipped", { kind: "awaiting" }],
  ["blocked", { kind: "partial", paid: 1500, overdue: 2400 }],
  ["received", { kind: "paid" }],
  ["inProgress", { kind: "overdue", days: 3 }],
  ["inProgress", { kind: "partial", paid: 2000 }],
  ["completed", { kind: "paid", late: true }],
  ["new", { kind: "partial", paid: 1000 }],
  ["received", { kind: "overdue", days: 3 }],
  ["cancelled", { kind: "awaiting" }],
  ["inProgress", { kind: "awaiting" }],
  ["blocked", { kind: "overdue", days: 10 }],
  ["completed", { kind: "paid" }],
  ["shipped", { kind: "partial", paid: 2000 }],
  ["received", { kind: "paid", late: true }],
  ["new", { kind: "awaiting" }],
  ["inProgress", { kind: "paid" }],
  ["completed", { kind: "paid" }],
  ["received", { kind: "paid" }],
  ["cancelled", { kind: "awaiting" }],
  ["shipped", { kind: "paid" }],
  ["inProgress", { kind: "awaiting" }],
  ["received", { kind: "partial", paid: 1500, overdue: 600 }],
  ["completed", { kind: "paid", late: true }],
  ["blocked", { kind: "awaiting" }],
  ["received", { kind: "paid" }],
  ["completed", { kind: "paid" }],
  ["new", { kind: "awaiting" }],
];

const CREATORS = ["Олена Коваль", "Андрій Мельник", "Олена Коваль", "Ірина Шевчук"];
const PAYMENT_TYPES = ["Післяплата", "Безготівковий розрахунок", "Банківською карткою"];

const PICKUP_NOTE =
  "Самовивіз доступний за адресою: Україна, м. Київ, вул. Хрещатик, 1, пн–пт з 09:00 до 18:00. Будь ласка, дочекайтеся повідомлення про готовність замовлення перед візитом.";
const DELIVERIES: DeliveryInfo[] = [
  { city: "Київ", method: "Самовивіз", note: PICKUP_NOTE },
  {
    city: "Львів",
    method: "Нова Пошта (Самовивіз)",
    note: "Відділення № 12: м. Львів, вул. Городоцька, 120. Ми надішлемо номер ТТН, щойно передамо замовлення перевізнику.",
  },
  { city: "Київ", method: "Самовивіз", note: PICKUP_NOTE },
  {
    city: "Івано-Франківськ",
    method: "Нова Пошта (Адресна доставка)",
    note: "Адреса доставки: м. Івано-Франківськ, вул. Незалежності, 4. Кур'єр зателефонує перед приїздом.",
  },
];

function paidOf(payment: PaymentState, total: number): number {
  if (payment.kind === "paid") return total;
  if (payment.kind === "partial") return Math.min(payment.paid, total);
  return 0;
}

function documentsFor(number: string, date: string, payment: PaymentState, i: number): OrderDocument[] {
  const invoiceNo = 5600 + ((Number(number) * 7) % 400);
  return [
    { id: "invoice", title: "Рахунок на оплату", date, sizeMb: 0.9, format: "PDF", ready: true, href: DOC_HREF },
    {
      id: "waybill",
      title: `Видаткова накладна №${invoiceNo}`,
      date,
      sizeMb: [0.9, 1.2, 0.6][i % 3],
      format: "PDF",
      ready: true,
      href: DOC_HREF,
    },
    {
      id: "receipt",
      title: "Надходження на рахунок",
      date,
      sizeMb: 0.4,
      format: "PDF",
      ready: payment.kind === "paid",
      pendingNote: "З'явиться після оплати",
      href: DOC_HREF,
    },
  ];
}

// «Термін оплати»: the example order keeps the master's «до 24.07.2026»;
// an overdue order fell due `days` before today (so «Прострочено на 3
// дні» and the date agree) and an overdue remainder yesterday; every
// other order is due about two months after it was placed.
function dueDate(pay: PaymentState, i: number, date: string): string {
  if (i === PLAN.length - 1) return "2026-07-24";
  if (pay.kind === "overdue") return iso(pay.days);
  if (pay.kind === "partial" && pay.overdue !== undefined) return iso(1);
  return iso(-61 + (i % 7), new Date(Date.parse(`${date}T00:00:00Z`)));
}

export const ORDERS: Order[] = PLAN.map(([status, payment], i) => {
  const number = String(48291037 + (PLAN.length - 1 - i));
  const date = iso(i);
  const items = itemsFor(i);
  const total = round2(items.reduce((s, it) => s + it.qty * it.price, 0));
  // Placeholder payments are expressed in hryvnias of a ~4 000 order:
  // the paid part is clamped to 40 % of the order's own total, and an
  // overdue remainder («Залишок N ₴ прострочено») is whatever is left, so
  // paid + overdue = total (1 500 of 3 900 leaves 2 400).
  const fixPayment = (p: PaymentState): PaymentState => {
    if (p.kind !== "partial") return p;
    const paid = Math.min(p.paid, Math.round(total * 0.4));
    return p.overdue === undefined ? { kind: "partial", paid } : { kind: "partial", paid, overdue: round2(total - paid) };
  };
  const pay = fixPayment(payment);
  // The oldest order is the master's №48291037: «ТОВ "Мережа готелів
  // "Зоряний шлях"», «Олена Коваль», Самовивіз (Київ), Післяплата «до
  // 24.07.2026» (5052:57003, 5052:56949).
  const k = i === PLAN.length - 1 ? 0 : i;
  return {
    id: number,
    number,
    date,
    total,
    counterparty: COUNTERPARTIES[k % COUNTERPARTIES.length],
    status,
    payment: pay,
    createdBy: CREATORS[k % CREATORS.length],
    paymentType: PAYMENT_TYPES[k % PAYMENT_TYPES.length],
    paymentDue: dueDate(pay, i, date),
    delivery: DELIVERIES[k % DELIVERIES.length],
    items,
    documents: documentsFor(number, date, pay, i),
  };
});

export function findOrder(id: string): Order | undefined {
  return ORDERS.find((o) => o.id === id);
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

// Returns already in the system: one per return status, on orders that
// were received or completed («Деталі повернення» 5192:79067 = the first
// one, «На розгляді» with three lines and the reasons Брак / Брак / Не
// той товар).
const RETURN_PLAN: { order: number; status: ReturnStatus; daysAfter: number; picks: [number, string][]; solution: number; delivery: number }[] = [
  { order: 3, status: "review", daysAfter: 2, picks: [[0, "Брак"], [1, "Брак"], [2, "Не той товар"]], solution: 0, delivery: 1 },
  { order: 8, status: "created", daysAfter: 1, picks: [[0, "Не той товар"]], solution: 1, delivery: 0 },
  { order: 6, status: "approved", daysAfter: 3, picks: [[0, "Брак"], [1, "Пошкоджено при доставці"]], solution: 0, delivery: 1 },
  { order: 12, status: "rejected", daysAfter: 4, picks: [[0, "Інше"]], solution: 2, delivery: 2 },
  { order: 14, status: "inTransit", daysAfter: 2, picks: [[0, "Брак"]], solution: 0, delivery: 0 },
  { order: 17, status: "accepted", daysAfter: 5, picks: [[0, "Не той товар"], [1, "Брак"]], solution: 1, delivery: 1 },
  { order: 18, status: "completed", daysAfter: 6, picks: [[0, "Брак"]], solution: 0, delivery: 1 },
  { order: 22, status: "cancelled", daysAfter: 2, picks: [[0, "Пошкоджено при доставці"]], solution: 2, delivery: 2 },
  { order: 23, status: "completed", daysAfter: 7, picks: [[0, "Брак"], [1, "Брак"]], solution: 1, delivery: 0 },
  { order: 25, status: "review", daysAfter: 3, picks: [[0, "Не той товар"]], solution: 0, delivery: 1 },
  { order: 26, status: "completed", daysAfter: 8, picks: [[0, "Брак"]], solution: 0, delivery: 0 },
  { order: 3, status: "created", daysAfter: 0, picks: [[3, "Інше"]], solution: 2, delivery: 1 },
];

export const RETURNS: ReturnRequest[] = RETURN_PLAN.flatMap((r, i) => {
  const order = ORDERS[r.order];
  if (!order) return [];
  const lines = r.picks
    .filter(([idx]) => idx < order.items.length)
    .map(([idx, reason]) => ({ itemId: order.items[idx].id, qty: order.items[idx].qty, reason }));
  if (lines.length === 0) return [];
  return [
    {
      id: String(9104 - i),
      orderId: order.id,
      date: iso(-r.daysAfter, new Date(Date.parse(`${order.date}T00:00:00Z`))),
      status: r.status,
      lines,
      solution: RETURN_SOLUTIONS[r.solution],
      delivery: RETURN_DELIVERY[r.delivery],
    },
  ];
});

export function returnTotal(ret: ReturnRequest, order: Order | undefined): number {
  if (!order) return 0;
  const sum = ret.lines.reduce((s, line) => {
    const item = order.items.find((it) => it.id === line.itemId);
    return item ? s + lineSum(item, line.qty) : s;
  }, 0);
  return Math.round(sum * 100) / 100;
}

// «Документи повернення» (5192:79167) - the master repeats the order's
// three tiles verbatim; the CRM will supply the real return papers.
export function returnDocuments(ret: ReturnRequest, order: Order): OrderDocument[] {
  return documentsFor(order.number, ret.date, ret.status === "completed" ? { kind: "paid" } : { kind: "awaiting" }, Number(ret.id));
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

export { ANCHOR as ORDERS_TODAY };
