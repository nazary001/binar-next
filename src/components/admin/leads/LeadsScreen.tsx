"use client";

import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon, MagnifyingGlassIcon, NoSymbolIcon, PlayIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { STAFF_NONE, StaffSelect } from "../common/pickers";
import { adminUrl } from "../lib/api";
import { countOf, cx, formatDate, formatDateTime, formatPhone, formatRelative } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { DataTable, type Column } from "../ui/DataTable";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { EmptyState } from "../ui/States";
import { LeadKindBadge, LeadStatusBadge } from "../ui/status";
import { Tabs } from "../ui/Tabs";
import { Tooltip } from "../ui/Tooltip";
import { COLOR_TRANSITION, FOCUS_RING, LIFT_SHADOW, TEXT, Z } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { bulkStatus } from "./actions";
import { LeadDrawer } from "./LeadDrawer";
import { mailtoHref } from "./links";
import { ContactLink, PeriodFilter, ToggleChip, pageName, telHref, useLeadAddress, useMinWidth, useNow } from "./parts";
import {
  LEAD_ASSIGNED_TO_ME,
  LEAD_KIND_LABELS,
  LEAD_KIND_VALUES,
  LEAD_KINDS,
  LEAD_OPEN_PARAM,
  LEAD_STATUS_ALL,
  LEAD_STATUS_VALUES,
  type LeadKind,
  type LeadRow,
  type LeadStatus,
  type LeadsPage,
} from "./types";

// /admin/leads: the inbox of the site's forms (the quiz, the star
// checklist, the partner request). The address bar holds the list's state
// with the API's own parameter names (status, kind, assigneeId, from, to,
// q, sort, page, limit), so /admin/leads?status=new from the overview and
// the menu lands on the right tab. The inbox opens on "Нові"; "Усі" is
// ?status=all. One submission opens in a drawer from ?id=<id> (the panel's
// search, the journal and the e-mail notice link there).

const DEFAULTS = { status: "new", sort: "-createdAt", limit: "20" };

type TabKey = LeadStatus | typeof LEAD_STATUS_ALL;

const TABS: { key: TabKey; label: string }[] = [
  { key: "new", label: "Нові" },
  { key: "in_progress", label: "В роботі" },
  { key: "done", label: "Опрацьовані" },
  { key: "spam", label: "Спам" },
  { key: LEAD_STATUS_ALL, label: "Усі" },
];

// The filters of the bar (the status is the tabs, not a filter).
const FILTER_NAMES = ["q", "kind", "assigneeId", "from", "to"];

const BULK: { status: LeadStatus; label: string; button: string; icon: typeof PlayIcon }[] = [
  { status: "in_progress", label: "В роботі", button: "У роботу", icon: PlayIcon },
  { status: "done", label: "Опрацьована", button: "Опрацьовано", icon: CheckCircleIcon },
  { status: "spam", label: "Спам", button: "Спам", icon: NoSymbolIcon },
];

const STATUS_WORDS: Record<LeadStatus, string> = {
  new: "Нова",
  in_progress: "В роботі",
  done: "Опрацьована",
  spam: "Спам",
};

type StaffOptions = { ok: true; items: { id: string; name: string }[] };

function known<K extends string>(values: string[], allowed: readonly K[]): K[] {
  return values.filter((value): value is K => (allowed as readonly string[]).includes(value));
}

function When({ row, now }: { row: LeadRow; now: number }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {/* Orange: a submission nobody has touched yet. */}
      <span aria-hidden className={cx("size-2 shrink-0 rounded-full", row.status === "new" ? "bg-brand" : "bg-transparent")} />
      <Tooltip content={formatDateTime(row.createdAt)} describe={false}>
        <time dateTime={row.createdAt} className="tabular-nums">
          {now ? formatRelative(row.createdAt, now) : formatDate(row.createdAt)}
        </time>
      </Tooltip>
      <span className="sr-only">{formatDateTime(row.createdAt)}</span>
    </span>
  );
}

