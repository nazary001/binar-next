import { LedgerEnvelope, LedgerItem, rawId } from "@/server/integrations/bas/contract";
import { applyLedger, ledgerTarget, type LedgerTarget } from "@/server/integrations/bas/apply/ledger";
import { replayedAnswer, runBatch } from "@/server/integrations/bas/batch";
import { basHandler } from "@/server/integrations/bas/handler";

// PUT /api/integrations/bas/v1/ledger [bas:write, acceptLedger]
// { batchId, contractExternalId, from?, replace?, items: [{ externalId, docType, docNumber, docDate, amount, impact, orderNumber? }] }
// An unknown contract refuses the whole request (404, nothing stored), so
// BAS can push its clients and repeat; a batch answered before gets that
// answer whatever happened to the contract since.
export const maxDuration = 60;

export const PUT = basHandler("bas:write", "ledger", async (call) => {
  const envelope = await call.body(LedgerEnvelope);
  let target: LedgerTarget | null = null;
  if (!(await replayedAnswer("ledger", envelope.batchId))) target = await ledgerTarget(envelope.contractExternalId);
  return runBatch(call, {
    entity: "ledger",
    envelope,
    item: LedgerItem,
    idOf: (item) => item.externalId,
    rawIdOf: (raw) => rawId(raw, ["externalId"]),
    apply: (items) => {
      if (!target) throw new Error("ledger batch applied without its contract");
      return applyLedger(items, envelope, target);
    },
  });
});
