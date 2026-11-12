import "server-only";
import { z } from "zod";
import { slugify } from "@/components/admin/lib/format";
import { ALL_PERMISSIONS, OWNER_ROLE_ID, SYSTEM_ROLES } from "@/components/admin/lib/permissions";
import { effectivePermissions, permissionsBeyond, type StaffRefusalReason } from "@/components/admin/staff/rules";
import type { RoleRow } from "@/components/admin/staff/types";
import { collection, type StaffRoleDoc } from "../../db/collections";
import { zId } from "../../validate";
import type { StaffContext } from "../auth";
import { HttpError } from "../http";
import { cleanPermissions } from "../staff";

// Roles of the staff area (collection `staff_roles`), as the roles screen
// and its routes see them.
//
// Rules held here, whatever the request says:
// - the owner role is never edited or deleted (it always means every
//   permission, see admin/auth.ts permissionsOf);
// - a built-in role may be edited but never deleted, and stays built-in;
// - a role somebody has is never deleted;
// - two roles never share a name (the selects would be ambiguous);
// - a member of staff who is not an owner never edits or deletes the role
//   they hold (403 "own-role"), and creates, edits or deletes only roles
//   whose permissions they hold themselves (403 "beyond-own"), so holding
//   staff.manage never lets anybody grant themselves more
//   (components/admin/staff/rules.ts).
// Refusals are thrown as HttpError, so the routes stay thin.

export function isOwnerActor(actor: StaffContext): boolean {
  return actor.staff.roleId === OWNER_ROLE_ID;
}

// What a role document really grants (the owner role: everything).
export function rolePermissionsOf(doc: Pick<StaffRoleDoc, "_id" | "permissions">): string[] {
  return effectivePermissions(doc._id, cleanPermissions(doc.permissions ?? []));
}

function refuse(reason: StaffRefusalReason): never {
  throw new HttpError(403, "forbidden", { reason });
}

// 403 "beyond-own" when a non-owner reaches for permissions they do not
// hold themselves (owners hold everything).
export function assertWithinActor(actor: StaffContext, permissions: readonly string[]): void {
  if (isOwnerActor(actor)) return;
  if (permissionsBeyond(actor.permissions, permissions).length > 0) refuse("beyond-own");
}

function assertNotOwnRole(actor: StaffContext, roleId: string): void {
  if (!isOwnerActor(actor) && actor.staff.roleId === roleId) refuse("own-role");
}

const SYSTEM_ORDER = new Map(SYSTEM_ROLES.map((role, index) => [role.id, index]));

// The permissions of a request body. Only the shape and the number are
// bounded here; unknown keys are dropped by cleanPermissions on write.
export const zPermissionKeys = z.array(z.string().max(64)).max(200);

// A name as people compare them: case and repeated spaces do not count.
function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("uk");
}

function toRoleRow(doc: StaffRoleDoc, members: number): RoleRow {
  const locked = doc._id === OWNER_ROLE_ID;
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description ?? "",
    // Unknown keys (a permission removed from the code) are not shown.
    permissions: locked ? [...ALL_PERMISSIONS] : cleanPermissions(doc.permissions ?? []),
    system: doc.system === true,
    locked,
    members,
  };
}

// Built-in roles in their fixed order, then the others by name.
function byDisplayOrder(a: StaffRoleDoc, b: StaffRoleDoc): number {
  const left = SYSTEM_ORDER.get(a._id);
  const right = SYSTEM_ORDER.get(b._id);
  if (left !== undefined && right !== undefined) return left - right;
  if (left !== undefined) return -1;
  if (right !== undefined) return 1;
  return a.name.localeCompare(b.name, "uk");
}

