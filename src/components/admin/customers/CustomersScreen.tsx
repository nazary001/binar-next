"use client";

import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { CompanyPicker } from "../common/pickers";
import type { CompanyAnswer } from "../companies/types";
import { cx, formatDate, formatDateTime, formatNumber, formatPhone, formatRelative, qs } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { DataTable, type Column } from "../ui/DataTable";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { EmptyState } from "../ui/States";
import { AccountTypeBadge, ActiveBadge } from "../ui/status";
import { LinkTabs } from "../ui/Tabs";
import { COLOR_TRANSITION, FOCUS_RING, TEXT } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { AccountTag, accountName, loginText, roleLabel, useNow } from "./parts";
import type { CustomerRow, CustomersPage } from "./types";

// /admin/customers: every customer account of the site, partners of
// companies and retail buyers. The address bar holds the list state with
// the API's own parameter names (q, type, active, clientId, sort, page,
// limit), so /admin/customers?clientId=<company id> from a company page
// lands on that company's people.

const BASE = "/admin/customers";

type TabKey = "all" | "b2b" | "b2c" | "blocked";

// A tab is only a preset of the type / active parameters.
const TAB_PRESET: Record<TabKey, { type?: string; active?: string }> = {
  all: {},
  b2b: { type: "b2b" },
  b2c: { type: "b2c" },
  blocked: { active: "false" },
};

function columns(now: number): Column<CustomerRow>[] {
  return [
    {
      key: "name",
      header: "Акаунт",
      sortKey: "person.fullName",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-3">
          {/* Phones keep the room for the name and the state. */}
          <Avatar name={accountName(row)} size="md" decorative className="max-[639px]:hidden" />
          {/* A capped width: in an auto-width table only a capped block
              truncates instead of pushing the last columns out of the card. */}
          <span className="flex min-w-0 max-w-[150px] flex-col min-[640px]:max-w-[220px] 2xl:max-w-[320px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-semibold text-neutral-900">{row.name || "Без імені"}</span>
              <AccountTag row={row} />
            </span>
            <span className={cx(TEXT.caption, "truncate")}>{loginText(row.login)}</span>
          </span>
        </span>
      ),
    },
    { key: "type", header: "Тип", hideBelow: 640, cell: (row) => <AccountTypeBadge type={row.type} /> },
    {
      key: "company",
      header: "Компанія",
      hideBelow: 1024,
      interactive: true,
      cell: (row) =>
        row.company ? (
          <span className="flex min-w-0 max-w-[200px] flex-col 2xl:max-w-[280px]">
            {row.company.name ? (
              <Link
                href={`/admin/companies/${encodeURIComponent(row.company.id)}`}
                className={cx("w-fit max-w-full truncate rounded-md font-medium text-neutral-900 underline-offset-4 hover:underline", FOCUS_RING, COLOR_TRANSITION)}
              >
                {row.company.name}
              </Link>
            ) : (
              <span className="truncate text-neutral-500">Компанію видалено</span>
            )}
            {row.role && <span className={cx(TEXT.caption, "truncate")}>{roleLabel(row.role)}</span>}
          </span>
        ) : (
          <span className="text-neutral-400">-</span>
        ),
    },
    {
      key: "phone",
      header: "Телефон",
      hideBelow: 1280,
      cell: (row) => (row.phone ? <span className="whitespace-nowrap tabular-nums">{formatPhone(row.phone)}</span> : <span className="text-neutral-400">-</span>),
    },
    {
      // The creation day rides under the last sign-in: seven columns do not
      // fit a 1440-px screen next to the menu. The list is newest first by
      // default; this head sorts by the last sign-in.
      key: "lastLogin",
      header: "Останній вхід",
      sortKey: "lastLoginAt",
      firstSort: "desc",
      hideBelow: 640,
      cell: (row) => (
        <span className="flex flex-col whitespace-nowrap tabular-nums">
          {row.lastLoginAt ? (
            <span title={formatDateTime(row.lastLoginAt)}>{formatRelative(row.lastLoginAt, now || undefined)}</span>
          ) : (
            <span className="text-neutral-400">ще не входив</span>
          )}
          <span className={TEXT.caption}>створено {formatDate(row.createdAt)}</span>
        </span>
      ),
    },
    { key: "state", header: "Стан", cell: (row) => <ActiveBadge active={row.isActive} /> },
  ];
}

