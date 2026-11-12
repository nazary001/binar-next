import "server-only";
import type { Filter } from "mongodb";
import { z } from "zod";
import type { CreateGroupBody, CustomerGroupDto, PatchGroupBody } from "@/components/admin/groups/types";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  REGISTERED_GROUP,
  SYSTEM_GROUP_IDS,
} from "@/components/admin/groups/types";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS } from "@/components/checkout/data";
import { collection, type CustomerGroupDoc } from "@/server/db/collections";
import { HttpError } from "@/server/http";
import { newId } from "@/server/ids";
import { zId, zRequiredText, zText } from "@/server/validate";
import { contains, escapeRegex, paginate, UK_COLLATION, type ListQuery, type Page } from "../list";
import { assertFields, iso, text } from "./customers";

// Buyer groups (`customer_groups`): what a group of companies sees (price
// type, stock figures, payment and delivery methods, hidden categories).
// The two system groups ("guests", "registered", written by db:setup) can
// be edited but keep their names and cannot be removed. A company points
// at its group through clients.groupId; none means "registered".
//
// Nothing on the storefront reads the groups yet (the price type, the
// methods and the hidden categories are stored for the exchange and the
// checkout to come), so a change here revalidates no public cache.

// The values a group may name, from the vocabularies of the site itself.
export const PAYMENT_METHOD_VALUES = [...PAYMENT_OPTIONS] as [string, ...string[]];
export const DELIVERY_METHOD_VALUES = DELIVERY_OPTIONS.map((option) => option.value) as [string, ...string[]];
export const CATEGORY_KEYS: ReadonlySet<string> = new Set(
  CATALOG_DIRECTIONS.flatMap((direction) => direction.carousel.map((card) => `${direction.slug}/${card.slug}`)),
);

// The fields of a group in a request (the routes wrap them in strict
// objects; the change route makes every one optional). A method or a
// category key the site does not know is a plain 400.
export const groupShape = {
  name: zRequiredText(GROUP_NAME_MAX),
  description: zText(GROUP_DESCRIPTION_MAX),
  priceTypeId: zId.nullable(),
  showStock: z.boolean(),
  paymentMethods: z.array(z.enum(PAYMENT_METHOD_VALUES)).max(20),
  deliveryMethods: z.array(z.enum(DELIVERY_METHOD_VALUES)).max(20),
  hiddenCategories: z
    .array(
      z
        .string()
        .max(120)
        .refine((key) => CATEGORY_KEYS.has(key)),
    )
    .max(200),
};

function isSystem(id: string): boolean {
  return (SYSTEM_GROUP_IDS as readonly string[]).includes(id);
}

function unique(values: string[] | undefined): string[] | undefined {
  return values === undefined ? undefined : [...new Set(values)];
}

