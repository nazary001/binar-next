"use client";

import {
  ArrowDownIcon,
  ArrowTurnDownLeftIcon,
  ArrowUpIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { adminApi } from "../lib/api";
import { cx } from "../lib/format";
import { NAV, type NavIconName, type NavItem } from "../lib/nav";
import type { Permission } from "../lib/permissions";
import { NavIcon } from "../shell/NavIcon";
import { useStaff } from "../shell/StaffProvider";
import { adminRoot, hasOpenLayer, useClientReady, useModalLayer, usePresence } from "./overlay";
import { Spinner } from "./Spinner";
import { EASE_OUT, FOCUS_RING, LIFT_SHADOW, SCRIM, TEXT, Z } from "./tokens";

// The panel-wide search (Ctrl+K / Cmd+K, or "/" when no field has focus):
// the menu sections the role may open, and from two typed characters the
// records GET /api/admin/search finds (orders, products, customers ...).
//
//   <CommandPalette />      once, by the shell (inside StaffProvider)
//   <PaletteTrigger />      the search pill of the top bar
//   openPalette()           from anywhere else
//
// The search route answers
//   { ok: true, groups: { type: string; label: string; items: { id; title; subtitle?; href }[] }[] }
// and is asked 200 ms after the last key; answers to an older query are
// ignored. If it fails, only the menu matches are listed (no error: the
// menu half still works).
//
// Keyboard: arrows move the highlight, Enter opens (Ctrl+Enter in a new
// tab), Escape closes and focus returns where it was.

// --- Open state --------------------------------------------------------------

let paletteOpen = false;
const listeners = new Set<() => void>();

function setPaletteOpen(value: boolean): void {
  if (paletteOpen === value) return;
  paletteOpen = value;
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Whether a <CommandPalette /> is mounted (only it subscribes to the open
// state; see hasConfirmHost in ConfirmDialog).
export function hasCommandPalette(): boolean {
  return listeners.size > 0;
}

export function openPalette(): void {
  setPaletteOpen(true);
}

export function closePalette(): void {
  setPaletteOpen(false);
}

function usePaletteOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => paletteOpen,
    () => false,
  );
}

// A field, a select or an editable area has focus: "/" is typed there.
function isEditing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image"].includes(target.type);
  }
  return false;
}

// --- Options -------------------------------------------------------------------

type SearchItem = { id: string; title: string; subtitle?: string; href: string };
type SearchGroup = { type: string; label: string; items: SearchItem[] };
type SearchAnswer = { ok: true; groups: SearchGroup[] };

type Option = { key: string; title: string; subtitle?: string; href: string; icon: NavIconName | null };
type OptionGroup = { key: string; label: string; options: Option[] };

// Result types of the search route drawn with the menu's icons.
const TYPE_ICON: Record<string, NavIconName> = {
  order: "orders",
  orders: "orders",
  return: "returns",
  returns: "returns",
  shipment: "shipping",
  shipments: "shipping",
  shipping: "shipping",
  product: "products",
  products: "products",
  category: "categories",
  categories: "categories",
  customer: "customers",
  customers: "customers",
  account: "customers",
  accounts: "customers",
  company: "companies",
  companies: "companies",
  counterparty: "companies",
  counterparties: "companies",
  group: "groups",
  groups: "groups",
  post: "blog",
  posts: "blog",
  blog: "blog",
  material: "materials",
  materials: "materials",
  media: "media",
  lead: "leads",
  leads: "leads",
  staff: "staff",
  audit: "audit",
};

// Apostrophes of every kind are dropped, so "зв'язок" matches however it was typed.
const APOSTROPHES = new RegExp(`[${String.fromCharCode(0x27, 0x2019, 0x2bc, 0x60)}]`, "g");

function normalize(text: string): string {
  return text.toLocaleLowerCase("uk").replace(APOSTROPHES, "").replace(/\s+/g, " ").trim();
}

