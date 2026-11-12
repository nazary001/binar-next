import "server-only";
import type { Collection, Filter } from "mongodb";
import { parseMediaRef } from "@/components/admin/media/types";
import type { CartEntry, CartLine } from "@/components/cart/data";
import { cartSubtotal, checkStock } from "@/components/cart/data";
import type { Product } from "@/components/catalog/data";
import { DELIVERY_OPTIONS, PICKUP_NOTICE, type CheckoutValues } from "@/components/checkout/data";
import {
  cancelAsksSolution,
  dayDate,
  orderAction,
  orderDocumentHref,
  returnableItems,
  type CancelRecord,
  type Order,
  type OrderDocument,
  type OrderItem,
  type ReturnRequest,
} from "@/components/platform/orders/data";
import type { OrdersPayload } from "@/lib/session/types";
import {
  collection,
  type B2bOrderDoc,
  type ClientDoc,
  type OrderDocumentDoc,
  type ProductDoc,
  type RetailOrderDoc,
  type RetailOrderItem,
  type ReturnDoc,
  type UserDoc,
} from "../db/collections";
import { lineSum, sum } from "../money";
import { kyivToday } from "../time";
import { saveCartLines } from "./carts";
import { partnerPrices } from "./catalog";
import { isDuplicateKey } from "./users";

// Orders of the B2B cabinet (package E): the session payload of a partner
// company, the cancel mutation, the document links, and the placement of
// an order at checkout (guests, retail customers and partners).
//
// Every function takes values that already went through a zod schema and
// a clientId that comes from the session, so no raw request value reaches
// a filter and every cabinet query is scoped to the caller's company.

// --- collections -----------------------------------------------------------

// The `orders` collection holds both channels; each side works with a
// handle typed for its own documents and always filters by `channel`.
export async function b2bOrders(): Promise<Collection<B2bOrderDoc>> {
  return (await collection("orders")) as unknown as Collection<B2bOrderDoc>;
}

async function retailOrders(): Promise<Collection<RetailOrderDoc>> {
  return (await collection("orders")) as unknown as Collection<RetailOrderDoc>;
}

// --- the company's clock -----------------------------------------------------

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// The day the cabinet of this company treats as today: the fixed demo
// date of a seeded company (the date its orders were built around), the
// Kyiv date for everyone else.
export function companyToday(client: Pick<ClientDoc, "demoToday"> | null): string {
  const demo = client?.demoToday;
  return typeof demo === "string" && ISO_DAY.test(demo) && !Number.isNaN(Date.parse(demo)) ? demo : kyivToday();
}

export async function todayOf(clientId: string): Promise<string> {
  const clients = await collection("clients");
  return companyToday(await clients.findOne({ _id: clientId }, { projection: { demoToday: 1 } }));
}

// "YYYY-MM-DD" + n days.
function addDays(isoDate: string, days: number): string {
  return new Date(dayDate(isoDate).getTime() + days * 86400000).toISOString().slice(0, 10);
}

// --- DTOs --------------------------------------------------------------------

function toDocumentDto(orderId: string, doc: OrderDocumentDoc): OrderDocument {
  return {
    id: doc.id,
    title: doc.title,
    date: doc.date,
    sizeMb: doc.sizeMb,
    format: doc.format,
    ready: doc.ready,
    ...(doc.pendingNote !== undefined ? { pendingNote: doc.pendingNote } : {}),
    href: orderDocumentHref(orderId, doc.id),
  };
}

// Stored order -> the cabinet's Order (field order as the UI objects
// always had it). The file locations, the cancel record, the checkout
// values and the technical fields stay on the server.
export function toOrderDto(doc: B2bOrderDoc): Order {
  return {
    id: doc._id,
    number: doc.number,
    date: doc.date,
    total: doc.total,
    counterparty: doc.counterparty,
    status: doc.status,
    payment: doc.payment,
    createdBy: doc.createdBy,
    paymentType: doc.paymentType,
    paymentDue: doc.paymentDue,
    delivery: doc.delivery,
    items: doc.items,
    documents: (doc.documents ?? []).map((d) => toDocumentDto(doc._id, d)),
  };
}

