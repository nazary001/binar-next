"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShoppingCartIcon,
  TruckIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { LockClosedIcon } from "@heroicons/react/20/solid";
import { useState, type FormEvent } from "react";
import { describeDevice } from "../lib/device";
import { formatNumber, formatRelative } from "../lib/format";
import { useAddressParam, useMinWidth, useNow } from "../lib/hooks";
import { Badge } from "../ui/Badge";
import { BulkBar } from "../ui/BulkBar";
import { Button } from "../ui/Button";
import { AttentionItem, StatCard } from "../ui/Card";
import { DonutChart } from "../ui/charts/DonutChart";
import { CHART_COLORS } from "../ui/charts/scale";
import { Sparkline } from "../ui/charts/Sparkline";
import { Switch } from "../ui/Checkbox";
import { Combobox } from "../ui/Combobox";
import { DataTable, MoneyCell, TwoLineCell, type Column } from "../ui/DataTable";
import { FileField, type FileValue } from "../ui/media/FileField";
import { mediaErrorMessage, uploadMedia } from "../ui/media/upload";
import { DateRange } from "../ui/DateInput";
import { Drawer } from "../ui/Drawer";
import { KebabMenu } from "../ui/DropdownMenu";
import { FilterBar, TogglePill } from "../ui/FilterBar";
import { FormActions } from "../ui/Form";
import { Input, NumberInput, SearchInput, Textarea } from "../ui/Input";
import { CopyButton, KeyValueList } from "../ui/KeyValue";
import { OneTimeSecret } from "../ui/OneTimeSecret";
import { PageSection } from "../ui/Page";
import { PeriodFilter } from "../ui/PeriodFilter";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { OrderStatusBadge, PaymentStatusBadge } from "../ui/status";
import { LinkTabs, Tabs } from "../ui/Tabs";
import { TagInput } from "../ui/TagInput";
import { toast } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { CITIES, COMPANIES, ORDERS, WEEKS, type DemoOrder } from "./demoData";
import { Note, Row, Sample, Section } from "./parts";

// The gallery's samples of what wave 3 added to the kit (the gaps the
// screen builders had to work around): each new prop and component in its
// states, next to the section of the file it belongs to.

// --- DataTable ------------------------------------------------------------------------

const WIDE_COLUMNS: Column<DemoOrder>[] = [
  { key: "number", header: "Замовлення", cell: (o) => `№${o.number}` },
  {
    key: "company",
    header: "Клієнт (fill)",
    fill: true,
    cell: (o) => <TwoLineCell title={`${o.company}, ${o.city}, менеджер ${o.manager}`} subtitle={o.manager} />,
    title: (o) => o.company,
  },
  { key: "city", header: "Місто (maxWidth 96)", maxWidth: 96, cell: (o) => `${o.city}, відділення №${o.items}` },
  { key: "status", header: "Статус", hideBelow: 768, cell: (o) => <OrderStatusBadge status={o.status} /> },
  { key: "payment", header: "Оплата 1360+", hideBelow: 1360, cell: (o) => <PaymentStatusBadge kind={o.payment} /> },
  { key: "manager", header: "Менеджер 1440+", hideBelow: 1440, cell: (o) => o.manager },
  { key: "items", header: "Позицій 1536+", align: "right", hideBelow: 1536, cell: (o) => `${formatNumber(o.items)} шт.` },
  { key: "total", header: "Сума", align: "right", cell: (o) => <MoneyCell value={o.total} /> },
];

const ROLE_OPTIONS = [
  { value: "manager", label: "Менеджер" },
  { value: "accountant", label: "Бухгалтер" },
  { value: "viewer", label: "Перегляд" },
];

