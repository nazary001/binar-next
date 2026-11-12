"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RadioGroup } from "@/components/ui/ChoiceRow";
import { SUMMARY_AMOUNT, SUMMARY_LABEL } from "@/components/ui/StickyBar";
import { DESKTOP_QUERY } from "@/components/ui/useMediaQuery";
import { formatPrice } from "@/components/catalog/data";
import { RollingNumber } from "@/components/ui/RollingNumber";
import {
  AutocompleteField,
  CheckboxField,
  SelectField,
  TextArea,
  TextField,
} from "./fields";
import { InfoCircle24 } from "./icons";
import {
  BRANCH_OPTIONS,
  CITIES,
  DELIVERY_OPTIONS,
  LOCKER_OPTIONS,
  PAYMENT_OPTIONS,
  PICKUP_NOTICE,
  RESERVE_MINUTES,
  pruneDelivery,
  validate,
  withoutRefs,
  type CheckoutErrors,
  type CheckoutRefKey,
  type CheckoutValues,
} from "./data";
import { NpCityField, NpPlaceField } from "./NpFields";
import { useCheckoutDraft } from "./useCheckoutDraft";

// Phone-only strings (the desktop copy stays inline below).
const COPY = {
  deliveryLegend: "Варіанти доставки",
  paymentLegend: "Варіанти оплати",
  sum: "Сума замовлення",
  invoiceLead: "Потрібен",
  invoiceWord: "рахунок-фактура",
  minutes: "хвилин",
} as const;

const PAYMENT_CHOICES = PAYMENT_OPTIONS.map((p) => ({ value: p, label: p }));

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
//
// Phones (checkout spec 2.4-2.8, template T4; max-lg: deltas only, the
// desktop strings are untouched): ONE r32 card = a white body with the
// 1-px #8e8e8f ring on top / left / right (pt 32, px 24, pb 48, sections
// 48 apart, Title Large 22/28 SemiBold headings, floating labels cut the
// ring on white) closed by the dark summary footer (label 14/20 over the
// 22/28 amount, the A13 summary anatomy). Delivery and payment are radio
// rows (A24) instead of the selects; the short pairs (Будинок / Квартира,
// ЄДРПОУ / ІПН) sit side by side once the field column is 400 wide (a
// ~500-px phone): narrower halves broke their 12/16 error lines in two.
// Enter in a text field moves to the next field on phones (the desktop
// keeps the implicit submit); the first invalid VISIBLE control is focused
// and centred.
//
// `npSearch` (the shop's switch in the panel, off by default): «Місто»,
// «Відділення» and «Поштомат» search Nova Poshta's real directory
// (NpFields.tsx). Picking a row fills the text exactly as the customer
// would have typed it and keeps the carrier's reference next to it
// (cityRef / branchRef / lockerRef); editing the city empties the branch
// and the postomat with their references; text typed without picking stays
// valid (no reference). Off, the form is the fixed-list form it always was
// and never holds a reference.

// Text controls Enter walks through on phones.
const NEXT_FIELDS =
  'input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea';

function focusFirstError(form: HTMLFormElement, name: string) {
  // Delivery / payment exist twice (the desktop select and the phone
  // radios share the name): only the rendered twin counts.
  const shown = Array.from(form.querySelectorAll<HTMLElement>(`[name="${name}"]`)).filter(
    (el) => el.getClientRects().length > 0,
  );
  const radio = shown.find((el) => el instanceof HTMLInputElement && el.type === "radio");
  const target = radio
    ? (shown.find((el) => el instanceof HTMLInputElement && el.checked) ?? radio)
    : shown[0];
  if (!target) return;
  const scrollTarget = (radio && target.closest<HTMLElement>('[role="radiogroup"]')) || target;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.focus({ preventScroll: true });
  scrollTarget.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
}

