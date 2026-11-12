"use client";

import { ArrowsRightLeftIcon } from "@heroicons/react/20/solid";
import { useState, type FormEvent } from "react";
import { EntityHistory } from "../common/EntityHistory";
import { adminApi } from "../lib/api";
import { invalidate } from "../lib/query";
import { Checkbox, RadioGroup } from "../ui/Checkbox";
import { useDirty } from "../ui/Form";
import { Input } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { toast, toastError } from "../ui/Toast";
import { holderOf, roleBody, roleEffect, roleOf, ROLE_META, ROLE_VALUES, type RoleValue } from "./roles";
import { Note } from "./shared";
import { CATALOG_ERRORS, PRICE_TYPE_LIMITS, type PriceTypeAnswer, type PriceTypeDto } from "./types";

// Adding a price type by hand, or changing one, in a dialog of
// /admin/pricing. The role can move here too: the dialog says from whom
// before it is saved (the role table confirms the same move in a question).
// Rendered keyed per opening, so its state starts from the record.

type FormState = { name: string; externalId: string; currency: string; vatIncluded: boolean; role: RoleValue };

const FORM_ID = "price-type-form";

function formOf(record: PriceTypeDto | null): FormState {
  if (!record) return { name: "", externalId: "", currency: "UAH", vatIncluded: true, role: "none" };
  return {
    name: record.name,
    externalId: record.externalId ?? "",
    currency: record.currency,
    vatIncluded: record.vatIncluded,
    role: roleOf(record),
  };
}

// Only the fields that changed (an edit) or every field (a new type).
function bodyOf(form: FormState, base: FormState, isNew: boolean): Record<string, unknown> {
  const all: Record<string, unknown> = {
    name: form.name.trim(),
    externalId: form.externalId.trim() || null,
    currency: form.currency.trim(),
    vatIncluded: form.vatIncluded,
    role: roleBody(form.role),
  };
  if (isNew) return all;
  const before: Record<string, unknown> = {
    name: base.name.trim(),
    externalId: base.externalId.trim() || null,
    currency: base.currency.trim(),
    vatIncluded: base.vatIncluded,
    role: roleBody(base.role),
  };
  return Object.fromEntries(Object.entries(all).filter(([key, value]) => value !== before[key]));
}

function localErrors(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Вкажіть назву типу цін";
  if (!/^[A-Z]{3}$/.test(form.currency.trim())) errors.currency = "Код валюти з трьох латинських літер, наприклад UAH";
  return errors;
}

export type PriceTypeModalProps = {
  open: boolean;
  // null: a new type.
  record: PriceTypeDto | null;
  types: PriceTypeDto[];
  onClose: () => void;
};

export function PriceTypeModal({ open, record, types, onClose }: PriceTypeModalProps) {
  const isNew = record === null;
  const [base] = useState<FormState>(() => formOf(record));
  const [form, setForm] = useState<FormState>(base);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dirty = useDirty(base, form);
  const holder = form.role !== base.role || isNew ? holderOf(types, form.role, record?.id ?? null) : null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm({ ...form, [key]: value });
    if (errors[key]) {
      const next = { ...errors };
      delete next[key];
      setErrors(next);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const local = localErrors(form);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    const body = bodyOf(form, base, isNew);
    if (!isNew && Object.keys(body).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    const result = isNew
      ? await adminApi<PriceTypeAnswer>("/price-types", { method: "POST", body })
      : await adminApi<PriceTypeAnswer>(`/price-types/${encodeURIComponent(record.id)}`, { method: "PATCH", body });
    setBusy(false);
    if (!result.ok) {
      const fields = result.data.fields;
      const messages = fields && typeof fields === "object" ? (fields as Record<string, string>) : {};
      setErrors(messages);
      // A taken name or code: the field's own sentence says which one.
      const first = Object.values(messages).find((message) => typeof message === "string");
      if (result.error === "exists" && first) toast.error(first);
      else toastError(result, CATALOG_ERRORS);
      return;
    }
    invalidate("/price-types");
    invalidate("/products/options");
    invalidate("/customer-groups");
    invalidate("/audit");
    const saved = result.data.priceType;
    const taken = result.data.roleTakenFrom;
    const done = isNew ? `Тип цін «${saved.name}» додано` : "Зміни збережено";
    if (taken) {
      toast.show({
        tone: "success",
        title: done,
        text: `Роль «${ROLE_META[roleOf(saved)].short}» тепер у «${saved.name}»; «${taken.name}» залишився без ролі.`,
      });
    } else {
      toast.success(done);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="md"
      title={isNew ? "Новий тип цін" : `Тип цін «${record.name}»`}
      description={
        isNew
          ? "Зазвичай типи цін надходять з облікової системи. Вручну тип додають, щоб заздалегідь призначити йому роль."
          : "Назву, код і валюту оновлює обмін з BAS; роль на сайті задається лише тут."
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          confirmLabel={isNew ? "Додати тип цін" : "Зберегти зміни"}
          form={FORM_ID}
          busy={busy}
          confirmDisabled={!isNew && !dirty}
        />
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Input
          label="Назва"
          required
          value={form.name}
          onChange={(name) => set("name", name)}
          maxLength={PRICE_TYPE_LIMITS.name}
          placeholder="Наприклад, Оптова"
          error={errors.name}
          autoFocus
        />
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-5 min-[640px]:grid-cols-[minmax(0,1fr)_140px]">
          <Input
            label="Код у BAS"
            optional
            value={form.externalId}
            onChange={(externalId) => set("externalId", externalId)}
            maxLength={PRICE_TYPE_LIMITS.externalId}
            hint="За ним обмін з BAS знаходить тип. Змінюйте, лише якщо знаєте точний код."
            error={errors.externalId}
          />
          <Input
            label="Валюта"
            required
            value={form.currency}
            onChange={(currency) => set("currency", currency.toUpperCase())}
            maxLength={3}
            hint="Наприклад, UAH"
            error={errors.currency}
            autoCapitalize="characters"
          />
        </div>
        <Checkbox
          checked={form.vatIncluded}
          onChange={(vatIncluded) => set("vatIncluded", vatIncluded)}
          label="Ціни включають ПДВ"
        />
        <RadioGroup
          label="Роль на сайті"
          value={form.role}
          onChange={(role) => set("role", role)}
          variant="tiles"
          options={ROLE_VALUES.map((value) => ({ value, label: ROLE_META[value].label, hint: ROLE_META[value].hint }))}
          error={errors.role}
        />
        {holder && (
          <Note tone="amber" icon={<ArrowsRightLeftIcon />}>
            Зараз роль «{ROLE_META[form.role].short}» має «{holder.name}». Після збереження він залишиться без ролі. {roleEffect(form.role)}
          </Note>
        )}
      </form>
      {!isNew && (
        <div className="mt-6 border-t border-stroke-subtle pt-5">
          <EntityHistory type="price-type" id={record.id} bare collapsedTo={3} refreshKey={record.updatedAt} />
        </div>
      )}
    </Modal>
  );
}
