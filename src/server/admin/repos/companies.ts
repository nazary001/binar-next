import "server-only";
import { randomInt } from "node:crypto";
import type { Document, Filter } from "mongodb";
import { z } from "zod";
import type {
  CompanyDetail,
  CompanyFigures,
  CompanyRow,
  ContractDto,
  CounterpartyDto,
  CreateCompanyBody,
  CreateContractBody,
  CreateCounterpartyBody,
  CreditLimit,
  EmployeeDto,
  LedgerContractFigure,
  LedgerDocType,
  LedgerEntryDto,
  LedgerPage,
  PatchCompanyBody,
  PatchContractBody,
  PatchCounterpartyBody,
  PaymentTerms,
  StaffNoteDto,
} from "@/components/admin/companies/types";
import { COMPANY_NAME_MAX, COMPANY_RECENT_ORDERS, DEFAULT_DISCOUNT_PERCENT } from "@/components/admin/companies/types";
import { GUESTS_GROUP, REGISTERED_GROUP } from "@/components/admin/groups/types";
import { ALL, kpisFor } from "@/components/platform/dashboard/data";
import type { Order } from "@/components/platform/orders/data";
import {
  CONTRACT_MAX_BYTES,
  CONTRACT_STATUS,
  COUNTERPARTY_STATUS,
  isValidCode,
  type ContractFile,
  type ContractStatus,
  type CounterpartyStatus,
} from "@/components/platform/profile/data";
import {
  collection,
  type B2bOrderDoc,
  type ClientDoc,
  type ContractDoc,
  type CounterpartyDoc,
  type EmployeeDoc,
  type StaffNote,
} from "@/server/db/collections";
import { endUserSessions } from "@/server/auth/session";
import { HttpError } from "@/server/http";
import { newId } from "@/server/ids";
import { createClient, newInviteToken } from "@/server/repos/clients";
import { b2bOrders } from "@/server/repos/orders";
import { MAX_CONTRACTS, MAX_COUNTERPARTIES, removeEmployee, resendInvite } from "@/server/repos/profile";
import { isDuplicateKey } from "@/server/repos/users";
import { DEMO_CLIENT_ID } from "@/server/seed/util";
import { zId, zIsoDate, zRequiredText, zText } from "@/server/validate";
import type { StaffContext } from "../auth";
import { contains, paginate, UK_COLLATION, type ListQuery, type Page } from "../list";
import { assertFields, customerRows, iso, ORDER_REF_PROJECTION, text, toOrderRef, type FieldErrors } from "./customers";
import { isOwnerActor } from "./roles";

// Partner companies (`clients`) and what hangs off them: the buyers
// (users.clientId), the counterparties with their embedded contracts and
// the employees of the cabinet's profile page (repos/profile.ts writes
// those for the partner; the functions here are the staff's), the staff
// notes, and the settlements ledger the accounting exchange writes.
//
// Figures follow the cabinet dashboard (platform/dashboard/data.ts
// kpisFor), so the panel and the partner always read the same balance.
// Refusals are thrown as HttpError, as in ./customers.ts.

const NOTES_KEEP = 200;

// --- helpers ---------------------------------------------------------------------

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// "cp-" / "ct-" + 8 lower-case letters and digits: the shape of the ids the
// cabinet makes (api/profile/schemas.ts zNewId).
function newProfileId(prefix: "cp" | "ct"): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let id = `${prefix}-`;
  for (let i = 0; i < 8; i++) id += alphabet[randomInt(alphabet.length)];
  return id;
}

export async function requireCompany(id: string): Promise<ClientDoc> {
  const client = await (await collection("clients")).findOne({ _id: id });
  if (!client) throw new HttpError(404, "not-found");
  return client;
}

