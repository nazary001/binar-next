import "server-only";
import { collection, type OutboxDoc } from "./db/collections";
import { newId } from "./ids";

// No mail or SMS provider is connected yet. Messages the site should send
// (password reset links, employee invitations, "a lead came in" notices) are
// written here; a mailer can later deliver every document whose `sentAt` is
// null and stamp it.
export async function enqueueMessage(
  kind: OutboxDoc["kind"],
  to: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const outbox = await collection("outbox");
  await outbox.insertOne({
    _id: newId("msg"),
    kind,
    to: to.slice(0, 320),
    payload,
    createdAt: new Date(),
    sentAt: null,
  });
}
