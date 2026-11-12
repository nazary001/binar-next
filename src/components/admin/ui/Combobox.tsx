"use client";

import { CheckIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cx, plural } from "../lib/format";
import { SlotIcon, type IconSlot } from "./Button";
import {
  FIELD_ACTION,
  FIELD_ACTION_SIZE,
  FIELD_BOX,
  FIELD_GAP,
  FIELD_ICON,
  FIELD_PL,
  FIELD_PR_ACTION,
  FieldFrame,
  hasField,
  useFieldIds,
  type FieldControlProps,
} from "./Field";
import { useDismiss, useFloating } from "./floating";
import { assignRef, floatingRoot } from "./overlay";
import { LISTBOX_LAYER, LISTBOX_NOTE, LISTBOX_SCROLL, OPTION_CHECK, OPTION_CHOSEN, OPTION_ROW } from "./Select";
import { Spinner } from "./Spinner";
import { Chip, MULTI_ACTION_SIZE, MULTI_BOX, MULTI_FIELD, MULTI_INPUT } from "./TagInput";
import { CONTROL, type ControlSize } from "./tokens";

// Combobox: pick a record from a list the server searches (a Nova Poshta
// city or branch, a product, a client, a member of staff).
//
//   <Combobox
//     label="Місто"
//     value={city}
//     onChange={setCity}
//     search={(q) => adminApi<{ items: City[] }>(`/shipping/cities?${qs({ q })}`).then((r) => (r.ok ? r.data.items : Promise.reject(r)))}
//     getKey={(c) => c.ref}
//     getLabel={(c) => c.name}
//     minChars={2}
//   />
//   <Combobox label="Відділення" value={branch} onChange={setBranch} search={searchBranches}
//     searchKey={city?.ref} disabled={!city} getKey={(b) => b.ref} getLabel={(b) => b.title}
//     renderOption={(b) => <><span className="block">{b.title}</span><span className="block text-[12px] text-neutral-500">{b.address}</span></>} />
//   <MultiCombobox label="Товари" value={products} onChange={setProducts} search={searchProducts}
//     getKey={(p) => p.id} getLabel={(p) => p.name} max={20} />
//
// Combobox props
// - value: the chosen record or null; onChange(record | null).
// - search(query): resolves to the records for the typed text (trimmed);
//   rejects on failure (the list then offers "Спробувати ще раз"). It runs
//   after debounceMs (250) of quiet typing, at once for an empty query;
//   answers of earlier queries that arrive late are ignored, and answers are
//   remembered while the field lives (reopening does not search again).
// - searchKey: what else the search depends on (the city of a branch
//   picker); a new key forgets the remembered answers.
// - getKey(record): a stable id; getLabel(record): the text shown in the
//   field once chosen.
// - renderOption(record, { active, selected }): the row in the list (the
//   label by default). Keep it to text: the row is one option for a screen
//   reader.
// - isDisabled(record): rows that cannot be picked.
// - minChars (0): below it the list asks for more letters instead of
//   searching.
// - emptyText ("Нічого не знайдено"), placeholder, clearable, disabled,
//   size, leftIcon, name (a hidden input with getKey(value)), openOnFocus
//   (open the list when the field gets focus, default false: a press or
//   typing opens it), onBlur, ref (the input), and the Field props.
//
// Keyboard: typing searches; ArrowDown / ArrowUp open the list and move;
// Enter picks the highlighted row (the first is highlighted when answers
// come); Escape closes the list, a second Escape puts back the chosen
// label; leaving the field puts back the label of the current value (and
// with clearable, an emptied field clears the value).
//
// MultiCombobox: the same with several values as chips. Picking a row adds
// it (picking a chosen row removes it), the list stays open for the next
// one; Backspace in the empty field removes the last chip; max caps the
// count. value: T[], onChange(T[]).

export type OptionState = { active: boolean; selected: boolean };

