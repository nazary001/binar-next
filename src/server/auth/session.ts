import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { collection, type UserDoc } from "../db/collections";
import { isProduction } from "../env";

// Database sessions.
//
// The browser holds a random token in the httpOnly cookie `binar_session`;
// the database holds only its SHA-256, so a leaked dump cannot be replayed.
// A second, readable cookie `binar_auth=1` carries no secret: it only lets
// client code (and the pre-paint gate script) know that a session probably
// exists, so anonymous visitors never trigger a session request.
//
// Only Route Handlers may call these functions: cookies can be set there,
// and reading them in a page or layout would make every prerendered route
// dynamic.

export const SESSION_COOKIE = "binar_session";
export const HINT_COOKIE = "binar_auth";

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_DAYS = 30;

export type SessionContext = {
  user: UserDoc;
  // The stored id of this session (the token hash).
  sessionId: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function writeCookies(token: string, expires: Date): Promise<void> {
  const jar = await cookies();
  const base = { secure: isProduction, sameSite: "lax", path: "/", expires } as const;
  jar.set(SESSION_COOKIE, token, { ...base, httpOnly: true });
  jar.set(HINT_COOKIE, "1", { ...base, httpOnly: false });
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(HINT_COOKIE);
}

// Signs `userId` in on this browser: a new session row and both cookies.
// Always a fresh token, so a session id is never reused across logins.
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const sessions = await collection("sessions");
  await sessions.insertOne({
    _id: hashToken(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    userAgent,
  });
  await writeCookies(token, expiresAt);
}

// The signed-in user of this request, or null. An expired or unknown token,
// a deleted user and a blocked user (isActive: false) are all "no session".
export async function getSession(): Promise<SessionContext | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const sessionId = hashToken(token);
  const now = new Date();
  const sessions = await collection("sessions");
  const session = await sessions.findOne({ _id: sessionId, expiresAt: { $gt: now } });
  if (!session) return null;

  const users = await collection("users");
  const user = await users.findOne({ _id: session.userId, isActive: true });
  if (!user) return null;

  // Sliding expiry, at most one write per day and session.
  if (now.getTime() - session.lastSeenAt.getTime() > DAY_MS) {
    const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
    await sessions.updateOne({ _id: sessionId }, { $set: { lastSeenAt: now, expiresAt } });
    await writeCookies(token, expiresAt);
  }
  return { user, sessionId };
}

// Signs this browser out: removes the session row (when there is one) and
// both cookies.
export async function endSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token && token.length <= 128) {
    const sessions = await collection("sessions");
    await sessions.deleteOne({ _id: hashToken(token) });
  }
  await clearSessionCookies();
}

// Ends every session of a user (password reset, account blocked); `keep`
// spares the current one after a password change.
export async function endUserSessions(userId: string, keep?: string): Promise<void> {
  const sessions = await collection("sessions");
  await sessions.deleteMany(keep ? { userId, _id: { $ne: keep } } : { userId });
}
