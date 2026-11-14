"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { CheckboxOffIcon, CheckboxOnIcon, MagnifierIcon } from "@/components/catalog/icons";
import { PHONE_QUERY, placePanel } from "@/components/ui/useListbox";
import { ChevronDown24 } from "./icons";

// Form controls of the checkout panel — Figma «<TextField>» (4130:38608
// family, the designer's MUI-outlined-small port):
//   empty   1-px #d2d2d2 ring, r24, 46 tall, 24-px side padding, the
//           label sits in the field as a 16/24 Medium #777779 placeholder;
//   filled  the label floats onto the top edge as a 12/12 Medium caption
//           on the panel background (left 16 + 6 px padding), value in
//           16/24 Medium #1d1d1f;
//   focus   2-px brand ring, brand caption;
//   error   «State=Error» (4130:38611): a plain 1-px #d92d20 ring, the
//           resting caption stays grey, a floated one and the helper line
//           turn Error/Main #d32f2f (see RING_ERROR / Hint).
// Selects add a 24-px chevron (up while open) and drop a white r24 menu
// with a 0/2/6 shadow 4.5 px under the field («<Menu>», 4329:41026):
// 16/22 Medium rows padded 16/12 with 0.5-px dividers, 250 px max.
//
// Phones (D6 / TR-21, system spec A26): the same 46-px r24 field, 16-px
// text (no iOS focus zoom), full width, pitch 70 by the callers' gap-6.
// Below 640 only: a resting caption never runs out of the ring (it
// truncates), an unfocused overflowing value shows an ellipsis, the
// helper / error line sits 8 under the ring in Stroke/Negative #d92d20,
// menu rows are split by 1-px lines, a select menu opens into view (flip
// above or scroll the nearest scroller), branch-like options show two
// lines (`primary` / `secondary`), and the autocomplete keeps its menu
// above the keyboard. Desktop strings are untouched (lg: restores).

const RING =
  "peer h-[46px] w-full rounded-3xl border border-stroke-subtle bg-transparent px-6 text-[16px] font-medium leading-6 tracking-[0.15px] text-neutral-900 outline-none transition-[border-color,box-shadow] duration-200 placeholder-transparent focus:border-brand focus:[box-shadow:inset_0_0_0_1px_var(--color-brand)] disabled:cursor-default disabled:border-[#bbbbbc] disabled:text-neutral-300 max-lg:text-ellipsis";
// «<TextField>» State=Error (4130:38611 / 4130:38612, ctx 5420-38180 /
// 5420-38248) - the checkout, the account drawer and the cabinet forms
// share it: a plain 1-px Stroke/Negative #d92d20 ring, no inset; focus
// keeps the 2-px look of every focused field. Keyed on [aria-invalid]
// (every control sets it while in error) so the red outranks RING's own
// border-stroke-subtle / focus:border-brand: same-specificity colour
// utilities do not reliably override each other (.border-negative is
// emitted before .border-stroke-subtle).
const RING_ERROR =
  "aria-invalid:border-negative aria-invalid:focus:border-negative aria-invalid:focus:[box-shadow:inset_0_0_0_1px_var(--color-negative)]";
// Floating caption: rides the field's top edge once the control has a
// value or focus (peer-[:not(:placeholder-shown)] / peer-focus), painted
// on the panel surface so it cuts the ring exactly as the master draws:
// the checkout's #f8f8f8 by default, or whatever a host sets in
// `--field-surface` (the white account drawer).
// Caption geometry comes in two exclusive branches so neither can leak
// into the other: resting (inside the field, placeholder-like) and
// floated (on the top edge). Text inputs switch through the peer's
// focus / :placeholder-shown state; the select switches from React state.
// Both branches pin an explicit height (24 resting, 12 floated) so the
// float transition interpolates it instead of snapping auto -> 12. The
// floated caption keeps the master's 12-px Label Container box (-6 on
// the ring's top edge) but sets its text on a 14-px line: the glyphs drop
// 1 px inside the box, onto the Figma ink (5420:38195 / 5420:38248 ink
// tops were 1-2 px high with a 12-px line).
const LABEL_SHELL =
  "pointer-events-none absolute -translate-y-1/2 whitespace-nowrap font-medium tracking-[0.15px] transition-all duration-200";
