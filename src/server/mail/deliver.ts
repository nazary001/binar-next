import "server-only";
import type { Filter } from "mongodb";
import {
  MAIL_AUTO_MAX_AGE_DAYS,
  MAIL_AUTO_MIN_AGE_MS,
  MAIL_MAX_ATTEMPTS,
  UNRENDERABLE_KINDS,
  isRenderableKind,
  type DeliverResult,
  type MailSendResult,
  type OutboxKind,
} from "@/components/admin/mail/types";
import { getSettings } from "../admin/settings";
import { collection, type Actor, type OutboxDoc } from "../db/collections";
import { newId } from "../ids";
import { baseContext, contextLoader, type ContextLoader } from "./context";
import { logMailAttempt } from "./log";
import { mailStatusOf, sendWith, type MailSettings } from "./provider";
import { renderTestMessage, tryRender, type MailSecret } from "./templates";

// The delivery of the outbox.
//
//   await deliverOutbox();                     // the 20 oldest messages that are due
//   await deliverOutbox({ ids: [id] });        // just these (if due)
//   await deliverOutbox(AUTOMATIC_RUN);        // the sweep and the cron route
//   await sendNow("password-reset", to, { login, userId }, { resetToken });
//
// Who runs it: every writer, right after its response (queue.ts
// deliverSoon through schedule.ts); the panel's polling at most every 5
// minutes (schedule.ts sweepOutboxSoon); GET /api/cron/outbox for a
// scheduler; staff on the mail page.
//
// A message is due when it is not sent, not expired, has fewer than
// MAIL_MAX_ATTEMPTS failed attempts, is of a kind that can be rendered from
// what is stored, and its wait is over. `lastAttemptAt` is both the lease
// and the back-off: a message being sent right now (lastAttemptAt set,
// lastError cleared) is left alone for IN_FLIGHT_MS, so two runs at once
// never send it twice; after a failure the next attempt waits 1, 2, 4, 8
// minutes. A claim is a compare-and-set on the observed `lastAttemptAt`.
// Without a configured provider nothing is tried and nothing changes.
// Every attempt writes a row of the exchange journal (log.ts).
// No next/* import: the audit helpers and scripts run this under Node.

// The system as the actor of the automatic runs.
export const MAILER_ACTOR: Actor = { id: "system", name: "Система", kind: "system" };

// Longer than the provider's timeout (10 s) with room to record the outcome.
const IN_FLIGHT_MS = 30_000;
// A run stops starting new sends after this long (a serverless function
// has a time limit of its own).
const RUN_BUDGET_MS = 40_000;
// Resend accepts 2 calls a second on its basic plan.
const RESEND_GAP_MS = 550;

// Assumed by the panel's types: the two lists of kinds must stay equal.
type SameKinds = [OutboxDoc["kind"]] extends [OutboxKind] ? ([OutboxKind] extends [OutboxDoc["kind"]] ? true : never) : never;
const KINDS_MATCH: SameKinds = true;
void KINDS_MATCH;

function waitMs(doc: Pick<OutboxDoc, "attempts" | "lastError">): number {
  const attempts = doc.attempts ?? 0;
  if (!doc.lastError || attempts <= 0) return IN_FLIGHT_MS;
  return Math.min(2 ** (attempts - 1), 30) * 60_000;
}

export function isDue(doc: OutboxDoc, now: Date): boolean {
  if (doc.sentAt) return false;
  if (doc.expiresAt && doc.expiresAt.getTime() <= now.getTime()) return false;
  if ((doc.attempts ?? 0) >= MAIL_MAX_ATTEMPTS) return false;
  if (!isRenderableKind(doc.kind)) return false;
  if (!doc.lastAttemptAt) return true;
  return doc.lastAttemptAt.getTime() + waitMs(doc) <= now.getTime();
}

