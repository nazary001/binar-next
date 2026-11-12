// «Dashboard» — Figma «Dashboard :: Admin» 5052:32105 (frame 5052:32106).
// The partner's landing page in the B2B cabinet. There is no ledger feed
// yet, so every figure is derived from the company's orders as the
// session payload holds them (platform/orders/store.ts useOrders(), every
// cancellation applied): one ledger and one clock for both pages.
//   - three KPI tiles: «Поточний баланс» = what the open orders still
//     owe (the sum of the payment cards), «Прострочена ДЗ» = the overdue
//     part of it, «Кредитний ліміт» = the company's credit limit per
//     counterparty (clients.creditLimits, the demo company's add up to
//     the master's 500 000 ₴) with the balance as its used part (the
//     bar) and the remainder («Доступно»);
//   - «Останні замовлення»: the three newest orders, so every row opens
//     a real /orders/<id> page and reads exactly like the orders list;
//   - «Найближчі платежі»: one «Платіж» card (4949:62452) per open order:
//     its «Термін оплати», the amount still due and the «Протерміновано»
//     chip exactly when the orders list flags the order overdue; overdue
//     cards first, then by due date;
//   - «Ваш менеджер»: the account manager card, verbatim.
// The «Усі контрагенти» select scopes everything to one counterparty.
// A company without orders or credit lines sees the empty cabinet and the
// counterparties of its profile (DashboardView).

import {
  MANAGER_MAILTO,
  daysPlural,
  formatDate,
  formatSum,
  paidAmount,
  type Order,
} from "../orders/data";

export { formatDate, formatSum };

export const ALL = "all";
// ALL or a counterparty name.
export type CounterpartyFilter = string;
export type CounterpartyOption = { value: CounterpartyFilter; label: string };

// The counterparties the company's ledger knows: its credit lines in
// their order, then any other counterparty its orders name. Empty for a
// company with neither (the select then lists the profile's
// counterparties). For the demo company these are the four names of its
// orders, in the order the select always listed them.
export type CreditLimit = { counterparty: string; limit: number };

export function ledgerCounterparties(orders: readonly Order[], limits: readonly CreditLimit[]): string[] {
  return [...new Set([...limits.map((l) => l.counterparty), ...orders.map((o) => o.counterparty)].filter(Boolean))];
}

export function counterpartyOptions(names: readonly string[]): CounterpartyOption[] {
  return [{ value: ALL, label: "Усі контрагенти" }, ...names.map((name) => ({ value: name, label: name }))];
}

const matches = (filter: CounterpartyFilter, counterparty: string) =>
  filter === ALL || counterparty === filter;

// ------------------------------------------------------------- Ledger

// An order still owes money unless it is paid or cancelled.
const owes = (o: Order) => o.payment.kind !== "paid" && o.status !== "cancelled";

// The orders list's red captions: «Прострочено на N днів» and «Залишок
// N ₴ прострочено» (the data dates both before the cabinet's today).
export function isLate(o: Order): boolean {
  return o.payment.kind === "overdue" || (o.payment.kind === "partial" && o.payment.overdue !== undefined);
}

// What an open order still owes: the overdue remainder the orders list
// names («Залишок 2 400 ₴ прострочено»), else the total less what is paid.
function amountDue(o: Order): number {
  const p = o.payment;
  if (p.kind === "partial" && p.overdue !== undefined) return p.overdue;
  return Math.round((o.total - paidAmount(o)) * 100) / 100;
}

function openOrders(orders: Order[], filter: CounterpartyFilter): Order[] {
  return orders.filter((o) => owes(o) && matches(filter, o.counterparty) && amountDue(o) > 0);
}

// ---------------------------------------------------------------- KPIs

export type Kpis = {
  // «Поточний баланс»
  balance: number;
  // «Прострочена ДЗ» (overdue receivables)
  overdue: number;
  // «Кредитний ліміт» and the part of it already used; the bar fills
  // used / limit, «Доступно» = limit - used.
  creditLimit: number;
  creditUsed: number;
};

export const NO_KPIS: Kpis = { balance: 0, overdue: 0, creditLimit: 0, creditUsed: 0 };

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);

// The tiles print whole hryvnias (the master's «24 500 ₴»). `limits` =
// the company's credit limit per counterparty name (OrdersPayload
// creditLimits); "Усі контрагенти" adds them all up.
export function kpisFor(orders: Order[], filter: CounterpartyFilter, limits: readonly CreditLimit[]): Kpis {
  const open = openOrders(orders, filter);
  const balance = Math.round(sum(open.map(amountDue)));
  const overdue = Math.round(sum(open.filter(isLate).map(amountDue)));
  const creditLimit = sum(limits.filter((l) => matches(filter, l.counterparty)).map((l) => l.limit));
  return { balance, overdue, creditLimit, creditUsed: balance };
}

// ------------------------------------------------------- Recent orders

export const RECENT_ORDERS_LIMIT = 3;

// The newest orders of the scope, newest first.
export function recentOrders(orders: Order[], filter: CounterpartyFilter): Order[] {
  return orders
    .filter((o) => matches(filter, o.counterparty))
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
    .slice(0, RECENT_ORDERS_LIMIT);
}

