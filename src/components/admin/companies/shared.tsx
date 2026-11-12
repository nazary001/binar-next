"use client";

import { useSyncExternalStore } from "react";
import type { ContractStatus, CounterpartyStatus } from "@/components/platform/profile/data";
import type { ApiFailure } from "../lib/api";
import { countOf, cx, formatMoney } from "../lib/format";
import { Badge, type BadgeSize } from "../ui/Badge";
import { TONES, type Tone } from "../ui/tokens";
import { COMPANY_FIELD_REASONS, CONTRACT_STATUSES, COUNTERPARTY_STATUSES, LEDGER_DOC_TYPES, PAYMENT_TERMS } from "./types";

// Small pieces the screens of the companies section share: tones and
// labels of the statuses, the cabinet badge, field errors of a "fields"
// refusal, the sentences of the "in-use" refusals and a minute clock.

export const COUNTERPARTY_TONE: Record<CounterpartyStatus, Tone> = {
  active: "green",
  inactive: "neutral",
  // The partner's own new rows wait for the manager's check.
  review: "amber",
};

export const CONTRACT_TONE: Record<ContractStatus, Tone> = {
  active: "green",
  completed: "neutral",
  review: "amber",
};

export const COUNTERPARTY_OPTIONS = COUNTERPARTY_STATUSES.map((status) => ({ ...status, tone: COUNTERPARTY_TONE[status.value] }));
export const CONTRACT_OPTIONS = CONTRACT_STATUSES.map((status) => ({ ...status, tone: CONTRACT_TONE[status.value] }));

export function labelOf<T extends string>(list: readonly { value: T; label: string }[], value: string | null | undefined): string {
  return list.find((item) => item.value === value)?.label ?? (value || "-");
}

export const docTypeLabel = (value: string) => labelOf(LEDGER_DOC_TYPES, value);
export const paymentTermsLabel = (value: string | null) => (value ? labelOf(PAYMENT_TERMS, value) : "-");

const PERCENT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 });

// "8,4 %"
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `${PERCENT.format(value)} %`;
}

// The partner cabinet of a company: on (green) or switched off (red).
export function CabinetBadge({ active, size = "sm", long = false }: { active: boolean; size?: BadgeSize; long?: boolean }) {
  return (
    <Badge tone={active ? "green" : "red"} dot size={size}>
      {long ? (active ? "Кабінет увімкнено" : "Кабінет вимкнено") : active ? "Увімкнено" : "Вимкнено"}
    </Badge>
  );
}

// The open balance of a company, red with the overdue part under it when
// some of it is overdue.
export function BalanceText({ balance, overdue, align = "right" }: { balance: number; overdue: number; align?: "left" | "right" }) {
  const money = (value: number) => formatMoney(value, { whole: true });
  return (
    <span className={cx("flex flex-col whitespace-nowrap tabular-nums", align === "right" ? "items-end" : "items-start")}>
      <span className={cx("font-semibold", balance > 0 ? "text-neutral-900" : "text-neutral-400")} style={overdue > 0 ? { color: TONES.red.text } : undefined}>
        {money(balance)}
      </span>
      {overdue > 0 && (
        <span className="text-[12px] font-medium leading-4" style={{ color: TONES.red.text }}>
          прострочено {money(overdue)}
        </span>
      )}
    </span>
  );
}

// The field errors of a { error: "fields", fields } refusal, as the
// sentences shown under the fields. `prefix` keeps only the keys under it
// ("company." for a nested body).
export function fieldErrors(failure: ApiFailure, own: Record<string, string> = {}): Record<string, string> {
  if (failure.error !== "fields") return {};
  const raw = failure.data.fields;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, reason] of Object.entries(raw as Record<string, unknown>)) {
    const code = String(reason);
    out[key] = own[`${key}:${code}`] ?? COMPANY_FIELD_REASONS[code] ?? "Перевірте це поле";
  }
  return out;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// Why a company cannot be removed, from the counts of the 409 "in-use".
export function companyInUseMessage(data: Record<string, unknown>): string {
  const parts = [
    count(data.users) > 0 && countOf(count(data.users), ["акаунт", "акаунти", "акаунтів"]),
    count(data.orders) > 0 && countOf(count(data.orders), ["замовлення", "замовлення", "замовлень"]),
    count(data.returns) > 0 && countOf(count(data.returns), ["повернення", "повернення", "повернень"]),
    count(data.ledger) > 0 && countOf(count(data.ledger), ["рядок розрахунків", "рядки розрахунків", "рядків розрахунків"]),
  ].filter(Boolean);
  const what = parts.length > 0 ? `у неї є ${parts.join(", ")}` : "на неї посилаються інші записи";
  return `Компанію не можна видалити: ${what}. Щоб закрити доступ, вимкніть кабінет.`;
}

export function counterpartyInUseMessage(data: Record<string, unknown>): string {
  const parts = [
    count(data.orders) > 0 && `його назва стоїть у ${countOf(count(data.orders), ["замовленні", "замовленнях", "замовленнях"])}`,
    count(data.ledger) > 0 && `на нього посилаються ${countOf(count(data.ledger), ["рядок", "рядки", "рядків"])} розрахунків`,
  ].filter(Boolean);
  const why = parts.length > 0 ? parts.join(", а ") : "на нього посилаються інші записи";
  return `Юридичну особу не можна видалити: ${why}. Позначте її як «Не активний».`;
}

export function contractInUseMessage(data: Record<string, unknown>): string {
  const rows = count(data.ledger);
  const why = rows > 0 ? `на нього посилаються ${countOf(rows, ["рядок", "рядки", "рядків"])} взаєморозрахунків` : "на нього посилаються інші записи";
  return `Договір не можна видалити: ${why}. Позначте його як «Завершений».`;
}

// A clock that ticks once a minute (for "ще 23 год" of an invitation).
// The server snapshot is 0: nothing time-based is rendered on the server.
function subscribeMinute(callback: () => void): () => void {
  const id = window.setInterval(callback, 60_000);
  return () => window.clearInterval(id);
}

export function useMinuteClock(): number {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0,
  );
}

// "ЄДРПОУ 12345678, Київ" (or a quiet "Без реквізитів").
export function companyLine(edrpou: string, city: string): string {
  return [edrpou && `ЄДРПОУ ${edrpou}`, city].filter(Boolean).join(", ") || "Без реквізитів";
}

// 8 digits (ЄДРПОУ) or 10 (ІПН); empty is allowed where the code is optional.
export function codeOk(value: string): boolean {
  return /^(\d{8}|\d{10})$/.test(value.trim());
}