export function DataTableMoreDemo() {
  const [opened, setOpened] = useState(0);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const rows = ORDERS.slice(0, 4);
  return (
    <Section
      id="datatable-more"
      title="DataTable: колонки, розгортання, позначений рядок"
      file="ui/DataTable.tsx"
      description="hideBelow до 1680, fill і maxWidth з трикрапкою, рядки, що розгортаються, позначений рядок, onRowClick, що не чує шарів із клітинок, і голова без «вибрати всі» на порожній таблиці."
    >
      <DataTable caption="Колонки за шириною" columns={WIDE_COLUMNS} rows={rows} rowKey={(o) => o.id} rowHref={() => "/admin/ui-kit#datatable-more"} markedKey={rows[1].id} />
      <Note>
        Колонка «Клієнт» забирає вільне місце й обрізає текст, «Місто» обрізається на 96 px, решта ховаються під 768 / 1360 / 1440 / 1536 px. Другий рядок
        позначено (markedKey): так показують запис, на який вказує адреса.
      </Note>

      <DataTable
        caption="Журнал з подробицями"
        columns={[
          { key: "number", header: "Замовлення", cell: (o) => <TwoLineCell title={`№${o.number}`} subtitle={o.company} /> },
          { key: "status", header: "Статус", cell: (o) => <OrderStatusBadge status={o.status} /> },
          { key: "total", header: "Сума", align: "right", hideBelow: 640, cell: (o) => <MoneyCell value={o.total} /> },
        ]}
        rows={rows}
        rowKey={(o) => o.id}
        defaultExpanded={[rows[0].id]}
        renderExpanded={(o) =>
          o.id === rows[3].id ? null : (
            <KeyValueList
              columns={3}
              dense
              items={[
                { label: "Клієнт", value: o.company },
                { label: "Місто", value: o.city },
                { label: "Менеджер", value: o.manager },
                { label: "Позицій", value: `${formatNumber(o.items)} шт.` },
              ]}
            />
          )
        }
      />
      <Note>renderExpanded: шеврон у кінці рядка (Enter, пробіл), натискання на рядок теж відкриває; останній рядок без подробиць - без шеврона.</Note>

      <DataTable
        caption="Рядки з діями"
        dense
        columns={[
          { key: "number", header: "Замовлення", cell: (o) => `№${o.number}` },
          {
            key: "role",
            header: "Роль",
            interactive: true,
            cell: (o) => (
              <Select
                aria-label={`Роль для №${o.number}`}
                size="sm"
                value={roles[o.id] ?? null}
                onChange={(role) => setRoles((current) => ({ ...current, [o.id]: role ?? "" }))}
                options={ROLE_OPTIONS}
                placeholder="Оберіть"
                className="w-40"
              />
            ),
          },
          {
            key: "menu",
            header: <span className="sr-only">Дії</span>,
            interactive: true,
            width: 56,
            cell: (o) => (
              <KebabMenu
                size="sm"
                label={`Дії із замовленням №${o.number}`}
                items={[{ key: "ttn", label: "Створити накладну", icon: TruckIcon, onSelect: () => toast.success(`Накладну для №${o.number} створено`) }]}
              />
            ),
          },
        ]}
        rows={rows.slice(0, 2)}
        rowKey={(o) => o.id}
        onRowClick={() => setOpened((value) => value + 1)}
      />
      <Note>
        Рядок відкрито: <span data-probe="row-opened">{opened}</span> раз. Вибір у списку ролі чи пункт меню рядок не відкривають (події з порталу не на рядку).
      </Note>

      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <DataTable
          caption="Порожньо з вибором"
          columns={WIDE_COLUMNS.slice(0, 2)}
          rows={[]}
          rowKey={(o) => o.id}
          selection={{ selected, onChange: setSelected }}
        />
        <DataTable
          caption="Завантаження з вибором"
          columns={WIDE_COLUMNS.slice(0, 2)}
          rows={undefined}
          loading
          rowKey={(o) => o.id}
          selection={{ selected, onChange: setSelected }}
        />
      </div>
      <Note>На порожній або завантажуваній сторінці в голові немає поля «вибрати всі».</Note>

      <DataTable
        caption="Посилання в першій видимій колонці"
        columns={[
          { key: "number", header: "Номер (з 640)", hideBelow: 640, cell: (o) => `№${o.number}` },
          { key: "company", header: "Клієнт", cell: (o) => o.company },
          { key: "total", header: "Сума", align: "right", cell: (o) => <MoneyCell value={o.total} /> },
        ]}
        rows={rows.slice(0, 2)}
        rowKey={(o) => o.id}
        rowHref={(o) => `/admin/ui-kit?row=${o.id}#datatable-more`}
      />
      <Note>Перша колонка ховається на телефоні, тому посилання рядка лежить у «Клієнт» і рядок відкривається на будь-якій ширині.</Note>
    </Section>
  );
}

