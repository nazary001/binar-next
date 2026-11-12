import "server-only";
import { z } from "zod";
import { BAS_LIMITS } from "@/components/admin/integrations/types";
import { zId, zRequiredText, zText } from "../../validate";
import { EMPTY_GUID, parseBasDate, parseMoney, type BasDate } from "./values";

// The request shapes of the machine API (/api/integrations/bas/v1). The
// routes parse with these, and the documentation page's examples are
// checked against the very same schemas (spec.ts validateSpecExamples),
// so the page can never describe a body the API refuses.
//
// A push body is an envelope { batchId, mode?, items } whose items are
// parsed one by one with the entity's item schema: one bad item becomes an
// error row of the answer and never fails the batch. Objects are strict:
// an unknown field is a mistake the BAS developer should hear about.
// No next/* import: the tsx check reads this file.

// --- building blocks ------------------------------------------------------------

// A GUID of BAS (or any stable code): plain ASCII, no "$", safe in a filter.
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

export const zExternalId = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(ID_RE, "invalid id")
  .refine((value) => value.toLowerCase() !== EMPTY_GUID, "empty id");

// An optional reference: absent stays undefined; null, "" and the all-zero
// GUID mean "not set" (null).
export const zRef = z
  .string()
  .trim()
  .max(64)
  .nullable()
  .optional()
  .transform((value) =>
    value === undefined ? undefined : value === null || value === "" || value.toLowerCase() === EMPTY_GUID ? null : value,
  )
  .refine((value) => value === undefined || value === null || ID_RE.test(value), "invalid id");

// Money: a number or a decimal string ("123.45", "1 234,50").
export const zMoney = z
  .union([z.number(), z.string().max(40)])
  .refine((value) => parseMoney(value) !== undefined, "invalid amount")
  .transform((value) => parseMoney(value) as number);

export const zAmount = zMoney.refine((value) => value >= 0 && value <= 1_000_000_000, "must be between 0 and 1000000000");

// A percentage of a discount: 0 up to (not including) 100.
export const zPercent = zMoney.refine((value) => value >= 0 && value < 100, "must be >= 0 and < 100");

// A date (see values.ts parseBasDate): BasDate, or null for the empty date.
export const zBasDate = z
  .string()
  .max(40)
  .refine((value) => parseBasDate(value) !== undefined, "invalid date")
  .transform((value) => parseBasDate(value) as BasDate | null);

// A date that must be set.
export const zRequiredBasDate = zBasDate.refine((value) => value !== null, "date required");

const zCurrency = z.string().trim().regex(/^[A-Z]{3}$/, "ISO 4217 code expected");
const zEdrpou = z.string().trim().regex(/^(\d{8}|\d{10})$/, "8 or 10 digits expected");

export const zBatchId = z.string().trim().min(1).max(100);

// --- envelopes --------------------------------------------------------------------

export function batchEnvelope(maxItems: number = BAS_LIMITS.items) {
  return z
    .object({
      batchId: zBatchId,
      mode: z.enum(["delta", "full"]).optional(),
      items: z.array(z.unknown()).max(maxItems),
    })
    .strict();
}

export const BatchEnvelope = batchEnvelope();
export const DocumentsEnvelope = batchEnvelope(BAS_LIMITS.documents);

export const LedgerEnvelope = z
  .object({
    batchId: zBatchId,
    mode: z.enum(["delta", "full"]).optional(),
    contractExternalId: zExternalId,
    // replace: true removes this contract's entries dated from this day
    // (all of them without it) that the batch does not carry.
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => parseBasDate(value) !== undefined, "invalid date")
      .optional(),
    replace: z.boolean().optional(),
    items: z.array(z.unknown()).max(BAS_LIMITS.items),
  })
  .strict();

// The acknowledgements of the queue. batchId is optional (an ack repeated
// is a no-op anyway); it is only written to the journal.
export const AckEnvelope = z
  .object({
    batchId: zBatchId.optional(),
    items: z.array(z.unknown()).min(1).max(BAS_LIMITS.items),
  })
  .strict();

export type BatchEnvelopeBody = z.infer<typeof BatchEnvelope>;
export type LedgerEnvelopeBody = z.infer<typeof LedgerEnvelope>;

// GET /orders, GET /returns: ?after=<seq>&limit=<1..100>.
export const PullQuery = z
  .object({
    after: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
    limit: z.coerce.number().int().min(1).max(BAS_LIMITS.pullLimit).default(BAS_LIMITS.pullLimit),
  })
  .strict();

