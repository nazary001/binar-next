"use client";

import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "../../shell/StaffProvider";
import { adminApi } from "../../lib/api";
import { cx, formatDateTime, formatNumber } from "../../lib/format";
import { invalidate, useAdminQuery } from "../../lib/query";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { promptDialog } from "../../ui/ConfirmDialog";
import { DataTable, DateCell, MoneyCell, type Column } from "../../ui/DataTable";
import { FilterBar } from "../../ui/FilterBar";
import { Pagination } from "../../ui/Pagination";
import { Select } from "../../ui/Select";
import { EmptyState } from "../../ui/States";
import { Tabs } from "../../ui/Tabs";
import { toast, toastError } from "../../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, type Tone } from "../../ui/tokens";
import { useListParams } from "../../ui/useListParams";
import {
  QUEUE_KIND_LABELS,
  QUEUE_STATE_LABELS,
  type BasStatusAnswer,
  type ExchangeQueueDto,
  type ListAnswer,
  type QueueEntryAnswer,
  type QueueKind,
  type QueueState,
} from "../types";

// "Черга": what the site has handed to BAS (orders and return requests),
// whether BAS took each one and under which number, and what it refused.
// A refused or taken entry can be sent again, and so can a waiting one
// whose post to the BAS address failed (push mode); any order can be added
// by its number. Filters live in the address bar, as the API names them.

const STATE_TONE: Record<QueueState, Tone> = { pending: "amber", acked: "green", error: "red" };

type StateTab = "all" | QueueState;

function entityHref(entry: ExchangeQueueDto): string {
  return entry.kind === "order" ? `/admin/orders/${encodeURIComponent(entry.entityId)}` : `/admin/returns/${encodeURIComponent(entry.entityId)}`;
}

function entryTitle(entry: ExchangeQueueDto): string {
  if (entry.kind === "order") return `Замовлення №${entry.number ?? entry.entityId}`;
  return entry.number ? `Повернення до №${entry.number}` : `Повернення ${entry.entityId}`;
}

