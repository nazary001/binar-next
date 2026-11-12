import "server-only";
import type { Document, Filter, UpdateFilter } from "mongodb";
import { ORDER_TRANSITIONS } from "@/components/admin/orders/types";
import {
  CARRIERS,
  CARRIER_LABELS,
  SERVICE_TYPE_OF,
  SHIPMENT_STATUSES,
  TRACK_BATCH_MAX,
  type ManualShipmentInput,
  type ParcelDefaults,
  type RecipientPrefill,
  type NpServiceType,
  type ServiceKind,
  type ShipmentDto,
  type ShipmentParamsDto,
  type ShipmentRow,
  type ShipmentStatusKey,
  type ShippingOrderDto,
  type ShippingOrderSummary,
  type WaybillInput,
  type WaybillPreview,
} from "@/components/admin/shipping/types";
import { DELIVERY_OPTIONS, type CheckoutValues, type DeliveryOption } from "@/components/checkout/data";
import { contains, dayParam, manyOf, oneOf, paginate, type ListQuery, type Page } from "@/server/admin/list";
import { getSettings } from "@/server/admin/settings";
import {
  collection,
  type Actor,
  type OrderDoc,
  type OrderHistoryEntry,
  type OrderShipment,
} from "@/server/db/collections";
import { npPhone, storedNpKey } from "./client";
import { ShippingError, notConfigured } from "./errors";
import {
  FINAL_CODES,
  UNKNOWN_GIVE_UP_MS,
  applyTracking,
  isFinalShipment,
  isTrackable,
  trackShipments,
  type NpTrackingRow,
} from "./tracking";
import { createWaybill, deleteWaybill, npReadiness, planWaybill, waybillFieldErrors } from "./waybill";

// The shipments of orders (order.shipment): what the shipping routes read
// and write. One shipment per order; a cancelled one stays on the order
// (with its events and a history entry) until a new one replaces it.
//
// Every function takes the Actor who acts, so the audit scripts can drive
// the whole flow under plain Node; the routes add the journal (audit()).

// Who writes tracking events into an order's history: the carrier reported
// them, whoever pressed "refresh".
export const NP_ACTOR: Actor = { id: "nova-poshta", name: "Нова Пошта", kind: "integration" };

// A draft holds the order while the carrier is being asked; one that is
// older than this was left by a request that died and may be taken over.
const DRAFT_STALE_MS = 2 * 60 * 1000;

// "Re-check when the order is opened" (settings.autoTrack) at most this
// often.
const AUTO_TRACK_MS = 30 * 60 * 1000;

// The payment option of the checkout that means cash on delivery
// (components/checkout/data.ts PAYMENT_OPTIONS).
const COD_PAYMENT = "Післяплата";

const KIND_OF_OPTION: Partial<Record<DeliveryOption, ServiceKind>> = {
  "np-branch": "branch",
  "np-locker": "postomat",
  "np-address": "address",
};

// The sentence deliveryOf() (repos/orders.ts) appends to a branch or a
// postomat in a partner order's delivery note.
const TTN_PROMISE = "Ми надішлемо номер ТТН, щойно передамо замовлення перевізнику.";

export async function findShippingOrder(orderId: string): Promise<OrderDoc | null> {
  return (await collection("orders")).findOne({ _id: orderId });
}

function iso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// A live shipment blocks a new one: anything but a cancelled one or a
// draft nobody finished.
function isLive(shipment: OrderShipment | null | undefined, now: Date): boolean {
  if (!shipment) return false;
  if (shipment.status === "cancelled") return false;
  if (shipment.status === "draft" && now.getTime() - new Date(shipment.createdAt).getTime() > DRAFT_STALE_MS) return false;
  return true;
}

function claimFilter(orderId: string, now: Date): Filter<OrderDoc> {
  return {
    _id: orderId,
    $or: [
      { shipment: null },
      { "shipment.status": "cancelled" },
      { "shipment.status": "draft", "shipment.createdAt": { $lt: new Date(now.getTime() - DRAFT_STALE_MS) } },
    ],
  } as Filter<OrderDoc>;
}

