"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal718, ModalActions } from "./Modal718";

// «Confirmation modal» - Figma 4929:66214, card 4929:66257 (718 x 316):
// Caption/Large question «Видалити [назва/об’єкт]?», Body/Large 20/28
// explanation «Ви впевнені, що хочете видалити [назва/об’єкт]? Цю дію
// неможливо скасувати.», then two 283 x 52 Button/Large 32 px apart:
// «Скасувати» (outlined #343435) and «Підтвердити» (solid #1d1d1f).
// Built on Modal718 (overlay, focus trap, height fit).
export type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  body?: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  // The cancel-order modal 4994:79346 uses the accent fill for its
  // destructive action; the confirmation master uses black.
  confirmVariant?: "solid" | "accent";
  // Disables the confirm button (e.g. while a request runs).
  busy?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  cancelLabel = "Скасувати",
  confirmLabel = "Підтвердити",
  confirmVariant = "solid",
  busy = false,
}: ConfirmModalProps) {
  return (
    <Modal718
      open={open}
      onClose={onClose}
      title={title}
      description={body}
      actions={
        <ModalActions>
          <Button variant="outlinedDark" fullWidth onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} fullWidth onClick={onConfirm} disabled={busy} disabledStyle="solid">
            {confirmLabel}
          </Button>
        </ModalActions>
      }
    />
  );
}
