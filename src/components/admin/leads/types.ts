import type { Tone } from "../ui/tokens";

// The contract of the form submissions ("leads") API of the admin panel,
// shared by the routes under src/app/api/admin/leads and the screens of
// /admin/leads. Types and plain constants only: no "use client", no server
// import, so both sides can read it.
//
//   GET    /api/admin/leads                    [leads.view] -> LeadsPage
//          ?kind=quiz,star-checklist  ?status=new,in_progress  ?assigneeId=<staff id>|none|me
//          ?from=YYYY-MM-DD&to=YYYY-MM-DD (Kyiv days of createdAt, both inclusive)
//          ?q=<text> (contact name, e-mail, phone, company)  ?sort=-createdAt|createdAt|-updatedAt|updatedAt
//          ?page=1&limit=20
//   GET    /api/admin/leads/export             [leads.view] -> text/csv of the same filters (no paging)
//   GET    /api/admin/leads/<id>               [leads.view] -> { ok: true, lead: LeadDetail }
//   PATCH  /api/admin/leads/<id>               [leads.edit] LeadPatchBody -> { ok: true, lead: LeadDetail }
//   DELETE /api/admin/leads/<id>               [leads.edit] only a lead in status "spam" -> { ok: true }
//   POST   /api/admin/leads/<id>/notes         [leads.edit] LeadNoteBody -> { ok: true, note: LeadNoteDto, lead: LeadDetail }
//   DELETE /api/admin/leads/<id>/notes/<noteId> [leads.edit] -> { ok: true, lead: LeadDetail }
//   POST   /api/admin/leads/bulk               [leads.edit] LeadBulkBody -> LeadBulkResult
//
// Refusals: 400 "bad-request" (malformed body), 400 "fields" with
// { fields: { assigneeId: "not-found" } } (no such active member of staff),
// 404 "not-found", 409 "state" (deleting a lead that is not marked spam),
// 403 "not-author" (deleting a note somebody else wrote).

export type LeadKind = "quiz" | "star-checklist" | "partner-contact";

// The same words as the kit's LEAD_KIND (ui/status.tsx), so the badge, the
// filter, the CSV and the search say the same thing.
export const LEAD_KINDS: { value: LeadKind; label: string }[] = [
  { value: "quiz", label: "Квіз-підбір" },
  { value: "star-checklist", label: "Чеклист за зірковістю" },
  { value: "partner-contact", label: "Запит на співпрацю" },
];

export const LEAD_KIND_LABELS: Record<LeadKind, string> = {
  quiz: "Квіз-підбір",
  "star-checklist": "Чеклист за зірковістю",
  "partner-contact": "Запит на співпрацю",
};

export type LeadStatus = "new" | "in_progress" | "done" | "spam";

// In the order of the tabs.
export const LEAD_STATUSES: { value: LeadStatus; label: string; tone: Tone }[] = [
  { value: "new", label: "Нова", tone: "blue" },
  { value: "in_progress", label: "В роботі", tone: "orange" },
  { value: "done", label: "Опрацьована", tone: "green" },
  { value: "spam", label: "Спам", tone: "neutral" },
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Нова",
  in_progress: "В роботі",
  done: "Опрацьована",
  spam: "Спам",
};

export const LEAD_KIND_VALUES = ["quiz", "star-checklist", "partner-contact"] as const satisfies readonly LeadKind[];
export const LEAD_STATUS_VALUES = ["new", "in_progress", "done", "spam"] as const satisfies readonly LeadStatus[];

// The value of the assignee filter that means "nobody is assigned".
export const LEAD_UNASSIGNED = "none";
// The value that means "assigned to the member of staff who asks".
export const LEAD_ASSIGNED_TO_ME = "me";

// What the form told about the sender (only what was filled in; null for
// a field the form did not ask or the visitor left empty).
export type LeadContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
};

