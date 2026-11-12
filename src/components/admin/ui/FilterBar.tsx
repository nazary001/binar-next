"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { cx } from "../lib/format";
import { Button } from "./Button";
import { COLOR_TRANSITION, FOCUS_RING, TONES } from "./tokens";

// The row above a list: the search on the left, filter controls after it
// (they wrap), actions on the right; under it, the filters in effect as
// removable chips with "Скинути все".
//
//   <FilterBar
//     search={<SearchInput label="Пошук замовлень" value={list.q} onChange={(q) => list.set({ q })} />}
//     filters={<><Select label="Статус" ... /><DateRange ... /></>}
//     actions={<Button variant="secondary">Експорт CSV</Button>}
//     secondary={<><TogglePill label="Акція" pressed={promo} onToggle={...} /><Switch size="sm" label="Архів" ... /></>}
//     chips={[{ key: "status", label: "Статус: Нове", onRemove: () => list.set({ status: null }) }]}
//     onReset={list.reset}
//   />
//
// Props
// - search, filters, actions: whatever controls the screen passes (the bar
//   only lays them out). The search takes the full width on phones and
//   320 px from 1024 px.
// - filtersLayout: how the filters slot treats its children. "auto"
//   (default): each sizes to its content (a full-width control would
//   otherwise take a whole line). "fill": on phones (under 640 px) each
//   filter fills the row, one per line (a picker that needs the room);
//   from 640 px they sit in a wrapping row. "grid": on phones two equal
//   columns, from 640 px the same row. In both, unlike "auto", a filter
//   that brings its own width (min-[640px]:w-[220px]) keeps it from 640 px.
// - secondary: a second row under the first (toggle pills, a switch): it
//   wraps, and a child with ml-auto goes to the right edge.
// - chips: the filters in effect; each chip is one button that removes it.
// - onReset: shows "Скинути все" (a ghost sm Button) next to the chips.
// FilterChip({ label, onRemove }) is exported for chips elsewhere: a whole
// 32-px button on a white surface (the chip inside a field is TagInput's
// Chip).
// TogglePill({ label, pressed, onToggle, count?, countTone?, size?,
// disabled? }): a filter that is on or off (aria-pressed): a white pill
// with a hairline, black when on. size "sm" 32 px (default, a row of quick
// filters), "md" 40 (next to the search). count: a number after the label
// (hidden at 0); countTone "neutral" (default) or "brand" (something waits
// for staff).

export type FilterChipItem = { key: string; label: string; onRemove: () => void };

export type FilterBarProps = {
  search?: ReactNode;
  filters?: ReactNode;
  filtersLayout?: "auto" | "fill" | "grid";
  actions?: ReactNode;
  secondary?: ReactNode;
  chips?: FilterChipItem[];
  onReset?: () => void;
  className?: string;
};

// The filters slot by layout (whole literal classes).
const FILTERS: Record<NonNullable<FilterBarProps["filtersLayout"]>, string> = {
  // Controls size to their content here: a full-width control (w-full)
  // would otherwise take a whole line each.
  auto: "flex min-w-0 flex-wrap items-center gap-2 [&>*]:w-auto [&>*]:max-w-full",
  // Phones: one filter per line, each the full width. From 640 px a
  // wrapping row in which every filter keeps its own width.
  fill:
    "flex min-w-0 gap-2 max-[639px]:w-full max-[639px]:flex-col max-[639px]:[&>*]:w-full " +
    "min-[640px]:flex-row min-[640px]:flex-wrap min-[640px]:items-center min-[640px]:[&>*]:max-w-full",
  // Phones: two equal columns (a cell stretches its filter). From 640 px
  // as "fill".
  grid:
    "min-w-0 gap-2 max-[639px]:grid max-[639px]:w-full max-[639px]:grid-cols-2 max-[639px]:[&>*]:w-auto max-[639px]:[&>*]:min-w-0 " +
    "min-[640px]:flex min-[640px]:flex-wrap min-[640px]:items-center min-[640px]:[&>*]:max-w-full",
};

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Прибрати фільтр «${label}»`}
      className={cx(
        "group inline-flex h-8 max-w-full cursor-pointer items-center gap-1 rounded-full border border-stroke-subtle bg-white pl-3 pr-1.5",
        "text-[13px] font-medium leading-[18px] text-neutral-800 hover:border-neutral-800 motion-reduce:transition-none",
        COLOR_TRANSITION,
        FOCUS_RING,
      )}
    >
      <span className="truncate">{label}</span>
      <span
        aria-hidden
        className={cx(
          "flex size-5 shrink-0 items-center justify-center rounded-full text-neutral-500 group-hover:bg-neutral-900 group-hover:text-white motion-reduce:transition-none",
          COLOR_TRANSITION,
        )}
      >
        <XMarkIcon className="size-3.5" />
      </span>
    </button>
  );
}

export type TogglePillProps = {
  label: ReactNode;
  pressed: boolean;
  onToggle: () => void;
  count?: number | null;
  countTone?: "neutral" | "brand";
  size?: "sm" | "md";
  disabled?: boolean;
  title?: string;
};

const PILL: Record<"sm" | "md", { box: string; pad: string; padCount: string }> = {
  sm: { box: "h-8 text-[13px] leading-[18px]", pad: "px-3.5", padCount: "pl-3.5 pr-1.5" },
  md: { box: "h-10 text-[14px] leading-5", pad: "px-4", padCount: "pl-4 pr-2" },
};

export function TogglePill({ label, pressed, onToggle, count, countTone = "neutral", size = "sm", disabled = false, title }: TogglePillProps) {
  const counted = typeof count === "number" && count > 0;
  const look = PILL[size];
  // The count's colours: on the black pill a white one; brand stays orange.
  const countStyle =
    countTone === "brand"
      ? pressed
        ? { backgroundColor: "#ffffff", color: TONES.orange.text }
        : { backgroundColor: TONES.brand.bg, color: TONES.brand.text }
      : undefined;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      disabled={disabled}
      title={title}
      className={cx(
        "inline-flex max-w-full shrink-0 cursor-pointer items-center gap-2 rounded-full border font-medium motion-reduce:transition-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        look.box,
        counted ? look.padCount : look.pad,
        COLOR_TRANSITION,
        FOCUS_RING,
        pressed ? "border-neutral-900 bg-neutral-900 text-white" : "border-stroke-subtle bg-white text-neutral-800 enabled:hover:border-neutral-800",
      )}
    >
      <span className="truncate">{label}</span>
      {counted && (
        <span
          className={cx(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums",
            countTone === "neutral" && (pressed ? "bg-white text-neutral-900" : "bg-neutral-100 text-neutral-700"),
          )}
          style={countStyle}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function FilterBar({ search, filters, filtersLayout = "auto", actions, secondary, chips = [], onReset, className }: FilterBarProps) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-3 pb-4", className)}>
      {(search || filters || actions) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {search && <div className="w-full min-w-0 min-[1024px]:w-[320px] min-[1024px]:shrink-0">{search}</div>}
          {filters && <div className={FILTERS[filtersLayout]}>{filters}</div>}
          {actions && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>}
        </div>
      )}
      {secondary && <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">{secondary}</div>}
      {chips.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Застосовані фільтри" role="group">
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
          ))}
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Скинути все
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
