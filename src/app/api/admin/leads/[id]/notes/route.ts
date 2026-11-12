import { z } from "zod";
import { LEAD_NOTE_MAX, type LeadDetail, type LeadNoteDto } from "@/components/admin/leads/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import { addLeadNote, leadDetailOf, leadEntity, leadWho } from "@/server/admin/repos/leads";
import { zId, zRequiredText } from "@/server/validate";

// POST /api/admin/leads/<id>/notes { text } -> { ok: true, note, lead }
// A note of the member of staff who sends it (staff only; the visitor
// never sees notes).

type Context = { params: Promise<{ id: string }> };

const Body = z.object({ text: zRequiredText(LEAD_NOTE_MAX) }).strict();

export const POST = adminHandler<Context>("leads.edit", async ({ request, context, staff }) => {
  const { id: raw } = await context.params;
  const parsed = zId.safeParse(raw);
  if (!parsed.success) notFound();
  const body = await parseBody(request, Body);

  const result = await addLeadNote(parsed.data, { id: staff.staff._id, name: staff.staff.name }, body.text);
  if (!result) notFound();

  await audit(staff, request, {
    action: "lead.note",
    entity: leadEntity(result.lead),
    summary: `Нотатка до заявки від ${leadWho(result.lead)}`,
    meta: { noteId: result.note.id },
  });

  const note: LeadNoteDto = {
    id: result.note.id,
    at: result.note.at.toISOString(),
    by: result.note.by,
    text: result.note.text,
  };
  const lead: LeadDetail = await leadDetailOf(result.lead);
  return json({ ok: true, note, lead }, 201);
});
