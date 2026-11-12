"use client";

import { useState, type FormEvent } from "react";
import type { ContractStatus, CounterpartyStatus } from "@/components/platform/profile/data";
import type { PriceTypeListAnswer } from "../catalog/types";
import { adminApi } from "../lib/api";
import { cx } from "../lib/format";
import { invalidate, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { DateInput } from "../ui/DateInput";
import { FormGrid } from "../ui/Form";
import { Input, MoneyInput, NumberInput } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { Select } from "../ui/Select";
import { toast, toastError } from "../ui/Toast";
import { SURFACE, TEXT } from "../ui/tokens";
import { codeOk, CONTRACT_OPTIONS, COUNTERPARTY_OPTIONS, fieldErrors } from "./shared";
import {
  COMPANY_ERRORS,
  COMPANY_NAME_MAX,
  PAYMENT_TERMS,
  type ContractAnswer,
  type ContractDto,
  type CounterpartyAnswer,
  type CounterpartyDto,
  type CreateContractBody,
  type CreateCounterpartyBody,
  type PatchContractBody,
  type PaymentTerms,
} from "./types";

// The add / edit dialogs of the "Юридичні особи" tab: a counterparty
// (legal entity) and a contract of one. Each dialog is mounted afresh for
// every opening (the caller keys it), so its fields start from the record.

const MONEY_MAX = 1_000_000_000_000;

// --- counterparty ---------------------------------------------------------------

type CounterpartyForm = { name: string; code: string; signatory: string; status: CounterpartyStatus; externalId: string };

export function CounterpartyModal({
  open,
  onClose,
  companyId,
  counterparty,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string;
  counterparty: CounterpartyDto | null;
}) {
  const initial: CounterpartyForm = {
    name: counterparty?.name ?? "",
    code: counterparty?.code ?? "",
    signatory: counterparty?.signatory ?? "",
    status: counterparty?.status ?? "active",
    externalId: counterparty?.externalId ?? "",
  };
  const [form, setForm] = useState<CounterpartyForm>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const formId = "counterparty-form";
  const editing = counterparty !== null;

  const set = <K extends keyof CounterpartyForm>(key: K, value: CounterpartyForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!form.name.trim()) found.name = "Вкажіть юридичну назву";
    const codeChanged = form.code.trim() !== initial.code;
    if (!form.code.trim()) found.code = "Вкажіть ЄДРПОУ або ІПН";
    else if ((codeChanged || !editing) && !codeOk(form.code)) found.code = "8 цифр (ЄДРПОУ) або 10 цифр (ІПН)";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const base = `/companies/${encodeURIComponent(companyId)}/counterparties`;
    let path = base;
    let body: Partial<CreateCounterpartyBody>;
    if (editing) {
      path = `${base}/${encodeURIComponent(counterparty.id)}`;
      body = {};
      if (form.name.trim() !== initial.name) body.name = form.name.trim();
      if (codeChanged) body.code = form.code.trim();
      if (form.signatory.trim() !== initial.signatory) body.signatory = form.signatory.trim();
      if (form.status !== initial.status) body.status = form.status;
      if (form.externalId.trim() !== initial.externalId) body.externalId = form.externalId.trim() || null;
      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }
    } else {
      body = {
        name: form.name.trim(),
        code: form.code.trim(),
        signatory: form.signatory.trim(),
        status: form.status,
        ...(form.externalId.trim() ? { externalId: form.externalId.trim() } : {}),
      };
    }
    setBusy(true);
    const result = await adminApi<CounterpartyAnswer>(path, { method: editing ? "PATCH" : "POST", body });
    setBusy(false);
    if (!result.ok) {
      const fields = fieldErrors(result);
      if (Object.keys(fields).length > 0) setErrors(fields);
      else if (result.error === "exists") setErrors({ externalId: "Цей код уже має інша юридична особа" });
      else toastError(result, { ...COMPANY_ERRORS, limit: "У компанії вже 100 юридичних осіб: більше додати не можна." });
      return;
    }
    invalidate(`/companies/${encodeURIComponent(companyId)}`);
    invalidate("/audit");
    toast.success(editing ? "Зміни збережено" : `Юридичну особу «${result.data.counterparty.name}» додано`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={editing ? "Юридична особа" : "Нова юридична особа"}
      description={editing ? counterparty.name : "Контрагент компанії, який підписує договори й стоїть у замовленнях."}
      footer={<ModalFooter onCancel={onClose} confirmLabel={editing ? "Зберегти зміни" : "Додати юридичну особу"} form={formId} busy={busy} />}
    >
      <form id={formId} onSubmit={submit} noValidate>
        <FormGrid>
          <Input
            label="Юридична назва"
            required
            value={form.name}
            onChange={(value) => set("name", value)}
            error={errors.name}
            maxLength={COMPANY_NAME_MAX}
            placeholder="ТОВ «Готель Дністер»"
            hint={
              editing
                ? "Замовлення й кредитні ліміти знаходять контрагента за назвою: після перейменування оновіть назву і в лімітах."
                : undefined
            }
            className="col-span-full"
          />
          <Input
            label="ЄДРПОУ або ІПН"
            required
            value={form.code}
            onChange={(value) => set("code", value)}
            error={errors.code}
            inputMode="numeric"
            maxLength={10}
            hint="8 цифр для юридичної особи, 10 для ФОП"
          />
          <Select
            label="Статус"
            value={form.status}
            onChange={(value) => set("status", value)}
            options={COUNTERPARTY_OPTIONS}
            hint="«На розгляді» - чекає вашої перевірки"
          />
          <Input
            label="Підписант"
            optional
            value={form.signatory}
            onChange={(value) => set("signatory", value)}
            maxLength={COMPANY_NAME_MAX}
            placeholder="Прізвище та ім'я"
          />
          <Input
            label="Код в обліковій системі"
            optional
            value={form.externalId}
            onChange={(value) => set("externalId", value)}
            error={errors.externalId}
            maxLength={64}
            hint="Заповнює обмін з BAS"
          />
        </FormGrid>
      </form>
    </Modal>
  );
}

