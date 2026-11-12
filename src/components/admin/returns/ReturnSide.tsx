"use client";

import {
  ChatBubbleLeftEllipsisIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  PencilSquareIcon,
  TruckIcon,
} from "@heroicons/react/20/solid";
import { ChevronRightIcon, LockClosedIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import type { HistoryEntryDto, StaffNoteDto } from "../orders/types";
import { adminApi } from "../lib/api";
import { countOf, cx, formatDate, formatDateTime, formatMoney, formatNumber } from "../lib/format";
import { OWNER_ROLE_ID } from "../lib/permissions";
import { invalidate } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { useUnsavedWarning } from "../ui/Form";
import { Textarea } from "../ui/Input";
import { KeyValueList, type KeyValueItem } from "../ui/KeyValue";
import { AccountTypeBadge, OrderStatusBadge, PaymentStatusBadge, RETURN_STATUS, ReturnStatusBadge, type ReturnStatus } from "../ui/status";
import { Timeline, type TimelineItem } from "../ui/Timeline";
import { toast } from "../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING_INSET, TEXT } from "../ui/tokens";
import { companyHref, orderHref, returnErrorText, returnKey } from "./shared";
import { RETURN_NOTE_MAX, type ReturnDetail } from "./types";

// The right column of a request page: the order the goods come from, the
// partner company, the staff's internal notes and the history.

const LINK = "font-semibold text-neutral-900 underline decoration-stroke-subtle underline-offset-4 hover:decoration-neutral-900";

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-neutral-500">{children}</span>;
}

// --- the order ----------------------------------------------------------------------------

export function OrderCard({ ret }: { ret: ReturnDetail }) {
  const { can } = useStaff();
  const order = ret.order;
  if (!order) {
    return (
      <Card title="Замовлення">
        <p className={TEXT.muted}>
          Замовлення <span className="tabular-nums">№{ret.orderNumber}</span> не знайдено: можливо, його видалили.
        </p>
      </Card>
    );
  }
  const number = <span className="tabular-nums">№{order.number}</span>;
  const items: KeyValueItem[] = [
    {
      label: "Номер",
      value: can("orders.view") ? (
        <Link href={orderHref(order.id)} className={LINK}>
          {number}
        </Link>
      ) : (
        number
      ),
      copy: order.number,
    },
    { label: "Дата", value: <span className="tabular-nums">{formatDate(order.date)}</span> },
    { label: "Сума замовлення", value: <span className="font-semibold tabular-nums">{formatMoney(order.total)}</span> },
    {
      label: "Стан",
      value: (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge kind={order.payment?.kind ?? "awaiting"} />
        </span>
      ),
    },
  ];
  if (order.counterparty) items.push({ label: "Контрагент", value: order.counterparty });
  if (order.createdBy) items.push({ label: "Оформив замовлення", value: order.createdBy });
  return (
    <Card title="Замовлення">
      <KeyValueList items={items} dense />
    </Card>
  );
}

// --- the company --------------------------------------------------------------------------

function LinkRow({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-bg-subtle motion-reduce:transition-none",
        COLOR_TRANSITION,
        FOCUS_RING_INSET,
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={TEXT.bodyStrong}>{title}</span>
        <span className={cx(TEXT.caption, "truncate")}>{text}</span>
      </span>
      <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-neutral-400 group-hover:text-neutral-900" strokeWidth={1.7} />
    </Link>
  );
}

