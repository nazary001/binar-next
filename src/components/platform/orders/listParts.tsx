"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { ChevronDown16, ChevronSideIcon, MagnifierIcon } from "@/components/catalog/icons";
import { InfoTip } from "@/components/ui/InfoTip";
import { SortIcon } from "../orderIcons";
import { InfoHeadIcon } from "../ui";
import { PAGE_SIZES } from "./data";
import { useDismiss, useListbox } from "@/components/ui/useListbox";

// Pieces shared by the two list tables of «Мої замовлення» (4573:37244)
// and «Мої повернення» (5192:78615): the search field, the dark table
// head, the 0.5-px row hairline, the 42-px row icon buttons, the
// whole-row open and the pager row.

export { useDismiss };

// «Search» (4573:37262): 364 x 46 pill, 1-px #8e8e8f ring, magnifier, no
// fill: it shows the #f5f5f5 cabinet surface, as the master draws it (the
// designer dropped the white fill on 2026-11-11, C30).
export function SearchField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="relative w-full lg:w-[364px]">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Пошук"
        aria-label={label}
        className="h-[46px] w-full rounded-[50px] border border-stroke-default bg-transparent pl-4 pr-12 text-[16px] leading-6 text-neutral-900 outline-none transition-colors duration-200 placeholder:text-neutral-500 focus:border-neutral-800 [&::-webkit-search-cancel-button]:hidden"
      />
      <MagnifierIcon className="pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-neutral-700" />
    </div>
  );
}

// «<TableHead>» - flex gap-4 p-16, 14/24 SemiBold white, optional sort /
// info glyph (18-px boxes behind pl-8 pr-4, so the glyph starts 12 px
// after the label: ctx/5192-78639.md) in #bbbbbc: «Component 6» / «Component
// 7» (figma-export/orders/icon-sort-18.svg, dashboard/icon-info-18.svg)
// fill #BBBBBC, the sorted «Дата» of the default list included; the
// sort order itself is exposed through aria-sort. A sortable head lights
// its glyph white on hover.
// `info` = the explanation of the label: the info glyph is an InfoTip that
// shows it in the Figma «Tooltip» chip 4634:65682 on hover / focus
// (designer 2026-11-11, C23; catalog/tips.ts). A sortable head is a
// button, so it never takes an info glyph (no button inside a button).
export function Head({
  children,
  className = "",
  sort,
  onSort,
  info,
}: {
  children?: ReactNode;
  className?: string;
  sort?: "asc" | "desc" | null;
  onSort?: () => void;
  info?: string;
}) {
  const inner = (
    <>
      {children && <span className="whitespace-nowrap text-[14px] font-semibold leading-6 text-white">{children}</span>}
      {onSort && (
        <span className="flex items-start pl-2 pr-1">
          <SortIcon className="size-[18px] text-[#bbbbbc] transition-colors duration-200 group-hover:text-white" />
        </span>
      )}
      {info && !onSort && (
        <span className="flex items-start pl-2 pr-1">
          <InfoTip
            label={typeof children === "string" ? children : ""}
            text={info}
            icon={<InfoHeadIcon className="size-[18px] text-[#bbbbbc]" />}
          />
        </span>
      )}
    </>
  );
  return (
    <th
      scope="col"
      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
      className={`p-0 text-left font-normal ${className}`}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          aria-label={`Сортувати: ${typeof children === "string" ? children : ""}`}
          className="group flex h-full w-full cursor-pointer items-center gap-1 p-4"
        >
          {inner}
        </button>
      ) : (
        <span className="flex h-full items-center gap-1 p-4">{inner}</span>
      )}
    </th>
  );
}

// Body cell: px-16 py-24, top-aligned like the master's «Items»
// (flex items-start, ctx/5052-32112.md): every cell's content starts at
// row top + 24, whatever the tallest cell of the row.
export const CELL = "px-4 py-6 align-top";

// Row hairline: the master's 0.5-px #d2d2d2 «Divider» between rows, 16 px
// in from the row edges (a background, so the rows keep their height).
export const DIVIDER =
  "[background:linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))_16px_0/calc(100%-32px)_0.5px_no-repeat]";

// «Icon button» 42 x 42 (p-10, r26, 24-px glyph) of the list rows.
export const ROW_ICON_BUTTON =
  "inline-flex size-[42px] cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:bg-bg-subtle hover:text-brand";

// Whole-row open (designer 2026-11-13, C32: open the order page on a click
// on the row, not only on the chevron): a click anywhere on a list row
// opens the row's page, the chevron link's target. The row leaves alone:
// - its own controls (the documents button, the chevron link, anything
//   interactive inside), which keep their action without stopPropagation;
// - a click that ends a text selection in the row (an order number copied
//   by dragging over it); a double click opens the page on its first click;
// - clicks coming from a portal (a dialog opened from the row bubbles
//   through the React tree, not through the row's DOM).
// Ctrl / Cmd / Shift-click and the middle button open the page in a new
// tab, as on a link. The chevron <Link> stays the row's keyboard stop (Tab,
// Enter), so the <tr> takes no tabindex or role. Usage:
//   const openRow = useRowOpen();
//   <tr className={ROW_OPEN} {...openRow(`/orders/${id}`)}> ... <Link className={ROW_CHEVRON}>
const ROW_CONTROL =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [role='checkbox'], [role='combobox']";

