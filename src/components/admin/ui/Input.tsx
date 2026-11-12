"use client";

import { EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "../lib/format";
import { SlotIcon, type IconSlot } from "./Button";
import {
  FIELD_ACTION,
  FIELD_ACTION_SIZE,
  FIELD_BOX,
  FIELD_GAP,
  FIELD_ICON,
  FIELD_PL,
  FIELD_PR,
  FIELD_PR_ACTION,
  FIELD_SURFACE,
  FieldFrame,
  hasField,
  useFieldIds,
  type FieldControlProps,
} from "./Field";
import { CONTROL, TEXT, type ControlSize } from "./tokens";

// Text inputs of the panel. All are controlled and value-first:
// value + onChange(value), never raw events.
//
//   <Input label="Назва" value={title} onChange={setTitle} error={errors.title} required />
//   <Input label="Телефон" prefix="+380" inputMode="tel" value={phone} onChange={setPhone} />
//   <Input leftIcon={LinkIcon} clearable value={url} onChange={setUrl} aria-label="Посилання" />
//   <Textarea label="Коментар" value={note} onChange={setNote} autoGrow maxLength={500} showCount />
//   <NumberInput label="Кількість" value={qty} onChange={setQty} min={1} step={1} stepper />
//   <MoneyInput label="Ціна" value={price} onChange={setPrice} />
//   <PasswordInput label="Новий пароль" value={password} onChange={setPassword} generate />
//   <SearchInput value={q} onChange={setQ} placeholder="Номер, клієнт або телефон" />
//
// Every input also takes the Field props (label, hint, error, required,
// optional, labelAction, id, aria-label, aria-describedby, className); with
// a label, hint or error it frames itself in a Field (ui/Field.tsx). Without
// a label, pass aria-label.
//
// Input props
// - type: "text" (default), "email", "tel", "url", "password", "search".
// - size: "sm" 32 | "md" 40 (default) | "lg" 48 px, the heights of buttons.
// - prefix / suffix: quiet text inside the pill ("+380", "шт", "%").
// - leftIcon: a Heroicon component or element before the text.
// - clearable: a cross that empties the value (onClear runs after it).
// - align: "right" for numbers.
// - onEnter: runs on Enter (and stops the form's submit).
// - trailing: controls at the end of the pill (used by PasswordInput).
// - placeholder, disabled, readOnly, maxLength, inputMode, autoComplete,
//   name, autoFocus, spellCheck, autoCapitalize, enterKeyHint, onBlur,
//   onFocus, onKeyDown, ref: as on <input>.
//
// Textarea props: value, onChange, rows (4), autoGrow (grows with the text,
// up to maxRows), maxLength, showCount (a counter under it, "12 / 500"),
// placeholder, disabled, readOnly, name, autoFocus, spellCheck, onBlur,
// onFocus, onKeyDown, ref. A 16-px radius, as text areas have in the kit.
//
// NumberInput props: value (number | null), onChange(number | null), min,
// max, step (1), precision (decimal places; undefined = as typed), stepper
// (minus / plus buttons), grouping (thousands spaced when not editing,
// default true), plus the Input props (size, prefix, suffix, placeholder ...).
// It accepts a decimal comma or point, keeps the typed text while the field
// has focus, and commits a number on blur and on Enter (clamped to min / max
// and rounded to precision; an empty field commits null; text that is not
// a number goes back to the last value). ArrowUp / ArrowDown step by `step`,
// with Shift by ten steps.
//
// MoneyInput: a NumberInput with precision 2, the hryvnia suffix and min 0.
//
// PasswordInput props: the Input props plus generate (a "Згенерувати"
// action that fills a strong 16-character password and reveals it),
// generateLength, onGenerate(value). The eye toggle shows the text.
//
// SearchInput props: value, onChange, placeholder ("Пошук"), debounceMs
// (300), onSubmit(value), size, label (the accessible name, "Пошук"),
// disabled, autoFocus, id, className, ref. The typed text is kept locally;
// onChange runs after the pause, or at once on Enter and on clear. Escape
// empties a filled field (and does not close the layer it sits in). A new
// value from outside (a "reset filters" button) replaces the text.

export type InputMode = HTMLAttributes<HTMLInputElement>["inputMode"];
export type EnterKeyHint = InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];

