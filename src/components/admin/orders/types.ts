// The contract of the staff API of orders (/api/admin/orders/**), shared by
// the route handlers, the panel's repo (src/server/admin/repos/orders.ts)
// and the order screens. Types and plain constants only: no "use client",
// no server import, so both sides can read this file.
//
// Both channels of the `orders` collection appear here in one shape:
// partner orders ("b2b", the cabinet's orders) and shop orders placed by
// guests and retail customers ("retail"). Dates are ISO strings in the
// answers; business days stay "YYYY-MM-DD".
import type { CheckoutValues } from "@/components/checkout/data";
import type { CancelRecord, DeliveryInfo, PaymentState } from "@/components/platform/orders/data";
import type { OrderStatusKey } from "@/components/platform/ui/OrderStatusBadge";
import type { ReturnStatusKey } from "@/components/platform/ui/ReturnStatusBadge";

// --- vocabularies ---------------------------------------------------------------

export const ORDER_CHANNELS = ["b2b", "retail"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  b2b: "Партнер",
  retail: "Роздріб",
};

// Labels and tones of the statuses: ORDER_STATUS_META in
// src/components/platform/ui/OrderStatusBadge.tsx (the cabinet's badge).
export type OrderStatus = OrderStatusKey;

export const ORDER_STATUSES = [
  "new",
  "blocked",
  "inProgress",
  "shipped",
  "received",
  "completed",
  "cancelled",
] as const satisfies readonly OrderStatusKey[];

// What a status may change to in the panel (PATCH /orders/<id>). Anything
// else is refused with 409 "state". "cancelled -> new" restores an order.
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["inProgress", "blocked", "cancelled"],
  blocked: ["new", "inProgress", "cancelled"],
  inProgress: ["shipped", "blocked", "cancelled"],
  shipped: ["received", "inProgress"],
  received: ["completed", "shipped"],
  completed: ["received"],
  cancelled: ["new"],
};

// What staff may record about the money (PATCH /orders/<id> { payment }).
// The stored state is the cabinet's PaymentState; "overdue" exists only
// for partner orders (a shop order has no due date).
export const PAYMENT_KINDS = ["awaiting", "partial", "paid", "overdue"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  awaiting: "Очікується оплата",
  partial: "Частково оплачено",
  paid: "Оплачено",
  overdue: "Прострочено",
};

export const ORDER_SORTS = ["createdAt", "date", "total"] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

// Shipment states of the carrier (collections.ts ShipmentStatus).
export type ShipmentStatus =
  | "draft"
  | "created"
  | "in_transit"
  | "arrived"
  | "received"
  | "refused"
  | "returning"
  | "cancelled"
  | "unknown";

// State of the order in the exchange with the accounting system.
export type ErpState = "pending" | "acked" | "error" | "skipped";

// --- limits of the request bodies ------------------------------------------------

export const ORDER_COMMENT_MAX = 1000;
export const ORDER_NOTE_MAX = 2000;
export const ORDER_NOTES_MAX = 200;
export const ORDER_DOC_TITLE_MAX = 200;
export const ORDER_DOC_NOTE_MAX = 200;
export const ORDER_DOCUMENTS_MAX = 50;
// GET /orders/export answers at most this many rows.
export const ORDER_EXPORT_MAX = 5000;

// --- shared pieces ------------------------------------------------------------------

// Who did something (collections.ts Actor).
export type ActorDto = { id: string; name: string; kind: "staff" | "system" | "integration" | "customer" };

export type HistoryType =
  | "created"
  | "status"
  | "payment"
  | "note"
  | "shipment"
  | "document"
  | "cancel"
  | "manager"
  | "erp"
  | "edit";

// One line of the history of an order or a return request. `from` / `to`
// are status keys for "status" and "cancel", payment kinds for "payment",
// staff ids for "manager", days for an "edit" of the due date; `text` is a
// Ukrainian sentence (with the staff comment, when one was given).
export type HistoryEntryDto = {
  at: string;
  by: ActorDto;
  type: HistoryType;
  from: string | null;
  to: string | null;
  text: string | null;
};

