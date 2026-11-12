"use client";

import { CheckIcon, MinusIcon } from "@heroicons/react/20/solid";
import { useId, type ReactNode } from "react";
import { cx } from "../lib/format";
import { FIELD_ERROR, FieldFrame, hasField, present, useFieldIds, type FieldControlProps, type FieldError } from "./Field";
import type { Placement } from "./floating";
import { EASE_OUT, TEXT } from "./tokens";
import { Tooltip } from "./Tooltip";

// Choice controls: Checkbox, Switch, RadioGroup, CheckboxGroup. Each is a
// real native input (hidden, for keyboard, forms and screen readers) under
// a drawn box; the brand orange marks what is on, as the cabinet marks the
// active item.
//
//   <Checkbox checked={remember} onChange={setRemember} label="Надіслати клієнту лист" />
//   <Checkbox checked={all} indeterminate={some} onChange={selectAll} aria-label="Вибрати всі" />
//   <Switch checked={enabled} onChange={setEnabled} label="Показувати на сайті" hint="Товар бачать усі відвідувачі" />
//   <Switch checked={on} onChange={setOn} label="Нова Пошта" labelPosition="start" />
//   <RadioGroup label="Оплата" value={payment} onChange={setPayment} options={PAYMENT_OPTIONS} />
//   <RadioGroup label="Доставка" value={kind} onChange={setKind} options={KINDS} variant="tiles" direction="horizontal" />
//   <CheckboxGroup label="Канали" value={channels} onChange={setChannels} options={CHANNELS} />
//
// Checkbox props: checked, onChange(checked), label, hint (a caption under
// the label), error (a message under it; marks the box red), disabled,
// indeterminate (the "some rows chosen" dash; a click then checks it),
// name, value, id, aria-label (when there is no label), aria-describedby,
// className.
//
// Switch props: checked, onChange(checked), label, hint, disabled, size
// ("sm" 28x16 | "md" 36x20, default), labelPosition ("end" default: the
// switch then the label; "start": the label on the left and the switch at
// the right edge, for settings rows), name, id, aria-label, className,
// tooltip (a short note on hover AND on keyboard focus of the switch, read
// as its description; for a switch in a table cell whose meaning needs a
// sentence) and tooltipPlacement ("bottom-start" default).
// A switch acts at once; inside a form that is saved with a button, prefer
// a Checkbox.
//
// RadioGroup props: value (T | null), onChange(value), options
// ({ value, label, hint?, disabled? }), direction ("vertical" default |
// "horizontal"), variant ("plain" default | "tiles": each option is a
// bordered 16-px tile, for a choice that needs its hint read), disabled,
// name, and the Field props (label names the group).
// Arrow keys move between options (the browser's own radio behaviour).
//
// CheckboxGroup props: value (T[]), onChange(T[]) (kept in the options'
// order), options, direction, disabled, and the Field props.

const BOX =
  "pointer-events-none flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-200 motion-reduce:transition-none " +
  "peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white";

// The native input lies over the drawn box: it takes the clicks and the
// focus, and is invisible.
const NATIVE = "peer absolute inset-0 m-0 size-full cursor-[inherit] appearance-none opacity-0";

// --- Checkbox --------------------------------------------------------------------

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: FieldError;
  disabled?: boolean;
  indeterminate?: boolean;
  name?: string;
  value?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
};

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  error,
  disabled = false,
  indeterminate = false,
  name,
  value,
  id,
  className,
  ...aria
}: CheckboxProps) {
  const ids = useFieldIds({ id, hint, error, "aria-describedby": aria["aria-describedby"] });
  const on = checked || indeterminate;
  const message = present(error) && error !== true ? (error as ReactNode) : null;
  // A bare box (a table's selection column) gets a 32-px press target
  // around its 18 px, without taking more room in the layout.
  const bare = !present(label) && !present(hint);

  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label
        className={cx(
          "group inline-flex min-w-0 items-start gap-2.5",
          bare && "-m-[7px] w-fit p-[7px]",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <span className="relative mt-px flex size-[18px] shrink-0">
          <input
            ref={(node) => {
              // `indeterminate` exists only as a DOM property.
              if (node) node.indeterminate = indeterminate;
            }}
            id={ids.id}
            type="checkbox"
            name={name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            aria-label={aria["aria-label"]}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid || undefined}
            className={NATIVE}
          />
          <span
            aria-hidden
            className={cx(
              BOX,
              disabled
                ? on
                  ? "border-neutral-300 bg-neutral-300 text-white"
                  : "border-stroke-subtle bg-bg-subtle"
                : on
                  ? "border-brand bg-brand text-white"
                  : ids.invalid
                    ? "border-negative bg-white"
                    : "border-neutral-400 bg-white group-hover:border-neutral-700",
            )}
          >
            {indeterminate ? (
              <MinusIcon className="size-3.5" />
            ) : checked ? (
              <CheckIcon className="size-3.5" />
            ) : null}
          </span>
        </span>
        {(present(label) || present(hint)) && (
          <span className="flex min-w-0 flex-col gap-0.5">
            {present(label) && <span className={cx(TEXT.body, disabled && "text-neutral-400")}>{label}</span>}
            {present(hint) && (
              <span id={ids.hintId} className={TEXT.caption}>
                {hint}
              </span>
            )}
          </span>
        )}
      </label>
      {message !== null && (
        <p id={ids.errorId} role="alert" className={cx(FIELD_ERROR, "pl-[28px]")}>
          {message}
        </p>
      )}
    </div>
  );
}

// --- Switch ----------------------------------------------------------------------

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  labelPosition?: "start" | "end";
  name?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
  tooltip?: ReactNode;
  tooltipPlacement?: Placement;
};

