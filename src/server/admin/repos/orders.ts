import "server-only";
import type { Collection, Document, Filter, UpdateFilter } from "mongodb";
import { formatDate, formatDateTime } from "@/components/admin/lib/format";
import { mediaRef, parseMediaRef } from "@/components/admin/media/types";
import {
  ORDER_CHANNEL_LABELS,
  ORDER_CHANNELS,
  ORDER_DOCUMENT_KINDS,
  ORDER_DOCUMENTS_MAX,
  ORDER_EXPORT_MAX,
  ORDER_NOTES_MAX,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  PAYMENT_KINDS,
  PAYMENT_KIND_LABELS,
  type ActorDto,
  type HistoryEntryDto,
  type OrderCustomer,
  type OrderDetail,
  type OrderDocumentAdminDto,
  type OrderItemDto,
  type OrderRow,
  type OrderShipmentDto,
  type OrderStatus,
  type PaymentKind,
  type StaffNoteDto,
} from "@/components/admin/orders/types";
import { DELIVERY_OPTIONS, PICKUP_NOTICE, type CheckoutValues } from "@/components/checkout/data";
import { dayDate, daysPlural, type DeliveryInfo, type PaymentState } from "@/components/platform/orders/data";
import { ORDER_STATUS_META } from "@/components/platform/ui/OrderStatusBadge";
import {
  collection,
  type Actor,
  type ErpLink,
  type MediaDoc,
  type OrderDoc,
  type OrderDocumentDoc,
  type OrderHistoryEntry,
  type OrderShipment,
  type StaffNote,
} from "@/server/db/collections";
import { newId } from "@/server/ids";
import { findMedia, readMedia } from "@/server/media/store";
import { lineSum, round2, sum } from "@/server/money";
import { enqueueMessage } from "@/server/outbox";
import { companyToday, fileLocation, toCancelDto } from "@/server/repos/orders";
import { kyivToday } from "@/server/time";
import { zId } from "@/server/validate";
import { staffActor, type AuditInput } from "../audit";
import type { StaffContext } from "../auth";
import { HttpError } from "../http";
import { contains, dayParam, flag, idParam, manyOf, oneOf, paginate, startsWith, type ListQuery, type Page } from "../list";
import { findStaff } from "../staff";

// Orders as staff work with them (the API under /api/admin/orders).
//
// One collection holds both channels: partner orders ("b2b", the
// cabinet's documents, built field by field into the cabinet DTO by
// src/server/repos/orders.ts) and shop orders ("retail"). This file only
// ever adds the staff fields the types declare (history, notes, managerId,
// payment of a shop order) and changes status, payment, due date and the
// document tiles; it never rewrites a field the storefront reads in
// another shape.
//
// Every write is conditional on the `updatedAt` the change was computed
// from (and on the status, when the status moves), so two members of
// staff, or staff and the partner's own cancel request, cannot overwrite
// each other: the later one gets 409 "conflict" and reloads. The functions
// that change something return the journal line for the route to write.

export type Mutation<T> = T & { audit: AuditInput | null };

// History kept per order; the oldest entries fall off beyond this.
const HISTORY_MAX = 500;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function ordersCol(): Promise<Collection<OrderDoc>> {
  return collection("orders");
}

// --- small helpers -----------------------------------------------------------------

// An id from the address bar: anything that is not a plain business id
// cannot name a record, so it is "not found" rather than a bad request.
export function routeId(raw: string): string {
  const parsed = zId.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, "not-found");
  return parsed.data;
}

export function fieldError(field: string, reason: string): HttpError {
  return new HttpError(400, "fields", { fields: { [field]: reason } });
}

// A real calendar day "YYYY-MM-DD" ("2026-02-30" is not one).
export function isRealDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function daysBetween(from: string, to: string): number {
  return Math.round((dayDate(to).getTime() - dayDate(from).getTime()) / 86400000);
}

