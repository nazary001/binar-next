import "server-only";
import { z } from "zod";

// Small zod building blocks shared by the route handlers. Every value that
// ends up inside a MongoDB filter must come out of a schema as a primitive:
// a JSON body like { "login": { "$ne": "" } } must fail validation, never
// reach a query.

// A business id as the app uses them: "shampoo-1", "48291064", "cp-mirotel",
// a UUID. No dots or dollar signs, so it is also safe as a field path.
export const zId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);

// Free text typed by a person: trimmed, bounded.
export function zText(max: number) {
  return z.string().trim().max(max);
}

// Same, but required (at least one character after trimming).
export function zRequiredText(max: number) {
  return z.string().trim().min(1).max(max);
}

export const zQty = z.number().int().min(1).max(100_000);

// A cart / assortment line.
export const zLine = z.object({ id: zId, qty: zQty }).strict();

// "YYYY-MM-DD".
export const zIsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