// --- contract ---------------------------------------------------------------------

type ContractForm = {
  number: string;
  date: string;
  status: ContractStatus;
  discountPercent: number | null;
  creditLimit: number | null;
  currentDebt: number | null;
  overdueDebt: number | null;
  oldestDebtDays: number | null;
  paymentTerms: PaymentTerms | null;
  paymentDays: number | null;
  priceTypeId: string | null;
  externalId: string;
};

const ERP_KEYS = [
  "discountPercent",
  "creditLimit",
  "currentDebt",
  "overdueDebt",
  "oldestDebtDays",
  "paymentTerms",
  "paymentDays",
  "priceTypeId",
] as const;

function contractForm(contract: ContractDto | null, today: string): ContractForm {
  return {
    number: contract?.number ?? "",
    date: contract?.date ?? today,
    status: contract?.status ?? "active",
    discountPercent: contract?.discountPercent ?? null,
    creditLimit: contract?.creditLimit ?? null,
    currentDebt: contract?.currentDebt ?? null,
    overdueDebt: contract?.overdueDebt ?? null,
    oldestDebtDays: contract?.oldestDebtDays ?? null,
    paymentTerms: contract?.paymentTerms ?? null,
    paymentDays: contract?.paymentDays ?? null,
    priceTypeId: contract?.priceTypeId ?? null,
    externalId: contract?.externalId ?? "",
  };
}

