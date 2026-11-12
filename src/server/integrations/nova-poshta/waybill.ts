import "server-only";
import {
  SERVICE_TYPE_OF,
  WAYBILL_PLACEHOLDERS,
  type NpReadiness,
  type NpRequestStep,
  type NpServiceType,
  type ParcelDimensions,
  type WaybillInput,
  type WaybillPreview,
} from "@/components/admin/shipping/types";
import type { SettingsOf } from "@/server/admin/settings";
import type { Actor, OrderDoc } from "@/server/db/collections";
import { npCall, npDateOf, npDay, npNumber, npPhone, npString } from "./client";
import { NpError, notConfigured } from "./errors";

// A waybill (InternetDocument) for an order, sent from the shop's own
// branch (the sender profile of the settings).
//
// The carrier wants the recipient as its own records, so a real run is
// three calls:
//   1. Counterparty.save   a private person "Recipient": the counterparty
//                          ref and the contact person ref;
//   2. Address.save        address delivery only: the street + house as a
//                          ref of that counterparty;
//   3. InternetDocument.save  the waybill: number (IntDocNumber), Ref,
//                          cost, estimated date.
// planWaybill() answers the same three requests without sending anything
// (the form's preview, and the way to check the fields without a key), with
// WAYBILL_PLACEHOLDERS where the carrier's answers will go.
//
// Field names follow the reference (audit/admin/understand/nova-poshta.md,
// section 4). ServiceType: WarehouseWarehouse (branch), WarehousePostomat
// (postomat, OptionsSeat required), WarehouseDoors (address). Phones are
// 380XXXXXXXXX, DateTime is today in Kyiv, cash on delivery is
// BackwardDeliveryData.

export type NpSettings = SettingsOf<"novaPoshta">;

export type RecipientRefs = { counterpartyRef: string; contactRef: string; addressRef: string | null };

// "Петренко Іван Іванович" -> the carrier's three fields; null when there
// are not at least two words.
export function splitName(name: string): { lastName: string; firstName: string; middleName: string } | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { lastName: parts[0], firstName: parts[1], middleName: parts.slice(2).join(" ") };
}

