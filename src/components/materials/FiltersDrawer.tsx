"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CheckboxOffIcon, CheckboxOnIcon } from "@/components/catalog/icons";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import { Button } from "@/components/ui/Button";
import { SHEET_FOOTER } from "@/components/ui/Sheet";
import { DIRECTIONS, FILE_TYPE_LABELS } from "./data";
import { ChevronUpIcon, ClearIcon } from "./icons";

const COPY = {
  title: "Фільтри",
  close: "Закрити фільтри",
  reset: "Скинути",
  show: "Показати",
} as const;

export type FilterGroup = {
  key: string;
  title: string;
  options: { value: string; label: string }[];
};

// The two groups of the sheet, shared by the public and the partner
// pages: the landings offer the directions only (4635:32986 /
// 4378:63140), the folders both (4635:33009 / 4396:11930).
export const DIRECTIONS_GROUP: FilterGroup = {
  key: "directions",
  title: "Напрямки",
  options: DIRECTIONS.map((d) => ({ value: d, label: d })),
};
export const TYPES_GROUP: FilterGroup = {
  key: "types",
  title: "Тип документу",
  options: FILE_TYPE_LABELS,
};

// One collapsible group — Title/Large SemiBold header with the 24-px
// chevron (up = expanded), a 16-px-gapped checkbox list 24 px below.
// Phones (TR-28 / TR-10): 44-tall head, 44-tall option rows on a 44
// pitch (24 checkbox + 8 + the 16/22 label, long labels wrap), groups
// 40 + a 1-px #d2d2d2 line + 40 apart (the wrapper draws the line).
function DrawerGroup({
  group,
  active,
  onToggle,
}: {
  group: FilterGroup;
  active: string[];
  onToggle: (key: string, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="flex w-full flex-col max-lg:py-10 max-lg:first:pt-0 max-lg:last:pb-0">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between text-left max-lg:min-h-11 max-lg:gap-4 max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand"
      >
        <span className="text-title-lg text-neutral-900">{group.title}</span>
        <ChevronUpIcon
          className={`size-6 shrink-0 text-neutral-900 transition-[rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            expanded ? "" : "rotate-180"
          }`}
        />
      </button>

      <div
        aria-hidden={!expanded}
        inert={!expanded}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div role="group" aria-label={group.title} className="flex flex-col gap-4 pt-6 max-lg:gap-0 max-lg:pt-[14px]">
            {group.options.map((option) => {
              const checked = active.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onToggle(group.key, option.value)}
                  className="flex w-full cursor-pointer items-center gap-2 text-left max-lg:min-h-11 max-lg:items-start max-lg:py-[10px] max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand"
                >
                  {checked ? (
                    <CheckboxOnIcon className="size-6 shrink-0 text-brand" />
                  ) : (
                    <CheckboxOffIcon className="size-6 shrink-0 text-neutral-900" />
                  )}
                  <span className="min-w-0 flex-1 text-button-md text-neutral-800 max-lg:pt-px">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// The materials filters — Figma 4635:33009 (both groups) / 4635:32986
// (directions only, the landing): the 502-px right-side sheet under
// the sticky header (rounded-tl-48, #d2d2d2 left/top hairlines, pl-60
// pr-80 pt-60 pb-80, 64-px rhythm) over the blurred #343435/50 scrim.
// The hairlines are CSS borders (Figma strokes sit inside the box), so
// pl/pt are 59 + 1: «Фільтри» at 60/60, a 362-px content column.
// H2 «Фільтри» + the 32-px close mark, then the collapsible checkbox
// groups. Toggles apply instantly; X, the scrim and Escape close. As in
// the catalog sheet (designer 2026-11-11: "fix the header so the cross is
// always at hand"), the head is sticky inside the scrolling sheet from
// 640 too: the 60-px top inset lives in the head (a sticky child pins at
// the scroller's padding edge) and a 24-px white band under the title
// (pb-6, cancelled by -mb-6 at rest) is the edge the groups slide under.
//
// Phones (< 640, materials spec 2.9 / system A5 + T5a): the same DOM as a
// full-screen sheet over the header (z 60): the 66-px bar (sticky inside
// the scrolling sheet, Title Large «Фільтри», the 24 cross in a 48 box at
// x vw-48 / y 21), the groups 24 under it, and a footer pinned to the
// bottom (static below 500 px of height) with the live «Знайдено N ...»
// status and «Скинути» / «Показати». Motion: opacity + 12-px drop, 400 ms
// (the menu idiom). Filters still apply live (DECISIONS simplicity rule:
// the opaque sheet hides the list, so a draft would show the same pixels;
// «Показати» just closes). Every desktop string is kept; the phone values
// are max-lg: overrides.
export function MaterialsFiltersDrawer({
  open,
  onClose,
  groups,
  active,
  onToggle,
  resultLabel,
  activeCount,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  groups: FilterGroup[];
  active: Record<string, string[]>;
  onToggle: (key: string, value: string) => void;
  // Phone footer: "Знайдено 9 файлів" for the current query + filters
  // (the callers roll the count, ui/RollingNumber.tsx).
  resultLabel: ReactNode;
  activeCount: number;
  onReset: () => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Initial focus (A5): the bar title on a touch phone (screen readers
  // hear the title, no ring on the cross after a tap), the cross
  // everywhere else (the desktop behaviour of today).
  const focusRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const touchPhone = window.matchMedia("(max-width: 639.98px) and (pointer: coarse)").matches;
    focusRef.current = touchPhone ? titleRef.current : closeRef.current;
  }, [open]);
  useModalBehavior({
    open,
    onClose,
    container: panelRef,
    initial: focusRef,
    inertSelector: "header",
  });

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-[60] max-lg:h-dvh lg:z-40 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={COPY.title}
        tabIndex={-1}
        className={`absolute bottom-0 right-0 top-0 flex flex-col overflow-y-auto overscroll-contain bg-white px-6 outline-none transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] max-lg:w-full max-lg:scroll-pb-[122px] max-lg:transition-[opacity,translate] max-lg:will-change-[opacity,translate] motion-reduce:transition-none max-lg:motion-reduce:transition-none lg:top-[var(--site-header-h,92px)] lg:w-[502px] lg:max-w-[92vw] lg:gap-16 lg:rounded-tl-[48px] lg:border-l lg:border-t lg:border-stroke-subtle lg:scroll-pt-[131px] lg:pb-20 lg:pl-[59px] lg:pr-20 lg:pt-0 ${
          open
            ? "translate-x-0 max-lg:translate-y-0 max-lg:opacity-100"
            : "translate-x-full max-lg:translate-x-0 max-lg:-translate-y-3 max-lg:opacity-0"
        }`}
      >
        <div className="flex w-full items-center justify-between max-lg:sticky max-lg:top-0 max-lg:z-[1] max-lg:-mx-6 max-lg:h-[66px] max-lg:w-auto max-lg:shrink-0 max-lg:gap-2 max-lg:bg-white max-lg:pl-6 max-lg:pr-3 lg:sticky lg:top-0 lg:z-[1] lg:-mb-6 lg:bg-white lg:pb-6 lg:pt-[59px]">
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 outline-none max-lg:min-w-0 max-lg:flex-1 max-lg:truncate max-lg:text-[22px] max-lg:font-semibold max-lg:leading-7 max-lg:tracking-[-0.44px] lg:text-h2 lg:leading-[48px] lg:tracking-[-0.88px]"
          >
            {COPY.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={COPY.close}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand max-lg:size-12 max-lg:rounded-full max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand"
          >
            <ClearIcon className="size-6 lg:size-8" />
          </button>
        </div>

        {/* Phones: one column of groups 24 under the bar, 1-px lines
            between them; from 640 `contents` hands the groups back to the
            aside's own 64-px gap, as before. */}
        <div className="flex flex-col pb-12 pt-6 max-lg:divide-y max-lg:divide-stroke-subtle lg:contents">
          {groups.map((group) => (
            <DrawerGroup
              key={group.key}
              group={group}
              active={active[group.key] ?? []}
              onToggle={onToggle}
            />
          ))}
        </div>

        <div className={`${SHEET_FOOTER} -mx-6 lg:hidden`}>
          <p role="status" aria-live="polite" className="text-body-sm text-neutral-500">
            {resultLabel}
          </p>
          <div className="flex gap-2">
            <Button size="small" variant="outlinedDark" fullWidth disabled={activeCount === 0} onClick={onReset}>
              {COPY.reset}
            </Button>
            <Button size="small" fullWidth onClick={onClose}>
              {COPY.show}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
