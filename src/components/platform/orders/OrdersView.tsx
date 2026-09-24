"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { CheckCircleIcon } from "@/components/cart/icons";
import { ChevronDown16, ChevronSideIcon, MagnifierIcon } from "@/components/catalog/icons";
import {
  AttentionIcon,
  DropdownIcon,
  InfoHeadIcon,
  OrderDocumentsIcon,
  PaymentPartialIcon,
  SortIcon,
} from "../orderIcons";
import {
  COUNTERPARTIES,
  ORDERS,
  ORDERS_TODAY,
  ORDER_STATUS,
  ORDER_STATUS_ORDER,
  PAGE_SIZES,
  PERIODS,
  daysPlural,
  formatDate,
  formatRange,
  formatSum,
  periodStart,
  type Order,
  type OrderStatus,
  type PeriodValue,
} from "./data";

// «Мої замовлення» — Figma 4573:37244 (1710 x 1804) inside the platform
// shell. Content column on the 40 / 32 gutters:
//   title block 144: H2 «Мої замовлення» + 14/24 tagline, Button/Large
//     «Зробити замовлення» on the right;
//   tabs row (pt-14 pb-30): the #e8e8e9 r40 pill with «Замовлення»
//     (brand) / «Повернення»;
//   filter row (pb-32): 364-px search left, three selects right (364
//     period, 234 counterparty, 234 status), gap 16;
//   table: white r24, #343435 head row (pt-8, px-24, heads p-16 14/24
//     SemiBold white with sort / info glyphs), 0.5-px #d2d2d2 dividers,
//     rows px-24 with cells px-16 py-24: № (16 SemiBold), date, sum
//     (SemiBold), counterparty (underlined, fills), order badge, payment
//     chip with its caption, documents button, details chevron;
//   pager row 100: «1-10 із 28» + «Показувати по: [10]» and the 52-px
//     page buttons.
// Sorting, filters, search and pagination run over the placeholder
// list in data.ts.

type Sort = { key: "date" | "total"; dir: "asc" | "desc" };