// Name, company, then the phone and the e-mail on one line (each a link;
// the e-mail gives way on phones when there is a phone to call).
function ContactCell({ row, now }: { row: LeadRow; now: number }) {
  const { name, phone, email, company } = row.contact;
  // A visitor's text: a link only when it is one plain address.
  const mailHref = email ? mailtoHref(email) : null;
  const emailClass = cx("min-w-0 truncate", phone && "max-[639px]:hidden");
  return (
    <span className="flex min-w-0 max-w-[190px] flex-col gap-0.5 min-[640px]:max-w-[250px]">
      {name ? (
        <span className="truncate font-semibold text-neutral-900">{name}</span>
      ) : (
        <span className="sr-only">Без імені</span>
      )}
      {company && <span className="truncate text-[13px] leading-[18px] text-neutral-600">{company}</span>}
      <span className={cx("flex min-w-0 items-center gap-3", name ? "text-[13px] leading-[18px] text-neutral-600" : "font-semibold text-neutral-900")}>
        {phone && (
          <ContactLink href={telHref(phone)} className="shrink-0 whitespace-nowrap tabular-nums">
            {formatPhone(phone)}
          </ContactLink>
        )}
        {email &&
          (mailHref ? (
            <ContactLink href={mailHref} className={emailClass}>
              {email}
            </ContactLink>
          ) : (
            <span className={emailClass}>{email}</span>
          ))}
      </span>
      {/* Phones have no room for the time and the form columns. */}
      <span className={cx(TEXT.caption, "mt-0.5 min-[640px]:hidden")}>
        {LEAD_KIND_LABELS[row.kind] ?? row.kind}, {now ? formatRelative(row.createdAt, now) : formatDate(row.createdAt)}
      </span>
    </span>
  );
}

function columns(now: number, wide: boolean, assigneeLabel: (row: LeadRow) => string | null): Column<LeadRow>[] {
  const all: (Column<LeadRow> | false)[] = [
    {
      key: "when",
      header: "Коли",
      sortKey: "createdAt",
      firstSort: "desc",
      hideBelow: 640,
      cell: (row) => <When row={row} now={now} />,
    },
    {
      key: "form",
      header: "Форма",
      hideBelow: 1024,
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <LeadKindBadge kind={row.kind} />
          <span className={cx(TEXT.caption, "whitespace-nowrap")}>{pageName(row.source)}</span>
        </span>
      ),
    },
    {
      key: "contact",
      header: "Контакт",
      cell: (row) => <ContactCell row={row} now={now} />,
    },
    {
      key: "summary",
      header: "Суть",
      hideBelow: 1280,
      // Takes the room the other columns leave and cuts the line there.
      className: "w-full max-w-0",
      cell: (row) => (
        <span className="block truncate text-neutral-700" title={row.summary}>
          {row.summary || "-"}
        </span>
      ),
    },
    wide && {
      key: "assignee",
      header: "Відповідальний",
      cell: (row) => {
        const name = assigneeLabel(row);
        return name ? (
          <span className="block max-w-[160px] truncate">{name}</span>
        ) : (
          <span className="whitespace-nowrap text-neutral-400">Не призначено</span>
        );
      },
    },
    {
      key: "status",
      header: "Статус",
      cell: (row) => {
        const name = wide ? null : assigneeLabel(row);
        return (
          <span className="flex flex-col items-start gap-1">
            <LeadStatusBadge status={row.status} />
            {name && <span className={cx(TEXT.caption, "block max-w-[140px] truncate")}>{name}</span>}
          </span>
        );
      },
    },
  ];
  return all.filter((column): column is Column<LeadRow> => column !== false);
}