// The kind of a shipment stored before params.serviceKind was kept.
const KIND_OF_SERVICE_TYPE: Record<NpServiceType, ServiceKind> = {
  WarehouseWarehouse: "branch",
  WarehousePostomat: "postomat",
  WarehouseDoors: "address",
};

function paramsDto(params: OrderShipment["params"]): ShipmentParamsDto | null {
  if (!params) return null;
  return {
    weight: params.weight,
    seats: params.seats,
    declaredCost: params.declaredCost,
    description: params.description,
    payer: params.payer,
    paymentMethod: params.paymentMethod,
    serviceType: params.serviceType,
    cod: params.cod,
    serviceKind: params.serviceKind ?? KIND_OF_SERVICE_TYPE[params.serviceType as NpServiceType] ?? null,
    dimensions: params.dimensions ? { ...params.dimensions } : null,
  };
}

export function toShipmentDto(shipment: OrderShipment, now: Date = new Date()): ShipmentDto {
  const done = shipment.status === "cancelled" || shipment.status === "draft";
  return {
    carrier: shipment.carrier,
    ttn: shipment.ttn,
    ref: shipment.ref,
    status: shipment.status,
    statusCode: shipment.statusCode,
    statusText: shipment.statusText,
    cost: shipment.cost,
    estimatedDate: shipment.estimatedDate,
    recipient: {
      name: shipment.recipient.name,
      phone: shipment.recipient.phone,
      city: shipment.recipient.city,
      cityRef: shipment.recipient.cityRef,
      warehouse: shipment.recipient.warehouse,
      warehouseRef: shipment.recipient.warehouseRef,
      address: shipment.recipient.address,
    },
    recipientRefs: shipment.recipientRefs ? { ...shipment.recipientRefs } : null,
    params: paramsDto(shipment.params),
    note: shipment.note ?? null,
    createdAt: iso(shipment.createdAt) ?? "",
    createdBy: shipment.createdBy,
    checkedAt: iso(shipment.checkedAt),
    events: (shipment.events ?? []).map((event) => ({ at: iso(event.at) ?? "", code: event.code, text: event.text })),
    final: isFinalShipment({ ...shipment, createdAt: new Date(shipment.createdAt) }, now),
    trackable: isTrackable(shipment),
    cancellable: !done && (shipment.ref ? shipment.status === "created" : true),
    printable: shipment.carrier === "nova-poshta" && Boolean(shipment.ttn) && !done,
  };
}

// --- what the form starts from ---------------------------------------------------

function deliveryLabel(option: string): string {
  return DELIVERY_OPTIONS.find((o) => o.value === option)?.label ?? "";
}

function addressLine(city: string, street: string, house: string, flat: string): string {
  return [city ? `м. ${city}` : "", street, house, flat ? `кв. ${flat}` : ""].filter(Boolean).join(", ");
}

function prefillFromCheckout(checkout: CheckoutValues): RecipientPrefill {
  const kind = checkout.delivery ? (KIND_OF_OPTION[checkout.delivery] ?? null) : null;
  return {
    name: checkout.name,
    phone: checkout.phone,
    city: checkout.city,
    serviceKind: kind,
    warehouse: kind === "branch" ? checkout.branch : kind === "postomat" ? checkout.locker : "",
    street: kind === "address" ? checkout.street : "",
    house: kind === "address" ? checkout.house : "",
    flat: kind === "address" ? checkout.flat : "",
    address: kind === "address" ? addressLine(checkout.city, checkout.street, checkout.house, checkout.flat) : "",
    pickup: checkout.delivery === "pickup",
  };
}

// A partner order without checkout values (the seeded history) keeps the
// delivery as the cabinet shows it: { city, method label, note }.
function prefillFromDelivery(order: Extract<OrderDoc, { channel: "b2b" }>): RecipientPrefill {
  const option = DELIVERY_OPTIONS.find((o) => o.label === order.delivery?.method)?.value ?? "";
  const kind = option ? (KIND_OF_OPTION[option] ?? null) : null;
  const note = (order.delivery?.note ?? "").trim();
  let warehouse = "";
  let address = "";
  if (kind === "branch" || kind === "postomat") warehouse = note.replace(TTN_PROMISE, "").trim().replace(/\.$/, "");
  if (kind === "address") address = /^Адреса доставки:\s*(.*?)\.\s*Кур/.exec(note)?.[1]?.trim() ?? "";
  return {
    name: order.createdBy ?? "",
    phone: "",
    city: order.delivery?.city ?? "",
    serviceKind: kind,
    warehouse,
    street: "",
    house: "",
    flat: "",
    address,
    pickup: option === "pickup",
  };
}

