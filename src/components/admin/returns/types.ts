// The contract of the staff API of return requests (/api/admin/returns/**),
// shared by the route handlers, the panel's repo
// (src/server/admin/repos/returns.ts) and the return screens. Types and
// plain constants only: no "use client", no server import.
//
// Return requests exist for partner orders only (the cabinet's
// "Оформити повернення"). Labels and tones of the statuses:
// RETURN_STATUS_META in src/components/platform/ui/ReturnStatusBadge.tsx.
import type { HistoryEntryDto, OrderAccountDto, OrderStatus, StaffNoteDto } from "@/components/admin/orders/types";
import type { PaymentState } from "@/components/platform/orders/data";
import type { ReturnStatusKey } from "@/components/platform/ui/ReturnStatusBadge";

export type ReturnStatus = ReturnStatusKey;

export const RETURN_STATUSES = [
  "created",
  "review",
  "approved",
  "rejected",
  "inTransit",
  "accepted",
  "completed",
  "cancelled",
] as const satisfies readonly ReturnStatusKey[];

// What a status may change to in the panel (PATCH /returns/<id>).
// "rejected -> review" reopens a request; "cancelled" is the customer's
// own withdrawal and is final for staff too.
export const RETURN_TRANSITIONS: Record<ReturnStatus, readonly ReturnStatus[]> = {
  created: ["review", "approved", "rejected"],
  review: ["approved", "rejected"],
  approved: ["inTransit", "accepted", "rejected"],
  inTransit: ["accepted"],
  accepted: ["completed"],
  completed: [],
  rejected: ["review"],
  cancelled: [],
};

export const RETURN_SORTS = ["createdAt", "date"] as const;
export type ReturnSort = (typeof RETURN_SORTS)[number];

export const RETURN_COMMENT_MAX = 1000;
export const RETURN_REJECT_REASON_MAX = 500;
export const RETURN_TTN_MAX = 40;
export const RETURN_NOTE_MAX = 2000;
export const RETURN_NOTES_MAX = 200;

// --- GET /api/admin/returns -------------------------------------------------------------

// Query string (every filter optional):
//   q          prefix of the request id or of the order number
//   status     one or several RETURN_STATUSES
//   clientId   partner company
//   from, to   request date "YYYY-MM-DD", inclusive
//   sort       "createdAt" | "date", "-" for descending (default "-createdAt")
//   page, limit
export type ReturnListFilters = {
  q?: string;
  status?: ReturnStatus[];
  clientId?: string;
  from?: string;
  to?: string;
  sort?: ReturnSort | `-${ReturnSort}`;
  page?: number;
  limit?: number;
};

export type ReturnRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName: string | null;
  // Request date, "YYYY-MM-DD" (the company's day).
  date: string;
  createdAt: string;
  status: ReturnStatus;
  linesCount: number;
  // Sum of qty x the order line's price (the cabinet's "Сума повернення").
  total: number;
  // "Бажане рішення" and "Варіанти зворотньої доставки" as the partner
  // chose them (the cabinet's labels).
  solution: string;
  delivery: string;
};

// How many requests of each status match the list's filters other than
// `status` (the sums of the list's tabs).
export type ReturnStatusCounts = Record<ReturnStatus, number>;

export type ReturnsPage = {
  ok: true;
  items: ReturnRow[];
  total: number;
  page: number;
  limit: number;
  counts: ReturnStatusCounts;
};

// The tabs of the list: presets of `status` ("?status=created,review").
// "waiting" is also what the menu counter counts.
export const RETURN_GROUPS = {
  waiting: ["created", "review"],
  working: ["approved", "inTransit", "accepted"],
  closed: ["completed", "rejected", "cancelled"],
} as const satisfies Record<string, readonly ReturnStatus[]>;

export type ReturnGroup = keyof typeof RETURN_GROUPS;

// --- GET /api/admin/returns/<id> ---------------------------------------------------------

// A requested line resolved against the order. A line whose order line is
// gone (should never happen) keeps its id with empty texts and price 0.
export type ReturnLineDto = {
  itemId: string;
  name: string;
  article: string;
  image: string;
  qty: number;
  unit: string;
  price: number;
  sum: number;
  reason: string;
};

export type ReturnOrderSummary = {
  id: string;
  number: string;
  date: string;
  status: OrderStatus;
  total: number;
  counterparty: string;
  createdBy: string;
  payment: PaymentState;
};

export type ReturnDetail = ReturnRow & {
  updatedAt: string;
  lines: ReturnLineDto[];
  // null when the order no longer exists.
  order: ReturnOrderSummary | null;
  company: { id: string; name: string } | null;
  account: OrderAccountDto | null;
  // The company's day the partner withdrew the request (status "cancelled").
  withdrawnAt: string | null;
  rejectReason: string | null;
  refundAmount: number | null;
  returnTtn: string | null;
  // Newest first.
  history: HistoryEntryDto[];
  notes: StaffNoteDto[];
  // What PATCH { status } accepts now (RETURN_TRANSITIONS of the status).
  allowedStatuses: ReturnStatus[];
};

export type ReturnAnswer = { ok: true; return: ReturnDetail };

// --- request bodies ----------------------------------------------------------------------

// PATCH /api/admin/returns/<id> [returns.edit] -> ReturnAnswer. At least
// one of status, rejectReason, refundAmount, returnTtn. `rejectReason` is
// kept only while the request is (or becomes) "rejected" and is required
// for that move (in the body or already stored); reopening
// ("rejected -> review") removes it. `refundAmount` / `returnTtn` null or
// "" clears them. Refusals: 400 "bad-request", 400 "fields" with
// fields.rejectReason ("required"), fields.returnTtn ("format"); 409
// "state" (a move outside RETURN_TRANSITIONS, any change of a withdrawn
// request); 409 "conflict" (changed meanwhile).
export type ReturnPatchBody = {
  status?: ReturnStatus;
  comment?: string;
  rejectReason?: string | null;
  refundAmount?: number | null;
  returnTtn?: string | null;
};

// POST /api/admin/returns/<id>/notes [returns.edit] { text } -> { ok, note }
// DELETE /api/admin/returns/<id>/notes/<noteId> [returns.edit] -> { ok }
export type ReturnNoteBody = { text: string };

// The section's wording of refusals (on top of the panel's shared ones in
// lib/api.ts). A 409 "state" with data.reason "withdrawn" or "notes-limit"
// has its own sentence below; the screens pick it by the reason.
export const RETURN_ERRORS: Record<string, string> = {
  conflict: "Заявку тим часом змінили. На сторінці вже актуальні дані: перевірте їх і повторіть дію.",
  state: "Цю дію зараз виконати не можна: стан заявки змінився. Оновіть сторінку.",
  "not-found": "Заявку на повернення не знайдено: можливо, адреса неточна.",
};

export const RETURN_STATE_REASONS: Record<string, string> = {
  withdrawn: "Клієнт відкликав цю заявку: змінити її вже не можна.",
  "notes-limit": "Нотаток у заявці вже забагато: видаліть застарілі.",
};
