import "server-only";
import type { MailSendResult } from "@/components/admin/mail/types";
import { collection, type Actor, type ExchangeLogDoc } from "../db/collections";
import { newId } from "../ids";

// Every delivery attempt of the mailer is one row of the exchange journal
// (system "mail"), next to the calls of the carrier and the ERP:
// - entity "message": a message of the outbox, `action` = its kind,
//   `batchId` = the message id (the panel lists a message's attempts by it);
// - entity "test": the panel's test message, `batchId` null.
// The row never holds the message itself, the recipient's data or a key.

const KEEP_MS = 90 * 24 * 60 * 60 * 1000;

export type MailLogInput = {
  entity: "message" | "test";
  action: string;
  messageId: string | null;
  result: MailSendResult;
  durationMs: number;
  actor: Actor | null;
};

// Writes the row and answers its id. A failed write must not undo the
// delivery it describes, so errors are logged and swallowed.
export async function logMailAttempt(input: MailLogInput): Promise<string> {
  const at = new Date();
  const ok = input.result.ok;
  const error = input.result.ok ? null : input.result.error.slice(0, 300);
  const doc: ExchangeLogDoc = {
    _id: newId("xlog"),
    at,
    system: "mail",
    direction: "out",
    entity: input.entity,
    action: input.action.slice(0, 80),
    status: ok ? "ok" : "error",
    counts: { received: 1, created: ok ? 1 : 0, updated: 0, unchanged: 0, failed: ok ? 0 : 1 },
    durationMs: Math.max(0, Math.round(input.durationMs)),
    actor: input.actor,
    batchId: input.messageId,
    error,
    details: error ? [{ id: input.messageId ?? "test", error }] : [],
    expiresAt: new Date(at.getTime() + KEEP_MS),
  };
  try {
    await (await collection("exchangeLog")).insertOne(doc);
  } catch (failure) {
    console.error("[mail] exchange log write failed:", failure);
  }
  return doc._id;
}
