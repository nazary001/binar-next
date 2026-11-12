"use client";

import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { cx, formatDate } from "../lib/format";
import { Button } from "../ui/Button";
import { DateRange } from "../ui/DateInput";
import { Popover } from "../ui/Popover";
import { COLOR_TRANSITION, CONTROL, FOCUS_RING, FOCUS_RING_INSET, TEXT, TONES } from "../ui/tokens";
import { LEAD_OPEN_PARAM, LEAD_STATUSES, type LeadContact, type LeadStatus } from "./types";

// Small pieces of the form submissions inbox (/admin/leads) that the kit
// has no ready shape for: the address of the open submission, a ticking
// clock for "5 хв тому", the status as a segmented control, the period
// filter, a toggle chip, links styled as buttons for tel: / mailto:, and
// the plain words for where a submission came from.

// --- words ------------------------------------------------------------------

// The storefront pages that carry a form, by the names visitors see in
// the site's menu. Anything else is shown as its address.
const PAGE_NAMES: Record<string, string> = {
  "/": "Головна",
  "/hotels": "Усе для готелів",
  "/protect": "Засоби захисту",
  "/cleaning": "Прибирання",
  "/spivpratsya": "Співпраця",
};

export function pageName(source: string): string {
  const path = source.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return PAGE_NAMES[path] ?? path;
}

// Who sent it, in a few words (the drawer's title, the row's first line).
export function contactTitle(contact: LeadContact): string {
  return contact.name || contact.email || contact.phone || "Без імені";
}

// "Chrome, Windows" from a user agent; the raw text when it is not a
// browser we know (a script, a bot).
export function deviceOf(userAgent: string): string {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\/|Opera/.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : null;
  const system = /iPhone|iPad|iPod/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  if (!browser && !system) return userAgent.length > 80 ? `${userAgent.slice(0, 77)}...` : userAgent;
  const phone = /Mobile|iPhone|Android/.test(userAgent) ? ", телефон" : "";
  return [browser, system].filter(Boolean).join(", ") + phone;
}

// Digits for a tel: link ("+380 67 123 45 67" -> "+380671234567").
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

// --- clock ------------------------------------------------------------------

// A clock for relative times that ticks every 30 s, read through
// useSyncExternalStore so no component calls Date.now() while rendering;
// the server (and the first client render while hydrating) sees 0, which
// callers treat as "unknown" and show the date instead.

const TICK_MS = 30_000;
let now = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    timer = window.setInterval(() => {
      now = Date.now();
      for (const notify of [...listeners]) notify();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.clearInterval(timer);
  };
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribeClock,
    () => now,
    () => 0,
  );
}

// Whether the window is at least `px` wide (the table adds columns as room
// allows). The server and the hydrating render assume a wide screen.
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const subscribe = useCallback(
    (listener: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  );
}

// --- the open submission in the address bar ------------------------------------

// /admin/leads?id=<id> opens one submission in the drawer, so the panel's
// search, the journal and the e-mail notice can link to it and Back closes
// it. The address is changed with the browser's own history (Next keeps
// useSearchParams in step), so opening, closing and moving to the next one
// never wait for the server; the list's own parameters stay as they are.
export function useLeadAddress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const openId = search.get(LEAD_OPEN_PARAM);
  // Written and read only in event handlers.
  const pushed = useRef(false);

  const address = (params: URLSearchParams) => {
    const text = params.toString();
    return text ? `${pathname}?${text}` : pathname;
  };

  const open = (id: string) => {
    const next = new URLSearchParams(window.location.search);
    const had = next.has(LEAD_OPEN_PARAM);
    next.set(LEAD_OPEN_PARAM, id);
    if (had) {
      window.history.replaceState(null, "", address(next));
    } else {
      window.history.pushState(null, "", address(next));
      pushed.current = true;
    }
  };

  // Another submission in the open drawer (the arrows, the buttons).
  const replace = (id: string) => {
    const next = new URLSearchParams(window.location.search);
    next.set(LEAD_OPEN_PARAM, id);
    window.history.replaceState(null, "", address(next));
  };

  const close = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    const next = new URLSearchParams(window.location.search);
    next.delete(LEAD_OPEN_PARAM);
    window.history.replaceState(null, "", address(next));
  };

  return { openId, open, replace, close };
}

// --- status as a segmented control -------------------------------------------------

