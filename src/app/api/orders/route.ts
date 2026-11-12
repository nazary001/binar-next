import { z } from "zod";
import {
  PAYMENT_OPTIONS,
  pruneDelivery,
  validate,
  type CheckoutErrors,
  type CheckoutValues,
} from "@/components/checkout/data";
import { clientIp, rateLimit, type RateResult } from "@/server/auth/rate-limit";
import { getSession } from "@/server/auth/session";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { placeOrder, type Buyer } from "@/server/repos/orders";
import { zLine } from "@/server/validate";

// POST /api/orders { values: CheckoutValues, lines: [{ id, qty }], subtotal? }
// -> 201 { ok: true, number } - the checkout's "До оплати".
// Errors: 400 "bad-request" (malformed body, extra fields such as a price
// or a total, duplicate line ids), 400 "empty" (no lines), 400 "fields" +
// fields (the form's own messages), 400 "product" + ids (unknown product,
// or one without a usable price), 400 "limit" (a guest or retail order of
// more than RETAIL_MAX_UNITS units), 409 "stock" + ids + products (lines
// the stock rule refuses; never for a partner), 409 "price" + ids +
// products (the sum the checkout showed is not the sum of the current
// prices), 429 "rate".
//
// Anyone may order: a guest and a retail customer get a retail order
// ("BN-" + six digits) at the shop prices, a signed-in partner an order of
// its company (the next 8-digit cabinet number) at its partner prices,
// listed in its cabinet from the next session answer. Prices and totals
// are computed here from the database; the body carries none. `subtotal`
// is the sum the checkout showed, compared with the current one and never
// used for pricing. A signed-in buyer's stored cart is emptied.

// Fields the form fills from its own lists or caps itself (the phone, the
// EDRPOU / IPN inputs have a maxLength): a longer value is a malformed body.
const capped = (max: number) => z.string().max(max);
// Free text the form does not cap: never a reason to refuse an order. The
// 64 KB body bounds it; the stored order keeps at most FREE_TEXT_CAPS
// characters of each (stored() below).
const free = z.string();

const FREE_TEXT_CAPS = {
  name: 200,
  city: 100,
  branch: 200,
  locker: 200,
  street: 200,
  house: 32,
  flat: 32,
  comment: 2000,
  company: 200,
  address: 300,
} as const satisfies Partial<Record<keyof CheckoutValues, number>>;

// An e-mail address is at most 254 characters long; a longer one gets the
// form's own message.
const EMAIL_MAX = 254;

const Values = z
  .object({
    name: free,
    email: free,
    phone: capped(32),
    city: free,
    delivery: z.enum(["", "pickup", "np-branch", "np-locker", "np-address"]),
    branch: free,
    locker: free,
    street: free,
    house: free,
    flat: free,
    payment: capped(64),
    comment: free,
    invoice: z.boolean(),
    company: free,
    edrpou: capped(32),
    ipn: capped(32),
    address: free,
    invoiceEmail: free,
  })
  .strict();

const Body = z
  .object({
    values: Values,
    lines: z.array(zLine).max(200),
    subtotal: z.number().min(0).max(1e12).optional(),
  })
  .strict();

// A guest or retail customer orders for a household or a small business:
// more units than this in one order is not a shop order.
const RETAIL_MAX_UNITS = 10_000;

// Trimmed copy of the form (what the order keeps), free text cut to its
// cap (whole characters, never half of a surrogate pair).
function stored(values: CheckoutValues): CheckoutValues {
  const caps: Partial<Record<string, number>> = FREE_TEXT_CAPS;
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (typeof value !== "string") return [key, value];
      const text = value.trim();
      const cap = caps[key];
      return [key, cap !== undefined && text.length > cap ? Array.from(text).slice(0, cap).join("") : text];
    }),
  ) as CheckoutValues;
}

// Guests: 10 orders an hour per address, and per /48 for IPv6 (a /48 is
// what one tunnel or site gets, so stepping through its /64 blocks does
// not multiply the allowance).
async function guestLimit(request: Request): Promise<RateResult> {
  const ip = clientIp(request);
  const own = await rateLimit("order", `ip:${ip}`, 10, 3600);
  if (!own.ok || !ip.endsWith("::/64")) return own;
  const site = `${ip.slice(0, -"::/64".length).split(":").slice(0, 3).join(":")}::/48`;
  return rateLimit("order-net", `net:${site}`, 60, 3600);
}

export const POST = handler(async (request) => {
  const body = await parseBody(request, Body);
  if (body.lines.length === 0) throw new HttpError(400, "empty");
  if (new Set(body.lines.map((line) => line.id)).size !== body.lines.length) throw new HttpError(400, "bad-request");

  // The form's own rule and messages (CheckoutForm runs the same two
  // functions before it calls the API); the payment must be one of the
  // form's options.
  const values = pruneDelivery(body.values);
  const fields: CheckoutErrors = validate(values);
  if (!fields.payment && !(PAYMENT_OPTIONS as readonly string[]).includes(values.payment)) {
    fields.payment = "Оберіть спосіб оплати";
  }
  if (!fields.email && values.email.trim().length > EMAIL_MAX) fields.email = "Перевірте формат email";
  if (!fields.invoiceEmail && values.invoiceEmail.trim().length > EMAIL_MAX) {
    fields.invoiceEmail = "Перевірте формат email";
  }
  if (Object.keys(fields).length > 0) throw new HttpError(400, "fields", { fields });

  const session = await getSession();
  const limit = session ? await rateLimit("order", `user:${session.user._id}`, 30, 3600) : await guestLimit(request);
  if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });

  const user = session?.user;
  const buyer: Buyer = !user
    ? { kind: "guest" }
    : user.type === "b2b" && user.clientId
      ? { kind: "partner", user, clientId: user.clientId }
      : { kind: "customer", user };

  if (buyer.kind !== "partner" && body.lines.reduce((units, line) => units + line.qty, 0) > RETAIL_MAX_UNITS) {
    throw new HttpError(400, "limit");
  }

  const outcome = await placeOrder(buyer, stored(values), body.lines, body.subtotal);
  if (!outcome.ok) {
    if (outcome.error === "product") throw new HttpError(400, "product", { ids: outcome.ids });
    throw new HttpError(409, outcome.error, { ids: outcome.ids, products: outcome.products });
  }
  return json({ ok: true, number: outcome.number }, 201);
});