// "1 500,00 ₴" for the journal and the history (plain spaces).
export function uah(value: number): string {
  const [int, dec] = round2(value).toFixed(2).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec} ₴`;
}

export function toIso(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  return value === null || value === undefined ? null : toIso(value);
}

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_META[status]?.label ?? String(status);
}

function orderEntity(doc: Pick<OrderDoc, "_id" | "number">): AuditInput["entity"] {
  return { type: "order", id: doc._id, label: `№${doc.number}` };
}

// --- history and notes (shared with the returns repo) ------------------------------------

export function historyEntry(
  by: Actor,
  type: OrderHistoryEntry["type"],
  fields: { from?: string | null; to?: string | null; text?: string | null } = {},
): OrderHistoryEntry {
  return {
    at: new Date(),
    by,
    type,
    ...(fields.from ? { from: fields.from } : {}),
    ...(fields.to ? { to: fields.to } : {}),
    ...(fields.text ? { text: fields.text } : {}),
  };
}

// The staff comment of a change goes into its first history line.
export function withComment(entries: OrderHistoryEntry[], comment: string | undefined): void {
  const text = comment?.trim();
  if (!text || entries.length === 0) return;
  const first = entries[0];
  first.text = first.text ? `${first.text}. Коментар: ${text}` : text;
}

export function newNote(staff: StaffContext, text: string): StaffNote {
  return { id: newId("note"), at: new Date(), by: { id: staff.staff._id, name: staff.staff.name }, text };
}

function actorDto(actor: Actor | undefined): ActorDto {
  return actor
    ? { id: actor.id, name: actor.name, kind: actor.kind }
    : { id: "unknown", name: "", kind: "system" };
}

// Newest first.
export function historyDto(entries: OrderHistoryEntry[] | undefined): HistoryEntryDto[] {
  return (entries ?? [])
    .map((entry) => ({
      at: toIso(entry.at),
      by: actorDto(entry.by),
      type: entry.type,
      from: entry.from ?? null,
      to: entry.to ?? null,
      text: entry.text ?? null,
    }))
    .reverse();
}

export function noteDto(note: StaffNote): StaffNoteDto {
  return { id: note.id, at: toIso(note.at), by: { id: note.by.id, name: note.by.name }, text: note.text };
}

// Newest first.
export function notesDto(notes: StaffNote[] | undefined): StaffNoteDto[] {
  return (notes ?? []).map(noteDto).reverse();
}

// --- lookups ---------------------------------------------------------------------

export async function clientNames(ids: Iterable<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set([...ids].filter((id): id is string => typeof id === "string" && id !== ""))];
  if (unique.length === 0) return new Map();
  const rows = await (await collection("clients"))
    .find({ _id: { $in: unique } }, { projection: { name: 1 } })
    .toArray();
  return new Map(rows.map((row) => [row._id, typeof row.name === "string" ? row.name : ""]));
}

async function staffNames(ids: Iterable<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set([...ids].filter((id): id is string => typeof id === "string" && id !== ""))];
  if (unique.length === 0) return new Map();
  const rows = await (await collection("staff")).find({ _id: { $in: unique } }, { projection: { name: 1 } }).toArray();
  return new Map(rows.map((row) => [row._id, row.name]));
}

export type AccountRef = { id: string; name: string; login: string; type: "b2b" | "b2c" };

export async function accountOf(userId: string | null | undefined): Promise<AccountRef | null> {
  if (!userId) return null;
  const user = await (await collection("users")).findOne(
    { _id: userId },
    { projection: { login: 1, person: 1, type: 1 } },
  );
  if (!user) return null;
  const name = typeof user.person?.fullName === "string" ? user.person.fullName.trim() : "";
  return { id: user._id, name: name || user.login, login: user.login, type: user.type };
}

// The partner company of an order and the day its rules count with (the
// demo company lives on a fixed day); the Kyiv date for a shop order.
async function orderContext(doc: OrderDoc): Promise<{ client: { _id: string; name: string } | null; today: string }> {
  if (doc.channel !== "b2b") return { client: null, today: kyivToday() };
  const client = await (await collection("clients")).findOne(
    { _id: doc.clientId },
    { projection: { name: 1, demoToday: 1 } },
  );
  return {
    client: client ? { _id: client._id, name: typeof client.name === "string" ? client.name : "" } : null,
    today: companyToday(client),
  };
}

// --- DTOs ----------------------------------------------------------------------------

// "Інформація про доставку" of a shop order, with the words the storefront
// writes on a partner order placed at checkout (deliveryOf in
// src/server/repos/orders.ts, which is not exported; keep the two in step).
export function deliveryOf(values: CheckoutValues): DeliveryInfo {
  const method = DELIVERY_OPTIONS.find((o) => o.value === values.delivery)?.label ?? "";
  const ttn = "Ми надішлемо номер ТТН, щойно передамо замовлення перевізнику.";
  let note = "";
  if (values.delivery === "pickup") note = PICKUP_NOTICE;
  else if (values.delivery === "np-branch") note = `${values.branch}. ${ttn}`;
  else if (values.delivery === "np-locker") note = `${values.locker}. ${ttn}`;
  else if (values.delivery === "np-address") {
    const flat = values.flat ? `, кв. ${values.flat}` : "";
    note = `Адреса доставки: м. ${values.city}, ${values.street}, ${values.house}${flat}. Кур'єр зателефонує перед приїздом.`;
  }
  return { city: values.city, method, note };
}

function customerOf(doc: OrderDoc, clientName: string | null): OrderCustomer {
  const typed = doc.checkout;
  const invoiceCompany = typed?.invoice && typed.company ? typed.company : "";
  if (doc.channel === "b2b") {
    return {
      name: typed?.name || doc.createdBy || "",
      company: invoiceCompany || doc.counterparty || clientName || "",
      phone: typed?.phone ?? "",
      email: typed?.email ?? "",
    };
  }
  return {
    name: typed?.name ?? "",
    company: invoiceCompany,
    phone: typed?.phone ?? "",
    email: typed?.email ?? "",
  };
}

export function toOrderRow(doc: OrderDoc, names: ReadonlyMap<string, string>): OrderRow {
  const b2b = doc.channel === "b2b";
  const clientName = b2b ? (names.get(doc.clientId) ?? null) : null;
  return {
    id: doc._id,
    number: doc.number,
    channel: doc.channel,
    date: doc.date,
    createdAt: toIso(doc.createdAt),
    status: doc.status,
    payment: b2b ? doc.payment : (doc.payment ?? null),
    paymentDue: b2b ? doc.paymentDue : null,
    total: doc.total,
    itemsCount: Array.isArray(doc.items) ? doc.items.length : 0,
    customer: customerOf(doc, clientName),
    clientId: b2b ? doc.clientId : null,
    clientName,
    userId: doc.userId ?? null,
    counterparty: b2b ? doc.counterparty : null,
    managerId: doc.managerId ?? null,
    cancelRequested: b2b && doc.cancel?.request === true && doc.status !== "cancelled",
    shipment: doc.shipment ? { ttn: doc.shipment.ttn ?? null, status: doc.shipment.status } : null,
    erpState: doc.erp?.state ?? null,
  };
}

