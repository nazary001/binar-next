import { z } from "zod";
import { audit, staffActor } from "@/server/admin/audit";
import { HttpError, adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import { idParam, listQuery, oneOf } from "@/server/admin/list";
import { enqueueErp, listQueue, queueDto } from "@/server/integrations/bas/queue";
import { zId } from "@/server/validate";

// GET  /api/admin/integrations/bas/queue?state=&kind=&entityId=&page=&limit=&sort=
//      [integrations.view] -> ListAnswer<ExchangeQueueDto>, newest first.
// POST /api/admin/integrations/bas/queue [integrations.edit] { kind, entityId }
//      sends an order or a return request to BAS by hand (the exchange
//      switch and the export settings do not apply to a hand-sent one).
//      201 { ok, entry } | 404 | 409 "exists" { entry }.

export const GET = adminHandler("integrations.view", async ({ url }) => {
  const query = listQuery(url, { sortable: ["seq", "createdAt"], defaultSort: "-seq" });
  const page = await listQueue(query, {
    state: oneOf(query.params, "state", ["pending", "acked", "error"] as const),
    kind: oneOf(query.params, "kind", ["order", "return"] as const),
    entityId: idParam(query.params, "entityId"),
  });
  return json({ ok: true, ...page });
});

const Body = z.object({ kind: z.enum(["order", "return"]), entityId: zId }).strict();

export const POST = adminHandler("integrations.edit", async ({ request, staff }) => {
  const body = await parseBody(request, Body);
  const outcome = await enqueueErp(body.kind, body.entityId, { manual: true, actor: staffActor(staff) });
  if (outcome.state === "not-found") notFound();
  if (outcome.state === "exists") throw new HttpError(409, "exists", { entry: await queueDto(outcome.entry) });
  if (outcome.state !== "queued") throw new HttpError(409, "state");
  const entry = await queueDto(outcome.entry);
  const what =
    body.kind === "order" ? `Замовлення №${entry.number ?? body.entityId}` : `Заявку на повернення ${body.entityId}`;
  await audit(staff, request, {
    action: "integration.bas.enqueue",
    entity: { type: body.kind, id: body.entityId, label: entry.number ? `№${entry.number}` : body.entityId },
    summary: `${what} передано в чергу обміну з BAS`,
    meta: { queueId: entry.id, seq: entry.seq },
  });
  return json({ ok: true, entry }, 201);
});
