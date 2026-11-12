import "server-only";
import { randomBytes } from "node:crypto";
import type { Filter } from "mongodb";
import type {
  CreateCustomerBody,
  CustomerCounts,
  CustomerDetail,
  CustomerRow,
  CustomerSession,
  NewCompanyInput,
  OrderRef,
  PatchCustomerBody,
} from "@/components/admin/customers/types";
import { CUSTOMER_RECENT_LEADS, CUSTOMER_RECENT_ORDERS, CUSTOMER_SESSION_ID_LENGTH } from "@/components/admin/customers/types";
import { DEFAULT_DISCOUNT_PERCENT } from "@/components/admin/companies/types";
import {
  EMPTY_COMPANY,
  PASSWORD_MIN,
  isEmailLike,
  isValidEmail,
  isValidLogin,
  normalizeLogin,
  type PersonData,
} from "@/components/auth/data";
import { isValidCode, nationalPhone } from "@/components/platform/profile/data";
import { hashPassword } from "@/server/auth/password";
import { endUserSessions } from "@/server/auth/session";
import { collection, type ClientDoc, type OrderDoc, type UserDoc } from "@/server/db/collections";
import { HttpError } from "@/server/http";
import { newAccountId } from "@/server/ids";
import { createClient } from "@/server/repos/clients";
import { insertUser, isDuplicateKey, loginKeysOf, loginTaken, noteEmailChange, setPassword } from "@/server/repos/users";
import { DEMO_ACCOUNTS } from "@/server/seed/data/accounts";
import { zId } from "@/server/validate";
import { UK_COLLATION, contains, paginate, type ListQuery, type Page } from "../list";

// Customer accounts (`users`) as the staff area reads and changes them.
//
// Built from the storefront's own pieces (repos/users.ts, repos/clients.ts,
// auth/session.ts) so an account made or changed here is exactly what the
// site's sign-up and `npm run user:create` would make: the same login
// normalization, the same login keys, the same password hash, the same
// "every session ends" rules. The storefront functions are not changed.
//
// Refusals are thrown as HttpError (400 "fields" with the field reasons,
// 404, 409) so the route files stay a parse / call / audit / answer.

// --- small shared helpers (the companies and groups repos use them too) --------

// A path segment naming a record; anything that is not an id is a record
// that does not exist.
export function pathId(raw: string): string {
  const parsed = zId.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, "not-found");
  return parsed.data;
}

// A stored date as the ISO string the browser gets (null when absent or
// broken: a document edited by hand must not crash a screen).
export function iso(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string" && value) return value;
  return null;
}

export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export type FieldErrors = Record<string, string>;

export function assertFields(fields: FieldErrors): void {
  if (Object.keys(fields).length > 0) throw new HttpError(400, "fields", { fields });
}

// "Прізвище Ім'я" with the inner whitespace collapsed (create-user does it).
function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

// 18 random bytes = 24 base64url characters (144 bits), as user:create
// generates it. Shown once by the panel, stored only as its hash.
function generatedPassword(): string {
  return randomBytes(18).toString("base64url");
}

const DEMO_IDS: ReadonlySet<string> = new Set<string>(DEMO_ACCOUNTS.map((account) => account.id));

// A demo account of the seed: a reseed rewrites it whole, and the public
// demo depends on it. Also true after a staff edit removed the flag.
function isDemoAccount(user: Pick<UserDoc, "_id" | "seed">): boolean {
  return user.seed === true || DEMO_IDS.has(user._id);
}

// --- DTOs ------------------------------------------------------------------------

// Everything a row needs; the hash and the logo never leave the database
// for a list.
const ROW_PROJECTION = { passwordHash: 0, logo: 0 } as const;

async function companyNames(clientIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(clientIds.filter((id): id is string => typeof id === "string"))];
  if (ids.length === 0) return new Map();
  const clients = await collection("clients");
  const docs = await clients.find({ _id: { $in: ids } }, { projection: { name: 1 } }).toArray();
  return new Map(docs.map((doc) => [doc._id, text(doc.name)]));
}