function itemsOf(doc: OrderDoc): OrderItemDto[] {
  if (doc.channel === "b2b") {
    return (doc.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      article: item.article,
      image: item.image,
      qty: item.qty,
      unit: item.unit,
      price: item.price,
      sum: lineSum(item.price, item.qty),
    }));
  }
  // Shop lines carry no id or unit of their own (placeOrder numbers the
  // partner lines the same way).
  return (doc.items ?? []).map((item, k) => ({
    id: `${item.productId}-${k + 1}`,
    productId: item.productId,
    name: item.title,
    article: item.sku,
    image: item.image,
    qty: item.qty,
    unit: "шт",
    price: item.price,
    sum: lineSum(item.price, item.qty),
  }));
}

function paidOf(payment: PaymentState | null, total: number): number {
  if (!payment) return 0;
  if (payment.kind === "paid") return total;
  if (payment.kind === "partial") return Math.min(payment.paid, total);
  return 0;
}

function documentDto(orderId: string, doc: OrderDocumentDoc): OrderDocumentAdminDto {
  const mediaId = parseMediaRef(doc.file);
  return {
    id: doc.id,
    title: doc.title,
    date: doc.date,
    sizeMb: doc.sizeMb,
    format: doc.format,
    ready: doc.ready,
    pendingNote: doc.pendingNote ?? null,
    hasFile: mediaId !== null || fileLocation(doc.file) !== null,
    mediaId,
    href: `/api/admin/orders/${encodeURIComponent(orderId)}/documents/${encodeURIComponent(doc.id)}`,
    kind: doc.kind && (ORDER_DOCUMENT_KINDS as readonly string[]).includes(doc.kind) ? doc.kind : null,
    fromErp: typeof doc.externalId === "string" && doc.externalId !== "",
  };
}

// The document tiles of an order of either channel (a shop order has no
// array until staff attach its first paper).
function documentsOf(doc: OrderDoc): OrderDocumentDoc[] {
  return doc.documents ?? [];
}

function shipmentDto(shipment: OrderShipment): OrderShipmentDto {
  return {
    carrier: shipment.carrier,
    ttn: shipment.ttn ?? null,
    ref: shipment.ref ?? null,
    status: shipment.status,
    statusCode: shipment.statusCode ?? null,
    statusText: shipment.statusText ?? null,
    cost: shipment.cost ?? null,
    estimatedDate: shipment.estimatedDate ?? null,
    recipient: {
      name: shipment.recipient?.name ?? "",
      phone: shipment.recipient?.phone ?? "",
      city: shipment.recipient?.city ?? "",
      cityRef: shipment.recipient?.cityRef ?? null,
      warehouse: shipment.recipient?.warehouse ?? "",
      warehouseRef: shipment.recipient?.warehouseRef ?? null,
      address: shipment.recipient?.address ?? null,
    },
    params: shipment.params
      ? {
          weight: shipment.params.weight,
          seats: shipment.params.seats,
          declaredCost: shipment.params.declaredCost,
          description: shipment.params.description,
          payer: shipment.params.payer,
          paymentMethod: shipment.params.paymentMethod,
          serviceType: shipment.params.serviceType,
          cod: shipment.params.cod ?? null,
        }
      : null,
    createdAt: toIso(shipment.createdAt),
    createdBy: shipment.createdBy ?? null,
    checkedAt: toIsoOrNull(shipment.checkedAt),
    events: (shipment.events ?? []).map((event) => ({ at: toIso(event.at), code: event.code, text: event.text })),
  };
}

function erpDto(erp: ErpLink): OrderDetail["erp"] {
  return {
    externalId: erp.externalId ?? null,
    number: erp.number ?? null,
    state: erp.state,
    queuedAt: toIsoOrNull(erp.queuedAt),
    ackedAt: toIsoOrNull(erp.ackedAt),
    error: erp.error ?? null,
  };
}

function allowedPayments(doc: OrderDoc, today: string): PaymentKind[] {
  const kinds: PaymentKind[] = doc.total > 0 ? ["awaiting", "partial", "paid"] : ["awaiting", "paid"];
  if (doc.channel === "b2b" && isRealDay(doc.paymentDue) && today > doc.paymentDue) kinds.push("overdue");
  return kinds;
}

async function buildDetail(doc: OrderDoc): Promise<OrderDetail> {
  const [{ client, today }, account, manager, returnDocs] = await Promise.all([
    orderContext(doc),
    accountOf(doc.userId),
    doc.managerId ? findStaff(doc.managerId) : Promise.resolve(null),
    (await collection("returns"))
      .find({ orderId: doc._id }, { projection: { status: 1, date: 1 } })
      .sort({ createdAt: -1, _id: -1 })
      .toArray(),
  ]);
  const names = new Map(client ? [[client._id, client.name]] : []);
  const row = toOrderRow(doc, names);
  const items = itemsOf(doc);
  const paid = paidOf(row.payment, doc.total);
  const b2b = doc.channel === "b2b";
  return {
    ...row,
    updatedAt: toIso(doc.updatedAt),
    today,
    items,
    totals: {
      items: sum(items.map((item) => item.sum)),
      total: doc.total,
      units: items.reduce((units, item) => units + item.qty, 0),
      paid,
      due: round2(Math.max(0, doc.total - paid)),
    },
    delivery: b2b ? (doc.delivery ?? null) : doc.checkout ? deliveryOf(doc.checkout) : null,
    checkout: doc.checkout ?? null,
    paymentType: b2b ? doc.paymentType || null : doc.checkout?.payment || null,
    documents: documentsOf(doc).map((d) => documentDto(doc._id, d)),
    cancel: b2b && doc.cancel ? toCancelDto(doc.cancel) : null,
    history: historyDto(doc.history),
    notes: notesDto(doc.notes),
    shipment: doc.shipment ? shipmentDto(doc.shipment) : null,
    erp: doc.erp ? erpDto(doc.erp) : null,
    manager: doc.managerId ? { id: doc.managerId, name: manager?.name ?? "Невідомий співробітник" } : null,
    account,
    company: b2b ? { id: doc.clientId, name: client?.name ?? "" } : null,
    returns: returnDocs.map((ret) => ({ id: ret._id, status: ret.status, date: ret.date })),
    allowedStatuses: [...(ORDER_TRANSITIONS[doc.status] ?? [])],
    allowedPayments: allowedPayments(doc, today),
  };
}