export function LeadsScreen() {
  const { me, can } = useStaff();
  const canEdit = can("leads.edit");
  const now = useNow();
  // The person in charge gets a column of their own only where the
  // summary still has room; elsewhere they ride under the status.
  const wide = useMinWidth(1536);
  const list = useListParams({ defaults: DEFAULTS });
  const drawer = useLeadAddress();

  // The tab: one known status, "all", or none of them (a link that asks
  // for two statuses: the chips say which).
  const statuses = list.getAll("status");
  const all = statuses.includes(LEAD_STATUS_ALL);
  const chosen = known(statuses, LEAD_STATUS_VALUES);
  const tab: TabKey | "mixed" = all ? LEAD_STATUS_ALL : chosen.length === 1 ? chosen[0] : "mixed";

  // Only the list's own parameters reach the API and the cache key: the
  // drawer's ?id must not reload the table.
  const query = new URLSearchParams(list.queryString);
  query.delete(LEAD_OPEN_PARAM);
  if (all) query.delete("status");
  const apiQuery = query.toString();
  const leads = useAdminQuery<LeadsPage>(`/leads?${apiQuery}`);
  const staff = useAdminQuery<StaffOptions>("/staff/options");
  // The menu's counter: new submissions of the whole inbox, whatever the filters.
  const navCounts = useAdminQuery<{ counts: { leads?: number } }>("/nav-counts");

  // The selection belongs to what is on screen: another tab, filter or
  // page starts it again.
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionKey, setSelectionKey] = useState(apiQuery);
  if (selectionKey !== apiQuery) {
    setSelectionKey(apiQuery);
    setSelected([]);
  }
  const [bulkBusy, setBulkBusy] = useState<LeadStatus | null>(null);

  const rows = leads.data?.items;
  const counts = leads.data?.counts;

  // The drawer keeps showing the last submission while it slides out.
  const openId = drawer.openId;
  const [shown, setShown] = useState<string | null>(openId);
  if (openId !== null && openId !== shown) setShown(openId);

  // Neighbours for the drawer's arrows. A submission that leaves the list
  // while it is open (taken into work on the "Нові" tab) keeps its place:
  // "next" is then the row that moved up into it.
  const items = rows ?? [];
  const index = openId ? items.findIndex((row) => row.id === openId) : -1;
  const [anchor, setAnchor] = useState<{ id: string; index: number } | null>(null);
  if (openId && index >= 0 && (anchor?.id !== openId || anchor.index !== index)) setAnchor({ id: openId, index });
  let prevId: string | null = null;
  let nextId: string | null = null;
  if (index >= 0) {
    prevId = items[index - 1]?.id ?? null;
    nextId = items[index + 1]?.id ?? null;
  } else if (openId && anchor?.id === openId) {
    prevId = items[anchor.index - 1]?.id ?? null;
    nextId = items[anchor.index]?.id ?? null;
  }

  const staffNames = new Map((staff.data?.items ?? []).map((person) => [person.id, person.name]));
  const assigneeLabel = (row: LeadRow): string | null => {
    if (!row.assigneeId) return null;
    if (row.assigneeId === me.id) return "Ви";
    return row.assigneeName ?? staffNames.get(row.assigneeId) ?? "Колишній співробітник";
  };

  const q = list.q;
  const kinds = known(list.getAll("kind"), LEAD_KIND_VALUES);
  const assigneeId = list.get("assigneeId");
  const from = list.get("from");
  const to = list.get("to");
  const mine = assigneeId === LEAD_ASSIGNED_TO_ME;

  const chips: FilterChipItem[] = [];
  if (q) chips.push({ key: "q", label: `Пошук: ${q}`, onRemove: () => list.set({ q: null }) });
  for (const kind of kinds) {
    chips.push({
      key: `kind-${kind}`,
      label: `Форма: ${LEAD_KIND_LABELS[kind]}`,
      onRemove: () => list.set({ kind: kinds.filter((item) => item !== kind) }),
    });
  }
  if (assigneeId) {
    const label =
      assigneeId === STAFF_NONE
        ? "Відповідальний: не призначено"
        : mine || assigneeId === me.id
          ? "Відповідальний: я"
          : `Відповідальний: ${staffNames.get(assigneeId) ?? (staff.data ? "колишній співробітник" : "...")}`;
    chips.push({ key: "assignee", label, onRemove: () => list.set({ assigneeId: null }) });
  }
  if (from || to) {
    const range = from && to ? (from === to ? formatDate(from) : `${formatDate(from)} - ${formatDate(to)}`) : from ? `від ${formatDate(from)}` : `до ${formatDate(to)}`;
    chips.push({ key: "period", label: `Період: ${range}`, onRemove: () => list.set({ from: null, to: null }) });
  }
  if (tab === "mixed") {
    for (const status of chosen) {
      chips.push({
        key: `status-${status}`,
        label: `Статус: ${STATUS_WORDS[status]}`,
        onRemove: () => list.set({ status: chosen.filter((item) => item !== status) }),
      });
    }
  }
  const filtered = FILTER_NAMES.some((name) => list.get(name) !== "");

  // The export takes the list's filters and sort, never its page.
  const exportQuery = new URLSearchParams(apiQuery);
  exportQuery.delete("page");
  exportQuery.delete("limit");

  const newCount = navCounts.data?.counts.leads;

  const runBulk = async (status: LeadStatus, label: string) => {
    if (selected.length === 0 || bulkBusy) return;
    setBulkBusy(status);
    const done = await bulkStatus(selected, status, label);
    setBulkBusy(null);
    if (done) setSelected([]);
  };

  const empty = filtered ? (
    <EmptyState
      icon={<MagnifyingGlassIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title="Таких заявок немає"
      text="Жодна заявка не відповідає пошуку або фільтрам. Змініть умови або скиньте їх."
      action={
        <Button variant="secondary" onClick={() => list.set({ q: null, kind: null, assigneeId: null, from: null, to: null })}>
          Скинути фільтри
        </Button>
      }
    />
  ) : tab === "new" ? (
    <EmptyState
      icon={<CheckCircleIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title="Нових заявок немає"
      text="Усі звернення вже розібрані. Нова заявка з'явиться тут, щойно відвідувач надішле форму на сайті."
      action={
        <Button variant="secondary" onClick={() => list.set({ status: LEAD_STATUS_ALL })}>
          Показати всі заявки
        </Button>
      }
    />
  ) : tab === LEAD_STATUS_ALL ? (
    <EmptyState
      title="Заявок ще немає"
      text="Тут збираються звернення з форм сайту: квіз-підбір, чеклист для готелів і запити на співпрацю."
      action={
        <Button variant="secondary" iconLeft={ArrowTopRightOnSquareIcon} href="/spivpratsya" external>
          Відкрити сторінку співпраці
        </Button>
      }
    />
  ) : (
    <EmptyState
      title={tab === "in_progress" ? "У роботі нічого немає" : tab === "done" ? "Опрацьованих заявок ще немає" : tab === "spam" ? "Спаму немає" : "Заявок немає"}
      text={
        tab === "spam"
          ? "Сюди потрапляють заявки, позначені як спам. Їх можна переглянути й видалити."
          : "Заявки з'являться тут, коли хтось змінить їхній статус."
      }
      action={
        <Button variant="secondary" onClick={() => list.set({ status: LEAD_STATUS_ALL })}>
          Показати всі заявки
        </Button>
      }
    />
  );

  return (
    <Page>
      <PageHeader
        title="Заявки"
        light={newCount ? countOf(newCount, ["нова", "нові", "нових"]) : undefined}
        subtitle="Звернення з форм сайту: квіз-підбір, чеклист для готелів і запити на співпрацю"
        actions={
          <Button variant="secondary" iconLeft={ArrowDownTrayIcon} href={adminUrl(`/leads/export?${exportQuery.toString()}`)} external>
            Експорт CSV
          </Button>
        }
      />

      <div className="flex min-w-0 flex-wrap items-center gap-3 pb-4">
        <Tabs
          label="Статус заявок"
          value={tab as TabKey}
          onChange={(key) => list.set({ status: key })}
          items={TABS.map((item) => ({ ...item, count: counts ? counts[item.key] : undefined }))}
        />
        <ToggleChip label="Мої заявки" pressed={mine} onToggle={() => list.set({ assigneeId: mine ? null : LEAD_ASSIGNED_TO_ME })} />
      </div>

      <FilterBar
        search={
          <SearchInput
            label="Пошук заявок"
            value={q}
            onChange={(next) => list.set({ q: next })}
            placeholder="Ім'я, телефон, e-mail або компанія"
          />
        }
        filters={
          <>
            <div className="w-[220px] max-w-full">
              <Select
                aria-label="Форма"
                placeholder="Усі форми"
                clearable
                value={kinds.length === 1 ? kinds[0] : null}
                onChange={(next: LeadKind | null) => list.set({ kind: next })}
                options={LEAD_KINDS}
              />
            </div>
            <div className="w-[220px] max-w-full">
              <StaffSelect
                aria-label="Відповідальний"
                placeholder="Відповідальний"
                value={assigneeId && assigneeId !== LEAD_ASSIGNED_TO_ME ? assigneeId : null}
                onChange={(id) => list.set({ assigneeId: id })}
                withNone
                noneLabel="Не призначено"
                clearable
              />
            </div>
            <PeriodFilter from={from} to={to} onChange={(range) => list.set({ from: range.from, to: range.to })} />
          </>
        }
        chips={chips}
        onReset={() => list.set({ q: null, kind: null, assigneeId: null, from: null, to: null, status: tab === "mixed" ? null : list.get("status") })}
      />

      <DataTable
        caption="Заявки"
        columns={columns(now, wide, assigneeLabel)}
        rows={rows}
        rowKey={(row) => row.id}
        loading={leads.loading}
        stale={leads.stale}
        error={leads.error}
        onRetry={leads.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        onRowClick={(row) => drawer.open(row.id)}
        selection={canEdit ? { selected, onChange: setSelected } : undefined}
        empty={empty}
        footer={
          leads.data && leads.data.total > 0 ? (
            <Pagination
              page={list.page}
              limit={list.limit}
              total={leads.data.total}
              onPage={(page) => list.set({ page })}
              onLimit={(limit) => list.set({ limit })}
            />
          ) : undefined
        }
      />

      {canEdit && selected.length > 0 && (
        <div className={cx("sticky bottom-4 mt-4 flex justify-center", Z.sticky)}>
          <div
            role="region"
            aria-label="Дії з обраними заявками"
            className={cx(
              "flex max-w-full flex-wrap items-center justify-center gap-2 rounded-3xl bg-neutral-900 py-2 pl-5 pr-2 text-white min-[640px]:rounded-full",
              LIFT_SHADOW,
            )}
          >
            <span className="mr-2 whitespace-nowrap text-[14px] font-semibold leading-5" aria-live="polite">
              Обрано: {selected.length}
            </span>
            {BULK.map((action) => (
              <Button
                key={action.status}
                variant="secondary"
                size="sm"
                iconLeft={action.icon}
                loading={bulkBusy === action.status}
                disabled={bulkBusy !== null && bulkBusy !== action.status}
                onClick={() => runBulk(action.status, action.label)}
              >
                {action.button}
              </Button>
            ))}
            {/* The kit's ghost button is drawn for white surfaces. */}
            <button
              type="button"
              onClick={() => setSelected([])}
              className={cx(
                "inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-[13px] font-semibold leading-[18px] text-white/80 hover:bg-white/10 hover:text-white motion-reduce:transition-none",
                COLOR_TRANSITION,
                FOCUS_RING,
              )}
            >
              Зняти вибір
            </button>
          </div>
        </div>
      )}

      {shown !== null && (
        <LeadDrawer
          leadId={shown}
          open={openId !== null}
          onClose={drawer.close}
          prevId={prevId}
          nextId={nextId}
          onNavigate={drawer.replace}
        />
      )}
    </Page>
  );
}
