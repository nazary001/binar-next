"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowDownIcon, ArrowUpIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { errorMessage, type ApiFailure } from "../lib/api";
import { cx, formatDate, formatMoney, formatTime } from "../lib/format";
import { Checkbox } from "./Checkbox";
import { Skeleton } from "./Skeleton";
import { EmptyState, ErrorState } from "./States";
import { COLOR_TRANSITION, FOCUS_RING_INSET, SURFACE, TEXT, TONES } from "./tokens";

// The panel's table: a white r24 card clipping a table that scrolls
// sideways inside it, a dark head, hairline rows with a hover tint, and
// every state designed (loading, refreshing, failed, empty).
//
//   const list = useListParams({ defaults: { sort: "-createdAt" } });
//   const orders = useAdminQuery<Page<OrderRow>>(`/orders?${list.queryString}`);
//   <DataTable
//     caption="Замовлення"
//     columns={[
//       { key: "number", header: "Номер", cell: (o) => <TwoLineCell title={o.number} subtitle={o.company} /> },
//       { key: "date", header: "Дата", sortKey: "createdAt", firstSort: "desc", cell: (o) => <DateCell value={o.createdAt} withTime /> },
//       { key: "status", header: "Статус", cell: (o) => <OrderStatusBadge status={o.status} /> },
//       { key: "total", header: "Сума", align: "right", sortKey: "total", firstSort: "desc", cell: (o) => <MoneyCell value={o.total} /> },
//       { key: "menu", header: <span className="sr-only">Дії</span>, interactive: true, width: 56, cell: (o) => <RowMenu ... /> },
//     ]}
//     rows={orders.data?.items}
//     rowKey={(o) => o.id}
//     loading={orders.loading}
//     stale={orders.stale}
//     error={orders.error}
//     onRetry={orders.reload}
//     sort={list.sort}
//     onSort={(sort) => list.set({ sort })}
//     rowHref={(o) => `/admin/orders/${o.id}`}
//     selection={{ selected, onChange: setSelected }}
//     minWidth={960}
//     footer={<Pagination ... />}
//   />
//
// Column<T>
// - key, header, cell(row): the column, its head label, its cell.
// - sortKey: makes the head a sort button; the table sorts by it through
//   `sort` / `onSort` ("createdAt" ascending, "-createdAt" descending).
//   firstSort: the direction of the first press (default "asc"; dates and
//   sums usually want "desc").
// - align, width (px or any CSS width), className (added to every cell).
// - hideBelow: 640 | 1024 | 1280, hides the column under that width.
// - interactive: the cell holds controls (a menu, a switch): it is lifted
//   above the row link and clicks in it never open the row.
//
// Props
// - rows: undefined while nothing has loaded (skeleton rows), [] for an
//   empty list (the `empty` slot, by default "Нічого не знайдено").
// - loading: 8 skeleton rows; stale: the body dims to 60 % while the next
//   page loads (keep showing the old rows); error: an error panel with
//   "Спробувати ще раз" (onRetry), or a thin bar above the rows when old
//   rows are still on screen.
// - rowHref(row): the whole row is a link: a real <a> in the first plain
//   column stretched over the row, so middle-click, Ctrl+click and keyboard
//   work. onRowClick(row): the same for an action instead of an address
//   (the row is focusable then and opens on Enter).
// - selection: { selected: ids, onChange(ids) }: a checkbox column with a
//   tri-state head box (selects or clears the rows of this page, keeps the
//   ids of other pages).
// - minWidth: px under which the table scrolls inside its card (phones).
// - footer: under the rows (Pagination, totals).
// - dense: 44-px rows instead of 56. caption: the table's accessible name.
//
// Helper cells: MoneyCell, DateCell, TwoLineCell, ThumbCell (below).

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortKey?: string;
  firstSort?: "asc" | "desc";
  align?: "left" | "right" | "center";
  width?: number | string;
  className?: string;
  hideBelow?: 640 | 1024 | 1280;
  interactive?: boolean;
};

