"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { PHONE_QUERY, placePanel, useDismiss } from "@/components/ui/useListbox";
import { DropdownIcon } from "./icons";

// «<Select>» (master 4098:29949 «State=Default, Has value=True») as the
// cabinet pages draw it: the dashboard counterparty select 5052:32124
// (234 x 46) and the orders / returns filter row 4573:37264.. (364 / 234 /
// 234), both transparent on the #f5f5f5 surface (the orders row lost its
// white fill at the designer's request, 2026-11-11 C30). `bg="white"` stays
// for a select that needs a fill of its own (only the ui-gallery uses it).
// 46 tall, 1-px #d2d2d2 ring INSIDE the box (CSS pads 23 so the value
// starts 24 px in, as the master), r24, value 16/24 Medium +0.15
// #1d1d1f, the 24-px dropdown glyph flush with the 24-px right padding.
// Unlike checkout/fields.tsx SelectField this master draws no floating
// caption, so the accessible name comes from `label` (aria-label).
// `display` replaces the chosen option's name on the field only (the
// orders period select shows its date range, «24.04.2026 — 24.05.2026»,
// while the menu keeps the period names). Keyboard model and menu chrome
// follow SelectField: arrows move the highlight (opening the menu), Home /
// End jump, Enter / Space pick, Escape / blur close (Escape is swallowed
// while the menu is open, so a dialog around it stays); the white r24
// menu with the 0/2/6 shadow sits 4.5 px under the field, 16/22 rows
// padded 16 / 12 with 0.5-px dividers, the chosen row in brand.
// Phones (TR-11, A22 / dashboard SN-03): the menu is the field's width
// with wrapping 44-tall 16/24 Medium rows and 1-px lines, an option is
// picked on click (mousedown only keeps the focus), a tap outside closes
// it, and it flips above when the space below is short - or, when
// neither side fits, the field is brought under the 66-px bar and the
// menu is capped to the room left (placePanel). Desktop strings are
// restored with lg:.
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  display,
  bg = "transparent",
  className = "",
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  display?: string;
  bg?: "transparent" | "white";
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const currentIndex = options.findIndex((o) => o.value === value);
  const current = options[currentIndex];
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const openMenu = () => {
    setActive(currentIndex);
    setOpen(true);
  };
  const closeMenu = () => {
    setActive(-1);
    setOpen(false);
  };
  const pick = (i: number) => {
    onChange(options[i].value);
    closeMenu();
  };
  // iOS does not blur a tapped button when the next tap lands outside.
  useDismiss(open, wrapRef, closeMenu);
  useLayoutEffect(() => {
    if (open && menuRef.current && window.matchMedia(PHONE_QUERY).matches) placePanel(menuRef.current);
  }, [open]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActive((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return Math.max(0, Math.min(options.length - 1, next));
      });
    } else if (open && (e.key === "Home" || e.key === "End")) {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && active >= 0) pick(active);
      else if (open) closeMenu();
      else openMenu();
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    }
  };

  return (
    <div ref={wrapRef} className={`relative max-lg:min-w-0 ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKey}
        onBlur={closeMenu}
        className={`flex h-[46px] w-full cursor-pointer items-center justify-between gap-2 rounded-3xl border px-[23px] text-left text-[16px] font-medium leading-6 tracking-[0.15px] text-neutral-900 outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-brand focus-visible:[box-shadow:inset_0_0_0_1px_var(--color-brand)] ${
          bg === "white" ? "bg-white" : "bg-transparent"
        } ${open ? "border-brand [box-shadow:inset_0_0_0_1px_var(--color-brand)]" : "border-stroke-subtle hover:border-neutral-400"}`}
      >
        <span className="min-w-0 flex-1 truncate">{display ?? current?.label ?? label}</span>
        <DropdownIcon
          className={`size-6 shrink-0 text-neutral-900 transition-[rotate] duration-200 max-lg:motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul
          ref={menuRef}
          id={`${id}-menu`}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-[calc(100%+4.5px)] z-20 max-h-[250px] w-full overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)] data-[flip]:bottom-[calc(100%+4.5px)] data-[flip]:top-auto lg:min-w-max"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o.value === value}
              // mousedown only keeps the focus on the button (its blur
              // would close the menu first); the pick happens on click, so
              // a touch scroll that starts on an option picks nothing.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer whitespace-normal px-4 py-2.5 text-[16px] font-medium leading-6 transition-colors duration-150 [&+&]:shadow-[inset_0_1px_0_var(--color-stroke-subtle)] lg:whitespace-nowrap lg:py-3 lg:text-button-md lg:leading-[22px] lg:[&+&]:shadow-[inset_0_0.5px_0_var(--color-stroke-subtle)] ${
                i === active ? "bg-bg-subtle" : ""
              } ${o.value === value ? "text-brand" : "text-neutral-900"}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
