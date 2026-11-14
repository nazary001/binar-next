"use client";

import { useState } from "react";
import { TIPS } from "@/components/catalog/tips";
import { Button } from "@/components/ui/Button";
import { RadioGroup } from "@/components/ui/ChoiceRow";
import { KeyValueList } from "@/components/ui/KeyValueList";
import { SheetDivider } from "@/components/ui/Sheet";
import { SelectField } from "@/components/checkout/fields";
import { Modal718, ModalActions, ModalMeta, OrderStatusBadge, PaymentBadge } from "@/components/platform/ui";
import { CANCEL_REASONS, CANCEL_SOLUTIONS, cancelAsksSolution, formatDate, type Order } from "./data";
import { paymentKind } from "./payment";
import { SummaryLink, SummaryRow } from "./detailParts";
import { cancelOrder } from "./store";

const COPY = {
  title: "Скасувати замовлення",
  shortTitle: "Скасування",
  author: "Створив замовлення",
  counterparty: "Контрагент",
  requestNote: "Замовлення вже в роботі: скасування підтвердить менеджер.",
  reason: "Оберіть причину",
  solution: "Бажане рішення",
  reasonError: "Оберіть причину скасування",
  solutionError: "Оберіть бажане рішення",
} as const;

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
// Phones (template T5h, DECISIONS round 4): the same dialog as the full-
// screen sheet (Modal718 phone="sheet"): meta, one badge row, the key /
// value rows (they wrap; nothing is clipped), the request note for «В
// роботі», then the reasons / solutions as ChoiceRow radios instead of
// the selects (no menu can open below the sheet edge); the two actions
// stack in the sheet footer. `onDone` runs after a valid submit (the page
// moves the focus to its title and shows the toast).
export function CancelOrderModal({
  order,
  open,
  onClose,
  request,
  onDone,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
  request: boolean;
  onDone?: (request: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [solution, setSolution] = useState("");
  const [attempted, setAttempted] = useState(false);
  const asksSolution = cancelAsksSolution(order);
  const valid = reason !== "" && (!asksSolution || solution !== "");
  const reasonError = attempted && reason === "" ? COPY.reasonError : undefined;
  const solutionError = attempted && asksSolution && solution === "" ? COPY.solutionError : undefined;

  const close = () => {
    setReason("");
    setSolution("");
    setAttempted(false);
    onClose();
  };

  const submit = () => {
    if (!valid) {
      setAttempted(true);
      // The desktop select or, on phones, the first radio of the group
      // (whichever of the two is rendered).
      const first = reason === "" ? "cancel-reason" : "cancel-solution";
      const target = [first, `${first}-choice`]
        .map((name) => document.querySelector<HTMLElement>(`[role=dialog] [name="${name}"]`))
        .find((el) => el && el.getClientRects().length > 0);
      // A phone radio group comes into view whole (its error sits under
      // the last row).
      const group = target?.closest<HTMLElement>('[role="radiogroup"]');
      group?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: Boolean(group) });
      return;
    }
    cancelOrder(order.id, { reason, solution: asksSolution ? solution : undefined, request });
    close();
    onDone?.(request);
  };

  return (
    <Modal718
      open={open}
      onClose={close}
      title={COPY.title}
      phone="sheet"
      shortTitle={COPY.shortTitle}
      description={<ModalMeta parts={[`№${order.number}`, formatDate(order.date)]} />}
      actions={
        <ModalActions>
          <Button variant="outlinedDark" fullWidth onClick={close}>
            Повернутись
          </Button>
          <Button variant="accent" fullWidth aria-disabled={!valid} onClick={submit}>
            {COPY.title}
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-2 max-lg:hidden">
        <SummaryRow label="Статус замовлення" info={TIPS.orderStatus}>
          <OrderStatusBadge status={order.status} />
        </SummaryRow>
        <SummaryRow label="Створив замовлення">
          <SummaryLink>{order.createdBy}</SummaryLink>
        </SummaryRow>
        <SummaryRow label="Контрагент">
          <SummaryLink clip>{order.counterparty}</SummaryLink>
        </SummaryRow>
        <SummaryRow label="Статус оплати" info={TIPS.paymentStatus}>
          <PaymentBadge kind={paymentKind(order)} />
        </SummaryRow>
      </div>
      <div className="flex flex-wrap gap-2 lg:hidden">
        <OrderStatusBadge status={order.status} />
        <PaymentBadge kind={paymentKind(order)} />
      </div>
      <KeyValueList
        className="lg:hidden"
        rows={[
          { id: "author", label: COPY.author, value: order.createdBy },
          { id: "counterparty", label: COPY.counterparty, value: order.counterparty },
        ]}
      />
      {request && <p className="text-[14px] leading-5 text-neutral-800 lg:hidden">{COPY.requestNote}</p>}
      <div className="flex flex-col lg:hidden">
        <div aria-hidden className="mb-6 h-px shrink-0 bg-stroke-subtle" />
        <RadioGroup
          name="cancel-reason-choice"
          label={COPY.reason}
          options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))}
          value={reason}
          onChange={setReason}
          error={reasonError}
        />
        {asksSolution && (
          <>
            <SheetDivider />
            <RadioGroup
              name="cancel-solution-choice"
              label={COPY.solution}
              options={CANCEL_SOLUTIONS.map((r) => ({ value: r, label: r }))}
              value={solution}
              onChange={setSolution}
              error={solutionError}
            />
          </>
        )}
      </div>
      <div className="flex flex-col gap-6 max-lg:hidden [--field-surface:#fff]">
        <SelectField
          label={COPY.reason}
          name="cancel-reason"
          value={reason}
          options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))}
          onChange={setReason}
          error={reasonError}
        />
        {asksSolution && (
          <SelectField
            label={COPY.solution}
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
