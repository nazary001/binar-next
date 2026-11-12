"use client";

import { BanknotesIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useId, useState, type FormEvent, type SVGProps } from "react";
import { STAFF_NONE, StaffSelect } from "../common/pickers";
import { formatDate, formatMoney } from "../lib/format";
import { Button } from "../ui/Button";
import { RadioGroup, type ChoiceOption } from "../ui/Checkbox";
import { promptDialog } from "../ui/ConfirmDialog";
import { DateInput } from "../ui/DateInput";
import { DropdownMenu, type MenuIcon, type MenuItem } from "../ui/DropdownMenu";
import { MoneyInput } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { ORDER_STATUS, statusLabel } from "../ui/status";
import { toast } from "../ui/Toast";
import { TONES } from "../ui/tokens";
import { orderErrorText, patchOrder, paymentKindOf } from "./shared";
import {
  ORDER_COMMENT_MAX,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  type OrderDetail,
  type OrderPatchBody,
  type OrderStatus,
  type PaymentKind,
} from "./types";

// The actions in the head of an order page: the status menu, the payment
// dialog and the manager select. Every one PATCHes /orders/<id> and puts
// the answer into the page's cache (shared.ts patchOrder).

// The tone dot of each status as a menu icon, so the menu speaks the
// colours of the badges (made once, at module level).
const STATUS_DOTS = Object.fromEntries(
  ORDER_STATUSES.map((status) => {
    const color = TONES[ORDER_STATUS[status].tone].dot;
    function Dot(props: SVGProps<SVGSVGElement>) {
      return (
        <svg viewBox="0 0 20 20" aria-hidden className={props.className}>
          <circle cx="10" cy="10" r="4" fill={color} />
        </svg>
      );
    }
    return [status, Dot];
  }),
) as Record<OrderStatus, MenuIcon>;

const STATUS_ERRORS: Record<string, string> = {
  state: "Такий перехід статусу вже неможливий: замовлення тим часом змінили. Сторінку оновлено.",
};

// --- status -------------------------------------------------------------------------

export function StatusMenu({ order }: { order: OrderDetail }) {
  const [busy, setBusy] = useState(false);

  const move = async (to: OrderStatus, comment?: string, undoOf?: OrderStatus) => {
    setBusy(true);
    const result = await patchOrder(order.id, { status: to, ...(comment ? { comment } : {}) });
    setBusy(false);
    if (!result.ok) {
      toast.error(orderErrorText(result, STATUS_ERRORS));
      return;
    }
    const from = undoOf ?? order.status;
    const label = statusLabel(ORDER_STATUS, to);
    // A move that the table allows back can be undone from the toast.
    const back = !undoOf && (ORDER_TRANSITIONS[to] ?? []).includes(from);
    toast.show({
      tone: "success",
      text: undoOf ? `Статус повернуто: «${label}»` : `Статус змінено: «${label}»`,
      action: back ? { label: "Повернути", onClick: () => void move(from, undefined, to) } : undefined,
    });
  };

  const choose = async (to: OrderStatus) => {
    if (to === "cancelled" || to === "blocked") {
      const cancel = to === "cancelled";
      const reason = await promptDialog({
        title: cancel ? `Скасувати замовлення №${order.number}?` : `Заблокувати замовлення №${order.number}?`,
        text: cancel
          ? "Клієнт отримає лист про скасування. Відновити замовлення можна буде статусом «Нове»."
          : "Замовлення не піде в роботу, доки його не розблокують. Клієнт отримає лист про новий статус.",
        label: cancel ? "Причина скасування" : "Причина блокування",
        placeholder: cancel ? "Наприклад: клієнт відмовився від замовлення" : "Наприклад: чекаємо на оплату попереднього рахунку",
        multiline: true,
        required: true,
        maxLength: ORDER_COMMENT_MAX,
        confirmLabel: cancel ? "Скасувати замовлення" : "Заблокувати",
        cancelLabel: "Не змінювати",
        tone: cancel ? "danger" : "default",
      });
      if (reason === null) return;
      await move(to, reason);
      return;
    }
    await move(to);
  };

  const items: MenuItem[] = [
    { key: "heading", heading: "Перевести в статус" },
    ...order.allowedStatuses.map((status) => ({
      key: status,
      label: statusLabel(ORDER_STATUS, status),
      icon: STATUS_DOTS[status],
      tone: status === "cancelled" ? ("danger" as const) : ("default" as const),
      onSelect: () => void choose(status),
    })),
  ];

  if (order.allowedStatuses.length === 0) {
    return (
      <Button disabled iconRight={ChevronDownIcon}>
        Змінити статус
      </Button>
    );
  }

  return (
    <DropdownMenu
      label={`Новий статус замовлення №${order.number}`}
      items={items}
      placement="bottom-end"
      trigger={
        <Button loading={busy} iconRight={ChevronDownIcon}>
          Змінити статус
        </Button>
      }
    />
  );
}

