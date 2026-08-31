"use client";

import { useEffect, useState } from "react";
import {
  CheckboxOffIcon,
  CheckboxOnIcon,
  ChevronDown16,
  PlusIcon,
  XMarkIcon,
} from "./icons";

export type FilterSection = {
  title: string;
  param: "sub" | "brand";
  options: string[];
};

// How many checkboxes a section shows before the orange «Показати
// більше» reveal — the Figma «Товари» section shows ten.
const VISIBLE_LIMIT = 10;

// One collapsible section — Title/Large header with the 24-px chevron
// (up = expanded, per the master), a 16-px-gapped checkbox list, and
// the «Показати більше» text button for long lists. Collapse animates
// via the grid-rows 0fr/1fr track (the site's height-auto recipe).
function DrawerSection({
  section,
  active,
  onToggle,
}: {
  section: FilterSection;
  active: string[];
  onToggle: (param: "sub" | "brand", value: string) => void;
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
        className="flex w-full cursor-pointer items-center justify-between text-left"
      >
        <span className="text-title-lg text-neutral-900">{section.title}</span>
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
                className="flex cursor-pointer items-center gap-[2px] text-button-md text-brand transition-opacity duration-200 hover:opacity-80"
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

// The catalog filters drawer — Figma «Фільтри :: Готель» (3685:53426):
// a 502-px right-side sheet under the sticky header (rounded-tl-48,
// #d2d2d2 left/top hairlines, pl-60 pr-80 pt-60 pb-80, 64-px section
// rhythm) over a blurred #343435/50 scrim. H2 «Фільтри» + 32-px close
// mark, the «Скинути фільтрацію» text button, then the collapsible
// checkbox sections. Checkbox toggles apply instantly (the page's
// chips/count react live); the drawer closes via X, the scrim or
// Escape.
export function FiltersDrawer({
  open,
  onClose,
  sections,
  activeSubs,
  activeBrands,
  onToggle,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  sections: FilterSection[];
  activeSubs: string[];
  activeBrands: string[];
  onToggle: (param: "sub" | "brand", value: string) => void;
  onReset: () => void;
}) {
  // Escape closes; the page behind must not scroll while the drawer
  // is open (the drawer scrolls internally). The lock goes on the ROOT
  // element, not <body>: body{overflow:hidden} re-scopes the sticky
  // header to the body scroller and the header flies off-screen on
  // scrolled pages, while html{overflow:hidden} freezes scrolling AND
  // keeps both the scroll offset and the stuck header intact.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

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
        role="dialog"
        aria-modal="true"
        aria-label="Фільтри"
        style={{ top: "var(--site-header-h, 92px)" }}
        className={`absolute bottom-0 right-0 flex w-[502px] max-w-[92vw] flex-col gap-10 overflow-y-auto overscroll-contain rounded-tl-[48px] border-l border-t border-stroke-subtle bg-white px-6 py-10 transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] lg:gap-16 lg:pb-20 lg:pl-[60px] lg:pr-20 lg:pt-[60px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <h2 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-h2">
            Фільтри
          </h2>
          <button
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
          className="flex cursor-pointer items-center gap-[2px] self-start text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
        >
          Скинути фільтрацію
          <XMarkIcon className="size-4 shrink-0" />
        </button>

        {sections.map((section) => (
          <DrawerSection
            key={section.title}
            section={section}
            active={section.param === "sub" ? activeSubs : activeBrands}
            onToggle={onToggle}
          />
        ))}
      </aside>
    </div>
  );
}
