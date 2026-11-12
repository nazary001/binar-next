import "server-only";
import { collection, type Actor, type ExchangeLogDoc } from "@/server/db/collections";
import { newId } from "@/server/ids";

// The journal of the exchange with the carrier (collection exchange_log,
// system "nova-poshta"). One line per write call (Counterparty.save,
// Address.save, InternetDocument.save / delete) and per failure of any
// call. Never a request body, a key or a print address: only the method,
// the outcome, the carrier's message and the id of the record concerned.
// A failed journal write must not fail the call it describes.

const KEEP_MS = 90 * 24 * 60 * 60 * 1000;

export type NpLogEntry = {
  // "waybill", "counterparty", "address", "directory", "tracking", "label",
  // "estimate", "sender".
  entity: string;
  // "InternetDocument.save"
  action: string;
  status: "ok" | "error";
  durationMs: number;
  actor?: Actor | null;
  error?: string | null;
  // The record the call was about (an order id, a waybill number).
  subject?: string | null;
  created?: number;
  updated?: number;
};

export async function logNpExchange(entry: NpLogEntry): Promise<void> {
  const now = new Date();
  const failed = entry.status === "error";
  const doc: ExchangeLogDoc = {
    _id: newId("xlog"),
    at: now,
    system: "nova-poshta",
    direction: "out",
    entity: entry.entity.slice(0, 40),
    action: entry.action.slice(0, 80),
    status: entry.status,
    counts: {
      received: 1,
      created: entry.created ?? 0,
      updated: entry.updated ?? 0,
      unchanged: 0,
      failed: failed ? 1 : 0,
    },
    durationMs: Math.max(0, Math.round(entry.durationMs)),
    actor: entry.actor ?? null,
    batchId: null,
    error: entry.error ? entry.error.slice(0, 500) : null,
    details: entry.subject ? [{ id: entry.subject.slice(0, 64), error: (entry.error ?? "").slice(0, 300) }] : [],
    expiresAt: new Date(now.getTime() + KEEP_MS),
  };
  try {
    await (await collection("exchangeLog")).insertOne(doc);
  } catch (error) {
    console.error("[np] exchange log write failed:", (error as Error)?.name ?? "error");
  }
}