export function ContractModal({
  open,
  onClose,
  companyId,
  counterparty,
  contract,
  today,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string;
  counterparty: CounterpartyDto;
  contract: ContractDto | null;
  // "YYYY-MM-DD": the date a new contract starts with.
  today: string;
}) {
  const { can } = useStaff();
  const initial = contractForm(contract, today);
  const [form, setForm] = useState<ContractForm>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const formId = "contract-form";
  const editing = contract !== null;
  const priceTypes = useAdminQuery<PriceTypeListAnswer>(can("catalog.view") ? "/price-types?sort=name&limit=100" : null);
  const priceOptions = (priceTypes.data?.items ?? []).map((type) => ({ value: type.id, label: type.name }));
  if (form.priceTypeId && priceTypes.data && !priceOptions.some((option) => option.value === form.priceTypeId)) {
    priceOptions.push({ value: form.priceTypeId, label: "Тип цін видалено" });
  }

  const set = <K extends keyof ContractForm>(key: K, value: ContractForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!form.number.trim()) found.number = "Вкажіть номер договору";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) found.date = "Вкажіть дату підписання";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    let body: CreateContractBody | PatchContractBody;
    if (editing) {
      const patch: PatchContractBody = {};
      if (form.number.trim() !== initial.number) patch.number = form.number.trim();
      if (form.date !== initial.date) patch.date = form.date;
      if (form.status !== initial.status) patch.status = form.status;
      for (const key of ERP_KEYS) {
        if (form[key] !== initial[key]) (patch as Record<string, unknown>)[key] = form[key];
      }
      if (form.externalId.trim() !== initial.externalId) patch.externalId = form.externalId.trim() || null;
      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }
      body = patch;
    } else {
      const create: CreateContractBody = { number: form.number.trim(), date: form.date, status: form.status };
      for (const key of ERP_KEYS) {
        if (form[key] !== null) (create as Record<string, unknown>)[key] = form[key];
      }
      if (form.externalId.trim()) create.externalId = form.externalId.trim();
      body = create;
    }

    const base = `/companies/${encodeURIComponent(companyId)}/counterparties/${encodeURIComponent(counterparty.id)}/contracts`;
    const path = editing ? `${base}/${encodeURIComponent(contract.id)}` : base;
    setBusy(true);
    const result = await adminApi<ContractAnswer>(path, { method: editing ? "PATCH" : "POST", body });
    setBusy(false);
    if (!result.ok) {
      const fields = fieldErrors(result, { "priceTypeId:not-found": "Такого типу цін уже немає" });
      if (Object.keys(fields).length > 0) setErrors(fields);
      else if (result.error === "exists") setErrors({ externalId: "Цей код уже має інший договір" });
      else toastError(result, { ...COMPANY_ERRORS, limit: "У цієї юридичної особи вже 50 договорів: більше додати не можна." });
      return;
    }
    invalidate(`/companies/${encodeURIComponent(companyId)}`);
    invalidate("/audit");
    toast.success(editing ? "Договір збережено" : `Договір ${result.data.contract.number} додано`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="lg"
      title={editing ? `Договір ${contract.number}` : "Новий договір"}
      description={counterparty.name}
      footer={<ModalFooter onCancel={onClose} confirmLabel={editing ? "Зберегти зміни" : "Додати договір"} form={formId} busy={busy} />}
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-6">
        <FormGrid columns={3}>
          <Input
            label="Номер"
            required
            value={form.number}
            onChange={(value) => set("number", value)}
            error={errors.number}
            maxLength={64}
            placeholder="№432-01"
          />
          <DateInput label="Дата підписання" required value={form.date} onChange={(value) => set("date", value)} error={errors.date} />
          <Select label="Статус" value={form.status} onChange={(value) => set("status", value)} options={CONTRACT_OPTIONS} />
        </FormGrid>

        <div className={cx(SURFACE.inset, "flex flex-col gap-4 p-4 min-[640px]:p-5")}>
          <div>
            <p className={TEXT.cardTitle}>Умови з облікової системи</p>
            <p className={cx(TEXT.caption, "mt-1")}>
              Зазвичай їх заповнює обмін з BAS. Змінюйте вручну, лише поки обміну немає. Порожнє поле - «не відомо».
            </p>
          </div>
          <FormGrid columns={3}>
            <NumberInput
              label="Знижка за договором"
              value={form.discountPercent}
              onChange={(value) => set("discountPercent", value)}
              min={0}
              max={99.99}
              precision={2}
              suffix="%"
            />
            <MoneyInput label="Кредитний ліміт" value={form.creditLimit} onChange={(value) => set("creditLimit", value)} max={MONEY_MAX} />
            <Select
              label="Умови оплати"
              value={form.paymentTerms}
              onChange={(value) => set("paymentTerms", value)}
              options={PAYMENT_TERMS}
              clearable
              placeholder="Не вказано"
            />
            <NumberInput
              label="Відстрочка"
              value={form.paymentDays}
              onChange={(value) => set("paymentDays", value)}
              min={0}
              max={3650}
              precision={0}
              suffix="дн."
            />
            <MoneyInput
              label="Поточний борг"
              value={form.currentDebt}
              onChange={(value) => set("currentDebt", value)}
              min={-MONEY_MAX}
              max={MONEY_MAX}
              hint="Мінус - переплата"
            />
            <MoneyInput
              label="Прострочений борг"
              value={form.overdueDebt}
              onChange={(value) => set("overdueDebt", value)}
              min={-MONEY_MAX}
              max={MONEY_MAX}
            />
            <NumberInput
              label="Днів прострочки"
              value={form.oldestDebtDays}
              onChange={(value) => set("oldestDebtDays", value)}
              min={0}
              max={36_500}
              precision={0}
              hint="Найстаріший неоплачений борг"
            />
            {can("catalog.view") && (
              <Select
                label="Тип цін"
                value={form.priceTypeId}
                onChange={(value) => set("priceTypeId", value)}
                options={priceOptions}
                clearable
                error={errors.priceTypeId}
                placeholder={priceOptions.length === 0 ? "Типів цін ще немає" : "Не вказано"}
                disabled={priceOptions.length === 0 && !form.priceTypeId}
              />
            )}
            <Input
              label="Код в обліковій системі"
              value={form.externalId}
              onChange={(value) => set("externalId", value)}
              error={errors.externalId}
              maxLength={64}
            />
          </FormGrid>
        </div>
      </form>
    </Modal>
  );
}
