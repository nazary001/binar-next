"use client";

import { ArrowPathIcon, ArrowUpTrayIcon, ChevronRightIcon, LockClosedIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ExchangeQueueDto, QueueEntryAnswer } from "../integrations/types";
import { adminApi, errorMessage } from "../lib/api";
import { countOf, cx, formatDate, formatDateTime, formatMoney, formatPhone } from "../lib/format";
import { invalidate } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { useUnsavedWarning } from "../ui/Form";
import { Textarea } from "../ui/Input";
import { KeyValueList, type KeyValueItem } from "../ui/KeyValue";
import { AccountTypeBadge, ErpStateBadge, PaymentStatusBadge, ReturnStatusBadge } from "../ui/status";
import { toast } from "../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING_INSET, TEXT, TONES } from "../ui/tokens";
import { orderErrorText, orderKey, paymentKindOf, refreshOrderViews } from "./shared";
import { ORDER_NOTE_MAX, type NoteAnswer, type OrderDetail } from "./types";

// The right column of an order page: who ordered, the money, the exchange
// with the accounting system, the internal notes and the returns.

function Muted({ children }: { children: string }) {
  return <span className="text-neutral-500">{children}</span>;
}

const LINK = "font-semibold text-neutral-900 underline decoration-stroke-subtle underline-offset-4 hover:decoration-neutral-900";

// --- customer -------------------------------------------------------------------------------

export function ClientCard({ order }: { order: OrderDetail }) {
  const { customer, account, company } = order;
  const items: KeyValueItem[] = [
    { label: "Покупець", value: customer.name || <Muted>Без імені</Muted> },
    {
      label: "Акаунт",
      value: account ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          <Link href={`/admin/customers/${encodeURIComponent(account.id)}`} className={LINK}>
            {account.name}
          </Link>
          <AccountTypeBadge type={account.type} />
        </span>
      ) : (
        <Muted>{order.channel === "retail" ? "Гість, без акаунта на сайті" : "Без акаунта"}</Muted>
      ),
      hint: account && account.login !== account.name ? `Логін: ${account.login}` : undefined,
    },
  ];
  if (company) {
    items.push({
      label: "Компанія",
      value: (
        <Link href={`/admin/companies/${encodeURIComponent(company.id)}`} className={LINK}>
          {company.name || "Без назви"}
        </Link>
      ),
    });
  }
  if (order.counterparty) items.push({ label: "Контрагент", value: order.counterparty });
  else if (customer.company && !company) items.push({ label: "Компанія для рахунку", value: customer.company });
  items.push({
    label: "Телефон",
    value: customer.phone ? <span className="tabular-nums">{formatPhone(customer.phone)}</span> : <Muted>Не вказано</Muted>,
    copy: customer.phone || undefined,
  });
  items.push({
    label: "E-mail",
    value: customer.email ? (
      <a href={`mailto:${customer.email}`} className={LINK}>
        {customer.email}
      </a>
    ) : (
      <Muted>Не вказано</Muted>
    ),
    copy: customer.email || undefined,
  });
  return (
    <Card title="Клієнт">
      <KeyValueList items={items} dense />
    </Card>
  );
}

// --- payment ---------------------------------------------------------------------------------

export function PaymentCard({ order }: { order: OrderDetail }) {
  const kind = paymentKindOf(order);
  const payment = order.payment;
  const b2b = order.channel === "b2b";
  const pastDue = b2b && order.paymentDue !== null && order.today > order.paymentDue && kind !== "paid" && order.status !== "cancelled";
  const note =
    payment?.kind === "overdue"
      ? `${countOf(payment.days, ["день", "дні", "днів"])} після терміну`
      : payment?.kind === "paid" && payment.late
        ? "Оплачено із простроченням"
        : payment?.kind === "partial" && payment.overdue
          ? `Залишок ${formatMoney(payment.overdue)} прострочено`
          : null;
  const items: KeyValueItem[] = [{ label: "Тип оплати", value: order.paymentType || <Muted>Не вказано</Muted> }];
  if (b2b) {
    items.push({
      label: "Термін оплати",
      value: order.paymentDue ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="tabular-nums">до {formatDate(order.paymentDue)}</span>
          {pastDue && (
            <span className="text-[12px] font-semibold leading-4" style={{ color: TONES.red.text }}>
              термін минув
            </span>
          )}
        </span>
      ) : (
        <Muted>Не вказано</Muted>
      ),
    });
  }
  return (
    <Card title="Оплата">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-4">
        <PaymentStatusBadge kind={kind} size="md" />
        {note && <span className={TEXT.caption}>{note}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 pb-4">
        <div className="rounded-2xl bg-bg-subtle px-4 py-3">
          <p className={TEXT.caption}>Сплачено</p>
          <p className="mt-0.5 text-[16px] font-bold leading-[22px] text-neutral-900 tabular-nums">{formatMoney(order.totals.paid)}</p>
        </div>
        <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: order.totals.due > 0 ? TONES.amber.bg : TONES.green.bg }}>
          <p className={TEXT.caption}>Залишок</p>
          <p className="mt-0.5 text-[16px] font-bold leading-[22px] text-neutral-900 tabular-nums">{formatMoney(order.totals.due)}</p>
        </div>
      </div>
      <KeyValueList items={items} dense />
    </Card>
  );
}

