"use client";

import { CheckCircleIcon, ChevronRightIcon, ClockIcon, ExclamationTriangleIcon, KeyIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "../../shell/StaffProvider";
import { adminApi } from "../../lib/api";
import { cx, formatDateTime, formatNumber } from "../../lib/format";
import { invalidate, useAdminQuery } from "../../lib/query";
import { Button } from "../../ui/Button";
import { Card, StatCard } from "../../ui/Card";
import { confirmDialog } from "../../ui/ConfirmDialog";
import { DataTable, TwoLineCell, type Column } from "../../ui/DataTable";
import { PageSection } from "../../ui/Page";
import { Skeleton, SkeletonText } from "../../ui/Skeleton";
import { ErrorState } from "../../ui/States";
import { toast, toastError } from "../../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING_INSET, TEXT } from "../../ui/tokens";
import { ResultBadge, countsText, describeError, directionLabel } from "../ExchangeLog";
import { FactGrid, Notice } from "../shared";
import { BAS_ENTITY_LABELS, type BasEntity, type BasLastCall, type BasSettingsAnswer, type BasStatusAnswer } from "../types";
import { basTabHref } from "./links";

// "Стан": is the exchange on, the queue, what BAS last sent of every kind
// of data, and how the exchange works, in words a manager understands.

// The order a manager thinks in: what BAS sends, then what it collects.
const ENTITY_ROWS: { entity: BasEntity; direction: "in" | "out" }[] = [
  { entity: "price-types", direction: "in" },
  { entity: "products", direction: "in" },
  { entity: "prices", direction: "in" },
  { entity: "stock", direction: "in" },
  { entity: "clients", direction: "in" },
  { entity: "ledger", direction: "in" },
  { entity: "order-statuses", direction: "in" },
  { entity: "documents", direction: "in" },
  { entity: "orders", direction: "out" },
  { entity: "returns", direction: "out" },
  { entity: "ping", direction: "in" },
];

type EntityRow = { entity: BasEntity; direction: "in" | "out"; call: BasLastCall | null };

const COLUMNS: Column<EntityRow>[] = [
  {
    key: "entity",
    header: "Дані",
    cell: (row) => <TwoLineCell title={BAS_ENTITY_LABELS[row.entity]} subtitle={directionLabel("bas", row.direction)} />,
  },
  {
    key: "at",
    header: "Останній виклик",
    width: 170,
    cell: (row) =>
      row.call ? (
        <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.call.at)}</span>
      ) : (
        <span className="text-neutral-400">Ще не було</span>
      ),
  },
  {
    key: "status",
    header: "Результат",
    width: 280,
    hideBelow: 640,
    cell: (row) =>
      row.call ? (
        <span className="flex min-w-0 flex-col items-start gap-1">
          <ResultBadge status={row.call.status} />
          {row.call.error && <span className={cx(TEXT.caption, "line-clamp-1 [overflow-wrap:anywhere]")}>{describeError(row.call.error)}</span>}
        </span>
      ) : (
        <span className="text-neutral-400">-</span>
      ),
  },
  {
    key: "counts",
    header: "Записів",
    align: "right",
    width: 190,
    hideBelow: 1024,
    cell: (row) =>
      row.call && row.call.counts.received > 0 ? (
        <span className="flex flex-col items-end">
          <span className="font-semibold tabular-nums">{formatNumber(row.call.counts.received)}</span>
          {countsText(row.call.counts) && <span className={cx(TEXT.caption, "whitespace-normal")}>{countsText(row.call.counts)}</span>}
        </span>
      ) : (
        <span className="text-neutral-400">-</span>
      ),
  },
];

function SwitchCard({ status }: { status: BasStatusAnswer }) {
  const { can } = useStaff();
  const [busy, setBusy] = useState(false);
  const enabled = status.enabled;

  const toggle = async () => {
    if (enabled) {
      const yes = await confirmDialog({
        title: "Вимкнути обмін з BAS?",
        text: "BAS отримуватиме відмову на кожен виклик, крім перевірки зв'язку, а нові замовлення не потраплятимуть у чергу.",
        confirmLabel: "Вимкнути обмін",
        tone: "danger",
      });
      if (!yes) return;
    }
    setBusy(true);
    const answer = await adminApi<BasSettingsAnswer>("/integrations/bas/settings", { method: "PUT", body: { enabled: !enabled } });
    setBusy(false);
    if (!answer.ok) {
      toastError(answer);
      return;
    }
    toast.success(answer.data.settings.enabled ? "Обмін з BAS увімкнено" : "Обмін з BAS вимкнено");
    invalidate("/integrations/bas");
  };

  return (
    <Card>
      <div className="flex flex-col gap-4 min-[640px]:flex-row min-[640px]:items-start min-[640px]:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className={cx(
              "flex size-11 shrink-0 items-center justify-center rounded-xl [&>svg]:size-6 [&>svg]:[stroke-width:1.6]",
              enabled ? "bg-[#e8f8f4] text-[#178d72]" : "bg-bg-cabinet text-neutral-500",
            )}
          >
            {enabled ? <CheckCircleIcon /> : <ClockIcon />}
          </span>
          <div className="min-w-0">
            <h2 className={TEXT.sectionTitle}>{enabled ? "Обмін увімкнено" : "Обмін вимкнено"}</h2>
            <p className={cx(TEXT.muted, "mt-1 max-w-[640px]")}>
              {enabled
                ? "BAS може надсилати дані на сайт і забирати нові замовлення з черги."
                : "BAS отримує відмову на кожен виклик, крім перевірки зв'язку; нові замовлення в чергу не потрапляють."}
            </p>
          </div>
        </div>
        {can("integrations.edit") && (
          <Button variant={enabled ? "secondary" : "primary"} loading={busy} onClick={toggle} className="shrink-0">
            {enabled ? "Вимкнути обмін" : "Увімкнути обмін"}
          </Button>
        )}
      </div>
      {status.keys.active === 0 && (
        <Notice
          className="mt-5"
          tone="amber"
          icon={<KeyIcon />}
          title="Немає жодного активного ключа"
          action={
            <Button size="sm" variant="secondary" href={basTabHref("keys")}>
              До ключів доступу
            </Button>
          }
        >
          Без ключа BAS не зможе звернутися до сайту, навіть коли обмін увімкнено.
        </Notice>
      )}
      <div className="mt-5 border-t border-stroke-subtle pt-5">
        <FactGrid
          items={[
            { label: "Режим", value: status.mode === "push" ? "Сайт також надсилає замовлення" : "BAS забирає чергу сам" },
            {
              label: "Активні ключі",
              value: status.keys.active > 0 ? formatNumber(status.keys.active) : "Немає",
              hint: status.keys.total > status.keys.active ? `усього ${formatNumber(status.keys.total)}` : undefined,
            },
            {
              label: "Викликів сьогодні",
              value: formatNumber(status.today.calls),
              hint: status.today.errors > 0 ? `з них з помилкою ${formatNumber(status.today.errors)}` : undefined,
            },
            {
              label: "Записів сьогодні",
              value: formatNumber(status.today.received),
              hint: countsText(status.today) || undefined,
            },
          ]}
        />
      </div>
    </Card>
  );
}