function menuGroups(can: (permission: Permission) => boolean, query: string): OptionGroup[] {
  const toOption = (item: NavItem): Option => ({
    key: `nav:${item.href}`,
    title: item.label,
    href: item.href,
    icon: item.icon,
  });
  const allowed = NAV.map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) })).filter(
    (group) => group.items.length > 0,
  );
  if (!query) {
    return allowed.map((group) => ({ key: `nav:${group.key}`, label: group.label ?? "Головне", options: group.items.map(toOption) }));
  }
  const words = query.split(" ");
  const scored: { option: Option; score: number }[] = [];
  for (const group of allowed) {
    for (const item of group.items) {
      const label = normalize(item.label);
      const haystack = `${label} ${normalize(group.label ?? "")} ${normalize(item.keywords ?? "")}`;
      if (!words.every((word) => haystack.includes(word))) continue;
      // Labels that start with the query first, then labels that hold it.
      const score = label.startsWith(query) ? 0 : label.includes(query) ? 1 : 2;
      scored.push({ option: { ...toOption(item), subtitle: group.label ?? undefined }, score });
    }
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.length ? [{ key: "nav:matches", label: "Розділи", options: scored.map((entry) => entry.option) }] : [];
}

// --- The panel -----------------------------------------------------------------

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-stroke-subtle bg-white px-1 font-sans text-[11px] font-semibold leading-none text-neutral-600">
      {children}
    </kbd>
  );
}

