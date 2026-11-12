"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ShoppingCartIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";
import { useState, type ReactNode } from "react";
import type { ApiFailure } from "../lib/api";
import { formatMoney, formatNumber } from "../lib/format";
import { Button } from "../ui/Button";
import { AttentionItem, Card, StatCard } from "../ui/Card";
import { DataTable, DateCell, MoneyCell, ThumbCell, TwoLineCell, type Column } from "../ui/DataTable";
import { KebabMenu } from "../ui/DropdownMenu";
import { FilterBar } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { KeyValueList } from "../ui/KeyValue";
import { Grid, PageHeader, PageSection, Stack } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { EmptyState, ErrorState, LoadingBlock, NotFoundState } from "../ui/States";
import { LinkTabs, TabPanel, Tabs } from "../ui/Tabs";
import { Timeline } from "../ui/Timeline";
import {
  ACCOUNT_TYPE,
  AccountTypeBadge,
  ActiveBadge,
  BLOG_STATUS,
  BlogStatusBadge,
  CHANNEL,
  ChannelBadge,
  ERP_STATE,
  ErpStateBadge,
  LEAD_KIND,
  LEAD_STATUS,
  LeadKindBadge,
  LeadStatusBadge,
  ORDER_STATUS,
  OrderStatusBadge,
  PAYMENT_STATUS,
  PaymentStatusBadge,
  RETURN_STATUS,
  ReturnStatusBadge,
  SHIPMENT_STATUS,
  ShipmentStatusBadge,
  statusOptions,
  type AccountType,
  type BlogStatus,
  type Channel,
  type ErpState,
  type LeadKind,
  type LeadStatus,
  type OrderStatus,
  type PaymentStatus,
  type ReturnStatus,
  type ShipmentStatus,
} from "../ui/status";
import { useListParams } from "../ui/useListParams";
import { toast } from "../ui/Toast";
import { ORDERS, SAMPLE_IMAGES, type DemoOrder } from "./demoData";
import { Note, Row, Sample, Section } from "./parts";

const DEMO_FAILURE: ApiFailure = { ok: false, status: 0, error: "network", data: {} };

export function PageDemo() {
  return (
    <Section id="page" title="Page, PageHeader, PageSection, Stack, Grid" file="ui/Page.tsx" description="Кістяк екрана: колонка на сірій плиті, заголовок, секції, сітки.">
      <Sample tone="slab" className="bg-bg-cabinet">
        <PageHeader
          title="Замовлення"
          light={formatNumber(1248)}
          subtitle="Усі замовлення партнерів і роздрібу"
          back={{ href: "/admin", label: "До огляду" }}
          meta={
            <>
              <OrderStatusBadge status="inProgress" size="md" />
              <span className="text-[13px] text-neutral-500">Оновлено 12.11.2026, 14:32</span>
            </>
          }
          actions={
            <>
              <Button variant="secondary" iconLeft={ArrowDownTrayIcon}>
                Експорт CSV
              </Button>
              <Button iconLeft={PlusIcon}>Нове замовлення</Button>
            </>
          }
          tabs={
            <LinkTabs
              label="Статус"
              value="all"
              items={[
                { key: "all", label: "Усі", href: "/admin/ui-kit#page" },
                { key: "new", label: "Нові", href: "/admin/ui-kit?demo=new#page", count: 7 },
                { key: "work", label: "В роботі", href: "/admin/ui-kit?demo=work#page", count: 23 },
              ]}
            />
          }
        />
        <PageSection title="Потребують уваги" description="PageSection з діями" actions={<Button size="sm" variant="ghost">Усі</Button>}>
          <Grid cols={{ base: 1, sm: 2, xl: 4 }} gap={4}>
            {["base 1", "sm 2", "xl 4", "Grid"].map((label) => (
              <div key={label} className="rounded-3xl bg-white p-5 text-[14px] font-semibold">
                {label}
              </div>
            ))}
          </Grid>
        </PageSection>
        <Stack gap={2} className="mt-4">
          <div className="rounded-2xl bg-white p-3 text-[14px]">Stack gap 2</div>
          <div className="rounded-2xl bg-white p-3 text-[14px]">Stack gap 2</div>
        </Stack>
      </Sample>
    </Section>
  );
}

