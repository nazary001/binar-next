import type { LeadDetail } from "@/components/admin/leads/types";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, notFound } from "@/server/admin/http";
import { leadDetailOf, leadEntity, leadWho, removeLeadNote } from "@/server/admin/repos/leads";
import { zId } from "@/server/validate";

// DELETE /api/admin/leads/<id>/notes/<noteId> -> { ok: true, lead }
// The author removes a note, and so does an owner (403 "not-author" for
// anybody else).

type Context = { params: Promise<{ id: string; noteId: string }> };

export const DELETE = adminHandler<Context>("leads.edit", async ({ request, context, staff }) => {
  const { id: rawId, noteId: rawNoteId } = await context.params;
  const id = zId.safeParse(rawId);
  const noteId = zId.safeParse(rawNoteId);
  if (!id.success || !noteId.success) notFound();

  const result = await removeLeadNote(id.data, noteId.data, staff);
  if (!result) notFound();
  if (result === "not-author") throw new HttpError(403, "not-author");

  await audit(staff, request, {
    action: "lead.note-delete",
    entity: leadEntity(result.lead),
    summary: `Видалено нотатку із заявки від ${leadWho(result.lead)}`,
    // The text goes with the note: the journal keeps only who wrote it.
    meta: { noteId: result.note.id, author: result.note.by.name },
  });

  const lead: LeadDetail = await leadDetailOf(result.lead);
  return json({ ok: true, lead });
});
