"use client";

import { useState } from "react";
import { periodStart, type PeriodValue } from "./data";
import type { Sort } from "./listParts";
import { ordersToday } from "./store";

// List state of one tab of the orders page (orders / returns): the query,
// the three filters (period, counterparty, status), the sort, the desktop
// pager (page + page size) and the phone load-more count. One state for
// both widths: the desktop selects / table heads and the phone search row,
// filter sheet and sort menu edit the same values, so crossing 640 keeps
// the filters. DECISIONS O-13: no URL parameters; the state lives in the
// component and resets on navigation (the tab remount resets it too).

const COPY = {
  sortNewest: "Спочатку нові",
  sortOldest: "Спочатку старі",
  sortTotalDesc: "Сума: від більшої",
  sortTotalAsc: "Сума: від меншої",
  foundOrders: (n: number) => `Знайдено ${n} ${pluralUk(n, "замовлення", "замовлення", "замовлень")}`,
  foundReturns: (n: number) => `Знайдено ${n} ${pluralUk(n, "повернення", "повернення", "повернень")}`,
} as const;

// Phone batch of the load-more list (D4: 10 per batch).
export const PHONE_BATCH = 10;

export type StatusFilter<S extends string> = "all" | S;

export type Filters<S extends string> = {
  period: PeriodValue;
  counterparty: string;
  status: StatusFilter<S>;
};

export function defaultFilters<S extends string>(): Filters<S> {
  return { period: "30", counterparty: "all", status: "all" };
}

// How many of the three filters differ from their defaults (the filter
// disc badge and the applied chips).
export function activeFilterCount<S extends string>(f: Filters<S>): number {
  return Number(f.period !== "30") + Number(f.counterparty !== "all") + Number(f.status !== "all");
}

// Sort options of the phone sort menu (TR-11); the value encodes the
// desktop {key, dir} pair the table heads toggle.
export type SortValue = "date-desc" | "date-asc" | "total-desc" | "total-asc";

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "date-desc", label: COPY.sortNewest },
  { value: "date-asc", label: COPY.sortOldest },
  { value: "total-desc", label: COPY.sortTotalDesc },
  { value: "total-asc", label: COPY.sortTotalAsc },
];

export function sortValue(sort: Sort): SortValue {
  return `${sort.key}-${sort.dir}`;
}

export function sortFromValue(value: string): Sort {
  const [key, dir] = value.split("-");
  return { key: key === "total" ? "total" : "date", dir: dir === "asc" ? "asc" : "desc" };
}

export function sortRows<T>(list: T[], sort: Sort, date: (t: T) => string, total: (t: T) => number): T[] {
  return [...list].sort((a, b) => {
    const v = sort.key === "date" ? date(a).localeCompare(date(b)) : total(a) - total(b);
    return sort.dir === "asc" ? v : -v;
  });
}

// Inside the period the filter names (both ends included; "all" = up to
// the cabinet's "today", store.ts).
export function inPeriod(dateIso: string, period: PeriodValue, today: Date = ordersToday()): boolean {
  const date = new Date(dateIso);
  const start = periodStart(period, today);
  return date <= today && (!start || date >= start);
}

// Ukrainian plural: 1 / 2-4 / 5+ (11-14 take the "many" form).
export function pluralUk(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const foundLabel = (tab: "orders" | "returns", n: number) =>
  tab === "orders" ? COPY.foundOrders(n) : COPY.foundReturns(n);

// Filters + table + pager + phone batch of one tab. Every change of the
// query, a filter or the sort sends the desktop pager back to page 1 and
// the phone list back to its first batch.
export function useListState<S extends string>() {
  const [query, setQueryRaw] = useState("");
  const [filters, setFiltersRaw] = useState<Filters<S>>(defaultFilters<S>);
  const [sort, setSortRaw] = useState<Sort>({ key: "date", dir: "desc" });
  const [pageSize, setPageSizeRaw] = useState(10);
  const [page, setPage] = useState(1);
  const [shown, setShown] = useState(PHONE_BATCH);

  const restart = () => {
    setPage(1);
    setShown(PHONE_BATCH);
  };
  const setFilters = (patch: Partial<Filters<S>>) => {
    setFiltersRaw((f) => ({ ...f, ...patch }));
    restart();
  };

  return {
    query,
    setQuery: (v: string) => {
      setQueryRaw(v);
      restart();
    },
    filters,
    period: filters.period,
    setPeriod: (period: PeriodValue) => setFilters({ period }),
    counterparty: filters.counterparty,
    setCounterparty: (counterparty: string) => setFilters({ counterparty }),
    status: filters.status,
    setStatus: (status: StatusFilter<S>) => setFilters({ status }),
    // The phone filter sheet commits its draft in one go.
    applyFilters: (next: Filters<S>) => {
      const same =
        next.period === filters.period &&
        next.counterparty === filters.counterparty &&
        next.status === filters.status;
      if (same) return;
      setFiltersRaw(next);
      restart();
    },
    // Applied chips reset: the three filters, not the query.
    resetFilters: () => setFilters(defaultFilters<S>()),
    // Empty-state reset: the query and the three filters.
    resetAll: () => {
      setQueryRaw("");
      setFiltersRaw(defaultFilters<S>());
      restart();
    },
    sort,
    // Desktop table heads: the same key flips the direction, a new key
    // starts descending.
    toggleSort: (key: Sort["key"]) => {
      setSortRaw((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
      restart();
    },
    // Phone sort menu: an explicit {key, dir}.
    setSort: (next: Sort) => {
      if (next.key === sort.key && next.dir === sort.dir) return;
      setSortRaw(next);
      restart();
    },
    pageSize,
    setPageSize: (n: number) => {
      setPageSizeRaw(n);
      restart();
    },
    page,
    setPage,
    shown,
    showMore: () => setShown((n) => n + PHONE_BATCH),
  };
}

export type ListState<S extends string> = ReturnType<typeof useListState<S>>;
