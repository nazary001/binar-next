import "server-only";
import { createHash } from "node:crypto";
import type { Collection } from "mongodb";
import { mediaRef, parseMediaRef } from "@/components/admin/media/types";
import { BAS_LIMITS } from "@/components/admin/integrations/types";
import {
  collection,
  type Actor,
  type OrderDoc,
  type OrderDocumentDoc,
  type OrderHistoryEntry,
} from "../../../db/collections";
import { deleteMedia, saveMedia } from "../../../media/store";
import type { DocumentInput } from "../contract";
import { failed, guarded, ok, type ApplyResult, type Outcome } from "../batch";

// PUT /documents: printed forms of BAS (invoices, waybills, acts,
// reconciliation statements) for the site's orders, partner and shop
// orders alike. The PDF is stored as a private media file (folder
// "orders"; only routes that check the caller serve it) and listed among
// the order's documents as "media:<id>", with the GUID of BAS (externalId)
// and the kind of paper on the tile. The same externalId again replaces
// the earlier file on the same tile: the tile is found by its externalId,
// or, for a tile written before the field existed, by the id derived from
// the GUID ("bas-<hash>").

const TYPE_LABELS: Record<DocumentInput["type"], string> = {
  invoice: "рахунок",
  waybill: "видаткова накладна",
  act: "акт",
  reconciliation: "акт звірки",
  other: "документ",
};

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// A stable order-document id for a BAS document: zId-safe whatever the
// GUID looks like.
export function documentIdOf(externalId: string): string {
  return `bas-${createHash("sha256").update(externalId).digest("hex").slice(0, 16)}`;
}

export function documentRowId(item: Pick<DocumentInput, "externalId">): string {
  return item.externalId;
}

function decodePdf(base64: string): Buffer | string {
  const compact = base64.replace(/\s+/g, "");
  if (compact.length % 4 !== 0 || !BASE64.test(compact)) return "pdf: not valid base64";
  const bytes = Buffer.from(compact, "base64");
  if (bytes.byteLength > BAS_LIMITS.pdfBytes) return `pdf: larger than ${BAS_LIMITS.pdfBytes} bytes`;
  // Decided by the content, never by a name: a PDF starts with "%PDF-".
  if (bytes.byteLength < 8 || bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return "pdf: not a PDF file";
  return bytes;
}

function fileName(title: string): string {
  const base = title.replace(/[\\/:*?"<>|\x00-\x1f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 150);
  return `${base || "document"}.pdf`;
}

// The tile of this BAS document on the order, if it has one already.
function existingTile(documents: OrderDocumentDoc[], externalId: string): OrderDocumentDoc | null {
  const legacyId = documentIdOf(externalId);
  return (
    documents.find((doc) => doc.externalId === externalId) ??
    documents.find((doc) => !doc.externalId && doc.id === legacyId) ??
    null
  );
}

async function applyOne(item: DocumentInput, actor: Actor, orders: Collection<OrderDoc>): Promise<Outcome> {
  const order = item.orderNumber
    ? await orders.findOne({ _id: item.orderNumber })
    : await orders.findOne({ "erp.externalId": item.orderExternalId });
  if (!order) return failed("unknown-order");

  const bytes = decodePdf(item.pdf.base64);
  if (typeof bytes === "string") return failed(bytes);

  const media = await saveMedia(new Uint8Array(bytes), {
    kind: "file",
    filename: fileName(item.title),
    contentType: "application/pdf",
    width: null,
    height: null,
    folder: "orders",
    access: "private",
    alt: "",
    createdBy: null,
  });

  const previous = existingTile(order.documents ?? [], item.externalId);
  // A replaced tile keeps its id, so a link the cabinet already shows
  // keeps working.
  const id = previous?.id ?? documentIdOf(item.externalId);
  const document: OrderDocumentDoc = {
    id,
    title: item.title,
    // zRequiredBasDate never lets null through.
    date: item.date!.day,
    sizeMb: Math.max(0.1, Math.round((bytes.byteLength / (1024 * 1024)) * 10) / 10),
    format: "PDF",
    ready: true,
    file: mediaRef(media._id),
    externalId: item.externalId,
    kind: item.type,
  };
  if (
    previous &&
    previous.file === document.file &&
    previous.title === document.title &&
    previous.date === document.date &&
    previous.ready &&
    previous.externalId === document.externalId &&
    previous.kind === document.kind
  ) {
    return ok("unchanged");
  }

  const now = new Date();
  const entry: OrderHistoryEntry = {
    at: now,
    by: actor,
    type: "document",
    to: item.title,
    text: `${previous ? "Оновлено" : "Додано"} ${TYPE_LABELS[item.type]} від BAS: «${item.title}»`,
  };
  const result = previous
    ? await orders.updateOne(
        { _id: order._id, "documents.id": id },
        { $set: { "documents.$": document, updatedAt: now }, $push: { history: entry }, $unset: { seed: "" } },
      )
    : await orders.updateOne(
        { _id: order._id, "documents.id": { $ne: id } },
        { $push: { documents: document, history: entry }, $set: { updatedAt: now }, $unset: { seed: "" } },
      );
  if (!result.matchedCount) return failed("conflict: the order changed meanwhile, retry");

  // The replaced file goes when nothing else points at it (saveMedia
  // reuses one record for identical bytes, so another order may).
  const oldMedia = previous ? parseMediaRef(previous.file) : null;
  if (oldMedia && oldMedia !== media._id) {
    const ref = mediaRef(oldMedia);
    const [inOrders, inMaterials] = await Promise.all([
      orders.countDocuments({ "documents.file": ref }),
      (await collection("materialFiles")).countDocuments({ storagePath: ref }),
    ]);
    if (inOrders === 0 && inMaterials === 0) await deleteMedia(oldMedia);
  }
  return ok(previous ? "updated" : "created");
}

export async function applyDocuments(items: DocumentInput[], actor: Actor): Promise<ApplyResult> {
  const orders = await collection("orders");
  // One at a time: each item holds a whole PDF in memory.
  const outcomes: Outcome[] = [];
  for (const item of items) outcomes.push(await guarded("document", () => applyOne(item, actor, orders)));
  return { outcomes };
}