const LABEL_REST = "left-6 top-1/2 h-6 text-[16px] leading-6 text-neutral-500";
const LABEL_FLOAT = "left-[18px] top-0 bg-[var(--field-surface,var(--color-bg-subtle))] px-1.5 h-3 text-[12px] leading-[14px]";
// Filled colour applies only while NOT focused, so a focused field keeps
// the brand caption of the Figma Focus state after the first keystroke.
// Geometry and colours are kept apart so the error caption can swap the
// colours without fighting the grey filled rule (its double :not()
// out-ranks a single-state colour); LABEL is the same class list as ever.
const LABEL_GEOM =
  `${LABEL_SHELL} ${LABEL_REST} peer-focus:left-[18px] peer-focus:top-0 peer-focus:bg-[var(--field-surface,var(--color-bg-subtle))] peer-focus:px-1.5 peer-focus:h-3 peer-focus:text-[12px] peer-focus:leading-[14px] peer-[:not(:placeholder-shown)]:left-[18px] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:bg-[var(--field-surface,var(--color-bg-subtle))] peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:h-3 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:leading-[14px]`;
const LABEL_TONE =
  "peer-focus:text-brand peer-[:not(:placeholder-shown):not(:focus)]:text-black/60";
const LABEL = `${LABEL_GEOM} ${LABEL_TONE}`;
// Error caption: the resting (empty) label stays #777779 (5420-38180),
// the floated one turns Error/Main #d32f2f (5420-38248).
const LABEL_ERROR = `${LABEL_GEOM} peer-focus:text-[#d32f2f] peer-[:not(:placeholder-shown)]:text-[#d32f2f]`;
// Error/Main of the FormHelperText and the floated caption.
const ERROR_TEXT = "text-[#d32f2f]";
// Phones: a RESTING caption stops 24 px short of the ring's far edge and
// truncates (48 = both 24-px insets; 80 when an adornment sits on the
// right). Text inputs switch through the peer state, the select and a
// disabled field through React state.
const REST_FIT =
  "max-lg:peer-[:placeholder-shown:not(:focus)]:max-w-[calc(100%-48px)] max-lg:peer-[:placeholder-shown:not(:focus)]:truncate";
const REST_FIT_ADORNED =
  "max-lg:peer-[:placeholder-shown:not(:focus)]:max-w-[calc(100%-80px)] max-lg:peer-[:placeholder-shown:not(:focus)]:truncate";
const REST_FIT_STATIC = "max-lg:max-w-[calc(100%-48px)] max-lg:truncate";
const REST_FIT_SELECT = "max-lg:max-w-[calc(100%-80px)] max-lg:truncate";

const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
const motionBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";

// «<FormHelperText>» — the 12/16 Medium line under a field, the exact
// Figma box (4132:38988): pt-3 px-24, shown only while there is text, so
// an empty field is 46 tall, a one-line message makes it 65 and a
// two-line one 81. `reserve` instead keeps the master's 19-px zone
// (3 px top padding + one line) under the field whether or not a
// message is showing; `mui` (the account drawer, Authorisation NEW
// 5420:38169) never reserves it. A permanent `helper` (5258:43746 «Це
// буде ваш логін...») is text/secondary rgba(0,0,0,.6); an error
// replaces it in Error/Main #d32f2f.
// Phones (D6): the line sits 8 under the ring and an error is
// Stroke/Negative #d92d20 (the reserved zone grows to 24 with it).
// `announce` false drops role=alert (a form that focuses its first
// invalid field announces through aria-describedby instead).
function Hint({
  id,
  error,
  helper,
  reserve,
  mui,
  announce = true,
}: {
  id: string;
  error?: string;
  helper?: string;
  reserve?: boolean;
  mui?: boolean;
  announce?: boolean;
}) {
  const text = error || helper;
  if (!text && !reserve) return null;
  const box =
    reserve && !mui ? "min-h-[19px] pl-6 pt-[3px] max-lg:min-h-6 max-lg:pt-2" : "px-6 pt-[3px] max-lg:pt-2";
  const tone = error ? `${ERROR_TEXT} max-lg:text-negative` : "text-black/60";
  return (
    <p
      id={id}
      role={error && announce ? "alert" : undefined}
      className={`${box} text-[12px] font-medium leading-4 tracking-[0.15px] ${tone}`}
    >
      {text}
    </p>
  );
}

