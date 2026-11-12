import "server-only";
import {
  RETURN_WITHDRAWABLE,
  dayDate,
  orderAction,
  returnDocuments,
  returnableItems,
  type ReturnLine,
  type ReturnRequest,
} from "@/components/platform/orders/data";
import { collection, type ReturnDoc } from "../db/collections";
import {
  b2bOrders,
  companyReturnDocs,
  fileLocation,
  todayOf,
  toOrderDto,
  toReturnDto,
} from "./orders";
import { isDuplicateKey } from "./users";

// Return requests of the B2B cabinet (package E): "Оформити повернення",
// "Скасувати повернення" and the links of "Документи повернення".
// Values arrive validated by the route's zod schema; clientId comes from
// the session and scopes every query.

// --- ids ---------------------------------------------------------------------

// Return ids continue the cabinet's sequence (the demo history is
// 9093..9104). The browser proposes max + 1 of the requests it knows; the
// request always gets the next value of the sequence, which is that same
// number whenever the browser's view is current (the demo's first new
// request is 9105 either way), and the browser adopts the answer
// otherwise. A proposal never picks a number itself: no client can take a
// low unused id, push the shared numbering forward, or learn from the
// answer whether some id exists in another company.
export const RETURN_FLOOR = 9104;

export async function highestReturnId(): Promise<number> {
  const returns = await collection("returns");
  const ids = await returns.find({ _id: { $regex: /^\d{1,9}$/ } }, { projection: { _id: 1 } }).toArray();
  return ids.reduce((max, doc) => Math.max(max, Number(doc._id) || 0), RETURN_FLOOR);
}

async function nextReturnSeq(): Promise<number> {
  const counters = await collection("counters");
  const bumped = await counters.findOneAndUpdate({ _id: "returns" }, { $inc: { seq: 1 } }, { returnDocument: "after" });
  if (bumped) return bumped.seq;
  await counters.updateOne({ _id: "returns" }, { $max: { seq: await highestReturnId() } }, { upsert: true });
  const first = await counters.findOneAndUpdate({ _id: "returns" }, { $inc: { seq: 1 } }, { returnDocument: "after" });
  if (!first) throw new Error("counter returns vanished");
  return first.seq;
}

