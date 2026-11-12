"use client";

import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { cx, formatDateTime, formatNumber, qs } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { OUTBOX_KIND_LABELS, type OutboxKind } from "../mail/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { DataTable, DateCell, TwoLineCell, type Column } from "../ui/DataTable";
import { DateRange } from "../ui/DateInput";
import { Drawer } from "../ui/Drawer";
import { FilterBar } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { KeyValueList, type KeyValueItem } from "../ui/KeyValue";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { EmptyState } from "../ui/States";
import { TEXT, type Tone } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import {
  BAS_ENTITIES,
  BAS_ENTITY_LABELS,
  EXCHANGE_ACTION_LABELS,
  EXCHANGE_STATUS_LABELS,
  EXCHANGE_SYSTEM_LABELS,
  type BasEntity,
  type ExchangeAction,
  type ExchangeCounts,
  type ExchangeLogDto,
  type ExchangeStatus,
  type ExchangeSystem,
  type ListAnswer,
} from "./types";

// The journal of the exchanges (GET /api/admin/integrations/log): every
// call BAS made to the site, every write call to Nova Poshta and every
// delivery attempt of a mail. Used three times: the last rows on the hub
// (compact), the whole journal (/admin/integrations/log) and the "Журнал"
// tab of BAS (system fixed). A row opens its details in a drawer, with the
// rows of a batch that failed.

// --- wording ---------------------------------------------------------------------------

const NP_ENTITY_LABELS: Record<string, string> = {
  waybill: "Накладна",
  counterparty: "Одержувач",
  address: "Адреса доставки",
  directory: "Довідники міст і відділень",
  tracking: "Відстеження посилок",
  label: "Друк накладної",
  estimate: "Розрахунок вартості",
  sender: "Відправник і ключ",
};

const MAIL_ENTITY_LABELS: Record<string, string> = { message: "Лист", test: "Тестовий лист" };

const STATUS_TONE: Record<ExchangeStatus, Tone> = { ok: "green", partial: "amber", error: "red" };

const ACTOR_KIND: Record<string, string> = {
  integration: "ключ доступу",
  staff: "співробітник",
  system: "система",
  customer: "клієнт",
};

// "BAS -> сайт": who handed data to whom, from the site's point of view.
export function directionLabel(system: ExchangeSystem, direction: "in" | "out"): string {
  if (system === "bas") return direction === "in" ? "BAS -> сайт" : "сайт -> BAS";
  if (system === "nova-poshta") return direction === "in" ? "Нова Пошта -> сайт" : "сайт -> Нова Пошта";
  return direction === "in" ? "сервіс пошти -> сайт" : "сайт -> сервіс пошти";
}

export function entityLabel(row: Pick<ExchangeLogDto, "system" | "entity" | "action">): string {
  if (row.system === "bas") return BAS_ENTITY_LABELS[row.entity as BasEntity] ?? row.entity;
  if (row.system === "nova-poshta") return NP_ENTITY_LABELS[row.entity] ?? row.entity;
  if (row.entity === "message") return OUTBOX_KIND_LABELS[row.action as OutboxKind] ?? MAIL_ENTITY_LABELS.message;
  return MAIL_ENTITY_LABELS[row.entity] ?? row.entity;
}

// The carrier's methods in words (the method itself stays in the drawer's hint).
const NP_ACTION_LABELS: Record<string, string> = {
  "InternetDocument.save": "Створення накладної",
  "InternetDocument.delete": "Видалення накладної",
  "Counterparty.save": "Запис одержувача",
  "Address.save": "Запис адреси доставки",
  "Counterparty.getCounterparties": "Список відправників",
  "Counterparty.getCounterpartyContactPersons": "Контактні особи відправника",
  "TrackingDocument.getStatusDocuments": "Перевірка статусів посилок",
};

function actionLabel(row: ExchangeLogDto): string {
  if (row.system === "bas") return EXCHANGE_ACTION_LABELS[row.action as ExchangeAction] ?? row.action;
  if (row.system === "mail") return row.entity === "test" ? "Перевірка сервісу" : "Надсилання";
  return NP_ACTION_LABELS[row.action] ?? "Запит до Нової Пошти";
}

