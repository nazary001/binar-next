"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { Fragment, useEffect, useId, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { errorMessage, type ApiFailure } from "../lib/api";
import { cx, formatDate, formatMoney, formatTime } from "../lib/format";
import { Checkbox } from "./Checkbox";
import { Skeleton } from "./Skeleton";
import { EmptyState, ErrorState } from "./States";
import { COLOR_TRANSITION, FOCUS_RING, FOCUS_RING_INSET, SURFACE, TEXT, TONES } from "./tokens";

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
// - align, width (px or any CSS width), className (added to every body
//   cell), headClassName (added to the head cell; put the same hiding
//   class in both to hide a column by CSS of your own).
// - hideBelow: 640 | 768 | 1024 | 1280 | 1360 | 1440 | 1536 | 1600 | 1680,
//   hides the column (head and cells) under that window width. Pure CSS:
//   no second render after hydration.
// - maxWidth: px (a number) or a max-width class ("max-w-[240px]"): the
//   cell's content is cut with an ellipsis at that width instead of
//   widening the table; the full text is the cell's tooltip.
// - fill: the column takes the free room of the table (the others keep
//   their content's width) and its content is cut with an ellipsis rather
//   than pushing the table wider than its card. One per table.
// - title(row): the tooltip of a cut cell (default: the cell itself when it
//   is plain text or a number).
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
// - rowHref(row): the whole row is a link: a real <a> stretched over the
//   row, so middle-click, Ctrl+click and keyboard work. It sits in the first
//   plain column that is visible at every width (no hideBelow, no hiding
//   class); without one it falls back to the first plain column and warns
//   in development (phones would lose the link). onRowClick(row): the same
//   for an action instead of an address (the row is focusable then and
//   opens on Enter). Neither fires for clicks inside a layer a cell opened
//   (a Select's options, a KebabMenu's items), which React would otherwise
//   bubble up from their portal to the row.
// - selection: { selected: ids, onChange(ids) }: a checkbox column with a
//   tri-state head box (selects or clears the rows of this page, keeps the
//   ids of other pages). The head box shows only when the page has rows.
// - renderExpanded(row): rows open in place to show details under them: a
//   chevron column at the end (aria-expanded, aria-controls, Enter and
//   Space), and a press on the row toggles it too (unless the row has its
//   own rowHref / onRowClick). Return null for a row without details: it
//   gets no chevron. expandMode: "multiple" (default) or "single" (opening
//   one closes the other). expanded / onExpandedChange(ids): control it
//   from outside (an address ?open=); defaultExpanded: the ids open at
//   first. expandLabel(row, open): the chevron's name ("Показати
//   подробиці" / "Сховати подробиці").
// - markedKey: the id of the row an address points at (/admin/materials?file=):
//   a warm tint, the brand bar on its left edge, aria-current="true".
//   rowClassName(row): classes of your own on a row's <tr>.
// - minWidth: px under which the table scrolls inside its card (phones).
// - footer: under the rows (Pagination, totals).
// - dense: 44-px rows instead of 56. caption: the table's accessible name.
//
// Helper cells: MoneyCell, DateCell, TwoLineCell, ThumbCell (below).

export type HideBelow = 640 | 768 | 1024 | 1280 | 1360 | 1440 | 1536 | 1600 | 1680;

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortKey?: string;
  firstSort?: "asc" | "desc";
  align?: "left" | "right" | "center";
  width?: number | string;
  className?: string;
  headClassName?: string;
  hideBelow?: HideBelow;
  maxWidth?: number | string;
  fill?: boolean;
  title?: (row: T) => string | undefined;
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
  renderExpanded?: (row: T) => ReactNode;
  expandMode?: "single" | "multiple";
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  expandLabel?: (row: T, open: boolean) => string;
  markedKey?: string | null;
  rowClassName?: (row: T) => string | undefined;
  minWidth?: number;
  footer?: ReactNode;
  dense?: boolean;
  caption?: string;
  className?: string;
};

