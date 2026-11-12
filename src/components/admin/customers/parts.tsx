"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useSyncExternalStore } from "react";
import type { ApiFailure } from "../lib/api";
import { countOf, cx, formatPhone } from "../lib/format";
import { CopyButton } from "../ui/KeyValue";
import { TEXT, TONES } from "../ui/tokens";
import { ACCESS_ROLES, CUSTOMER_ERRORS, FIELD_REASONS, type AccessRole, type CustomerRow } from "./types";

// Small pieces the three screens of the accounts section share.

// --- a clock for "5 хв тому" ---------------------------------------------------

// One minute clock for every relative time on screen. Read through
// useSyncExternalStore, so no component calls Date.now() while rendering.
let now = 0;
const clockListeners = new Set<() => void>();
let clockTimer: number | undefined;

function subscribeClock(listener: () => void): () => void {
  clockListeners.add(listener);
  if (clockTimer === undefined) {
    now = Date.now();
    clockTimer = window.setInterval(() => {
      now = Date.now();
      for (const notify of [...clockListeners]) notify();
    }, 60_000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== undefined) {
      window.clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

function readClock(): number {
  if (now === 0) now = Date.now();
  return now;
}

// 0 on the server: the screens load their data in the browser, so a
// relative time is never rendered there.
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, readClock, () => 0);
}

// --- words ---------------------------------------------------------------------

// The login as people read it: a phone number spaced, an e-mail as typed.
export function loginText(login: string): string {
  return /^\d{10}$/.test(login) ? formatPhone(login) : login;
}

// A sign-in identifier of `loginKeys` in plain words.
export function loginKeyText(key: string): string {
  if (key.startsWith("dev:")) return "тестовий вхід сайту";
  return loginText(key);
}

const ROLE_LABELS = new Map<string, string>(ACCESS_ROLES.map((role) => [role.value, role.label]));

export function roleLabel(role: AccessRole | null): string {
  return role ? (ROLE_LABELS.get(role) ?? role) : "";
}

export function roleHint(role: AccessRole | null): string {
  return ACCESS_ROLES.find((entry) => entry.value === role)?.hint ?? "";
}

// The name of an account for headings and sentences.
export function accountName(row: Pick<CustomerRow, "name" | "login">): string {
  return row.name || loginText(row.login) || "Без імені";
}

// Why a delete is refused when it would erase order history, with the
// counts the API sends (or the card's own order count before asking).
export function hasOrdersText(failure: ApiFailure | null, ordersCount: number): string {
  const orders = failure ? Number(failure.data.orders) || 0 : ordersCount;
  const returns = failure ? Number(failure.data.returns) || 0 : 0;
  const parts = [
    orders > 0 ? countOf(orders, ["замовлення", "замовлення", "замовлень"]) : "",
    returns > 0 ? countOf(returns, ["повернення", "повернення", "повернень"]) : "",
  ].filter(Boolean);
  const what = parts.length > 0 ? parts.join(" і ") : "замовлення або повернення";
  return `Акаунт має ${what}: їхня історія має зберегтися, тому акаунт не можна видалити.`;
}

// Field errors of a { error: "fields", fields } refusal, in the words of
// FIELD_REASONS; `own` gives a field a more exact sentence for a reason
// ({ login: { invalid: "..." } }) and `rename` maps API keys to form keys.
export function fieldErrors(
  failure: ApiFailure,
  own: Record<string, Record<string, string>> = {},
  rename: Record<string, string> = {},
): Record<string, string> {
  if (failure.error !== "fields") return {};
  const raw = failure.data.fields;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, reason] of Object.entries(raw as Record<string, unknown>)) {
    const code = String(reason);
    const field = rename[key] ?? key;
    out[field] = own[key]?.[code] ?? FIELD_REASONS[code] ?? FIELD_REASONS.invalid;
  }
  return out;
}

export { CUSTOMER_ERRORS };

// --- a small tag for demo and test accounts ------------------------------------

export function AccountTag({ row, className }: { row: Pick<CustomerRow, "seed" | "test">; className?: string }) {
  if (!row.seed && !row.test) return null;
  const label = row.seed ? "Демо" : "Тестовий";
  const title = row.seed
    ? "Демо-акаунт сайту: повторне заповнення демо-даних перезапише зміни"
    : "Створено тестовим режимом сайту";
  return (
    <span
      title={title}
      className={cx(
        "inline-flex h-5 shrink-0 items-center rounded-full border border-stroke-subtle px-1.5 text-[11px] font-medium leading-none text-neutral-500",
        className,
      )}
    >
      {label}
    </span>
  );
}

// --- the one-time password panel -------------------------------------------------

// The login and a freshly generated password, each with a copy button, and
// the warning that the password will not be shown again.
export function OneTimeSecret({ login, password }: { login: string; password: string }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col divide-y divide-stroke-subtle rounded-2xl bg-bg-subtle px-4">
        <div className="flex min-w-0 flex-col gap-1 py-3">
          <dt className={TEXT.caption}>Логін</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span className={cx(TEXT.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} data-testid="secret-login">
              {loginText(login)}
            </span>
            <CopyButton text={login} label="Логін" />
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1 py-3">
          <dt className={TEXT.caption}>Пароль</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span
              className="min-w-0 text-[18px] font-semibold leading-7 tracking-[0.04em] text-neutral-900 tabular-nums [overflow-wrap:anywhere]"
              data-testid="secret-password"
            >
              {password}
            </span>
            <CopyButton text={password} label="Пароль" />
          </dd>
        </div>
      </dl>
      <p
        className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-[18px]"
        style={{ backgroundColor: TONES.amber.bg, color: TONES.amber.text }}
      >
        <ExclamationTriangleIcon aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.8} />
        <span>
          Пароль показано один раз і ніде не збережено у відкритому вигляді. Скопіюйте його й передайте людині зараз: після закриття
          вікна його вже не можна буде подивитися.
        </span>
      </p>
    </div>
  );
}
