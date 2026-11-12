"use client";

import { CheckCircleIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { CompanyPicker } from "../common/pickers";
import type { CompanyAnswer } from "../companies/types";
import { countOf, cx, formatDate, formatMoney, formatNumber } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { DataTable, MoneyCell, type Column } from "../ui/DataTable";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { EmptyState } from "../ui/States";
import { RETURN_STATUS, ReturnStatusBadge, statusLabel } from "../ui/status";
import { Tabs } from "../ui/Tabs";
import { TEXT } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { PeriodFilter, useMinWidth } from "./ListControls";
import { orderHref, rememberListQuery, returnHref } from "./shared";
import { RETURN_GROUPS, RETURN_STATUSES, type ReturnGroup, type ReturnRow, type ReturnsPage, type ReturnStatus } from "./types";

// /admin/returns: the return requests partners send from the cabinet. The
// address bar holds the list's state with the API's own parameter names
// (q, status, clientId, from, to, sort, page, limit); the tabs are presets
// of `status`, so "?status=created,review" (the menu counter, the overview)
// opens on "Очікують рішення".

// Newest request day first: the order the date column shows (the API's own
// default, the arrival moment, can differ from the day a demo company
// lives on).
const DEFAULTS = { sort: "-date", limit: "20" };

type TabKey = ReturnGroup | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "waiting", label: "Очікують рішення" },
  { key: "working", label: "У роботі" },
  { key: "closed", label: "Закриті" },
  { key: "all", label: "Усі" },
];

// Names the list filters by (the tab's `status` is counted separately).
const FILTER_NAMES = ["q", "clientId", "from", "to"];

const LINK =
  "font-semibold text-neutral-900 underline decoration-stroke-subtle underline-offset-4 hover:decoration-neutral-900 tabular-nums whitespace-nowrap";

function known(values: string[]): ReturnStatus[] {
  return [...new Set(values.filter((value): value is ReturnStatus => (RETURN_STATUSES as readonly string[]).includes(value)))];
}

// The tab a set of statuses is, or "custom" for any other set (a link
// from elsewhere asking for one status): no tab is open then and a chip
// names the statuses.
function tabOf(statuses: ReturnStatus[]): TabKey | "custom" {
  if (statuses.length === 0) return "all";
  for (const key of Object.keys(RETURN_GROUPS) as ReturnGroup[]) {
    const group: readonly ReturnStatus[] = RETURN_GROUPS[key];
    if (group.length === statuses.length && group.every((status) => statuses.includes(status))) return key;
  }
  return "custom";
}

function sumOf(counts: ReturnsPage["counts"] | undefined, statuses: readonly ReturnStatus[]): number | undefined {
  if (!counts) return undefined;
  return statuses.reduce((total, status) => total + (counts[status] ?? 0), 0);
}

type Wide = { lines: boolean; solution: boolean };

function columns(canOrders: boolean, wide: Wide): Column<ReturnRow>[] {
  const all: (Column<ReturnRow> | false)[] = [
    {
      key: "id",
      header: "Заявка",
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="whitespace-nowrap font-semibold text-neutral-900 tabular-nums">№{r.id}</span>
          {/* Below 1024 px the date (and on phones the sum) ride under the number. */}
          <span className={cx(TEXT.caption, "whitespace-nowrap tabular-nums min-[1024px]:hidden")}>
            {formatDate(r.date)}
            <span className="min-[640px]:hidden">, {formatMoney(r.total)}</span>
          </span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Дата",
      sortKey: "date",
      firstSort: "desc",
      hideBelow: 1024,
      cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatDate(r.date)}</span>,
    },
    {
      key: "order",
      header: "Замовлення",
      hideBelow: 640,
      interactive: canOrders,
      cell: (r) =>
        canOrders ? (
          <Link href={orderHref(r.orderId)} className={LINK}>
            №{r.orderNumber}
          </Link>
        ) : (
          <span className="whitespace-nowrap tabular-nums">№{r.orderNumber}</span>
        ),
    },
    {
      key: "company",
      header: "Компанія",
      hideBelow: 640,
      cell: (r) => (
        <span className={cx("block max-w-[220px] truncate", !r.clientName && "text-neutral-500")} title={r.clientName ?? undefined}>
          {r.clientName ?? "Компанію не знайдено"}
        </span>
      ),
    },
    wide.lines && {
      key: "lines",
      header: "Позицій",
      align: "right",
      cell: (r) => <span className="tabular-nums">{formatNumber(r.linesCount)}</span>,
    },
    {
      key: "total",
      header: "Сума повернення",
      align: "right",
      hideBelow: 640,
      cell: (r) => (
        <span className="flex flex-col items-end">
          <MoneyCell value={r.total} />
          {/* Without its own column the count of lines sits under the sum. */}
          {!wide.lines && <span className={TEXT.caption}>{countOf(r.linesCount, ["позиція", "позиції", "позицій"])}</span>}
        </span>
      ),
    },
    wide.solution && {
      key: "solution",
      header: "Бажане рішення",
      cell: (r) => <span className="block max-w-[170px] text-[13px] leading-[18px] text-neutral-800">{r.solution || "-"}</span>,
    },
    {
      key: "status",
      header: "Статус",
      cell: (r) => <ReturnStatusBadge status={r.status} />,
    },
  ];
  return all.filter((column): column is Column<ReturnRow> => column !== false);
}

