import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_ID,
  hasPermission,
  isPermission,
  type Permission,
  type StaffMe,
} from "@/components/admin/lib/permissions";
import { collection, type StaffDoc, type StaffRoleDoc } from "../db/collections";
import { isProduction } from "../env";

// Staff sessions of the admin panel.
//
// Built like the customers' sessions (auth/session.ts) and kept apart from
// them on purpose: another cookie, another collection, another set of
// accounts. The browser holds a random token in the httpOnly cookie
// `binar_admin`; the database holds only its SHA-256.
//
// A session lasts 12 hours after the last request ("remember me": 30 days)
// and dies at once when the account is blocked, removed or loses its role.
//
// Two readers exist because of a Next.js rule: cookies can be written only
// in a Route Handler.
// - `readStaff()` never writes. Pages and layouts use it (through
//   `requireStaffPage`), wrapped in React cache() so one request asks the
//   database once.
// - `getStaff()` also slides the expiry. Route Handlers use it (through
//   `requireStaff` in admin/http.ts).

export const STAFF_COOKIE = "binar_admin";

const HOUR_MS = 60 * 60 * 1000;
const SHORT_SESSION_MS = 12 * HOUR_MS;
const LONG_SESSION_MS = 30 * 24 * HOUR_MS;
// The stored expiry moves forward at most this often.
const SLIDE_EVERY_MS = 5 * 60 * 1000;

export type StaffContext = {
  staff: StaffDoc;
  role: StaffRoleDoc;
  permissions: ReadonlySet<Permission>;
  // The stored id of this session (the token hash).
  sessionId: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function permissionsOf(role: StaffRoleDoc): Set<Permission> {
  // The owner role always means everything, whatever its document says: a
  // permission added to the code later must not lock the owner out.
  if (role._id === OWNER_ROLE_ID) return new Set(ALL_PERMISSIONS);
  return new Set(role.permissions.filter(isPermission));
}

async function writeCookie(token: string, expires: Date | null): Promise<void> {
  const jar = await cookies();
  jar.set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    // No date = a session cookie that goes when the browser closes.
    ...(expires ? { expires } : {}),
  });
}

// Signs `staffId` in on this browser: a new session row and the cookie.
// Always a fresh token.
export async function startStaffSession(staffId: string, remember: boolean, ip: string | null): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (remember ? LONG_SESSION_MS : SHORT_SESSION_MS));
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const sessions = await collection("staffSessions");
  await sessions.insertOne({
    _id: hashToken(token),
    staffId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    remember,
    userAgent,
    ip,
  });
  await writeCookie(token, remember ? expiresAt : null);
}

type Loaded = StaffContext & { lastSeenAt: Date; remember: boolean; token: string };

async function load(): Promise<Loaded | null> {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const sessionId = hashToken(token);
  const now = new Date();
  const sessions = await collection("staffSessions");
  const session = await sessions.findOne({ _id: sessionId, expiresAt: { $gt: now } });
  if (!session) return null;

  const staff = await (await collection("staff")).findOne({ _id: session.staffId, isActive: true });
  if (!staff) return null;
  const role = await (await collection("staffRoles")).findOne({ _id: staff.roleId });
  if (!role) return null;

  return {
    staff,
    role,
    permissions: permissionsOf(role),
    sessionId,
    lastSeenAt: session.lastSeenAt,
    remember: session.remember === true,
    token,
  };
}

function strip(loaded: Loaded): StaffContext {
  return { staff: loaded.staff, role: loaded.role, permissions: loaded.permissions, sessionId: loaded.sessionId };
}

// The signed-in member of staff of this request, or null. Read-only: safe
// in pages and layouts. One database round trip per request.
export const readStaff = cache(async (): Promise<StaffContext | null> => {
  const loaded = await load();
  return loaded ? strip(loaded) : null;
});

// The same for Route Handlers, which may write: keeps the session alive
// while the panel is in use.
export async function getStaff(): Promise<StaffContext | null> {
  const loaded = await load();
  if (!loaded) return null;
  const now = Date.now();
  if (now - loaded.lastSeenAt.getTime() > SLIDE_EVERY_MS) {
    const expiresAt = new Date(now + (loaded.remember ? LONG_SESSION_MS : SHORT_SESSION_MS));
    const sessions = await collection("staffSessions");
    await sessions.updateOne({ _id: loaded.sessionId }, { $set: { lastSeenAt: new Date(now), expiresAt } });
    // A "remember me" cookie carries its own date and has to follow.
    if (loaded.remember) await writeCookie(loaded.token, expiresAt);
  }
  return strip(loaded);
}

// Signs this browser out.
export async function endStaffSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (token && token.length <= 128) {
    await (await collection("staffSessions")).deleteOne({ _id: hashToken(token) });
  }
  jar.delete(STAFF_COOKIE);
}

// Ends every session of a member of staff (blocked, password changed);
// `keep` spares the current one.
export async function endStaffSessions(staffId: string, keep?: string): Promise<void> {
  const sessions = await collection("staffSessions");
  await sessions.deleteMany(keep ? { staffId, _id: { $ne: keep } } : { staffId });
}

export function can(ctx: Pick<StaffContext, "permissions">, needed: Permission | readonly Permission[]): boolean {
  return hasPermission(ctx.permissions, needed);
}

// What the browser may know about a member of staff with a given role.
export function staffMeOf(staff: StaffDoc, role: StaffRoleDoc): StaffMe {
  return {
    id: staff._id,
    email: staff.email,
    name: staff.name,
    roleId: role._id,
    roleName: role.name,
    permissions: [...permissionsOf(role)],
    mustChangePassword: staff.mustChangePassword === true,
  };
}

export function toStaffMe(ctx: StaffContext): StaffMe {
  return staffMeOf(ctx.staff, ctx.role);
}
