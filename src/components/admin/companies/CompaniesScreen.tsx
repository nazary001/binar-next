"use client";

import { BuildingOffice2Icon, PlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { STAFF_NONE, StaffSelect } from "../common/pickers";
import { GUESTS_GROUP, type CustomerGroupsPage } from "../groups/types";
import { cx, formatNumber } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import type { StaffOptionsAnswer } from "../staff/types";
import { Button } from "../ui/Button";
import { DataTable, TwoLineCell, type Column } from "../ui/DataTable";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { EmptyState } from "../ui/States";
import { TEXT, TONES } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { BalanceText, CabinetBadge, companyLine, formatPercent } from "./shared";
import type { CompaniesPage, CompanyRow } from "./types";

// /admin/companies: the partner companies. Search, group, manager and the
// cabinet state live in the address bar under the API's own names (q,
// groupId, managerId, active, sort, page, limit), so the links of other
// sections (/admin/companies?groupId=...) land on the filtered list.

const STATE_OPTIONS = [
  { value: "true", label: "Кабінет увімкнено", tone: "green" as const },
  { value: "false", label: "Кабінет вимкнено", tone: "red" as const },
];

const COLUMNS: Column<CompanyRow>[] = [
  {
    key: "name",
    header: "Компанія",
    sortKey: "name",
    // The width is set inside the cell (a table cell ignores max-width),
    // so long names truncate and phones keep the balance in view.
    cell: (row) => (
      <span title={row.name} className="block max-w-[150px] min-[640px]:max-w-[260px] xl:max-w-[170px] 2xl:max-w-[320px]">
        <TwoLineCell
          title={row.name}
          subtitle={row.seed ? `Демо-компанія, ${companyLine(row.edrpou, row.city)}` : companyLine(row.edrpou, row.city)}
        />
        {!row.isActive && (
          <span className="mt-0.5 block text-[12px] font-medium leading-4 min-[640px]:hidden" style={{ color: TONES.red.text }}>
            Кабінет вимкнено
          </span>
        )}
      </span>
    ),
  },
  { key: "discount", header: "Знижка", align: "right", hideBelow: 640, cell: (row) => formatPercent(row.discountPercent) },
  { key: "users", header: "Акаунтів", align: "right", hideBelow: 1280, cell: (row) => formatNumber(row.usersCount) },
  { key: "orders", header: "Замовлень", align: "right", hideBelow: 1280, cell: (row) => formatNumber(row.ordersCount) },
  {
    key: "balance",
    header: "Заборгованість",
    align: "right",
    cell: (row) => <BalanceText balance={row.openBalance} overdue={row.overdue} />,
  },
  {
    // One column for both: eight separate ones do not fit 1280 px.
    key: "group",
    header: "Група і менеджер",
    hideBelow: 1280,
    cell: (row) => (
      <span title={row.groupName ?? undefined} className="block max-w-[150px] 2xl:max-w-[240px]">
        <TwoLineCell
          title={<span className="font-normal">{row.groupName ?? "Групу видалено"}</span>}
          subtitle={row.managerId ? (row.managerName ?? "Колишній співробітник") : "Без менеджера"}
        />
      </span>
    ),
  },
  { key: "state", header: "Кабінет", hideBelow: 640, cell: (row) => <CabinetBadge active={row.isActive} /> },
];

export function CompaniesScreen() {
  const { can } = useStaff();
  const canEdit = can("customers.edit");
  const [creating, setCreating] = useState(false);
  const list = useListParams({ defaults: { sort: "-createdAt", limit: "20" } });
  const companies = useAdminQuery<CompaniesPage>(`/companies?${list.queryString}`);
  const groups = useAdminQuery<CustomerGroupsPage>("/customer-groups?sort=name&limit=100");
  const staff = useAdminQuery<StaffOptionsAnswer>("/staff/options");

  const groupId = list.get("groupId");
  const managerId = list.get("managerId");
  const active = list.get("active");
  const groupOptions = (groups.data?.items ?? [])
    .filter((group) => group.id !== GUESTS_GROUP)
    .map((group) => ({ value: group.id, label: group.name }));
  const groupName = (id: string) => groups.data?.items.find((group) => group.id === id)?.name ?? "Обрана група";
  const staffName = (id: string) =>
    id === STAFF_NONE ? "не призначено" : (staff.data?.items.find((person) => person.id === id)?.name ?? "колишній співробітник");

  const chips: FilterChipItem[] = [
    ...(list.q ? [{ key: "q", label: `Пошук: ${list.q}`, onRemove: () => list.set({ q: null }) }] : []),
    ...(groupId ? [{ key: "groupId", label: `Група: ${groupName(groupId)}`, onRemove: () => list.set({ groupId: null }) }] : []),
    ...(managerId ? [{ key: "managerId", label: `Менеджер: ${staffName(managerId)}`, onRemove: () => list.set({ managerId: null }) }] : []),
    ...(active === "true" || active === "false"
      ? [{ key: "active", label: active === "true" ? "Кабінет увімкнено" : "Кабінет вимкнено", onRemove: () => list.set({ active: null }) }]
      : []),
  ];
  const filtered = chips.length > 0;
  const total = companies.data?.total;

  const addButton = canEdit ? (
    <Button iconLeft={PlusIcon} onClick={() => setCreating(true)}>
      Додати компанію
    </Button>
  ) : null;

  return (
    <Page>
      <PageHeader
        title="Компанії"
        light={total !== undefined ? formatNumber(total) : undefined}
        subtitle="Партнери B2B: реквізити, комерційні умови, юридичні особи, договори й розрахунки."
        actions={addButton}
      />
      <FilterBar
        search={
          <SearchInput label="Пошук компаній" value={list.q} onChange={(q) => list.set({ q })} placeholder="Назва або ЄДРПОУ" />
        }
        filters={
          <>
            <Select
              aria-label="Група покупців"
              value={groupId || null}
              onChange={(next) => list.set({ groupId: next })}
              clearable
              placeholder="Усі групи"
              options={groupOptions}
              className="w-[220px]"
            />
            <StaffSelect
              aria-label="Менеджер"
              value={managerId || null}
              onChange={(next) => list.set({ managerId: next })}
              withNone
              clearable
              placeholder="Усі менеджери"
              className="w-[220px]"
            />
            <Select
              aria-label="Кабінет"
              value={active === "true" || active === "false" ? active : null}
              onChange={(next) => list.set({ active: next })}
              clearable
              placeholder="Будь-який кабінет"
              options={STATE_OPTIONS}
              className="w-[220px]"
            />
          </>
        }
        chips={chips}
        onReset={list.reset}
      />
      <DataTable
        caption="Компанії"
        columns={COLUMNS}
        rows={companies.data?.items}
        rowKey={(row) => row.id}
        loading={companies.loading}
        stale={companies.stale}
        error={companies.error}
        onRetry={companies.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        rowHref={(row) => `/admin/companies/${row.id}`}
        empty={
          filtered ? (
            <EmptyState
              title="Нічого не знайдено"
              text="Жодна компанія не відповідає пошуку та фільтрам."
              action={
                <Button variant="secondary" onClick={list.reset}>
                  Скинути фільтри
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<BuildingOffice2Icon aria-hidden className="size-6" strokeWidth={1.7} />}
              title="Компаній ще немає"
              text="Тут будуть партнери B2B. Компанія з'являється, коли ви створюєте її або акаунт партнера з новою компанією."
              action={addButton}
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
      <p className={cx(TEXT.caption, "pt-3")}>
        Заборгованість рахується так само, як у кабінеті партнера: неоплачені замовлення, крім скасованих.
      </p>
      {canEdit && <CreateCompanyModal open={creating} onClose={() => setCreating(false)} />}
    </Page>
  );
}
