import "server-only";
import {
  COUNTERPARTIES,
  RETURN_DELIVERY,
  RETURN_SOLUTIONS,
  documentSet,
  type DeliveryInfo,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentState,
  type ReturnRequest,
  type ReturnStatus,
} from "@/components/platform/orders/data";
import type { OrderDocumentDoc } from "../../db/collections";

// The demo company's cabinet history, exactly as the browser mock
// (src/components/platform/orders/data.ts before the database) generated
// it: 28 orders, 12 returns and the three documents of every order. Read
// by src/server/seed/orders.ts only. Deterministic, no randomness: the
// generators below are the mock's, moved here verbatim (comments
// included); only the documents carry the stored file location instead of
// the link (the link is the API route, built when the payload is read).
//
// The master's example list is dated 24.04.2026 - 24.05.2026 and counts
// «1-10 із 28»; the placeholder puts one order a day inside that window.
const ANCHOR = new Date(Date.UTC(2026, 4, 24));

function iso(daysBack: number, from: Date = ANCHOR): string {
  const d = new Date(from.getTime() - daysBack * 86400000);
  return d.toISOString().slice(0, 10);
}

// A placeholder document file (the materials library's one-page PDF).
export const DEMO_DOCUMENT_FILE = "/figma-export/materials/placeholder.pdf";

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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// An order of the demo history: the cabinet's Order with the stored
// documents (file location, no link).
export type DemoOrder = Omit<Order, "documents"> & { documents: OrderDocumentDoc[] };

export const DEMO_ORDERS: DemoOrder[] = PLAN.map(([status, payment], i) => {
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
    documents: documentSet(number, date, pay.kind === "paid", i).map((doc) => ({ ...doc, file: DEMO_DOCUMENT_FILE })),
  };
});

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

export const DEMO_RETURNS: ReturnRequest[] = RETURN_PLAN.flatMap((r, i) => {
  const order = DEMO_ORDERS[r.order];
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