type SearchProps<T> = {
  search: (query: string) => Promise<T[]>;
  searchKey?: string | number | null;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  renderOption?: (item: T, state: OptionState) => ReactNode;
  isDisabled?: (item: T) => boolean;
  placeholder?: string;
  minChars?: number;
  debounceMs?: number;
  emptyText?: string;
  disabled?: boolean;
  size?: ControlSize;
  name?: string;
  openOnFocus?: boolean;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement>;
};

export type ComboboxProps<T> = FieldControlProps &
  SearchProps<T> & {
    value: T | null;
    onChange: (value: T | null) => void;
    clearable?: boolean;
    leftIcon?: IconSlot;
  };

export type MultiComboboxProps<T> = FieldControlProps &
  SearchProps<T> & {
    value: T[];
    onChange: (value: T[]) => void;
    max?: number;
  };

// --- The search behind the list ----------------------------------------------

type Answer<T> = { key: string; items: T[] };

// One stable empty list, so "no answer yet" is the same value every render.
const NO_ITEMS: never[] = [];

type AsyncList<T> = {
  items: T[];
  // The items answer the current query (not a late or a previous one).
  fresh: boolean;
  loading: boolean;
  error: boolean;
  short: boolean;
  retry: () => void;
};

function useAsyncOptions<T>(
  open: boolean,
  query: string,
  search: (query: string) => Promise<T[]>,
  searchKey: string | number | null | undefined,
  minChars: number,
  debounceMs: number,
): AsyncList<T> {
  const [answer, setAnswer] = useState<Answer<T> | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The latest request wins: an answer whose ticket is old is dropped.
  const ticket = useRef(0);
  // The key the current `answer` belongs to, read by the effect.
  const answered = useRef<string | null>(null);
  const short = query.length < minChars;
  // `attempt` is part of the key, so "Спробувати ще раз" searches again.
  const key = JSON.stringify([searchKey ?? null, query, attempt]);
  const run = useEffectEvent((text: string) => search(text));

  useEffect(() => {
    if (!open || short || answered.current === key) return;
    ticket.current += 1;
    const mine = ticket.current;
    const timer = window.setTimeout(
      () => {
        run(query).then(
          (items) => {
            if (mine !== ticket.current) return;
            answered.current = key;
            setAnswer({ key, items });
            setFailed(null);
          },
          () => {
            if (mine !== ticket.current) return;
            setFailed(key);
          },
        );
      },
      query === "" ? 0 : debounceMs,
    );
    return () => window.clearTimeout(timer);
  }, [open, short, key, query, debounceMs]);

  const fresh = answer !== null && answer.key === key;
  const error = !short && failed === key;
  return {
    items: fresh ? answer.items : (answer?.items ?? NO_ITEMS),
    fresh,
    loading: open && !short && !fresh && !error,
    error,
    short,
    retry: () => setAttempt((value) => value + 1),
  };
}

// --- What both comboboxes share ----------------------------------------------

type Core<T> = {
  open: boolean;
  host: HTMLElement | null;
  active: number;
  setActive: (index: number) => void;
  list: AsyncList<T>;
  layerRef: RefObject<HTMLDivElement | null>;
  openList: () => void;
  close: () => void;
  // Handles the list keys; true when the key was used.
  navigate: (event: KeyboardEvent<HTMLInputElement>, onPick: (item: T) => void) => boolean;
};

