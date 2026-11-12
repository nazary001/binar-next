import { DocumentItem, DocumentsEnvelope, rawId } from "@/server/integrations/bas/contract";
import { applyDocuments, documentRowId } from "@/server/integrations/bas/apply/documents";
import { runBatch } from "@/server/integrations/bas/batch";
import { basHandler } from "@/server/integrations/bas/handler";

// PUT /api/integrations/bas/v1/documents [bas:write, acceptDocuments]
// { batchId, items: [{ orderNumber | orderExternalId, externalId, type, title, date, pdf: { base64 } }] }
// At most 20 items; the whole body at most 4 MB.
export const maxDuration = 60;

export const PUT = basHandler("bas:write", "documents", async (call) =>
  runBatch(call, {
    entity: "documents",
    envelope: await call.body(DocumentsEnvelope),
    item: DocumentItem,
    idOf: documentRowId,
    rawIdOf: (raw) => rawId(raw, ["externalId"]),
    apply: (items) => applyDocuments(items, call.actor),
  }),
);