export function toReturnDto(doc: ReturnDoc): ReturnRequest {
  return {
    id: doc._id,
    orderId: doc.orderId,
    date: doc.date,
    status: doc.status,
    lines: doc.lines.map((line) => ({ itemId: line.itemId, qty: line.qty, reason: line.reason })),
    solution: doc.solution,
    delivery: doc.delivery,
  };
}

export function toCancelDto(record: CancelRecord): CancelRecord {
  return {
    reason: record.reason,
    at: record.at,
    ...(record.solution ? { solution: record.solution } : {}),
    ...(record.request ? { request: true } : {}),
  };
}

// The order list (newest first: date, then number) and the return
// requests (newest first: the latest request on top) of a company.
const ORDER_SORT = { date: -1, _id: -1 } as const;
const RETURN_SORT = { createdAt: -1, _id: -1 } as const;
const ORDER_PROJECTION = { checkout: 0, returnLock: 0 } as const;

// The session answer carries the company's orders whole (items and
// documents included) and the browser mirrors it in localStorage, so it is
// bounded: the newest SESSION_ORDERS_MAX orders and the returns that belong
// to them. Older history needs a paged endpoint (not built yet).
export const SESSION_ORDERS_MAX = 500;

export async function companyOrderDocs(clientId: string, limit = 0): Promise<B2bOrderDoc[]> {
  const orders = await b2bOrders();
  return orders
    .find({ clientId, channel: "b2b" }, { projection: ORDER_PROJECTION })
    .sort(ORDER_SORT)
    .limit(limit)
    .toArray();
}

export async function companyReturnDocs(clientId: string, orderId?: string): Promise<ReturnDoc[]> {
  const returns = await collection("returns");
  return returns
    .find(orderId === undefined ? { clientId } : { clientId, orderId })
    .sort(RETURN_SORT)
    .toArray();
}

function creditLimitsOf(client: ClientDoc | null): OrdersPayload["creditLimits"] {
  if (!client || !Array.isArray(client.creditLimits)) return [];
  return client.creditLimits.flatMap((row) =>
    row && typeof row.counterparty === "string" && typeof row.limit === "number" && Number.isFinite(row.limit)
      ? [{ counterparty: row.counterparty, limit: row.limit }]
      : [],
  );
}

// Everything the cabinet's orders area shows for this company, with every
// change already applied: an instantly cancelled order has status
// "cancelled", a pending cancel request is listed in cancelRequests, a
// withdrawn return has status "cancelled".
//
// `asOf` is taken before the reads: every change stored before that moment
// is in the payload. The answers of the three mutations carry the moment
// they were stored (`at`, mutationStamp), so the browser can tell a payload
// read before its own change (a slow GET /api/session) from a newer one.
export function mutationStamp(): number {
  return Date.now();
}

export async function ordersPayload(clientId: string): Promise<OrdersPayload | undefined> {
  const asOf = mutationStamp();
  const clients = await collection("clients");
  const [client, orderDocs, returnDocs] = await Promise.all([
    clients.findOne({ _id: clientId }),
    companyOrderDocs(clientId, SESSION_ORDERS_MAX),
    companyReturnDocs(clientId),
  ]);
  // A return is only shown next to its order.
  const listed = new Set(orderDocs.map((doc) => doc._id));
  const shownReturns = returnDocs.filter((doc) => listed.has(doc.orderId));
  const cancelRequests: Record<string, CancelRecord> = {};
  for (const doc of orderDocs) {
    if (doc.cancel?.request) cancelRequests[doc._id] = toCancelDto(doc.cancel);
  }
  return {
    today: companyToday(client),
    orders: orderDocs.map(toOrderDto),
    returns: shownReturns.map(toReturnDto),
    cancelRequests,
    creditLimits: creditLimitsOf(client),
    asOf,
  };
}

