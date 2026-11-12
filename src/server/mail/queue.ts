import "server-only";
import type { OutboxKind } from "@/components/admin/mail/types";
import { getSettings, type SettingsOf } from "../admin/settings";
import { collection } from "../db/collections";
import { newId } from "../ids";
import { mailStatusOf } from "./provider";

// Writing messages to the outbox, and getting them out at once.
//
//   const id = await queueMail("lead", inbox, payload);   // null = switched off
//
// queueMail writes a message the way src/server/outbox.ts does, plus what
// the mail settings decide about notices, and answers its id (null when the
// settings switch that notice off):
// - "lead": only with notifyNewLead;
// - "order-placed" with payload.audience "staff": only with notifyNewOrder;
// - "order-placed" with payload.audience "customer": only with
//   confirmOrderToCustomer.
// Every other message is always written.
//
// A written message is tried right after the response of the request that
// wrote it (deliverSoon: next/server `after`), when a provider is
// configured; the request itself never waits for the provider. Without a
// provider nothing is attempted. Run from a script (the seed, the CLI, the
// audit helpers under tsx) nothing is scheduled either: the message simply
// waits for the next run of the mailer (a panel page polling
// /api/admin/nav-counts, or /api/cron/outbox).
//
// No static next/* import here: this module runs under plain Node too.
// The `after` call lives in ./schedule, loaded only inside the Next server.

type MailSettings = SettingsOf<"mail">;

// Inserts one message as it is; answers its id.
export async function storeMessage(
  kind: OutboxKind,
  to: string,
  payload: Record<string, unknown>,
  options: { expiresAt?: Date } = {},
): Promise<string> {
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

// Schedules the delivery of messages just written, once the current
// response is sent. True when it was scheduled. Never throws: the message
// is stored already, and a run of the mailer picks it up if this fails.
export async function deliverSoon(ids: readonly string[], settings?: MailSettings): Promise<boolean> {
  // Next defines NEXT_RUNTIME in its server bundles only; a script has no
  // response to wait for and no `after` to call.
  if (ids.length === 0 || !process.env.NEXT_RUNTIME) return false;
  try {
    const mail = settings ?? (await getSettings("mail"));
    if (!mailStatusOf(mail).configured) return false;
    const { deliverAfterResponse } = await import("./schedule");
    return deliverAfterResponse({ ids: [...ids] });
  } catch (error) {
    console.error("[mail] scheduling the delivery failed:", error);
    return false;
  }
}

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
  const id = await storeMessage(kind, to, payload, options);
  await deliverSoon([id], mail);
  return id;
}
