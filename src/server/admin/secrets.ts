import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Secrets the panel stores in the database (the Nova Poshta key, the ERP
// credentials, the mail provider key) are sealed with AES-256-GCM, so a
// dump of the `settings` collection alone does not hand them out.
//
// The sealing key comes from the environment:
// - SECRETS_KEY: 32 random bytes as base64 or hex (preferred), or
// - derived from REVALIDATE_SECRET (already set wherever the site runs),
//   so the panel works without one more variable.
// A value sealed under one key cannot be opened under another: after the
// key changes the secrets have to be typed in again, and `openSecret`
// answers null for them instead of throwing.

const PREFIX = "v1";

function keyFromEnv(): Buffer | null {
  const direct = process.env.SECRETS_KEY?.trim();
  if (direct) {
    const hex = /^[0-9a-fA-F]{64}$/.test(direct) ? Buffer.from(direct, "hex") : null;
    const raw = hex ?? Buffer.from(direct, "base64");
    if (raw.length === 32) return raw;
    throw new Error("SECRETS_KEY must be 32 bytes (64 hex characters or base64).");
  }
  const fallback = process.env.REVALIDATE_SECRET;
  if (fallback && fallback.length >= 16) {
    return Buffer.from(hkdfSync("sha256", fallback, "binar-admin", "settings-secrets-v1", 32));
  }
  return null;
}

export function secretsAvailable(): boolean {
  try {
    return keyFromEnv() !== null;
  } catch {
    return false;
  }
}

// Seals a secret for storage. Throws when no key is configured: the caller
// answers 503 "secrets-key" so the panel can say what to set.
export function sealSecret(plain: string): string {
  const key = keyFromEnv();
  if (!key) throw new Error("No sealing key: set SECRETS_KEY (or REVALIDATE_SECRET).");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [PREFIX, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(
    ".",
  );
}

// Opens a sealed secret; null when there is none, the key is missing or
// has changed, or the value was tampered with.
export function openSecret(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;
  try {
    const key = keyFromEnv();
    if (!key) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1], "base64url"));
    decipher.setAuthTag(Buffer.from(parts[2], "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// What the panel shows instead of a stored secret: its last four
// characters when it is long (a carrier or mail key), nothing of a short one
// (four characters of a password are too much to show every viewer).
export function secretHint(plain: string): string {
  return plain.length >= 20 ? `****${plain.slice(-4)}` : "****";
}
