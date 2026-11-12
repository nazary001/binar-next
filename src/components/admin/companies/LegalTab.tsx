"use client";

import { BuildingLibraryIcon, DocumentPlusIcon, PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { CounterpartyStatus } from "@/components/platform/profile/data";
import { adminApi } from "../lib/api";
import { countOf, cx, formatBytes, formatDate, formatMoney, formatNumber, kyivDay } from "../lib/format";
import { invalidate } from "../lib/query";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { KebabMenu } from "../ui/DropdownMenu";
import { PageSection } from "../ui/Page";
import { Select } from "../ui/Select";
import { EmptyState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { SURFACE, TEXT, TONES } from "../ui/tokens";
import { ContractModal, CounterpartyModal } from "./LegalModals";
import {
  CONTRACT_OPTIONS,
  CONTRACT_TONE,
  contractInUseMessage,
  COUNTERPARTY_OPTIONS,
  COUNTERPARTY_TONE,
  counterpartyInUseMessage,
  formatPercent,
  labelOf,
  paymentTermsLabel,
} from "./shared";
import { COMPANY_ERRORS, type CompanyDetail, type ContractDto, type CounterpartyDto } from "./types";

// "Юридичні особи": the counterparties of the company (the legal entities
// that sign contracts and stand in orders), each with its contracts. A
// counterparty the partner adds in the cabinet waits "На розгляді" for the
// manager's check: the status select of each card is that check.

type CpDialog = { open: boolean; n: number; counterparty: CounterpartyDto | null };
type ContractDialog = { open: boolean; n: number; counterparty: CounterpartyDto | null; contract: ContractDto | null };

export function LegalTab({ company, canEdit }: { company: CompanyDetail; canEdit: boolean }) {
  const [cpDialog, setCpDialog] = useState<CpDialog>({ open: false, n: 0, counterparty: null });
  const [ctDialog, setCtDialog] = useState<ContractDialog>({ open: false, n: 0, counterparty: null, contract: null });
  // A new contract starts on the company's own "today" (the demo company
  // lives on a fixed day), else on the Kyiv date of the moment of opening.
  const [today, setToday] = useState("");

  const editCounterparty = (counterparty: CounterpartyDto | null) =>
    setCpDialog((current) => ({ open: true, n: current.n + 1, counterparty }));
  const editContract = (counterparty: CounterpartyDto, contract: ContractDto | null) => {
    setToday(company.demoToday ?? kyivDay());
    setCtDialog((current) => ({ open: true, n: current.n + 1, counterparty, contract }));
  };

  const add = canEdit ? (
    <Button iconLeft={PlusIcon} onClick={() => editCounterparty(null)}>
      Додати юридичну особу
    </Button>
  ) : null;
  const waiting = company.counterparties.filter((cp) => cp.status === "review").length;

  return (
    <PageSection
      title="Юридичні особи"
      description={
        waiting > 0
          ? `${countOf(waiting, ["юридична особа чекає", "юридичні особи чекають", "юридичних осіб чекають"])} вашої перевірки: оберіть статус «Активний» або «Не активний».`
          : "Контрагенти, які підписують договори й стоять у замовленнях. Нові з кабінету чекають вашої перевірки."
      }
      actions={company.counterparties.length > 0 ? add : undefined}
    >
      {company.counterparties.length === 0 ? (
        <div className={SURFACE.card}>
          <EmptyState
            icon={<BuildingLibraryIcon aria-hidden className="size-6" strokeWidth={1.7} />}
            title="Юридичних осіб ще немає"
            text="Компанія додає їх у кабінеті, або ви можете додати тут. Без юридичної особи партнер не оформить замовлення на договір."
            action={add}
          />
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          {company.counterparties.map((counterparty) => (
            <CounterpartyCard
              key={counterparty.id}
              company={company}
              counterparty={counterparty}
              canEdit={canEdit}
              onEdit={() => editCounterparty(counterparty)}
              onContract={(contract) => editContract(counterparty, contract)}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <CounterpartyModal
          key={`cp-${cpDialog.n}`}
          open={cpDialog.open}
          onClose={() => setCpDialog((current) => ({ ...current, open: false }))}
          companyId={company.id}
          counterparty={cpDialog.counterparty}
        />
      )}
      {canEdit && ctDialog.counterparty && (
        <ContractModal
          key={`ct-${ctDialog.n}`}
          open={ctDialog.open}
          onClose={() => setCtDialog((current) => ({ ...current, open: false }))}
          companyId={company.id}
          counterparty={ctDialog.counterparty}
          contract={ctDialog.contract}
          today={today}
        />
      )}
    </PageSection>
  );
}

function CounterpartyCard({
  company,
  counterparty,
  canEdit,
  onEdit,
  onContract,
}: {
  company: CompanyDetail;
  counterparty: CounterpartyDto;
  canEdit: boolean;
  onEdit: () => void;
  onContract: (contract: ContractDto | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const path = `/companies/${encodeURIComponent(company.id)}/counterparties/${encodeURIComponent(counterparty.id)}`;

  const setStatus = async (status: CounterpartyStatus) => {
    if (status === counterparty.status) return;
    setBusy(true);
    const result = await adminApi(path, { method: "PATCH", body: { status } });
    setBusy(false);
    if (!result.ok) {
      toastError(result, COMPANY_ERRORS);
      return;
    }
    invalidate(`/companies/${encodeURIComponent(company.id)}`);
    invalidate("/audit");
    toast.success(`«${counterparty.name}»: ${labelOf(COUNTERPARTY_OPTIONS, status).toLowerCase()}`);
  };

  const remove = async () => {
    const yes = await confirmDialog({
      title: `Видалити «${counterparty.name}»?`,
      text: "Юридична особа та її договори зникнуть з кабінету компанії. Видалити можна лише ту, що не стоїть у замовленнях і розрахунках.",
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!yes) return;
    const result = await adminApi(path, { method: "DELETE" });
    if (!result.ok) {
      if (result.error === "in-use") toast.error(counterpartyInUseMessage(result.data));
      else toastError(result, COMPANY_ERRORS);
      return;
    }
    invalidate(`/companies/${encodeURIComponent(company.id)}`);
    invalidate("/audit");
    toast.success(`«${counterparty.name}» видалено`);
  };

  const limit = company.creditLimits.find((row) => row.counterparty.trim().toLowerCase() === counterparty.name.trim().toLowerCase());
  const facts = [
    `ЄДРПОУ/ІПН ${counterparty.code || "не вказано"}`,
    counterparty.signatory ? `підписант ${counterparty.signatory}` : "підписанта не вказано",
    countOf(counterparty.ordersCount, ["замовлення", "замовлення", "замовлень"]),
    limit ? `кредитний ліміт ${formatMoney(limit.limit, { whole: true })}` : null,
  ].filter(Boolean);

  return (
    <Card padding="none">
      <div className="flex flex-col gap-3 p-5 min-[640px]:flex-row min-[640px]:items-start min-[640px]:justify-between min-[1024px]:p-6">
        <div className="min-w-0">
          <h3 className={cx(TEXT.cardTitle, "[overflow-wrap:anywhere]")}>{counterparty.name}</h3>
          <p className={cx(TEXT.muted, "mt-1")}>{facts.join(", ")}</p>
          {counterparty.externalId && <p className={cx(TEXT.caption, "mt-1")}>Код у BAS: {counterparty.externalId}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit ? (
            <Select
              aria-label={`Статус «${counterparty.name}»`}
              size="sm"
              value={counterparty.status}
              onChange={(value) => void setStatus(value)}
              options={COUNTERPARTY_OPTIONS}
              disabled={busy}
              className="w-[168px]"
            />
          ) : (
            <Badge tone={COUNTERPARTY_TONE[counterparty.status]} dot size="md">
              {labelOf(COUNTERPARTY_OPTIONS, counterparty.status)}
            </Badge>
          )}
          {canEdit && (
            <KebabMenu
              size="sm"
              label={`Дії з «${counterparty.name}»`}
              items={[
                { key: "edit", label: "Редагувати", icon: PencilSquareIcon, onSelect: onEdit },
                { key: "contract", label: "Додати договір", icon: DocumentPlusIcon, onSelect: () => onContract(null) },
                { key: "sep", divider: true },
                { key: "delete", label: "Видалити", icon: TrashIcon, tone: "danger", onSelect: () => void remove() },
              ]}
            />
          )}
        </div>
      </div>

      <div className="border-t border-stroke-subtle px-5 py-4 min-[1024px]:px-6 min-[1024px]:py-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className={TEXT.bodyStrong}>
            Договори <span className="font-normal text-neutral-500 tabular-nums">{formatNumber(counterparty.contracts.length)}</span>
          </p>
          {canEdit && counterparty.contracts.length > 0 && (
            <Button variant="ghost" size="sm" iconLeft={PlusIcon} onClick={() => onContract(null)}>
              Додати договір
            </Button>
          )}
        </div>
        {counterparty.contracts.length === 0 ? (
          <div className={cx(SURFACE.inset, "flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
            <p className={TEXT.muted}>Договорів ще немає.</p>
            {canEdit && (
              <Button variant="secondary" size="sm" iconLeft={PlusIcon} onClick={() => onContract(null)}>
                Додати договір
              </Button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {counterparty.contracts.map((contract) => (
              <ContractTile
                key={contract.id}
                company={company}
                counterparty={counterparty}
                contract={contract}
                canEdit={canEdit}
                onEdit={() => onContract(contract)}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <div className="min-w-0">
      <dt className={TEXT.caption}>{label}</dt>
      <dd
        className={cx("mt-0.5 truncate text-[14px] font-semibold leading-5 tabular-nums", value === "-" ? "text-neutral-400" : "text-neutral-900")}
        style={tone === "red" ? { color: TONES.red.text } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function ContractTile({
  company,
  counterparty,
  contract,
  canEdit,
  onEdit,
}: {
  company: CompanyDetail;
  counterparty: CounterpartyDto;
  contract: ContractDto;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const remove = async () => {
    const yes = await confirmDialog({
      title: `Видалити договір ${contract.number}?`,
      text: "Договір зникне з кабінету компанії. Договір, на який посилаються взаєморозрахунки, видалити не можна.",
      confirmLabel: "Видалити договір",
      tone: "danger",
    });
    if (!yes) return;
    const path = `/companies/${encodeURIComponent(company.id)}/counterparties/${encodeURIComponent(counterparty.id)}/contracts/${encodeURIComponent(contract.id)}`;
    const result = await adminApi(path, { method: "DELETE" });
    if (!result.ok) {
      if (result.error === "in-use") toast.error(contractInUseMessage(result.data));
      else toastError(result, COMPANY_ERRORS);
      return;
    }
    invalidate(`/companies/${encodeURIComponent(company.id)}`);
    invalidate("/audit");
    toast.success(`Договір ${contract.number} видалено`);
  };

  const hasErp =
    contract.discountPercent !== null ||
    contract.creditLimit !== null ||
    contract.currentDebt !== null ||
    contract.overdueDebt !== null ||
    contract.oldestDebtDays !== null ||
    contract.paymentTerms !== null;
  const money = (value: number | null) => (value === null ? "-" : formatMoney(value));
  const terms =
    contract.paymentTerms === "deferred" && contract.paymentDays !== null
      ? `${paymentTermsLabel(contract.paymentTerms)}, ${formatNumber(contract.paymentDays)} дн.`
      : paymentTermsLabel(contract.paymentTerms);
  const scan = contract.file.size > 0 ? `${contract.file.format || "Файл"}, ${formatBytes(contract.file.size)}` : "скан не завантажено";

  return (
    <li className={cx(SURFACE.inset, "flex flex-col gap-3 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className={cx(TEXT.bodyStrong, "tabular-nums")}>{contract.number}</span>
          <span className={cx(TEXT.muted, "tabular-nums")}>від {formatDate(contract.date)}</span>
          <Badge tone={CONTRACT_TONE[contract.status]} dot>
            {labelOf(CONTRACT_OPTIONS, contract.status)}
          </Badge>
          <span className={TEXT.caption}>{scan}</span>
        </div>
        {canEdit && (
          <div className="-my-1 flex shrink-0 items-center gap-1">
            <IconButton label={`Редагувати договір ${contract.number}`} icon={PencilSquareIcon} size="sm" onClick={onEdit} />
            <IconButton label={`Видалити договір ${contract.number}`} icon={TrashIcon} size="sm" variant="danger" onClick={() => void remove()} />
          </div>
        )}
      </div>
      {hasErp ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 min-[640px]:grid-cols-3 xl:grid-cols-6">
          <Fact label="Знижка" value={formatPercent(contract.discountPercent)} />
          <Fact label="Кредитний ліміт" value={money(contract.creditLimit)} />
          <Fact label="Поточний борг" value={money(contract.currentDebt)} />
          <Fact label="Прострочений борг" value={money(contract.overdueDebt)} tone={(contract.overdueDebt ?? 0) > 0 ? "red" : undefined} />
          <Fact
            label="Днів прострочки"
            value={contract.oldestDebtDays === null ? "-" : formatNumber(contract.oldestDebtDays)}
            tone={(contract.oldestDebtDays ?? 0) > 0 ? "red" : undefined}
          />
          <Fact label="Умови оплати" value={terms} />
        </dl>
      ) : (
        <p className={TEXT.caption}>Умови з облікової системи ще не надходили: знижку, ліміт і борг за договором заповнить обмін з BAS.</p>
      )}
    </li>
  );
}
