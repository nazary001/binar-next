import "server-only";
import { randomInt } from "node:crypto";
import type { CompanyData } from "@/components/auth/data";
import { collection, type ClientDoc } from "../db/collections";
import { newId } from "../ids";

// Partner companies (holdings). A B2B user belongs to exactly one through
// `users.clientId`; the company card of the account (name, EDRPOU, region,
// city) is read from here and written by PATCH /api/account { company }.
// Package F adds the cabinet-side edits (invitation token, ...).

export async function findClient(clientId: string): Promise<ClientDoc | null> {
  const clients = await collection("clients");
  return clients.findOne({ _id: clientId });
}

// Writes the given company card fields (already trimmed and bounded by the
// route's schema).
export async function patchClient(clientId: string, patch: Partial<CompanyData>): Promise<void> {
  const set: Record<string, string | Date> = {};
  for (const field of ["name", "edrpou", "region", "city"] as const) {
    const value = patch[field];
    if (value !== undefined) set[field] = value;
  }
  if (Object.keys(set).length === 0) return;
  set.updatedAt = new Date();
  const clients = await collection("clients");
  await clients.updateOne({ _id: clientId }, { $set: set });
}

// Six lower-case letters / digits, the shape of the profile page's
// invitation token ("a8f3k2").
export function newInviteToken(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 6; i++) token += alphabet[randomInt(alphabet.length)];
  return token;
}

export type NewClient = CompanyData & { discountPercent: number };

// A new partner company (npm run user:create, later the CRM import).
export async function createClient(input: NewClient): Promise<ClientDoc> {
  const now = new Date();
  const doc: ClientDoc = {
    _id: newId("client"),
    name: input.name,
    edrpou: input.edrpou,
    region: input.region,
    city: input.city,
    inviteToken: newInviteToken(),
    discountPercent: input.discountPercent,
    creditLimits: [],
    demoToday: null,
    createdAt: now,
    updatedAt: now,
  };
  const clients = await collection("clients");
  await clients.insertOne(doc);
  return doc;
}