// Not sent and not expired.
function openFilter(now: Date): Filter<OutboxDoc> {
  return { sentAt: null, $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One attempt of a claimed message: render, send, record.
async function attempt(
  doc: OutboxDoc,
  settings: MailSettings,
  load: ContextLoader,
  actor: Actor | null,
): Promise<MailSendResult> {
  const started = Date.now();
  let result: MailSendResult;
  try {
    const rendered = tryRender(doc.kind, doc.payload ?? {}, await load(doc));
    result = rendered.ok
      ? await sendWith(settings, { to: doc.to, ...rendered.mail })
      : { ok: false, error: rendered.error, retryable: false };
  } catch (error) {
    // A lookup failed (the database); the message stays for the next run.
    console.error(`[mail] message ${doc._id} could not be prepared:`, error);
    result = { ok: false, error: "network", retryable: true };
  }
  const finished = new Date();
  const outbox = await collection("outbox");
  if (result.ok) {
    await outbox.updateOne(
      { _id: doc._id },
      { $set: { sentAt: finished, lastError: null, lastAttemptAt: finished }, $inc: { attempts: 1 } },
    );
  } else if (result.retryable) {
    await outbox.updateOne(
      { _id: doc._id },
      { $set: { lastError: result.error.slice(0, 300), lastAttemptAt: finished }, $inc: { attempts: 1 } },
    );
  } else {
    // Trying again would only repeat the refusal: stop until staff retry.
    await outbox.updateOne(
      { _id: doc._id },
      { $set: { lastError: result.error.slice(0, 300), lastAttemptAt: finished, attempts: MAIL_MAX_ATTEMPTS } },
    );
  }
  await logMailAttempt({
    entity: "message",
    action: doc.kind,
    messageId: doc._id,
    result,
    durationMs: Date.now() - started,
    actor,
  });
  return result;
}

// Takes the message for this run, or null when another run has it.
async function claim(doc: OutboxDoc): Promise<OutboxDoc | null> {
  const outbox = await collection("outbox");
  return outbox.findOneAndUpdate(
    { _id: doc._id, sentAt: null, lastAttemptAt: doc.lastAttemptAt ?? null },
    { $set: { lastAttemptAt: new Date(), lastError: null } },
    { returnDocument: "after" },
  );
}

export type DeliverOptions = {
  limit?: number;
  // Only these messages (still only the due ones).
  ids?: readonly string[];
  // Who started the run (null = the automatic run).
  actor?: Actor | null;
  // Only messages written within this window before the run: at least
  // `minAgeMs` ago and at most `maxAgeMs` ago (see AUTOMATIC_RUN).
  window?: { minAgeMs?: number; maxAgeMs?: number };
};

// The runs nobody asked for (the panel's polling, a scheduler calling
// /api/cron/outbox). A message is first tried by its own writer right
// after the response (queue.ts deliverSoon); these runs are the safety net
// for what that missed and for the retries after a failure, so they leave
// a message alone for its first two minutes (no race with the writer's
// own attempt). Nor do they send what waited over a week: a notice about
// a status change or a lead that old is better looked at by staff first
// ("Надіслати всі, що очікують" on the mail page sends it, the window does
// not apply to staff). The mail page says so next to the waiting messages
// and marks the ones the window leaves out (OutboxRow.autoSend).
export const AUTOMATIC_RUN: DeliverOptions = {
  window: { minAgeMs: MAIL_AUTO_MIN_AGE_MS, maxAgeMs: MAIL_AUTO_MAX_AGE_DAYS * 24 * 60 * 60_000 },
};

function windowFilter(window: DeliverOptions["window"], now: Date): Filter<OutboxDoc> | null {
  if (!window) return null;
  const createdAt: { $lte?: Date; $gte?: Date } = {};
  if (window.minAgeMs) createdAt.$lte = new Date(now.getTime() - window.minAgeMs);
  if (window.maxAgeMs) createdAt.$gte = new Date(now.getTime() - window.maxAgeMs);
  return Object.keys(createdAt).length > 0 ? { createdAt } : null;
}

export async function deliverOutbox(options: DeliverOptions = {}): Promise<DeliverResult> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const ids = options.ids?.filter((id) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id));
  const now = new Date();
  const parts: Filter<OutboxDoc>[] = [openFilter(now)];
  if (ids) parts.push({ _id: { $in: ids } });
  const window = windowFilter(options.window, now);
  if (window) parts.push(window);
  const scope: Filter<OutboxDoc> = parts.length === 1 ? parts[0] : { $and: parts };

  const outbox = await collection("outbox");
  const skipped = await outbox.countDocuments({ $and: [scope, { kind: { $in: [...UNRENDERABLE_KINDS] } }] });
  const settings = await getSettings("mail");
  if (!mailStatusOf(settings).configured) return { configured: false, sent: 0, failed: 0, skipped };

  const candidates = await outbox
    .find({
      $and: [
        scope,
        { kind: { $nin: [...UNRENDERABLE_KINDS] } },
        { $or: [{ attempts: { $exists: false } }, { attempts: { $lt: MAIL_MAX_ATTEMPTS } }] },
      ],
    })
    .sort({ createdAt: 1, _id: 1 })
    // Some of the oldest may still be waiting out their back-off.
    .limit(Math.min(limit * 4, 400))
    .toArray();
  const due = candidates.filter((doc) => isDue(doc, now)).slice(0, limit);

  const load = contextLoader();
  const deadline = Date.now() + RUN_BUDGET_MS;
  const result: DeliverResult = { configured: true, sent: 0, failed: 0, skipped };
  let lastStart = 0;
  for (const doc of due) {
    if (Date.now() > deadline) break;
    if (settings.provider === "resend") await sleep(Math.max(0, lastStart + RESEND_GAP_MS - Date.now()));
    const claimed = await claim(doc);
    if (!claimed) continue;
    lastStart = Date.now();
    const sent = await attempt(claimed, settings, load, options.actor ?? MAILER_ACTOR);
    if (sent.ok) result.sent += 1;
    else result.failed += 1;
  }
  return result;
}

export type RetryOutcome =
  | { ok: true; doc: OutboxDoc; result: MailSendResult }
  | { ok: false; error: "not-found" | "state" | "busy" | "no-provider" };

