import "server-only";
import { openSecret } from "@/server/admin/secrets";
import { getSettings } from "@/server/admin/settings";
import type { Actor } from "@/server/db/collections";
import { NpError, notConfigured } from "./errors";
import { logNpExchange } from "./log";

// The one door to the Nova Poshta API 2.0 (audit/admin/understand/nova-poshta.md).
//
//   const { data } = await npCall<Row>("AddressGeneral", "getWarehouses", { CityRef, Limit: "50" }, { key: "none" });
//
// - POST https://api.novaposhta.ua/v2.0/json/ with { apiKey, modelName,
//   calledMethod, methodProperties }. The carrier answers HTTP 200 for most
//   of its refusals (401 for a malformed key), so success is read from the
//   body (`success`, and the warnings: an unknown model fails with a
//   warning only).
// - The key: "required" (counterparties, waybills: the stored key or a
//   not-configured error before anything is sent), "optional" (the stored
//   key when there is one), "none" (directory methods: an expired key makes
//   even those fail, so they never carry it). `apiKey` passes a key
//   explicitly (testing a key that is being typed in).
// - 12 s timeout; one retry on a transport error, except for write calls
//   (`retry: false`): a save that timed out may have been created, and a
//   second one would be a duplicate parcel.
// - Write calls (`write: true`) and every failure of a call that was sent
//   are written to exchange_log. The key is never logged and never part of
//   an error.
// - The carrier sends numbers as strings ("Number":"1"); callers coerce
//   them with npNumber / npString.
// - setNpTransport(fn) replaces the network (the audit scripts play the
//   carrier with it); null restores the real one.

export const NP_API_URL = "https://api.novaposhta.ua/v2.0/json/";
const DEFAULT_TIMEOUT_MS = 12_000;

// What goes over the wire.
export type NpRequest = {
  apiKey: string;
  modelName: string;
  calledMethod: string;
  methodProperties: Record<string, unknown>;
};

// The carrier's envelope.
export type NpEnvelope<T> = {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  info: unknown;
  errorCodes: string[];
  warningCodes: string[];
};

// Sends one request and resolves with the parsed body. Throwing (or
// rejecting) means "no answer": a transport error.
export type NpTransport = (request: NpRequest, signal: AbortSignal) => Promise<unknown>;

// The carrier's own envelope is read whatever the HTTP status: a key that
// is not 32 hex characters is answered HTTP 401 with { success: false,
// errors: ["API key incorrect"] } (seen live 2026-11-12). Only an answer
// that is not such an envelope is a transport error.
export const fetchTransport: NpTransport = async (request, signal) => {
  const response = await fetch(NP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json" },
    body: JSON.stringify(request),
    signal,
    cache: "no-store",
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const envelope = body !== null && typeof body === "object" && typeof (body as { success?: unknown }).success === "boolean";
  if (!envelope) throw new Error(`HTTP ${response.status}`);
  return body;
};

let transport: NpTransport = fetchTransport;

export function setNpTransport(fn: NpTransport | null): void {
  transport = fn ?? fetchTransport;
}

export type NpKeyMode = "required" | "optional" | "none";

export type NpCallOptions = {
  key?: NpKeyMode;
  // An explicit key (wins over `key`).
  apiKey?: string;
  timeoutMs?: number;
  // One more attempt after a transport error (default true).
  retry?: boolean;
  // A call that changes something at the carrier: journalled on success too.
  write?: boolean;
  // For the journal.
  entity?: string;
  actor?: Actor | null;
  subject?: string | null;
};

export type NpResult<T> = { data: T[]; warnings: string[]; warningCodes: string[]; info: unknown };

// "Counterparty.getCounterparties": missing key / invalid or expired key.
const AUTH_CODES = new Set(["20000101582", "20000201204"]);

// The stored key, opened; null when there is none or it cannot be opened
// (the server's sealing key changed).
export async function storedNpKey(): Promise<string | null> {
  const settings = await getSettings("novaPoshta");
  return openSecret(settings.apiKeySealed);
}

async function resolveKey(options: NpCallOptions): Promise<string> {
  if (options.apiKey !== undefined) return options.apiKey;
  const mode = options.key ?? "none";
  if (mode === "none") return "";
  const key = await storedNpKey();
  if (key) return key;
  if (mode === "required") throw notConfigured(["apiKey"]);
  return "";
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function codesOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function entityOf(modelName: string): string {
  if (modelName.startsWith("InternetDocument")) return "waybill";
  if (modelName.startsWith("TrackingDocument")) return "tracking";
  if (modelName.startsWith("Counterparty") || modelName.startsWith("ContactPerson")) return "counterparty";
  if (modelName.startsWith("Address")) return "directory";
  return modelName.toLowerCase().slice(0, 40);
}

// Reads the envelope; throws NpError for a refusal.
function readEnvelope<T>(body: unknown, method: string): NpResult<T> {
  if (body === null || typeof body !== "object" || typeof (body as { success?: unknown }).success !== "boolean") {
    throw new NpError("transport", "Unexpected answer of the carrier", [], method);
  }
  const envelope = body as Partial<NpEnvelope<T>>;
  const errors = strings(envelope.errors);
  const warnings = strings(envelope.warnings);
  const errorCodes = codesOf(envelope.errorCodes);
  if (!envelope.success) {
    const message = [...errors, ...(errors.length ? [] : warnings)].join("; ") || "Unknown error";
    const auth = errorCodes.some((code) => AUTH_CODES.has(code)) || /api key|user is undefined/i.test(message);
    const kind = auth ? "auth" : message === "Data is invalid" ? "validation" : "api";
    throw new NpError(kind, message, errorCodes, method);
  }
  return {
    data: Array.isArray(envelope.data) ? envelope.data : [],
    warnings,
    warningCodes: codesOf(envelope.warningCodes),
    info: envelope.info ?? null,
  };
}

async function attempt(request: NpRequest, timeoutMs: number, method: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // The race also covers a transport that ignores the signal.
    return await Promise.race([
      transport(request, controller.signal),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(new Error("timeout")), { once: true });
      }),
    ]);
  } catch {
    // The underlying error is not passed on: a fetch error can name the
    // address and the cause, and nothing about it helps the panel.
    throw new NpError("transport", controller.signal.aborted ? "Timeout" : "Network error", [], method);
  } finally {
    clearTimeout(timer);
  }
}

