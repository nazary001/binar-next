"use client";

import { ShoppingBagIcon, TrashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "../lib/api";
import { invalidate, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { confirmDialog } from "../ui/ConfirmDialog";
import { KebabMenu, type MenuItem } from "../ui/DropdownMenu";
import { CopyButton } from "../ui/KeyValue";
import { Page, PageHeader } from "../ui/Page";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState, NotFoundState } from "../ui/States";
import { LinkTabs } from "../ui/Tabs";
import { toast, toastError } from "../ui/Toast";
import { SURFACE, TEXT } from "../ui/tokens";
import { EmployeesTab } from "./EmployeesTab";
import { LedgerTab } from "./LedgerTab";
import { LegalTab } from "./LegalTab";
import { NotesTab } from "./NotesTab";
import { OverviewTab } from "./OverviewTab";
import { CabinetBadge, companyInUseMessage } from "./shared";
import { COMPANY_ERRORS, type CompanyAnswer, type CompanyDetail } from "./types";
import { UsersTab } from "./UsersTab";

// /admin/companies/<id>: one partner company. The tabs are addresses
// (?tab=...), so a link can open the legal entities (?tab=contracts) or
// the settlements directly.

const TABS = ["overview", "users", "contracts", "employees", "ledger", "notes"] as const;
type TabKey = (typeof TABS)[number];

function tabOf(value: string | null): TabKey {
  return (TABS as readonly string[]).includes(value ?? "") ? (value as TabKey) : "overview";
}

export function CompanyScreen({ id }: { id: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const tab = tabOf(search.get("tab"));
  const { can } = useStaff();
  const canEdit = can("customers.edit");
  const path = `/companies/${encodeURIComponent(id)}`;
  const query = useAdminQuery<CompanyAnswer>(path);
  // While another company's answer is still on screen (stale), wait.
  const company = query.data?.company?.id === id ? query.data.company : undefined;

  if (!company) {
    if (query.error?.status === 404 || query.error?.error === "not-found") {
      return (
        <Page>
          <NotFoundState
            title="Компанію не знайдено"
            text="Можливо, її вже видалили або адреса неточна."
            backHref="/admin/companies"
            backLabel="До списку компаній"
          />
        </Page>
      );
    }
    if (query.error) {
      return (
        <Page>
          <div className={SURFACE.card}>
            <ErrorState failure={query.error} onRetry={query.reload} />
          </div>
        </Page>
      );
    }
    return <CompanySkeleton />;
  }

  const remove = async () => {
    const yes = await confirmDialog({
      title: `Видалити компанію «${company.name}»?`,
      text: "Компанію, її юридичні особи й список співробітників буде видалено назавжди. Видалити можна лише компанію без акаунтів, замовлень і розрахунків.",
      confirmLabel: "Видалити компанію",
      tone: "danger",
    });
    if (!yes) return;
    const result = await adminApi(path, { method: "DELETE" });
    if (!result.ok) {
      if (result.error === "in-use") toast.error(companyInUseMessage(result.data));
      else toastError(result, COMPANY_ERRORS);
      return;
    }
    toast.success(`Компанію «${company.name}» видалено`);
    // Only the lists: this page's own record would be asked for again
    // while it is still on screen and answer "not found".
    invalidate("/companies?");
    invalidate("/customer-groups");
    router.replace("/admin/companies");
  };

  const menu: MenuItem[] = [];
  if (can("orders.view")) {
    menu.push({ key: "orders", label: "Замовлення компанії", icon: ShoppingBagIcon, href: `/admin/orders?clientId=${encodeURIComponent(id)}` });
  }
  if (canEdit) {
    if (menu.length > 0) menu.push({ key: "sep", divider: true });
    menu.push({ key: "delete", label: "Видалити компанію", icon: TrashIcon, tone: "danger", onSelect: () => void remove() });
  }

  const base = `/admin/companies/${encodeURIComponent(id)}`;
  const tabs = [
    { key: "overview", label: "Огляд", href: base },
    { key: "users", label: "Користувачі", href: `${base}?tab=users`, count: company.users.length },
    { key: "contracts", label: "Юридичні особи", href: `${base}?tab=contracts`, count: company.counterparties.length },
    { key: "employees", label: "Співробітники", href: `${base}?tab=employees`, count: company.employees.length },
    { key: "ledger", label: "Взаєморозрахунки", href: `${base}?tab=ledger` },
    { key: "notes", label: "Нотатки", href: `${base}?tab=notes`, count: company.notes.length },
  ];

  return (
    <Page>
      <PageHeader
        back={{ href: "/admin/companies", label: "Компанії" }}
        title={company.name}
        meta={<HeaderMeta company={company} />}
        actions={
          <>
            {canEdit && (
              <Button variant="secondary" iconLeft={UserPlusIcon} href={`/admin/customers/new?company=${encodeURIComponent(id)}`}>
                Створити акаунт
              </Button>
            )}
            {menu.length > 0 && <KebabMenu label={`Дії з компанією «${company.name}»`} items={menu} />}
          </>
        }
        tabs={<LinkTabs label="Розділи компанії" value={tab} items={tabs} />}
      />
      <TabBody tab={tab} company={company} canEdit={canEdit} />
    </Page>
  );
}

function TabBody({ tab, company, canEdit }: { tab: TabKey; company: CompanyDetail; canEdit: boolean }) {
  switch (tab) {
    case "users":
      return <UsersTab company={company} canEdit={canEdit} />;
    case "contracts":
      return <LegalTab company={company} canEdit={canEdit} />;
    case "employees":
      return <EmployeesTab company={company} canEdit={canEdit} />;
    case "ledger":
      return <LedgerTab company={company} />;
    case "notes":
      return <NotesTab company={company} canEdit={canEdit} />;
    default:
      return <OverviewTab company={company} canEdit={canEdit} />;
  }
}

function HeaderMeta({ company }: { company: CompanyDetail }) {
  // "Київ" once when the city and the region carry the same word.
  const place = [...new Set([company.city.trim(), company.region.trim()].filter(Boolean))].join(", ");
  return (
    <>
      <CabinetBadge active={company.isActive} size="md" long />
      {company.edrpou ? (
        <span className={TEXT.muted}>
          <span className="inline-flex items-center gap-1">
            ЄДРПОУ <span className="tabular-nums text-neutral-900">{company.edrpou}</span>
            <CopyButton text={company.edrpou} label="Скопіювати ЄДРПОУ" />
          </span>
        </span>
      ) : (
        <span className={TEXT.muted}>ЄДРПОУ не вказано</span>
      )}
      {place && <span className={TEXT.muted}>{place}</span>}
      {company.seed && (
        <Badge tone="blue" size="md">
          Демо-компанія
        </Badge>
      )}
      {company.test && (
        <Badge tone="neutral" size="md">
          Тестова
        </Badge>
      )}
    </>
  );
}

function CompanySkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-4 pb-6">
        <Skeleton shape="pill" className="h-8 w-28" />
        <Skeleton className="h-9 w-[min(420px,80%)]" />
        <Skeleton className="h-5 w-[min(320px,60%)]" />
        <Skeleton shape="pill" className="h-10 w-[min(640px,100%)]" />
      </div>
      <div className="grid gap-4 min-[640px]:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className={`${SURFACE.card} p-6`}>
            <SkeletonText lines={2} />
          </div>
        ))}
      </div>
      <div className={`${SURFACE.card} mt-4 p-6`}>
        <SkeletonText lines={6} />
      </div>
    </Page>
  );
}
