"use client";

import { ArrowPathIcon, TruckIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { adminApi } from "../lib/api";
import { invalidate, useAdminQuery } from "../lib/query";
import { cx, formatDate, formatMoney, formatNumber, formatPhone } from "../lib/format";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { DataTable, type Column } from "../ui/DataTable";
import { DATE_PRESETS, DateRange } from "../ui/DateInput";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { CopyButton } from "../ui/KeyValue";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { EmptyState } from "../ui/States";
import { ShipmentStatusBadge, SHIPMENT_STATUS } from "../ui/status";
import { Tabs } from "../ui/Tabs";
import { toast } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { CARRIER_NAME, relativeTime, shippingError, useNow } from "./shared";
import { SHIPPING_DEFAULT_SORT, type ShipmentRow, type ShipmentStatusKey, type ShippingListAnswer, type TrackAllResult } from "./types";

// /admin/shipping: every order that has a shipment, by where the parcel is.
// The tabs are presets of the API's own `status` filter, so a link like
// /admin/shipping?status=refused,returning lands on "Проблемні".

type TabKey = "transit" | "arrived" | "received" | "problem" | "all";

const TABS: { key: TabKey; label: string; status: ShipmentStatusKey[]; empty: string }[] = [
  { key: "transit", label: "У дорозі", status: ["created", "in_transit"], empty: "Зараз у дорозі нічого немає." },
  { key: "arrived", label: "У відділенні", status: ["arrived"], empty: "Жодна посилка не чекає на одержувача у відділенні." },
  { key: "received", label: "Отримано", status: ["received"], empty: "Отриманих посилок ще немає." },
  { key: "problem", label: "Проблемні", status: ["refused", "returning"], empty: "Відмов і повернень немає." },
  { key: "all", label: "Усі", status: [], empty: "" },
];

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

// The bulk refresh asks for at most 100 parcels a call; a few calls cover
// any realistic backlog without leaving the button pressed forever.
const TRACK_ROUNDS = 5;

export function ShippingScreen() {
  const { can } = useStaff();
  const now = useNow();
  const list = useListParams({ defaults: { sort: SHIPPING_DEFAULT_SORT, limit: "20" } });
  const query = useAdminQuery<ShippingListAnswer>(`/shipping?${list.queryString}`);
  const [tracking, setTracking] = useState(false);
  const tabsBox = useRef<HTMLDivElement>(null);

  const status = list.getAll("status").filter(Boolean);
  const tab = TABS.find((t) => sameSet(t.status, status));
  const tabKey = tab?.key ?? null;

  // On a phone the capsule scrolls sideways: bring the open tab into view
  // (a link to "Проблемні" opens with it off screen otherwise). Only the
  // capsule scrolls, never the page.
  useEffect(() => {
    const active = tabsBox.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    const track = active?.parentElement;
    if (!active || !track || track.scrollWidth <= track.clientWidth) return;
    const left = active.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    if (left < track.scrollLeft || left + active.offsetWidth > track.scrollLeft + track.clientWidth) {
      track.scrollLeft = Math.max(0, left - (track.clientWidth - active.offsetWidth) / 2);
    }
  }, [tabKey]);
  const from = list.get("from");
  const to = list.get("to");
  const counts = query.data?.counts;
  const countOfTab = (t: (typeof TABS)[number]) =>
    counts ? (t.status.length ? t.status.reduce((sum, key) => sum + (counts[key] ?? 0), 0) : counts.all) : undefined;

  const chips: FilterChipItem[] = [];
  if (list.q) chips.push({ key: "q", label: `Пошук: ${list.q}`, onRemove: () => list.set({ q: null }) });
  if (from || to) {
    const range = from && to ? `${formatDate(from)} - ${formatDate(to)}` : from ? `від ${formatDate(from)}` : `до ${formatDate(to)}`;
    chips.push({ key: "range", label: `Створено: ${range}`, onRemove: () => list.set({ from: null, to: null }) });
  }
  if (status.length && !tab) {
    chips.push({
      key: "status",
      label: `Статус: ${status.map((key) => SHIPMENT_STATUS[key as ShipmentStatusKey]?.label ?? key).join(", ")}`,
      onRemove: () => list.set({ status: null }),
    });
  }
  const filtered = Boolean(list.q || from || to);

  const trackAll = async () => {
    setTracking(true);
    let checked = 0;
    let changed = 0;
    let failed = 0;
    let more = false;
    for (let round = 0; round < TRACK_ROUNDS; round += 1) {
      const result = await adminApi<TrackAllResult>("/shipping/track", { method: "POST" });
      if (!result.ok) {
        setTracking(false);
        if (checked > 0) invalidate("/shipping");
        toast.error(shippingError(result));
        return;
      }
      checked += result.data.checked;
      changed += result.data.changed;
      failed += result.data.failed;
      more = result.data.more;
      if (!more) break;
    }
    setTracking(false);
    invalidate("/shipping");
    if (changed > 0) invalidate("/orders");
    if (checked === 0) {
      toast.info("Немає посилок у дорозі: оновлювати нічого.");
      return;
    }
    const parts = [`Перевірено ${formatNumber(checked)}`, `змінилося ${formatNumber(changed)}`];
    if (failed > 0) parts.push(`перевізник не знайшов ${formatNumber(failed)}`);
    toast.show({
      tone: "success",
      title: changed > 0 ? "Статуси оновлено" : "Нових змін немає",
      text: `${parts.join(", ")}.${more ? " Решту оновимо наступним натисканням." : ""}`,
    });
  };

  // The columns of each width step must fit the room the page has at the
  // narrowest point of that step (the kit hides by 640 / 1024 / 1280): six
  // at 1280 (952 px of table), four at 1024 (696 px, the menu is open),
  // three from 640, the order and the status on phones. So the place of
  // delivery rides under the recipient, the delivery cost under its date,
  // and the waybill number under the order where its own column is hidden.
  // The order column holds the row's link and is always visible.
  const columns: Column<ShipmentRow>[] = [
    {
      key: "ttn",
      header: "Накладна",
      sortKey: "shipment.createdAt",
      firstSort: "desc",
      interactive: true,
      hideBelow: 1024,
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          {row.ttn ? (
            <span className="flex min-w-0 items-center gap-0.5">
              <span className="truncate font-semibold tabular-nums text-neutral-900">{row.ttn}</span>
              <CopyButton text={row.ttn} label={`Скопіювати номер ${row.ttn}`} />
            </span>
          ) : (
            <span className="flex h-8 items-center font-semibold text-neutral-900">{CARRIER_NAME[row.carrier]}</span>
          )}
          <span className={cx(TEXT.caption, "truncate")}>
            {row.ttn && row.carrier !== "nova-poshta" ? `${CARRIER_NAME[row.carrier]}, ` : ""}
            {formatDate(row.createdAt)}
          </span>
        </span>
      ),
    },
    {
      key: "order",
      header: "Замовлення",
      cell: (row) => (
        <span className="flex min-w-0 max-w-[120px] flex-col">
          <span className="truncate font-semibold text-neutral-900">№{row.orderNumber}</span>
          <span className={cx(TEXT.caption, "truncate max-[1023px]:hidden")} title={row.customer || undefined}>
            {row.customer || (row.channel === "b2b" ? "Партнер" : "Роздріб")}
          </span>
          <span className={cx(TEXT.caption, "truncate tabular-nums min-[1024px]:hidden")}>{row.ttn ?? CARRIER_NAME[row.carrier]}</span>
        </span>
      ),
    },
    {
      key: "recipient",
      header: "Одержувач",
      hideBelow: 640,
      cell: (row) => {
        const place = [row.recipientCity, row.recipientWarehouse].filter(Boolean).join(", ");
        return (
          <span className="flex min-w-0 max-w-[150px] flex-col">
            <span className="truncate text-neutral-900">{row.recipientName || "-"}</span>
            {row.recipientPhone && <span className={cx(TEXT.caption, "truncate tabular-nums")}>{formatPhone(row.recipientPhone)}</span>}
            {place && (
              <span className={cx(TEXT.caption, "truncate")} title={place}>
                {place}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Статус",
      cell: (row) => (
        <span className="flex min-w-0 max-w-[150px] flex-col items-start gap-1">
          <ShipmentStatusBadge status={row.status} />
          {(row.statusText || row.note) && (
            <span className={cx(TEXT.caption, "line-clamp-2")} title={row.statusText || row.note || undefined}>
              {row.statusText || row.note}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "eta",
      header: "Очікується",
      sortKey: "shipment.estimatedDate",
      firstSort: "asc",
      hideBelow: 1280,
      cell: (row) => (
        <span className="flex flex-col whitespace-nowrap tabular-nums">
          <span className={row.estimatedDate ? "text-neutral-900" : "text-neutral-500"}>
            {row.estimatedDate ? formatDate(row.estimatedDate) : "-"}
          </span>
          {row.cost !== null && <span className={TEXT.caption}>доставка {formatMoney(row.cost)}</span>}
        </span>
      ),
    },
    {
      key: "checked",
      header: "Оновлено",
      sortKey: "shipment.checkedAt",
      firstSort: "desc",
      hideBelow: 1280,
      cell: (row) => (
        <span className="whitespace-nowrap text-neutral-500">
          {row.checkedAt ? relativeTime(row.checkedAt, now) : row.carrier === "nova-poshta" && row.ttn ? "не перевіряли" : "-"}
        </span>
      ),
    },
  ];

  const total = counts?.all ?? 0;
  const empty =
    query.data && total === 0 ? (
      <EmptyState
        icon={<TruckIcon className="size-6" />}
        title="Накладних ще немає"
        text="Накладні з'являються тут після створення в картці замовлення: відкрийте замовлення й натисніть «Створити накладну Нової Пошти»."
        action={
          <Button size="sm" href="/admin/orders">
            Перейти до замовлень
          </Button>
        }
      />
    ) : filtered || (status.length > 0 && !tab) ? (
      <EmptyState
        title="Нічого не знайдено"
        text="За цим пошуком або датами накладних немає."
        action={
          <Button size="sm" variant="secondary" onClick={list.reset}>
            Скинути фільтри
          </Button>
        }
      />
    ) : tab && tab.empty ? (
      <EmptyState icon={<TruckIcon className="size-6" />} title={tab.empty} text="Коли стан посилки зміниться, вона з'явиться тут сама." />
    ) : undefined;

  return (
    <Page>
      <PageHeader
        title="Доставка"
        light={counts ? formatNumber(total) : undefined}
        subtitle="Накладні замовлень і де зараз посилки"
        actions={
          can("shipping.edit") ? (
            <Button variant="secondary" iconLeft={ArrowPathIcon} loading={tracking} onClick={trackAll}>
              Оновити статуси
            </Button>
          ) : undefined
        }
        tabs={
          <div ref={tabsBox} className="min-w-0">
            <Tabs
              label="Стан посилок"
              value={tab?.key ?? ("" as TabKey)}
              onChange={(key) => list.set({ status: TABS.find((t) => t.key === key)?.status.join(",") || null })}
              items={TABS.map((t) => ({ key: t.key, label: t.label, count: countOfTab(t) }))}
            />
          </div>
        }
      />
      <div className="flex min-w-0 flex-col gap-4">
        <FilterBar
          search={
            <SearchInput
              label="Пошук накладних"
              value={list.q}
              onChange={(q) => list.set({ q })}
              placeholder="Накладна, замовлення або одержувач"
            />
          }
          filters={
            <DateRange
              aria-label="Дата створення накладної"
              from={from}
              to={to}
              onChange={(range) => list.set({ from: range.from || null, to: range.to || null })}
              presets={DATE_PRESETS.slice(0, 2)}
              clearable
            />
          }
          chips={chips}
          onReset={chips.length ? list.reset : undefined}
        />
        <DataTable
          caption="Накладні"
          columns={columns}
          rows={query.data?.items}
          rowKey={(row) => row.orderId}
          loading={query.loading}
          stale={query.stale}
          error={query.error}
          onRetry={query.reload}
          sort={list.sort}
          onSort={(sort) => list.set({ sort })}
          rowHref={(row) => `/admin/orders/${encodeURIComponent(row.orderId)}`}
          empty={empty}
          footer={
            <Pagination
              page={list.page}
              limit={list.limit}
              total={query.data?.total ?? 0}
              onPage={(page) => list.set({ page })}
              onLimit={(limit) => list.set({ limit })}
            />
          }
        />
      </div>
    </Page>
  );
}