export function CardsDemo() {
  return (
    <Section id="card" title="Card, StatCard, AttentionItem" file="ui/Card.tsx" description="Білі картки r24 без тіней, темні плитки ключових цифр, рядки «потребує уваги».">
      <Grid cols={{ base: 1, sm: 2, xl: 4 }}>
        <StatCard label="Виручка за тиждень" value="1 284 300 ₴" delta={{ value: 12.4 }} hint="до попереднього тижня" icon={<BanknotesIcon />} href="/admin/ui-kit#card" />
        <StatCard label="Нові замовлення" value="48" delta={{ value: -6 }} hint="за 7 днів" icon={<ShoppingCartIcon />} />
        <StatCard label="Прострочена оплата" value="86 400 ₴" delta={{ value: -18.2, goodWhen: "down" }} tone="white" hint="менше - краще" icon={<ExclamationTriangleIcon />} />
        <StatCard label="Відвантаження" value="0" delta={{ value: 0 }} tone="white" loading />
      </Grid>
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-3">
        <Card title="Біла картка" subtitle="padding md" actions={<KebabMenu label="Дії з карткою" size="sm" items={[{ key: "a", label: "Оновити", icon: ArrowPathIcon, onSelect: () => toast.info("Оновлюємо") }]} />}>
          <p className="text-[14px] leading-5 text-neutral-700">Картка на сірій плиті: без тіні й рамки, кути 24.</p>
          <Card tone="inset" padding="md" className="mt-4">
            <p className="text-[14px] leading-5">tone «inset»: тихіша плитка всередині білої картки.</p>
          </Card>
        </Card>
        <Card tone="dark" title="Темна плитка" subtitle="tone dark">
          <p className="text-[14px] leading-5 text-neutral-300">Для ключових цифр і привітань.</p>
        </Card>
        <Card title="Потребують уваги" padding="none" className="pb-2">
          <div className="flex flex-col px-2">
            <AttentionItem icon={<ShoppingCartIcon />} title="Нові замовлення" text="Чекають на менеджера" count={7} href="/admin/ui-kit#card" />
            <AttentionItem icon={<TruckIcon />} title="Без накладної" text="Оплачені, ще не відправлені" count={3} tone="indigo" href="/admin/ui-kit#card" />
            <AttentionItem icon={<ChatBubbleLeftRightIcon />} title="Заявки з сайту" text="Усі опрацьовано" count={0} tone="green" href="/admin/ui-kit#card" />
          </div>
        </Card>
      </div>
    </Section>
  );
}

export function KeyValueDemo() {
  return (
    <Section id="keyvalue" title="KeyValueList, CopyButton" file="ui/KeyValue.tsx" description="Факти запису: підпис над значенням, з кнопками копіювання.">
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-3">
        <Sample title="Одна колонка">
          <KeyValueList
            items={[
              { label: "Номер", value: "10042381", copy: "10042381" },
              { label: "Компанія", value: "ТОВ «Готель Дністер»", hint: "ЄДРПОУ 41234567" },
              { label: "Сума", value: formatMoney(18400) },
              { label: "ТТН", value: "20450012345678", copy: "20450012345678" },
            ]}
          />
        </Sample>
        <Sample title="Дві колонки, dense" className="min-[1024px]:col-span-2">
          <KeyValueList
            columns={2}
            dense
            items={[
              { label: "Контактна особа", value: "Олена Коваль" },
              { label: "Телефон", value: "+380 67 123 45 67", copy: "+380671234567" },
              { label: "E-mail", value: "booking@dnister-hotel.com.ua", copy: "booking@dnister-hotel.com.ua" },
              { label: "Адреса доставки", value: "м. Львів, вул. Матейка, 6, відділення №12" },
              { label: "Менеджер", value: "Андрій Мельник" },
              { label: "Канал", value: <ChannelBadge channel="b2b" /> },
            ]}
          />
        </Sample>
      </div>
    </Section>
  );
}

