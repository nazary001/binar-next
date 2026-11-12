import "server-only";
import type { OutboxKind } from "@/components/admin/mail/types";
import { getSettings } from "../admin/settings";
import { collection } from "../db/collections";
import { newId } from "../ids";

// Writes a message to the outbox the way src/server/outbox.ts does, plus
// what the mail settings decide about notices, and answers its id (null
// when the settings switch that notice off):
// - "lead": only with notifyNewLead;
// - "order-placed" with payload.audience "staff": only with notifyNewOrder;
// - "order-placed" with payload.audience "customer": only with
//   confirmOrderToCustomer.
// Every other message is always written. The mailer (deliver.ts) sends it
// on its next run; a flow that wants it out at once passes the id to
// deliverOutbox({ ids: [id] }) inside after().

export async function queueMail(
  kind: OutboxKind,
  to: string,
  payload: Record<string, unknown>,
  options: { expiresAt?: Date } = {},
): Promise<string | null> {
  const mail = await getSettings("mail");
  if (kind === "lead" && !mail.notifyNewLead) return null;
  if (kind === "order-placed") {
    if (payload.audience === "staff" && !mail.notifyNewOrder) return null;
    if (payload.audience === "customer" && !mail.confirmOrderToCustomer) return null;
  }
  const id = newId("msg");
  await (await collection("outbox")).insertOne({
    _id: id,
    kind,
    to: to.slice(0, 320),
    payload,
    createdAt: new Date(),
    sentAt: null,
    ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}),
  });
  return id;
}
