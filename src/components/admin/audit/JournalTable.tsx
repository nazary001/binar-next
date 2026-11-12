"use client";

import { ArrowsRightLeftIcon, ChevronDownIcon, CpuChipIcon, UserIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { Fragment, useState, type MouseEvent, type ReactNode } from "react";
import { errorMessage, type ApiFailure } from "../lib/api";
import { cx, formatDateTime, formatRelative } from "../lib/format";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { KeyValueList, type KeyValueItem } from "../ui/KeyValue";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { COLOR_TRANSITION, FOCUS_RING, FOCUS_RING_INSET, SURFACE, TEXT, TONES } from "../ui/tokens";
import { metaItems } from "./meta";
import { ENTITY_TYPE_LABELS, JOURNAL_ACTOR_KINDS, journalGroupOf, type JournalRow } from "./types";
import { useNow } from "./useNow";

// The table of the journal. It is the kit's DataTable in look (the dark
// head, hairline rows, the same states), composed here because a journal
// line opens in place to show its details and the kit's table has no
// expandable rows (reported to the lead).
//
// Columns: when (exact, the relative time under it), who, what (the
// summary sentence), the record (a link into the panel when it has a
// page), the address. Phones keep the sentence and the expand button
// only; who and when move under the sentence.

const HIDE_PHONE = "max-[639px]:hidden";
const HIDE_TABLET = "max-[1023px]:hidden";
const HIDE_DESKTOP = "max-[1279px]:hidden";
const COLUMN_COUNT = 6;
// A quiet second line (TEXT.caption without its medium weight).
const NOTE = "text-[12px] leading-4 text-neutral-500";

const SECONDS = new Intl.DateTimeFormat("uk-UA", {
  timeZone: "Europe/Kyiv",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function kindLabel(row: JournalRow): string | null {
  if (row.actor.kind === "staff") return null;
  return JOURNAL_ACTOR_KINDS.find((item) => item.value === row.actor.kind)?.label ?? null;
}

function actorName(row: JournalRow): string {
  return row.actor.name || kindLabel(row) || "Невідомо";
}

// A person gets the initials disc; the system and the integrations a
// glyph, so a machine's line never looks like a colleague's.
function ActorMark({ row }: { row: JournalRow }) {
  if (row.actor.kind === "staff") return <Avatar name={actorName(row)} size="sm" decorative />;
  const Icon = row.actor.kind === "system" ? CpuChipIcon : row.actor.kind === "integration" ? ArrowsRightLeftIcon : UserIcon;
  const tone = row.actor.kind === "system" ? TONES.blue : row.actor.kind === "integration" ? TONES.indigo : TONES.green;
  return (
    <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tone.bg, color: tone.text }}>
      <Icon className="size-3.5" />
    </span>
  );
}

function EntityLink({ row, className }: { row: JournalRow; className?: string }) {
  if (!row.entity) return <span className="text-neutral-400">-</span>;
  const label = row.entity.label || row.entity.id;
  return row.entity.href ? (
    <Link
      href={row.entity.href}
      className={cx(
        "relative z-10 rounded-sm font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 motion-reduce:transition-none",
        COLOR_TRANSITION,
        FOCUS_RING,
        className,
      )}
    >
      {label}
    </Link>
  ) : (
    <span className={cx("font-semibold text-neutral-900", className)}>{label}</span>
  );
}

function typeLabel(type: string): string {
  return Object.hasOwn(ENTITY_TYPE_LABELS, type) ? ENTITY_TYPE_LABELS[type] : type;
}

export type JournalFilterLinks = {
  byActor: (row: JournalRow) => void;
  byEntity: (row: JournalRow) => void;
};

function Details({ row, id, links }: { row: JournalRow; id: string; links: JournalFilterLinks }) {
  const group = journalGroupOf(row.action);
  const facts: KeyValueItem[] = [
    { label: "Точний час", value: <span className="tabular-nums">{SECONDS.format(new Date(row.at))}</span> },
    {
      label: "Хто",
      value: (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{actorName(row)}</span>
          {kindLabel(row) && <span className={TEXT.caption}>{kindLabel(row)}</span>}
        </span>
      ),
    },
    { label: "Розділ", value: group?.label ?? "Інше" },
  ];
  if (row.entity) {
    facts.push({ label: typeLabel(row.entity.type), value: <EntityLink row={row} /> });
    facts.push({ label: "Код запису", value: <span className="text-neutral-500">{row.entity.id}</span>, copy: row.entity.id });
  }
  if (row.ip) facts.push({ label: "Адреса", value: <span className="tabular-nums">{row.ip}</span>, copy: row.ip });
  const details = metaItems(row);

  return (
    <div id={id} className="flex min-w-0 flex-col gap-5 px-5 py-5 min-[1024px]:px-6">
      <p className={cx(TEXT.body, "min-[640px]:hidden")}>{row.summary}</p>
      <KeyValueList columns={3} dense items={facts} />
      {details.length > 0 && (
        <div className="flex min-w-0 flex-col gap-3 border-t border-stroke-subtle pt-4">
          <h3 className={TEXT.caption}>Подробиці</h3>
          <KeyValueList columns={2} dense items={details} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {row.actor.id && (
          <Button variant="secondary" size="sm" onClick={() => links.byActor(row)}>
            Усі дії: {actorName(row)}
          </Button>
        )}
        {row.entity && (
          <Button variant="secondary" size="sm" onClick={() => links.byEntity(row)}>
            Уся історія запису
          </Button>
        )}
        <span className={cx(NOTE, "ml-auto")}>Номер рядка журналу: {row.id}</span>
      </div>
    </div>
  );
}

function SkeletonBody() {
  return (
    <>
      {Array.from({ length: 8 }, (_, r) => (
        <tr key={r} aria-hidden className="[&:not(:last-child)>td]:border-b [&>td]:border-stroke-subtle">
          <td className={cx("h-16 pl-5 pr-4 min-[1024px]:pl-6", HIDE_PHONE)}>
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="mt-2 h-3 w-16" />
          </td>
          <td className={cx("h-16 px-4", HIDE_PHONE)}>
            <span className="flex items-center gap-2">
              <Skeleton shape="circle" className="size-6" />
              <Skeleton className="h-3.5 w-24" />
            </span>
          </td>
          <td className="h-16 py-3 pl-5 pr-4 min-[640px]:pl-4">
            <Skeleton className="h-3.5" />
            <Skeleton className={cx("mt-2 h-3", r % 2 ? "w-1/2" : "w-1/3")} />
          </td>
          <td className={cx("h-16 px-4", HIDE_TABLET)}>
            <Skeleton className="h-3.5 w-32" />
          </td>
          <td className={cx("h-16 px-4", HIDE_DESKTOP)}>
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className="h-16 pl-2 pr-5 min-[1024px]:pr-6">
            <Skeleton shape="circle" className="ml-auto size-8" />
          </td>
        </tr>
      ))}
    </>
  );
}

const HEAD = "h-11 whitespace-nowrap text-left align-middle text-[12px] font-semibold leading-4 text-white";

export function JournalTable({
  rows,
  loading,
  stale,
  error,
  onRetry,
  empty,
  footer,
  links,
}: {
  rows: JournalRow[] | undefined;
  loading: boolean;
  stale: boolean;
  error: ApiFailure | null;
  onRetry: () => void;
  empty: ReactNode;
  footer?: ReactNode;
  links: JournalFilterLinks;
}) {
  const now = useNow();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const list = rows ?? [];
  const showSkeleton = !error && (loading || rows === undefined) && list.length === 0;
  const showError = Boolean(error) && list.length === 0;
  const showEmpty = !showSkeleton && !showError && list.length === 0;

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // A press anywhere on the row opens it, except on its own links and
  // buttons, and except when text was being selected.
  const rowClick = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    toggle(id);
  };

  return (
    <div className={cx(SURFACE.card, "relative flex min-w-0 flex-col overflow-hidden")}>
      {error && !showError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-[13px] leading-[18px] min-[1024px]:px-6"
          style={{ backgroundColor: TONES.red.bg, color: TONES.red.text }}
        >
          <span>Не вдалося оновити журнал. {errorMessage(error)}</span>
          <button type="button" onClick={onRetry} className={cx("cursor-pointer rounded-full font-semibold underline underline-offset-4", FOCUS_RING_INSET)}>
            Спробувати ще раз
          </button>
        </div>
      )}
      <p className="sr-only" role="status">
        {showSkeleton ? "Завантаження..." : ""}
      </p>

      <div className="admin-scroll overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0" aria-busy={showSkeleton || stale || undefined}>
          <caption className="sr-only">Журнал дій, від найновіших</caption>
          <thead>
            <tr className="bg-neutral-800">
              <th scope="col" className={cx(HEAD, "w-[164px] pl-5 pr-4 min-[1024px]:pl-6", HIDE_PHONE)}>
                Час
              </th>
              <th scope="col" className={cx(HEAD, "w-[190px] px-4 2xl:w-[220px]", HIDE_PHONE)}>
                Хто
              </th>
              <th scope="col" className={cx(HEAD, "pl-5 pr-4 min-[640px]:pl-4")}>
                Дія
              </th>
              <th scope="col" className={cx(HEAD, "w-[220px] px-4 2xl:w-[260px]", HIDE_TABLET)}>
                {"Об'єкт"}
              </th>
              <th scope="col" className={cx(HEAD, "w-[124px] px-4 2xl:w-[140px]", HIDE_DESKTOP)}>
                Адреса
              </th>
              <th scope="col" className={cx(HEAD, "w-[60px] pl-2 pr-5 min-[1024px]:w-[68px] min-[1024px]:pr-6")}>
                <span className="sr-only">Подробиці</span>
              </th>
            </tr>
          </thead>
          <tbody className={cx("transition-opacity duration-200 motion-reduce:transition-none", stale && !showSkeleton ? "opacity-60" : "opacity-100")}>
            {showSkeleton && <SkeletonBody />}
            {!showSkeleton &&
              !showError &&
              list.map((row, index) => {
                const expanded = open.has(row.id);
                const detailsId = `journal-row-${row.id}`;
                const last = index === list.length - 1;
                const group = journalGroupOf(row.action);
                const relative = now ? formatRelative(row.at, now) : "";
                const line = !last || expanded ? "[&>td]:border-b [&>td]:border-stroke-subtle" : "";
                return (
                  <Fragment key={row.id}>
                  <tr
                    onClick={(event) => rowClick(event, row.id)}
                    className={cx(
                      "cursor-pointer align-top motion-reduce:transition-none",
                      COLOR_TRANSITION,
                      expanded ? "bg-bg-subtle [&>td]:border-b-0" : cx("hover:bg-bg-subtle", line),
                    )}
                  >
                    <td className={cx("py-3.5 pl-5 pr-4 min-[1024px]:pl-6", HIDE_PHONE)}>
                      <span className={cx(TEXT.body, "block whitespace-nowrap tabular-nums")}>{formatDateTime(row.at)}</span>
                      <span className={cx(NOTE, "mt-0.5 block")}>{relative}</span>
                    </td>
                    <td className={cx("py-3.5 px-4", HIDE_PHONE)}>
                      <span className="flex min-w-0 items-start gap-2">
                        <span className="pt-px">
                          <ActorMark row={row} />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className={cx(TEXT.body, "truncate")}>{actorName(row)}</span>
                          {kindLabel(row) && <span className={NOTE}>{kindLabel(row)}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="py-3.5 pl-5 pr-4 min-[640px]:pl-4">
                      <span className={cx(TEXT.body, "block [overflow-wrap:anywhere]", !expanded && "line-clamp-3")}>{row.summary}</span>
                      <span className={cx(NOTE, "mt-1 block min-[640px]:hidden")}>
                        {actorName(row)}
                        {relative ? `, ${relative}` : ""}
                      </span>
                      <span className={cx(NOTE, "mt-1 block max-[639px]:hidden min-[1024px]:hidden")}>
                        {row.entity ? `${typeLabel(row.entity.type)}: ${row.entity.label || row.entity.id}` : (group?.label ?? "")}
                      </span>
                    </td>
                    <td className={cx("py-3.5 px-4", HIDE_TABLET)}>
                      {row.entity ? (
                        <span className="flex min-w-0 flex-col">
                          <span className={cx(TEXT.body, "truncate")}>
                            <EntityLink row={row} />
                          </span>
                          <span className={NOTE}>{typeLabel(row.entity.type)}</span>
                        </span>
                      ) : (
                        <span className="flex min-w-0 flex-col">
                          <span className="text-neutral-400">-</span>
                          {group && <span className={NOTE}>{group.label}</span>}
                        </span>
                      )}
                    </td>
                    <td className={cx("py-3.5 px-4", HIDE_DESKTOP)}>
                      <span className={cx(TEXT.body, "block truncate tabular-nums", !row.ip && "text-neutral-400")}>{row.ip ?? "-"}</span>
                    </td>
                    <td className="py-2.5 pl-2 pr-5 text-right min-[1024px]:pr-6">
                      <button
                        type="button"
                        onClick={() => toggle(row.id)}
                        aria-expanded={expanded}
                        aria-controls={expanded ? detailsId : undefined}
                        aria-label={expanded ? "Сховати подробиці" : "Показати подробиці"}
                        title={expanded ? "Сховати подробиці" : "Показати подробиці"}
                        className={cx(
                          "inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-neutral-600 hover:bg-bg-cabinet hover:text-neutral-900 motion-reduce:transition-none",
                          COLOR_TRANSITION,
                          FOCUS_RING,
                        )}
                      >
                        <ChevronDownIcon
                          aria-hidden
                          className={cx("size-5 transition-[rotate] duration-200 motion-reduce:transition-none", expanded && "rotate-180")}
                        />
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className={cx("bg-bg-subtle", !last && "[&>td]:border-b [&>td]:border-stroke-subtle")}>
                      <td colSpan={COLUMN_COUNT} className="p-0">
                        <Details row={row} id={detailsId} links={links} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      {showError && error && <ErrorState failure={error} onRetry={onRetry} />}
      {showEmpty && empty}
      {footer && list.length > 0 && !showError && <div className="border-t border-stroke-subtle px-5 py-3 min-[1024px]:px-6">{footer}</div>}
    </div>
  );
}
