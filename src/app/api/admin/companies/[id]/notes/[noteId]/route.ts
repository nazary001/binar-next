import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { removeCompanyNote } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// DELETE /api/admin/companies/<id>/notes/<noteId> [customers.edit] -> { id }

type Context = { params: Promise<{ id: string; noteId: string }> };

export const DELETE = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const params = await context.params;
  const id = pathId(params.id);
  const noteId = pathId(params.noteId);
  const { client, note } = await removeCompanyNote(id, noteId);
  await audit(staff, request, {
    action: "company.note-delete",
    entity: { type: "company", id, label: client.name },
    summary: `Видалено нотатку компанії «${client.name}»`,
    meta: { noteId, text: note.text.slice(0, 200) },
  });
  return json({ ok: true, id: noteId });
});
