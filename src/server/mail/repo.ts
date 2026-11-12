import "server-only";
import type { Filter } from "mongodb";
import {
  OUTBOX_KIND_LABELS,
  OUTBOX_KINDS,
  OUTBOX_STATES,
  UNRENDERABLE_KINDS,
  isRenderableKind,
  type MailDeliveryDto,
  type MailPreview,
  type OutboxCounts,
  type OutboxRow,
  type OutboxState,
} from "@/components/admin/mail/types";
import { ORDER_STATUS_META, type OrderStatusKey } from "@/components/platform/ui/OrderStatusBadge";
import { contains, dayParam, listQuery, manyOf, oneOf, paginate, type Page } from "../admin/list";
import { collection, type OutboxDoc } from "../db/collections";
import { contextLoader } from "./context";
import { tryRender } from "./templates";

// The outbox as the panel shows it (GET /api/admin/outbox and friends).

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

export function toOutboxRow(doc: OutboxDoc): OutboxRow {
  return {
    id: doc._id,
    kind: doc.kind,
    kindLabel: OUTBOX_KIND_LABELS[doc.kind] ?? doc.kind,
    to: doc.to,
    state: stateOf(doc),
    createdAt: doc.createdAt.toISOString(),
    sentAt: iso(doc.sentAt),
    attempts: doc.attempts ?? 0,
    lastError: doc.lastError ?? null,
    lastAttemptAt: iso(doc.lastAttemptAt),
    expiresAt: iso(doc.expiresAt),
    summary: summaryOf(doc),
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

export async function listOutbox(url: URL): Promise<OutboxList> {
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
    paginate(outbox, scoped(state ? [stateFilter(state)] : []), query, { map: toOutboxRow }),
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

// The message rendered now from the stored payload.
export async function previewOf(
  doc: OutboxDoc,
): Promise<{ preview: MailPreview | null; previewError: string | null }> {
  if (!isRenderableKind(doc.kind)) return { preview: null, previewError: "secret-required" };
  const outcome = tryRender(doc.kind, doc.payload ?? {}, await contextLoader()(doc));
  if (!outcome.ok) return { preview: null, previewError: outcome.error };
  const { subject, html, text: plain } = outcome.mail;
  return { preview: { subject, html, text: plain }, previewError: null };
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
