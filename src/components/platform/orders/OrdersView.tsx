"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { isDemoAccount } from "@/components/auth/demo";
import { ChevronSideIcon } from "@/components/catalog/icons";
import {
  AttentionSmallIcon,
  CabinetPage,
  CabinetPageHead,
  OrderStatusBadge,
  PaymentBadge,
  ReturnStatusBadge,
  Select,
  SignInPrompt,
  TableEmptyRow,
} from "@/components/platform/ui";
import { OrderDocumentsIcon } from "../orderIcons";
import {
  COUNTERPARTIES,
  ORDERS_TODAY,
  ORDER_STATUS_KEYS,
  ORDER_STATUS_META,
  PERIODS,
  RETURN_STATUS_KEYS,
  RETURN_STATUS_META,
  daysPlural,
  formatAmount,
  formatDate,
  formatRange,
  formatSum,
  periodStart,
  returnDocuments,
  returnTotal,
  type Order,
  type OrderStatus,
  type PeriodValue,
  type ReturnRequest,
  type ReturnStatus,
} from "./data";
import { DocumentsModal } from "./DocumentsModal";
import { CELL, DIVIDER, Head, Pager, ROW_ICON_BUTTON, SearchField, type Sort } from "./listParts";
import { paymentKind } from "./payment";
import { useOrders, useReturns } from "./store";

// «Мої замовлення» - Figma 4573:37244 (1710 x 1804) and «Мої повернення»
// 5192:78615 (1710 x 1563) inside the platform shell, one page with the
// «Замовлення / Повернення» tabs (`?tab=returns`). Content column on the
// 40 / 32 gutters:
//   title block 144: H2 «Мої замовлення» + 14/24 tagline, Button/Large
//     «Зробити замовлення» on the right (the returns frame has no button
//     and keeps the same texts);
//   tabs row (pt-14 pb-30): the #e8e8e9 r40 pill;
//   filter row (pb-32): 364-px search left, three selects right (364
//     period, 234 counterparty, 234 status), gap 16;
//   table: white r24, #343435 head row (pt-8, px-24, heads p-16 14/24
//     SemiBold white with sort / info glyphs), 0.5-px #d2d2d2 dividers,
//     rows px-24 with cells px-16 py-24;
//     orders: № (16 SemiBold), date, sum, counterparty (underlined,
//       fills), order badge, payment chip + caption, the 42-px documents
//       button (opens «Документи замовлення» 4990:76234) and the chevron
//       to /orders/<id>;
//     returns (head 5192:78639): «Замовлення №», «Дата», «Сума
//       повернення», «Контрагент», «Статус повернення», «Документи», 90-px
//       rows with the return badge and the two 42-px buttons;
//   pager row 100, or the empty row 4990:72302 («Замовлень ще немає»,
//     frame 4929:63067, no pager) for an account without orders.
// Sorting, filters, search and pagination run over the placeholder lists
// in data.ts (+ this device's cancellations / new returns, store.ts).
// The placeholder history belongs to the demo partner; any other partner
// account starts with the empty list.

type Tab = "orders" | "returns";

const TABS: readonly (readonly [Tab, string])[] = [
  ["orders", "Замовлення"],
  ["returns", "Повернення"],
];
const TAB_ID = "orders-tab";
const PANEL_ID = "orders-tabpanel";

// Figma puts a 0.5-px «Divider» above every body row (under the head
// too: rows start at 64.5), so each row is 0.5 taller than its cells:
// the hairline is the row background, the cells get 24.5 top padding.
const ROW = `${DIVIDER} [&>td]:pt-[24.5px]`;
// Order rows keep the master's 112 (+ 0.5 hairline) even when the payment
// cell has no caption (a cancelled order shows no due date): the table
// height and the pager row stay where 4573:37244 puts them.
const ORDER_ROW = `${ROW} h-[112.5px]`;

// The head cells of 4573:37270 / 5192:78639 sit 2 px right of the body
// cells below them (Документи 1452 over 1450): pl 18 / pr 14 moves the
// centred label onto the master's 1517 centre.
const DOCS_HEAD = "[&>span]:justify-center [&>span]:pl-[18px] [&>span]:pr-[14px]";
// The info heads hug label + gap 4 + 30-px glyph mask; a 12-px right pad
// keeps that inside the 196-px body column (the master's 200 / 201 head
// is wider than the cell under it), so the column does not grow.
const INFO_HEAD = "[&>span]:pr-3";

