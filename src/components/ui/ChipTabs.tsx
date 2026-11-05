"use client";

import type { KeyboardEvent } from "react";

// Chip tabs (TR-13, system spec A10): the blog chip (3176:5479) as a tab:
// 36 tall (15 + the 1-px ring = the master's 16 padding), r60, 14/20
// Medium; active = brand fill + white, inactive = 1-px #8e8e8f ring +
// #343435 text. A 44-px hit box comes from the `after:` pseudo: it is
// placed against the padding box, so -5 px (the 1-px ring + 4) gives
// 36 + 8 = 44 (rows are 8 apart, so the hit boxes touch but never
// overlap). The tablist wraps, left-aligned, never scrolls. Callers that
// keep a desktop tab element append their own `lg:` restores to
// `chipTabClass(active)`.
export const CHIP_TAB =
  "relative cursor-pointer whitespace-nowrap rounded-[60px] border px-[15px] py-[7px] text-[14px] font-medium leading-5 transition-colors duration-200 motion-reduce:transition-none after:absolute after:-inset-x-px after:-inset-y-[5px] after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
export const CHIP_TAB_ON = "border-transparent bg-brand text-white";
export const CHIP_TAB_OFF = "border-stroke-default text-neutral-800 active:border-brand active:text-brand";

export function chipTabClass(active: boolean): string {
  return `${CHIP_TAB} ${active ? CHIP_TAB_ON : CHIP_TAB_OFF}`;
}

export const chipTabId = (idPrefix: string, key: string) => `${idPrefix}-tab-${key}`;
export const chipPanelId = (idPrefix: string, key: string) => `${idPrefix}-panel-${key}`;

// Props for the panel a tab controls: spread on the panel element
// (`<section {...chipTabPanelProps("profile", tab)}>`).
export function chipTabPanelProps(idPrefix: string, key: string) {
  return {
    id: chipPanelId(idPrefix, key),
    role: "tabpanel" as const,
    "aria-labelledby": chipTabId(idPrefix, key),
  };
}

export function ChipTabs<K extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix,
  className = "",
}: {
  items: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
  idPrefix: string;
  className?: string;
}) {
  // Roving tabindex: ArrowLeft / ArrowRight (wrapping), Home / End select
  // the tab and move the focus to it.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    let next = -1;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next < 0) return;
    e.preventDefault();
    const key = items[next].key;
    onChange(key);
    document.getElementById(chipTabId(idPrefix, key))?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item, i) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={chipTabId(idPrefix, item.key)}
            aria-selected={active}
            aria-controls={active ? chipPanelId(idPrefix, item.key) : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={chipTabClass(active)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
