import { fail, handler, HttpError, json, requirePartner } from "@/server/http";
import { mutationStamp } from "@/server/repos/orders";
import { withdrawReturn } from "@/server/repos/returns";
import { zId } from "@/server/validate";

// POST /api/returns/<id>/withdraw -> 200 { ok: true, return, at } (status
// "Скасовано"; `at` = when it was stored). "Скасувати повернення" of the return details page, allowed
// while the request is "Створено", "На розгляді" or "Погоджено"
// (RETURN_WITHDRAWABLE). No body.
// Errors: 401 / 403 (not a partner), 404 "not-found" (no such request in
// the caller's company), 409 "state" (no longer withdrawable, a repeat or a
// parallel duplicate).

type Context = { params: Promise<{ id: string }> };

export const POST = handler<Context>(async (_request, { params }) => {
  const partner = await requirePartner();
  const { id } = await params;
  const returnId = zId.safeParse(id);
  if (!returnId.success) return fail(404, "not-found");

  const outcome = await withdrawReturn(partner.clientId, returnId.data);
  if (!outcome.ok) throw new HttpError(outcome.error === "not-found" ? 404 : 409, outcome.error);
  return json({ ok: true, return: outcome.ret, at: mutationStamp() });
});