function HowItWorks({ mode }: { mode: "pull" | "push" }) {
  return (
    <Card title="Як це працює">
      <div className={cx(TEXT.body, "flex flex-col gap-3 text-neutral-700")}>
        <p>
          Облікова система BAS сама звертається до сайту за своїм розкладом. Спершу вона надсилає дані: типи цін, товари, ціни, залишки,
          клієнтів з договорами, взаєморозрахунки, статуси замовлень і документи.
        </p>
        <p>Потім забирає з черги нові замовлення та заявки на повернення і підтверджує кожне своїм номером.</p>
        <p>
          {mode === "push"
            ? "Додатково сайт сам надсилає кожне нове замовлення на адресу BAS з налаштувань; якщо BAS не відповідає, замовлення лишається в черзі. Інших звернень сайту до BAS немає."
            : "Сайт сам до облікової системи не звертається, тож відкривати доступ до бази BAS ззовні не потрібно."}{" "}
          Кожен виклик записується в журнал.
        </p>
      </div>
      <ol className="mt-5 flex flex-col gap-3 border-t border-stroke-subtle pt-5">
        {[
          { text: "Створіть ключ доступу", href: basTabHref("keys") },
          { text: "Передайте розробнику BAS ключ і опис обміну", href: basTabHref("dev") },
          { text: "Увімкніть обмін", href: basTabHref("settings") },
        ].map((step, index) => (
          <li key={step.text}>
            <Link
              href={step.href}
              className={cx("group -mx-2 flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-bg-subtle", COLOR_TRANSITION, FOCUS_RING_INSET)}
            >
              <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-cabinet text-[13px] font-bold tabular-nums">
                {index + 1}
              </span>
              <span className={cx(TEXT.bodyStrong, "min-w-0 flex-1")}>{step.text}</span>
              <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-neutral-400 group-hover:text-neutral-900" />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function BasStatusTab() {
  const status = useAdminQuery<BasStatusAnswer>("/integrations/bas/status");
  const data = status.data;

  if (status.error && !data) {
    return (
      <Card>
        <ErrorState failure={status.error} onRetry={status.reload} />
      </Card>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-4" data-loading="true">
        <Card>
          <Skeleton className="h-6 w-56" />
          <SkeletonText lines={2} className="mt-3" />
        </Card>
        <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <StatCard key={index} label="" value="" tone="white" loading />
          ))}
        </div>
      </div>
    );
  }

  const rows: EntityRow[] = ENTITY_ROWS.map((row) => ({ ...row, call: data.last[row.entity] }));
  const oldest = data.queue.oldestPendingAt;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <SwitchCard status={data} />
      <PageSection title="Черга для BAS" description="Замовлення й заявки на повернення, які BAS забирає з сайту.">
        <div className="grid min-w-0 grid-cols-1 gap-4 min-[640px]:grid-cols-3">
          <StatCard
            tone="white"
            icon={<ClockIcon />}
            label="Чекають на BAS"
            value={formatNumber(data.queue.pending)}
            hint={oldest ? `найдавніше з ${formatDateTime(oldest)}` : "черга порожня"}
            href={basTabHref("queue", { state: "pending" })}
          />
          <StatCard
            tone="white"
            icon={<CheckCircleIcon />}
            label="Прийнято BAS"
            value={formatNumber(data.queue.acked)}
            hint="підтверджено номером BAS"
            href={basTabHref("queue", { state: "acked" })}
          />
          <StatCard
            tone={data.queue.errors > 0 ? "dark" : "white"}
            icon={<ExclamationTriangleIcon />}
            label="З помилкою"
            value={formatNumber(data.queue.errors)}
            hint={data.queue.errors > 0 ? "BAS не зміг прийняти: перегляньте й повторіть" : "помилок немає"}
            href={basTabHref("queue", { state: "error" })}
          />
        </div>
      </PageSection>
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PageSection title="Останній виклик за даними" description="Натисніть рядок, щоб побачити всі виклики цього виду в журналі.">
          <DataTable
            caption="Останній виклик за кожним видом даних"
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row.entity}
            rowHref={(row) => basTabHref("log", { entity: row.entity })}
            dense
          />
        </PageSection>
        <HowItWorks mode={data.mode} />
      </div>
    </div>
  );
}
