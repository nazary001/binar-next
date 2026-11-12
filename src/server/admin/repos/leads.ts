import "server-only";
import type { Filter } from "mongodb";
import {
  LEAD_ASSIGNED_TO_ME,
  LEAD_KIND_LABELS,
  LEAD_KIND_VALUES,
  LEAD_STATUS_VALUES,
  LEAD_UNASSIGNED,
  type LeadAccountDto,
  type LeadContact,
  type LeadCounts,
  type LeadDetail,
  type LeadField,
  type LeadNoteDto,
  type LeadOutboxDto,
  type LeadRow,
  type LeadStatus,
} from "@/components/admin/leads/types";
import { plural } from "@/components/admin/lib/format";
import { collection, type LeadDoc, type StaffNote } from "../../db/collections";
import { newId } from "../../ids";
import { mailStatus } from "../../mail/provider";
import type { StaffContext } from "../auth";
import { contains, dayParam, idParam, listQuery, manyOf, paginate, type ListQuery, type Page } from "../list";
import { kyivDayRange } from "./journal";
import { isOwnerActor } from "./roles";

// Form submissions of the marketing pages, as the staff area reads and
// processes them. The storefront writes them (POST /api/leads ->
// repos/leads.ts createLead) with status "new" and an outbox notice whose
// payload.leadId is the lead's id; staff move the status on, assign a
// member of staff, keep notes and delete spam.

// --- what the forms ask -----------------------------------------------------

type QuizOption = { value: string; label: string };
type QuizStepMap = {
  field: string;
  title: string;
  options: QuizOption[];
  // The free-text "Ваш варіант" input of a step.
  custom?: { field: string; label: string };
};

// The option steps of the quiz as the visitor saw them. Only the option
// CODES are stored, so these mirror the form sources word for word; keep
// them in step when a form changes (audit/admin/checks/leads-fixtures.ts
// compares them with the sources).
//
// src/components/home/QuizForm.tsx DEFAULT_STEPS: /, /cleaning, /protect.
export const QUIZ_DEFAULT_STEPS: QuizStepMap[] = [
  {
    field: "direction",
    title: "Оберіть напрям",
    options: [
      { value: "hotel", label: "Товари для готелю" },
      { value: "cleaning", label: "Засоби та інвентар для прибирання" },
      { value: "ppe", label: "Засоби індивідуального захисту" },
    ],
  },
  {
    field: "type",
    title: "Тип об'єкта",
    options: [
      { value: "hotel", label: "Готель" },
      { value: "hostel", label: "Хостел" },
      { value: "apartments", label: "Апартаменти" },
    ],
    custom: { field: "typeCustom", label: "Тип об'єкта: ваш варіант" },
  },
  {
    field: "task",
    title: "Яка ваша задача зараз?",
    options: [
      { value: "budget", label: "Підібрати оптимальні позиції під бюджет" },
      { value: "standards", label: "Оновити стандарти / покращити сервіс" },
      { value: "once", label: "Разова закупівля" },
      { value: "replace", label: "Замінити поточного постачальника" },
      { value: "regular", label: "Потрібні регулярні поставки" },
    ],
  },
];

// src/components/hotels/QuizCta.tsx HOTEL_STEPS: /hotels (other codes for
// the same task labels, a fourth object type, no "your option" field).
export const QUIZ_HOTELS_STEPS: QuizStepMap[] = [
  {
    field: "task",
    title: "Яка ваша задача зараз?",
    options: [
      { value: "budget", label: "Підібрати оптимальні позиції під бюджет" },
      { value: "upgrade", label: "Оновити стандарти / покращити сервіс" },
      { value: "one-off", label: "Разова закупівля" },
      { value: "replace", label: "Замінити поточного постачальника" },
      { value: "regular", label: "Потрібні регулярні поставки" },
    ],
  },
  {
    field: "type",
    title: "Який тип об'єкта?",
    options: [
      { value: "hotel", label: "Готель" },
      { value: "hostel", label: "Хостел" },
      { value: "apartments", label: "Апартаменти" },
      { value: "boutique", label: "Бутік-готель" },
    ],
  },
];

// The contact step of the quiz (both variants).
const QUIZ_CONTACT: { key: string; label: string; type: LeadField["type"] }[] = [
  { key: "name", label: "Ім'я", type: "text" },
  { key: "phone", label: "Телефон", type: "phone" },
  { key: "email", label: "Email", type: "email" },
];