// An internal note: never shown to the customer.
export type StaffNoteDto = { id: string; at: string; by: { id: string; name: string }; text: string };

// --- GET /api/admin/orders -----------------------------------------------------------

// Query string of the list and of GET /orders/export (every filter is
// optional; an unknown value of a closed set is ignored, not refused):
//   q             number prefix ("4829", "BN-1001", or the digits of a shop
//                 number); counterparty, creator, checkout name / phone /
//                 e-mail contain the text
//   channel       "b2b" | "retail"
//   status        one or several ORDER_STATUSES ("status=new&status=blocked"
//                 or "status=new,blocked")
//   payment       one or several PAYMENT_KINDS; "awaiting" includes shop
//                 orders with nothing recorded; "overdue" = the partner
//                 orders, not cancelled, that still owe money and are
//                 stored as late (payment "overdue", or a partial payment
//                 with an overdue remainder) or are past their due date by
//                 the company's today (the overview's "Прострочені оплати"
//                 counts the same orders; see OrderRow.pastDue)
//   from, to      order date "YYYY-MM-DD", inclusive
//   clientId      partner company (clients._id)
//   managerId     staff._id, or "none" for orders without a manager
//   cancelRequest "true": a partner asked to cancel and staff has not
//                 decided; "false": the others
//   sort          "createdAt" | "date" | "total", "-" for descending
//                 (default "-createdAt")
//   page, limit   pager (limit up to 100, default 20)
export type OrderListFilters = {
  q?: string;
  channel?: OrderChannel;
  status?: OrderStatus[];
  payment?: PaymentKind[];
  from?: string;
  to?: string;
  clientId?: string;
  managerId?: string;
  cancelRequest?: boolean;
  sort?: OrderSort | `-${OrderSort}`;
  page?: number;
  limit?: number;
};

export type OrderCustomer = {
  // Who placed it: the checkout name, else the cabinet's "Створив".
  name: string;
  // The invoice company typed at checkout, else the counterparty / company.
  company: string;
  phone: string;
  email: string;
};

export type OrderRow = {
  id: string;
  number: string;
  channel: OrderChannel;
  // Order date, "YYYY-MM-DD".
  date: string;
  createdAt: string;
  status: OrderStatus;
  // null = a shop order with nothing recorded yet (show it as awaiting).
  payment: PaymentState | null;
  // Due date of a partner order ("YYYY-MM-DD"); null for shop orders.
  paymentDue: string | null;
  // A partner order, not cancelled, past its due date by its company's
  // today (a demo company lives on a fixed day) that still owes money:
  // payment=overdue lists it whatever its stored payment says.
  pastDue: boolean;
  total: number;
  // Number of lines.
  itemsCount: number;
  customer: OrderCustomer;
  // Partner company; null for shop orders.
  clientId: string | null;
  clientName: string | null;
  // The account that placed it (null = a guest, or a seeded order).
  userId: string | null;
  // Counterparty of a partner order; null for shop orders.
  counterparty: string | null;
  managerId: string | null;
  // A partner asked to cancel and staff has not decided yet.
  cancelRequested: boolean;
  shipment: { ttn: string | null; status: ShipmentStatus } | null;
  erpState: ErpState | null;
};

export type OrdersPage = { ok: true; items: OrderRow[]; total: number; page: number; limit: number };

// --- GET /api/admin/orders/<id> --------------------------------------------------------

// A line of either channel. Shop lines have no id or unit of their own:
// `id` is "<productId>-<n>" and `unit` is "шт"; `article` is the product
// page's article ("" when it has none).
export type OrderItemDto = {
  id: string;
  productId: string;
  name: string;
  article: string;
  image: string;
  qty: number;
  unit: string;
  price: number;
  sum: number;
};

export type OrderTotals = {
  // Sum of the lines (equals `total` for every order the site placed).
  items: number;
  total: number;
  units: number;
  // Paid so far and what is left, from the payment state.
  paid: number;
  due: number;
};