// Whole literal classes per step (Tailwind extracts nothing built at run
// time); the project's rule: min-/max-[...px] variants, never lg:.
const HIDE: Record<HideBelow, string> = {
  640: "max-[639px]:hidden",
  768: "max-[767px]:hidden",
  1024: "max-[1023px]:hidden",
  1280: "max-[1279px]:hidden",
  1360: "max-[1359px]:hidden",
  1440: "max-[1439px]:hidden",
  1536: "max-[1535px]:hidden",
  1600: "max-[1599px]:hidden",
  1680: "max-[1679px]:hidden",
};

// A class that hides an element at some width ("hidden", "max-[639px]:hidden").
const HIDING = /(^|\s)([^\s]*:)?hidden(\s|$)/;

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

// The cut row: a warm tint and the brand bar on the left edge (the look the
// media library gave the file a link points at).
const MARKED = "[&>td]:bg-[#fff7f2] [&>td:first-child]:shadow-[inset_3px_0_0_#f85a0b]";

// Each problem of a table's link column is told once per page load.
const warned = new Set<string>();

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

// Whether a column can be hidden at some width (so a row link in it would
// be lost there).
function mayHide<T>(column: Column<T>): boolean {
  return Boolean(column.hideBelow) || HIDING.test(column.className ?? "") || HIDING.test(column.headClassName ?? "");
}

// The content of a cut cell (maxWidth or fill): one line with an ellipsis.
function cutStyle<T>(column: Column<T>): CSSProperties | undefined {
  return typeof column.maxWidth === "number" ? { maxWidth: column.maxWidth } : undefined;
}

function cutClass<T>(column: Column<T>): string | undefined {
  if (column.maxWidth === undefined && !column.fill) return undefined;
  return cx("block min-w-0 truncate", typeof column.maxWidth === "string" && column.maxWidth);
}

