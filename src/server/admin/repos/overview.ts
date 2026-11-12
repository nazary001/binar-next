import "server-only";
import type { Document, Filter } from "mongodb";
import { hasPermission, type Permission } from "@/components/admin/lib/permissions";
import {
  ATTENTION_META,
  OVERVIEW_LIMITS,
  OVERVIEW_PERIODS,
  OVERVIEW_STATUS_ORDER,
  type AttentionCount,
  type AttentionItem,
  type AttentionKey,
  type KpiFigure,
  type OverviewChannelRow,
  type OverviewData,
  type OverviewKpis,
  type OverviewPeriod,
  type OverviewRecentLead,
  type OverviewRecentOrder,
  type OverviewSeriesPoint,
  type OverviewStatusRow,
  type OverviewTopCompany,
  type OverviewTopProduct,
  type OverviewTotals,
} from "@/components/admin/overview/types";
import type { CheckoutValues } from "@/components/checkout/data";
import {
  COLLECTION,
  collection,
  type CollectionDocs,
  type CollectionKey,
  type OrderDoc,
} from "@/server/db/collections";
import { mailStatus } from "@/server/mail/provider";
import { round2 } from "@/server/money";
import { kyivToday } from "@/server/time";
import { overdueOrdersFilter } from "./orders";

// The figures of the overview page (GET /api/admin/overview) and the
// "waits for somebody" counters (GET /api/admin/overview/attention). The
// contract, with the meaning of every figure, is
// src/components/admin/overview/types.ts.
//
// How it is computed:
// - Everything on request, no cache: the collections are small and staff
//   expect the figures to move the moment an order arrives.
// - Every order figure of a period (KPIs, chart, statuses, channels, top
//   products and companies) comes from ONE aggregation with a $facet, so
//   the figures agree with each other even while orders are being written,
//   and no collection is ever read once per bucket.
// - The independent parts (bounds of the orders, accounts, leads, the
//   attention counters, the totals, the recent lists) run in parallel.
// - A part the role may not see is not queried at all. Money needs
//   orders.view: without it no order figure is computed or answered (the
//   content role must not see revenue); new accounts need customers.view,
//   new form submissions leads.view.

export type OverviewAccess = { permissions: ReadonlySet<Permission> };

// `now` exists for the checks: it moves "today" to test empty periods.
export type OverviewOptions = { now?: Date };

// --- days -------------------------------------------------------------------

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Day arithmetic on "YYYY-MM-DD" goes through UTC midnight: UTC has no
// daylight saving, so adding 24 h always lands on the next calendar day.
function dayMs(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

function dayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  return dayOf(dayMs(day) + days * DAY_MS);
}

function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

// The 1st of the month `months` away from the month of `day`.
function addMonths(day: string, months: number): string {
  return dayOf(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1 + months, 1));
}

const KYIV_CLOCK = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Kyiv",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

// How far Kyiv's wall clock is ahead of UTC at a moment, ms.
function kyivOffsetMs(at: number): number {
  const part: Record<string, number> = {};
  for (const { type, value } of KYIV_CLOCK.formatToParts(new Date(at))) part[type] = Number(value);
  const wall = Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second);
  return wall - (at - (at % 1000));
}

// The moment a Kyiv business day begins. Accounts and leads carry BSON
// dates, orders carry business days; this turns a range of days into a
// range of moments that an index on createdAt can serve. Kyiv is UTC+2 in
// winter and UTC+3 in summer and changes the clock at 03:00 / 04:00 local
// time, never near midnight, so the offset read 2.5 h before UTC midnight
// (23:30 or 00:30 in Kyiv) is the offset of the local midnight itself.
function kyivDayStart(day: string): Date {
  const utcMidnight = dayMs(day);
  return new Date(utcMidnight - kyivOffsetMs(utcMidnight - 2.5 * HOUR_MS));
}

// --- periods ----------------------------------------------------------------

type Span = { from: string; to: string };
type Window = Span & { bucket: "day" | "month"; previous: Span | null };
type FixedWindow = Window & { previous: Span };