export function recipientPrefill(order: OrderDoc): RecipientPrefill {
  if (order.checkout) return prefillFromCheckout(order.checkout);
  if (order.channel === "b2b") return prefillFromDelivery(order);
  return { name: "", phone: "", city: "", serviceKind: null, warehouse: "", street: "", house: "", flat: "", address: "", pickup: false };
}

function customerOf(order: OrderDoc): string {
  if (order.channel === "b2b") return order.counterparty || order.createdBy || order.clientId;
  return order.checkout?.name ?? "";
}

function summaryOf(order: OrderDoc): ShippingOrderSummary {
  const checkout = order.checkout;
  const items = order.items as { qty: number }[];
  return {
    id: order._id,
    number: order.number,
    channel: order.channel,
    status: order.status,
    date: order.date,
    total: order.total,
    customer: customerOf(order),
    contactName: checkout?.name ?? (order.channel === "b2b" ? order.createdBy : ""),
    contactPhone: checkout?.phone ?? "",
    contactEmail: checkout?.email ?? "",
    paymentType: order.channel === "b2b" ? order.paymentType : (checkout?.payment ?? ""),
    deliveryMethod: order.channel === "b2b" ? order.delivery?.method ?? "" : deliveryLabel(checkout?.delivery ?? ""),
    itemsCount: items.length,
    units: items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    allowedStatuses: [...(ORDER_TRANSITIONS[order.status] ?? [])],
  };
}

// A partner order may be refreshed only every AUTO_TRACK_MS when opened.
function wantsAutoTrack(shipment: OrderShipment | null | undefined, now: Date): boolean {
  if (!isTrackable(shipment) || isFinalShipment(shipment, now)) return false;
  return !shipment.checkedAt || now.getTime() - new Date(shipment.checkedAt).getTime() > AUTO_TRACK_MS;
}

export async function shippingOrderView(order: OrderDoc, actor: Actor, now: Date = new Date()): Promise<ShippingOrderDto> {
  const settings = await getSettings("novaPoshta");
  const hasKey = (await storedNpKey()) !== null;
  let shipment = order.shipment ?? null;
  if (settings.autoTrack && wantsAutoTrack(shipment, now)) {
    try {
      shipment = (await refreshOrderShipment(order, actor, now)).shipment;
    } catch {
      // The form opens with what is stored; the failure is in exchange_log.
    }
  }
  const recipient = recipientPrefill(order);
  const paymentType = order.channel === "b2b" ? order.paymentType : (order.checkout?.payment ?? "");
  const params: ParcelDefaults = {
    weight: settings.defaultWeight,
    seats: settings.defaultSeats,
    declaredCost: order.total,
    description: settings.defaultDescription,
    payer: settings.defaultPayer,
    paymentMethod: settings.defaultPaymentMethod,
    serviceKind: recipient.serviceKind ?? "branch",
    cod: paymentType === COD_PAYMENT ? order.total : null,
    // The typical seat of the settings; the form sends it for a postomat,
    // which cannot take a parcel without a size.
    dimensions: settings.defaultDimensions ? { ...settings.defaultDimensions } : null,
  };
  return {
    ok: true,
    order: summaryOf(order),
    recipient,
    params,
    integration: npReadiness(settings, hasKey),
    sender: {
      counterpartyName: settings.sender.counterpartyName,
      contactName: settings.sender.contactName,
      phone: settings.sender.phone,
      cityName: settings.sender.cityName,
      warehouseName: settings.sender.warehouseName,
    },
    shipment: shipment ? toShipmentDto(shipment, now) : null,
  };
}

// --- waybills --------------------------------------------------------------------