// Footer under the lists: the content containers 4573:37249 / 5192:78620
// end 34.5 / 35.5 px under the pager row (not the shell's 32), and each
// table carries one duplicated 0.5-px divider (4573:37597 + 37598, rows
// 7-8 of 5192:78636). The extra pad lands the footer on 1750 / 1509.
const ORDERS_TAIL = "lg:pb-[3px]";
const RETURNS_TAIL = "lg:pb-[4px]";

const SELECTS = "grid gap-4 sm:grid-cols-3 lg:flex lg:items-center";

// «with caption» (4573:37308 / dashboard 5052:32197): the «Badge /
// Payment Status» chip (175 «Очікується оплата», 182 «Частково
// оплачено», 118 «Оплачено» in the list frame) over a 12/22 Medium py-2
// «Chip» caption (PaymentBadge caption / captionTone): grey notes («до
// 24.07.2026», «Оплачено вчасно», «1 500 із 3 900 ₴» - only the total
// carries the sign, 5052:32112), the 16-px attention glyph in #f26164
// for overdue sums and for «Оплачено із простроченням» (4573:37586). The
// three-line variant (4573:37441) puts a bare 22-px ratio line between
// the chip and the overdue remainder: 38 + 22 + 26 = 86 (row 134). A
// cancelled order asks for nothing: no due date, no overdue alert.
function PaymentCell({ order }: { order: Order }) {
  const p = order.payment;
  const kind = paymentKind(order);
  const cancelled = order.status === "cancelled";
  switch (p.kind) {
    case "awaiting":
      return <PaymentBadge kind={kind} caption={cancelled ? undefined : `до ${formatDate(order.paymentDue)}`} />;
    case "overdue":
      return cancelled ? (
        <PaymentBadge kind={kind} />
      ) : (
        <PaymentBadge kind={kind} caption={`Прострочено на ${p.days} ${daysPlural(p.days)}`} captionTone="attention" />
      );
    case "paid":
      return p.late ? (
        <PaymentBadge kind={kind} caption="Оплачено із простроченням" captionTone="attention" />
      ) : (
        <PaymentBadge kind={kind} caption="Оплачено вчасно" />
      );
    case "partial": {
      const ratio = `${formatAmount(p.paid)} із ${formatSum(order.total)}`;
      if (p.overdue === undefined || cancelled) return <PaymentBadge kind={kind} caption={ratio} />;
      return (
        <div className="flex flex-col items-start">
          <PaymentBadge kind={kind} />
          <span className="whitespace-nowrap text-[12px] font-medium leading-[22px] text-neutral-500">{ratio}</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap py-[2px] text-[12px] font-medium leading-[22px] text-[#f26164]">
            <AttentionSmallIcon className="size-4 shrink-0" />
            Залишок {formatSum(p.overdue)} прострочено
          </span>
        </div>
      );
    }
  }
}

function sortRows<T>(list: T[], sort: Sort, date: (t: T) => string, total: (t: T) => number): T[] {
  return [...list].sort((a, b) => {
    const v = sort.key === "date" ? date(a).localeCompare(date(b)) : total(a) - total(b);
    return sort.dir === "asc" ? v : -v;
  });
}

function OrdersTable({
  orders,
  sort,
  onSort,
  onDocuments,
  empty,
}: {
  orders: Order[];
  sort: Sort;
  onSort: (key: Sort["key"]) => void;
  onDocuments: (order: Order) => void;
  empty: "none" | "noOrders" | "noMatches";
}) {
  const sortOf = (key: Sort["key"]) => (sort.key === key ? sort.dir : null);
  return (
    <div className="overflow-x-auto rounded-3xl bg-white">
      <table className="w-full min-w-[1180px] border-separate border-spacing-0">
        <thead>
          <tr className="bg-neutral-800">
            <th aria-hidden className="w-6 p-0 pt-2" />
            <Head className="w-[180px] pt-2">Замовлення №</Head>
            <Head className="w-[130px] pt-2" sort={sortOf("date")} onSort={() => onSort("date")}>
              Дата
            </Head>
            <Head className="w-[160px] pt-2" sort={sortOf("total")} onSort={() => onSort("total")}>
              Сума
            </Head>
            <Head className="pt-2">Контрагент</Head>
            <Head className={`w-[196px] pt-2 ${INFO_HEAD} [&>span]:pl-[14px]`} info>
              Статус замовлення
            </Head>
            <Head className="w-[244px] pt-2 [&>span]:pl-[18px]">Статус оплати</Head>
            <Head className={`w-[130px] pt-2 ${DOCS_HEAD}`}>Документи</Head>
            <Head className="w-[74px] pt-2" />
            <th aria-hidden className="w-6 p-0 pt-2" />
          </tr>
        </thead>
        <tbody>
          {empty === "noOrders" && (
            <TableEmptyRow
              colSpan={10}
              title="Замовлень ще немає"
              text="Оформіть перше замовлення, щоб воно з’явилося у цьому списку."
              actions={
                <Button href="/catalog" size="small" variant="accent">
                  Зробити замовлення
                </Button>
              }
            />
          )}
          {empty === "noMatches" && (
            <TableEmptyRow colSpan={10} title="Замовлень не знайдено" text="Змініть пошук або умови фільтрів." />
          )}
          {orders.map((order) => (
            <tr key={order.id} className={ORDER_ROW}>
              <td aria-hidden className="w-6 p-0" />
              <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
                {order.number}
              </td>
              <td className={`${CELL} whitespace-nowrap text-[16px] leading-6 text-neutral-900`}>{formatDate(order.date)}</td>
              <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
                {formatSum(order.total)}
              </td>
              <td className={`${CELL} text-[16px] leading-6 text-neutral-900`}>
                <span className="underline decoration-solid underline-offset-2">{order.counterparty}</span>
              </td>
              <td className={CELL}>
                <OrderStatusBadge status={order.status} />
              </td>
              <td className={CELL}>
                <PaymentCell order={order} />
              </td>
              <td className={`${CELL} text-center`}>
                <button
                  type="button"
                  aria-label={`Документи замовлення №${order.number}`}
                  onClick={() => onDocuments(order)}
                  className={ROW_ICON_BUTTON}
                >
                  <OrderDocumentsIcon className="size-6" />
                </button>
              </td>
              <td className={CELL}>
                <Link href={`/orders/${order.id}`} aria-label={`Деталі замовлення №${order.number}`} className={ROW_ICON_BUTTON}>
                  <ChevronSideIcon mirrored className="size-6" />
                </Link>
              </td>
              <td aria-hidden className="w-6 p-0" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ReturnRow = { ret: ReturnRequest; order: Order | undefined; total: number };

function ReturnsTable({
  rows,
  sort,
  onSort,
  onDocuments,
  empty,
}: {
  rows: ReturnRow[];
  sort: Sort;
  onSort: (key: Sort["key"]) => void;
  onDocuments: (row: ReturnRow) => void;
  empty: "none" | "noReturns" | "noMatches";
}) {
  const sortOf = (key: Sort["key"]) => (sort.key === key ? sort.dir : null);
  return (
    <div className="overflow-x-auto rounded-3xl bg-white">
      <table className="w-full min-w-[1180px] border-separate border-spacing-0">
        <thead>
          <tr className="bg-neutral-800">
            <th aria-hidden className="w-6 p-0 pt-2" />
            <Head className="w-[180px] pt-2">Замовлення №</Head>
            <Head className="w-[130px] pt-2" sort={sortOf("date")} onSort={() => onSort("date")}>
              Дата
            </Head>
            <Head className="w-[190px] pt-2" sort={sortOf("total")} onSort={() => onSort("total")}>
              Сума повернення
            </Head>
            <Head className="pt-2">Контрагент</Head>
            <Head className={`w-[196px] pt-2 ${INFO_HEAD} [&>span]:pl-[13px]`} info>
              Статус повернення
            </Head>
            <Head className={`w-[130px] pt-2 ${DOCS_HEAD}`}>Документи</Head>
            <Head className="w-[74px] pt-2" />
            <th aria-hidden className="w-6 p-0 pt-2" />
          </tr>
        </thead>
        <tbody>
          {empty === "noReturns" && (
            <TableEmptyRow
              colSpan={9}
              title="Повернень ще немає"
              text="Оформити повернення можна на сторінці отриманого замовлення."
            />
          )}
          {empty === "noMatches" && (
            <TableEmptyRow colSpan={9} title="Повернень не знайдено" text="Змініть пошук або умови фільтрів." />
          )}
          {rows.map(({ ret, order, total }) => (
            <tr key={ret.id} className={ROW}>
              <td aria-hidden className="w-6 p-0" />
              <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
                {order?.number ?? ""}
              </td>
              <td className={`${CELL} whitespace-nowrap text-[16px] leading-6 text-neutral-900`}>{formatDate(ret.date)}</td>
              <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
                {formatSum(total)}
              </td>
              <td className={`${CELL} text-[16px] leading-6 text-neutral-900`}>
                <span className="underline decoration-solid underline-offset-2">{order?.counterparty}</span>
              </td>
              <td className={CELL}>
                {/* The master's 164-px «Items2» slot: «Прийнято складом»
                    (165) overhangs it by 1 px instead of widening the
                    column past 196. */}
                <div className="w-[164px]">
                  <ReturnStatusBadge status={ret.status} />
                </div>
              </td>
              <td className={`${CELL} text-center`}>
                <button
                  type="button"
                  aria-label={`Документи повернення за замовленням №${order?.number ?? ""}`}
                  onClick={() => onDocuments({ ret, order, total })}
                  className={ROW_ICON_BUTTON}
                >
                  <OrderDocumentsIcon className="size-6" />
                </button>
              </td>
              <td className={CELL}>
                <Link
                  href={`/orders/returns/${ret.id}`}
                  aria-label={`Деталі повернення за замовленням №${order?.number ?? ""}`}
                  className={ROW_ICON_BUTTON}
                >
                  <ChevronSideIcon mirrored className="size-6" />
                </Link>
              </td>
              <td aria-hidden className="w-6 p-0" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Filters + table + pager of one tab. The state of each tab resets when
// the tab changes (keyed by the parent).
function useListState() {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodValue>("30");
  const [counterparty, setCounterparty] = useState("all");
  const [sort, setSort] = useState<Sort>({ key: "date", dir: "desc" });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  return {
    query,
    setQuery: reset(setQuery),
    period,
    setPeriod: reset(setPeriod),
    counterparty,
    setCounterparty: reset(setCounterparty),
    sort,
    toggleSort: (key: Sort["key"]) => {
      setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
      setPage(1);
    },
    pageSize,
    setPageSize: reset(setPageSize),
    page,
    setPage,
  };
}

// The range the filter label names, both ends: «24.04.2026 — 24.05.2026»
// (or «до 24.05.2026» for «Увесь час»).
function inPeriod(dateIso: string, period: PeriodValue): boolean {
  const date = new Date(dateIso);
  const start = periodStart(period, ORDERS_TODAY);
  return date <= ORDERS_TODAY && (!start || date >= start);
}

const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p.value, label: p.label }));

function OrdersTab({ orders, hasHistory }: { orders: Order[]; hasHistory: boolean }) {
  const s = useListState();
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [docsOf, setDocsOf] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const q = s.query.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (!inPeriod(o.date, s.period)) return false;
      if (s.counterparty !== "all" && o.counterparty !== s.counterparty) return false;
      if (status !== "all" && o.status !== status) return false;
      if (q && !`${o.number} ${o.counterparty}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortRows(list, s.sort, (o) => o.date, (o) => o.total);
  }, [orders, s.query, s.period, s.counterparty, status, s.sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / s.pageSize));
  const current = Math.min(s.page, pages);
  const paged = filtered.slice((current - 1) * s.pageSize, current * s.pageSize);
  const rangeLabel = formatRange(periodStart(s.period, ORDERS_TODAY), ORDERS_TODAY);

  return (
    <>
      <div className="flex flex-col gap-4 px-6 pb-6 lg:flex-row lg:items-center lg:justify-between lg:pb-8 lg:pl-10 lg:pr-8">
        <SearchField value={s.query} onChange={s.setQuery} label="Пошук замовлень" />
        <div className={SELECTS}>
          <Select
            bg="white"
            label={`Період: ${rangeLabel}`}
            value={s.period}
            options={PERIOD_OPTIONS}
            display={rangeLabel}
            onChange={s.setPeriod}
            className="lg:w-[364px]"
          />
          <Select
            bg="white"
            label="Контрагент"
            value={s.counterparty}
            options={[{ value: "all", label: "Усі контрагенти" }, ...COUNTERPARTIES.map((c) => ({ value: c, label: c }))]}
            onChange={s.setCounterparty}
            className="lg:w-[234px]"
          />
          <Select
            bg="white"
            label="Статус замовлення"
            value={status}
            options={[
              { value: "all" as const, label: "Усі статуси" },
              ...ORDER_STATUS_KEYS.map((k) => ({ value: k, label: ORDER_STATUS_META[k].label })),
            ]}
            onChange={(v) => {
              setStatus(v);
              s.setPage(1);
            }}
            className="lg:w-[234px]"
          />
        </div>
      </div>

      <div className="px-6 lg:pl-10 lg:pr-8">
        <OrdersTable
          orders={paged}
          sort={s.sort}
          onSort={s.toggleSort}
          onDocuments={setDocsOf}
          empty={!hasHistory ? "noOrders" : filtered.length === 0 ? "noMatches" : "none"}
        />
      </div>

      {hasHistory && (
        <div className={ORDERS_TAIL}>
          <Pager
            total={filtered.length}
            page={current}
            pageSize={s.pageSize}
            onPage={s.setPage}
            onPageSize={s.setPageSize}
            label="замовлення"
          />
        </div>
      )}

      <DocumentsModal
        open={docsOf !== null}
        onClose={() => setDocsOf(null)}
        number={docsOf?.number ?? ""}
        date={docsOf?.date ?? "2026-01-01"}
        documents={docsOf?.documents ?? []}
      />
    </>
  );
}

function ReturnsTab({ orders, returns, hasHistory }: { orders: Order[]; returns: ReturnRequest[]; hasHistory: boolean }) {
  const s = useListState();
  const [status, setStatus] = useState<"all" | ReturnStatus>("all");
  const [docsOf, setDocsOf] = useState<ReturnRow | null>(null);

  const rows = useMemo<ReturnRow[]>(
    () =>
      returns.map((ret) => {
        const order = orders.find((o) => o.id === ret.orderId);
        return { ret, order, total: returnTotal(ret, order) };
      }),
    [orders, returns],
  );

  const filtered = useMemo(() => {
    const q = s.query.trim().toLowerCase();
    const list = rows.filter(({ ret, order }) => {
      if (!inPeriod(ret.date, s.period)) return false;
      if (s.counterparty !== "all" && order?.counterparty !== s.counterparty) return false;
      if (status !== "all" && ret.status !== status) return false;
      if (q && !`${order?.number ?? ""} ${order?.counterparty ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortRows(list, s.sort, (r) => r.ret.date, (r) => r.total);
  }, [rows, s.query, s.period, s.counterparty, status, s.sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / s.pageSize));
  const current = Math.min(s.page, pages);
  const paged = filtered.slice((current - 1) * s.pageSize, current * s.pageSize);
  const rangeLabel = formatRange(periodStart(s.period, ORDERS_TODAY), ORDERS_TODAY);

  return (
    <>
      <div className="flex flex-col gap-4 px-6 pb-6 lg:flex-row lg:items-center lg:justify-between lg:pb-8 lg:pl-10 lg:pr-8">
        <SearchField value={s.query} onChange={s.setQuery} label="Пошук повернень" />
        <div className={SELECTS}>
          <Select
            bg="white"
            label={`Період: ${rangeLabel}`}
            value={s.period}
            options={PERIOD_OPTIONS}
            display={rangeLabel}
            onChange={s.setPeriod}
            className="lg:w-[364px]"
          />
          <Select
            bg="white"
            label="Контрагент"
            value={s.counterparty}
            options={[{ value: "all", label: "Усі контрагенти" }, ...COUNTERPARTIES.map((c) => ({ value: c, label: c }))]}
            onChange={s.setCounterparty}
            className="lg:w-[234px]"
          />
          <Select
            bg="white"
            label="Статус повернення"
            value={status}
            options={[
              { value: "all" as const, label: "Усі статуси" },
              ...RETURN_STATUS_KEYS.map((k) => ({ value: k, label: RETURN_STATUS_META[k].label })),
            ]}
            onChange={(v) => {
              setStatus(v);
              s.setPage(1);
            }}
            className="lg:w-[234px]"
          />
        </div>
      </div>

      <div className="px-6 lg:pl-10 lg:pr-8">
        <ReturnsTable
          rows={paged}
          sort={s.sort}
          onSort={s.toggleSort}
          onDocuments={setDocsOf}
          empty={!hasHistory ? "noReturns" : filtered.length === 0 ? "noMatches" : "none"}
        />
      </div>

      {hasHistory && (
        <div className={RETURNS_TAIL}>
          <Pager
            total={filtered.length}
            page={current}
            pageSize={s.pageSize}
            onPage={s.setPage}
            onPageSize={s.setPageSize}
            label="повернення"
          />
        </div>
      )}

      <DocumentsModal
        open={docsOf !== null && docsOf.order !== undefined}
        onClose={() => setDocsOf(null)}
        title="Документи повернення"
        number={docsOf?.order?.number ?? ""}
        date={docsOf?.ret.date ?? "2026-01-01"}
        documents={docsOf?.order ? returnDocuments(docsOf.ret, docsOf.order) : []}
      />
    </>
  );
}

export function OrdersView({ tab }: { tab: Tab }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const allOrders = useOrders();
  const allReturns = useReturns();

  // Visitors and B2C customers: the orders belong to the partner cabinet.
  if (user?.type !== "b2b") {
    return <SignInPrompt title="Мої замовлення" text="Історія замовлень доступна в особистому кабінеті бізнес-клієнта." />;
  }

  const owned = isDemoAccount(user);
  const orders = owned ? allOrders : [];
  const returns = owned ? allReturns : [];

  // The tab lives in the URL (`?tab=returns`); history.replaceState keeps
  // useSearchParams in sync without a navigation.
  const switchTab = (next: Tab) => {
    if (next === tab) return;
    window.history.replaceState(null, "", next === "returns" ? `${pathname}?tab=returns` : pathname);
  };

  // Roving tabindex: only the selected tab is in the Tab order; the arrow
  // keys (and Home / End) move between the tabs and select them.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex(([key]) => key === tab);
    const next =
      e.key === "ArrowRight" ? (i + 1) % TABS.length
      : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? TABS.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    const key = TABS[next][0];
    switchTab(key);
    document.getElementById(`${TAB_ID}-${key}`)?.focus();
  };

  return (
    <CabinetPage>
      <CabinetPageHead
        title="Мої замовлення"
        subtitle="Переглядайте статуси та деталі ваших замовлень"
        actions={
          tab === "orders" ? (
            <Button href="/catalog" size="responsive" className="shrink-0">
              Зробити замовлення
            </Button>
          ) : undefined
        }
      />

      {/* Tabs (4573:37258): the #e8e8e9 r40 pill, 8-px gap, px-16 py-12
          16/22 Medium items; the active one fills brand. */}
      <div className="px-6 pb-6 lg:px-10 lg:pb-[30px] lg:pt-[14px]">
        <div role="tablist" aria-label="Розділи замовлень" className="inline-flex items-center gap-2 rounded-[40px] bg-[#e8e8e9]">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              id={`${TAB_ID}-${key}`}
              type="button"
              role="tab"
              aria-selected={tab === key}
              aria-controls={PANEL_ID}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => switchTab(key)}
              onKeyDown={onTabKey}
              className={`cursor-pointer whitespace-nowrap rounded-[60px] px-4 py-3 text-button-md transition-colors duration-200 ${
                tab === key ? "bg-brand text-white" : "text-neutral-800 hover:text-brand"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* One panel whose content follows the selected tab (both tabs
          point at it through aria-controls). */}
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={`${TAB_ID}-${tab}`}>
        {tab === "returns" ? (
          <ReturnsTab key="returns" orders={allOrders} returns={returns} hasHistory={returns.length > 0} />
        ) : (
          <OrdersTab key="orders" orders={orders} hasHistory={orders.length > 0} />
        )}
      </div>
    </CabinetPage>
  );
}

export function OrdersRoute() {
  const params = useSearchParams();
  return <OrdersView tab={params.get("tab") === "returns" ? "returns" : "orders"} />;
}