// Companies per group; the companies without a group count for
// "registered".
async function companyCounts(): Promise<Map<string, number>> {
  const rows = await (await collection("clients"))
    .aggregate<{ _id: string; n: number }>([
      { $group: { _id: { $ifNull: ["$groupId", REGISTERED_GROUP] }, n: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((row) => [row._id, row.n]));
}

async function priceTypeNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((id): id is string => typeof id === "string"))];
  if (wanted.length === 0) return new Map();
  const docs = await (await collection("priceTypes")).find({ _id: { $in: wanted } }, { projection: { name: 1 } }).toArray();
  return new Map(docs.map((doc) => [doc._id, text(doc.name)]));
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toDto(doc: CustomerGroupDoc, counts: Map<string, number>, priceTypes: Map<string, string>): CustomerGroupDto {
  const priceTypeId = typeof doc.priceTypeId === "string" ? doc.priceTypeId : null;
  return {
    id: doc._id,
    name: text(doc.name),
    description: text(doc.description),
    priceTypeId,
    priceTypeName: priceTypeId ? (priceTypes.get(priceTypeId) ?? null) : null,
    showStock: doc.showStock === true,
    paymentMethods: strings(doc.paymentMethods),
    deliveryMethods: strings(doc.deliveryMethods),
    hiddenCategories: strings(doc.hiddenCategories),
    system: doc.system === true || isSystem(doc._id),
    companiesCount: counts.get(doc._id) ?? 0,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
}

export async function groupDto(doc: CustomerGroupDoc): Promise<CustomerGroupDto> {
  const [counts, priceTypes] = await Promise.all([companyCounts(), priceTypeNames([doc.priceTypeId])]);
  return toDto(doc, counts, priceTypes);
}

export async function listGroups(query: ListQuery): Promise<Page<CustomerGroupDto>> {
  const filter: Filter<CustomerGroupDoc> = query.q ? { name: contains(query.q) } : {};
  const groups = await collection("customerGroups");
  // A list by name reads in the Ukrainian alphabet order (case ignored).
  const byName = query.sortKey.replace(/^-/, "") === "name";
  const page = await paginate(groups, filter, query, byName ? { collation: UK_COLLATION } : {});
  const [counts, priceTypes] = await Promise.all([
    companyCounts(),
    priceTypeNames(page.items.map((group) => group.priceTypeId)),
  ]);
  return { ...page, items: page.items.map((group) => toDto(group, counts, priceTypes)) };
}

export async function requireGroup(id: string): Promise<CustomerGroupDoc> {
  const group = await (await collection("customerGroups")).findOne({ _id: id });
  if (!group) throw new HttpError(404, "not-found");
  return group;
}

// Two groups never share a name (case aside): a select of groups must be
// readable.
async function nameTaken(name: string, exceptId?: string): Promise<boolean> {
  const pattern = new RegExp(`^${escapeRegex(name)}$`, "i");
  const filter: Filter<CustomerGroupDoc> = exceptId ? { name: pattern, _id: { $ne: exceptId } } : { name: pattern };
  return (await (await collection("customerGroups")).findOne(filter, { projection: { _id: 1 } })) !== null;
}

async function checkPriceType(priceTypeId: string | null | undefined): Promise<void> {
  if (typeof priceTypeId !== "string") return;
  const found = await (await collection("priceTypes")).findOne({ _id: priceTypeId }, { projection: { _id: 1 } });
  if (!found) assertFields({ priceTypeId: "not-found" });
}

export async function createGroup(input: CreateGroupBody): Promise<CustomerGroupDoc> {
  const name = input.name.trim();
  await checkPriceType(input.priceTypeId);
  if (await nameTaken(name)) throw new HttpError(409, "exists");
  const now = new Date();
  const doc: CustomerGroupDoc = {
    _id: newId("grp"),
    name,
    description: (input.description ?? "").trim(),
    priceTypeId: input.priceTypeId ?? null,
    showStock: input.showStock ?? false,
    paymentMethods: unique(input.paymentMethods) ?? [],
    deliveryMethods: unique(input.deliveryMethods) ?? [],
    hiddenCategories: unique(input.hiddenCategories) ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await (await collection("customerGroups")).insertOne(doc);
  return doc;
}

export type GroupChange = { before: CustomerGroupDoc; after: CustomerGroupDoc; changed: string[] };

export async function updateGroup(id: string, patch: PatchGroupBody): Promise<GroupChange> {
  const groups = await collection("customerGroups");
  const before = await requireGroup(id);
  const name = patch.name?.trim();
  if (name !== undefined && name !== before.name) {
    if (isSystem(id) || before.system === true) throw new HttpError(409, "system");
    if (await nameTaken(name, id)) throw new HttpError(409, "exists");
  }
  await checkPriceType(patch.priceTypeId);

  const set: Record<string, unknown> = {};
  const changed: string[] = [];
  const put = (key: keyof CustomerGroupDoc, next: unknown) => {
    if (next === undefined) return;
    if (JSON.stringify(before[key] ?? null) === JSON.stringify(next)) return;
    set[key] = next;
    changed.push(key);
  };
  put("name", name);
  put("description", patch.description?.trim());
  put("priceTypeId", patch.priceTypeId);
  put("showStock", patch.showStock);
  put("paymentMethods", unique(patch.paymentMethods));
  put("deliveryMethods", unique(patch.deliveryMethods));
  put("hiddenCategories", unique(patch.hiddenCategories));
  if (changed.length === 0) return { before, after: before, changed };

  const after = await groups.findOneAndUpdate(
    { _id: id },
    { $set: { ...set, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!after) throw new HttpError(404, "not-found");
  return { before, after, changed };
}

// A group with companies stays: they would silently fall back to the
// default group. The system groups always stay.
export async function deleteGroup(id: string): Promise<CustomerGroupDoc> {
  const group = await requireGroup(id);
  if (isSystem(id) || group.system === true) throw new HttpError(409, "system");
  const companies = await (await collection("clients")).countDocuments({ groupId: id });
  if (companies > 0) throw new HttpError(409, "in-use", { companies });
  const removed = await (await collection("customerGroups")).deleteOne({ _id: id, system: { $ne: true } });
  if (removed.deletedCount === 0) throw new HttpError(404, "not-found");
  return group;
}