// Disabled field («Логін» prefilled with the verified phone, 4573:35508):
// #bbbbbc ring and #a5a5a5 value (the disabled: variants on RING) with
// the caption in the same grey.
const LABEL_DISABLED = "text-neutral-300";

export function TextField({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  name,
  autoComplete,
  inputMode,
  maxLength,
  autoFocus,
  disabled,
  helperZone,
  helper,
  muiHelper,
  invalid,
  hintId,
  describedBy,
  trailing,
  className = "",
  autoCapitalize,
  autoCorrect,
  spellCheck,
  enterKeyHint,
  onKeyDown,
  announceError = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  // Reserve the 19-px helper line under the field (see Hint).
  helperZone?: boolean;
  // Permanent helper line under the field (an error replaces it).
  helper?: string;
  // The account drawer's MUI TextField: never reserves the helper zone
  // (the error look is the shared State=Error one either way).
  muiHelper?: boolean;
  // Error look without a message of its own (the first password field
  // of «паролі не збігаються», 5420:38248).
  invalid?: boolean;
  // A fixed id for the helper line, so another field can point at it.
  hintId?: string;
  // Extra aria-describedby ids: an `invalid` field names the message
  // that explains it (the repeat field's «Паролі не збігаються»).
  describedBy?: string;
  // «AdornmentEnd»: a 24-px control on the right of the 46-px ring, 24 px
  // from its outer edge, 8 px clear of the text (the password eye). It
  // sits outside the <label> because a button may not live inside one.
  trailing?: ReactNode;
  className?: string;
  // Keyboard / input hints passed to the <input> unchanged (no visual).
  autoCapitalize?: string;
  autoCorrect?: "on" | "off";
  spellCheck?: boolean;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  onKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  // role=alert on the error line (false: the form announces otherwise).
  announceError?: boolean;
}) {
  const id = useId();
  const isError = Boolean(error) || Boolean(invalid);
  const labelClass = disabled
    ? `${LABEL_SHELL} ${value ? LABEL_FLOAT : `${LABEL_REST} ${REST_FIT_STATIC}`} ${LABEL_DISABLED}`
    : `${isError ? LABEL_ERROR : LABEL} ${trailing ? REST_FIT_ADORNED : REST_FIT}`;
  const ringError = isError ? RING_ERROR : "";
  const hint = hintId ?? `${id}-hint`;
  const described =
    [error || helper ? hint : null, describedBy].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <div className="relative">
        <label className="relative block">
          <input
            id={id}
            name={name}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            maxLength={maxLength}
            autoFocus={autoFocus}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            spellCheck={spellCheck}
            enterKeyHint={enterKeyHint}
            placeholder=" "
            aria-invalid={isError ? true : undefined}
            aria-describedby={described}
            className={`${RING} ${trailing ? "pr-14" : ""} ${ringError}`}
          />
          <span className={labelClass}>{label}</span>
        </label>
        {trailing && (
          <span className="absolute right-6 top-[11px] flex size-6 items-center justify-center">
            {trailing}
          </span>
        )}
      </div>
      <Hint
        id={hint}
        error={error}
        helper={helper}
        reserve={helperZone}
        mui={muiHelper}
        announce={announceError}
      />
    </div>
  );
}

