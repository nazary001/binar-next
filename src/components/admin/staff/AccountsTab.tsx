"use client";

import { PlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { AdminQuery } from "../lib/query";
import { cx, formatDateTime, formatNumber, formatRelative, qs } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { DataTable, DateCell, type Column } from "../ui/DataTable";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { EmptyState } from "../ui/States";
import { TEXT } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { RoleBadge, StaffStateBadge } from "./shared";
import { StaffDrawer } from "./StaffDrawer";
import type { RolesAnswer, StaffListAnswer, StaffRow } from "./types";
import type { useDrawerAddress } from "./useDrawerAddress";
import { useNow } from "./useNow";

// The "Акаунти" tab: every member of staff in a table (search, role and
// state filters in the address, under the API's own names: q, role,
// active, sort, page, limit). A row opens the person in a drawer
// (?id=<staff id>).

const ACTIVE_OPTIONS = [
  { value: "true", label: "Активні" },
  { value: "false", label: "Заблоковані" },
];

function columns(meId: string, now: number): Column<StaffRow>[] {
  return [
    {
      key: "name",
      header: "Співробітник",
      sortKey: "name",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={row.name} decorative />
          {/* On a phone the person's column is capped (and the marks dropped),
              so the state stays on screen next to it. */}
          <span className="flex min-w-0 flex-col max-[639px]:max-w-[170px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold text-neutral-900">{row.name}</span>
              {row.id === meId && (
                <Badge tone="blue" className="max-[639px]:hidden">
                  Ви
                </Badge>
              )}
              {row.test && (
                <Badge tone="neutral" className="max-[639px]:hidden">
                  Тестовий
                </Badge>
              )}
            </span>
            <span className={cx(TEXT.caption, "truncate")}>{row.email}</span>
          </span>
        </span>
      ),
    },
    { key: "role", header: "Роль", hideBelow: 640, cell: (row) => <RoleBadge roleId={row.roleId} name={row.roleName} /> },
    { key: "state", header: "Стан", cell: (row) => <StaffStateBadge row={row} /> },
    {
      key: "lastLogin",
      header: "Останній вхід",
      sortKey: "lastLoginAt",
      firstSort: "desc",
      hideBelow: 1024,
      cell: (row) =>
        row.lastLoginAt ? (
          <span className="whitespace-nowrap tabular-nums" title={formatDateTime(row.lastLoginAt)}>
            {formatRelative(row.lastLoginAt, now || undefined)}
          </span>
        ) : (
          <span className="whitespace-nowrap text-neutral-400">ще не входив</span>
        ),
    },
    {
      key: "sessions",
      header: "Активних сеансів",
      align: "right",
      hideBelow: 1280,
      cell: (row) => <span className={cx("tabular-nums", row.sessions === 0 && "text-neutral-400")}>{formatNumber(row.sessions)}</span>,
    },
    {
      key: "created",
      header: "Створено",
      sortKey: "createdAt",
      firstSort: "desc",
      hideBelow: 1280,
      cell: (row) => <DateCell value={row.createdAt} />,
    },
  ];
}

export function AccountsTab({
  roles,
  drawer,
  onCreate,
}: {
  roles: AdminQuery<RolesAnswer>;
  drawer: ReturnType<typeof useDrawerAddress>;
  onCreate: () => void;
}) {
  const { me } = useStaff();
  const now = useNow();
  const list = useListParams({ defaults: { sort: "name", limit: "50" } });
  const q = list.q;
  const role = list.get("role");
  const active = list.get("active");
  // Only the list's own parameters reach the API (and the cache key): the
  // drawer's ?id must not reload the table.
  const query = useAdminQuery<StaffListAnswer>(
    `/staff?${qs({ active, limit: list.limit, page: list.page, q, role, sort: list.sort })}`,
  );
  const data = query.data;
  const roleItems = roles.data?.items ?? [];

  // The drawer keeps showing the last person while it slides out.
  const openId = drawer.openId;
  const [shown, setShown] = useState<string | null>(openId);
  if (openId !== null && openId !== shown) setShown(openId);

  const roleName = roleItems.find((item) => item.id === role)?.name ?? role;
  const chips: FilterChipItem[] = [];
  if (q) chips.push({ key: "q", label: `Пошук: ${q}`, onRemove: () => list.set({ q: null }) });
  if (role) chips.push({ key: "role", label: `Роль: ${roleName}`, onRemove: () => list.set({ role: null }) });
  if (active) {
    chips.push({ key: "active", label: active === "false" ? "Лише заблоковані" : "Лише активні", onRemove: () => list.set({ active: null }) });
  }
  const filtered = Boolean(q || role || active);

  const empty = filtered ? (
    <EmptyState
      title="Нікого не знайдено"
      text="Немає співробітників, що відповідають пошуку чи фільтрам. Змініть їх або скиньте."
      action={
        <Button variant="secondary" size="sm" onClick={list.reset}>
          Скинути фільтри
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={<UsersIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title="Співробітників ще немає"
      text="Додайте людей, які працюватимуть у панелі, і призначте кожному роль."
      action={
        <Button size="sm" iconLeft={PlusIcon} onClick={onCreate}>
          Додати співробітника
        </Button>
      }
    />
  );

  return (
    <>
      <FilterBar
        search={
          <SearchInput label="Пошук співробітників" value={q} onChange={(next) => list.set({ q: next })} placeholder="Ім'я або e-mail" />
        }
        filters={
          <>
            <div>
              <div className="w-[calc(100vw-32px)] max-w-full min-[640px]:w-[240px]">
                <Select
                  aria-label="Роль"
                  clearable
                  placeholder="Усі ролі"
                  value={role || null}
                  onChange={(next) => list.set({ role: next })}
                  options={roleItems.map((item) => ({ value: item.id, label: item.name }))}
                />
              </div>
            </div>
            <div>
              <div className="w-[calc(100vw-32px)] max-w-full min-[640px]:w-[200px]">
                <Select
                  aria-label="Стан"
                  clearable
                  placeholder="Будь-який стан"
                  value={active || null}
                  onChange={(next) => list.set({ active: next })}
                  options={ACTIVE_OPTIONS}
                />
              </div>
            </div>
          </>
        }
        chips={chips}
        onReset={list.reset}
      />
      <DataTable
        caption="Співробітники"
        columns={columns(me.id, now)}
        rows={data?.items}
        rowKey={(row) => row.id}
        loading={query.loading}
        stale={query.stale}
        error={query.error}
        onRetry={query.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        onRowClick={(row) => drawer.open(row.id)}
        empty={empty}
        footer={
          data ? (
            <Pagination
              page={list.page}
              limit={list.limit}
              total={data.total}
              onPage={(page) => list.set({ page })}
              onLimit={(limit) => list.set({ limit })}
            />
          ) : undefined
        }
      />
      {shown !== null && (
        <StaffDrawer key={shown} staffId={shown} open={openId !== null} onClose={drawer.close} roles={roles.data?.items} />
      )}
    </>
  );
}