// --- cancel ------------------------------------------------------------------

export type CancelInput = { reason: string; solution?: string; request: boolean };

export type CancelOutcome =
  | { ok: true; order: Order; cancel: CancelRecord }
  | { ok: false; error: "not-found" | "state" | "solution" };

// "Скасувати замовлення" / "Запит на скасування": the rule of the details
// page (orderAction with the company's today) decides; `request` must be
// what the rule says for the order's status. An instant cancel sets status
// "cancelled", a request is recorded and keeps the status. The update is
// conditional on the status the rule saw, so a parallel duplicate finds
// the order changed and is refused.
export async function cancelOrder(clientId: string, orderId: string, input: CancelInput): Promise<CancelOutcome> {
  const orders = await b2bOrders();
  const doc = await orders.findOne({ _id: orderId, clientId, channel: "b2b" }, { projection: ORDER_PROJECTION });
  if (!doc) return { ok: false, error: "not-found" };

  const [today, returnDocs] = await Promise.all([todayOf(clientId), companyReturnDocs(clientId, orderId)]);
  const order = toOrderDto(doc);
  const action = orderAction(order, returnableItems(order, returnDocs.map(toReturnDto)), dayDate(today));
  if (action.kind !== "cancel" || action.request !== input.request) return { ok: false, error: "state" };
  if (input.request && doc.cancel?.request) return { ok: false, error: "state" };

  const asks = cancelAsksSolution(order);
  if (asks && !input.solution) return { ok: false, error: "solution" };
  const record: CancelRecord = {
    reason: input.reason,
    at: today,
    ...(asks && input.solution ? { solution: input.solution } : {}),
    ...(input.request ? { request: true } : {}),
  };

  const filter: Filter<B2bOrderDoc> = { _id: orderId, clientId, channel: "b2b", status: doc.status };
  if (input.request) filter["cancel.request"] = { $ne: true };
  const now = new Date();
  const updated = await orders.findOneAndUpdate(
    filter,
    { $set: input.request ? { cancel: record, updatedAt: now } : { cancel: record, status: "cancelled", updatedAt: now } },
    { returnDocument: "after", projection: ORDER_PROJECTION },
  );
  if (!updated) return { ok: false, error: "state" };
  return { ok: true, order: toOrderDto(updated), cancel: toCancelDto(record) };
}

// --- documents ---------------------------------------------------------------

// A stored file location the document routes may redirect to: a path on
// this site or an https URL. Anything else is a bad record (the route
// answers 404, never a redirect). A path is judged by where a browser
// resolves it, so "//host", "/\host" and similar, which browsers send to
// another host, are refused; the value must be visible ASCII, which a
// header carries unchanged. (The rule of the materials download route.)
const SITE = "http://site.invalid";
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;

export function fileLocation(path: string | null | undefined): string | null {
  if (typeof path !== "string" || !VISIBLE_ASCII.test(path)) return null;
  // A file of the media library ("media:<id>"): the routes stream it.
  if (parseMediaRef(path)) return path;
  let url: URL;
  try {
    url = new URL(path, SITE);
  } catch {
    return null;
  }
  if (path.startsWith("/")) return url.origin === SITE && !/^\/[/\\]/.test(path) ? path : null;
  return path.startsWith("https://") && url.protocol === "https:" && url.hostname ? path : null;
}

// Where the file of a ready document of this company's order is, or null
// (no such order for this company, no such document, not ready yet, or no
// usable location).
export async function orderDocumentLocation(clientId: string, orderId: string, docId: string): Promise<string | null> {
  const orders = await b2bOrders();
  const doc = await orders.findOne({ _id: orderId, clientId, channel: "b2b" }, { projection: { documents: 1 } });
  const file = doc?.documents?.find((d) => d.id === docId && d.ready);
  return file ? fileLocation(file.file) : null;
}

