"use client";

import {
  ArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
  FolderArrowDownIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useSyncExternalStore } from "react";
import type { ApiFailure } from "../lib/api";
import { cx } from "../lib/format";
import { Button, IconButton } from "../ui/Button";
import { Switch } from "../ui/Checkbox";
import { DataTable, type Column } from "../ui/DataTable";
import { KebabMenu, type MenuItem } from "../ui/DropdownMenu";
import { EmptyState } from "../ui/States";
import { Tooltip } from "../ui/Tooltip";
import { TEXT, TONES } from "../ui/tokens";
import { TypeBadge, accessSummary, directionShort, exposedLock, lockedTip, partnerTip, staffLink, whoCanDownload } from "./shared";
import type { MaterialCategoryRow, MaterialFileRow } from "./types";

// The files of one folder, in the site's order: type, name over the
// description, directions, size, the two access switches and the row menu.
// Editors move rows with the arrows (in the row menu on phones), switch
// access in place and open the edit dialog by pressing a row.

export type FileActions = {
  canEdit: boolean;
  onEdit: (file: MaterialFileRow) => void;
  onReplace: (file: MaterialFileRow) => void;
  onMoveTo: (file: MaterialFileRow) => void;
  onDelete: (file: MaterialFileRow) => void;
  onStep: (file: MaterialFileRow, step: -1 | 1) => void;
  onAccess: (file: MaterialFileRow, change: { locked?: boolean; partnerLocked?: boolean }) => void;
  onAdd: () => void;
  // Rows whose access change is on its way to the server.
  pending: ReadonlySet<string>;
};

// Media queries read through a store: no state is set in an effect.
// - phones get the up / down moves in the row menu (the arrow column is
//   hidden there);
// - directions and size get columns of their own only where there is room
//   for them next to the name; otherwise they ride in the type and name
//   cells.
function subscribeTo(query: string) {
  return (listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  };
}
const NARROW = "(max-width: 639px)";
const ROOMY = "(min-width: 1600px)";
const subscribeNarrow = subscribeTo(NARROW);
const subscribeRoomy = subscribeTo(ROOMY);
function useNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
}
function useRoomy(): boolean {
  return useSyncExternalStore(subscribeRoomy, () => window.matchMedia(ROOMY).matches, () => false);
}

function directionsText(file: MaterialFileRow): string {
  return file.directions.map(directionShort).join(", ");
}

function NameCell({ file, marked, roomy }: { file: MaterialFileRow; marked: boolean; roomy: boolean }) {
  const exposed = exposedLock(file);
  // Without a directions column the directions lead the second line.
  const lead = roomy ? "" : file.directions.length > 0 ? directionsText(file) : "Без напряму";
  return (
    <span className="flex min-w-0 flex-col" data-marked={marked || undefined} data-file-row={file.id}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-semibold text-neutral-900" title={file.name}>
          {file.name}
        </span>
        {exposed && (
          <Tooltip content="Файл у медіатеці публічний: його можна відкрити за прямою адресою, оминаючи замок. Замініть файл, щоб він став приватним.">
            <span tabIndex={0} className="inline-flex shrink-0 rounded-full" style={{ color: TONES.amber.dot }} aria-label="Замок можна оминути">
              <ExclamationTriangleIcon aria-hidden className="size-4" strokeWidth={2} />
            </span>
          </Tooltip>
        )}
      </span>
      <span className={cx(TEXT.caption, "truncate")} title={file.description || undefined}>
        {/* The access column starts at 1024 px: below, its summary comes first. */}
        <span className="text-neutral-800 min-[1024px]:hidden">{accessSummary(file)}. </span>
        {lead && <span className="text-neutral-800">{lead}. </span>}
        {file.description || <span className="text-neutral-400">Без опису</span>}
      </span>
    </span>
  );
}

