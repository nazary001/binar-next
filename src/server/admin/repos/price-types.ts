import "server-only";
import { MongoServerError } from "mongodb";
import { z } from "zod";
import {
  PRICE_TYPE_LIMITS,
  type PriceTypeDto,
  type PriceTypeRole,
  type PriceTypeUsage,
} from "@/components/admin/catalog/types";
import { collection, type PriceTypeDoc } from "../../db/collections";
import { HttpError } from "../../http";
import { newId } from "../../ids";
import { zRequiredText } from "../../validate";
import { UK_COLLATION, contains, escapeRegex, listQuery, paginate, type Page } from "../list";

// Price types of the ERP ("Роздрібна", "Оптова") and what the site uses
// them for. At most one type holds each role ("base" = what guests see,
// "individual" = the partners' list price before the contract discount):
// giving a role to one type takes it from the type that had it. The role is
// the only place that says which type guests see and which one partner
// prices start from (the shop settings hold no such choice).
// A type cannot be removed while a buyer group or a partner contract
// points at it; the prices products carry for it go with it.

const zErpCode = z
  .string()
  .trim()
  .max(PRICE_TYPE_LIMITS.externalId)
  .nullable()
  .transform((value) => (value ? value : null));

const Fields = z.object({
  name: zRequiredText(PRICE_TYPE_LIMITS.name),
  externalId: zErpCode,
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, { message: "Код валюти з трьох латинських літер, наприклад UAH" }),
  vatIncluded: z.boolean(),
  role: z.enum(["base", "individual"]).nullable(),
});

export const PriceTypeCreateSchema = Fields.partial().extend({ name: zRequiredText(PRICE_TYPE_LIMITS.name) }).strict();
export const PriceTypePatchSchema = Fields.partial().strict();

export type PriceTypeCreate = z.infer<typeof PriceTypeCreateSchema>;
export type PriceTypePatch = z.infer<typeof PriceTypePatchSchema>;

type RoleHolder = { id: string; name: string } | null;

// Which products carry a price of the type. Ids of price types are
// newId() values or validated route params (no dots, no "$"), so they are
// safe inside a field path.
function priceField(id: string): string {
  return `prices.${id}`;
}