// "" means "no external id"; the unique index only covers strings.
function cleanExternalId(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

// --- figures (the cabinet dashboard's rule) ------------------------------------------

type FinanceDoc = Pick<B2bOrderDoc, "_id" | "clientId" | "payment" | "status" | "total" | "counterparty">;

const FINANCE_PROJECTION = { clientId: 1, payment: 1, status: 1, total: 1, counterparty: 1 } as const;

async function financeOrders(clientIds: string[]): Promise<FinanceDoc[]> {
  if (clientIds.length === 0) return [];
  const orders = await b2bOrders();
  const docs = (await orders
    .find({ clientId: { $in: clientIds }, channel: "b2b" }, { projection: FINANCE_PROJECTION })
    .toArray()) as FinanceDoc[];
  // A row edited by hand without a payment state would crash the rule.
  return docs.filter((doc) => typeof doc.payment === "object" && doc.payment !== null && typeof doc.total === "number");
}

function figuresOf(orders: FinanceDoc[], limits: CreditLimit[]): CompanyFigures {
  // kpisFor reads only the payment, status, total and counterparty of an
  // order: the projected documents carry exactly those.
  const kpis = kpisFor(orders as unknown as Order[], ALL, limits);
  const live = orders.filter((order) => order.status !== "cancelled");
  return {
    ordersCount: orders.length,
    ordersTotal: round2(live.reduce((sum, order) => sum + order.total, 0)),
    openBalance: kpis.balance,
    overdue: kpis.overdue,
    creditLimit: kpis.creditLimit,
  };
}

function creditLimitsOf(client: Pick<ClientDoc, "creditLimits">): CreditLimit[] {
  return (Array.isArray(client.creditLimits) ? client.creditLimits : [])
    .filter((row) => typeof row?.counterparty === "string" && typeof row?.limit === "number")
    .map((row) => ({ counterparty: row.counterparty, limit: row.limit }));
}

// --- DTOs ------------------------------------------------------------------------

async function groupNames(): Promise<Map<string, string>> {
  const groups = await (await collection("customerGroups")).find({}, { projection: { name: 1 } }).toArray();
  return new Map(groups.map((group) => [group._id, text(group.name)]));
}

async function staffById(ids: (string | null | undefined)[]): Promise<Map<string, { name: string; email: string }>> {
  const wanted = [...new Set(ids.filter((id): id is string => typeof id === "string"))];
  if (wanted.length === 0) return new Map();
  const staff = await (await collection("staff"))
    .find({ _id: { $in: wanted } }, { projection: { name: 1, email: 1 } })
    .toArray();
  return new Map(staff.map((member) => [member._id, { name: text(member.name), email: text(member.email) }]));
}

function toNote(note: StaffNote): StaffNoteDto {
  return {
    id: text(note.id),
    at: iso(note.at) ?? "",
    by: { id: text(note.by?.id), name: text(note.by?.name) },
    text: text(note.text),
  };
}

const PAYMENT_TERM_VALUES: readonly string[] = ["prepayment", "deferred", "schedule"];

function toContractDto(contract: ContractDoc): ContractDto {
  return {
    id: text(contract.id),
    number: text(contract.number),
    date: text(contract.date),
    status: Object.hasOwn(CONTRACT_STATUS, contract.status) ? contract.status : "review",
    file: {
      name: text(contract.file?.name),
      size: num(contract.file?.size) ?? 0,
      format: text(contract.file?.format),
    },
    externalId: typeof contract.externalId === "string" ? contract.externalId : null,
    discountPercent: num(contract.discountPercent),
    creditLimit: num(contract.creditLimit),
    currentDebt: num(contract.currentDebt),
    overdueDebt: num(contract.overdueDebt),
    oldestDebtDays: num(contract.oldestDebtDays),
    paymentTerms:
      typeof contract.paymentTerms === "string" && PAYMENT_TERM_VALUES.includes(contract.paymentTerms)
        ? (contract.paymentTerms as PaymentTerms)
        : null,
    paymentDays: num(contract.paymentDays),
    priceTypeId: typeof contract.priceTypeId === "string" ? contract.priceTypeId : null,
    isActive: typeof contract.isActive === "boolean" ? contract.isActive : null,
  };
}

function contractsOf(doc: Pick<CounterpartyDoc, "contracts">): ContractDoc[] {
  return (Array.isArray(doc.contracts) ? doc.contracts : []).filter(
    (contract): contract is ContractDoc => typeof contract === "object" && contract !== null && typeof contract.id === "string",
  );
}

function toCounterpartyDto(doc: CounterpartyDoc, ordersByName: Map<string, number>): CounterpartyDto {
  return {
    id: doc._id,
    name: text(doc.name),
    signatory: text(doc.signatory),
    code: text(doc.code),
    status: Object.hasOwn(COUNTERPARTY_STATUS, doc.status) ? doc.status : "review",
    externalId: typeof doc.externalId === "string" ? doc.externalId : null,
    ordersCount: ordersByName.get(text(doc.name)) ?? 0,
    contracts: contractsOf(doc).map(toContractDto),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
    seed: doc.seed === true,
  };
}

function toEmployeeDto(doc: EmployeeDoc): EmployeeDto {
  return {
    id: doc._id,
    status: doc.status === "active" ? "active" : "invited",
    fullName: text(doc.fullName),
    position: text(doc.position),
    phone: text(doc.phone),
    email: text(doc.email),
    invitedAt: doc.status === "invited" ? iso(doc.invitedAt) : null,
    seed: doc.seed === true,
  };
}

export function counterpartyDto(doc: CounterpartyDoc, ordersCount = 0): CounterpartyDto {
  return toCounterpartyDto(doc, new Map([[text(doc.name), ordersCount]]));
}

export function contractDto(contract: ContractDoc): ContractDto {
  return toContractDto(contract);
}

export function employeeDto(doc: EmployeeDoc): EmployeeDto {
  return toEmployeeDto(doc);
}

export function noteDto(note: StaffNote): StaffNoteDto {
  return toNote(note);
}

// --- list ------------------------------------------------------------------------

export type CompanyFilters = {
  // A group id; REGISTERED_GROUP also matches the companies without one.
  groupId?: string;
  // A staff id, or null for "nobody looks after it".
  managerId?: string | null;
  active?: boolean;
};

export async function listCompanies(query: ListQuery, filters: CompanyFilters): Promise<Page<CompanyRow>> {
  const and: Filter<ClientDoc>[] = [];
  if (query.q) and.push({ $or: [{ name: contains(query.q) }, { edrpou: contains(query.q) }] });
  if (filters.groupId !== undefined) {
    and.push(
      filters.groupId === REGISTERED_GROUP ? { groupId: { $in: [null, REGISTERED_GROUP] } } : { groupId: filters.groupId },
    );
  }
  if (filters.managerId !== undefined) and.push({ managerId: filters.managerId });
  if (filters.active === true) and.push({ isActive: { $ne: false } });
  if (filters.active === false) and.push({ isActive: false });
  const filter: Filter<ClientDoc> = and.length > 0 ? { $and: and } : {};

  const clients = await collection("clients");
  // A list by name reads in the Ukrainian alphabet order (case ignored).
  const byName = query.sortKey.replace(/^-/, "") === "name";
  const page = await paginate(clients, filter, query, {
    projection: { notes: 0 },
    ...(byName ? { collation: UK_COLLATION } : {}),
  });
  const ids = page.items.map((client) => client._id);
  const users = await collection("users");
  const [userCounts, orders, groups, managers] = await Promise.all([
    ids.length > 0
      ? users
          .aggregate<{ _id: string; n: number }>([
            { $match: { clientId: { $in: ids } } },
            { $group: { _id: "$clientId", n: { $sum: 1 } } },
          ])
          .toArray()
      : Promise.resolve([]),
    financeOrders(ids),
    groupNames(),
    staffById(page.items.map((client) => client.managerId)),
  ]);
  const usersOf = new Map(userCounts.map((row) => [row._id, row.n]));
  const ordersOf = new Map<string, FinanceDoc[]>();
  for (const order of orders) {
    const list = ordersOf.get(order.clientId) ?? [];
    list.push(order);
    ordersOf.set(order.clientId, list);
  }

  const items = page.items.map((client): CompanyRow => {
    const own = ordersOf.get(client._id) ?? [];
    const figures = figuresOf(own, []);
    const groupId = typeof client.groupId === "string" ? client.groupId : null;
    const managerId = typeof client.managerId === "string" ? client.managerId : null;
    return {
      id: client._id,
      name: text(client.name),
      edrpou: text(client.edrpou),
      city: text(client.city),
      region: text(client.region),
      discountPercent: num(client.discountPercent) ?? 0,
      usersCount: usersOf.get(client._id) ?? 0,
      ordersCount: own.length,
      openBalance: figures.openBalance,
      overdue: figures.overdue,
      groupId,
      groupName: groups.get(groupId ?? REGISTERED_GROUP) ?? null,
      managerId,
      managerName: managerId ? (managers.get(managerId)?.name ?? null) : null,
      isActive: client.isActive !== false,
      createdAt: iso(client.createdAt) ?? "",
      seed: client.seed === true,
      test: client.test === true,
    };
  });
  return { ...page, items };
}

// --- card ------------------------------------------------------------------------

const LIST_ORDER = { sort: 1, createdAt: 1, _id: 1 } as const;

export async function companyDetail(id: string): Promise<CompanyDetail | null> {
  const clients = await collection("clients");
  const client = await clients.findOne({ _id: id });
  if (!client) return null;

  const [users, counterparties, employees, groups, orders] = await Promise.all([
    collection("users"),
    collection("counterparties"),
    collection("employees"),
    collection("customerGroups"),
    b2bOrders(),
  ]);
  const groupId = typeof client.groupId === "string" ? client.groupId : null;
  const managerId = typeof client.managerId === "string" ? client.managerId : null;
  const [userDocs, cpDocs, empDocs, finance, recent, group, managers] = await Promise.all([
    users.find({ clientId: id }, { projection: { passwordHash: 0, logo: 0 } }).sort({ createdAt: 1, _id: 1 }).limit(500).toArray(),
    counterparties.find({ clientId: id }).sort(LIST_ORDER).toArray(),
    employees.find({ clientId: id }).sort(LIST_ORDER).toArray(),
    financeOrders([id]),
    orders
      .find({ clientId: id, channel: "b2b" }, { projection: ORDER_REF_PROJECTION })
      .sort({ date: -1, _id: -1 })
      .limit(COMPANY_RECENT_ORDERS)
      .toArray(),
    groups.findOne({ _id: groupId ?? REGISTERED_GROUP }, { projection: { name: 1 } }),
    staffById([managerId]),
  ]);

  const ordersByName = new Map<string, number>();
  for (const order of finance) ordersByName.set(order.counterparty, (ordersByName.get(order.counterparty) ?? 0) + 1);
  const limits = creditLimitsOf(client);
  const manager = managerId ? managers.get(managerId) : undefined;

  return {
    id: client._id,
    name: text(client.name),
    edrpou: text(client.edrpou),
    region: text(client.region),
    city: text(client.city),
    discountPercent: num(client.discountPercent) ?? 0,
    creditLimits: limits,
    inviteToken: text(client.inviteToken),
    demoToday: typeof client.demoToday === "string" ? client.demoToday : null,
    externalId: typeof client.externalId === "string" ? client.externalId : null,
    groupId,
    group: group ? { id: group._id, name: text(group.name) } : null,
    managerId,
    manager: manager && managerId ? { id: managerId, name: manager.name, email: manager.email } : null,
    isActive: client.isActive !== false,
    showStock: client.showStock === true,
    stockDisplayMax: num(client.stockDisplayMax),
    notes: (Array.isArray(client.notes) ? client.notes : []).map(toNote).reverse(),
    erpSyncedAt: iso(client.erpSyncedAt),
    createdAt: iso(client.createdAt) ?? "",
    updatedAt: iso(client.updatedAt) ?? "",
    seed: client.seed === true,
    test: client.test === true,
    users: await customerRows(userDocs),
    counterparties: cpDocs.map((doc) => toCounterpartyDto(doc, ordersByName)),
    employees: empDocs.map(toEmployeeDto),
    figures: figuresOf(finance, limits),
    orders: recent.map(toOrderRef),
  };
}

export async function requireCompanyDetail(id: string): Promise<CompanyDetail> {
  const detail = await companyDetail(id);
  if (!detail) throw new HttpError(404, "not-found");
  return detail;
}

// --- create / change / delete ------------------------------------------------------

export async function createCompany(input: CreateCompanyBody): Promise<ClientDoc> {
  const edrpou = (input.edrpou ?? "").trim();
  if (edrpou && !isValidCode(edrpou)) assertFields({ edrpou: "invalid" });
  return createClient({
    name: input.name.trim(),
    edrpou,
    region: (input.region ?? "").trim(),
    city: (input.city ?? "").trim(),
    discountPercent: input.discountPercent ?? DEFAULT_DISCOUNT_PERCENT,
  });
}

export type CompanyChange = { before: ClientDoc; after: ClientDoc; changed: string[] };

export async function updateCompany(id: string, patch: PatchCompanyBody): Promise<CompanyChange> {
  const clients = await collection("clients");
  const before = await requireCompany(id);

  const fields: FieldErrors = {};
  const edrpou = patch.edrpou?.trim();
  if (edrpou && !isValidCode(edrpou)) fields.edrpou = "invalid";
  if (patch.groupId !== undefined && patch.groupId !== null) {
    if (patch.groupId === GUESTS_GROUP) fields.groupId = "guests";
    else if (!(await (await collection("customerGroups")).findOne({ _id: patch.groupId }, { projection: { _id: 1 } }))) {
      fields.groupId = "not-found";
    }
  }
  if (patch.managerId !== undefined && patch.managerId !== null) {
    const manager = await (await collection("staff")).findOne(
      { _id: patch.managerId, isActive: true },
      { projection: { _id: 1 } },
    );
    if (!manager) fields.managerId = "not-found";
  }
  let creditLimits: CreditLimit[] | undefined;
  if (patch.creditLimits !== undefined) {
    creditLimits = patch.creditLimits.map((row) => ({ counterparty: row.counterparty.trim(), limit: round2(row.limit) }));
    const names = creditLimits.map((row) => row.counterparty.toLowerCase());
    if (new Set(names).size !== names.length) fields.creditLimits = "duplicate";
  }
  assertFields(fields);

  const externalId = cleanExternalId(patch.externalId);
  if (typeof externalId === "string") {
    const clash = await clients.findOne({ externalId, _id: { $ne: id } }, { projection: { _id: 1 } });
    if (clash) throw new HttpError(409, "exists");
  }

  const set: Record<string, unknown> = {};
  const changed: string[] = [];
  const put = (key: keyof ClientDoc, next: unknown) => {
    if (next === undefined) return;
    const current = before[key] ?? null;
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    set[key] = next;
    changed.push(key);
  };
  put("name", patch.name?.trim());
  put("edrpou", edrpou);
  put("region", patch.region?.trim());
  put("city", patch.city?.trim());
  put("discountPercent", patch.discountPercent);
  put("creditLimits", creditLimits);
  put("groupId", patch.groupId);
  put("managerId", patch.managerId);
  // isActive / showStock are absent on companies older than the panel.
  if (patch.isActive !== undefined && patch.isActive !== (before.isActive !== false)) {
    set.isActive = patch.isActive;
    changed.push("isActive");
  }
  if (patch.showStock !== undefined && patch.showStock !== (before.showStock === true)) {
    set.showStock = patch.showStock;
    changed.push("showStock");
  }
  put("stockDisplayMax", patch.stockDisplayMax);
  put("externalId", externalId);
  if (patch.regenerateInvite) {
    set.inviteToken = newInviteToken();
    changed.push("inviteToken");
  }
  if (changed.length === 0) return { before, after: before, changed };

  let after: ClientDoc | null;
  try {
    after = await clients.findOneAndUpdate(
      { _id: id },
      { $set: { ...set, updatedAt: new Date() }, $unset: { seed: "" } },
      { returnDocument: "after" },
    );
  } catch (error) {
    if (isDuplicateKey(error)) throw new HttpError(409, "exists");
    throw error;
  }
  if (!after) throw new HttpError(404, "not-found");
  // Switching the cabinet off ends every session of the company's people at
  // once (the storefront's getSession and sign-in refuse them from now on;
  // this removes the sessions themselves).
  if (set.isActive === false) await endCompanySessions(id);
  return { before, after, changed };
}

async function endCompanySessions(clientId: string): Promise<void> {
  const users = await (await collection("users"))
    .find({ clientId }, { projection: { _id: 1 } })
    .toArray();
  for (const user of users) await endUserSessions(user._id);
}

// Only a company nothing refers to: no accounts, no orders or returns, no
// settlements. Its counterparties and employees (rows of its own profile
// page) go with it. The demo company is never removed.
export async function deleteCompany(id: string): Promise<ClientDoc> {
  const client = await requireCompany(id);
  if (client.seed === true || id === DEMO_CLIENT_ID) throw new HttpError(409, "seed");
  const [users, orders, returns, ledger] = await Promise.all([
    collection("users"),
    collection("orders"),
    collection("returns"),
    collection("ledger"),
  ]);
  const [userCount, orderCount, returnCount, ledgerCount] = await Promise.all([
    users.countDocuments({ clientId: id }),
    orders.countDocuments({ clientId: id }),
    returns.countDocuments({ clientId: id }),
    ledger.countDocuments({ clientId: id }),
  ]);
  if (userCount + orderCount + returnCount + ledgerCount > 0) {
    throw new HttpError(409, "in-use", { users: userCount, orders: orderCount, returns: returnCount, ledger: ledgerCount });
  }
  const clients = await collection("clients");
  const employees = await collection("employees");
  const employeeIds = (await employees.find({ clientId: id }, { projection: { _id: 1 } }).toArray()).map((row) => row._id);
  const removed = await clients.deleteOne({ _id: id });
  if (removed.deletedCount === 0) throw new HttpError(404, "not-found");
  await Promise.all([
    (await collection("counterparties")).deleteMany({ clientId: id }),
    employees.deleteMany({ clientId: id }),
    // Invitations of the company still waiting for the mailer.
    employeeIds.length > 0
      ? (await collection("outbox")).deleteMany({
          kind: "employee-invite",
          "payload.employeeId": { $in: employeeIds },
          sentAt: null,
        })
      : Promise.resolve(),
  ]);
  return client;
}

// --- notes -----------------------------------------------------------------------

export async function addCompanyNote(id: string, staff: StaffContext, body: string): Promise<{ client: ClientDoc; note: StaffNote }> {
  const client = await requireCompany(id);
  const note: StaffNote = {
    id: newId("note"),
    at: new Date(),
    by: { id: staff.staff._id, name: staff.staff.name },
    text: body.trim(),
  };
  const result = await (await collection("clients")).updateOne(
    { _id: id },
    {
      $push: { notes: { $each: [note], $slice: -NOTES_KEEP } },
      $set: { updatedAt: new Date() },
      $unset: { seed: "" },
    },
  );
  if (result.matchedCount === 0) throw new HttpError(404, "not-found");
  return { client, note };
}

// The author removes a note, and so does an owner: anybody else gets 403
// "not-author", so nobody takes back what a colleague recorded (the rule
// of the notes of the orders, the returns and the leads).
export async function removeCompanyNote(
  staff: StaffContext,
  id: string,
  noteId: string,
): Promise<{ client: ClientDoc; note: StaffNote }> {
  const client = await requireCompany(id);
  const note = (Array.isArray(client.notes) ? client.notes : []).find((item) => item?.id === noteId);
  if (!note) throw new HttpError(404, "not-found");
  if (note.by?.id !== staff.staff._id && !isOwnerActor(staff)) throw new HttpError(403, "not-author");
  const result = await (await collection("clients")).updateOne(
    { _id: id, "notes.id": noteId },
    { $pull: { notes: { id: noteId } }, $set: { updatedAt: new Date() }, $unset: { seed: "" } },
  );
  if (result.matchedCount === 0) throw new HttpError(404, "not-found");
  return { client, note };
}

// --- counterparties ----------------------------------------------------------------

async function requireCounterparty(clientId: string, cpId: string): Promise<CounterpartyDoc> {
  const doc = await (await collection("counterparties")).findOne({ _id: cpId, clientId });
  if (!doc) throw new HttpError(404, "not-found");
  return doc;
}

async function counterpartyExternalIdTaken(externalId: string, exceptId?: string): Promise<boolean> {
  const counterparties = await collection("counterparties");
  const filter: Filter<CounterpartyDoc> = exceptId ? { externalId, _id: { $ne: exceptId } } : { externalId };
  return (await counterparties.findOne(filter, { projection: { _id: 1 } })) !== null;
}

async function nextCounterpartySort(clientId: string): Promise<number> {
  const counterparties = await collection("counterparties");
  const last = await counterparties.find({ clientId }, { projection: { sort: 1 } }).sort({ sort: -1 }).limit(1).next();
  return typeof last?.sort === "number" && Number.isFinite(last.sort) ? Math.floor(last.sort) + 1 : 0;
}

// Orders name their counterparty by its NAME (a snapshot taken when the
// order was placed).
async function ordersNaming(clientId: string, name: string): Promise<number> {
  return (await b2bOrders()).countDocuments({ clientId, channel: "b2b", counterparty: name });
}

export async function addCounterparty(
  clientId: string,
  input: CreateCounterpartyBody,
): Promise<{ client: ClientDoc; counterparty: CounterpartyDoc }> {
  const client = await requireCompany(clientId);
  const code = input.code.trim();
  if (!isValidCode(code)) assertFields({ code: "invalid" });
  const counterparties = await collection("counterparties");
  if ((await counterparties.countDocuments({ clientId })) >= MAX_COUNTERPARTIES) throw new HttpError(409, "limit");
  const externalId = cleanExternalId(input.externalId);
  if (typeof externalId === "string" && (await counterpartyExternalIdTaken(externalId))) {
    throw new HttpError(409, "exists");
  }
  const now = new Date();
  const doc: CounterpartyDoc = {
    _id: newProfileId("cp"),
    clientId,
    name: input.name.trim(),
    signatory: (input.signatory ?? "").trim(),
    code,
    // Made by staff, so already checked (the cabinet's own rows wait in
    // "review" for exactly this check).
    status: input.status ?? "active",
    contracts: [],
    sort: await nextCounterpartySort(clientId),
    createdAt: now,
    updatedAt: now,
    ...(typeof externalId === "string" ? { externalId } : {}),
  };
  try {
    await counterparties.insertOne(doc);
  } catch (error) {
    if (isDuplicateKey(error)) throw new HttpError(409, "exists");
    throw error;
  }
  return { client, counterparty: doc };
}

export type CounterpartyChange = {
  client: ClientDoc;
  before: CounterpartyDoc;
  after: CounterpartyDoc;
  changed: string[];
  ordersCount: number;
};

export async function updateCounterparty(
  clientId: string,
  cpId: string,
  patch: PatchCounterpartyBody,
): Promise<CounterpartyChange> {
  const client = await requireCompany(clientId);
  const before = await requireCounterparty(clientId, cpId);
  const code = patch.code?.trim();
  // The seeded demo rows carry 9-digit codes: a code is checked only when
  // it changes, so editing anything else of such a row still works.
  if (code !== undefined && code !== before.code && !isValidCode(code)) assertFields({ code: "invalid" });
  const externalId = cleanExternalId(patch.externalId);
  if (typeof externalId === "string" && (await counterpartyExternalIdTaken(externalId, cpId))) {
    throw new HttpError(409, "exists");
  }

  const set: Record<string, unknown> = {};
  const changed: string[] = [];
  const put = (key: "name" | "code" | "signatory" | "status" | "externalId", next: string | null | undefined) => {
    if (next === undefined || next === (before[key] ?? null)) return;
    set[key] = next;
    changed.push(key);
  };
  put("name", patch.name?.trim());
  put("code", code);
  put("signatory", patch.signatory?.trim());
  put("status", patch.status);
  put("externalId", externalId);
  const ordersCount = await ordersNaming(clientId, text(set.name ?? before.name));
  if (changed.length === 0) return { client, before, after: before, changed, ordersCount };

  let after: CounterpartyDoc | null;
  try {
    after = await (await collection("counterparties")).findOneAndUpdate(
      { _id: cpId, clientId },
      { $set: { ...set, updatedAt: new Date() }, $unset: { seed: "" } },
      { returnDocument: "after" },
    );
  } catch (error) {
    if (isDuplicateKey(error)) throw new HttpError(409, "exists");
    throw error;
  }
  if (!after) throw new HttpError(404, "not-found");
  return { client, before, after, changed, ordersCount };
}

export async function deleteCounterparty(
  clientId: string,
  cpId: string,
): Promise<{ client: ClientDoc; counterparty: CounterpartyDoc }> {
  const client = await requireCompany(clientId);
  const counterparty = await requireCounterparty(clientId, cpId);
  const [orders, ledger] = await Promise.all([
    ordersNaming(clientId, counterparty.name),
    (await collection("ledger")).countDocuments({ clientId, counterpartyId: cpId }),
  ]);
  if (orders > 0 || ledger > 0) throw new HttpError(409, "in-use", { orders, ledger });
  const removed = await (await collection("counterparties")).deleteOne({ _id: cpId, clientId });
  if (removed.deletedCount === 0) throw new HttpError(404, "not-found");
  return { client, counterparty };
}

// --- contracts ---------------------------------------------------------------------

type ErpKey =
  | "externalId"
  | "discountPercent"
  | "creditLimit"
  | "currentDebt"
  | "overdueDebt"
  | "oldestDebtDays"
  | "paymentTerms"
  | "paymentDays"
  | "priceTypeId"
  | "isActive";

const ERP_KEYS: ErpKey[] = [
  "externalId",
  "discountPercent",
  "creditLimit",
  "currentDebt",
  "overdueDebt",
  "oldestDebtDays",
  "paymentTerms",
  "paymentDays",
  "priceTypeId",
  "isActive",
];

// A contract made in the panel has no scan; the cabinet's tile still needs
// a file block, so it names the document by its number.
function placeholderFile(number: string): ContractFile {
  return { name: `Договір ${number}`, size: 0, format: "" };
}

async function priceTypeExists(id: string): Promise<boolean> {
  return (await (await collection("priceTypes")).findOne({ _id: id }, { projection: { _id: 1 } })) !== null;
}

// A contract's GUID in the ERP names one contract across every company.
async function contractExternalIdTaken(externalId: string, except?: { cpId: string; contractId: string }): Promise<boolean> {
  const hits = await (await collection("counterparties"))
    .find({ "contracts.externalId": externalId }, { projection: { contracts: 1 } })
    .toArray();
  return hits.some((cp) =>
    contractsOf(cp).some(
      (contract) =>
        contract.externalId === externalId && !(except && cp._id === except.cpId && contract.id === except.contractId),
    ),
  );
}

// Applies the ERP fields of a body to a contract: a value sets it, null
// clears it.
function applyErp(target: ContractDoc, body: Partial<Record<ErpKey, unknown>>): void {
  const record = target as Record<string, unknown>;
  for (const key of ERP_KEYS) {
    const value = body[key];
    if (value === undefined) continue;
    if (value === null) delete record[key];
    else record[key] = key === "externalId" && typeof value === "string" ? value.trim() : value;
  }
  if (record.externalId === "") delete record.externalId;
}

async function checkContractRefs(body: Partial<Record<ErpKey, unknown>>, except?: { cpId: string; contractId: string }) {
  if (typeof body.priceTypeId === "string" && !(await priceTypeExists(body.priceTypeId))) {
    assertFields({ priceTypeId: "not-found" });
  }
  const externalId = typeof body.externalId === "string" ? body.externalId.trim() : "";
  if (externalId && (await contractExternalIdTaken(externalId, except))) throw new HttpError(409, "exists");
}

// Contract ids are unique inside a company (across its counterparties), as
// the cabinet keeps them.
async function freeContractId(clientId: string): Promise<string> {
  const counterparties = await collection("counterparties");
  for (;;) {
    const id = newProfileId("ct");
    const taken = await counterparties.findOne({ clientId, "contracts.id": id }, { projection: { _id: 1 } });
    if (!taken) return id;
  }
}

export type ContractResult = { client: ClientDoc; counterparty: CounterpartyDoc; contract: ContractDoc };

export async function addContract(clientId: string, cpId: string, input: CreateContractBody): Promise<ContractResult> {
  const client = await requireCompany(clientId);
  const counterparty = await requireCounterparty(clientId, cpId);
  if (contractsOf(counterparty).length >= MAX_CONTRACTS) throw new HttpError(409, "limit");
  await checkContractRefs(input);

  const number = input.number.trim();
  const contract: ContractDoc = {
    id: await freeContractId(clientId),
    number,
    date: input.date,
    status: input.status ?? "active",
    file: input.file ?? placeholderFile(number),
  };
  applyErp(contract, input);
  const now = new Date();
  // The cap again, atomically, against parallel adds.
  const result = await (await collection("counterparties")).updateOne(
    { _id: cpId, clientId, [`contracts.${MAX_CONTRACTS - 1}`]: { $exists: false } },
    { $push: { contracts: contract }, $set: { updatedAt: now }, $unset: { seed: "" } },
  );
  if (result.matchedCount === 0) throw new HttpError(409, "limit");
  return { client, counterparty, contract };
}

export type ContractChange = ContractResult & { before: ContractDoc; changed: string[] };

export async function updateContract(
  clientId: string,
  cpId: string,
  contractId: string,
  patch: PatchContractBody,
): Promise<ContractChange> {
  const client = await requireCompany(clientId);
  const counterparty = await requireCounterparty(clientId, cpId);
  const before = contractsOf(counterparty).find((contract) => contract.id === contractId);
  if (!before) throw new HttpError(404, "not-found");
  await checkContractRefs(patch, { cpId, contractId });

  const next: ContractDoc = { ...before, file: { ...before.file } };
  if (patch.number !== undefined) next.number = patch.number.trim();
  if (patch.date !== undefined) next.date = patch.date;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.file !== undefined) next.file = patch.file;
  applyErp(next, patch);

  const keys = new Set([...Object.keys(before), ...Object.keys(next)]);
  const changed = [...keys].filter(
    (key) =>
      JSON.stringify((before as Record<string, unknown>)[key] ?? null) !==
      JSON.stringify((next as Record<string, unknown>)[key] ?? null),
  );
  if (changed.length === 0) return { client, counterparty, contract: before, before, changed };

  // The whole element is replaced: the ERP fields a null cleared must go.
  const result = await (await collection("counterparties")).updateOne(
    { _id: cpId, clientId, "contracts.id": contractId },
    { $set: { "contracts.$": next, updatedAt: new Date() }, $unset: { seed: "" } },
  );
  if (result.matchedCount === 0) throw new HttpError(404, "not-found");
  return { client, counterparty, contract: next, before, changed };
}