// The journal keeps "<HTTP status> <code>" for a refused call; staff read
// the sentence, the code stays in brackets for the developer.
const REFUSALS: Record<string, string> = {
  "401 unauthorized": "Ключ не прийнято: його немає, він невідомий, вимкнений або прострочений",
  "403 forbidden": "Ключ не має потрібного дозволу",
  "403 disabled": "Обмін або прийом цих даних вимкнено в налаштуваннях",
  "400 bad-request": "Дані не відповідають опису обміну",
  "400 json": "Тіло запиту не є JSON",
  "404 not-found": "Не знайдено договір пакета",
  "413 too-large": "Запит більший за 4 МБ",
  "415 content-type": "Запит не у форматі JSON",
  "429 rate": "Забагато викликів за хвилину",
  "500 server": "Помилка сайту",
  "no-provider": "Сервіс надсилання не підключено",
  "not-configured": "Сервіс надсилання налаштовано не повністю",
  timeout: "Сервіс не відповів за 10 секунд",
  network: "Не вдалося з'єднатися із сервісом",
  address: "Адреса одержувача не є e-mail",
  template: "Лист не вдалося скласти з даних",
  "secret-required": "Цей лист можна надіслати лише в момент створення",
};

export function describeError(raw: string | null): string | null {
  if (!raw) return null;
  const known = REFUSALS[raw.trim()];
  if (known) return /^\d{3} /.test(raw) ? `${known} (${raw.slice(0, 3)})` : known;
  return raw;
}

export function countsText(counts: ExchangeCounts): string {
  const parts: string[] = [];
  if (counts.created) parts.push(`нових ${formatNumber(counts.created)}`);
  if (counts.updated) parts.push(`оновлено ${formatNumber(counts.updated)}`);
  if (counts.unchanged) parts.push(`без змін ${formatNumber(counts.unchanged)}`);
  if (counts.failed) parts.push(`з помилкою ${formatNumber(counts.failed)}`);
  return parts.join(", ");
}

export function ResultBadge({ status }: { status: ExchangeStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {EXCHANGE_STATUS_LABELS[status]}
    </Badge>
  );
}

function durationText(ms: number): string {
  if (ms < 1000) return `${formatNumber(ms)} мс`;
  return `${(ms / 1000).toFixed(1).replace(".", ",")} с`;
}

// --- the table ---------------------------------------------------------------------------