// What kind of paper a document is. Set on the documents the accounting
// system pushes (collections.ts OrderDocumentKind, restated here because
// that file is server-only); staff uploads carry none.
export const ORDER_DOCUMENT_KINDS = ["invoice", "waybill", "act", "reconciliation", "other"] as const;
export type OrderDocumentKind = (typeof ORDER_DOCUMENT_KINDS)[number];

export const ORDER_DOCUMENT_KIND_LABELS: Record<OrderDocumentKind, string> = {
  invoice: "Рахунок",
  waybill: "Накладна",
  act: "Акт",
  reconciliation: "Акт звірки",
  other: "Документ",
};

// A tile of "Документи замовлення" as staff see it. `href` is the staff
// download route (GET /api/admin/orders/<id>/documents/<docId>); it serves
// the file whether or not the tile is ready for the customer. Orders of
// both channels carry documents (a shop order starts without any).
export type OrderDocumentAdminDto = {
  id: string;
  title: string;
  date: string;
  sizeMb: number;
  // "PDF", "DOCX", "XLSX", "JPG" ...: the type of the attached file.
  format: string;
  ready: boolean;
  pendingNote: string | null;
  // A file is attached (an uploaded one, or a stored path / link).
  hasFile: boolean;
  // The media record of an uploaded file; null for a stored path / link.
  mediaId: string | null;
  href: string;
  // The kind the accounting system gave the paper; null for staff uploads.
  kind: OrderDocumentKind | null;
  // The accounting system pushed it (it carries BAS's own id; a repeated
  // push replaces the tile).
  fromErp: boolean;
};

export type OrderShipmentDto = {
  carrier: "nova-poshta" | "pickup" | "other";
  ttn: string | null;
  ref: string | null;
  status: ShipmentStatus;
  statusCode: string | null;
  statusText: string | null;
  cost: number | null;
  estimatedDate: string | null;
  recipient: {
    name: string;
    phone: string;
    city: string;
    cityRef: string | null;
    warehouse: string;
    warehouseRef: string | null;
    address: string | null;
  };
  params: {
    weight: number;
    seats: number;
    declaredCost: number;
    description: string;
    payer: "Sender" | "Recipient";
    paymentMethod: "Cash" | "NonCash";
    serviceType: string;
    cod: number | null;
  } | null;
  createdAt: string;
  createdBy: string | null;
  checkedAt: string | null;
  events: { at: string; code: string; text: string }[];
};

export type ErpLinkDto = {
  externalId: string | null;
  number: string | null;
  state: ErpState;
  queuedAt: string | null;
  ackedAt: string | null;
  error: string | null;
};

export type OrderAccountDto = { id: string; name: string; login: string; type: "b2b" | "b2c" };

export type OrderDetail = Omit<OrderRow, "shipment"> & {
  updatedAt: string;
  // The day the order's rules count with: the partner company's today
  // (a demo company lives on a fixed day), the Kyiv date for shop orders.
  today: string;
  items: OrderItemDto[];
  totals: OrderTotals;
  // "Інформація про доставку": the stored one of a partner order, or one
  // built from the checkout form with the cabinet's wording.
  delivery: DeliveryInfo | null;
  // The checkout form as it was sent (null for seeded partner orders).
  checkout: CheckoutValues | null;
  // "Тип оплати": the stored label of a partner order, the checkout's
  // payment option of a shop order.
  paymentType: string | null;
  // Papers of the order, both channels (a shop order starts with none).
  documents: OrderDocumentAdminDto[];
  // What the partner's "Скасувати замовлення" recorded; `request: true`
  // waits for POST /orders/<id>/cancel-request.
  cancel: CancelRecord | null;
  // Newest first.
  history: HistoryEntryDto[];
  // Newest first.
  notes: StaffNoteDto[];
  shipment: OrderShipmentDto | null;
  erp: ErpLinkDto | null;
  manager: { id: string; name: string } | null;
  account: OrderAccountDto | null;
  company: { id: string; name: string } | null;
  returns: { id: string; status: ReturnStatusKey; date: string }[];
  // What PATCH { status } accepts now (ORDER_TRANSITIONS of the status).
  allowedStatuses: OrderStatus[];
  // What PATCH { payment: { kind } } accepts now ("overdue" only for a
  // partner order whose due date has passed).
  allowedPayments: PaymentKind[];
};