export function TabsDemo() {
  const [tab, setTab] = useState<"info" | "items" | "history" | "files">("info");
  const [small, setSmall] = useState<"day" | "week" | "month">("week");
  return (
    <Section id="tabs" title="Tabs, TabPanel, LinkTabs" file="ui/Tabs.tsx" description="Капсула вкладок: відкрита - біла пігулка; стрілки, Home і End перемикають.">
      <Sample>
        <Row label="md 40">
          <Tabs
            label="Розділи замовлення"
            idBase="demo-order"
            value={tab}
            onChange={setTab}
            items={[
              { key: "info", label: "Дані" },
              { key: "items", label: "Товари", count: 12 },
              { key: "history", label: "Історія", count: 4 },
              { key: "files", label: "Файли", disabled: true },
            ]}
          />
        </Row>
        <TabPanel idBase="demo-order" value="info" hidden={tab !== "info"} className="bg-bg-subtle p-4 text-[14px]">
          Вміст вкладки «Дані».
        </TabPanel>
        <TabPanel idBase="demo-order" value="items" hidden={tab !== "items"} className="bg-bg-subtle p-4 text-[14px]">
          Вміст вкладки «Товари».
        </TabPanel>
        <TabPanel idBase="demo-order" value="history" hidden={tab !== "history"} className="bg-bg-subtle p-4 text-[14px]">
          Вміст вкладки «Історія».
        </TabPanel>
        <Row label="sm 32">
          <Tabs
            size="sm"
            label="Період"
            value={small}
            onChange={setSmall}
            items={[
              { key: "day", label: "День" },
              { key: "week", label: "Тиждень" },
              { key: "month", label: "Місяць" },
            ]}
          />
          <Button size="sm" variant="secondary">
            Поруч кнопка sm
          </Button>
        </Row>
        <Row label="LinkTabs">
          <LinkTabs
            label="Розділи каталогу"
            value="products"
            items={[
              { key: "products", label: "Товари", href: "/admin/ui-kit#tabs", count: 1248 },
              { key: "categories", label: "Категорії", href: "/admin/ui-kit#tabs", count: 64 },
              { key: "groups", label: "Групи цін", href: "/admin/ui-kit#tabs" },
            ]}
          />
          <Button variant="secondary">Поруч кнопка md</Button>
        </Row>
      </Sample>
    </Section>
  );
}

