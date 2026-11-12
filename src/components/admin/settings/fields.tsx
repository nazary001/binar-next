"use client";

import { ExclamationCircleIcon, InformationCircleIcon } from "@heroicons/react/20/solid";
import type { PriceTypeListAnswer } from "../catalog/types";
import { cx, formatNumber } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { Input, MoneyInput, NumberInput } from "../ui/Input";
import { Select } from "../ui/Select";
import { TagInput } from "../ui/TagInput";
import { TEXT, TONES } from "../ui/tokens";
import { StringListField } from "./StringListField";
import type { SettingsFieldDef, SettingsFieldError } from "./types";

// One field of a settings group: the kit control of its kind, its hint,
// its error, and under it the quiet line that says where the value takes
// effect (the panel's rule against dead controls: a value nothing reads
// says so before anybody edits it).

export type FieldValue = string | number | null | string[];

// The same shapes the server checks (src/app/api/admin/settings/groups.ts).
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9()\- ]+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function isPhone(value: string): boolean {
  const text = value.trim();
  return PHONE.test(text) && text.replace(/[^0-9]/g, "").length >= 5;
}

// The texts of usedBy that start like this describe a value the site does
// not read yet (NOT_READ and FOR_BAS of types.ts).
function notReadYet(field: SettingsFieldDef): boolean {
  return field.usedBy.startsWith("Збережено");
}

// What a refusal of the server means for one field, in words.
export function fieldErrorText(field: SettingsFieldDef, reason: SettingsFieldError, item?: string): string {
  const list = field.kind === "emails" || field.kind === "strings";
  switch (reason) {
    case "format":
      if (field.kind === "emails") return item ? `«${item}» не схоже на адресу пошти.` : "Перевірте адреси пошти.";
      if (field.kind === "email") return "Це не схоже на адресу пошти.";
      if (field.kind === "phone") return "Номер може містити лише цифри, пробіли, дужки, дефіс і «+» на початку.";
      if (field.kind === "money") return "Не більше двох знаків після коми.";
      return "Неправильний формат.";
    case "too-long":
      if (list && !item) return `Забагато значень: не більше ${formatNumber(field.maxItems ?? 0)}.`;
      return `Задовге значення: не більше ${formatNumber(field.maxLength ?? 0)} символів.`;
    case "too-short":
      return item !== undefined ? "Порожнє значення в списку." : "Заповніть поле.";
    case "too-big":
      return field.max !== undefined ? `Не більше ${formatNumber(field.max)}.` : "Завелике значення.";
    case "too-small":
      return field.min !== undefined ? `Не менше ${formatNumber(field.min)}.` : "Замале значення.";
    case "type":
      return field.kind === "number" || field.kind === "money" || field.kind === "days" ? "Вкажіть число." : "Неправильне значення.";
    case "unknown-price-type":
      return "Такого типу цін немає: можливо, його видалили.";
    case "duplicate":
      return "Один код групи BAS вказано в кількох категоріях. Залиште його лише в одній.";
    case "unknown":
      return "Це поле більше не зберігається. Оновіть сторінку.";
    default:
      return "Неправильне значення.";
  }
}

// The checks the browser can make before sending (the server repeats them).
export function localError(field: SettingsFieldDef, value: FieldValue): string | null {
  if (field.kind === "number" || field.kind === "money" || field.kind === "days") {
    if (typeof value !== "number") return "Вкажіть число.";
    if (field.min !== undefined && value < field.min) return `Не менше ${formatNumber(field.min)}.`;
    if (field.max !== undefined && value > field.max) return `Не більше ${formatNumber(field.max)}.`;
    return null;
  }
  if (field.kind === "email" && typeof value === "string" && value.trim() !== "" && !isEmail(value)) {
    return "Це не схоже на адресу пошти.";
  }
  if (field.kind === "phone" && typeof value === "string" && value.trim() !== "" && !isPhone(value)) {
    return "Номер може містити лише цифри, пробіли, дужки, дефіс і «+» на початку.";
  }
  if (field.kind === "emails" && Array.isArray(value)) {
    const bad = value.filter((item) => !isEmail(item));
    if (bad.length === 1) return `«${bad[0]}» не схоже на адресу пошти: виправте або приберіть її.`;
    if (bad.length > 1) return `Не схожі на адреси пошти: ${bad.map((item) => `«${item}»`).join(", ")}.`;
  }
  return null;
}

