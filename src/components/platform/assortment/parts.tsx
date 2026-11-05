"use client";

import { CheckboxOffIcon, CheckboxOnIcon } from "@/components/catalog/icons";
import { CheckboxMixedIcon } from "./icons";

// Phone-only atoms of «Мій асортимент» (mobile pass, C-assortment; spec
// docs/superpowers/specs/mobile/assortment.md 2.5 / 2.7 / 2.10). The
// desktop table keeps its own atoms in AssortmentView.tsx untouched.

export const PHONE_COPY = {
  selectAll: "Обрати всі",
  selectAllLabel: "Обрати всі показані товари",
  list: "Товари асортименту",
  sort: "Сортування",
  selectRow: (name: string) => `Обрати «${name}»`,
  removeRow: (name: string) => `Видалити «${name}» з асортименту`,
  qty: (name: string) => `Кількість: ${name}`,
  sku: (sku: string) => `Артикул: ${sku}`,
  wholesale: "Оптова ціна",
  retail: "Роздрібна ціна",
  partner: "Ваша ціна",
  sum: "Сума",
  emptyTitle: "Ваш асортимент ще не сформовано",
  emptyText:
    "Зробіть перше замовлення, щоб автоматично додати ваші найзатребуваніші товари, або завантажте власний список товарів з Excel.",
  emptyAction: "Переглянути каталог",
  noMatchTitle: "Нічого не знайдено",
  noMatchText: (q: string) => `За запитом «${q}» товарів в асортименті немає.`,
  noMatchReset: "Скинути пошук",
  added: "Додано у кошик",
  cart: "Кошик",
} as const;

// Same split as the CSS `lg:` (DESKTOP_QUERY is min-width 640), read at
// tap time (no hydration question).
const PHONE_QUERY = "(max-width: 639.98px)";

export function isPhoneNow(): boolean {
  return typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
}

// TR-22 checkbox on phones: the 24-px glyph in a 44-px round hit box with
// -10 margins (24 of layout), brand when on / mixed, #1d1d1f when off.
export function PhoneCheckbox({
  checked,
  mixed = false,
  onToggle,
  label,
  className = "",
}: {
  checked: boolean;
  mixed?: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={label}
      onClick={onToggle}
      className={`relative -m-2.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
    >
      <CheckboxGlyph checked={checked} mixed={mixed} />
    </button>
  );
}

// The 24-px glyph alone (the «Обрати всі» control of the meta line draws
// it inside its own labelled button).
export function CheckboxGlyph({ checked, mixed = false }: { checked: boolean; mixed?: boolean }) {
  if (mixed) return <CheckboxMixedIcon className="size-6 shrink-0 text-brand" />;
  if (checked) return <CheckboxOnIcon className="size-6 shrink-0 text-brand" />;
  return <CheckboxOffIcon className="size-6 shrink-0 text-neutral-900" />;
}

// The Excel notice sentence for the shared toast (A23): the quoted file
// name truncates as one unit on its own instead of breaking mid-word.
export function ExcelNoticeMessage({ name }: { name: string }) {
  return (
    <p>
      Імпорт з Excel ще недоступний: файл{" "}
      <span className="inline-flex max-w-full align-bottom">
        <span>«</span>
        <span className="min-w-0 truncate">{name}</span>
        <span>»</span>
      </span>{" "}
      не завантажено.
    </p>
  );
}
