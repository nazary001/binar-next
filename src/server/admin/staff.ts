import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { OWNER_ROLE_ID, SYSTEM_ROLES, isPermission } from "@/components/admin/lib/permissions";
import { GENERATED_PASSWORD_TTL_HOURS } from "@/components/admin/staff/types";
import { hashPassword } from "../auth/password";
import { collection, type StaffDoc, type StaffRoleDoc } from "../db/collections";

// Staff accounts and roles of the admin panel (collections `staff` and
// `staff_roles`). No next/* import: the scripts (create-admin, db-setup)
// run this under plain Node.

export const STAFF_PASSWORD_MIN = 10;

// --- generated passwords --------------------------------------------------------

// When the password that has to be replaced (mustChangePassword) was
// issued: written with every generated or typed-by-someone-else password,
// removed when the person sets their own. Kept beside StaffDoc until
// collections.ts declares it.
export type StaffPasswordIssue = { passwordIssuedAt?: Date | null };

const HOUR_MS = 60 * 60 * 1000;

// The moment a password that has to be replaced stops opening the account;
// null when the person has their own password, or for a password issued
// before the time was recorded (nothing to measure its age by).
export function generatedPasswordExpiresAt(doc: Pick<StaffDoc, "mustChangePassword"> & StaffPasswordIssue): Date | null {
  if (doc.mustChangePassword !== true) return null;
  const issued = doc.passwordIssuedAt;
  if (!(issued instanceof Date) || Number.isNaN(issued.getTime())) return null;
  return new Date(issued.getTime() + GENERATED_PASSWORD_TTL_HOURS * HOUR_MS);
}

export function generatedPasswordExpired(
  doc: Pick<StaffDoc, "mustChangePassword"> & StaffPasswordIssue,
  now: Date = new Date(),
): boolean {
  const expiresAt = generatedPasswordExpiresAt(doc);
  return expiresAt !== null && expiresAt.getTime() <= now.getTime();
}

// --- sign-in limits -------------------------------------------------------------

export type SignInBucket = { scope: string; key: string; limit: number; windowSec: number };

export const SIGN_IN_WINDOW_SEC = 15 * 60;

// The network a rate-limit key (auth/rate-limit.ts clientIp) belongs to:
// an IPv4 address counts with its /24, an IPv6 /64 with its /48 (what one
// tunnel or site gets), so stepping through neighbouring addresses does
// not multiply the allowance. Anything else ("local", an unparsable value)
// stays as it is.
export function signInNetwork(ip: string): string {
  if (ip.endsWith("::/64")) return `${ip.slice(0, -"::/64".length).split(":").slice(0, 3).join(":")}::/48`;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(ip);
  return v4 ? `${v4[1]}.${v4[2]}.${v4[3]}.0/24` : ip;
}

// The limits on one staff sign-in attempt, all per SIGN_IN_WINDOW_SEC.
// `source`: what one caller may try (one e-mail from one address, one
// address, one network). `account`: how many attempts one e-mail takes
// from everywhere together, known or unknown alike (the same count for
// both, so a 429 tells nothing about which accounts exist). The account
// counts only attempts the source limits let through: one address alone
// cannot lock somebody out, and rotating addresses cannot guess faster
// than this.
export function staffSignInBuckets(ip: string, email: string): { source: SignInBucket[]; account: SignInBucket } {
  const windowSec = SIGN_IN_WINDOW_SEC;
  return {
    source: [
      { scope: "staff-signin", key: `${ip}|${email}`, limit: 8, windowSec },
      { scope: "staff-signin-ip", key: ip, limit: 30, windowSec },
      { scope: "staff-signin-net", key: signInNetwork(ip), limit: 60, windowSec },
    ],
    account: { scope: "staff-signin-account", key: email, limit: 20, windowSec },
  };
}

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
  const doc: StaffDoc & StaffPasswordIssue = {
    _id: randomUUID(),
    email,
    name: input.name.trim().slice(0, 200) || email,
    passwordHash: await hashPassword(input.password),
    roleId: input.roleId,
    isActive: true,
    mustChangePassword: input.mustChangePassword,
    ...(input.mustChangePassword ? { passwordIssuedAt: now } : {}),
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

// `mustChangePassword` true: a generated password, which starts its
// GENERATED_PASSWORD_TTL_HOURS from now; false: the person's own, which
// never expires.
export async function setStaffPassword(staffId: string, password: string, mustChangePassword: boolean): Promise<void> {
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await (await collection("staff")).updateOne(
    { _id: staffId },
    mustChangePassword
      ? { $set: { passwordHash, mustChangePassword: true, passwordIssuedAt: now, updatedAt: now } }
      : { $set: { passwordHash, mustChangePassword: false, updatedAt: now }, $unset: { passwordIssuedAt: "" } },
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