function toRow(user: UserDoc, companies: Map<string, string>): CustomerRow {
  return {
    id: user._id,
    type: user.type,
    name: text(user.person?.fullName),
    login: user.login,
    email: text(user.person?.email),
    phone: text(user.person?.phone) || text(user.phone),
    company: user.type === "b2b" && user.clientId ? { id: user.clientId, name: companies.get(user.clientId) ?? "" } : null,
    role: user.role ?? null,
    isActive: user.isActive !== false,
    lastLoginAt: iso(user.lastLoginAt),
    createdAt: iso(user.createdAt) ?? "",
    seed: user.seed === true,
    test: user.test === true,
  };
}

// Rows for a set of accounts (the company card lists its buyers with it).
export async function customerRows(users: UserDoc[]): Promise<CustomerRow[]> {
  const names = await companyNames(users.map((user) => user.clientId));
  return users.map((user) => toRow(user, names));
}

export function toOrderRef(doc: Pick<OrderDoc, "_id" | "number" | "date" | "status" | "total" | "channel">): OrderRef {
  return {
    id: doc._id,
    number: text(doc.number) || doc._id,
    date: text(doc.date),
    status: text(doc.status),
    total: typeof doc.total === "number" ? doc.total : 0,
    channel: doc.channel === "retail" ? "retail" : "b2b",
  };
}

export const ORDER_REF_PROJECTION = { number: 1, date: 1, status: 1, total: 1, channel: 1 } as const;

function toSession(doc: { _id: string; createdAt: Date; lastSeenAt: Date; expiresAt: Date; userAgent: string | null }): CustomerSession {
  return {
    id: doc._id.slice(0, CUSTOMER_SESSION_ID_LENGTH),
    createdAt: iso(doc.createdAt) ?? "",
    lastSeenAt: iso(doc.lastSeenAt) ?? iso(doc.createdAt) ?? "",
    expiresAt: iso(doc.expiresAt) ?? "",
    userAgent: typeof doc.userAgent === "string" ? doc.userAgent : null,
  };
}

// --- list ------------------------------------------------------------------------

export type CustomerFilters = {
  type?: "b2b" | "b2c";
  active?: boolean;
  clientId?: string;
};

// The search box: name, login, e-mail, both phones. A typed phone number
// ("+38 067 123", "067-123") is also matched by its national digits, the
// form phones are stored in.
function searchClauses(q: string): Filter<UserDoc>[] {
  const pattern = contains(q);
  const clauses: Filter<UserDoc>[] = [
    { "person.fullName": pattern },
    { login: pattern },
    { "person.email": pattern },
    { phone: pattern },
    { "person.phone": pattern },
  ];
  const digits = q.replace(/\D/g, "");
  if (/^[\d\s()+-]+$/.test(q) && digits.length >= 3) {
    const national = digits.startsWith("380") ? digits.slice(2) : digits;
    if (national !== q) {
      const numeric = contains(national);
      clauses.push({ phone: numeric }, { "person.phone": numeric }, { login: numeric });
    }
  }
  return clauses;
}

export async function listCustomers(
  query: ListQuery,
  filters: CustomerFilters,
): Promise<Page<CustomerRow> & { counts: CustomerCounts }> {
  // The search and the company narrow every tab; the type and the state
  // are what the tabs choose between.
  const base: Filter<UserDoc> = {};
  if (filters.clientId) base.clientId = filters.clientId;
  if (query.q) base.$or = searchClauses(query.q);
  const filter: Filter<UserDoc> = { ...base };
  if (filters.type) filter.type = filters.type;
  if (filters.active !== undefined) filter.isActive = filters.active;
  const users = await collection("users");
  // Names sort the Ukrainian way only when the list is sorted by them.
  const byName = query.sortKey.replace(/^-/, "") === "person.fullName";
  const [page, all, b2b, b2c, blocked] = await Promise.all([
    paginate(users, filter, query, { projection: ROW_PROJECTION, ...(byName ? { collation: UK_COLLATION } : {}) }),
    users.countDocuments(base),
    users.countDocuments({ ...base, type: "b2b" }),
    users.countDocuments({ ...base, type: "b2c" }),
    users.countDocuments({ ...base, isActive: false }),
  ]);
  return { ...page, items: await customerRows(page.items), counts: { all, b2b, b2c, blocked } };
}

