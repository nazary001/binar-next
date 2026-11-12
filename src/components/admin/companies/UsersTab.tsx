"use client";

import { UserPlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { ACCESS_ROLES, type CustomerRow } from "../customers/types";
import { formatDateTime, formatPhone } from "../lib/format";
import { Button } from "../ui/Button";
import { DataTable, TwoLineCell, type Column } from "../ui/DataTable";
import { PageSection } from "../ui/Page";
import { EmptyState } from "../ui/States";
import { ActiveBadge } from "../ui/status";
import { TEXT } from "../ui/tokens";
import type { CompanyDetail } from "./types";

// "Користувачі": the sign-in accounts of the company. Each row opens the
// account; a new one is made on the accounts screen with the company
// already chosen.

const COLUMNS: Column<CustomerRow>[] = [
  {
    key: "name",
    header: "Акаунт",
    // A table cell ignores max-width: the box inside sets it.
    cell: (row) => (
      <span className="block max-w-[200px] min-[640px]:max-w-[320px]">
        <TwoLineCell title={row.name || row.login} subtitle={row.login} />
      </span>
    ),
  },
  {
    key: "role",
    header: "Роль у компанії",
    hideBelow: 640,
    cell: (row) => ACCESS_ROLES.find((role) => role.value === row.role)?.label ?? <span className="text-neutral-400">Не вказано</span>,
  },
  {
    key: "contacts",
    header: "Контакти",
    hideBelow: 1280,
    cell: (row) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{row.phone ? formatPhone(row.phone) : "-"}</span>
        {row.email && <span className={TEXT.caption}>{row.email}</span>}
      </span>
    ),
  },
  {
    key: "login",
    header: "Останній вхід",
    hideBelow: 1024,
    cell: (row) => (row.lastLoginAt ? <span className="tabular-nums">{formatDateTime(row.lastLoginAt)}</span> : <span className="text-neutral-400">Ще не входив</span>),
  },
  { key: "state", header: "Стан", cell: (row) => <ActiveBadge active={row.isActive} /> },
];

export function UsersTab({ company, canEdit }: { company: CompanyDetail; canEdit: boolean }) {
  const createHref = `/admin/customers/new?company=${encodeURIComponent(company.id)}`;
  const create = canEdit ? (
    <Button iconLeft={UserPlusIcon} href={createHref}>
      Створити акаунт
    </Button>
  ) : null;
  return (
    <PageSection
      title="Акаунти компанії"
      description="Люди, які входять у кабінет від імені компанії: замовляють, бачать документи й оплати."
      actions={
        company.users.length > 0 ? (
          <>
            <Button variant="ghost" href={`/admin/customers?clientId=${encodeURIComponent(company.id)}`}>
              Відкрити в розділі «Акаунти»
            </Button>
            {create}
          </>
        ) : undefined
      }
    >
      <DataTable
        caption="Акаунти компанії"
        columns={COLUMNS}
        rows={company.users}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/customers/${encodeURIComponent(row.id)}`}
        empty={
          <EmptyState
            icon={<UsersIcon aria-hidden className="size-6" strokeWidth={1.7} />}
            title="У компанії ще немає акаунтів"
            text="Створіть акаунт, щоб працівник компанії міг увійти в кабінет і замовляти."
            action={create}
          />
        }
      />
    </PageSection>
  );
}