export async function deleteContract(clientId: string, cpId: string, contractId: string): Promise<ContractResult> {
  const client = await requireCompany(clientId);
  const counterparty = await requireCounterparty(clientId, cpId);
  const contract = contractsOf(counterparty).find((item) => item.id === contractId);
  if (!contract) throw new HttpError(404, "not-found");
  const ledger = await (await collection("ledger")).countDocuments({ clientId, contractId });
  if (ledger > 0) throw new HttpError(409, "in-use", { ledger });
  const result = await (await collection("counterparties")).updateOne(
    { _id: cpId, clientId, "contracts.id": contractId },
    { $pull: { contracts: { id: contractId } }, $set: { updatedAt: new Date() }, $unset: { seed: "" } },
  );
  if (result.matchedCount === 0) throw new HttpError(404, "not-found");
  return { client, counterparty, contract };
}

// --- employees -----------------------------------------------------------------------

// The person leaves the list; an invitation still waiting in the outbox
// for the mailer goes with it (nobody should be invited to a list they
// were just taken off).
export async function deleteEmployee(clientId: string, empId: string): Promise<{ client: ClientDoc; employee: EmployeeDoc }> {
  const client = await requireCompany(clientId);
  const employee = await (await collection("employees")).findOne({ _id: empId, clientId });
  if (!employee) throw new HttpError(404, "not-found");
  if (!(await removeEmployee(clientId, empId))) throw new HttpError(404, "not-found");
  await (await collection("outbox")).deleteMany({ kind: "employee-invite", "payload.employeeId": empId, sentAt: null });
  return { client, employee };
}

