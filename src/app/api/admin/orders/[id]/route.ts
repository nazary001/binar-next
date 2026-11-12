import { z } from "zod";
import { ORDER_COMMENT_MAX, ORDER_STATUSES, PAYMENT_KINDS } from "@/components/admin/orders/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { orderDetail, routeId, updateOrder } from "@/server/admin/repos/orders";
import { zId, zIsoDate, zText } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

// GET /api/admin/orders/<id> [orders.view] -> { ok: true, order: OrderDetail }
// Everything staff need about one order of either channel (see
// OrderDetail in src/components/admin/orders/types.ts). 404 "not-found".
export const GET = adminHandler<Context>("orders.view", async ({ context }) => {
  const id = routeId((await context.params).id);
  return json({ ok: true, order: await orderDetail(id) });
});

const Body = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    comment: zText(ORDER_COMMENT_MAX).optional(),
    payment: z
      .object({
        kind: z.enum(PAYMENT_KINDS),
        paid: z.number().min(0).max(1e12).optional(),
      })
      .strict()
      .optional(),
    paymentDue: zIsoDate.optional(),
    managerId: zId.nullable().optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.status !== undefined ||
      body.payment !== undefined ||
      body.paymentDue !== undefined ||
      body.managerId !== undefined,
  );

// PATCH /api/admin/orders/<id> [orders.edit]
//   { status?, comment?, payment?: { kind, paid? }, paymentDue?, managerId? }
// -> { ok: true, order: OrderDetail }
// Moves the status along ORDER_TRANSITIONS, records the payment, the due
// date and the manager; each change is a history line, the comment goes
// into the first one. A status change queues an "order-status" message to
// the customer's e-mail. Refusals (OrderPatchBody in the types file): 400
// "bad-request" / "fields", 404 "not-found", 409 "state" / "conflict".
export const PATCH = adminHandler<Context>("orders.edit", async ({ request, context, staff }) => {
  const id = routeId((await context.params).id);
  const body = await parseBody(request, Body);
  const result = await updateOrder(staff, id, body);
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true, order: result.order });
});
