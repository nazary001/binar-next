import "server-only";
import type { MailMissing, MailSendResult, MailStatusDto } from "@/components/admin/mail/types";
import { isValidEmail } from "@/components/auth/data";
import { openSecret } from "../admin/secrets";
import { getSettings, type SettingsOf } from "../admin/settings";

// The provider layer of the outgoing mail: hands one finished message to
// the service chosen in the panel ("mail" settings group).
//
//   const result = await sendMail({ to, subject, html, text, replyTo });
//   if (!result.ok && result.retryable) ...   // try again later
//
// - "resend": POST https://api.resend.com/emails with the sealed API key;
// - "webhook": POST the message as JSON to the configured address (any 2xx
//   is success); a stored key, if any, goes along as a Bearer token so the
//   receiver can tell the site's calls from anyone else's;
// - "none": nothing is sent ({ error: "no-provider", retryable: true }).
//
// Never throws, never logs a key: an error text a provider echoes back is
// scrubbed of it before it is stored or shown. No next/* import: the
// scripts and the audit helpers run this under plain Node.

export type MailSettings = SettingsOf<"mail">;

export type MailMessage = { to: string; subject: string; html: string; text: string; replyTo?: string };

// The HTTP call itself, replaceable for tests (setMailTransport).
export type TransportRequest = {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
};
export type TransportResponse = { status: number; text: string };
export type MailTransport = (request: TransportRequest) => Promise<TransportResponse>;

export const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;
const USER_AGENT = "binar-mailer/1";
// Resend takes at most 50 recipients per message.
const MAX_RECIPIENTS = 50;

const fetchTransport: MailTransport = async (request) => {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    // The timeout covers reading the answer too.
    signal: AbortSignal.timeout(request.timeoutMs),
    // A redirect could point the call (and the key) somewhere else.
    redirect: "error",
    cache: "no-store",
  });
  return { status: response.status, text: (await response.text()).slice(0, 4000) };
};

let transport: MailTransport | null = null;

// Tests swap the HTTP call for a fake; null restores fetch.
export function setMailTransport(fn: MailTransport | null): void {
  transport = fn;
}

// --- addresses ----------------------------------------------------------------

// A bare e-mail address as a provider takes it: the site's own rule plus
// none of the characters that would let it be read as a list or a header.
export function isMailAddress(value: string): boolean {
  return value.length <= 254 && isValidEmail(value) && !/[<>(),;:"[\]\s]/.test(value);
}

// "Binar 2000 <no-reply@binar-2000.com>" or a bare address.
export function parseFromAddress(value: string): { name: string; address: string } | null {
  const text = value.trim();
  if (!text || text.length > 254 || /[\r\n]/.test(text)) return null;
  const angled = /^([^<>]*)<([^<>]+)>$/.exec(text);
  if (angled) {
    const name = angled[1].trim().replace(/^"(.*)"$/, "$1");
    if (name.includes('"')) return null;
    const address = angled[2].trim();
    return isMailAddress(address) ? { name, address } : null;
  }
  return isMailAddress(text) ? { name: "", address: text } : null;
}

// One recipient or several ("a@x.ua, b@y.ua"); null when any of them is
// not an address (an old notice addressed to a phone number).
export function splitRecipients(to: string): string[] | null {
  const list = to
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (list.length === 0 || list.length > MAX_RECIPIENTS) return null;
  return list.every(isMailAddress) ? list : null;
}

// Why a webhook address is refused, or null when it is fine: https only,
// plain http only for this machine (a receiver under test).
export function webhookUrlProblem(value: string): "format" | "https" | "credentials" | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "format";
  }
  if (url.username || url.password) return "credentials";
  if (url.protocol === "https:") return null;
  if (url.protocol === "http:") return url.hostname === "localhost" || url.hostname === "127.0.0.1" ? null : "https";
  return "format";
}

// --- status -------------------------------------------------------------------

