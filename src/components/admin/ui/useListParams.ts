"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

// The state of a list screen (search, filters, sort, page, page size) kept
// in the address bar, so a filtered list survives a reload, can be shared
// as a link and comes back with the Back button.
//
//   const list = useListParams({ defaults: { sort: "-createdAt", limit: "20" }, keep: ["view"] });
//   const orders = useAdminQuery<Page<OrderRow>>(`/orders?${list.queryString}`);
//   <SearchInput value={list.q} onChange={(q) => list.set({ q })} />
//   <Select value={list.get("status")} onChange={(status) => list.set({ status })} />
//   <DataTable sort={list.sort} onSort={(sort) => list.set({ sort })} ... />
//   <Pagination page={list.page} limit={list.limit} total={orders.data?.total ?? 0}
//     onPage={(page) => list.set({ page })} onLimit={(limit) => list.set({ limit })} />
//   <FilterBar onReset={list.reset} ... />
//
// Options
// - defaults: values a missing parameter stands for ({ sort, limit, status
//   ...}). A value equal to its default is dropped from the URL, and
//   `queryString` fills the defaults back in for the API.
// - keep: names `reset()` leaves alone (a view switch, a tab).
// - exclude: names that live in the same address but are not the list's
//   own (a drawer's ?id, the ?tab of the page around): left out of
//   `queryString` and `params`, so opening a drawer does not change the
//   cache key and reload the table; set() and reset() leave them as they
//   are (close the drawer with its own hook, lib/hooks useAddressParam).
//
// Returns
// - params: every value in effect (defaults, then the URL; repeated names
//   joined with ","), get(name) / getAll(name) for one name;
// - set(patch, { resetPage? = true }): merges the patch into the URL. null,
//   undefined, "" and [] remove a name; arrays become repeated names;
//   numbers become strings. Any change returns the list to page 1 unless
//   the patch names `page` itself or resetPage is false;
// - reset(): clears everything but `keep` (and so returns to the defaults);
// - queryString: for the API call, defaults filled in, names sorted so the
//   same state always gives the same cache key of useAdminQuery;
// - page, limit (numbers), sort, q (strings).
//
// Everything is derived from useSearchParams: no state, no effect. The URL
// is written with router.replace(..., { scroll: false }): filters do not
// stack up history entries and the page does not jump to the top.
// Panel pages are rendered per request (force-dynamic in app/admin/layout),
// so useSearchParams needs no Suspense boundary around the screen.

export type ListPatchValue = string | string[] | number | null | undefined;
export type ListPatch = Record<string, ListPatchValue>;

export type ListParamsOptions = {
  defaults?: Record<string, string>;
  keep?: string[];
  exclude?: string[];
};

export type ListParams = {
  params: Record<string, string>;
  get: (name: string) => string;
  getAll: (name: string) => string[];
  set: (patch: ListPatch, options?: { resetPage?: boolean }) => void;
  reset: () => void;
  queryString: string;
  page: number;
  limit: number;
  sort: string;
  q: string;
};

function positiveInt(raw: string, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function valuesOf(value: ListPatchValue): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  const text = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value.trim();
  return text ? [text] : [];
}

export function useListParams(options: ListParamsOptions = {}): ListParams {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const current = search.toString();
  const defaults: Record<string, string> = { ...options.defaults };
  const exclude = options.exclude ?? [];
  // Excluded names survive a reset like kept ones: they are not the list's.
  const keep = [...(options.keep ?? []), ...exclude];

  // Two changes in the same tick (a search box and its debounce, a chip
  // and a select) must not overwrite each other: until the URL shows the
  // last change, the next one is built on top of what was asked for.
  // Written and read only in event handlers (set / reset), never in render.
  const pending = useRef<{ from: string; to: string } | null>(null);

  // No useCallback: the React Compiler memoizes these on its own.
  const navigate = (next: URLSearchParams) => {
    next.sort();
    const to = next.toString();
    pending.current = { from: current, to };
    if (to === current) return;
    router.replace(to ? `${pathname}?${to}` : pathname, { scroll: false });
  };

  const set = (patch: ListPatch, setOptions: { resetPage?: boolean } = {}) => {
    const base = pending.current && pending.current.from === current ? pending.current.to : current;
    const next = new URLSearchParams(base);
    for (const [name, value] of Object.entries(patch)) {
      const list = valuesOf(value);
      next.delete(name);
      if (list.length === 0) continue;
      // The default (and page 1) is what a missing name means already.
      if (list.length === 1 && (list[0] === defaults[name] || (name === "page" && list[0] === "1"))) continue;
      for (const item of list) next.append(name, item);
    }
    if (setOptions.resetPage !== false && !("page" in patch)) next.delete("page");
    navigate(next);
  };

  const reset = () => {
    const next = new URLSearchParams();
    for (const name of keep) for (const value of search.getAll(name)) next.append(name, value);
    navigate(next);
  };

  const get = (name: string): string => search.get(name) ?? defaults[name] ?? "";
  const getAll = (name: string): string[] => {
    const fromUrl = search.getAll(name).flatMap((value) => value.split(",")).filter(Boolean);
    if (fromUrl.length > 0) return fromUrl;
    return (defaults[name] ?? "").split(",").filter(Boolean);
  };

  const params: Record<string, string> = { ...defaults };
  for (const name of new Set(search.keys())) if (!exclude.includes(name)) params[name] = search.getAll(name).join(",");

  const page = positiveInt(get("page"), 1);
  const limit = positiveInt(get("limit"), 20);

  const query = new URLSearchParams(current);
  for (const name of exclude) query.delete(name);
  for (const [name, value] of Object.entries(defaults)) if (!query.has(name) && value !== "") query.set(name, value);
  query.set("page", String(page));
  query.set("limit", String(limit));
  query.sort();

  return {
    params,
    get,
    getAll,
    set,
    reset,
    queryString: query.toString(),
    page,
    limit,
    sort: get("sort"),
    q: get("q"),
  };
}