// Inserts the request under the next id of the sequence (an id that is
// somehow taken already is skipped).
async function insertReturn(build: (id: string) => ReturnDoc): Promise<ReturnDoc> {
  const returns = await collection("returns");
  for (let attempt = 0; attempt < 8; attempt++) {
    const doc = build(String(await nextReturnSeq()));
    try {
      await returns.insertOne(doc);
      return doc;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }
  throw new Error("no free return id");
}

// --- create ------------------------------------------------------------------

export type CreateReturnInput = {
  // The browser's proposal; informational only (see insertReturn).
  id?: string;
  orderId: string;
  lines: ReturnLine[];
  solution: string;
  delivery: string;
};

export type CreateReturnOutcome =
  | { ok: true; ret: ReturnRequest }
  | { ok: false; error: "not-found" | "state" | "lines" | "qty" | "busy" };

// How long a request may hold an order while it checks and writes; a lock
// older than this (a crashed request) no longer counts.
const LOCK_MS = 10_000;
const LOCK_WAIT_MS = 3_000;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// "Оформити повернення": the order must offer a return today (orderAction
// with the company's today: received / completed, inside the return
// window, something left to return); every line must be one of the order's
// lines still free to return, at most the quantity left. The order is held
// while the remainder is computed and the request written, so two
// requests can never return the same goods twice.
export async function createReturn(
  clientId: string,
  userId: string,
  input: CreateReturnInput,
): Promise<CreateReturnOutcome> {
  const orders = await b2bOrders();
  const started = Date.now();
  let stamp: Date;
  let locked;
  for (;;) {
    stamp = new Date();
    locked = await orders.findOneAndUpdate(
      {
        _id: input.orderId,
        clientId,
        channel: "b2b",
        $or: [{ returnLock: { $exists: false } }, { returnLock: { $lt: new Date(stamp.getTime() - LOCK_MS) } }],
      },
      { $set: { returnLock: stamp } },
      { returnDocument: "after", projection: { checkout: 0 } },
    );
    if (locked) break;
    const exists = await orders.countDocuments({ _id: input.orderId, clientId, channel: "b2b" }, { limit: 1 });
    if (!exists) return { ok: false, error: "not-found" };
    if (Date.now() - started > LOCK_WAIT_MS) return { ok: false, error: "busy" };
    await pause(40 + Math.floor(Math.random() * 40));
  }

  try {
    const [today, returnDocs] = await Promise.all([todayOf(clientId), companyReturnDocs(clientId, input.orderId)]);
    const order = toOrderDto(locked);
    const returnable = returnableItems(order, returnDocs.map(toReturnDto));
    if (orderAction(order, returnable, dayDate(today)).kind !== "return") return { ok: false, error: "state" };

    const seen = new Set<string>();
    for (const line of input.lines) {
      if (seen.has(line.itemId) || !order.items.some((it) => it.id === line.itemId)) return { ok: false, error: "lines" };
      seen.add(line.itemId);
      const left = returnable.find((it) => it.id === line.itemId)?.qty ?? 0;
      if (line.qty > left) return { ok: false, error: "qty" };
    }

    const now = new Date();
    const doc = await insertReturn((id) => ({
      _id: id,
      clientId,
      userId,
      orderId: order.id,
      date: today,
      status: "created",
      lines: input.lines.map((line) => ({ itemId: line.itemId, qty: line.qty, reason: line.reason })),
      solution: input.solution,
      delivery: input.delivery,
      createdAt: now,
      updatedAt: now,
    }));
    return { ok: true, ret: toReturnDto(doc) };
  } finally {
    await orders.updateOne({ _id: input.orderId, clientId, returnLock: stamp }, { $unset: { returnLock: "" } });
  }
}

// --- withdraw ----------------------------------------------------------------

export type WithdrawOutcome = { ok: true; ret: ReturnRequest } | { ok: false; error: "not-found" | "state" };

// "Скасувати повернення": allowed while the warehouse does not have the
// goods yet (RETURN_WITHDRAWABLE); the request turns "cancelled" and its
// goods are free to return again. Conditional on the status, so a repeat
// or a parallel duplicate is refused.
export async function withdrawReturn(clientId: string, returnId: string): Promise<WithdrawOutcome> {
  const returns = await collection("returns");
  const today = await todayOf(clientId);
  const now = new Date();
  const updated = await returns.findOneAndUpdate(
    { _id: returnId, clientId, status: { $in: [...RETURN_WITHDRAWABLE] } },
    { $set: { status: "cancelled", withdrawnAt: today, updatedAt: now } },
    { returnDocument: "after" },
  );
  if (updated) return { ok: true, ret: toReturnDto(updated) };
  const exists = await returns.countDocuments({ _id: returnId, clientId }, { limit: 1 });
  return { ok: false, error: exists ? "state" : "not-found" };
}

// --- documents ---------------------------------------------------------------

// Where the file of a ready document of this company's return is, or null.
// The return's tiles are the order's (returnDocuments); the file is the
// stored file of the order's document of the same id.
export async function returnDocumentLocation(clientId: string, returnId: string, docId: string): Promise<string | null> {
  const returns = await collection("returns");
  const ret = await returns.findOne({ _id: returnId, clientId });
  if (!ret) return null;
  const orders = await b2bOrders();
  const order = await orders.findOne({ _id: ret.orderId, clientId, channel: "b2b" }, { projection: { checkout: 0 } });
  if (!order) return null;
  const tile = returnDocuments(toReturnDto(ret), toOrderDto(order)).find((d) => d.id === docId && d.ready);
  if (!tile) return null;
  return fileLocation(order.documents?.find((d) => d.id === docId)?.file);
}
