import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  CONTRACT_STATUS,
  COUNTERPARTY_STATUS,
  mockContractNumber,
  type Contract,
  type ContractFile,
  type Counterparty,
  type Employee,
  type ProfileData,
} from "@/components/platform/profile/data";
import { rateLimit } from "../auth/rate-limit";
import { getDb } from "../db/client";
import { COLLECTION, collection, type CounterpartyDoc, type EmployeeDoc } from "../db/collections";
import { enqueueMessage } from "../outbox";
import { kyivToday } from "../time";

// Counterparties (with their embedded contracts) and employees of a partner
// company: the lists of the profile page (package F). Every function takes
// the company id from the caller's session (requirePartner), and every
// query is scoped by it, so a row of another company is "not found".
//
// The rows a mutation stores are built here from the validated input, with
// the defaults the browser action uses (profile/actions.ts): a new
// counterparty or contract waits for the manager ("review"), a contract gets
// the mock number and today's date, an invitation the current time. The
// answer carries the stored row, which the browser then adopts.
//
// Limits (a partner session must not grow the database, every session
// answer of the company or the outbox without bound): at most
// MAX_COUNTERPARTIES legal entities and MAX_EMPLOYEES rows per company and
// MAX_CONTRACTS per counterparty (409 "limit"); invitation messages count
// against a daily budget per company and per employee (rate_limits, off in
// test mode like every rate limit), and a resend within RESEND_COOLDOWN_MS
// of the last invitation writes nothing new.

export const MAX_COUNTERPARTIES = 100;
export const MAX_EMPLOYEES = 200;
export const MAX_CONTRACTS = 50;
// Invitation messages (invites + resends) a company may queue per day.
const INVITES_PER_DAY = 50;
// Resends of one invitation per day (on top of the cooldown).
const RESENDS_PER_DAY = 3;
// Under 30 minutes the page still reads "Запрошення дійсне 48 год", so a
// resend inside the window looks exactly like one that was stored.
const RESEND_COOLDOWN_MS = 15 * 60_000;
const DAY_SEC = 24 * 60 * 60;

// A refused write: the company or the counterparty is full.
export type Full = "limit";
// A refused invitation message: the daily budget is spent.
export type RateLimited = { retryAfter: number };

// --- DTOs -------------------------------------------------------------------

// Key order = the UI types (and the mock the parity dump recorded).
function toContract(c: Contract): Contract {
  return {
    id: c.id,
    number: c.number,
    date: c.date,
    status: c.status,
    file: { name: c.file.name, size: c.file.size, format: c.file.format },
  };
}

function toCounterparty(doc: CounterpartyDoc): Counterparty {
  return {
    id: doc._id,
    name: doc.name,
    signatory: doc.signatory,
    code: doc.code,
    status: doc.status,
    contracts: (Array.isArray(doc.contracts) ? doc.contracts : []).filter(isContract).map(toContract),
  };
}

// A seeded invitation of the demo company carries `invitedAtFloating`: it
// was sent "just now" for every viewer, as the browser mock stamped it at
// the first visit, so the card always reads "Запрошення дійсне 48 год"
// however long ago the database was seeded. A real resend drops the flag.
function toEmployee(doc: EmployeeDoc, now: Date = new Date()): Employee {
  const employee: Employee = {
    id: doc._id,
    status: doc.status,
    fullName: typeof doc.fullName === "string" ? doc.fullName : "",
    position: typeof doc.position === "string" ? doc.position : "",
    phone: typeof doc.phone === "string" ? doc.phone : "",
    email: doc.email,
  };
  if (doc.invitedAtFloating === true && doc.status === "invited") employee.invitedAt = now.toISOString();
  else if (typeof doc.invitedAt === "string") employee.invitedAt = doc.invitedAt;
  return employee;
}

