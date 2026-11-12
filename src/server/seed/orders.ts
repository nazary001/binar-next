import "server-only";
import { collection, type B2bOrderDoc, type ReturnDoc } from "../db/collections";
import { DEMO_ORDERS, DEMO_RETURNS } from "./data/orders";
import { DEMO_CLIENT_ID, replaceSeedDocs, type SeedContext } from "./util";

// Seeds the demo company's 28 orders and 12 returns (with the three
// documents of every order), byte for byte what the browser mock
// generated.
//
// Scope = everything of the demo company (clientId "client-demo"): a
// reseed also removes the orders a test placed for it at checkout, its new
// return requests, and undoes cancellations and withdrawals. Other
// companies' orders and retail orders (clientId null) are never touched.
// Afterwards the two sequences the cabinet uses continue from the highest
// number in use ("orders-b2b" 48291064, "returns" 9104 on a clean
// database); the retail sequence is left alone (real orders).
//
// Order of the lists: orders are listed by date, then number (the seed
// has one order a day); returns by createdAt, so the seed stamps them one
// minute apart in the mock's order (newest first) before 2026-05-24, and
// any request made later lands on top.
export async function seedOrders(ctx: SeedContext): Promise<string> {
  void ctx;
  const now = new Date();

  const orders: B2bOrderDoc[] = DEMO_ORDERS.map(({ id, ...order }) => ({
    _id: id,
    channel: "b2b",
    clientId: DEMO_CLIENT_ID,
    userId: null,
    ...order,
    createdAt: new Date(`${order.date}T09:00:00.000Z`),
    updatedAt: now,
  }));

  const base = Date.UTC(2026, 4, 24);
  const returns: ReturnDoc[] = DEMO_RETURNS.map(({ id, ...ret }, i) => ({
    _id: id,
    clientId: DEMO_CLIENT_ID,
    userId: null,
    ...ret,
    createdAt: new Date(base - (i + 1) * 60_000),
    updatedAt: now,
  }));

  const scope = { clientId: DEMO_CLIENT_ID };
  // replaceSeedDocs keeps the given field order, so the stored documents
  // read back in the shape the cabinet's types have.
  const ordersLine = await replaceSeedDocs("orders", orders, scope);
  const returnsLine = await replaceSeedDocs("returns", returns, scope);

  // The highest numbers in use (the seed's own, or a higher one another
  // company got meanwhile). Computed here rather than through the repos,
  // which import next/* (the seed also runs under plain Node).
  const topOrder = await (await collection("orders"))
    .find({ channel: "b2b", _id: { $regex: /^\d{8}$/ } }, { projection: { _id: 1 } })
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  const b2b = Math.max(...orders.map((o) => Number(o._id)), ...topOrder.map((o) => Number(o._id)));
  const returnIds = await (await collection("returns"))
    .find({ _id: { $regex: /^\d{1,9}$/ } }, { projection: { _id: 1 } })
    .toArray();
  const ret = returnIds.reduce((max, r) => Math.max(max, Number(r._id) || 0), Math.max(...returns.map((r) => Number(r._id))));
  const counters = await collection("counters");
  await counters.bulkWrite([
    { updateOne: { filter: { _id: "orders-b2b" }, update: { $set: { seq: b2b } }, upsert: true } },
    { updateOne: { filter: { _id: "returns" }, update: { $set: { seq: ret } }, upsert: true } },
  ]);
  return `${ordersLine}; ${returnsLine}; counters orders-b2b ${b2b}, returns ${ret}`;
}
