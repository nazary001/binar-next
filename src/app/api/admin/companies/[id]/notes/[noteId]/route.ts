import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { removeCompanyNote } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// DELETE /api/admin/companies/<id>/notes/<noteId> [customers.edit] -> { id }
// The author removes a note, and so does an owner (403 "not-author" for
// anybody else).

type Context = { params: Promise<{ id: string; noteId: string }> };

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const noteId = pathId(params.noteId);
  const { client, note } = await removeCompanyNote(staff, id, noteId);
  await audit(staff, request, {
    action: "company.note-delete",
    entity: { type: "company", id, label: client.name },
    summary: `Видалено нотатку компанії «${client.name}»`,
    // The text goes with the note: the journal keeps only who wrote it.
    meta: { noteId, author: note.by?.name ?? "" },
  });
  return json({ ok: true, id: noteId });
});
