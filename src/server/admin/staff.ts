import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { OWNER_ROLE_ID, SYSTEM_ROLES, isPermission } from "@/components/admin/lib/permissions";
import { hashPassword } from "../auth/password";
import { collection, type StaffDoc, type StaffRoleDoc } from "../db/collections";

// Staff accounts and roles of the admin panel (collections `staff` and
// `staff_roles`). No next/* import: the scripts (create-admin, db-setup)
// run this under plain Node.

export const STAFF_PASSWORD_MIN = 10;

export function normalizeStaffEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isStaffEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// A password staff can be given and asked to replace: 18 random bytes as
// 24 base64url characters.
export function generatedStaffPassword(): string {
  return randomBytes(18).toString("base64url");
}

// Writes the built-in roles. A built-in role keeps the name and the
// permissions an administrator gave it in the panel, with one exception:
// the owner role is always rewritten whole, so a permission added to the
// code later can never lock the owner out.
export async function ensureSystemRoles(): Promise<number> {
  const roles = await collection("staffRoles");
  const now = new Date();
  let written = 0;
  for (const role of SYSTEM_ROLES) {
    const base = { name: role.name, description: role.description, permissions: [...role.permissions] };
    if (role.id === OWNER_ROLE_ID) {
      await roles.updateOne(
        { _id: role.id },
        { $set: { ...base, system: true as const, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
      written += 1;
      continue;
    }
    const result = await roles.updateOne(
      { _id: role.id },
      { $setOnInsert: { ...base, system: true as const, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
    written += result.upsertedCount;
  }
  return written;
}

export async function findRole(roleId: string): Promise<StaffRoleDoc | null> {
  return (await collection("staffRoles")).findOne({ _id: roleId });
}

export async function findStaffByEmail(rawEmail: string): Promise<StaffDoc | null> {
  return (await collection("staff")).findOne({ email: normalizeStaffEmail(rawEmail) });
}

export async function findStaff(staffId: string): Promise<StaffDoc | null> {
  return (await collection("staff")).findOne({ _id: staffId });
}

export type NewStaff = {
  email: string;
  name: string;
  roleId: string;
  password: string;
  // true = the password was generated or typed by someone else.
  mustChangePassword: boolean;
  createdBy: string | null;
  test?: true;
};

export type CreateStaffOutcome =
  | { ok: true; staff: StaffDoc }
  | { ok: false; error: "exists" | "role" | "email" | "password" };

export async function createStaff(input: NewStaff): Promise<CreateStaffOutcome> {
  const email = normalizeStaffEmail(input.email);
  if (!isStaffEmail(email)) return { ok: false, error: "email" };
  if (input.password.length < STAFF_PASSWORD_MIN) return { ok: false, error: "password" };
  if (!(await findRole(input.roleId))) return { ok: false, error: "role" };

  const now = new Date();
  const doc: StaffDoc = {
    _id: randomUUID(),
    email,
    name: input.name.trim().slice(0, 200) || email,
    passwordHash: await hashPassword(input.password),
    roleId: input.roleId,
    isActive: true,
    mustChangePassword: input.mustChangePassword,
    lastLoginAt: null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    ...(input.test ? { test: true as const } : {}),
  };
  try {
    await (await collection("staff")).insertOne(doc);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return { ok: false, error: "exists" };
    throw error;
  }
  return { ok: true, staff: doc };
}

export async function setStaffPassword(staffId: string, password: string, mustChangePassword: boolean): Promise<void> {
  await (await collection("staff")).updateOne(
    { _id: staffId },
    { $set: { passwordHash: await hashPassword(password), mustChangePassword, updatedAt: new Date() } },
  );
}

// How many active owners exist besides `exceptStaffId`: the last owner may
// not be blocked, demoted or removed.
export async function otherActiveOwners(exceptStaffId: string): Promise<number> {
  return (await collection("staff")).countDocuments({
    roleId: OWNER_ROLE_ID,
    isActive: true,
    _id: { $ne: exceptStaffId },
  });
}

// Keeps only known permission keys, without repeats.
export function cleanPermissions(values: readonly string[]): string[] {
  return [...new Set(values.filter(isPermission))];
}
