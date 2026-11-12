import "server-only";
import type { UpdateFilter } from "mongodb";
import {
  collection,
  type Actor,
  type OrderDoc,
  type OrderHistoryEntry,
  type OrderShipment,
  type ShipmentStatus,
} from "@/server/db/collections";
import { npCall, npDay, npNumber, npPhone, npString } from "./client";
import { NpError } from "./errors";

// Tracking of the parcels (TrackingDocument.getStatusDocuments).
//
// The carrier's StatusCode (a string) is mapped to the shop's shipment
// states by the table below (audit/admin/understand/nova-poshta.md,
// section 5). A code that is not in the table means "on the way": a new
// code the carrier adds later should not look like a delivered or a lost
// parcel.

export const NP_STATUS_TABLE: Readonly<Record<string, ShipmentStatus>> = {
  "1": "created",
  "2": "cancelled",
  "3": "unknown",
  "4": "in_transit",
  "41": "in_transit",
  "5": "in_transit",
  "6": "in_transit",
  "7": "arrived",
  "8": "arrived",
  "9": "received",
  "10": "received",
  "11": "received",
  "12": "in_transit",
  "101": "in_transit",
  "102": "refused",
  "103": "refused",
  "104": "in_transit",
  "105": "returning",
  "106": "received",
  "111": "in_transit",
  "112": "in_transit",
};

export function mapStatus(code: string | number | null | undefined): ShipmentStatus {
  const key = code === null || code === undefined ? "" : String(code).trim();
  return NP_STATUS_TABLE[key] ?? "in_transit";
}

// Codes after which nothing changes for the shop: deleted, received (cash
// on delivery paid out, or no cash on delivery), refused, storage ended,
// received with a return waybill. Code 10 (received, the cash on delivery
// still on its way) is followed until it becomes 11.
export const FINAL_CODES: readonly string[] = ["2", "9", "11", "102", "103", "105", "106"];

// "Number not found" stops being asked about after this long: a typed-in
// number that never appears, or one the carrier dropped.
export const UNKNOWN_GIVE_UP_MS = 14 * 24 * 60 * 60 * 1000;

export function isTrackable(shipment: OrderShipment | null | undefined): shipment is OrderShipment {
  return Boolean(
    shipment && shipment.carrier === "nova-poshta" && shipment.ttn && shipment.status !== "cancelled" && shipment.status !== "draft",
  );
}

export function isFinalShipment(shipment: OrderShipment, now: Date = new Date()): boolean {
  if (shipment.status === "cancelled") return true;
  if (shipment.carrier !== "nova-poshta" || !shipment.ttn) return true;
  if (shipment.statusCode && FINAL_CODES.includes(shipment.statusCode)) return true;
  if (shipment.statusCode === "3" && now.getTime() - shipment.createdAt.getTime() > UNKNOWN_GIVE_UP_MS) return true;
  return false;
}

// What the shop keeps of one tracking answer.
export type NpTrackingRow = {
  number: string;
  statusCode: string;
  status: string;
  scheduledDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  recipientDateTime: string | null;
  documentCost: number | null;
  redeliverySum: number | null;
  cityRecipient: string;
  warehouseRecipient: string;
};

type RawTracking = Record<string, unknown>;

function toRow(raw: RawTracking): NpTrackingRow {
  return {
    number: npString(raw.Number),
    statusCode: npString(raw.StatusCode),
    status: npString(raw.Status),
    scheduledDeliveryDate: npDay(raw.ScheduledDeliveryDate),
    actualDeliveryDate: npDay(raw.ActualDeliveryDate),
    recipientDateTime: npString(raw.RecipientDateTime) || null,
    documentCost: npNumber(raw.DocumentCost),
    redeliverySum: npNumber(raw.RedeliverySum),
    cityRecipient: npString(raw.CityRecipient),
    warehouseRecipient: npString(raw.WarehouseRecipient),
  };
}

export const TRACK_BATCH = 100;

