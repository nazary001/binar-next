import "server-only";
import type { Filter } from "mongodb";
import { LEAD_KIND_LABELS, LEAD_OPEN_PARAM, LEAD_STATUS_LABELS, type LeadStatus } from "@/components/admin/leads/types";
import { formatDate, formatMoney } from "@/components/admin/lib/format";
import type { Permission } from "@/components/admin/lib/permissions";
import {
  SEARCH_GROUPS,
  SEARCH_GROUP_LIMIT,
  SEARCH_MIN_LENGTH,
  type SearchGroup,
  type SearchGroupType,
  type SearchItem,
} from "@/components/admin/search/types";
import { RETURN_STATUS, statusLabel } from "@/components/admin/ui/status";
import { ORDER_STATUS_META, type OrderStatusKey } from "@/components/platform/ui/OrderStatusBadge";
import { collection, type BlogPostDoc, type ClientDoc, type OrderDoc, type ProductDoc, type UserDoc } from "../../db/collections";
import { contains, startsWith } from "../list";
import { prefixRange } from "./journal";

// The panel-wide search of the command palette. It runs on every
// keystroke, so every group is one or two small queries with a projection,
// a limit and a time cap, all groups run in parallel, and a group that
// fails (or runs out of time) is dropped instead of failing the answer.
// Search text reaches MongoDB only through contains() / startsWith()
// (escaped) or as a plain string in a range (prefixRange).

const LIMIT = SEARCH_GROUP_LIMIT;
// A query that takes longer than this is abandoned by the server.
const MAX_MS = 1500;

// The check of the caller's role, injected so the function can be run
// (and tested) without a request: (p) => can(staff, p).
export type CanView = (permission: Permission) => boolean;

const GROUP_PERMISSION: Record<SearchGroupType, Permission> = {
  orders: "orders.view",
  returns: "returns.view",
  customers: "customers.view",
  companies: "customers.view",
  products: "catalog.view",
  posts: "content.view",
  leads: "leads.view",
  staff: "staff.manage",
};

function joined(parts: (string | null | undefined | false)[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part.trim() !== "").join(", ");
}

function hrefOf(base: string, id: string): string {
  return `${base}/${encodeURIComponent(id)}`;
}

// The text typed for a number: "№ 48291064", "#BN-100122" -> "48291064", "BN-100122".
function numberText(q: string): string {
  return q.replace(/^[№#\s]+/, "").replace(/\s+/g, "");
}

// --- orders -----------------------------------------------------------------

// The _id prefixes a typed number may mean. B2B numbers are 8 digits,
// retail ones "BN-" and 6 digits, so plain digits are tried both ways.
function orderIdPrefixes(q: string): string[] {
  const text = numberText(q);
  if (/^\d+$/.test(text)) return [text, `BN-${text}`];
  const retail = /^bn-?(\d*)$/i.exec(text);
  if (retail) return [`BN-${retail[1]}`];
  return /^[A-Za-z0-9-]+$/.test(text) ? [text] : [];
}

const ORDER_FIELDS = {
  _id: 1,
  number: 1,
  date: 1,
  status: 1,
  total: 1,
  channel: 1,
  counterparty: 1,
  "checkout.name": 1,
  "checkout.company": 1,
} as const;

function orderItem(doc: OrderDoc): SearchItem {
  const who = doc.channel === "b2b" ? doc.counterparty : doc.checkout?.company || doc.checkout?.name;
  const status = ORDER_STATUS_META[doc.status as OrderStatusKey]?.label ?? doc.status;
  return {
    id: doc._id,
    title: `№${doc.number}${who ? ` ${who}` : ""}`,
    subtitle: joined([formatDate(doc.date), status, formatMoney(doc.total)]),
    href: hrefOf("/admin/orders", doc._id),
  };
}

async function searchOrders(q: string): Promise<SearchItem[]> {
  const orders = await collection("orders");
  const prefixes = orderIdPrefixes(q);
  const text = contains(q);
  const byName: Filter<OrderDoc> = {
    $or: [{ counterparty: text }, { "checkout.name": text }, { "checkout.company": text }],
  } as Filter<OrderDoc>;
  const [byNumber, named] = await Promise.all([
    // An anchored range on _id (the number): served by the _id index.
    prefixes.length
      ? orders
          .find({ $or: prefixes.map((prefix) => ({ _id: prefixRange(prefix) })) }, { projection: ORDER_FIELDS })
          .sort({ _id: -1 })
          .limit(LIMIT)
          .maxTimeMS(MAX_MS)
          .toArray()
      : Promise.resolve([] as OrderDoc[]),
    orders.find(byName, { projection: ORDER_FIELDS }).sort({ createdAt: -1, _id: -1 }).limit(LIMIT).maxTimeMS(MAX_MS).toArray(),
  ]);
  // Number matches first; an order found both ways is listed once.
  const seen = new Set<string>();
  const items: SearchItem[] = [];
  for (const doc of [...byNumber, ...named]) {
    if (seen.has(doc._id) || items.length >= LIMIT) continue;
    seen.add(doc._id);
    items.push(orderItem(doc as OrderDoc));
  }
  return items;
}

// --- returns ----------------------------------------------------------------

async function searchReturns(q: string): Promise<SearchItem[]> {
  const text = numberText(q);
  if (!/^[A-Za-z0-9-]+$/.test(text)) return [];
  const docs = await (await collection("returns"))
    .find({ _id: prefixRange(text) }, { projection: { _id: 1, orderId: 1, date: 1, status: 1 } })
    .sort({ _id: -1 })
    .limit(LIMIT)
    .maxTimeMS(MAX_MS)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    title: `Повернення №${doc._id}`,
    subtitle: joined([
      formatDate(doc.date),
      statusLabel(RETURN_STATUS, doc.status),
      `замовлення №${doc.orderId}`,
    ]),
    href: hrefOf("/admin/returns", doc._id),
  }));
}