const DAY_PERIODS = { "7d": 7, "30d": 30, "90d": 90 } as const;

// A period that ends today. "12m" is twelve calendar months with the
// current one, so its month buckets are whole; the day periods end today
// and start `days - 1` days earlier.
function fixedWindow(period: Exclude<OverviewPeriod, "all">, today: string): FixedWindow {
  if (period === "12m") {
    const from = addMonths(today, -11);
    return { from, to: today, bucket: "month", previous: { from: addMonths(from, -12), to: addDays(from, -1) } };
  }
  const days = DAY_PERIODS[period];
  const from = addDays(today, 1 - days);
  return { from, to: today, bucket: "day", previous: { from: addDays(from, -days), to: addDays(from, -1) } };
}

// Business days of the earliest and the latest order, and of the latest
// order not after today (which decides the suggested period).
type Bounds = { first: string | null; last: string | null; lastPast: string | null };

// "All" depends on the data: from the month of the first order to today,
// or to the latest order if one is dated after today, so the chart covers
// every order the KPIs count.
function allWindow(today: string, bounds: Bounds): Window {
  const from = monthStart(bounds.first !== null && bounds.first < today ? bounds.first : today);
  const to = bounds.last !== null && bounds.last > today ? bounds.last : today;
  return { from, to, bucket: "month", previous: null };
}

// A guard against a stray date (50 years of months); real data never gets
// near it.
const MAX_POINTS = 600;

function bucketStarts(window: Window): string[] {
  const starts: string[] = [];
  let x = window.bucket === "day" ? window.from : monthStart(window.from);
  while (x <= window.to && starts.length < MAX_POINTS) {
    starts.push(x);
    x = window.bucket === "day" ? addDays(x, 1) : addMonths(x, 1);
  }
  return starts;
}

// The bucket an order falls into, computed by the database.
function bucketKey(bucket: Window["bucket"]): unknown {
  return bucket === "day" ? "$date" : { $concat: [{ $substrCP: ["$date", 0, 7] }, "-01"] };
}

// The shortest period that holds an order, for a page that opened on an
// empty one. Periods ending today are nested (7d inside 30d inside ...),
// so the latest order not after today decides; "all" holds every order.
function suggestedPeriod(hasData: boolean, today: string, bounds: Bounds): OverviewPeriod | null {
  if (hasData) return null;
  for (const period of OVERVIEW_PERIODS) {
    if (period === "all") return bounds.first !== null ? "all" : null;
    if (bounds.lastPast !== null && fixedWindow(period, today).from <= bounds.lastPast) return period;
  }
  return null;
}

// --- small helpers ----------------------------------------------------------

// Promise.all over a record: the independent queries run at the same time
// and come back by name. A null task stays null (a part the role may not
// see).
async function allOf<T extends Record<string, unknown>>(tasks: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(tasks) as (keyof T)[];
  const values = await Promise.all(keys.map((key) => tasks[key]));
  const out = {} as { [K in keyof T]: Awaited<T[K]> };
  keys.forEach((key, index) => {
    out[key] = values[index] as Awaited<T[typeof key]>;
  });
  return out;
}

async function countOf<K extends CollectionKey>(key: K, filter: Filter<CollectionDocs[K]> = {}): Promise<number> {
  return (await collection(key)).countDocuments(filter);
}

// --- orders of a period -----------------------------------------------------

type GroupRow = { _id: { current: boolean; status: string | null; channel: string | null }; count: number; total: number };
type PointRow = { _id: { x: string | null; channel: string | null }; count: number; total: number };
type ProductRow = {
  _id: string;
  name: string | null;
  image: string | null;
  qty: number;
  revenue: number;
  product: { title?: string; image?: string }[];
};
type CompanyRow = { _id: string; orders: number; revenue: number; client: { name?: string }[] };
type OrderFacets = { groups: GroupRow[]; points: PointRow[]; products: ProductRow[]; companies?: CompanyRow[] };

const NOT_CANCELLED = { status: { $ne: "cancelled" } };

