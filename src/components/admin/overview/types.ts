import type { Permission } from "@/components/admin/lib/permissions";
import type { OrderStatus } from "@/components/platform/orders/data";

// The figures of the overview page (the dashboard) and the "waits for
// somebody" counters other screens reuse. Shared by the routes
// (src/app/api/admin/overview/**), the repo (src/server/admin/repos/overview.ts)
// and the screens. Types and plain constants only: no "use client", no
// server import.
//
//   GET /api/admin/overview?period=30d          [dashboard.view]
//     -> { ok: true, overview: OverviewData }   (OverviewResponse)
//     400 "bad-request" when `period` is not one of OVERVIEW_PERIODS
//     (no `period` = DEFAULT_OVERVIEW_PERIOD).
//   GET /api/admin/overview/attention           [any signed-in member of staff]
//     -> { ok: true, attention: AttentionItem[] } (AttentionResponse)
//
// Conventions of every figure:
// - Days are Kyiv business days "YYYY-MM-DD"; moments are ISO strings.
// - Money is UAH with at most 2 decimals.
// - Orders and revenue count every order whose status is not "cancelled",
//   by the order's business day (its `date`), both channels together.
// - Everything is computed on request (no cache).
// - A section the caller's role may not see is left out of the answer (an
//   optional field below is then absent, never null); the page must cope.
// - Money and order figures need orders.view: without it the answer has no
//   orders / revenue / averageOrder KPI, no series, byStatus, byChannel,
//   topProducts, topCompanies, recentOrders, hasData or suggestedPeriod.
//   newCustomers needs customers.view, newLeads leads.view.

export const OVERVIEW_PERIODS = ["7d", "30d", "90d", "12m", "all"] as const;
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];

export const DEFAULT_OVERVIEW_PERIOD: OverviewPeriod = "30d";

export const OVERVIEW_PERIOD_LABELS: Record<OverviewPeriod, string> = {
  "7d": "7 днів",
  "30d": "30 днів",
  "90d": "90 днів",
  "12m": "12 місяців",
  all: "Увесь час",
};

// How many rows the lists of the answer hold at most (skeletons can use
// them too).
export const OVERVIEW_LIMITS = { recentOrders: 8, recentLeads: 5, topProducts: 6, topCompanies: 5 } as const;

// One point of the chart covers a day ("7d", "30d", "90d") or a calendar
// month ("12m", "all"). "week" is part of the contract for a later custom
// range; no current period produces it.
export type OverviewBucket = "day" | "week" | "month";

export type OverviewRange = {
  period: OverviewPeriod;
  // First and last day of the period, both included. The last day is
  // today (Kyiv). "12m" starts on the 1st of the month eleven months back
  // (twelve calendar months with the current one). "all" starts on the 1st
  // of the month of the earliest order (of today's month when there is no
  // order before today) and ends today, or on the latest order's day if an
  // order is dated after today, so it always holds every order.
  from: string;
  to: string;
  bucket: OverviewBucket;
  // The period of equal length just before (what `previous` of the KPIs
  // is computed over); null for "all".
  previous: { from: string; to: string } | null;
};

// A key figure and the same figure over `range.previous` (null for "all").
export type KpiFigure = { value: number; previous: number | null };

// Each figure is present only when the role may see what it counts (an
// empty object for a role that may see none of them).
export type OverviewKpis = {
  // Orders that are not cancelled. Needs orders.view.
  orders?: KpiFigure;
  // Sum of their totals, UAH. Needs orders.view.
  revenue?: KpiFigure;
  // revenue / orders, UAH (0 when there are no orders). Needs orders.view.
  averageOrder?: KpiFigure;
  // Customer accounts (B2B and B2C users) created in the period, by their
  // Kyiv day; "all" counts every account. Needs customers.view.
  newCustomers?: KpiFigure;
  // Form submissions received in the period; "all" counts every one.
  // Needs leads.view.
  newLeads?: KpiFigure;
};