// «Коментар» — the 120-px multiline field; the caption starts at the
// top (3 + 8 px in, as the master's Input padding) and floats the same
// way.
export function TextArea({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name?: string;
}) {
  const id = useId();
  return (
    <label className="relative block">
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        rows={3}
        className={`${RING} block h-[120px] resize-none py-[11px]`}
      />
      <span className={`${LABEL} ${REST_FIT} top-[11px] translate-y-0 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2`}>
        {label}
      </span>
    </label>
  );
}

// Shared dropdown chrome for the select and the autocomplete. `data-flip`
// (set by placePanel on phones) anchors it above the field instead. Inside
// a cabinet modal (platform/ui/Modal718) the menu may hang over the card's
// bottom edge from 640: the card does not clip it (designer 2026-11-13, C33).
function Menu({
  id,
  open,
  children,
  menuRef,
  className = "",
}: {
  id: string;
  open: boolean;
  children: ReactNode;
  menuRef?: Ref<HTMLUListElement>;
  className?: string;
}) {
  if (!open) return null;
  return (
    <ul
      ref={menuRef}
      id={id}
      role="listbox"
      className={`absolute inset-x-0 top-[calc(100%+4.5px)] z-20 max-h-[250px] overflow-y-auto overscroll-contain rounded-3xl bg-white py-0 shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)] data-[flip]:bottom-[calc(100%+4.5px)] data-[flip]:top-auto ${className}`}
    >
      {children}
    </ul>
  );
}

// Phones (TR-11): the chosen row in brand - `max-lg:` because the base
// `text-neutral-900` of the row out-ranks `text-brand` in the sheet order
// (desktop keeps today's look).
function MenuItem({
  id,
  selected,
  active,
  onSelect,
  children,
}: {
  id: string;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => {
        // mousedown, not click: the field's blur would close the menu first.
        e.preventDefault();
        onSelect();
      }}
      className={`cursor-pointer px-4 py-3 text-button-md text-neutral-900 transition-colors duration-150 [&+&]:shadow-[inset_0_1px_0_var(--color-stroke-subtle)] lg:[&+&]:shadow-[inset_0_0.5px_0_var(--color-stroke-subtle)] ${
        active ? "bg-bg-subtle" : "hover:bg-bg-subtle"
      } ${selected ? "text-brand max-lg:text-brand" : ""}`}
    >
      {children}
    </li>
  );
}

// An option may carry a two-line phone form: `primary` 16/22 Medium over
// `secondary` 14/20 #777779 (Нова Пошта branches / lockers: «Поштомат
// №10233» / «бульв. Лесі Українки, 26»); desktop always shows `label`.
export type SelectOption = { value: string; label: string; primary?: string; secondary?: string };