// One line of the inbox table.
export type LeadRow = {
  id: string;
  kind: LeadKind;
  // The page the form was sent from ("/", "/hotels", "/spivpratsya").
  source: string;
  status: LeadStatus;
  contact: LeadContact;
  // One line built per kind: the quiz directions (or object types) and
  // tasks, the star count, the beginning of the partner's comment.
  summary: string;
  assigneeId: string | null;
  // null when nobody is assigned or the account no longer exists.
  assigneeName: string | null;
  // ISO strings.
  createdAt: string;
  updatedAt: string | null;
};

// How many leads of each status match the current filters (all filters
// except `status` itself), for the tabs. `all` is the sum.
export type LeadCounts = Record<LeadStatus, number> & { all: number };

export type LeadsPage = {
  ok: true;
  items: LeadRow[];
  total: number;
  page: number;
  limit: number;
  counts: LeadCounts;
};

// How a field of the detail is best shown: `email` and `phone` as links
// (mailto: / tel:), `long` as a paragraph that keeps line breaks, `stars`
// as the rating, `list` as several values (`value` is them joined by ", ").
export type LeadFieldType = "text" | "email" | "phone" | "long" | "stars" | "list";

// One field of the submission, decoded and ready to show: quiz option
// codes are replaced by the labels the visitor saw, under the step titles
// of the form variant the lead came from.
export type LeadField = {
  // The payload key the value came from ("direction", "typeCustom").
  key: string;
  label: string;
  value: string;
  type: LeadFieldType;
};

export type LeadNoteDto = {
  id: string;
  // ISO string.
  at: string;
  by: { id: string; name: string };
  text: string;
};

// The notice queued for the sales inbox when the lead arrived (outbox
// collection); null when there is none.
export type LeadOutboxDto = {
  // The message id: /admin/integrations/mail?id=<id> opens it.
  id: string;
  to: string;
  createdAt: string;
  // null = not delivered (yet).
  sentAt: string | null;
  attempts: number;
  lastError: string | null;
};

// The customer account the visitor was signed in with when sending.
export type LeadAccountDto = {
  id: string;
  name: string;
  type: "b2b" | "b2c";
};

export type LeadDetail = LeadRow & {
  // Which set of quiz steps decoded the answers ("hotels" for /hotels,
  // "default" elsewhere); null for the other kinds.
  quizVariant: "default" | "hotels" | null;
  fields: LeadField[];
  // The submission exactly as stored.
  payload: Record<string, unknown>;
  userAgent: string | null;
  account: LeadAccountDto | null;
  notes: LeadNoteDto[];
  outbox: LeadOutboxDto | null;
  // Whether a mail provider is set up (the mail settings are complete), so
  // a notice that is still waiting can be told apart from one nobody can
  // send.
  mailConfigured: boolean;
};

export type LeadPatchBody = {
  status?: LeadStatus;
  // An active member of staff, or null to clear.
  assigneeId?: string | null;
};

export type LeadNoteBody = { text: string };

export const LEAD_NOTE_MAX = 2000;

export type LeadBulkBody = {
  // 1..LEAD_BULK_MAX distinct lead ids.
  ids: string[];
  status: LeadStatus;
};

export const LEAD_BULK_MAX = 200;

export type LeadBulkResult = {
  ok: true;
  // How many of the ids exist.
  matched: number;
  // How many changed status (the others already had it).
  updated: number;
};

// The search parameter of /admin/leads that opens one lead in the drawer:
// /admin/leads?id=<id> (the panel's search, the journal and the e-mail
// notice about a new submission link there).
export const LEAD_OPEN_PARAM = "id";

// The value of the status tab "Усі" in the address bar (/admin/leads?status=all).
// The inbox opens on "Нові" when the address names no status; the API reads
// an unknown status value as "no status filter", so "all" needs no special
// case there.
export const LEAD_STATUS_ALL = "all";

// Sentences for the refusals of this API, for errorMessage(result, LEAD_ERRORS).
export const LEAD_ERRORS: Record<string, string> = {
  state: "Видалити можна лише заявку, позначену як спам.",
  "not-author": "Видалити нотатку може лише той, хто її написав.",
  fields: "Цього співробітника не знайдено або його заблоковано. Оберіть іншого.",
  "not-found": "Заявку не знайдено: можливо, її вже видалили.",
};