// One bucket of the chart. Every bucket of the range is present, empty
// ones as zeros, so a chart has no gaps. Sums over all points equal
// kpis.orders.value and kpis.revenue.value.
export type OverviewSeriesPoint = {
  // First day of the bucket, "YYYY-MM-DD" (the 1st for month buckets).
  x: string;
  orders: number;
  revenue: number;
  // Revenue of partner orders and of retail orders: b2b + retail = revenue.
  b2b: number;
  retail: number;
  // Not-cancelled orders of each channel: b2bOrders + retailOrders = orders.
  b2bOrders: number;
  retailOrders: number;
};

// The status order of the panel (the cabinet's badge order).
export const OVERVIEW_STATUS_ORDER: readonly OrderStatus[] = [
  "new",
  "blocked",
  "inProgress",
  "shipped",
  "received",
  "completed",
  "cancelled",
];

// Orders of the period per status, cancelled ones included. Every status of
// OVERVIEW_STATUS_ORDER is listed in that order (zeros included); a value a
// document holds that the code does not know follows them, so the counts
// always add up to every order of the period.
export type OverviewStatusRow = { status: string; count: number; total: number };

export type OverviewChannel = "b2b" | "retail";

// Not-cancelled orders of the period per channel; both channels always
// listed. Counts add up to kpis.orders.value.
export type OverviewChannelRow = { channel: OverviewChannel; count: number; total: number };

export const OVERVIEW_CHANNEL_LABELS: Record<OverviewChannel, string> = {
  b2b: "Партнери",
  retail: "Роздріб",
};

// --- attention -----------------------------------------------------------

export type AttentionKey =
  | "newOrders"
  | "cancelRequests"
  | "returnsWaiting"
  | "overduePayments"
  | "newLeads"
  | "unlistedProducts"
  | "unavailableProducts"
  | "draftPosts"
  | "outboxPending"
  | "erpQueue";

// Things that wait for somebody, in this order. An item is present only
// when the caller may open its target (the permission named here), and it
// is present with count 0 as well, so a screen can say "nothing waits".
export const ATTENTION_META: Record<AttentionKey, { label: string; permission: Permission; href: string }> = {
  // Orders with status "new".
  newOrders: { label: "Нові замовлення", permission: "orders.view", href: "/admin/orders?status=new" },
  // Partner requests to cancel an order in progress, not decided yet
  // (cancel.request true on an order that is not cancelled).
  cancelRequests: {
    label: "Запити на скасування",
    permission: "orders.view",
    href: "/admin/orders?cancelRequest=true",
  },
  // Return requests "created" or "review".
  returnsWaiting: {
    label: "Повернення чекають рішення",
    permission: "returns.view",
    href: "/admin/returns?status=created,review",
  },
  // The orders of overdueOrdersFilter (src/server/admin/repos/orders.ts),
  // the rule the list this row links to filters by: partner orders, not
  // cancelled, that still owe money and are stored as overdue (payment
  // "overdue", or "partial" with an overdue remainder) or whose due date is
  // before the company's today (the demo company's fixed day, else today
  // in Kyiv). `total` = what they owe, computed as the cabinet does: the
  // overdue remainder of a partial payment, else the total less what was
  // paid.
  overduePayments: {
    label: "Прострочені оплати",
    permission: "orders.view",
    href: "/admin/orders?payment=overdue",
  },
  // Form submissions with status "new".
  newLeads: { label: "Нові заявки", permission: "leads.view", href: "/admin/leads?status=new" },
  // Products with `listed: false` that are not archived.
  unlistedProducts: {
    label: "Не показані в каталозі",
    permission: "catalog.view",
    href: "/admin/products?listed=false",
  },
  // Products with `available: false` that are not archived.
  unavailableProducts: {
    label: "Немає в наявності",
    permission: "catalog.view",
    href: "/admin/products?available=false",
  },
  // Blog posts with status "draft".
  draftPosts: { label: "Чернетки статей", permission: "content.view", href: "/admin/blog?status=draft" },
  // Outbox messages never sent (sentAt null).
  outboxPending: { label: "Листи не надіслано", permission: "integrations.view", href: "/admin/integrations/mail" },
  // Exchange queue entries the ERP has not taken (pending) or refused
  // (error).
  erpQueue: { label: "Черга обміну з BAS", permission: "integrations.view", href: "/admin/integrations/bas" },
};

