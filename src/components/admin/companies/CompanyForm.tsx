"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";
import { StaffSelect } from "../common/pickers";
import { GUESTS_GROUP, REGISTERED_GROUP, type CustomerGroupsPage } from "../groups/types";
import { adminApi } from "../lib/api";
import { cx, formatDateTime, formatMoney } from "../lib/format";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { Button, IconButton } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { FIELD_ERROR } from "../ui/Field";
import { FormActions, FormGrid, FormSection, useUnsavedWarning } from "../ui/Form";
import { Input, MoneyInput, NumberInput } from "../ui/Input";
import { Select } from "../ui/Select";
import { toast, toastError } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { codeOk, fieldErrors } from "./shared";
import {
  COMPANY_CITY_MAX,
  COMPANY_ERRORS,
  COMPANY_NAME_MAX,
  COMPANY_REGION_MAX,
  CREDIT_LIMITS_MAX,
  type CompanyAnswer,
  type CompanyDetail,
  type PatchCompanyBody,
} from "./types";

// The editable part of the company's overview: the card (name and
// requisites), the commercial terms and the stock / accounting fields, one
// form with one sticky "Зберегти зміни". Only what changed is sent.
//
// The form starts from the loaded company and keeps the staff's edits when
// the record changes underneath (a new invitation code, the cabinet switch
// on the same page): fields nobody touched take the new values.

type LimitRow = { key: string; counterparty: string; limit: number | null };

type FormState = {
  name: string;
  edrpou: string;
  region: string;
  city: string;
  discount: number | null;
  groupId: string;
  managerId: string | null;
  limits: LimitRow[];
  showStock: boolean;
  stockDisplayMax: number | null;
  externalId: string;
};

const KEYS = [
  "name",
  "edrpou",
  "region",
  "city",
  "discount",
  "groupId",
  "managerId",
  "limits",
  "showStock",
  "stockDisplayMax",
  "externalId",
] as const;

function formOf(company: CompanyDetail): FormState {
  return {
    name: company.name,
    edrpou: company.edrpou,
    region: company.region,
    city: company.city,
    discount: company.discountPercent,
    groupId: company.groupId ?? REGISTERED_GROUP,
    managerId: company.managerId,
    limits: company.creditLimits.map((row, index) => ({ key: `l${index}`, counterparty: row.counterparty, limit: row.limit })),
    showStock: company.showStock,
    stockDisplayMax: company.stockDisplayMax,
    externalId: company.externalId ?? "",
  };
}

// The comparable value of a field (limits without their React keys).
function valueOf(form: FormState, key: (typeof KEYS)[number]): string {
  if (key === "limits") return JSON.stringify(form.limits.map((row) => [row.counterparty.trim(), row.limit]));
  return JSON.stringify(form[key]);
}

function rebase(oldBase: FormState, newBase: FormState, form: FormState): FormState {
  const next = { ...form } as Record<string, unknown>;
  for (const key of KEYS) {
    if (valueOf(form, key) === valueOf(oldBase, key)) next[key] = newBase[key];
  }
  return next as FormState;
}

const groupValue = (id: string) => (id === REGISTERED_GROUP ? null : id);

function patchOf(base: FormState, form: FormState): PatchCompanyBody {
  const patch: PatchCompanyBody = {};
  if (form.name.trim() !== base.name) patch.name = form.name.trim();
  if (form.edrpou.trim() !== base.edrpou) patch.edrpou = form.edrpou.trim();
  if (form.region.trim() !== base.region) patch.region = form.region.trim();
  if (form.city.trim() !== base.city) patch.city = form.city.trim();
  if ((form.discount ?? 0) !== base.discount) patch.discountPercent = form.discount ?? 0;
  if (groupValue(form.groupId) !== groupValue(base.groupId)) patch.groupId = groupValue(form.groupId);
  if (form.managerId !== base.managerId) patch.managerId = form.managerId;
  if (valueOf(form, "limits") !== valueOf(base, "limits")) {
    patch.creditLimits = form.limits.map((row) => ({ counterparty: row.counterparty.trim(), limit: row.limit ?? 0 }));
  }
  if (form.showStock !== base.showStock) patch.showStock = form.showStock;
  if (form.stockDisplayMax !== base.stockDisplayMax) patch.stockDisplayMax = form.stockDisplayMax;
  if (form.externalId.trim() !== base.externalId) patch.externalId = form.externalId.trim() || null;
  return patch;
}

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Вкажіть назву компанії";
  if (form.edrpou.trim() && !codeOk(form.edrpou)) errors.edrpou = "8 цифр (ЄДРПОУ) або 10 цифр (ІПН)";
  const seen = new Set<string>();
  for (const row of form.limits) {
    const name = row.counterparty.trim().toLowerCase();
    if (!name) errors[`limit:${row.key}`] = "Вкажіть назву контрагента";
    else if (seen.has(name)) errors[`limit:${row.key}`] = "Для цього контрагента ліміт уже є";
    else if (row.limit === null) errors[`limit:${row.key}`] = "Вкажіть суму ліміту";
    seen.add(name);
  }
  return errors;
}