export function mailStatusOf(settings: MailSettings): MailStatusDto {
  const missing: MailMissing[] = [];
  const keyStored = Boolean(settings.apiKeySealed);
  const keyOpens = keyStored && openSecret(settings.apiKeySealed) !== null;
  if (settings.provider === "none") missing.push("provider");
  if (settings.provider === "resend") {
    if (!keyStored) missing.push("apiKey");
    else if (!keyOpens) missing.push("secretsKey");
    if (!parseFromAddress(settings.from)) missing.push("from");
  }
  if (settings.provider === "webhook") {
    if (!settings.webhookUrl || webhookUrlProblem(settings.webhookUrl)) missing.push("webhookUrl");
    // An unreadable key would silently drop the receiver's check.
    if (keyStored && !keyOpens) missing.push("secretsKey");
  }
  return { provider: settings.provider, configured: missing.length === 0, from: settings.from, missing };
}

export async function mailStatus(): Promise<MailStatusDto> {
  return mailStatusOf(await getSettings("mail"));
}

// --- sending ------------------------------------------------------------------

function scrub(text: string, secret: string | null): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return secret && secret.length >= 4 ? clean.split(secret).join("****") : clean;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

// What the provider said about a refused call, in one short line.
function refusal(response: TransportResponse, secret: string | null): MailSendResult {
  let said = response.text;
  try {
    const data = JSON.parse(response.text) as { message?: unknown; error?: unknown };
    if (typeof data.message === "string") said = data.message;
    else if (typeof data.error === "string") said = data.error;
  } catch {
    // Not JSON: the raw text, shortened below.
  }
  const words = scrub(said, secret).slice(0, 200);
  return {
    ok: false,
    error: words ? `http-${response.status}: ${words}` : `http-${response.status}`,
    retryable: retryableStatus(response.status),
  };
}

function idOf(text: string): string | null {
  try {
    const data = JSON.parse(text) as { id?: unknown };
    return typeof data.id === "string" ? data.id.slice(0, 200) : null;
  } catch {
    return null;
  }
}

async function call(request: TransportRequest, secret: string | null): Promise<MailSendResult> {
  let response: TransportResponse;
  try {
    response = await (transport ?? fetchTransport)(request);
  } catch (error) {
    const name = (error as { name?: unknown } | null)?.name;
    return { ok: false, error: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network", retryable: true };
  }
  if (response.status >= 200 && response.status < 300) return { ok: true, id: idOf(response.text) };
  return refusal(response, secret);
}

// Sends with the given settings (the panel's test and the audit helpers
// pass their own; everything else goes through sendMail).
export async function sendWith(settings: MailSettings, message: MailMessage): Promise<MailSendResult> {
  if (settings.provider === "none") return { ok: false, error: "no-provider", retryable: true };
  const recipients = splitRecipients(message.to);
  if (!recipients) return { ok: false, error: "address", retryable: false };
  const replyTo = (message.replyTo || settings.replyTo).trim();
  const key = settings.apiKeySealed ? openSecret(settings.apiKeySealed) : null;

  let result: MailSendResult;
  if (settings.provider === "resend") {
    const from = settings.from.trim();
    if (!key || !parseFromAddress(from)) return { ok: false, error: "not-configured", retryable: true };
    result = await call(
      {
        url: RESEND_URL,
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify({
          from,
          to: recipients,
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
        timeoutMs: TIMEOUT_MS,
      },
      key,
    );
  } else {
    const url = settings.webhookUrl.trim();
    if (!url || webhookUrlProblem(url)) return { ok: false, error: "not-configured", retryable: true };
    if (settings.apiKeySealed && !key) return { ok: false, error: "not-configured", retryable: true };
    result = await call(
      {
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          ...(key ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          from: settings.from.trim(),
          replyTo,
        }),
        timeoutMs: TIMEOUT_MS,
      },
      key,
    );
  }
  if (!result.ok) console.warn(`[mail] ${settings.provider} refused a message: ${result.error}`);
  return result;
}

export async function sendMail(message: MailMessage): Promise<MailSendResult> {
  return sendWith(await getSettings("mail"), message);
}
