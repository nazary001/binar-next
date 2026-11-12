import "server-only";
import { randomBytes, randomUUID } from "node:crypto";

// New account ids keep the shape the browser mock produced (a UUID).
export function newAccountId(): string {
  return randomUUID();
}

// "<prefix>-<12 hex>": ids of documents nobody types (leads, outbox, ...).
export function newId(prefix: string): string {
  return `${prefix}-${randomBytes(6).toString("hex")}`;
}

// A URL-safe random secret (reset tokens, invitation tokens).
export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
