"use client";

import {
  ArrowPathIcon,
  BanknotesIcon,
  ChartBarIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { inviteUrl } from "@/components/platform/profile/data";
import { EntityHistory } from "../common/EntityHistory";
import { REGISTERED_GROUP } from "../groups/types";
import { adminApi } from "../lib/api";
import { cx, formatDate, formatMoney, formatNumber } from "../lib/format";
import { invalidate, setQueryData } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card, StatCard } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { DataTable, DateCell, MoneyCell, type Column } from "../ui/DataTable";
import { CopyButton, KeyValueList } from "../ui/KeyValue";
import { PageSection } from "../ui/Page";
import { EmptyState } from "../ui/States";
import { OrderStatusBadge, type OrderStatus } from "../ui/status";
import { toast, toastError } from "../ui/Toast";
import { SURFACE, TEXT, TONES } from "../ui/tokens";
import type { OrderRef } from "../customers/types";
import { CompanyForm } from "./CompanyForm";
import { CabinetBadge, formatPercent } from "./shared";
import { COMPANY_ERRORS, type CompanyAnswer, type CompanyDetail, type PatchCompanyBody } from "./types";

// "Огляд" of a company: the key figures, the editable card and terms (a
// read-only list for roles that may only look), the cabinet switch, the
// invitation code, the last orders and the record's journal.

export function OverviewTab({ company, canEdit }: { company: CompanyDetail; canEdit: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Figures company={company} />
      {canEdit ? <CompanyForm key={company.id} company={company} /> : <CompanyFacts company={company} />}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <RecentOrders company={company} />
        <div className="flex min-w-0 flex-col gap-4">
          <CabinetCard company={company} canEdit={canEdit} />
          <InviteCard company={company} canEdit={canEdit} />
        </div>
      </div>
      {/* related: the lines of its counterparties, contracts and employees too. */}
      <EntityHistory type="company" id={company.id} related refreshKey={company.updatedAt} />
    </div>
  );
}

// One PATCH from a card of this tab; the answer refreshes every screen
// that shows the company.
async function patchCompany(company: CompanyDetail, body: PatchCompanyBody): Promise<boolean> {
  const path = `/companies/${encodeURIComponent(company.id)}`;
  const result = await adminApi<CompanyAnswer>(path, { method: "PATCH", body });
  if (!result.ok) {
    toastError(result, COMPANY_ERRORS);
    return false;
  }
  setQueryData(path, { ok: true, company: result.data.company });
  invalidate("/companies?");
  invalidate("/audit");
  return true;
}

function Figures({ company }: { company: CompanyDetail }) {
  const { can } = useStaff();
  const orders = can("orders.view");
  const { figures } = company;
  const used = figures.creditLimit > 0 ? Math.round((figures.openBalance / figures.creditLimit) * 100) : null;
  const ordersHref = `/admin/orders?clientId=${encodeURIComponent(company.id)}`;
  // Two tiles a row on phones, five from 1280 px: the figures are smaller
  // than the kit's 32 px so six-digit sums stay on one line in each.
  const figure = (text: string, red = false) => (
    <span
      className="text-[22px] leading-7 min-[640px]:text-[26px] min-[640px]:leading-8 min-[1024px]:text-[28px] xl:text-[24px] 2xl:text-[28px]"
      style={red ? { color: TONES.red.text } : undefined}
    >
      {text}
    </span>
  );
  const whole = (value: number) => formatMoney(value, { whole: true });
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 min-[640px]:gap-4 min-[1024px]:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label="Замовлень"
        value={figure(formatNumber(figures.ordersCount))}
        hint="Партнерських, за весь час"
        icon={<ShoppingBagIcon />}
        tone="white"
        href={orders ? ordersHref : undefined}
      />
      <StatCard label="Обіг" value={figure(whole(figures.ordersTotal))} hint="Замовлення, крім скасованих" icon={<ChartBarIcon />} tone="white" />
      <StatCard label="Заборгованість" value={figure(whole(figures.openBalance))} hint="Неоплачені замовлення" icon={<BanknotesIcon />} />
      <StatCard
        label="Прострочено"
        value={figure(whole(figures.overdue), figures.overdue > 0)}
        hint={figures.overdue > 0 ? "Оплату не внесено вчасно" : "Прострочених оплат немає"}
        icon={<ExclamationTriangleIcon />}
        tone="white"
        href={orders && figures.overdue > 0 ? `${ordersHref}&payment=overdue` : undefined}
      />
      <StatCard
        label="Кредитний ліміт"
        value={figure(whole(figures.creditLimit))}
        hint={used === null ? "Ліміти не встановлено" : `Використано ${formatNumber(used)} %`}
        icon={<CreditCardIcon />}
        tone="white"
        className="col-span-2 min-[1024px]:col-span-1"
      />
    </div>
  );
}

