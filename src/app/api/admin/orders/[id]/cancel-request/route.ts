import { z } from "zod";
import { ORDER_COMMENT_MAX } from "@/components/admin/orders/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { decideCancelRequest, routeId } from "@/server/admin/repos/orders";
import { zText } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

const Body = z
  .object({
    decision: z.enum(["approve", "decline"]),
    comment: zText(ORDER_COMMENT_MAX).optional(),
  })
  .strict();

// POST /api/admin/orders/<id>/cancel-request { decision, comment? }
// [orders.edit] -> { ok: true, order: OrderDetail }
// The answer to a partner's "Запит на скасування": "approve" cancels the
// order (and tells the customer), "decline" removes the request so the
// partner sees the order in work again. 400 "bad-request", 404
// "not-found", 409 "state" (no request waits, or the order can no longer
// be cancelled), 409 "conflict".
export const POST = adminHandler<Context>("orders.edit", async ({ request, context, staff }) => {
  const id = routeId((await context.params).id);
  const body = await parseBody(request, Body);
  const result = await decideCancelRequest(staff, id, body.decision, body.comment);
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true, order: result.order });
});
