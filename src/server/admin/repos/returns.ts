import "server-only";
import type { Collection, Document, Filter, UpdateFilter } from "mongodb";
import type { StaffNoteDto } from "@/components/admin/orders/types";
import {
  RETURN_NOTES_MAX,
  RETURN_STATUSES,
  RETURN_TRANSITIONS,
  type ReturnDetail,
  type ReturnLineDto,
  type ReturnOrderSummary,
  type ReturnRow,
  type ReturnStatus,
  type ReturnStatusCounts,
} from "@/components/admin/returns/types";
import { RETURN_STATUS_META } from "@/components/platform/ui/ReturnStatusBadge";
import { collection, type B2bOrderDoc, type OrderHistoryEntry, type ReturnDoc } from "@/server/db/collections";
import { isMailAddress } from "@/server/mail/provider";
import { queueMail } from "@/server/mail/queue";
import { lineSum, round2, sum } from "@/server/money";
import { b2bOrders } from "@/server/repos/orders";
import { staffActor, type AuditInput } from "../audit";
import type { StaffContext } from "../auth";
import { HttpError } from "../http";
import { dayParam, idParam, manyOf, paginate, startsWith, type ListQuery, type Page } from "../list";
import {
  accountOf,
  assertNoteRemovable,
  clientNames,
  fieldError,
  historyDto,
  historyEntry,
  newNote,
  noteDto,
  notesDto,
  toIso,
  uah,
  withComment,
  type Mutation,
} from "./orders";

// Return requests as staff work with them (the API under
// /api/admin/returns). The partner creates and may withdraw a request in
// the cabinet (src/server/repos/returns.ts); staff move it through
// RETURN_TRANSITIONS, record why it was refused, how much is given back and
// the waybill of the goods on the way back. Every write is conditional on
// the version it was computed from (409 "conflict" otherwise), so a
// withdrawal in the cabinet and a decision in the panel cannot cross.

const HISTORY_MAX = 500;

const TTN = /^[A-Za-z0-9-]{4,40}$/;

async function returnsCol(): Promise<Collection<ReturnDoc>> {
  return collection("returns");
}

export function returnStatusLabel(status: ReturnStatus): string {
  return RETURN_STATUS_META[status]?.label ?? String(status);
}

function returnEntity(doc: Pick<ReturnDoc, "_id">): AuditInput["entity"] {
  return { type: "return", id: doc._id, label: `№${doc._id}` };
}

// --- lookups ------------------------------------------------------------------------

type OrderPart = Pick<
  B2bOrderDoc,
  "_id" | "number" | "date" | "status" | "total" | "counterparty" | "createdBy" | "payment" | "items"
>;

const ORDER_PART = {
  number: 1,
  date: 1,
  status: 1,
  total: 1,
  counterparty: 1,
  createdBy: 1,
  payment: 1,
  items: 1,
} as const;

async function ordersOf(ids: Iterable<string>): Promise<Map<string, OrderPart>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await (await b2bOrders())
    .find({ _id: { $in: unique }, channel: "b2b" }, { projection: ORDER_PART })
    .toArray();
  return new Map(rows.map((row) => [row._id, row]));
}

// --- DTOs ---------------------------------------------------------------------------

function linesOf(doc: ReturnDoc, order: OrderPart | null): ReturnLineDto[] {
  return doc.lines.map((line) => {
    const item = order?.items?.find((it) => it.id === line.itemId);
    const price = item?.price ?? 0;
    return {
      itemId: line.itemId,
      name: item?.name ?? "",
      article: item?.article ?? "",
      image: item?.image ?? "",
      qty: line.qty,
      unit: item?.unit ?? "шт",
      price,
      sum: lineSum(price, line.qty),
      reason: line.reason,
    };
  });
}

// The cabinet's "Сума повернення": qty x the order line's price.
function returnSum(doc: ReturnDoc, order: OrderPart | null): number {
  return sum(linesOf(doc, order).map((line) => line.sum));
}

export function toReturnRow(doc: ReturnDoc, order: OrderPart | null, names: ReadonlyMap<string, string>): ReturnRow {
  return {
    id: doc._id,
    orderId: doc.orderId,
    orderNumber: order?.number ?? doc.orderId,
    clientId: doc.clientId,
    clientName: names.get(doc.clientId) ?? null,
    date: doc.date,
    createdAt: toIso(doc.createdAt),
    status: doc.status,
    linesCount: Array.isArray(doc.lines) ? doc.lines.length : 0,
    total: returnSum(doc, order),
    solution: doc.solution,
    delivery: doc.delivery,
  };
}

function orderSummary(order: OrderPart | null): ReturnOrderSummary | null {
  if (!order) return null;
  return {
    id: order._id,
    number: order.number,
    date: order.date,
    status: order.status,
    total: order.total,
    counterparty: order.counterparty,
    createdBy: order.createdBy,
    payment: order.payment,
  };
}