export function CompanyCard({ ret }: { ret: ReturnDetail }) {
  const { can } = useStaff();
  const customers = can("customers.view");
  const { company, account } = ret;
  const name = company?.name || ret.clientName;
  const items: KeyValueItem[] = [
    {
      label: "Компанія",
      value: name ? (
        customers ? (
          <Link href={companyHref(ret.clientId)} className={LINK}>
            {name}
          </Link>
        ) : (
          name
        )
      ) : (
        <Muted>Компанію не знайдено</Muted>
      ),
    },
    {
      label: "Хто оформив заявку",
      value: account ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          {customers ? (
            <Link href={`/admin/customers/${encodeURIComponent(account.id)}`} className={LINK}>
              {account.name}
            </Link>
          ) : (
            account.name
          )}
          <AccountTypeBadge type={account.type} />
        </span>
      ) : (
        <Muted>Невідомо</Muted>
      ),
      hint: account && account.login !== account.name ? `Логін: ${account.login}` : undefined,
    },
  ];
  const links = [
    can("returns.view") && { href: `/admin/returns?clientId=${encodeURIComponent(ret.clientId)}`, title: "Усі заявки компанії", text: "Повернення цього партнера" },
    can("orders.view") && { href: `/admin/orders?clientId=${encodeURIComponent(ret.clientId)}`, title: "Замовлення компанії", text: "Усі замовлення цього партнера" },
  ].filter((link): link is { href: string; title: string; text: string } => Boolean(link));
  return (
    <Card title="Компанія">
      <KeyValueList items={items} dense />
      {links.length > 0 && (
        <div className="mt-3 border-t border-stroke-subtle pt-2">
          <div className="-mx-3 flex flex-col">
            {links.map((link) => (
              <LinkRow key={link.href} {...link} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// --- internal notes -------------------------------------------------------------------------

// A member of staff removes their own notes; an owner also removes a
// colleague's (the API holds the same rule and answers 403 "not-author"
// to anybody else).
export function NotesCard({ ret, canEdit }: { ret: ReturnDetail; canEdit: boolean }) {
  const { me } = useStaff();
  const isOwner = me.roleId === OWNER_ROLE_ID;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  useUnsavedWarning(text.trim() !== "");

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    const result = await adminApi(`${returnKey(ret.id)}/notes`, { method: "POST", body: { text: value } });
    setBusy(false);
    if (!result.ok) {
      toast.error(returnErrorText(result));
      return;
    }
    setText("");
    invalidate(returnKey(ret.id));
    toast.success("Нотатку додано");
  };

  const remove = async (note: StaffNoteDto) => {
    const own = note.by.id === me.id;
    const yes = await confirmDialog({
      title: own ? "Видалити нотатку?" : "Видалити нотатку колеги?",
      text: own
        ? "Колеги більше не побачать її в заявці."
        : `Автор нотатки: ${note.by.name || "співробітник"}. Колеги більше не побачать її в заявці; у журналі залишиться запис про видалення з іменем автора.`,
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!yes) return;
    setRemoving(note.id);
    const result = await adminApi(`${returnKey(ret.id)}/notes/${encodeURIComponent(note.id)}`, { method: "DELETE" });
    setRemoving(null);
    invalidate(returnKey(ret.id));
    if (!result.ok) {
      toast.error(returnErrorText(result, { "not-found": "Нотатку вже видалили." }));
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
      {ret.notes.length > 0 && (
        <ul className="flex flex-col divide-y divide-stroke-subtle">
          {ret.notes.map((note) => (
            <li key={note.id} className={cx("flex min-w-0 gap-2 py-3 first:pt-0", removing === note.id && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className={cx(TEXT.caption, "flex flex-wrap gap-x-1.5")}>
                  <span className="font-semibold text-neutral-800">{note.by.name || "Співробітник"}</span>
                  <span className="tabular-nums">{formatDateTime(note.at)}</span>
                </p>
                <p className={cx(TEXT.body, "mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]")}>{note.text}</p>
              </div>
              {canEdit && (note.by.id === me.id || isOwner) && (
                <IconButton
                  size="sm"
                  variant="danger"
                  icon={TrashIcon}
                  label="Видалити нотатку"
                  loading={removing === note.id}
                  onClick={() => void remove(note)}
                  className="-mr-1 -mt-1"
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {ret.notes.length === 0 && !canEdit && <p className={TEXT.muted}>Нотаток немає.</p>}
      {canEdit && (
        <form onSubmit={add} className={cx("flex flex-col gap-2", ret.notes.length > 0 && "mt-3 border-t border-stroke-subtle pt-4")}>
          <Textarea
            aria-label="Нова нотатка"
            value={text}
            onChange={setText}
            placeholder="Нотатка для колег: що перевірити на складі, про що домовились із клієнтом"
            rows={2}
            autoGrow
            maxRows={8}
            maxLength={RETURN_NOTE_MAX}
          />
          <Button type="submit" size="sm" variant="secondary" loading={busy} disabled={!text.trim()} className="self-end">
            Додати нотатку
          </Button>
        </form>
      )}
    </Card>
  );
}

// --- history ---------------------------------------------------------------------------------

const SHOWN = 8;

const ACTOR_KIND: Record<HistoryEntryDto["by"]["kind"], string> = {
  staff: "Співробітник",
  system: "Сайт",
  integration: "BAS",
  customer: "Клієнт",
};

function actorOf(entry: HistoryEntryDto): string {
  const name = entry.by.name.trim();
  if (entry.by.kind === "customer") return name ? `${name} (клієнт)` : "Клієнт";
  return name || ACTOR_KIND[entry.by.kind];
}

function isReturnStatus(value: string | null): value is ReturnStatus {
  return value !== null && Object.prototype.hasOwnProperty.call(RETURN_STATUS, value);
}

function itemOf(entry: HistoryEntryDto, index: number): TimelineItem {
  const base = { id: `${entry.at}-${index}`, at: entry.at, actor: actorOf(entry) };
  switch (entry.type) {
    case "status": {
      const to = isReturnStatus(entry.to) ? entry.to : null;
      const from = isReturnStatus(entry.from) ? entry.from : null;
      return {
        ...base,
        title: (
          <>
            <span>Статус</span>
            {from && to ? (
              <>
                <ReturnStatusBadge status={from} />
                <span className="font-medium text-neutral-500">на</span>
                <ReturnStatusBadge status={to} />
              </>
            ) : to ? (
              <ReturnStatusBadge status={to} />
            ) : (
              <span>змінено</span>
            )}
          </>
        ),
        text: entry.text,
        tone: to ? RETURN_STATUS[to].tone : "neutral",
      };
    }
    case "shipment":
      return { ...base, title: entry.text ?? "ТТН повернення", tone: "indigo", icon: <TruckIcon /> };
    case "note":
      return { ...base, title: entry.text ?? "Нотатка", tone: "neutral", icon: <ChatBubbleLeftEllipsisIcon /> };
    case "edit": {
      const money = (entry.text ?? "").startsWith("Сум");
      return { ...base, title: entry.text ?? "Зміни в заявці", tone: "neutral", icon: money ? <BanknotesIcon /> : <PencilSquareIcon /> };
    }
    default:
      return { ...base, title: entry.text ?? "Зміни в заявці", tone: "neutral" };
  }
}

export function HistoryCard({ ret }: { ret: ReturnDetail }) {
  const [all, setAll] = useState(false);
  // The request's arrival is always the card's own first event, built from
  // the request itself (who, how many lines, the sum). Requests made before
  // the site wrote a "created" history entry have none; newer ones do, and
  // that stored entry is left out here so the arrival is not listed twice.
  const created: TimelineItem = {
    id: "created",
    at: ret.createdAt,
    title: "Клієнт надіслав заявку",
    actor: ret.account ? `${ret.account.name} (клієнт)` : "Клієнт",
    text: `${countOf(ret.linesCount, ["позиція", "позиції", "позицій"])} на ${formatMoney(ret.total)}`,
    tone: "blue",
    icon: <ClipboardDocumentListIcon />,
  };
  const entries = [...ret.history.filter((entry) => entry.type !== "created").map(itemOf), created];
  const shown = all ? entries : entries.slice(0, SHOWN);
  return (
    <Card title="Історія" subtitle={`${countOf(entries.length, ["подія", "події", "подій"])}, нові вгорі`}>
      <Timeline items={shown} />
      {entries.length > SHOWN && (
        <Button variant="ghost" size="sm" onClick={() => setAll((value) => !value)} className="mt-3 self-start">
          {all ? "Згорнути" : `Показати всю історію (${formatNumber(entries.length)})`}
        </Button>
      )}
    </Card>
  );
}
