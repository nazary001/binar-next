"use client";

import { useRef, useState } from "react";
import { CheckboxOffIcon, CheckboxOnIcon } from "@/components/catalog/icons";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import { ChevronUpIcon, ClearIcon } from "./icons";

export type FilterGroup = {
  key: string;
  title: string;
  options: { value: string; label: string }[];
};

// One collapsible group — Title/Large SemiBold header with the 24-px
// chevron (up = expanded), a 16-px-gapped checkbox list 24 px below.
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
    <div className="flex w-full flex-col">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between text-left"
      >
        <span className="text-title-lg text-neutral-900">{group.title}</span>
        <ChevronUpIcon
          className={`size-6 shrink-0 text-neutral-900 transition-[rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            expanded ? "" : "rotate-180"
          }`}
        />
      </button>

      <div
        aria-hidden={!expanded}
        inert={!expanded}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 pt-6">
            {group.options.map((option) => {
              const checked = active.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onToggle(group.key, option.value)}
                  className="flex w-full cursor-pointer items-center gap-2 text-left"
                >
                  {checked ? (
                    <CheckboxOnIcon className="size-6 shrink-0 text-brand" />
                  ) : (
                    <CheckboxOffIcon className="size-6 shrink-0 text-neutral-900" />
                  )}
                  <span className="min-w-0 flex-1 text-button-md text-neutral-800">
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
// H2 «Фільтри» + the 32-px close mark, then the collapsible checkbox
// groups. Toggles apply instantly; X, the scrim and Escape close.
export function MaterialsFiltersDrawer({
  open,
  onClose,
  groups,
  active,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  groups: FilterGroup[];
  active: Record<string, string[]>;
  onToggle: (key: string, value: string) => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useModalBehavior({
    open,
    onClose,
    container: panelRef,
    initial: closeRef,
    inertSelector: "header",
  });

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
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
        aria-label="Фільтри"
        tabIndex={-1}
        style={{ top: "var(--site-header-h, 92px)" }}
        className={`absolute bottom-0 right-0 flex w-[502px] max-w-[92vw] flex-col gap-10 overflow-y-auto overscroll-contain rounded-tl-[48px] border-l border-t border-stroke-subtle bg-white px-6 py-10 outline-none transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] lg:gap-16 lg:pb-20 lg:pl-[60px] lg:pr-20 lg:pt-[60px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <h2 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-h2 lg:leading-[48px] lg:tracking-[-0.88px]">
            Фільтри
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Закрити фільтри"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand"
          >
            <ClearIcon className="size-8" />
          </button>
        </div>

        {groups.map((group) => (
          <DrawerGroup
            key={group.key}
            group={group}
            active={active[group.key] ?? []}
            onToggle={onToggle}
          />
        ))}
      </aside>
    </div>
  );
}