// --- placing an order (checkout) -------------------------------------------

// Who is ordering: a guest, a retail customer, or a partner company's
// buyer (priced with the company's partner prices, listed in its cabinet).
export type Buyer =
  | { kind: "guest" }
  | { kind: "customer"; user: UserDoc }
  | { kind: "partner"; user: UserDoc; clientId: string };

// The fields of a product the stock rule and the retail price read, as the
// database has them now. A refusal for stock or price carries them, so the
// browser can correct its copy of the catalog (which may be up to a cache
// period old) before it opens the stock flow or shows the new total.
export type StockState = Pick<Product, "id" | "price" | "oldPrice" | "available" | "preorder">;

export type PlaceOutcome =
  | { ok: true; number: string }
  | { ok: false; error: "product"; ids: string[] }
  | { ok: false; error: "stock" | "price"; ids: string[]; products: StockState[] };

type ProductRow = Pick<
  ProductDoc,
  "_id" | "title" | "image" | "volume" | "brand" | "subcategory" | "price" | "oldPrice" | "available" | "preorder"
> & { details?: { sku?: unknown } };

const PRODUCT_PROJECTION = {
  title: 1,
  image: 1,
  volume: 1,
  brand: 1,
  subcategory: 1,
  price: 1,
  oldPrice: 1,
  available: 1,
  preorder: 1,
  "details.sku": 1,
} as const;

const usablePrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

// The fields the shared stock rule (cart/data.ts checkStock) reads.
function stockProduct(row: ProductRow): Product {
  return {
    id: row._id,
    title: row.title,
    image: row.image,
    volume: row.volume,
    brand: row.brand,
    subcategory: row.subcategory,
    price: row.price,
    ...(row.oldPrice !== undefined && row.oldPrice !== null ? { oldPrice: row.oldPrice } : {}),
    available: row.available,
    ...(row.preorder ? { preorder: true } : {}),
  };
}

function stockState(product: Product): StockState {
  return {
    id: product.id,
    price: product.price,
    ...(product.oldPrice !== undefined ? { oldPrice: product.oldPrice } : {}),
    available: product.available,
    ...(product.preorder ? { preorder: true } : {}),
  };
}

const skuOf = (row: ProductRow): string => (typeof row.details?.sku === "string" ? row.details.sku : "");

// The next value of a named sequence. A sequence that does not exist yet
// starts above `floor()` (the highest number already in use).
async function nextSeq(name: string, floor: () => Promise<number>): Promise<number> {
  const counters = await collection("counters");
  const bumped = await counters.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { returnDocument: "after" });
  if (bumped) return bumped.seq;
  await counters.updateOne({ _id: name }, { $max: { seq: await floor() } }, { upsert: true });
  const first = await counters.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { returnDocument: "after" });
  if (!first) throw new Error(`counter ${name} vanished`);
  return first.seq;
}

// Partner order numbers continue the 8-digit sequence of the cabinet
// (the demo history is 48291037..48291064).
export const B2B_ORDER_FLOOR = 48291064;
const B2B_NUMBER = /^\d{8}$/;

export async function highestB2bNumber(): Promise<number> {
  const orders = await b2bOrders();
  const top = await orders
    .find({ channel: "b2b", _id: { $regex: /^\d{8}$/ } }, { projection: { _id: 1 } })
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  const value = top[0] && B2B_NUMBER.test(top[0]._id) ? Number(top[0]._id) : 0;
  return Math.max(B2B_ORDER_FLOOR, value);
}

// Retail numbers are "BN-" + six digits (more once a million is passed).
const RETAIL_FLOOR = 100000;

