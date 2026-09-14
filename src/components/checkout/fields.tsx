"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { CheckboxOffIcon, CheckboxOnIcon, MagnifierIcon } from "@/components/catalog/icons";
import { ChevronDown24 } from "./icons";

// Form controls of the checkout panel — Figma «<TextField>» (4130:38608
// family, the designer's MUI-outlined-small port):
//   empty   1-px #d2d2d2 ring, r24, 46 tall, 24-px side padding, the
//           label sits in the field as a 16/24 Medium #777779 placeholder;
//   filled  the label floats onto the top edge as a 12/12 Medium caption
//           on the panel background (left 16 + 6 px padding), value in
//           16/24 Medium #1d1d1f;
//   focus   2-px brand ring, brand caption.
// Selects add a 24-px chevron (up while open) and drop a white r24 menu
// with a 0/2/6 shadow 4.5 px under the field («<Menu>», 4329:41026):
// 16/22 Medium rows padded 16/12 with 0.5-px dividers, 250 px max.

const RING =
  "peer h-[46px] w-full rounded-3xl border border-stroke-subtle bg-transparent px-6 text-[16px] font-medium leading-6 tracking-[0.15px] text-neutral-900 outline-none transition-[border-color,box-shadow] duration-200 placeholder-transparent focus:border-brand focus:[box-shadow:inset_0_0_0_1px_var(--color-brand)]";
const RING_ERROR =
  "border-negative [box-shadow:inset_0_0_0_1px_var(--color-negative)] focus:border-negative focus:[box-shadow:inset_0_0_0_1px_var(--color-negative)]";
// Floating caption: rides the field's top edge once the control has a
// value or focus (peer-[:not(:placeholder-shown)] / peer-focus), painted
// on the #f8f8f8 panel so it cuts the ring exactly as the master draws.
// Caption geometry comes in two exclusive branches so neither can leak
// into the other: resting (inside the field, placeholder-like) and
// floated (on the top edge). Text inputs switch through the peer's
// focus / :placeholder-shown state; the select switches from React state.
const LABEL_SHELL =
  "pointer-events-none absolute -translate-y-1/2 whitespace-nowrap font-medium tracking-[0.15px] transition-all duration-200";
const LABEL_REST = "left-6 top-1/2 text-[16px] leading-6 text-neutral-500";
const LABEL_FLOAT = "left-4 top-0 bg-bg-subtle px-1.5 text-[12px] leading-3";
// Filled colour applies only while NOT focused, so a focused field keeps
// the brand caption of the Figma Focus state after the first keystroke.
const LABEL =
  `${LABEL_SHELL} ${LABEL_REST} peer-focus:left-4 peer-focus:top-0 peer-focus:bg-bg-subtle peer-focus:px-1.5 peer-focus:text-[12px] peer-focus:leading-3 peer-focus:text-brand peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:bg-bg-subtle peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:leading-3 peer-[:not(:placeholder-shown):not(:focus)]:text-black/60`;
const LABEL_ERROR = "text-negative peer-focus:text-negative peer-[:not(:placeholder-shown)]:text-negative";

