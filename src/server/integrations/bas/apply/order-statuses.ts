import "server-only";
import type { UpdateFilter } from "mongodb";
import type { OrderStatus, PaymentState } from "@/components/platform/orders/data";
import {
  collection,
  type Actor,
  type ErpLink,
  type OrderDoc,
  type OrderHistoryEntry,
  type OrderShipment,
} from "../../../db/collections";
import { companyToday } from "../../../repos/orders";
import { kyivToday } from "../../../time";
import type { OrderStatusInput } from "../contract";
import { failed, guarded, ok, same, type ApplyResult, type Outcome } from "../batch";
import { daysSince } from "../values";

// PUT /orders/statuses: what BAS did with the site's orders. Once BAS has
// an order, its status, payment and documents are BAS's: the site shows
// them. Each change adds a history entry by the integration (the panel's
// timeline), and the order's ERP link becomes "acked" with BAS's number
// (the queue entry too, if BAS never acknowledged it).
//
// Status words: the site's keys, or BAS's wording mapped below.

export const STATUS_MAP: Record<OrderStatusInput["status"], OrderStatus> = {
  new: "new",
  awaiting_payment: "new",
  blocked: "blocked",
  inProgress: "inProgress",
  in_progress: "inProgress",
  shipped: "shipped",
  received: "received",
  delivered: "received",
  completed: "completed",
  cancelled: "cancelled",
};

const PAYMENT_LABELS: Record<PaymentState["kind"], string> = {
  awaiting: "очікується",
  partial: "часткова",
  paid: "оплачено",
  overdue: "прострочено",
};

// A carrier waybill of Nova Poshta: 14 digits starting with 20 or 59.
const NP_TTN = /^(20|59)\d{12}$/;

export function orderRowId(item: Pick<OrderStatusInput, "orderNumber" | "orderExternalId">): string {
  return item.orderNumber || item.orderExternalId || "";
}

// The payment state the cabinet's badge reads. "overdue" counts its days
// from the due date (the order day for a retail order).
function paymentOf(input: NonNullable<OrderStatusInput["payment"]>, order: OrderDoc, today: string): PaymentState {
  const current = order.payment;
  switch (input.state) {
    case "awaiting":
      return { kind: "awaiting" };
    case "partial":
      return { kind: "partial", paid: input.paid ?? 0 };
    case "paid": {
      const wasLate = current?.kind === "overdue" || (current?.kind === "partial" && Boolean(current.overdue));
      return wasLate ? { kind: "paid", late: true } : { kind: "paid" };
    }
    case "overdue": {
      const due = order.channel === "b2b" ? order.paymentDue : order.date;
      return { kind: "overdue", days: Math.max(1, daysSince(due, today)) };
    }
  }
}

function shipmentFor(order: OrderDoc, ttn: string, estimatedDate: string | null, now: Date): OrderShipment {
  const values = order.checkout;
  return {
    carrier: NP_TTN.test(ttn) ? "nova-poshta" : "other",
    ttn,
    ref: null,
    status: "created",
    statusCode: null,
    statusText: null,
    cost: null,
    estimatedDate,
    recipient: {
      name: values?.name ?? "",
      phone: values?.phone ?? "",
      city: values?.city ?? (order.channel === "b2b" ? order.delivery.city : ""),
      cityRef: null,
      warehouse: values?.branch || values?.locker || "",
      warehouseRef: null,
      address: values?.street ? [values.street, values.house, values.flat].filter(Boolean).join(", ") : null,
    },
    params: null,
    createdAt: now,
    createdBy: null,
    checkedAt: null,
    events: [],
  };
}

