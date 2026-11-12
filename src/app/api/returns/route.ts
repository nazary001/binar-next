import { z } from "zod";
import { RETURN_DELIVERY, RETURN_REASONS, RETURN_SOLUTIONS } from "@/components/platform/orders/data";
import { handler, HttpError, json, parseBody, requirePartner } from "@/server/http";
import { mutationStamp } from "@/server/repos/orders";
import { createReturn } from "@/server/repos/returns";
import { zId, zQty } from "@/server/validate";

// POST /api/returns { id?, orderId, lines: [{ itemId, qty, reason }],
// solution, delivery } -> 201 { ok: true, return, at } (the stored request,
// status "Створено", dated the company's today; `at` = when it was stored).
// "Оформити повернення" of the order details page. The server re-checks
// the page's rule: the order offers a return today (received / completed,
// inside the return window, goods left to return), every line is one of
// the order's lines still free to return, at most the quantity left.
// `id` is the browser's proposal (max + 1 of the requests it knows); the
// request always gets the next number of the sequence (the same number when
// the browser's view is current) and the browser adopts the answer.
// Errors: 400 "bad-request" (a reason / solution / delivery outside the
// wizard's options, a malformed body), 400 "lines" (a line that is not on
// the order, or twice), 401 / 403 (not a partner), 404 "not-found" (no
// such order in the caller's company), 409 "state" (no return possible
// now), 409 "qty" (more than is left to return), 409 "busy" (the order is
// held by another request for too long).

const Body = z
  .object({
    id: z.string().regex(/^\d{1,9}$/).optional(),
    orderId: zId,
    lines: z
      .array(z.object({ itemId: zId, qty: zQty, reason: z.enum(RETURN_REASONS) }).strict())
      .min(1)
      .max(50),
    solution: z.enum(RETURN_SOLUTIONS),
    delivery: z.enum(RETURN_DELIVERY),
  })
  .strict();

export const POST = handler(async (request) => {
  const partner = await requirePartner();
  const input = await parseBody(request, Body);
  const outcome = await createReturn(partner.clientId, partner.user._id, input);
  if (!outcome.ok) {
    const status = outcome.error === "not-found" ? 404 : outcome.error === "lines" ? 400 : 409;
    throw new HttpError(status, outcome.error);
  }
  return json({ ok: true, return: outcome.ret, at: mutationStamp() }, 201);
});