// --- the accounting system --------------------------------------------------------------------

const BAS_ERRORS: Record<string, string> = {
  "not-found": "Замовлення не знайдено: можливо, його видалили.",
  state: "Замовлення вже чекає в черзі обміну: BAS забере його під час наступного обміну.",
  forbidden: "Вашій ролі не дозволено керувати обміном з BAS.",
};

export function ErpCard({ order }: { order: OrderDetail }) {
  const { can } = useStaff();
  const [busy, setBusy] = useState(false);
  const erp = order.erp;
  const state = erp?.state ?? null;
  // Sending makes sense before the first exchange, after a refusal, or
  // for an order that was skipped by the export settings.
  const canSend = can("integrations.edit") && (state === null || state === "error" || state === "skipped");

  const send = async () => {
    setBusy(true);
    try {
      const queued = await adminApi<QueueEntryAnswer>("/integrations/bas/queue", { method: "POST", body: { kind: "order", entityId: order.id } });
      if (queued.ok) {
        toast.success("Замовлення передано в чергу обміну з BAS");
        return;
      }
      // Sent before: an entry BAS refused (or already took) goes back to
      // the queue under a new number.
      const entry = queued.error === "exists" ? (queued.data.entry as ExchangeQueueDto | undefined) : undefined;
      if (!entry) {
        toast.error(errorMessage(queued, BAS_ERRORS));
        return;
      }
      if (entry.state === "pending") {
        toast.info(BAS_ERRORS.state);
        return;
      }
      const retried = await adminApi<QueueEntryAnswer>(`/integrations/bas/queue/${encodeURIComponent(entry.id)}/retry`, { method: "POST" });
      if (!retried.ok) {
        toast.error(errorMessage(retried, BAS_ERRORS));
        return;
      }
      toast.success("Замовлення повторно передано в чергу обміну з BAS");
    } finally {
      setBusy(false);
      invalidate(orderKey(order.id));
      invalidate("/integrations");
      refreshOrderViews();
    }
  };

  const items: KeyValueItem[] = [];
  if (erp?.number) items.push({ label: "Номер у BAS", value: <span className="tabular-nums">{erp.number}</span>, copy: erp.number });
  if (erp?.queuedAt) items.push({ label: "Передано в чергу", value: <span className="tabular-nums">{formatDateTime(erp.queuedAt)}</span> });
  if (erp?.ackedAt) items.push({ label: "Прийнято в BAS", value: <span className="tabular-nums">{formatDateTime(erp.ackedAt)}</span> });

  const explain =
    state === null
      ? "Замовлення ще не передавали в BAS."
      : state === "pending"
        ? "Чекає в черзі: BAS забере його під час наступного обміну."
        : state === "skipped"
          ? "Налаштування обміну не вивантажують замовлення цього каналу."
          : null;

  return (
    <Card title="Обмін з BAS">
      <div className="flex flex-col gap-3">
        <div>{state ? <ErpStateBadge state={state} size="md" /> : <Badge tone="neutral" size="md">Не передавалось</Badge>}</div>
        {explain && <p className={TEXT.muted}>{explain}</p>}
        {state === "error" && erp?.error && (
          <p className="rounded-2xl px-4 py-3 text-[14px] leading-5 [overflow-wrap:anywhere]" style={{ backgroundColor: TONES.red.bg, color: TONES.red.text }}>
            {erp.error}
          </p>
        )}
        {items.length > 0 && <KeyValueList items={items} dense />}
        {canSend && (
          <Button
            variant="secondary"
            iconLeft={state === "error" ? ArrowPathIcon : ArrowUpTrayIcon}
            loading={busy}
            onClick={() => void send()}
            className="self-start"
          >
            {state === "error" ? "Надіслати в BAS ще раз" : "Вивантажити в BAS"}
          </Button>
        )}
      </div>
    </Card>
  );
}