function columnsFor(fixedSystem: ExchangeSystem | undefined, compact: boolean): Column<ExchangeLogDto>[] {
  const columns: Column<ExchangeLogDto>[] = [
    {
      key: "at",
      header: "Час",
      sortKey: compact ? undefined : "at",
      firstSort: "desc",
      width: 104,
      cell: (row) => <DateCell value={row.at} withTime />,
    },
  ];
  if (!fixedSystem) {
    columns.push({
      key: "system",
      header: "Система",
      width: 128,
      hideBelow: 1024,
      cell: (row) => <span className="whitespace-nowrap">{EXCHANGE_SYSTEM_LABELS[row.system]}</span>,
    });
  }
  columns.push(
    {
      key: "what",
      header: "Що",
      cell: (row) => (
        <span className="flex min-w-0 flex-col items-start gap-1">
          <TwoLineCell
            title={entityLabel(row)}
            subtitle={`${directionLabel(row.system, row.direction)}${fixedSystem ? `, ${actionLabel(row).toLowerCase()}` : ""}`}
          />
          {/* Phones have no room for the result column: its pill rides here. */}
          <span className="min-[640px]:hidden">
            <ResultBadge status={row.status} />
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Результат",
      width: compact ? 220 : 260,
      hideBelow: 640,
      cell: (row) => (
        <span className="flex min-w-0 flex-col items-start gap-1">
          <ResultBadge status={row.status} />
          {row.error && <span className={cx(TEXT.caption, "line-clamp-1 max-w-full [overflow-wrap:anywhere]")}>{describeError(row.error)}</span>}
        </span>
      ),
    },
    {
      key: "counts",
      header: "Записів",
      align: "right",
      width: 150,
      hideBelow: 640,
      cell: (row) =>
        row.system === "bas" && row.counts.received > 0 ? (
          <span className="flex flex-col items-end">
            <span className="font-semibold tabular-nums">{formatNumber(row.counts.received)}</span>
            {countsText(row.counts) && <span className={cx(TEXT.caption, "whitespace-normal text-right")}>{countsText(row.counts)}</span>}
          </span>
        ) : (
          <span className="text-neutral-400">-</span>
        ),
    },
  );
  if (!compact) {
    columns.push({
      key: "duration",
      header: "Тривалість",
      align: "right",
      width: 110,
      hideBelow: 1280,
      sortKey: "durationMs",
      firstSort: "desc",
      cell: (row) => <span className="tabular-nums text-neutral-700">{durationText(row.durationMs)}</span>,
    });
  }
  columns.push({
    key: "actor",
    header: fixedSystem === "bas" ? "Ключ" : "Хто",
    width: 170,
    hideBelow: 1280,
    cell: (row) =>
      row.actor ? (
        <TwoLineCell title={row.actor.name} subtitle={ACTOR_KIND[row.actor.kind] ?? row.actor.kind} />
      ) : (
        <span className="text-neutral-400">Невідомо</span>
      ),
  });
  return columns;
}

// --- details ---------------------------------------------------------------------------

function LogDetails({ row, onClose }: { row: ExchangeLogDto | null; onClose: () => void }) {
  const items: KeyValueItem[] = [];
  if (row) {
    items.push(
      { label: "Час", value: formatDateTime(row.at) },
      { label: "Система", value: EXCHANGE_SYSTEM_LABELS[row.system] },
      { label: "Напрям", value: directionLabel(row.system, row.direction) },
      { label: "Дія", value: actionLabel(row), hint: row.system === "nova-poshta" ? `Метод Нової Пошти: ${row.action}` : undefined },
      { label: "Результат", value: <ResultBadge status={row.status} /> },
    );
    if (row.system === "bas") {
      items.push({
        label: "Записів",
        value: `${formatNumber(row.counts.received)}${countsText(row.counts) ? `: ${countsText(row.counts)}` : ""}`,
      });
    }
    items.push({ label: "Тривалість", value: durationText(row.durationMs) });
    items.push({
      label: row.system === "bas" ? "Ключ" : "Хто",
      value: row.actor ? `${row.actor.name} (${ACTOR_KIND[row.actor.kind] ?? row.actor.kind})` : "Невідомо: виклик без дійсного ключа",
    });
    if (row.batchId) {
      items.push({
        label: row.system === "mail" ? "Номер листа" : "Пакет",
        value: <span className="[overflow-wrap:anywhere]">{row.batchId}</span>,
        copy: row.batchId,
      });
    }
    if (row.error) items.push({ label: "Помилка", value: describeError(row.error), hint: describeError(row.error) !== row.error ? row.error : undefined });
  }
  return (
    <Drawer
      open={row !== null}
      onClose={onClose}
      title={row ? entityLabel(row) : ""}
      description={row ? `${EXCHANGE_SYSTEM_LABELS[row.system]}, ${formatDateTime(row.at)}` : undefined}
      width={560}
      footer={
        row?.system === "mail" && row.batchId ? (
          <Button variant="secondary" iconLeft={EnvelopeIcon} href={`/admin/integrations/mail?${qs({ id: row.batchId })}`}>
            Відкрити лист
          </Button>
        ) : undefined
      }
    >
      {row && (
        <div className="flex flex-col gap-6">
          <KeyValueList items={items} />
          {row.details.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className={TEXT.cardTitle}>
                {row.system === "bas" ? "Записи з помилкою" : "Запис"}
                <span className="ml-2 font-normal text-neutral-500 tabular-nums">{formatNumber(row.details.length)}</span>
              </h3>
              <ul className="flex flex-col divide-y divide-stroke-subtle rounded-2xl bg-bg-subtle px-4">
                {row.details.map((detail, index) => (
                  <li key={`${detail.id}-${index}`} className="flex flex-col gap-0.5 py-3">
                    <span className={cx(TEXT.bodyStrong, "[overflow-wrap:anywhere]")}>{detail.id || "Без ідентифікатора"}</span>
                    {detail.error && <span className={cx(TEXT.caption, "[overflow-wrap:anywhere]")}>{describeError(detail.error)}</span>}
                  </li>
                ))}
              </ul>
              {row.counts.failed > row.details.length && (
                <p className={TEXT.caption}>Показано перші {formatNumber(row.details.length)} з {formatNumber(row.counts.failed)}.</p>
              )}
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

// --- the journal --------------------------------------------------------------------------

const SYSTEM_OPTIONS = (Object.keys(EXCHANGE_SYSTEM_LABELS) as ExchangeSystem[]).map((value) => ({
  value,
  label: EXCHANGE_SYSTEM_LABELS[value],
}));
const STATUS_OPTIONS = (Object.keys(EXCHANGE_STATUS_LABELS) as ExchangeStatus[]).map((value) => ({
  value,
  label: EXCHANGE_STATUS_LABELS[value],
  tone: STATUS_TONE[value],
}));
const BAS_ENTITY_OPTIONS = BAS_ENTITIES.map((value) => ({ value, label: BAS_ENTITY_LABELS[value] }));

// The last rows across systems (the hub): no filters, no pager.
export function RecentExchangeLog({ limit = 15 }: { limit?: number }) {
  const log = useAdminQuery<ListAnswer<ExchangeLogDto>>(`/integrations/log?${qs({ limit, sort: "-at" })}`);
  const [open, setOpen] = useState<ExchangeLogDto | null>(null);
  return (
    <>
      <DataTable
        caption="Останні записи журналу обміну"
        columns={columnsFor(undefined, true)}
        rows={log.data?.items}
        rowKey={(row) => row.id}
        loading={log.loading}
        stale={log.stale}
        error={log.error}
        onRetry={log.reload}
        onRowClick={setOpen}
        dense
        empty={
          <EmptyState
            title="Обмінів ще не було"
            text="Тут з'являться виклики BAS, накладні Нової Пошти та листи, щойно інтеграції почнуть працювати."
          />
        }
      />
      <LogDetails row={open} onClose={() => setOpen(null)} />
    </>
  );
}

// The whole journal with filters in the address bar. `system` fixes the
// system (the BAS tab); `keep` names the parameters a reset must keep (the
// page's own tab).
export function ExchangeLog({ system, keep = [] }: { system?: ExchangeSystem; keep?: string[] }) {
  const list = useListParams({ defaults: { sort: "-at", limit: "50" }, keep });
  const query = new URLSearchParams(list.queryString);
  for (const name of keep) query.delete(name);
  if (system) query.set("system", system);
  query.sort();
  const log = useAdminQuery<ListAnswer<ExchangeLogDto>>(`/integrations/log?${query.toString()}`);
  const [open, setOpen] = useState<ExchangeLogDto | null>(null);

  const chosenSystem = (system ?? list.get("system")) as ExchangeSystem | "";
  const filtered = Boolean(list.q || list.get("status") || list.get("direction") || list.get("from") || list.get("to") || list.get("entity") || (!system && list.get("system")));

  const chips = [
    ...(!system && list.get("system")
      ? [{ key: "system", label: `Система: ${EXCHANGE_SYSTEM_LABELS[list.get("system") as ExchangeSystem] ?? list.get("system")}`, onRemove: () => list.set({ system: null }) }]
      : []),
    ...(list.get("entity")
      ? [{ key: "entity", label: `Дані: ${BAS_ENTITY_LABELS[list.get("entity") as BasEntity] ?? list.get("entity")}`, onRemove: () => list.set({ entity: null }) }]
      : []),
    ...(list.get("status")
      ? [{ key: "status", label: `Результат: ${EXCHANGE_STATUS_LABELS[list.get("status") as ExchangeStatus] ?? list.get("status")}`, onRemove: () => list.set({ status: null }) }]
      : []),
    ...(list.get("direction")
      ? [
          {
            key: "direction",
            label: `Напрям: ${directionLabel(chosenSystem || "bas", list.get("direction") === "in" ? "in" : "out")}`,
            onRemove: () => list.set({ direction: null }),
          },
        ]
      : []),
    ...(list.get("from") || list.get("to")
      ? [{ key: "dates", label: `Дати: ${list.get("from") || "..."} - ${list.get("to") || "..."}`, onRemove: () => list.set({ from: null, to: null }) }]
      : []),
  ];

  const directionOptions =
    chosenSystem === "bas" || chosenSystem === ""
      ? [
          { value: "in" as const, label: chosenSystem === "bas" ? "BAS -> сайт" : "До сайту" },
          { value: "out" as const, label: chosenSystem === "bas" ? "сайт -> BAS" : "Від сайту" },
        ]
      : [{ value: "out" as const, label: directionLabel(chosenSystem, "out") }];

  return (
    <div className="min-w-0">
      <FilterBar
        search={
          <SearchInput
            label="Пошук у журналі"
            placeholder="Пакет, ключ або текст помилки"
            value={list.q}
            onChange={(q) => list.set({ q })}
          />
        }
        filters={
          <>
            {!system && (
              <Select
                aria-label="Система"
                placeholder="Усі системи"
                clearable
                value={(list.get("system") || null) as ExchangeSystem | null}
                onChange={(value) => list.set({ system: value, entity: null })}
                options={SYSTEM_OPTIONS}
              />
            )}
            {chosenSystem === "bas" && (
              <Select
                aria-label="Дані"
                placeholder="Усі дані"
                clearable
                value={(list.get("entity") || null) as BasEntity | null}
                onChange={(value) => list.set({ entity: value })}
                options={BAS_ENTITY_OPTIONS}
              />
            )}
            <Select
              aria-label="Результат"
              placeholder="Будь-який результат"
              clearable
              value={(list.get("status") || null) as ExchangeStatus | null}
              onChange={(value) => list.set({ status: value })}
              options={STATUS_OPTIONS}
            />
            <Select
              aria-label="Напрям"
              placeholder="Обидва напрями"
              clearable
              value={(list.get("direction") || null) as "in" | "out" | null}
              onChange={(value) => list.set({ direction: value })}
              options={directionOptions}
            />
            <DateRange
              aria-label="Дати"
              from={list.get("from")}
              to={list.get("to")}
              onChange={(range) => list.set({ from: range.from, to: range.to })}
              clearable
            />
          </>
        }
        chips={chips}
        onReset={filtered ? list.reset : undefined}
      />
      <DataTable
        caption="Журнал обміну"
        columns={columnsFor(system, false)}
        rows={log.data?.items}
        rowKey={(row) => row.id}
        loading={log.loading}
        stale={log.stale}
        error={log.error}
        onRetry={log.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        onRowClick={setOpen}
        empty={
          filtered ? (
            <EmptyState
              title="За цими умовами записів немає"
              text="Змініть пошук або фільтри: записи журналу зберігаються 90 днів."
              action={
                <Button variant="secondary" onClick={list.reset}>
                  Скинути фільтри
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Журнал порожній"
              text={
                system === "bas"
                  ? "Тут з'явиться кожен виклик BAS: що надіслано, скільки записів прийнято і які з помилкою."
                  : "Тут з'являться виклики BAS, накладні Нової Пошти та листи, щойно інтеграції почнуть працювати."
              }
              action={
                system === "bas" ? (
                  <Button variant="secondary" href="/admin/integrations/bas?tab=dev">
                    Опис обміну для розробника
                  </Button>
                ) : undefined
              }
            />
          )
        }
        footer={
          <Pagination
            page={list.page}
            limit={list.limit}
            total={log.data?.total ?? 0}
            onPage={(page) => list.set({ page })}
            onLimit={(limit) => list.set({ limit })}
            limits={[20, 50, 100]}
          />
        }
      />
      <LogDetails row={open} onClose={() => setOpen(null)} />
    </div>
  );
}