// --- card ------------------------------------------------------------------------

export async function findAccount(id: string): Promise<UserDoc | null> {
  return (await collection("users")).findOne({ _id: id }, { projection: { passwordHash: 0 } });
}

export async function requireAccount(id: string): Promise<UserDoc> {
  const user = await findAccount(id);
  if (!user) throw new HttpError(404, "not-found");
  return user;
}

export async function customerDetail(id: string): Promise<CustomerDetail | null> {
  const user = await findAccount(id);
  if (!user) return null;
  const now = new Date();
  const [clients, sessions, orders, carts, assortments, leads] = await Promise.all([
    collection("clients"),
    collection("sessions"),
    collection("orders"),
    collection("carts"),
    collection("assortments"),
    collection("leads"),
  ]);
  const [client, sessionDocs, orderDocs, ordersCount, cart, assortment, leadDocs] = await Promise.all([
    user.clientId ? clients.findOne({ _id: user.clientId }, { projection: { notes: 0 } }) : Promise.resolve(null),
    sessions.find({ userId: id, expiresAt: { $gt: now } }).sort({ lastSeenAt: -1 }).limit(50).toArray(),
    orders
      .find({ userId: id }, { projection: ORDER_REF_PROJECTION })
      .sort({ createdAt: -1, _id: -1 })
      .limit(CUSTOMER_RECENT_ORDERS)
      .toArray(),
    orders.countDocuments({ userId: id }),
    carts.findOne({ _id: id }, { projection: { lines: 1 } }),
    assortments.findOne({ _id: id }, { projection: { lines: 1 } }),
    leads.find({ userId: id }, { projection: { _id: 1, kind: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(100).toArray(),
  ]);

  const names = new Map<string, string>(client ? [[client._id, text(client.name)]] : []);
  return {
    ...toRow(user, names),
    loginKeys: Array.isArray(user.loginKeys) ? user.loginKeys : [],
    person: {
      fullName: text(user.person?.fullName),
      role: text(user.person?.role),
      position: text(user.person?.position),
      phone: text(user.person?.phone),
      email: text(user.person?.email),
    },
    welcomed: user.welcomed === true,
    logo: typeof user.logo === "string" ? user.logo : null,
    updatedAt: iso(user.updatedAt) ?? "",
    company: client
      ? {
          id: client._id,
          name: text(client.name),
          edrpou: text(client.edrpou),
          region: text(client.region),
          city: text(client.city),
          discountPercent: typeof client.discountPercent === "number" ? client.discountPercent : 0,
          isActive: client.isActive !== false,
        }
      : null,
    sessions: sessionDocs.map(toSession),
    orders: orderDocs.map(toOrderRef),
    ordersCount,
    cartLines: Array.isArray(cart?.lines) ? cart.lines.length : 0,
    assortmentLines: Array.isArray(assortment?.lines) ? assortment.lines.length : 0,
    leads: leadDocs.map((doc) => doc._id),
    leadRefs: leadDocs.slice(0, CUSTOMER_RECENT_LEADS).map((doc) => ({
      id: doc._id,
      kind: doc.kind,
      status: doc.status ?? "new",
      createdAt: iso(doc.createdAt) ?? "",
    })),
  };
}

export async function requireCustomerDetail(id: string): Promise<CustomerDetail> {
  const detail = await customerDetail(id);
  if (!detail) throw new HttpError(404, "not-found");
  return detail;
}

// --- create ----------------------------------------------------------------------

export type CreatedAccount = {
  user: UserDoc;
  client: ClientDoc | null;
  // True when this request made the company.
  createdCompany: boolean;
  // The generated password (to show once), null when the body gave one.
  password: string | null;
};

function isNewCompany(company: CreateCustomerBody["company"]): company is NewCompanyInput {
  return company !== undefined && !("clientId" in company);
}

// The steps of scripts/create-user.ts (validate, compute the login keys,
// refuse a taken identifier, make or find the company, insert, undo the
// company when the insert loses a race), with the answers of a route.
export async function createAccount(input: CreateCustomerBody): Promise<CreatedAccount> {
  const fields: FieldErrors = {};
  const b2b = input.type === "b2b";

  const rawLogin = input.login.trim();
  if (!rawLogin) fields.login = "required";
  else if (!isValidLogin(rawLogin)) fields.login = "invalid";

  const fullName = cleanName(input.name);
  if (!fullName) fields.name = "required";

  const rawEmail = (input.email ?? "").trim();
  if (rawEmail && !isValidEmail(rawEmail)) fields.email = "invalid";

  const rawPhone = (input.phone ?? "").trim();
  const contactPhone = rawPhone ? nationalPhone(rawPhone) : "";
  if (contactPhone === null) fields.phone = "invalid";

  if (input.password !== undefined && input.password.length < PASSWORD_MIN) fields.password = "short";

  if (!b2b && input.company !== undefined) fields.company = "b2c";
  if (!b2b && input.role !== undefined) fields.role = "b2c";
  if (b2b && input.company === undefined) fields.company = "required";

  const clients = await collection("clients");
  let joinClient: ClientDoc | null = null;
  const company = input.company;
  if (b2b && company !== undefined) {
    if (isNewCompany(company)) {
      if (!company.name.trim()) fields["company.name"] = "required";
      if (company.edrpou && !isValidCode(company.edrpou)) fields["company.edrpou"] = "invalid";
    } else {
      joinClient = await clients.findOne({ _id: company.clientId });
      if (!joinClient) fields["company.clientId"] = "not-found";
    }
  }
  assertFields(fields);

  const login = normalizeLogin(rawLogin);
  const loginIsEmail = isEmailLike(login);
  const email = rawEmail ? rawEmail.toLowerCase() : loginIsEmail ? login : "";
  // The top-level phone is a sign-in identifier (the login itself when it
  // is a phone); person.phone is the contact number of the profile.
  const phone = loginIsEmail ? (contactPhone ?? "") : login;
  const person: PersonData = {
    fullName,
    role: "",
    position: b2b ? (input.position ?? "").trim() : "",
    phone: contactPhone || (loginIsEmail ? "" : login),
    email,
  };
  const loginKeys = loginKeysOf({ login, phone, person });
  // Cheap refusal before a company is made and the hash is computed; the
  // unique index still decides a race.
  if (await loginTaken(loginKeys)) throw new HttpError(409, "exists");

  let client: ClientDoc | null = joinClient;
  let createdCompany = false;
  if (b2b && isNewCompany(company)) {
    client = await createClient({
      name: company.name.trim(),
      edrpou: (company.edrpou ?? "").trim(),
      region: (company.region ?? "").trim(),
      city: (company.city ?? "").trim(),
      discountPercent: company.discountPercent ?? DEFAULT_DISCOUNT_PERCENT,
    });
    createdCompany = true;
  }

  const password = input.password ?? generatedPassword();
  const now = new Date();
  const doc: UserDoc = {
    _id: newAccountId(),
    type: input.type,
    login,
    phone,
    loginKeys,
    passwordHash: await hashPassword(password),
    person,
    // A partner's company card is the company document, never this field.
    company: { ...EMPTY_COMPANY },
    clientId: b2b && client ? client._id : null,
    role: b2b ? (input.role ?? "b2b_admin") : null,
    isActive: true,
    // The welcome modal (logo upload) is the partner's first sign-in.
    welcomed: !b2b,
    logo: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };
  // A company made for this account must not outlive a failed insert: a
  // lost race ("exists") or any other refusal of the database.
  const undoCompany = async () => {
    if (client && createdCompany) await clients.deleteOne({ _id: client._id });
  };
  let created: UserDoc | "exists";
  try {
    created = await insertUser(doc);
  } catch (error) {
    await undoCompany();
    throw error;
  }
  if (created === "exists") {
    await undoCompany();
    throw new HttpError(409, "exists");
  }
  return { user: doc, client, createdCompany, password: input.password === undefined ? password : null };
}

// --- change ----------------------------------------------------------------------

export type AccountChange = {
  before: UserDoc;
  after: UserDoc;
  // The fields that really changed ("isActive", "role", "clientId",
  // "person.email", ...).
  changed: string[];
};

export async function updateAccount(id: string, patch: PatchCustomerBody): Promise<AccountChange> {
  const users = await collection("users");
  const before = await users.findOne({ _id: id });
  if (!before) throw new HttpError(404, "not-found");

  const fields: FieldErrors = {};
  if (before.type !== "b2b") {
    if (patch.role !== undefined) fields.role = "b2c";
    if (patch.clientId !== undefined) fields.clientId = "b2c";
  }
  if (patch.clientId !== undefined && before.type === "b2b") {
    const target = await (await collection("clients")).findOne({ _id: patch.clientId }, { projection: { _id: 1 } });
    if (!target) fields.clientId = "not-found";
  }
  const person = patch.person ?? {};
  const email = person.email === undefined ? undefined : person.email.trim().toLowerCase();
  if (email && !isValidEmail(email)) fields["person.email"] = "invalid";
  const rawPhone = person.phone === undefined ? undefined : person.phone.trim();
  const phone = rawPhone === undefined ? undefined : rawPhone === "" ? "" : nationalPhone(rawPhone);
  if (phone === null) fields["person.phone"] = "invalid";
  const fullName = person.fullName === undefined ? undefined : cleanName(person.fullName);
  if (fullName === "") fields["person.fullName"] = "required";
  assertFields(fields);

  const set: Record<string, unknown> = {};
  const changed: string[] = [];
  const put = (key: string, next: unknown, current: unknown) => {
    if (next === undefined || next === current) return;
    set[key] = next;
    changed.push(key);
  };
  put("isActive", patch.isActive, before.isActive);
  put("role", patch.role, before.role);
  put("clientId", patch.clientId, before.clientId);
  put("welcomed", patch.welcomed, before.welcomed);
  put("person.fullName", fullName, before.person.fullName);
  put("person.position", person.position?.trim(), before.person.position);
  put("person.phone", phone ?? undefined, before.person.phone);
  const emailChanged = email !== undefined && email !== text(before.person.email).toLowerCase();
  put("person.email", emailChanged ? email : undefined, before.person.email);
  // The e-mail is a sign-in identifier: the keys follow it. Test accounts
  // (POST /api/dev/session) keep their placeholder key, as the cabinet's
  // own e-mail change does (repos/users.ts emailChangeOf).
  if (emailChanged && !before.test) {
    set.loginKeys = loginKeysOf({ login: before.login, phone: before.phone, person: { ...before.person, email: email ?? "" } });
  }
  if (changed.length === 0) return { before, after: before, changed };

  let after: UserDoc | null;
  try {
    after = await users.findOneAndUpdate(
      { _id: id },
      { $set: { ...set, updatedAt: new Date() }, $unset: { seed: "" } },
      { returnDocument: "after" },
    );
  } catch (error) {
    if (isDuplicateKey(error)) throw new HttpError(409, "exists");
    throw error;
  }
  if (!after) throw new HttpError(404, "not-found");

  // A blocked account is signed out everywhere at once (getSession also
  // refuses it, but the rows should not linger).
  if (patch.isActive === false) await endUserSessions(id);
  // The previous address hears about the change, as with the cabinet's
  // own e-mail change: nobody moves an account to another address quietly.
  if (emailChanged && !before.test && email !== undefined) await noteEmailChange(before, email);
  return { before, after, changed };
}

// --- password and sessions -------------------------------------------------------

export type PasswordChange = { user: UserDoc; password: string; generated: boolean };

// Sets the given password or a generated one. Every session of the account
// and every unused reset link end with the old password.
export async function setAccountPassword(id: string, password: string | undefined): Promise<PasswordChange> {
  const user = await requireAccount(id);
  if (password !== undefined && password.length < PASSWORD_MIN) assertFields({ password: "short" });
  const next = password ?? generatedPassword();
  await setPassword(id, next);
  await (await collection("users")).updateOne({ _id: id }, { $unset: { seed: "" } });
  await endUserSessions(id);
  return { user, password: next, generated: password === undefined };
}

export async function signOutEverywhere(id: string): Promise<{ user: UserDoc; ended: number }> {
  const user = await requireAccount(id);
  const ended = await (await collection("sessions")).countDocuments({ userId: id });
  await endUserSessions(id);
  return { user, ended };
}

// One session, named by the prefix of its stored hash the card shows.
// Resolved among this account's sessions only.
export async function endAccountSession(id: string, sessionPrefix: string): Promise<{ user: UserDoc; ended: number }> {
  const user = await requireAccount(id);
  if (!new RegExp(`^[0-9a-f]{${CUSTOMER_SESSION_ID_LENGTH}}$`).test(sessionPrefix)) {
    throw new HttpError(404, "not-found");
  }
  const sessions = await collection("sessions");
  const result = await sessions.deleteMany({ userId: id, _id: { $regex: new RegExp(`^${sessionPrefix}`) } });
  if (result.deletedCount === 0) throw new HttpError(404, "not-found");
  return { user, ended: result.deletedCount };
}

// --- delete ----------------------------------------------------------------------

// Removes an account that never ordered: its sessions, cart, assortment,
// reset links and unsent notices go with it. Orders and returns keep
// their history, so an account they refer to is refused ("has-orders":
// the panel offers blocking instead); form submissions keep the id as a
// plain reference. The demo accounts are refused ("seed").
export async function deleteAccount(id: string): Promise<UserDoc> {
  const user = await requireAccount(id);
  if (isDemoAccount(user)) throw new HttpError(409, "seed");
  const [orders, returns] = await Promise.all([collection("orders"), collection("returns")]);
  const [orderCount, returnCount] = await Promise.all([
    orders.countDocuments({ userId: id }),
    returns.countDocuments({ userId: id }),
  ]);
  if (orderCount > 0 || returnCount > 0) {
    throw new HttpError(409, "has-orders", { orders: orderCount, returns: returnCount });
  }

  const [users, sessions, carts, assortments, resets, outbox] = await Promise.all([
    collection("users"),
    collection("sessions"),
    collection("carts"),
    collection("assortments"),
    collection("passwordResets"),
    collection("outbox"),
  ]);
  // The account first: from here on no session of it opens anything.
  const removed = await users.deleteOne({ _id: id, seed: { $ne: true } });
  if (removed.deletedCount === 0) throw new HttpError(404, "not-found");
  await Promise.all([
    sessions.deleteMany({ userId: id }),
    carts.deleteOne({ _id: id }),
    assortments.deleteOne({ _id: id }),
    resets.deleteMany({ userId: id }),
    outbox.deleteMany({ "payload.userId": id, sentAt: null }),
  ]);
  return user;
}