export type InputProps = FieldControlProps & {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "url" | "password" | "search";
  size?: ControlSize;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  leftIcon?: IconSlot;
  clearable?: boolean;
  maxLength?: number;
  inputMode?: InputMode;
  autoComplete?: string;
  name?: string;
  align?: "left" | "right";
  autoFocus?: boolean;
  spellCheck?: boolean;
  autoCapitalize?: string;
  enterKeyHint?: EnterKeyHint;
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onEnter?: () => void;
  onClear?: () => void;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

// A press on the pill outside the input (the prefix, the icon, the
// padding) focuses the input, as a press on a native field would.
function focusInner(event: PointerEvent<HTMLElement>) {
  const target = event.target as HTMLElement;
  if (target.closest("input, textarea, button, a, select")) return;
  const input = event.currentTarget.querySelector("input");
  if (!input || input.disabled) return;
  event.preventDefault();
  input.focus();
}

// Buttons inside a field keep the focus in the input when pressed with a
// pointer (the input does not blur, a number is not committed half-typed).
function keepFocus(event: PointerEvent<HTMLElement>) {
  if (event.currentTarget.closest("[data-field-box]")?.contains(document.activeElement)) event.preventDefault();
}

function focusField(from: HTMLElement) {
  from.closest("[data-field-box]")?.querySelector("input")?.focus();
}

export function Input(props: InputProps) {
  const {
    value,
    onChange,
    type = "text",
    size = "md",
    placeholder,
    disabled = false,
    readOnly = false,
    prefix,
    suffix,
    leftIcon,
    clearable = false,
    maxLength,
    inputMode,
    autoComplete,
    name,
    align = "left",
    autoFocus,
    spellCheck,
    autoCapitalize,
    enterKeyHint,
    onBlur,
    onFocus,
    onKeyDown,
    onEnter,
    onClear,
    trailing,
    required,
    ref,
  } = props;
  const ids = useFieldIds(props);
  const canClear = clearable && value !== "" && !disabled && !readOnly;
  const endsWithAction = canClear || Boolean(trailing);

  const clear = (event: MouseEvent<HTMLButtonElement>) => {
    const from = event.currentTarget;
    onChange("");
    onClear?.();
    focusField(from);
  };

  return (
    <FieldFrame field={props} ids={ids} disabled={disabled}>
      <div
        data-field-box=""
        data-invalid={ids.invalid || undefined}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        onPointerDown={focusInner}
        className={cx(
          FIELD_BOX,
          CONTROL[size],
          FIELD_GAP[size],
          FIELD_PL[size],
          endsWithAction ? FIELD_PR_ACTION[size] : FIELD_PR[size],
          !hasField(props) && props.className,
        )}
      >
        {leftIcon && <SlotIcon icon={leftIcon} className={cx("text-neutral-500", FIELD_ICON[size])} />}
        {prefix !== undefined && prefix !== null && (
          <span className="shrink-0 select-none whitespace-nowrap text-neutral-500">{prefix}</span>
        )}
        <input
          ref={ref}
          id={ids.id}
          type={type}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          spellCheck={spellCheck}
          autoCapitalize={autoCapitalize}
          enterKeyHint={enterKeyHint}
          aria-label={props["aria-label"]}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          aria-required={required || undefined}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented) return;
            if (event.key === "Enter" && onEnter && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onEnter();
            }
          }}
          className={cx(
            "h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed",
            align === "right" && "text-right tabular-nums",
            type === "search" && "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
          )}
        />
        {suffix !== undefined && suffix !== null && (
          <span className={cx("shrink-0 select-none whitespace-nowrap text-neutral-500", endsWithAction && "mr-1")}>{suffix}</span>
        )}
        {canClear && (
          <button
            type="button"
            aria-label="Очистити"
            title="Очистити"
            onPointerDown={keepFocus}
            onClick={clear}
            className={cx(FIELD_ACTION, FIELD_ACTION_SIZE[size])}
          >
            <XMarkIcon aria-hidden strokeWidth={1.7} className={FIELD_ICON[size]} />
          </button>
        )}
        {trailing}
      </div>
    </FieldFrame>
  );
}

// --- Textarea ----------------------------------------------------------------

export type TextareaProps = FieldControlProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  autoGrow?: boolean;
  maxRows?: number;
  maxLength?: number;
  showCount?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  autoFocus?: boolean;
  spellCheck?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  ref?: Ref<HTMLTextAreaElement>;
};

