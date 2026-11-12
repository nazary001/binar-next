import "server-only";
import type { BasPushOutcome } from "@/components/admin/integrations/types";
import { openSecret } from "../../admin/secrets";
import type { SettingsOf } from "../../admin/settings";
import type { Actor, ExchangeQueueDoc } from "../../db/collections";
import { newId } from "../../ids";
import { OutboundError, outboundPost, outboundUrlProblem, type OutboundResponse, type OutboundUrlProblem } from "../outbound";
import { EMPTY_COUNTS, writeExchangeLog } from "./log";
import { orderPackets, returnPackets } from "./packets";
import { isEmptyRef } from "./values";

// The push mode of the exchange (settings bas.mode = "push"): for a BAS
// that takes orders at an address of its own (an HTTP service of the
// accounting base) instead of only reading the queue on its schedule.
//
// The site POSTs { kind: "order" | "return", packet } to pushUrl - the very
// packet GET /orders (GET /returns) hands out for that entry - with
//   Content-Type: application/json
//   Authorization: Basic <login:password>   (only when a login is stored)
//   Idempotency-Key: <queue entry id>       (the same on every attempt)
// A 2xx answer acknowledges the entry (an answer { externalId, number } is
// stored like POST /orders/ack); anything else leaves it pending with the
// error and one more attempt, so BAS still gets it by pulling the queue.
// The call goes through ../outbound.ts: the address rules (on save and
// again before every post), a name that resolves to a private address is
// refused at connect time, no redirect is followed (it could carry the
// password elsewhere), one attempt takes at most PUSH_TIMEOUT_MS and reads
// at most 64 KB of the answer. Every attempt writes one exchange_log row
// and nothing here throws. The state of the queue entry is written by
// queue.ts (deliverEntry); this file only talks to BAS.
// No next/* import: the tsx checks run it under plain Node.

type BasSettings = SettingsOf<"bas">;

export const PUSH_TIMEOUT_MS = 10_000;
const USER_AGENT = "binar-bas-push/1";
// How much of BAS's answer is kept for staff to read.
const ANSWER_CHARS = 300;

// --- the address ----------------------------------------------------------------

export type PushUrlProblem = OutboundUrlProblem;

// Why an address cannot be the push address, or null when it can: the
// rule of every outbound address (../outbound.ts): https only (http just
// for the two test hosts in development), no credentials inside the URL
// (they would end up in logs; the login and the password have fields of
// their own), no literal address of a private network. A name that
// resolves to a private address is refused when the post connects.
export function pushUrlProblem(value: string): PushUrlProblem | null {
  return outboundUrlProblem(value);
}

// The site and BAS's own address are told apart by origin: a stored
// password belongs to the origin it was typed for (settings.ts).
export function originOf(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : "";
  } catch {
    return "";
  }
}

// What staff read under the address field (and in a failed attempt).
export const PUSH_URL_TEXT: Record<PushUrlProblem, string> = {
  format: "Перевірте адресу: наприклад, https://bas.example.com/hs/site/orders",
  scheme: "Адреса має починатися з https://",
  credentials: "Логін і пароль не пишуть в адресі: вкажіть їх у полях «Логін» і «Пароль»",
  private: "Адреса внутрішньої мережі не підходить: сайт працює в інтернеті й до неї не дістане",
  https: "Потрібна адреса https://: через звичайний http пароль і замовлення йшли б відкритим текстом",
};

// --- the target -------------------------------------------------------------------

export type PushTarget = { url: string; login: string; passwordSealed: string | null };

function targetOf(settings: BasSettings): PushTarget {
  return { url: settings.pushUrl.trim(), login: settings.pushLogin.trim(), passwordSealed: settings.pushPasswordSealed };
}

// Where new queue entries go, or null when the push mode is not active:
// the exchange is on, the mode is "push" and an address is stored.
export function activePushTarget(settings: BasSettings): PushTarget | null {
  if (!settings.enabled || settings.mode !== "push" || !settings.pushUrl.trim()) return null;
  return targetOf(settings);
}

// The stored address for the connection check, whatever the switch and the
// mode say (staff check it before switching the push mode on).
export function storedPushTarget(settings: BasSettings): PushTarget | null {
  return settings.pushUrl.trim() ? targetOf(settings) : null;
}

// --- one post -----------------------------------------------------------------------

export type PushAck = { externalId: string | null; number: string | null };

export type Posted = BasPushOutcome & { ack: PushAck | null };

const TIMEOUT_TEXT = `BAS не відповів за ${PUSH_TIMEOUT_MS / 1000} секунд`;
const NETWORK_TEXT = "Не вдалося з'єднатися з адресою BAS";

function scrub(text: string, secrets: string[]): string {
  let clean = text.replace(/\s+/g, " ").trim();
  for (const secret of secrets) if (secret.length >= 4) clean = clean.split(secret).join("****");
  return clean;
}

// What a failed call says to staff.
function failureText(error: unknown): string {
  if (error instanceof OutboundError) {
    if (error.reason === "timeout") return TIMEOUT_TEXT;
    if (error.reason === "private" || error.reason === "address") return `Адреса BAS не підходить. ${PUSH_URL_TEXT.private}`;
  }
  return NETWORK_TEXT;
}