// --- list and export ------------------------------------------------------------------

// The list never needs the long arrays of an order.
const LIST_PROJECTION = {
  history: 0,
  notes: 0,
  documents: 0,
  returnLock: 0,
  "shipment.events": 0,
  "shipment.params": 0,
  "shipment.recipient": 0,
} as const;

// A partner asked to cancel and staff has not decided (the menu badge of
// /api/admin/nav-counts counts the same).
const PENDING_CANCEL: Filter<OrderDoc> = { "cancel.request": true, status: { $ne: "cancelled" } };

function paymentClauses(kind: PaymentKind): Filter<OrderDoc>[] {
  switch (kind) {
    case "awaiting":
      // A shop order with nothing recorded is waiting for its money too.
      return [{ "payment.kind": "awaiting" }, { channel: "retail", payment: { $exists: false } }];
    case "partial":
      return [{ "payment.kind": "partial" }];
    case "paid":
      return [{ "payment.kind": "paid" }];
    case "overdue":
      // Late: the stored overdue state, or a partial payment whose
      // remainder is overdue (what the cabinet's dashboard counts as late).
      return [{ "payment.kind": "overdue" }, { "payment.kind": "partial", "payment.overdue": { $gt: 0 } }];
  }
}

function searchClauses(q: string): Filter<OrderDoc>[] {
  const text = contains(q);
  const clauses: Filter<OrderDoc>[] = [
    { _id: startsWith(q) },
    { counterparty: text },
    { createdBy: text },
    { "checkout.name": text },
    { "checkout.email": text },
    { "checkout.phone": text },
  ];
  // "100123" finds the shop order "BN-100123".
  if (/^\d+$/.test(q)) clauses.push({ _id: startsWith(`BN-${q}`) });
  // "+38 067 123" finds a phone typed as "0671234567".
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 3 && digits !== q) clauses.push({ "checkout.phone": contains(digits) });
  return clauses;
}

export function orderFilter(query: ListQuery): Filter<OrderDoc> {
  const params = query.params;
  const and: Filter<OrderDoc>[] = [];

  const channel = oneOf(params, "channel", ORDER_CHANNELS);
  if (channel) and.push({ channel });

  const statuses = manyOf(params, "status", ORDER_STATUSES);
  if (statuses.length > 0) and.push({ status: { $in: statuses } });

  const payments = manyOf(params, "payment", PAYMENT_KINDS);
  if (payments.length > 0) and.push({ $or: payments.flatMap(paymentClauses) });

  const from = dayParam(params, "from");
  const to = dayParam(params, "to");
  if (from || to) and.push({ date: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } });

  const clientId = idParam(params, "clientId");
  if (clientId) and.push({ clientId });

  if (params.get("managerId") === "none") {
    and.push({ $or: [{ managerId: { $exists: false } }, { managerId: null }] });
  } else {
    const managerId = idParam(params, "managerId");
    if (managerId) and.push({ managerId });
  }

  const cancelRequest = flag(params, "cancelRequest");
  if (cancelRequest === true) and.push(PENDING_CANCEL);
  else if (cancelRequest === false) and.push({ $nor: [PENDING_CANCEL] });

  if (query.q) and.push({ $or: searchClauses(query.q) });

  if (and.length === 0) return {};
  return and.length === 1 ? and[0] : { $and: and };
}

export async function listOrders(query: ListQuery): Promise<Page<OrderRow>> {
  const page = await paginate(await ordersCol(), orderFilter(query), query, { projection: LIST_PROJECTION });
  const names = await clientNames(page.items.map((doc) => (doc.channel === "b2b" ? doc.clientId : null)));
  return { ...page, items: page.items.map((doc) => toOrderRow(doc, names)) };
}

function paymentText(payment: PaymentState | null, total: number): string {
  return payment ? describePayment(payment, total) : PAYMENT_KIND_LABELS.awaiting;
}

// "1500.5" -> "1500,50": a Ukrainian spreadsheet reads a comma as the
// decimal sign.
function csvMoney(value: number): string {
  return round2(value).toFixed(2).replace(".", ",");
}

export const ORDER_EXPORT_HEADER = [
  "Номер",
  "Канал",
  "Дата",
  "Статус",
  "Оплата",
  "Термін оплати",
  "Сума, грн",
  "Позицій",
  "Покупець",
  "Компанія покупця",
  "Телефон",
  "E-mail",
  "Партнер",
  "Контрагент",
  "Менеджер",
  "ТТН",
  "Запит на скасування",
  "Створено",
];