async function memberCounts(roleIds?: string[]): Promise<Map<string, number>> {
  const staff = await collection("staff");
  const rows = await staff
    .aggregate<{ _id: string; n: number }>([
      ...(roleIds ? [{ $match: { roleId: { $in: roleIds } } }] : []),
      { $group: { _id: "$roleId", n: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((row) => [row._id, row.n]));
}

export async function membersOf(roleId: string): Promise<number> {
  return (await collection("staff")).countDocuments({ roleId });
}

export async function listRoles(): Promise<RoleRow[]> {
  const [docs, counts] = await Promise.all([
    (await collection("staffRoles")).find({}).toArray(),
    memberCounts(),
  ]);
  return docs.sort(byDisplayOrder).map((doc) => toRoleRow(doc, counts.get(doc._id) ?? 0));
}

export async function roleRow(roleId: string): Promise<RoleRow | null> {
  const doc = await (await collection("staffRoles")).findOne({ _id: roleId });
  return doc ? toRoleRow(doc, await membersOf(roleId)) : null;
}

// id -> name of every role, for the staff rows.
export async function roleNames(): Promise<Map<string, string>> {
  const docs = await (await collection("staffRoles")).find({}, { projection: { name: 1 } }).toArray();
  return new Map(docs.map((doc) => [doc._id, doc.name]));
}

// Throws 409 "exists" when another role already carries `name`. Roles are
// few, so they are compared here rather than through a collation index.
async function assertNameFree(name: string, exceptId?: string): Promise<void> {
  const key = nameKey(name);
  const docs = await (await collection("staffRoles")).find({}, { projection: { name: 1 } }).toArray();
  if (docs.some((doc) => doc._id !== exceptId && nameKey(doc.name) === key)) {
    throw new HttpError(409, "exists", { fields: { name: "taken" } });
  }
}

// A role id from its name: "Склад і логістика" -> "sklad-i-lohistyka",
// then "-2", "-3"... when taken. Always a valid zId.
function idCandidates(name: string): string[] {
  const base = slugify(name, 56) || "role";
  const safe = zId.safeParse(base).success ? base : "role";
  return [safe, ...Array.from({ length: 98 }, (_, index) => `${safe}-${index + 2}`)];
}

export type RoleInput = { name: string; description: string; permissions: string[] };

export async function createRole(actor: StaffContext, input: RoleInput): Promise<RoleRow> {
  assertWithinActor(actor, cleanPermissions(input.permissions));
  await assertNameFree(input.name);
  const roles = await collection("staffRoles");
  const now = new Date();
  for (const id of idCandidates(input.name)) {
    const doc: StaffRoleDoc = {
      _id: id,
      name: input.name,
      description: input.description,
      permissions: cleanPermissions(input.permissions),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await roles.insertOne(doc);
      return toRoleRow(doc, 0);
    } catch (error) {
      // The id is taken (an earlier role, or a parallel request): try the
      // next one.
      if ((error as { code?: number }).code === 11000) continue;
      throw error;
    }
  }
  throw new HttpError(409, "exists", { fields: { name: "taken" } });
}

export type RolePatch = Partial<RoleInput>;

export type RoleUpdate = { before: StaffRoleDoc; role: RoleRow };

export async function updateRole(actor: StaffContext, roleId: string, patch: RolePatch): Promise<RoleUpdate> {
  const roles = await collection("staffRoles");
  const before = await roles.findOne({ _id: roleId });
  if (!before) throw new HttpError(404, "not-found");
  if (before._id === OWNER_ROLE_ID) throw new HttpError(409, "locked");
  assertNotOwnRole(actor, roleId);
  // A role that already has more than the actor is only viewed: neither
  // stripped nor renamed by somebody who could not have made it.
  assertWithinActor(actor, rolePermissionsOf(before));
  if (patch.permissions !== undefined) assertWithinActor(actor, cleanPermissions(patch.permissions));
  if (patch.name !== undefined && nameKey(patch.name) !== nameKey(before.name)) {
    await assertNameFree(patch.name, roleId);
  }

  // `system` is never written here: a built-in role stays built-in.
  const set: Partial<StaffRoleDoc> = { updatedAt: new Date() };
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.permissions !== undefined) set.permissions = cleanPermissions(patch.permissions);
  const after = await roles.findOneAndUpdate({ _id: roleId }, { $set: set }, { returnDocument: "after" });
  if (!after) throw new HttpError(404, "not-found");
  return { before, role: toRoleRow(after, await membersOf(roleId)) };
}

export async function deleteRole(actor: StaffContext, roleId: string): Promise<StaffRoleDoc> {
  const roles = await collection("staffRoles");
  const doc = await roles.findOne({ _id: roleId });
  if (!doc) throw new HttpError(404, "not-found");
  if (doc.system === true || doc._id === OWNER_ROLE_ID) throw new HttpError(409, "locked");
  assertNotOwnRole(actor, roleId);
  assertWithinActor(actor, rolePermissionsOf(doc));
  const members = await membersOf(roleId);
  if (members > 0) throw new HttpError(409, "in-use", { members });

  await roles.deleteOne({ _id: roleId });
  // Somebody may have been given the role between the count and the
  // delete: then the role comes back, nobody is left without one.
  const late = await membersOf(roleId);
  if (late > 0) {
    await roles.insertOne(doc).catch(() => {});
    throw new HttpError(409, "in-use", { members: late });
  }
  return doc;
}