export function BasQueueTab() {
  const { can } = useStaff();
  const canEdit = can("integrations.edit");
  const list = useListParams({ defaults: { sort: "-seq", limit: "20" }, keep: ["tab"] });
  const query = new URLSearchParams(list.queryString);
  query.delete("tab");
  const queue = useAdminQuery<ListAnswer<ExchangeQueueDto>>(`/integrations/bas/queue?${query.toString()}`);
  const status = useAdminQuery<BasStatusAnswer>("/integrations/bas/status");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const state = (list.get("state") || "all") as StateTab;
  const kind = (list.get("kind") || null) as QueueKind | null;
  const counts = status.data?.queue;
  const filtered = state !== "all" || kind !== null;

  const refresh = () => {
    invalidate("/integrations/bas/queue");
    invalidate("/integrations/bas/status");
  };

  const retry = async (entry: ExchangeQueueDto) => {
    setRetrying(entry.id);
    const answer = await adminApi<QueueEntryAnswer>(`/integrations/bas/queue/${encodeURIComponent(entry.id)}/retry`, { method: "POST" });
    setRetrying(null);
    if (!answer.ok) {
      toastError(answer, { state: "Цей запис і так чекає на BAS." });
      refresh();
      return;
    }
    const push = answer.data.push;
    if (push && push.ok) {
      toast.success(`${entryTitle(entry)} надіслано на адресу BAS, і BAS його прийняв${push.number ? `: №${push.number}` : ""}.`);
    } else if (push) {
      toast.error(`${entryTitle(entry)} знову в черзі, але надіслати на адресу BAS не вдалося: ${push.error ?? "невідома помилка"}`);
    } else {
      toast.success(`${entryTitle(entry)} знову в черзі: BAS забере його під час наступного обміну.`);
    }
    refresh();
  };

  const addOrder = async () => {
    const number = await promptDialog({
      title: "Додати замовлення в чергу BAS",
      text: "Замовлення потрапить у чергу, навіть якщо обмін вимкнено або замовлення такого виду не передаються.",
      label: "Номер замовлення",
      placeholder: "Наприклад, 48291065 або BN-100012",
      required: true,
      maxLength: 64,
      confirmLabel: "Додати в чергу",
    });
    if (number === null) return;
    setAdding(true);
    const answer = await adminApi<QueueEntryAnswer>("/integrations/bas/queue", { method: "POST", body: { kind: "order", entityId: number } });
    setAdding(false);
    if (!answer.ok) {
      const existing = answer.data.entry as ExchangeQueueDto | undefined;
      const exists =
        existing?.state === "pending"
          ? "Це замовлення вже чекає в черзі на BAS."
          : existing?.state === "acked"
            ? "BAS уже прийняв це замовлення. Щоб передати його ще раз, натисніть «Повторити» в його рядку."
            : "Це замовлення вже в черзі з помилкою: натисніть «Повторити» в його рядку.";
      toastError(answer, {
        "not-found": `Замовлення №${number} не знайдено. Перевірте номер.`,
        "bad-request": "Перевірте номер замовлення: лише літери, цифри та дефіс.",
        exists,
      });
      return;
    }
    const push = answer.data.push;
    const title = `Замовлення №${answer.data.entry.number ?? number}`;
    if (push && push.ok) toast.success(`${title} надіслано на адресу BAS, і BAS його прийняв${push.number ? `: №${push.number}` : ""}`);
    else if (push) toast.error(`${title} додано в чергу BAS, але надіслати на адресу BAS не вдалося: ${push.error ?? "невідома помилка"}`);
    else toast.success(`${title} додано в чергу BAS`);
    refresh();
  };

  const tabs: { key: StateTab; label: string; count?: number }[] = [
    { key: "all", label: "Усі" },
    { key: "pending", label: "Чекають", count: counts?.pending },
    { key: "error", label: "З помилкою", count: counts?.errors },
    { key: "acked", label: "Прийняті", count: counts?.acked },
  ];

  const columns: Column<ExchangeQueueDto>[] = [
    {
      key: "seq",
      header: "У черзі",
      sortKey: "seq",
      firstSort: "desc",
      width: 96,
      cell: (entry) => <span className="font-semibold tabular-nums text-neutral-700">#{formatNumber(entry.seq)}</span>,
    },
    {
      key: "what",
      header: "Що",
      interactive: true,
      cell: (entry) => (
        <span className="flex min-w-0 flex-col">
          {entry.missing ? (
            <span className="truncate font-semibold text-neutral-500">{entryTitle(entry)}</span>
          ) : (
            <Link
              href={entityHref(entry)}
              className={cx("w-fit max-w-full truncate rounded-md font-semibold text-neutral-900 underline-offset-4 hover:text-brand hover:underline", COLOR_TRANSITION, FOCUS_RING)}
            >
              {entryTitle(entry)}
            </Link>
          )}
          <span className={cx(TEXT.caption, "truncate")}>{entry.missing ? "Запис уже видалено з сайту" : entry.label}</span>
        </span>
      ),
    },
    {
      key: "total",
      header: "Сума",
      align: "right",
      width: 140,
      hideBelow: 640,
      cell: (entry) => <MoneyCell value={entry.total} />,
    },
    {
      key: "state",
      header: "Стан",
      width: 240,
      cell: (entry) => (
        <span className="flex min-w-0 flex-col items-start gap-1">
          <Badge tone={STATE_TONE[entry.state]} dot>
            {QUEUE_STATE_LABELS[entry.state]}
          </Badge>
          {entry.state === "error" && entry.error && (
            <span className={cx(TEXT.caption, "line-clamp-2 [overflow-wrap:anywhere]")}>{entry.error}</span>
          )}
          {entry.state === "pending" && entry.error && (
            <span className={cx(TEXT.caption, "line-clamp-2 [overflow-wrap:anywhere]")}>Не надіслано на адресу BAS: {entry.error}</span>
          )}
          {entry.stale && (
            <span className={cx(TEXT.caption, "line-clamp-2 [overflow-wrap:anywhere]")}>
              BAS не забирає запис понад годину: «Повторити» поставить його в чергу ще раз
            </span>
          )}
          {entry.state === "acked" && entry.ack?.number && <span className={TEXT.caption}>У BAS: №{entry.ack.number}</span>}
          {entry.state !== "error" && entry.attempts > 0 && (
            <span className={TEXT.caption}>Помилок раніше: {formatNumber(entry.attempts)}</span>
          )}
        </span>
      ),
    },
    {
      key: "created",
      header: "Додано",
      width: 120,
      hideBelow: 1024,
      cell: (entry) => <DateCell value={entry.createdAt} withTime />,
    },
    {
      key: "acked",
      header: "Прийнято",
      width: 150,
      hideBelow: 1280,
      cell: (entry) =>
        entry.ackedAt ? (
          <span className="flex flex-col whitespace-nowrap tabular-nums">
            <span>{formatDateTime(entry.ackedAt)}</span>
            {entry.ack?.number && <span className={TEXT.caption}>№{entry.ack.number}</span>}
          </span>
        ) : (
          <span className="text-neutral-400">-</span>
        ),
    },
  ];
  if (canEdit) {
    columns.push({
      key: "action",
      header: <span className="sr-only">Дії</span>,
      width: 150,
      align: "right",
      interactive: true,
      cell: (entry) =>
        (entry.state === "pending" && !entry.error && !entry.stale) || entry.missing ? null : (
          <Button size="sm" variant="secondary" iconLeft={ArrowPathIcon} loading={retrying === entry.id} onClick={() => void retry(entry)}>
            Повторити
          </Button>
        ),
    });
  }

  return (
    <div className="min-w-0">
      <FilterBar
        filters={
          <>
            <Tabs
              label="Стан запису в черзі"
              value={state}
              onChange={(key) => list.set({ state: key === "all" ? null : key })}
              items={tabs}
            />
            <Select
            aria-label="Що"
            placeholder="Замовлення і повернення"
            clearable
            value={kind}
            onChange={(value) => list.set({ kind: value })}
              options={(Object.keys(QUEUE_KIND_LABELS) as QueueKind[]).map((value) => ({ value, label: QUEUE_KIND_LABELS[value] }))}
            />
          </>
        }
        actions={
          canEdit ? (
            <Button variant="secondary" iconLeft={PlusIcon} onClick={addOrder} loading={adding}>
              Додати замовлення в чергу
            </Button>
          ) : undefined
        }
      />
      <DataTable
        caption="Черга обміну з BAS"
        columns={columns}
        rows={queue.data?.items}
        rowKey={(entry) => entry.id}
        loading={queue.loading}
        stale={queue.stale}
        error={queue.error}
        onRetry={queue.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        minWidth={560}
        empty={
          filtered ? (
            <EmptyState
              title="Таких записів немає"
              text="Змініть стан або вид запису, щоб побачити інші."
              action={
                <Button variant="secondary" onClick={list.reset}>
                  Скинути фільтри
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Черга порожня"
              text="Нові замовлення потрапляють сюди самі, коли обмін увімкнено; BAS забирає їх за своїм розкладом."
              action={
                canEdit ? (
                  <Button variant="secondary" iconLeft={PlusIcon} onClick={addOrder}>
                    Додати замовлення в чергу
                  </Button>
                ) : undefined
              }
            />
          )
        }
        footer={
          <Pagination
            page={list.page}
            limit={list.limit}
            total={queue.data?.total ?? 0}
            onPage={(page) => list.set({ page })}
            onLimit={(limit) => list.set({ limit })}
          />
        }
      />
    </div>
  );
}
