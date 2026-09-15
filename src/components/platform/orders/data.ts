// «Мої замовлення» — Figma «Мої Замовлення : Admin» 4573:37243. The
// order list of a signed-in partner. There is no CRM feed yet, so the
// page reads a deterministic placeholder list shaped the way the master
// draws it: every order status badge, every payment state (awaiting,
// overdue, partial with an overdue remainder, paid late) and several
// counterparties, 28 orders so the «1-10 із 28» pagination is real.

export type OrderStatus = "new" | "inProgress" | "shipped" | "received" | "blocked";

export type PaymentState =
  | { kind: "awaiting" }
  | { kind: "overdue"; days: number }
  | { kind: "partial"; paid: number; overdue?: number }
  | { kind: "paid"; late?: boolean };

export type Order = {
  id: string;
  number: string;
  // ISO date; rendered as dd.mm.yyyy.
  date: string;
  total: number;
  counterparty: string;
  status: OrderStatus;
  payment: PaymentState;
};

// «Badge / Order Status» (3563:16447 family): pill fill, dot and label
// colours per state, verbatim from the master.
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  new: { label: "Нове", bg: "#e8f7ff", text: "#0a6f9e", dot: "#0b8fc5" },
  inProgress: { label: "В роботі", bg: "#fff1eb", text: "#d94e0b", dot: "#f85a0b" },
  shipped: { label: "Відвантажено", bg: "#eef2ff", text: "#4569d4", dot: "#4f7de8" },
  received: { label: "Отримано", bg: "#e8f8f4", text: "#178d72", dot: "#27ae85" },
  blocked: { label: "Заблоковано", bg: "#fff5dd", text: "#805300", dot: "#d89a00" },
};

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  "new",
  "inProgress",
  "shipped",
  "received",
  "blocked",
];

export const COUNTERPARTIES = [
  "Mirotel LTD",
  "Готель «Дністер»",
  "Rixos Prykarpattya",
  "Спа-готель «Едем»",
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

function iso(daysBack: number): string {
  const d = new Date(ANCHOR.getTime() - daysBack * 86400000);
  return d.toISOString().slice(0, 10);
}

const PAYMENTS: PaymentState[] = [
  { kind: "awaiting" },
  { kind: "overdue", days: 3 },
  { kind: "awaiting" },
  { kind: "partial", paid: 1500, overdue: 2400 },
  { kind: "awaiting" },
  { kind: "overdue", days: 3 },
  { kind: "paid", late: true },
  { kind: "awaiting" },
  { kind: "awaiting" },
  { kind: "paid", late: true },
  { kind: "paid" },
  { kind: "partial", paid: 2000 },
];

const TOTALS = [3900, 12450, 870.5, 25300, 3900, 6120, 1480, 9990, 3900, 15600, 2250, 44800];

export const ORDERS: Order[] = Array.from({ length: 28 }, (_, i) => ({
  id: `order-${10245 + i}`,
  number: `№ ${10245 + i}`,
  date: iso(i),
  total: TOTALS[i % TOTALS.length],
  counterparty: COUNTERPARTIES[i % COUNTERPARTIES.length],
  status: ORDER_STATUS_ORDER[[1, 3, 2, 1, 0, 3, 4, 2, 1, 0, 3, 1][i % 12]],
  payment: PAYMENTS[i % PAYMENTS.length],
}));

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

// 3900 -> «3 900 ₴», 870.5 -> «870,50 ₴».
export function formatSum(value: number): string {
  const whole = Number.isInteger(value);
  const [int, dec] = value.toFixed(whole ? 0 : 2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped}${dec ? `,${dec}` : ""} ₴`;
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