// The cabinet's own resend (repos/profile.ts resendInvite): a new
// invitation time and another outbox message, nothing new within its
// 15-minute cooldown.
export async function resendEmployeeInvite(clientId: string, empId: string): Promise<{ client: ClientDoc; employee: EmployeeDoc }> {
  const client = await requireCompany(clientId);
  const outcome = await resendInvite(clientId, empId);
  if (outcome === "not-found") throw new HttpError(404, "not-found");
  if (outcome === "not-invited") throw new HttpError(409, "not-invited");
  if ("retryAfter" in outcome) throw new HttpError(429, "rate", { retryAfter: outcome.retryAfter });
  const employee = await (await collection("employees")).findOne({ _id: empId, clientId });
  if (!employee) throw new HttpError(404, "not-found");
  return { client, employee };
}

// --- ledger --------------------------------------------------------------------------

export type LedgerFilters = {
  docType?: LedgerDocType;
  counterpartyId?: string;
  // A contract id, or null for the movements without a contract.
  contractId?: string | null;
};

const SIGNED = { $cond: [{ $eq: ["$impact", "plus"] }, "$amount", { $multiply: ["$amount", -1] }] };

type LedgerRow = {
  _id: string;
  externalId: string;
  docType: LedgerDocType;
  docNumber: string;
  docDate: Date;
  amount: number;
  impact: "plus" | "minus";
  signed: number;
  counterpartyId: string | null;
  contractId: string | null;
  orderId: string | null;
  createdAt?: Date;
  balance: number;
  companyBalance: number;
};