// "Надіслати ще раз": the count of attempts starts again and one attempt
// is made now, whatever the back-off said.
export async function retryMessage(id: string, actor: Actor | null): Promise<RetryOutcome> {
  const outbox = await collection("outbox");
  const doc = await outbox.findOne({ _id: id });
  if (!doc) return { ok: false, error: "not-found" };
  const now = new Date();
  if (doc.sentAt || !isRenderableKind(doc.kind)) return { ok: false, error: "state" };
  if (doc.expiresAt && doc.expiresAt.getTime() <= now.getTime()) return { ok: false, error: "state" };
  const settings = await getSettings("mail");
  if (!mailStatusOf(settings).configured) return { ok: false, error: "no-provider" };

  // Reset and claim in one write; refused while another run is sending it.
  const claimed = await outbox.findOneAndUpdate(
    {
      _id: id,
      sentAt: null,
      $or: [
        { lastAttemptAt: null },
        { lastError: { $ne: null } },
        { lastAttemptAt: { $lt: new Date(now.getTime() - IN_FLIGHT_MS) } },
      ],
    },
    { $set: { attempts: 0, lastError: null, lastAttemptAt: now } },
    { returnDocument: "after" },
  );
  if (!claimed) {
    const again = await outbox.findOne({ _id: id }, { projection: { sentAt: 1 } });
    return { ok: false, error: !again ? "not-found" : again.sentAt ? "state" : "busy" };
  }
  const result = await attempt(claimed, settings, contextLoader(), actor);
  const after = (await outbox.findOne({ _id: id })) ?? claimed;
  return { ok: true, doc: after, result };
}

export type SendNowOptions = {
  actor?: Actor | null;
  // The stored copy goes when what it announces does (a reset link).
  expiresAt?: Date;
};

export type SendNowResult = { id: string; result: MailSendResult };

// Renders and sends one message at once and records it in the outbox as
// sent (or failed). For the flows whose mail carries a secret (`secret`:
// the reset link token, a generated password): the secret goes into the
// mail only, the stored payload stays without it. A failed message that
// needed a secret is not retried by the mailer (it would go out without
// the secret); one that did not is retried like any other.
export async function sendNow(
  kind: OutboxKind,
  to: string,
  payload: Record<string, unknown>,
  secret?: MailSecret,
  options: SendNowOptions = {},
): Promise<SendNowResult> {
  const settings = await getSettings("mail");
  const status = mailStatusOf(settings);
  const created = new Date();
  const withSecret = Boolean(secret && (secret.resetToken || secret.password));
  const base: OutboxDoc = {
    _id: newId("msg"),
    kind,
    to: to.slice(0, 320),
    payload,
    createdAt: created,
    sentAt: null,
    ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}),
  };
  const outbox = await collection("outbox");

  if (!status.configured) {
    const error = settings.provider === "none" ? "no-provider" : "not-configured";
    // Without a secret the message simply waits for a provider; with one it
    // is recorded as not delivered.
    await outbox.insertOne(
      withSecret ? { ...base, attempts: MAIL_MAX_ATTEMPTS, lastError: error, lastAttemptAt: created } : base,
    );
    return { id: base._id, result: { ok: false, error, retryable: true } };
  }

  const started = Date.now();
  let result: MailSendResult;
  try {
    const rendered = tryRender(kind, payload, await contextLoader()(base, secret));
    result = rendered.ok
      ? await sendWith(settings, { to: base.to, ...rendered.mail })
      : { ok: false, error: rendered.error, retryable: false };
  } catch (error) {
    console.error(`[mail] ${kind} could not be prepared:`, error);
    result = { ok: false, error: "network", retryable: true };
  }
  const finished = new Date();
  // Written after the attempt, so the stored copy is never seen half-sent
  // by a run of the mailer. A delivered mail that carried the password
  // says so (never the password itself), so the panel shows that mail and
  // not the variant without it (repo.ts previewOf).
  await outbox.insertOne({
    ...base,
    ...(result.ok && secret?.password ? { payload: { ...payload, secretMailed: "password" } } : {}),
    sentAt: result.ok ? finished : null,
    attempts: result.ok ? 1 : withSecret || !result.retryable ? MAIL_MAX_ATTEMPTS : 1,
    lastError: result.ok ? null : result.error.slice(0, 300),
    lastAttemptAt: finished,
  });
  await logMailAttempt({
    entity: "message",
    action: kind,
    messageId: base._id,
    result,
    durationMs: Date.now() - started,
    actor: options.actor ?? MAILER_ACTOR,
  });
  return { id: base._id, result };
}

// The panel's test message: sent through the configured provider, not
// stored in the outbox, logged like every attempt (entity "test").
export async function sendTestMail(
  to: string,
  sender: { name: string; actor: Actor },
): Promise<{ provider: MailSettings["provider"]; result: MailSendResult }> {
  const settings = await getSettings("mail");
  const context = await baseContext(to);
  const mail = renderTestMessage(context, { by: sender.name, provider: settings.provider, at: new Date() });
  const started = Date.now();
  const result = await sendWith(settings, { to, ...mail });
  await logMailAttempt({
    entity: "test",
    action: "test",
    messageId: null,
    result,
    durationMs: Date.now() - started,
    actor: sender.actor,
  });
  return { provider: settings.provider, result };
}