async function usageOf(id: string): Promise<PriceTypeUsage> {
  const [groups, contracts] = await Promise.all([
    collection("customerGroups").then((col) =>
      col.find({ priceTypeId: id }, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    ),
    collection("counterparties").then((col) => col.countDocuments({ "contracts.priceTypeId": id })),
  ]);
  return { groups: groups.map((group) => ({ id: group._id, name: group.name })), contracts };
}

async function toDto(doc: PriceTypeDoc): Promise<PriceTypeDto> {
  const [productsCount, usedBy] = await Promise.all([
    collection("products").then((col) => col.countDocuments({ [priceField(doc._id)]: { $exists: true } })),
    usageOf(doc._id),
  ]);
  return {
    id: doc._id,
    name: doc.name,
    externalId: doc.externalId ?? null,
    currency: doc.currency || "UAH",
    vatIncluded: doc.vatIncluded !== false,
    role: doc.role === "base" || doc.role === "individual" ? doc.role : null,
    productsCount,
    usedBy,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  };
}

export async function listPriceTypes(url: URL): Promise<Page<PriceTypeDto>> {
  const query = listQuery(url, {
    sortable: ["name", "createdAt", "updatedAt"],
    defaultSort: "name",
    defaultLimit: 100,
    maxLimit: 200,
  });
  const filter = query.q ? { $or: [{ name: contains(query.q) }, { externalId: contains(query.q) }] } : {};
  // Names sort the Ukrainian way ("Оптова" before "Роздрібна", case ignored).
  const byName = query.sortKey.replace(/^-/, "") === "name";
  const page = await paginate(await collection("priceTypes"), filter, query, byName ? { collation: UK_COLLATION } : {});
  return { ...page, items: await Promise.all(page.items.map(toDto)) };
}

export async function getPriceType(id: string): Promise<PriceTypeDto | null> {
  const doc = await (await collection("priceTypes")).findOne({ _id: id });
  return doc ? toDto(doc) : null;
}

// 409 "exists" when another type already has the name (case-insensitive)
// or the ERP code.
async function assertUnique(selfId: string | null, name: string | undefined, externalId: string | null | undefined) {
  const types = await collection("priceTypes");
  const others = selfId ? { _id: { $ne: selfId } } : {};
  const fields: Record<string, string> = {};
  if (name !== undefined) {
    const clash = await types.findOne({ ...others, name: new RegExp(`^${escapeRegex(name)}$`, "i") });
    if (clash) fields.name = "Тип цін із такою назвою вже є";
  }
  if (externalId) {
    const clash = await types.findOne({ ...others, externalId });
    if (clash) fields.externalId = `Цей код BAS уже має тип «${clash.name}»`;
  }
  if (Object.keys(fields).length) throw new HttpError(409, "exists", { fields });
}

function duplicateError(error: unknown): never {
  if (error instanceof MongoServerError && error.code === 11000) {
    throw new HttpError(409, "exists", { fields: { externalId: "Цей код BAS уже має інший тип цін" } });
  }
  throw error;
}

// Takes `role` from every type but `selfId`; answers the one that had it.
async function takeRole(role: PriceTypeRole, selfId: string): Promise<RoleHolder> {
  const types = await collection("priceTypes");
  const holder = await types.findOne({ role, _id: { $ne: selfId } }, { projection: { name: 1 } });
  if (!holder) return null;
  await types.updateMany({ role, _id: { $ne: selfId } }, { $set: { role: null, updatedAt: new Date() } });
  return { id: holder._id, name: holder.name };
}

export async function createPriceType(input: PriceTypeCreate): Promise<{ doc: PriceTypeDoc; roleTakenFrom: RoleHolder }> {
  await assertUnique(null, input.name, input.externalId);
  const now = new Date();
  const doc: PriceTypeDoc = {
    _id: newId("pt"),
    name: input.name,
    externalId: input.externalId ?? null,
    currency: input.currency ?? "UAH",
    vatIncluded: input.vatIncluded ?? true,
    role: input.role ?? null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await (await collection("priceTypes")).insertOne(doc);
  } catch (error) {
    duplicateError(error);
  }
  // Only after the new type exists, so a refused insert takes nothing away.
  const roleTakenFrom = doc.role ? await takeRole(doc.role, doc._id) : null;
  return { doc, roleTakenFrom };
}

export async function patchPriceType(
  id: string,
  input: PriceTypePatch,
): Promise<{ before: PriceTypeDoc; doc: PriceTypeDoc; changed: string[]; roleTakenFrom: RoleHolder }> {
  const types = await collection("priceTypes");
  const before = await types.findOne({ _id: id });
  if (!before) throw new HttpError(404, "not-found");
  const set: Partial<PriceTypeDoc> = {};
  const changed: string[] = [];
  const keys = ["name", "externalId", "currency", "vatIncluded", "role"] as const;
  for (const key of keys) {
    const value = input[key];
    if (value === undefined || value === (before[key] ?? null)) continue;
    changed.push(key);
    (set as Record<string, unknown>)[key] = value;
  }
  if (changed.length === 0) return { before, doc: before, changed, roleTakenFrom: null };
  await assertUnique(id, set.name, set.externalId);
  let doc: PriceTypeDoc | null = null;
  try {
    doc = await types.findOneAndUpdate({ _id: id }, { $set: { ...set, updatedAt: new Date() } }, { returnDocument: "after" });
  } catch (error) {
    duplicateError(error);
  }
  if (!doc) throw new HttpError(404, "not-found");
  const roleTakenFrom = set.role ? await takeRole(set.role, id) : null;
  return { before, doc, changed, roleTakenFrom };
}

export async function deletePriceType(id: string): Promise<{ doc: PriceTypeDoc; pricesRemoved: number }> {
  const types = await collection("priceTypes");
  const doc = await types.findOne({ _id: id });
  if (!doc) throw new HttpError(404, "not-found");
  const usedBy = await usageOf(id);
  if (usedBy.groups.length || usedBy.contracts) throw new HttpError(409, "in-use", { usedBy });
  await types.deleteOne({ _id: id });
  // A price keyed by a type that no longer exists can never be read again
  // (ids are never reused).
  const products = await collection("products");
  const result = await products.updateMany(
    { [priceField(id)]: { $exists: true } },
    { $unset: { [priceField(id)]: "" }, $set: { updatedAt: new Date() } },
  );
  return { doc, pricesRemoved: result.modifiedCount };
}
