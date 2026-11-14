"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MoreIcon } from "./icons";

// «more» trigger + «<Menu>» - the employee card's open menu 4868:31444
// (also 4868:31272 on the contract tiles): a 24-px vertical-dots glyph,
// #777779 closed and brand #f85a0b while open (imgMore1); the menu is a
// 220-px white r24 sheet with the «Drow shadow» 0 2 6 #1d1d1f1a and
// 46-px rows (px-16 py-12, Manrope Medium 16/22 #1d1d1f), each closed by
// a 0.5-px #d2d2d2 hairline at its bottom (the last one too) = 92 for
// «Редагувати» / «Видалити»; `lastDivider={false}` drops the last row's
// hairline (the contracts menu 4868:31272 draws it under the first row
// only). Placement from the master: right edge on
// the glyph's right edge, 6 px under it (employee grid: glyph 27..51,
// menu top 57). The masters draw no hover row; rows get the #f8f8f8
// surface on hover / keyboard focus. Escape, outside press and a pick
// close the menu; arrows move between rows. `trigger` swaps the dots for
// any content (the platform header's company chip opens «Мій профіль» /
// «Вийти» this way, designer 2026-11-13); the menu keeps its placement.
export type KebabMenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export type KebabMenuProps = {
  items?: KebabMenuItem[];
  // Accessible name of the trigger (e.g. «Дії: Олена Коваль»).
  label?: string;
  // Controlled open state (the gallery pins it open); uncontrolled by default.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  menuClassName?: string;
  // The 0.5-px hairline under the last row (default: drawn, as 4868:31444).
  lastDivider?: boolean;
  // Phones (< 640, profile SN-19 / TR-07 row action): the trigger is a
  // 40-px outlined disc (#1d1d1f ring, 20 glyph, 44-px hit box; brand
  // ring + glyph while open). From 640 it is today's 24-px glyph.
  phoneDisc?: boolean;
  // A custom trigger body (given the open state) and the trigger
  // button's classes, replacing the «more» glyph and its look.
  trigger?: (open: boolean) => ReactNode;
  triggerClassName?: string;
};

// Phones: the menu opens above its trigger when the room below it (to the
// viewport bottom, or to the pinned footer / bottom edge of the dialog it
// sits in) is shorter than the menu.
const PHONE_QUERY = "(max-width: 639.98px)";
const ROW_H = 46;

function shouldFlip(trigger: HTMLElement | null, count: number): boolean {
  if (!trigger || !window.matchMedia(PHONE_QUERY).matches) return false;
  const rect = trigger.getBoundingClientRect();
  const need = count * ROW_H + 6;
  let bottom = window.innerHeight;
  let top = 66;
  const dialog = trigger.closest('[role="dialog"]');
  if (dialog) {
    const box = dialog.getBoundingClientRect();
    bottom = Math.min(bottom, box.bottom);
    top = Math.max(0, box.top);
    const last = dialog.firstElementChild?.lastElementChild;
    if (last instanceof HTMLElement && getComputedStyle(last).position === "sticky" && !last.contains(trigger)) {
      bottom = Math.min(bottom, last.getBoundingClientRect().top);
    }
  }
  return bottom - rect.bottom < need && rect.top - top >= need;
}

const DISC =
  "relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200 motion-reduce:transition-none before:absolute before:-inset-0.5 before:content-[''] max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand lg:size-6 lg:rounded-none lg:border-0 lg:before:-inset-2";
const DISC_CLOSED = "border-neutral-900 text-neutral-900 lg:text-neutral-500 lg:hover:text-neutral-900";
const DISC_OPEN = "border-brand text-brand";

export function KebabMenu({
  items = [],
  label = "Дії",
  open: openProp,
  onOpenChange,
  className = "",
  menuClassName = "",
  lastDivider = true,
  phoneDisc = false,
  trigger,
  triggerClassName = "",
}: KebabMenuProps) {
  const [openState, setOpenState] = useState(false);
  const [flip, setFlip] = useState(false);
  const open = openProp ?? openState;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, setOpen]);

  const focusItem = (index: number) => {
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    if (enabled.length === 0) return;
    const pos = ((index % enabled.length) + enabled.length) % enabled.length;
    itemRefs.current[enabled[pos]]?.focus();
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const target = e.key === "ArrowDown" ? 0 : -1;
      if (open) {
        focusItem(target);
      } else {
        setFlip(shouldFlip(triggerRef.current, items.length));
        setOpen(true);
        requestAnimationFrame(() => focusItem(target));
      }
    }
  };

  // Escape from the trigger or a row closes only the menu, not a
  // Modal718 around it (its Escape listener sits on document, next to
  // React's own, so the native event is stopped for later listeners).
  const onRootKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || !open) return;
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    const pos = enabled.indexOf(current);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(pos + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(pos - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(-1);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} onKeyDown={onRootKey} className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (!open) setFlip(shouldFlip(triggerRef.current, items.length));
          setOpen(!open);
        }}
        onKeyDown={onTriggerKey}
        className={trigger ? triggerClassName : phoneDisc ? `${DISC} ${open ? DISC_OPEN : DISC_CLOSED}` : `relative flex size-6 shrink-0 cursor-pointer items-center justify-center transition-colors duration-200 before:absolute before:-inset-2 before:content-[''] ${
          open ? "text-brand" : "text-neutral-500 hover:text-neutral-900"
        }`}
      >
        {trigger ? trigger(open) : <MoreIcon className={phoneDisc ? "size-5 lg:size-6" : "size-6"} />}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={`absolute right-0 z-20 flex max-h-[250px] w-[220px] flex-col overflow-y-auto overflow-x-clip rounded-[24px] bg-white shadow-[0_2px_6px_0_rgba(29,29,31,0.1)] ${
            flip ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
          } ${flip ? "" : menuClassName}`}
        >
          {items.map((item, i) => (
            <button
              key={item.key}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                // The trigger takes the focus first, so a dialog the item
                // opens returns the focus to a live element (not <body>).
                setOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
                item.onSelect();
              }}
              className={`relative flex w-full shrink-0 cursor-pointer items-center px-4 py-3 text-left text-[16px] font-medium leading-[22px] text-neutral-900 outline-none transition-colors duration-150 after:absolute after:inset-x-0 after:bottom-0 after:h-[0.5px] after:bg-stroke-subtle after:content-[''] max-lg:after:h-px hover:bg-bg-subtle focus-visible:bg-bg-subtle disabled:cursor-not-allowed disabled:text-neutral-300 ${
                !lastDivider && i === items.length - 1 ? "after:hidden" : ""
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