function useComboboxCore<T>(
  anchorRef: RefObject<HTMLElement | null>,
  query: string,
  props: SearchProps<T>,
  highlightKey: string | null,
): Core<T> {
  const { search, searchKey, getKey, isDisabled, minChars = 0, debounceMs = 250, disabled = false } = props;
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const list = useAsyncOptions(open, query, search, searchKey, minChars, debounceMs);

  const firstEnabled = (items: T[]) => items.findIndex((item) => !isDisabled?.(item));

  // New answers: highlight the current value when it is among them, else
  // the first row, so Enter picks the obvious one.
  const [seenItems, setSeenItems] = useState(list.items);
  if (seenItems !== list.items) {
    setSeenItems(list.items);
    const current = highlightKey === null ? -1 : list.items.findIndex((item) => getKey(item) === highlightKey);
    setActive(current >= 0 ? current : firstEnabled(list.items));
  }

  useFloating(open, anchorRef, layerRef, { placement: "bottom-start", matchWidth: true });
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, [anchorRef, layerRef], close);

  useEffect(() => {
    if (!open || active < 0) return;
    layerRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    if (open || disabled) return;
    setHost(floatingRoot(anchorRef.current));
    setOpen(true);
  };

  const move = (direction: 1 | -1) => {
    const items = list.items;
    for (let index = active + direction; index >= 0 && index < items.length; index += direction) {
      if (!isDisabled?.(items[index])) {
        setActive(index);
        return;
      }
    }
  };

  const navigate = (event: KeyboardEvent<HTMLInputElement>, onPick: (item: T) => void): boolean => {
    if (event.nativeEvent.isComposing) return false;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList();
        else move(event.key === "ArrowDown" ? 1 : -1);
        return true;
      case "Enter": {
        if (!open) return false;
        // Never submits the form while the list is open; a list that is
        // still loading answers an older query, so Enter waits for it.
        event.preventDefault();
        const item = list.items[active];
        if (list.fresh && item !== undefined && !isDisabled?.(item)) onPick(item);
        return true;
      }
      case "Escape":
        if (!open) return false;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return true;
      case "Tab":
        setOpen(false);
        return false;
      default:
        return false;
    }
  };

  return { open, host, active, setActive, list, layerRef, openList, close, navigate };
}

// The floating list of both comboboxes.
function OptionsLayer<T>({
  core,
  listId,
  label,
  props,
  isSelected,
  onPick,
  multiselectable = false,
}: {
  core: Core<T>;
  listId: string;
  label: string;
  props: SearchProps<T> & { emptyText?: string };
  isSelected: (item: T) => boolean;
  onPick: (item: T) => void;
  multiselectable?: boolean;
}) {
  const { list, active, setActive, layerRef, host } = core;
  const { getKey, getLabel, renderOption, isDisabled, minChars = 0, emptyText = "Нічого не знайдено" } = props;
  if (!core.open || !host) return null;

  let body: ReactNode;
  if (list.short) {
    body = (
      <p role="status" className={LISTBOX_NOTE}>
        {`Введіть щонайменше ${minChars} ${plural(minChars, ["символ", "символи", "символів"])}`}
      </p>
    );
  } else if (list.error) {
    body = (
      <div role="status" className={cx(LISTBOX_NOTE, "flex-wrap")}>
        <span>Не вдалося завантажити варіанти.</span>
        <button
          type="button"
          onClick={list.retry}
          className="cursor-pointer rounded-full font-semibold text-neutral-900 underline underline-offset-2 outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
        >
          Спробувати ще раз
        </button>
      </div>
    );
  } else if (list.items.length === 0) {
    body = (
      <p role="status" className={LISTBOX_NOTE}>
        {list.loading ? (
          <>
            <Spinner size="sm" />
            Шукаємо
          </>
        ) : (
          emptyText
        )}
      </p>
    );
  } else {
    body = (
      <div
        id={listId}
        role="listbox"
        aria-label={label}
        aria-multiselectable={multiselectable || undefined}
        aria-busy={list.loading || undefined}
        // Rows of an earlier query stay on screen while the new answer
        // comes, dimmed and not pickable.
        className={cx(LISTBOX_SCROLL, list.loading && "pointer-events-none opacity-60")}
      >
        {list.items.map((item, index) => {
          const selected = isSelected(item);
          const off = isDisabled?.(item) ?? false;
          return (
            <div
              key={getKey(item)}
              id={`${listId}-${index}`}
              role="option"
              data-index={index}
              data-active={index === active || undefined}
              aria-selected={selected}
              aria-disabled={off || undefined}
              onPointerMove={() => {
                if (!off && index !== active) setActive(index);
              }}
              onClick={() => {
                if (!off) onPick(item);
              }}
              className={cx(OPTION_ROW, OPTION_CHOSEN)}
            >
              <span className="min-w-0 flex-1">{renderOption ? renderOption(item, { active: index === active, selected }) : getLabel(item)}</span>
              {selected && <CheckIcon aria-hidden strokeWidth={2} className={OPTION_CHECK} />}
            </div>
          );
        })}
      </div>
    );
  }

  return createPortal(
    <div ref={layerRef} data-floating-layer="" onPointerDown={(event) => event.preventDefault()} className={LISTBOX_LAYER}>
      {body}
    </div>,
    host,
  );
}

