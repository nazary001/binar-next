"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import { FIELD_SURFACE, FieldFrame, hasField, useFieldIds, type FieldControlProps } from "./Field";
import { useDismiss, useFloating } from "./floating";
import { floatingRoot } from "./overlay";
import { LISTBOX_LAYER, LISTBOX_SCROLL, OPTION_ROW } from "./Select";
import { type ControlSize } from "./tokens";

// TagInput: a list of short free-text values as chips (product tags, SEO
// keywords, e-mail lists).
//
//   <TagInput label="Теги" value={tags} onChange={setTags} placeholder="Додайте тег" />
//   <TagInput label="Ключові слова" value={keywords} onChange={setKeywords} max={10} maxLength={40}
//     suggestions={["готель", "хостел", "SPA"]} normalize={(tag) => tag.toLowerCase()} />
//
// Props
// - value: the tags; onChange(tags) gets a new array.
// - Enter or a comma adds the typed text; pasting "a, b, c" adds three;
//   leaving the field adds what was typed; Backspace in an empty field
//   removes the last chip. A tag that is already there (case does not
//   matter) is not added twice.
// - max: no more tags past it (the field says so in its placeholder).
// - maxLength: the longest tag, in characters.
// - suggestions: values offered in a list while typing (arrows + Enter).
// - normalize: shapes a tag before it is added (trim is always done).
// - placeholder, size ("sm" | "md" | "lg"), disabled, name (a hidden input
//   with the tags joined by commas), onBlur, and the Field props.
//
// Chip (exported): the removable chip itself, also used by MultiCombobox.
//   <Chip onRemove={() => remove(id)} removeLabel="Прибрати «Київ»">Київ</Chip>
// MULTI_BOX / MULTI_INPUT / MULTI_ACTION_SIZE: the look of a field that
// holds chips (shared with MultiCombobox).

// --- Chip ----------------------------------------------------------------------

export type ChipProps = {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  disabled?: boolean;
  size?: ControlSize;
  title?: string;
};

const CHIP: Record<ControlSize, string> = {
  sm: "h-6 gap-0.5 pl-2 text-[12px] leading-4",
  md: "h-7 gap-0.5 pl-2.5 text-[13px] leading-[18px]",
  lg: "h-8 gap-1 pl-3 text-[14px] leading-5",
};
const CHIP_PR: Record<ControlSize, string> = { sm: "pr-2", md: "pr-2.5", lg: "pr-3" };
const CHIP_PR_REMOVE: Record<ControlSize, string> = { sm: "pr-0.5", md: "pr-0.5", lg: "pr-1" };
const CHIP_REMOVE: Record<ControlSize, string> = { sm: "size-5", md: "size-6", lg: "size-6" };

export function Chip({ children, onRemove, removeLabel = "Прибрати", disabled = false, size = "md", title }: ChipProps) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex min-w-0 max-w-full shrink-0 items-center rounded-full bg-neutral-40 font-medium text-neutral-800",
        CHIP[size],
        onRemove && !disabled ? CHIP_PR_REMOVE[size] : CHIP_PR[size],
        disabled && "text-neutral-400",
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      {onRemove && !disabled && (
        <button
          type="button"
          aria-label={removeLabel}
          title={removeLabel}
          onClick={onRemove}
          className={cx(
            "flex shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors duration-200",
            "hover:bg-stroke-subtle hover:text-neutral-900 motion-reduce:transition-none",
            "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
            CHIP_REMOVE[size],
          )}
        >
          <XMarkIcon aria-hidden strokeWidth={2} className="size-3.5" />
        </button>
      )}
    </span>
  );
}

// --- The multi-value field look ----------------------------------------------

// A field that wraps chips onto more lines: the pill's corners stay 20 px
// when it grows. Paddings make a one-line field exactly the control height.
export const MULTI_BOX: Record<ControlSize, string> = {
  sm: "min-h-8 gap-1 py-[3px] pl-[3px] pr-[3px]",
  md: "min-h-10 gap-1 py-[5px] pl-[5px] pr-[5px]",
  lg: "min-h-12 gap-1.5 py-[7px] pl-[7px] pr-[7px]",
};
export const MULTI_FIELD = "relative flex min-w-0 items-center rounded-[20px] " + FIELD_SURFACE;
// The input after the chips; when it is the first item (no chips) it gets
// the field's usual text inset.
export const MULTI_INPUT: Record<ControlSize, string> = {
  sm: "h-6 min-w-16 flex-1 bg-transparent px-1 text-[13px] leading-[18px] outline-none placeholder:text-neutral-400 first:pl-[9px] disabled:cursor-not-allowed",
  md: "h-7 min-w-20 flex-1 bg-transparent px-1.5 text-[14px] leading-5 outline-none placeholder:text-neutral-400 first:pl-[11px] disabled:cursor-not-allowed",
  lg: "h-8 min-w-24 flex-1 bg-transparent px-2 text-[15px] leading-[22px] outline-none placeholder:text-neutral-400 first:pl-[13px] disabled:cursor-not-allowed",
};
export const MULTI_ACTION_SIZE: Record<ControlSize, string> = { sm: "size-6", md: "size-7", lg: "size-8" };

// --- TagInput ----------------------------------------------------------------

export type TagInputProps = FieldControlProps & {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  max?: number;
  maxLength?: number;
  suggestions?: readonly string[];
  normalize?: (tag: string) => string;
  size?: ControlSize;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
};

const SUGGESTIONS_SHOWN = 8;

