"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/components/catalog/data";
import {
  AutocompleteField,
  CheckboxField,
  SelectField,
  TextArea,
  TextField,
} from "./fields";
import { InfoCircle24 } from "./icons";
import {
  BRANCHES,
  CITIES,
  DELIVERY_OPTIONS,
  EMPTY_VALUES,
  LOCKERS,
  PAYMENT_OPTIONS,
  PICKUP_NOTICE,
  RESERVE_MINUTES,
  validate,
  type CheckoutErrors,
  type CheckoutValues,
} from "./data";

// The order form — Figma symbol «Оформити замовлення» (4168:17708, 627
// wide, r24): a #f8f8f8 body padded 32 with two sections 60 apart
// («Особиста інформація», «Інформація про доставку»: Title/Large Bold
// heading, 32 to the fields, fields 24 apart, paired fields 16 apart),
// then the #1d1d1f footer padded 32: «Сума замовлення» + total, the
// 14/24 reservation note at 60 % white, and the orange «До оплати».
// The delivery block adapts to the chosen method exactly as the nine
// master variants draw it: pickup shows the address notice, a branch
// pickup adds «Відділення», a parcel locker adds «Поштомат», address
// delivery adds «Вулиця» + «Будинок» / «Квартира»; the invoice checkbox
// reveals the company fields.

export function CheckoutForm({
  subtotal,
  onSubmit,
}: {
  subtotal: number;
  onSubmit: (values: CheckoutValues) => void;
}) {
  const [values, setValues] = useState<CheckoutValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const set = <K extends keyof CheckoutValues>(key: K, value: CheckoutValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      // The error attributes land after this commit, so the target is
      // found by name (every field's name is its error key), not by
      // aria-invalid.
      const el = e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    onSubmit(values);
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col overflow-clip rounded-3xl">
      <div className="flex flex-col gap-10 bg-bg-subtle p-6 sm:p-8 lg:gap-[60px]">
        <section className="flex flex-col gap-6 lg:gap-8">
          <h2 className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
            Особиста інформація
          </h2>
          <div className="flex flex-col gap-6">
            <TextField
              label="Ваше Ім'я"
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(v) => set("name", v)}
              error={errors.name}
            />
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
              <TextField
                label="Email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={values.email}
                onChange={(v) => set("email", v)}
                error={errors.email}
              />
              <TextField
                label="Номер телефону"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(v) => set("phone", v)}
                error={errors.phone}
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6 lg:gap-8">
          <h2 className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
            Інформація про доставку
          </h2>
          <div className="flex flex-col gap-6">
            <AutocompleteField
              label="Місто"
              name="city"
              autoComplete="address-level2"
              options={CITIES}
              value={values.city}
              onChange={(v) => set("city", v)}
              error={errors.city}
            />
            <SelectField
              label="Варіанти доставки"
              name="delivery"
              options={DELIVERY_OPTIONS}
              value={values.delivery}
              onChange={(v) => set("delivery", v as CheckoutValues["delivery"])}
              error={errors.delivery}
            />

            {values.delivery === "pickup" && (
              <p className="flex items-start gap-2 text-[14px] leading-6 text-neutral-800">
                <InfoCircle24 className="size-6 shrink-0 text-neutral-300" />
                <span>{PICKUP_NOTICE}</span>
              </p>
            )}
            {values.delivery === "np-branch" && (
              <SelectField
                label="Відділення"
                name="branch"
                options={BRANCHES.map((b) => ({ value: b, label: b }))}
                value={values.branch}
                onChange={(v) => set("branch", v)}
                error={errors.branch}
              />
            )}
            {values.delivery === "np-locker" && (
              <SelectField
                label="Поштомат"
                name="locker"
                options={LOCKERS.map((b) => ({ value: b, label: b }))}
                value={values.locker}
                onChange={(v) => set("locker", v)}
                error={errors.locker}
              />
            )}
            {values.delivery === "np-address" && (
              <>
                <AutocompleteField
                  label="Вулиця"
                  name="street"
                  autoComplete="address-line1"
                  options={[]}
                  value={values.street}
                  onChange={(v) => set("street", v)}
                  error={errors.street}
                />
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
                  <TextField
                    label="Будинок"
                    name="house"
                    value={values.house}
                    onChange={(v) => set("house", v)}
                    error={errors.house}
                  />
                  <TextField
                    label="Квартира"
                    name="flat"
                    value={values.flat}
                    onChange={(v) => set("flat", v)}
                    error={errors.flat}
                  />
                </div>
              </>
            )}

            <SelectField
              label="Варіанти оплати"
              name="payment"
              options={PAYMENT_OPTIONS.map((p) => ({ value: p, label: p }))}
              value={values.payment}
              onChange={(v) => set("payment", v)}
              error={errors.payment}
            />
            <TextArea
              label="Коментар"
              name="comment"
              value={values.comment}
              onChange={(v) => set("comment", v)}
            />
            <CheckboxField
              label="Потрібен рахунок-фактура"
              name="invoice"
              checked={values.invoice}
              onChange={(v) => set("invoice", v)}
            />

            {values.invoice && (
              <>
                <TextField
                  label="Назва компанії"
                  name="company"
                  autoComplete="organization"
                  value={values.company}
                  onChange={(v) => set("company", v)}
                  error={errors.company}
                />
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
                  <TextField
                    label="ЄДРПОУ"
                    name="edrpou"
                    inputMode="numeric"
                    value={values.edrpou}
                    onChange={(v) => set("edrpou", v)}
                    error={errors.edrpou}
                  />
                  <TextField
                    label="ІПН"
                    name="ipn"
                    inputMode="numeric"
                    value={values.ipn}
                    onChange={(v) => set("ipn", v)}
                    error={errors.ipn}
                  />
                </div>
                <TextField
                  label="Адреса"
                  name="address"
                  autoComplete="street-address"
                  value={values.address}
                  onChange={(v) => set("address", v)}
                  error={errors.address}
                />
                <TextField
                  label="Email для отримання рахунку"
                  name="invoiceEmail"
                  type="email"
                  inputMode="email"
                  value={values.invoiceEmail}
                  onChange={(v) => set("invoiceEmail", v)}
                  error={errors.invoiceEmail}
                />
              </>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-6 bg-neutral-900 p-6 sm:p-8 lg:gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-white">
            <span className="text-body-md">Сума замовлення</span>
            <span className="text-title-lg text-white">{formatPrice(subtotal)}</span>
          </div>
          <p className="text-[14px] leading-6 text-white/60">
            Товари зарезервовано на {RESERVE_MINUTES} хвилин.
          </p>
        </div>
        <Button type="submit" variant="accent" fullWidth>
          До оплати
        </Button>
      </div>
    </form>
  );
}