// A row edited by hand in Atlas with a status outside the UI's unions (or a
// missing field) would crash the status lookups of the page; it is left out
// instead.
function isContract(c: unknown): c is Contract {
  const v = c as Partial<Contract> | null;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.id === "string" &&
    typeof v.number === "string" &&
    typeof v.date === "string" &&
    typeof v.status === "string" &&
    Object.hasOwn(CONTRACT_STATUS, v.status) &&
    typeof v.file === "object" &&
    v.file !== null &&
    typeof v.file.name === "string" &&
    typeof v.file.size === "number" &&
    typeof v.file.format === "string"
  );
}

function isCounterpartyDoc(doc: CounterpartyDoc): boolean {
  return (
    typeof doc.name === "string" &&
    typeof doc.signatory === "string" &&
    typeof doc.code === "string" &&
    typeof doc.status === "string" &&
    Object.hasOwn(COUNTERPARTY_STATUS, doc.status)
  );
}

function isEmployeeDoc(doc: EmployeeDoc): boolean {
  return (doc.status === "active" || doc.status === "invited") && typeof doc.email === "string";
}

// --- reads ------------------------------------------------------------------

const ORDER = { sort: 1, createdAt: 1, _id: 1 } as const;

// The profile page lists of this company, in their stored order, and the
// company's invitation token. A company without rows gets empty lists.
export async function profileData(clientId: string): Promise<ProfileData | undefined> {
  const [clients, counterparties, employees] = await Promise.all([
    collection("clients"),
    collection("counterparties"),
    collection("employees"),
  ]);
  const [client, cps, emps] = await Promise.all([
    clients.findOne({ _id: clientId }, { projection: { inviteToken: 1 } }),
    counterparties.find({ clientId }).sort(ORDER).toArray(),
    employees.find({ clientId }).sort(ORDER).toArray(),
  ]);
  const now = new Date();
  return {
    counterparties: cps.filter(isCounterpartyDoc).map(toCounterparty),
    employees: emps.filter(isEmployeeDoc).map((doc) => toEmployee(doc, now)),
    inviteToken: typeof client?.inviteToken === "string" ? client.inviteToken : "",
  };
}

// --- helpers ----------------------------------------------------------------

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 11000;
}

// The next place at the end of a company's list (new rows are appended,
// exactly where the browser put them).
async function nextSort(key: "counterparties" | "employees", clientId: string): Promise<number> {
  const target = (await getDb()).collection<{ _id: string; clientId: string; sort: number }>(COLLECTION[key]);
  const last = await target.find({ clientId }, { projection: { sort: 1 } }).sort({ sort: -1 }).limit(1).next();
  return typeof last?.sort === "number" && Number.isFinite(last.sort) ? Math.floor(last.sort) + 1 : 0;
}

// Contract ids are unique inside a company (across its counterparties).
async function contractIdTaken(clientId: string, contractId: string): Promise<boolean> {
  const counterparties = await collection("counterparties");
  const hit = await counterparties.findOne({ clientId, "contracts.id": contractId }, { projection: { _id: 1 } });
  return hit !== null;
}

// "ct-" + 8 hex characters, the shape of the browser's newId("ct").
function newContractId(): string {
  return `ct-${randomBytes(4).toString("hex")}`;
}

