import "server-only";
import type { Filter } from "mongodb";
import { OWNER_ROLE_ID } from "@/components/admin/lib/permissions";
import {
  SESSION_ID_LENGTH,
  type AccountMe,
  type StaffJournalLine,
  type StaffOption,
  type StaffRow,
  type StaffSessionDto,
} from "@/components/admin/staff/types";
import { collection, type AuditLogDoc, type StaffDoc, type StaffRoleDoc, type StaffSessionDoc } from "../../db/collections";
import { isProduction } from "../../env";
import { endStaffSessions, staffMeOf, type StaffContext } from "../auth";
import { HttpError } from "../http";
import { UK_COLLATION, contains, paginate, type ListQuery, type Page } from "../list";
import {
  createStaff,
  findRole,
  findStaff,
  generatedStaffPassword,
  isStaffEmail,
  normalizeStaffEmail,
  otherActiveOwners,
  setStaffPassword,
} from "../staff";
import { assertWithinActor, rolePermissionsOf, roleNames } from "./roles";

// Staff accounts as the staff screens and the own-account screen see them
// (collections `staff`, `staff_sessions`, the journal).
//
// Rules held here, whatever the request says:
// - there is always at least one active owner: the last one is never
//   blocked, demoted or deleted;
// - nobody blocks, demotes or deletes their own account here (the own
//   name and sessions are managed through /api/admin/account);
// - only an owner gives the owner role or manages an owner's account;
// - a member of staff who is not an owner gives an account only a role
//   whose permissions they hold themselves, and only views an account whose
//   role has more than they have (403 "forbidden" { reason: "beyond-own" },
//   components/admin/staff/rules.ts);
// - a password never leaves the server, except a generated one, once, in
//   the answer to the person who asked for it.
// Refusals are thrown as HttpError, so the routes stay thin.

// Never read the hash out of the database for these screens.
const NO_HASH = { passwordHash: 0 } as const;

const SIGN_IN_ACTIONS = ["staff.sign-in", "staff.sign-in-refused"];

function iso(date: Date): string {
  return date.toISOString();
}

function isOwner(actor: StaffContext): boolean {
  return actor.staff.roleId === OWNER_ROLE_ID;
}

function isSelf(actor: StaffContext, target: Pick<StaffDoc, "_id">): boolean {
  return actor.staff._id === target._id;
}

export function publicSessionId(storedId: string): string {
  return storedId.slice(0, SESSION_ID_LENGTH);
}

// --- reading -----------------------------------------------------------------