function OptionText({ option }: { option: SelectOption }) {
  if (!option.primary) return <>{option.label}</>;
  return (
    <>
      <span className="max-lg:hidden">{option.label}</span>
      <span className="flex flex-col lg:hidden">
        <span className="text-[16px] font-medium leading-[22px]">{option.primary}</span>
        {option.secondary && (
          <span className="text-[14px] font-normal leading-5 tracking-normal text-neutral-500">{option.secondary}</span>
        )}
      </span>
    </>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  name,
  helperZone,
  announceError = true,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  error?: string;
  name?: string;
  helperZone?: boolean;
  announceError?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const menuRef = useRef<HTMLUListElement>(null);
  const current = options.find((o) => o.value === value);
  const filled = Boolean(current);
  const twoLine = Boolean(current?.primary);
  const currentIndex = options.findIndex((o) => o.value === value);

  // Phones: the opened menu must be visible (flip above, or scroll the
  // nearest scroller / the page just enough).
  useLayoutEffect(() => {
    if (open && menuRef.current && isPhone()) placePanel(menuRef.current);
  }, [open]);

  // The highlight never survives a close: it restarts from the chosen
  // option (or nothing) every time the menu opens.
  const openMenu = () => {
    setActive(currentIndex);
    setOpen(true);
  };
  const closeMenu = () => {
    setActive(-1);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActive((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return Math.max(0, Math.min(options.length - 1, next));
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && active >= 0) {
        onChange(options[active].value);
        closeMenu();
      } else if (open) {
        closeMenu();
      } else {
        openMenu();
      }
    } else if (e.key === "Escape" && open) {
      // Swallowed while the menu is open, so a dialog around the field
      // (useModalBehavior skips a defaultPrevented Escape) stays open.
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    }
  };

  return (
    <div>
      <div className="relative">
        <button
          id={id}
          type="button"
          name={name}
          role="combobox"
          // Named by the caption span, so the button's own text (the
          // chosen value) stays exposed as the combobox value.
          aria-labelledby={`${id}-label`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${id}-menu` : undefined}
          aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hint` : undefined}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={onKey}
          onBlur={closeMenu}
          className={`${RING} flex cursor-pointer items-center justify-between gap-2 text-left ${
            twoLine ? "max-lg:h-auto max-lg:min-h-[46px] max-lg:py-[10px]" : ""
          } ${error ? RING_ERROR : ""} ${open && !error ? "border-brand [box-shadow:inset_0_0_0_1px_var(--color-brand)]" : ""}`}
        >
          <span
            className={`min-w-0 flex-1 truncate ${twoLine ? "max-lg:whitespace-normal" : ""} ${filled ? "" : "text-transparent"}`}
          >
            {current ? <OptionText option={current} /> : label}
          </span>
          <ChevronDown24
            className={`size-6 shrink-0 text-neutral-900 transition-[rotate] duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        <span
          id={`${id}-label`}
          // The caption floats only once a value is chosen: an open but
          // still empty select keeps the label resting inside the brand ring,
          // as the masters with the delivery / payment menus open draw it
          // (4329:41045, 4329:41086).
          // In error the resting caption stays grey like the text fields'
          // (State=Error, Has Value=no); a floated one turns #d32f2f.
          className={`${LABEL_SHELL} ${
            filled
              ? `${LABEL_FLOAT} ${error ? ERROR_TEXT : open ? "text-brand" : "text-black/60"}`
              : `${LABEL_REST} ${REST_FIT_SELECT}`
          }`}
        >
          {label}
        </span>
        <Menu id={`${id}-menu`} open={open} menuRef={menuRef} className="max-lg:max-h-[232px]">
          {options.map((o, i) => (
            <MenuItem
              key={o.value}
              id={`${id}-opt-${i}`}
              selected={o.value === value}
              active={i === active}
              onSelect={() => {
                onChange(o.value);
                closeMenu();
              }}
            >
              <OptionText option={o} />
            </MenuItem>
          ))}
        </Menu>
      </div>
      <Hint id={`${id}-hint`} error={error} reserve={helperZone} announce={announceError} />
    </div>
  );
}

// «Місто» / «Вулиця»: free text with a magnifier and a filtered menu of
// suggestions (Figma shows the magnifier adornment on both).
export function AutocompleteField({
  label,
  value,
  options,
  onChange,
  onBlur,
  error,
  name,
  autoComplete,
  helperZone,
  enterKeyHint,
  announceError = true,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  name?: string;
  autoComplete?: string;
  helperZone?: boolean;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  announceError?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const query = value.trim().toLowerCase();
  const matches = query
    ? options.filter((o) => o.toLowerCase().includes(query)).slice(0, 8)
    : options.slice(0, 8);
  const showMenu = open && matches.length > 0 && !(matches.length === 1 && matches[0] === value);

  // Phones: the open menu never runs under the keyboard - its height is
  // capped to the visible (visual viewport) space below it, 140 at least.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!showMenu || !menu || !isPhone()) return;
    const vv = window.visualViewport;
    const cap = () => {
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const room = Math.floor(visibleBottom - menu.getBoundingClientRect().top - 8);
      menu.style.maxHeight = `${Math.min(250, Math.max(140, room))}px`;
    };
    cap();
    vv?.addEventListener("resize", cap);
    vv?.addEventListener("scroll", cap);
    window.addEventListener("scroll", cap, { passive: true });
    return () => {
      vv?.removeEventListener("resize", cap);
      vv?.removeEventListener("scroll", cap);
      window.removeEventListener("scroll", cap);
    };
  }, [showMenu]);

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          autoComplete={autoComplete ?? "off"}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={showMenu}
          aria-controls={showMenu ? `${id}-menu` : undefined}
          aria-activedescendant={showMenu && active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hint` : undefined}
          enterKeyHint={enterKeyHint}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            // Phones: bring the field to the top so its suggestions have
            // room above the keyboard (html scroll-padding keeps it under
            // the header).
            if (isPhone()) {
              const behavior = motionBehavior();
              requestAnimationFrame(() => inputRef.current?.scrollIntoView({ block: "start", behavior }));
            }
          }}
          onBlur={() => {
            setOpen(false);
            onBlur?.();
          }}
          onKeyDown={(e) => {
            if (!showMenu) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) =>
                Math.max(0, Math.min(matches.length - 1, e.key === "ArrowDown" ? i + 1 : i - 1)),
              );
            } else if (e.key === "Enter") {
              // Enter completes the suggestion instead of submitting the
              // form: the highlighted match, or the first one.
              e.preventDefault();
              onChange(matches[active >= 0 ? active : 0]);
              setOpen(false);
            } else if (e.key === "Escape") {
              // Only reached while the menu shows (see the guard above):
              // closes the menu, not a dialog around the field.
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }
          }}
          placeholder=" "
          className={`${RING} pr-14 ${error ? RING_ERROR : ""}`}
        />
        <span className={`${error ? LABEL_ERROR : LABEL} ${REST_FIT_ADORNED}`}>{label}</span>
        <MagnifierIcon className="pointer-events-none absolute right-6 top-1/2 size-6 -translate-y-1/2 text-neutral-900" />
        <Menu id={`${id}-menu`} open={showMenu} menuRef={menuRef}>
          {matches.map((o, i) => (
            <MenuItem
              key={o}
              id={`${id}-opt-${i}`}
              selected={o === value}
              active={i === active}
              onSelect={() => {
                onChange(o);
                setOpen(false);
                // Desktop closes the field; phones keep the focus (and
                // the keyboard) for the next field.
                if (!isPhone()) inputRef.current?.blur();
              }}
            >
              {o}
            </MenuItem>
          ))}
        </Menu>
      </div>
      <Hint id={`${id}-hint`} error={error} reserve={helperZone} announce={announceError} />
    </div>
  );
}

