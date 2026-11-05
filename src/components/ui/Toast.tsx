"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { XMarkIcon } from "@/components/catalog/icons";

// One toast host for the whole site (system spec A23, TR-31): a #2d2d2f
// r24 pill 24 above the bottom edge (or 8 above a pinned StickyBar, read
// from --phone-bottom-bar), 14/20 white text, optional underlined action
// and a 44-px close. One toast at a time: the newest replaces the current
// one. Rules:
// - while a modal overlay is open (any visible, non-inert
//   [aria-modal="true"]) a new toast is queued and shown when the last
//   overlay closes, never painted under a z-60 sheet;
// - a route change drops the toasts created on the previous route, except
//   `keepOnNavigate` ones (they survive that one change);
// - a toast with an action defaults to no timeout + a close button (WCAG
//   2.2.1); every timer pauses while the toast holds focus or a pointer;
// - phone-only by default: callers fire it on any width and the host hides
//   phone-only toasts from 640 (the desktop layouts are frozen).
// DECISIONS O-16: no env(safe-area-inset-*) terms.

export const TOAST_COPY = {
  close: "Закрити сповіщення",
} as const;

// The toast pill itself (exported for the assortment notice, which keeps
// its own desktop identity and uses these classes below 640).
export const TOAST_CLASS =
  "pointer-events-auto flex w-full max-w-[342px] items-center gap-3 rounded-3xl bg-[#2d2d2f] px-6 py-3 text-[14px] leading-5 text-white transition-[opacity,translate] duration-300 motion-reduce:transition-none";

export type ToastInput =
  | string
  | {
      message: ReactNode;
      action?: { label: string; onClick: () => void };
      dismissible?: boolean;
      // Default 4000; default null (stays until dismissed) with an action.
      durationMs?: number | null;
      // Survives the next pathname change (wizard success, cancel request).
      keepOnNavigate?: boolean;
      // Default true: hidden from 640 (desktop frozen).
      phoneOnly?: boolean;
    };

type ToastItem = {
  id: number;
  message: ReactNode;
  action?: { label: string; onClick: () => void };
  dismissible: boolean;
  durationMs: number | null;
  keepOnNavigate: boolean;
  phoneOnly: boolean;
  path: string;
  leaving: boolean;
};

const DEFAULT_MS = 4000;
const EXIT_MS = 300;

let current: ToastItem | null = null;
let pending: ToastItem | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

// Timer of the current toast, paused while it holds focus or a pointer.
let timer: ReturnType<typeof setTimeout> | null = null;
let remaining = 0;
let startedAt = 0;
const holds = new Set<string>();

let observer: MutationObserver | null = null;

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const getSnapshot = () => current;
const getServerSnapshot = () => null;

// Rendered = has a box (not display:none itself or under a display:none
// ancestor, e.g. a desktop-hidden sheet). Element.checkVisibility ships in
// Chrome 105 / Safari 17.4, while Next 16 supports Safari 16.4+: older
// engines use the client-rects test, which answers the same question.
function rendered(el: HTMLElement): boolean {
  return typeof el.checkVisibility === "function" ? el.checkVisibility() : el.getClientRects().length > 0;
}

function overlayOpen(): boolean {
  if (typeof document === "undefined") return false;
  return [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')].some(
    (el) => !el.closest("[inert]") && rendered(el),
  );
}

function clearTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function runTimer() {
  clearTimer();
  if (!current || current.durationMs === null || current.leaving || holds.size > 0) return;
  const id = current.id;
  startedAt = Date.now();
  timer = setTimeout(() => dismissToast(id), remaining);
}

function display(t: ToastItem) {
  clearTimer();
  holds.clear();
  current = { ...t, leaving: false };
  remaining = t.durationMs ?? 0;
  emit();
  runTimer();
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
}

function flushPending() {
  if (!pending || overlayOpen()) return;
  const t = pending;
  pending = null;
  stopObserver();
  display(t);
}

function watchOverlays() {
  if (observer || typeof MutationObserver === "undefined") return;
  observer = new MutationObserver(() => flushPending());
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["inert", "aria-modal", "aria-hidden", "class", "style"],
  });
}

export function showToast(input: ToastInput): void {
  if (typeof window === "undefined") return;
  const o = typeof input === "string" ? { message: input } : input;
  const hasAction = Boolean(o.action);
  const t: ToastItem = {
    id: nextId++,
    message: o.message,
    action: o.action,
    dismissible: o.dismissible ?? hasAction,
    durationMs: o.durationMs !== undefined ? o.durationMs : hasAction ? null : DEFAULT_MS,
    keepOnNavigate: o.keepOnNavigate ?? false,
    phoneOnly: o.phoneOnly ?? true,
    path: window.location.pathname,
    leaving: false,
  };
  if (overlayOpen()) {
    pending = t;
    watchOverlays();
    return;
  }
  display(t);
}

export function dismissToast(id?: number): void {
  if (!current || (id !== undefined && current.id !== id) || current.leaving) return;
  clearTimer();
  const leavingId = current.id;
  current = { ...current, leaving: true };
  emit();
  setTimeout(() => {
    if (current && current.id === leavingId && current.leaving) {
      current = null;
      emit();
    }
  }, EXIT_MS);
}

function hold(reason: string, on: boolean) {
  if (!current) return;
  if (on) {
    if (holds.size === 0 && timer !== null) {
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
      clearTimer();
    }
    holds.add(reason);
  } else if (holds.delete(reason) && holds.size === 0) {
    runTimer();
  }
}

// Route change: drop what belongs to the previous route; keepOnNavigate
// toasts move to the new route once.
function onNavigate(pathname: string) {
  const carry = (t: ToastItem | null): ToastItem | null => {
    if (!t || t.path === pathname) return t;
    return t.keepOnNavigate ? { ...t, path: pathname, keepOnNavigate: false } : null;
  };
  const nextPending = carry(pending);
  if (nextPending !== pending) {
    pending = nextPending;
    if (!pending) stopObserver();
  }
  const next = carry(current);
  if (next !== current) {
    if (!next) clearTimer();
    current = next;
    emit();
  }
}

export function ToastHost(): React.JSX.Element {
  const toast = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();

  useEffect(() => {
    onNavigate(pathname);
  }, [pathname]);

  return (
    <div
      data-toast-host
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-6"
      style={{ bottom: "max(24px, calc(var(--phone-bottom-bar, 0px) + 8px))" }}
    >
      {toast && (
        <div
          key={toast.id}
          data-toast
          onFocus={() => hold("focus", true)}
          onBlur={() => hold("focus", false)}
          onPointerEnter={() => hold("pointer", true)}
          onPointerLeave={() => hold("pointer", false)}
          onPointerDown={() => hold("press", true)}
          onPointerUp={() => hold("press", false)}
          onPointerCancel={() => hold("press", false)}
          className={`${TOAST_CLASS} starting:translate-y-2 starting:opacity-0 ${
            toast.leaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          }${toast.phoneOnly ? " lg:hidden" : ""}`}
        >
          <div className="min-w-0 flex-1">{toast.message}</div>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                dismissToast(toast.id);
              }}
              className="-mx-2 -my-3 shrink-0 cursor-pointer px-2 py-3 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {toast.action.label}
            </button>
          )}
          {toast.dismissible && (
            <button
              type="button"
              aria-label={TOAST_COPY.close}
              onClick={() => dismissToast(toast.id)}
              className="-my-2.5 -mr-3 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <XMarkIcon className="size-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
