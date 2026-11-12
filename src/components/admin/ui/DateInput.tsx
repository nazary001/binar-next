"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useSyncExternalStore, type Ref } from "react";
import { cx, kyivDay } from "../lib/format";
import {
  FIELD_ACTION,
  FIELD_ACTION_SIZE,
  FIELD_BOX,
  FIELD_GAP,
  FIELD_ICON,
  FIELD_PL,
  FIELD_PR,
  FIELD_PR_ACTION,
  FieldFrame,
  hasField,
  useFieldIds,
  type FieldControlProps,
} from "./Field";
import { COLOR_TRANSITION, CONTROL, FOCUS_RING, type ControlSize } from "./tokens";

// Dates. The browser's own date and time inputs (keyboard entry by parts,
// the system calendar, the locale's order "дд.мм.рррр") in the kit's pill.
//
//   <DateInput label="Дата оплати" value={dueDate} onChange={setDueDate} min={kyivDay()} />
//   <DateTimeInput label="Опублікувати" value={publishAt} onChange={setPublishAt} clearable />
//   <DateRange label="Період" from={from} to={to} onChange={({ from, to }) => setRange({ from, to })} presets />
//
// DateInput props
// - value: a business day "YYYY-MM-DD" (Kyiv) or "" for none; onChange(day).
//   Business days are strings in this project (lib/format kyivDay gives
//   today); never pass a Date.
// - min / max: "YYYY-MM-DD" bounds for the calendar and the typed value.
// - clearable: a cross that sets "".
// - size, disabled, readOnly, name, onBlur, ref, and the Field props.
//
// DateTimeInput: the same with a local "YYYY-MM-DDTHH:mm" value (the
// datetime-local input; convert to an ISO moment on the server side).
//
// DateRange props
// - from / to: "YYYY-MM-DD" or ""; onChange({ from, to }).
// - presets: true for the four standard ones (Сьогодні, 7 днів, 30 днів,
//   Цей місяць) or your own list ({ key, label, range(today) }); the one
//   that matches the current range is shown as active.
// - min / max, size, disabled, clearable, fromLabel ("Від") / toLabel
//   ("До") (the accessible names of the two inputs), and the Field props
//   (label names the pair).
// The first date cannot go past the second in the calendar and back.

type DateKind = "date" | "datetime-local";

export type DateInputProps = FieldControlProps & {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  clearable?: boolean;
  size?: ControlSize;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement>;
};

// The browser's calendar button stays (it is the only way to its picker),
// quieter until hovered. Empty parts ("дд.мм.рррр") read as a placeholder.
const NATIVE_DATE =
  "h-full min-w-0 flex-1 bg-transparent tabular-nums outline-none disabled:cursor-not-allowed " +
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:rounded-md " +
  "[&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator:hover]:opacity-100 " +
  "[&::-webkit-datetime-edit]:p-0";

function NativeDate({ kind, ...props }: DateInputProps & { kind: DateKind }) {
  const { value, onChange, min, max, clearable = false, size = "md", disabled = false, readOnly = false, name, onBlur, ref } = props;
  const ids = useFieldIds(props);
  const canClear = clearable && value !== "" && !disabled && !readOnly;

  return (
    <FieldFrame field={props} ids={ids} disabled={disabled}>
      <div
        data-field-box=""
        data-invalid={ids.invalid || undefined}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        className={cx(
          FIELD_BOX,
          CONTROL[size],
          FIELD_GAP[size],
          FIELD_PL[size],
          canClear ? FIELD_PR_ACTION[size] : FIELD_PR[size],
          !hasField(props) && props.className,
        )}
      >
        <input
          ref={ref}
          id={ids.id}
          type={kind}
          name={name}
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-label={props["aria-label"]}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          aria-required={props.required || undefined}
          className={cx(NATIVE_DATE, value === "" && "text-neutral-400 focus:text-neutral-900")}
        />
        {canClear && (
          <button
            type="button"
            aria-label="Очистити дату"
            title="Очистити дату"
            onPointerDown={(event) => event.preventDefault()}
            onClick={(event) => {
              const box = event.currentTarget.closest("[data-field-box]");
              onChange("");
              box?.querySelector("input")?.focus();
            }}
            className={cx(FIELD_ACTION, FIELD_ACTION_SIZE[size])}
          >
            <XMarkIcon aria-hidden strokeWidth={1.7} className={FIELD_ICON[size]} />
          </button>
        )}
      </div>
    </FieldFrame>
  );
}

