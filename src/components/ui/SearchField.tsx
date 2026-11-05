"use client";

import { useRef, type RefObject } from "react";
import { MagnifierIcon, XMarkIcon } from "@/components/catalog/icons";

const COPY = {
  placeholder: "Пошук",
  clear: "Очистити пошук",
} as const;

// Search field of the shop / cabinet search rows (TR-10, system spec
// A11): the "Search" pill of the orders (4573:37262), materials
// (3677:40518) and catalog masters - 46 tall, r50, 1-px #8e8e8f ring,
// 16-px text (no iOS focus zoom), the 24-px #4a4a4c magnifier 16 px from
// the right edge. The input string is byte-identical to the desktop
// fields it replaces. Phones add: a `role="search"` form so Enter (the
// "search" key) closes the keyboard, and a 44-px clear button in place
// of the magnifier while there is a query; its 24-px cross sits where
// the magnifier was (right 6 + the 10-px inset of the 44 box = 16 from
// the edge), so the glyph does not jump when typing starts. `className`
// styles the wrapper (desktop widths per caller, e.g. `w-full
// lg:w-[364px]`; the phone search row passes `min-w-0 flex-1`).
export function SearchField({
  value,
  onChange,
  label,
  placeholder = COPY.placeholder,
  surface = "white",
  className = "w-full",
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  surface?: "white" | "none";
  className?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const ownRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? ownRef;
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        ref.current?.blur();
      }}
    >
      <input
        ref={ref}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={`h-[46px] w-full rounded-[50px] border border-stroke-default ${surface === "white" ? "bg-white" : "bg-transparent"} pl-4 pr-12 text-[16px] leading-6 text-neutral-900 outline-none transition-colors duration-200 placeholder:text-neutral-500 focus:border-neutral-800 [&::-webkit-search-cancel-button]:hidden`}
      />
      <MagnifierIcon
        className={`pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-neutral-700 ${value ? "max-lg:hidden" : ""}`}
      />
      {value && (
        <button
          type="button"
          aria-label={COPY.clear}
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          className="absolute right-[6px] top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
        >
          <XMarkIcon className="size-6" />
        </button>
      )}
    </form>
  );
}
