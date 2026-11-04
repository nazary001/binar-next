"use client";

import { Button } from "@/components/ui/Button";
import { DocumentTile, Modal718, ModalActions, ModalMeta } from "@/components/platform/ui";
import { formatDate, formatSize, type OrderDocument } from "./data";

// «Документи замовлення» - Figma frame 4990:76234, card 4990:76237
// (718 x 676 over the scrim): Caption/Large title + close, «№48291037 ·
// 12.04.2025», the slot of 598 x 100 document tiles 24 apart (ready
// ones with eye + download, the pending «Надходження на рахунок» /
// «З'явиться після оплати»), then the full-width accent Button/Large
// «Завантажити усі документи» (598 x 52).

export function openDocument(doc: OrderDocument) {
  window.open(doc.href, "_blank", "noopener");
}

// Starts one download per ready document (the placeholder files share
// one URL until the CRM serves real PDFs).
export function downloadAll(docs: OrderDocument[]) {
  docs
    .filter((d) => d.ready)
    .forEach((d) => {
      const a = document.createElement("a");
      a.href = d.href;
      a.download = `${d.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
}

export function documentMeta(doc: OrderDocument): string[] {
  return [formatDate(doc.date), formatSize(doc.sizeMb), doc.format];
}

// One document of an order or a return as the shared DocumentTile (ready
// = eye + download, else the pending note), used by the modal and by the
// details pages' documents card.
export function OrderDocumentTile({ doc }: { doc: OrderDocument }) {
  return (
    <DocumentTile
      name={doc.title}
      meta={documentMeta(doc)}
      pending={doc.ready ? false : (doc.pendingNote ?? true)}
      href={doc.ready ? doc.href : undefined}
      downloadName={`${doc.title}.pdf`}
      onPreview={doc.ready ? () => openDocument(doc) : undefined}
    />
  );
}

export function DocumentsModal({
  open,
  onClose,
  title = "Документи замовлення",
  number,
  date,
  documents,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  number: string;
  date: string;
  documents: OrderDocument[];
}) {
  return (
    <Modal718
      open={open}
      onClose={onClose}
      title={title}
      description={<ModalMeta parts={[`№${number}`, formatDate(date)]} />}
      actions={
        <ModalActions>
          <Button
            variant="accent"
            fullWidth
            disabled={!documents.some((d) => d.ready)}
            onClick={() => downloadAll(documents)}
          >
            Завантажити усі документи
          </Button>
        </ModalActions>
      }
    >
      {documents.map((doc) => (
        <OrderDocumentTile key={doc.id} doc={doc} />
      ))}
    </Modal718>
  );
}