// --- customers and companies ------------------------------------------------

async function searchCustomers(q: string): Promise<SearchItem[]> {
  const text = contains(q);
  const filter: Filter<UserDoc> = {
    $or: [{ "person.fullName": text }, { login: text }, { "person.email": text }, { phone: text }],
  };
  const docs = await (await collection("users"))
    .find(filter, { projection: { _id: 1, type: 1, login: 1, isActive: 1, "person.fullName": 1, "person.email": 1 } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(LIMIT)
    .maxTimeMS(MAX_MS)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    title: doc.person?.fullName?.trim() || doc.login || doc._id,
    subtitle: joined([
      doc.type === "b2b" ? "B2B" : "B2C",
      doc.login,
      doc.person?.email && doc.person.email !== doc.login ? doc.person.email : null,
      doc.isActive === false ? "заблоковано" : null,
    ]),
    href: hrefOf("/admin/customers", doc._id),
  }));
}

async function searchCompanies(q: string): Promise<SearchItem[]> {
  const filter: Filter<ClientDoc> = { $or: [{ name: contains(q) }, { edrpou: startsWith(numberText(q) || q) }] };
  const docs = await (await collection("clients"))
    .find(filter, { projection: { _id: 1, name: 1, edrpou: 1, city: 1 } })
    .sort({ name: 1, _id: 1 })
    .limit(LIMIT)
    .maxTimeMS(MAX_MS)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    title: doc.name || doc._id,
    subtitle: joined([doc.edrpou ? `ЄДРПОУ ${doc.edrpou}` : null, doc.city]),
    href: hrefOf("/admin/companies", doc._id),
  }));
}

// --- catalog and content ----------------------------------------------------

async function searchProducts(q: string): Promise<SearchItem[]> {
  const filter: Filter<ProductDoc> = {
    $or: [{ title: contains(q) }, { "details.sku": contains(q) }, { _id: startsWith(q) }],
  } as Filter<ProductDoc>;
  const docs = await (await collection("products"))
    .find(filter, { projection: { _id: 1, title: 1, price: 1, listed: 1, archivedAt: 1, "details.sku": 1 } })
    .sort({ sort: 1, _id: 1 })
    .limit(LIMIT)
    .maxTimeMS(MAX_MS)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    title: doc.title,
    subtitle: joined([
      doc.details?.sku,
      formatMoney(doc.price),
      doc.archivedAt ? "в архіві" : doc.listed === false ? "не в каталозі" : null,
    ]),
    href: hrefOf("/admin/products", doc._id),
  }));
}

