"use client";

import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { CompanyPicker, STAFF_NONE, StaffSelect } from "../common/pickers";
import type { CompanyAnswer } from "../companies/types";
import { adminUrl } from "../lib/api";
import { cx, formatDate, formatMoney, formatNumber, formatPhone } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import type { StaffOption } from "../staff/types";
import { Button } from "../ui/Button";
import { DataTable, MoneyCell, TwoLineCell, type Column } from "../ui/DataTable";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { EmptyState } from "../ui/States";
import {
  ChannelBadge,
  ERP_STATE,
  ORDER_STATUS,
  OrderStatusBadge,
  PAYMENT_STATUS,
  PaymentStatusBadge,
  ShipmentStatusBadge,
  statusLabel,
  type ErpState,
  type PaymentStatus,
} from "../ui/status";
import { Tabs } from "../ui/Tabs";
import { TEXT, TONES } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { BadgeFilter, PeriodFilter, PresetChip } from "./ListFilters";
import { orderHref, paymentKindOf, rememberListQuery } from "./shared";
import { ORDER_STATUSES, PAYMENT_KINDS, type OrderChannel, type OrdersPage, type OrderRow } from "./types";
import { useMinWidth } from "./useMinWidth";

// /admin/orders: every order of both channels. The address bar holds the
// list's state with the API's own parameter names (q, channel, status,
// payment, from, to, managerId, clientId, cancelRequest, sort, page,
// limit), so links from other sections (?status=new, ?cancelRequest=true,
// ?payment=overdue, ?clientId=, ?managerId=) land on the right list.

const DEFAULTS = { sort: "-createdAt", limit: "20" };

const CHANNEL_TABS: { key: "all" | OrderChannel; label: string }[] = [
  { key: "all", label: "Усі" },
  { key: "b2b", label: "Партнери" },
  { key: "retail", label: "Роздріб" },
];

const STATUS_CHOICES = ORDER_STATUSES.map((status) => ({ value: status, badge: <OrderStatusBadge status={status} /> }));
const PAYMENT_CHOICES = PAYMENT_KINDS.map((kind) => ({ value: kind, badge: <PaymentStatusBadge kind={kind} /> }));

// The three questions staff ask most, as presets of the list's own filters.
const PRESETS = [
  { key: "new", label: "Нові", name: "status", value: "new" },
  { key: "cancel", label: "Запити на скасування", name: "cancelRequest", value: "true" },
  { key: "overdue", label: "Прострочена оплата", name: "payment", value: "overdue" },
] as const;

// Names the list reads; anything else in the address is left to the page.
const FILTER_NAMES = ["q", "channel", "status", "payment", "from", "to", "managerId", "clientId", "cancelRequest"];

type StaffOptions = { ok: true; items: StaffOption[] };

function known<K extends string>(values: string[], allowed: readonly K[]): K[] {
  return values.filter((value): value is K => (allowed as readonly string[]).includes(value));
}

function Muted() {
  return <span className="text-neutral-400">-</span>;
}

// `late`: the due date has passed with money still owed (row.pastDue), so
// the row is in "Прострочена оплата" although its badge says it waits.
function paymentCaption(row: OrderRow): { text: string; late: boolean } | null {
  const payment = row.payment;
  if (row.status === "cancelled") return null;
  if (payment?.kind === "overdue") return { text: `на ${formatNumber(payment.days)} дн.`, late: false };
  if (payment?.kind === "partial") return { text: `сплачено ${formatMoney(payment.paid)}`, late: false };
  if (payment?.kind === "paid") return payment.late ? { text: "із простроченням", late: false } : null;
  return row.paymentDue ? { text: `до ${formatDate(row.paymentDue)}`, late: row.pastDue } : null;
}

// The BAS state in the widest table: the kit's words in the state's
// colour without the pill, wrapping to two short lines.
function ErpCompact({ state }: { state: ErpState }) {
  const meta = ERP_STATE[state] ?? { label: state, tone: "neutral" as const };
  const tone = TONES[meta.tone];
  return (
    <span className="inline-flex max-w-[112px] items-start gap-1.5 text-[12px] font-medium leading-4" style={{ color: tone.text }}>
      <span aria-hidden className="mt-[5px] size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone.dot }} />
      <span>{meta.label}</span>
    </span>
  );
}

