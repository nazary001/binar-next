import { z } from "zod";
import { CANCEL_REASONS, CANCEL_SOLUTIONS } from "@/components/platform/orders/data";
import { fail, handler, HttpError, json, parseBody, requirePartner } from "@/server/http";
import { cancelOrder, mutationStamp } from "@/server/repos/orders";
import { zId } from "@/server/validate";

// POST /api/orders/<id>/cancel { reason, solution?, request }
// -> 200 { ok: true, order, cancel, at } (the order as the cabinet now shows
// it, the stored cancel record, and the moment it was stored: a session
// payload with an older `asOf` does not know it yet, orders/store.ts).
// "Скасувати замовлення" of an order "Нове" / "Заблоковано" (request:
// false, the order turns "Скасовано" at once) and "Запит на скасування" of
// an order "В роботі" (request: true, the manager decides; the order keeps
// its status). The server re-checks the details page's rule (orderAction
// with the company's today).
// Errors: 400 "bad-request" (a reason / solution outside the form's
// options, a malformed body), 400 "solution" (a partly paid "Нове" /
// "Заблоковано" order needs "Бажане рішення"), 401 / 403 (not a partner),
// 404 "not-found" (no such order in the caller's company), 409 "state"
// (the order does not offer this cancel now: wrong status, wrong kind, a
// request already pending, or a parallel duplicate).

type Context = { params: Promise<{ id: string }> };

const Body = z
  .object({
    reason: z.enum(CANCEL_REASONS),
    solution: z.enum(CANCEL_SOLUTIONS).optional(),
    request: z.boolean(),
  })
  .strict();

export const POST = handler<Context>(async (request, { params }) => {
  const partner = await requirePartner();
  const { id } = await params;
  const orderId = zId.safeParse(id);
  if (!orderId.success) return fail(404, "not-found");
  const input = await parseBody(request, Body);

  const outcome = await cancelOrder(partner.clientId, orderId.data, input);
  if (!outcome.ok) {
    throw new HttpError(outcome.error === "not-found" ? 404 : outcome.error === "solution" ? 400 : 409, outcome.error);
  }
  return json({ ok: true, order: outcome.order, cancel: outcome.cancel, at: mutationStamp() });
});