// Sets the height to the text (written to the element, no state); past
// maxRows the area scrolls instead.
function fitTextarea(area: HTMLTextAreaElement, maxRows: number | undefined) {
  const style = getComputedStyle(area);
  const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const line = parseFloat(style.lineHeight) || 20;
  area.style.height = "auto";
  const wanted = area.scrollHeight + borders;
  const limit = maxRows ? line * maxRows + padding + borders : Number.POSITIVE_INFINITY;
  area.style.height = `${Math.min(wanted, limit)}px`;
  area.style.overflowY = wanted > limit ? "auto" : "hidden";
}

export function Textarea(props: TextareaProps) {
  const {
    value,
    onChange,
    rows = 4,
    autoGrow = false,
    maxRows,
    maxLength,
    showCount = false,
    placeholder,
    disabled = false,
    readOnly = false,
    name,
    autoFocus,
    spellCheck,
    onBlur,
    onFocus,
    onKeyDown,
    required,
    ref,
  } = props;
  const ids = useFieldIds(props);
  const box = useRef<HTMLDivElement>(null);

  // The text changed (typed, or replaced from outside): fit the height.
  useLayoutEffect(() => {
    const area = box.current?.querySelector("textarea");
    if (autoGrow && area) fitTextarea(area, maxRows);
  }, [value, autoGrow, maxRows]);

  // The width changed (the window, a drawer): the text wraps differently.
  // Only width changes count, so the observer never reacts to the height
  // it sets itself.
  useEffect(() => {
    const area = box.current?.querySelector("textarea");
    if (!autoGrow || !area) return;
    let width = area.clientWidth;
    const observer = new ResizeObserver(() => {
      if (area.clientWidth === width) return;
      width = area.clientWidth;
      fitTextarea(area, maxRows);
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [autoGrow, maxRows]);

  const counter = showCount ? (
    <span className={cx(TEXT.caption, "tabular-nums")}>{maxLength ? `${value.length} / ${maxLength}` : value.length}</span>
  ) : undefined;

  return (
    <FieldFrame field={props} ids={ids} meta={counter} disabled={disabled}>
      <div ref={box} className={cx("flex min-w-0", !hasField(props, counter) && props.className)}>
        <textarea
          ref={ref}
          id={ids.id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          autoFocus={autoFocus}
          spellCheck={spellCheck}
          aria-label={props["aria-label"]}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          aria-required={required || undefined}
          data-invalid={ids.invalid || undefined}
          data-disabled={disabled || undefined}
          data-readonly={readOnly || undefined}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={cx(
            "admin-scroll block w-full min-w-0 rounded-2xl px-4 py-2.5 text-[14px] leading-5 outline-none placeholder:text-neutral-400",
            FIELD_SURFACE,
            autoGrow ? "resize-none overflow-hidden" : "resize-y",
          )}
        />
      </div>
    </FieldFrame>
  );
}

// --- NumberInput -------------------------------------------------------------

export type NumberInputProps = Omit<
  InputProps,
  "value" | "onChange" | "type" | "inputMode" | "clearable" | "onClear" | "maxLength" | "trailing"
> & {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  stepper?: boolean;
  grouping?: boolean;
};

const FORMATS = new Map<string, Intl.NumberFormat>();

function numberFormat(precision: number | undefined, grouping: boolean): Intl.NumberFormat {
  const key = `${precision ?? "any"}:${grouping}`;
  let format = FORMATS.get(key);
  if (!format) {
    format = new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: precision ?? 0,
      maximumFractionDigits: precision ?? 6,
      useGrouping: grouping,
    });
    FORMATS.set(key, format);
  }
  return format;
}

const MINUS_SIGN = String.fromCharCode(0x2212);

// The text of a number: grouped for reading, ungrouped for editing.
export function numberText(value: number | null, precision?: number, grouping = false): string {
  if (value === null || !Number.isFinite(value)) return "";
  return numberFormat(precision, grouping).format(value).split(MINUS_SIGN).join("-");
}

// "1 234,5" / "1234.5" / "-3" -> number; "" -> null; anything else -> NaN.
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/\s/g, "").split(MINUS_SIGN).join("-").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

function normalize(value: number, min?: number, max?: number, precision?: number): number {
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  if (precision !== undefined) {
    const factor = 10 ** precision;
    next = Math.round((next + Number.EPSILON) * factor) / factor;
  }
  return next;
}

export function NumberInput(props: NumberInputProps) {
  const {
    value,
    onChange,
    min,
    max,
    step = 1,
    precision,
    stepper = false,
    grouping = true,
    size = "md",
    disabled = false,
    readOnly = false,
    onFocus,
    onBlur,
    onKeyDown,
    onEnter,
    ...rest
  } = props;
  // The text while the field has focus; null shows the formatted value.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? numberText(value, precision, grouping);
  const allowNegative = min === undefined || min < 0;
  const inactive = disabled || readOnly;

  const commit = (raw: string): number | null => {
    const parsed = parseNumber(raw);
    const next = parsed === null ? null : Number.isNaN(parsed) ? value : normalize(parsed, min, max, precision);
    if (next !== value) onChange(next);
    return next;
  };

  const type = (next: string) => {
    const cleaned = next.replace(/\s/g, "");
    const pattern = allowNegative ? /^-?\d*[.,]?\d*$/ : /^\d*[.,]?\d*$/;
    if (!pattern.test(cleaned)) return;
    const decimals = cleaned.split(/[.,]/)[1];
    if (precision !== undefined && decimals !== undefined && (precision === 0 || decimals.length > precision)) return;
    setDraft(next);
  };

  const stepBy = (direction: 1 | -1, times = 1) => {
    if (inactive) return;
    const base = parseNumber(draft ?? "") ?? value ?? min ?? 0;
    const start = Number.isNaN(base) ? (value ?? 0) : base;
    // Without a precision, round to the decimals in play, so 0.1 + 0.2
    // steps to 0.3 and not to 0.30000000000000004.
    const places = precision ?? Math.max(decimalsOf(step), decimalsOf(start));
    const next = normalize(start + direction * step * times, min, max, places);
    if (next !== value) onChange(next);
    if (draft !== null) setDraft(numberText(next, precision));
  };

  const atMin = min !== undefined && value !== null && value <= min;
  const atMax = max !== undefined && value !== null && value >= max;

  const trailing = stepper ? (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Зменшити"
        title="Зменшити"
        disabled={inactive || atMin}
        onPointerDown={keepFocus}
        onClick={() => stepBy(-1)}
        className={cx(FIELD_ACTION, FIELD_ACTION_SIZE[size])}
      >
        <MinusIcon aria-hidden strokeWidth={1.7} className={FIELD_ICON[size]} />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Збільшити"
        title="Збільшити"
        disabled={inactive || atMax}
        onPointerDown={keepFocus}
        onClick={() => stepBy(1)}
        className={cx(FIELD_ACTION, FIELD_ACTION_SIZE[size])}
      >
        <PlusIcon aria-hidden strokeWidth={1.7} className={FIELD_ICON[size]} />
      </button>
    </span>
  ) : undefined;

  return (
    <Input
      {...rest}
      size={size}
      disabled={disabled}
      readOnly={readOnly}
      value={text}
      onChange={type}
      inputMode={precision === 0 ? "numeric" : "decimal"}
      autoComplete={rest.autoComplete ?? "off"}
      trailing={trailing}
      onFocus={() => {
        if (!inactive) setDraft(numberText(value, precision));
        onFocus?.();
      }}
      onBlur={() => {
        if (draft !== null) commit(draft);
        setDraft(null);
        onBlur?.();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          stepBy(event.key === "ArrowUp" ? 1 : -1, event.shiftKey ? 10 : 1);
        } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          const next = commit(draft ?? text);
          if (draft !== null) setDraft(numberText(next, precision));
          if (onEnter) {
            event.preventDefault();
            onEnter();
          }
        }
      }}
    />
  );
}

