"use client";

import { ArrowTopRightOnSquareIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { cx, formatDateTime } from "../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { DateTimeInput } from "../ui/DateInput";
import { BlogStatusBadge } from "../ui/status";
import { TEXT, TONES } from "../ui/tokens";
import { NO_PUBLISH_HINT, NO_UNPUBLISH_HINT } from "./messages";
import { PUBLISH_NEEDS, type PublishNeed } from "./model";
import type { BlogPostDetail } from "./types";

// "Публікація": where the article stands (draft, scheduled, on the site),
// what it still lacks to go public, and the buttons that move it. Publishing
// saves unsaved edits first (the editor does that); a role without
// content.publish sees the state and a hint instead of the buttons.

export type PublishBusy = "publish" | "schedule" | "unpublish" | null;

export type PublishCardProps = {
  record: BlogPostDetail | null;
  missing: PublishNeed[];
  // A publish was refused (or tried with gaps): the gaps turn red.
  attempted: boolean;
  canPublish: boolean;
  // A role that may only look gets no hint about drafts to hand over.
  canEdit: boolean;
  busy: PublishBusy;
  locked: boolean;
  scheduleAt: string;
  onScheduleAt: (value: string) => void;
  scheduleError?: string;
  onPublish: () => void;
  onSchedule: () => void;
  onUnpublish: () => void;
};

function Checklist({ missing, attempted }: { missing: PublishNeed[]; attempted: boolean }) {
  const gaps = new Set(missing);
  return (
    <div className="rounded-2xl bg-bg-subtle px-4 py-3">
      <p className={TEXT.label}>{gaps.size === 0 ? "Усе готово до публікації" : "Для публікації потрібно"}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {PUBLISH_NEEDS.map((need) => {
          const done = !gaps.has(need.key);
          const alarm = !done && attempted;
          return (
            <li key={need.key} className="flex items-center gap-2 text-[13px] leading-[18px]">
              {done ? (
                <CheckCircleIcon aria-hidden className="size-4 shrink-0" style={{ color: TONES.green.dot }} />
              ) : alarm ? (
                <ExclamationCircleIcon aria-hidden className="size-4 shrink-0 text-negative" />
              ) : (
                <span aria-hidden className="mx-0.5 size-3 shrink-0 rounded-full border-[1.5px] border-neutral-400" />
              )}
              <span className={cx(done ? "text-neutral-600" : alarm ? "font-semibold text-negative" : "text-neutral-900")}>{need.label}</span>
              <span className="sr-only">{done ? "- є" : "- бракує"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PublishCard({
  record,
  missing,
  attempted,
  canPublish,
  canEdit,
  busy,
  locked,
  scheduleAt,
  onScheduleAt,
  scheduleError,
  onPublish,
  onSchedule,
  onUnpublish,
}: PublishCardProps) {
  const status = record?.status ?? "draft";
  const anyBusy = busy !== null || locked;

  let state: string;
  if (!record) state = "Нова стаття ще не збережена. Її бачать лише співробітники.";
  else if (status === "published") state = record.publishedAt ? `На сайті з ${formatDateTime(record.publishedAt)}.` : "Стаття на сайті.";
  else if (status === "scheduled") state = `З'явиться на сайті ${formatDateTime(record.publishedAt)} за київським часом.`;
  else state = "Чернетку бачать лише співробітники.";

  const schedulePicker = (label: string, action: string) => (
    <div className="flex flex-col gap-2">
      <DateTimeInput
        label={label}
        value={scheduleAt}
        onChange={onScheduleAt}
        clearable
        error={scheduleError}
        hint="За київським часом. Стаття з'явиться на сайті протягом п'яти хвилин після нього."
        disabled={anyBusy}
      />
      <Button variant="secondary" iconLeft={CalendarDaysIcon} onClick={onSchedule} loading={busy === "schedule"} disabled={anyBusy && busy !== "schedule"} fullWidth>
        {action}
      </Button>
    </div>
  );

  return (
    <Card
      title="Публікація"
      actions={record ? <BlogStatusBadge status={status} size="md" /> : <Badge tone="neutral" size="md">Не збережено</Badge>}
    >
      <div className="flex flex-col gap-4">
        <p className={TEXT.muted}>{state}</p>

        {status !== "published" && canEdit && <Checklist missing={missing} attempted={attempted} />}

        {!canPublish && (
          <>
            {status === "published" && record && (
              <Button variant="secondary" href={record.href} external iconRight={ArrowTopRightOnSquareIcon} fullWidth>
                Відкрити на сайті
              </Button>
            )}
            <p className={TEXT.caption}>
              {!canEdit ? "Ваша роль може лише переглядати статті." : status === "draft" ? NO_PUBLISH_HINT : NO_UNPUBLISH_HINT}
            </p>
          </>
        )}

        {canPublish && status === "draft" && (
          <>
            <Button variant="accent" onClick={onPublish} loading={busy === "publish"} disabled={anyBusy && busy !== "publish"} fullWidth>
              Опублікувати зараз
            </Button>
            <div className="border-t border-stroke-subtle pt-4">{schedulePicker("Або запланувати на", "Запланувати")}</div>
          </>
        )}

        {canPublish && status === "scheduled" && (
          <>
            <Button variant="accent" onClick={onPublish} loading={busy === "publish"} disabled={anyBusy && busy !== "publish"} fullWidth>
              Опублікувати зараз
            </Button>
            <div className="border-t border-stroke-subtle pt-4">{schedulePicker("Новий час публікації", "Перенести публікацію")}</div>
            <Button variant="dangerGhost" onClick={onUnpublish} loading={busy === "unpublish"} disabled={anyBusy && busy !== "unpublish"} fullWidth>
              Скасувати планування
            </Button>
          </>
        )}

        {canPublish && status === "published" && record && (
          <>
            <Button variant="secondary" href={record.href} external iconRight={ArrowTopRightOnSquareIcon} fullWidth>
              Відкрити на сайті
            </Button>
            <Button variant="dangerGhost" onClick={onUnpublish} loading={busy === "unpublish"} disabled={anyBusy && busy !== "unpublish"} fullWidth>
              Зняти з публікації
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
