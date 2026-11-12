import "server-only";
import { z } from "zod";
import type { OrderDoc } from "@/server/db/collections";
import { HttpError } from "@/server/http";
import { zId, zRequiredText, zText } from "@/server/validate";
import { NP_REF } from "./client";
import { NpError, ShippingError } from "./errors";
import { findShippingOrder } from "./shipments";

// What the routes under /api/admin/np and /api/admin/shipping share: the
// request schemas and the translation of the integration's errors into
// answers. (Only routes import this file: it depends on server/http, which
// the audit scripts cannot load outside Next.)
//
//   409 np-not-configured { missing }  nothing was sent (no key, sender profile)
//   422 np-auth { message, codes }     the carrier refused the key
//   422 np-error { message, codes }    the carrier refused the request
//   502 np-unavailable                 the carrier did not answer

export function npHttpError(error: unknown): HttpError | null {
  if (error instanceof ShippingError) return new HttpError(error.status, error.code, error.extra);
  if (!(error instanceof NpError)) return null;
  switch (error.kind) {
    case "not-configured":
      return new HttpError(409, "np-not-configured", { missing: error.missing });
    case "auth":
      return new HttpError(422, "np-auth", { message: error.message, codes: error.codes });
    case "transport":
      return new HttpError(502, "np-unavailable", { message: error.message });
    default:
      return new HttpError(422, "np-error", { message: error.message, codes: error.codes, method: error.method });
  }
}

// Runs the body of a route and answers the integration's errors as above.
export async function withNp<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw npHttpError(error) ?? error;
  }
}

// The order of a /shipping/orders/[orderId] route, or 404.
export async function shippingOrderOr404(orderId: string): Promise<OrderDoc> {
  const id = zId.safeParse(orderId);
  const order = id.success ? await findShippingOrder(id.data) : null;
  if (!order) throw new HttpError(404, "not-found");
  return order;
}

// --- schemas ------------------------------------------------------------------------

export const zNpRef = z.string().regex(NP_REF);

export function npRefParam(params: URLSearchParams, name: string): string | null {
  const value = params.get(name);
  return value && NP_REF.test(value) ? value.toLowerCase() : null;
}

const zDimensions = z
  .object({
    width: z.number().min(1).max(500),
    length: z.number().min(1).max(500),
    height: z.number().min(1).max(500),
  })
  .strict();

export const WaybillBody = z
  .object({
    recipient: z
      .object({
        name: zRequiredText(200),
        phone: zRequiredText(32),
        cityRef: zNpRef,
        city: zRequiredText(200),
        warehouseRef: zNpRef.optional(),
        warehouse: zText(300).optional(),
        streetRef: zNpRef.optional(),
        street: zText(200).optional(),
        house: zText(32).optional(),
        flat: zText(32).optional(),
      })
      .strict(),
    params: z
      .object({
        weight: z.number().min(0.1).max(1000),
        seats: z.number().int().min(1).max(100),
        declaredCost: z.number().min(1).max(10_000_000),
        description: zRequiredText(120),
        payer: z.enum(["Sender", "Recipient"]),
        paymentMethod: z.enum(["Cash", "NonCash"]),
        serviceKind: z.enum(["branch", "postomat", "address"]),
        cod: z.number().min(0).max(10_000_000).nullable().optional(),
        dimensions: zDimensions.nullable().optional(),
      })
      .strict(),
    dryRun: z.boolean().optional(),
  })
  .strict();

export const ManualBody = z
  .object({
    carrier: z.enum(["nova-poshta", "other", "pickup"]),
    ttn: zText(60).optional(),
    note: zText(300).optional(),
  })
  .strict();

export const EstimateBody = z
  .object({
    cityRef: zNpRef,
    weight: z.number().min(0.1).max(1000),
    declaredCost: z.number().min(1).max(10_000_000),
    serviceType: z.enum(["WarehouseWarehouse", "WarehousePostomat", "WarehouseDoors"]).optional(),
    seats: z.number().int().min(1).max(100).optional(),
    cod: z.number().min(0).max(10_000_000).nullable().optional(),
    dimensions: zDimensions.nullable().optional(),
  })
  .strict();

const zSender = z
  .object({
    counterpartyRef: zText(64),
    counterpartyName: zText(200),
    contactRef: zText(64),
    contactName: zText(200),
    phone: zText(32),
    cityRef: zText(64),
    cityName: zText(200),
    warehouseRef: zText(64),
    warehouseName: zText(300),
  })
  .partial()
  .strict();

export const SettingsBody = z
  .object({
    enabled: z.boolean().optional(),
    apiKey: z.string().trim().max(128).optional(),
    sender: zSender.optional(),
    defaultWeight: z.number().min(0.1).max(1000).optional(),
    defaultSeats: z.number().int().min(1).max(100).optional(),
    defaultDescription: zRequiredText(120).optional(),
    defaultPayer: z.enum(["Sender", "Recipient"]).optional(),
    defaultPaymentMethod: z.enum(["Cash", "NonCash"]).optional(),
    checkoutSearch: z.boolean().optional(),
    autoTrack: z.boolean().optional(),
  })
  .strict();

export const TestBody = z.object({ apiKey: z.string().trim().max(128).optional() }).strict();
