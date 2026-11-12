"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useId } from "react";
import { cx, formatNumber } from "../lib/format";
import { IconButton } from "./Button";
import { NativeSelect } from "./Select";
import { COLOR_TRANSITION, FOCUS_RING } from "./tokens";

// The pager under a list: what part of the list is shown, the pages with
// gaps, previous / next, and (optionally) the page size.
//
//   <Pagination page={list.page} limit={list.limit} total={data.total}
//     onPage={(page) => list.set({ page })} onLimit={(limit) => list.set({ limit })} />
//
// Props
// - page (1-based), limit, total: as the list API answers them.
// - onPage(page): a page pill or an arrow was pressed.
// - onLimit(limit): shows the "На сторінці" select when given.
// - limits: the sizes offered (default 20 / 50 / 100).
//
// "Показано 21-40 із 1 248" on the left; the pages are windowed around the
// current one (1 ... 4 5 6 ... 63), fewer on phones. Nothing renders for an
// empty list; a list that fits one page shows only the count.
// Every control is 32 px (the kit's sm size): the arrows are ghost
// IconButtons, the page size the kit's NativeSelect.

export type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
  onLimit?: (limit: number) => void;
  limits?: number[];
  className?: string;
};

type Slot = { kind: "page"; page: number } | { kind: "gap"; key: string };

// 1 ... (current - span) .. (current + span) ... last. Near an end the
// window slides inwards instead of shrinking (1 2 3 4 5 ... 63), so the
// pager keeps its width while paging; a gap that would hide a single page
// shows that page instead.
function windowed(current: number, last: number, span: number): Slot[] {
  const pages = new Set<number>([1, last]);
  const start = Math.max(2, Math.min(current - span, last - 1 - span * 2));
  const end = Math.min(last - 1, start + span * 2);
  for (let p = start; p <= end; p += 1) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const slots: Slot[] = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous === 2) slots.push({ kind: "page", page: page - 1 });
    else if (previous !== undefined && page - previous > 2) slots.push({ kind: "gap", key: `gap-${previous}` });
    slots.push({ kind: "page", page });
  });
  return slots;
}

const SQUARE =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-[13px] font-semibold leading-[18px] tabular-nums motion-reduce:transition-none";

// One window of page pills. Phones and wide screens get their own list
// (the other one is display: none, so it is out of the accessibility tree).
function PageList({ slots, current, onPage, className }: { slots: Slot[]; current: number; onPage: (page: number) => void; className: string }) {
  return (
    <ul className={cx("flex items-center gap-1", className)}>
      {slots.map((slot) => {
        if (slot.kind === "gap") {
          return (
            <li key={slot.key} aria-hidden className="w-5 text-center text-[13px] leading-[18px] text-neutral-400">
              ...
            </li>
          );
        }
        const isCurrent = slot.page === current;
        return (
          <li key={slot.page}>
            <button
              type="button"
              onClick={() => onPage(slot.page)}
              aria-label={`Сторінка ${slot.page}`}
              aria-current={isCurrent ? "page" : undefined}
              className={cx(
                SQUARE,
                COLOR_TRANSITION,
                FOCUS_RING,
                "cursor-pointer",
                isCurrent ? "bg-neutral-900 text-white" : "text-neutral-800 hover:bg-bg-subtle hover:text-neutral-900",
              )}
            >
              {formatNumber(slot.page)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Pagination({ page, limit, total, onPage, onLimit, limits = [20, 50, 100], className }: PaginationProps) {
  const selectId = useId();
  if (!Number.isFinite(total) || total <= 0) return null;

  const size = Math.max(1, limit);
  const last = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), last);
  const from = (current - 1) * size + 1;
  const to = Math.min(total, current * size);
  const sizes = limits.includes(size) ? limits : [...limits, size].sort((a, b) => a - b);

  // Phones get a window of one page each side, wide screens two.
  const wide = windowed(current, last, 2);
  const narrow = windowed(current, last, 1);

  const arrow = (direction: "prev" | "next") => {
    const target = direction === "prev" ? current - 1 : current + 1;
    return (
      <IconButton
        size="sm"
        icon={direction === "prev" ? ChevronLeftIcon : ChevronRightIcon}
        label={direction === "prev" ? "Попередня сторінка" : "Наступна сторінка"}
        disabled={target < 1 || target > last}
        onClick={() => onPage(target)}
      />
    );
  };
  const limitOptions = sizes.map((option) => ({ value: String(option), label: String(option) }));

  return (
    <div className={cx("flex flex-wrap items-center justify-between gap-x-6 gap-y-3", className)}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-[13px] leading-[18px] text-neutral-500 tabular-nums" aria-live="polite">
          Показано {formatNumber(from)}-{formatNumber(to)} із {formatNumber(total)}
        </p>
        {onLimit && (
          <div className="flex items-center gap-2">
            <label htmlFor={selectId} className="text-[13px] leading-[18px] text-neutral-500">
              На сторінці
            </label>
            <NativeSelect
              id={selectId}
              size="sm"
              value={String(size)}
              onChange={(next) => onLimit(Number(next))}
              options={limitOptions}
              className="w-[76px] tabular-nums"
            />
          </div>
        )}
      </div>

      {last > 1 && (
        <nav aria-label="Сторінки списку" className="flex items-center gap-1">
          {arrow("prev")}
          <PageList slots={narrow} current={current} onPage={onPage} className="min-[640px]:hidden" />
          <PageList slots={wide} current={current} onPage={onPage} className="max-[639px]:hidden" />
          {arrow("next")}
        </nav>
      )}
    </div>
  );
}