function assertFields(input: WaybillInput): void {
  const fields = waybillFieldErrors(input);
  if (Object.keys(fields).length > 0) throw new ShippingError(400, "fields", { fields });
}

export async function previewOrderWaybill(order: OrderDoc, input: WaybillInput, now: Date = new Date()): Promise<WaybillPreview> {
  assertFields(input);
  const settings = await getSettings("novaPoshta");
  const hasKey = (await storedNpKey()) !== null;
  return planWaybill(order, settings, input, npReadiness(settings, hasKey), now);
}

function recipientOf(input: WaybillInput): OrderShipment["recipient"] {
  const r = input.recipient;
  const address =
    input.params.serviceKind === "address" ? [r.street ?? "", r.house ?? "", r.flat ? `кв. ${r.flat}` : ""].filter(Boolean).join(", ") : null;
  return {
    name: r.name.trim(),
    phone: npPhone(r.phone) ?? r.phone.trim(),
    city: r.city.trim(),
    cityRef: r.cityRef,
    warehouse: input.params.serviceKind === "address" ? "" : (r.warehouse ?? "").trim(),
    warehouseRef: input.params.serviceKind === "address" ? null : (r.warehouseRef ?? null),
    address,
  };
}

export type CreatedShipment = { shipment: OrderShipment; warnings: string[] };

// Creates the waybill at the carrier and stores it on the order.
// - 400 fields: the form's rules (waybillFieldErrors);
// - not-configured: no key, the integration off, or the sender profile
//   incomplete (nothing is sent);
// - 409 exists: the order already has a live shipment (also when another
//   request is creating one right now: the draft claim below);
// - NpError: the carrier refused or did not answer; the order is left as
//   it was.
export async function createOrderWaybill(
  order: OrderDoc,
  input: WaybillInput,
  actor: Actor,
  now: Date = new Date(),
): Promise<CreatedShipment> {
  assertFields(input);
  const settings = await getSettings("novaPoshta");
  const readiness = npReadiness(settings, (await storedNpKey()) !== null);
  if (!readiness.ready) throw notConfigured(readiness.missing);
  if (isLive(order.shipment, now)) throw new ShippingError(409, "exists");

  const p = input.params;
  const draft: OrderShipment = {
    carrier: "nova-poshta",
    ttn: null,
    ref: null,
    status: "draft",
    statusCode: null,
    statusText: null,
    cost: null,
    estimatedDate: null,
    recipient: recipientOf(input),
    params: {
      weight: p.weight,
      seats: p.seats,
      declaredCost: p.declaredCost,
      description: p.description.trim(),
      payer: p.payer,
      paymentMethod: p.paymentMethod,
      serviceType: SERVICE_TYPE_OF[p.serviceKind],
      cod: p.cod && p.cod > 0 ? p.cod : null,
      serviceKind: p.serviceKind,
      dimensions: p.dimensions ? { ...p.dimensions } : null,
    },
    recipientRefs: null,
    note: null,
    createdAt: now,
    createdBy: actor.name,
    checkedAt: null,
    events: [],
  };
  const orders = await collection("orders");
  const claimed = await orders.updateOne(claimFilter(order._id, now), { $set: { shipment: draft } } as UpdateFilter<OrderDoc>);
  if (claimed.matchedCount === 0) throw new ShippingError(409, "exists");
  const mine = { _id: order._id, "shipment.status": "draft", "shipment.createdAt": now } as Filter<OrderDoc>;

  let created;
  try {
    created = await createWaybill(order, settings, input, actor, now);
  } catch (error) {
    await orders.updateOne(mine, { $set: { shipment: order.shipment ?? null } } as UpdateFilter<OrderDoc>);
    throw error;
  }

  const shipment: OrderShipment = {
    ...draft,
    ttn: created.ttn,
    ref: created.ref,
    status: "created",
    statusCode: "1",
    statusText: "Накладну створено, посилку ще не передано перевізнику",
    cost: created.cost,
    estimatedDate: created.estimatedDate,
    recipientRefs: { ...created.refs },
    events: [{ at: now, code: "1", text: "Накладну створено" }],
  };
  const entry: OrderHistoryEntry = {
    at: now,
    by: actor,
    type: "shipment",
    to: "created",
    text: `Створено накладну Нової Пошти ${created.ttn}`,
  };
  const stored = await orders.updateOne(mine, {
    $set: { shipment, updatedAt: now },
    $unset: { seed: "" },
    $push: { history: entry },
  } as UpdateFilter<OrderDoc>);
  if (stored.matchedCount === 0) {
    // The waybill exists at the carrier (and in exchange_log) but the order
    // moved on meanwhile; staff see it there and can attach it by hand.
    console.error(`[np] waybill ${created.ttn} created but order ${order._id} changed meanwhile`);
  }
  return { shipment, warnings: created.warnings };
}