export type DataTableSelection = { selected: string[]; onChange: (ids: string[]) => void };

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  stale?: boolean;
  error?: ApiFailure | null;
  onRetry?: () => void;
  empty?: ReactNode;
  sort?: string;
  onSort?: (sort: string) => void;
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  selection?: DataTableSelection;
  minWidth?: number;
  footer?: ReactNode;
  dense?: boolean;
  caption?: string;
  className?: string;
};

const HIDE: Record<640 | 1024 | 1280, string> = {
  640: "max-[639px]:hidden",
  1024: "max-[1023px]:hidden",
  1280: "max-[1279px]:hidden",
};

const ALIGN: Record<"left" | "right" | "center", string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const JUSTIFY: Record<"left" | "right" | "center", string> = {
  left: "justify-start",
  right: "justify-end",
  center: "justify-center",
};

// Widths of skeleton bars, varied so the placeholder reads as text.
const SKELETON_WIDTHS = [72, 54, 86, 46, 64, 78, 58, 68, 50, 82];
const SKELETON_ROWS = 8;

// Elements whose clicks belong to themselves, not to the row.
const OWN_CLICKS = "a, button, input, select, textarea, label, summary, [role='menuitem'], [role='checkbox'], [data-row-ignore]";

function parseSort(sort: string | undefined): { field: string; dir: "asc" | "desc" } | null {
  if (!sort) return null;
  return sort.startsWith("-") ? { field: sort.slice(1), dir: "desc" } : { field: sort, dir: "asc" };
}

function edgePad(index: number, count: number, hasSelection: boolean): string {
  return cx(
    index === 0 && !hasSelection ? "pl-5 min-[1024px]:pl-6" : "pl-4",
    index === count - 1 ? "pr-5 min-[1024px]:pr-6" : "pr-4",
  );
}

// The selection column uses the kit's Checkbox (brand when on, the dash of
// "part of this page"), so a table and a form draw the same box. Its
// clicks never reach the row: the row ignores clicks on labels and inputs.
function SelectBox({ checked, label, onToggle }: { checked: boolean | "mixed"; label: string; onToggle: () => void }) {
  return (
    <Checkbox
      checked={checked === true}
      indeterminate={checked === "mixed"}
      onChange={onToggle}
      aria-label={label}
      className="w-fit"
    />
  );
}

