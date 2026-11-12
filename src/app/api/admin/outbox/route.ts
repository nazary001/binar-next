import type { OutboxListAnswer } from "@/components/admin/mail/types";
import { adminHandler, json } from "@/server/admin/http";
import { mailStatus } from "@/server/mail/provider";
import { listOutbox } from "@/server/mail/repo";

// GET /api/admin/outbox?kind=&state=&q=&from=&to=&page=&limit=&sort=
// The messages of the site, newest first, with the count per state (the
// same filters except `state`) and whether anything is being sent.
// Shape: OutboxListAnswer (src/components/admin/mail/types.ts).

export const GET = adminHandler("integrations.view", async ({ url }) => {
  const [list, status] = await Promise.all([listOutbox(url), mailStatus()]);
  const answer: OutboxListAnswer = { ok: true, ...list, status };
  return json(answer);
});
