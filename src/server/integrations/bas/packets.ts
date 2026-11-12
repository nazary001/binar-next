import "server-only";
import type {
  BasOrderPacket,
  BasOrderPacketLine,
  BasReturnPacket,
} from "@/components/admin/integrations/types";
import { DELIVERY_OPTIONS, type CheckoutValues } from "@/components/checkout/data";
import {
  collection,
  type ClientDoc,
  type ContractDoc,
  type CounterpartyDoc,
  type ExchangeQueueDoc,
  type OrderDoc,
  type ProductDoc,
  type ReturnDoc,
  type UserDoc,
} from "../../db/collections";
import { lineSum, round2, sum } from "../../money";
import { plainMoney } from "./values";

// What BAS receives for a queue entry: one JSON packet per order (or
// return request) carrying the 1C ids of the client, the counterparty and
// the contract, the articles and GUIDs of the products, the quantities and
// the unit code of the packaging, the buyer, and the two notices the
// requirement asks for (overdue debt; the credit limit exceeded).
//
// Everything a page of entries needs is read in a handful of $in queries.

type ProductRow = Pick<ProductDoc, "_id" | "externalId" | "unitCode" | "packages"> & { details?: { sku?: string } };

type Loaded = {
  orders: Map<string, OrderDoc>;
  returns: Map<string, ReturnDoc>;
  clients: Map<string, ClientDoc>;
  counterparties: Map<string, CounterpartyDoc[]>;
  users: Map<string, UserDoc>;
  products: Map<string, ProductRow>;
};

async function load(orderIds: string[], returnIds: string[]): Promise<Loaded> {
  const returns = returnIds.length
    ? await (await collection("returns")).find({ _id: { $in: returnIds } }).toArray()
    : [];
  const allOrderIds = [...new Set([...orderIds, ...returns.map((r) => r.orderId)])];
  const orders = allOrderIds.length
    ? await (await collection("orders")).find({ _id: { $in: allOrderIds } }).toArray()
    : [];
  const clientIds = [
    ...new Set([...orders.flatMap((o) => (o.clientId ? [o.clientId] : [])), ...returns.map((r) => r.clientId)]),
  ];
  const userIds = [
    ...new Set([...orders.flatMap((o) => (o.userId ? [o.userId] : [])), ...returns.flatMap((r) => (r.userId ? [r.userId] : []))]),
  ];
  const productIds = [...new Set(orders.flatMap((o) => o.items.map((item) => item.productId)))];
  const [clients, counterparties, users, products] = await Promise.all([
    clientIds.length ? (await collection("clients")).find({ _id: { $in: clientIds } }).toArray() : [],
    clientIds.length ? (await collection("counterparties")).find({ clientId: { $in: clientIds } }).sort({ sort: 1 }).toArray() : [],
    userIds.length
      ? (await collection("users")).find({ _id: { $in: userIds } }, { projection: { passwordHash: 0, loginKeys: 0 } }).toArray()
      : [],
    productIds.length
      ? ((await (await collection("products"))
          .find({ _id: { $in: productIds } }, { projection: { externalId: 1, unitCode: 1, packages: 1, "details.sku": 1 } })
          .toArray()) as ProductRow[])
      : [],
  ]);
  const byClient = new Map<string, CounterpartyDoc[]>();
  for (const cp of counterparties) byClient.set(cp.clientId, [...(byClient.get(cp.clientId) ?? []), cp]);
  return {
    orders: new Map(orders.map((o) => [o._id, o])),
    returns: new Map(returns.map((r) => [r._id, r])),
    clients: new Map(clients.map((c) => [c._id, c])),
    counterparties: byClient,
    users: new Map(users.map((u) => [u._id, u as UserDoc])),
    products: new Map(products.map((p) => [p._id, p])),
  };
}

// The packaging a line is counted in. Orders do not record a chosen
// package yet, so it is the product's default package, else its base unit.
function unitOf(product: ProductRow | undefined): { unitCode: string; coefficient: number } {
  const packages = Array.isArray(product?.packages) ? product.packages : [];
  const chosen = packages.find((pkg) => pkg.isDefault) ?? packages[0];
  if (chosen) return { unitCode: chosen.unitCode, coefficient: chosen.coefficient };
  return { unitCode: product?.unitCode ?? "", coefficient: 1 };
}

type Party = Pick<BasOrderPacket, "client" | "counterparty" | "contract" | "buyer">;