export const ATTENTION_KEYS = Object.keys(ATTENTION_META) as AttentionKey[];

export type AttentionCount = {
  key: Exclude<AttentionKey, "erpQueue">;
  count: number;
  // Money behind the count, UAH: the sum of the new orders (newOrders) and
  // what the overdue orders owe (overduePayments). Absent on the others.
  total?: number;
  // Only on outboxPending: true when a mail service is set up and able to
  // send (the unsent messages then leave by themselves), false when none
  // is, so the messages wait for somebody to connect one. Absent when the
  // mail settings could not be read.
  providerReady?: boolean;
  href: string;
};

export type AttentionQueue = {
  key: "erpQueue";
  // pending + errors.
  count: number;
  pending: number;
  errors: number;
  href: string;
};

export type AttentionItem = AttentionCount | AttentionQueue;

// --- lists ---------------------------------------------------------------

// The 8 most recently placed orders (by creation time, any period).
// Needs orders.view.
export type OverviewRecentOrder = {
  id: string;
  number: string;
  channel: OverviewChannel;
  // Business day of the order.
  date: string;
  // An OrderStatus key (see OverviewStatusRow).
  status: string;
  total: number;
  // Partner orders: the counterparty; retail: the company of an invoice,
  // else the buyer's name, else the e-mail.
  customer: string;
  createdAt: string;
};

export type OverviewLeadKind = "quiz" | "star-checklist" | "partner-contact";
export type OverviewLeadStatus = "new" | "in_progress" | "done" | "spam";

// The 5 most recent form submissions. Needs leads.view.
export type OverviewRecentLead = {
  id: string;
  kind: OverviewLeadKind;
  // contact name, else company, else e-mail, else phone ("" when none).
  name: string;
  createdAt: string;
  status: OverviewLeadStatus;
};

// The best products of the period by revenue (price x qty of the lines of
// not-cancelled orders, both channels). Name and image are the live
// product's, or the order line's snapshot when the product is gone.
export type OverviewTopProduct = {
  productId: string;
  name: string;
  image: string;
  qty: number;
  revenue: number;
};

// The best partner companies of the period by revenue of their
// not-cancelled orders. Needs customers.view and orders.view (it is money).
export type OverviewTopCompany = {
  clientId: string;
  name: string;
  orders: number;
  revenue: number;
};

// Sizes of the whole database. Each field is present only when the role
// may open its section: products and listedProducts need catalog.view,
// customers and companies customers.view, posts content.view, staff
// staff.manage.
export type OverviewTotals = {
  // Every product document.
  products?: number;
  // Listed and not archived.
  listedProducts?: number;
  // Customer accounts (users).
  customers?: number;
  // Partner companies (clients).
  companies?: number;
  posts?: number;
  // Staff accounts, blocked ones included.
  staff?: number;
};

export type OverviewData = {
  range: OverviewRange;
  kpis: OverviewKpis;
  // The order figures of the period: present only with orders.view.
  series?: OverviewSeriesPoint[];
  byStatus?: OverviewStatusRow[];
  byChannel?: OverviewChannelRow[];
  topProducts?: OverviewTopProduct[];
  attention: AttentionItem[];
  // orders.view.
  recentOrders?: OverviewRecentOrder[];
  // leads.view.
  recentLeads?: OverviewRecentLead[];
  // customers.view and orders.view.
  topCompanies?: OverviewTopCompany[];
  totals: OverviewTotals;
  // The period holds at least one order (of any status). orders.view.
  hasData?: boolean;
  // Set only when hasData is false: the shortest period that holds an
  // order (null when no period does, or when hasData is true). The demo
  // data lives around May 2026, so a short period may be empty and the
  // page can switch once. orders.view (absent together with hasData).
  suggestedPeriod?: OverviewPeriod | null;
};

export type OverviewResponse = { ok: true; overview: OverviewData };
export type AttentionResponse = { ok: true; attention: AttentionItem[] };
