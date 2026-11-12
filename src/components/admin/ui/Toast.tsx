"use client";

import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FocusEvent } from "react";
import { errorMessage, type ApiFailure } from "../lib/api";
import { cx } from "../lib/format";
import { remeasureStickyBars, useStickyBarLift } from "./stickyBars";
import { EASE_OUT, FOCUS_RING, LIFT_SHADOW, Z } from "./tokens";

// Short messages about what just happened, from anywhere in the panel:
//
//   toast.success("Зміни збережено");
//   toast.error("Не вдалося зберегти товар");
//   toast.info("Експорт готується, файл завантажиться сам");
//   toast.show({ tone: "success", title: "Замовлення скасовано", text: "Клієнт отримає лист.", action: { label: "Повернути", onClick: undo } });
//   const id = toast.show({ text: "Завантажуємо файли...", durationMs: null });  ...  toast.dismiss(id);
//
//   const result = await adminApi(`/orders/${id}`, { method: "PATCH", body });
//   if (!result.ok) return toastError(result, { state: "Замовлення вже відвантажено." });
//
// <ToastHost /> is rendered once by the shell. Toasts stack at the bottom
// right from 640 px and across the bottom on phones, the newest at the
// bottom, at most 4 at a time (the oldest leaves for a new one; the same
// message shown again replaces itself). Each closes after 4 s (errors and
// toasts with an action after 7 s; durationMs: null keeps it until
// closed); the countdown pauses while the pointer is over it or focus is
// in it. Errors are announced at once (role="alert"), the rest politely
// (role="status"). While a sticky bar (FormActions sticky, BulkBar) is on
// screen under the stack, the stack is raised above it, so a toast never
// covers "Зберегти зміни"; it settles back when the bar leaves.

export type ToastTone = "success" | "error" | "info";

export type ToastAction = { label: string; onClick: () => void };

export type ToastOptions = {
  tone?: ToastTone;
  title?: string;
  text: string;
  action?: ToastAction;
  // ms; null = until closed.
  durationMs?: number | null;
};

type ToastEntry = {
  id: number;
  tone: ToastTone;
  title?: string;
  text: string;
  action?: ToastAction;
  durationMs: number | null;
  leaving: boolean;
};

const MAX_VISIBLE = 4;
const LEAVE_MS = 240;
// After the pointer leaves, a toast stays at least this long.
const MIN_REST_MS = 1500;

let toasts: ToastEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: ToastEntry[] = [];

