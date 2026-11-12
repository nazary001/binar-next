"use client";

import {
  ArrowDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  FolderIcon,
  FolderPlusIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { FolderOpenIcon } from "@heroicons/react/24/solid";
import { countOf, cx, formatNumber } from "../lib/format";
import { IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { KebabMenu, type MenuItem } from "../ui/DropdownMenu";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { COLOR_TRANSITION, FOCUS_RING_INSET } from "../ui/tokens";
import { enc } from "./shared";
import type { MaterialCategoryRow } from "./types";

// The folders of the library: a list in a card from 1280 px (the selected
// folder highlighted as the side menu highlights its page), a select with
// a menu of folder actions below that.

export const FILE_FORMS = ["файл", "файли", "файлів"] as const;

export type FolderActions = {
  canEdit: boolean;
  onRename: (folder: MaterialCategoryRow) => void;
  onMove: (folder: MaterialCategoryRow, step: -1 | 1) => void;
  onDelete: (folder: MaterialCategoryRow) => void;
  onAdd: () => void;
};

export function folderMenu(folder: MaterialCategoryRow, index: number, total: number, actions: FolderActions): MenuItem[] {
  const items: MenuItem[] = [
    { key: "site", label: "Відкрити на сайті", icon: ArrowTopRightOnSquareIcon, href: `/materials/${enc(folder.id)}` },
  ];
  if (!actions.canEdit) return items;
  items.push(
    { key: "rename", label: "Перейменувати", icon: PencilSquareIcon, onSelect: () => actions.onRename(folder) },
    { key: "order", divider: true },
    { key: "up", label: "Вище", icon: ArrowUpIcon, disabled: index === 0, onSelect: () => actions.onMove(folder, -1) },
    { key: "down", label: "Нижче", icon: ArrowDownIcon, disabled: index === total - 1, onSelect: () => actions.onMove(folder, 1) },
    { key: "danger", divider: true },
    {
      key: "delete",
      label: "Видалити папку",
      icon: TrashIcon,
      tone: "danger",
      hint: folder.filesCount > 0 ? "не порожня" : undefined,
      onSelect: () => actions.onDelete(folder),
    },
  );
  return items;
}

export function FolderList({
  folders,
  selectedId,
  onSelect,
  loading,
  actions,
}: {
  folders: MaterialCategoryRow[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  actions: FolderActions;
}) {
  const list = folders ?? [];
  return (
    <Card
      title="Папки"
      subtitle={folders ? countOf(list.length, ["папка", "папки", "папок"]) : undefined}
      padding="none"
      actions={
        // A round "+" fits next to the title in the narrow column; the
        // label is its accessible name and its tooltip.
        actions.canEdit ? <IconButton size="sm" variant="secondary" icon={PlusIcon} label="Додати папку" onClick={actions.onAdd} /> : undefined
      }
    >
      {loading && !folders ? (
        <div aria-hidden className="flex flex-col gap-1 px-2 pb-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex h-12 items-center gap-3 px-2">
              <Skeleton shape="tile" className="size-8" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-0.5 px-2 pb-3" aria-label="Папки матеріалів">
          {list.map((folder, index) => {
            const active = folder.id === selectedId;
            return (
              <li key={folder.id} className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => onSelect(folder.id)}
                  aria-current={active ? "true" : undefined}
                  className={cx(
                    "group flex h-12 w-full min-w-0 cursor-pointer items-center gap-3 rounded-2xl pl-2 text-left motion-reduce:transition-none",
                    actions.canEdit ? "pr-12" : "pr-3",
                    COLOR_TRANSITION,
                    FOCUS_RING_INSET,
                    active ? "bg-bg-cabinet" : "hover:bg-bg-subtle",
                  )}
                >
                  <span
                    aria-hidden
                    className={cx(
                      "flex size-8 shrink-0 items-center justify-center rounded-[10px] motion-reduce:transition-none",
                      COLOR_TRANSITION,
                      active ? "bg-brand text-white" : "text-neutral-500 group-hover:text-neutral-900",
                    )}
                  >
                    {active ? <FolderOpenIcon className="size-[18px]" /> : <FolderIcon className="size-5" strokeWidth={1.6} />}
                  </span>
                  <span
                    className={cx(
                      "min-w-0 flex-1 truncate text-[14px] leading-5",
                      active ? "font-semibold text-neutral-900" : "font-medium text-neutral-700 group-hover:text-neutral-900",
                    )}
                  >
                    {folder.title}
                  </span>
                  <span
                    className="shrink-0 text-[13px] font-medium leading-[18px] text-neutral-500 tabular-nums"
                    aria-label={countOf(folder.filesCount, FILE_FORMS)}
                  >
                    {formatNumber(folder.filesCount)}
                  </span>
                </button>
                {actions.canEdit && (
                  <span className="absolute right-1.5">
                    <KebabMenu size="sm" label={`Дії з папкою «${folder.title}»`} items={folderMenu(folder, index, list.length, actions)} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// Below 1280 px: the folder as a select, its actions in a menu next to it.
export function FolderPicker({
  folders,
  selectedId,
  onSelect,
  actions,
}: {
  folders: MaterialCategoryRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  actions: FolderActions;
}) {
  const index = folders.findIndex((folder) => folder.id === selectedId);
  const selected = index >= 0 ? folders[index] : null;
  const menu: MenuItem[] = selected ? folderMenu(selected, index, folders.length, actions) : [];
  if (actions.canEdit) {
    menu.push({ key: "add-sep", divider: true }, { key: "add", label: "Додати папку", icon: FolderPlusIcon, onSelect: actions.onAdd });
  }
  return (
    <div className="flex min-w-0 items-end gap-2 min-[640px]:max-w-[480px]">
      <Select
        label="Папка"
        value={selectedId}
        onChange={onSelect}
        options={folders.map((folder) => ({ value: folder.id, label: folder.title, hint: countOf(folder.filesCount, FILE_FORMS) }))}
        className="min-w-0 flex-1"
      />
      {menu.length > 0 && <KebabMenu label={selected ? `Дії з папкою «${selected.title}»` : "Дії з папками"} items={menu} className="bg-white" />}
    </div>
  );
}
