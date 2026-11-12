import "server-only";
import type { NpContact, NpSender } from "@/components/admin/shipping/types";
import type { Actor } from "@/server/db/collections";
import { npCall, npString } from "./client";
import { NpError } from "./errors";

// Who sends the parcels: the counterparties of the key's own business
// cabinet ("Sender") and their contact persons. Both need the key; the
// settings screen fills the sender profile from them.

type CounterpartyRow = {
  Ref?: unknown;
  Description?: unknown;
  CityDescription?: unknown;
  City?: unknown;
  EDRPOU?: unknown;
  CounterpartyType?: unknown;
};

type ContactRow = { Ref?: unknown; Description?: unknown; Phones?: unknown; Email?: unknown };

function toSender(row: CounterpartyRow): NpSender {
  return {
    ref: npString(row.Ref),
    name: npString(row.Description),
    city: npString(row.CityDescription) || npString(row.City),
    edrpou: npString(row.EDRPOU),
    type: npString(row.CounterpartyType),
  };
}

async function senders(apiKey: string | undefined, actor: Actor | null): Promise<NpSender[]> {
  const { data } = await npCall<CounterpartyRow>(
    "Counterparty",
    "getCounterparties",
    { CounterpartyProperty: "Sender", Page: "1" },
    { ...(apiKey !== undefined ? { apiKey } : { key: "required" as const }), entity: "sender", actor },
  );
  return data.map(toSender).filter((sender) => sender.ref !== "");
}

export async function listSenders(actor: Actor | null = null): Promise<NpSender[]> {
  return senders(undefined, actor);
}

export async function listSenderContacts(counterpartyRef: string, actor: Actor | null = null): Promise<NpContact[]> {
  const { data } = await npCall<ContactRow>(
    "Counterparty",
    "getCounterpartyContactPersons",
    { Ref: counterpartyRef, Page: "1" },
    { key: "required", entity: "sender", actor },
  );
  return data
    .map(
      (row): NpContact => ({
        ref: npString(row.Ref),
        name: npString(row.Description),
        phones: npString(row.Phones),
        email: npString(row.Email),
      }),
    )
    .filter((contact) => contact.ref !== "");
}

export type KeyTest = { valid: boolean; senders: NpSender[]; message?: string };

// Proves a key works: the carrier lists the key's own senders only for a
// valid key. `key` is a key being typed in; without it the stored one is
// tested (a not-configured error when there is none). A refusal is an
// answer ("not valid", with the carrier's wording); a transport failure is
// thrown, because then nothing is known about the key.
export async function testKey(key?: string, actor: Actor | null = null): Promise<KeyTest> {
  try {
    const list = await senders(key, actor);
    return { valid: true, senders: list };
  } catch (error) {
    if (error instanceof NpError && (error.kind === "auth" || error.kind === "api" || error.kind === "validation")) {
      return { valid: false, senders: [], message: error.message };
    }
    throw error;
  }
}
