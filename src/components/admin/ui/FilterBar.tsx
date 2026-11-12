"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { cx } from "../lib/format";
import { Button } from "./Button";
import { COLOR_TRANSITION, FOCUS_RING } from "./tokens";

// The row above a list: the search on the left, filter controls after it
// (they wrap), actions on the right; under it, the filters in effect as
// removable chips with "Скинути все".
//
//   <FilterBar
//     search={<SearchInput label="Пошук замовлень" value={list.q} onChange={(q) => list.set({ q })} />}
//     filters={<><Select label="Статус" ... /><DateRange ... /></>}
//     actions={<Button variant="secondary">Експорт CSV</Button>}
//     chips={[{ key: "status", label: "Статус: Нове", onRemove: () => list.set({ status: null }) }]}
//     onReset={list.reset}
//   />
//
// Props
// - search, filters, actions: whatever controls the screen passes (the bar
//   only lays them out). The search takes the full width on phones and
//   320 px from 1024 px.
// - chips: the filters in effect; each chip is one button that removes it.
// - onReset: shows "Скинути все" (a ghost sm Button) next to the chips.
// FilterChip({ label, onRemove }) is exported for chips elsewhere: a whole
// 32-px button on a white surface (the chip inside a field is TagInput's
// Chip).

export type FilterChipItem = { key: string; label: string; onRemove: () => void };

export type FilterBarProps = {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  chips?: FilterChipItem[];
  onReset?: () => void;
  className?: string;
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

export function FilterBar({ search, filters, actions, chips = [], onReset, className }: FilterBarProps) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-3 pb-4", className)}>
      {(search || filters || actions) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {search && <div className="w-full min-w-0 min-[1024px]:w-[320px] min-[1024px]:shrink-0">{search}</div>}
          {/* Controls size to their content here: a full-width control (w-full)
              would otherwise take a whole line each. */}
          {filters && <div className="flex min-w-0 flex-wrap items-center gap-2 [&>*]:w-auto [&>*]:max-w-full">{filters}</div>}
          {actions && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>}
        </div>
      )}
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
