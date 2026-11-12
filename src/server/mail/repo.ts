import "server-only";
import type { Filter } from "mongodb";
import { hasPermission, type Permission } from "@/components/admin/lib/permissions";
import {
  MAIL_AUTO_MAX_AGE_DAYS,
  MAIL_MAX_ATTEMPTS,
  OUTBOX_KIND_LABELS,
  OUTBOX_KIND_PERMISSION,
  OUTBOX_KINDS,
  OUTBOX_STATES,
  PREVIEW_SECRET_MASK,
  UNRENDERABLE_KINDS,
  isRenderableKind,
  type MailDeliveryDto,
  type MailPreview,
  type OutboxAutoSend,
  type OutboxCounts,
  type OutboxKind,
  type OutboxRow,
  type OutboxState,
} from "@/components/admin/mail/types";
import { ORDER_STATUS_META, type OrderStatusKey } from "@/components/platform/ui/OrderStatusBadge";
import { RETURN_STATUS_META, type ReturnStatusKey } from "@/components/platform/ui/ReturnStatusBadge";
import { contains, dayParam, listQuery, manyOf, oneOf, paginate, type Page } from "../admin/list";
import { collection, type OutboxDoc } from "../db/collections";
import { contextLoader } from "./context";
import { tryRender } from "./templates";

// The outbox as the panel shows it (GET /api/admin/outbox and friends).
//
// A message is about a record of another section (a lead, an order, a
// customer's account, a member of staff). Who may read the outbox
// (integrations.view) sees every message's delivery facts; its summary,
// payload and rendered text only with the view permission of that record
// as well (OUTBOX_KIND_PERMISSION), the same rule the section's own pages
// keep. `reader` is the permissions of the member of staff.

export type OutboxReader = ReadonlySet<Permission>;

export function mayReadMessage(kind: OutboxKind, reader: OutboxReader): boolean {
  return hasPermission(reader, OUTBOX_KIND_PERMISSION[kind] ?? "staff.manage");
}

const UNRENDERABLE = [...UNRENDERABLE_KINDS];

export function stateOf(doc: Pick<OutboxDoc, "sentAt" | "kind" | "attempts">): OutboxState {
  if (doc.sentAt) return "sent";
  if (!isRenderableKind(doc.kind)) return "unsendable";
  return (doc.attempts ?? 0) > 0 ? "failed" : "pending";
}

