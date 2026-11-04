"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/checkout/fields";
import { Modal718, ModalActions, ModalMeta, OrderStatusBadge, PaymentBadge } from "@/components/platform/ui";
import { CANCEL_REASONS, CANCEL_SOLUTIONS, cancelAsksSolution, formatDate, type Order } from "./data";
import { paymentKind } from "./payment";
import { SummaryLink, SummaryRow } from "./detailParts";
import { cancelOrder } from "./store";

// «Скасувати замовлення» - master 4994:79346 in section 5192:81030, four
// frames (all 718 wide on the Modal718 shell):
//   5192:81031 Нове / Заблоковано, «Очікується оплата»: one select;
//   5192:81095 Нове / Заблоковано, «Частково оплачено» (badge 182): the
//     master's default slot with both selects «Оберіть причину» +
//     «Бажане рішення» (card 574 -> 644);
//   5192:81053 / 5192:81074 В роботі (badge 94), unpaid / partly paid:
//     one select.
// Slot (gap 24): the info rows (gap 8, 38 each: Статус замовлення + badge,
// Створив замовлення, Контрагент, Статус оплати + payment badge), then
// the 598 x 46 «<TextField>» selects; actions «Повернутись» (outlined
// #343435) + «Скасувати замовлення» (accent), 283 x 52 each. «В роботі»
// sends a request the manager confirms (spec 5192:85059); Нове /
// Заблоковано cancel at once.
// The submit keeps the master's full accent look in the default state
// (5192:81052): it is aria-disabled until the form is complete, and a
// press on it flags the empty selects and focuses the first one (the
// PartnerContactForm pattern) instead of sitting there pale.
export function CancelOrderModal({
  order,
  open,
  onClose,
  request,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
  request: boolean;
}) {
  const [reason, setReason] = useState("");
  const [solution, setSolution] = useState("");
  const [attempted, setAttempted] = useState(false);
  const asksSolution = cancelAsksSolution(order);
  const valid = reason !== "" && (!asksSolution || solution !== "");
  const reasonError = attempted && reason === "" ? "Оберіть причину скасування" : undefined;
  const solutionError = attempted && asksSolution && solution === "" ? "Оберіть бажане рішення" : undefined;

  const close = () => {
    setReason("");
    setSolution("");
    setAttempted(false);
    onClose();
  };

  const submit = () => {
    if (!valid) {
      setAttempted(true);
      const first = reason === "" ? "cancel-reason" : "cancel-solution";
      document.querySelector<HTMLElement>(`[role=dialog] [name="${first}"]`)?.focus();
      return;
    }
    cancelOrder(order.id, { reason, solution: asksSolution ? solution : undefined, request });
    close();
  };

  return (
    <Modal718
      open={open}
      onClose={close}
      title="Скасувати замовлення"
      description={<ModalMeta parts={[`№${order.number}`, formatDate(order.date)]} />}
      actions={
        <ModalActions>
          <Button variant="outlinedDark" fullWidth onClick={close}>
            Повернутись
          </Button>
          <Button variant="accent" fullWidth aria-disabled={!valid} onClick={submit}>
            Скасувати замовлення
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-2">
        <SummaryRow label="Статус замовлення" info>
          <OrderStatusBadge status={order.status} />
        </SummaryRow>
        <SummaryRow label="Створив замовлення">
          <SummaryLink>{order.createdBy}</SummaryLink>
        </SummaryRow>
        <SummaryRow label="Контрагент">
          <SummaryLink clip>{order.counterparty}</SummaryLink>
        </SummaryRow>
        <SummaryRow label="Статус оплати" info>
          <PaymentBadge kind={paymentKind(order)} />
        </SummaryRow>
      </div>
      <div className="flex flex-col gap-6 [--field-surface:#fff]">
        <SelectField
          label="Оберіть причину"
          name="cancel-reason"
          value={reason}
          options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))}
          onChange={setReason}
          error={reasonError}
        />
        {asksSolution && (
          <SelectField
            label="Бажане рішення"
            name="cancel-solution"
            value={solution}
            options={CANCEL_SOLUTIONS.map((r) => ({ value: r, label: r }))}
            onChange={setSolution}
            error={solutionError}
          />
        )}
      </div>
    </Modal718>
  );
}