export function CompanyForm({ company }: { company: CompanyDetail }) {
  const initial = formOf(company);
  const [base, setBase] = useState<FormState>(initial);
  const [form, setForm] = useState<FormState>(initial);
  const [seen, setSeen] = useState(company.updatedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [rowCounter, setRowCounter] = useState(0);

  // The record changed underneath (another action on this page, a save
  // in another tab): untouched fields follow it, edits stay.
  if (seen !== company.updatedAt) {
    setSeen(company.updatedAt);
    setBase(initial);
    setForm(rebase(base, initial, form));
  }

  const patch = patchOf(base, form);
  const dirty = Object.keys(patch).length > 0;
  useUnsavedWarning(dirty);

  const groups = useAdminQuery<CustomerGroupsPage>("/customer-groups?sort=name&limit=100");
  const groupOptions = (groups.data?.items ?? [])
    .filter((group) => group.id !== GUESTS_GROUP)
    .map((group) => ({ value: group.id, label: group.name, hint: group.system ? "Системна група" : undefined }));
  if (form.groupId && groups.data && !groupOptions.some((option) => option.value === form.groupId)) {
    groupOptions.push({ value: form.groupId, label: "Групу видалено", hint: "Оберіть іншу групу" });
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  };

  const setLimit = (key: string, change: Partial<LimitRow>) => {
    setForm((current) => ({ ...current, limits: current.limits.map((row) => (row.key === key ? { ...row, ...change } : row)) }));
    if (errors[`limit:${key}`] || errors.creditLimits) setErrors((current) => ({ ...current, [`limit:${key}`]: "", creditLimits: "" }));
  };

  const addLimit = (counterparty = "") => {
    const key = `n${rowCounter}`;
    setRowCounter((count) => count + 1);
    setForm((current) => ({ ...current, limits: [...current.limits, { key, counterparty, limit: null }] }));
  };

  const removeLimit = (key: string) => {
    setForm((current) => ({ ...current, limits: current.limits.filter((row) => row.key !== key) }));
  };

  const cancel = () => {
    setForm(base);
    setErrors({});
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      toast.error("Перевірте виділені поля.");
      return;
    }
    if (!dirty) return;
    setSaving(true);
    const path = `/companies/${encodeURIComponent(company.id)}`;
    const result = await adminApi<CompanyAnswer>(path, { method: "PATCH", body: patch });
    setSaving(false);
    if (!result.ok) {
      const fields = fieldErrors(result);
      if (Object.keys(fields).length > 0) {
        setErrors(fields);
        toast.error("Перевірте виділені поля.");
      } else if (result.error === "exists") {
        setErrors({ externalId: "Цей код уже має інша компанія" });
        toastError(result, COMPANY_ERRORS);
      } else {
        toastError(result, COMPANY_ERRORS);
      }
      return;
    }
    const next = formOf(result.data.company);
    setSeen(result.data.company.updatedAt);
    setBase(next);
    setForm(next);
    setErrors({});
    setQueryData(path, { ok: true, company: result.data.company });
    invalidate("/companies?");
    invalidate("/customer-groups");
    invalidate("/audit");
    toast.success("Зміни збережено");
  };

  // Counterparties of the company that have no limit yet: one press adds
  // a row with the exact name the orders carry.
  const named = new Set(form.limits.map((row) => row.counterparty.trim().toLowerCase()));
  const suggestions = company.counterparties.map((cp) => cp.name).filter((name) => !named.has(name.trim().toLowerCase()));
  const limitsTotal = form.limits.reduce((sum, row) => sum + (row.limit ?? 0), 0);

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4" aria-label="Картка компанії">
      <FormSection title="Картка компанії" description="Реквізити, які бачать менеджери і сама компанія в кабінеті.">
        <FormGrid>
          <Input
            label="Назва"
            required
            value={form.name}
            onChange={(value) => set("name", value)}
            error={errors.name}
            maxLength={COMPANY_NAME_MAX}
            className="col-span-full"
          />
          <Input
            label="ЄДРПОУ або ІПН"
            value={form.edrpou}
            onChange={(value) => set("edrpou", value)}
            error={errors.edrpou}
            inputMode="numeric"
            maxLength={10}
            hint="8 цифр для юридичної особи, 10 для ФОП"
          />
          <Input label="Область" value={form.region} onChange={(value) => set("region", value)} maxLength={COMPANY_REGION_MAX} />
          <Input label="Місто" value={form.city} onChange={(value) => set("city", value)} maxLength={COMPANY_CITY_MAX} />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Комерційні умови"
        description="Діють для всіх акаунтів компанії."
        aside={
          <p className={TEXT.caption}>
            Ціна для партнера - це оптова ціна товару (для акційного товару - ціна до акції) мінус знижка компанії. Якщо в товарі
            задано окрему партнерську ціну, діє вона.
          </p>
        }
      >
        <FormGrid>
          <NumberInput
            label="Знижка від прайсу"
            value={form.discount}
            onChange={(value) => set("discount", value)}
            error={errors.discountPercent}
            min={0}
            max={99.99}
            precision={2}
            suffix="%"
            hint="Від 0 до 99,99"
          />
          <Select
            label="Група покупців"
            value={form.groupId}
            onChange={(value) => set("groupId", value)}
            options={groupOptions}
            error={errors.groupId}
            placeholder={groups.loading ? "Завантаження..." : "Оберіть групу"}
            hint="Правила груп почнуть діяти після підключення цін з облікової системи"
          />
          <StaffSelect
            label="Менеджер"
            value={form.managerId}
            onChange={(value) => set("managerId", value)}
            clearable
            fallbackName={company.manager?.name}
            placeholder="Не призначено"
            error={errors.managerId}
            hint="Хто веде компанію з боку Binar"
          />
          <div className="col-span-full flex min-w-0 flex-col gap-3">
            <div>
              <p className={TEXT.label}>Кредитні ліміти</p>
              <p className={cx(TEXT.caption, "mt-1")}>
                {"Ліміт прив'язаний до назви контрагента так, як вона стоїть у замовленнях. Разом: "}
                <span className="tabular-nums text-neutral-900">{formatMoney(limitsTotal, { whole: true })}</span>
              </p>
            </div>
            {form.limits.length > 0 && (
              <ul className="flex flex-col gap-2">
                {form.limits.map((row, index) => (
                  // On phones a row takes two lines: a quiet tile keeps the pair together.
                  <li key={row.key} className="flex flex-col gap-1 max-[639px]:rounded-2xl max-[639px]:bg-bg-subtle max-[639px]:p-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_40px] items-start gap-2 min-[640px]:grid-cols-[minmax(0,1fr)_200px_40px]">
                      <Input
                        aria-label={`Контрагент, рядок ${index + 1}`}
                        value={row.counterparty}
                        onChange={(value) => setLimit(row.key, { counterparty: value })}
                        placeholder="Назва контрагента"
                        maxLength={COMPANY_NAME_MAX}
                        error={Boolean(errors[`limit:${row.key}`])}
                      />
                      <MoneyInput
                        aria-label={`Ліміт, рядок ${index + 1}`}
                        value={row.limit}
                        onChange={(value) => setLimit(row.key, { limit: value })}
                        placeholder="0,00"
                        className="order-3 col-span-full min-[640px]:order-none min-[640px]:col-span-1"
                      />
                      <IconButton label={`Прибрати ліміт, рядок ${index + 1}`} icon={TrashIcon} variant="danger" onClick={() => removeLimit(row.key)} />
                    </div>
                    {errors[`limit:${row.key}`] && (
                      <p role="alert" className={FIELD_ERROR}>
                        {errors[`limit:${row.key}`]}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {errors.creditLimits && (
              <p role="alert" className={FIELD_ERROR}>
                {errors.creditLimits}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" iconLeft={PlusIcon} onClick={() => addLimit()} disabled={form.limits.length >= CREDIT_LIMITS_MAX}>
                Додати ліміт
              </Button>
              {suggestions.length > 0 && <span className={cx(TEXT.caption, "ml-2")}>Без ліміту:</span>}
              {suggestions.slice(0, 4).map((name) => (
                <Button key={name} variant="ghost" size="sm" iconLeft={PlusIcon} onClick={() => addLimit(name)}>
                  {name}
                </Button>
              ))}
            </div>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection
        title="Залишки та облік"
        description={company.erpSyncedAt ? `Останній обмін з BAS: ${formatDateTime(company.erpSyncedAt)}.` : "Обміну з BAS для цієї компанії ще не було."}
      >
        <FormGrid>
          <Checkbox
            label="Показувати компанії залишки"
            checked={form.showStock}
            onChange={(value) => set("showStock", value)}
            hint="Сайт поки не показує залишки: налаштування почне діяти після підключення залишків з облікової системи."
            className="col-span-full"
          />
          <NumberInput
            label="Показувати не більше"
            value={form.stockDisplayMax}
            onChange={(value) => set("stockDisplayMax", value)}
            min={0}
            max={10_000_000}
            precision={0}
            suffix="шт."
            placeholder="Як у налаштуваннях магазину"
            hint="Більший залишок партнер бачить як «більше» за це число. Порожньо - межа з налаштувань магазину."
            disabled={!form.showStock}
          />
          <Input
            label="Код в обліковій системі"
            value={form.externalId}
            onChange={(value) => set("externalId", value)}
            error={errors.externalId}
            maxLength={64}
            placeholder="Заповнює обмін з BAS"
            hint="Змінюйте вручну, лише якщо знаєте точний код компанії в BAS."
          />
        </FormGrid>
      </FormSection>

      <FormActions sticky status={dirty ? "Є незбережені зміни" : "Усі зміни збережено"}>
        <Button variant="secondary" onClick={cancel} disabled={!dirty || saving}>
          Скасувати
        </Button>
        <Button type="submit" loading={saving} disabled={!dirty}>
          Зберегти зміни
        </Button>
      </FormActions>
    </form>
  );
}
