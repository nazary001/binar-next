"use client";

import { CheckIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import {
  FIELD_ACTION,
  FIELD_ACTION_SIZE,
  FIELD_BOX,
  FIELD_GAP,
  FIELD_ICON,
  FIELD_PL,
  FIELD_PR,
  FieldFrame,
  hasField,
  useFieldIds,
  type FieldControlProps,
} from "./Field";
import { useDismiss, useFloating } from "./floating";
import { assignRef, floatingRoot } from "./overlay";
import { CONTROL, SURFACE, TONES, Z, type ControlSize, type Tone } from "./tokens";

// Select: one value from a short list, in a custom listbox (the cabinet's
// select: a pill, a floating white list with the menu shadow, a check on
// the chosen row).
//
//   <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
//   <Select aria-label="Менеджер" value={managerId} onChange={setManagerId} clearable placeholder="Усі менеджери"
//     options={staff.map((s) => ({ value: s.id, label: s.name, hint: s.email }))} />
//   <NativeSelect label="Область" value={region} onChange={setRegion} options={REGIONS} />
//
// Select props
// - value: the chosen option's value, or null / undefined for none.
// - onChange(value): with clearable, it may receive null (the cross).
// - options: { value, label, hint?, disabled?, tone? }. hint is a second
//   line in the list; tone draws a status dot (in the list and the field).
// - placeholder: shown when nothing is chosen ("Оберіть").
// - size: "sm" | "md" (default) | "lg", the heights of inputs and buttons.
// - disabled, clearable, name (a hidden input for a native form), onBlur,
//   ref (the trigger button), and the Field props (label, hint, error,
//   required, optional, labelAction, id, aria-label, className).
//
// Keyboard (WAI-ARIA select-only combobox): ArrowDown / ArrowUp / Enter /
// Space open the list on the chosen row; in the list the arrows move,
// Home / End jump, PageUp / PageDown move by ten, Enter or Space picks,
// Escape closes without a change, Tab closes and moves on, typing letters
// jumps to the first row that starts with them (repeat a letter to cycle).
// Focus stays on the trigger the whole time (aria-activedescendant), so a
// dialog's focus trap is never disturbed and focus is always back on it.
//
// NativeSelect is the browser's own <select> in the same pill: for long
// plain lists, where the phone's native picker is the better tool.

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
  tone?: Tone;
};

type SelectBaseProps<T extends string> = FieldControlProps & {
  value: T | null | undefined;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  size?: ControlSize;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
  ref?: Ref<HTMLButtonElement>;
};

export type SelectProps<T extends string> = SelectBaseProps<T> &
  ({ clearable?: false; onChange: (value: T) => void } | { clearable: true; onChange: (value: T | null) => void });

// --- Shared listbox look (Combobox and TagInput use it too) ------------------

// The floating list: white, the menu shadow, at least the trigger's width
// (useFloating matchWidth), never wider than the window.
export const LISTBOX_LAYER = cx(
  "fixed flex flex-col overflow-hidden",
  SURFACE.float,
  Z.dropdown,
  "max-w-[calc(100vw-16px)] min-[640px]:max-w-[480px]",
  "origin-top transition-[opacity,scale] duration-150 motion-reduce:transition-none starting:scale-[0.97] starting:opacity-0",
);

// The scrolling list inside the layer (the layer's max-height is set by
// useFloating to the room that is left; this caps it for long lists).
export const LISTBOX_SCROLL = "admin-scroll min-h-0 max-h-[320px] overflow-y-auto p-1.5";

// One option. `data-active` marks the row the keyboard or the pointer is
// on. OPTION_CHOSEN adds the bold of the chosen row (aria-selected) where
// aria-selected means "the value"; a suggestion list, where it means "the
// highlighted row", leaves it out.
export const OPTION_ROW =
  "flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] leading-5 text-neutral-900 " +
  "transition-colors duration-150 motion-reduce:transition-none data-[active=true]:bg-bg-cabinet " +
  "aria-disabled:cursor-not-allowed aria-disabled:text-neutral-300";
export const OPTION_CHOSEN = "aria-selected:font-semibold";

// A message row in a list (empty, loading, error).
export const LISTBOX_NOTE = "flex min-h-10 items-center gap-2 px-3 py-2 text-[14px] leading-5 text-neutral-500";

export const OPTION_CHECK = "size-4 shrink-0 text-brand";

export function ToneDot({ tone }: { tone: Tone }) {
  return <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: TONES[tone].dot }} />;
}

// The trigger's open state: the brand ring of a focused field.
export const TRIGGER_OPEN = "aria-expanded:border-brand aria-expanded:ring-1 aria-expanded:ring-brand aria-expanded:hover:border-brand";

// Where the clear cross sits: left of the chevron, over a spacer of its
// own width in the trigger's flow (a button cannot hold another button).
const CLEAR_RIGHT: Record<ControlSize, string> = { sm: "right-[34px]", md: "right-[42px]", lg: "right-[50px]" };
const CLEAR_SPACER: Record<ControlSize, string> = { sm: "w-6", md: "w-8", lg: "w-9" };

