"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import { Button, IconButton } from "./Button";
import { adminRoot, useClientReady, useModalLayer, usePresence } from "./overlay";
import { EASE_OUT, SCRIM, TEXT, Z } from "./tokens";

// A dialog over the page: a centred white card on the scrim from 640 px,
// a bottom sheet on phones.
//
//   const [open, setOpen] = useState(false);
//   <Modal
//     open={open}
//     onClose={() => setOpen(false)}
//     title="Змінити статус"
//     description="Клієнт побачить новий статус у кабінеті."
//     size="md"
//     busy={save.busy}
//     footer={<ModalFooter onCancel={() => setOpen(false)} confirmLabel="Зберегти зміни" form="status-form" busy={save.busy} />}
//   >
//     <form id="status-form" onSubmit={...}>...</form>
//   </Modal>
//
// Props
// - open, onClose: controlled; onClose runs on Escape, the cross and a
//   press on the scrim (unless closeOnScrim is false).
// - title: the heading (also the dialog's accessible name, unless
//   labelledBy names another element); description: a muted line under it.
// - size: card width from 640 px, sm 440 / md 560 (default) / lg 720 / xl 960.
// - footer: right-aligned actions (stacked full width on phones; the last
//   child is the primary one and sits on top there). ModalFooter below is
//   the usual Cancel / Confirm pair. A child with `min-[640px]:mr-auto`
//   moves to the left edge.
// - busy: a request is running; Escape, the scrim and the cross do nothing.
// - initialFocusRef: what gets focus on open. Without it focus goes to an
//   element marked `data-autofocus`, else the first field or button that
//   is not the cross.
// - role: "alertdialog" for confirmations that interrupt (ConfirmDialog).
// The card keeps showing its last content while it slides out, so the
// caller may clear the data the modal shows in the same onClose.

export type ModalSize = "sm" | "md" | "lg" | "xl";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  children?: ReactNode;
  closeOnScrim?: boolean;
  busy?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  labelledBy?: string;
  role?: "dialog" | "alertdialog";
  closeLabel?: string;
};

// Long enough for the phone sheet's slide (400 ms) and the desktop fade.
const EXIT_MS = 400;

const WIDTH: Record<ModalSize, string> = {
  sm: "min-[640px]:max-w-[440px]",
  md: "min-[640px]:max-w-[560px]",
  lg: "min-[640px]:max-w-[720px]",
  xl: "min-[640px]:max-w-[960px]",
};

// Inner padding: 20 on phones, 24 for the narrow cards, 32 for the wide.
const PAD_X: Record<ModalSize, string> = {
  sm: "px-5 min-[640px]:px-6",
  md: "px-5 min-[640px]:px-6",
  lg: "px-5 min-[640px]:px-8",
  xl: "px-5 min-[640px]:px-8",
};
const PAD_TOP: Record<ModalSize, string> = {
  sm: "pt-5 min-[640px]:pt-6",
  md: "pt-5 min-[640px]:pt-6",
  lg: "pt-5 min-[640px]:pt-8",
  xl: "pt-5 min-[640px]:pt-8",
};
const PAD_BOTTOM: Record<ModalSize, string> = {
  sm: "pb-[max(20px,env(safe-area-inset-bottom))] min-[640px]:pb-6",
  md: "pb-[max(20px,env(safe-area-inset-bottom))] min-[640px]:pb-6",
  lg: "pb-[max(20px,env(safe-area-inset-bottom))] min-[640px]:pb-8",
  xl: "pb-[max(20px,env(safe-area-inset-bottom))] min-[640px]:pb-8",
};

const WRAPPER = "fixed inset-0 flex items-end justify-center outline-none min-[640px]:items-center min-[640px]:p-6";

const SCRIM_LAYER = "absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none starting:opacity-0";

// Phones: a sheet that slides up (400 ms). From 640: a card that fades in
// and rises 12 px (300 ms). Both with the panel's ease-out.
const CARD =
  "relative flex max-h-[calc(100dvh-16px)] w-full flex-col overflow-hidden rounded-t-[28px] bg-white " +
  "transition-[opacity,translate,scale] duration-[400ms] motion-reduce:transition-none " +
  "min-[640px]:max-h-[calc(100dvh-48px)] min-[640px]:rounded-[32px] min-[640px]:duration-300 " +
  "starting:translate-y-full min-[640px]:starting:translate-y-3 min-[640px]:starting:scale-[0.98] min-[640px]:starting:opacity-0";
const CARD_OPEN = "translate-y-0 min-[640px]:scale-100 min-[640px]:opacity-100";
const CARD_CLOSED = "translate-y-full min-[640px]:translate-y-3 min-[640px]:scale-[0.98] min-[640px]:opacity-0";

// A hairline above the footer appears while the body scrolls under it
// (data-scrolls, set by the effect in Modal).
const FOOTER =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-transparent pt-4 data-[scrolls]:border-stroke-subtle [&>*]:w-full " +
  "min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-end min-[640px]:gap-3 min-[640px]:[&>*]:w-auto";