// Inserts `build(number)` under the next number of the sequence; a number
// that is somehow taken already is skipped.
async function insertNumbered<T extends { _id: string }>(
  target: Collection<T>,
  sequence: string,
  floor: () => Promise<number>,
  format: (seq: number) => string,
  build: (number: string) => T,
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const number = format(await nextSeq(sequence, floor));
    try {
      // The driver's OptionalUnlessRequiredId<T> does not see through a
      // generic T; the document is complete.
      await target.insertOne(build(number) as Parameters<Collection<T>["insertOne"]>[0]);
      return number;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }
  throw new Error(`no free number in sequence ${sequence}`);
}

// "Інформація про доставку" of a partner order placed at checkout.
function deliveryOf(values: CheckoutValues): Order["delivery"] {
  const method = DELIVERY_OPTIONS.find((o) => o.value === values.delivery)?.label ?? "";
  const ttn = "Ми надішлемо номер ТТН, щойно передамо замовлення перевізнику.";
  let note = "";
  if (values.delivery === "pickup") note = PICKUP_NOTICE;
  else if (values.delivery === "np-branch") note = `${values.branch}. ${ttn}`;
  else if (values.delivery === "np-locker") note = `${values.locker}. ${ttn}`;
  else if (values.delivery === "np-address") {
    const flat = values.flat ? `, кв. ${values.flat}` : "";
    note = `Адреса доставки: м. ${values.city}, ${values.street}, ${values.house}${flat}. Кур'єр зателефонує перед приїздом.`;
  }
  return { city: values.city, method, note };
}

// The counterparty a partner order is booked to: the name its credit line
// and the dashboard's select go by, so it never comes from free text. The
// company's own active counterparty whose code is the EDRPOU given for the
// invoice, else the company itself. The company name typed for the
// invoice stays in the stored checkout values only.
async function counterpartyOf(clientId: string, client: ClientDoc | null, values: CheckoutValues): Promise<string> {
  if (values.invoice && /^\d{8}$/.test(values.edrpou)) {
    const counterparties = await collection("counterparties");
    const match = await counterparties.findOne(
      { clientId, code: values.edrpou, status: "active" },
      { sort: { sort: 1, _id: 1 }, projection: { name: 1 } },
    );
    const name = typeof match?.name === "string" ? match.name.trim() : "";
    if (name) return name;
  }
  return typeof client?.name === "string" ? client.name.trim() : "";
}

// Placeholder payment term of a new partner order until the contract
// terms come from 1C: about two months, like the demo history.
const PAYMENT_TERM_DAYS = 60;

