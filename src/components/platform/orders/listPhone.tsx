"use client";

import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { AppliedChips } from "@/components/ui/AppliedChips";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterButton } from "@/components/ui/FilterButton";
import { LoadMore } from "@/components/ui/LoadMore";
import { SearchField } from "@/components/ui/SearchField";
import { OptionRow, Sheet, SheetDivider, SheetGroup } from "@/components/ui/Sheet";
import { SortMenu } from "@/components/ui/SortMenu";
import { ListPanel, OrderStatusBadge, RecordRow, RowDisc } from "@/components/platform/ui";
import { SideMenuOrdersIcon } from "../icons";
import { OrderDocumentsIcon } from "../orderIcons";
import {
  COUNTERPARTIES,
  ORDERS_TODAY,
  PERIODS,
  formatDate,
  formatRange,
  formatSum,
  periodStart,
  type Order,
  type PeriodValue,
} from "./data";
import {
  SORT_OPTIONS,
  activeFilterCount,
  defaultFilters,
  foundLabel,
  sortFromValue,
  sortValue,
  type Filters,
  type ListState,
} from "./listState";
import { PaymentCaptions, PaymentChip } from "./PaymentCell";

// Phone layer of the orders page and its returns tab (orders-list spec 2.3 -
// 2.9, template T2): the search row (SearchField + FilterButton), the
// applied-filter chips, the meta line (period range + SortMenu), the
// filter sheet (T5a draft model), the RecordRow list panel or its empty
// state, and the load-more block. Everything here renders below 640 only
// (the callers wrap it `lg:hidden`); the desktop filter row, table and
// pager stay untouched next to it.

type Tab = "orders" | "returns";

const COPY = {
  placeholder: "№ або контрагент",
  sheetTitle: "Фільтри",
  sheetClose: "Закрити фільтри",
  period: "Період",
  counterparty: "Контрагент",
  status: { orders: "Статус замовлення", returns: "Статус повернення" },
  allCounterparties: "Усі контрагенти",
  allStatuses: "Усі статуси",
  reset: "Скинути",
  show: "Показати",
  list: { orders: "Список замовлень", returns: "Список повернень" },
  freshTitle: { orders: "Замовлень ще немає", returns: "Повернень ще немає" },
  freshText: {
    orders: "Оформіть перше замовлення, щоб воно з’явилося у цьому списку.",
    returns: "Оформити повернення можна на сторінці отриманого замовлення.",
  },
  noMatchTitle: { orders: "Замовлень не знайдено", returns: "Повернень не знайдено" },
  noMatchText: "Змініть пошук або умови фільтрів.",
  noMatchReset: "Скинути фільтри",
  orderNumber: (number: string) => `№${number}`,
  orderLink: (number: string) => `Деталі замовлення №${number}`,
  orderDocuments: (number: string) => `Документи замовлення №${number}`,
} as const;

const rangeOf = (period: PeriodValue) => formatRange(periodStart(period, ORDERS_TODAY), ORDERS_TODAY);

// ----------------------------------------------------------------------
// Rows

// Phone row of the orders tab (spec 2.6, system spec A7): the order
// number is the stretched link to /orders/<id> over the date; the
// documents disc (44 hit / 40 ring) + the chevron on the right; the sum
// (22/28 SemiBold) over the plain counterparty (2 lines max); the order
// badge + the bare payment chip, the payment caption(s) 8 below them.
export function OrderRecordRow({ order, onDocuments }: { order: Order; onDocuments?: (order: Order) => void }) {
  return (
    <RecordRow
      id={COPY.orderNumber(order.number)}
      linkLabel={COPY.orderLink(order.number)}
      href={`/orders/${order.id}`}
      date={formatDate(order.date)}
      amount={formatSum(order.total)}
      sub={order.counterparty}
      action={
        onDocuments ? (
          <RowDisc label={COPY.orderDocuments(order.number)} haspopup="dialog" onClick={() => onDocuments(order)}>
            <OrderDocumentsIcon className="size-5" />
          </RowDisc>
        ) : undefined
      }
      badges={
        <>
          <OrderStatusBadge status={order.status} />
          <PaymentChip order={order} />
        </>
      }
      caption={<PaymentCaptions order={order} />}
    />
  );
}

// ----------------------------------------------------------------------
// Toolbar: search row, applied chips, meta + sort, filter sheet

export type StatusOption<S extends string> = { value: S; label: string };

