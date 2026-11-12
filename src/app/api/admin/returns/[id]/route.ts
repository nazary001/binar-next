import { z } from "zod";
import {
  RETURN_COMMENT_MAX,
  RETURN_REJECT_REASON_MAX,
  RETURN_STATUSES,
  RETURN_TTN_MAX,
} from "@/components/admin/returns/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { routeId } from "@/server/admin/repos/orders";
import { returnDetail, updateReturn } from "@/server/admin/repos/returns";
import { zText } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

// GET /api/admin/returns/<id> [returns.view] -> { ok: true, return: ReturnDetail }
// The request with its lines resolved against the order, the order
// summary, the company, the history and the notes. 404 "not-found".
export const GET = adminHandler<Context>("returns.view", async ({ context }) => {
  const id = routeId((await context.params).id);
  return json({ ok: true, return: await returnDetail(id) });
});

const Body = z
  .object({
    status: z.enum(RETURN_STATUSES).optional(),
    comment: zText(RETURN_COMMENT_MAX).optional(),
    rejectReason: zText(RETURN_REJECT_REASON_MAX).nullable().optional(),
    refundAmount: z.number().min(0).max(1e10).nullable().optional(),
    returnTtn: zText(RETURN_TTN_MAX).nullable().optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.status !== undefined ||
      body.rejectReason !== undefined ||
      body.refundAmount !== undefined ||
      body.returnTtn !== undefined,
  );

// PATCH /api/admin/returns/<id> { status?, comment?, rejectReason?,
// refundAmount?, returnTtn? } [returns.edit] -> { ok: true, return }
// Moves the request along RETURN_TRANSITIONS ("rejected" needs a reason)
// and records the refund and the waybill back. Refusals (ReturnPatchBody
// in the types file): 400 "bad-request" / "fields", 404, 409 "state" /
// "conflict".
export const PATCH = adminHandler<Context>("returns.edit", async ({ request, context, staff }) => {
  const id = routeId((await context.params).id);
  const body = await parseBody(request, Body);
  const result = await updateReturn(staff, id, body);
  if (result.audit) await audit(staff, request, result.audit);
  return json({ ok: true, return: result.ret });
});