// --- FilterBar, TogglePill, PeriodFilter, BulkBar, useListParams exclude ----------------

export function FiltersMoreDemo() {
  const list = useListParams({ defaults: { limit: "10" }, keep: ["kitprobe"], exclude: ["drawer"] });
  const drawer = useAddressParam("drawer");
  const [layout, setLayout] = useState<"auto" | "fill" | "grid">("fill");
  const [promo, setPromo] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [archived, setArchived] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [manager, setManager] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([ORDERS[0].id, ORDERS[2].id]);
  const [busy, setBusy] = useState(false);
  const from = list.get("from");
  const to = list.get("to");
  return (
    <Section
      id="filters-more"
      title="FilterBar, TogglePill, PeriodFilter, BulkBar"
      file="ui/FilterBar.tsx, ui/PeriodFilter.tsx, ui/BulkBar.tsx, ui/useListParams.ts"
      description="Фільтри на всю ширину на телефоні, другий ряд перемикачів, кнопка періоду з календарем і панель дій для вибраних рядків."
    >
      <Sample tone="slab" className="bg-bg-cabinet">
        <SegmentedControl
          label="filtersLayout"
          value={layout}
          onChange={setLayout}
          size="sm"
          options={[
            { value: "auto", label: "auto" },
            { value: "fill", label: "fill" },
            { value: "grid", label: "grid" },
          ]}
        />
        <FilterBar
          search={<SearchInput label="Пошук у зразку фільтрів" value={list.get("fq")} onChange={(fq) => list.set({ fq })} placeholder="Номер, клієнт або місто" />}
          filtersLayout={layout}
          filters={
            <>
              <div className="min-[640px]:w-[180px]">
                <Select aria-label="Місто" value={city} onChange={setCity} clearable placeholder="Усі міста" options={CITIES.map((item) => ({ value: item, label: item }))} />
              </div>
              <div className="min-[640px]:w-[200px]">
                <Select aria-label="Клієнт" value={manager} onChange={setManager} clearable placeholder="Усі клієнти" options={COMPANIES.map((item) => ({ value: item, label: item }))} />
              </div>
              <PeriodFilter label="Період замовлень" fieldLabel="Дата замовлення" from={from} to={to} onChange={(range) => list.set({ from: range.from, to: range.to })} />
            </>
          }
          actions={
            <Button variant="secondary" iconLeft={ArrowDownTrayIcon} href="/api/admin/orders/export?limit=1" download>
              Експорт CSV
            </Button>
          }
          secondary={
            <>
              <div role="group" aria-label="Швидкі фільтри" className="flex flex-wrap gap-1.5">
                <TogglePill label="Акція" pressed={promo} onToggle={() => setPromo((value) => !value)} />
                <TogglePill label="Чекають" pressed={waiting} onToggle={() => setWaiting((value) => !value)} count={7} countTone="brand" />
                <TogglePill label="Без накладної" pressed={false} onToggle={() => toast.info("Це лише зразок")} count={12} />
                <TogglePill label="Вимкнено" pressed={false} onToggle={() => {}} disabled />
              </div>
              <div className="ml-auto">
                <Switch size="sm" label="Архів" checked={archived} onChange={setArchived} />
              </div>
            </>
          }
          chips={from || to ? [{ key: "period", label: "Період", onRemove: () => list.set({ from: null, to: null }) }] : []}
          onReset={() => list.set({ from: null, to: null, fq: null })}
        />
        <Row label="TogglePill md">
          <TogglePill size="md" label="Нові" pressed onToggle={() => {}} count={3} />
          <TogglePill size="md" label="Усі" pressed={false} onToggle={() => {}} />
        </Row>
        <Row label="PeriodFilter">
          <PeriodFilter from="" to="" onChange={() => {}} />
          <PeriodFilter from="2026-11-01" to="2026-11-12" onChange={() => {}} />
          <PeriodFilter from="2026-11-12" to="2026-11-12" onChange={() => {}} />
          <PeriodFilter from="2026-11-01" to="" onChange={() => {}} disabled />
        </Row>
        <Note>
          useListParams exclude: ?drawer не входить у ключ запиту. queryString: <span data-probe="list-query">{list.queryString}</span>; drawer:{" "}
          <span data-probe="drawer-param">{drawer.value ?? "-"}</span>
        </Note>
        <Row>
          <Button size="sm" variant="secondary" onClick={() => drawer.open("42")}>
            Відкрити ?drawer=42
          </Button>
          <Button size="sm" variant="ghost" onClick={drawer.clear}>
            Закрити (clear)
          </Button>
        </Row>
      </Sample>

      <Sample title="BulkBar" className="pb-6">
        <p className={TEXT.muted}>Вибрано рядки в таблиці: панель тримається внизу вікна, тости піднімаються над нею.</p>
        <Row>
          <Button size="sm" variant="secondary" onClick={() => setSelected(selected.length ? [] : [ORDERS[0].id, ORDERS[2].id])}>
            {selected.length ? "Зняти вибір" : "Вибрати два"}
          </Button>
        </Row>
        <BulkBar count={selected.length} label={`Вибрано ${selected.length} замовлення`} onClear={() => setSelected([])} region="Дії з вибраними замовленнями">
          <Button
            size="sm"
            variant="secondary"
            loading={busy}
            onClick={() => {
              setBusy(true);
              window.setTimeout(() => {
                setBusy(false);
                toast.success("Статус змінено для вибраних");
              }, 900);
            }}
          >
            Змінити статус
          </Button>
          <Button size="sm" variant="dangerGhost" disabled={busy} onClick={() => toast.error("Не вдалося скасувати: це лише зразок")}>
            Скасувати замовлення
          </Button>
        </BulkBar>
      </Sample>
    </Section>
  );
}

