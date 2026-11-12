"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { formatDate, formatNumber } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { Button } from "../ui/Button";
import { DateRange } from "../ui/DateInput";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { EmptyState } from "../ui/States";
import { useListParams } from "../ui/useListParams";
import { JournalTable } from "./JournalTable";
import {
  ENTITY_TYPE_LABELS,
  JOURNAL_ACTION_GROUPS,
  JOURNAL_ACTOR_KINDS,
  type JournalFacets,
  type JournalGroupKey,
  type JournalPage,
  type JournalRow,
} from "./types";

// /admin/audit: every change made in the panel, newest first. The filters
// live in the address bar under the names of the API (q, actorId, group,
// from, to, plus entityType / entityId / actorKind / action when another
// screen links here), so a filtered journal can be shared as a link.

const FILTERS = ["q", "actorId", "group", "from", "to", "entityType", "entityId", "actorKind", "action"] as const;

const GROUP_OPTIONS = JOURNAL_ACTION_GROUPS.map((group) => ({ value: group.key, label: group.label }));

function periodLabel(from: string, to: string): string {
  if (from && to) return from === to ? `День: ${formatDate(from)}` : `Період: ${formatDate(from)} - ${formatDate(to)}`;
  if (from) return `Від ${formatDate(from)}`;
  return `До ${formatDate(to)}`;
}

export function JournalScreen() {
  const list = useListParams({ defaults: { limit: "50" } });
  const journal = useAdminQuery<JournalPage>(`/audit?${list.queryString}`);
  const facets = useAdminQuery<JournalFacets>("/audit/facets");

  const actorId = list.get("actorId");
  const group = list.get("group");
  const from = list.get("from");
  const to = list.get("to");
  const entityType = list.get("entityType");
  const entityId = list.get("entityId");
  const actorKind = list.get("actorKind");
  const action = list.get("action");

  const actors = facets.data?.actors ?? [];
  const actorOptions = actors.map((actor) => ({
    value: actor.id,
    label: actor.name,
    hint: actor.kind === "staff" ? undefined : JOURNAL_ACTOR_KINDS.find((kind) => kind.value === actor.kind)?.label,
  }));
  // A person who is filtered on but not in the facets yet (a link from
  // another screen): the filter still shows by its id.
  if (actorId && !actors.some((actor) => actor.id === actorId)) actorOptions.unshift({ value: actorId, label: actorId, hint: undefined });

  const actorName = (id: string) => actors.find((actor) => actor.id === id)?.name ?? id;
  const entityLabel = journal.data?.items.find((row) => row.entity?.type === entityType && row.entity.id === entityId)?.entity?.label;

  const chips: FilterChipItem[] = [];
  if (list.q) chips.push({ key: "q", label: `Пошук: ${list.q}`, onRemove: () => list.set({ q: null }) });
  if (actorId) chips.push({ key: "actorId", label: `Хто: ${actorName(actorId)}`, onRemove: () => list.set({ actorId: null }) });
  if (actorKind) {
    const kind = JOURNAL_ACTOR_KINDS.find((item) => item.value === actorKind)?.label ?? actorKind;
    chips.push({ key: "actorKind", label: `Хто: ${kind}`, onRemove: () => list.set({ actorKind: null }) });
  }
  if (group) {
    const label = JOURNAL_ACTION_GROUPS.find((item) => item.key === group)?.label ?? group;
    chips.push({ key: "group", label: `Дії: ${label}`, onRemove: () => list.set({ group: null }) });
  }
  if (action) chips.push({ key: "action", label: `Дія: ${action}`, onRemove: () => list.set({ action: null }) });
  if (from || to) chips.push({ key: "period", label: periodLabel(from, to), onRemove: () => list.set({ from: null, to: null }) });
  if (entityType || entityId) {
    const type = entityType ? (ENTITY_TYPE_LABELS[entityType] ?? entityType) : "Запис";
    chips.push({
      key: "entity",
      label: `${type}: ${entityLabel ?? entityId ?? ""}`.trim(),
      onRemove: () => list.set({ entityType: null, entityId: null }),
    });
  }
  const filtered = FILTERS.some((name) => list.get(name) !== "");

  const links = {
    byActor: (row: JournalRow) => list.set({ actorId: row.actor.id, actorKind: null }),
    byEntity: (row: JournalRow) => (row.entity ? list.set({ entityType: row.entity.type, entityId: row.entity.id }) : undefined),
  };

  const total = journal.data?.total;

  return (
    <Page>
      <PageHeader
        title="Журнал дій"
        light={total !== undefined && !journal.stale ? formatNumber(total) : undefined}
        subtitle="Кожна зміна, зроблена в панелі: хто, що і коли. Найновіші вгорі."
      />
      <FilterBar
        search={
          <SearchInput
            label="Пошук у журналі"
            value={list.q}
            onChange={(q) => list.set({ q })}
            placeholder="Номер, назва, ім'я або слово з опису"
          />
        }
        filters={
          <>
            <div>
              <Select
                aria-label="Хто"
                value={actorId || null}
                onChange={(next) => list.set({ actorId: next, actorKind: null })}
                clearable
                placeholder={facets.loading ? "Завантаження..." : "Усі виконавці"}
                options={actorOptions}
                className="w-[calc(50vw-20px)] min-[640px]:w-[200px]"
              />
            </div>
            <div>
              <Select
                aria-label="Які дії"
                value={(group as JournalGroupKey) || null}
                onChange={(next) => list.set({ group: next })}
                clearable
                placeholder="Усі дії"
                options={GROUP_OPTIONS}
                className="w-[calc(50vw-20px)] min-[640px]:w-[172px]"
              />
            </div>
            <DateRange
              aria-label="Період"
              from={from}
              to={to}
              // Only the end that changed: two quick edits in a row must
              // not undo each other before the address catches up.
              onChange={(range) =>
                list.set({ ...(range.from !== from ? { from: range.from } : {}), ...(range.to !== to ? { to: range.to } : {}) })
              }
              clearable
            />
          </>
        }
        chips={chips}
        onReset={list.reset}
      />
      <JournalTable
        rows={journal.data?.items}
        loading={journal.loading}
        stale={journal.stale}
        error={journal.error}
        onRetry={journal.reload}
        links={links}
        empty={
          filtered ? (
            <EmptyState
              icon={<MagnifyingGlassIcon aria-hidden className="size-6" strokeWidth={1.7} />}
              title="Нічого не знайдено"
              text="Таких записів у журналі немає. Змініть пошук, людину, вид дій або період."
              action={
                <Button variant="secondary" onClick={list.reset}>
                  Скинути фільтри
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Журнал поки порожній"
              text="Тут з'являтиметься кожна зміна, зроблена в панелі: хто її зробив, що саме і коли."
              action={
                <Button variant="secondary" href="/admin">
                  До огляду
                </Button>
              }
            />
          )
        }
        footer={
          <Pagination
            page={list.page}
            limit={list.limit}
            total={journal.data?.total ?? 0}
            onPage={(page) => list.set({ page })}
            onLimit={(limit) => list.set({ limit })}
            limits={[50, 100]}
          />
        }
      />
    </Page>
  );
}
