import "server-only";
import type { OutboxDoc } from "./db/collections";
import { deliverSoon, storeMessage } from "./mail/queue";

// Messages the site sends (password reset links, employee invitations,
// "a lead came in" notices, order statuses) are written here and answered
// with their id. When a mail provider is set up in the panel, the message
// is sent right after the response of the request that wrote it (the
// request never waits for it); without one it waits in the outbox, where
// the panel shows it (src/server/mail). Notices the mail settings may
// switch off ("lead", "order-placed") go through queueMail
// (src/server/mail/queue.ts) instead.
export async function enqueueMessage(
  kind: OutboxDoc["kind"],
  to: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const id = await storeMessage(kind, to, payload);
  await deliverSoon([id]);
  return id;
}