async function buildDetail(doc: ReturnDoc): Promise<ReturnDetail> {
  const [orders, names, account] = await Promise.all([
    ordersOf([doc.orderId]),
    clientNames([doc.clientId]),
    accountOf(doc.userId),
  ]);
  const order = orders.get(doc.orderId) ?? null;
  const name = names.get(doc.clientId);
  return {
    ...toReturnRow(doc, order, names),
    updatedAt: toIso(doc.updatedAt),
    lines: linesOf(doc, order),
    order: orderSummary(order),
    company: name !== undefined ? { id: doc.clientId, name } : null,
    account,
    withdrawnAt: doc.withdrawnAt ?? null,
    rejectReason: doc.rejectReason ?? null,
    refundAmount: doc.refundAmount ?? null,
    returnTtn: doc.returnTtn ?? null,
    history: historyDto(doc.history),
    notes: notesDto(doc.notes),
    allowedStatuses: [...(RETURN_TRANSITIONS[doc.status] ?? [])],
  };
}

// --- list ---------------------------------------------------------------------------

// `withStatus: false` leaves the status filter out: the counts of the
// list's tabs are taken over the other filters only.
export function returnFilter(query: ListQuery, options: { withStatus?: boolean } = {}): Filter<ReturnDoc> {
  const params = query.params;
  const and: Filter<ReturnDoc>[] = [];

  const statuses = options.withStatus === false ? [] : manyOf(params, "status", RETURN_STATUSES);
  if (statuses.length > 0) and.push({ status: { $in: statuses } });

  const clientId = idParam(params, "clientId");
  if (clientId) and.push({ clientId });

  const from = dayParam(params, "from");
  const to = dayParam(params, "to");
  if (from || to) and.push({ date: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } });

  // The request id or the order number (a partner order's id is its number).
  // Staff often type the number as it is printed ("№9104", "#9104").
  const q = query.q.replace(/^[№#\s]+/, "");
  if (q) and.push({ $or: [{ _id: startsWith(q) }, { orderId: startsWith(q) }] });

  if (and.length === 0) return {};
  return and.length === 1 ? and[0] : { $and: and };
}

// How many requests of each status match the list's other filters (the
// tabs of the list show these sums).
export async function returnStatusCounts(query: ListQuery): Promise<ReturnStatusCounts> {
  const rows = await (await returnsCol())
    .aggregate<{ _id: unknown; n: number }>([
      { $match: returnFilter(query, { withStatus: false }) },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ])
    .toArray();
  const counts = Object.fromEntries(RETURN_STATUSES.map((status) => [status, 0])) as ReturnStatusCounts;
  for (const row of rows) {
    if (typeof row._id === "string" && (RETURN_STATUSES as readonly string[]).includes(row._id)) {
      counts[row._id as ReturnStatus] = row.n;
    }
  }
  return counts;
}

export async function listReturns(query: ListQuery): Promise<Page<ReturnRow> & { counts: ReturnStatusCounts }> {
  const [page, counts] = await Promise.all([
    paginate(await returnsCol(), returnFilter(query), query, { projection: { history: 0, notes: 0 } }),
    returnStatusCounts(query),
  ]);
  const [orders, names] = await Promise.all([
    ordersOf(page.items.map((doc) => doc.orderId)),
    clientNames(page.items.map((doc) => doc.clientId)),
  ]);
  return { ...page, items: page.items.map((doc) => toReturnRow(doc, orders.get(doc.orderId) ?? null, names)), counts };
}

// --- one request ------------------------------------------------------------------------

async function loadReturn(id: string): Promise<ReturnDoc> {
  const doc = await (await returnsCol()).findOne({ _id: id });
  if (!doc) throw new HttpError(404, "not-found");
  return doc;
}

export async function returnDetail(id: string): Promise<ReturnDetail> {
  return buildDetail(await loadReturn(id));
}

// --- writing --------------------------------------------------------------------------

type Writes = {
  set?: Document;
  unset?: Record<string, "">;
  push?: Document;
  pull?: Document;
  history: OrderHistoryEntry[];
};

async function commit(
  doc: ReturnDoc,
  writes: Writes,
  options: { guard: boolean; filter?: Filter<ReturnDoc> },
): Promise<ReturnDoc> {
  const now = new Date();
  const history = writes.history.map((entry) => ({ ...entry, at: now }));
  const push: Document = {
    ...writes.push,
    ...(history.length > 0 ? { history: { $each: history, $slice: -HISTORY_MAX } } : {}),
  };
  const update: UpdateFilter<ReturnDoc> = {
    $set: { ...writes.set, updatedAt: now },
    // A staff edit makes a seeded request a real one: db:seed leaves it alone.
    $unset: { ...writes.unset, seed: "" },
    ...(Object.keys(push).length > 0 ? { $push: push } : {}),
    ...(writes.pull ? { $pull: writes.pull } : {}),
  };
  const filter: Filter<ReturnDoc> = {
    ...options.filter,
    _id: doc._id,
    ...(options.guard ? { updatedAt: doc.updatedAt } : {}),
  };
  const updated = await (await returnsCol()).findOneAndUpdate(filter, update, { returnDocument: "after" });
  if (!updated) throw new HttpError(409, "conflict");
  return updated;
}

// --- the partner hears about the decision -------------------------------------------------

// The decisions a partner acts on get a "return-status" message: approved
// (send the goods), rejected (with the reason, which the cabinet does not
// show) and completed (with the amount given back). The steps in between
// (review, goods on the way, accepted by the warehouse) are visible in the
// cabinet and mail nobody.
const MAILED_DECISIONS: readonly ReturnStatus[] = ["approved", "rejected", "completed"];

type Person = { login?: unknown; person?: { email?: unknown } };

function mailOf(user: Person | null | undefined): string | null {
  const candidates = [user?.person?.email, user?.login].map((value) => (typeof value === "string" ? value.trim() : ""));
  return candidates.find((value) => value !== "" && isMailAddress(value)) ?? null;
}

// The e-mail of the account that sent the request; else (no e-mail, the
// account is gone or blocked) the e-mail of the company's admin; else none.
async function partnerMail(doc: ReturnDoc): Promise<string | null> {
  const users = await collection("users");
  if (doc.userId) {
    const author = await users.findOne(
      { _id: doc.userId, isActive: { $ne: false } },
      { projection: { login: 1, person: 1 } },
    );
    const own = mailOf(author);
    if (own) return own;
  }
  const admins = await users
    .find(
      { clientId: doc.clientId, type: "b2b", role: "b2b_admin", isActive: { $ne: false } },
      { projection: { login: 1, person: 1 } },
    )
    .sort({ createdAt: 1, _id: 1 })
    .limit(20)
    .toArray();
  for (const admin of admins) {
    const mail = mailOf(admin);
    if (mail) return mail;
  }
  return null;
}

// The decision stands even if its message could not be queued: never
// answer an error for a change that was stored.
async function notifyDecision(doc: ReturnDoc, ret: ReturnDetail): Promise<void> {
  if (!MAILED_DECISIONS.includes(doc.status)) return;
  try {
    const to = await partnerMail(doc);
    if (!to) return;
    const reason = doc.status === "rejected" ? doc.rejectReason?.trim() : undefined;
    const refund = doc.status === "completed" ? doc.refundAmount : undefined;
    await queueMail("return-status", to, {
      returnId: doc._id,
      orderNumber: ret.orderNumber,
      status: doc.status,
      label: returnStatusLabel(doc.status),
      ...(reason ? { reason } : {}),
      ...(typeof refund === "number" ? { refundAmount: refund } : {}),
    });
  } catch (error) {
    console.error("[admin] queueing the return-status message failed:", error);
  }
}

export type ReturnPatch = {
  status?: ReturnStatus;
  comment?: string;
  rejectReason?: string | null;
  refundAmount?: number | null;
  returnTtn?: string | null;
};

// PATCH /returns/<id>. A withdrawn request ("cancelled") is final. The
// reason of a refusal lives only while the request is refused: it is
// required to refuse (typed now or stored earlier) and goes when the
// request is reopened. Fields equal to what is stored are not a change.
export async function updateReturn(
  staff: StaffContext,
  id: string,
  patch: ReturnPatch,
): Promise<Mutation<{ ret: ReturnDetail }>> {
  const doc = await loadReturn(id);
  if (doc.status === "cancelled") throw new HttpError(409, "state", { reason: "withdrawn" });

  const by = staffActor(staff);
  const set: Document = {};
  const unset: Record<string, ""> = {};
  const history: OrderHistoryEntry[] = [];
  const parts: string[] = [];
  const meta: Record<string, unknown> = {};

  let status: ReturnStatus = doc.status;
  if (patch.status !== undefined) {
    const allowed = RETURN_TRANSITIONS[doc.status] ?? [];
    if (!allowed.includes(patch.status)) {
      throw new HttpError(409, "state", { from: doc.status, to: patch.status, allowed });
    }
    status = patch.status;
  }

  const stored = doc.rejectReason?.trim() || null;
  const typed = patch.rejectReason === undefined ? undefined : patch.rejectReason?.trim() || null;
  let reason: string | null = null;
  if (status === "rejected") {
    reason = typed === undefined ? stored : typed;
    if (!reason) throw fieldError("rejectReason", "required");
  }

  let ttn: string | null | undefined;
  if (patch.returnTtn !== undefined) {
    ttn = patch.returnTtn?.replace(/\s+/g, "") || null;
    if (ttn !== null && !TTN.test(ttn)) throw fieldError("returnTtn", "format");
  }

  if (patch.status !== undefined) {
    set.status = patch.status;
    history.push(
      historyEntry(by, "status", {
        from: doc.status,
        to: patch.status,
        text: patch.status === "rejected" ? `Причина відмови: ${reason}` : null,
      }),
    );
    parts.push(`статус «${returnStatusLabel(doc.status)}» -> «${returnStatusLabel(patch.status)}»`);
    meta.from = doc.status;
    meta.to = patch.status;
  }

  if (status === "rejected") {
    if (reason !== stored) {
      set.rejectReason = reason;
      if (patch.status === undefined) history.push(historyEntry(by, "edit", { text: `Причина відмови: ${reason}` }));
      parts.push(`причина відмови «${reason}»`);
      meta.rejectReason = reason;
    }
  } else if (doc.rejectReason !== undefined) {
    // Reopened (or a stray stored reason): the request is not refused now.
    unset.rejectReason = "";
  }

  if (patch.refundAmount !== undefined) {
    const next = patch.refundAmount === null ? null : round2(patch.refundAmount);
    const current = doc.refundAmount ?? null;
    if (next !== current) {
      if (next === null) unset.refundAmount = "";
      else set.refundAmount = next;
      const text = next === null ? "Суму повернення коштів знято" : `Сума повернення коштів: ${uah(next)}`;
      history.push(historyEntry(by, "edit", { text }));
      parts.push(text.charAt(0).toLowerCase() + text.slice(1));
      meta.refundAmount = { from: current, to: next };
    }
  }

  if (ttn !== undefined) {
    const current = doc.returnTtn ?? null;
    if (ttn !== current) {
      if (ttn === null) unset.returnTtn = "";
      else set.returnTtn = ttn;
      const text = ttn === null ? "ТТН повернення знято" : `ТТН повернення: ${ttn}`;
      history.push(historyEntry(by, "shipment", { text }));
      parts.push(ttn === null ? "ТТН повернення знято" : `ТТН повернення ${ttn}`);
      meta.returnTtn = { from: current, to: ttn };
    }
  }

  if (history.length === 0) return { ret: await buildDetail(doc), audit: null };
  withComment(history, patch.comment);
  if (patch.comment?.trim()) meta.comment = patch.comment.trim();

  const updated = await commit(doc, { set, unset, history }, { guard: true, filter: { status: doc.status } });
  const ret = await buildDetail(updated);
  if (patch.status !== undefined) await notifyDecision(updated, ret);
  return {
    ret,
    audit: {
      action: patch.status !== undefined ? "return.status" : "return.update",
      entity: returnEntity(doc),
      summary: `Повернення №${doc._id} (замовлення №${doc.orderId}): ${parts.join("; ")}`,
      meta,
    },
  };
}

// --- internal notes ------------------------------------------------------------------------

export async function addReturnNote(
  staff: StaffContext,
  id: string,
  text: string,
): Promise<Mutation<{ note: StaffNoteDto }>> {
  const doc = await loadReturn(id);
  if ((doc.notes?.length ?? 0) >= RETURN_NOTES_MAX) throw new HttpError(409, "state", { reason: "notes-limit" });
  const note = newNote(staff, text);
  await commit(
    doc,
    { push: { notes: note }, history: [historyEntry(staffActor(staff), "note", { text: "Додано внутрішню нотатку" })] },
    { guard: false },
  );
  return {
    note: noteDto(note),
    audit: {
      action: "return.note-add",
      entity: returnEntity(doc),
      summary: `Повернення №${doc._id}: додано внутрішню нотатку`,
      meta: { noteId: note.id },
    },
  };
}

// The author removes a note, and so does an owner (403 "not-author" for
// anybody else, assertNoteRemovable: the rule of the orders and the leads).
export async function removeReturnNote(staff: StaffContext, id: string, noteId: string): Promise<Mutation<object>> {
  const doc = await loadReturn(id);
  const note = doc.notes?.find((n) => n.id === noteId);
  if (!note) throw new HttpError(404, "not-found");
  assertNoteRemovable(staff, note);
  await commit(
    doc,
    {
      pull: { notes: { id: noteId } },
      history: [historyEntry(staffActor(staff), "note", { text: "Видалено внутрішню нотатку" })],
    },
    { guard: false, filter: { "notes.id": noteId } },
  );
  return {
    audit: {
      action: "return.note-remove",
      entity: returnEntity(doc),
      summary: `Повернення №${doc._id}: видалено внутрішню нотатку`,
      meta: { noteId, author: note.by.name },
    },
  };
}