export async function npCall<T = Record<string, unknown>>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown> = {},
  options: NpCallOptions = {},
): Promise<NpResult<T>> {
  const method = `${modelName}.${calledMethod}`;
  const entity = options.entity ?? entityOf(modelName);
  const started = Date.now();
  const journal = (status: "ok" | "error", error: string | null) =>
    logNpExchange({
      entity,
      action: method,
      status,
      durationMs: Date.now() - started,
      actor: options.actor ?? null,
      error,
      subject: options.subject ?? null,
      created: status === "ok" && calledMethod === "save" ? 1 : 0,
      updated: status === "ok" && calledMethod !== "save" ? 1 : 0,
    });

  // A missing key is not journalled: nothing was sent, and a screen that
  // asks before the key is set would fill the journal with it.
  const apiKey = await resolveKey(options);
  const request: NpRequest = { apiKey, modelName, calledMethod, methodProperties };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const tries = options.retry === false ? 1 : 2;
  try {
    let body: unknown;
    for (let k = 1; ; k += 1) {
      try {
        body = await attempt(request, timeoutMs, method);
        break;
      } catch (error) {
        if (k >= tries) throw error;
      }
    }
    const result = readEnvelope<T>(body, method);
    if (options.write) await journal("ok", null);
    return result;
  } catch (error) {
    const message = error instanceof NpError ? `${error.kind}: ${error.message}` : "Unexpected failure";
    await journal("error", message);
    throw error instanceof NpError ? error : new NpError("transport", "Unexpected failure", [], method);
  }
}

// --- coercion -------------------------------------------------------------------

// "12.5" / 12.5 -> 12.5; "", null, garbage -> null.
export function npNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function npString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

// A carrier date ("14.11.2026", "14.11.2026 18:00:00", "2026-11-14 18:00:00")
// as "YYYY-MM-DD"; null when it is none of those.
export function npDay(value: unknown): string | null {
  const text = npString(value);
  const dotted = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(text);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso && iso[1] !== "0000") return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

const KYIV_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Kyiv",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// The carrier's DateTime: "dd.mm.yyyy" in Kyiv.
export function npDateOf(now: Date = new Date()): string {
  const parts = KYIV_PARTS.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")}`;
}

// A Ukrainian phone as the carrier wants it: 380XXXXXXXXX; null when it is
// not a Ukrainian mobile or landline number.
export function npPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 9) digits = `380${digits}`;
  else if (digits.length === 10 && digits.startsWith("0")) digits = `38${digits}`;
  else if (digits.length === 11 && digits.startsWith("80")) digits = `3${digits}`;
  return /^380[3-9]\d{8}$/.test(digits) ? digits : null;
}

// A carrier ref (a GUID).
export const NP_REF = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isNpRef(value: string): boolean {
  return NP_REF.test(value);
}