// The rows of GET /orders/export: the list's filters and sort, at most
// ORDER_EXPORT_MAX rows.
export async function exportOrders(query: ListQuery): Promise<(string | number)[][]> {
  const docs = await (await ordersCol())
    .find(orderFilter(query), { projection: LIST_PROJECTION })
    .sort(query.sort)
    .limit(ORDER_EXPORT_MAX)
    .toArray();
  const [names, managers] = await Promise.all([
    clientNames(docs.map((doc) => (doc.channel === "b2b" ? doc.clientId : null))),
    staffNames(docs.map((doc) => doc.managerId)),
  ]);
  return docs.map((doc) => {
    const row = toOrderRow(doc, names);
    return [
      row.number,
      ORDER_CHANNEL_LABELS[row.channel],
      formatDate(row.date),
      orderStatusLabel(row.status),
      paymentText(row.payment, row.total),
      row.paymentDue ? formatDate(row.paymentDue) : "",
      csvMoney(row.total),
      row.itemsCount,
      row.customer.name,
      row.customer.company,
      row.customer.phone,
      row.customer.email,
      row.clientName ?? "",
      row.counterparty ?? "",
      row.managerId ? (managers.get(row.managerId) ?? "") : "",
      row.shipment?.ttn ?? "",
      row.cancelRequested ? "Так" : "",
      formatDateTime(row.createdAt),
    ];
  });
}

// --- reading one order -------------------------------------------------------------------

async function loadOrder(id: string): Promise<OrderDoc> {
  const doc = await (await ordersCol()).findOne({ _id: id }, { projection: { returnLock: 0 } });
  if (!doc) throw new HttpError(404, "not-found");
  return doc;
}

export async function orderDetail(id: string): Promise<OrderDetail> {
  return buildDetail(await loadOrder(id));
}

// --- writing --------------------------------------------------------------------------

type Writes = {
  set?: Document;
  unset?: Record<string, "">;
  push?: Document;
  pull?: Document;
  history: OrderHistoryEntry[];
};

// Applies a change. `guard` = the change was computed from this exact
// version of the order (status moves, payment, due date): a newer version
// means 409 "conflict". Pushing a note or a document needs no guard.
async function commit(
  doc: OrderDoc,
  writes: Writes,
  options: { guard: boolean; filter?: Filter<OrderDoc> },
): Promise<OrderDoc> {
  const now = new Date();
  const history = writes.history.map((entry) => ({ ...entry, at: now }));
  const push: Document = {
    ...writes.push,
    ...(history.length > 0 ? { history: { $each: history, $slice: -HISTORY_MAX } } : {}),
  };
  const update: UpdateFilter<OrderDoc> = {
    $set: { ...writes.set, updatedAt: now },
    // A staff edit makes a seeded order a real one: db:seed leaves it alone.
    $unset: { ...writes.unset, seed: "" },
    // MongoDB refuses an empty operator, so $push / $pull only when used.
    ...(Object.keys(push).length > 0 ? { $push: push } : {}),
    ...(writes.pull ? { $pull: writes.pull } : {}),
  };
  const filter: Filter<OrderDoc> = {
    ...options.filter,
    _id: doc._id,
    ...(options.guard ? { updatedAt: doc.updatedAt } : {}),
  };
  const updated = await (await ordersCol()).findOneAndUpdate(filter, update, {
    returnDocument: "after",
    projection: { returnLock: 0 },
  });
  if (!updated) throw new HttpError(409, "conflict");
  return updated;
}

function describePayment(payment: PaymentState, total: number): string {
  switch (payment.kind) {
    case "awaiting":
      return PAYMENT_KIND_LABELS.awaiting;
    case "paid":
      return payment.late ? "Оплачено із простроченням" : PAYMENT_KIND_LABELS.paid;
    case "partial":
      return `Частково оплачено: ${uah(payment.paid)} із ${uah(total)}${
        payment.overdue ? `, залишок ${uah(payment.overdue)} прострочено` : ""
      }`;
    case "overdue":
      return `Прострочено на ${payment.days} ${daysPlural(payment.days)}`;
  }
}

function paymentKey(payment: PaymentState | null): string {
  if (!payment) return "none";
  switch (payment.kind) {
    case "awaiting":
      return "awaiting";
    case "paid":
      return `paid:${payment.late ? 1 : 0}`;
    case "partial":
      return `partial:${payment.paid}:${payment.overdue ?? 0}`;
    case "overdue":
      return `overdue:${payment.days}`;
  }
}

export type PaymentInput = { kind: PaymentKind; paid?: number };

// The stored PaymentState for what staff recorded. `due` is the due date
// after this change, `today` the company's today. Only a partner order has
// a due date: "late" and "overdue" exist only there.
function paymentState(doc: OrderDoc, input: PaymentInput, due: string | null, today: string): PaymentState {
  const late = doc.channel === "b2b" && due !== null && isRealDay(due) && today > due;
  switch (input.kind) {
    case "awaiting":
      return { kind: "awaiting" };
    case "paid":
      return late ? { kind: "paid", late: true } : { kind: "paid" };
    case "partial": {
      if (input.paid === undefined) throw fieldError("paid", "required");
      const paid = round2(input.paid);
      if (!(paid > 0 && paid < doc.total)) throw fieldError("paid", "range");
      return late ? { kind: "partial", paid, overdue: round2(doc.total - paid) } : { kind: "partial", paid };
    }
    case "overdue": {
      if (doc.channel !== "b2b" || due === null || !isRealDay(due)) {
        throw new HttpError(409, "state", { field: "payment", reason: "no-due-date" });
      }
      if (!(today > due)) throw new HttpError(409, "state", { field: "payment", reason: "not-due" });
      return { kind: "overdue", days: Math.max(1, daysBetween(due, today)) };
    }
  }
}

// Who hears about a new status: the e-mail typed at checkout, else the
// e-mail of the account that placed the order.
async function customerEmail(doc: OrderDoc): Promise<string | null> {
  const typed = doc.checkout?.email?.trim();
  if (typed && EMAIL.test(typed)) return typed;
  if (!doc.userId) return null;
  const user = await (await collection("users")).findOne({ _id: doc.userId }, { projection: { login: 1, person: 1 } });
  const candidates = [user?.person?.email, user?.login].map((value) => (typeof value === "string" ? value.trim() : ""));
  return candidates.find((value) => value !== "" && EMAIL.test(value)) ?? null;
}

