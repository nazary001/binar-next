"use client";

import { useRef, useState } from "react";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import {
  CheckboxOffIcon,
  CheckboxOnIcon,
  ChevronDown16,
  PlusIcon,
  XMarkIcon,
} from "./icons";

// The three groups of the «Фільтри» sheets and their URL params:
// the direction facet (`zone`: готельні зони / промислові ризики та
// галузі / зони клінінгу), «Товари» (`type`) and «Виробник» (`brand`).
export type FilterParam = "zone" | "type" | "brand";

export type FilterSection = {
  title: string;
  param: FilterParam;
  options: string[];
};

// How many checkboxes a section shows before the orange «Показати
// більше» reveal — the Figma «Товари» section shows ten (4329:39564).
const VISIBLE_LIMIT = 10;

// One collapsible section (Figma 4329:39549 / 39560 / 39576) — the
// Title/Large head with the 24-px chevron (up = expanded), 32 px apart
// so a long title wraps beside it (ЗІЗ «Промислові ризики та галузі»
// 4329:39664 is two lines, 56 tall, chevron centred), the options 24
// below, 16 apart (24-px checkbox + 8 + Medium 16/22 #343435, a long
// label wraps: 44-px row), and the «Показати більше» text button after
// the tenth. Collapse animates via the grid-rows 0fr/1fr track.
function DrawerSection({
  section,
  active,
  onToggle,
}: {
  section: FilterSection;
  active: string[];
  onToggle: (param: FilterParam, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const options = showAll
    ? section.options
    : section.options.slice(0, VISIBLE_LIMIT);

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-8 text-left"
      >
        <span className="min-w-0 flex-1 text-title-lg text-neutral-900">{section.title}</span>
        <ChevronDown16
          className={`size-6 shrink-0 text-neutral-900 transition-[rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        // inert while collapsed: the 0fr grid track hides the list
        // visually, but without inert its checkboxes would still be
        // clickable at their zero-height positions and reachable by
        // keyboard.
        aria-hidden={!expanded}
        inert={!expanded}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 pt-6">
            {options.map((option) => {
              const checked = active.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onToggle(section.param, option)}
                  className="flex w-full cursor-pointer items-center gap-2 text-left"
                >
                  {checked ? (
                    <CheckboxOnIcon className="size-6 shrink-0 text-brand" />
                  ) : (
                    <CheckboxOffIcon className="size-6 shrink-0 text-neutral-900" />
                  )}
                  <span className="min-w-0 flex-1 text-button-md text-neutral-800">
                    {option}
                  </span>
                </button>
              );
            })}
            {!showAll && section.options.length > VISIBLE_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="flex cursor-pointer items-center gap-[2px] self-start text-button-md text-brand transition-opacity duration-200 hover:opacity-80"
              >
                Показати більше
                <PlusIcon className="size-4 shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// The catalog filters sheet — Figma «Фільтри :: Готель» (4329:39542,
// B2B 4329:56505), «ЗІЗ» (4329:39659) and «Прибирання» (4329:39692): a
// 502-px right-side sheet under the sticky header (rounded-tl-48,
// #d2d2d2 left/top hairlines inside the box, pl-60 pr-80 pt-60 pb-80,
// 64-px section rhythm) over a blurred #343435/50 scrim. H2 «Фільтри» +
// 32-px close mark, the «Скинути фільтрацію» text button (only while a
// filter is checked: the hotel frame draws it with «Ванна кімната»
// ticked, the ЗІЗ / Прибирання frames have nothing ticked and no reset
// row), then the collapsible checkbox sections. Checkbox toggles apply
// instantly (no apply button in any sheet; the page's chips / count
// react live); the sheet closes via X, the scrim or Escape. The Figma
// hotel frame starts its scrim at y 106 (a slip): the sheet is pinned
// to the header bottom (--site-header-h, 92), as in B2B 4329:56504.
export function FiltersDrawer({
  open,
  onClose,
  sections,
  active,
  onToggle,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  sections: FilterSection[];
  active: Record<FilterParam, string[]>;
  onToggle: (param: FilterParam, value: string) => void;
  onReset: () => void;
}) {
  const hasActive = sections.some((s) => active[s.param].length > 0);
  // The shared dialog plumbing (cart, auth, materials filters): Escape
  // closes, the page behind stays put (the lock sits on <html>, which
  // keeps the sticky header stuck), focus moves to the close mark on
  // open, Tab / Shift+Tab cycle inside the sheet, the header is inert
  // while open, and focus returns to the «Фільтри» button on close.
  // `onClose` must be stable (CatalogClient memoises it), or every
  // checkbox tick would re-run the effect and bounce focus.
  const asideRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  useModalBehavior({
    open,
    onClose,
    container: asideRef,
    initial: closeBtnRef,
    inertSelector: "header",
  });

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
    >
      {/* Scrim — Figma overlay 3685:53423: #343435 at 50 % with a
          background blur. Click dismisses. */}
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label="Фільтри"
        style={{ top: "var(--site-header-h, 92px)" }}
        // pl/pt 59 + the 1-px border = the master's 60 (Figma strokes
        // sit inside the 502-px box): content column 362 at x+60.
        className={`absolute bottom-0 right-0 flex w-[502px] max-w-[92vw] flex-col gap-10 overflow-y-auto overscroll-contain rounded-tl-[48px] border-l border-t border-stroke-subtle bg-white px-6 py-10 transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] lg:gap-16 lg:pb-20 lg:pl-[59px] lg:pr-20 lg:pt-[59px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <h2 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-h2 lg:leading-[48px] lg:tracking-[-0.88px]">
            Фільтри
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Закрити фільтри"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand"
          >
            <XMarkIcon className="size-8" />
          </button>
        </div>

        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="flex cursor-pointer items-center gap-[2px] self-start text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
          >
            Скинути фільтрацію
            <XMarkIcon className="size-4 shrink-0" />
          </button>
        )}

        {sections.map((section) => (
          <DrawerSection
            key={`${section.param}-${section.title}`}
            section={section}
            active={active[section.param]}
            onToggle={onToggle}
          />
        ))}
      </aside>
    </div>
  );
}