function addressOf(values: CheckoutValues | undefined): string {
  if (!values) return "";
  if (values.delivery === "np-branch") return values.branch;
  if (values.delivery === "np-locker") return values.locker;
  if (values.delivery === "np-address") {
    return [values.street, values.house, values.flat ? `кв. ${values.flat}` : ""].filter(Boolean).join(", ");
  }
  return "";
}

function buyerOf(user: UserDoc | undefined, fallbackName: string, values: CheckoutValues | undefined): Party["buyer"] {
  return {
    userId: user?._id ?? null,
    name: user?.person?.fullName?.trim() || values?.name || fallbackName,
    email: user?.person?.email || values?.email || "",
    phone: user?.phone || user?.person?.phone || values?.phone || "",
  };
}

// The counterparty and the contract a partner order runs under. An order
// that names its contract (contractId, set by the buyer or by BAS) is
// booked to that contract and to the counterparty that holds it; any
// other order to the counterparty it keeps the name of (or the one with
// the invoice's EDRPOU) and that counterparty's first active contract.
function bookingOf(order: OrderDoc, data: Loaded): { cp: CounterpartyDoc | null; contract: ContractDoc | null } {
  if (order.channel !== "b2b") return { cp: null, contract: null };
  const cps = data.counterparties.get(order.clientId) ?? [];
  if (order.contractId) {
    for (const cp of cps) {
      const contract = cp.contracts.find((c) => c.id === order.contractId);
      if (contract) return { cp, contract };
    }
  }
  const edrpou = order.checkout?.invoice ? order.checkout.edrpou : "";
  const cp = cps.find((c) => c.name === order.counterparty) ?? (edrpou ? cps.find((c) => c.code === edrpou) : undefined);
  return { cp: cp ?? null, contract: cp ? pickContract(cp) : null };
}

function partyOf(order: OrderDoc, data: Loaded): Party {
  const user = order.userId ? data.users.get(order.userId) : undefined;
  if (order.channel === "retail") {
    const values = order.checkout;
    return {
      client: { externalId: null, name: values.company || values.name },
      counterparty:
        values.invoice && values.edrpou ? { externalId: null, name: values.company, edrpou: values.edrpou } : null,
      contract: null,
      buyer: buyerOf(user, values.name, values),
    };
  }
  const client = data.clients.get(order.clientId);
  const { cp, contract } = bookingOf(order, data);
  return {
    client: { externalId: client?.externalId ?? null, name: client?.name ?? order.counterparty },
    counterparty: cp ? { externalId: cp.externalId ?? null, name: cp.name, edrpou: cp.code } : null,
    contract: contract ? { externalId: contract.externalId ?? null, number: contract.number } : null,
    buyer: buyerOf(user, order.createdBy, order.checkout),
  };
}

function pickContract(cp: CounterpartyDoc): ContractDoc | null {
  const active = cp.contracts.filter((c) => c.status === "active" && c.isActive !== false);
  return active.find((c) => c.externalId) ?? active[0] ?? null;
}

// "Прострочена заборгованість ..." / "... перевищує кредитний ліміт на ...".
function warningsOf(order: OrderDoc, data: Loaded): string[] {
  if (order.channel !== "b2b") return [];
  const { contract } = bookingOf(order, data);
  if (!contract) return [];
  const warnings: string[] = [];
  const overdue = contract.overdueDebt ?? 0;
  if (overdue > 0) {
    const days = contract.oldestDebtDays ? `, найстаріший борг ${contract.oldestDebtDays} дн.` : "";
    warnings.push(`Прострочена заборгованість за договором ${contract.number}: ${plainMoney(overdue)} грн${days}`);
  }
  const limit = contract.creditLimit ?? 0;
  const debt = contract.currentDebt ?? 0;
  const over = round2(debt + order.total - limit);
  if (limit > 0 && over > 0) {
    warnings.push(
      `Замовлення разом із поточним боргом перевищує кредитний ліміт договору ${contract.number} на ${plainMoney(over)} грн`,
    );
  }
  return warnings;
}