// --- internal notes -------------------------------------------------------------------------

export function NotesCard({ order, canEdit }: { order: OrderDetail; canEdit: boolean }) {
  const { me } = useStaff();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  useUnsavedWarning(text.trim() !== "");

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    const result = await adminApi<NoteAnswer>(`${orderKey(order.id)}/notes`, { method: "POST", body: { text: value } });
    setBusy(false);
    if (!result.ok) {
      toast.error(orderErrorText(result, { state: "Нотаток у замовленні вже забагато: видаліть застарілі." }));
      return;
    }
    setText("");
    invalidate(orderKey(order.id));
    toast.success("Нотатку додано");
  };

  const remove = async (noteId: string) => {
    const yes = await confirmDialog({
      title: "Видалити нотатку?",
      text: "Колеги більше не побачать її в замовленні.",
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!yes) return;
    setRemoving(noteId);
    const result = await adminApi(`${orderKey(order.id)}/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
    setRemoving(null);
    invalidate(orderKey(order.id));
    if (!result.ok) {
      toast.error(orderErrorText(result, { "not-found": "Нотатку вже видалили." }));
      return;
    }
    toast.success("Нотатку видалено");
  };

  return (
    <Card
      title="Нотатки"
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          <LockClosedIcon aria-hidden className="size-3.5" strokeWidth={2} />
          Лише для співробітників: клієнт їх не бачить
        </span>
      }
    >
      {order.notes.length > 0 && (
        <ul className="flex flex-col divide-y divide-stroke-subtle">
          {order.notes.map((note) => (
            <li key={note.id} className={cx("flex min-w-0 gap-2 py-3 first:pt-0", removing === note.id && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className={cx(TEXT.caption, "flex flex-wrap gap-x-1.5")}>
                  <span className="font-semibold text-neutral-800">{note.by.name || "Співробітник"}</span>
                  <span className="tabular-nums">{formatDateTime(note.at)}</span>
                </p>
                <p className={cx(TEXT.body, "mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]")}>{note.text}</p>
              </div>
              {canEdit && note.by.id === me.id && (
                <IconButton
                  size="sm"
                  variant="danger"
                  icon={TrashIcon}
                  label="Видалити нотатку"
                  loading={removing === note.id}
                  onClick={() => void remove(note.id)}
                  className="-mr-1 -mt-1"
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {order.notes.length === 0 && !canEdit && <p className={TEXT.muted}>Нотаток немає.</p>}
      {canEdit && (
        <form onSubmit={add} className={cx("flex flex-col gap-2", order.notes.length > 0 && "mt-3 border-t border-stroke-subtle pt-4")}>
          <Textarea
            aria-label="Нова нотатка"
            value={text}
            onChange={setText}
            placeholder="Нотатка для колег: домовленості з клієнтом, що перевірити"
            rows={2}
            autoGrow
            maxRows={8}
            maxLength={ORDER_NOTE_MAX}
          />
          <Button type="submit" size="sm" variant="secondary" loading={busy} disabled={!text.trim()} className="self-end">
            Додати нотатку
          </Button>
        </form>
      )}
    </Card>
  );
}

// --- returns ----------------------------------------------------------------------------------

export function ReturnsCard({ order }: { order: OrderDetail }) {
  if (order.returns.length === 0) return null;
  return (
    <Card title="Повернення" subtitle="Заявки клієнта на повернення товарів цього замовлення" padding="none" className="pb-2">
      <ul className="flex flex-col px-2">
        {order.returns.map((ret) => (
          <li key={ret.id}>
            <Link
              href={`/admin/returns/${encodeURIComponent(ret.id)}`}
              className={cx("group flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-bg-subtle motion-reduce:transition-none", COLOR_TRANSITION, FOCUS_RING_INSET)}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={TEXT.bodyStrong}>Заявка №{ret.id}</span>
                <span className={cx(TEXT.caption, "tabular-nums")}>від {formatDate(ret.date)}</span>
              </span>
              <ReturnStatusBadge status={ret.status} />
              <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-neutral-400 group-hover:text-neutral-900" strokeWidth={1.7} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