export function CustomersScreen() {
  const { can } = useStaff();
  const canEdit = can("customers.edit");
  const now = useNow();
  const list = useListParams({ defaults: { sort: "-createdAt", limit: "20" } });
  const query = useAdminQuery<CustomersPage>(`/customers?${list.queryString}`);
  const data = query.data;

  const q = list.q;
  const type = list.get("type");
  const active = list.get("active");
  const clientId = list.get("clientId");
  const tab: TabKey = active === "false" ? "blocked" : type === "b2b" ? "b2b" : type === "b2c" ? "b2c" : "all";

  // The picker looks the company up under the same key: one request.
  const company = useAdminQuery<CompanyAnswer>(clientId ? `/companies/${encodeURIComponent(clientId)}` : null);
  const companyName = company.data?.company.id === clientId ? company.data.company.name : company.error ? "не знайдено" : "...";

  const tabHref = (key: TabKey): string => {
    const params = qs({ q, clientId, sort: list.get("sort") === "-createdAt" ? "" : list.get("sort"), ...TAB_PRESET[key] });
    return params ? `${BASE}?${params}` : BASE;
  };
  const counts = data?.counts;

  const chips: FilterChipItem[] = [];
  if (q) chips.push({ key: "q", label: `Пошук: ${q}`, onRemove: () => list.set({ q: null }) });
  if (clientId) chips.push({ key: "clientId", label: `Компанія: ${companyName}`, onRemove: () => list.set({ clientId: null }) });
  // What the open tab does not already say.
  if (tab === "blocked" && type) {
    chips.push({ key: "type", label: type === "b2b" ? "Лише партнери" : "Лише покупці", onRemove: () => list.set({ type: null }) });
  }
  if (active === "true") chips.push({ key: "active", label: "Лише активні", onRemove: () => list.set({ active: null }) });
  const filtered = Boolean(q || clientId || type || active);

  const createHref = clientId ? `${BASE}/new?${qs({ company: clientId })}` : `${BASE}/new`;

  const empty = filtered ? (
    <EmptyState
      title="Нічого не знайдено"
      text="Немає акаунтів, що відповідають пошуку чи фільтрам. Змініть їх або скиньте."
      action={
        <Button variant="secondary" size="sm" onClick={list.reset}>
          Скинути фільтри
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={<UserGroupIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title="Акаунтів ще немає"
      text="Тут з'являться партнери компаній і роздрібні покупці. Створіть акаунт, щоб видати партнеру доступ до кабінету."
      action={
        canEdit ? (
          <Button size="sm" iconLeft={PlusIcon} href={createHref}>
            Створити акаунт
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <Page>
      <PageHeader
        title="Акаунти"
        light={data ? formatNumber(data.total) : undefined}
        subtitle="Партнери компаній і роздрібні покупці сайту"
        actions={
          canEdit ? (
            <Button iconLeft={PlusIcon} href={createHref}>
              Створити акаунт
            </Button>
          ) : undefined
        }
        tabs={
          <LinkTabs
            label="Тип акаунта"
            value={tab}
            items={[
              { key: "all", label: "Усі", href: tabHref("all"), count: counts?.all },
              { key: "b2b", label: "Партнери B2B", href: tabHref("b2b"), count: counts?.b2b },
              { key: "b2c", label: "Покупці B2C", href: tabHref("b2c"), count: counts?.b2c },
              { key: "blocked", label: "Заблоковані", href: tabHref("blocked"), count: counts?.blocked },
            ]}
          />
        }
      />
      <FilterBar
        search={
          <SearchInput
            label="Пошук акаунтів"
            value={q}
            onChange={(next) => list.set({ q: next })}
            placeholder="Ім'я, логін, e-mail або телефон"
          />
        }
        filters={
          <div>
            {/* The bar sizes filters to their content: a phone gets the full
                row (the page gutters are 16 px), a wider screen 280 px. */}
            <div className="w-[calc(100vw-32px)] max-w-full min-[640px]:w-[280px]">
              <CompanyPicker aria-label="Компанія" value={clientId || null} onChange={(id) => list.set({ clientId: id })} placeholder="Усі компанії" />
            </div>
          </div>
        }
        chips={chips}
        onReset={list.reset}
      />
      <DataTable
        caption="Акаунти"
        columns={columns(now)}
        rows={data?.items}
        rowKey={(row) => row.id}
        loading={query.loading}
        stale={query.stale}
        error={query.error}
        onRetry={query.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        rowHref={(row) => `${BASE}/${encodeURIComponent(row.id)}`}
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
    </Page>
  );
}