// --- manager ----------------------------------------------------------------------------

export function ManagerControl({ order }: { order: OrderDetail }) {
  const [busy, setBusy] = useState(false);
  const change = async (id: string | null) => {
    const next = id === STAFF_NONE ? null : id;
    if (next === (order.managerId ?? null)) return;
    setBusy(true);
    const result = await patchOrder(order.id, { managerId: next });
    setBusy(false);
    if (!result.ok) {
      toast.error(orderErrorText(result, { fields: "Цього співробітника не можна призначити: його заблоковано або видалено." }));
      return;
    }
    toast.success(next ? `Менеджер: ${result.data.order.manager?.name ?? ""}` : "Менеджера знято");
  };
  return (
    <div className="w-[240px] max-w-full">
      <StaffSelect
        aria-label="Менеджер замовлення"
        placeholder="Призначити менеджера"
        value={order.managerId}
        onChange={(id) => void change(id)}
        fallbackName={order.manager?.name}
        disabled={busy}
        clearable
      />
    </div>
  );
}

// --- payment ----------------------------------------------------------------------------

type PaymentErrors = { paid?: string; paymentDue?: string };

function PaymentForm({ order, formId, onDone, onBusy }: { order: OrderDetail; formId: string; onDone: () => void; onBusy: (busy: boolean) => void }) {
  const b2b = order.channel === "b2b";
  const current = paymentKindOf(order);
  const currentPaid = order.payment?.kind === "partial" ? order.payment.paid : null;
  const [kind, setKind] = useState<PaymentKind>(current);
  const [paid, setPaid] = useState<number | null>(currentPaid);
  const [due, setDue] = useState(order.paymentDue ?? "");
  const [errors, setErrors] = useState<PaymentErrors>({});

  const dueChanged = b2b && due !== (order.paymentDue ?? "");
  const paymentChanged = kind !== current || (kind === "partial" && paid !== currentPaid);
  // "Прострочено" exists only after the due date (the one in this form).
  const pastDue = b2b && due !== "" && order.today > due;

  const options: ChoiceOption<PaymentKind>[] = [
    { value: "awaiting", label: "Очікується оплата", hint: "Гроші ще не надійшли" },
    {
      value: "partial",
      label: "Частково оплачено",
      hint: order.total > 0 ? "Надійшла частина суми: вкажіть скільки" : "Замовлення без суми не можна оплатити частково",
      disabled: order.total <= 0,
    },
    {
      value: "paid",
      label: "Оплачено",
      hint: pastDue ? "Буде позначено, що оплата надійшла із простроченням" : "Уся сума надійшла",
    },
    ...(b2b
      ? [
          {
            value: "overdue" as const,
            label: "Прострочено",
            hint: pastDue ? `Термін оплати минув ${formatDate(due)}` : "Можна обрати, коли мине термін оплати",
            disabled: !pastDue,
          },
        ]
      : []),
  ];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const local: PaymentErrors = {};
    if (kind === "partial" && (paid === null || !(paid > 0 && paid < order.total))) {
      local.paid = paid === null ? "Вкажіть, скільки сплачено." : `Сума має бути більшою за 0 і меншою за ${formatMoney(order.total)}.`;
    }
    if (dueChanged && due === "") local.paymentDue = "Вкажіть дату, до якої треба оплатити.";
    if (kind === "overdue" && !pastDue) local.paymentDue = "Прострочити можна лише після терміну оплати.";
    setErrors(local);
    if (local.paid || local.paymentDue) return;
    if (!paymentChanged && !dueChanged) {
      onDone();
      return;
    }
    const body: OrderPatchBody = {
      ...(paymentChanged || (kind === "overdue" && dueChanged)
        ? { payment: { kind, ...(kind === "partial" && paid !== null ? { paid } : {}) } }
        : {}),
      ...(dueChanged ? { paymentDue: due } : {}),
    };
    onBusy(true);
    const result = await patchOrder(order.id, body);
    onBusy(false);
    if (!result.ok) {
      const fields = (result.data.fields ?? {}) as Record<string, string>;
      if (result.error === "fields") {
        setErrors({
          paid: fields.paid === "required" ? "Вкажіть, скільки сплачено." : fields.paid ? `Сума має бути більшою за 0 і меншою за ${formatMoney(order.total)}.` : undefined,
          paymentDue: fields.paymentDue ? "Вкажіть правильну дату." : undefined,
        });
        return;
      }
      const reason = typeof result.data.reason === "string" ? result.data.reason : "";
      toast.error(
        orderErrorText(result, {
          state:
            reason === "not-due"
              ? "Термін оплати ще не минув: позначити оплату простроченою поки не можна."
              : reason === "no-due-date"
                ? "У замовлення немає терміну оплати, тому прострочення не буває."
                : "Оплату зараз змінити не можна: замовлення тим часом змінили. Сторінку оновлено.",
        }),
      );
      return;
    }
    toast.success("Оплату збережено");
    onDone();
  };

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <RadioGroup label="Стан оплати" value={kind} onChange={setKind} options={options} variant="tiles" />
      {kind === "partial" && (
        <MoneyInput
          label="Сплачено"
          value={paid}
          onChange={(next) => {
            setPaid(next);
            if (errors.paid) setErrors({ ...errors, paid: undefined });
          }}
          hint={`Із ${formatMoney(order.total)}`}
          error={errors.paid}
          required
        />
      )}
      {b2b && (
        <DateInput
          label="Термін оплати"
          value={due}
          onChange={(next) => {
            setDue(next);
            if (errors.paymentDue) setErrors({ ...errors, paymentDue: undefined });
          }}
          hint="До цієї дати партнер має оплатити рахунок"
          error={errors.paymentDue}
        />
      )}
    </form>
  );
}

export function PaymentButton({ order }: { order: OrderDetail }) {
  const [open, setOpen] = useState(false);
  // A new form each time the dialog opens, so it starts from the order as
  // it is now.
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);
  const formId = useId();
  return (
    <>
      <Button
        variant="secondary"
        iconLeft={BanknotesIcon}
        onClick={() => {
          setSession((value) => value + 1);
          setOpen(true);
        }}
      >
        Оплата
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        busy={busy}
        title="Оплата замовлення"
        description={
          order.channel === "b2b"
            ? `№${order.number} на ${formatMoney(order.total)}. Партнер побачить новий стан оплати в кабінеті.`
            : `№${order.number} на ${formatMoney(order.total)}.`
        }
        footer={<ModalFooter onCancel={() => setOpen(false)} confirmLabel="Зберегти оплату" form={formId} busy={busy} />}
      >
        <PaymentForm key={session} order={order} formId={formId} onDone={() => setOpen(false)} onBusy={setBusy} />
      </Modal>
    </>
  );
}