// One pass over the orders of the period and of the period before it.
// `fixed` null = "all": every order, month buckets, nothing before.
async function orderFacets(fixed: FixedWindow | null, withCompanies: boolean): Promise<OrderFacets> {
  const match: Document = fixed
    ? { date: { $gte: fixed.previous.from, $lte: fixed.to, $regex: DAY_PATTERN } }
    : { date: { $regex: DAY_PATTERN } };
  const sold: Document = { ...(fixed ? { date: { $gte: fixed.from } } : {}), ...NOT_CANCELLED };

  const facet: Document = {
    // Count and sum per (this period or the one before, status, channel):
    // the KPIs, the statuses and the channels are all folded from it.
    groups: [
      {
        $group: {
          _id: {
            current: fixed ? { $gte: ["$date", fixed.from] } : { $literal: true },
            status: "$status",
            channel: "$channel",
          },
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
    ],
    points: [
      { $match: sold },
      {
        $group: {
          _id: { x: bucketKey(fixed?.bucket ?? "month"), channel: "$channel" },
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
    ],
    // Partner lines carry `name`, retail lines `title`. Newest orders
    // first, so a line's snapshot is the latest one when the product
    // itself is gone.
    products: [
      { $match: sold },
      { $sort: { date: -1, _id: -1 } },
      { $unwind: "$items" },
      { $match: { "items.productId": { $type: "string" } } },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: { $ifNull: ["$items.name", "$items.title"] } },
          image: { $first: "$items.image" },
          qty: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.qty", 0] }] } },
        },
      },
      { $sort: { revenue: -1, _id: 1 } },
      { $limit: OVERVIEW_LIMITS.topProducts },
      {
        $lookup: {
          from: COLLECTION.products,
          localField: "_id",
          foreignField: "_id",
          pipeline: [{ $project: { title: 1, image: 1 } }],
          as: "product",
        },
      },
    ],
  };
  if (withCompanies) {
    facet.companies = [
      { $match: { ...sold, channel: "b2b" } },
      { $group: { _id: "$clientId", orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
      { $sort: { revenue: -1, _id: 1 } },
      { $limit: OVERVIEW_LIMITS.topCompanies },
      {
        $lookup: {
          from: COLLECTION.clients,
          localField: "_id",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "client",
        },
      },
    ];
  }

  const orders = await collection("orders");
  const [row] = await orders.aggregate<OrderFacets>([{ $match: match }, { $facet: facet }]).toArray();
  return row ?? { groups: [], points: [], products: [] };
}

async function orderBounds(today: string): Promise<Bounds> {
  const orders = await collection("orders");
  const [row] = await orders
    .aggregate<{ first: string; last: string; lastPast: string | null }>([
      { $match: { date: { $regex: DAY_PATTERN } } },
      {
        $group: {
          _id: null,
          first: { $min: "$date" },
          last: { $max: "$date" },
          // $max skips the nulls of the orders after today.
          lastPast: { $max: { $cond: [{ $lte: ["$date", today] }, "$date", null] } },
        },
      },
    ])
    .toArray();
  return { first: row?.first ?? null, last: row?.last ?? null, lastPast: row?.lastPast ?? null };
}

type Folded = {
  kpis: Pick<OverviewData["kpis"], "orders" | "revenue" | "averageOrder">;
  byStatus: OverviewStatusRow[];
  byChannel: OverviewChannelRow[];
  // Orders of the period of any status (cancelled included).
  inPeriod: number;
};

function average(total: number, count: number): number {
  return count > 0 ? round2(total / count) : 0;
}

function fold(groups: GroupRow[], hasPrevious: boolean): Folded {
  const now = { count: 0, total: 0 };
  const before = { count: 0, total: 0 };
  const statuses = new Map<string, { count: number; total: number }>();
  const channels = { b2b: { count: 0, total: 0 }, retail: { count: 0, total: 0 } };
  let inPeriod = 0;

  for (const row of groups) {
    const status = String(row._id.status ?? "");
    const sold = status !== "cancelled";
    if (!row._id.current) {
      if (sold) {
        before.count += row.count;
        before.total += row.total;
      }
      continue;
    }
    inPeriod += row.count;
    const entry = statuses.get(status) ?? { count: 0, total: 0 };
    entry.count += row.count;
    entry.total += row.total;
    statuses.set(status, entry);
    if (!sold) continue;
    now.count += row.count;
    now.total += row.total;
    const channel = row._id.channel;
    if (channel === "b2b" || channel === "retail") {
      channels[channel].count += row.count;
      channels[channel].total += row.total;
    }
  }

  const known = new Set<string>(OVERVIEW_STATUS_ORDER);
  const unknown = [...statuses.keys()].filter((status) => !known.has(status)).sort();
  const byStatus = [...OVERVIEW_STATUS_ORDER, ...unknown].map((status) => {
    const entry = statuses.get(status) ?? { count: 0, total: 0 };
    return { status, count: entry.count, total: round2(entry.total) };
  });

  const revenue = round2(now.total);
  const previousRevenue = round2(before.total);
  return {
    kpis: {
      orders: { value: now.count, previous: hasPrevious ? before.count : null },
      revenue: { value: revenue, previous: hasPrevious ? previousRevenue : null },
      // From the rounded revenue, so revenue / orders gives the same figure
      // wherever it is recomputed.
      averageOrder: {
        value: average(revenue, now.count),
        previous: hasPrevious ? average(previousRevenue, before.count) : null,
      },
    },
    byStatus,
    byChannel: (["b2b", "retail"] as const).map((channel) => ({
      channel,
      count: channels[channel].count,
      total: round2(channels[channel].total),
    })),
    inPeriod,
  };
}

function seriesOf(window: Window, points: PointRow[]): OverviewSeriesPoint[] {
  const byX = new Map<string, OverviewSeriesPoint>();
  for (const x of bucketStarts(window)) {
    byX.set(x, { x, orders: 0, revenue: 0, b2b: 0, retail: 0, b2bOrders: 0, retailOrders: 0 });
  }
  for (const row of points) {
    const point = byX.get(String(row._id.x));
    if (!point) continue;
    point.orders += row.count;
    point.revenue += row.total;
    if (row._id.channel === "b2b") {
      point.b2b += row.total;
      point.b2bOrders += row.count;
    } else if (row._id.channel === "retail") {
      point.retail += row.total;
      point.retailOrders += row.count;
    }
  }
  return [...byX.values()].map((point) => ({
    ...point,
    revenue: round2(point.revenue),
    b2b: round2(point.b2b),
    retail: round2(point.retail),
  }));
}

function topProductsOf(rows: ProductRow[]): OverviewTopProduct[] {
  return rows.map((row) => ({
    productId: row._id,
    name: row.product[0]?.title || row.name || row._id,
    image: row.product[0]?.image || row.image || "",
    qty: row.qty,
    revenue: round2(row.revenue),
  }));
}

function topCompaniesOf(rows: CompanyRow[]): OverviewTopCompany[] {
  return rows.map((row) => ({
    clientId: row._id,
    name: row.client[0]?.name || row._id,
    orders: row.orders,
    revenue: round2(row.revenue),
  }));
}

// --- accounts and leads -----------------------------------------------------

// Documents created in the period and in the one before, by Kyiv day.
// "All" counts every document.
async function createdFigure(key: "users" | "leads", fixed: FixedWindow | null): Promise<KpiFigure> {
  if (!fixed) return { value: await countOf(key), previous: null };
  const start = kyivDayStart(fixed.from);
  const col = await collection(key);
  const [row] = await col
    .aggregate<{ current: number; previous: number }>([
      {
        $match: { createdAt: { $gte: kyivDayStart(fixed.previous.from), $lt: kyivDayStart(addDays(fixed.to, 1)) } },
      },
      {
        $group: {
          _id: null,
          current: { $sum: { $cond: [{ $gte: ["$createdAt", start] }, 1, 0] } },
          previous: { $sum: { $cond: [{ $lt: ["$createdAt", start] }, 1, 0] } },
        },
      },
    ])
    .toArray();
  return { value: row?.current ?? 0, previous: row?.previous ?? 0 };
}

// --- recent lists -----------------------------------------------------------

function customerOf(doc: OrderDoc): string {
  if (doc.channel === "b2b") return doc.counterparty || doc.clientId;
  const checkout: Partial<CheckoutValues> = doc.checkout ?? {};
  return (checkout.invoice && checkout.company) || checkout.name || checkout.email || "";
}

async function recentOrders(): Promise<OverviewRecentOrder[]> {
  const orders = await collection("orders");
  const docs = await orders
    .find(
      {},
      {
        projection: {
          number: 1,
          channel: 1,
          date: 1,
          status: 1,
          total: 1,
          counterparty: 1,
          clientId: 1,
          createdAt: 1,
          "checkout.name": 1,
          "checkout.email": 1,
          "checkout.company": 1,
          "checkout.invoice": 1,
        },
      },
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(OVERVIEW_LIMITS.recentOrders)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    number: doc.number,
    channel: doc.channel,
    date: doc.date,
    status: doc.status,
    total: round2(doc.total),
    customer: customerOf(doc),
    createdAt: new Date(doc.createdAt).toISOString(),
  }));
}

async function recentLeads(): Promise<OverviewRecentLead[]> {
  const leads = await collection("leads");
  const docs = await leads
    .find({}, { projection: { kind: 1, contact: 1, createdAt: 1, status: 1 } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(OVERVIEW_LIMITS.recentLeads)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    kind: doc.kind,
    name: doc.contact?.name || doc.contact?.company || doc.contact?.email || doc.contact?.phone || "",
    createdAt: new Date(doc.createdAt).toISOString(),
    status: doc.status ?? "new",
  }));
}

