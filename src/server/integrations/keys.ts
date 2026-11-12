import "server-only";
import { createHash, randomInt } from "node:crypto";
import {
  API_KEY_PREFIX,
  API_KEY_PREFIX_LENGTH,
  type ApiKeyDto,
  type ApiKeyScope,
  type ApiKeyState,
} from "@/components/admin/integrations/types";
import type { ListQuery } from "../admin/list";
import { paginate } from "../admin/list";
import { collection, type ApiKeyDoc } from "../db/collections";
import { newId } from "../ids";

// API keys of the machine API (/api/integrations/*): the accounting system
// signs every call with "Authorization: Bearer <key>".
//
// A key is "bnr_" + 40 random base62 characters (about 238 bits). It is
// shown once, in the answer that created it; the database keeps only its
// SHA-256 and the first characters for the panel to tell keys apart. A
// call is matched by the hash of what it presents, never by the prefix, so
// the stored data alone cannot be turned back into a working key, and no
// constant-time comparison is needed (nothing secret is compared).

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const BODY_LENGTH = 40;
const KEY_RE = /^bnr_[A-Za-z0-9]{40}$/;

export const KEY_SCOPES: readonly ApiKeyScope[] = ["bas:read", "bas:write"];

// randomInt draws each character without the modulo bias of bytes % 62.
export function generateApiKey(): string {
  let body = "";
  for (let i = 0; i < BODY_LENGTH; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  return `${API_KEY_PREFIX}${body}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function isApiKeyShape(value: string): boolean {
  return KEY_RE.test(value);
}

export function apiKeyState(doc: Pick<ApiKeyDoc, "isActive" | "expiresAt">, now: Date = new Date()): ApiKeyState {
  if (!doc.isActive) return "revoked";
  if (doc.expiresAt && doc.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

const iso = (value: Date | null | undefined): string | null => (value instanceof Date ? value.toISOString() : null);

// Field by field: the hash never leaves the server.
export function toApiKeyDto(doc: ApiKeyDoc, now: Date = new Date()): ApiKeyDto {
  return {
    id: doc._id,
    name: doc.name,
    prefix: doc.prefix,
    scopes: doc.scopes.filter((scope): scope is ApiKeyScope => (KEY_SCOPES as string[]).includes(scope)),
    isActive: doc.isActive,
    state: apiKeyState(doc, now),
    createdAt: doc.createdAt.toISOString(),
    createdBy: doc.createdBy,
    expiresAt: iso(doc.expiresAt),
    lastUsedAt: iso(doc.lastUsedAt),
    lastUsedIp: doc.lastUsedIp,
    createdByName: null,
    updatedAt: iso(doc.updatedAt),
    updatedBy: doc.updatedBy ?? null,
  };
}

// Fills createdByName from the staff collection: the keys table says who
// made a key, and a key outlives the member of staff's session.
export async function withCreatorNames(dtos: ApiKeyDto[]): Promise<ApiKeyDto[]> {
  const ids = [...new Set(dtos.flatMap((dto) => (dto.createdBy ? [dto.createdBy] : [])))];
  if (ids.length === 0) return dtos;
  const rows = await (await collection("staff")).find({ _id: { $in: ids } }, { projection: { name: 1 } }).toArray();
  const names = new Map(rows.map((row) => [row._id, row.name]));
  return dtos.map((dto) => ({ ...dto, createdByName: dto.createdBy ? (names.get(dto.createdBy) ?? null) : null }));
}

export type NewApiKey = { name: string; scopes: ApiKeyScope[]; expiresAt: Date | null; createdBy: string | null };

// Creates a key; the caller shows `key` once and forgets it.
export async function createApiKey(input: NewApiKey): Promise<{ key: string; doc: ApiKeyDoc }> {
  const keys = await collection("apiKeys");
  // A repeated hash is as likely as guessing a key; one retry is plenty.
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = generateApiKey();
    const doc: ApiKeyDoc = {
      _id: newId("key"),
      name: input.name,
      prefix: key.slice(0, API_KEY_PREFIX_LENGTH),
      hash: hashApiKey(key),
      scopes: [...new Set(input.scopes)],
      isActive: true,
      createdAt: new Date(),
      createdBy: input.createdBy,
      expiresAt: input.expiresAt,
      lastUsedAt: null,
      lastUsedIp: null,
    };
    try {
      await keys.insertOne(doc);
      return { key, doc };
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }
  throw new Error("could not store a new API key");
}

// The key a call presents, or null (malformed or unknown). Revoked and
// expired keys are returned too: the caller tells them apart, so the
// journal can name the key that was refused.
export async function findApiKeyByToken(token: string): Promise<ApiKeyDoc | null> {
  if (!isApiKeyShape(token)) return null;
  return (await collection("apiKeys")).findOne({ hash: hashApiKey(token) });
}

export async function findApiKey(id: string): Promise<ApiKeyDoc | null> {
  return (await collection("apiKeys")).findOne({ _id: id });
}

export async function listApiKeys(query: Pick<ListQuery, "page" | "limit" | "sort">) {
  const now = new Date();
  const page = await paginate(await collection("apiKeys"), {}, query, {
    projection: { hash: 0 },
    map: (doc) => toApiKeyDto(doc, now),
  });
  return { ...page, items: await withCreatorNames(page.items) };
}

export type ApiKeyPatch = { name?: string; isActive?: boolean; scopes?: ApiKeyScope[] };

// Applies a rename, a change of scopes or a switch off / on. Only fields
// that really change are written, and only then is the key stamped with
// updatedAt / updatedBy (a save that changes nothing leaves no trace).
export async function updateApiKey(id: string, patch: ApiKeyPatch, staffId: string | null = null): Promise<ApiKeyDoc | null> {
  const keys = await collection("apiKeys");
  const current = await keys.findOne({ _id: id });
  if (!current) return null;
  const set: Partial<Pick<ApiKeyDoc, "name" | "isActive" | "scopes" | "updatedAt" | "updatedBy">> = {};
  if (patch.name !== undefined && patch.name !== current.name) set.name = patch.name;
  if (patch.isActive !== undefined && patch.isActive !== current.isActive) set.isActive = patch.isActive;
  if (patch.scopes !== undefined) {
    const scopes = KEY_SCOPES.filter((scope) => patch.scopes?.includes(scope));
    if (scopes.join(",") !== [...current.scopes].sort().join(",")) set.scopes = scopes;
  }
  if (Object.keys(set).length === 0) return current;
  set.updatedAt = new Date();
  set.updatedBy = staffId;
  return keys.findOneAndUpdate({ _id: id }, { $set: set }, { returnDocument: "after" });
}

export async function deleteApiKey(id: string): Promise<ApiKeyDoc | null> {
  return (await collection("apiKeys")).findOneAndDelete({ _id: id });
}

// Stamps the last use of a key (the panel shows when and from where the
// accounting system last called).
export async function touchApiKey(id: string, ip: string | null): Promise<void> {
  await (await collection("apiKeys")).updateOne({ _id: id }, { $set: { lastUsedAt: new Date(), lastUsedIp: ip } });
}

export async function countApiKeys(now: Date = new Date()): Promise<{ active: number; total: number }> {
  const keys = await collection("apiKeys");
  const [active, total] = await Promise.all([
    keys.countDocuments({ isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }),
    keys.countDocuments({}),
  ]);
  return { active, total };
}