// The order stands even if the notice could not be queued: never answer
// an error for a change that was stored.
async function notifyStatus(doc: OrderDoc, status: OrderStatus): Promise<void> {
  try {
    const email = await customerEmail(doc);
    if (email) {
      await enqueueMessage("order-status", email, { number: doc.number, status, label: orderStatusLabel(status) });
    }
  } catch (error) {
    console.error("[admin] queueing the order-status message failed:", error);
  }
}

export type OrderPatch = {
  status?: OrderStatus;
  comment?: string;
  payment?: PaymentInput;
  paymentDue?: string;
  managerId?: string | null;
};

// PATCH /orders/<id>: status (ORDER_TRANSITIONS), due date, payment and
// manager in one change. Everything is checked before anything is
// written; fields equal to what is stored are not a change. Nothing
// changed = the order as it is and no journal line.
export async function updateOrder(staff: StaffContext, id: string, patch: OrderPatch): Promise<Mutation<{ order: OrderDetail }>> {
  const doc = await loadOrder(id);
  const { today } = await orderContext(doc);
  const by = staffActor(staff);
  const set: Document = {};
  const unset: Record<string, ""> = {};
  const history: OrderHistoryEntry[] = [];
  const parts: string[] = [];
  const meta: Record<string, unknown> = {};

  let newStatus: OrderStatus | null = null;
  if (patch.status !== undefined) {
    const allowed = ORDER_TRANSITIONS[doc.status] ?? [];
    if (!allowed.includes(patch.status)) {
      throw new HttpError(409, "state", { from: doc.status, to: patch.status, allowed });
    }
    newStatus = patch.status;
    set.status = patch.status;
    if (doc.channel === "b2b") {
      // Cancelling an order whose partner asked for it decides the request.
      if (patch.status === "cancelled" && doc.cancel?.request) unset["cancel.request"] = "";
      // A restored order starts clean: the old cancel record stays in the
      // history only.
      if (doc.status === "cancelled" && doc.cancel) unset.cancel = "";
    }
    history.push(historyEntry(by, "status", { from: doc.status, to: patch.status }));
    parts.push(`статус «${orderStatusLabel(doc.status)}» -> «${orderStatusLabel(patch.status)}»`);
    meta.from = doc.status;
    meta.to = patch.status;
  }

  let due: string | null = doc.channel === "b2b" ? doc.paymentDue : null;
  if (patch.paymentDue !== undefined) {
    if (doc.channel !== "b2b") throw new HttpError(409, "state", { field: "paymentDue", reason: "retail" });
    if (!isRealDay(patch.paymentDue)) throw fieldError("paymentDue", "date");
    if (patch.paymentDue !== doc.paymentDue) {
      set.paymentDue = patch.paymentDue;
      history.push(
        historyEntry(by, "edit", {
          from: doc.paymentDue,
          to: patch.paymentDue,
          text: `Термін оплати: до ${formatDate(patch.paymentDue)}`,
        }),
      );
      parts.push(`термін оплати до ${formatDate(patch.paymentDue)}`);
      meta.paymentDue = { from: doc.paymentDue, to: patch.paymentDue };
      due = patch.paymentDue;
    }
  }

  if (patch.payment) {
    const next = paymentState(doc, patch.payment, due, today);
    const current = doc.payment ?? null;
    if (paymentKey(current) !== paymentKey(next)) {
      set.payment = next;
      const text = describePayment(next, doc.total);
      history.push(historyEntry(by, "payment", { from: current?.kind ?? "awaiting", to: next.kind, text }));
      parts.push(`оплата: ${text}`);
      meta.payment = { from: current, to: next };
    }
  }

  if (patch.managerId !== undefined) {
    const current = doc.managerId ?? null;
    if (patch.managerId !== current) {
      let name: string | null = null;
      if (patch.managerId !== null) {
        const member = await findStaff(patch.managerId);
        if (!member || !member.isActive) throw fieldError("managerId", "unknown");
        name = member.name;
      }
      set.managerId = patch.managerId;
      history.push(
        historyEntry(by, "manager", {
          from: current,
          to: patch.managerId,
          text: name ? `Менеджер: ${name}` : "Менеджера знято",
        }),
      );
      parts.push(name ? `менеджер ${name}` : "менеджера знято");
      meta.managerId = { from: current, to: patch.managerId };
    }
  }

  if (history.length === 0) return { order: await buildDetail(doc), audit: null };
  withComment(history, patch.comment);
  if (patch.comment?.trim()) meta.comment = patch.comment.trim();

  const updated = await commit(doc, { set, unset, history }, { guard: true, filter: { status: doc.status } });
  if (newStatus) await notifyStatus(updated, newStatus);
  return {
    order: await buildDetail(updated),
    audit: {
      action: newStatus ? "order.status" : patch.payment && set.payment ? "order.payment" : "order.update",
      entity: orderEntity(doc),
      summary: `Замовлення №${doc.number}: ${parts.join("; ")}`,
      meta,
    },
  };
}

// --- cancel requests ---------------------------------------------------------------------