export function DateInput(props: DateInputProps) {
  return <NativeDate {...props} kind="date" />;
}

export function DateTimeInput(props: DateInputProps) {
  return <NativeDate {...props} kind="datetime-local" />;
}

// --- DateRange ---------------------------------------------------------------------

export type DateRangeValue = { from: string; to: string };

export type DatePreset = {
  key: string;
  label: string;
  // The range for `today` ("YYYY-MM-DD", Kyiv).
  range: (today: string) => DateRangeValue;
};

// Day arithmetic on "YYYY-MM-DD" strings, at noon UTC so no time zone can
// move the day.
function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const DATE_PRESETS: readonly DatePreset[] = [
  { key: "today", label: "Сьогодні", range: (today) => ({ from: today, to: today }) },
  { key: "7d", label: "7 днів", range: (today) => ({ from: addDays(today, -6), to: today }) },
  { key: "30d", label: "30 днів", range: (today) => ({ from: addDays(today, -29), to: today }) },
  { key: "month", label: "Цей місяць", range: (today) => ({ from: `${today.slice(0, 8)}01`, to: today }) },
];

// Today in Kyiv, read through a store: the server and the first client
// render agree on "" (no preset is marked yet), and render stays pure.
const noSubscribe = () => () => {};
function useToday(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => kyivDay(),
    () => "",
  );
}

export type DateRangeProps = FieldControlProps & {
  from: string;
  to: string;
  onChange: (range: DateRangeValue) => void;
  presets?: boolean | readonly DatePreset[];
  min?: string;
  max?: string;
  size?: ControlSize;
  disabled?: boolean;
  clearable?: boolean;
  fromLabel?: string;
  toLabel?: string;
};

const PRESET =
  "inline-flex shrink-0 cursor-pointer items-center rounded-full border font-medium " +
  "disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";
// The presets stand in the row of the two date fields: as tall as they are
// (CONTROL), with the inset of a button of that size.
const PRESET_SIZE: Record<ControlSize, string> = { sm: "px-3", md: "px-4", lg: "px-5" };

export function DateRange(props: DateRangeProps) {
  const {
    from,
    to,
    onChange,
    presets = false,
    min,
    max,
    size = "md",
    disabled = false,
    clearable = false,
    fromLabel = "Від",
    toLabel = "До",
  } = props;
  const ids = useFieldIds(props);
  const today = useToday();
  const list = presets === true ? DATE_PRESETS : presets === false ? [] : presets;
  const current = today
    ? list.find((preset) => {
        const range = preset.range(today);
        return range.from === from && range.to === to;
      })?.key
    : undefined;

  return (
    <FieldFrame field={props} ids={ids} labelAs="span" disabled={disabled}>
      <div
        id={ids.id}
        role="group"
        aria-labelledby={props.label ? ids.labelId : undefined}
        aria-label={props.label ? undefined : (props["aria-label"] ?? "Період")}
        aria-describedby={ids.describedBy}
        className={cx("flex min-w-0 flex-col gap-2 min-[640px]:flex-row min-[640px]:flex-wrap min-[640px]:items-center", !hasField(props) && props.className)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <DateInput
            aria-label={fromLabel}
            value={from}
            onChange={(next) => onChange({ from: next, to })}
            min={min}
            max={to || max}
            size={size}
            disabled={disabled}
            clearable={clearable}
            error={ids.invalid ? true : undefined}
            className="min-w-0 flex-1 min-[640px]:w-[172px] min-[640px]:flex-none"
          />
          <span aria-hidden className="shrink-0 text-neutral-400">
            -
          </span>
          <DateInput
            aria-label={toLabel}
            value={to}
            onChange={(next) => onChange({ from, to: next })}
            min={from || min}
            max={max}
            size={size}
            disabled={disabled}
            clearable={clearable}
            error={ids.invalid ? true : undefined}
            className="min-w-0 flex-1 min-[640px]:w-[172px] min-[640px]:flex-none"
          />
        </div>
        {list.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {list.map((preset) => {
              const on = preset.key === current;
              return (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  // Today is read when the button is pressed, never during render.
                  onClick={() => onChange(preset.range(kyivDay()))}
                  className={cx(
                    PRESET,
                    CONTROL[size],
                    PRESET_SIZE[size],
                    COLOR_TRANSITION,
                    FOCUS_RING,
                    on ? "border-brand bg-brand text-white" : "border-stroke-subtle bg-white text-neutral-800 hover:border-neutral-400 hover:text-neutral-900",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </FieldFrame>
  );
}