// The badge, and the size under it while the size has no column.
function TypeCell({ file, roomy }: { file: MaterialFileRow; roomy: boolean }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <TypeBadge type={file.type} />
      {!roomy && file.type !== "url" && file.size && <span className={cx(TEXT.caption, "pl-0.5 tabular-nums")}>{file.size}</span>}
    </span>
  );
}

function DirectionsCell({ file }: { file: MaterialFileRow }) {
  if (file.directions.length === 0) return <span className="text-neutral-400">Не вказано</span>;
  return (
    <span className="block truncate" title={file.directions.join(", ")}>
      {directionsText(file)}
    </span>
  );
}

function AccessCell({ file, actions }: { file: MaterialFileRow; actions: FileActions }) {
  if (!actions.canEdit) {
    return (
      <Tooltip content={whoCanDownload(file)}>
        <span tabIndex={0} className="whitespace-nowrap rounded-md text-neutral-800 underline decoration-dotted decoration-neutral-400 underline-offset-4">
          {accessSummary(file)}
        </span>
      </Tooltip>
    );
  }
  const busy = actions.pending.has(file.id);
  return (
    <span className="flex flex-col items-start gap-1.5">
      <Tooltip content={lockedTip(file)} placement="bottom-start">
        <span className="inline-flex">
          <Switch
            size="sm"
            checked={file.locked}
            disabled={busy}
            onChange={(locked) => actions.onAccess(file, { locked })}
            label={<span className="whitespace-nowrap text-[12px] leading-4 text-neutral-700">Лише для авторизованих</span>}
            aria-label={`Лише для авторизованих: ${file.name}`}
          />
        </span>
      </Tooltip>
      <Tooltip content={partnerTip(file)} placement="bottom-start">
        <span className="inline-flex">
          <Switch
            size="sm"
            checked={file.partnerLocked}
            disabled={busy}
            onChange={(partnerLocked) => actions.onAccess(file, { partnerLocked })}
            label={<span className="whitespace-nowrap text-[12px] leading-4 text-neutral-700">Закрито для партнерів</span>}
            aria-label={`Закрито для партнерів: ${file.name}`}
          />
        </span>
      </Tooltip>
    </span>
  );
}

