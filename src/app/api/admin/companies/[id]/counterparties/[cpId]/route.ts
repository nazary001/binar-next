import { z } from "zod";
import { COUNTERPARTY_STATUSES } from "@/components/admin/companies/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { counterpartyDto, counterpartyShape, deleteCounterparty, updateCounterparty } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// PATCH /api/admin/companies/<id>/counterparties/<cpId> [customers.edit]
// { name?, code?, signatory?, status?, externalId? } -> { counterparty }.
// The code is validated only when it changes (the seeded demo rows carry
// 9 digits). Note: orders and credit limits name a counterparty by its
// name; a renamed counterparty no longer matches the older ones.
// DELETE ... -> { id }; 409 "in-use" when orders name it or the ledger
// refers to it.

type Context = { params: Promise<{ id: string; cpId: string }> };

const Body = z.object(counterpartyShape).partial().strict();

const STATUS_LABEL = new Map(COUNTERPARTY_STATUSES.map((status) => [status.value, status.label]));

export const PATCH = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const cpId = pathId(params.cpId);
  const body = await parseBody(request, Body);
  const change = await updateCounterparty(id, cpId, body);
  if (change.changed.length > 0) {
    const parts = change.changed.map((key) => {
      if (key === "status") return `статус «${STATUS_LABEL.get(change.after.status) ?? change.after.status}»`;
      if (key === "name") return `назва «${change.before.name}» -> «${change.after.name}»`;
      if (key === "code") return `код ${change.after.code}`;
      if (key === "signatory") return "підписант";
      return "код у BAS";
    });
    await audit(staff, request, {
      action: "company.counterparty-update",
      entity: { type: "counterparty", id: cpId, label: change.after.name },
      summary: `Контрагент «${change.after.name}» компанії «${change.client.name}»: ${parts.join(", ")}`,
      meta: { clientId: id, changed: change.changed },
    });
  }
  return json({ ok: true, counterparty: counterpartyDto(change.after, change.ordersCount) });
});

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const cpId = pathId(params.cpId);
  const { client, counterparty } = await deleteCounterparty(id, cpId);
  await audit(staff, request, {
    action: "company.counterparty-delete",
    entity: { type: "counterparty", id: cpId, label: counterparty.name },
    summary: `Видалено контрагента «${counterparty.name}» компанії «${client.name}»`,
    meta: { clientId: id, code: counterparty.code },
  });
  return json({ ok: true, id: cpId });
});