export function TagInput(props: TagInputProps) {
  const {
    value,
    onChange,
    placeholder = "Додайте і натисніть Enter",
    max,
    maxLength,
    suggestions,
    normalize,
    size = "md",
    disabled = false,
    name,
    onBlur,
  } = props;
  const ids = useFieldIds(props);
  const listId = `${ids.id}-list`;
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [host, setHost] = useState<HTMLElement | null>(null);

  const full = max !== undefined && value.length >= max;
  const taken = new Set(value.map((tag) => tag.toLowerCase()));
  const needle = text.trim().toLowerCase();
  const matches = (suggestions ?? [])
    .filter((item) => !taken.has(item.toLowerCase()) && (needle === "" || item.toLowerCase().includes(needle)))
    .slice(0, SUGGESTIONS_SHOWN);
  const listShown = open && !full && matches.length > 0;

  useFloating(listShown, boxRef, layerRef, { placement: "bottom-start", matchWidth: true });
  const dismiss = useCallback(() => setOpen(false), []);
  useDismiss(listShown, [boxRef, layerRef], dismiss);

  useEffect(() => {
    if (!listShown || active < 0) return;
    layerRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [listShown, active]);

  const shape = (raw: string): string => {
    const trimmed = raw.trim();
    const shaped = normalize ? normalize(trimmed).trim() : trimmed;
    return maxLength ? shaped.slice(0, maxLength) : shaped;
  };

  // Adds the tags in `raw` (comma separated) that are new, and empties the
  // typed text either way (a repeated tag is already there).
  const add = (raw: string): void => {
    const next = [...value];
    const seen = new Set(taken);
    for (const part of raw.split(",")) {
      const tag = shape(part);
      if (!tag || seen.has(tag.toLowerCase())) continue;
      if (max !== undefined && next.length >= max) break;
      next.push(tag);
      seen.add(tag.toLowerCase());
    }
    if (next.length !== value.length) onChange(next);
    setText("");
    setActive(-1);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, at) => at !== index));
  };

  const openList = () => {
    if (open || disabled) return;
    setHost(floatingRoot(boxRef.current));
    setOpen(true);
  };

  const type = (next: string) => {
    // A comma (typed or pasted) closes the tags before it.
    if (next.includes(",")) {
      const cut = next.lastIndexOf(",");
      add(next.slice(0, cut));
      setText(next.slice(cut + 1));
    } else {
      setText(next);
      setActive(-1);
    }
    openList();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "Enter":
        if (listShown && active >= 0 && matches[active]) {
          event.preventDefault();
          add(matches[active]);
        } else if (text.trim() !== "") {
          event.preventDefault();
          add(text);
        }
        return;
      case "Backspace":
        if (text === "" && value.length > 0) {
          event.preventDefault();
          remove(value.length - 1);
        }
        return;
      case "ArrowDown":
      case "ArrowUp":
        if (matches.length === 0 || full) return;
        event.preventDefault();
        openList();
        setActive((current) =>
          event.key === "ArrowDown" ? Math.min(current + 1, matches.length - 1) : Math.max(current - 1, 0),
        );
        return;
      case "Escape":
        if (listShown) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        return;
      case "Tab":
        setOpen(false);
        return;
    }
  };

  return (
    <FieldFrame field={props} ids={ids} disabled={disabled}>
      <div
        ref={boxRef}
        data-field-box=""
        data-invalid={ids.invalid || undefined}
        data-disabled={disabled || undefined}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (disabled || target.closest("button, input")) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
        className={cx(MULTI_FIELD, MULTI_BOX[size], "flex-wrap cursor-text", !hasField(props) && props.className)}
      >
        {value.map((tag, index) => (
          <Chip
            // The index too: tags loaded from outside may repeat.
            key={`${index}:${tag}`}
            size={size}
            disabled={disabled}
            removeLabel={`Прибрати «${tag}»`}
            onRemove={() => {
              remove(index);
              inputRef.current?.focus();
            }}
          >
            {tag}
          </Chip>
        ))}
        <input
          ref={inputRef}
          id={ids.id}
          type="text"
          value={text}
          onChange={(event) => type(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={openList}
          onBlur={() => {
            if (text.trim() !== "") add(text);
            setOpen(false);
            onBlur?.();
          }}
          placeholder={full ? `Не більше ${max}` : value.length === 0 ? placeholder : ""}
          disabled={disabled}
          readOnly={full}
          maxLength={maxLength}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="enter"
          role={suggestions ? "combobox" : undefined}
          aria-autocomplete={suggestions ? "list" : undefined}
          aria-expanded={suggestions ? listShown : undefined}
          aria-controls={listShown ? listId : undefined}
          aria-activedescendant={listShown && active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={props["aria-label"]}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          aria-required={props.required || undefined}
          className={MULTI_INPUT[size]}
        />
        {name && <input type="hidden" name={name} value={value.join(",")} />}
      </div>

      {listShown &&
        host &&
        createPortal(
          <div ref={layerRef} data-floating-layer="" onPointerDown={(event) => event.preventDefault()} className={LISTBOX_LAYER}>
            <div id={listId} role="listbox" aria-label="Підказки" className={LISTBOX_SCROLL}>
              {matches.map((item, index) => (
                <div
                  key={item}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  data-active={index === active || undefined}
                  onPointerMove={() => {
                    if (index !== active) setActive(index);
                  }}
                  onClick={() => add(item)}
                  className={OPTION_ROW}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>,
          host,
        )}
    </FieldFrame>
  );
}