type Content = { title: ReactNode; description: ReactNode; footer: ReactNode; children: ReactNode };

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
  closeOnScrim = true,
  busy = false,
  initialFocusRef,
  labelledBy,
  role = "dialog",
  closeLabel = "Закрити",
}: ModalProps) {
  const box = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const ready = useClientReady();
  const mounted = usePresence(open, EXIT_MS);
  useModalLayer(open, { onClose, containerRef: box, initialFocusRef, locked: busy });

  // The content of the last open render, shown while the card slides out.
  const [kept, setKept] = useState<Content>(() => ({ title, description, footer, children }));
  if (
    open &&
    (kept.title !== title || kept.description !== description || kept.footer !== footer || kept.children !== children)
  ) {
    setKept({ title, description, footer, children });
  }
  const shown: Content = open ? { title, description, footer, children } : kept;

  // Marks the footer while the body is taller than its box. Written to the
  // DOM, not to state: it changes with every resize of the content.
  useEffect(() => {
    const body = bodyRef.current;
    const foot = footerRef.current;
    if (!open || !ready || !body || !foot) return;
    const update = () => foot.toggleAttribute("data-scrolls", body.scrollHeight > body.clientHeight + 1);
    const observer = new ResizeObserver(update);
    observer.observe(body);
    for (const child of body.children) observer.observe(child);
    update();
    return () => observer.disconnect();
  }, [open, ready]);

  if (!ready || !mounted) return null;

  const hasBody = shown.children !== null && shown.children !== undefined && shown.children !== false;

  return createPortal(
    <div
      ref={box}
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy ?? titleId}
      aria-describedby={shown.description ? descriptionId : undefined}
      tabIndex={-1}
      data-admin-layer=""
      inert={!open}
      className={cx(WRAPPER, Z.modal, !open && "pointer-events-none")}
    >
      <div
        aria-hidden
        className={cx(SCRIM_LAYER, SCRIM, open ? "opacity-100" : "opacity-0")}
        onClick={closeOnScrim && !busy ? onClose : undefined}
      />
      <div aria-busy={busy || undefined} className={cx(CARD, EASE_OUT, WIDTH[size], open ? CARD_OPEN : CARD_CLOSED)}>
        <div className={cx("flex shrink-0 items-start gap-4", PAD_X[size], PAD_TOP[size], hasBody ? "pb-4" : "pb-2")}>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className={TEXT.sectionTitle}>
              {shown.title}
            </h2>
            {shown.description && (
              <p id={descriptionId} className={cx(TEXT.muted, "mt-1.5")}>
                {shown.description}
              </p>
            )}
          </div>
          {/* data-no-autofocus: focus never lands on the cross on open. */}
          <span data-no-autofocus="" className="-mr-2 -mt-2 flex shrink-0">
            <IconButton label={closeLabel} icon={XMarkIcon} disabled={busy} onClick={onClose} />
          </span>
        </div>

        {hasBody && (
          // pt-1 leaves room for the focus ring of a field at the very top.
          <div
            ref={bodyRef}
            className={cx(
              "admin-scroll min-h-0 flex-1 overflow-y-auto pt-1",
              PAD_X[size],
              shown.footer ? "pb-1" : PAD_BOTTOM[size],
            )}
          >
            {shown.children}
          </div>
        )}

        {shown.footer && (
          <div ref={footerRef} className={cx(FOOTER, PAD_X[size], PAD_BOTTOM[size])}>
            {shown.footer}
          </div>
        )}
      </div>
    </div>,
    adminRoot(),
  );
}

// --- Footer buttons ----------------------------------------------------------

// The usual pair of a dialog footer, drawn with the kit's Button (secondary
// Cancel, primary or danger Confirm).
//
//   footer={<ModalFooter onCancel={close} onConfirm={save} confirmLabel="Зберегти зміни" busy={busy} />}
//   footer={<ModalFooter onCancel={close} confirmLabel="Створити" form="new-product" />}   // submits the form
//   footer={<ModalFooter onCancel={close} onConfirm={remove} confirmLabel="Видалити" tone="danger" />}
//
// - confirmLabel says what happens ("Зберегти зміни", "Відхилити").
// - form: the id of a <form> in the body; the confirm button submits it,
//   so Enter in a field and the button do the same thing.
// - busy: the confirm shows a spinner and ignores presses; it stays
//   focusable (a disabled button would drop the focus out of the dialog).
// - confirmDisabled: the confirm cannot be pressed (a required field is empty).
export type ModalFooterProps = {
  confirmLabel: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  confirmDisabled?: boolean;
  form?: string;
  confirmRef?: Ref<HTMLButtonElement>;
};

export function ModalFooter({
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel = "Скасувати",
  tone = "default",
  busy = false,
  confirmDisabled = false,
  form,
  confirmRef,
}: ModalFooterProps) {
  return (
    <>
      {onCancel && (
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      {/* Busy: the kit's loading button (spinner over the label, presses and
          submits ignored, still focusable). */}
      <Button
        ref={confirmRef}
        variant={tone === "danger" ? "danger" : "primary"}
        type={form ? "submit" : "button"}
        form={form}
        disabled={confirmDisabled}
        loading={busy}
        onClick={onConfirm ? () => onConfirm() : undefined}
      >
        {confirmLabel}
      </Button>
    </>
  );
}
