import { createHash, timingSafeEqual } from "node:crypto";
import { handler, HttpError, json } from "@/server/http";
import { AUTOMATIC_RUN, deliverOutbox } from "@/server/mail/deliver";

// A run of the mailer may take its whole budget (40 s) plus one last send.
export const maxDuration = 60;

// GET /api/cron/outbox - one automatic run of the mailer, for a scheduler
// (Vercel Cron, an uptime pinger, the accounting server's task planner):
//
//   curl https://<site>/api/cron/outbox -H "Authorization: Bearer <CRON_SECRET>"
//
// -> 200 { ok: true, result: { configured, sent, failed, skipped } }
// (DeliverResult, src/components/admin/mail/types.ts; configured false =
// no provider is set up and nothing was tried).
// Refusals: 404 "not-found" while the CRON_SECRET environment variable is
// not set (the route does not exist then), 401 "unauthorized" without the
// right Bearer token.
//
// The site does not need it: a message is sent right after the request
// that wrote it, and while somebody uses the panel its requests sweep the
// outbox at most every 5 minutes (src/server/mail/schedule.ts). A
// scheduler only makes the retries independent of the panel being open. It is not wired
// in vercel.json on purpose (the hosting plan may not allow frequent
// crons); Vercel Cron sends exactly this header when CRON_SECRET is set.

// Both sides hashed first, so the comparison takes the same time whatever
// the length of what was sent.
function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) return false;
  const given = createHash("sha256").update(header).digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(given, expected);
}

export const GET = handler(async (request) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) throw new HttpError(404, "not-found");
  if (!bearerMatches(request.headers.get("authorization"), secret)) throw new HttpError(401, "unauthorized");
  const result = await deliverOutbox(AUTOMATIC_RUN);
  return json({ ok: true, result });
});
