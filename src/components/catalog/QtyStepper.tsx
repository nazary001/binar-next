"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "./icons";

const COPY = {
  group: "Кількість",
  input: "Кількість",
  less: "Зменшити кількість",
  more: "Збільшити кількість",
} as const;

// Moved out of ProductCard.tsx (which re-exports it) for the mobile pass
// (system spec A18). Never import ProductCard.tsx from here (circular).

// Qty stepper - 16-px minus/plus glyph buttons around the count in
// Title/Large, 8-px gaps (Figma Frame 1010106549).
// `size="sm"` is the cart flavour (4329:39939): the count in 20/22 Bold.
// `slot` drops the 2-px count padding of the catalog flavour for the
// cart masters: "fixed" = the drawer row (4329:39939 / 4204:56952), the
// count centred in a 28-px slot (76 for one or two digits); "hug" = the
// stock-modal table (4329:40413), the count hugs its digits (60 for "2").
//
// Phones (TR-15, A18): each glyph button is a 40-px round hit box centred
// on the 16-px glyph with -12 margins, so the row keeps its 16-px
// footprint; the count is 16/22 Bold +0.16 for every size (desktop
// values restored with lg:). `editable` (partner contexts only) swaps the
// phone count for a numeric input: digits while typing, commit on blur /
// Enter (empty or 0 -> 1, capped at `max`).
//
// Name: the wrapper is `role="group"` named by `label` (aria-label,
// default "Кількість"), or by a visible caption when `labelledBy` holds
// its id (aria-labelledby, no aria-label then; the PDP qty row).
//
// CONSUMER RULE (DECISIONS round 3; the hit boxes stay as they are): the
// 40-px hit box reaches 12 px past each 16-px glyph, so on phones the
// next control after the plus (the cart disc of a catalog / PDP card, a
// cart or assortment row control) must start at least 12 px after the
// plus glyph - `max-lg:ml-3` on that control or an equivalent gap - so
// the plus box never covers it and steals its taps. Verifiers probe it
// with elementFromPoint at 320 (the narrowest action rows).
const HIT =
  "max-lg:relative max-lg:-m-3 max-lg:flex max-lg:size-10 max-lg:items-center max-lg:justify-center max-lg:rounded-full max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand max-lg:motion-reduce:transition-none";

export function QtyStepper({
  qty,
  onQty,
  disabled,
  tone = "dark",
  size = "md",
  slot,
  label = COPY.group,
  labelledBy,
  editable = false,
  max = 99999,
}: {
  qty: number;
  onQty: (next: number) => void;
  disabled?: boolean;
  tone?: "dark" | "light";
  size?: "md" | "sm";
  slot?: "fixed" | "hug";
  label?: string;
  labelledBy?: string;
  editable?: boolean;
  max?: number;
}) {
  const btn =
    tone === "light"
      ? "text-white hover:text-brand disabled:text-neutral-500"
      : "text-neutral-900 hover:text-brand disabled:text-neutral-400";
  const type =
    size === "sm"
      ? "text-[16px] font-bold leading-[22px] tracking-[0.16px] lg:text-[20px] lg:tracking-[0.2px]"
      : "text-title-sm lg:text-title-lg";
  const count = `${tone === "light" ? "text-white" : "text-neutral-900"} ${type}`;
  const countBox =
    slot === "hug" ? "" : slot === "fixed" ? "min-w-7 text-center" : "min-w-7 px-0.5 text-center";
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={`flex items-center gap-2 ${editable ? "max-lg:gap-3" : ""} ${slot ? "w-fit" : ""}`}
    >
      <button
        type="button"
        aria-label={COPY.less}
        disabled={disabled || qty <= 1}
        onClick={() => onQty(Math.max(1, qty - 1))}
        className={`cursor-pointer transition-colors duration-200 disabled:cursor-default ${btn} ${HIT}`}
      >
        <MinusIcon className="size-4" />
      </button>
      {/* min-w-7 keeps the master's 28-px slot for 1-2 digits and grows
          for more; nowrap beats the site-wide mobile `overflow-wrap:
          anywhere` on spans, which split "120" into two lines. */}
      <span
        aria-live="polite"
        aria-atomic="true"
        className={`shrink-0 whitespace-nowrap ${countBox} ${count} ${editable ? "max-lg:hidden" : ""}`}
      >
        {qty}
      </span>
      {editable && <QtyInput qty={qty} onQty={onQty} max={max} disabled={disabled} className={count} />}
      <button
        type="button"
        aria-label={COPY.more}
        disabled={disabled || qty >= max}
        onClick={() => onQty(Math.min(max, qty + 1))}
        className={`cursor-pointer transition-colors duration-200 disabled:cursor-default ${btn} ${HIT}`}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

// Phone-only typed quantity (A18 / O-14). `draft` is null while the
// field is not being edited, so the shown value always follows `qty`.
// py 11 with -my 11: a 44-tall tap box on the 22-px line, no layout
// change.
function QtyInput({
  qty,
  onQty,
  max,
  disabled,
  className,
}: {
  qty: number;
  onQty: (next: number) => void;
  max: number;
  disabled?: boolean;
  className: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(qty);
  const commit = () => {
    if (draft === null) return;
    const n = Number.parseInt(draft, 10);
    const next = !Number.isFinite(n) || n < 1 ? 1 : Math.min(n, max);
    setDraft(null);
    if (next !== qty) onQty(next);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="done"
      autoComplete="off"
      maxLength={5}
      aria-label={COPY.input}
      disabled={disabled}
      value={shown}
      onFocus={() => setDraft(String(qty))}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={{ width: `calc(${Math.max(2, shown.length)}ch + 4px)` }}
      className={`-my-[11px] min-w-7 bg-transparent px-0 py-[11px] text-center outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-brand lg:hidden ${className}`}
    />
  );
}