function Hint({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1 pl-6 text-[12px] font-medium leading-4 text-negative">
      {error}
    </p>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  name,
  autoComplete,
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label className="relative block">
        <input
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hint` : undefined}
          className={`${RING} ${error ? RING_ERROR : ""}`}
        />
        <span className={`${LABEL} ${error ? LABEL_ERROR : ""}`}>{label}</span>
      </label>
      <Hint id={`${id}-hint`} error={error} />
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
        className={`${RING} h-[120px] resize-none py-[11px]`}
      />
      <span className={`${LABEL} top-[11px] translate-y-0 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2`}>
        {label}
      </span>
    </label>
  );
}

// Shared dropdown chrome for the select and the autocomplete.
function Menu({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <ul
      id={id}
      role="listbox"
      className="absolute inset-x-0 top-[calc(100%+4.5px)] z-20 max-h-[250px] overflow-y-auto overscroll-contain rounded-3xl bg-white py-0 shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]"
    >
      {children}
    </ul>
  );
}

function MenuItem({
  selected,
  active,
  onSelect,
  children,
}: {
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <li
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => {
        // mousedown, not click: the field's blur would close the menu first.
        e.preventDefault();
        onSelect();
      }}
      className={`cursor-pointer px-4 py-3 text-button-md text-neutral-900 transition-colors duration-150 [&+&]:shadow-[inset_0_0.5px_0_var(--color-stroke-subtle)] ${
        active ? "bg-bg-subtle" : "hover:bg-bg-subtle"
      } ${selected ? "text-brand" : ""}`}
    >
      {children}
    </li>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  name,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  error?: string;
  name?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const current = options.find((o) => o.value === value);
  const filled = Boolean(current);
  const currentIndex = options.findIndex((o) => o.value === value);

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
    } else if (e.key === "Escape") {
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
          aria-controls={`${id}-menu`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hint` : undefined}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={onKey}
          onBlur={closeMenu}
          className={`${RING} flex cursor-pointer items-center justify-between gap-2 text-left ${
            error ? RING_ERROR : ""
          } ${open ? "border-brand [box-shadow:inset_0_0_0_1px_var(--color-brand)]" : ""}`}
        >
          <span className={`min-w-0 flex-1 truncate ${filled ? "" : "text-transparent"}`}>
            {current?.label ?? label}
          </span>
          <ChevronDown24
            className={`size-6 shrink-0 text-neutral-900 transition-[rotate] duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        <span
          id={`${id}-label`}
          className={`${LABEL_SHELL} ${
            filled || open
              ? `${LABEL_FLOAT} ${open ? "text-brand" : "text-black/60"}`
              : LABEL_REST
          } ${error ? "text-negative" : ""}`}
        >
          {label}
        </span>
        <Menu id={`${id}-menu`} open={open}>
          {options.map((o, i) => (
            <MenuItem
              key={o.value}
              selected={o.value === value}
              active={i === active}
              onSelect={() => {
                onChange(o.value);
                closeMenu();
              }}
            >
              {o.label}
            </MenuItem>
          ))}
        </Menu>
      </div>
      <Hint id={`${id}-hint`} error={error} />
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
  error,
  name,
  autoComplete,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  error?: string;
  name?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const query = value.trim().toLowerCase();
  const matches = query
    ? options.filter((o) => o.toLowerCase().includes(query)).slice(0, 8)
    : options.slice(0, 8);
  const showMenu = open && matches.length > 0 && !(matches.length === 1 && matches[0] === value);

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
          aria-controls={`${id}-menu`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hint` : undefined}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
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
              setOpen(false);
            }
          }}
          placeholder=" "
          className={`${RING} pr-14 ${error ? RING_ERROR : ""}`}
        />
        <span className={`${LABEL} ${error ? LABEL_ERROR : ""}`}>{label}</span>
        <MagnifierIcon className="pointer-events-none absolute right-6 top-1/2 size-6 -translate-y-1/2 text-neutral-900" />
        <Menu id={`${id}-menu`} open={showMenu}>
          {matches.map((o, i) => (
            <MenuItem
              key={o}
              selected={o === value}
              active={i === active}
              onSelect={() => {
                onChange(o);
                setOpen(false);
                inputRef.current?.blur();
              }}
            >
              {o}
            </MenuItem>
          ))}
        </Menu>
      </div>
      <Hint id={`${id}-hint`} error={error} />
    </div>
  );
}

// «Потрібен рахунок-фактура» — the 24-px checkbox glyphs of the filters
// drawer with a 16/22 Medium #343435 label, 8-px gap.
export function CheckboxField({
  label,
  checked,
  onChange,
  name,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  name?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 self-start">
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
