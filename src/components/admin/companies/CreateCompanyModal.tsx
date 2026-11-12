"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminApi } from "../lib/api";
import { invalidate } from "../lib/query";
import { FormGrid } from "../ui/Form";
import { Input, NumberInput } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { toast, toastError } from "../ui/Toast";
import { codeOk, fieldErrors } from "./shared";
import {
  COMPANY_CITY_MAX,
  COMPANY_ERRORS,
  COMPANY_NAME_MAX,
  COMPANY_REGION_MAX,
  type CompanyAnswer,
  type CreateCompanyBody,
} from "./types";

// "Додати компанію": the few facts a partner company starts with. The
// discount is always sent (prefilled with 0), so nothing depends on the
// API's default. After the save the new company's page opens.

type Form = { name: string; edrpou: string; region: string; city: string; discount: number | null };

const EMPTY: Form = { name: "", edrpou: "", region: "", city: "", discount: 0 };

const FORM_ID = "create-company-form";

export function CreateCompanyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    onClose();
    setForm(EMPTY);
    setErrors({});
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Вкажіть назву компанії";
    if (form.edrpou.trim() && !codeOk(form.edrpou)) next.edrpou = "8 цифр (ЄДРПОУ) або 10 цифр (ІПН)";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: CreateCompanyBody = {
      name: form.name.trim(),
      edrpou: form.edrpou.trim(),
      region: form.region.trim(),
      city: form.city.trim(),
      discountPercent: form.discount ?? 0,
    };
    setBusy(true);
    const result = await adminApi<CompanyAnswer>("/companies", { method: "POST", body });
    setBusy(false);
    if (!result.ok) {
      const fields = fieldErrors(result);
      if (Object.keys(fields).length > 0) setErrors(fields);
      else toastError(result, COMPANY_ERRORS);
      return;
    }
    invalidate("/companies");
    invalidate("/customer-groups");
    toast.success(`Компанію «${result.data.company.name}» створено`);
    onClose();
    setForm(EMPTY);
    router.push(`/admin/companies/${result.data.company.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Нова компанія"
      description="Решту умов (групу, менеджера, ліміти) можна задати на сторінці компанії."
      busy={busy}
      footer={<ModalFooter onCancel={close} confirmLabel="Створити компанію" form={FORM_ID} busy={busy} />}
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <FormGrid>
          <Input
            label="Назва"
            required
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            error={errors.name}
            maxLength={COMPANY_NAME_MAX}
            placeholder="ТОВ «Готель Дністер»"
            className="col-span-full"
          />
          <Input
            label="ЄДРПОУ або ІПН"
            optional
            value={form.edrpou}
            onChange={(edrpou) => setForm({ ...form, edrpou })}
            error={errors.edrpou}
            inputMode="numeric"
            maxLength={10}
            hint="8 цифр для юридичної особи, 10 для ФОП"
          />
          <NumberInput
            label="Знижка від прайсу"
            value={form.discount}
            onChange={(discount) => setForm({ ...form, discount })}
            error={errors.discountPercent}
            min={0}
            max={99.99}
            precision={2}
            suffix="%"
            hint="0, якщо умов ще немає"
          />
          <Input
            label="Область"
            optional
            value={form.region}
            onChange={(region) => setForm({ ...form, region })}
            maxLength={COMPANY_REGION_MAX}
          />
          <Input label="Місто" optional value={form.city} onChange={(city) => setForm({ ...form, city })} maxLength={COMPANY_CITY_MAX} />
        </FormGrid>
      </form>
    </Modal>
  );
}
