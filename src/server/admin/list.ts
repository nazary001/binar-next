import "server-only";
import type { Collection, CollationOptions, Document, Filter, Sort } from "mongodb";

// List endpoints of the staff area share one query shape and one answer
// shape:
//
//   GET /api/admin/<things>?q=<text>&page=1&limit=20&sort=-createdAt&<filters>
//   -> { ok: true, items: [...], total, page, limit }
//
// `sort` names one allowed field; a leading "-" means descending.
// Filters are read by each route from `query.params` with the helpers
// below, so a value from the address bar never reaches a MongoDB filter
// unchecked.

export type ListQuery = {
  // The search text, trimmed and cut to 100 characters ("" = none).
  q: string;
  page: number;
  limit: number;
  sort: Sort;
  // The sort as it was asked for ("-createdAt"), echoed to the client.
  sortKey: string;
  params: URLSearchParams;
};

export type ListOptions = {
  // Field names the client may sort by.
  sortable: readonly string[];
  // E.g. "-createdAt".
  defaultSort: string;
  defaultLimit?: number;
  maxLimit?: number;
};

function positiveInt(raw: string | null, fallback: number, max: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return fallback;
  return Math.min(value, max);
}

export function listQuery(url: URL, options: ListOptions): ListQuery {
  const params = url.searchParams;
  const maxLimit = options.maxLimit ?? 100;
  const limit = positiveInt(params.get("limit"), options.defaultLimit ?? 20, maxLimit);
  const page = positiveInt(params.get("page"), 1, 100_000);

  const asked = params.get("sort") ?? "";
  const askedField = asked.startsWith("-") ? asked.slice(1) : asked;
  const sortKey = options.sortable.includes(askedField) ? asked : options.defaultSort;
  const field = sortKey.startsWith("-") ? sortKey.slice(1) : sortKey;
  const direction = sortKey.startsWith("-") ? -1 : 1;
  // `_id` breaks ties so pages never overlap.
  const sort: Sort = field === "_id" ? { _id: direction } : { [field]: direction, _id: direction };

  return { q: (params.get("q") ?? "").trim().slice(0, 100), page, limit, sort, sortKey, params };
}

export type Page<T> = { items: T[]; total: number; page: number; limit: number };

// Sorting by a text column the way a Ukrainian reader expects (letters in
// alphabet order, case ignored) instead of by character codes. Pass it to
// paginate() only when the list is sorted by a name or a title: under a
// collation the string filters of the query cannot use ordinary indexes.
export const UK_COLLATION: CollationOptions = { locale: "uk", strength: 2 };

// Runs a list query: one page of documents plus the total for the pager.
export async function paginate<T extends Document, R = T>(
  col: Collection<T>,
  filter: Filter<T>,
  query: Pick<ListQuery, "page" | "limit" | "sort">,
  options: { projection?: Document; map?: (doc: T) => R; collation?: CollationOptions } = {},
): Promise<Page<R>> {
  const cursor = col.find(filter, {
    ...(options.projection ? { projection: options.projection } : {}),
    ...(options.collation ? { collation: options.collation } : {}),
  });
  const [docs, total] = await Promise.all([
    cursor
      .sort(query.sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray(),
    col.countDocuments(filter),
  ]);
  const map = options.map;
  const items = (map ? docs.map((doc) => map(doc as T)) : docs) as R[];
  return { items, total, page: query.page, limit: query.limit };
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A case-insensitive "contains" for a search box. The text is escaped, so
// it can only ever match literally.
export function contains(text: string): RegExp {
  return new RegExp(escapeRegex(text), "i");
}

// A "starts with" (can use an index on the field).
export function startsWith(text: string): RegExp {
  return new RegExp(`^${escapeRegex(text)}`, "i");
}

// One value of a closed set from the query string, or undefined.
export function oneOf<T extends string>(params: URLSearchParams, name: string, allowed: readonly T[]): T | undefined {
  const value = params.get(name);
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

// Several values of a closed set ("?status=new&status=shipped" or
// "?status=new,shipped").
export function manyOf<T extends string>(params: URLSearchParams, name: string, allowed: readonly T[]): T[] {
  const raw = params.getAll(name).flatMap((value) => value.split(","));
  return [...new Set(raw.filter((value): value is T => (allowed as readonly string[]).includes(value)))];
}

// "true" / "false" / "1" / "0" from the query string, or undefined.
export function flag(params: URLSearchParams, name: string): boolean | undefined {
  const value = params.get(name);
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

// A plain id-like value ("client-ab12", a UUID, a slug), or undefined.
export function idParam(params: URLSearchParams, name: string): string | undefined {
  const value = params.get(name);
  return value && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) ? value : undefined;
}

// "YYYY-MM-DD" from the query string, or undefined.
export function dayParam(params: URLSearchParams, name: string): string | undefined {
  const value = params.get(name);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

// A CSV file answer (UTF-8 with a BOM so Excel opens Cyrillic correctly;
// ";" is what a Ukrainian Excel expects as the separator).
export function csvResponse(filename: string, header: string[], rows: (string | number | null | undefined)[][]): Response {
  const cell = (value: string | number | null | undefined): string => {
    const text = value === null || value === undefined ? "" : String(value);
    // A leading = + - @ would be run as a formula by a spreadsheet.
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const body = [header, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
  return new Response(String.fromCharCode(0xfeff) + body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