// --- attention and totals ---------------------------------------------------

type ProductCounts = { all: number; listed: number; unlisted: number; unavailable: number };

// The catalog figures of the attention block and of the totals in one pass.
// An archived product waits for nobody, so only live ones are counted as
// unlisted or unavailable.
async function productCounts(): Promise<ProductCounts> {
  const live = { $eq: [{ $ifNull: ["$archivedAt", null] }, null] };
  const products = await collection("products");
  const [row] = await products
    .aggregate<ProductCounts>([
      {
        $group: {
          _id: null,
          all: { $sum: 1 },
          listed: { $sum: { $cond: [{ $and: [live, { $eq: ["$listed", true] }] }, 1, 0] } },
          unlisted: { $sum: { $cond: [{ $and: [live, { $eq: ["$listed", false] }] }, 1, 0] } },
          unavailable: { $sum: { $cond: [{ $and: [live, { $eq: ["$available", false] }] }, 1, 0] } },
        },
      },
      { $project: { _id: 0 } },
    ])
    .toArray();
  return row ?? { all: 0, listed: 0, unlisted: 0, unavailable: 0 };
}

type OrderAttentionRow = {
  fresh: { count: number; total: number }[];
  cancelRequests: { count: number }[];
  overdue: { count: number; owed: number }[];
};