// A decimal as the carrier's string, without trailing zeros: 2 -> "2",
// 0.1234567 -> "0.1235".
function dec(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

// What a real run still lacks.
export function npReadiness(settings: NpSettings, hasKey: boolean): NpReadiness {
  const missing: string[] = [];
  if (!settings.enabled) missing.push("enabled");
  if (!hasKey) missing.push("apiKey");
  const sender = settings.sender;
  if (!sender.counterpartyRef) missing.push("sender.counterpartyRef");
  if (!sender.contactRef) missing.push("sender.contactRef");
  if (!npPhone(sender.phone)) missing.push("sender.phone");
  if (!sender.cityRef) missing.push("sender.cityRef");
  if (!sender.warehouseRef) missing.push("sender.warehouseRef");
  return { enabled: settings.enabled, hasKey, ready: missing.length === 0, missing };
}

// The form's rules a request must pass before anything is built (the
// carrier's own refusals come back as np-error). Keys are field paths.
export function waybillFieldErrors(input: WaybillInput): Record<string, string> {
  const fields: Record<string, string> = {};
  const { recipient, params } = input;
  if (!splitName(recipient.name)) fields["recipient.name"] = "Вкажіть прізвище та ім'я одержувача";
  if (!npPhone(recipient.phone)) fields["recipient.phone"] = "Перевірте номер телефону одержувача";
  if (params.serviceKind === "address") {
    if (!recipient.streetRef) fields["recipient.streetRef"] = "Оберіть вулицю зі списку";
    if (!recipient.house?.trim()) fields["recipient.house"] = "Вкажіть номер будинку";
  } else if (!recipient.warehouseRef) {
    fields["recipient.warehouseRef"] = params.serviceKind === "postomat" ? "Оберіть поштомат" : "Оберіть відділення";
  }
  if (params.serviceKind === "postomat" && !params.dimensions) {
    fields["params.dimensions"] = "Для поштомата вкажіть розміри місця";
  }
  return fields;
}

function recipientStep(input: WaybillInput): NpRequestStep {
  const name = splitName(input.recipient.name) ?? { lastName: input.recipient.name.trim(), firstName: "", middleName: "" };
  return {
    modelName: "Counterparty",
    calledMethod: "save",
    methodProperties: {
      FirstName: name.firstName,
      MiddleName: name.middleName,
      LastName: name.lastName,
      Phone: npPhone(input.recipient.phone) ?? input.recipient.phone,
      Email: "",
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
    },
  };
}

function addressStep(input: WaybillInput, counterpartyRef: string): NpRequestStep {
  return {
    modelName: "Address",
    calledMethod: "save",
    methodProperties: {
      CounterpartyRef: counterpartyRef,
      StreetRef: input.recipient.streetRef ?? "",
      BuildingNumber: (input.recipient.house ?? "").trim(),
      Flat: (input.recipient.flat ?? "").trim(),
      Note: "",
    },
  };
}

function optionsSeat(weight: number, seats: number, dims: ParcelDimensions) {
  const volume = (dims.width * dims.length * dims.height) / 1_000_000;
  return {
    volume,
    seats: Array.from({ length: seats }, () => ({
      volumetricVolume: dec(volume, 4),
      volumetricWidth: dec(dims.width, 1),
      volumetricLength: dec(dims.length, 1),
      volumetricHeight: dec(dims.height, 1),
      weight: dec(weight / seats, 3),
    })),
  };
}

// The methodProperties of InternetDocument.save. Pure: the same input and
// clock give the same request.
export function buildWaybillRequest(
  order: Pick<OrderDoc, "_id" | "number">,
  settings: NpSettings,
  input: WaybillInput,
  refs: RecipientRefs,
  now: Date = new Date(),
): Record<string, unknown> {
  const { recipient, params } = input;
  const serviceType = SERVICE_TYPE_OF[params.serviceKind];
  const props: Record<string, unknown> = {
    PayerType: params.payer,
    PaymentMethod: params.paymentMethod,
    DateTime: npDateOf(now),
    CargoType: "Parcel",
    Weight: dec(params.weight, 3),
    ServiceType: serviceType,
    SeatsAmount: String(params.seats),
    Description: params.description.trim(),
    // The declared value is whole hryvnias, at least 1.
    Cost: String(Math.max(1, Math.round(params.declaredCost))),
    CitySender: settings.sender.cityRef,
    Sender: settings.sender.counterpartyRef,
    SenderAddress: settings.sender.warehouseRef,
    ContactSender: settings.sender.contactRef,
    SendersPhone: npPhone(settings.sender.phone) ?? settings.sender.phone,
    CityRecipient: recipient.cityRef,
    Recipient: refs.counterpartyRef,
    RecipientAddress: params.serviceKind === "address" ? (refs.addressRef ?? "") : (recipient.warehouseRef ?? ""),
    ContactRecipient: refs.contactRef,
    RecipientsPhone: npPhone(recipient.phone) ?? recipient.phone,
    AdditionalInformation: `Замовлення №${order.number}`,
  };
  if (params.dimensions) {
    const seat = optionsSeat(params.weight, params.seats, params.dimensions);
    props.VolumeGeneral = dec(seat.volume * params.seats, 4);
    props.OptionsSeat = seat.seats;
  }
  if (params.cod !== null && params.cod !== undefined && params.cod > 0) {
    props.BackwardDeliveryData = [{ PayerType: "Recipient", CargoType: "Money", RedeliveryString: dec(params.cod, 2) }];
  }
  return props;
}

// The requests a real run would send, nothing sent.
export function planWaybill(
  order: Pick<OrderDoc, "_id" | "number">,
  settings: NpSettings,
  input: WaybillInput,
  readiness: NpReadiness,
  now: Date = new Date(),
): WaybillPreview {
  const address = input.params.serviceKind === "address";
  const refs: RecipientRefs = {
    counterpartyRef: WAYBILL_PLACEHOLDERS.counterparty,
    contactRef: WAYBILL_PLACEHOLDERS.contact,
    addressRef: address ? WAYBILL_PLACEHOLDERS.address : null,
  };
  const steps: NpRequestStep[] = [recipientStep(input)];
  if (address) steps.push(addressStep(input, WAYBILL_PLACEHOLDERS.counterparty));
  steps.push({
    modelName: "InternetDocument",
    calledMethod: "save",
    methodProperties: buildWaybillRequest(order, settings, input, refs, now),
  });
  return { steps, serviceType: SERVICE_TYPE_OF[input.params.serviceKind], missing: readiness.missing };
}

// --- calls --------------------------------------------------------------------------

type SavedCounterparty = { Ref?: unknown; ContactPerson?: unknown };
type SavedDocument = { Ref?: unknown; IntDocNumber?: unknown; CostOnSite?: unknown; EstimatedDeliveryDate?: unknown };

// The contact person the carrier made with the recipient: { data: [{ Ref }] }
// (or a bare array in some answers).
function contactRefOf(row: SavedCounterparty | undefined): string {
  const contact = row?.ContactPerson as { data?: { Ref?: unknown }[] } | { Ref?: unknown }[] | undefined;
  if (Array.isArray(contact)) return npString(contact[0]?.Ref);
  return npString(contact?.data?.[0]?.Ref);
}

export type CreatedWaybill = {
  ttn: string;
  ref: string;
  cost: number | null;
  estimatedDate: string | null;
  serviceType: NpServiceType;
  // The recipient's records the carrier made (stored on the shipment).
  refs: RecipientRefs;
  warnings: string[];
};

// Sends the three calls. Every one is journalled (write calls); none is
// retried (a save that timed out may exist, a second one would be a
// duplicate).
export async function createWaybill(
  order: Pick<OrderDoc, "_id" | "number">,
  settings: NpSettings,
  input: WaybillInput,
  actor: Actor | null,
  now: Date = new Date(),
): Promise<CreatedWaybill> {
  const common = { key: "required" as const, write: true, retry: false, actor, subject: order._id };
  const person = recipientStep(input);
  const saved = await npCall<SavedCounterparty>(person.modelName, person.calledMethod, person.methodProperties, {
    ...common,
    entity: "counterparty",
  });
  const counterpartyRef = npString(saved.data[0]?.Ref);
  const contactRef = contactRefOf(saved.data[0]);
  if (!counterpartyRef || !contactRef) {
    throw new NpError("api", "The carrier did not return the recipient", [], "Counterparty.save");
  }

  let addressRef: string | null = null;
  if (input.params.serviceKind === "address") {
    const step = addressStep(input, counterpartyRef);
    const address = await npCall<{ Ref?: unknown }>(step.modelName, step.calledMethod, step.methodProperties, {
      ...common,
      entity: "address",
    });
    addressRef = npString(address.data[0]?.Ref) || null;
    if (!addressRef) throw new NpError("api", "The carrier did not return the address", [], "Address.save");
  }

  const props = buildWaybillRequest(order, settings, input, { counterpartyRef, contactRef, addressRef }, now);
  const document = await npCall<SavedDocument>("InternetDocument", "save", props, { ...common, entity: "waybill" });
  const row = document.data[0];
  const ttn = npString(row?.IntDocNumber);
  const ref = npString(row?.Ref);
  if (!ttn || !ref) throw new NpError("api", "The carrier did not return the waybill number", [], "InternetDocument.save");
  return {
    ttn,
    ref,
    cost: npNumber(row?.CostOnSite),
    estimatedDate: npDay(row?.EstimatedDeliveryDate),
    serviceType: SERVICE_TYPE_OF[input.params.serviceKind],
    refs: { counterpartyRef, contactRef, addressRef },
    warnings: [...saved.warnings, ...document.warnings].filter((w) => w !== "DateTime is set to current"),
  };
}

// Deletes a waybill at the carrier. The carrier allows it only before the
// parcel is handed over; afterwards it refuses (np-error).
export async function deleteWaybill(ref: string, actor: Actor | null, subject: string | null = null): Promise<void> {
  await npCall("InternetDocument", "delete", { DocumentRefs: ref }, {
    key: "required",
    write: true,
    retry: false,
    entity: "waybill",
    actor,
    subject,
  });
}

export type EstimateInput = {
  cityRef: string;
  weight: number;
  declaredCost: number;
  serviceType?: NpServiceType;
  seats?: number;
  cod?: number | null;
  dimensions?: ParcelDimensions | null;
};

export type Estimate = { cost: number | null; codCost: number | null; deliveryDate: string | null; warnings: string[] };

// Cost and delivery date from the sender's city (no key needed).
export async function estimate(settings: NpSettings, input: EstimateInput, now: Date = new Date()): Promise<Estimate> {
  const citySender = settings.sender.cityRef;
  if (!citySender) throw notConfigured(["sender.cityRef"]);
  const serviceType = input.serviceType ?? "WarehouseWarehouse";
  const seats = input.seats ?? 1;
  const priceProps: Record<string, unknown> = {
    CitySender: citySender,
    CityRecipient: input.cityRef,
    Weight: dec(input.weight, 3),
    ServiceType: serviceType,
    Cost: String(Math.max(1, Math.round(input.declaredCost))),
    CargoType: "Parcel",
    SeatsAmount: String(seats),
  };
  if (input.dimensions) priceProps.OptionsSeat = optionsSeat(input.weight, seats, input.dimensions).seats;
  if (input.cod !== null && input.cod !== undefined && input.cod > 0) {
    priceProps.RedeliveryCalculate = { CargoType: "Money", Amount: dec(input.cod, 2) };
  }
  const options = { key: "none" as const, entity: "estimate" };
  const [price, date] = await Promise.all([
    npCall<{ Cost?: unknown; CostRedelivery?: unknown }>("InternetDocument", "getDocumentPrice", priceProps, options),
    npCall<{ DeliveryDate?: { date?: unknown } }>(
      "InternetDocument",
      "getDocumentDeliveryDate",
      { CitySender: citySender, CityRecipient: input.cityRef, ServiceType: serviceType, DateTime: npDateOf(now) },
      options,
    ),
  ]);
  return {
    cost: npNumber(price.data[0]?.Cost),
    codCost: npNumber(price.data[0]?.CostRedelivery),
    deliveryDate: npDay(date.data[0]?.DeliveryDate?.date),
    warnings: [...price.warnings, ...date.warnings].filter((w) => w !== "DateTime is set to current"),
  };
}
