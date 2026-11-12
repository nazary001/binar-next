import "server-only";
import { round2 } from "../../money";
import { kyivToday } from "../../time";

// How values written by 1C:Enterprise (BAS) are read. The platform has a
// few habits a JSON reader must forgive (audit/admin/understand/bas.md, 5):
// - an empty reference is the all-zero GUID, an empty date is 0001-01-01;
// - dates carry no time zone unless the developer asked for one: they are
//   the local time of the accounting base, which is Kyiv;
// - numbers turned into text by Строка() get a locale form ("1 234,50",
//   with a non-breaking space as the thousands separator).
// No next/* import: the tsx check reads these too.

export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

export function isEmptyRef(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed === "" || trimmed === EMPTY_GUID;
}

// A number, or a decimal string with "." or "," and optional spaces as
// thousands separators (\s also matches the non-breaking ones). Rounded to
// kopiyky. undefined = not a number.
export function parseMoney(raw: unknown): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? round2(raw) : undefined;
  if (typeof raw !== "string") return undefined;
  const text = raw.replace(/\s+/g, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? round2(value) : undefined;
}

// --- Kyiv time ----------------------------------------------------------------

const KYIV_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Kyiv",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// How far Kyiv wall time is ahead of UTC at a moment, in ms.
function kyivOffsetMs(ms: number): number {
  const parts: Record<string, number> = {};
  for (const part of KYIV_PARTS.formatToParts(new Date(ms))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wall - Math.floor(ms / 1000) * 1000;
}

// The moment a Kyiv wall-clock time stands for. Two passes settle the
// offset around a daylight-saving switch.
export function kyivWallTime(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const first = wall - kyivOffsetMs(wall);
  return new Date(wall - kyivOffsetMs(first));
}

// Midnight in Kyiv of a "YYYY-MM-DD" day.
export function kyivMidnight(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return kyivWallTime(y, m, d);
}

// --- dates ----------------------------------------------------------------------

// A date of the exchange: the moment, and the business day it falls on in
// Kyiv (what "YYYY-MM-DD" fields of the site store).
export type BasDate = { at: Date; day: string };

const DATE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;

// "2026-11-12", "2026-11-12T10:00:00" (Kyiv time), "2026-11-12T10:00:00+02:00",
// "...Z". null = the empty date of 1C (year 1) or an empty string;
// undefined = not a date.
export function parseBasDate(raw: string): BasDate | null | undefined {
  const text = raw.trim();
  if (text === "") return null;
  const match = DATE_RE.exec(text);
  if (!match) return undefined;
  const [, ys, ms, ds, hs, mins, ss, zone] = match;
  const year = Number(ys);
  if (year <= 1) return null;
  const month = Number(ms);
  const day = Number(ds);
  const hour = hs ? Number(hs) : 0;
  const minute = mins ? Number(mins) : 0;
  const second = ss ? Number(ss) : 0;
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return undefined;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCDate() !== day || probe.getUTCMonth() !== month - 1) return undefined;

  let at: Date;
  if (zone) {
    let offset = 0;
    if (zone.toUpperCase() !== "Z") {
      const sign = zone.startsWith("-") ? -1 : 1;
      const digits = zone.slice(1).replace(":", "");
      offset = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || "0")) * 60_000;
    }
    at = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offset);
  } else {
    at = kyivWallTime(year, month, day, hour, minute, second);
  }
  // A bare date is the business day itself; a moment is the day it falls
  // on in Kyiv.
  return { at, day: hs ? kyivToday(at) : `${ys}-${ms}-${ds}` };
}

// Whole days from today (Kyiv) to a day, never negative.
export function daysUntil(day: string, now: Date = new Date()): number {
  const today = kyivToday(now);
  const diff = Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round(diff / 86_400_000));
}

// Whole days from a day to today (Kyiv), never negative.
export function daysSince(day: string, today: string = kyivToday()): number {
  const diff = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(diff) ? Math.max(0, Math.round(diff / 86_400_000)) : 0;
}

// "1234.50": money as BAS reads it best (no locale, no grouping).
export function plainMoney(value: number): string {
  return round2(value).toFixed(2);
}
