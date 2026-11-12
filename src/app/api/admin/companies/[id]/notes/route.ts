import { z } from "zod";
import { NOTE_MAX } from "@/components/admin/companies/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { addCompanyNote, noteDto } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";
import { zRequiredText } from "@/server/validate";

// POST /api/admin/companies/<id>/notes [customers.edit] { text }
// -> 201 { note }: a staff note on the company card (never shown to the
// partner). The newest 200 notes are kept.

type Context = { params: Promise<{ id: string }> };

const Body = z.object({ text: zRequiredText(NOTE_MAX) }).strict();

export const POST = adminHandler<Context>("customers.edit", async ({ request, context, staff }) => {
  const id = pathId((await context.params).id);
  const body = await parseBody(request, Body);
  const { client, note } = await addCompanyNote(id, staff, body.text);
  await audit(staff, request, {
    action: "company.note",
    entity: { type: "company", id, label: client.name },
    summary: `Додано нотатку до компанії «${client.name}»`,
    meta: { noteId: note.id },
  });
  return json({ ok: true, note: noteDto(note) }, 201);
});