export function FilesTable({
  folder,
  files,
  loading,
  stale,
  error,
  onRetry,
  markedId,
  actions,
}: {
  folder: MaterialCategoryRow | null;
  files: MaterialFileRow[] | undefined;
  loading: boolean;
  stale: boolean;
  error: ApiFailure | null;
  onRetry: () => void;
  markedId: string | null;
  actions: FileActions;
}) {
  const narrow = useNarrow();
  const roomy = useRoomy();
  const rows = files ?? [];

  const menuOf = (file: MaterialFileRow, index: number): MenuItem[] => {
    const items: MenuItem[] = [];
    const link = staffLink(file);
    if (link) {
      items.push({
        key: "download",
        label: link.label,
        icon: file.type === "url" ? ArrowTopRightOnSquareIcon : ArrowDownTrayIcon,
        href: link.href,
      });
    }
    if (!actions.canEdit) return items;
    items.push(
      { key: "edit-sep", divider: true },
      { key: "edit", label: "Редагувати", icon: PencilSquareIcon, onSelect: () => actions.onEdit(file) },
      {
        key: "replace",
        label: file.type === "url" ? "Замінити посилання" : "Замінити файл",
        icon: ArrowPathIcon,
        onSelect: () => actions.onReplace(file),
      },
      { key: "move", label: "Перемістити в іншу папку", icon: FolderArrowDownIcon, onSelect: () => actions.onMoveTo(file) },
    );
    if (narrow) {
      items.push(
        { key: "up", label: "Перемістити вище", icon: ArrowUpIcon, disabled: index === 0, onSelect: () => actions.onStep(file, -1) },
        {
          key: "down",
          label: "Перемістити нижче",
          icon: ArrowDownIcon,
          disabled: index === rows.length - 1,
          onSelect: () => actions.onStep(file, 1),
        },
      );
    }
    items.push(
      { key: "danger", divider: true },
      { key: "delete", label: "Видалити", icon: TrashIcon, tone: "danger", onSelect: () => actions.onDelete(file) },
    );
    return items;
  };

  const columns: Column<MaterialFileRow>[] = [];
  if (actions.canEdit) {
    columns.push({
      key: "order",
      header: "Порядок",
      width: 92,
      interactive: true,
      hideBelow: 640,
      cell: (file) => {
        const index = rows.findIndex((row) => row.id === file.id);
        return (
          <span className="-ml-1.5 flex items-center">
            <IconButton
              id={`material-up-${file.id}`}
              size="sm"
              icon={ArrowUpIcon}
              label={`Перемістити вище: ${file.name}`}
              disabled={index <= 0}
              onClick={() => actions.onStep(file, -1)}
            />
            <IconButton
              id={`material-down-${file.id}`}
              size="sm"
              icon={ArrowDownIcon}
              label={`Перемістити нижче: ${file.name}`}
              disabled={index === rows.length - 1}
              onClick={() => actions.onStep(file, 1)}
            />
          </span>
        );
      },
    });
  }
  columns.push(
    { key: "type", header: "Тип", width: 120, cell: (file) => <TypeCell file={file} roomy={roomy} /> },
    {
      key: "name",
      header: "Назва",
      // Takes the room the other columns leave; max-w-0 lets its lines
      // truncate instead of squeezing the others.
      width: "100%",
      className: "max-w-0",
      cell: (file) => <NameCell file={file} marked={file.id === markedId} roomy={roomy} />,
    },
  );
  if (roomy) {
    columns.push(
      {
        key: "directions",
        header: "Напрями",
        className: "max-w-[180px] whitespace-nowrap",
        cell: (file) => <DirectionsCell file={file} />,
      },
      {
        key: "size",
        header: "Розмір",
        align: "right",
        cell: (file) => <span className={cx("tabular-nums", file.type === "url" && "text-neutral-400")}>{file.size || "-"}</span>,
      },
    );
  }
  columns.push(
    {
      key: "access",
      header: "Доступ",
      hideBelow: 1024,
      interactive: actions.canEdit,
      cell: (file) => <AccessCell file={file} actions={actions} />,
    },
    {
      key: "menu",
      header: <span className="sr-only">Дії</span>,
      width: 56,
      align: "right",
      interactive: true,
      cell: (file) => (
        // The menu is portaled out of the row, but React still bubbles its
        // clicks through the row: without this a chosen item would also
        // "press" the row and open the edit dialog.
        <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
          <KebabMenu size="sm" label={`Дії з файлом «${file.name}»`} items={menuOf(file, rows.findIndex((row) => row.id === file.id))} />
        </span>
      ),
    },
  );

  const empty = (
    <EmptyState
      icon={<DocumentPlusIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title="У папці ще немає файлів"
      text={
        folder
          ? `Додайте документ або посилання: він з'явиться на сторінці /materials/${folder.id}.`
          : "Оберіть папку, щоб побачити її файли."
      }
      action={
        actions.canEdit && folder ? (
          <Button iconLeft={PlusIcon} onClick={actions.onAdd}>
            Додати файл
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <DataTable
      caption={folder ? `Файли папки «${folder.title}»` : "Файли"}
      columns={columns}
      rows={files}
      rowKey={(file) => file.id}
      loading={loading}
      stale={stale}
      error={error}
      onRetry={onRetry}
      empty={empty}
      onRowClick={actions.canEdit ? actions.onEdit : undefined}
      // The file a link from the media library points at: a warm tint and
      // the brand bar on its left edge.
      className="[&_tr:has([data-marked])>td]:bg-[#fff7f2] [&_tr:has([data-marked])>td:first-child]:shadow-[inset_3px_0_0_#f85a0b]"
    />
  );
}
