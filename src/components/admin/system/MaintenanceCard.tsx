"use client";

import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { adminApi } from "../lib/api";
import { cx, formatNumber } from "../lib/format";
import { invalidate } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { CheckboxGroup } from "../ui/Checkbox";
import { toast, toastError } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import {
  REVALIDATE_TAGS,
  REVALIDATE_TAG_LABELS,
  type PurgeSessionsResponse,
  type RevalidateResponse,
  type RevalidateTag,
  type SystemInfo,
} from "./types";

// "Обслуговування": refresh the cached public pages, remove expired
// sessions now. Both need settings.edit; a read-only role sees what they
// do without the buttons.

const TAG_OPTIONS = REVALIDATE_TAGS.map((tag) => ({ value: tag, label: REVALIDATE_TAG_LABELS[tag] }));

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-bg-subtle px-4 py-3">
      <span className={TEXT.caption}>{label}</span>
      <span className="mt-0.5 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-neutral-900 tabular-nums">{formatNumber(value)}</span>
    </div>
  );
}

export function MaintenanceCard({ counts }: { counts: SystemInfo["counts"] }) {
  const { can } = useStaff();
  const canEdit = can("settings.edit");
  const [tags, setTags] = useState<RevalidateTag[]>([...REVALIDATE_TAGS]);
  const [refreshing, setRefreshing] = useState(false);
  const [purging, setPurging] = useState(false);
  const expired = counts.expiredSessions + counts.expiredStaffSessions;

  const refresh = async () => {
    if (tags.length === 0 || refreshing) return;
    setRefreshing(true);
    // Every tag at once is the route's default; name them only for a part.
    const body = tags.length === REVALIDATE_TAGS.length ? {} : { tags };
    const result = await adminApi<RevalidateResponse>("/system/revalidate", { method: "POST", body });
    setRefreshing(false);
    if (!result.ok) {
      toastError(result, { "bad-request": "Оберіть, які сторінки оновити." });
      return;
    }
    invalidate("/audit");
    toast.success(`Кеш сайту оновлено: ${result.data.revalidated.map((tag) => REVALIDATE_TAG_LABELS[tag]).join(", ")}`);
  };

  const purge = async () => {
    if (purging) return;
    setPurging(true);
    const result = await adminApi<PurgeSessionsResponse>("/system/sessions/purge", { method: "POST" });
    setPurging(false);
    if (!result.ok) {
      toastError(result);
      return;
    }
    invalidate("/system");
    invalidate("/audit");
    const { sessions, staffSessions } = result.data.removed;
    toast.success(
      sessions + staffSessions === 0
        ? "Прострочених сеансів уже не було."
        : `Видалено прострочені сеанси: клієнтів ${formatNumber(sessions)}, співробітників ${formatNumber(staffSessions)}`,
    );
  };

  return (
    <Card title="Обслуговування" subtitle={canEdit ? undefined : "Ваша роль може лише переглядати цей розділ."}>
      <div className="flex flex-col">
        <section className="flex flex-col gap-3 pb-5" aria-labelledby="maintenance-cache">
          <h3 id="maintenance-cache" className={TEXT.bodyStrong}>
            Оновити кеш сайту
          </h3>
          <p className={TEXT.muted}>
            Зміни, зроблені в панелі, оновлюють сторінки сайту самі. Ця кнопка потрібна, коли дані змінили напряму в базі: тоді сайт
            покаже їх одразу, а не за кілька хвилин.
          </p>
          {canEdit && (
            <div className="flex flex-col gap-3 min-[640px]:flex-row min-[640px]:flex-wrap min-[640px]:items-center min-[640px]:justify-between">
              <CheckboxGroup
                aria-label="Які сторінки оновити"
                value={tags}
                onChange={setTags}
                options={TAG_OPTIONS}
                direction="horizontal"
              />
              <Button variant="secondary" iconLeft={ArrowPathIcon} onClick={refresh} loading={refreshing} disabled={tags.length === 0}>
                Оновити кеш сайту
              </Button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-stroke-subtle pt-5" aria-labelledby="maintenance-sessions">
          <h3 id="maintenance-sessions" className={TEXT.bodyStrong}>
            Очистити прострочені сеанси
          </h3>
          <p className={TEXT.muted}>
            Сеанси, строк яких минув, база видаляє сама приблизно за хвилину. Кнопка видаляє їх одразу; чинні сеанси вона не зачіпає.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Figure label="Активні сеанси клієнтів" value={counts.sessions} />
            <Figure label="Активні сеанси співробітників" value={counts.staffSessions} />
          </div>
          <div className={cx("flex flex-col gap-3 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between")}>
            <p className={cx(TEXT.body, "tabular-nums")}>
              {expired === 0
                ? "Прострочених сеансів немає."
                : `Прострочених: клієнтів ${formatNumber(counts.expiredSessions)}, співробітників ${formatNumber(counts.expiredStaffSessions)}.`}
            </p>
            {canEdit && (
              <Button variant="secondary" iconLeft={TrashIcon} onClick={purge} loading={purging} disabled={expired === 0}>
                Очистити прострочені сеанси
              </Button>
            )}
          </div>
        </section>
      </div>
    </Card>
  );
}