export type PaymentCaption = { text: string; tone: "subtle" | "attention" };

// The ONE caption line under «Badge / Payment Status» («with caption»
// 5052:32197), worded like the orders list (OrdersView PaymentCell):
// grey «до dd.mm.yyyy» for a due order, red «Прострочено на N дні(в)»
// with the attention glyph for an overdue one (5052:32232: the red line
// takes the grey line's place), grey «paid із total» for a partly paid
// one and, by the same rule, red «Залишок N ₴ прострочено» instead of it
// when the remainder is overdue (the master draws no third line, so the
// row keeps its 112), grey «Оплачено вчасно» / red «Оплачено із
// простроченням» (4573:37586) for a settled one. A cancelled order asks
// for nothing: no due date, no overdue alert (null = the bare chip).
export function paymentCaption(order: Order): PaymentCaption | null {
  const p = order.payment;
  const cancelled = order.status === "cancelled";
  switch (p.kind) {
    case "awaiting":
      return cancelled ? null : { text: `до ${formatDate(order.paymentDue)}`, tone: "subtle" };
    case "overdue":
      return cancelled ? null : { text: `Прострочено на ${p.days} ${daysPlural(p.days)}`, tone: "attention" };
    case "partial":
      return p.overdue === undefined || cancelled
        ? { text: `${formatAmount(p.paid)} із ${formatSum(order.total)}`, tone: "subtle" }
        : { text: `Залишок ${formatSum(p.overdue)} прострочено`, tone: "attention" };
    case "paid":
      return p.late
        ? { text: "Оплачено із простроченням", tone: "attention" }
        : { text: "Оплачено вчасно", tone: "subtle" };
  }
}

// --------------------------------------------------------- Payments

export type UpcomingPayment = {
  id: string;
  invoice: string;
  amount: number;
  // ISO due date = the order's «Термін оплати».
  due: string;
  // The order is overdue in the orders list («Протерміновано»).
  overdue: boolean;
  counterparty: string;
  // The order the invoice was issued for (the card opens it).
  orderId: string;
};

// The number of an order's «Рахунок на оплату» (the order documents carry
// none yet): seven digits like the master's «7890088».
const invoiceOf = (o: Order) => `789${o.number.slice(-4)}`;

// Cards shown up front, and how many more each «Показати ще N» adds.
export const PAYMENTS_STEP = 5;
export const PAYMENTS_VISIBLE = 3;

export function paymentsFor(orders: Order[], filter: CounterpartyFilter): UpcomingPayment[] {
  return openOrders(orders, filter)
    .map((o) => ({
      id: `pay-${o.id}`,
      invoice: invoiceOf(o),
      amount: amountDue(o),
      due: o.paymentDue,
      overdue: isLate(o),
      counterparty: o.counterparty,
      orderId: o.id,
    }))
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) || a.due.localeCompare(b.due) || a.orderId.localeCompare(b.orderId),
    );
}

// Three-letter Ukrainian month of the date tile (the master writes it
// lower-case and the tile upper-cases it: «чер» -> ЧЕР).
const MONTHS_SHORT = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];

export function dueParts(isoDate: string): { day: string; month: string } {
  const [, m, d] = isoDate.split("-");
  return { day: String(Number(d)), month: MONTHS_SHORT[Number(m) - 1] };
}

// --------------------------------------------------------- Manager

export type Manager = {
  name: string;
  role: string;
  // Displayed as written; `phoneHref` is the dialable form.
  phone: string;
  phoneHref: string;
  email: string;
};

// «Ваш менеджер» (5052:32286), verbatim; the mailbox is the orders pages'
// MANAGER_MAILTO, so both pages write to the same address.
export const MANAGER: Manager = {
  name: "Олена Коваль",
  role: "менеджер B2B клієнтів",
  phone: "+380 67 123 4567",
  phoneHref: "+380671234567",
  email: MANAGER_MAILTO.replace(/^mailto:/, ""),
};

// ----------------------------------------------------------- Format

// 1500 -> «1 500» (no sign: the master's partial-payment caption «1 500
// із 3 900 ₴»).
export function formatAmount(value: number): string {
  return formatSum(value).replace(/ ₴$/, "");
}

// ------------------------------------------------------ Filter memory

// The chosen counterparty survives a Back from an order / payment (spec
// 2.11, DB-18): kept for the tab in sessionStorage. DashboardView checks
// the stored name against its options, so another account in the same
// tab falls back to "Усі контрагенти".
export const DASHBOARD_FILTER_KEY = "binar.dashboard.counterparty.v1";

export function readStoredFilter(): CounterpartyFilter {
  if (typeof window === "undefined") return ALL;
  try {
    return window.sessionStorage.getItem(DASHBOARD_FILTER_KEY) || ALL;
  } catch {
    return ALL;
  }
}

export function storeFilter(filter: CounterpartyFilter): void {
  try {
    if (filter === ALL) window.sessionStorage.removeItem(DASHBOARD_FILTER_KEY);
    else window.sessionStorage.setItem(DASHBOARD_FILTER_KEY, filter);
  } catch {
    // Storage blocked (private mode): the filter just resets on Back.
  }
}