function text(value: unknown, max = 120): string {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

// One line from the payload, for the list.
export function summaryOf(doc: Pick<OutboxDoc, "kind" | "payload">): string {
  const payload = record(doc.payload);
  const number = text(payload.number, 40) || text(payload.orderId, 40);
  let line = "";
  switch (doc.kind) {
    case "lead": {
      const contact = record(payload.contact);
      line = [text(contact.name), text(contact.phone) || text(contact.email), text(contact.company)].filter(Boolean).join(", ");
      break;
    }
    case "order-placed": {
      const audience = payload.audience === "staff" ? "для менеджерів" : payload.audience === "customer" ? "для клієнта" : "";
      line = number ? `№${number}${audience ? `, ${audience}` : ""}` : "";
      break;
    }
    case "order-status": {
      const status = text(payload.status, 40);
      const label = ORDER_STATUS_META[status as OrderStatusKey]?.label ?? status;
      line = number ? `№${number}${label ? `: ${label}` : ""}` : "";
      break;
    }
    case "return-status": {
      const id = text(payload.returnId, 40);
      const status = text(payload.status, 40);
      const label = text(payload.label, 80) || RETURN_STATUS_META[status as ReturnStatusKey]?.label || status;
      line = id ? `№${id}${label ? `: ${label}` : ""}` : "";
      break;
    }
    case "email-changed": {
      const from = text(payload.from);
      const to = text(payload.to);
      line = from && to ? `${from} на ${to}` : text(payload.login);
      break;
    }
    case "employee-invite":
      line = `${text(payload.company)}${payload.resend === true ? ", повторно" : ""}`;
      break;
    case "staff-invite":
    case "staff-password":
      line = text(payload.name) || text(payload.email);
      break;
    case "password-reset":
      line = text(payload.login);
      break;
  }
  return line.slice(0, 200);
}

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

// Whether a waiting message goes out without staff (deliver.ts isDue and
// AUTOMATIC_RUN; the back-off pause of a failed one does not matter here).
export function autoSendOf(doc: OutboxDoc, state: OutboxState, now: number = Date.now()): OutboxAutoSend | null {
  if (state !== "pending" && state !== "failed") return null;
  if (doc.expiresAt && doc.expiresAt.getTime() <= now) return "expired";
  if ((doc.attempts ?? 0) >= MAIL_MAX_ATTEMPTS) return "stopped";
  if (doc.createdAt.getTime() < now - MAIL_AUTO_MAX_AGE_DAYS * 24 * 60 * 60_000) return "old";
  return "yes";
}

export function toOutboxRow(doc: OutboxDoc, reader: OutboxReader): OutboxRow {
  const state = stateOf(doc);
  const restricted = !mayReadMessage(doc.kind, reader);
  return {
    id: doc._id,
    kind: doc.kind,
    kindLabel: OUTBOX_KIND_LABELS[doc.kind] ?? doc.kind,
    to: doc.to,
    state,
    createdAt: doc.createdAt.toISOString(),
    sentAt: iso(doc.sentAt),
    attempts: doc.attempts ?? 0,
    lastError: doc.lastError ?? null,
    lastAttemptAt: iso(doc.lastAttemptAt),
    expiresAt: iso(doc.expiresAt),
    summary: restricted ? "" : summaryOf(doc),
    restricted,
    autoSend: autoSendOf(doc, state),
  };
}

export function stateFilter(state: OutboxState): Filter<OutboxDoc> {
  switch (state) {
    case "sent":
      return { sentAt: { $ne: null } };
    case "unsendable":
      return { sentAt: null, kind: { $in: UNRENDERABLE } };
    case "failed":
      return { sentAt: null, kind: { $nin: UNRENDERABLE }, attempts: { $gt: 0 } };
    case "pending":
      return {
        sentAt: null,
        kind: { $nin: UNRENDERABLE },
        $or: [{ attempts: { $exists: false } }, { attempts: { $lte: 0 } }],
      };
  }
}

// --- Kyiv days ----------------------------------------------------------------

const KYIV_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Kyiv",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// How far Kyiv is ahead of UTC at a moment (2 or 3 hours).
function kyivOffsetMs(at: Date): number {
  const parts = Object.fromEntries(KYIV_PARTS.formatToParts(at).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

// The moment a Kyiv business day starts ("2026-11-12" -> 2026-11-11T22:00Z).
function kyivDayStart(day: string, addDays = 0): Date {
  const [year, month, date] = day.split("-").map(Number);
  const midnightUtc = Date.UTC(year, month - 1, date + addDays);
  const first = midnightUtc - kyivOffsetMs(new Date(midnightUtc));
  // Around a clock change the offset at the guess may differ: one more pass.
  return new Date(midnightUtc - kyivOffsetMs(new Date(first)));
}

// --- list ---------------------------------------------------------------------

export type OutboxList = Page<OutboxRow> & { counts: OutboxCounts };

export async function listOutbox(url: URL, reader: OutboxReader): Promise<OutboxList> {
  const query = listQuery(url, {
    sortable: ["createdAt", "sentAt", "attempts", "to", "kind"],
    defaultSort: "-createdAt",
  });
  const params = query.params;
  const and: Filter<OutboxDoc>[] = [];
  const kinds = manyOf(params, "kind", OUTBOX_KINDS);
  if (kinds.length > 0) and.push({ kind: { $in: kinds } });
  if (query.q) and.push({ to: contains(query.q) });
  const from = dayParam(params, "from");
  const to = dayParam(params, "to");
  if (from) and.push({ createdAt: { $gte: kyivDayStart(from) } });
  if (to) and.push({ createdAt: { $lt: kyivDayStart(to, 1) } });
  const state = oneOf(params, "state", OUTBOX_STATES);

  const outbox = await collection("outbox");
  const scoped = (extra: Filter<OutboxDoc>[]): Filter<OutboxDoc> => {
    const all = [...and, ...extra];
    return all.length > 0 ? { $and: all } : {};
  };
  const [page, ...counted] = await Promise.all([
    paginate(outbox, scoped(state ? [stateFilter(state)] : []), query, { map: (doc) => toOutboxRow(doc, reader) }),
    ...OUTBOX_STATES.map((each) => outbox.countDocuments(scoped([stateFilter(each)]))),
  ]);
  const counts = Object.fromEntries(OUTBOX_STATES.map((each, index) => [each, counted[index]])) as OutboxCounts;
  return { ...page, counts };
}

export async function outboxCounts(): Promise<OutboxCounts> {
  const outbox = await collection("outbox");
  const counted = await Promise.all(OUTBOX_STATES.map((each) => outbox.countDocuments(stateFilter(each))));
  return Object.fromEntries(OUTBOX_STATES.map((each, index) => [each, counted[index]])) as OutboxCounts;
}

// --- one message ----------------------------------------------------------------

export async function findMessage(id: string): Promise<OutboxDoc | null> {
  return (await collection("outbox")).findOne({ _id: id });
}

export type PreviewOutcome = { preview: MailPreview | null; previewError: string | null; previewMasked: boolean };

// The message rendered from the stored payload: as it went out when it is
// sent (a staff access mail that carried the temporary password shows the
// password masked, never the variant without it), as it would go out now
// when it waits. Errors are keys of MAIL_PREVIEW_ERROR_LABELS.
export async function previewOf(doc: OutboxDoc, reader: OutboxReader): Promise<PreviewOutcome> {
  if (!mayReadMessage(doc.kind, reader)) return { preview: null, previewError: "restricted", previewMasked: false };
  if (!isRenderableKind(doc.kind)) return { preview: null, previewError: "secret-required", previewMasked: false };
  const payload = doc.payload ?? {};
  const masked = Boolean(doc.sentAt) && payload.secretMailed === "password";
  const context = await contextLoader()(doc, masked ? { password: PREVIEW_SECRET_MASK } : undefined);
  const outcome = tryRender(doc.kind, payload, context);
  if (!outcome.ok) return { preview: null, previewError: outcome.error, previewMasked: false };
  const { subject, html, text: plain } = outcome.mail;
  return { preview: { subject, html, text: plain }, previewError: null, previewMasked: masked };
}

// The delivery attempts of a message, newest first (the exchange journal).
export async function deliveriesOf(id: string): Promise<MailDeliveryDto[]> {
  const rows = await (await collection("exchangeLog"))
    .find({ system: "mail", batchId: id })
    .sort({ at: -1 })
    .limit(20)
    .toArray();
  return rows.map((row) => ({
    id: row._id,
    at: row.at.toISOString(),
    status: row.status === "ok" ? "ok" : "error",
    error: row.error,
    durationMs: row.durationMs,
    actor: row.actor?.name ?? null,
  }));
}

// "Позначити надісланим": staff handled the message by hand. The earlier
// refusal, if any, stays visible on the row.
export async function markSent(id: string): Promise<OutboxDoc | "not-found" | "state"> {
  const outbox = await collection("outbox");
  const updated = await outbox.findOneAndUpdate(
    { _id: id, sentAt: null },
    { $set: { sentAt: new Date() } },
    { returnDocument: "after" },
  );
  if (updated) return updated;
  return (await outbox.findOne({ _id: id }, { projection: { _id: 1 } })) ? "state" : "not-found";
}

export async function deleteMessage(id: string): Promise<boolean> {
  return (await (await collection("outbox")).deleteOne({ _id: id })).deletedCount === 1;
}
