"use client";

import { ArrowUturnLeftIcon, CheckIcon, MagnifyingGlassIcon, TruckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";
import { formatMoney } from "../lib/format";
import { Button, type ButtonVariant, type IconType } from "../ui/Button";
import { confirmDialog, promptDialog } from "../ui/ConfirmDialog";
import { Input, MoneyInput, Textarea } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { toast } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { cleanTtn, refundHint, returnSummary, sendsByPost, TTN_FORMAT } from "./ReturnBlocks";
import { patchReturn, returnErrorText } from "./shared";
import { RETURN_COMMENT_MAX, RETURN_REJECT_REASON_MAX, RETURN_TTN_MAX, type ReturnDetail, type ReturnPatchBody, type ReturnStatus } from "./types";

// The decisions of a request page, as buttons in its head. They follow the
// API's allowedStatuses and are worded as what staff decide, not as a
// status picker: "Погодити", "Відхилити", "Прийнято складом", "Завершити".
// Every move the partner sees and that cannot be taken back asks first.

const TTN = /^[A-Za-z0-9-]{4,40}$/;

type Decision = {
  to: ReturnStatus;
  label: string;
  icon: IconType;
  variant: ButtonVariant;
};

// The decisions of a request in the order they sit in the head: the quiet
// ones first, the main step forward last (the primary pill).
function decisionsOf(ret: ReturnDetail): Decision[] {
  const allowed = new Set(ret.allowedStatuses);
  const out: Decision[] = [];
  // From "approved" the goods either travel by post or courier first, or
  // the partner brings them to the warehouse: the likely next step leads.
  const selfDelivery = !sendsByPost(ret.delivery) && /склад/i.test(ret.delivery);
  if (allowed.has("rejected")) out.push({ to: "rejected", label: "Відхилити", icon: XMarkIcon, variant: "dangerGhost" });
  if (allowed.has("review")) {
    const reopen = ret.status === "rejected";
    out.push({
      to: "review",
      label: reopen ? "Повернути в розгляд" : "Взяти в розгляд",
      icon: reopen ? ArrowUturnLeftIcon : MagnifyingGlassIcon,
      variant: reopen ? "primary" : "secondary",
    });
  }
  if (allowed.has("approved")) out.push({ to: "approved", label: "Погодити", icon: CheckIcon, variant: "primary" });
  const both = allowed.has("inTransit") && allowed.has("accepted");
  if (allowed.has("inTransit")) {
    out.push({ to: "inTransit", label: "Товар у дорозі", icon: TruckIcon, variant: both && selfDelivery ? "secondary" : "primary" });
  }
  if (allowed.has("accepted")) {
    out.push({ to: "accepted", label: "Прийнято складом", icon: CheckIcon, variant: both && !selfDelivery ? "secondary" : "primary" });
  }
  if (allowed.has("completed")) out.push({ to: "completed", label: "Завершити", icon: CheckIcon, variant: "primary" });
  // The primary pill goes last (rightmost; on top of a wrapped row).
  return [...out.filter((d) => d.variant !== "primary"), ...out.filter((d) => d.variant === "primary")];
}

export function ReturnActions({ ret }: { ret: ReturnDetail }) {
  const [busy, setBusy] = useState<ReturnStatus | null>(null);
  const [modal, setModal] = useState<"inTransit" | "completed" | null>(null);
  const decisions = decisionsOf(ret);
  if (decisions.length === 0) return null;

  const move = async (body: ReturnPatchBody, done: string) => {
    if (!body.status) return false;
    setBusy(body.status);
    const result = await patchReturn(ret.id, body);
    setBusy(null);
    if (!result.ok) {
      toast.error(returnErrorText(result, { fields: "Перевірте введені дані." }));
      return false;
    }
    toast.success(done);
    return true;
  };

  const decide = async (decision: Decision) => {
    switch (decision.to) {
      case "review":
        await move(
          { status: "review" },
          ret.status === "rejected" ? "Заявку повернуто в розгляд" : "Заявку взято в розгляд",
        );
        return;
      case "approved": {
        const yes = await confirmDialog({
          title: `Погодити повернення №${ret.id}?`,
          text: ret.delivery
            ? `${returnSummary(ret)}. Клієнт побачить у кабінеті статус «Погоджено» і передасть товар так, як обрав: «${ret.delivery}».`
            : `${returnSummary(ret)}. Клієнт побачить у кабінеті статус «Погоджено».`,
          confirmLabel: "Погодити повернення",
          cancelLabel: "Не зараз",
        });
        if (yes) await move({ status: "approved" }, "Повернення погоджено");
        return;
      }
      case "rejected": {
        const reason = await promptDialog({
          title: `Відхилити заявку №${ret.id}?`,
          text: "Клієнт побачить у кабінеті статус «Відхилено». Причину бачать лише співробітники: за потреби повідомте її клієнту самі.",
          label: "Причина відмови",
          placeholder: "Наприклад: минув термін повернення, товар був у використанні",
          required: true,
          multiline: true,
          maxLength: RETURN_REJECT_REASON_MAX,
          confirmLabel: "Відхилити заявку",
          tone: "danger",
        });
        if (reason === null) return;
        await move({ status: "rejected", rejectReason: reason }, "Заявку відхилено");
        return;
      }
      case "accepted": {
        const yes = await confirmDialog({
          title: "Склад прийняв товар?",
          text: "Заявка перейде в стан «Прийнято складом». Повернути її до попереднього стану потім не вийде: далі її можна лише завершити.",
          confirmLabel: "Так, прийнято складом",
          cancelLabel: "Ще ні",
        });
        if (yes) await move({ status: "accepted" }, "Товар прийнято складом");
        return;
      }
      case "inTransit":
      case "completed":
        setModal(decision.to);
        return;
      default:
        return;
    }
  };

  return (
    <>
      {decisions.map((decision) => (
        <Button
          key={decision.to}
          variant={decision.variant}
          iconLeft={decision.icon}
          loading={busy === decision.to}
          disabled={busy !== null && busy !== decision.to}
          onClick={() => void decide(decision)}
        >
          {decision.label}
        </Button>
      ))}
      <InTransitModal
        ret={ret}
        open={modal === "inTransit"}
        onClose={() => setModal(null)}
        onSubmit={(body) => move({ status: "inTransit", ...body }, "Позначено: товар у дорозі")}
      />
      <CompleteModal
        ret={ret}
        open={modal === "completed"}
        onClose={() => setModal(null)}
        onSubmit={(body) => move({ status: "completed", ...body }, "Повернення завершено")}
      />
    </>
  );
}

// --- "Товар у дорозі": the waybill back, if the partner sent one ----------------------------

function InTransitModal({
  ret,
  open,
  onClose,
  onSubmit,
}: {
  ret: ReturnDetail;
  open: boolean;
  onClose: () => void;
  onSubmit: (body: { returnTtn?: string | null }) => Promise<boolean>;
}) {
  const [ttn, setTtn] = useState(ret.returnTtn ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // A fresh start each time the dialog opens (render-phase reset).
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setTtn(ret.returnTtn ?? "");
      setError(undefined);
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const clean = cleanTtn(ttn);
    if (clean && !TTN.test(clean)) {
      setError(TTN_FORMAT);
      return;
    }
    setBusy(true);
    const done = await onSubmit(clean !== (ret.returnTtn ?? "") ? { returnTtn: clean || null } : {});
    setBusy(false);
    if (done) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="sm"
      title="Товар у дорозі"
      description="Клієнт відправив товар на склад. Повернути заявку до стану «Погоджено» потім не вийде."
      footer={<ModalFooter onCancel={onClose} confirmLabel="Позначити: товар у дорозі" form="return-in-transit" busy={busy} />}
    >
      <form id="return-in-transit" onSubmit={submit} noValidate>
        <Input
          label="ТТН повернення"
          optional
          value={ttn}
          onChange={(value) => {
            setTtn(value);
            setError(undefined);
          }}
          placeholder="20450000000000"
          inputMode="numeric"
          maxLength={RETURN_TTN_MAX + 10}
          clearable
          hint={error ? undefined : "Номер накладної, з якою клієнт відправив товар. Можна додати й пізніше."}
          error={error}
        />
      </form>
    </Modal>
  );
}

// --- "Завершити": how much is given back ----------------------------------------------------

function CompleteModal({
  ret,
  open,
  onClose,
  onSubmit,
}: {
  ret: ReturnDetail;
  open: boolean;
  onClose: () => void;
  onSubmit: (body: { refundAmount?: number | null; comment?: string }) => Promise<boolean>;
}) {
  const initial = ret.refundAmount ?? ret.total;
  const [amount, setAmount] = useState<number | null>(initial);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setAmount(ret.refundAmount ?? ret.total);
      setComment("");
      setError(undefined);
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (amount === null) {
      setError("Вкажіть суму: 0, якщо гроші не повертаються.");
      return;
    }
    setBusy(true);
    const text = comment.trim();
    const done = await onSubmit({
      ...(amount !== ret.refundAmount ? { refundAmount: amount } : {}),
      ...(text ? { comment: text } : {}),
    });
    setBusy(false);
    if (done) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="md"
      title={`Завершити повернення №${ret.id}`}
      description="Клієнт побачить у кабінеті статус «Завершено». Після цього заявку змінити не вийде."
      footer={<ModalFooter onCancel={onClose} confirmLabel="Завершити повернення" form="return-complete" busy={busy} />}
    >
      <form id="return-complete" onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-bg-subtle px-4 py-3">
            <p className={TEXT.caption}>Сума заявки</p>
            <p className="mt-0.5 text-[16px] font-bold leading-[22px] text-neutral-900 tabular-nums">{formatMoney(ret.total)}</p>
          </div>
          <div className="rounded-2xl bg-bg-subtle px-4 py-3">
            <p className={TEXT.caption}>Клієнт просить</p>
            <p className="mt-0.5 text-[14px] font-semibold leading-[22px] text-neutral-900">{ret.solution || "Не вказано"}</p>
          </div>
        </div>
        <MoneyInput
          label="Сума повернення"
          required
          value={amount}
          onChange={(value) => {
            setAmount(value);
            setError(undefined);
          }}
          hint={error ? undefined : refundHint(ret.solution)}
          error={error}
        />
        <Textarea
          label="Коментар для історії"
          optional
          value={comment}
          onChange={setComment}
          placeholder="Наприклад: кредит-ноту проведено в BAS"
          rows={2}
          autoGrow
          maxRows={6}
          maxLength={RETURN_COMMENT_MAX}
        />
      </form>
    </Modal>
  );
}