// What a role that may only look sees instead of the form.
function CompanyFacts({ company }: { company: CompanyDetail }) {
  return (
    <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
      <Card title="Картка компанії">
        <KeyValueList
          items={[
            { label: "Назва", value: company.name },
            { label: "ЄДРПОУ або ІПН", value: company.edrpou || "Не вказано", copy: company.edrpou || undefined },
            { label: "Область", value: company.region || "Не вказано" },
            { label: "Місто", value: company.city || "Не вказано" },
            { label: "Код в обліковій системі", value: company.externalId || "Не вказано", copy: company.externalId || undefined },
          ]}
        />
      </Card>
      <Card title="Комерційні умови">
        <KeyValueList
          items={[
            { label: "Знижка від прайсу", value: formatPercent(company.discountPercent) },
            {
              label: "Група покупців",
              value: company.group?.name ?? "Групу видалено",
              hint: (company.groupId ?? REGISTERED_GROUP) === REGISTERED_GROUP ? "Група за замовчуванням" : undefined,
            },
            { label: "Менеджер", value: company.manager ? company.manager.name : "Не призначено", hint: company.manager?.email },
            {
              label: "Кредитні ліміти",
              value:
                company.creditLimits.length > 0 ? (
                  <ul className="flex w-full max-w-[440px] flex-col gap-1">
                    {company.creditLimits.map((row) => (
                      <li key={row.counterparty} className="flex flex-wrap justify-between gap-x-4">
                        <span className="min-w-0">{row.counterparty}</span>
                        <span className="tabular-nums">{formatMoney(row.limit, { whole: true })}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "Не встановлено"
                ),
            },
            {
              label: "Залишки",
              value: company.showStock
                ? `Показувати${company.stockDisplayMax !== null ? `, не більше ${formatNumber(company.stockDisplayMax)} шт.` : ""}`
                : "Не показувати",
            },
          ]}
        />
      </Card>
    </div>
  );
}

// On phones the status sits under the number, so the sum stays in view.
const ORDER_COLUMNS: Column<OrderRef>[] = [
  {
    key: "number",
    header: "Замовлення",
    cell: (order) => (
      <span className="flex flex-col items-start gap-1">
        <span className="font-semibold tabular-nums">№{order.number}</span>
        <span className="min-[640px]:hidden">
          <OrderStatusBadge status={order.status as OrderStatus} />
        </span>
      </span>
    ),
  },
  { key: "date", header: "Дата", hideBelow: 640, cell: (order) => <DateCell value={order.date} /> },
  { key: "status", header: "Статус", hideBelow: 640, cell: (order) => <OrderStatusBadge status={order.status as OrderStatus} /> },
  { key: "total", header: "Сума", align: "right", cell: (order) => <MoneyCell value={order.total} /> },
];

function RecentOrders({ company }: { company: CompanyDetail }) {
  const { can } = useStaff();
  const orders = can("orders.view");
  return (
    <PageSection
      title="Останні замовлення"
      actions={
        orders && company.orders.length > 0 ? (
          <Button variant="ghost" size="sm" href={`/admin/orders?clientId=${encodeURIComponent(company.id)}`}>
            Усі замовлення компанії
          </Button>
        ) : undefined
      }
    >
      <DataTable
        caption="Останні замовлення компанії"
        dense
        columns={ORDER_COLUMNS}
        rows={company.orders}
        rowKey={(order) => order.id}
        rowHref={orders ? (order) => `/admin/orders/${encodeURIComponent(order.id)}` : undefined}
        empty={<EmptyState title="Замовлень ще немає" text="Тут будуть останні замовлення, які компанія зробить у кабінеті." />}
      />
    </PageSection>
  );
}

function CabinetCard({ company, canEdit }: { company: CompanyDetail; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    const next = !company.isActive;
    if (!next) {
      const yes = await confirmDialog({
        title: "Вимкнути кабінет компанії?",
        text: "Працівники компанії не зможуть увійти в кабінет, поки його вимкнено. Замовлення, договори й умови залишаться.",
        confirmLabel: "Вимкнути кабінет",
        tone: "danger",
      });
      if (!yes) return;
    }
    setBusy(true);
    const ok = await patchCompany(company, { isActive: next });
    setBusy(false);
    if (ok) toast.success(next ? "Кабінет компанії увімкнено" : "Кабінет компанії вимкнено");
  };
  return (
    <Card title="Кабінет партнера" actions={<CabinetBadge active={company.isActive} size="md" />}>
      <p className={TEXT.muted}>
        {company.isActive
          ? "Працівники компанії входять у кабінет, бачать свої ціни, замовляють і стежать за оплатами."
          : "Працівники компанії не зможуть увійти в кабінет, поки його вимкнено."}
      </p>
      {canEdit && (
        <div className="mt-4 flex flex-col gap-2">
          <Button variant={company.isActive ? "secondary" : "primary"} loading={busy} onClick={() => void toggle()} className="w-fit">
            {company.isActive ? "Вимкнути кабінет" : "Увімкнути кабінет"}
          </Button>
          {company.isActive && <p className={TEXT.caption}>Працівники компанії не зможуть увійти в кабінет, поки його вимкнено.</p>}
        </div>
      )}
    </Card>
  );
}

function InviteCard({ company, canEdit }: { company: CompanyDetail; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);
  const link = inviteUrl(company.inviteToken);
  const regenerate = async () => {
    const yes = await confirmDialog({
      title: "Згенерувати новий код запрошення?",
      text: "Старе посилання перестане діяти. Новий код одразу побачить адміністратор компанії в кабінеті.",
      confirmLabel: "Згенерувати новий",
    });
    if (!yes) return;
    setBusy(true);
    const ok = await patchCompany(company, { regenerateInvite: true });
    setBusy(false);
    if (ok) toast.success("Новий код запрошення створено");
  };
  return (
    <Card title="Запрошення" subtitle="Посилання, за яким адміністратор компанії запрошує колег у кабінет.">
      <div className={cx(SURFACE.inset, "flex min-w-0 items-center justify-between gap-3 py-2.5 pl-4 pr-2")}>
        <span className="min-w-0 truncate text-[14px] font-semibold leading-5 text-neutral-900">{link}</span>
        <CopyButton text={link} label="Скопіювати посилання-запрошення" />
      </div>
      <p className={cx(TEXT.caption, "mt-2")}>
        Код запрошення: <span className="tabular-nums text-neutral-900">{company.inviteToken}</span>
        {company.createdAt && <>, компанія в системі з {formatDate(company.createdAt)}</>}
      </p>
      {canEdit && (
        <Button variant="secondary" size="sm" iconLeft={ArrowPathIcon} loading={busy} onClick={() => void regenerate()} className="mt-4 w-fit">
          Згенерувати новий
        </Button>
      )}
    </Card>
  );
}
