import { z } from "zod";
import { LEAD_STATUS_LABELS, LEAD_STATUS_VALUES, type LeadDetail } from "@/components/admin/leads/types";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import {
  activeStaffMember,
  deleteSpamLead,
  findLead,
  leadDetailOf,
  leadEntity,
  leadWho,
  updateLead,
} from "@/server/admin/repos/leads";
import { zId } from "@/server/validate";

// GET    /api/admin/leads/<id> -> { ok: true, lead: LeadDetail }
// PATCH  /api/admin/leads/<id> { status?, assigneeId? } -> { ok: true, lead: LeadDetail }
// DELETE /api/admin/leads/<id> -> { ok: true }, only for a lead marked as spam (409 "state" otherwise)

type Context = { params: Promise<{ id: string }> };

async function leadId(context: Context): Promise<string> {
  const { id } = await context.params;
  const parsed = zId.safeParse(id);
  if (!parsed.success) notFound();
  return parsed.data;
}

export const GET = adminHandler<Context>("leads.view", async ({ context }) => {
  const doc = await findLead(await leadId(context));
  if (!doc) notFound();
  const lead: LeadDetail = await leadDetailOf(doc);
  return json({ ok: true, lead });
});

const Patch = z
  .object({
    status: z.enum(LEAD_STATUS_VALUES).optional(),
    assigneeId: zId.nullable().optional(),
  })
  .strict()
  .refine((body) => body.status !== undefined || body.assigneeId !== undefined);

export const PATCH = adminHandler<Context>("leads.edit", async ({ request, context, staff }) => {
  const id = await leadId(context);
  const body = await parseBody(request, Patch);

  let assigneeName: string | null = null;
  if (typeof body.assigneeId === "string") {
    const member = await activeStaffMember(body.assigneeId);
    if (!member) throw new HttpError(400, "fields", { fields: { assigneeId: "not-found" } });
    assigneeName = member.name;
  }

  const result = await updateLead(id, { status: body.status, assigneeId: body.assigneeId });
  if (!result) notFound();
  const { before, after } = result;
  const entity = leadEntity(after);
  const who = leadWho(after);

  if (before.status !== after.status) {
    await audit(staff, request, {
      action: "lead.status",
      entity,
      summary: `Заявка від ${who}: статус «${LEAD_STATUS_LABELS[before.status] ?? before.status}» -> «${LEAD_STATUS_LABELS[after.status]}»`,
      meta: { from: before.status, to: after.status },
    });
  }
  if ((before.assigneeId ?? null) !== (after.assigneeId ?? null)) {
    await audit(staff, request, {
      action: "lead.assign",
      entity,
      summary: after.assigneeId
        ? `Заявку від ${who} доручено: ${assigneeName ?? after.assigneeId}`
        : `Заявку від ${who} знято з відповідального`,
      meta: { from: before.assigneeId ?? null, to: after.assigneeId ?? null },
    });
  }

  const lead: LeadDetail = await leadDetailOf(after);
  return json({ ok: true, lead });
});

export const DELETE = adminHandler<Context>("leads.edit", async ({ request, context, staff }) => {
  const id = await leadId(context);
  const result = await deleteSpamLead(id);
  if (!result.ok) {
    if (result.error === "not-found") notFound();
    throw new HttpError(409, "state");
  }
  await audit(staff, request, {
    action: "lead.delete",
    entity: leadEntity(result.doc),
    summary: `Видалено спам-заявку від ${leadWho(result.doc)}`,
    meta: { kind: result.doc.kind, source: result.doc.source },
  });
  return json({ ok: true });
});