function PalettePanel({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const router = useRouter();
  const { can } = useStaff();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ term: string; groups: SearchGroup[] } | null>(null);
  const [active, setActive] = useState(0);
  const [seenQuery, setSeenQuery] = useState(query);
  const keyboardMove = useRef(false);
  const idPrefix = useId();
  const listId = `${idPrefix}-list`;
  const optionId = (index: number) => `${idPrefix}-option-${index}`;

  // A new query starts the highlight at the top again.
  if (seenQuery !== query) {
    setSeenQuery(query);
    setActive(0);
  }

  // `q` matches the menu; `term` (as typed, spaces collapsed) goes to the server.
  const q = normalize(query);
  const term = query.trim().replace(/\s+/g, " ");
  const searching = term.length >= 2;

  useEffect(() => {
    if (!searching) return;
    // Set to false when the query changes again or the panel closes: an
    // answer that arrives after that belongs to an older query.
    let current = true;
    const timer = window.setTimeout(() => {
      void adminApi<SearchAnswer>(`/search?q=${encodeURIComponent(term)}`).then((result) => {
        if (!current) return;
        const groups = result.ok && Array.isArray(result.data?.groups) ? result.data.groups : [];
        setResults({ term, groups });
      });
    }, 200);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [term, searching]);

  const groups: OptionGroup[] = menuGroups(can, q);
  // The last answer stays on screen while the next one loads, so the list
  // does not blink on every key.
  if (searching && results) {
    for (const group of results.groups) {
      const items = Array.isArray(group.items) ? group.items : [];
      if (items.length === 0) continue;
      groups.push({
        key: `search:${group.type}`,
        label: group.label,
        options: items.map((item) => ({
          key: `search:${group.type}:${item.id}`,
          title: item.title,
          subtitle: item.subtitle,
          href: item.href,
          icon: TYPE_ICON[group.type] ?? null,
        })),
      });
    }
  }
  const options = groups.flatMap((group) => group.options);
  const activeIndex = options.length ? Math.min(active, options.length - 1) : -1;
  const loading = searching && results?.term !== term;

  useEffect(() => {
    if (!keyboardMove.current || activeIndex < 0) return;
    keyboardMove.current = false;
    document.getElementById(`${idPrefix}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, idPrefix]);

  const go = (option: Option, newTab = false) => {
    if (newTab) {
      window.open(option.href, "_blank", "noopener");
      return;
    }
    closePalette();
    router.push(option.href);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length === 0) return;
      keyboardMove.current = true;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + options.length) % options.length);
      return;
    }
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) go(option, event.ctrlKey || event.metaKey);
    }
  };

  // Where each group's options start in the flat list the arrows walk.
  const offsets: number[] = [];
  let total = 0;
  for (const group of groups) {
    offsets.push(total);
    total += group.options.length;
  }
  const status = loading
    ? "Шукаємо"
    : options.length
      ? `Знайдено: ${options.length}`
      : q
        ? "Нічого не знайдено"
        : "";

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-stroke-subtle pl-5 pr-3 transition-colors duration-200 focus-within:border-brand motion-reduce:transition-none">
        <MagnifyingGlassIcon aria-hidden className="size-6 shrink-0 text-neutral-500" strokeWidth={1.7} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Пошук по панелі"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Розділ, замовлення, товар..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] leading-6 text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        {loading && <Spinner className="text-neutral-400" />}
        <button
          type="button"
          aria-label="Закрити пошук"
          onClick={closePalette}
          className={cx(
            "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[12px] font-semibold leading-none text-neutral-500",
            "transition-colors duration-200 hover:bg-bg-subtle hover:text-neutral-900 motion-reduce:transition-none",
            "min-[640px]:h-8 min-[640px]:w-auto min-[640px]:px-2.5",
            FOCUS_RING,
          )}
        >
          {/* Phones have no Escape key: a cross there, the key's name from 640. */}
          <XMarkIcon aria-hidden className="size-6 min-[640px]:hidden" strokeWidth={1.7} />
          <span aria-hidden className="hidden min-[640px]:inline">
            Esc
          </span>
        </button>
      </div>

      <div id={listId} role="listbox" aria-label="Результати пошуку" className="admin-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {groups.map((group, groupIndex) => {
          const headingId = `${idPrefix}-${group.key}`;
          return (
            <div key={group.key} role="group" aria-labelledby={headingId} className="pb-1">
              <div id={headingId} role="presentation" className={cx(TEXT.caption, "px-3 pb-1.5 pt-2.5")}>
                {group.label}
              </div>
              {group.options.map((option, optionIndex) => {
                const mine = offsets[groupIndex] + optionIndex;
                const on = mine === activeIndex;
                return (
                  <div
                    key={option.key}
                    id={optionId(mine)}
                    role="option"
                    aria-selected={on}
                    onMouseMove={() => {
                      if (activeIndex !== mine) setActive(mine);
                    }}
                    // Keep the focus in the input.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => go(option, event.ctrlKey || event.metaKey)}
                    className={cx(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition-colors duration-150 motion-reduce:transition-none",
                      on && "bg-bg-cabinet",
                    )}
                  >
                    <span
                      className={cx(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 motion-reduce:transition-none",
                        on ? "bg-brand text-white" : "bg-bg-cabinet text-neutral-600",
                      )}
                    >
                      {option.icon ? (
                        <NavIcon name={option.icon} className="size-[18px]" />
                      ) : (
                        <DocumentTextIcon aria-hidden className="size-[18px]" strokeWidth={1.7} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold leading-5 text-neutral-900">{option.title}</span>
                      {option.subtitle && <span className="block truncate text-[12px] leading-4 text-neutral-500">{option.subtitle}</span>}
                    </span>
                    {on && <ArrowTurnDownLeftIcon aria-hidden className="hidden size-4 shrink-0 text-neutral-500 min-[640px]:block" strokeWidth={1.7} />}
                  </div>
                );
              })}
            </div>
          );
        })}

        {options.length === 0 && q && !loading && (
          <div className="px-6 py-10 text-center">
            <p className={TEXT.cardTitle}>Нічого не знайдено</p>
            <p className={cx(TEXT.muted, "mx-auto mt-1.5 max-w-[360px]")}>
              Спробуйте інше слово: номер замовлення, назву товару, e-mail або телефон клієнта.
            </p>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <div className="hidden h-11 shrink-0 items-center gap-5 border-t border-stroke-subtle px-5 text-[12px] font-medium leading-4 text-neutral-500 min-[640px]:flex">
        <span className="flex items-center gap-1.5">
          <Kbd>
            <ArrowUpIcon aria-hidden className="size-3" strokeWidth={2.2} />
          </Kbd>
          <Kbd>
            <ArrowDownIcon aria-hidden className="size-3" strokeWidth={2.2} />
          </Kbd>
          вибрати
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Enter</Kbd>
          відкрити
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Ctrl</Kbd>
          <Kbd>Enter</Kbd>
          у новій вкладці
        </span>
        {loading && <span className="ml-auto">Шукаємо...</span>}
      </div>
    </>
  );
}

const EXIT_MS = 300;

const CARD =
  "relative flex max-h-[calc(100dvh-24px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[28px] bg-white " +
  "transition-[opacity,translate,scale] duration-300 motion-reduce:transition-none " +
  "starting:-translate-y-2 starting:scale-[0.98] starting:opacity-0 " +
  "min-[640px]:max-h-[min(600px,calc(100dvh-20vh))]";

export function CommandPalette() {
  const open = usePaletteOpen();
  const ready = useClientReady();
  const mounted = usePresence(open, EXIT_MS);
  const box = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useModalLayer(open, { onClose: closePalette, containerRef: box, initialFocusRef: inputRef });

  // The shortcuts work on every panel page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      // `code`, not `key`: Ctrl+K on the Ukrainian layout types "л".
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === "KeyK") {
        event.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditing(event.target)) {
        // Not over a dialog: "/" there may be meant for it.
        if (paletteOpen || hasOpenLayer()) return;
        event.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || !mounted) return null;

  return createPortal(
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label="Пошук по панелі"
      tabIndex={-1}
      data-admin-layer=""
      inert={!open}
      className={cx(
        "fixed inset-0 flex items-start justify-center px-3 pt-3 outline-none min-[640px]:px-6 min-[640px]:pt-[12vh]",
        Z.palette,
        !open && "pointer-events-none",
      )}
    >
      <div
        aria-hidden
        onClick={closePalette}
        className={cx(
          "absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none starting:opacity-0",
          SCRIM,
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cx(
          CARD,
          EASE_OUT,
          LIFT_SHADOW,
          open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        <PalettePanel inputRef={inputRef} />
      </div>
    </div>,
    adminRoot(),
  );
}

// --- Trigger -----------------------------------------------------------------------

const noopSubscribe = () => () => {};
const CMD = String.fromCharCode(0x2318);

// The search pill of the top bar (a round magnifier on phones).
//
//   <AdminShell slots={{ search: <PaletteTrigger />, layers: <>...<CommandPalette /></> }} />
export function PaletteTrigger({ className }: { className?: string }) {
  const mac = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Пошук по панелі"
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K /"
      className={cx(
        "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-bg-cabinet text-neutral-500",
        "transition-colors duration-200 hover:bg-button-disabled hover:text-neutral-900 motion-reduce:transition-none",
        "min-[640px]:w-full min-[640px]:max-w-[360px] min-[640px]:justify-start min-[640px]:gap-2.5 min-[640px]:pl-4 min-[640px]:pr-2",
        FOCUS_RING,
        className,
      )}
    >
      <MagnifyingGlassIcon aria-hidden className="size-5 shrink-0" strokeWidth={1.7} />
      <span className="hidden min-w-0 flex-1 truncate text-left text-[14px] font-medium leading-5 min-[640px]:block">Пошук по панелі</span>
      <kbd className="hidden h-6 shrink-0 items-center rounded-full bg-white px-2 font-sans text-[12px] font-semibold leading-none text-neutral-500 min-[640px]:inline-flex">
        {mac ? `${CMD} K` : "Ctrl K"}
      </kbd>
    </button>
  );
}