function orderLines(order: OrderDoc, data: Loaded): BasOrderPacketLine[] {
  if (order.channel === "b2b") {
    return order.items.map((item) => {
      const product = data.products.get(item.productId);
      return {
        sku: item.article || product?.details?.sku || "",
        productExternalId: product?.externalId ?? null,
        name: item.name,
        quantity: item.qty,
        ...unitOf(product),
        price: item.price,
        sum: lineSum(item.price, item.qty),
      };
    });
  }
  return order.items.map((item) => {
    const product = data.products.get(item.productId);
    return {
      sku: item.sku || product?.details?.sku || "",
      productExternalId: product?.externalId ?? null,
      name: item.title,
      quantity: item.qty,
      ...unitOf(product),
      price: item.price,
      sum: lineSum(item.price, item.qty),
    };
  });
}

function deliveryOf(order: OrderDoc): BasOrderPacket["delivery"] {
  const values = order.checkout;
  const ttn = order.shipment?.ttn ?? null;
  if (values?.delivery) {
    const name = DELIVERY_OPTIONS.find((o) => o.value === values.delivery)?.label ?? "";
    return { method: values.delivery, methodName: name, city: values.city, address: addressOf(values), ttn };
  }
  if (order.channel === "b2b") {
    const code = DELIVERY_OPTIONS.find((o) => o.label === order.delivery.method)?.value ?? "";
    return { method: code, methodName: order.delivery.method, city: order.delivery.city, address: order.delivery.note, ttn };
  }
  return { method: "", methodName: "", city: "", address: "", ttn };
}

function orderPacket(entry: ExchangeQueueDoc, order: OrderDoc, data: Loaded): BasOrderPacket {
  return {
    seq: entry.seq,
    orderId: order._id,
    number: order.number,
    channel: order.channel,
    createdAt: order.createdAt.toISOString(),
    date: order.date,
    status: order.status,
    ...partyOf(order, data),
    items: orderLines(order, data),
    total: order.total,
    delivery: deliveryOf(order),
    payment: { method: order.channel === "b2b" ? order.paymentType || order.checkout?.payment || "" : order.checkout.payment },
    comment: order.checkout?.comment ?? "",
    warnings: warningsOf(order, data),
  };
}

function returnPacket(entry: ExchangeQueueDoc, ret: ReturnDoc, data: Loaded): BasReturnPacket | null {
  const order = data.orders.get(ret.orderId);
  if (!order || order.channel !== "b2b") return null;
  const lines = orderLines(order, data);
  const returnLines = ret.lines.flatMap((line) => {
    const at = order.items.findIndex((item) => item.id === line.itemId);
    if (at < 0) return [];
    const base = lines[at];
    return [{ ...base, itemId: line.itemId, quantity: line.qty, sum: lineSum(base.price, line.qty), reason: line.reason }];
  });
  const party = partyOf(order, data);
  const user = ret.userId ? data.users.get(ret.userId) : undefined;
  return {
    seq: entry.seq,
    returnId: ret._id,
    orderId: order._id,
    orderNumber: order.number,
    orderExternalId: order.erp?.externalId ?? null,
    createdAt: ret.createdAt.toISOString(),
    date: ret.date,
    status: ret.status,
    client: party.client,
    buyer: user ? buyerOf(user, order.createdBy, undefined) : party.buyer,
    lines: returnLines,
    total: sum(returnLines.map((line) => line.sum)),
    solution: ret.solution,
    delivery: ret.delivery,
  };
}

export type PacketPage<T> = { packets: T[]; missing: ExchangeQueueDoc[] };

// Entries whose record is gone come back in `missing` (the route marks
// them as failed, so they leave the queue).
export async function orderPackets(entries: ExchangeQueueDoc[]): Promise<PacketPage<BasOrderPacket>> {
  const data = await load(
    entries.map((e) => e.entityId),
    [],
  );
  const packets: BasOrderPacket[] = [];
  const missing: ExchangeQueueDoc[] = [];
  for (const entry of entries) {
    const order = data.orders.get(entry.entityId);
    if (order) packets.push(orderPacket(entry, order, data));
    else missing.push(entry);
  }
  return { packets, missing };
}

export async function returnPackets(entries: ExchangeQueueDoc[]): Promise<PacketPage<BasReturnPacket>> {
  const data = await load(
    [],
    entries.map((e) => e.entityId),
  );
  const packets: BasReturnPacket[] = [];
  const missing: ExchangeQueueDoc[] = [];
  for (const entry of entries) {
    const ret = data.returns.get(entry.entityId);
    const packet = ret ? returnPacket(entry, ret, data) : null;
    if (packet) packets.push(packet);
    else missing.push(entry);
  }
  return { packets, missing };
}
