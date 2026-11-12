"use client";

import { useSyncExternalStore } from "react";
import { errorMessage, type ApiFailure } from "../lib/api";
import { formatDateTime, formatNumber, formatRelative } from "../lib/format";
import { NP_ERROR_MESSAGES, type CarrierKey, type ParcelDimensions, type ServiceKind, type ShipmentParamsDto } from "./types";

// What the screens of the delivery section share: the wording of the
// carrier's refusals, the names of what an unconfigured integration lacks,
// the parcel line, and a clock for "Оновлено 5 хв тому".

// The panel writes the carrier as the rest of the panel does ("Нова Пошта").
export const CARRIER_NAME: Record<CarrierKey, string> = {
  "nova-poshta": "Нова Пошта",
  other: "Інший перевізник",
  pickup: "Самовивіз",
};

// The three ways a parcel reaches the recipient, as the drawer offers them.
export const SERVICE_KIND_CHOICES: { value: ServiceKind; label: string }[] = [
  { value: "branch", label: "Відділення" },
  { value: "postomat", label: "Поштомат" },
  { value: "address", label: "Адреса" },
];

// Sentences for the codes the shipping routes answer. A refusal of the
// carrier carries its own wording in `message`: it is shown after ours, so
// the manager sees what exactly the carrier did not accept.
export const SHIPPING_ERRORS: Record<string, string> = {
  ...NP_ERROR_MESSAGES,
  "np-not-configured": "Нову Пошту ще не налаштовано: накладну створити не можна. Перевірте розділ «Інтеграції».",
  exists: "У замовлення вже є накладна. Оновіть сторінку.",
  state: "Цю дію з накладною зараз виконати не можна: її стан змінився. Оновіть сторінку.",
};

export function shippingError(failure: ApiFailure, own: Record<string, string> = {}): string {
  const base = errorMessage(failure, { ...SHIPPING_ERRORS, ...own });
  const carrier = typeof failure.data?.message === "string" ? failure.data.message.trim() : "";
  if ((failure.error === "np-error" || failure.error === "np-auth") && carrier) return `${base} Відповідь перевізника: «${carrier}».`;
  return base;
}

// What NpReadiness.missing means, in words a manager understands. The
// sender profile is one thing to fill in on the settings page, so its
// fields are named together.
const MISSING_LABELS: Record<string, string> = {
  enabled: "інтеграцію вимкнено",
  apiKey: "не додано ключ API",
};

const SENDER_PARTS: Record<string, string> = {
  "sender.counterpartyRef": "відправник",
  "sender.contactRef": "контактна особа",
  "sender.phone": "телефон",
  "sender.cityRef": "місто",
  "sender.warehouseRef": "відділення",
};

export function missingText(missing: string[]): string {
  const parts = missing.filter((key) => MISSING_LABELS[key]).map((key) => MISSING_LABELS[key]);
  const sender = missing.filter((key) => SENDER_PARTS[key]).map((key) => SENDER_PARTS[key]);
  if (sender.length === Object.keys(SENDER_PARTS).length) parts.push("не заповнено профіль відправника");
  else if (sender.length > 0) parts.push(`у профілі відправника бракує: ${sender.join(", ")}`);
  if (parts.length === 0) return "";
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} і ${parts[parts.length - 1]}` : parts[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cm(value: number): string {
  return formatNumber(value);
}

export function dimensionsText(dimensions: ParcelDimensions | null | undefined): string {
  if (!dimensions) return "";
  return `${cm(dimensions.width)} x ${cm(dimensions.length)} x ${cm(dimensions.height)} см`;
}

const KG = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 3 });

export function weightText(kg: number): string {
  return `${KG.format(kg)} кг`;
}

function seatsText(seats: number): string {
  const n = Math.abs(seats) % 100;
  const last = n % 10;
  const word = n > 10 && n < 20 ? "місць" : last === 1 ? "місце" : last >= 2 && last <= 4 ? "місця" : "місць";
  return `${formatNumber(seats)} ${word}`;
}

// "2,5 кг, 1 місце, 20 x 30 x 10 см"
export function parcelText(params: ShipmentParamsDto | null): string {
  if (!params) return "";
  return [weightText(params.weight), seatsText(params.seats), dimensionsText(params.dimensions)].filter(Boolean).join(", ");
}

// --- a clock -----------------------------------------------------------------------

// One shared clock for relative times, ticking every 30 s while something
// shows it. Read through useSyncExternalStore, so render stays pure.
let nowValue = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === undefined) {
    timer = window.setInterval(() => {
      nowValue = Date.now();
      for (const fn of [...listeners]) fn();
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
      nowValue = 0;
    }
  };
}

function snapshot(): number {
  if (nowValue === 0) nowValue = Date.now();
  return nowValue;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}

// "5 хв тому" once the clock runs (the server render has no clock).
export function relativeTime(value: string | null, now: number): string {
  if (!value) return "-";
  return now > 0 ? formatRelative(value, now) : formatDateTime(value);
}