// --- items --------------------------------------------------------------------------

export const PriceTypeItem = z
  .object({
    externalId: zExternalId,
    name: zRequiredText(120),
    currency: zCurrency.optional(),
    vatIncluded: z.boolean().optional(),
  })
  .strict();

export const ProductPackageItem = z
  .object({
    externalId: zRef,
    unitCode: zRequiredText(16),
    name: zRequiredText(60),
    coefficient: z.number().positive().max(1_000_000),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const ProductItem = z
  .object({
    externalId: zExternalId,
    sku: zRequiredText(64),
    name: zRequiredText(300),
    barcode: zText(64).optional(),
    unit: z.object({ code: zRequiredText(16), name: zRequiredText(32) }).strict().optional(),
    packages: z.array(ProductPackageItem).max(20).optional(),
    multiplicity: z.number().positive().max(100_000).optional(),
    groupExternalId: zRef,
    brand: zText(80).optional(),
    manufacturer: zText(120).optional(),
    country: zText(80).optional(),
    isCustomizable: z.boolean().optional(),
    minCustomQty: z.number().int().min(0).max(10_000_000).nullable().optional(),
    leadTimeDays: z.number().int().min(0).max(3650).nullable().optional(),
    deleted: z.boolean().optional(),
  })
  .strict();

// A product is named by its GUID or by its article.
const productRef = { productExternalId: zRef, sku: zText(64).optional() };
const hasProductRef = (value: { productExternalId?: string | null; sku?: string }) =>
  Boolean(value.productExternalId) || Boolean(value.sku);
const PRODUCT_REF_MESSAGE = { message: "productExternalId or sku required", path: ["productExternalId"] };

export const PriceItem = z
  .object({
    ...productRef,
    priceTypeExternalId: zExternalId,
    price: zAmount,
    currency: zCurrency.optional(),
  })
  .strict()
  .refine(hasProductRef, PRODUCT_REF_MESSAGE);

export const StockItem = z
  .object({
    ...productRef,
    qty: z.number().min(-1_000_000_000).max(1_000_000_000),
    leadTimeDays: z.number().int().min(0).max(3650).nullable().optional(),
    expectedDate: zBasDate.nullable().optional(),
  })
  .strict()
  .refine(hasProductRef, PRODUCT_REF_MESSAGE);

export const ContractItem = z
  .object({
    externalId: zExternalId,
    number: zRequiredText(60),
    date: zBasDate.nullable().optional(),
    discountPercent: zPercent,
    creditLimit: zAmount,
    // Negative = the partner paid in advance.
    currentDebt: zMoney,
    overdueDebt: zAmount,
    oldestDebtDays: z.number().int().min(0).max(100_000),
    // "prepayment" | "deferred" | "schedule" (free text up to 40).
    paymentTerms: zText(40).optional(),
    paymentDays: z.number().int().min(0).max(3650).nullable().optional(),
    priceTypeExternalId: zRef,
    isActive: z.boolean(),
  })
  .strict();

export const CounterpartyItem = z
  .object({
    externalId: zExternalId,
    name: zRequiredText(200),
    edrpou: zEdrpou,
    signatory: zText(200).optional(),
    isActive: z.boolean().optional(),
    contracts: z.array(ContractItem).max(200).optional(),
  })
  .strict();

export const ClientItem = z
  .object({
    externalId: zExternalId,
    name: zRequiredText(200),
    edrpou: z.union([zEdrpou, z.literal("")]).optional(),
    region: zText(120).optional(),
    city: zText(120).optional(),
    isActive: z.boolean().optional(),
    // customer_groups._id of the site.
    groupId: zId.nullable().optional(),
    counterparties: z.array(CounterpartyItem).max(100),
  })
  .strict();

export const LEDGER_DOC_TYPES = ["opening_balance", "order", "invoice", "payment", "return"] as const;

export const LedgerItem = z
  .object({
    externalId: zExternalId,
    docType: z.enum(LEDGER_DOC_TYPES),
    docNumber: zRequiredText(60),
    docDate: zRequiredBasDate,
    amount: zAmount,
    // plus = the debt grows, minus = it shrinks.
    impact: z.enum(["plus", "minus"]),
    orderNumber: zText(40).optional(),
  })
  .strict();

// The statuses BAS may send: the site's own keys and the BAS wording.
export const ORDER_STATUS_INPUTS = [
  "new",
  "awaiting_payment",
  "blocked",
  "inProgress",
  "in_progress",
  "shipped",
  "received",
  "delivered",
  "completed",
  "cancelled",
] as const;

const orderRef = { orderNumber: zText(40).optional(), orderExternalId: zRef };
const hasOrderRef = (value: { orderNumber?: string; orderExternalId?: string | null }) =>
  Boolean(value.orderNumber) || Boolean(value.orderExternalId);
const ORDER_REF_MESSAGE = { message: "orderNumber or orderExternalId required", path: ["orderNumber"] };

export const OrderStatusItem = z
  .object({
    ...orderRef,
    status: z.enum(ORDER_STATUS_INPUTS),
    // The number of the document in BAS.
    number: zText(60).optional(),
    externalId: zRef,
    payment: z
      .object({
        state: z.enum(["awaiting", "partial", "paid", "overdue"]),
        paid: zAmount.optional(),
      })
      .strict()
      .refine((value) => value.state !== "partial" || (value.paid !== undefined && value.paid > 0), {
        message: "paid required for a partial payment",
        path: ["paid"],
      })
      .optional(),
    ttn: zText(40).optional(),
    expectedDate: zBasDate.nullable().optional(),
    comment: zText(500).optional(),
  })
  .strict()
  .refine(hasOrderRef, ORDER_REF_MESSAGE);

export const DOCUMENT_TYPES = ["invoice", "waybill", "act", "reconciliation", "other"] as const;

export const DocumentItem = z
  .object({
    ...orderRef,
    externalId: zExternalId,
    type: z.enum(DOCUMENT_TYPES),
    title: zRequiredText(200),
    date: zRequiredBasDate,
    pdf: z.object({ base64: z.string().min(8).max(BAS_LIMITS.bodyBytes) }).strict(),
  })
  .strict()
  .refine(hasOrderRef, ORDER_REF_MESSAGE);

const ackFields = {
  externalId: zRef,
  number: zText(60).optional(),
  // BAS could not take the document: the entry goes to "error".
  error: zText(500).optional(),
};
const hasAckTarget = (value: { externalId?: string | null; error?: string }) =>
  Boolean(value.error) || Boolean(value.externalId);
const ACK_MESSAGE = { message: "externalId required unless error is set", path: ["externalId"] };

export const OrderAckItem = z
  .object({ orderId: zId, ...ackFields })
  .strict()
  .refine(hasAckTarget, ACK_MESSAGE);

export const ReturnAckItem = z
  .object({ returnId: zId, ...ackFields })
  .strict()
  .refine(hasAckTarget, ACK_MESSAGE);

export type PriceTypeInput = z.infer<typeof PriceTypeItem>;
export type ProductInput = z.infer<typeof ProductItem>;
export type PriceInput = z.infer<typeof PriceItem>;
export type StockInput = z.infer<typeof StockItem>;
export type ClientInput = z.infer<typeof ClientItem>;
export type CounterpartyInput = z.infer<typeof CounterpartyItem>;
export type ContractInput = z.infer<typeof ContractItem>;
export type LedgerInput = z.infer<typeof LedgerItem>;
export type OrderStatusInput = z.infer<typeof OrderStatusItem>;
export type DocumentInput = z.infer<typeof DocumentItem>;
export type OrderAckInput = z.infer<typeof OrderAckItem>;
export type ReturnAckInput = z.infer<typeof ReturnAckItem>;

// --- issues -------------------------------------------------------------------------

// The first issues of a failed parse as one line: "sku: Too small...".
export function describeIssues(error: z.ZodError, max = 3): string {
  return error.issues
    .slice(0, max)
    .map((issue) => `${issue.path.join(".") || "item"}: ${issue.message}`)
    .join("; ")
    .slice(0, 300);
}

// The same, as a list for a 400 answer.
export function issueList(error: z.ZodError, max = 10): { path: string; message: string }[] {
  return error.issues.slice(0, max).map((issue) => ({ path: issue.path.join("."), message: issue.message.slice(0, 200) }));
}

// The id a result row names for an item that did not parse: whatever
// string the raw item carries under the first of `fields`.
export function rawId(raw: unknown, fields: readonly string[]): string {
  if (!raw || typeof raw !== "object") return "";
  for (const field of fields) {
    const value = (raw as Record<string, unknown>)[field];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 100);
  }
  return "";
}
