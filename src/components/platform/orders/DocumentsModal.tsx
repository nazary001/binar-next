"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { DocumentRow, DocumentRowList, DocumentTile, Modal718, ModalActions, ModalMeta } from "@/components/platform/ui";
import { formatDate, formatSize, type OrderDocument } from "./data";

const COPY = {
  title: "Документи замовлення",
  downloadAll: "Завантажити усі документи",
  // Phones: the long label does not fit the 224-px card pill at 320.
  downloadAllShort: "Завантажити все",
} as const;

// «Документи замовлення» - Figma frame 4990:76234, card 4990:76237
// (718 x 676 over the scrim): Caption/Large title + close, «№48291037 ·
// 12.04.2025», the slot of 598 x 100 document tiles 24 apart (ready
// ones with eye + download, the pending «Надходження на рахунок» /
// «З'явиться після оплати»), then the full-width accent Button/Large
// «Завантажити усі документи» (598 x 52).
// Phones (< 640, orders-list spec 2.10, system spec A6 / A16): the D7
// short card of Modal718; the tiles give way to DocumentRow lines (48
// tile, name up to 3 lines, 44 download target, 1-px lines between) and
// the pill carries the short label.

export function openDocument(doc: OrderDocument) {
  window.open(doc.href, "_blank", "noopener");
}

// Starts one download per ready document (the placeholder files share
// one URL until the CRM serves real PDFs). The clicks are 250 ms apart:
// Chrome on Android asks once and then takes them all (orders-list 2.10).
export function downloadAll(docs: OrderDocument[]) {
  docs
    .filter((d) => d.ready)
    .forEach((d, i) => {
      window.setTimeout(() => {
        const a = document.createElement("a");
        a.href = d.href;
        a.download = `${d.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 250);
    });
}

export function documentMeta(doc: OrderDocument): string[] {
  return [formatDate(doc.date), formatSize(doc.sizeMb), doc.format];
}

// One document of an order or a return as the shared DocumentTile (ready
// = eye + download, else the pending note), used by the modal and by the
// details pages' documents card.
export function OrderDocumentTile({ doc, className }: { doc: OrderDocument; className?: string }) {
  return (
    <DocumentTile
      name={doc.title}
      meta={documentMeta(doc)}
      pending={doc.ready ? false : (doc.pendingNote ?? true)}
      href={doc.ready ? doc.href : undefined}
      downloadName={`${doc.title}.pdf`}
      onPreview={doc.ready ? () => openDocument(doc) : undefined}
      className={className}
    />
  );
}

// The phone twin (system spec A16): the same document as a DocumentRow
// line; lists wrap the rows in DocumentRowList.
export function OrderDocumentRow({ doc, className }: { doc: OrderDocument; className?: string }) {
  return (
    <DocumentRow
      name={doc.title}
      meta={documentMeta(doc)}
      pending={doc.ready ? false : (doc.pendingNote ?? true)}
      href={doc.ready ? doc.href : undefined}
      downloadName={`${doc.title}.pdf`}
      onPreview={doc.ready ? () => openDocument(doc) : undefined}
      className={className}
    />
  );
}

export function DocumentsModal({
  open,
  onClose,
  title = COPY.title,
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
  // A route change from inside the dialog closes it (DECISIONS round 4).
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (open) onCloseRef.current();
  }, [pathname, open]);

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
            <span className="lg:hidden">{COPY.downloadAllShort}</span>
            <span className="max-lg:hidden">{COPY.downloadAll}</span>
          </Button>
        </ModalActions>
      }
    >
      {documents.map((doc) => (
        <OrderDocumentTile key={doc.id} doc={doc} className="max-lg:hidden" />
      ))}
      <DocumentRowList className="lg:hidden">
        {documents.map((doc) => (
          <OrderDocumentRow key={doc.id} doc={doc} />
        ))}
      </DocumentRowList>
    </Modal718>
  );
}