// A waybill number typed by hand (made in the carrier's cabinet, another
// carrier) or a pickup at the shop. Nothing is sent to the carrier.
export async function attachManualShipment(
  order: OrderDoc,
  input: ManualShipmentInput,
  actor: Actor,
  now: Date = new Date(),
): Promise<OrderShipment> {
  const ttn = (input.ttn ?? "").replace(/\s+/g, "");
  if (input.carrier === "nova-poshta" && !/^\d{14}$/.test(ttn)) {
    throw new ShippingError(400, "fields", { fields: { ttn: "Номер накладної Нової Пошти складається з 14 цифр" } });
  }
  if (input.carrier === "other" && !/^[A-Za-z0-9-]{3,40}$/.test(ttn)) {
    throw new ShippingError(400, "fields", { fields: { ttn: "Вкажіть номер відправлення перевізника" } });
  }
  if (isLive(order.shipment, now)) throw new ShippingError(409, "exists");

  const note = (input.note ?? "").trim();
  const prefill = recipientPrefill(order);
  const pickup = input.carrier === "pickup";
  const text = pickup
    ? "Самовивіз зі складу"
    : input.carrier === "nova-poshta"
      ? `Номер накладної Нової Пошти додано вручну: ${ttn}`
      : `Номер відправлення (${CARRIER_LABELS.other.toLowerCase()}) додано вручну: ${ttn}`;
  const shipment: OrderShipment = {
    carrier: input.carrier,
    ttn: pickup ? null : ttn,
    ref: null,
    status: "created",
    statusCode: null,
    // The carrier's wording only (a Nova Poshta number gets it on the first
    // refresh); what staff typed is the note.
    statusText: null,
    cost: null,
    estimatedDate: null,
    recipient: {
      name: prefill.name,
      phone: npPhone(prefill.phone) ?? prefill.phone,
      city: prefill.city,
      cityRef: null,
      warehouse: prefill.warehouse,
      warehouseRef: null,
      address: prefill.address || null,
    },
    recipientRefs: null,
    note: note || null,
    params: null,
    createdAt: now,
    createdBy: actor.name,
    checkedAt: null,
    events: [{ at: now, code: "manual", text: note ? `${text}. ${note}` : text }],
  };
  const entry: OrderHistoryEntry = {
    at: now,
    by: actor,
    type: "shipment",
    to: "created",
    text: note ? `${text}. ${note}` : text,
  };
  const orders = await collection("orders");
  const result = await orders.updateOne(claimFilter(order._id, now), {
    $set: { shipment, updatedAt: now },
    $unset: { seed: "" },
    $push: { history: entry },
  } as UpdateFilter<OrderDoc>);
  if (result.matchedCount === 0) throw new ShippingError(409, "exists");
  return shipment;
}