function useDismiss(open: boolean, ref: React.RefObject<HTMLDivElement | null>, close: () => void) {
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

// «<Select>» (4098:29949) as the page draws it: a 46-px r24 field with
// a 1-px #d2d2d2 ring, the value in 16/24 Medium and the 24-px dropdown
// glyph; opens the site's small white menu.
function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useDismiss(open, ref, () => setOpen(false));
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-[46px] w-full cursor-pointer items-center justify-between gap-2 rounded-3xl border bg-white px-6 text-left text-[16px] font-medium leading-6 tracking-[0.15px] text-neutral-900 transition-colors duration-200 ${
          open ? "border-brand" : "border-stroke-subtle hover:border-neutral-400"
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label ?? label}</span>
        <DropdownIcon
          className={`size-6 shrink-0 text-neutral-900 transition-[rotate] duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+4.5px)] z-20 max-h-[250px] overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]"
        >
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer px-4 py-3 text-left text-button-md transition-colors duration-150 hover:bg-bg-subtle ${
                  o.value === value ? "text-brand" : "text-neutral-900"
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// «Badge / Order Status» — r40 pill, pl-8 pr-10 py-8, a 16-px box with
// the 6-px dot and the 14/22 Medium label.
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return (
    <span
      className="inline-flex h-[38px] items-center gap-1 whitespace-nowrap rounded-[40px] py-2 pl-2 pr-[10px] text-[14px] font-medium leading-[22px]"
      style={{ background: s.bg, color: s.text }}
    >
      <span aria-hidden className="flex size-4 items-center justify-center">
        <span className="size-[6px] rounded-full" style={{ background: s.dot }} />
      </span>
      {s.label}
    </span>
  );
}

// «Badge / Payment Status» with caption — the bordered 38-px chip (24-px
// coin + 14/22 Medium #343435) over a 12/22 caption: grey for plain
// notes, the attention glyph + #f26164 for overdue ones (4087:23701).
function PaymentCell({ order }: { order: Order }) {
  const p = order.payment;
  const chip = (label: string, partial = false) => (
    <span className="inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[40px] border border-stroke-subtle py-1 pl-[6px] pr-3 text-[14px] font-medium leading-[22px] text-neutral-800">
      {partial ? (
        <PaymentPartialIcon className="size-6 shrink-0 text-neutral-800" />
      ) : (
        <CheckCircleIcon className="size-6 shrink-0 text-neutral-800" />
      )}
      {label}
    </span>
  );
  const note = (text: string) => (
    <span className="whitespace-nowrap py-[2px] text-[12px] font-medium leading-[22px] text-neutral-500">{text}</span>
  );
  const alert = (text: string) => (
    <span className="flex items-center gap-1 whitespace-nowrap py-[2px] text-[12px] font-medium leading-[22px] text-[#f26164]">
      <AttentionIcon className="size-4 shrink-0" />
      {text}
    </span>
  );
  return (
    <div className="flex flex-col items-start">
      {p.kind === "awaiting" && (
        <>
          {chip("Не оплачено")}
          {note("Очікується оплата")}
        </>
      )}
      {p.kind === "overdue" && (
        <>
          {chip("Не оплачено")}
          {alert(`Прострочено на ${p.days} ${daysPlural(p.days)}`)}
        </>
      )}
      {p.kind === "partial" && (
        <>
          {chip("Частково оплачено", true)}
          {note(`${formatSum(p.paid)} із ${formatSum(order.total)}`)}
          {p.overdue !== undefined
            ? alert(`Залишок ${formatSum(p.overdue)} прострочено`)
            : note("Очікується решта")}
        </>
      )}
      {p.kind === "paid" && (
        <>
          {chip("Оплачено")}
          {note(p.late ? "Оплачено із простроченням" : "Оплачено вчасно")}
        </>
      )}
    </div>
  );
}

function Head({
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
      {children && (
        <span className="whitespace-nowrap text-[14px] font-semibold leading-6 text-white">{children}</span>
      )}
      {onSort && (
        <span className="flex items-start pl-2 pr-1">
          <SortIcon className={`size-[18px] ${sort ? "text-brand" : "text-white"}`} />
        </span>
      )}
      {info && (
        <span className="flex items-start pl-2 pr-1">
          <InfoHeadIcon className="size-[18px] text-white" />
        </span>
      )}
    </>
  );
  return (
    <th scope="col" className={`p-0 text-left font-normal ${className}`}>
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          aria-label={`Сортувати: ${typeof children === "string" ? children : ""}`}
          aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
          className="flex h-full w-full cursor-pointer items-center p-4"
        >
          {inner}
        </button>
      ) : (
        <span className="flex h-full items-center p-4">{inner}</span>
      )}
    </th>
  );
}

const CELL = "px-4 py-6 align-middle";
const DIVIDER = "[background:linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))_16px_0/calc(100%-32px)_0.5px_no-repeat]";

function OrdersTable({
  orders,
  sort,
  onSort,
}: {
  orders: Order[];
  sort: Sort;
  onSort: (key: Sort["key"]) => void;
}) {
  const sortOf = (key: Sort["key"]) => (sort.key === key ? sort.dir : null);
  return (
    <div className="overflow-x-auto rounded-3xl bg-white">
      <table className="w-full min-w-[1180px] border-separate border-spacing-0">
        <thead>
          <tr className="bg-neutral-800">
            <th aria-hidden className="w-6 p-0 pt-2" />
            <Head className="w-[180px] pt-2" sort={null}>
              Замовлення №
            </Head>
            <Head className="w-[130px] pt-2" sort={sortOf("date")} onSort={() => onSort("date")}>
              Дата
            </Head>
            <Head className="w-[160px] pt-2" sort={sortOf("total")} onSort={() => onSort("total")}>
              Сума
            </Head>
            <Head className="pt-2">Контрагент</Head>
            <Head className="w-[196px] pt-2" info>
              Статус замовлення
            </Head>
            <Head className="w-[244px] pt-2">Статус оплати</Head>
            <Head className="w-[130px] pt-2 [&>span]:justify-center">Документи</Head>
            <Head className="w-[72px] pt-2" />
            <th aria-hidden className="w-6 p-0 pt-2" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => (
            <tr key={order.id} className={i === 0 ? "" : DIVIDER}>
              <td aria-hidden className="w-6 p-0" />
              <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
                {order.number}
              </td>
              <td className={`${CELL} whitespace-nowrap text-[16px] leading-6 text-neutral-900`}>
                {formatDate(order.date)}
              </td>
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
                  aria-label={`Документи замовлення ${order.number}`}
                  title="Документи будуть доступні після підключення CRM"
                  className="inline-flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:bg-bg-subtle hover:text-brand"
                >
                  <OrderDocumentsIcon className="size-6" />
                </button>
              </td>
              <td className={CELL}>
                <button
                  type="button"
                  aria-label={`Деталі замовлення ${order.number}`}
                  title="Деталі замовлення будуть доступні після підключення CRM"
                  className="inline-flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:bg-bg-subtle hover:text-brand"
                >
                  <ChevronSideIcon mirrored className="size-6" />
                </button>
              </td>
              <td aria-hidden className="w-6 p-0" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrdersView() {
  const { user, openAuth } = useAuth();
  const [tab, setTab] = useState<"orders" | "returns">("orders");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodValue>("30");
  const [counterparty, setCounterparty] = useState("all");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [sort, setSort] = useState<Sort>({ key: "date", dir: "desc" });
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [sizeOpen, setSizeOpen] = useState(false);
  const sizeRef = useRef<HTMLDivElement | null>(null);
  useDismiss(sizeOpen, sizeRef, () => setSizeOpen(false));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const start = periodStart(period, ORDERS_TODAY);
    let list = ORDERS.filter((o) => {
      if (start && new Date(o.date) < start) return false;
      if (counterparty !== "all" && o.counterparty !== counterparty) return false;
      if (status !== "all" && o.status !== status) return false;
      if (q && !`${o.number} ${o.counterparty}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const v = sort.key === "date" ? a.date.localeCompare(b.date) : a.total - b.total;
      return sort.dir === "asc" ? v : -v;
    });
    return list;
  }, [query, period, counterparty, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);
  const first = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, filtered.length);
  const windowStart = Math.max(1, Math.min(current - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => windowStart + i);

  const toggleSort = (key: Sort["key"]) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
    setPage(1);
  };

  const rangeLabel = formatRange(periodStart(period, ORDERS_TODAY), ORDERS_TODAY);

  // Visitors and B2C customers: the orders belong to the partner cabinet.
  if (user?.type !== "b2b") {
    return (
      <div className="flex flex-col items-start gap-6 px-6 py-12 lg:py-20 lg:pl-10 lg:pr-8">
        <h1 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]">
          Мої замовлення
        </h1>
        <p className="text-body-sm text-neutral-500">
          Історія замовлень доступна в особистому кабінеті бізнес-клієнта.
        </p>
        <Button type="button" size="responsive" onClick={() => openAuth()}>
          {user ? "Кабінет" : "Увійти"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:py-8 lg:pl-10 lg:pr-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]">
            Мої замовлення
          </h1>
          <p className="text-[14px] leading-6 text-neutral-500">
            Переглядайте статуси та деталі ваших замовлень
          </p>
        </div>
        <Button href="/catalog" size="responsive" className="shrink-0">
          Зробити замовлення
        </Button>
      </section>

      {/* Tabs (4573:37258): the #e8e8e9 r40 pill, 8-px gap, px-16 py-12
          16/22 Medium items; the active one fills brand. */}
      <div className="px-6 pb-6 lg:px-10 lg:pb-[30px] lg:pt-[14px]">
        <div role="tablist" aria-label="Розділи замовлень" className="inline-flex items-center gap-2 rounded-[40px] bg-[#e8e8e9]">
          {(
            [
              ["orders", "Замовлення"],
              ["returns", "Повернення"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`cursor-pointer whitespace-nowrap rounded-[60px] px-4 py-3 text-button-md transition-colors duration-200 ${
                tab === key ? "bg-brand text-white" : "text-neutral-800 hover:text-brand"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "returns" ? (
        <div className="px-6 pb-12 lg:pb-20 lg:pl-10 lg:pr-8">
          <p className="text-body-md text-neutral-500">Повернень поки немає.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 px-6 pb-6 lg:flex-row lg:items-center lg:justify-between lg:pb-8 lg:pl-10 lg:pr-8">
            <div className="relative w-full lg:w-[364px]">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Пошук"
                aria-label="Пошук замовлень"
                className="h-[46px] w-full rounded-[50px] border border-stroke-default bg-white pl-4 pr-12 text-[16px] leading-6 text-neutral-900 outline-none transition-colors duration-200 placeholder:text-neutral-500 focus:border-neutral-800 [&::-webkit-search-cancel-button]:hidden"
              />
              <MagnifierIcon className="pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-neutral-700" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:flex lg:items-center">
              <FilterSelect
                label={`Період: ${rangeLabel}`}
                value={period}
                options={PERIODS.map((p) => ({ value: p.value, label: p.value === period ? rangeLabel : p.label }))}
                onChange={(v) => {
                  setPeriod(v);
                  setPage(1);
                }}
                className="lg:w-[364px]"
              />
              <FilterSelect
                label="Контрагент"
                value={counterparty}
                options={[{ value: "all", label: "Усі контрагенти" }, ...COUNTERPARTIES.map((c) => ({ value: c, label: c }))]}
                onChange={(v) => {
                  setCounterparty(v);
                  setPage(1);
                }}
                className="lg:w-[234px]"
              />
              <FilterSelect
                label="Статус замовлення"
                value={status}
                options={[
                  { value: "all" as const, label: "Усі статуси" },
                  ...ORDER_STATUS_ORDER.map((s) => ({ value: s, label: ORDER_STATUS[s].label })),
                ]}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
                className="lg:w-[234px]"
              />
            </div>
          </div>

          <div className="px-6 lg:pl-10 lg:pr-8">
            {paged.length === 0 ? (
              <p className="py-10 text-body-md text-neutral-500">За цими умовами замовлень немає.</p>
            ) : (
              <OrdersTable orders={paged} sort={sort} onSort={toggleSort} />
            )}
          </div>

          <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:h-[100px] lg:pl-10 lg:pr-8">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[16px] font-semibold leading-[22px] text-neutral-800">
                {first}-{last} із {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-button-md text-neutral-500">Показувати по:</span>
                <div ref={sizeRef} className="relative">
                  <button
                    type="button"
                    aria-label="Кількість замовлень на сторінці"
                    aria-haspopup="listbox"
                    aria-expanded={sizeOpen}
                    onClick={() => setSizeOpen((v) => !v)}
                    className="flex cursor-pointer items-center gap-[2px] rounded-3xl border border-stroke-subtle bg-white px-3 py-[6px] text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
                  >
                    {pageSize}
                    <ChevronDown16 className={`size-4 shrink-0 transition-[rotate] duration-200 ${sizeOpen ? "rotate-180" : ""}`} />
                  </button>
                  {sizeOpen && (
                    <ul role="listbox" className="absolute left-0 top-full z-20 mt-2 min-w-[120px] rounded-2xl border border-stroke-subtle bg-white p-2 shadow-lg">
                      {PAGE_SIZES.map((n) => (
                        <li key={n}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={n === pageSize}
                            onClick={() => {
                              setPageSize(n);
                              setPage(1);
                              setSizeOpen(false);
                            }}
                            className={`block w-full cursor-pointer rounded-xl px-4 py-2 text-left text-button-md hover:text-brand ${
                              n === pageSize ? "text-brand" : "text-neutral-700"
                            }`}
                          >
                            {n}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {pages > 1 && (
              <nav aria-label="Сторінки замовлень" className="flex flex-wrap items-center gap-1 sm:gap-[10px]">
                <button
                  type="button"
                  aria-label="Попередня сторінка"
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
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
                    onClick={() => setPage(n)}
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
                  onClick={() => setPage(current + 1)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 sm:size-[52px]"
                >
                  <ChevronSideIcon mirrored className="size-6" />
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
}