// «Потрібен рахунок-фактура» — the 24-px checkbox glyphs of the filters
// drawer with a 16/22 Medium #343435 label, 8-px gap. Phones: a 44-px
// row; the label may be nodes (a nowrap compound word).
export function CheckboxField({
  label,
  checked,
  onChange,
  name,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  name?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 self-start max-lg:min-h-11">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      {/* The label handles the click; the glyph stays out of the way of
          the (visually hidden) input for assistive tech and automation. */}
      {checked ? (
        <CheckboxOnIcon className="pointer-events-none size-6 shrink-0 text-brand" />
      ) : (
        <CheckboxOffIcon className="pointer-events-none size-6 shrink-0 text-neutral-900" />
      )}
      <span className="text-button-md text-neutral-800 peer-focus-visible:underline">{label}</span>
    </label>
  );
}

// The carrier search of the checkout (NpFields.tsx): the «Місто» field
// and, once a city is picked, «Відділення» / «Поштомат» ask Nova Poshta's
// directory instead of filtering a fixed list. The same 46-px ring,
// floating caption, magnifier, menu and rows as AutocompleteField (phones:
// the two-line rows of the select, the menu kept above the keyboard);
// what differs is where the rows come from:
// - `search(query, scope, signal)` loads them (debounced while typing),
//   null meaning the list could not be loaded;
// - `scope` names the list ("city", "<cityRef>:branch"); null = no list,
//   the field is plain free text;
// - `query` is what is searched (the caller passes "" to show the whole
//   list of a scope again, e.g. after a branch was picked);
// - picking a row hands it to `onPick` (the caller stores its text and
//   its reference); typing hands the text to `onChange`. Typing without
//   picking always stays possible, so a carrier outage never blocks the
//   form.
// The menu says when it is searching, when nothing matched and when the
// list failed, in a row of its own (and to screen readers).