// { externalId, number } of a JSON answer, like an ack of the pull API. An
// empty GUID or an empty string means "not given".
function ackOf(text: string): PushAck | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const externalId =
    typeof record.externalId === "string" && !isEmptyRef(record.externalId) ? record.externalId.trim().slice(0, 64) : null;
  const raw = record.number;
  const number =
    typeof raw === "string" && raw.trim()
      ? raw.trim().slice(0, 64)
      : typeof raw === "number" && Number.isFinite(raw)
        ? String(raw)
        : null;
  return externalId || number ? { externalId, number } : null;
}

async function post(target: PushTarget, body: string, key: string): Promise<Posted> {
  const started = Date.now();
  const done = (fields: Partial<Posted>): Posted => ({
    ok: false,
    status: null,
    error: null,
    number: null,
    answer: "",
    ack: null,
    ...fields,
    durationMs: Date.now() - started,
  });

  // An address stored before the rules got stricter is refused here too.
  const problem = pushUrlProblem(target.url);
  if (problem) return done({ error: `Адреса BAS не підходить. ${PUSH_URL_TEXT[problem]}` });
  let password: string | null = null;
  if (target.passwordSealed) {
    password = openSecret(target.passwordSealed);
    if (password === null) {
      return done({ error: "Збережений пароль не вдалося розшифрувати: введіть його ще раз у налаштуваннях обміну" });
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "Idempotency-Key": key,
  };
  const secrets: string[] = [];
  if (target.login) {
    const basic = Buffer.from(`${target.login}:${password ?? ""}`, "utf8").toString("base64");
    headers.Authorization = `Basic ${basic}`;
    secrets.push(basic);
  }
  if (password) secrets.push(password);

  let response: OutboundResponse;
  try {
    // The timeout covers reading the answer too; a redirect is answered as
    // it is, never followed.
    response = await outboundPost({ url: target.url, headers, body, timeoutMs: PUSH_TIMEOUT_MS });
  } catch (error) {
    return done({ error: failureText(error) });
  }
  const text = response.text;
  const answer = scrub(text, secrets).slice(0, ANSWER_CHARS);
  const status = response.status;
  if (status >= 300 && status < 400) {
    return done({
      status: status || null,
      answer,
      error: `BAS відповів переадресацією${status ? ` (${status})` : ""}, а переадресацій сайт не виконує: вкажіть кінцеву адресу`,
    });
  }
  if (status < 200 || status >= 300) {
    const words = answer.slice(0, 200);
    return done({ status, answer, error: words ? `BAS відповів ${status}: ${words}` : `BAS відповів ${status}` });
  }
  const ack = ackOf(text);
  return done({ ok: true, status, answer, ack, number: ack?.number ?? null });
}

export function toOutcome(posted: Posted): BasPushOutcome {
  return {
    ok: posted.ok,
    status: posted.status,
    error: posted.error,
    durationMs: posted.durationMs,
    number: posted.number,
    answer: posted.answer,
  };
}

// --- what is posted -------------------------------------------------------------------

// One queue entry to BAS: its packet, one journal row. The caller decides
// what the result means for the entry.
export async function postQueueEntry(target: PushTarget, entry: ExchangeQueueDoc, actor: Actor): Promise<Posted> {
  const at = new Date();
  let posted: Posted;
  try {
    const page = entry.kind === "order" ? await orderPackets([entry]) : await returnPackets([entry]);
    const packet = page.packets[0];
    posted = packet
      ? await post(target, JSON.stringify({ kind: entry.kind, packet }), entry._id)
      : {
          ok: false,
          status: null,
          error: "Запису вже немає на сайті, надсилати нічого",
          durationMs: Date.now() - at.getTime(),
          number: null,
          answer: "",
          ack: null,
        };
  } catch (error) {
    console.error("[bas] push packet failed:", error);
    posted = {
      ok: false,
      status: null,
      error: "Помилка сайту під час надсилання",
      durationMs: Date.now() - at.getTime(),
      number: null,
      answer: "",
      ack: null,
    };
  }
  await writeExchangeLog({
    at,
    system: "bas",
    direction: "out",
    entity: entry.kind === "order" ? "orders" : "returns",
    action: "push",
    status: posted.ok ? "ok" : "error",
    counts: { ...EMPTY_COUNTS, received: 1, updated: posted.ok ? 1 : 0, failed: posted.ok ? 0 : 1 },
    durationMs: posted.durationMs,
    actor,
    // The Idempotency-Key, so the journal finds every attempt of an entry.
    batchId: entry._id,
    error: posted.error,
    details: posted.ok ? [] : [{ id: entry.entityId, error: posted.error ?? "" }],
  });
  return posted;
}

// The connection check of the settings tab: { kind: "ping" } with the same
// headers (a fresh Idempotency-Key each time), one journal row.
export async function postPing(target: PushTarget, actor: Actor): Promise<BasPushOutcome> {
  const at = new Date();
  const key = newId("ping");
  let posted: Posted;
  try {
    posted = await post(target, JSON.stringify({ kind: "ping" }), key);
  } catch (error) {
    console.error("[bas] push ping failed:", error);
    posted = { ok: false, status: null, error: "Помилка сайту під час перевірки", durationMs: 0, number: null, answer: "", ack: null };
  }
  await writeExchangeLog({
    at,
    system: "bas",
    direction: "out",
    entity: "ping",
    action: "ping",
    status: posted.ok ? "ok" : "error",
    counts: { ...EMPTY_COUNTS },
    durationMs: posted.durationMs,
    actor,
    batchId: key,
    error: posted.error,
    details: [],
  });
  return toOutcome(posted);
}