type OrderAttention = { fresh: number; freshTotal: number; cancelRequests: number; overdue: number; owed: number };

// New orders, open cancel requests and overdue partner payments in one
// aggregation. What an overdue order owes follows the cabinet
// (platform/dashboard/data.ts amountDue): the overdue remainder of a
// partial payment, else the total less what was paid. "Past its due date"
// is judged by the company's own today: the demo company lives on a fixed
// day (clients.demoToday), so its orders are not all overdue by the real
// calendar.
async function orderAttention(today: string): Promise<OrderAttention> {
  const kind = "$payment.kind";
  const remainder = { $ifNull: ["$payment.overdue", 0] };
  const partialOverdue = { $and: [{ $eq: [kind, "partial"] }, { $gt: [remainder, 0] }] };
  const paid = {
    $switch: {
      branches: [
        { case: { $eq: [kind, "paid"] }, then: "$total" },
        { case: { $eq: [kind, "partial"] }, then: { $min: [{ $ifNull: ["$payment.paid", 0] }, "$total"] } },
      ],
      default: 0,
    },
  };
  // The same rule the list behind the counter filters by
  // (/admin/orders?payment=overdue), so the two always agree.
  const overdue = await overdueOrdersFilter(today);

  const orders = await collection("orders");
  const [row] = await orders
    .aggregate<OrderAttentionRow>([
      {
        $match: {
          ...NOT_CANCELLED,
          $or: [{ status: "new" }, { "cancel.request": true }, { channel: "b2b", "payment.kind": { $ne: "paid" } }],
        },
      },
      {
        $facet: {
          fresh: [{ $match: { status: "new" } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } }],
          cancelRequests: [{ $match: { "cancel.request": true } }, { $count: "count" }],
          overdue: [
            { $match: overdue },
            { $set: { _owed: { $cond: [partialOverdue, remainder, { $subtract: ["$total", paid] }] } } },
            { $group: { _id: null, count: { $sum: 1 }, owed: { $sum: "$_owed" } } },
          ],
        },
      },
    ])
    .toArray();
  return {
    fresh: row?.fresh[0]?.count ?? 0,
    freshTotal: row?.fresh[0]?.total ?? 0,
    cancelRequests: row?.cancelRequests[0]?.count ?? 0,
    overdue: row?.overdue[0]?.count ?? 0,
    owed: row?.overdue[0]?.owed ?? 0,
  };
}