// Cancels the shipment: a waybill made through the API is deleted at the
// carrier first (allowed only before it is handed over); a typed-in one is
// only marked. The cancelled shipment stays on the order for history.
export async function cancelOrderShipment(
  order: OrderDoc,
  actor: Actor,
  now: Date = new Date(),
): Promise<{ shipment: OrderShipment; atCarrier: boolean }> {
  const current = order.shipment;
  if (!current || current.status === "cancelled" || current.status === "draft") throw new ShippingError(409, "state");
  if (current.ref && current.status !== "created") throw new ShippingError(409, "state", { reason: "handed-over" });

  let atCarrier = false;
  if (current.ref) {
    await deleteWaybill(current.ref, actor, order._id);
    atCarrier = true;
  }
  const label = current.ttn ? `${current.ttn} ` : "";
  const text = atCarrier ? `Накладну ${label}видалено в Новій Пошті` : `Відправлення ${label}скасовано`;
  const event = { at: now, code: "cancelled", text };
  const entry: OrderHistoryEntry = { at: now, by: actor, type: "shipment", from: current.status, to: "cancelled", text };
  const orders = await collection("orders");
  const result = await orders.updateOne(
    { _id: order._id, "shipment.createdAt": current.createdAt } as Filter<OrderDoc>,
    {
      $set: { "shipment.status": "cancelled", "shipment.statusText": text, updatedAt: now },
      $unset: { seed: "" },
      $push: { "shipment.events": event, history: entry },
    } as UpdateFilter<OrderDoc>,
  );
  if (result.matchedCount === 0) throw new ShippingError(409, "state");
  return {
    shipment: { ...current, status: "cancelled", statusText: text, events: [...(current.events ?? []), event] },
    atCarrier,
  };
}

// --- tracking ----------------------------------------------------------------------

async function trackingPhone(shipment: OrderShipment): Promise<string | null> {
  const settings = await getSettings("novaPoshta");
  return npPhone(settings.sender.phone) ?? npPhone(shipment.recipient.phone);
}

async function touchChecked(orderId: string, ttn: string, now: Date): Promise<void> {
  await (await collection("orders")).updateOne(
    { _id: orderId, "shipment.ttn": ttn } as Filter<OrderDoc>,
    { $set: { "shipment.checkedAt": now } } as UpdateFilter<OrderDoc>,
  );
}

// Asks the carrier about this order's parcel now.
export async function refreshOrderShipment(
  order: Pick<OrderDoc, "_id" | "shipment">,
  actor: Actor,
  now: Date = new Date(),
): Promise<{ shipment: OrderShipment; changed: boolean }> {
  const shipment = order.shipment;
  if (!isTrackable(shipment)) throw new ShippingError(409, "state");
  const ttn = shipment.ttn as string;
  const rows = await trackShipments([ttn], await trackingPhone(shipment), actor);
  const row = rows.get(ttn);
  if (!row) {
    await touchChecked(order._id, ttn, now);
    return { shipment: { ...shipment, checkedAt: now }, changed: false };
  }
  const change = await applyTracking(order, row, NP_ACTOR, now);
  if (!change) throw new ShippingError(409, "state");
  return { shipment: change.shipment, changed: change.changed };
}

// Refreshes the parcels that are not final, the longest unchecked first.
export async function refreshOpenShipments(
  actor: Actor,
  limit: number = TRACK_BATCH_MAX,
  now: Date = new Date(),
): Promise<{ checked: number; changed: number; failed: number; more: boolean }> {
  const size = Math.min(Math.max(1, Math.floor(limit)), TRACK_BATCH_MAX);
  const filter = {
    "shipment.carrier": "nova-poshta",
    "shipment.ttn": { $type: "string" },
    "shipment.status": { $nin: ["cancelled", "draft"] },
    "shipment.statusCode": { $nin: [...FINAL_CODES] },
    $nor: [{ "shipment.statusCode": "3", "shipment.createdAt": { $lt: new Date(now.getTime() - UNKNOWN_GIVE_UP_MS) } }],
  } as Filter<OrderDoc>;
  const orders = await collection("orders");
  const docs = await orders
    .find(filter, { projection: { _id: 1, shipment: 1 } })
    .sort({ "shipment.checkedAt": 1, _id: 1 })
    .limit(size + 1)
    .toArray();
  const batch = docs.slice(0, size);
  if (batch.length === 0) return { checked: 0, changed: 0, failed: 0, more: false };

  const settings = await getSettings("novaPoshta");
  const rows = await trackShipments(
    batch.map((doc) => doc.shipment?.ttn ?? ""),
    npPhone(settings.sender.phone),
    actor,
  );
  let changed = 0;
  let failed = 0;
  for (const doc of batch) {
    const ttn = doc.shipment?.ttn ?? "";
    const row: NpTrackingRow | undefined = rows.get(ttn);
    if (!row) {
      failed += 1;
      await touchChecked(doc._id, ttn, now);
      continue;
    }
    const change = await applyTracking(doc, row, NP_ACTOR, now);
    if (change?.changed) changed += 1;
  }
  return { checked: batch.length, changed, failed, more: docs.length > size };
}