export function useRowOpen() {
  const router = useRouter();
  return (href: string) => {
    const onRowSpace = (e: MouseEvent<HTMLTableRowElement>) => {
      const row = e.currentTarget;
      const target = e.target instanceof Element ? e.target : null;
      if (!target || !row.contains(target)) return false;
      const control = target.closest(ROW_CONTROL);
      return !(control && row.contains(control));
    };
    const newTab = () => window.open(href, "_blank", "noopener");
    return {
      onClick: (e: MouseEvent<HTMLTableRowElement>) => {
        if (e.defaultPrevented || !onRowSpace(e)) return;
        const selection = window.getSelection();
        const selecting =
          selection !== null &&
          !selection.isCollapsed &&
          selection.rangeCount > 0 &&
          selection.getRangeAt(0).intersectsNode(e.currentTarget);
        if (selecting) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) newTab();
        else router.push(href);
      },
      // A middle press on row space would start the browser's autoscroll
      // (Windows), which swallows the auxclick: on a row it means "open in
      // a new tab", as on a link.
      onMouseDown: (e: MouseEvent<HTMLTableRowElement>) => {
        if (e.button === 1 && onRowSpace(e)) e.preventDefault();
      },
      onAuxClick: (e: MouseEvent<HTMLTableRowElement>) => {
        if (e.button === 1 && !e.defaultPrevented && onRowSpace(e)) newTab();
      },
    };
  };
}

// The clickable row: pointer cursor, and its chevron shows its own hover
// look (ROW_ICON_BUTTON: #f8f8f8 disc, brand glyph) while the pointer is
// anywhere on the row. No row tint: the masters draw no row hover state.
export const ROW_OPEN = "group/row cursor-pointer";
export const ROW_CHEVRON = `${ROW_ICON_BUTTON} group-hover/row:bg-bg-subtle group-hover/row:text-brand`;

export type Sort = { key: "date" | "total"; dir: "asc" | "desc" };

// Pager row (4573:37731, 100 tall): «1-10 із 28», «Показувати по: [10]»
// and the 52-px page buttons.
export function Pager({
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
  label,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (n: number) => void;
  onPageSize: (n: number) => void;
  label: string;
}) {
  const sizeIndex = PAGE_SIZES.findIndex((n) => n === pageSize);
  const size = useListbox(PAGE_SIZES.length, sizeIndex, (i) => onPageSize(PAGE_SIZES[i]));

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, total);
  const windowStart = Math.max(1, Math.min(current - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => windowStart + i);

  return (
    <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:h-[100px] lg:pl-10 lg:pr-8">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-[16px] font-semibold leading-[22px] text-neutral-800">
          {first}-{last} із {total}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-button-md text-neutral-500">Показувати по:</span>
          {/* «Text button» 4573:37736, 59 x 34: the 1-px #d2d2d2 stroke
              sits inside the box, so CSS pads 5 / 11 for the master's
              6 / 12 (22 + 10 + 2 = 34). */}
          <div className="relative">
            <button
              type="button"
              aria-label={`Кількість на сторінці: ${label}`}
              {...size.trigger}
              className="flex cursor-pointer items-center gap-[2px] rounded-3xl border border-stroke-subtle bg-white px-[11px] py-[5px] text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
            >
              {pageSize}
              <ChevronDown16 className={`size-4 shrink-0 transition-[rotate] duration-200 ${size.open ? "rotate-180" : ""}`} />
            </button>
            {size.open && (
              <ul
                id={size.menuId}
                role="listbox"
                aria-label={`Кількість на сторінці: ${label}`}
                className="absolute left-0 top-full z-20 mt-2 min-w-[120px] rounded-2xl border border-stroke-subtle bg-white p-2 shadow-lg"
              >
                {PAGE_SIZES.map((n, i) => (
                  <li
                    key={n}
                    {...size.option(i)}
                    className={`cursor-pointer rounded-xl px-4 py-2 text-left text-button-md hover:text-brand ${
                      i === size.active ? "bg-bg-subtle " : ""
                    }${n === pageSize ? "text-brand" : "text-neutral-700"}`}
                  >
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {pages > 1 && (
        <nav aria-label={`Сторінки: ${label}`} className="flex flex-wrap items-center gap-1 sm:gap-[10px]">
          <button
            type="button"
            aria-label="Попередня сторінка"
            disabled={current === 1}
            onClick={() => onPage(current - 1)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 sm:size-[52px]"
          >
            <ChevronSideIcon className="size-6" />
          </button>
          {numbers.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Сторінка ${n}`}
              aria-current={n === current ? "page" : undefined}
              onClick={() => onPage(n)}
              className={`flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-[18px] font-semibold leading-[22px] tracking-[0.18px] transition-colors duration-200 sm:size-[52px] ${
                n === current ? "bg-brand text-white" : "text-neutral-900 hover:text-brand"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            aria-label="Наступна сторінка"
            disabled={current === pages}
            onClick={() => onPage(current + 1)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 sm:size-[52px]"
          >
            <ChevronSideIcon mirrored className="size-6" />
          </button>
        </nav>
      )}
    </div>
  );
}
