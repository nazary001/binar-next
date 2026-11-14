"use client";

import { Fragment, useRef, useState } from "react";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import { Button } from "@/components/ui/Button";
import { OptionRow, Sheet, SheetDivider, SheetGroup } from "@/components/ui/Sheet";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { productsPlural } from "./data";
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
// 32-px close mark, the «Скинути фільтрацію» text button, then the
// collapsible checkbox sections. The reset row is always there (designer
// 2026-11-11: "we lost the reset-filters button"; it used to show only
// while a filter was checked, after the ЗІЗ / Прибирання frames that have
// nothing ticked and no row); with nothing ticked it is a disabled button
// faded to 50 %, like the phone sheet's «Скинути». The head («Фільтри» +
// the cross) is sticky inside the scrolling sheet so the cross stays in
// reach (designer 2026-11-11); the sheet's 60-px top inset lives in the
// head for that (a sticky child pins at the scroller's padding edge), and
// a 24-px white band under the title (pb-6, cancelled by -mb-6 at rest)
// is the clean edge the groups slide under. Checkbox toggles apply
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

  // Below 640 the phone sheet (FiltersSheet) takes over; this desktop
  // drawer is never opened there and draws nothing (max-lg:hidden).
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-40 max-lg:hidden ${open ? "" : "pointer-events-none"}`}
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
        // pl 59 + the 1-px border = the master's 60 (Figma strokes sit
        // inside the 502-px box): content column 362 at x+60. The top 59
        // is the sticky head's padding (lg:pt-0 here); scroll-pt keeps a
        // focused checkbox below the pinned head (59 + 48 + 24).
        className={`absolute bottom-0 right-0 flex w-[502px] max-w-[92vw] flex-col gap-10 overflow-y-auto overscroll-contain rounded-tl-[48px] border-l border-t border-stroke-subtle bg-white px-6 py-10 transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] lg:scroll-pt-[131px] lg:gap-16 lg:pb-20 lg:pl-[59px] lg:pr-20 lg:pt-0 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex w-full items-center justify-between lg:sticky lg:top-0 lg:z-[1] lg:-mb-6 lg:bg-white lg:pb-6 lg:pt-[59px]">
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

        <button
          type="button"
          onClick={onReset}
          disabled={!hasActive}
          className="flex items-center gap-[2px] self-start text-button-md text-neutral-700 transition-[color,opacity] duration-200 enabled:cursor-pointer enabled:hover:text-brand disabled:cursor-default disabled:opacity-50"
        >
          Скинути фільтрацію
          <XMarkIcon className="size-4 shrink-0" />
        </button>

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

// ---------------------------------------------------------------- phone

const SHEET_COPY = {
  title: "Фільтри",
  close: "Закрити фільтри",
  more: "Показати більше",
  reset: "Скинути",
  show: "Показати",
  found: "Знайдено",
  count: (n: number) => `${n} ${productsPlural(n)}`,
} as const;

export type FilterState = Record<FilterParam, string[]>;

const EMPTY: FilterState = { zone: [], type: [], brand: [] };

function sameFilters(a: FilterState, b: FilterState) {
  return (["zone", "type", "brand"] as const).every(
    (k) => a[k].length === b[k].length && a[k].every((v) => b[k].includes(v)),
  );
}

// One collapsible group of the phone sheet: the A5 SheetGroup (44-px head,
// Title Large + 24 chevron, 24 to the options) with 44-px checkbox rows
// (OptionRow) and the brand «Показати більше» text button (44 hit) after
// the tenth option, as on desktop.
function SheetSection({
  section,
  checked,
  onToggle,
}: {
  section: FilterSection;
  checked: string[];
  onToggle: (value: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const options = showAll ? section.options : section.options.slice(0, VISIBLE_LIMIT);
  const id = `catalog-filter-${section.param}`;
  return (
    <SheetGroup id={id} title={section.title} collapsible>
      <ul role="list" aria-labelledby={`${id}-title`}>
        {options.map((option) => (
          <li key={option}>
            <OptionRow type="checkbox" checked={checked.includes(option)} onSelect={() => onToggle(option)}>
              {option}
            </OptionRow>
          </li>
        ))}
      </ul>
      {!showAll && section.options.length > VISIBLE_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex min-h-11 cursor-pointer items-center gap-[2px] text-button-md text-brand focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {SHEET_COPY.more}
          <PlusIcon className="size-4 shrink-0" />
        </button>
      )}
    </SheetGroup>
  );
}

// The phone filters sheet (system spec A5 / T5a, catalog-b2c 2.15): the
// full-screen Sheet over the header with the 66-px bar «Фільтри», the
// groups split by 48 / 1-px #d2d2d2 / 48, and the footer = the result
// status for the DRAFT + «Скинути» / «Показати». Taps edit a draft seeded
// from the applied filters on every open; ANY close (Показати, the cross,
// Escape, a route change) commits it once (onSettled), so the page list
// does not re-render under the sheet on every tick. «Показати» also asks
// the page to bring the toolbar back under the header (`onShow`).
export function FiltersSheet({
  open,
  onClose,
  sections,
  active,
  onApply,
  countFor,
  onShow,
}: {
  open: boolean;
  onClose: () => void;
  sections: FilterSection[];
  active: FilterState;
  onApply: (next: FilterState) => void;
  countFor: (draft: FilterState) => number;
  onShow?: () => void;
}) {
  const [draft, setDraft] = useState<FilterState>(active);
  // Re-seed the draft when the sheet opens (render-phase adjustment).
  const [seededOpen, setSeededOpen] = useState(open);
  if (seededOpen !== open) {
    setSeededOpen(open);
    if (open) setDraft(active);
  }
  const showRequested = useRef(false);

  const toggle = (param: FilterParam, value: string) =>
    setDraft((d) => ({
      ...d,
      [param]: d[param].includes(value) ? d[param].filter((v) => v !== value) : [...d[param], value],
    }));
  const hasDraft = draft.zone.length + draft.type.length + draft.brand.length > 0;
  const count = countFor(draft);

  const settle = () => {
    if (!sameFilters(draft, active)) onApply(draft);
    if (showRequested.current) {
      showRequested.current = false;
      onShow?.();
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onSettled={settle}
      title={SHEET_COPY.title}
      closeLabel={SHEET_COPY.close}
      footer={
        <>
          <p role="status" aria-live="polite" className="text-body-sm text-neutral-500">
            {SHEET_COPY.found} <RollingNumber value={count} format={SHEET_COPY.count} />
          </p>
          <div className="flex gap-2">
            <Button
              size="small"
              variant="outlinedDark"
              fullWidth
              disabled={!hasDraft}
              onClick={() => setDraft(EMPTY)}
            >
              {SHEET_COPY.reset}
            </Button>
            <Button
              size="small"
              fullWidth
              onClick={() => {
                showRequested.current = true;
                onClose();
              }}
            >
              {SHEET_COPY.show}
            </Button>
          </div>
        </>
      }
    >
      {sections.map((section, i) => (
        <Fragment key={`${section.param}-${section.title}`}>
          {i > 0 && <SheetDivider />}
          <SheetSection
            section={section}
            checked={draft[section.param]}
            onToggle={(value) => toggle(section.param, value)}
          />
        </Fragment>
      ))}
    </Sheet>
  );
}
