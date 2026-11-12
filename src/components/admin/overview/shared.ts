import { formatDayMonth } from "../lib/format";
import { OVERVIEW_PERIODS, type KpiFigure, type OverviewBucket, type OverviewPeriod } from "./types";

// Words and small helpers of the overview screen. Pure functions only.

// The period of the address bar (?period=), or null when the address names
// none or a value the API would refuse.
export function parsePeriod(raw: string | null | undefined): OverviewPeriod | null {
  return raw && (OVERVIEW_PERIODS as readonly string[]).includes(raw) ? (raw as OverviewPeriod) : null;
}

// The light run of the page title: "Огляд за 30 днів".
export const PERIOD_RUN: Record<OverviewPeriod, string> = {
  "7d": "за 7 днів",
  "30d": "за 30 днів",
  "90d": "за 90 днів",
  "12m": "за 12 місяців",
  all: "за весь час",
};

// The period inside a sentence: "За останні 30 днів ...", "показуємо за 12 місяців".
export const PERIOD_SPAN: Record<OverviewPeriod, string> = {
  "7d": "7 днів",
  "30d": "30 днів",
  "90d": "90 днів",
  "12m": "12 місяців",
  all: "весь час",
};

// The period a KPI is compared with ("попередні 30 днів: 12").
export const PREVIOUS_SPAN: Record<Exclude<OverviewPeriod, "all">, string> = {
  "7d": "попередні 7 днів",
  "30d": "попередні 30 днів",
  "90d": "попередні 90 днів",
  "12m": "попередні 12 місяців",
};

// The change against the previous period, in percent. No figure when there
// is nothing to compare with ("all") or the previous period was zero (a
// percentage of nothing would be infinite).
export function deltaOf(figure: KpiFigure): number | null {
  if (figure.previous === null || figure.previous <= 0) return null;
  return ((figure.value - figure.previous) / figure.previous) * 100;
}

const MONTH = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", month: "short", year: "numeric" });

// "лист. 2026": the label of a month bucket (the year suffix is dropped).
export function formatMonth(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return MONTH.format(date).replace(/\s*р\.?$/, "");
}

// The label of one chart point: a day ("12 лист.") or a month.
export function formatBucket(x: string, bucket: OverviewBucket): string {
  return bucket === "month" ? formatMonth(x) : formatDayMonth(x);
}

// Share of a part in a whole, percent (0 for an empty whole).
export function shareOf(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

// Links into the other sections (the binding addresses of the panel).
export function ordersHref(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export function leadsHref(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `/admin/leads?${query}` : "/admin/leads";
}