function UsedBy({ field }: { field: SettingsFieldDef }) {
  const idle = notReadYet(field);
  const Icon = idle ? ExclamationCircleIcon : InformationCircleIcon;
  return (
    <p className="flex items-start gap-1.5 text-[12px] leading-4 text-neutral-500">
      <Icon
        aria-hidden
        className="mt-px size-3.5 shrink-0"
        style={{ color: idle ? TONES.amber.dot : "#a5a5a5" }}
      />
      <span>
        <span className="sr-only">{idle ? "Поки не діє: " : "Де діє: "}</span>
        {field.usedBy}
      </span>
    </p>
  );
}

function PriceTypeSelect({
  field,
  value,
  onChange,
  error,
  disabled,
}: {
  field: SettingsFieldDef;
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
}) {
  const types = useAdminQuery<PriceTypeListAnswer>("/price-types?limit=100&sort=name");
  const options = (types.data?.items ?? []).map((item) => ({ value: item.id, label: item.name }));
  return (
    <Select
      label={field.label}
      hint={field.hint}
      error={error}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={types.loading ? "Завантаження..." : "Оберіть тип цін"}
      disabled={disabled}
    />
  );
}

const DAYS_SUFFIX = "дн.";

export function SettingsField({
  field,
  value,
  onChange,
  error,
  disabled,
  wide,
}: {
  field: SettingsFieldDef;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  error?: string;
  disabled: boolean;
  wide: boolean;
}) {
  const text = typeof value === "string" ? value : "";
  const number = typeof value === "number" ? value : null;
  const list = Array.isArray(value) ? value : [];
  const counter =
    field.maxItems !== undefined ? (
      <span className={cx(TEXT.caption, "tabular-nums")}>
        {formatNumber(list.length)} з {formatNumber(field.maxItems)}
      </span>
    ) : undefined;

  let control;
  switch (field.kind) {
    case "text":
    case "email":
    case "phone":
      control = (
        <Input
          label={field.label}
          hint={field.hint}
          error={error}
          value={text}
          onChange={onChange}
          type={field.kind === "text" ? "text" : field.kind === "email" ? "email" : "tel"}
          inputMode={field.kind === "email" ? "email" : field.kind === "phone" ? "tel" : undefined}
          autoComplete="off"
          spellCheck={field.kind === "text"}
          maxLength={field.maxLength}
          disabled={disabled}
        />
      );
      break;
    case "number":
    case "days":
      control = (
        <NumberInput
          label={field.label}
          hint={field.hint}
          error={error}
          value={number}
          onChange={onChange}
          min={field.min}
          max={field.max}
          precision={0}
          suffix={field.kind === "days" ? DAYS_SUFFIX : undefined}
          disabled={disabled}
        />
      );
      break;
    case "money":
      control = (
        <MoneyInput
          label={field.label}
          hint={field.hint}
          error={error}
          value={number}
          onChange={onChange}
          min={field.min}
          max={field.max}
          disabled={disabled}
        />
      );
      break;
    case "emails":
      control = (
        <TagInput
          label={field.label}
          hint={field.hint}
          error={error}
          labelAction={counter}
          value={list}
          onChange={onChange}
          max={field.maxItems}
          maxLength={field.maxLength}
          normalize={(item) => item.toLowerCase()}
          placeholder="name@binar-2000.com і Enter"
          disabled={disabled}
        />
      );
      break;
    case "strings":
      control =
        field.key === "categories" ? (
          // The order of the blog's rubrics is the order of its chips.
          <StringListField
            label={field.label}
            hint={field.hint}
            error={error}
            value={list}
            onChange={onChange}
            max={field.maxItems}
            maxLength={field.maxLength}
            disabled={disabled}
            placeholder="Назва рубрики"
            addLabel="Додати рубрику"
            noun={{ one: "рубрика", accusative: "рубрику" }}
          />
        ) : (
          <TagInput
            label={field.label}
            hint={field.hint}
            error={error}
            labelAction={counter}
            value={list}
            onChange={onChange}
            max={field.maxItems}
            maxLength={field.maxLength}
            placeholder="Назва і Enter"
            disabled={disabled}
          />
        );
      break;
    case "priceType":
      control = (
        <PriceTypeSelect
          field={field}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
      break;
  }

  return (
    <div className={cx("flex min-w-0 flex-col gap-2", wide && "col-span-full")}>
      {control}
      <UsedBy field={field} />
    </div>
  );
}