function decimalsOf(value: number): number {
  const part = String(value).split(".")[1];
  return part ? part.length : 0;
}

export type MoneyInputProps = Omit<NumberInputProps, "precision">;

export function MoneyInput({ min = 0, suffix = "₴", ...props }: MoneyInputProps) {
  return <NumberInput {...props} min={min} suffix={suffix} precision={2} />;
}

// --- PasswordInput -----------------------------------------------------------

export type PasswordInputProps = Omit<InputProps, "type" | "trailing" | "clearable" | "onClear" | "prefix" | "suffix" | "leftIcon"> & {
  generate?: boolean;
  generateLength?: number;
  onGenerate?: (value: string) => void;
};

// No look-alike characters (l, I, O, 0, 1): the password may be read out
// over the phone.
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!#$%*+-=?@_";

function randomIndex(size: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % size;
}

// A random password with every kind of character in it (called from an
// event handler, never during render).
export function strongPassword(length = 16): string {
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const chars = [LOWER, UPPER, DIGITS, SYMBOLS].map((set) => set[randomIndex(set.length)]);
  while (chars.length < Math.max(length, 10)) chars.push(all[randomIndex(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const GENERATE: Record<ControlSize, string> = {
  sm: "h-6 px-2 text-[12px] leading-4",
  md: "h-8 px-3 text-[12px] leading-4",
  lg: "h-9 px-3.5 text-[13px] leading-[18px]",
};

export function PasswordInput({ generate = false, generateLength = 16, onGenerate, autoComplete, ...props }: PasswordInputProps) {
  const [shown, setShown] = useState(false);
  const size = props.size ?? "md";
  const inactive = props.disabled || props.readOnly;

  const fill = (event: MouseEvent<HTMLButtonElement>) => {
    const from = event.currentTarget;
    const next = strongPassword(generateLength);
    props.onChange(next);
    setShown(true);
    onGenerate?.(next);
    focusField(from);
  };

  const trailing = (
    <span className="flex shrink-0 items-center gap-0.5">
      {generate && !inactive && (
        <button
          type="button"
          onPointerDown={keepFocus}
          onClick={fill}
          className={cx(
            "shrink-0 cursor-pointer rounded-full font-semibold text-neutral-800 transition-colors duration-200 hover:bg-bg-cabinet hover:text-neutral-900 motion-reduce:transition-none",
            "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
            GENERATE[size],
          )}
        >
          Згенерувати
        </button>
      )}
      <button
        type="button"
        aria-label="Показати пароль"
        title={shown ? "Сховати пароль" : "Показати пароль"}
        aria-pressed={shown}
        disabled={props.disabled}
        onPointerDown={keepFocus}
        onClick={() => setShown((value) => !value)}
        className={cx(FIELD_ACTION, FIELD_ACTION_SIZE[size])}
      >
        {shown ? (
          <EyeSlashIcon aria-hidden strokeWidth={1.7} className={FIELD_ICON[size]} />
        ) : (
          <EyeIcon aria-hidden strokeWidth={1.7} className={FIELD_ICON[size]} />
        )}
      </button>
    </span>
  );

  return (
    <Input
      {...props}
      type={shown ? "text" : "password"}
      trailing={trailing}
      autoComplete={autoComplete ?? (generate ? "new-password" : "current-password")}
      spellCheck={false}
      autoCapitalize="none"
    />
  );
}

// --- SearchInput -------------------------------------------------------------

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  onSubmit?: (value: string) => void;
  size?: ControlSize;
  label?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Пошук",
  debounceMs = 300,
  onSubmit,
  size = "md",
  label = "Пошук",
  disabled = false,
  autoFocus,
  id,
  className,
  ref,
}: SearchInputProps) {
  const [text, setText] = useState(value);
  // The last value this field handed to onChange (or took from outside).
  const [sent, setSent] = useState(value);
  // A new value from outside that is not our own echo replaces the text
  // (and the pending pause with it, since `text` then equals `sent`).
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== sent) {
      setText(value);
      setSent(value);
    }
  }

  const emit = useEffectEvent((next: string) => {
    setSent(next);
    onChange(next);
  });

  useEffect(() => {
    if (text === sent) return;
    const timer = window.setTimeout(() => emit(text), debounceMs);
    return () => window.clearTimeout(timer);
  }, [text, sent, debounceMs]);

  const flush = (next: string) => {
    setText(next);
    setSent(next);
    if (next !== value) onChange(next);
  };

  return (
    <Input
      ref={ref}
      id={id}
      type="search"
      size={size}
      value={text}
      onChange={setText}
      placeholder={placeholder}
      aria-label={label}
      disabled={disabled}
      autoFocus={autoFocus}
      leftIcon={MagnifyingGlassIcon}
      clearable
      onClear={() => flush("")}
      autoComplete="off"
      spellCheck={false}
      enterKeyHint="search"
      onEnter={() => {
        flush(text);
        onSubmit?.(text);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && text !== "") {
          // The first Escape empties the field; the layer around it closes
          // on the next one.
          event.preventDefault();
          event.stopPropagation();
          flush("");
        }
      }}
      className={className}
    />
  );
}