// The settlement movements of a company, newest first, with the running
// balance after each one: per contract (movements without a contract
// form their own line) and for the whole company. The running figures are
// computed over every movement before the filters apply, so a filtered
// page still shows the real balances.
export async function companyLedger(
  clientId: string,
  page: { page: number; limit: number },
  filters: LedgerFilters,
): Promise<LedgerPage> {
  await requireCompany(clientId);
  const ledger = await collection("ledger");
  const match: Document = {};
  if (filters.docType) match.docType = filters.docType;
  if (filters.counterpartyId) match.counterpartyId = filters.counterpartyId;
  if (filters.contractId !== undefined) match.contractKey = filters.contractId ?? "";

  const window = { documents: ["unbounded", "current"] };
  const [facet] = await ledger
    .aggregate<{ items: LedgerRow[]; total: { n: number }[] }>([
      { $match: { clientId } },
      { $addFields: { signed: SIGNED, contractKey: { $ifNull: ["$contractId", ""] } } },
      {
        $setWindowFields: {
          partitionBy: "$contractKey",
          sortBy: { docDate: 1, _id: 1 },
          output: { balance: { $sum: "$signed", window } },
        },
      },
      { $setWindowFields: { sortBy: { docDate: 1, _id: 1 }, output: { companyBalance: { $sum: "$signed", window } } } },
      { $match: match },
      { $sort: { docDate: -1, _id: -1 } },
      {
        $facet: {
          items: [{ $skip: (page.page - 1) * page.limit }, { $limit: page.limit }],
          total: [{ $count: "n" }],
        },
      },
    ])
    .toArray();

  const groups = await ledger
    .aggregate<{
      _id: { contractId: string | null; counterpartyId: string | null };
      balance: number;
      entries: number;
      lastDocDate: Date | null;
    }>([
      { $match: { clientId } },
      {
        $group: {
          _id: { contractId: { $ifNull: ["$contractId", null] }, counterpartyId: { $ifNull: ["$counterpartyId", null] } },
          balance: { $sum: SIGNED },
          entries: { $sum: 1 },
          lastDocDate: { $max: "$docDate" },
        },
      },
      { $sort: { lastDocDate: -1 } },
    ])
    .toArray();

  // Names for the ids the movements carry.
  const counterparties = await (await collection("counterparties"))
    .find({ clientId }, { projection: { name: 1, contracts: 1 } })
    .toArray();
  const cpNames = new Map(counterparties.map((cp) => [cp._id, text(cp.name)]));
  const contractNumbers = new Map<string, string>();
  for (const cp of counterparties) for (const contract of contractsOf(cp)) contractNumbers.set(contract.id, text(contract.number));

  const rows = facet?.items ?? [];
  const items = rows.map(
    (row): LedgerEntryDto => ({
      id: row._id,
      externalId: text(row.externalId),
      docType: row.docType,
      docNumber: text(row.docNumber),
      docDate: iso(row.docDate) ?? "",
      amount: num(row.amount) ?? 0,
      impact: row.impact === "minus" ? "minus" : "plus",
      signed: round2(num(row.signed) ?? 0),
      counterpartyId: row.counterpartyId ?? null,
      counterpartyName: row.counterpartyId ? (cpNames.get(row.counterpartyId) ?? null) : null,
      contractId: row.contractId ?? null,
      contractNumber: row.contractId ? (contractNumbers.get(row.contractId) ?? null) : null,
      orderId: row.orderId ?? null,
      balance: round2(num(row.balance) ?? 0),
      companyBalance: round2(num(row.companyBalance) ?? 0),
      createdAt: iso(row.createdAt),
    }),
  );
  const byContract = groups.map(
    (group): LedgerContractFigure => ({
      contractId: group._id.contractId,
      contractNumber: group._id.contractId ? (contractNumbers.get(group._id.contractId) ?? null) : null,
      counterpartyId: group._id.counterpartyId,
      counterpartyName: group._id.counterpartyId ? (cpNames.get(group._id.counterpartyId) ?? null) : null,
      balance: round2(group.balance),
      entries: group.entries,
      lastDocDate: iso(group.lastDocDate),
    }),
  );
  return {
    items,
    total: facet?.total[0]?.n ?? 0,
    page: page.page,
    limit: page.limit,
    figures: {
      balance: round2(groups.reduce((sum, group) => sum + group.balance, 0)),
      entries: groups.reduce((sum, group) => sum + group.entries, 0),
      byContract,
    },
  };
}