// mockContractNumber reads the calendar day with getDate() / getFullYear(),
// i.e. in the zone the code runs in: the buyer's browser (Kyiv) made the
// number the page shows, while the server may run in UTC (Vercel). This
// is a Date whose local calendar day is the Kyiv day in any zone, so the
// stored number is the one the page already showed, also between midnight
// and 02:00 / 03:00 Kyiv time.
export function kyivCalendarDate(now: Date): Date {
  const [year, month, day] = kyivToday(now).split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

// A contract as the browser action makes it (actions.ts contractFromFile):
// waiting for the manager, the mock number among the counterparty's
// contracts, today's date.
function newContract(id: string, file: ContractFile, existing: Contract[], now: Date): Contract {
  return {
    id,
    number: mockContractNumber(existing, kyivCalendarDate(now)),
    date: now.toISOString().slice(0, 10),
    status: "review",
    file: { name: file.name, size: file.size, format: file.format },
  };
}

// The invitation e-mail of one address in one company, claimed while its
// invitation is being written: parallel invites of the same address under
// different ids then leave one row and one message (a unique index cannot
// say it: the seed holds several rows with one address). The claim is a
// short-lived row of the shared `rate_limits` collection (its TTL index
// removes a claim a crashed request left behind; an expired one is free).
// Answers the claim to release, or null when another request holds it.
const CLAIM_MS = 30_000;

async function claimAddress(clientId: string, email: string): Promise<{ _id: string; expiresAt: Date } | null> {
  const limits = await collection("rateLimits");
  const now = new Date();
  const claim = {
    _id: `profile-invite:${clientId}:${createHash("sha256").update(email).digest("hex")}`,
    expiresAt: new Date(now.getTime() + CLAIM_MS),
  };
  try {
    await limits.updateOne(
      { _id: claim._id, expiresAt: { $lte: now } },
      { $set: { count: 1, expiresAt: claim.expiresAt } },
      { upsert: true },
    );
    return claim;
  } catch (error) {
    // A live claim exists: the filter missed it and the upsert collided.
    if (isDuplicateKey(error)) return null;
    throw error;
  }
}

async function releaseAddress(claim: { _id: string; expiresAt: Date }): Promise<void> {
  const limits = await collection("rateLimits");
  // Only our own claim (a slow request's expired claim may be someone
  // else's by now).
  await limits.deleteOne({ _id: claim._id, expiresAt: claim.expiresAt });
}

// One invitation message more for this company today (and, for a resend,
// for this employee); the retry delay when the budget is spent.
async function inviteBudget(clientId: string, employeeId?: string): Promise<RateLimited | null> {
  if (employeeId !== undefined) {
    const resend = await rateLimit("invite-resend", `${clientId}:${employeeId}`, RESENDS_PER_DAY, DAY_SEC);
    if (!resend.ok) return { retryAfter: resend.retryAfter };
  }
  const company = await rateLimit("invite", `client:${clientId}`, INVITES_PER_DAY, DAY_SEC);
  return company.ok ? null : { retryAfter: company.retryAfter };
}

async function companyName(clientId: string): Promise<string> {
  const clients = await collection("clients");
  const client = await clients.findOne({ _id: clientId }, { projection: { name: 1 } });
  return typeof client?.name === "string" ? client.name : "";
}

// --- counterparties and contracts --------------------------------------------

export type NewCounterparty = {
  id: string;
  name: string;
  code: string;
  signatory: string;
  // The first contract's file (metadata only, the bytes are not uploaded).
  file?: ContractFile | null;
  // Its id as the browser made it; the server makes one when absent.
  contractId?: string;
};

export async function createCounterparty(
  clientId: string,
  input: NewCounterparty,
): Promise<Counterparty | "exists" | Full> {
  const counterparties = await collection("counterparties");
  if ((await counterparties.countDocuments({ clientId })) >= MAX_COUNTERPARTIES) return "limit";
  const now = new Date();
  const contracts: Contract[] = [];
  if (input.file) {
    const contractId = input.contractId ?? newContractId();
    if (await contractIdTaken(clientId, contractId)) return "exists";
    contracts.push(newContract(contractId, input.file, [], now));
  }
  const doc: CounterpartyDoc = {
    _id: input.id,
    clientId,
    name: input.name,
    signatory: input.signatory,
    code: input.code,
    status: "review",
    contracts,
    sort: await nextSort("counterparties", clientId),
    createdAt: now,
    updatedAt: now,
  };
  try {
    await counterparties.insertOne(doc);
  } catch (error) {
    // The id is taken (by this company or, astronomically unlikely for a
    // random id, by another one); parallel duplicates leave one row.
    if (isDuplicateKey(error)) return "exists";
    throw error;
  }
  return toCounterparty(doc);
}

export async function addContract(
  clientId: string,
  counterpartyId: string,
  input: { id: string; file: ContractFile },
): Promise<Contract | "not-found" | "exists" | Full> {
  const counterparties = await collection("counterparties");
  const counterparty = await counterparties.findOne(
    { _id: counterpartyId, clientId },
    { projection: { contracts: 1 } },
  );
  if (!counterparty) return "not-found";
  const existing = Array.isArray(counterparty.contracts) ? counterparty.contracts : [];
  if (existing.length >= MAX_CONTRACTS) return "limit";
  if (await contractIdTaken(clientId, input.id)) return "exists";
  const now = new Date();
  const contract = newContract(input.id, input.file, existing, now);
  // The id condition makes parallel duplicates of one request add the
  // contract once; the index condition keeps parallel adds of different
  // contracts under the cap.
  const result = await counterparties.updateOne(
    {
      _id: counterpartyId,
      clientId,
      "contracts.id": { $ne: input.id },
      [`contracts.${MAX_CONTRACTS - 1}`]: { $exists: false },
    },
    { $push: { contracts: contract }, $set: { updatedAt: now } },
  );
  if (result.matchedCount === 0) {
    const current = await counterparties.findOne({ _id: counterpartyId, clientId }, { projection: { contracts: 1 } });
    if (!current) return "not-found";
    const contracts = Array.isArray(current.contracts) ? current.contracts : [];
    if (contracts.some((k) => k?.id === input.id)) return "exists";
    return contracts.length >= MAX_CONTRACTS ? "limit" : "exists";
  }
  return contract;
}

export async function removeContract(clientId: string, counterpartyId: string, contractId: string): Promise<boolean> {
  const counterparties = await collection("counterparties");
  const result = await counterparties.updateOne(
    { _id: counterpartyId, clientId, "contracts.id": contractId },
    { $pull: { contracts: { id: contractId } }, $set: { updatedAt: new Date() } },
  );
  return result.matchedCount > 0;
}

// --- employees ----------------------------------------------------------------

// A new invitation row; the invitation itself goes to the outbox (nothing
// is sent yet). The e-mail must not be on the company's list already (the
// invite form's rule); the address is claimed while the row is written, so
// parallel invites of one address leave one row and one message.
//
// The ids the browser makes share the collection's one `_id` space, so an
// id another company already holds still answers "exists" (from the
// insert). They are 32 random bits: guessing another company's ids is not
// practical, and every miss is a row of the caller's own, capped company.
export async function inviteEmployee(
  clientId: string,
  input: { id: string; email: string },
): Promise<Employee | "exists" | "email-exists" | Full | RateLimited> {
  const employees = await collection("employees");
  if (await employees.findOne({ _id: input.id, clientId }, { projection: { _id: 1 } })) return "exists";
  if ((await employees.countDocuments({ clientId })) >= MAX_EMPLOYEES) return "limit";
  const claim = await claimAddress(clientId, input.email);
  if (!claim) return "email-exists";
  try {
    if (await employees.findOne({ clientId, email: input.email }, { projection: { _id: 1 } })) return "email-exists";
    const limited = await inviteBudget(clientId);
    if (limited) return limited;
    const now = new Date();
    const doc: EmployeeDoc = {
      _id: input.id,
      clientId,
      status: "invited",
      fullName: "",
      position: "",
      phone: "",
      email: input.email,
      invitedAt: now.toISOString(),
      sort: await nextSort("employees", clientId),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await employees.insertOne(doc);
    } catch (error) {
      if (isDuplicateKey(error)) return "exists";
      throw error;
    }
    await enqueueMessage("employee-invite", input.email, { company: await companyName(clientId), employeeId: input.id });
    return toEmployee(doc, now);
  } finally {
    await releaseAddress(claim);
  }
}

// A resend within the cooldown of the last invitation: "now" as an ISO
// string compares like the stored ones.
function cooldownCutoff(now: Date): string {
  return new Date(now.getTime() - RESEND_COOLDOWN_MS).toISOString();
}

// Sends the invitation again: a new invitedAt (the 48-hour window starts
// over) and another outbox message. Only an invitation can be resent.
// Within RESEND_COOLDOWN_MS of the last one the stored row is answered and
// nothing is written (the card reads the same 48 hours either way); past
// it, each resend counts against the employee's and the company's daily
// budgets. The floating seeded invitation is resent like any other and
// keeps its own time from then on.
export async function resendInvite(
  clientId: string,
  employeeId: string,
): Promise<Employee | "not-found" | "not-invited" | RateLimited> {
  const employees = await collection("employees");
  const now = new Date();
  const cutoff = cooldownCutoff(now);
  const current = await employees.findOne({ _id: employeeId, clientId });
  if (!current) return "not-found";
  if (current.status !== "invited") return "not-invited";
  const cooling =
    current.invitedAtFloating !== true && typeof current.invitedAt === "string" && current.invitedAt >= cutoff;
  if (cooling) return toEmployee(current, now);

  const limited = await inviteBudget(clientId, employeeId);
  if (limited) return limited;
  // The cooldown condition again, atomically: of parallel resends one
  // writes, the others find the fresh time and answer the stored row.
  const updated = await employees.findOneAndUpdate(
    {
      _id: employeeId,
      clientId,
      status: "invited",
      $or: [{ invitedAtFloating: true }, { invitedAt: { $not: { $gte: cutoff } } }],
    },
    { $set: { invitedAt: now.toISOString(), updatedAt: now }, $unset: { invitedAtFloating: "" } },
    { returnDocument: "after" },
  );
  if (!updated) {
    const again = await employees.findOne({ _id: employeeId, clientId });
    if (!again) return "not-found";
    return again.status === "invited" ? toEmployee(again, now) : "not-invited";
  }
  await enqueueMessage("employee-invite", updated.email, {
    company: await companyName(clientId),
    employeeId,
    resend: true,
  });
  return toEmployee(updated, now);
}

export type EmployeePatch = Partial<Pick<Employee, "fullName" | "position" | "phone" | "email">>;

// The edit modal's rules: an invitation only has its e-mail; an active
// employee keeps a name.
export async function updateEmployee(
  clientId: string,
  employeeId: string,
  patch: EmployeePatch,
): Promise<Employee | "not-found" | "invalid"> {
  const employees = await collection("employees");
  const current = await employees.findOne({ _id: employeeId, clientId });
  if (!current) return "not-found";
  if (
    current.status === "invited" &&
    (patch.fullName !== undefined || patch.position !== undefined || patch.phone !== undefined)
  ) {
    return "invalid";
  }
  if (patch.fullName !== undefined && patch.fullName === "") return "invalid";

  const set: Partial<EmployeeDoc> = { updatedAt: new Date() };
  if (patch.fullName !== undefined) set.fullName = patch.fullName;
  if (patch.position !== undefined) set.position = patch.position;
  if (patch.phone !== undefined) set.phone = patch.phone;
  if (patch.email !== undefined) set.email = patch.email;
  // The status condition: an invitation that turned into an active
  // employee meanwhile is not patched with the wrong rules.
  const updated = await employees.findOneAndUpdate(
    { _id: employeeId, clientId, status: current.status },
    { $set: set },
    { returnDocument: "after" },
  );
  return updated ? toEmployee(updated) : "not-found";
}

export async function removeEmployee(clientId: string, employeeId: string): Promise<boolean> {
  const employees = await collection("employees");
  const result = await employees.deleteOne({ _id: employeeId, clientId });
  return result.deletedCount > 0;
}
