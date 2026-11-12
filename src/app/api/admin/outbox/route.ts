import type { OutboxListAnswer } from "@/components/admin/mail/types";
import { adminHandler, json } from "@/server/admin/http";
import { mailStatus } from "@/server/mail/provider";
import { listOutbox } from "@/server/mail/repo";

// GET /api/admin/outbox?kind=&state=&q=&from=&to=&page=&limit=&sort=
// The messages of the site, newest first, with the count per state (the
// same filters except `state`) and whether anything is being sent.
// Shape: OutboxListAnswer (src/components/admin/mail/types.ts). A row
// about a record the reader may not view (OUTBOX_KIND_PERMISSION) comes
// without its summary (`restricted`).

export const GET = adminHandler("integrations.view", async ({ url, staff }) => {
  const [list, status] = await Promise.all([listOutbox(url, staff.permissions), mailStatus()]);
  const answer: OutboxListAnswer = { ok: true, ...list, status };
  return json(answer);
});