export function ReturnsScreen() {
  const { can } = useStaff();
  const list = useListParams({ defaults: DEFAULTS });
  const search = useSearchParams().toString();
  const returns = useAdminQuery<ReturnsPage>(`/returns?${list.queryString}`);

  // The request pages lead back to this very list (tab, filters, page).
  useEffect(() => {
    rememberListQuery(search);
  }, [search]);

  const wide: Wide = { lines: useMinWidth(1440), solution: useMinWidth(1360) };

  const q = list.q;
  const statuses = known(list.getAll("status"));
  const tab = tabOf(statuses);
  const from = list.get("from");
  const to = list.get("to");
  const clientId = list.get("clientId");
  const counts = returns.data?.counts;

  // The company's name for its chip: the picker's own lookup (same cache
  // key), else a row of the list, which names the partner.
  const canCompanies = can("customers.view");
  const company = useAdminQuery<CompanyAnswer>(canCompanies && clientId ? `/companies/${encodeURIComponent(clientId)}` : null);
  const companyName =
    (company.data?.company.id === clientId ? company.data?.company.name : null) ??
    returns.data?.items.find((row) => row.clientId === clientId)?.clientName ??
    "обрана";

  const chips: FilterChipItem[] = [];
  if (q) chips.push({ key: "q", label: `Пошук: ${q}`, onRemove: () => list.set({ q: null }) });
  if (tab === "custom") {
    chips.push({
      key: "status",
      label: `Статус: ${statuses.map((status) => statusLabel(RETURN_STATUS, status)).join(", ")}`,
      onRemove: () => list.set({ status: null }),
    });
  }
  if (from || to) {
    const range = from && to ? `${formatDate(from)} - ${formatDate(to)}` : from ? `від ${formatDate(from)}` : `до ${formatDate(to)}`;
    chips.push({ key: "period", label: `Період: ${range}`, onRemove: () => list.set({ from: null, to: null }) });
  }
  if (clientId) chips.push({ key: "company", label: `Компанія: ${companyName}`, onRemove: () => list.set({ clientId: null }) });

  const filtered = FILTER_NAMES.some((name) => list.get(name) !== "") || tab === "custom";
  const total = returns.data?.total;

  const tabItems = TABS.map((item) => ({
    key: item.key,
    label: item.label,
    count: sumOf(counts, item.key === "all" ? RETURN_STATUSES : RETURN_GROUPS[item.key]),
  }));

  const showAll = (
    <Button variant="secondary" onClick={() => list.set({ status: null })}>
      Показати всі заявки
    </Button>
  );

  const empty = filtered ? (
    <EmptyState
      icon={<MagnifyingGlassIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title="Таких заявок немає"
      text="Жодна заявка не відповідає пошуку або фільтрам. Змініть умови або покажіть усі заявки."
      action={
        <Button variant="secondary" onClick={list.reset}>
          Скинути фільтри
        </Button>
      }
    />
  ) : tab === "waiting" ? (
    <EmptyState
      icon={<CheckCircleIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title="Усі заявки опрацьовано"
      text="Нових заявок, що чекають на рішення, немає. Щойно партнер оформить повернення в кабінеті, воно з'явиться тут."
      action={showAll}
    />
  ) : tab === "working" ? (
    <EmptyState
      title="Немає заявок у роботі"
      text="Тут будуть погоджені заявки, поки товар їде на склад і поки склад його приймає."
      action={showAll}
    />
  ) : tab === "closed" ? (
    <EmptyState title="Закритих заявок ще немає" text="Тут будуть завершені, відхилені та відкликані клієнтами заявки." action={showAll} />
  ) : (
    <EmptyState
      title="Заявок на повернення ще немає"
      text="Заявки з'являться тут, коли партнер оформить повернення отриманого замовлення в кабінеті."
      action={
        can("orders.view") ? (
          <Button variant="secondary" href="/admin/orders">
            Перейти до замовлень
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <Page>
      <PageHeader
        title="Повернення"
        light={total !== undefined ? formatNumber(total) : undefined}
        subtitle="Заявки партнерів на повернення товарів, оформлені в кабінеті"
      />

      <div className="flex min-w-0 pb-4">
        <Tabs<TabKey | "custom">
          label="Стан заявок"
          value={tab}
          onChange={(key) => {
            if (key === "custom") return;
            list.set({ status: key === "all" ? null : RETURN_GROUPS[key].join(",") });
          }}
          items={tabItems}
        />
      </div>

      <FilterBar
        search={
          <SearchInput
            label="Пошук заявок"
            value={q}
            onChange={(next) => list.set({ q: next })}
            placeholder="Номер заявки або замовлення"
          />
        }
        filters={
          <>
            <PeriodFilter from={from} to={to} onChange={(range) => list.set({ from: range.from, to: range.to })} />
            {canCompanies && (
              <div className="w-[220px] max-w-full">
                <CompanyPicker aria-label="Компанія" placeholder="Компанія" value={clientId || null} onChange={(id) => list.set({ clientId: id })} />
              </div>
            )}
          </>
        }
        chips={chips}
        onReset={list.reset}
      />

      <DataTable
        caption="Заявки на повернення"
        columns={columns(can("orders.view"), wide)}
        rows={returns.data?.items}
        rowKey={(r) => r.id}
        loading={returns.loading}
        stale={returns.stale}
        error={returns.error}
        onRetry={returns.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        rowHref={(r) => returnHref(r.id)}
        empty={empty}
        footer={
          <Pagination
            page={list.page}
            limit={list.limit}
            total={total ?? 0}
            onPage={(page) => list.set({ page })}
            onLimit={(limit) => list.set({ limit })}
          />
        }
      />
    </Page>
  );
}