const POST_STATUS_LABELS: Record<NonNullable<BlogPostDoc["status"]>, string> = {
  draft: "Чернетка",
  published: "Опубліковано",
  scheduled: "Заплановано",
};

async function searchPosts(q: string): Promise<SearchItem[]> {
  const filter: Filter<BlogPostDoc> = { $or: [{ title: contains(q) }, { _id: contains(q) }] } as Filter<BlogPostDoc>;
  const docs = await (await collection("blogPosts"))
    .find(filter, { projection: { _id: 1, title: 1, categoryLabel: 1, status: 1 } })
    .sort({ sort: 1, _id: 1 })
    .limit(LIMIT)
    .maxTimeMS(MAX_MS)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    title: doc.title,
    // A post without a status is a published one (the seed).
    subtitle: joined([doc.categoryLabel, POST_STATUS_LABELS[doc.status ?? "published"]]),
    href: hrefOf("/admin/blog", doc._id),
  }));
}

// --- inbox and staff --------------------------------------------------------

async function searchLeads(q: string): Promise<SearchItem[]> {
  const text = contains(q);
  const docs = await (await collection("leads"))
    .find(
      { $or: [{ "contact.name": text }, { "contact.email": text }, { "contact.phone": text }, { "contact.company": text }] },
      { projection: { _id: 1, kind: 1, status: 1, contact: 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(LIMIT)
    .maxTimeMS(MAX_MS)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    title: doc.contact?.name || doc.contact?.email || doc.contact?.phone || doc._id,
    subtitle: joined([
      LEAD_KIND_LABELS[doc.kind] ?? doc.kind,
      formatDate(doc.createdAt),
      LEAD_STATUS_LABELS[doc.status as LeadStatus] ?? doc.status,
    ]),
    // Leads have no page of their own: the inbox opens one in its drawer.
    href: `/admin/leads?${LEAD_OPEN_PARAM}=${encodeURIComponent(doc._id)}`,
  }));
}

async function searchStaff(q: string): Promise<SearchItem[]> {
  const text = contains(q);
  // The projection keeps the password hash out of the process memory of
  // this request entirely.
  const docs = await (await collection("staff"))
    .find({ $or: [{ name: text }, { email: text }] }, { projection: { _id: 1, name: 1, email: 1, isActive: 1 } })
    .sort({ name: 1, _id: 1 })
    .limit(LIMIT)
    .maxTimeMS(MAX_MS)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id,
    title: doc.name || doc.email,
    subtitle: joined([doc.email, doc.isActive ? null : "заблоковано"]),
    // The staff screen opens a person in its drawer from ?id=.
    href: `/admin/staff?id=${encodeURIComponent(doc._id)}`,
  }));
}

const SEARCHERS: Record<SearchGroupType, (q: string) => Promise<SearchItem[]>> = {
  orders: searchOrders,
  returns: searchReturns,
  customers: searchCustomers,
  companies: searchCompanies,
  products: searchProducts,
  posts: searchPosts,
  leads: searchLeads,
  staff: searchStaff,
};

// The groups `canView` allows, in the palette's order, each with at most
// SEARCH_GROUP_LIMIT items; groups without a match are left out. `q` is
// expected trimmed and bounded (the route cuts it).
export async function searchPanel(q: string, canView: CanView): Promise<SearchGroup[]> {
  if (q.length < SEARCH_MIN_LENGTH) return [];
  const allowed = SEARCH_GROUPS.filter((group) => canView(GROUP_PERMISSION[group.type]));
  const settled = await Promise.allSettled(allowed.map((group) => SEARCHERS[group.type](q)));
  const groups: SearchGroup[] = [];
  settled.forEach((result, index) => {
    const group = allowed[index];
    if (result.status === "rejected") {
      console.error(`[admin] search group ${group.type} failed:`, result.reason);
      return;
    }
    if (result.value.length > 0) groups.push({ type: group.type, label: group.label, items: result.value });
  });
  return groups;
}

// For the checks: which permission opens which group.
export function searchGroupPermission(type: SearchGroupType): Permission {
  return GROUP_PERMISSION[type];
}