// --- Forms --------------------------------------------------------------------------------

const BRANDS = ["Binar", "Hotel Line", "Eco Clean", "Dr. Clean", "Sante"];

function searchBrands(query: string): Promise<string[]> {
  const needle = query.trim().toLocaleLowerCase("uk");
  return Promise.resolve(BRANDS.filter((brand) => brand.toLocaleLowerCase("uk").includes(needle)));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormsMoreDemo() {
  const [seo, setSeo] = useState("Шампунь для готелів 30 мл");
  const [lede, setLede] = useState("Кілька речень, що вводять у тему статті: для кого вона і що читач дізнається.");
  const [heading, setHeading] = useState("");
  const [quantity, setQuantity] = useState<number | null>(120);
  const [threshold, setThreshold] = useState<number | null>(10);
  const [submitted, setSubmitted] = useState<string>("-");
  const [brand, setBrand] = useState<string | null>("Binar");
  const [rubrics, setRubrics] = useState(["Новини", "Поради", "Кейси", "Огляди"]);
  const [emails, setEmails] = useState(["sales@binar.ua", "orders@binar", "office@binar.ua"]);
  const [locked, setLocked] = useState(true);
  const [status, setStatus] = useState<"new" | "inWork" | "done" | "spam">("inWork");
  const [view, setView] = useState<"list" | "grid">("list");
  const [range, setRange] = useState({ from: "", to: "" });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(threshold === null ? "порожньо" : String(threshold));
  };

  return (
    <Section
      id="forms-more"
      title="Форми: нові можливості"
      file="ui/Input.tsx, ui/Field.tsx, ui/Combobox.tsx, ui/TagInput.tsx, ui/Checkbox.tsx, ui/SegmentedControl.tsx, ui/Button.tsx"
      description="Лічильник у полі, поверхня для письма, Enter у числовому полі, вільний текст у комбобоксі, порядок і помилкові чипи, підказка до перемикача, сегменти."
    >
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Sample title="Input showCount, Field optional">
          <Input label="SEO-заголовок" optional value={seo} onChange={setSeo} maxLength={60} showCount hint="Те, що видно в пошуку" />
          <Input label="Без ліміту" value={seo} onChange={setSeo} showCount />
        </Sample>
        <Sample title='Textarea variant="bare"'>
          <Textarea variant="bare" aria-label="Заголовок розділу" value={heading} onChange={setHeading} placeholder="Заголовок розділу" textClassName="text-[20px] font-bold leading-[26px] tracking-[-0.02em]" />
          <Textarea variant="bare" aria-label="Вступний абзац" value={lede} onChange={setLede} textClassName="text-[16px] leading-6" />
          <div className="rounded-2xl bg-bg-subtle px-4 py-3">
            <Textarea variant="bare" surface="tint" aria-label="Цитата" value="Цитата на сірій плитці (surface tint)." onChange={() => {}} textClassName="text-[15px] italic leading-6" />
          </div>
          <Textarea variant="bare" aria-label="З помилкою" value="Текст із помилкою" onChange={() => {}} error textClassName="text-[15px] leading-6" />
        </Sample>
      </div>

      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Sample title="NumberInput: Enter і обмеження">
          <form onSubmit={submit} noValidate className="flex flex-col gap-3" data-probe="number-form">
            <NumberInput label="Поріг, 1-300" value={threshold} onChange={setThreshold} min={1} max={300} hint="Введіть 400 і натисніть Enter" />
            <Note>
              Форма отримала: <span data-probe="number-submitted">{submitted}</span>
            </Note>
            <div>
              <Button type="submit" size="sm">
                Зберегти
              </Button>
            </div>
          </form>
          <NumberInput label="Без нотатки (clampNote false)" value={quantity} onChange={setQuantity} min={1} max={500} clampNote={false} stepper />
        </Sample>
        <Sample title="Combobox freeText, TagInput reorderable / invalidTag">
          <Combobox<string>
            label="Бренд"
            value={brand}
            onChange={setBrand}
            search={searchBrands}
            getKey={(item) => item}
            getLabel={(item) => item}
            freeText={(text) => text}
            clearable
            debounceMs={0}
            hint="Новий бренд можна просто ввести"
          />
          <Note>
            Значення: <span data-probe="brand-value">{brand ?? "-"}</span>
          </Note>
          <TagInput label="Рубрики (порядок важливий)" value={rubrics} onChange={setRubrics} reorderable max={20} />
          <TagInput
            label="Кому надсилати"
            value={emails}
            onChange={setEmails}
            invalidTag={(tag) => (EMAIL.test(tag) ? false : "Це не схоже на e-mail")}
            error={emails.some((tag) => !EMAIL.test(tag)) ? "Виправте позначені адреси" : undefined}
          />
        </Sample>
      </div>

      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Sample title="Switch tooltip, SegmentedControl">
          <Switch
            size="sm"
            checked={locked}
            onChange={setLocked}
            label={<span className="text-[13px] leading-[18px]">Лише для авторизованих</span>}
            tooltip="Файл завантажують лише партнери, що увійшли в кабінет"
          />
          <p className={TEXT.caption}>fill, два ряди під 480 px</p>
          <SegmentedControl
            label="Статус заявки"
            value={status}
            onChange={setStatus}
            fill
            twoRowsBelow={480}
            options={[
              { value: "new", label: "Нова", tone: "blue" },
              { value: "inWork", label: "В роботі", tone: "amber" },
              { value: "done", label: "Опрацьована", tone: "green" },
              { value: "spam", label: "Спам", tone: "neutral" },
            ]}
          />
          <Row label="inline, sm">
            <SegmentedControl
              label="Вигляд"
              value={view}
              onChange={setView}
              size="sm"
              options={[
                { value: "list", label: "Список" },
                { value: "grid", label: "Плитки" },
              ]}
            />
            <SegmentedControl label="Вимкнено" value="a" onChange={() => {}} disabled options={[{ value: "a", label: "Так" }, { value: "b", label: "Ні" }]} />
          </Row>
        </Sample>
        <Sample title="Button download / plain, DateRange">
          <Row>
            <Button variant="secondary" iconLeft={ArrowDownTrayIcon} href="/api/admin/orders/export?limit=1" download="zamovlennya.csv">
              Завантажити CSV
            </Button>
            <Button variant="secondary" iconLeft={PhoneIcon} href="tel:+380671234567">
              Подзвонити
            </Button>
            <Button variant="ghost" iconLeft={EnvelopeIcon} href="mailto:sales@binar.ua">
              Написати
            </Button>
          </Row>
          <DateRange label="Період (останній діапазон усередині)" from={range.from} to={range.to} onChange={setRange} presets clearable />
        </Sample>
      </div>
    </Section>
  );
}