function isPrintable(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

export function Select<T extends string>(props: SelectProps<T>) {
  const { value, options, placeholder = "Оберіть", size = "md", disabled = false, name, onBlur, ref } = props;
  const ids = useFieldIds(props);
  const listId = `${ids.id}-list`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const typed = useRef({ text: "", at: -1000 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [host, setHost] = useState<HTMLElement | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const canClear = props.clearable === true && selected !== null && !disabled;

  useFloating(open, triggerRef, layerRef, { placement: "bottom-start", matchWidth: true });
  const dismiss = useCallback(() => setOpen(false), []);
  useDismiss(open, [triggerRef, layerRef], dismiss);

  // Keep the active row in view while the keyboard moves it.
  useEffect(() => {
    if (!open || active < 0) return;
    layerRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const enabledFrom = (start: number, direction: 1 | -1): number => {
    for (let index = start; index >= 0 && index < options.length; index += direction) {
      if (!options[index].disabled) return index;
    }
    return -1;
  };
  const first = () => enabledFrom(0, 1);
  const last = () => enabledFrom(options.length - 1, -1);
  const move = (from: number, direction: 1 | -1, times = 1): number => {
    let index = from;
    for (let step = 0; step < times; step += 1) {
      const next = enabledFrom(index + direction, direction);
      if (next < 0) break;
      index = next;
    }
    return index < 0 ? (direction === 1 ? first() : last()) : index;
  };

  const openList = (index: number) => {
    if (disabled) return;
    setHost(floatingRoot(triggerRef.current));
    setActive(index);
    setOpen(true);
  };

  const pick = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    setOpen(false);
    if (option.value !== value) props.onChange(option.value);
    triggerRef.current?.focus();
  };

  const clear = () => {
    if (props.clearable) props.onChange(null);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Type-ahead: letters typed within half a second build one query; a
  // repeated single letter cycles through the rows that start with it.
  const findTyped = (char: string, at: number): number => {
    const memory = typed.current;
    memory.text = at - memory.at > 500 ? char : memory.text + char;
    memory.at = at;
    const query = memory.text.toLowerCase();
    const cycling = query.length > 1 && query.split("").every((letter) => letter === query[0]);
    const needle = cycling ? query[0] : query;
    const from = open ? active : selectedIndex;
    const start = cycling || query.length === 1 ? from + 1 : Math.max(from, 0);
    for (let k = 0; k < options.length; k += 1) {
      const index = (((start + k) % options.length) + options.length) % options.length;
      const option = options[index];
      if (!option.disabled && option.label.toLowerCase().startsWith(needle)) return index;
    }
    return -1;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const { key } = event;
    const typing = event.timeStamp - typed.current.at < 500 && typed.current.text !== "";

    if (!open) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || (key === " " && !typing)) {
        event.preventDefault();
        openList(selectedIndex >= 0 ? selectedIndex : key === "ArrowUp" ? last() : first());
      } else if (key === "Home" || key === "End") {
        event.preventDefault();
        openList(key === "Home" ? first() : last());
      } else if (isPrintable(event)) {
        const index = findTyped(key, event.timeStamp);
        if (index >= 0) openList(index);
      }
      return;
    }

    switch (key) {
      case "ArrowDown":
        event.preventDefault();
        setActive(move(active, 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        if (event.altKey) pick(active);
        else setActive(move(active, -1));
        return;
      case "PageDown":
        event.preventDefault();
        setActive(move(active, 1, 10));
        return;
      case "PageUp":
        event.preventDefault();
        setActive(move(active, -1, 10));
        return;
      case "Home":
        event.preventDefault();
        setActive(first());
        return;
      case "End":
        event.preventDefault();
        setActive(last());
        return;
      case "Enter":
        event.preventDefault();
        pick(active);
        return;
      case "Escape":
        // Stops here: the dialog this select sits in stays open.
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        if (key === " " && !typing) {
          event.preventDefault();
          pick(active);
        } else if (isPrintable(event)) {
          event.preventDefault();
          const index = findTyped(key, event.timeStamp);
          if (index >= 0) setActive(index);
        }
    }
  };

  const framed = hasField(props);
  const labelled = Boolean(props.label);

  return (
    <FieldFrame field={props} ids={ids} labelAs="span" disabled={disabled}>
      <div className={cx("relative min-w-0", !framed && props.className)}>
        <button
          ref={(node) => {
            triggerRef.current = node;
            assignRef(ref, node);
          }}
          id={ids.id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-labelledby={labelled ? `${ids.labelId} ${ids.id}` : undefined}
          aria-label={labelled ? undefined : props["aria-label"]}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          aria-required={props.required || undefined}
          disabled={disabled}
          data-invalid={ids.invalid || undefined}
          data-disabled={disabled || undefined}
          onClick={() => {
            triggerRef.current?.focus();
            if (open) setOpen(false);
            else openList(selectedIndex >= 0 ? selectedIndex : first());
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setOpen(false);
            onBlur?.();
          }}
          className={cx(
            FIELD_BOX,
            CONTROL[size],
            FIELD_GAP[size],
            FIELD_PL[size],
            FIELD_PR[size],
            TRIGGER_OPEN,
            // A button sizes to its content; the wrapper carries the width.
            // The brand border and ring are its focus mark, not the
            // browser's outline.
            "w-full cursor-pointer text-left outline-none",
          )}
        >
          {selected?.tone && <ToneDot tone={selected.tone} />}
          <span className={cx("min-w-0 flex-1 truncate", !selected && "text-neutral-400")}>
            {selected ? selected.label : placeholder}
          </span>
          {canClear && <span aria-hidden className={cx("shrink-0", CLEAR_SPACER[size])} />}
          <ChevronDownIcon
            aria-hidden
            strokeWidth={1.7}
            className={cx(
              "shrink-0 text-neutral-500 transition-[rotate] duration-200 motion-reduce:transition-none",
              FIELD_ICON[size],
              open && "rotate-180",
            )}
          />
        </button>
        {canClear && (
          <button
            type="button"
            aria-label="Очистити вибір"
            title="Очистити вибір"
            onPointerDown={(event) => event.preventDefault()}
            onClick={clear}
            className={cx("absolute top-1/2 -translate-y-1/2", CLEAR_RIGHT[size], FIELD_ACTION, FIELD_ACTION_SIZE[size])}
          >
            <XMarkIcon aria-hidden strokeWidth={1.7} className={FIELD_ICON[size]} />
          </button>
        )}
        {name && <input type="hidden" name={name} value={value ?? ""} />}
      </div>

      {open &&
        host &&
        createPortal(
          <div
            ref={layerRef}
            data-floating-layer=""
            // A press in the list must not take the focus off the trigger.
            onPointerDown={(event) => event.preventDefault()}
            className={LISTBOX_LAYER}
          >
            {options.length === 0 ? (
              <p className={LISTBOX_NOTE}>Немає варіантів</p>
            ) : (
              <div
                id={listId}
                role="listbox"
                aria-labelledby={labelled ? ids.labelId : undefined}
                aria-label={labelled ? undefined : (props["aria-label"] ?? placeholder)}
                className={LISTBOX_SCROLL}
              >
                {options.map((option, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={option.value}
                      id={`${listId}-${index}`}
                      role="option"
                      data-index={index}
                      data-active={index === active || undefined}
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      onPointerMove={() => {
                        if (!option.disabled && index !== active) setActive(index);
                      }}
                      onClick={() => pick(index)}
                      className={cx(OPTION_ROW, OPTION_CHOSEN)}
                    >
                      {option.tone && <ToneDot tone={option.tone} />}
                      <span className="min-w-0 flex-1">
                        <span className="block">{option.label}</span>
                        {option.hint && (
                          <span className="block text-[12px] font-medium leading-4 text-neutral-500">{option.hint}</span>
                        )}
                      </span>
                      {isSelected && <CheckIcon aria-hidden strokeWidth={2} className={OPTION_CHECK} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>,
          host,
        )}
    </FieldFrame>
  );
}

// --- NativeSelect --------------------------------------------------------------

export type NativeSelectProps<T extends string> = FieldControlProps & {
  value: T | "";
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  placeholder?: string;
  size?: ControlSize;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
  ref?: Ref<HTMLSelectElement>;
};

const NATIVE_PAD: Record<ControlSize, string> = { sm: "pl-3 pr-9", md: "pl-4 pr-10", lg: "pl-5 pr-12" };
const NATIVE_CHEVRON: Record<ControlSize, string> = { sm: "right-3", md: "right-4", lg: "right-5" };

export function NativeSelect<T extends string>(props: NativeSelectProps<T>) {
  const { value, onChange, options, placeholder, size = "md", disabled = false, name, onBlur, ref } = props;
  const ids = useFieldIds(props);
  return (
    <FieldFrame field={props} ids={ids} disabled={disabled}>
      <div
        data-field-box=""
        data-invalid={ids.invalid || undefined}
        data-disabled={disabled || undefined}
        className={cx(FIELD_BOX, CONTROL[size], !hasField(props) && props.className)}
      >
        <select
          ref={ref}
          id={ids.id}
          name={name}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as T)}
          onBlur={onBlur}
          aria-label={props["aria-label"]}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          aria-required={props.required || undefined}
          className={cx(
            "h-full w-full min-w-0 cursor-pointer appearance-none truncate rounded-full bg-transparent outline-none disabled:cursor-not-allowed",
            NATIVE_PAD[size],
            value === "" && "text-neutral-400",
          )}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled} className="text-neutral-900">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden
          strokeWidth={1.7}
          className={cx("pointer-events-none absolute top-1/2 -translate-y-1/2 text-neutral-500", NATIVE_CHEVRON[size], FIELD_ICON[size])}
        />
      </div>
    </FieldFrame>
  );
}