// --- request shapes ------------------------------------------------------------------
//
// Shared by the create and change routes of the same record (a route file
// may export nothing but its handlers). Every object is strict; the
// change routes make every field optional.

const COUNTERPARTY_STATUS_VALUES = Object.keys(COUNTERPARTY_STATUS) as [CounterpartyStatus, ...CounterpartyStatus[]];
const CONTRACT_STATUS_VALUES = Object.keys(CONTRACT_STATUS) as [ContractStatus, ...ContractStatus[]];
const MONEY_MAX = 1_000_000_000_000;

export const zExternalId = zText(64).nullable();

export const counterpartyShape = {
  name: zRequiredText(COMPANY_NAME_MAX),
  // Checked by the repo (8 or 10 digits, only when it changes).
  code: z.string().trim().max(32),
  signatory: zText(COMPANY_NAME_MAX),
  status: z.enum(COUNTERPARTY_STATUS_VALUES),
  externalId: zExternalId,
};

const contractErpShape = {
  externalId: zExternalId.optional(),
  discountPercent: z.number().min(0).lt(100).nullable().optional(),
  creditLimit: z.number().min(0).max(MONEY_MAX).nullable().optional(),
  currentDebt: z.number().min(-MONEY_MAX).max(MONEY_MAX).nullable().optional(),
  overdueDebt: z.number().min(-MONEY_MAX).max(MONEY_MAX).nullable().optional(),
  oldestDebtDays: z.number().int().min(0).max(36_500).nullable().optional(),
  paymentTerms: z.enum(["prepayment", "deferred", "schedule"]).nullable().optional(),
  paymentDays: z.number().int().min(0).max(3650).nullable().optional(),
  priceTypeId: zId.nullable().optional(),
  isActive: z.boolean().nullable().optional(),
};

// The scan's metadata as the cabinet's tile shows it.
const contractFile = z
  .object({
    name: zRequiredText(255),
    size: z.number().int().min(0).max(CONTRACT_MAX_BYTES),
    format: zText(16),
  })
  .strict();

export const CreateContractSchema = z
  .object({
    number: zRequiredText(64),
    date: zIsoDate,
    status: z.enum(CONTRACT_STATUS_VALUES).optional(),
    file: contractFile.optional(),
    ...contractErpShape,
  })
  .strict();

export const PatchContractSchema = z
  .object({
    number: zRequiredText(64).optional(),
    date: zIsoDate.optional(),
    status: z.enum(CONTRACT_STATUS_VALUES).optional(),
    file: contractFile.optional(),
    ...contractErpShape,
  })
  .strict();
