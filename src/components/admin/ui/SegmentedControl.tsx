"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../lib/format";
import { COLOR_TRANSITION, FOCUS_RING_INSET, TONES, type Tone } from "./tokens";

// SegmentedControl: one of a few values, drawn as the Tabs capsule (the
// #e8e8e9 track, the chosen one a white pill). It is a radio group, not
// tabs: it sets a value (a status, a view), nothing is shown or hidden
// with it. Each choice applies at once.
//
//   <SegmentedControl
//     label="Статус заявки"
//     value={status}
//     onChange={setStatus}
//     options={[
//       { value: "new", label: "Нова", tone: "blue" },
//       { value: "inWork", label: "В роботі", tone: "amber" },
//       { value: "done", label: "Опрацьована", tone: "green" },
//       { value: "spam", label: "Спам", tone: "neutral" },
//     ]}
//     fill
//     twoRowsBelow={480}
//   />
//
// Props
// - options: { value, label, tone?, disabled? }[]; `tone` puts a 6-px dot
//   before the label (the tone's dot colour when chosen, grey otherwise).
// - value (T | null), onChange(value).
// - label: the group's accessible name (or labelledBy: the id of a visible
//   heading).
// - size: "md" (default) a 40-px capsule of 32-px segments, the height of
//   a control; "sm" 32 px of 24-px segments.
// - fill: the segments share the whole row equally (at most 6); without
//   it the capsule hugs its content and scrolls sideways when narrow.
// - twoRowsBelow: 480 | 640 (with fill): two segments per row under that
//   width, so four long labels stay readable in a phone drawer.
// - disabled, className.
// Keyboard: Tab enters on the chosen segment; arrows (and Home / End)
// move and choose, skipping disabled ones. The arrow keys never reach the
// layer around (a drawer's own "next record" arrows).

export type SegmentOption<T extends string> = { value: T; label: ReactNode; tone?: Tone; disabled?: boolean };

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
  labelledBy?: string;
  size?: "md" | "sm";
  fill?: boolean;
  twoRowsBelow?: 480 | 640;
  disabled?: boolean;
  className?: string;
};

// Whole literal classes (Tailwind extracts nothing built at run time).
const FILL_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};
const FILL_COLUMNS_480: Record<number, string> = {
  1: "min-[480px]:grid-cols-1",
  2: "min-[480px]:grid-cols-2",
  3: "min-[480px]:grid-cols-3",
  4: "min-[480px]:grid-cols-4",
  5: "min-[480px]:grid-cols-5",
  6: "min-[480px]:grid-cols-6",
};
const FILL_COLUMNS_640: Record<number, string> = {
  1: "min-[640px]:grid-cols-1",
  2: "min-[640px]:grid-cols-2",
  3: "min-[640px]:grid-cols-3",
  4: "min-[640px]:grid-cols-4",
  5: "min-[640px]:grid-cols-5",
  6: "min-[640px]:grid-cols-6",
};

const SEGMENT: Record<"md" | "sm", string> = {
  md: "h-8 px-3 text-[13px] leading-[18px]",
  sm: "h-6 px-2.5 text-[12px] leading-4",
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  labelledBy,
  size = "md",
  fill = false,
  twoRowsBelow,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled && !disabled);
  const chosen = options.findIndex((option) => option.value === value);
  // The segment Tab lands on: the chosen one, or the first enabled one.
  const tabStop = chosen >= 0 && !options[chosen].disabled ? chosen : (enabled[0]?.index ?? -1);
  const count = Math.min(6, Math.max(1, options.length));

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, at: number) => {
    const position = enabled.findIndex((entry) => entry.index === at);
    if (position < 0 || enabled.length === 0) return;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (position + 1) % enabled.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (position - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = enabled[next];
    refs.current[target.index]?.focus();
    if (target.option.value !== value) onChange(target.option.value);
  };

  const twoRows = fill && twoRowsBelow !== undefined;
  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      className={cx(
        "gap-0.5 bg-[#e8e8e9] p-1",
        fill
          ? cx(
              "grid w-full",
              twoRows ? "grid-cols-2" : FILL_COLUMNS[count],
              twoRows && twoRowsBelow === 480 && cx("rounded-[20px] min-[480px]:rounded-full", FILL_COLUMNS_480[count]),
              twoRows && twoRowsBelow === 640 && cx("rounded-[20px] min-[640px]:rounded-full", FILL_COLUMNS_640[count]),
              !twoRows && "rounded-full",
            )
          : "inline-flex w-fit max-w-full items-center overflow-x-auto rounded-full scrollbar-hidden",
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const off = disabled || Boolean(option.disabled);
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={off}
            onClick={() => {
              if (!checked && !off) onChange(option.value);
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              "inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium motion-reduce:transition-none",
              !fill && "shrink-0",
              SEGMENT[size],
              COLOR_TRANSITION,
              FOCUS_RING_INSET,
              checked ? "bg-white text-neutral-900" : off ? "text-neutral-300" : "text-neutral-600",
              off ? "cursor-not-allowed" : !checked && "cursor-pointer hover:bg-white/60 hover:text-neutral-900",
              disabled && checked && "opacity-60",
            )}
          >
            {option.tone && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: checked ? (TONES[option.tone] ?? TONES.neutral).dot : "#a5a5a5" }}
              />
            )}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