async function applyOne(item: OrderStatusInput, actor: Actor): Promise<Outcome> {
  const orders = await collection("orders");
  const order = item.orderNumber
    ? await orders.findOne({ _id: item.orderNumber })
    : await orders.findOne({ "erp.externalId": item.orderExternalId });
  if (!order) return failed("unknown-order");

  const now = new Date();
  const status = STATUS_MAP[item.status];
  const history: OrderHistoryEntry[] = [];
  const set: Record<string, unknown> = {};

  if (status !== order.status) {
    set.status = status;
    history.push({
      at: now,
      by: actor,
      type: "status",
      from: order.status,
      to: status,
      // An undefined field would be stored as null.
      ...(item.comment ? { text: item.comment } : {}),
    });
  }

  const paymentInput = item.payment ?? (item.status === "awaiting_payment" ? { state: "awaiting" as const } : undefined);
  if (paymentInput) {
    let today = kyivToday(now);
    if (order.channel === "b2b") {
      const client = await (await collection("clients")).findOne({ _id: order.clientId }, { projection: { demoToday: 1 } });
      today = companyToday(client);
    }
    const payment = paymentOf(paymentInput, order, today);
    if (!same(payment, order.payment ?? { kind: "awaiting" })) {
      set.payment = payment;
      history.push({
        at: now,
        by: actor,
        type: "payment",
        from: order.payment?.kind ?? "awaiting",
        to: payment.kind,
        text: `Оплата: ${PAYMENT_LABELS[paymentInput.state]}${payment.kind === "partial" ? `, ${payment.paid.toFixed(2)} грн` : ""}`,
      });
    }
  }

  const estimated = item.expectedDate ? item.expectedDate.day : null;
  if (item.ttn) {
    const shipment = order.shipment ?? null;
    if (!shipment) {
      set.shipment = shipmentFor(order, item.ttn, estimated, now);
      history.push({ at: now, by: actor, type: "shipment", to: item.ttn, text: `ТТН від BAS: ${item.ttn}` });
    } else if (!shipment.ttn) {
      set["shipment.ttn"] = item.ttn;
      if (estimated) set["shipment.estimatedDate"] = estimated;
      history.push({ at: now, by: actor, type: "shipment", to: item.ttn, text: `ТТН від BAS: ${item.ttn}` });
    } else if (shipment.ttn !== item.ttn) {
      // The parcel on record is staff's (or the carrier's): kept, noted.
      history.push({
        at: now,
        by: actor,
        type: "shipment",
        to: item.ttn,
        text: `BAS повідомив іншу ТТН: ${item.ttn} (збережено ${shipment.ttn})`,
      });
    }
  }

  const erp: ErpLink = {
    externalId: item.externalId ?? order.erp?.externalId ?? null,
    number: item.number ?? order.erp?.number ?? null,
    state: "acked",
    queuedAt: order.erp?.queuedAt ?? null,
    ackedAt: order.erp?.ackedAt ?? now,
    error: null,
  };
  if (!same(erp, order.erp ?? null)) {
    set.erp = erp;
    if (erp.number !== (order.erp?.number ?? null) || erp.externalId !== (order.erp?.externalId ?? null)) {
      history.push({
        at: now,
        by: actor,
        type: "erp",
        to: erp.number ?? erp.externalId ?? "",
        text: erp.number ? `Номер у BAS: ${erp.number}` : "Зв'язано з документом BAS",
      });
    }
  }

  if (Object.keys(set).length === 0 && history.length === 0) return ok("unchanged");
  const update: UpdateFilter<OrderDoc> = { $set: { ...set, updatedAt: now } };
  if (history.length) update.$push = { history: { $each: history } };
  if ("seed" in order) update.$unset = { seed: "" };
  await orders.updateOne({ _id: order._id }, update);
  // BAS has the order: a queue entry still waiting is settled.
  await (await collection("exchangeQueue")).updateOne(
    { kind: "order", entityId: order._id, state: { $in: ["pending", "error"] } },
    { $set: { state: "acked", ackedAt: now, ack: { externalId: erp.externalId, number: erp.number }, error: null } },
  );
  return ok("updated");
}

export async function applyOrderStatuses(items: OrderStatusInput[], actor: Actor): Promise<ApplyResult> {
  // One at a time: two rows may name one order (by number and by GUID).
  const outcomes: Outcome[] = [];
  for (const item of items) outcomes.push(await guarded("order status", () => applyOne(item, actor)));
  return { outcomes };
}