// A row of such a list: `key` identifies it (the carrier's reference),
// `value` is the text the field takes when it is picked.
export type SearchOption = SelectOption & { key: string };

// The rows for `query` in `scope`, or null when they could not be loaded.
export type SearchFn = (query: string, scope: string, signal: AbortSignal) => Promise<SearchOption[] | null>;

const SEARCH_COPY = {
  loading: "Шукаємо...",
  empty: "Нічого не знайдено",
  failed: "Не вдалося завантажити список. Введіть назву вручну.",
} as const;

// Pause after the last keystroke before the list is asked for.
const SEARCH_DEBOUNCE_MS = 250;

type SearchResult = { scope: string; text: string; items: SearchOption[]; failed: boolean };

export function SearchField({
  label,
  value,
  query,
  minChars,
  scope,
  search,
  selectedKey,
  onChange,
  onPick,
  error,
  name,
  autoComplete,
  enterKeyHint,
  announceError = true,
}: {
  label: string;
  value: string;
  query: string;
  minChars: number;
  scope: string | null;
  search: SearchFn;
  selectedKey?: string;
  onChange: (v: string) => void;
  onPick: (option: SearchOption) => void;
  error?: string;
  name?: string;
  autoComplete?: string;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  announceError?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  // The list the open field wants, and whether the last answer is it.
  const text = query.trim();
  const wants = open && scope !== null && text.length >= minChars;
  const wanted = wants ? JSON.stringify([scope, text]) : null;
  const answered = result ? JSON.stringify([result.scope, result.text]) : null;
  const fresh = wanted !== null && result !== null && answered === wanted;
  // While the answer to a new query is on its way the rows of the previous
  // one (same scope) stay, so the list does not blink on every keystroke.
  const sameScope = result !== null && !result.failed && result.scope === scope;
  const items = !wants || result === null ? [] : fresh || sameScope ? result.items : [];
  let status: keyof typeof SEARCH_COPY | null = null;
  if (wants && fresh && result) status = result.failed ? "failed" : result.items.length === 0 ? "empty" : null;
  else if (wants && items.length === 0) status = "loading";
  const showMenu = wants && (items.length > 0 || status !== null);
  const activeIndex = active < items.length ? active : -1;

  // Asks for the wanted list once it differs from the last answer; the
  // answer to a query that was typed over is dropped (aborted).
  useEffect(() => {
    if (wanted === null || answered === wanted) return;
    const [scopeOf, textOf] = JSON.parse(wanted) as [string, string];
    const controller = new AbortController();
    const done = (rows: SearchOption[] | null) => {
      if (controller.signal.aborted) return;
      setResult({ scope: scopeOf, text: textOf, items: rows ?? [], failed: rows === null });
      setActive(-1);
    };
    const timer = window.setTimeout(
      () => {
        search(textOf, scopeOf, controller.signal).then(done, () => done(null));
      },
      textOf ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [wanted, answered, search]);

  // Phones: the open menu never runs under the keyboard (AutocompleteField).
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!showMenu || !menu || !isPhone()) return;
    const vv = window.visualViewport;
    const cap = () => {
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const room = Math.floor(visibleBottom - menu.getBoundingClientRect().top - 8);
      menu.style.maxHeight = `${Math.min(250, Math.max(140, room))}px`;
    };
    cap();
    vv?.addEventListener("resize", cap);
    vv?.addEventListener("scroll", cap);
    window.addEventListener("scroll", cap, { passive: true });
    return () => {
      vv?.removeEventListener("resize", cap);
      vv?.removeEventListener("scroll", cap);
      window.removeEventListener("scroll", cap);
    };
  }, [showMenu]);

  // Keeps the highlighted row in view while the arrows walk the list.
  useEffect(() => {
    if (!showMenu || activeIndex < 0) return;
    const row = document.getElementById(`${id}-opt-${activeIndex}`);
    const menu = menuRef.current;
    if (!row || !menu) return;
    if (row.offsetTop < menu.scrollTop) menu.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > menu.scrollTop + menu.clientHeight) {
      menu.scrollTop = row.offsetTop + row.offsetHeight - menu.clientHeight;
    }
  }, [showMenu, activeIndex, id]);

  const pick = (option: SearchOption) => {
    onPick(option);
    setOpen(false);
    setActive(-1);
    // Desktop closes the field; phones keep the focus (and the keyboard)
    // for the next field.
    if (!isPhone()) inputRef.current?.blur();
  };

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          autoComplete={autoComplete ?? "off"}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={showMenu}
          aria-controls={showMenu ? `${id}-menu` : undefined}
          aria-activedescendant={showMenu && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hint` : undefined}
          data-search-field=""
          enterKeyHint={enterKeyHint}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onFocus={() => {
            setOpen(true);
            // A list that failed is asked for again on the next visit.
            if (result?.failed) setResult(null);
            // Phones: the field goes to the top so its rows have room
            // above the keyboard (AutocompleteField).
            if (isPhone()) {
              const behavior = motionBehavior();
              requestAnimationFrame(() => inputRef.current?.scrollIntoView({ block: "start", behavior }));
            }
          }}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (!showMenu) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (items.length === 0) return;
              const next = e.key === "ArrowDown" ? activeIndex + 1 : activeIndex - 1;
              setActive(Math.max(0, Math.min(items.length - 1, next)));
            } else if (e.key === "Enter") {
              // Enter takes the highlighted row (or the first one) of the
              // answer to what is typed now; otherwise it keeps the typed
              // text and closes the list. Never a form submit while the
              // list is open.
              e.preventDefault();
              if (fresh && items.length > 0) pick(items[activeIndex >= 0 ? activeIndex : 0]);
              else setOpen(false);
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }
          }}
          placeholder=" "
          className={`${RING} pr-14 ${error ? RING_ERROR : ""}`}
        />
        <span className={`${error ? LABEL_ERROR : LABEL} ${REST_FIT_ADORNED}`}>{label}</span>
        <MagnifierIcon className="pointer-events-none absolute right-6 top-1/2 size-6 -translate-y-1/2 text-neutral-900" />
        <Menu id={`${id}-menu`} open={showMenu} menuRef={menuRef}>
          {items.map((o, i) => (
            <MenuItem
              key={o.key}
              id={`${id}-opt-${i}`}
              selected={o.key === selectedKey}
              active={i === activeIndex}
              onSelect={() => pick(o)}
            >
              <OptionText option={o} />
            </MenuItem>
          ))}
          {items.length === 0 && status && (
            <li
              role="option"
              aria-disabled="true"
              aria-selected={false}
              className="px-4 py-3 text-button-md text-neutral-500"
            >
              {SEARCH_COPY[status]}
            </li>
          )}
        </Menu>
      </div>
      <Hint id={`${id}-hint`} error={error} announce={announceError} />
      <span className="sr-only" aria-live="polite">
        {status ? SEARCH_COPY[status] : ""}
      </span>
    </div>
  );
}