const TRACK: Record<"sm" | "md", string> = { sm: "h-4 w-7", md: "h-5 w-9" };
const KNOB: Record<"sm" | "md", string> = { sm: "size-3", md: "size-4" };
const KNOB_ON: Record<"sm" | "md", string> = { sm: "translate-x-3", md: "translate-x-4" };

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  size = "md",
  labelPosition = "end",
  name,
  id,
  className,
  tooltip,
  tooltipPlacement = "bottom-start",
  ...aria
}: SwitchProps) {
  const ids = useFieldIds({ id, hint });
  const tipId = useId();
  const hasTip = present(tooltip);
  const atStart = labelPosition === "start";
  const text = (present(label) || present(hint)) && (
    <span className={cx("flex min-w-0 flex-col gap-0.5", atStart && "flex-1")}>
      {present(label) && <span className={cx(TEXT.body, disabled && "text-neutral-400")}>{label}</span>}
      {present(hint) && (
        <span id={ids.hintId} className={TEXT.caption}>
          {hint}
        </span>
      )}
    </span>
  );

  const control = (
    <label
      className={cx(
        "group flex min-w-0 items-start gap-3",
        atStart ? "w-full justify-between" : "inline-flex",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      {atStart && text}
      {/* The track sits on the first text line (20 px tall). */}
      <span className={cx("relative flex shrink-0", size === "md" ? "mt-0" : "mt-0.5", TRACK[size])}>
        <input
          id={ids.id}
          type="checkbox"
          role="switch"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={aria["aria-label"]}
          aria-describedby={cx(present(hint) && ids.hintId, hasTip && tipId) || undefined}
          className={cx(NATIVE, "rounded-full")}
        />
        <span
          aria-hidden
          className={cx(
            "pointer-events-none flex size-full items-center rounded-full p-0.5 transition-colors duration-200 motion-reduce:transition-none",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white",
            disabled
              ? checked
                ? "bg-brand/40"
                : "bg-stroke-subtle"
              : checked
                ? "bg-brand"
                : "bg-neutral-300 group-hover:bg-neutral-400",
          )}
        >
          <span
            className={cx(
              "block rounded-full bg-white transition-[translate] duration-200 motion-reduce:transition-none",
              EASE_OUT,
              KNOB[size],
              checked ? KNOB_ON[size] : "translate-x-0",
            )}
          />
        </span>
      </span>
      {!atStart && text}
    </label>
  );

  if (!hasTip) return control;
  // The note shows on hover and on keyboard focus of the switch (the
  // label hears its input's focus); screen readers get it as the input's
  // description, present before the note is drawn.
  return (
    <>
      <Tooltip content={tooltip} placement={tooltipPlacement} describe={false}>
        {control}
      </Tooltip>
      <span id={tipId} hidden>
        {tooltip}
      </span>
    </>
  );
}

// --- RadioGroup and CheckboxGroup --------------------------------------------------

export type ChoiceOption<T extends string> = {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
};

type GroupLayout = { direction?: "vertical" | "horizontal" };

const GROUP_PLAIN: Record<"vertical" | "horizontal", string> = {
  vertical: "flex flex-col gap-2.5",
  horizontal: "flex flex-wrap gap-x-6 gap-y-2.5",
};
const GROUP_TILES: Record<"vertical" | "horizontal", string> = {
  vertical: "grid gap-2",
  horizontal: "grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]",
};

export type RadioGroupProps<T extends string> = FieldControlProps &
  GroupLayout & {
    value: T | null;
    onChange: (value: T) => void;
    options: readonly ChoiceOption<T>[];
    variant?: "plain" | "tiles";
    disabled?: boolean;
    name?: string;
  };

export function RadioGroup<T extends string>(props: RadioGroupProps<T>) {
  const { value, onChange, options, direction = "vertical", variant = "plain", disabled = false, name } = props;
  const ids = useFieldIds(props);
  const groupName = useId();
  const tiles = variant === "tiles";

  return (
    <FieldFrame field={props} ids={ids} labelAs="span" disabled={disabled}>
      <div
        id={ids.id}
        role="radiogroup"
        aria-labelledby={props.label ? ids.labelId : undefined}
        aria-label={props.label ? undefined : props["aria-label"]}
        aria-describedby={ids.describedBy}
        aria-invalid={ids.invalid || undefined}
        aria-required={props.required || undefined}
        aria-disabled={disabled || undefined}
        className={cx(tiles ? GROUP_TILES[direction] : GROUP_PLAIN[direction], !hasField(props) && props.className)}
      >
        {options.map((option) => {
          const on = option.value === value;
          const off = disabled || Boolean(option.disabled);
          return (
            <label
              key={option.value}
              className={cx(
                "group flex min-w-0 items-start gap-2.5",
                off ? "cursor-not-allowed" : "cursor-pointer",
                tiles && "rounded-2xl border p-3.5 transition-colors duration-200 motion-reduce:transition-none",
                tiles && "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-brand has-[input:focus-visible]:ring-offset-2",
                tiles && (on ? "border-brand bg-white ring-1 ring-brand" : off ? "border-stroke-subtle bg-bg-subtle" : "border-stroke-subtle bg-white hover:border-neutral-400"),
              )}
            >
              <span className="relative mt-px flex size-[18px] shrink-0">
                <input
                  type="radio"
                  name={name ?? groupName}
                  value={option.value}
                  checked={on}
                  disabled={off}
                  onChange={() => onChange(option.value)}
                  className={cx(NATIVE, "rounded-full")}
                />
                <span
                  aria-hidden
                  className={cx(
                    "pointer-events-none block size-full rounded-full border bg-white transition-[border-color,border-width] duration-200 motion-reduce:transition-none",
                    !tiles && "peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white",
                    off
                      ? on
                        ? "border-[5px] border-neutral-300"
                        : "border-stroke-subtle bg-bg-subtle"
                      : on
                        ? "border-[5px] border-brand"
                        : ids.invalid
                          ? "border-negative"
                          : "border-neutral-400 group-hover:border-neutral-700",
                  )}
                />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cx(TEXT.body, tiles && on && "font-semibold", off && "text-neutral-400")}>{option.label}</span>
                {option.hint && <span className={TEXT.caption}>{option.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </FieldFrame>
  );
}

export type CheckboxGroupProps<T extends string> = FieldControlProps &
  GroupLayout & {
    value: readonly T[];
    onChange: (value: T[]) => void;
    options: readonly ChoiceOption<T>[];
    disabled?: boolean;
    name?: string;
  };

export function CheckboxGroup<T extends string>(props: CheckboxGroupProps<T>) {
  const { value, onChange, options, direction = "vertical", disabled = false, name } = props;
  const ids = useFieldIds(props);
  const chosen = new Set<T>(value);

  const toggle = (item: T, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(item);
    else next.delete(item);
    // The options' order, then any value the options do not list.
    const known = options.filter((option) => next.has(option.value)).map((option) => option.value);
    const unknown = value.filter((entry) => next.has(entry) && !options.some((option) => option.value === entry));
    onChange([...known, ...unknown]);
  };

  return (
    <FieldFrame field={props} ids={ids} labelAs="span" disabled={disabled}>
      <div
        id={ids.id}
        role="group"
        aria-labelledby={props.label ? ids.labelId : undefined}
        aria-label={props.label ? undefined : props["aria-label"]}
        aria-describedby={ids.describedBy}
        className={cx(GROUP_PLAIN[direction], !hasField(props) && props.className)}
      >
        {options.map((option) => (
          <Checkbox
            key={option.value}
            name={name}
            value={option.value}
            checked={chosen.has(option.value)}
            onChange={(on) => toggle(option.value, on)}
            label={option.label}
            hint={option.hint}
            error={ids.invalid ? true : undefined}
            disabled={disabled || option.disabled}
          />
        ))}
      </div>
    </FieldFrame>
  );
}