// Places an order from the checkout form. `values` are pruned, trimmed and
// validated by the route; `lines` are distinct product ids with
// quantities. Prices and totals come from the database only: retail =
// product.price, partner = the company's partner price. The stock rule is
// the cart's (a partner never gets stock issues). `shownSubtotal` is the
// sum the checkout showed (comparison only, never used for pricing): when
// the cart's own sum (cartSubtotal, the formula the browser ran) of the
// current prices differs, the order is refused as "price" and the browser
// shows the new total first. On success a signed-in buyer's stored cart is
// emptied.
export async function placeOrder(
  buyer: Buyer,
  values: CheckoutValues,
  lines: CartLine[],
  shownSubtotal?: number,
): Promise<PlaceOutcome> {
  const products = await collection("products");
  const rows = (await products
    .find({ _id: { $in: lines.map((l) => l.id) } }, { projection: PRODUCT_PROJECTION })
    .toArray()) as ProductRow[];
  const byId = new Map(rows.map((row) => [row._id, row]));
  const unknown = lines.filter((l) => !byId.has(l.id)).map((l) => l.id);
  if (unknown.length) return { ok: false, error: "product", ids: unknown };

  const partner = buyer.kind === "partner";
  const entries: CartEntry[] = lines.map((line) => ({ line, product: stockProduct(byId.get(line.id)!) }));
  const issues = checkStock(entries, partner ? "partner" : "retail");
  if (issues.length) {
    const refused = new Set(issues.map((issue) => issue.lineId));
    return {
      ok: false,
      error: "stock",
      ids: [...refused],
      products: entries.filter((e) => refused.has(e.line.id)).map((e) => stockState(e.product)),
    };
  }

  const prices = partner ? ((await partnerPrices(buyer.clientId)) ?? {}) : null;
  const priceOf = (row: ProductRow): number | undefined => {
    const value = prices ? prices[row._id] : row.price;
    return usablePrice(value) ? value : undefined;
  };
  const unpriced = lines.filter((l) => priceOf(byId.get(l.id)!) === undefined).map((l) => l.id);
  if (unpriced.length) return { ok: false, error: "product", ids: unpriced };

  if (shownSubtotal !== undefined) {
    const current = cartSubtotal(entries, partner ? "partner" : "retail", prices);
    if (Math.abs(current - shownSubtotal) > 0.001) {
      return { ok: false, error: "price", ids: lines.map((l) => l.id), products: entries.map((e) => stockState(e.product)) };
    }
  }

  const now = new Date();
  let number: string;
  if (buyer.kind === "partner") {
    const clients = await collection("clients");
    const client = await clients.findOne({ _id: buyer.clientId });
    const today = companyToday(client);
    const counterparty = await counterpartyOf(buyer.clientId, client, values);
    const items: OrderItem[] = lines.map((line, k) => {
      const row = byId.get(line.id)!;
      return {
        productId: row._id,
        name: [row.title, row.volume, row.brand].filter(Boolean).join(", "),
        article: skuOf(row) || row._id,
        image: row.image,
        unit: /пар/.test(row.volume ?? "") ? "пар" : "шт",
        price: priceOf(row)!,
        // The line id the return wizard and POST /api/returns name (zId:
        // plain ASCII). The product id is one; the SKU ("УН-00005301") is
        // not.
        id: `${row._id}-${k + 1}`,
        qty: line.qty,
      };
    });
    const clientId = buyer.clientId;
    number = await insertNumbered(
      await b2bOrders(),
      "orders-b2b",
      highestB2bNumber,
      (seq) => String(seq),
      (n): B2bOrderDoc => ({
        _id: n,
        channel: "b2b",
        clientId,
        userId: buyer.user._id,
        number: n,
        date: today,
        total: sum(items.map((it) => lineSum(it.price, it.qty))),
        counterparty,
        status: "new",
        payment: { kind: "awaiting" },
        createdBy: buyer.user.person.fullName.trim() || values.name,
        paymentType: values.payment,
        paymentDue: addDays(today, PAYMENT_TERM_DAYS),
        delivery: deliveryOf(values),
        items,
        documents: [],
        checkout: values,
        createdAt: now,
        updatedAt: now,
      }),
    );
  } else {
    const items: RetailOrderItem[] = lines.map((line) => {
      const row = byId.get(line.id)!;
      return {
        productId: row._id,
        title: row.title,
        sku: skuOf(row),
        image: row.image,
        qty: line.qty,
        price: priceOf(row)!,
      };
    });
    const userId = buyer.kind === "customer" ? buyer.user._id : null;
    number = await insertNumbered(
      await retailOrders(),
      "orders-retail",
      async () => RETAIL_FLOOR,
      (seq) => `BN-${String(seq).padStart(6, "0")}`,
      (n): RetailOrderDoc => ({
        _id: n,
        channel: "retail",
        clientId: null,
        userId,
        number: n,
        date: kyivToday(now),
        status: "new",
        items,
        total: sum(items.map((it) => lineSum(it.price, it.qty))),
        checkout: values,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  if (buyer.kind !== "guest") {
    // The order stands even if the cart could not be emptied (the next
    // cart save replaces it anyway): never answer an error for a placed
    // order, the buyer would place it twice.
    try {
      await saveCartLines(buyer.user._id, []);
    } catch (error) {
      console.error("[orders] emptying the stored cart failed:", error);
    }
  }
  return { ok: true, number };
}