// A partner's "Запит на скасування" (an order in work): staff approve it
// (the order is cancelled; the reason, the solution and the day stay on
// the record, the request flag goes) or decline it (the record goes, the
// partner may ask again).
export async function decideCancelRequest(
  staff: StaffContext,
  id: string,
  decision: "approve" | "decline",
  comment: string | undefined,
): Promise<Mutation<{ order: OrderDetail }>> {
  const doc = await loadOrder(id);
  if (doc.channel !== "b2b" || !doc.cancel?.request || doc.status === "cancelled") {
    throw new HttpError(409, "state", { reason: "no-request" });
  }
  const by = staffActor(staff);
  const reason = doc.cancel.reason;
  const history: OrderHistoryEntry[] = [];
  const set: Document = {};
  const unset: Record<string, ""> = {};
  let summary: string;

  if (decision === "approve") {
    if (!(ORDER_TRANSITIONS[doc.status] ?? []).includes("cancelled")) {
      throw new HttpError(409, "state", { from: doc.status, to: "cancelled" });
    }
    set.status = "cancelled";
    unset["cancel.request"] = "";
    history.push(
      historyEntry(by, "cancel", {
        from: doc.status,
        to: "cancelled",
        text: `Запит на скасування погоджено (причина: ${reason})`,
      }),
    );
    summary = `Замовлення №${doc.number}: запит на скасування погоджено, статус «${orderStatusLabel(doc.status)}» -> «${orderStatusLabel("cancelled")}»`;
  } else {
    unset.cancel = "";
    history.push(historyEntry(by, "cancel", { text: `Запит на скасування відхилено (причина: ${reason})` }));
    summary = `Замовлення №${doc.number}: запит на скасування відхилено`;
  }
  withComment(history, comment);

  const updated = await commit(
    doc,
    { set, unset, history },
    { guard: true, filter: { status: doc.status, "cancel.request": true } },
  );
  if (decision === "approve") await notifyStatus(updated, "cancelled");
  return {
    order: await buildDetail(updated),
    audit: {
      action: decision === "approve" ? "order.cancel-approve" : "order.cancel-decline",
      entity: orderEntity(doc),
      summary,
      meta: { decision, reason, status: doc.status, ...(comment?.trim() ? { comment: comment.trim() } : {}) },
    },
  };
}

// --- internal notes ------------------------------------------------------------------------

export async function addOrderNote(
  staff: StaffContext,
  id: string,
  text: string,
): Promise<Mutation<{ note: StaffNoteDto }>> {
  const doc = await loadOrder(id);
  if ((doc.notes?.length ?? 0) >= ORDER_NOTES_MAX) throw new HttpError(409, "state", { reason: "notes-limit" });
  const note = newNote(staff, text);
  await commit(
    doc,
    { push: { notes: note }, history: [historyEntry(staffActor(staff), "note", { text: "Додано внутрішню нотатку" })] },
    { guard: false },
  );
  return {
    note: noteDto(note),
    audit: {
      action: "order.note-add",
      entity: orderEntity(doc),
      summary: `Замовлення №${doc.number}: додано внутрішню нотатку`,
      meta: { noteId: note.id },
    },
  };
}

export async function removeOrderNote(staff: StaffContext, id: string, noteId: string): Promise<Mutation<object>> {
  const doc = await loadOrder(id);
  const note = doc.notes?.find((n) => n.id === noteId);
  if (!note) throw new HttpError(404, "not-found");
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
      action: "order.note-remove",
      entity: orderEntity(doc),
      summary: `Замовлення №${doc.number}: видалено внутрішню нотатку`,
      meta: { noteId, author: note.by.name },
    },
  };
}

// --- documents --------------------------------------------------------------------------

// The file types whose content type names them better than a missing or
// odd file extension would.
const FORMAT_BY_TYPE: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/plain": "TXT",
  "text/csv": "CSV",
};

// What the tile says about the file: "PDF", "DOCX", "XLSX", "JPG" ... The
// media library decided the content type from the file's bytes, so it is
// trusted first; the extension of the name covers the rest.
function formatOf(media: MediaDoc): string {
  const known = FORMAT_BY_TYPE[media.contentType];
  if (known) return known;
  const ext = /\.([A-Za-z0-9]{1,8})$/.exec(media.filename)?.[1];
  return ext ? ext.toUpperCase() : "FILE";
}

// The tile shows the format as a short label: anything but a plain short
// token (a content type without a known name) becomes "FILE".
function storableFormat(format: string): string {
  return /^[A-Z0-9]{1,8}$/.test(format) ? format : "FILE";
}

function sizeMbOf(bytes: number): number {
  return Math.max(0.1, Math.round(bytes / 104857.6) / 10);
}

async function attachable(mediaId: string): Promise<{ file: string; sizeMb: number; format: string }> {
  const media = await findMedia(mediaId);
  if (!media) throw fieldError("mediaId", "unknown");
  return { file: mediaRef(media._id), sizeMb: sizeMbOf(media.size), format: storableFormat(formatOf(media)) };
}

function hasUsableFile(file: string | null): boolean {
  return parseMediaRef(file) !== null || fileLocation(file) !== null;
}

export type DocumentInput = {
  title: string;
  mediaId?: string;
  date?: string;
  ready?: boolean;
  pendingNote?: string;
};

export async function addOrderDocument(
  staff: StaffContext,
  id: string,
  input: DocumentInput,
): Promise<Mutation<{ document: OrderDocumentAdminDto }>> {
  const doc = await loadOrder(id);
  if (documentsOf(doc).length >= ORDER_DOCUMENTS_MAX) {
    throw new HttpError(409, "state", { reason: "documents-limit" });
  }
  if (input.date !== undefined && !isRealDay(input.date)) throw fieldError("date", "date");
  const attached = input.mediaId ? await attachable(input.mediaId) : null;
  const ready = input.ready ?? attached !== null;
  if (ready && !attached) throw fieldError("ready", "file");
  const { today } = await orderContext(doc);

  const pendingNote = input.pendingNote?.trim();
  const stored: OrderDocumentDoc = {
    id: newId("doc"),
    title: input.title,
    date: input.date ?? today,
    sizeMb: attached?.sizeMb ?? 0,
    format: attached?.format ?? "PDF",
    ready,
    ...(pendingNote ? { pendingNote } : {}),
    file: attached?.file ?? null,
  };
  await commit(
    doc,
    {
      push: { documents: stored },
      history: [historyEntry(staffActor(staff), "document", { text: `Додано документ «${stored.title}»` })],
    },
    { guard: false },
  );
  return {
    document: documentDto(doc._id, stored),
    audit: {
      action: "order.document-add",
      entity: orderEntity(doc),
      summary: `Замовлення №${doc.number}: додано документ «${stored.title}»`,
      meta: { documentId: stored.id, mediaId: input.mediaId ?? null, ready },
    },
  };
}