// GET /orders/<id>, PATCH /orders/<id>, POST /orders/<id>/cancel-request.
export type OrderAnswer = { ok: true; order: OrderDetail };

// --- request bodies ----------------------------------------------------------------------

// PATCH /api/admin/orders/<id> [orders.edit]: at least one of status,
// payment, paymentDue, managerId. `comment` goes into the history entry.
// Refusals: 400 "bad-request" (malformed, nothing to change), 400 "fields"
// with fields.paid ("required" | "range": 0 < paid < total),
// fields.paymentDue ("date"), fields.managerId ("unknown"); 409 "state"
// (a status change outside ORDER_TRANSITIONS, a due date or "overdue" on a
// shop order, "overdue" before the due date has passed); 409 "conflict"
// (the order changed meanwhile).
export type OrderPatchBody = {
  status?: OrderStatus;
  comment?: string;
  payment?: { kind: PaymentKind; paid?: number };
  paymentDue?: string;
  managerId?: string | null;
};

// POST /api/admin/orders/<id>/notes [orders.edit] -> { ok, note }.
// DELETE /api/admin/orders/<id>/notes/<noteId> [orders.edit] -> { ok }:
// the author removes a note, and so does an owner (403 "not-author" for
// anybody else).
export type OrderNoteBody = { text: string };
export type NoteAnswer = { ok: true; note: StaffNoteDto };

// POST /api/admin/orders/<id>/cancel-request [orders.edit] -> OrderAnswer.
// Only while a request waits (409 "state" otherwise; also when the status
// can no longer become "cancelled"). approve: status "cancelled", the
// request flag goes (reason, solution, at stay); decline: the cancel record
// goes.
export type CancelDecisionBody = { decision: "approve" | "decline"; comment?: string };

// POST /api/admin/orders/<id>/documents [orders.edit] -> { ok, document }.
// Orders of both channels. `mediaId` is an uploaded file of any type the
// media library accepts (PDF, office documents, pictures; POST
// /api/admin/media, folder "orders", access "private" is the right
// choice); the tile's format is the file's real type. `date` defaults to
// the company's today (the Kyiv date for a shop order); `ready` defaults
// to true with a file and false without. Refusals: 400 "fields" with
// fields.mediaId ("unknown"), fields.ready ("file": a ready tile needs a
// file), fields.date ("date"); 409 "state" { reason: "documents-limit" }
// (ORDER_DOCUMENTS_MAX reached).
export type OrderDocumentCreateBody = {
  title: string;
  mediaId?: string;
  date?: string;
  ready?: boolean;
  pendingNote?: string;
};

// PATCH /api/admin/orders/<id>/documents/<docId> [orders.edit] ->
// { ok, document }. `mediaId: null` detaches the file (the tile turns
// pending); `pendingNote: null` or "" removes the note.
// DELETE /api/admin/orders/<id>/documents/<docId> [orders.edit] -> { ok }.
// GET /api/admin/orders/<id>/documents/<docId> [orders.view]: the file
// itself (an uploaded one is streamed, a stored path / link is a 302).
export type OrderDocumentPatchBody = {
  title?: string;
  ready?: boolean;
  pendingNote?: string | null;
  mediaId?: string | null;
};

export type OrderDocumentAnswer = { ok: true; document: OrderDocumentAdminDto };

// Sentences for the refusals of the orders routes, more exact than the
// panel-wide ones (pass as the second argument of errorMessage / toastError).
// The screens add sentences of their own where a refusal means something
// specific to the action (a status move, a cancel decision).
export const ORDER_ERRORS: Record<string, string> = {
  conflict: "Замовлення тим часом змінили. На сторінці вже актуальні дані: перевірте їх і повторіть дію.",
  state: "Цю дію зараз виконати не можна: стан замовлення змінився. Оновіть сторінку.",
  "not-found": "Замовлення не знайдено: можливо, адреса неточна.",
  "not-author": "Видалити нотатку може лише той, хто її написав, або власник.",
};