export function PhoneToolbar<S extends string>({
  tab,
  state,
  statusOptions,
  countFor,
  searchLabel,
  inputRef,
}: {
  tab: Tab;
  state: ListState<S>;
  statusOptions: StatusOption<S>[];
  // Rows the list would show for these filters (the current query kept):
  // the sheet footer counts its draft with it.
  countFor: (filters: Filters<S>) => number;
  searchLabel: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Filters<S>>(state.filters);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollAfter = useRef(false);
  // The chip handlers are built in render (one per chip), so they find the
  // row and the disc by id rather than through refs.
  const uid = useId();
  const rootId = `${uid}-toolbar`;
  const chipsId = `${uid}-chips`;
  const filterDisc = () =>
    document.getElementById(rootId)?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]') ?? null;

  // T5a: the sheet edits a draft seeded from the applied filters; any
  // close commits it once (onSettled). The show button also brings the toolbar
  // back under the bar when the shorter list left it above the viewport.
  const openSheet = () => {
    setDraft(state.filters);
    setSheetOpen(true);
  };
  const settle = () => {
    state.applyFilters(draft);
    if (!scrollAfter.current) return;
    scrollAfter.current = false;
    requestAnimationFrame(() => {
      const top = rootRef.current?.getBoundingClientRect().top;
      if (top !== undefined && top < 66) window.scrollTo({ top: top + window.scrollY - 66 - 16, behavior: "instant" });
    });
  };

  // Chip removal keeps the focus in the row: the next chip (or the reset
  // button); when the row is gone, the filter disc.
  const refocusChips = (index: number) => {
    requestAnimationFrame(() => {
      const buttons = document.getElementById(chipsId)?.querySelectorAll<HTMLButtonElement>("button");
      const next = buttons && buttons.length > 0 ? buttons[Math.min(index, buttons.length - 1)] : filterDisc();
      next?.focus({ preventScroll: true });
    });
  };

  const f = state.filters;
  const applied: { key: string; label: string; reset: () => void }[] = [];
  if (f.period !== "30") {
    applied.push({
      key: "period",
      label: PERIODS.find((p) => p.value === f.period)?.label ?? "",
      reset: () => state.setPeriod("30"),
    });
  }
  if (f.counterparty !== "all") {
    applied.push({ key: "counterparty", label: f.counterparty, reset: () => state.setCounterparty("all") });
  }
  if (f.status !== "all") {
    applied.push({
      key: "status",
      label: statusOptions.find((o) => o.value === f.status)?.label ?? "",
      reset: () => state.setStatus("all"),
    });
  }
  const chips = applied.map((c, i) => ({
    key: c.key,
    label: c.label,
    onRemove: () => {
      c.reset();
      refocusChips(i);
    },
  }));

  return (
    <div ref={rootRef} id={rootId} className="flex flex-col gap-4 px-6 pb-6 lg:hidden">
      <div className="flex items-center gap-2">
        <SearchField
          value={state.query}
          onChange={state.setQuery}
          label={searchLabel}
          placeholder={COPY.placeholder}
          className="min-w-0 flex-1"
          inputRef={inputRef}
        />
        <FilterButton count={activeFilterCount(f)} expanded={sheetOpen} onClick={openSheet} />
      </div>
      <div id={chipsId} className="contents">
        <AppliedChips
          chips={chips}
          onReset={() => {
            state.resetFilters();
            requestAnimationFrame(() => filterDisc()?.focus({ preventScroll: true }));
          }}
        />
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="whitespace-nowrap text-[14px] leading-5 text-neutral-600">{rangeOf(f.period)}</span>
        <SortMenu
          value={sortValue(state.sort)}
          options={SORT_OPTIONS}
          onChange={(v) => state.setSort(sortFromValue(v))}
          className="ml-auto"
        />
      </div>
      <FilterSheet
        tab={tab}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onShow={() => {
          scrollAfter.current = true;
          setSheetOpen(false);
        }}
        onSettled={settle}
        draft={draft}
        setDraft={setDraft}
        statusOptions={statusOptions}
        count={countFor(draft)}
      />
    </div>
  );
}