async function erpQueueCounts(): Promise<{ pending: number; errors: number }> {
  const queue = await collection("exchangeQueue");
  const rows = await queue
    .aggregate<{ _id: string; count: number }>([
      { $match: { state: { $in: ["pending", "error"] } } },
      { $group: { _id: "$state", count: { $sum: 1 } } },
    ])
    .toArray();
  const of = (state: string) => rows.find((row) => row._id === state)?.count ?? 0;
  return { pending: of("pending"), errors: of("error") };
}

// `products` is the catalog pass shared with the totals (null = the caller
// runs its own when it may see the catalog).
async function buildAttention(
  access: OverviewAccess,
  today: string,
  products: Promise<ProductCounts> | null,
): Promise<AttentionItem[]> {
  const may = (key: AttentionKey) => hasPermission(access.permissions, ATTENTION_META[key].permission);
  const found = await allOf({
    orders: may("newOrders") || may("cancelRequests") || may("overduePayments") ? orderAttention(today) : null,
    returns: may("returnsWaiting") ? countOf("returns", { status: { $in: ["created", "review"] } }) : null,
    leads: may("newLeads") ? countOf("leads", { status: "new" }) : null,
    products: may("unlistedProducts") || may("unavailableProducts") ? (products ?? productCounts()) : null,
    drafts: may("draftPosts") ? countOf("blogPosts", { status: "draft" }) : null,
    outbox: may("outboxPending") ? countOf("outbox", { sentAt: null }) : null,
    // Whether unsent mail leaves by itself or waits for a provider. A
    // settings read that fails leaves the flag out rather than failing the
    // whole block.
    mailReady: may("outboxPending")
      ? mailStatus().then(
          (status) => status.configured,
          () => undefined,
        )
      : null,
    erp: may("erpQueue") ? erpQueueCounts() : null,
  });

  // Pushed in the order of ATTENTION_META.
  const items: AttentionItem[] = [];
  const add = (key: Exclude<AttentionKey, "erpQueue">, count: number | undefined, total?: number) => {
    if (count === undefined || !may(key)) return;
    const href = ATTENTION_META[key].href;
    items.push(total === undefined ? { key, count, href } : { key, count, total: round2(total), href });
  };
  add("newOrders", found.orders?.fresh, found.orders?.freshTotal);
  add("cancelRequests", found.orders?.cancelRequests);
  add("returnsWaiting", found.returns ?? undefined);
  add("overduePayments", found.orders?.overdue, found.orders?.owed);
  add("newLeads", found.leads ?? undefined);
  add("unlistedProducts", found.products?.unlisted);
  add("unavailableProducts", found.products?.unavailable);
  add("draftPosts", found.drafts ?? undefined);
  if (found.outbox !== null) {
    const outbox: AttentionCount = { key: "outboxPending", count: found.outbox, href: ATTENTION_META.outboxPending.href };
    if (typeof found.mailReady === "boolean") outbox.providerReady = found.mailReady;
    items.push(outbox);
  }
  if (found.erp) {
    const { pending, errors } = found.erp;
    items.push({ key: "erpQueue", count: pending + errors, pending, errors, href: ATTENTION_META.erpQueue.href });
  }
  return items;
}

