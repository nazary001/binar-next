import { BatchEnvelope, ClientItem, rawId } from "@/server/integrations/bas/contract";
import { applyClients, clientKeys } from "@/server/integrations/bas/apply/clients";
import { runBatch } from "@/server/integrations/bas/batch";
import { basHandler } from "@/server/integrations/bas/handler";

// PUT /api/integrations/bas/v1/clients [bas:write, acceptClients]
// { batchId, mode?, items: [{ externalId, name, ..., counterparties: [{ ..., contracts: [...] }] }] }
export const maxDuration = 60;

export const PUT = basHandler("bas:write", "clients", async (call) => {
  const envelope = await call.body(BatchEnvelope);
  return runBatch(call, {
    entity: "clients",
    envelope,
    item: ClientItem,
    idOf: (item) => item.externalId,
    rawIdOf: (raw) => rawId(raw, ["externalId"]),
    keysOf: clientKeys,
    apply: (items) => applyClients(items, envelope.mode),
  });
});