// Which secondary columns fit next to the side menu at this width (the
// budget is measured: a column comes only where the table still fits its
// card at the narrowest width of the step, scroll bar included).
type Wide = { date: boolean; shipment: boolean; manager: boolean; erp: boolean };

function columns(managerName: (id: string) => string, wide: Wide): Column<OrderRow>[] {
  const all: (Column<OrderRow> | false)[] = [
    {
      key: "number",
      header: "Номер",
      cell: (o) => (
        <span className="flex min-w-0 flex-col items-start gap-1">
          <span className="whitespace-nowrap font-semibold text-neutral-900 tabular-nums">№{o.number}</span>
          <span className="max-[639px]:hidden">
            <ChannelBadge channel={o.channel} />
          </span>
          {/* Phones have room for two columns besides this one: the sum
              and the channel ride under the number there. */}
          <span className={cx(TEXT.caption, "whitespace-nowrap tabular-nums min-[640px]:hidden")}>
            {formatMoney(o.total)}, {o.channel === "b2b" ? "партнер" : "роздріб"}
          </span>
        </span>
      ),
    },
    wide.date && {
      key: "date",
      header: "Дата",
      sortKey: "createdAt",
      firstSort: "desc",
      cell: (o) => <span className="whitespace-nowrap tabular-nums">{formatDate(o.date)}</span>,
    },
    {
      key: "customer",
      header: "Клієнт",
      hideBelow: 640,
      cell: (o) => (
        <span className="block max-w-[160px]">
          <TwoLineCell
            title={o.customer.name || "Без імені"}
            subtitle={o.customer.company || o.clientName || (o.customer.phone ? formatPhone(o.customer.phone) : o.customer.email) || undefined}
          />
        </span>
      ),
    },
    {
      key: "total",
      header: "Сума",
      align: "right",
      sortKey: "total",
      firstSort: "desc",
      hideBelow: 640,
      cell: (o) => <MoneyCell value={o.total} />,
    },
    {
      key: "status",
      header: "Статус",
      cell: (o) => (
        <span className="flex flex-col items-start gap-1">
          <OrderStatusBadge status={o.status} />
          {o.cancelRequested && (
            <span className="whitespace-nowrap text-[12px] font-semibold leading-4" style={{ color: TONES.amber.text }}>
              Просить скасувати
            </span>
          )}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Оплата",
      hideBelow: 1280,
      cell: (o) => {
        const caption = paymentCaption(o);
        return (
          <span className="flex flex-col items-start gap-1">
            <PaymentStatusBadge kind={paymentKindOf(o)} />
            {caption && (
              <span
                className={cx(TEXT.caption, "whitespace-nowrap tabular-nums", caption.late && "font-semibold")}
                style={caption.late ? { color: TONES.red.text } : undefined}
              >
                {caption.late && <span className="sr-only">Термін оплати минув: </span>}
                {caption.text}
              </span>
            )}
          </span>
        );
      },
    },
    wide.shipment && {
      key: "shipment",
      header: "Доставка",
      cell: (o) =>
        o.shipment ? (
          <span className="flex flex-col items-start gap-1">
            {o.shipment.ttn && <span className="whitespace-nowrap text-[13px] font-medium leading-[18px] tabular-nums">{o.shipment.ttn}</span>}
            <ShipmentStatusBadge status={o.shipment.status} />
          </span>
        ) : (
          <Muted />
        ),
    },
    wide.manager && {
      key: "manager",
      header: "Менеджер",
      cell: (o) => (o.managerId ? <span className="block max-w-[110px] truncate">{managerName(o.managerId)}</span> : <Muted />),
    },
    wide.erp && {
      key: "erp",
      header: "Обмін з BAS",
      cell: (o) => (o.erpState ? <ErpCompact state={o.erpState} /> : <Muted />),
    },
  ];
  return all.filter((column): column is Column<OrderRow> => column !== false);
}

// How many orders a preset would show (one tiny request each; refreshed
// with every list after a change).
function usePresetCount(query: string): number | null {
  const answer = useAdminQuery<OrdersPage>(`/orders?${query}&limit=1`);
  return answer.data ? answer.data.total : null;
}

export function OrdersScreen() {
  const { can } = useStaff();
  const list = useListParams({ defaults: DEFAULTS });
  const search = useSearchParams().toString();
  const orders = useAdminQuery<OrdersPage>(`/orders?${list.queryString}`);
  const staff = useAdminQuery<StaffOptions>("/staff/options");

  // The order pages lead back to this very list (filters, sort, page).
  useEffect(() => {
    rememberListQuery(search);
  }, [search]);

  const counts = {
    new: usePresetCount("status=new"),
    cancel: usePresetCount("cancelRequest=true"),
    overdue: usePresetCount("payment=overdue"),
  };
  const wide: Wide = {
    date: useMinWidth(768),
    shipment: useMinWidth(1440),
    manager: useMinWidth(1536),
    erp: useMinWidth(1680),
  };

  const q = list.q;
  const channel = list.get("channel");
  const statuses = known(list.getAll("status"), ORDER_STATUSES);
  const payments = known(list.getAll("payment"), PAYMENT_KINDS);
  const from = list.get("from");
  const to = list.get("to");
  const managerId = list.get("managerId");
  const clientId = list.get("clientId");
  const cancelRequest = list.get("cancelRequest");

  const staffNames = new Map((staff.data?.items ?? []).map((person) => [person.id, person.name]));
  const managerName = (id: string) => staffNames.get(id) ?? (staff.data ? "Колишній співробітник" : "...");

  // The company's name for its chip: the picker's own lookup (same cache
  // key), else a row of the list, which names the partner.
  const canSeeCompanies = can("customers.view");
  const company = useAdminQuery<CompanyAnswer>(canSeeCompanies && clientId ? `/companies/${encodeURIComponent(clientId)}` : null);
  const companyName =
    (company.data?.company.id === clientId ? company.data?.company.name : null) ??
    orders.data?.items.find((row) => row.clientId === clientId)?.clientName ??
    "обрана";

  const chips: FilterChipItem[] = [];
  if (q) chips.push({ key: "q", label: `Пошук: ${q}`, onRemove: () => list.set({ q: null }) });
  if (channel === "b2b" || channel === "retail") {
    chips.push({ key: "channel", label: channel === "b2b" ? "Партнери" : "Роздріб", onRemove: () => list.set({ channel: null }) });
  }
  for (const status of statuses) {
    chips.push({
      key: `status-${status}`,
      label: `Статус: ${statusLabel(ORDER_STATUS, status)}`,
      onRemove: () => list.set({ status: statuses.filter((item) => item !== status) }),
    });
  }
  for (const kind of payments) {
    chips.push({
      key: `payment-${kind}`,
      label: `Оплата: ${statusLabel(PAYMENT_STATUS, kind)}`,
      onRemove: () => list.set({ payment: payments.filter((item) => item !== kind) }),
    });
  }
  if (from || to) {
    const range = from && to ? `${formatDate(from)} - ${formatDate(to)}` : from ? `від ${formatDate(from)}` : `до ${formatDate(to)}`;
    chips.push({ key: "period", label: `Період: ${range}`, onRemove: () => list.set({ from: null, to: null }) });
  }
  if (managerId) {
    chips.push({
      key: "manager",
      label: managerId === STAFF_NONE ? "Без менеджера" : `Менеджер: ${managerName(managerId)}`,
      onRemove: () => list.set({ managerId: null }),
    });
  }
  if (clientId) chips.push({ key: "company", label: `Компанія: ${companyName}`, onRemove: () => list.set({ clientId: null }) });
  if (cancelRequest === "true" || cancelRequest === "false") {
    chips.push({
      key: "cancel",
      label: cancelRequest === "true" ? "Є запит на скасування" : "Без запиту на скасування",
      onRemove: () => list.set({ cancelRequest: null }),
    });
  }

  const filtered = FILTER_NAMES.some((name) => list.get(name) !== "");
  const total = orders.data?.total;

  // The export takes the list's filters and sort, never its page.
  const exportQuery = new URLSearchParams(list.queryString);
  exportQuery.delete("page");
  exportQuery.delete("limit");

  const presetOn = (preset: (typeof PRESETS)[number]) =>
    preset.name === "status" ? statuses.length === 1 && statuses[0] === preset.value : list.getAll(preset.name).join(",") === preset.value;

  const togglePreset = (preset: (typeof PRESETS)[number]) => {
    if (presetOn(preset)) list.set({ [preset.name]: null });
    else list.set({ [preset.name]: preset.value });
  };

  return (
    <Page>
      <PageHeader
        title="Замовлення"
        light={total !== undefined ? formatNumber(total) : undefined}
        subtitle="Замовлення партнерів із кабінету та роздрібні замовлення з сайту"
        actions={
          <Button variant="secondary" iconLeft={ArrowDownTrayIcon} href={adminUrl(`/orders/export?${exportQuery.toString()}`)} external>
            Експорт CSV
          </Button>
        }
      />

      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3 pb-4">
        <Tabs
          label="Канал"
          value={channel === "b2b" || channel === "retail" ? channel : "all"}
          onChange={(key) => list.set({ channel: key === "all" ? null : key })}
          items={CHANNEL_TABS}
        />
        <span aria-hidden className="hidden h-6 w-px bg-stroke-subtle min-[640px]:block" />
        <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label="Швидкі фільтри">
          {PRESETS.map((preset) => (
            <PresetChip key={preset.key} label={preset.label} count={counts[preset.key]} pressed={presetOn(preset)} onToggle={() => togglePreset(preset)} />
          ))}
        </div>
      </div>

      <FilterBar
        search={<SearchInput label="Пошук замовлень" value={q} onChange={(next) => list.set({ q: next })} placeholder="Номер, клієнт, телефон або e-mail" />}
        filters={
          <>
            <BadgeFilter label="Статус" choices={STATUS_CHOICES} value={statuses} onChange={(next) => list.set({ status: next })} />
            <BadgeFilter label="Оплата" choices={PAYMENT_CHOICES} value={payments} onChange={(next) => list.set({ payment: next as PaymentStatus[] })} />
            <PeriodFilter from={from} to={to} onChange={(range) => list.set({ from: range.from, to: range.to })} />
            <div className="w-[170px] max-w-full">
              <StaffSelect
                aria-label="Менеджер"
                placeholder="Менеджер"
                value={managerId || null}
                onChange={(id) => list.set({ managerId: id })}
                withNone
                noneLabel="Без менеджера"
                clearable
              />
            </div>
            {canSeeCompanies && (
              <div className="w-[190px] max-w-full">
                <CompanyPicker aria-label="Компанія" placeholder="Компанія" value={clientId || null} onChange={(id) => list.set({ clientId: id })} />
              </div>
            )}
          </>
        }
        chips={chips}
        onReset={list.reset}
      />

      <DataTable
        caption="Замовлення"
        columns={columns(managerName, wide)}
        rows={orders.data?.items}
        rowKey={(o) => o.id}
        loading={orders.loading}
        stale={orders.stale}
        error={orders.error}
        onRetry={orders.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        rowHref={(o) => orderHref(o.id)}
        empty={
          filtered ? (
            <EmptyState
              icon={<MagnifyingGlassIcon aria-hidden className="size-6" strokeWidth={1.7} />}
              title="Таких замовлень немає"
              text="Жодне замовлення не відповідає пошуку або фільтрам. Змініть умови або покажіть усі замовлення."
              action={
                <Button variant="secondary" onClick={list.reset}>
                  Скинути фільтри
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Замовлень ще немає"
              text="Нові замовлення з'являться тут, щойно партнер оформить їх у кабінеті або покупець на сайті."
              action={
                <Button variant="secondary" iconLeft={ArrowTopRightOnSquareIcon} href="/catalog" external>
                  Відкрити каталог на сайті
                </Button>
              }
            />
          )
        }
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