function listShown<T>(core: Core<T>): boolean {
  return core.open && !core.list.short && !core.list.error && core.list.items.length > 0;
}

// --- Combobox ------------------------------------------------------------------

export function Combobox<T>(props: ComboboxProps<T>) {
  const {
    value,
    onChange,
    getKey,
    getLabel,
    placeholder,
    clearable = false,
    disabled = false,
    size = "md",
    leftIcon,
    name,
    openOnFocus = false,
    onBlur,
    ref,
  } = props;
  const ids = useFieldIds(props);
  const listId = `${ids.id}-list`;
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  // True from the first typed letter until a pick, Escape or blur.
  const [editing, setEditing] = useState(false);
  const valueKey = value === null ? null : getKey(value);
  const core = useComboboxCore(boxRef, editing ? text.trim() : "", props, valueKey);
  const shown = editing ? text : value === null ? "" : getLabel(value);
  const canClear = clearable && value !== null && !disabled;

  const pick = (item: T) => {
    core.close();
    setEditing(false);
    setText("");
    if (getKey(item) !== valueKey) onChange(item);
  };

  const toggle = () => {
    if (disabled) return;
    inputRef.current?.focus();
    if (core.open) core.close();
    else core.openList();
  };

  const listName = props["aria-label"] ?? (typeof props.label === "string" ? props.label : "Варіанти");

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
        className={cx(
          FIELD_BOX,
          CONTROL[size],
          FIELD_GAP[size],
          FIELD_PL[size],
          FIELD_PR_ACTION[size],
          !hasField(props) && props.className,
        )}
      >
        {leftIcon && <SlotIcon icon={leftIcon} className={cx("text-neutral-500", FIELD_ICON[size])} />}
        <input
          ref={(node) => {
            inputRef.current = node;
            assignRef(ref, node);
          }}
          id={ids.id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={core.open}
          aria-controls={listShown(core) ? listId : undefined}
          aria-activedescendant={listShown(core) && core.list.fresh && core.active >= 0 ? `${listId}-${core.active}` : undefined}
          aria-label={props["aria-label"]}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          aria-required={props.required || undefined}
          autoComplete="off"
          spellCheck={false}
          value={shown}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => {
            setText(event.target.value);
            setEditing(true);
            core.openList();
          }}
          onClick={() => core.openList()}
          onFocus={(event) => {
            // Typing replaces the chosen label instead of extending it.
            if (!editing) event.currentTarget.select();
            if (openOnFocus) core.openList();
          }}
          onBlur={() => {
            core.close();
            if (editing) {
              if (text.trim() === "" && clearable && value !== null) onChange(null);
              setEditing(false);
              setText("");
            }
            onBlur?.();
          }}
          onKeyDown={(event) => {
            if (core.navigate(event, pick)) return;
            if (event.key === "Escape" && editing) {
              // The second Escape: back to the chosen label.
              event.preventDefault();
              event.stopPropagation();
              setEditing(false);
              setText("");
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed"
        />
        {canClear && (
          <button
            type="button"
            aria-label="Очистити вибір"
            title="Очистити вибір"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange(null);
              setEditing(false);
              setText("");
              inputRef.current?.focus();
            }}
            className={cx(FIELD_ACTION, FIELD_ACTION_SIZE[size])}
          >
            <XMarkIcon aria-hidden strokeWidth={1.7} className={FIELD_ICON[size]} />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-label={core.open ? "Сховати варіанти" : "Показати варіанти"}
          disabled={disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={toggle}
          className={cx(FIELD_ACTION, FIELD_ACTION_SIZE[size])}
        >
          {core.list.loading ? (
            <Spinner size="sm" />
          ) : (
            <ChevronDownIcon
              aria-hidden
              strokeWidth={1.7}
              className={cx("transition-[rotate] duration-200 motion-reduce:transition-none", FIELD_ICON[size], core.open && "rotate-180")}
            />
          )}
        </button>
        {name && <input type="hidden" name={name} value={valueKey ?? ""} />}
      </div>
      <OptionsLayer
        core={core}
        listId={listId}
        label={listName}
        props={props}
        isSelected={(item) => valueKey !== null && getKey(item) === valueKey}
        onPick={pick}
      />
    </FieldFrame>
  );
}

// --- MultiCombobox -------------------------------------------------------------

export function MultiCombobox<T>(props: MultiComboboxProps<T>) {
  const { value, onChange, getKey, getLabel, placeholder, disabled = false, size = "md", max, name, openOnFocus = false, onBlur, ref } =
    props;
  const ids = useFieldIds(props);
  const listId = `${ids.id}-list`;
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const chosen = new Set(value.map(getKey));
  const full = max !== undefined && value.length >= max;
  const core = useComboboxCore(boxRef, text.trim(), props, null);

  const toggleItem = (item: T) => {
    const key = getKey(item);
    if (chosen.has(key)) onChange(value.filter((entry) => getKey(entry) !== key));
    else if (!full) onChange([...value, item]);
    setText("");
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, at) => at !== index));
    inputRef.current?.focus();
  };

  const listName = props["aria-label"] ?? (typeof props.label === "string" ? props.label : "Варіанти");

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
          core.openList();
        }}
        className={cx(MULTI_FIELD, MULTI_BOX[size], "cursor-text", !hasField(props) && props.className)}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {value.map((item, index) => (
            <Chip
              key={getKey(item)}
              size={size}
              disabled={disabled}
              removeLabel={`Прибрати «${getLabel(item)}»`}
              onRemove={() => removeAt(index)}
            >
              {getLabel(item)}
            </Chip>
          ))}
          <input
            ref={(node) => {
              inputRef.current = node;
              assignRef(ref, node);
            }}
            id={ids.id}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={core.open}
            aria-controls={listShown(core) ? listId : undefined}
            aria-activedescendant={listShown(core) && core.list.fresh && core.active >= 0 ? `${listId}-${core.active}` : undefined}
            aria-label={props["aria-label"]}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid || undefined}
            aria-required={props.required || undefined}
            autoComplete="off"
            spellCheck={false}
            value={text}
            placeholder={full ? `Не більше ${max}` : value.length === 0 ? placeholder : ""}
            disabled={disabled}
            onChange={(event) => {
              setText(event.target.value);
              core.openList();
            }}
            onClick={() => core.openList()}
            onFocus={() => {
              if (openOnFocus) core.openList();
            }}
            onBlur={() => {
              core.close();
              setText("");
              onBlur?.();
            }}
            onKeyDown={(event) => {
              if (core.navigate(event, toggleItem)) return;
              if (event.key === "Backspace" && text === "" && value.length > 0) {
                event.preventDefault();
                onChange(value.slice(0, -1));
              }
            }}
            className={MULTI_INPUT[size]}
          />
        </div>
        <button
          type="button"
          tabIndex={-1}
          aria-label={core.open ? "Сховати варіанти" : "Показати варіанти"}
          disabled={disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            inputRef.current?.focus();
            if (core.open) core.close();
            else core.openList();
          }}
          className={cx(FIELD_ACTION, MULTI_ACTION_SIZE[size], "self-start")}
        >
          {core.list.loading ? (
            <Spinner size="sm" />
          ) : (
            <ChevronDownIcon
              aria-hidden
              strokeWidth={1.7}
              className={cx("transition-[rotate] duration-200 motion-reduce:transition-none", FIELD_ICON[size], core.open && "rotate-180")}
            />
          )}
        </button>
        {name && <input type="hidden" name={name} value={value.map(getKey).join(",")} />}
      </div>
      <OptionsLayer
        core={core}
        listId={listId}
        label={listName}
        props={props}
        isSelected={(item) => chosen.has(getKey(item))}
        onPick={toggleItem}
        multiselectable
      />
    </FieldFrame>
  );
}