function SortGlyph({ dir }: { dir: "asc" | "desc" | null }) {
  if (dir === "asc") return <ArrowUpIcon aria-hidden className="size-3.5 shrink-0 text-white" />;
  if (dir === "desc") return <ArrowDownIcon aria-hidden className="size-3.5 shrink-0 text-white" />;
  return (
    <ChevronUpDownIcon
      aria-hidden
      className={cx("size-4 shrink-0 text-white/45 group-hover:text-white motion-reduce:transition-none", COLOR_TRANSITION)}
    />
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  stale = false,
  error = null,
  onRetry,
  empty,
  sort,
  onSort,
  rowHref,
  onRowClick,
  selection,
  minWidth,
  footer,
  dense = false,
  caption,
  className,
}: DataTableProps<T>) {
  const hasSelection = Boolean(selection);
  const active = parseSort(sort);
  const showSkeleton = !error && (loading || rows === undefined) && !(rows && rows.length > 0);
  const showError = Boolean(error) && !(rows && rows.length > 0);
  const list = rows ?? [];
  const showEmpty = !showSkeleton && !showError && list.length === 0;
  // The column that carries the row link: the first one that is neither a
  // control nor hidden on phones (a hidden link would leave phones without one).
  const linkColumn = rowHref ? columns.findIndex((column) => !column.interactive && !column.hideBelow) : -1;

  const selected = new Set(selection?.selected ?? []);
  const pageIds = list.map(rowKey);
  const onPage = pageIds.filter((id) => selected.has(id)).length;
  const headState: boolean | "mixed" = pageIds.length > 0 && onPage === pageIds.length ? true : onPage > 0 ? "mixed" : false;

  const toggleAll = () => {
    if (!selection) return;
    if (headState === true) {
      const drop = new Set(pageIds);
      selection.onChange(selection.selected.filter((id) => !drop.has(id)));
    } else {
      selection.onChange([...selection.selected, ...pageIds.filter((id) => !selected.has(id))]);
    }
  };

  const toggleOne = (id: string) => {
    if (!selection) return;
    selection.onChange(selected.has(id) ? selection.selected.filter((item) => item !== id) : [...selection.selected, id]);
  };

  const sortBy = (column: Column<T>) => {
    if (!onSort || !column.sortKey) return;
    const dir = active && active.field === column.sortKey ? (active.dir === "asc" ? "desc" : "asc") : (column.firstSort ?? "asc");
    onSort(dir === "desc" ? `-${column.sortKey}` : column.sortKey);
  };

  const rowClick = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return;
    const control = (event.target as HTMLElement).closest(OWN_CLICKS);
    if (control && control !== event.currentTarget && event.currentTarget.contains(control)) return;
    // A text selection in a cell is not a click on the row.
    if (window.getSelection()?.toString()) return;
    onRowClick(row);
  };

  const rowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick || event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  const rowHeight = dense ? "h-11" : "h-14";

  return (
    // A column: stretched by a grid row, the empty and error panels (flex-1)
    // take the room left and centre in it.
    <div className={cx(SURFACE.card, "relative flex min-w-0 flex-col overflow-hidden", className)}>
      {error && !showError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-[13px] leading-[18px] min-[1024px]:px-6"
          style={{ backgroundColor: TONES.red.bg, color: TONES.red.text }}
        >
          <span>Не вдалося оновити дані. {errorMessage(error)}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={cx("cursor-pointer rounded-full font-semibold underline underline-offset-4", FOCUS_RING_INSET)}
            >
              Спробувати ще раз
            </button>
          )}
        </div>
      )}

      <p className="sr-only" role="status">
        {showSkeleton ? "Завантаження..." : ""}
      </p>

      <div className="admin-scroll overflow-x-auto">
        <table
          className="w-full border-separate border-spacing-0"
          style={minWidth ? { minWidth } : undefined}
          aria-busy={showSkeleton || stale || undefined}
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="bg-neutral-800">
              {hasSelection && (
                <th scope="col" className="h-11 w-12 pl-5 pr-0 text-left align-middle min-[1024px]:pl-6">
                  <SelectBox checked={headState} label="Вибрати всі рядки на сторінці" onToggle={toggleAll} />
                </th>
              )}
              {columns.map((column, index) => {
                const align = column.align ?? "left";
                const sortable = Boolean(column.sortKey && onSort);
                const dir = sortable && active && active.field === column.sortKey ? active.dir : null;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sortable ? (dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none") : undefined}
                    style={column.width !== undefined ? { width: column.width } : undefined}
                    className={cx(
                      "h-11 whitespace-nowrap align-middle text-[12px] font-semibold leading-4 text-white",
                      edgePad(index, columns.length, hasSelection),
                      ALIGN[align],
                      column.hideBelow && HIDE[column.hideBelow],
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => sortBy(column)}
                        className={cx(
                          "group -mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-white",
                          JUSTIFY[align],
                          FOCUS_RING_INSET,
                        )}
                      >
                        {column.header}
                        <SortGlyph dir={dir} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody
            className={cx(
              "transition-opacity duration-200 motion-reduce:transition-none",
              stale && !showSkeleton ? "opacity-60" : "opacity-100",
            )}
          >
            {showSkeleton &&
              Array.from({ length: SKELETON_ROWS }, (_, r) => (
                <tr key={`skeleton-${r}`} aria-hidden className="[&:not(:last-child)>td]:border-b [&>td]:border-stroke-subtle">
                  {hasSelection && (
                    <td className={cx(rowHeight, "w-12 pl-5 pr-0 min-[1024px]:pl-6")}>
                      <Skeleton className="size-[18px]" shape="bar" />
                    </td>
                  )}
                  {columns.map((column, c) => (
                    <td
                      key={column.key}
                      className={cx(rowHeight, "align-middle", edgePad(c, columns.length, hasSelection), column.hideBelow && HIDE[column.hideBelow])}
                    >
                      {/* The bar's width varies by cell, so the rows read as text. */}
                      <span
                        className={cx("block", column.align === "right" && "ml-auto", column.align === "center" && "mx-auto")}
                        style={{ width: `${SKELETON_WIDTHS[(r * 3 + c) % SKELETON_WIDTHS.length]}%`, maxWidth: 200 }}
                      >
                        <Skeleton className="h-3.5 w-full" />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}

            {!showSkeleton &&
              !showError &&
              list.map((row) => {
                const id = rowKey(row);
                const isSelected = selected.has(id);
                const href = rowHref?.(row);
                const clickable = Boolean(href || onRowClick);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? (event) => rowClick(event, row) : undefined}
                    onKeyDown={onRowClick ? (event) => rowKeyDown(event, row) : undefined}
                    tabIndex={onRowClick && !href ? 0 : undefined}
                    aria-selected={hasSelection ? isSelected : undefined}
                    className={cx(
                      "[&:not(:last-child)>td]:border-b [&>td]:border-stroke-subtle motion-reduce:transition-none",
                      COLOR_TRANSITION,
                      href && "relative",
                      clickable && "cursor-pointer",
                      onRowClick && !href && "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                      isSelected ? "bg-neutral-40" : "hover:bg-bg-subtle",
                    )}
                  >
                    {hasSelection && (
                      <td className={cx(rowHeight, "relative z-10 w-12 pl-5 pr-0 align-middle min-[1024px]:pl-6")}>
                        <SelectBox checked={isSelected} label={`Вибрати рядок ${id}`} onToggle={() => toggleOne(id)} />
                      </td>
                    )}
                    {columns.map((column, c) => {
                      const content = column.cell(row);
                      return (
                        <td
                          key={column.key}
                          className={cx(
                            rowHeight,
                            TEXT.body,
                            "py-2 align-middle",
                            edgePad(c, columns.length, hasSelection),
                            ALIGN[column.align ?? "left"],
                            // Right-aligned columns hold figures: "1 240 шт." stays on one line.
                            column.align === "right" && "whitespace-nowrap",
                            column.hideBelow && HIDE[column.hideBelow],
                            column.interactive && "relative z-10",
                            column.className,
                          )}
                        >
                          {href && c === linkColumn ? (
                            <Link
                              href={href}
                              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand"
                            >
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* The failed and the empty panels sit under the head, outside the
          scrolling table: centred in the card, never in a table wider than
          the phone. */}
      {showError && error && <ErrorState failure={error} onRetry={onRetry} />}
      {showEmpty && (empty ?? <EmptyState title="Нічого не знайдено" text="Змініть пошук або фільтри, щоб побачити записи." />)}

      {footer && list.length > 0 && !showError && (
        <div className="border-t border-stroke-subtle px-5 py-3 min-[1024px]:px-6">{footer}</div>
      )}
    </div>
  );
}

// --- helper cells ------------------------------------------------------------

// A sum in hryvnias, in tabular figures ("18 400,00 ₴"). Put it in a
// column with align: "right".
export function MoneyCell({ value, whole = false, muted = false }: { value: number | null | undefined; whole?: boolean; muted?: boolean }) {
  return (
    <span className={cx("whitespace-nowrap tabular-nums", muted ? "text-neutral-500" : "font-semibold text-neutral-900")}>
      {formatMoney(value, { whole })}
    </span>
  );
}

// A date ("12.11.2026"), with the time under it when `withTime`.
export function DateCell({ value, withTime = false }: { value: string | Date | null | undefined; withTime?: boolean }) {
  return (
    <span className="flex flex-col whitespace-nowrap tabular-nums">
      <span>{formatDate(value)}</span>
      {withTime && <span className={TEXT.caption}>{formatTime(value)}</span>}
    </span>
  );
}

// A strong first line over a muted second one (a number over a company,
// a name over an e-mail). Both truncate; give the column a width.
export function TwoLineCell({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-semibold text-neutral-900">{title}</span>
      {subtitle && <span className={cx(TEXT.caption, "truncate")}>{subtitle}</span>}
    </span>
  );
}

// A 40-px r12 picture before two lines (products, media, posts).
export function ThumbCell({ src, alt, title, subtitle }: { src?: string | null; alt: string; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="size-10 shrink-0 rounded-xl bg-bg-subtle object-cover" />
      ) : (
        <span aria-hidden className="size-10 shrink-0 rounded-xl bg-bg-cabinet" />
      )}
      <TwoLineCell title={title} subtitle={subtitle} />
    </span>
  );
}
