"use client";

import {
  ArrowUpTrayIcon,
  BanknotesIcon,
  ChatBubbleLeftEllipsisIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  NoSymbolIcon,
  TruckIcon,
  UserIcon,
} from "@heroicons/react/20/solid";
import { useState, type ReactNode } from "react";
import { countOf, formatNumber } from "../lib/format";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import {
  ERP_STATE,
  ErpStateBadge,
  ORDER_STATUS,
  OrderStatusBadge,
  PAYMENT_STATUS,
  PaymentStatusBadge,
  type ErpState,
  type OrderStatus,
  type PaymentStatus,
} from "../ui/status";
import { Timeline, type TimelineItem } from "../ui/Timeline";
import type { Tone } from "../ui/tokens";
import type { HistoryEntryDto, OrderDetail } from "./types";

// "Історія": every change of the order, newest first, as the API keeps it
// (status moves with both states as badges, payment, notes, documents,
// the shipment, the exchange with BAS, the cancel request).

const SHOWN = 8;

function isKey<K extends string>(map: Record<K, unknown>, value: string | null): value is K {
  return value !== null && Object.prototype.hasOwnProperty.call(map, value);
}

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

// The API writes a cancel decision as one sentence ("Запит на скасування
// відхилено (причина: X). Коментар: Y"); the title already says the first
// half, so the line under it keeps the reason and the comment.
function cancelDetails(text: string | null, title: string): string | null {
  if (!text) return null;
  if (!text.startsWith(title)) return text;
  const rest = text
    .slice(title.length)
    .trim()
    .replace(/^\((.*?)\)\.?\s*/, (_, inner: string) => `${inner.charAt(0).toUpperCase()}${inner.slice(1)}. `)
    .trim();
  return rest || null;
}

function Move({ from, to }: { from: ReactNode; to: ReactNode }) {
  return (
    <>
      {from}
      <span className="font-medium text-neutral-500">на</span>
      {to}
    </>
  );
}

function itemOf(entry: HistoryEntryDto, index: number): TimelineItem {
  const base = { id: `${entry.at}-${index}`, at: entry.at, actor: actorOf(entry) };
  switch (entry.type) {
    case "created":
      return { ...base, title: "Замовлення створено", text: entry.text, tone: "blue", icon: <ClipboardDocumentListIcon /> };
    case "status": {
      const to = isKey(ORDER_STATUS, entry.to) ? entry.to : null;
      const from = isKey(ORDER_STATUS, entry.from) ? entry.from : null;
      return {
        ...base,
        title: (
          <>
            <span>Статус</span>
            {from && to ? (
              <Move from={<OrderStatusBadge status={from as OrderStatus} />} to={<OrderStatusBadge status={to as OrderStatus} />} />
            ) : to ? (
              <OrderStatusBadge status={to as OrderStatus} />
            ) : (
              <span>змінено</span>
            )}
          </>
        ),
        text: entry.text,
        tone: to ? ORDER_STATUS[to as OrderStatus].tone : "neutral",
      };
    }
    case "payment": {
      const to = isKey(PAYMENT_STATUS, entry.to) ? (entry.to as PaymentStatus) : null;
      return {
        ...base,
        title: (
          <>
            <span>Оплата</span>
            {to && <PaymentStatusBadge kind={to} />}
          </>
        ),
        text: entry.text,
        tone: to ? PAYMENT_STATUS[to].tone : "neutral",
        icon: to === "paid" ? <BanknotesIcon /> : undefined,
      };
    }
    case "cancel": {
      const approved = entry.to === "cancelled";
      const title = approved
        ? "Запит на скасування погоджено"
        : (entry.text ?? "").startsWith("Запит на скасування відхилено")
          ? "Запит на скасування відхилено"
          : "Запит на скасування";
      return { ...base, title, text: cancelDetails(entry.text, title), tone: approved ? "red" : "amber", icon: <NoSymbolIcon /> };
    }
    case "note":
      return { ...base, title: entry.text ?? "Нотатка", tone: "neutral", icon: <ChatBubbleLeftEllipsisIcon /> };
    case "document":
      return { ...base, title: "Документи", text: entry.text, tone: "neutral", icon: <DocumentTextIcon /> };
    case "shipment":
      return { ...base, title: "Відправлення", text: entry.text, tone: "indigo", icon: <TruckIcon /> };
    case "manager":
      return { ...base, title: entry.text ?? "Менеджер змінився", tone: "neutral", icon: <UserIcon /> };
    case "erp": {
      const to = isKey(ERP_STATE, entry.to) ? (entry.to as ErpState) : null;
      return {
        ...base,
        title: (
          <>
            <span>Обмін з BAS</span>
            {to && <ErpStateBadge state={to} />}
          </>
        ),
        text: entry.text,
        tone: (to ? ERP_STATE[to].tone : "neutral") as Tone,
        icon: <ArrowUpTrayIcon />,
      };
    }
    case "edit":
    default:
      return { ...base, title: entry.text ?? "Зміни в замовленні", tone: "neutral" };
  }
}

export function HistoryCard({ order }: { order: OrderDetail }) {
  const [all, setAll] = useState(false);
  const entries = order.history;
  const shown = all ? entries : entries.slice(0, SHOWN);
  return (
    <Card title="Історія" subtitle={entries.length > 0 ? `${countOf(entries.length, ["подія", "події", "подій"])}, нові вгорі` : undefined}>
      <Timeline items={shown.map(itemOf)} empty="Змін ще не було: замовлення в тому стані, у якому його оформили." />
      {entries.length > SHOWN && (
        <Button variant="ghost" size="sm" onClick={() => setAll((value) => !value)} className="mt-3 self-start">
          {all ? "Згорнути" : `Показати всю історію (${formatNumber(entries.length)})`}
        </Button>
      )}
    </Card>
  );
}
