"use client";

import { useState, type FormEvent } from "react";
import { isValidEmail } from "@/components/auth/data";
import { nationalPhone } from "@/components/platform/profile/data";
import { adminApi } from "../lib/api";
import { formatPhone } from "../lib/format";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FormActions, FormGrid, useDirty, useUnsavedWarning } from "../ui/Form";
import { Input } from "../ui/Input";
import { KeyValueList } from "../ui/KeyValue";
import { toast, toastError } from "../ui/Toast";
import { applyCustomer } from "./cache";
import { CUSTOMER_ERRORS, fieldErrors, loginKeyText, loginText } from "./parts";
import {
  CUSTOMER_EMAIL_MAX,
  CUSTOMER_NAME_MAX,
  CUSTOMER_POSITION_MAX,
  type CustomerAnswer,
  type CustomerDetail,
  type PatchCustomerBody,
} from "./types";

// "Профіль": the person's name and contacts. Editors get a form (rendered
// by the screen with key = id + updatedAt, so it starts from the saved
// values after every save); read-only roles see the same facts as a list.

type Values = { fullName: string; position: string; phone: string; email: string };
type Errors = Partial<Record<keyof Values, string>>;

// The phone is shown spaced ("+380 67 123 45 67"); the API stores and
// compares national digits, so a reformatted number is no change.
function valuesOf(customer: CustomerDetail): Values {
  return {
    fullName: customer.person.fullName,
    position: customer.person.position,
    phone: customer.person.phone ? formatPhone(customer.person.phone) : "",
    email: customer.person.email,
  };
}

// The stored form of a field, to tell a real change from a reformatting.
function stored(key: keyof Values, value: string): string {
  const text = value.trim();
  if (key === "phone") return text ? (nationalPhone(text) ?? text) : "";
  if (key === "email") return text.toLowerCase();
  return text;
}

// What the person can sign in with, as one sentence.
function signInNote(customer: CustomerDetail): string {
  if (customer.test) return "Тестовий акаунт: входить лише через тестовий режим сайту.";
  const keys = customer.loginKeys.map(loginKeyText);
  if (keys.length === 0) return "Логін змінити не можна.";
  return `Увійти можна за ${keys.length === 1 ? "логіном" : "будь-яким із"}: ${keys.join(", ")}. Логін змінити не можна.`;
}

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.fullName.trim()) errors.fullName = "Вкажіть ім'я та прізвище";
  if (values.email.trim() && !isValidEmail(values.email)) errors.email = "Перевірте адресу: name@example.com";
  if (values.phone.trim() && nationalPhone(values.phone) === null) errors.phone = "Вкажіть номер у форматі 0XX XXX XX XX";
  return errors;
}

export function ProfileView({ customer }: { customer: CustomerDetail }) {
  const b2b = customer.type === "b2b";
  return (
    <Card title="Профіль">
      <KeyValueList
        columns={2}
        items={[
          { label: "Ім'я та прізвище", value: customer.person.fullName || "-" },
          ...(b2b ? [{ label: "Посада", value: customer.person.position || "-" }] : []),
          { label: "Телефон", value: customer.person.phone ? formatPhone(customer.person.phone) : "-" },
          { label: "E-mail", value: customer.person.email || "-" },
          { label: "Логін", value: loginText(customer.login), hint: signInNote(customer) },
        ]}
      />
    </Card>
  );
}

export function ProfileForm({ customer }: { customer: CustomerDetail }) {
  const b2b = customer.type === "b2b";
  const initial = valuesOf(customer);
  const [form, setForm] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const dirty = useDirty(initial, form);
  useUnsavedWarning(dirty);

  const change = (key: keyof Values) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !dirty) return;
    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    const person: NonNullable<PatchCustomerBody["person"]> = {};
    for (const key of ["fullName", "position", "phone", "email"] as const) {
      const saved = key === "phone" ? customer.person.phone : key === "email" ? customer.person.email.toLowerCase() : initial[key];
      if (stored(key, form[key]) !== saved) person[key] = form[key].trim();
    }
    if (Object.keys(person).length === 0) {
      setForm(initial);
      return;
    }
    setBusy(true);
    const result = await adminApi<CustomerAnswer>(`/customers/${encodeURIComponent(customer.id)}`, { method: "PATCH", body: { person } });
    setBusy(false);
    if (!result.ok) {
      if (result.error === "exists") {
        setErrors({ email: "Ця адреса вже відкриває інший акаунт" });
      } else {
        setErrors(
          fieldErrors(
            result,
            { "person.fullName": { required: "Вкажіть ім'я та прізвище" }, "person.phone": { invalid: "Вкажіть номер у форматі 0XX XXX XX XX" } },
            { "person.fullName": "fullName", "person.position": "position", "person.phone": "phone", "person.email": "email" },
          ),
        );
      }
      toastError(result, CUSTOMER_ERRORS);
      return;
    }
    // The card remounts this form with the saved values (its key changes).
    applyCustomer(result.data.customer);
    toast.success(person.email !== undefined && person.email !== "" ? "Зміни збережено. Новий e-mail тепер теж відкриває акаунт" : "Зміни збережено");
  };

  return (
    <Card title="Профіль" subtitle="Ім'я та контакти, які бачить людина у своєму кабінеті">
      <form onSubmit={save} noValidate className="flex flex-col gap-5" aria-label="Профіль акаунта">
        <FormGrid>
          <Input
            label="Ім'я та прізвище"
            value={form.fullName}
            onChange={change("fullName")}
            error={errors.fullName}
            maxLength={CUSTOMER_NAME_MAX}
            required
            autoComplete="off"
            className={b2b ? undefined : "col-span-full"}
          />
          {b2b && (
            <Input
              label="Посада"
              value={form.position}
              onChange={change("position")}
              error={errors.position}
              maxLength={CUSTOMER_POSITION_MAX}
              placeholder="Наприклад, менеджер із закупівель"
              autoComplete="off"
            />
          )}
          <Input
            label="Телефон"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={change("phone")}
            error={errors.phone}
            maxLength={32}
            placeholder="0XX XXX XX XX"
            hint="Контактний номер для менеджера"
            autoComplete="off"
          />
          <Input
            label="E-mail"
            type="email"
            inputMode="email"
            value={form.email}
            onChange={change("email")}
            error={errors.email}
            maxLength={CUSTOMER_EMAIL_MAX}
            placeholder="name@example.com"
            hint="Також відкриває акаунт. Про зміну адреси сайт повідомить на попередню"
            autoComplete="off"
          />
          <Input label="Логін" value={loginText(customer.login)} onChange={() => {}} readOnly hint={signInNote(customer)} className="col-span-full" />
        </FormGrid>
        <FormActions status={dirty ? "Є незбережені зміни" : undefined}>
          <Button
            variant="secondary"
            disabled={!dirty || busy}
            onClick={() => {
              setForm(initial);
              setErrors({});
            }}
          >
            Скасувати
          </Button>
          <Button type="submit" loading={busy} disabled={!dirty}>
            Зберегти зміни
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