// The order list of the gallery: search, filter, sort and pages live in
// the address bar (useListParams) and are applied to the sample orders here.
function filterOrders(rows: DemoOrder[], q: string, status: string, sort: string): DemoOrder[] {
  const needle = q.trim().toLocaleLowerCase("uk");
  const filtered = rows.filter(
    (row) =>
      (!needle || `${row.number} ${row.company} ${row.city}`.toLocaleLowerCase("uk").includes(needle)) && (!status || row.status === status),
  );
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  const sorted = [...filtered].sort((a, b) => {
    const left = field === "total" ? a.total : field === "number" ? a.number : a.createdAt;
    const right = field === "total" ? b.total : field === "number" ? b.number : b.createdAt;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return desc ? sorted.reverse() : sorted;
}

const ORDER_COLUMNS: Column<DemoOrder>[] = [
  { key: "number", header: "Замовлення", sortKey: "number", cell: (o) => <TwoLineCell title={`№${o.number}`} subtitle={o.company} />, width: 280 },
  { key: "date", header: "Дата", sortKey: "createdAt", firstSort: "desc", cell: (o) => <DateCell value={o.createdAt} withTime /> },
  { key: "city", header: "Місто", hideBelow: 1024, cell: (o) => o.city },
  { key: "status", header: "Статус", cell: (o) => <OrderStatusBadge status={o.status} /> },
  { key: "payment", header: "Оплата", hideBelow: 1280, cell: (o) => <PaymentStatusBadge kind={o.payment} /> },
  { key: "items", header: "Позицій", align: "right", hideBelow: 640, cell: (o) => `${formatNumber(o.items)} шт.` },
  { key: "total", header: "Сума", align: "right", sortKey: "total", firstSort: "desc", cell: (o) => <MoneyCell value={o.total} /> },
  {
    key: "menu",
    header: <span className="sr-only">Дії</span>,
    interactive: true,
    width: 56,
    cell: (o) => (
      <KebabMenu
        size="sm"
        label={`Дії із замовленням №${o.number}`}
        items={[
          { key: "open", label: "Відкрити", href: "/admin/ui-kit#datatable" },
          { key: "ttn", label: "Створити накладну", icon: TruckIcon, onSelect: () => toast.success(`Накладну для №${o.number} створено`) },
          { key: "sep", divider: true },
          { key: "cancel", label: "Скасувати замовлення", tone: "danger", onSelect: () => toast.info("Це лише зразок") },
        ]}
      />
    ),
  },
];

// The state samples sit in half-width cards: no fixed widths there.
const STATE_COLUMNS: Column<DemoOrder>[] = ORDER_COLUMNS.slice(0, 4).map((column) => ({ ...column, width: undefined, hideBelow: undefined }));

export function DataTableDemo() {
  const list = useListParams({ defaults: { sort: "-createdAt", limit: "10" } });
  const [selected, setSelected] = useState<string[]>([]);
  const status = list.get("status");
  const rows = filterOrders(ORDERS, list.q, status, list.sort);
  const pageRows = rows.slice((list.page - 1) * list.limit, list.page * list.limit);
  const chips = [
    ...(list.q ? [{ key: "q", label: `Пошук: ${list.q}`, onRemove: () => list.set({ q: null }) }] : []),
    ...(status ? [{ key: "status", label: `Статус: ${ORDER_STATUS[status as OrderStatus]?.label ?? status}`, onRemove: () => list.set({ status: null }) }] : []),
  ];

  return (
    <>
      <Section id="datatable" title="DataTable, Pagination, FilterBar, useListParams" file="ui/DataTable.tsx, ui/Pagination.tsx, ui/FilterBar.tsx, ui/useListParams.ts" description="Таблиця з темною головою, сортуванням, вибором, посиланням на весь рядок і станами. Пошук, фільтр, сортування й сторінка живуть в адресі.">
        <FilterBar
          search={<SearchInput label="Пошук замовлень" value={list.q} onChange={(q) => list.set({ q })} placeholder="Номер, клієнт або місто" />}
          filters={
            <Select
              aria-label="Статус"
              value={status || null}
              onChange={(next) => list.set({ status: next })}
              clearable
              placeholder="Усі статуси"
              options={statusOptions(ORDER_STATUS)}
              className="w-[200px]"
            />
          }
          actions={
            <Button variant="secondary" iconLeft={ArrowDownTrayIcon} disabled={selected.length === 0} onClick={() => toast.success(`Експортуємо ${selected.length}`)}>
              Експорт вибраних
            </Button>
          }
          chips={chips}
          onReset={list.reset}
        />
        <DataTable
          caption="Замовлення"
          columns={ORDER_COLUMNS}
          rows={pageRows}
          rowKey={(o) => o.id}
          sort={list.sort}
          onSort={(sort) => list.set({ sort })}
          rowHref={() => "/admin/ui-kit#datatable"}
          selection={{ selected, onChange: setSelected }}
          minWidth={880}
          footer={
            <Pagination page={list.page} limit={list.limit} total={rows.length} onPage={(page) => list.set({ page })} onLimit={(limit) => list.set({ limit })} limits={[10, 20, 50]} />
          }
        />
        <Note>
          Вибрано: {selected.length}. Адреса: ?{list.queryString}
        </Note>
      </Section>

      <Section id="datatable-states" title="Стани таблиці" file="ui/DataTable.tsx" description="Завантаження, порожньо, помилка, застарілі дані, компактні рядки з onRowClick і клітинки-помічники.">
        <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
          <DataTable caption="Завантаження" columns={STATE_COLUMNS} rows={undefined} rowKey={(o) => o.id} loading />
          <DataTable caption="Порожньо" columns={STATE_COLUMNS} rows={[]} rowKey={(o) => o.id} />
          <DataTable caption="Помилка" columns={STATE_COLUMNS} rows={undefined} rowKey={(o) => o.id} error={DEMO_FAILURE} onRetry={() => toast.info("Пробуємо ще раз")} />
          <DataTable
            caption="Помилка оновлення"
            columns={STATE_COLUMNS}
            rows={ORDERS.slice(0, 3)}
            rowKey={(o) => o.id}
            stale
            error={DEMO_FAILURE}
            onRetry={() => toast.info("Пробуємо ще раз")}
          />
        </div>
        <DataTable
          caption="Товари"
          dense
          columns={[
            { key: "product", header: "Товар", cell: (p) => <ThumbCell src={p.image} alt="" title={p.name} subtitle={p.sku} /> },
            { key: "stock", header: "Залишок", align: "right", cell: (p) => `${formatNumber(p.stock)} шт.` },
            { key: "price", header: "Ціна", align: "right", cell: (p) => <MoneyCell value={p.price} /> },
            { key: "old", header: "Була", align: "right", hideBelow: 640, cell: (p) => <MoneyCell value={p.old} muted /> },
          ]}
          rows={[
            { id: "p1", name: "Шампунь 30 мл, флакон", sku: "BN-SH-30", stock: 12400, price: 4.2, old: 4.6, image: SAMPLE_IMAGES[0] },
            { id: "p2", name: "Мило 15 г, флоупак", sku: "BN-SOAP-15", stock: 38000, price: 2.85, old: 3.1, image: SAMPLE_IMAGES[1] },
            { id: "p3", name: "Рукавички нітрилові M, 100 шт.", sku: "BN-GL-M", stock: 0, price: 189, old: 205, image: null },
          ]}
          rowKey={(p) => p.id}
          onRowClick={(p) => toast.info(`Відкрили ${p.name}`)}
        />
      </Section>
    </>
  );
}

export function StatesDemo() {
  return (
    <Section id="states" title="EmptyState, ErrorState, LoadingBlock, NotFoundState, Forbidden" file="ui/States.tsx" description="Жоден стан не порожній: наступна дія, «Спробувати ще раз», до кого звернутися.">
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Card padding="none">
          <EmptyState
            title="Замовлень ще немає"
            text="Нові замовлення з'являться тут, щойно клієнт оформить їх на сайті."
            action={
              <Button size="sm" iconLeft={PlusIcon}>
                Створити замовлення
              </Button>
            }
          />
        </Card>
        <Card padding="none">
          <ErrorState failure={DEMO_FAILURE} onRetry={() => toast.info("Пробуємо ще раз")} />
        </Card>
        <Card padding="none">
          <LoadingBlock label="Завантажуємо замовлення" />
        </Card>
        <Card padding="none">
          <NotFoundState backHref="/admin/ui-kit#states" backLabel="До списку замовлень" />
        </Card>
      </div>
      <Note>Forbidden() - ціла сторінка для ролі без дозволу (з власною колонкою Page): її видно на будь-якій адресі розділу, до якого немає доступу.</Note>
    </Section>
  );
}

export function TimelineDemo() {
  return (
    <Section id="timeline" title="Timeline" file="ui/Timeline.tsx" description="Історія запису: крапка тону або значок, хто і коли.">
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Sample title="Історія замовлення">
          <Timeline
            items={[
              {
                id: "4",
                at: "2026-11-12T12:32:00Z",
                title: (
                  <>
                    Статус: <OrderStatusBadge status="shipped" />
                  </>
                ),
                actor: "Андрій Мельник",
                tone: "indigo",
                text: "ТТН 20450012345678, Нова Пошта",
              },
              { id: "3", at: "2026-11-11T09:05:00Z", title: "Оплату отримано", actor: "BAS", tone: "green", icon: <CheckCircleIcon /> },
              { id: "2", at: "2026-11-10T16:40:00Z", title: "Коментар менеджера", actor: "Олена Коваль", text: "Клієнт просить доставку до 12:00." },
              { id: "1", at: "2026-11-10T15:12:00Z", title: "Замовлення створено", actor: "ТОВ «Готель Дністер»", tone: "blue", icon: <ClipboardDocumentListIcon /> },
            ]}
          />
        </Sample>
        <Sample title="Порожня і з помилкою">
          <Timeline items={[]} />
          <Timeline items={[{ id: "x", at: "2026-11-09T10:00:00Z", title: "Обмін з BAS не вдався", tone: "red", icon: <XCircleIcon />, text: "Повтор о 10:15" }]} />
        </Sample>
      </div>
    </Section>
  );
}

function MapRow<K extends string>({ label, map, render }: { label: string; map: Record<K, { label: string }>; render: (key: K) => ReactNode }) {
  return (
    <Row label={label}>
      {(Object.keys(map) as K[]).map((key) => (
        <span key={key}>{render(key)}</span>
      ))}
    </Row>
  );
}

export function StatusDemo() {
  return (
    <Section id="status" title="Статуси" file="ui/status.tsx" description="Один словник станів для всієї панелі: мітка і тон кожного стану.">
      <Sample>
        <MapRow label="Замовлення" map={ORDER_STATUS} render={(key: OrderStatus) => <OrderStatusBadge status={key} />} />
        <MapRow label="Повернення" map={RETURN_STATUS} render={(key: ReturnStatus) => <ReturnStatusBadge status={key} />} />
        <MapRow label="Оплата" map={PAYMENT_STATUS} render={(key: PaymentStatus) => <PaymentStatusBadge kind={key} />} />
        <MapRow label="Заявки" map={LEAD_STATUS} render={(key: LeadStatus) => <LeadStatusBadge status={key} />} />
        <MapRow label="Тип заявки" map={LEAD_KIND} render={(key: LeadKind) => <LeadKindBadge kind={key} />} />
        <MapRow label="Блог" map={BLOG_STATUS} render={(key: BlogStatus) => <BlogStatusBadge status={key} />} />
        <MapRow label="Відправлення" map={SHIPMENT_STATUS} render={(key: ShipmentStatus) => <ShipmentStatusBadge status={key} />} />
        <MapRow label="BAS" map={ERP_STATE} render={(key: ErpState) => <ErpStateBadge state={key} />} />
        <MapRow label="Канал" map={CHANNEL} render={(key: Channel) => <ChannelBadge channel={key} />} />
        <MapRow label="Тип акаунта" map={ACCOUNT_TYPE} render={(key: AccountType) => <AccountTypeBadge type={key} />} />
        <Row label="Активність">
          <ActiveBadge active />
          <ActiveBadge active={false} />
          <OrderStatusBadge status="new" size="md" />
          <OrderStatusBadge status={"archived" as OrderStatus} />
        </Row>
      </Sample>
    </Section>
  );
}