export function CheckoutForm({
  subtotal,
  onSubmit,
  npSearch = false,
}: {
  subtotal: number;
  onSubmit: (values: CheckoutValues) => void;
  npSearch?: boolean;
}) {
  const draft = useCheckoutDraft();
  // The form mounts only after hydration (CheckoutClient), so the session
  // draft can be read in the initial state. References of a draft kept
  // while the search was on are dropped when it is off.
  const [values, setValues] = useState<CheckoutValues>(() =>
    npSearch ? draft.load() : withoutRefs(draft.load()),
  );
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const set = <K extends keyof CheckoutValues>(key: K, value: CheckoutValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  // Several fields at once (the carrier search): `drop` removes references
  // that no longer describe the text.
  const update = (change: Partial<CheckoutValues>, drop: CheckoutRefKey[] = []) => {
    setValues((v) => {
      const next = { ...v, ...change };
      for (const key of drop) delete next[key];
      return next;
    });
    const keys = Object.keys(change) as (keyof CheckoutValues)[];
    if (keys.some((key) => errors[key])) {
      setErrors((e) => {
        const next = { ...e };
        for (const key of keys) next[key] = undefined;
        return next;
      });
    }
  };
  // A new city (typed or picked) empties the branch and the postomat.
  const typeCity = (text: string) =>
    update({ city: text, branch: "", locker: "" }, ["cityRef", "branchRef", "lockerRef"]);
  const pickCity = (city: { key: string; value: string }) => {
    if (city.key === values.cityRef && city.value === values.city) return;
    update({ city: city.value, cityRef: city.key, branch: "", locker: "" }, ["branchRef", "lockerRef"]);
  };

  // Every change lands in the session draft (sessionStorage = an external
  // store; nothing is set back into React state).
  useEffect(() => {
    draft.save(values);
  }, [draft, values]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      // The error attributes land after this commit, so the target is
      // found by name (every field's name is its error key), not by
      // aria-invalid.
      focusFirstError(e.currentTarget, first);
      return;
    }
    onSubmit(pruneDelivery(values));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.defaultPrevented || e.nativeEvent.isComposing) return;
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type === "checkbox" || t.type === "radio") return;
    if (window.matchMedia(DESKTOP_QUERY).matches) return;
    e.preventDefault();
    const fields = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(NEXT_FIELDS)).filter(
      (el) => el.getClientRects().length > 0,
    );
    const next = fields[fields.indexOf(t) + 1];
    if (next) next.focus();
    else t.blur();
  };

  return (
    <form
      noValidate
      onSubmit={submit}
      onKeyDown={onKeyDown}
      className="flex flex-col overflow-clip rounded-3xl max-lg:rounded-[32px]"
    >
      <div className="flex flex-col gap-10 bg-bg-subtle p-6 sm:p-8 lg:gap-[60px] max-lg:gap-12 max-lg:rounded-t-[32px] max-lg:border max-lg:border-b-0 max-lg:border-stroke-default max-lg:bg-white max-lg:px-[23px] max-lg:pb-12 max-lg:pt-[31px] max-lg:[--field-surface:#fff]">
        <section className="flex flex-col gap-6 lg:gap-8">
          <h2 className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900 max-lg:text-[22px] max-lg:font-semibold max-lg:tracking-[-0.44px]">
            Особиста інформація
          </h2>
          <div className="flex flex-col gap-6">
            <TextField
              label="Ваше Ім'я"
              name="name"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              announceError={false}
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
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                announceError={false}
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
                maxLength={19}
                enterKeyHint="next"
                announceError={false}
                value={values.phone}
                onChange={(v) => set("phone", v)}
                error={errors.phone}
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6 lg:gap-8">
          <h2 className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900 max-lg:text-[22px] max-lg:font-semibold max-lg:tracking-[-0.44px]">
            Інформація про доставку
          </h2>
          <div className="flex flex-col gap-6 max-lg:@container">
            {npSearch ? (
              <NpCityField
                value={values.city}
                cityRef={values.cityRef}
                onType={typeCity}
                onPick={pickCity}
                error={errors.city}
              />
            ) : (
              <AutocompleteField
                label="Місто"
                name="city"
                autoComplete="address-level2"
                enterKeyHint="next"
                announceError={false}
                options={CITIES}
                value={values.city}
                onChange={(v) => set("city", v)}
                error={errors.city}
              />
            )}
            <div className="max-lg:hidden">
              <SelectField
                label="Варіанти доставки"
                name="delivery"
                announceError={false}
                options={DELIVERY_OPTIONS}
                value={values.delivery}
                onChange={(v) => set("delivery", v as CheckoutValues["delivery"])}
                error={errors.delivery}
              />
            </div>
            <RadioGroup
              className="lg:hidden"
              name="delivery"
              label={COPY.deliveryLegend}
              options={DELIVERY_OPTIONS}
              value={values.delivery}
              onChange={(v) => set("delivery", v as CheckoutValues["delivery"])}
              error={errors.delivery}
            />

            {values.delivery === "pickup" && (
              <p className="flex items-start gap-2 text-[14px] leading-6 text-neutral-800 max-lg:leading-5">
                <InfoCircle24 className="size-6 shrink-0 text-neutral-300" />
                <span>{PICKUP_NOTICE}</span>
              </p>
            )}
            {values.delivery === "np-branch" &&
              (npSearch ? (
                <NpPlaceField
                  kind="branch"
                  label="Відділення"
                  name="branch"
                  value={values.branch}
                  cityRef={values.cityRef}
                  placeRef={values.branchRef}
                  onType={(text) => update({ branch: text }, ["branchRef"])}
                  onPick={(place) => update({ branch: place.value, branchRef: place.key })}
                  error={errors.branch}
                />
              ) : (
                <SelectField
                  label="Відділення"
                  name="branch"
                  announceError={false}
                  options={BRANCH_OPTIONS}
                  value={values.branch}
                  onChange={(v) => set("branch", v)}
                  error={errors.branch}
                />
              ))}
            {values.delivery === "np-locker" &&
              (npSearch ? (
                <NpPlaceField
                  kind="postomat"
                  label="Поштомат"
                  name="locker"
                  value={values.locker}
                  cityRef={values.cityRef}
                  placeRef={values.lockerRef}
                  onType={(text) => update({ locker: text }, ["lockerRef"])}
                  onPick={(place) => update({ locker: place.value, lockerRef: place.key })}
                  error={errors.locker}
                />
              ) : (
                <SelectField
                  label="Поштомат"
                  name="locker"
                  announceError={false}
                  options={LOCKER_OPTIONS}
                  value={values.locker}
                  onChange={(v) => set("locker", v)}
                  error={errors.locker}
                />
              ))}
            {values.delivery === "np-address" && (
              <>
                <AutocompleteField
                  label="Вулиця"
                  name="street"
                  autoComplete="address-line1"
                  enterKeyHint="next"
                  announceError={false}
                  options={[]}
                  value={values.street}
                  onChange={(v) => set("street", v)}
                  error={errors.street}
                />
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-4 @min-[400px]:grid-cols-2 @min-[400px]:gap-4">
                  <TextField
                    label="Будинок"
                    name="house"
                    enterKeyHint="next"
                    announceError={false}
                    value={values.house}
                    onChange={(v) => set("house", v)}
                    error={errors.house}
                  />
                  <TextField
                    label="Квартира"
                    name="flat"
                    enterKeyHint="next"
                    announceError={false}
                    value={values.flat}
                    onChange={(v) => set("flat", v)}
                    error={errors.flat}
                  />
                </div>
              </>
            )}

            <div className="max-lg:hidden">
              <SelectField
                label="Варіанти оплати"
                name="payment"
                announceError={false}
                options={PAYMENT_CHOICES}
                value={values.payment}
                onChange={(v) => set("payment", v)}
                error={errors.payment}
              />
            </div>
            {/* 48 above the payment group (24 + mt-6): more than the 40
                between its rows, so the two groups never read as one. */}
            <RadioGroup
              className="mt-6 lg:hidden"
              name="payment"
              label={COPY.paymentLegend}
              options={PAYMENT_CHOICES}
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
              // Desktop keeps the original single text run (a span boundary
              // inside it moves the glyphs by a subpixel at the zoomed
              // 640..1709 canvas); phones keep the compound word whole.
              label={
                <>
                  <span className="max-lg:hidden">Потрібен рахунок-фактура</span>
                  <span className="lg:hidden">
                    {COPY.invoiceLead} <span className="whitespace-nowrap">{COPY.invoiceWord}</span>
                  </span>
                </>
              }
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
                  enterKeyHint="next"
                  announceError={false}
                  value={values.company}
                  onChange={(v) => set("company", v)}
                  error={errors.company}
                />
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-4 @min-[400px]:grid-cols-2 @min-[400px]:gap-4">
                  <TextField
                    label="ЄДРПОУ"
                    name="edrpou"
                    inputMode="numeric"
                    maxLength={8}
                    enterKeyHint="next"
                    announceError={false}
                    value={values.edrpou}
                    onChange={(v) => set("edrpou", v)}
                    error={errors.edrpou}
                  />
                  <TextField
                    label="ІПН"
                    name="ipn"
                    inputMode="numeric"
                    maxLength={12}
                    enterKeyHint="next"
                    announceError={false}
                    value={values.ipn}
                    onChange={(v) => set("ipn", v)}
                    error={errors.ipn}
                  />
                </div>
                <TextField
                  label="Адреса"
                  name="address"
                  autoComplete="street-address"
                  enterKeyHint="next"
                  announceError={false}
                  value={values.address}
                  onChange={(v) => set("address", v)}
                  error={errors.address}
                />
                <TextField
                  label="Email для отримання рахунку"
                  name="invoiceEmail"
                  type="email"
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  announceError={false}
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
          <div className="flex flex-col gap-2 lg:hidden">
            <span className={SUMMARY_LABEL}>{COPY.sum}</span>
            <RollingNumber value={subtotal} format={formatPrice} className={SUMMARY_AMOUNT} />
          </div>
          <div className="flex items-center justify-between text-white max-lg:hidden">
            <span className="text-body-md">Сума замовлення</span>
            <RollingNumber value={subtotal} format={formatPrice} className="text-title-lg text-white" />
          </div>
          <p className="text-[14px] leading-6 text-white/60 max-lg:leading-5">
            Товари зарезервовано на{" "}
            <span className="whitespace-nowrap">
              {RESERVE_MINUTES} {COPY.minutes}
            </span>
            .
          </p>
        </div>
        <Button type="submit" variant="accent" fullWidth>
          До оплати
        </Button>
      </div>
    </form>
  );
}
