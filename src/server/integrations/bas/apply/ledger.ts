import "server-only";
import { collection, type LedgerEntryDoc } from "../../../db/collections";
import { HttpError } from "../../../http";
import { newId } from "../../../ids";
import type { LedgerEnvelopeBody, LedgerInput } from "../contract";
import { failed, guarded, mapPool, ok, type ApplyResult } from "../batch";
import { kyivMidnight } from "../values";

// PUT /ledger: the settlements of one contract as BAS reports them (the
// lines of a reconciliation act): opening balance, orders, invoices,
// payments, returns, each raising (plus) or lowering (minus) the debt.
//
// Entries are upserted by their GUID. replace: true first removes the
// contract's entries dated from `from` (all of them without it) that the
// batch does not carry, so BAS can resend a period whole. orderNumber
// links an entry to a site order of the same company when there is one.

const CONCURRENCY = 6;

export type LedgerTarget = { clientId: string; counterpartyId: string; contractId: string; contractNumber: string };

// The contract a ledger batch is about. Unknown = the whole request is
// refused (404, not stored), so BAS can push its clients and repeat it.
export async function ledgerTarget(contractExternalId: string): Promise<LedgerTarget> {
  const cp = await (await collection("counterparties")).findOne(
    { "contracts.externalId": contractExternalId },
    { projection: { clientId: 1, contracts: 1 } },
  );
  const contract = cp?.contracts.find((c) => c.externalId === contractExternalId);
  if (!cp || !contract) {
    throw new HttpError(404, "not-found", { entity: "contract", externalId: contractExternalId });
  }
  return { clientId: cp.clientId, counterpartyId: cp._id, contractId: contract.id, contractNumber: contract.number };
}

export async function applyLedger(
  items: LedgerInput[],
  envelope: LedgerEnvelopeBody,
  target: LedgerTarget,
): Promise<ApplyResult & { removed: number }> {
  const ledger = await collection("ledger");
  let removed = 0;
  if (envelope.replace) {
    const filter: Record<string, unknown> = {
      contractId: target.contractId,
      externalId: { $nin: items.map((item) => item.externalId) },
    };
    if (envelope.from) filter.docDate = { $gte: kyivMidnight(envelope.from) };
    removed = (await ledger.deleteMany(filter)).deletedCount;
  }

  const numbers = [...new Set(items.flatMap((item) => (item.orderNumber ? [item.orderNumber] : [])))];
  const orders = numbers.length
    ? await (await collection("orders"))
        .find({ _id: { $in: numbers }, clientId: target.clientId }, { projection: { _id: 1 } })
        .toArray()
    : [];
  const known = new Set(orders.map((order) => order._id));

  const outcomes = await mapPool(items, CONCURRENCY, (item) =>
    guarded("ledger", async () => {
      const fields: Omit<LedgerEntryDoc, "_id" | "createdAt"> = {
        clientId: target.clientId,
        counterpartyId: target.counterpartyId,
        contractId: target.contractId,
        orderId: item.orderNumber && known.has(item.orderNumber) ? item.orderNumber : null,
        externalId: item.externalId,
        docType: item.docType,
        docNumber: item.docNumber,
        // zRequiredBasDate never lets null through.
        docDate: item.docDate!.at,
        amount: item.amount,
        impact: item.impact,
      };
      const result = await ledger.updateOne(
        { externalId: item.externalId },
        { $set: fields, $setOnInsert: { _id: newId("lg"), createdAt: new Date() } },
        { upsert: true },
      );
      if (result.upsertedCount) return ok("created");
      if (result.modifiedCount) return ok("updated");
      return result.matchedCount ? ok("unchanged") : failed("not stored");
    }),
  );
  return { outcomes, removed };
}
