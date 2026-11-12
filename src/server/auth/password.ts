import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Password hashing: scrypt from node:crypto (no native dependency, works on
// every Node version Vercel offers).
//
// Parameters: N = 2^15, r = 8, p = 3 - one of the equivalent settings of the
// OWASP Password Storage Cheat Sheet. It needs 32 MiB per hash, so a burst of
// concurrent sign-ins cannot exhaust a function instance the way the
// 128 MiB setting (N = 2^17) could.
//
// Stored form: scrypt$<log2 N>$<r>$<p>$<salt>$<hash>, salt and hash in
// base64url. The parameters travel with the hash, so they can be raised
// later: verifyPassword reads them from the record and needsRehash says when
// a record was made with weaker ones.

const LOG_N = 15;
const R = 8;
const P = 3;
const KEY_BYTES = 64;
const SALT_BYTES = 16;

// Longer inputs are refused before any hashing (denial-of-service guard).
export const PASSWORD_MAX_LENGTH = 256;

function derive(password: string, salt: Buffer, logN: number, r: number, p: number, keyBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyBytes,
      // maxmem must exceed 128 * N * r; Node's default is exactly 32 MiB.
      { N: 2 ** logN, r, p, maxmem: 256 * 2 ** logN * r },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length > PASSWORD_MAX_LENGTH) throw new Error("password too long");
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, LOG_N, R, P, KEY_BYTES);
  return ["scrypt", LOG_N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

type Parsed = { logN: number; r: number; p: number; salt: Buffer; hash: Buffer };

function parse(stored: string): Parsed | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [logN, r, p] = parts.slice(1, 4).map(Number);
  if (![logN, r, p].every(Number.isInteger)) return null;
  // Refuse absurd parameters from a corrupted record instead of hashing
  // with them.
  if (logN < 10 || logN > 20 || r < 1 || r > 16 || p < 1 || p > 16) return null;
  const salt = Buffer.from(parts[4], "base64url");
  const hash = Buffer.from(parts[5], "base64url");
  if (salt.length < 8 || hash.length < 16) return null;
  return { logN, r, p, salt, hash };
}

// Constant-time comparison; false for a malformed record, an empty hash
// (an account with no password set) or an over-long input.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed || password.length > PASSWORD_MAX_LENGTH) {
    await burnPasswordTime();
    return false;
  }
  const key = await derive(password, parsed.salt, parsed.logN, parsed.r, parsed.p, parsed.hash.length);
  return timingSafeEqual(key, parsed.hash);
}

export function needsRehash(stored: string): boolean {
  const parsed = parse(stored);
  if (!parsed) return true;
  return parsed.logN < LOG_N || parsed.r < R || parsed.p < P || parsed.hash.length < KEY_BYTES;
}

// Spends the time of one hash. Called when the login is unknown, so the
// response time does not tell an attacker whether an account exists.
export async function burnPasswordTime(): Promise<void> {
  await derive("binar-timing-equaliser", Buffer.alloc(SALT_BYTES, 7), LOG_N, R, P, KEY_BYTES);
}