export type DocumentPatch = {
  title?: string;
  ready?: boolean;
  pendingNote?: string | null;
  mediaId?: string | null;
};

export async function updateOrderDocument(
  staff: StaffContext,
  id: string,
  docId: string,
  input: DocumentPatch,
): Promise<Mutation<{ document: OrderDocumentAdminDto }>> {
  const doc = await loadOrder(id);
  const current = documentsOf(doc).find((d) => d.id === docId);
  if (!current) throw new HttpError(404, "not-found");

  const set: Document = {};
  const unset: Record<string, ""> = {};
  const changes: string[] = [];

  if (input.title !== undefined && input.title !== current.title) {
    set["documents.$.title"] = input.title;
    changes.push(`назва «${input.title}»`);
  }

  let file = current.file;
  let fileChange: "attached" | "detached" | null = null;
  if (input.mediaId === null && current.file !== null) {
    set["documents.$.file"] = null;
    set["documents.$.sizeMb"] = 0;
    file = null;
    fileChange = "detached";
    changes.push("файл знято");
  } else if (typeof input.mediaId === "string") {
    const attached = await attachable(input.mediaId);
    if (attached.file !== current.file) {
      set["documents.$.file"] = attached.file;
      set["documents.$.sizeMb"] = attached.sizeMb;
      set["documents.$.format"] = attached.format;
      file = attached.file;
      fileChange = "attached";
      changes.push("новий файл");
    }
  }

  // A tile that just got its file is ready unless told otherwise; one that
  // lost it cannot be.
  const ready =
    input.ready ?? (fileChange === "attached" ? true : fileChange === "detached" ? false : current.ready);
  if (ready && !hasUsableFile(file)) throw fieldError("ready", "file");
  if (ready !== current.ready) {
    set["documents.$.ready"] = ready;
    changes.push(ready ? "доступний клієнту" : "очікує");
  }

  if (input.pendingNote !== undefined) {
    const note = input.pendingNote?.trim() || null;
    if (note === null && current.pendingNote !== undefined) {
      unset["documents.$.pendingNote"] = "";
      changes.push("примітку знято");
    } else if (note !== null && note !== current.pendingNote) {
      set["documents.$.pendingNote"] = note;
      changes.push(`примітка «${note}»`);
    }
  }

  if (changes.length === 0) return { document: documentDto(doc._id, current), audit: null };

  const updated = await commit(
    doc,
    {
      set,
      unset,
      history: [
        historyEntry(staffActor(staff), "document", { text: `Документ «${current.title}»: ${changes.join(", ")}` }),
      ],
    },
    { guard: false, filter: { "documents.id": docId } },
  );
  const after = documentsOf(updated).find((d) => d.id === docId);
  if (!after) throw new HttpError(409, "conflict");
  return {
    document: documentDto(doc._id, after),
    audit: {
      action: "order.document-update",
      entity: orderEntity(doc),
      summary: `Замовлення №${doc.number}: документ «${current.title}»: ${changes.join(", ")}`,
      meta: { documentId: docId, ...input },
    },
  };
}

export async function removeOrderDocument(staff: StaffContext, id: string, docId: string): Promise<Mutation<object>> {
  const doc = await loadOrder(id);
  const current = documentsOf(doc).find((d) => d.id === docId);
  if (!current) throw new HttpError(404, "not-found");
  await commit(
    doc,
    {
      pull: { documents: { id: docId } },
      history: [historyEntry(staffActor(staff), "document", { text: `Видалено документ «${current.title}»` })],
    },
    { guard: false, filter: { "documents.id": docId } },
  );
  return {
    audit: {
      action: "order.document-remove",
      entity: orderEntity(doc),
      summary: `Замовлення №${doc.number}: видалено документ «${current.title}»`,
      // The uploaded file stays in the media library (it may be used
      // elsewhere); the journal names it so it can be found.
      meta: { documentId: docId, file: parseMediaRef(current.file) ? current.file : null },
    },
  };
}

export type DocumentFile =
  | { kind: "media"; meta: MediaDoc; bytes: Buffer }
  | { kind: "redirect"; location: string };

// The file of a document for staff, ready for the customer or not: an
// uploaded file (streamed by the route), or a stored path / https link
// (the route redirects). null = no such document or no usable file.
export async function orderDocumentFile(id: string, docId: string): Promise<DocumentFile | null> {
  const doc = await (await ordersCol()).findOne({ _id: id }, { projection: { channel: 1, documents: 1 } });
  const stored = doc ? documentsOf(doc).find((d) => d.id === docId) : undefined;
  if (!stored) return null;
  const mediaId = parseMediaRef(stored.file);
  if (mediaId) {
    const media = await readMedia(mediaId);
    return media ? { kind: "media", meta: media.meta, bytes: media.bytes } : null;
  }
  const location = fileLocation(stored.file);
  return location ? { kind: "redirect", location } : null;
}