async function liveSessionCounts(staffIds: string[]): Promise<Map<string, number>> {
  if (staffIds.length === 0) return new Map();
  const rows = await (await collection("staffSessions"))
    .aggregate<{ _id: string; n: number }>([
      { $match: { staffId: { $in: staffIds }, expiresAt: { $gt: new Date() } } },
      { $group: { _id: "$staffId", n: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((row) => [row._id, row.n]));
}

function toStaffRow(doc: StaffDoc, names: Map<string, string>, sessions: number): StaffRow {
  return {
    id: doc._id,
    email: doc.email,
    name: doc.name,
    roleId: doc.roleId,
    roleName: names.get(doc.roleId) ?? doc.roleId,
    isActive: doc.isActive,
    mustChangePassword: doc.mustChangePassword === true,
    lastLoginAt: doc.lastLoginAt ? iso(doc.lastLoginAt) : null,
    createdAt: iso(doc.createdAt),
    sessions,
    test: doc.test === true,
  };
}

async function rowsOf(docs: StaffDoc[]): Promise<StaffRow[]> {
  const [names, counts] = await Promise.all([roleNames(), liveSessionCounts(docs.map((doc) => doc._id))]);
  return docs.map((doc) => toStaffRow(doc, names, counts.get(doc._id) ?? 0));
}

export async function staffRowOf(doc: StaffDoc): Promise<StaffRow> {
  return (await rowsOf([doc]))[0];
}

export type StaffFilters = { roleId?: string; active?: boolean };

export async function listStaff(query: ListQuery, filters: StaffFilters): Promise<Page<StaffRow>> {
  const filter: Filter<StaffDoc> = {};
  if (query.q) filter.$or = [{ name: contains(query.q) }, { email: contains(query.q) }];
  if (filters.roleId) filter.roleId = filters.roleId;
  if (filters.active !== undefined) filter.isActive = filters.active;
  // Names sort the Ukrainian way (alphabet order, case ignored).
  const byName = query.sortKey === "name" || query.sortKey === "-name";
  const page = await paginate(await collection("staff"), filter, query, {
    projection: NO_HASH,
    ...(byName ? { collation: UK_COLLATION } : {}),
  });
  return { ...page, items: await rowsOf(page.items) };
}

export async function staffOptions(): Promise<StaffOption[]> {
  const [docs, names] = await Promise.all([
    (await collection("staff")).find({ isActive: true }, { projection: { name: 1, roleId: 1 } }).toArray(),
    roleNames(),
  ]);
  return docs
    .map((doc) => ({ id: doc._id, name: doc.name, roleName: names.get(doc.roleId) ?? doc.roleId }))
    .sort((a, b) => a.name.localeCompare(b.name, "uk"));
}

export async function staffRow(staffId: string): Promise<StaffRow | null> {
  const doc = await (await collection("staff")).findOne({ _id: staffId }, { projection: NO_HASH });
  return doc ? staffRowOf(doc) : null;
}

function toSessionDto(doc: StaffSessionDoc, currentSessionId: string): StaffSessionDto {
  return {
    id: publicSessionId(doc._id),
    createdAt: iso(doc.createdAt),
    lastSeenAt: iso(doc.lastSeenAt ?? doc.createdAt),
    expiresAt: iso(doc.expiresAt),
    remember: doc.remember === true,
    userAgent: doc.userAgent ?? null,
    ip: doc.ip ?? null,
    current: doc._id === currentSessionId,
  };
}

// The live sessions of a member of staff, the most recently used first
// (at most 100). `currentSessionId` (the stored id of the asking request)
// is flagged, and is always in the list when it belongs to `staffId`, even
// behind 100 fresher ones (an account the audit scripts sign in with).
export async function sessionsOf(staffId: string, currentSessionId: string): Promise<StaffSessionDto[]> {
  const sessions = await collection("staffSessions");
  const live = { staffId, expiresAt: { $gt: new Date() } };
  const docs = await sessions.find(live).sort({ lastSeenAt: -1, _id: 1 }).limit(100).toArray();
  if (!docs.some((doc) => doc._id === currentSessionId)) {
    const current = await sessions.findOne({ ...live, _id: currentSessionId });
    if (current) docs.unshift(current);
  }
  return docs.map((doc) => toSessionDto(doc, currentSessionId));
}

// How many live sessions a member of staff has (the list above stops at 100).
export async function liveSessionCount(staffId: string): Promise<number> {
  return (await collection("staffSessions")).countDocuments({ staffId, expiresAt: { $gt: new Date() } });
}

function toJournalLine(doc: AuditLogDoc): StaffJournalLine {
  return {
    id: doc._id,
    at: iso(doc.at),
    actor: { id: doc.actor.id, name: doc.actor.name, kind: doc.actor.kind },
    action: doc.action,
    entity: doc.entity ?? null,
    summary: doc.summary,
    ip: doc.ip ?? null,
  };
}

// What a member of staff did, plus what was done to their account.
export async function journalOf(staffId: string, limit: number): Promise<StaffJournalLine[]> {
  const docs = await (await collection("auditLog"))
    .find({ $or: [{ "actor.id": staffId }, { "entity.type": "staff", "entity.id": staffId }] })
    .sort({ at: -1, _id: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toJournalLine);
}

// The sign-ins and the refused sign-in attempts of an account.
export async function signInsOf(staffId: string, limit: number): Promise<StaffJournalLine[]> {
  const docs = await (await collection("auditLog"))
    .find({ "entity.type": "staff", "entity.id": staffId, action: { $in: SIGN_IN_ACTIONS } })
    .sort({ at: -1, _id: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toJournalLine);
}

// --- the journal's words -----------------------------------------------------

// The record a journal line is about (the sign-in route labels it the same).
export function staffEntity(doc: Pick<StaffDoc, "_id" | "email">): { type: "staff"; id: string; label: string } {
  return { type: "staff", id: doc._id, label: doc.email };
}

// "Олена Коваль (olena@binar2000.com), роль «Менеджер з продажу»": how the
// journal names a member of staff.
export function staffWords(person: Pick<StaffRow, "name" | "email" | "roleName">): string {
  return `${person.name} (${person.email}), роль «${person.roleName}»`;
}

export async function describeStaff(doc: Pick<StaffDoc, "name" | "email" | "roleId">): Promise<string> {
  const roleName = (await roleNames()).get(doc.roleId) ?? doc.roleId;
  return staffWords({ name: doc.name, email: doc.email, roleName });
}

export function accountMeOf(staff: StaffDoc, role: StaffRoleDoc): AccountMe {
  return {
    ...staffMeOf(staff, role),
    lastLoginAt: staff.lastLoginAt ? iso(staff.lastLoginAt) : null,
    createdAt: iso(staff.createdAt),
  };
}

// --- the rules ---------------------------------------------------------------

// The account an action is about: 404 when it does not exist, 403
// "owner-only" when it is an owner's and the actor is not an owner, 403
// "forbidden" { reason: "beyond-own" } when its role has permissions the
// actor does not hold (such an account is only viewed).
export async function manageableStaff(actor: StaffContext, staffId: string): Promise<StaffDoc> {
  const target = await findStaff(staffId);
  if (!target) throw new HttpError(404, "not-found");
  if (target.roleId === OWNER_ROLE_ID && !isOwner(actor)) throw new HttpError(403, "owner-only");
  if (!isOwner(actor) && !isSelf(actor, target)) {
    const role = await findRole(target.roleId);
    // A role that no longer exists grants nothing.
    if (role) assertWithinActor(actor, rolePermissionsOf(role));
  }
  return target;
}

export type AccessRemoval = { self: boolean; takesOwnerAway: boolean; otherActiveOwners: number };

// The decision for a block, a role change or a removal, kept pure so the
// audit script can walk the "last owner" branch, which the routes reach
// only when the actor is the one active owner. "last-owner" comes first:
// it is the reason that holds even when the actor asks about themselves.
export function accessRemovalRefusal(input: AccessRemoval): "last-owner" | "self" | null {
  if (input.takesOwnerAway && input.otherActiveOwners === 0) return "last-owner";
  if (input.self) return "self";
  return null;
}

async function assertMayRemoveAccess(actor: StaffContext, target: StaffDoc, takesOwnerAway: boolean): Promise<void> {
  const refusal = accessRemovalRefusal({
    self: isSelf(actor, target),
    takesOwnerAway,
    // Counted only when it matters.
    otherActiveOwners: takesOwnerAway ? await otherActiveOwners(target._id) : 1,
  });
  if (refusal) throw new HttpError(409, refusal);
}

function isActiveOwner(doc: Pick<StaffDoc, "roleId" | "isActive">): boolean {
  return doc.roleId === OWNER_ROLE_ID && doc.isActive;
}

async function activeOwners(): Promise<number> {
  return (await collection("staff")).countDocuments({ roleId: OWNER_ROLE_ID, isActive: true });
}

async function roleOrFieldError(roleId: string): Promise<StaffRoleDoc> {
  const role = await findRole(roleId);
  if (!role) throw new HttpError(400, "fields", { fields: { roleId: "unknown" } });
  return role;
}

// --- changes -----------------------------------------------------------------

export type NewStaffInput = { email: string; name: string; roleId: string };

export type CreatedStaff = { staff: StaffRow; role: StaffRoleDoc; password: string };

export async function createStaffAccount(actor: StaffContext, input: NewStaffInput): Promise<CreatedStaff> {
  const email = normalizeStaffEmail(input.email);
  if (!isStaffEmail(email)) throw new HttpError(400, "fields", { fields: { email: "invalid" } });
  const role = await roleOrFieldError(input.roleId);
  if (role._id === OWNER_ROLE_ID && !isOwner(actor)) throw new HttpError(403, "owner-only");
  assertWithinActor(actor, rolePermissionsOf(role));

  const password = generatedStaffPassword();
  const outcome = await createStaff({
    email,
    name: input.name,
    roleId: role._id,
    password,
    mustChangePassword: true,
    createdBy: actor.staff._id,
    // Accounts of the audit scripts are marked so a clean-up can find them;
    // never in production.
    ...(!isProduction && email.startsWith("zz-test-") ? { test: true as const } : {}),
  });
  if (!outcome.ok) {
    if (outcome.error === "exists") throw new HttpError(409, "exists", { fields: { email: "taken" } });
    if (outcome.error === "email") throw new HttpError(400, "fields", { fields: { email: "invalid" } });
    if (outcome.error === "role") throw new HttpError(400, "fields", { fields: { roleId: "unknown" } });
    throw new Error(`createStaff refused a generated password: ${outcome.error}`);
  }
  return { staff: await staffRowOf(outcome.staff), role, password };
}

export type StaffPatch = { name?: string; roleId?: string; isActive?: boolean };

export type StaffChanges = {
  name?: { from: string; to: string };
  role?: { from: string; to: string; fromName: string; toName: string };
  // true = unblocked, false = blocked.
  active?: boolean;
};

export type PatchedStaff = { before: StaffDoc; staff: StaffRow; changes: StaffChanges };

export async function patchStaff(actor: StaffContext, staffId: string, patch: StaffPatch): Promise<PatchedStaff> {
  const before = await manageableStaff(actor, staffId);

  const changes: StaffChanges = {};
  const set: Partial<StaffDoc> = {};
  let newRole: StaffRoleDoc | null = null;
  if (patch.name !== undefined && patch.name !== before.name) {
    changes.name = { from: before.name, to: patch.name };
    set.name = patch.name;
  }
  if (patch.roleId !== undefined && patch.roleId !== before.roleId) {
    const role = await roleOrFieldError(patch.roleId);
    if (role._id === OWNER_ROLE_ID && !isOwner(actor)) throw new HttpError(403, "owner-only");
    newRole = role;
    const names = await roleNames();
    changes.role = {
      from: before.roleId,
      to: role._id,
      fromName: names.get(before.roleId) ?? before.roleId,
      toName: role.name,
    };
    set.roleId = role._id;
  }
  if (patch.isActive !== undefined && patch.isActive !== before.isActive) {
    changes.active = patch.isActive;
    set.isActive = patch.isActive;
  }

  if (changes.role || changes.active !== undefined) {
    const takesOwnerAway =
      isActiveOwner(before) && ((changes.role !== undefined && changes.role.to !== OWNER_ROLE_ID) || changes.active === false);
    await assertMayRemoveAccess(actor, before, takesOwnerAway);
  }
  // After the "self" rule on purpose: changing one's own role is refused
  // as "self" whatever the new role holds.
  if (newRole) assertWithinActor(actor, rolePermissionsOf(newRole));
  if (Object.keys(set).length === 0) return { before, staff: await staffRowOf(before), changes };

  const staffCol = await collection("staff");
  await staffCol.updateOne({ _id: staffId }, { $set: { ...set, updatedAt: new Date() } });

  // Two owners blocking or demoting each other at the same moment would
  // both pass the count above: the second write is undone here.
  if (isActiveOwner(before) && !isActiveOwner({ ...before, ...set }) && (await activeOwners()) === 0) {
    await staffCol.updateOne(
      { _id: staffId },
      { $set: { roleId: before.roleId, isActive: before.isActive, updatedAt: new Date() } },
    );
    throw new HttpError(409, "last-owner");
  }
  // A blocked account loses its sessions at once (they would be refused
  // anyway; this also empties the list on the screen).
  if (changes.active === false) await endStaffSessions(staffId);

  const after = await findStaff(staffId);
  if (!after) throw new HttpError(404, "not-found");
  return { before, staff: await staffRowOf(after), changes };
}

export type ResetPassword = { target: StaffDoc; password: string };

export async function resetStaffPassword(actor: StaffContext, staffId: string): Promise<ResetPassword> {
  const target = await manageableStaff(actor, staffId);
  // The own password is changed with the current one, never generated
  // (POST /api/admin/auth/password).
  if (isSelf(actor, target)) throw new HttpError(409, "self");
  const password = generatedStaffPassword();
  await setStaffPassword(staffId, password, true);
  await endStaffSessions(staffId);
  return { target, password };
}

async function endSessions(staffId: string, keep?: string): Promise<number> {
  const result = await (await collection("staffSessions")).deleteMany(
    keep ? { staffId, _id: { $ne: keep } } : { staffId },
  );
  return result.deletedCount;
}

export type EndedSessions = { target: StaffDoc; ended: number };

// Every session of the account; for one's own account the session of this
// request is spared (signing oneself out is POST /api/admin/auth/sign-out).
export async function signOutStaff(actor: StaffContext, staffId: string): Promise<EndedSessions> {
  const target = await manageableStaff(actor, staffId);
  const ended = await endSessions(staffId, isSelf(actor, target) ? actor.sessionId : undefined);
  return { target, ended };
}

// One session of `staffId`, named by its public id. 404 when there is no
// such session, 409 "current" for the session of this request.
export async function endOneSession(actor: StaffContext, staffId: string, publicId: string): Promise<void> {
  const sessions = await collection("staffSessions");
  const docs = await sessions.find({ staffId }, { projection: { _id: 1 } }).toArray();
  const match = docs.find((doc) => publicSessionId(doc._id) === publicId);
  if (!match) throw new HttpError(404, "not-found");
  if (match._id === actor.sessionId) throw new HttpError(409, "current");
  await sessions.deleteOne({ _id: match._id, staffId });
}

export async function deleteStaffAccount(actor: StaffContext, staffId: string): Promise<StaffDoc> {
  const target = await manageableStaff(actor, staffId);
  await assertMayRemoveAccess(actor, target, isActiveOwner(target));

  const staffCol = await collection("staff");
  await staffCol.deleteOne({ _id: staffId });
  // The same race as in patchStaff: the account comes back.
  if (isActiveOwner(target) && (await activeOwners()) === 0) {
    await staffCol.insertOne(target).catch(() => {});
    throw new HttpError(409, "last-owner");
  }
  // Journal lines stay: they name the person in their own text.
  await endSessions(staffId);
  return target;
}

// --- the signed-in person ----------------------------------------------------

export async function renameSelf(actor: StaffContext, name: string): Promise<AccountMe> {
  const after = await (await collection("staff")).findOneAndUpdate(
    { _id: actor.staff._id },
    { $set: { name, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!after) throw new HttpError(404, "not-found");
  return accountMeOf(after, actor.role);
}

export async function signOutOthers(actor: StaffContext): Promise<number> {
  return endSessions(actor.staff._id, actor.sessionId);
}