// --- FileField onUploadingChange, uploadMedia onProgress ------------------------------------

export function UploadMoreDemo() {
  const [file, setFile] = useState<FileValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [sent, setSent] = useState<string>("-");

  const send = async (picked: File | undefined) => {
    if (!picked) return;
    setProgress(0);
    setSent("-");
    const result = await uploadMedia(picked, { folder: "materials", access: "private", prepare: false, onProgress: setProgress });
    setProgress(null);
    setSent(result.ok ? result.data.media.id : mediaErrorMessage(result));
  };

  return (
    <Section
      id="upload-more"
      title="FileField onUploadingChange, uploadMedia onProgress"
      file="ui/media/FileField.tsx, ui/media/upload.ts, lib/api.ts"
      description="Форма знає, що файл ще вантажиться, і не зберігає запис без нього; надсилання показує, скільки вже пішло, і так само веде на вхід, якщо сесія скінчилася."
    >
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Sample title="FileField">
          <FileField label="Договір" folder="materials" access="private" accept=".pdf" value={file} onChange={setFile} onUploadingChange={setBusy} />
          <Row>
            <Button size="sm" disabled={busy} onClick={() => toast.success("Документ збережено")}>
              Зберегти документ
            </Button>
          </Row>
          <Note>
            Вантажиться: <span data-probe="file-busy">{busy ? "так" : "ні"}</span>; файл: <span data-probe="file-id">{file?.mediaId ?? "-"}</span>
          </Note>
        </Sample>
        <Sample title="uploadMedia з onProgress">
          <label className="flex h-10 w-fit cursor-pointer items-center rounded-full border border-neutral-800 px-4 text-[14px] font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2">
            Обрати файл
            <input
              type="file"
              accept=".pdf"
              className="sr-only"
              data-probe="progress-input"
              onChange={(event) => {
                void send(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle" role="progressbar" aria-label="Надіслано" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress === null ? undefined : Math.round(progress * 100)}>
            <div className="h-full rounded-full bg-neutral-900 transition-[width] duration-200" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
          </div>
          <Note>
            Результат: <span data-probe="progress-result">{sent}</span>
          </Note>
        </Sample>
      </div>
    </Section>
  );
}

// --- OneTimeSecret, CopyButton ----------------------------------------------------------

export function SecretDemo() {
  return (
    <Section id="secret" title="OneTimeSecret, CopyButton" file="ui/OneTimeSecret.tsx, ui/KeyValue.tsx" description="Логін, e-mail і пароль чи ключ, показані один раз, з кнопками копіювання; кнопка копіювання трьох розмірів.">
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Sample title="Новий акаунт">
          <OneTimeSecret
            items={[
              { label: "Логін", value: "0500000011" },
              { label: "Пароль", value: "Kx7#mPq2!vR9wZ4t", secret: true },
            ]}
          />
        </Sample>
        <Sample title="Новий працівник">
          <OneTimeSecret
            items={[
              { label: "Адреса для входу", value: "https://binar.ua/admin/login" },
              { label: "E-mail", value: "olena.koval@binar.ua" },
              { label: "Тимчасовий пароль", value: "Hb4@xN8s=Qe3Lm7c", secret: true, copyLabel: "Пароль" },
            ]}
            steps={["Людина відкриває адресу для входу і вводить свій e-mail та тимчасовий пароль.", "Панель одразу попросить задати власний пароль."]}
          />
        </Sample>
      </div>
      <Sample title="CopyButton size">
        <Row>
          <span className="inline-flex items-center gap-1 text-[14px]">
            sm 28 <CopyButton text="20450012345678" label="ТТН" />
          </span>
          <span className="inline-flex items-center gap-1 text-[14px]">
            md 32 <CopyButton text="20450012345678" label="ТТН" size="md" />
          </span>
          <span className="inline-flex items-center gap-1 text-[14px]">
            lg 40 <CopyButton text="+380671234567" label="Телефон" size="lg" />
          </span>
        </Row>
      </Sample>
    </Section>
  );
}

// --- Tabs -----------------------------------------------------------------------------------

const PERIODS = [
  { key: "today", label: "Сьогодні" },
  { key: "7d", label: "7 днів" },
  { key: "30d", label: "30 днів" },
  { key: "90d", label: "90 днів" },
  { key: "all", label: "Увесь час" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

export function TabsMoreDemo() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [tab, setTab] = useState<"main" | "prices" | "seo" | "media">("seo");
  return (
    <Section
      id="tabs-more"
      title="Tabs: відкрита у полі зору, позначки, compactBelow"
      file="ui/Tabs.tsx"
      description="Капсула, що прокручується вбік, сама показує відкриту вкладку; вкладку з помилками позначено крапкою; під 640 px капсула стає списком."
    >
      <Sample>
        <Row label="позначки">
          <Tabs
            label="Розділи товару"
            value={tab}
            onChange={setTab}
            items={[
              { key: "main", label: "Основне" },
              { key: "prices", label: "Ціни", mark: "є помилки" },
              { key: "seo", label: "SEO", mark: true },
              { key: "media", label: "Медіа", mark: "потребує уваги", markTone: "brand" },
            ]}
          />
        </Row>
        <Row label="compactBelow 640">
          <Tabs<PeriodKey> label="Період" value={period} onChange={setPeriod} compactBelow={640} items={PERIODS.map((item) => ({ key: item.key, label: item.label }))} />
        </Row>
        <Row label="вузька капсула">
          <div className="w-[260px] max-w-full" data-probe="narrow-tabs">
            <LinkTabs
              label="Статус відправлень"
              value="refused"
              items={[
                { key: "all", label: "Усі", href: "/admin/ui-kit#tabs-more", count: 48 },
                { key: "created", label: "Створено", href: "/admin/ui-kit#tabs-more", count: 12 },
                { key: "transit", label: "В дорозі", href: "/admin/ui-kit#tabs-more", count: 21 },
                { key: "arrived", label: "Прибули", href: "/admin/ui-kit#tabs-more", count: 9 },
                { key: "refused", label: "Проблемні", href: "/admin/ui-kit#tabs-more", count: 6 },
              ]}
            />
          </div>
        </Row>
      </Sample>
    </Section>
  );
}

// --- Cards, Badge, captionLight, PageSection, DonutChart ---------------------------------

const TREND = WEEKS.map((week) => week.revenue);

export function CardsMoreDemo() {
  return (
    <Section
      id="cards-more"
      title="StatCard size і trend, AttentionItem wrap, Badge icon, PageSection, DonutChart fit"
      file="ui/Card.tsx, ui/Badge.tsx, ui/tokens.ts, ui/Page.tsx, ui/charts/DonutChart.tsx"
      description="Менша цифра для п'яти плиток у ряд, лінія тренду на плитці, заголовок у два рядки, значок у пігулці, легший підпис."
    >
      <div className="grid min-w-0 grid-cols-2 gap-3 min-[640px]:gap-4 xl:grid-cols-5">
        <StatCard
          className="col-span-2"
          label="Виручка за 30 днів"
          value="1 284 300 ₴"
          delta={{ value: 12.4 }}
          hint="попередні 30 днів: 1 142 000 ₴"
          icon={<BanknotesIcon />}
          href="/admin/ui-kit#cards-more"
          trend={<Sparkline values={TREND} width={150} height={56} color="#ffffff" label="Виручка по тижнях" />}
        />
        <StatCard size="sm" tone="white" label="Замовлення" value="1 248" delta={{ value: -6 }} icon={<ShoppingCartIcon />} />
        <StatCard size="sm" tone="white" label="Середній чек" value="12 840 ₴" icon={<BanknotesIcon />} />
        <StatCard size="sm" tone="white" label="Нові клієнти" value="38" delta={{ value: 0 }} icon={<UserPlusIcon />} />
      </div>
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-3">
        <div className="flex min-w-0 flex-col rounded-3xl bg-white px-2 py-2">
          <AttentionItem icon={<ArrowPathIcon />} title="Повернення чекають рішення менеджера" text="wrap: заголовок у два рядки" count={4} wrap href="/admin/ui-kit#cards-more" />
          <AttentionItem icon={<ArrowPathIcon />} title="Повернення чекають рішення менеджера" text="без wrap: обрізано" count={4} href="/admin/ui-kit#cards-more" />
        </div>
        <Sample title="Badge icon, TEXT.captionLight">
          <Row>
            <Badge tone="neutral" icon={<LockClosedIcon />}>
              Приватний
            </Badge>
            <Badge tone="amber" size="md" icon={<LockClosedIcon />}>
              Лише для партнерів
            </Badge>
            <Badge tone="green" dot>
              Оплачено
            </Badge>
          </Row>
          <div className="flex flex-col">
            <span className={TEXT.body}>Андрій Мельник</span>
            <span className={TEXT.caption}>caption: 5 хв тому</span>
            <span className={TEXT.captionLight}>captionLight: 5 хв тому</span>
          </div>
        </Sample>
        <Sample title="DonutChart fit container">
          <DonutChart
            fit="container"
            size={140}
            label="Замовлення за каналами"
            centerValue="1 248"
            centerLabel="замовлень"
            data={[
              { label: "Партнери B2B", value: 812, color: CHART_COLORS[0] },
              { label: "Роздріб", value: 436, color: CHART_COLORS[1] },
            ]}
          />
        </Sample>
      </div>
      <div className="rounded-3xl bg-white p-5 min-[1024px]:p-6">
        <PageSection
          title="Договори"
          description="Довгий опис секції більше не зсуває дії під себе: блок заголовка забирає вільне місце, а опис переноситься поруч із кнопками праворуч."
          actions={
            <Button size="sm" variant="secondary">
              Додати договір
            </Button>
          }
        >
          <DonutChart
            fit="container"
            size={140}
            label="Широкий контейнер"
            data={[
              { label: "Готелі", value: 40, color: CHART_COLORS[0] },
              { label: "Хостели", value: 25, color: CHART_COLORS[1] },
              { label: "СПА", value: 12, color: CHART_COLORS[2] },
            ]}
          />
        </PageSection>
      </div>
    </Section>
  );
}

// --- Layers: Drawer focus, FormActions idle, toasts over bars, hooks --------------------

const SAMPLE_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

export function LayersMoreDemo() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const dirty = comment !== "";
  const wide = useMinWidth(1440);
  const now = useNow(5000);
  const openDrawer = () => {
    setLoaded(false);
    setOpen(true);
    // The record "arrives" a moment later, as from a request by ?id.
    window.setTimeout(() => setLoaded(true), 1200);
  };
  return (
    <Section
      id="layers-more"
      title="Drawer з даними, що вантажаться, FormActions idle, тости над панеллю, хуки"
      file="ui/Drawer.tsx, ui/overlay.ts, ui/Form.tsx, ui/Toast.tsx, lib/hooks.ts"
      description="Поки тіло вантажиться, фокус на самій панелі (без кільця на хрестику), потім на першому полі. Тости піднімаються над липкою панеллю збереження."
    >
      <Sample>
        <Row>
          <Button variant="secondary" onClick={openDrawer}>
            Відкрити запис, що вантажиться
          </Button>
          <Button variant="secondary" onClick={() => toast.error("Не вдалося зберегти: перевірте поля")}>
            Показати помилку
          </Button>
        </Row>
        <Note>
          useMinWidth(1440): <span data-probe="min-width">{wide ? "так" : "ні"}</span>; useNow(5000): <span data-probe="now">{now ? formatRelative(new Date(now - 60_000).toISOString(), now) : "ще не відомо"}</span>
        </Note>
        <Note>
          describeDevice: <span data-probe="device">{describeDevice(SAMPLE_AGENT).label}</span>
        </Note>
      </Sample>
      <Drawer open={open} onClose={() => setOpen(false)} title="Заявка №318" description="Надійшла з форми «Співпраця»">
        {loaded ? (
          <div className="flex flex-col gap-4">
            <Input label="Нотатка менеджера" value={note} onChange={setNote} placeholder="Що домовилися" />
            <p className={TEXT.muted}>Фокус перейшов на поле, бо ви його не переміщали, поки запис вантажився.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-loading="true">
            <Skeleton className="h-10 w-full" shape="pill" />
            <SkeletonText lines={3} />
          </div>
        )}
      </Drawer>
      <Sample>
        <Input label="Коментар до замовлення" value={comment} onChange={setComment} placeholder="Почніть вводити, і панель збереження розгорнеться" />
      </Sample>
      <FormActions sticky idle={!dirty} status={dirty ? "Є незбережені зміни" : "Усі зміни збережено"}>
        <Button variant="secondary" disabled={!dirty} onClick={() => setComment("")}>
          Скасувати
        </Button>
        <Button
          disabled={!dirty}
          onClick={() => {
            setComment("");
            toast.success("Зміни збережено");
          }}
        >
          Зберегти зміни
        </Button>
      </FormActions>
      <Note>idle: коли зберігати нічого, на телефоні панель займає один рядок статусу.</Note>
    </Section>
  );
}