function FilterSheet<S extends string>({
  tab,
  open,
  onClose,
  onShow,
  onSettled,
  draft,
  setDraft,
  statusOptions,
  count,
}: {
  tab: Tab;
  open: boolean;
  onClose: () => void;
  onShow: () => void;
  onSettled: () => void;
  draft: Filters<S>;
  setDraft: (f: Filters<S>) => void;
  statusOptions: StatusOption<S>[];
  count: number;
}) {
  const id = useId();
  const footRef = useRef<HTMLDivElement>(null);
  const active = activeFilterCount(draft) > 0;

  const group = <V extends string>(key: string, title: string, options: { value: V; label: string }[], value: V, pick: (v: V) => void, after?: ReactNode) => (
    <SheetGroup id={`${id}-${key}`} title={title}>
      <div role="radiogroup" aria-labelledby={`${id}-${key}-title`}>
        {options.map((o) => (
          <OptionRow
            key={o.value}
            type="radio"
            name={`${id}-${key}`}
            value={o.value}
            checked={value === o.value}
            onSelect={() => pick(o.value)}
          >
            {o.label}
          </OptionRow>
        ))}
      </div>
      {after}
    </SheetGroup>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onSettled={onSettled}
      title={COPY.sheetTitle}
      closeLabel={COPY.sheetClose}
      footer={
        <div ref={footRef} className="contents">
          <p role="status" aria-live="polite" className="text-body-sm text-neutral-500">
            {foundLabel(tab, count)}
          </p>
          <div className="flex gap-2">
            <Button
              size="small"
              variant="outlinedDark"
              fullWidth
              disabled={!active}
              onClick={() => {
                setDraft(defaultFilters<S>());
                // The pressed button turns disabled: keep the focus in the
                // footer, on the show button.
                requestAnimationFrame(() => footRef.current?.querySelectorAll("button")[1]?.focus({ preventScroll: true }));
              }}
            >
              {COPY.reset}
            </Button>
            <Button size="small" fullWidth onClick={onShow}>
              {COPY.show}
            </Button>
          </div>
        </div>
      }
    >
      {group(
        "period",
        COPY.period,
        PERIODS.map((p) => ({ value: p.value, label: p.label })),
        draft.period,
        (period) => setDraft({ ...draft, period }),
        <p className="mt-2 text-[12px] leading-4 text-neutral-500">{rangeOf(draft.period)}</p>,
      )}
      <SheetDivider />
      {group(
        "counterparty",
        COPY.counterparty,
        [{ value: "all", label: COPY.allCounterparties }, ...COUNTERPARTIES.map((c) => ({ value: c, label: c }))],
        draft.counterparty,
        (counterparty) => setDraft({ ...draft, counterparty }),
      )}
      <SheetDivider />
      {group<"all" | S>(
        "status",
        COPY.status[tab],
        [{ value: "all", label: COPY.allStatuses }, ...statusOptions],
        draft.status,
        (status) => setDraft({ ...draft, status }),
      )}
    </Sheet>
  );
}

// ----------------------------------------------------------------------
// List block: panel / empty state + load-more

export function PhoneList({
  tab,
  empty,
  total,
  shown,
  onMore,
  onReset,
  children,
}: {
  tab: Tab;
  // "fresh" = an account without history, "noMatches" = nothing matches
  // the query / filters.
  empty: "none" | "fresh" | "noMatches";
  total: number;
  shown: number;
  onMore: () => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={rootRef} className="px-6 lg:hidden">
      {empty === "fresh" ? (
        <EmptyState
          surface="panel"
          icon={<SideMenuOrdersIcon className="size-6" />}
          title={COPY.freshTitle[tab]}
          text={COPY.freshText[tab]}
        />
      ) : empty === "noMatches" ? (
        <EmptyState
          surface="panel"
          role="status"
          title={COPY.noMatchTitle[tab]}
          text={COPY.noMatchText}
          action={
            <Button
              size="small"
              variant="outlinedDark"
              onClick={() => {
                onReset();
                // The button leaves with the empty state: the focus goes to
                // the first row of the restored list (no keyboard pops up,
                // unlike the search field).
                requestAnimationFrame(() =>
                  rootRef.current?.querySelector<HTMLElement>("a[data-row-link]")?.focus({ preventScroll: true }),
                );
              }}
            >
              {COPY.noMatchReset}
            </Button>
          }
        />
      ) : (
        <ListPanel label={COPY.list[tab]}>{children}</ListPanel>
      )}
      {empty === "none" && (
        <LoadMore
          className="mt-12"
          shown={shown}
          total={total}
          onMore={onMore}
          focusAfterLast={() => rootRef.current?.querySelectorAll<HTMLElement>("a[data-row-link]")[shown] ?? null}
        />
      )}
    </div>
  );
}