function plainText(content: ReactNode): string | undefined {
  return typeof content === "string" || typeof content === "number" ? String(content) : undefined;
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

const defaultExpandLabel = (_row: unknown, open: boolean) => (open ? "Сховати подробиці" : "Показати подробиці");

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
  renderExpanded,
  expandMode = "multiple",
  expanded,
  defaultExpanded,
  onExpandedChange,
  expandLabel = defaultExpandLabel,
  markedKey,
  rowClassName,
  minWidth,
  footer,
  dense = false,
  caption,
  className,
}: DataTableProps<T>) {
  const tableId = useId();
  const hasSelection = Boolean(selection);
  const expandable = Boolean(renderExpanded);
  const active = parseSort(sort);
  const showSkeleton = !error && (loading || rows === undefined) && !(rows && rows.length > 0);
  const showError = Boolean(error) && !(rows && rows.length > 0);
  const list = rows ?? [];
  const showEmpty = !showSkeleton && !showError && list.length === 0;
  // Data columns plus the chevron column, for the edge paddings and colSpan.
  const edgeCount = columns.length + (expandable ? 1 : 0);
  const span = edgeCount + (hasSelection ? 1 : 0);

  // The column that carries the row link: the first one that is neither a
  // control nor hidden at some width (a hidden link would leave phones
  // without one); else the first plain one, with a warning in development.
  const plainIndex = rowHref ? columns.findIndex((column) => !column.interactive) : -1;
  const visibleIndex = rowHref ? columns.findIndex((column) => !column.interactive && !mayHide(column)) : -1;
  const linkColumn = visibleIndex >= 0 ? visibleIndex : plainIndex;
  const linkProblem =
    !rowHref || visibleIndex >= 0
      ? null
      : plainIndex >= 0
        ? `DataTable "${caption ?? columns.map((column) => column.key).join(",")}": every plain column can be hidden, so the row link sits in "${columns[plainIndex].key}" and is lost where that column is hidden. Keep one plain column visible at every width.`
        : `DataTable "${caption ?? columns.map((column) => column.key).join(",")}": rowHref is set but every column is interactive, so rows have no link.`;
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !linkProblem || warned.has(linkProblem)) return;
    warned.add(linkProblem);
    console.warn(linkProblem);
  }, [linkProblem]);

  // Open rows: the caller's when controlled, else our own.
  const [ownOpen, setOwnOpen] = useState<string[]>(() => defaultExpanded ?? []);
  const openIds = expanded ?? ownOpen;
  const toggleExpanded = (id: string) => {
    const isOpen = openIds.includes(id);
    const next = isOpen ? openIds.filter((item) => item !== id) : expandMode === "single" ? [id] : [...openIds, id];
    if (expanded === undefined) setOwnOpen(next);
    onExpandedChange?.(next);
  };

  const selected = new Set(selection?.selected ?? []);
  const pageIds = list.map(rowKey);
  const onPage = pageIds.filter((id) => selected.has(id)).length;
  const headState: boolean | "mixed" = pageIds.length > 0 && onPage === pageIds.length ? true : onPage > 0 ? "mixed" : false;
  // Nothing to choose on an empty or loading page: no head box.
  const headBox = hasSelection && !showSkeleton && !showError && pageIds.length > 0;

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

  // A press on a row's own surface; false for one that belongs elsewhere.
  const isRowPress = (event: MouseEvent<HTMLTableRowElement>): boolean => {
    const target = event.target;
    // React bubbles events from a portal (a Select's options, a menu's
    // items opened from a cell) up to the row; those are not on the row.
    if (!(target instanceof Node) || !event.currentTarget.contains(target)) return false;
    const control = target instanceof Element ? target.closest(OWN_CLICKS) : null;
    if (control && control !== event.currentTarget && event.currentTarget.contains(control)) return false;
    // A text selection in a cell is not a click on the row.
    if (window.getSelection()?.toString()) return false;
    return true;
  };

  const rowClick = (event: MouseEvent<HTMLTableRowElement>, row: T, id: string, canExpand: boolean) => {
    if (!isRowPress(event)) return;
    if (onRowClick) onRowClick(row);
    else if (canExpand) toggleExpanded(id);
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
                  {headBox ? (
                    <SelectBox checked={headState} label="Вибрати всі рядки на сторінці" onToggle={toggleAll} />
                  ) : (
                    <span className="sr-only">Вибір рядків</span>
                  )}
                </th>
              )}
              {columns.map((column, index) => {
                const align = column.align ?? "left";
                const sortable = Boolean(column.sortKey && onSort);
                const dir = sortable && active && active.field === column.sortKey ? active.dir : null;
                const width = column.fill ? "100%" : column.width;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sortable ? (dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none") : undefined}
                    style={width !== undefined ? { width } : undefined}
                    className={cx(
                      "h-11 whitespace-nowrap align-middle text-[12px] font-semibold leading-4 text-white",
                      edgePad(index, edgeCount, hasSelection),
                      ALIGN[align],
                      column.hideBelow && HIDE[column.hideBelow],
                      column.headClassName,
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
              {expandable && (
                <th scope="col" className="h-11 w-[60px] pl-2 pr-5 align-middle min-[1024px]:w-[68px] min-[1024px]:pr-6">
                  <span className="sr-only">Подробиці</span>
                </th>
              )}
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
                      className={cx(
                        rowHeight,
                        "align-middle",
                        edgePad(c, edgeCount, hasSelection),
                        column.hideBelow && HIDE[column.hideBelow],
                        column.fill && "max-w-0",
                      )}
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
                  {expandable && (
                    <td className={cx(rowHeight, "pl-2 pr-5 min-[1024px]:pr-6")}>
                      <Skeleton shape="circle" className="ml-auto size-8" />
                    </td>
                  )}
                </tr>
              ))}

            {!showSkeleton &&
              !showError &&
              list.map((row) => {
                const id = rowKey(row);
                const isSelected = selected.has(id);
                const href = rowHref?.(row);
                const details = renderExpanded ? renderExpanded(row) : null;
                const canExpand = details !== null && details !== undefined && details !== false;
                const isOpen = canExpand && openIds.includes(id);
                const detailsId = `${tableId}-details-${id}`;
                const marked = markedKey !== undefined && markedKey !== null && markedKey === id;
                const clickable = Boolean(href || onRowClick || canExpand);
                return (
                  <Fragment key={id}>
                    <tr
                      onClick={onRowClick || (canExpand && !href) ? (event) => rowClick(event, row, id, canExpand && !href) : undefined}
                      onKeyDown={onRowClick ? (event) => rowKeyDown(event, row) : undefined}
                      tabIndex={onRowClick && !href ? 0 : undefined}
                      aria-selected={hasSelection ? isSelected : undefined}
                      aria-current={marked ? "true" : undefined}
                      data-marked={marked || undefined}
                      className={cx(
                        // An open row and its details read as one block: no line between them.
                        !isOpen && "[&:not(:last-child)>td]:border-b",
                        "[&>td]:border-stroke-subtle motion-reduce:transition-none",
                        COLOR_TRANSITION,
                        href && "relative",
                        clickable && "cursor-pointer",
                        onRowClick && !href && "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                        isSelected ? "bg-neutral-40" : isOpen ? "bg-bg-subtle" : "hover:bg-bg-subtle",
                        marked && MARKED,
                        rowClassName?.(row),
                      )}
                    >
                      {hasSelection && (
                        <td className={cx(rowHeight, "relative z-10 w-12 pl-5 pr-0 align-middle min-[1024px]:pl-6")}>
                          <SelectBox checked={isSelected} label={`Вибрати рядок ${id}`} onToggle={() => toggleOne(id)} />
                        </td>
                      )}
                      {columns.map((column, c) => {
                        const content = column.cell(row);
                        const cut = cutClass(column);
                        const linked =
                          href && c === linkColumn ? (
                            <Link
                              href={href}
                              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand"
                            >
                              {content}
                            </Link>
                          ) : (
                            content
                          );
                        return (
                          <td
                            key={column.key}
                            className={cx(
                              rowHeight,
                              TEXT.body,
                              "py-2 align-middle",
                              edgePad(c, edgeCount, hasSelection),
                              ALIGN[column.align ?? "left"],
                              // Right-aligned columns hold figures: "1 240 шт." stays on one line.
                              column.align === "right" && "whitespace-nowrap",
                              column.hideBelow && HIDE[column.hideBelow],
                              column.interactive && "relative z-10",
                              // max-w-0: the filling column gives way instead of widening the table.
                              column.fill && "max-w-0",
                              column.className,
                            )}
                          >
                            {cut ? (
                              <span className={cut} style={cutStyle(column)} title={column.title?.(row) ?? plainText(content)}>
                                {linked}
                              </span>
                            ) : (
                              linked
                            )}
                          </td>
                        );
                      })}
                      {expandable && (
                        <td className={cx(rowHeight, "relative z-10 py-2 pl-2 pr-5 text-right align-middle min-[1024px]:pr-6")}>
                          {canExpand && (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(id)}
                              aria-expanded={isOpen}
                              aria-controls={isOpen ? detailsId : undefined}
                              aria-label={expandLabel(row, isOpen)}
                              title={expandLabel(row, isOpen)}
                              className={cx(
                                "inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-neutral-600 hover:bg-bg-cabinet hover:text-neutral-900 motion-reduce:transition-none",
                                COLOR_TRANSITION,
                                FOCUS_RING,
                              )}
                            >
                              <ChevronDownIcon
                                aria-hidden
                                className={cx("size-5 transition-[rotate] duration-200 motion-reduce:transition-none", isOpen && "rotate-180")}
                              />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {isOpen && (
                      <tr className="bg-bg-subtle [&:not(:last-child)>td]:border-b [&>td]:border-stroke-subtle">
                        <td colSpan={span} className="p-0">
                          <div id={detailsId} className="min-w-0 px-5 py-5 min-[1024px]:px-6">
                            {details}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
