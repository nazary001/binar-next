"use client";

import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { ChevronDown16, ChevronSideIcon, MagnifierIcon } from "@/components/catalog/icons";
import { SortIcon } from "../orderIcons";
import { InfoHeadIcon } from "../ui";
import { PAGE_SIZES } from "./data";

// Pieces shared by the two list tables of «Мої замовлення» (4573:37244)
// and «Мої повернення» (5192:78615): the search field, the dark table
// head, the 0.5-px row hairline, the 42-px row icon buttons and the
// pager row.

export function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close]);
}

// Select-only combobox plumbing of the pager's page-size pill (the
// pattern of checkout/fields.tsx SelectField; the filter selects are the
// platform/ui Select):
// focus stays on the trigger, the highlighted option is announced
// through aria-activedescendant, ArrowDown / ArrowUp open the menu and
// move, Home / End jump, Enter / Space pick (or toggle), Escape and Tab
// close; options are the role=option <li>s themselves, picked on
// mousedown so the trigger's blur does not close the menu first.
function useListbox(count: number, selectedIndex: number, onPick: (index: number) => void) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const optionId = (i: number) => `${id}-option-${i}`;

  const openMenu = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const closeMenu = () => {
    setActive(-1);
    setOpen(false);
  };
  const pick = (i: number) => {
    onPick(i);
    closeMenu();
  };

  // Keep the highlighted option visible in a scrolling menu.
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const last = count - 1;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) {
          openMenu();
          return;
        }
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => Math.max(0, Math.min(last, i + step)));
        return;
      }
      case "Home":
      case "End":
        if (!open) return;
        e.preventDefault();
        setActive(e.key === "Home" ? 0 : last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open && active >= 0) pick(active);
        else if (open) closeMenu();
        else openMenu();
        return;
      case "Escape":
        if (!open) return;
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        return;
      case "Tab":
        if (open) closeMenu();
        return;
    }
  };

  const trigger = {
    role: "combobox" as const,
    "aria-haspopup": "listbox" as const,
    "aria-expanded": open,
    "aria-controls": `${id}-menu`,
    "aria-activedescendant": open && active >= 0 ? optionId(active) : undefined,
    onClick: () => (open ? closeMenu() : openMenu()),
    onKeyDown,
    onBlur: closeMenu,
  };
  const option = (i: number) => ({
    id: optionId(i),
    role: "option" as const,
    "aria-selected": i === selectedIndex,
    onMouseDown: (e: ReactMouseEvent) => {
      e.preventDefault();
      pick(i);
    },
    onMouseEnter: () => setActive(i),
  });

  return { open, active, menuId: `${id}-menu`, trigger, option };
}

// «Search» (4573:37262): 364 x 46 pill, 1-px #8e8e8f ring, magnifier.
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
        className="h-[46px] w-full rounded-[50px] border border-stroke-default bg-white pl-4 pr-12 text-[16px] leading-6 text-neutral-900 outline-none transition-colors duration-200 placeholder:text-neutral-500 focus:border-neutral-800 [&::-webkit-search-cancel-button]:hidden"
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
  info?: boolean;
}) {
  const inner = (
    <>
      {children && <span className="whitespace-nowrap text-[14px] font-semibold leading-6 text-white">{children}</span>}
      {onSort && (
        <span className="flex items-start pl-2 pr-1">
          <SortIcon className="size-[18px] text-[#bbbbbc] transition-colors duration-200 group-hover:text-white" />
        </span>
      )}
      {info && (
        <span className="flex items-start pl-2 pr-1">
          <InfoHeadIcon className="size-[18px] text-[#bbbbbc]" />
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
