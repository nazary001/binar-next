"use client";

import { useLayoutEffect, useRef } from "react";
import { ChevronDown16 } from "@/components/catalog/icons";
import { placePanel, useDismiss, useListbox } from "./useListbox";

const COPY = {
  label: "Сортування",
} as const;

// Phone sort control (TR-11, system spec A12; checkout menu 4329:41044,
// menu label size 3117:14194): a 14/20 Medium #343435 text trigger with
// the 16-px chevron (20 visual, 44 hit via -my-3 py-3) at the right end
// of a list meta line, and the TR-11 panel: full width of the caller's
// `relative` row container, r24, the 0/2/6 shadow, 44-tall 16/24 Medium
// options between 1-px #d2d2d2 lines, the chosen one brand. Options are
// exactly 44 tall: the line is an inset shadow on every option after the
// first (the Select / fields menu recipe), not a border that would add a
// pixel. It opens below, flips above when only the space above fits it,
// otherwise the page brings the trigger under the bar and the panel is
// capped to the room left (placePanel). Closes on pick, outside
// pointerdown, Escape and Tab; focus never leaves the trigger.
// The SortMenu renders no positioned box of its own: the panel anchors to
// the caller's container (`relative flex flex-wrap items-center
// justify-between gap-x-4 gap-y-2`), `className` lands on the trigger.
export function SortMenu({
  value,
  options,
  onChange,
  label = COPY.label,
  prefix = false,
  className = "",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  label?: string;
  prefix?: boolean;
  className?: string;
}) {
  const index = options.findIndex((o) => o.value === value);
  const current = options[index]?.label ?? "";
  const lb = useListbox(options.length, index, (i) => onChange(options[i].value));
  const wrapRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  useDismiss(lb.open, wrapRef, lb.close);

  useLayoutEffect(() => {
    // The trigger's 44 hit box overhangs the 20-px row: it counts as part
    // of the anchor, so it never lands under the phone bar.
    if (lb.open && menuRef.current) placePanel(menuRef.current, null, triggerRef.current);
  }, [lb.open]);

  return (
    // `contents`: the wrapper only groups the trigger and the panel for
    // the outside-tap test; it draws no box and positions nothing.
    <span ref={wrapRef} className="contents">
      <button
        ref={triggerRef}
        type="button"
        {...lb.trigger}
        aria-controls={lb.open ? lb.menuId : undefined}
        aria-label={`${label}: ${current}`}
        className={`-my-3 flex cursor-pointer items-center gap-1 py-3 text-[14px] font-medium leading-5 text-neutral-800 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
      >
        {prefix && <span className="text-neutral-500">{label}:</span>}
        <span className="whitespace-nowrap">{current}</span>
        <ChevronDown16
          className={`size-4 shrink-0 transition-[rotate] duration-200 motion-reduce:transition-none ${lb.open ? "rotate-180" : ""}`}
        />
      </button>
      {lb.open && (
        <ul
          ref={menuRef}
          id={lb.menuId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-clip overscroll-contain rounded-3xl bg-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)] data-[flip]:bottom-[calc(100%+8px)] data-[flip]:top-auto"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              {...lb.option(i)}
              className={`flex min-h-11 w-full cursor-pointer items-center px-4 py-[10px] text-left text-[16px] font-medium leading-6 [&+&]:shadow-[inset_0_1px_0_var(--color-stroke-subtle)] ${
                i === lb.active ? "bg-bg-subtle " : ""
              }${o.value === value ? "text-brand" : "text-neutral-800"}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
