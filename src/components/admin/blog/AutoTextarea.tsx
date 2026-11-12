"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { cx } from "../lib/format";

// A borderless text area that grows with its text: the writing surface of
// the article editor, where a field should look like the line of the page
// it becomes (the kit's Textarea is a framed form field). The caller gives
// the typography through `className`; the quiet focus tint is drawn here.
//
//   <AutoTextarea value={text} onChange={setText} aria-label="Текст абзацу"
//     placeholder="Почніть писати..." className="text-[16px] leading-6" />
//
// Props: value, onChange(value), aria-label (required: the field has no
// visible label), placeholder, maxLength, invalid (red tint, aria-invalid),
// describedBy, disabled, onKeyDown, id, className, and data-field (a name
// a screen uses to find the field and move focus to it).

export type AutoTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  id?: string;
  className?: string;
  // "tint": the field sits on a grey tile, so hover and focus lighten it.
  surface?: "white" | "tint";
  "data-field"?: string;
};

const SURFACE_LOOK = {
  white: "hover:bg-bg-subtle focus:bg-bg-subtle",
  tint: "hover:bg-white/60 focus:bg-white",
} as const;

// Sets the height to the text; written to the element, never to state.
function fit(area: HTMLTextAreaElement) {
  area.style.height = "auto";
  area.style.height = `${area.scrollHeight}px`;
}

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  maxLength,
  invalid = false,
  describedBy,
  disabled = false,
  onKeyDown,
  id,
  className,
  surface = "white",
  ...rest
}: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) fit(ref.current);
  }, [value]);

  // A new width wraps the text differently (the window, the side column).
  useEffect(() => {
    const area = ref.current;
    if (!area) return;
    let width = area.clientWidth;
    const observer = new ResizeObserver(() => {
      if (area.clientWidth === width) return;
      width = area.clientWidth;
      fit(area);
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      id={id}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      aria-label={rest["aria-label"]}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      data-field={rest["data-field"]}
      spellCheck
      className={cx(
        // -mx-2 with the extra 16 px of width: the text lines up with the
        // block's label while the focus tint reaches past it.
        "-mx-2 block min-w-0 resize-none overflow-hidden rounded-xl px-2 py-1 text-neutral-900 outline-none",
        "placeholder:text-neutral-300 transition-colors duration-200 motion-reduce:transition-none",
        "disabled:cursor-default",
        invalid ? "bg-[#fff0f0]" : cx("bg-transparent", !disabled && SURFACE_LOOK[surface]),
        className,
      )}
      style={{ width: "calc(100% + 16px)" }}
    />
  );
}
