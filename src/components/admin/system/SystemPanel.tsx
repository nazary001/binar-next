"use client";

import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { useState } from "react";
import { MEDIA_FOLDERS } from "../media/types";
import { countOf, cx, formatBytes, formatDateTime, formatNumber } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { DataTable, TwoLineCell, type Column } from "../ui/DataTable";
import { KeyValueList } from "../ui/KeyValue";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { SURFACE, TEXT, TONES, type Tone } from "../ui/tokens";
import { LaunchChecklist } from "./LaunchChecklist";
import { MaintenanceCard } from "./MaintenanceCard";
import { COLLECTION_LABELS, type SecretsKeyState, type SystemCollection, type SystemInfo, type SystemInfoResponse } from "./types";

// The "Система" tab of the settings page (GET /system): the launch
// checklist, the database against the free cluster's quota, the files of
// the media library, the environment, how secrets are sealed, and the two
// maintenance buttons.

const COLLECTIONS_SHOWN = 8;

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, (part / whole) * 100) : 0;
}

function percentText(value: number): string {
  if (value > 0 && value < 0.1) return "<0,1 %";
  return `${value.toFixed(value < 10 ? 1 : 0).replace(".", ",")} %`;
}

// --- database ----------------------------------------------------------------------

function UsageBar({ data, index, limit }: { data: number; index: number; limit: number }) {
  const used = data + index;
  const share = percent(used, limit);
  // Orange only once the quota needs attention.
  const busy = share >= 80;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={cx(TEXT.figure, "text-neutral-900")}>{formatBytes(used)}</span>
        <span className={TEXT.muted}>із {formatBytes(limit)} безкоштовного кластера</span>
        <Badge tone={busy ? "orange" : "neutral"} className="ml-auto">
          {`Зайнято ${percentText(share)}`}
        </Badge>
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-bg-cabinet"
        role="meter"
        aria-label="Зайнято місця в базі даних"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share)}
        aria-valuetext={`${formatBytes(used)} із ${formatBytes(limit)}`}
      >
        <span className="h-full" style={{ width: `${percent(data, limit)}%`, backgroundColor: busy ? TONES.orange.dot : "#1d1d1f" }} />
        <span className="h-full" style={{ width: `${percent(index, limit)}%`, backgroundColor: "#a5a5a5" }} />
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1.5">
        {[
          { label: "Дані", value: formatBytes(data), color: busy ? TONES.orange.dot : "#1d1d1f" },
          { label: "Індекси", value: formatBytes(index), color: "#a5a5a5" },
          { label: "Вільно", value: formatBytes(Math.max(0, limit - used)), color: "#e8e8e9" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
            <dt className={TEXT.caption}>{item.label}</dt>
            <dd className="text-[12px] font-semibold leading-4 text-neutral-900 tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const COLLECTION_COLUMNS: Column<SystemCollection>[] = [
  {
    key: "name",
    header: "Колекція",
    // Takes the room left and truncates there (a cell of width 100 % and
    // max-width 0), so the figures always fit on a phone.
    width: "100%",
    className: "max-w-0",
    cell: (row) => <TwoLineCell title={COLLECTION_LABELS[row.name] ?? row.name} subtitle={COLLECTION_LABELS[row.name] ? row.name : undefined} />,
  },
  { key: "count", header: "Документів", align: "right", cell: (row) => <span className="tabular-nums">{formatNumber(row.count)}</span> },
  { key: "size", header: "Дані", align: "right", cell: (row) => <span className="tabular-nums">{formatBytes(row.sizeBytes)}</span> },
  {
    key: "index",
    header: "Індекси",
    align: "right",
    hideBelow: 640,
    cell: (row) => <span className="tabular-nums text-neutral-500">{formatBytes(row.indexBytes)}</span>,
  },
];

function DatabaseCard({ database }: { database: SystemInfo["database"] }) {
  const [all, setAll] = useState(false);
  const sorted = [...database.collections].sort(
    (a, b) => (b.sizeBytes ?? -1) - (a.sizeBytes ?? -1) || b.count - a.count || a.name.localeCompare(b.name),
  );
  const rows = all ? sorted : sorted.slice(0, COLLECTIONS_SHOWN);
  const documents = database.collections.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card
      title="База даних"
      subtitle={`${database.name}: ${countOf(database.collections.length, ["колекція", "колекції", "колекцій"])}, ${countOf(documents, ["документ", "документи", "документів"])}`}
      padding="none"
    >
      <div className="px-5 pb-5 min-[1024px]:px-6 min-[1024px]:pb-6">
        <UsageBar data={database.dataBytes} index={database.indexBytes} limit={database.limitBytes} />
      </div>
      <DataTable
        caption="Колекції бази даних, від найбільшої"
        columns={COLLECTION_COLUMNS}
        rows={rows}
        rowKey={(row) => row.name}
        dense
        className="rounded-t-none"
        footer={
          sorted.length > COLLECTIONS_SHOWN ? (
            <Button variant="ghost" size="sm" onClick={() => setAll((open) => !open)} className="-ml-3">
              {all ? "Показати лише найбільші" : `Показати всі (${formatNumber(sorted.length)})`}
            </Button>
          ) : undefined
        }
      />
    </Card>
  );
}

// --- files ---------------------------------------------------------------------------

function FilesCard({ media }: { media: SystemInfo["media"] }) {
  const { can } = useStaff();
  const folders = [...media.byFolder].sort((a, b) => b.bytes - a.bytes);
  const biggest = Math.max(1, ...folders.map((item) => item.bytes));
  return (
    <Card
      title="Файли"
      subtitle={`Медіатека: ${countOf(media.count, ["файл", "файли", "файлів"])}, ${formatBytes(media.bytes)}`}
      actions={
        can(["content.view", "catalog.view", "orders.view"]) ? (
          <Button variant="secondary" size="sm" href="/admin/media">
            Медіатека
          </Button>
        ) : undefined
      }
    >
      {folders.length === 0 ? (
        <p className={cx(TEXT.muted, "rounded-2xl bg-bg-subtle px-4 py-3")}>
          {"Файлів ще немає: вони з'являться, коли їх завантажать у медіатеку."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {folders.map((item) => (
            <li key={item.folder} className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className={TEXT.bodyStrong}>{MEDIA_FOLDERS.find((folder) => folder.value === item.folder)?.label ?? item.folder}</span>
                <span className="text-[13px] leading-[18px] text-neutral-500 tabular-nums">
                  {formatNumber(item.count)} шт. <span className="font-semibold text-neutral-900">{formatBytes(item.bytes)}</span>
                </span>
              </div>
              <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-bg-cabinet">
                <span className="block h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(2, percent(item.bytes, biggest))}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// --- environment and security ------------------------------------------------------------

function EnvironmentCard({ system, onRefresh, refreshing }: { system: SystemInfo; onRefresh: () => void; refreshing: boolean }) {
  const { runtime } = system;
  return (
    <Card
      title="Середовище"
      subtitle={`Дані на ${formatDateTime(system.generatedAt)}`}
      actions={<IconButton size="sm" icon={ArrowPathIcon} label="Оновити дані сторінки" onClick={onRefresh} loading={refreshing} />}
    >
      <KeyValueList
        dense
        items={[
          {
            label: "Режим",
            value: runtime.production ? <Badge tone="green" dot>Бойовий сайт</Badge> : <Badge tone="indigo" dot>Розробка</Badge>,
            hint: runtime.production ? undefined : "Дані беруться з копії бази; живий сайт ці зміни не бачить.",
          },
          {
            label: "Тестовий режим",
            value: runtime.testMode ? <Badge tone="amber" dot>Увімкнено</Badge> : "Вимкнено",
            hint: runtime.testMode ? "Ліміти спроб вимкнено, працюють службові адреси для автотестів. На бойовому сайті він не вмикається." : undefined,
          },
          {
            label: "Розміщення",
            value: runtime.vercel ? `Vercel${runtime.region ? `, регіон ${runtime.region}` : ""}` : "Локальний комп'ютер або власний сервер",
          },
          { label: "Версії", value: `Node.js ${runtime.node.replace(/^v/, "")}, Next.js ${runtime.next}` },
        ]}
      />
    </Card>
  );
}

const SECRETS: Record<SecretsKeyState, { tone: Tone; label: string; text: string; todo?: string }> = {
  own: {
    tone: "green",
    label: "Власний ключ",
    text: "Ключі Нової Пошти, BAS і пошти шифруються окремим ключем SECRETS_KEY.",
  },
  derived: {
    tone: "amber",
    label: "Виведений ключ",
    text: "Окремого SECRETS_KEY немає: ключ шифрування виводиться з REVALIDATE_SECRET. Це працює, але зміна REVALIDATE_SECRET зробить збережені ключі нечитаними.",
    todo: "Задайте SECRETS_KEY (32 випадкові байти: 64 шістнадцяткові символи або base64) у змінних середовища Vercel і перезапустіть сайт. Після цього введіть ключі інтеграцій ще раз.",
  },
  invalid: {
    tone: "red",
    label: "Неправильний ключ",
    text: "SECRETS_KEY задано, але це не 32 байти: зберегти ключі інтеграцій неможливо.",
    todo: "Замініть SECRETS_KEY на 64 шістнадцяткові символи або 32 байти в base64 і перезапустіть сайт.",
  },
  missing: {
    tone: "red",
    label: "Ключа немає",
    text: "Немає ні SECRETS_KEY, ні REVALIDATE_SECRET: ключі Нової Пошти, BAS і пошти зберегти неможливо.",
    todo: "Задайте SECRETS_KEY (32 випадкові байти: 64 шістнадцяткові символи або base64) у змінних середовища і перезапустіть сайт.",
  },
};

function SecurityCard({ security }: { security: SystemInfo["security"] }) {
  const secrets = SECRETS[security.secretsKey];
  return (
    <div id="security" className="scroll-mt-24">
      <Card title="Безпека" subtitle="Як зберігаються секрети. Самі значення панель ніколи не показує.">
        <KeyValueList
          dense
          items={[
            {
              label: "Шифрування секретів",
              value: (
                <span className="flex flex-col items-start gap-1.5">
                  <Badge tone={secrets.tone} dot>
                    {secrets.label}
                  </Badge>
                  <span className={TEXT.muted}>{secrets.text}</span>
                  {secrets.todo && (
                    <span className={cx(SURFACE.inset, TEXT.body, "mt-1 block px-3 py-2")}>
                      <span className="font-semibold">Що зробити: </span>
                      {secrets.todo}
                    </span>
                  )}
                </span>
              ),
            },
            {
              label: "Секрет оновлення кешу (REVALIDATE_SECRET)",
              value: (
                <span className="flex flex-col items-start gap-1.5">
                  {security.revalidateSecret ? (
                    <Badge tone="green" dot>
                      Задано
                    </Badge>
                  ) : (
                    <Badge tone="amber" dot>
                      Не задано
                    </Badge>
                  )}
                  <span className={TEXT.muted}>
                    {security.revalidateSecret
                      ? "Зовнішні сервіси можуть оновлювати кеш сайту лише з цим секретом."
                      : "На бойовому сайті оновлення кешу ззовні вимкнене. Кнопка «Оновити кеш сайту» працює й без нього."}
                  </span>
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

// --- the tab -----------------------------------------------------------------------

function SystemSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy>
      <div className={cx(SURFACE.card, SURFACE.cardPadding, "flex flex-col gap-4")}>
        <Skeleton className="h-5 w-72" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton shape="tile" className="size-10" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className={cx(SURFACE.card, SURFACE.cardPadding, "flex flex-col gap-4")}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-56" />
          <Skeleton shape="pill" className="h-2.5 w-full" />
          <SkeletonText lines={5} />
        </div>
        <div className={cx(SURFACE.card, SURFACE.cardPadding, "flex flex-col gap-4")}>
          <Skeleton className="h-5 w-40" />
          <SkeletonText lines={6} />
        </div>
      </div>
    </div>
  );
}

export function SystemPanel() {
  const query = useAdminQuery<SystemInfoResponse>("/system");
  const system = query.data?.system;

  if (!system) {
    if (query.error) {
      return (
        <Card padding="none">
          <ErrorState failure={query.error} onRetry={query.reload} />
        </Card>
      );
    }
    return <SystemSkeleton />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <LaunchChecklist system={system} />
      {/* Two columns from 1280 px: the database and its upkeep on the left,
          the environment, security and files on the right. */}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-4">
          <DatabaseCard database={system.database} />
          <MaintenanceCard counts={system.counts} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <EnvironmentCard system={system} onRefresh={query.reload} refreshing={query.fetching} />
          <SecurityCard security={system.security} />
          <FilesCard media={system.media} />
        </div>
      </div>
    </div>
  );
}