// The four statuses side by side in the kit's tab capsule, the chosen one a
// white pill with its tone's dot. A radio group: arrows move and choose,
// Tab enters on the chosen one. Each choice applies at once.
export function StatusSegments({
  value,
  onChange,
  disabled = false,
  labelledBy,
}: {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  disabled?: boolean;
  labelledBy?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = LEAD_STATUSES.findIndex((item) => item.value === value);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, at: number) => {
    const last = LEAD_STATUSES.length - 1;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = at === last ? 0 : at + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = at === 0 ? last : at - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next < 0) return;
    event.preventDefault();
    // The drawer's own arrows (next / previous submission) must not fire.
    event.stopPropagation();
    refs.current[next]?.focus();
    onChange(LEAD_STATUSES[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      className="grid w-full grid-cols-2 gap-0.5 rounded-[20px] bg-[#e8e8e9] p-1 min-[480px]:grid-cols-4 min-[480px]:rounded-full"
    >
      {LEAD_STATUSES.map((item, at) => {
        const checked = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[at] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (index < 0 && at === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => {
              if (!checked) onChange(item.value);
            }}
            onKeyDown={(event) => onKeyDown(event, at)}
            className={cx(
              "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-medium leading-[18px] motion-reduce:transition-none",
              COLOR_TRANSITION,
              FOCUS_RING_INSET,
              checked ? "bg-white text-neutral-900" : "text-neutral-600",
              disabled ? "cursor-not-allowed opacity-60" : !checked && "cursor-pointer hover:bg-white/60 hover:text-neutral-900",
            )}
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: checked ? TONES[item.tone].dot : "#a5a5a5" }}
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// --- filters ------------------------------------------------------------------------

// "Період": the day the submission came, from / to, with the kit's presets.
export function PeriodFilter({ from, to, onChange }: { from: string; to: string; onChange: (range: { from: string; to: string }) => void }) {
  const active = from !== "" || to !== "";
  const text = !active
    ? "Період"
    : from && to
      ? from === to
        ? formatDate(from)
        : `${formatDate(from)} - ${formatDate(to)}`
      : from
        ? `Від ${formatDate(from)}`
        : `До ${formatDate(to)}`;
  return (
    <Popover
      label="Період заявок"
      width={420}
      trigger={
        <Button variant="secondary" iconLeft={CalendarDaysIcon} iconRight={ChevronDownIcon}>
          {text}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <DateRange label="Дата заявки" from={from} to={to} onChange={onChange} presets clearable />
        {active && (
          <div className="border-t border-stroke-subtle pt-3">
            <Button variant="ghost" size="sm" onClick={() => onChange({ from: "", to: "" })}>
              За весь час
            </Button>
          </div>
        )}
      </div>
    </Popover>
  );
}

// A filter that is on or off (a pill, black when on), with an optional count.
export function ToggleChip({
  label,
  pressed,
  onToggle,
  count,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  count?: number | null;
}) {
  const counted = typeof count === "number" && count > 0;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cx(
        "inline-flex h-10 max-w-full shrink-0 cursor-pointer items-center gap-2 rounded-full border text-[14px] font-medium leading-5 motion-reduce:transition-none",
        counted ? "pl-4 pr-2" : "px-4",
        COLOR_TRANSITION,
        FOCUS_RING,
        pressed ? "border-neutral-900 bg-neutral-900 text-white" : "border-stroke-subtle bg-white text-neutral-800 hover:border-neutral-800",
      )}
    >
      <span className="truncate">{label}</span>
      {counted && (
        <span
          className={cx(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums",
            pressed ? "bg-white text-neutral-900" : "bg-neutral-100 text-neutral-700",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

// --- links that look like buttons -----------------------------------------------------

// tel: and mailto: open the phone or the mail program in place, so they are
// plain anchors (the kit's Button renders next/link, or a new tab with
// `external`) in the secondary button's look.
export function ActionLink({
  href,
  icon,
  children,
  label,
  className,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className={cx(
        "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border pl-[13px] pr-[17px] font-semibold",
        "border-neutral-800 bg-white text-neutral-900 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white motion-reduce:transition-none",
        "[&_svg]:size-5 [&_svg]:shrink-0",
        CONTROL.md,
        COLOR_TRANSITION,
        FOCUS_RING,
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}

// A text link to a phone number or an address (table cells, answers).
export function ContactLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cx(
        "rounded-sm underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900 hover:decoration-neutral-900 motion-reduce:transition-none",
        COLOR_TRANSITION,
        FOCUS_RING,
        className,
      )}
    >
      {children}
    </a>
  );
}

// A heading inside the drawer (a block of facts, the notes).
export function BlockTitle({ id, children, aside }: { id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <h3 id={id} className={TEXT.cardTitle}>
        {children}
      </h3>
      {aside}
    </div>
  );
}

// Writes text to the clipboard; the textarea route covers contexts
// without the async Clipboard API.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand("copy");
    area.remove();
    return done;
  } catch {
    return false;
  }
}
