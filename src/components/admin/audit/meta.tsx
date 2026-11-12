"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cx, formatBytes, formatDate, formatDateTime, formatMoney, formatNumber } from "../lib/format";
import { MEDIA_FOLDERS } from "../media/types";
import { SETTINGS_FIELDS } from "../settings/types";
import type { KeyValueItem } from "../ui/KeyValue";
import { LEAD_STATUS, ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS, statusLabel, type StatusMeta } from "../ui/status";
import { TEXT } from "../ui/tokens";
import type { JournalRow } from "./types";

// The details of a journal line (its `meta`) as label / value pairs in
// words. The summary sentence already says what happened; this adds the
// facts behind it (old and new values, counts, the files involved). Keys
// that only carry technical ids are left out; a key this file does not
// know is shown under its own name rather than hidden.

const LABELS: Record<string, string> = {
  from: "Було",
  to: "Стало",
  comment: "Коментар",
  reason: "Причина",
  rejectReason: "Причина відмови",
  status: "Статус",
  decision: "Рішення",
  changes: "Зміни",
  ids: "Записи",
  rows: "Рядків",
  filters: "Фільтри",
  tags: "Розділи сайту",
  sessions: "Сеанси клієнтів",
  staffSessions: "Сеанси співробітників",
  size: "Розмір",
  folder: "Папка",
  access: "Доступ",
  kind: "Вид",
  contentType: "Тип файлу",
  forced: "Видалено попри використання",
  usage: "Де використовувався",
  author: "Автор",
  ready: "Документ готовий",
  title: "Назва",
  pendingNote: "Примітка",
  file: "Файл",
  payment: "Оплата",
  paymentDue: "Термін оплати",
  refundAmount: "Сума повернення коштів",
  returnTtn: "ТТН повернення",
  prefix: "Початок ключа",
  scopes: "Дозволи",
  expiresAt: "Діє до",
  name: "Назва",
  isActive: "Активний",
  provider: "Сервіс",
  key: "Ключ API",
  ok: "Успішно",
  error: "Помилка",
  configured: "Сервіс налаштовано",
  sent: "Надіслано",
  failed: "З помилкою",
  skipped: "Пропущено",
  attempts: "Спроб",
  missing: "Не знайдено",
  action: "Дія",
  listed: "Показується в каталозі",
  subcategory: "Підкатегорія",
  role: "Роль",
  pricesRemoved: "Видалено цін",
  bulk: "Масова зміна",
  categories: "Змінено категорій",
  count: "Кількість",
  total: "Сума",
  paid: "Сплачено",
  overdue: "Прострочено",
  late: "Із простроченням",
  email: "Пошта",
  phone: "Телефон",
  login: "Логін",
  roleName: "Роль",
};

// Ids and positions that mean nothing to a reader (the record itself is
// linked from the line). "changed" lists field names the summary already
// spells out.
const HIDDEN = new Set(["seq", "sort", "rewritten", "roleTakenFrom", "changed", "group", "beforeId"]);

function hidden(key: string, value: unknown): boolean {
  if (HIDDEN.has(key)) return true;
  // noteId, documentId, queueId, mediaId, managerId ...
  return /Id$/.test(key) && (value === null || typeof value === "string" || (typeof value === "object" && value !== null && "from" in value));
}

const MEDIA_FIELD_LABELS: Record<string, string> = { alt: "Опис", filename: "Назва файлу", folder: "Папка" };
const ACCESS_LABELS: Record<string, string> = { public: "Публічний", private: "Приватний" };
const KIND_LABELS: Record<string, string> = { image: "Зображення", file: "Документ" };
const DECISION_LABELS: Record<string, string> = { approve: "Погоджено", decline: "Відхилено" };

const ISO_MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LIST_SHOWN = 12;

// Which status vocabulary the from / to / status values of an action use.
function statusMap(action: string): Record<string, StatusMeta> | null {
  if (action === "order.status" || action.startsWith("order.cancel")) return ORDER_STATUS;
  if (action === "return.status") return RETURN_STATUS;
  if (action.startsWith("lead.status")) return LEAD_STATUS;
  return null;
}

type Context = { action: string; key: string };