// --- the list ---------------------------------------------------------------------------

const KYIV_WALL = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Kyiv",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Midnight of a Kyiv day ("YYYY-MM-DD") as a moment.
export function kyivDayStart(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const parts = Object.fromEntries(KYIV_WALL.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return new Date(guess - (wall - guess));
}

function nextDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

const ROW_PROJECTION = {
  _id: 1,
  number: 1,
  channel: 1,
  counterparty: 1,
  createdBy: 1,
  clientId: 1,
  "checkout.name": 1,
  shipment: 1,
  total: 1,
} as const;

function toRow(order: OrderDoc, now: Date): ShipmentRow {
  const s = order.shipment as OrderShipment;
  return {
    orderId: order._id,
    orderNumber: order.number,
    channel: order.channel,
    customer: customerOf(order),
    ttn: s.ttn,
    carrier: s.carrier,
    status: s.status,
    statusText: s.statusText,
    estimatedDate: s.estimatedDate,
    cost: s.cost,
    cod: s.params?.cod ?? null,
    recipientName: s.recipient?.name ?? "",
    recipientPhone: s.recipient?.phone ?? "",
    recipientCity: s.recipient?.city ?? "",
    recipientWarehouse: s.recipient?.warehouse || s.recipient?.address || "",
    note: s.note ?? null,
    createdAt: iso(s.createdAt) ?? "",
    checkedAt: iso(s.checkedAt),
    final: isFinalShipment({ ...s, createdAt: new Date(s.createdAt) }, now),
  };
}

export type ShippingList = { page: Page<ShipmentRow>; counts: Record<ShipmentStatusKey | "all", number> };

export async function listShipments(query: ListQuery, now: Date = new Date()): Promise<ShippingList> {
  const params = query.params;
  const filter: Document = { shipment: { $type: "object" } };
  const statuses = manyOf(params, "status", SHIPMENT_STATUSES);
  if (statuses.length) filter["shipment.status"] = { $in: statuses };
  const carrier = oneOf(params, "carrier", CARRIERS);
  if (carrier) filter["shipment.carrier"] = carrier;
  const from = dayParam(params, "from");
  const to = dayParam(params, "to");
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = kyivDayStart(from);
    if (to) range.$lt = kyivDayStart(nextDay(to));
    filter["shipment.createdAt"] = range;
  }
  if (query.q) {
    const text = contains(query.q);
    const or: Document[] = [
      { "shipment.ttn": text },
      { _id: text },
      { "shipment.recipient.name": text },
      { "checkout.name": text },
    ];
    // Phones are stored as 380XXXXXXXXX: "067 123", "+38067..." and
    // "38067..." all search the national part.
    const digits = query.q.replace(/\D/g, "").replace(/^(?:380|38|0)/, "");
    if (digits.length >= 3) or.push({ "shipment.recipient.phone": contains(digits) });
    filter.$or = or;
  }

  const orders = await collection("orders");
  const [page, grouped] = await Promise.all([
    paginate(orders, filter as Filter<OrderDoc>, query, { projection: ROW_PROJECTION, map: (doc) => toRow(doc, now) }),
    orders
      .aggregate<{ _id: string; n: number }>([
        { $match: { shipment: { $type: "object" } } },
        { $group: { _id: "$shipment.status", n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const counts = Object.fromEntries([...SHIPMENT_STATUSES, "all"].map((key) => [key, 0])) as Record<ShipmentStatusKey | "all", number>;
  for (const group of grouped) {
    if ((SHIPMENT_STATUSES as readonly string[]).includes(group._id)) counts[group._id as ShipmentStatusKey] += group.n;
    counts.all += group.n;
  }
  return { page, counts };
}