function emit(): void {
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Whether a <ToastHost /> is mounted (see hasConfirmHost in ConfirmDialog).
export function hasToastHost(): boolean {
  return listeners.size > 0;
}

function dismiss(id?: number): void {
  const leaving = new Set(toasts.filter((entry) => !entry.leaving && (id === undefined || entry.id === id)).map((entry) => entry.id));
  if (leaving.size === 0) return;
  toasts = toasts.map((entry) => (leaving.has(entry.id) ? { ...entry, leaving: true } : entry));
  emit();
  window.setTimeout(() => {
    toasts = toasts.filter((entry) => !leaving.has(entry.id));
    emit();
  }, LEAVE_MS);
}

function show(options: ToastOptions): number {
  const id = nextId++;
  if (typeof window === "undefined") return id;
  const tone = options.tone ?? "info";
  const durationMs =
    options.durationMs !== undefined ? options.durationMs : tone === "error" || options.action ? 7000 : 4000;
  // The same message again (a button pressed twice) replaces itself.
  for (const entry of toasts) {
    if (!entry.leaving && entry.tone === tone && entry.text === options.text && entry.title === options.title) dismiss(entry.id);
  }
  toasts = [...toasts, { id, tone, title: options.title, text: options.text, action: options.action, durationMs, leaving: false }];
  const live = toasts.filter((entry) => !entry.leaving);
  for (const old of live.slice(0, Math.max(0, live.length - MAX_VISIBLE))) dismiss(old.id);
  emit();
  return id;
}

type Extra = Omit<ToastOptions, "tone" | "text">;

export const toast = {
  show,
  success: (text: string, extra: Extra = {}) => show({ ...extra, tone: "success", text }),
  error: (text: string, extra: Extra = {}) => show({ ...extra, tone: "error", text }),
  info: (text: string, extra: Extra = {}) => show({ ...extra, tone: "info", text }),
  // Without an id: every toast on screen.
  dismiss,
};

// A refused API request as an error toast, in the words of lib/api.ts
// errorMessage (routes with their own codes pass the wording in `own`).
export function toastError(result: ApiFailure, own: Record<string, string> = {}): number {
  return toast.error(errorMessage(result, own));
}

const ICON = {
  success: { Icon: CheckCircleIcon, className: "text-[#27ae85]" },
  error: { Icon: ExclamationCircleIcon, className: "text-[#f26164]" },
  info: { Icon: InformationCircleIcon, className: "text-[#3d9fd6]" },
} as const;

// The panel's focus ring, its offset painted in the toast's colour.
const DARK_FOCUS = FOCUS_RING.replace("focus-visible:ring-offset-white", "focus-visible:ring-offset-[#2d2d2f]");

function ToastCard({ entry }: { entry: ToastEntry }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(entry.durationMs ?? 0);
  const paused = hovered || focused;

  useEffect(() => {
    if (entry.leaving || entry.durationMs === null || paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismiss(entry.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(MIN_REST_MS, remaining.current - (Date.now() - started));
    };
  }, [entry.id, entry.leaving, entry.durationMs, paused]);

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  const { Icon, className: iconClass } = ICON[entry.tone];

  return (
    // The row collapses while the toast leaves, so the stack closes up
    // smoothly instead of jumping.
    <div
      className={cx(
        "grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none",
        entry.leaving ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
      )}
      aria-hidden={entry.leaving || undefined}
    >
      <div className={cx("min-h-0 pt-2", entry.leaving && "overflow-hidden")}>
        <div
          role={entry.tone === "error" ? "alert" : "status"}
          aria-atomic="true"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={onBlur}
          className={cx(
            // py-2 + the 36-px close button centre it on the first text line.
            "pointer-events-auto flex items-start gap-3 rounded-[20px] bg-[#2d2d2f] py-2 pl-4 pr-2 text-white",
            "transition-[opacity,translate] duration-300 motion-reduce:transition-none starting:translate-y-2 starting:opacity-0",
            EASE_OUT,
            LIFT_SHADOW,
            entry.leaving && "pointer-events-none",
          )}
        >
          <Icon aria-hidden className={cx("mt-2 size-5 shrink-0", iconClass)} />
          <div className="min-w-0 flex-1 py-2">
            {entry.title && <p className="text-[14px] font-semibold leading-5 text-white">{entry.title}</p>}
            <p className={cx("text-[14px] leading-5 [overflow-wrap:anywhere]", entry.title ? "text-neutral-300" : "text-white")}>
              {entry.text}
            </p>
            {entry.action && (
              <button
                type="button"
                onClick={() => {
                  entry.action?.onClick();
                  dismiss(entry.id);
                }}
                className={cx(
                  "-mx-1 mt-1.5 cursor-pointer rounded-md px-1 text-[14px] font-semibold leading-5 text-white underline underline-offset-[3px]",
                  "transition-colors duration-200 hover:text-brand-soft motion-reduce:transition-none",
                  DARK_FOCUS,
                )}
              >
                {entry.action.label}
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Закрити сповіщення"
            onClick={() => dismiss(entry.id)}
            className={cx(
              "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400",
              "transition-colors duration-200 hover:bg-white/10 hover:text-white motion-reduce:transition-none",
              DARK_FOCUS,
            )}
          >
            <XMarkIcon aria-hidden className="size-5" strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastHost() {
  const list = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );
  // Raised above a sticky save bar or a selection bar while one is on
  // screen under the stack (ui/stickyBars.ts), so its buttons stay usable.
  const lift = useStickyBarLift(list.length > 0);
  // A taller or shorter stack may now reach a bar, or no longer.
  const watchSize = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => remeasureStickyBars());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  if (list.length === 0) return null;
  return (
    <div
      ref={watchSize}
      data-admin-toasts=""
      data-print-hide=""
      style={lift > 0 ? { translate: `0 -${lift}px` } : undefined}
      className={cx(
        "pointer-events-none fixed inset-x-0 bottom-0 flex flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))]",
        "min-[640px]:inset-x-auto min-[640px]:bottom-6 min-[640px]:right-6 min-[640px]:w-[380px] min-[640px]:px-0 min-[640px]:pb-0",
        "transition-[translate] duration-200 motion-reduce:transition-none print:hidden",
        EASE_OUT,
        Z.toast,
      )}
    >
      {list.map((entry) => (
        <ToastCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