// Asks the carrier about any number of waybills, 100 per call. The
// phone (the sender's, or the recipient's) gives the full answer. The
// stored key is used when there is one; when the carrier refuses it, the
// call is repeated without it (tracking works without a key, and an expired
// key must not stop the shop from seeing where its parcels are).
export async function trackShipments(
  ttns: string[],
  phone: string | null,
  actor: Actor | null = null,
): Promise<Map<string, NpTrackingRow>> {
  const unique = [...new Set(ttns.filter(Boolean))];
  const found = new Map<string, NpTrackingRow>();
  const Phone = phone ? (npPhone(phone) ?? "") : "";
  for (let k = 0; k < unique.length; k += TRACK_BATCH) {
    const batch = unique.slice(k, k + TRACK_BATCH);
    const props = { Documents: batch.map((DocumentNumber) => ({ DocumentNumber, Phone })) };
    const options = { entity: "tracking", actor, subject: batch.length === 1 ? batch[0] : null };
    let rows: RawTracking[];
    try {
      rows = (await npCall<RawTracking>("TrackingDocument", "getStatusDocuments", props, { ...options, key: "optional" })).data;
    } catch (error) {
      if (!(error instanceof NpError) || error.kind !== "auth") throw error;
      rows = (await npCall<RawTracking>("TrackingDocument", "getStatusDocuments", props, { ...options, key: "none" })).data;
    }
    for (const raw of rows) {
      const row = toRow(raw);
      if (row.number) found.set(row.number, row);
    }
  }
  return found;
}

export type TrackingChange = { shipment: OrderShipment; changed: boolean; entry: OrderHistoryEntry | null };

// The shipment after a tracking answer (pure). A new event (and a history
// entry) only when the carrier's code changed; otherwise only the moment
// of the check moves.
export function nextShipmentState(shipment: OrderShipment, row: NpTrackingRow, actor: Actor, now: Date = new Date()): TrackingChange {
  const code = row.statusCode || null;
  const changed = code !== null && code !== shipment.statusCode;
  const status = code === null ? shipment.status : mapStatus(code);
  const next: OrderShipment = {
    ...shipment,
    status,
    statusCode: code ?? shipment.statusCode,
    statusText: row.status || shipment.statusText,
    estimatedDate: row.scheduledDeliveryDate ?? shipment.estimatedDate,
    cost: shipment.cost ?? row.documentCost,
    checkedAt: now,
    events: changed ? [...shipment.events, { at: now, code: code ?? "", text: row.status }] : shipment.events,
  };
  const entry: OrderHistoryEntry | null = changed
    ? {
        at: now,
        by: actor,
        type: "shipment",
        from: shipment.status,
        to: status,
        text: `Нова Пошта, ${shipment.ttn}: ${row.status || code}`,
      }
    : null;
  return { shipment: next, changed, entry };
}

// Stores a tracking answer on the order. The write is conditional on the
// same waybill still being there (not replaced or cancelled meanwhile).
export async function applyTracking(
  order: Pick<OrderDoc, "_id" | "shipment">,
  row: NpTrackingRow,
  actor: Actor,
  now: Date = new Date(),
): Promise<TrackingChange | null> {
  const shipment = order.shipment;
  if (!isTrackable(shipment)) return null;
  const change = nextShipmentState(shipment, row, actor, now);
  const set: Record<string, unknown> = {
    "shipment.status": change.shipment.status,
    "shipment.statusCode": change.shipment.statusCode,
    "shipment.statusText": change.shipment.statusText,
    "shipment.estimatedDate": change.shipment.estimatedDate,
    "shipment.cost": change.shipment.cost,
    "shipment.checkedAt": now,
  };
  const update: Record<string, unknown> = { $set: set };
  if (change.changed) {
    set.updatedAt = now;
    update.$push = { "shipment.events": change.shipment.events[change.shipment.events.length - 1], history: change.entry };
    update.$unset = { seed: "" };
  }
  const orders = await collection("orders");
  const result = await orders.updateOne(
    { _id: order._id, "shipment.ttn": shipment.ttn, "shipment.status": { $nin: ["cancelled", "draft"] } },
    update as UpdateFilter<OrderDoc>,
  );
  return result.matchedCount === 1 ? change : null;
}