// src/components/spivpratsya/PartnerContactForm.tsx, in the form's order.
const PARTNER_FIELDS: { key: string; label: string; type: LeadField["type"] }[] = [
  { key: "name", label: "Ім'я", type: "text" },
  { key: "company", label: "Компанія", type: "text" },
  { key: "role", label: "Роль", type: "text" },
  { key: "phone", label: "Телефон", type: "phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "comment", label: "Коментар", type: "long" },
];

export type QuizVariant = "default" | "hotels";

// The /hotels page has its own quiz; every other page shows the default.
export function quizVariantOf(source: string): QuizVariant {
  const path = source.replace(/\/+$/, "") || "/";
  return path === "/hotels" ? "hotels" : "default";
}

function stepsOf(variant: QuizVariant): QuizStepMap[] {
  return variant === "hotels" ? QUIZ_HOTELS_STEPS : QUIZ_DEFAULT_STEPS;
}

// --- decoding ---------------------------------------------------------------

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  const one = str(value);
  return one ? [one] : [];
}

function optionLabels(step: QuizStepMap, payload: Record<string, unknown>): string[] {
  return strings(payload[step.field]).map((code) => step.options.find((option) => option.value === code)?.label ?? code);
}

function starsText(stars: number): string {
  return `${stars} ${plural(stars, ["зірка", "зірки", "зірок"])}`;
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function cut(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 3).trimEnd()}...`;
}

// The payload keys nobody planned for (an older or newer form) are shown
// under their own names, so nothing a visitor sent stays hidden.
function extraFields(payload: Record<string, unknown>, known: Set<string>): LeadField[] {
  const fields: LeadField[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (known.has(key)) continue;
    const values = typeof value === "number" || typeof value === "boolean" ? [String(value)] : strings(value);
    if (values.length === 0) continue;
    fields.push({ key, label: key, value: values.join(", "), type: values.length > 1 ? "list" : "text" });
  }
  return fields;
}

function namedFields(
  payload: Record<string, unknown>,
  specs: { key: string; label: string; type: LeadField["type"] }[],
): LeadField[] {
  return specs.flatMap((spec) => {
    const value = str(payload[spec.key]);
    return value ? [{ key: spec.key, label: spec.label, value, type: spec.type }] : [];
  });
}

export function leadFields(doc: Pick<LeadDoc, "kind" | "source" | "payload">): LeadField[] {
  const payload = doc.payload ?? {};
  switch (doc.kind) {
    case "quiz": {
      const fields: LeadField[] = [];
      const known = new Set<string>();
      for (const step of stepsOf(quizVariantOf(doc.source))) {
        known.add(step.field);
        const labels = optionLabels(step, payload);
        if (labels.length > 0) {
          fields.push({ key: step.field, label: step.title, value: labels.join(", "), type: labels.length > 1 ? "list" : "text" });
        }
        if (step.custom) {
          known.add(step.custom.field);
          const own = str(payload[step.custom.field]);
          if (own) fields.push({ key: step.custom.field, label: step.custom.label, value: own, type: "text" });
        }
      }
      for (const spec of QUIZ_CONTACT) known.add(spec.key);
      return [...fields, ...namedFields(payload, QUIZ_CONTACT), ...extraFields(payload, known)];
    }
    case "star-checklist": {
      const fields: LeadField[] = [];
      const stars = payload.stars;
      if (typeof stars === "number") fields.push({ key: "stars", label: "Зірковість готелю", value: starsText(stars), type: "stars" });
      const email = str(payload.email);
      if (email) fields.push({ key: "email", label: "Email", value: email, type: "email" });
      return [...fields, ...extraFields(payload, new Set(["stars", "email"]))];
    }
    case "partner-contact":
      return [
        ...namedFields(payload, PARTNER_FIELDS),
        ...extraFields(payload, new Set(PARTNER_FIELDS.map((spec) => spec.key))),
      ];
    default:
      return extraFields(payload, new Set());
  }
}

// One line for the table: what the visitor wants, at a glance.
export function leadSummary(doc: Pick<LeadDoc, "kind" | "source" | "payload">): string {
  const payload = doc.payload ?? {};
  switch (doc.kind) {
    case "quiz": {
      const variant = quizVariantOf(doc.source);
      const steps = stepsOf(variant);
      const step = (field: string) => steps.find((item) => item.field === field);
      const labels = (field: string) => {
        const found = step(field);
        return found ? optionLabels(found, payload) : [];
      };
      const types = [...labels("type"), ...strings(payload.typeCustom)];
      const what = variant === "hotels" ? types : labels("direction").length ? labels("direction") : types;
      const parts = [what.join(", "), labels("task").join(", ")].filter(Boolean);
      return cut(parts.join(" - ") || "Без відповідей на питання", 200);
    }
    case "star-checklist":
      return typeof payload.stars === "number" ? `Чеклист для готелю: ${starsText(payload.stars)}` : "Чеклист для готелю";
    case "partner-contact": {
      const comment = oneLine(str(payload.comment));
      if (comment) return cut(comment, 140);
      return [str(payload.role), str(payload.company)].filter(Boolean).join(", ") || "Без коментаря";
    }
    default:
      return "";
  }
}

// Who sent it, in a few words (the journal names leads by it).
export function leadWho(doc: Pick<LeadDoc, "_id" | "contact">): string {
  return doc.contact?.name || doc.contact?.email || doc.contact?.phone || doc._id;
}

export function leadEntity(doc: Pick<LeadDoc, "_id" | "kind" | "contact">): { type: string; id: string; label: string } {
  return { type: "lead", id: doc._id, label: `${LEAD_KIND_LABELS[doc.kind] ?? doc.kind}: ${leadWho(doc)}` };
}

// --- rows -------------------------------------------------------------------

function contactOf(doc: LeadDoc): LeadContact {
  return {
    name: doc.contact?.name || null,
    email: doc.contact?.email || null,
    phone: doc.contact?.phone || null,
    company: doc.contact?.company || null,
  };
}

function statusOf(doc: LeadDoc): LeadStatus {
  return (LEAD_STATUS_VALUES as readonly string[]).includes(doc.status) ? doc.status : "new";
}

export function toLeadRow(doc: LeadDoc, staffNames: ReadonlyMap<string, string>): LeadRow {
  const assigneeId = doc.assigneeId ?? null;
  return {
    id: doc._id,
    kind: doc.kind,
    source: doc.source,
    status: statusOf(doc),
    contact: contactOf(doc),
    summary: leadSummary(doc),
    assigneeId,
    assigneeName: assigneeId ? (staffNames.get(assigneeId) ?? null) : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

// Names of members of staff, active or not (an assignee who left keeps
// their name on the leads they had).
async function staffNamesOf(ids: Iterable<string | null | undefined>): Promise<Map<string, string>> {
  const wanted = [...new Set([...ids].filter((id): id is string => typeof id === "string" && id !== ""))];
  if (wanted.length === 0) return new Map();
  const docs = await (await collection("staff"))
    .find({ _id: { $in: wanted } }, { projection: { _id: 1, name: 1 } })
    .toArray();
  return new Map(docs.map((doc) => [doc._id, doc.name]));
}

// --- list -------------------------------------------------------------------

export const LEAD_LIST_OPTIONS = { sortable: ["createdAt", "updatedAt"], defaultSort: "-createdAt", maxLimit: 100 } as const;

// Every filter of the list except the status (the tabs count by status
// within the rest).
function baseFilter(query: ListQuery, staffId: string): Filter<LeadDoc>[] {
  const { params } = query;
  const clauses: Filter<LeadDoc>[] = [];

  const kinds = manyOf(params, "kind", LEAD_KIND_VALUES);
  if (kinds.length) clauses.push({ kind: { $in: kinds } });

  const assignee = params.get("assigneeId");
  if (assignee === LEAD_UNASSIGNED) clauses.push({ assigneeId: null });
  else if (assignee === LEAD_ASSIGNED_TO_ME) clauses.push({ assigneeId: staffId });
  else {
    const id = idParam(params, "assigneeId");
    if (id) clauses.push({ assigneeId: id });
  }

  const createdAt = kyivDayRange(dayParam(params, "from"), dayParam(params, "to"));
  if (createdAt) clauses.push({ createdAt });

  if (query.q) {
    const text = contains(query.q);
    const or: Filter<LeadDoc>[] = [
      { "contact.name": text },
      { "contact.email": text },
      { "contact.phone": text },
      { "contact.company": text },
    ];
    // "067 123 45" finds "0671234567": the digits alone, too - only for
    // text typed as a phone number (an e-mail or a name with digits in it
    // must not find every phone that holds those digits).
    const digits = query.q.replace(/\D/g, "");
    if (/^[\d\s()+.-]+$/.test(query.q) && digits.length >= 3 && digits !== query.q) {
      or.push({ "contact.phone": contains(digits) });
    }
    clauses.push({ $or: or });
  }
  return clauses;
}

function andOf(clauses: Filter<LeadDoc>[]): Filter<LeadDoc> {
  return clauses.length ? { $and: clauses } : {};
}

function statusClause(query: ListQuery): Filter<LeadDoc> | null {
  const statuses = manyOf(query.params, "status", LEAD_STATUS_VALUES);
  return statuses.length ? { status: { $in: statuses } } : null;
}

async function countByStatus(filter: Filter<LeadDoc>): Promise<LeadCounts> {
  const groups = await (await collection("leads"))
    .aggregate<{ _id: string | null; n: number }>([{ $match: filter }, { $group: { _id: "$status", n: { $sum: 1 } } }])
    .toArray();
  const counts: LeadCounts = { new: 0, in_progress: 0, done: 0, spam: 0, all: 0 };
  for (const group of groups) {
    // A lead stored before the panel without a status counts as new.
    const status: LeadStatus =
      typeof group._id === "string" && (LEAD_STATUS_VALUES as readonly string[]).includes(group._id)
        ? (group._id as LeadStatus)
        : "new";
    counts[status] += group.n;
    counts.all += group.n;
  }
  return counts;
}

export async function listLeads(url: URL, staffId: string): Promise<Page<LeadRow> & { counts: LeadCounts }> {
  const query = listQuery(url, LEAD_LIST_OPTIONS);
  const base = baseFilter(query, staffId);
  const status = statusClause(query);
  const leads = await collection("leads");
  const [page, counts] = await Promise.all([
    paginate(leads, andOf(status ? [...base, status] : base), query),
    countByStatus(andOf(base)),
  ]);
  const names = await staffNamesOf(page.items.map((doc) => doc.assigneeId));
  return { ...page, items: page.items.map((doc) => toLeadRow(doc, names)), counts };
}

// The export holds at most this many rows (newest first by default).
export const LEAD_EXPORT_MAX = 5000;

export async function exportLeads(url: URL, staffId: string): Promise<LeadRow[]> {
  const query = listQuery(url, LEAD_LIST_OPTIONS);
  const base = baseFilter(query, staffId);
  const status = statusClause(query);
  const docs = await (await collection("leads"))
    .find(andOf(status ? [...base, status] : base))
    .sort(query.sort)
    .limit(LEAD_EXPORT_MAX)
    .toArray();
  const names = await staffNamesOf(docs.map((doc) => doc.assigneeId));
  return docs.map((doc) => toLeadRow(doc, names));
}

// --- one lead ---------------------------------------------------------------

export async function findLead(id: string): Promise<LeadDoc | null> {
  return (await collection("leads")).findOne({ _id: id });
}

function noteDto(note: StaffNote): LeadNoteDto {
  return { id: note.id, at: note.at.toISOString(), by: { id: note.by.id, name: note.by.name }, text: note.text };
}

async function accountOf(userId: string | null): Promise<LeadAccountDto | null> {
  if (!userId) return null;
  const user = await (await collection("users")).findOne(
    { _id: userId },
    { projection: { _id: 1, type: 1, login: 1, "person.fullName": 1 } },
  );
  if (!user) return null;
  return { id: user._id, name: user.person?.fullName?.trim() || user.login || user._id, type: user.type };
}

async function outboxOf(leadId: string): Promise<LeadOutboxDto | null> {
  const message = await (await collection("outbox")).findOne(
    { kind: "lead", "payload.leadId": leadId },
    { sort: { createdAt: -1 } },
  );
  if (!message) return null;
  return {
    id: message._id,
    to: message.to,
    createdAt: message.createdAt.toISOString(),
    sentAt: message.sentAt ? message.sentAt.toISOString() : null,
    attempts: message.attempts ?? 0,
    lastError: message.lastError ?? null,
  };
}

export async function leadDetailOf(doc: LeadDoc): Promise<LeadDetail> {
  const [names, account, outbox, mail] = await Promise.all([
    staffNamesOf([doc.assigneeId]),
    accountOf(doc.userId),
    outboxOf(doc._id),
    mailStatus(),
  ]);
  return {
    ...toLeadRow(doc, names),
    quizVariant: doc.kind === "quiz" ? quizVariantOf(doc.source) : null,
    fields: leadFields(doc),
    payload: doc.payload ?? {},
    userAgent: doc.userAgent ?? null,
    account,
    notes: (doc.notes ?? []).map(noteDto),
    outbox,
    mailConfigured: mail.configured,
  };
}

// --- changes ----------------------------------------------------------------

// An active member of staff a lead may be given to.
export async function activeStaffMember(id: string): Promise<{ id: string; name: string } | null> {
  const doc = await (await collection("staff")).findOne(
    { _id: id, isActive: true },
    { projection: { _id: 1, name: 1 } },
  );
  return doc ? { id: doc._id, name: doc.name } : null;
}

export type LeadChange = { status?: LeadStatus; assigneeId?: string | null };

// Applies the fields that differ; null when the lead does not exist.
// `before` is what the journal compares with.
export async function updateLead(id: string, change: LeadChange): Promise<{ before: LeadDoc; after: LeadDoc } | null> {
  const leads = await collection("leads");
  const before = await leads.findOne({ _id: id });
  if (!before) return null;
  const set: Partial<LeadDoc> = {};
  if (change.status !== undefined && change.status !== statusOf(before)) set.status = change.status;
  if (change.assigneeId !== undefined && change.assigneeId !== (before.assigneeId ?? null)) set.assigneeId = change.assigneeId;
  if (Object.keys(set).length === 0) return { before, after: before };
  const after = await leads.findOneAndUpdate(
    { _id: id },
    { $set: { ...set, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return after ? { before, after } : null;
}

// The newest notes are kept when a lead collects more than this.
const NOTES_KEPT = 200;

export async function addLeadNote(id: string, by: { id: string; name: string }, text: string): Promise<{ lead: LeadDoc; note: StaffNote } | null> {
  const note: StaffNote = { id: newId("note"), at: new Date(), by, text };
  const lead = await (await collection("leads")).findOneAndUpdate(
    { _id: id },
    { $push: { notes: { $each: [note], $slice: -NOTES_KEPT } }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return lead ? { lead, note } : null;
}

// null when the lead or the note does not exist; "not-author" when the
// note is somebody else's and the caller is not an owner (a member of
// staff removes only their own notes, so nobody takes back what a
// colleague recorded; an owner may remove any, as everywhere in the panel).
export async function removeLeadNote(
  id: string,
  noteId: string,
  actor: StaffContext,
): Promise<{ lead: LeadDoc; note: StaffNote } | "not-author" | null> {
  const leads = await collection("leads");
  const before = await leads.findOne({ _id: id, "notes.id": noteId }, { projection: { notes: 1 } });
  const note = before?.notes?.find((item) => item.id === noteId);
  if (!note) return null;
  if (note.by.id !== actor.staff._id && !isOwnerActor(actor)) return "not-author";
  const lead = await leads.findOneAndUpdate(
    { _id: id },
    { $pull: { notes: { id: noteId } }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return lead ? { lead, note } : null;
}

// Sets one status on many leads. Returns how many exist and the ones that
// actually changed (with their previous status, for the journal).
export async function setLeadsStatus(
  ids: string[],
  status: LeadStatus,
): Promise<{ matched: number; changed: { doc: LeadDoc; from: LeadStatus }[] }> {
  const leads = await collection("leads");
  const docs = await leads.find({ _id: { $in: ids } }).toArray();
  const changed = docs.filter((doc) => statusOf(doc) !== status).map((doc) => ({ doc, from: statusOf(doc) }));
  if (changed.length > 0) {
    await leads.updateMany(
      { _id: { $in: changed.map((item) => item.doc._id) } },
      { $set: { status, updatedAt: new Date() } },
    );
  }
  return { matched: docs.length, changed };
}

// Removes a lead marked as spam, and its notice for the sales inbox if
// nobody delivered it yet (a sent message stays as delivery history).
// "state" when the lead is not marked as spam.
export async function deleteSpamLead(id: string): Promise<{ ok: true; doc: LeadDoc } | { ok: false; error: "not-found" | "state" }> {
  const leads = await collection("leads");
  const doc = await leads.findOne({ _id: id });
  if (!doc) return { ok: false, error: "not-found" };
  if (doc.status !== "spam") return { ok: false, error: "state" };
  // The status is part of the filter: a lead taken out of spam meanwhile
  // is not deleted.
  const result = await leads.deleteOne({ _id: id, status: "spam" });
  if (result.deletedCount === 0) return { ok: false, error: "state" };
  await (await collection("outbox")).deleteMany({ kind: "lead", "payload.leadId": id, sentAt: null });
  return { ok: true, doc };
}