async function totalsOf(access: OverviewAccess, products: Promise<ProductCounts> | null): Promise<OverviewTotals> {
  const may = (permission: Permission) => hasPermission(access.permissions, permission);
  const found = await allOf({
    products,
    customers: may("customers.view") ? countOf("users") : null,
    companies: may("customers.view") ? countOf("clients") : null,
    posts: may("content.view") ? countOf("blogPosts") : null,
    staff: may("staff.manage") ? countOf("staff") : null,
  });
  const totals: OverviewTotals = {};
  if (found.products) {
    totals.products = found.products.all;
    totals.listedProducts = found.products.listed;
  }
  if (found.customers !== null) totals.customers = found.customers;
  if (found.companies !== null) totals.companies = found.companies;
  if (found.posts !== null) totals.posts = found.posts;
  if (found.staff !== null) totals.staff = found.staff;
  return totals;
}

// --- entry points -----------------------------------------------------------

// Everything the overview page shows for `period`, with the parts the role
// may not see left out.
export async function overviewData(
  access: OverviewAccess,
  period: OverviewPeriod,
  options: OverviewOptions = {},
): Promise<OverviewData> {
  const today = kyivToday(options.now);
  const may = (permission: Permission) => hasPermission(access.permissions, permission);
  const fixed = period === "all" ? null : fixedWindow(period, today);
  const products = may("catalog.view") ? productCounts() : null;
  // Money and order counts: only with orders.view.
  const sales = may("orders.view");

  const found = await allOf({
    // "All" needs the bounds for its range whatever the role; the
    // suggested period needs them only where order figures are answered.
    bounds: sales || fixed === null ? orderBounds(today) : null,
    orders: sales ? orderFacets(fixed, may("customers.view")) : null,
    newCustomers: may("customers.view") ? createdFigure("users", fixed) : null,
    newLeads: may("leads.view") ? createdFigure("leads", fixed) : null,
    attention: buildAttention(access, today, products),
    totals: totalsOf(access, products),
    recentOrders: sales ? recentOrders() : null,
    recentLeads: may("leads.view") ? recentLeads() : null,
  });

  const bounds = found.bounds ?? { first: null, last: null, lastPast: null };
  const window = fixed ?? allWindow(today, bounds);
  // Filled in the figure order of the contract, only with what the role
  // may see.
  const kpis: OverviewKpis = {};
  const data: OverviewData = {
    range: { period, from: window.from, to: window.to, bucket: window.bucket, previous: window.previous },
    kpis,
    attention: found.attention,
    totals: found.totals,
  };

  if (found.orders) {
    const folded = fold(found.orders.groups, fixed !== null);
    const hasData = folded.inPeriod > 0;
    Object.assign(kpis, folded.kpis);
    data.series = seriesOf(window, found.orders.points);
    data.byStatus = folded.byStatus;
    data.byChannel = folded.byChannel;
    data.topProducts = topProductsOf(found.orders.products);
    data.hasData = hasData;
    data.suggestedPeriod = suggestedPeriod(hasData, today, bounds);
    if (found.orders.companies) data.topCompanies = topCompaniesOf(found.orders.companies);
  }
  if (found.newCustomers) kpis.newCustomers = found.newCustomers;
  if (found.newLeads) kpis.newLeads = found.newLeads;
  if (found.recentOrders) data.recentOrders = found.recentOrders;
  if (found.recentLeads) data.recentLeads = found.recentLeads;
  return data;
}

// Only the attention block (the counters other screens show).
export async function attentionItems(access: OverviewAccess, options: OverviewOptions = {}): Promise<AttentionItem[]> {
  return buildAttention(access, kyivToday(options.now), null);
}