function scalar(value: unknown, context: Context): string {
  if (value === null || value === undefined || value === "") return "немає";
  if (typeof value === "boolean") return value ? "Так" : "Ні";
  if (typeof value === "number") {
    if (context.key === "size") return formatBytes(value);
    if (["refundAmount", "paid", "overdue", "total"].includes(context.key)) return formatMoney(value);
    return formatNumber(value);
  }
  if (typeof value === "string") {
    const map = ["from", "to", "status"].includes(context.key) ? statusMap(context.action) : null;
    if (map) return statusLabel(map, value);
    if (context.key === "kind" && context.action.startsWith("order.payment")) return statusLabel(PAYMENT_STATUS, value);
    if (context.key === "folder") return MEDIA_FOLDERS.find((folder) => folder.value === value)?.label ?? value;
    if (context.key === "access") return ACCESS_LABELS[value] ?? value;
    if (context.key === "kind" && context.action.startsWith("media.")) return KIND_LABELS[value] ?? value;
    if (context.key === "decision") return DECISION_LABELS[value] ?? value;
    if (ISO_MOMENT.test(value)) return formatDateTime(value);
    if (DAY.test(value)) return formatDate(value);
    return value;
  }
  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A value in words: scalars, lists, "from -> to" pairs, small objects.
function render(value: unknown, context: Context, depth = 0): ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) return "немає";
    if (value.every((item) => !isRecord(item) && !Array.isArray(item))) {
      const shown = value.slice(0, LIST_SHOWN).map((item) => scalar(item, context));
      const more = value.length - shown.length;
      return `${shown.join(", ")}${more > 0 ? ` і ще ${formatNumber(more)}` : ""}`;
    }
    // Records a line refers to (the usage of a deleted file): their names,
    // linked when they have a page.
    return (
      <span className="flex flex-col gap-0.5">
        {value.slice(0, LIST_SHOWN).map((item, index) => {
          if (!isRecord(item)) return <span key={index}>{String(item)}</span>;
          const label = typeof item.label === "string" ? item.label : typeof item.name === "string" ? item.name : null;
          const href = typeof item.href === "string" && item.href.startsWith("/admin") ? item.href : null;
          const note = typeof item.field === "string" ? item.field : null;
          if (!label) return <span key={index}>{entries(item, context, depth + 1)}</span>;
          return (
            <span key={index}>
              {href ? (
                <Link href={href} className="font-semibold underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900">
                  {label}
                </Link>
              ) : (
                label
              )}
              {note && <span className={cx(TEXT.caption, "ml-1.5")}>{note}</span>}
            </span>
          );
        })}
        {value.length > LIST_SHOWN && <span className={TEXT.caption}>і ще {formatNumber(value.length - LIST_SHOWN)}</span>}
      </span>
    );
  }
  if (isRecord(value)) {
    if ("from" in value || "to" in value) {
      return (
        <span>
          {render(value.from, context, depth + 1)}
          <span className="px-1.5 text-neutral-400">{"->"}</span>
          {render(value.to, context, depth + 1)}
        </span>
      );
    }
    return entries(value, context, depth + 1);
  }
  return scalar(value, context);
}

// A small object as "label: value; label: value".
function entries(value: Record<string, unknown>, context: Context, depth: number): ReactNode {
  if (depth > 3) return "...";
  const parts = Object.entries(value).filter(([key, item]) => !hidden(key, item));
  if (parts.length === 0) return "немає";
  return parts.map(([key, item], index) => (
    <span key={key}>
      {index > 0 && "; "}
      <span className="text-neutral-500">{(LABELS[key] ?? key).toLowerCase()}: </span>
      {render(item, { action: context.action, key }, depth)}
    </span>
  ));
}

// What a changed field of a settings group or a media file is called.
function changeLabel(row: JournalRow, field: string): string {
  if (row.action.startsWith("media.")) return MEDIA_FIELD_LABELS[field] ?? field;
  if (row.action === "settings.update") {
    const group = typeof row.meta.group === "string" ? row.meta.group : row.entity?.id;
    const def = SETTINGS_FIELDS.find((item) => item.group === group)?.fields.find((item) => item.key === field);
    if (def) return def.label;
    if (field === "categories") return "Категорії";
  }
  return LABELS[field] ?? field;
}

export function metaItems(row: JournalRow): KeyValueItem[] {
  const items: KeyValueItem[] = [];
  const meta = row.meta ?? {};
  const context = (key: string): Context => ({ action: row.action, key });

  // "from" and "to" of the line itself read as one change.
  const pair = "from" in meta && "to" in meta;
  if (pair) items.push({ label: "Зміна", value: render({ from: meta.from, to: meta.to }, context("from")) });

  for (const [key, value] of Object.entries(meta)) {
    if (pair && (key === "from" || key === "to")) continue;
    if (key === "from" && row.action.endsWith(".duplicate")) {
      items.push({ label: "Скопійовано з", value: render(value, context(key)) });
      continue;
    }
    if (hidden(key, value)) continue;
    // A list of field changes: one line per field.
    if (key === "changes" && Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.field === "string")) {
      for (const change of value as { field: string; from: unknown; to: unknown }[]) {
        items.push({ label: changeLabel(row, change.field), value: render({ from: change.from, to: change.to }, context(change.field)) });
      }
      continue;
    }
    items.push({ label: LABELS[key] ?? key, value: render(value, context(key)) });
  }
  return items;
}
