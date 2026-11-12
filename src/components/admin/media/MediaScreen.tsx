"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowUpTrayIcon, DocumentTextIcon, LockClosedIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { cx, formatBytes, formatNumber } from "../lib/format";
import type { Permission } from "../lib/permissions";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { DropZone } from "../ui/media/DropZone";
import { fileTypeLabel } from "../ui/media/upload";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { COLOR_TRANSITION, FOCUS_RING, SURFACE, TEXT, TONES } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { MediaDrawer, folderLabel } from "./MediaDrawer";
import { ACCEPT_MEDIA, UploadModal } from "./UploadModal";
import { MEDIA_FOLDERS, MEDIA_ORDER_FOLDER, type MediaDto, type MediaFolder, type MediaListAnswer } from "./types";

// /admin/media: every picture and document uploaded through the panel, as
// a grid of tiles. The address bar holds the list's state in the API's own
// words (q, folder, kind, access, sort, page, limit) and the open file as
// ?id=<media id> (other sections link a file that way). Files dropped on
// the grid open the upload dialog with them.

// Who may upload: the media route's MEDIA_UPLOAD (every editor whose
// screens attach files).
const MEDIA_UPLOAD: readonly Permission[] = ["content.edit", "catalog.edit", "orders.edit", "settings.edit"];

const FOLDER_OPTIONS = MEDIA_FOLDERS.map((folder) => ({ value: folder.value, label: folder.label }));
const KIND_OPTIONS = [
  { value: "image", label: "Зображення" },
  { value: "file", label: "Документи" },
];
const ACCESS_OPTIONS = [
  { value: "public", label: "Публічні" },
  { value: "private", label: "Приватні" },
];
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Спершу нові" },
  { value: "createdAt", label: "Спершу давні" },
  { value: "-size", label: "Спершу великі" },
  { value: "filename", label: "За назвою" },
];
const LIMITS = [24, 48, 96];
const DEFAULTS = { sort: "-createdAt", limit: "48" };

const GRID =
  "grid grid-cols-2 gap-x-3 gap-y-5 min-[640px]:grid-cols-3 min-[1024px]:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7";

function isFolder(value: string): value is MediaFolder {
  return MEDIA_FOLDERS.some((folder) => folder.value === value);
}

function Tile({ media, active, onOpen }: { media: MediaDto; active: boolean; onOpen: () => void }) {
  const preview = media.kind === "image" ? (media.url ?? media.adminUrl) : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${media.filename}, ${formatBytes(media.size)}${media.access === "private" ? ", приватний" : ""}`}
      data-media-tile={media.id}
      className={cx("group flex min-w-0 cursor-pointer flex-col gap-2 rounded-2xl text-left", FOCUS_RING)}
    >
      <span
        className={cx(
          "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-bg-subtle motion-reduce:transition-none",
          COLOR_TRANSITION,
          active ? "ring-2 ring-brand" : "ring-1 ring-transparent group-hover:ring-stroke-subtle",
        )}
      >
        {preview ? (
          <img src={preview} alt={media.alt} loading="lazy" className="size-full object-contain p-2" />
        ) : (
          <span className="flex h-[76px] w-16 flex-col items-center justify-center gap-1.5 rounded-xl bg-white text-neutral-400">
            <DocumentTextIcon aria-hidden className="size-7" strokeWidth={1.4} />
            <span className="text-[12px] font-bold leading-none tracking-[0.02em] text-neutral-800">
              {fileTypeLabel(media.filename, media.contentType)}
            </span>
          </span>
        )}
        {media.access === "private" && (
          <span
            className="absolute left-2 top-2 inline-flex h-6 items-center gap-1 rounded-full bg-white/95 pl-1.5 pr-2 text-[11px] font-semibold leading-4 text-neutral-700"
            title="Приватний файл: без публічної адреси"
          >
            <LockClosedIcon aria-hidden className="size-3.5" strokeWidth={2} />
            приватний
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col px-0.5">
        <span className="truncate text-[13px] font-semibold leading-[18px] text-neutral-900" title={media.filename}>
          {media.filename}
        </span>
        <span className="truncate text-[12px] font-medium leading-4 text-neutral-500 tabular-nums">
          {formatBytes(media.size)}
          {media.width && media.height ? `, ${media.width} x ${media.height}` : ""}
        </span>
      </span>
    </button>
  );
}

export function MediaScreen() {
  const { can } = useStaff();
  const canUpload = can(MEDIA_UPLOAD);
  // The papers of orders: only these roles see them, or file into their folder.
  const seesOrderFolder = can("orders.view");
  const filesOrderFolder = can("orders.edit");
  const list = useListParams({ defaults: DEFAULTS });

  // The open file is not a parameter of the list API.
  const query = new URLSearchParams(list.queryString);
  query.delete("id");
  const media = useAdminQuery<MediaListAnswer>(`/media?${query.toString()}`);
  const overall = useAdminQuery<MediaListAnswer>("/media?limit=1");

  const [upload, setUpload] = useState<{ open: boolean; files: File[] }>({ open: false, files: [] });

  const openId = list.get("id") || null;
  const folder = list.get("folder");
  const kind = list.get("kind");
  const access = list.get("access");
  const filtered = Boolean(list.q || folder || kind || access);

  const items = media.data?.items;
  const total = media.data?.total ?? 0;
  const libraryTotal = overall.data?.total;
  // Both sizes come with every list answer, within what this role may see.
  const totalBytes = media.data?.totalBytes ?? overall.data?.totalBytes;
  const filteredBytes = filtered ? media.data?.filteredBytes : undefined;
  const folderOptions = seesOrderFolder ? FOLDER_OPTIONS : FOLDER_OPTIONS.filter((option) => option.value !== MEDIA_ORDER_FOLDER);
  const uploadFolder: MediaFolder = isFolder(folder) && (folder !== MEDIA_ORDER_FOLDER || filesOrderFolder) ? folder : "misc";

  const chips: FilterChipItem[] = [];
  if (list.q) chips.push({ key: "q", label: `Пошук: ${list.q}`, onRemove: () => list.set({ q: null }) });
  if (folder) chips.push({ key: "folder", label: `Папка: ${folderLabel(folder)}`, onRemove: () => list.set({ folder: null }) });
  if (kind) chips.push({ key: "kind", label: kind === "image" ? "Зображення" : "Документи", onRemove: () => list.set({ kind: null }) });
  if (access) chips.push({ key: "access", label: access === "private" ? "Приватні" : "Публічні", onRemove: () => list.set({ access: null }) });

  const startUpload = (files: File[] = []) => setUpload({ open: true, files });

  const tiles =
    media.error && !items ? (
      <ErrorState failure={media.error} onRetry={media.reload} title="Не вдалося відкрити медіатеку" />
    ) : !items ? (
      <div aria-hidden className={GRID}>
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton shape="tile" className="aspect-square w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        ))}
      </div>
    ) : items.length === 0 ? (
      filtered ? (
        <EmptyState
          title="Нічого не знайдено"
          text="Жоден файл не відповідає пошуку чи фільтрам. Змініть їх або скиньте."
          action={
            <Button variant="secondary" onClick={list.reset}>
              Скинути фільтри
            </Button>
          }
        />
      ) : (
        <EmptyState
          size="lg"
          icon={<PhotoIcon aria-hidden className="size-6" strokeWidth={1.7} />}
          title="Медіатека порожня"
          text={
            canUpload
              ? "Тут з'являються зображення статей і товарів, файли матеріалів і документи замовлень. Перетягніть файли сюди або завантажте їх кнопкою."
              : "Тут з'являються зображення статей і товарів, файли матеріалів і документи замовлень, щойно їх завантажать."
          }
          action={
            canUpload ? (
              <Button iconLeft={ArrowUpTrayIcon} onClick={() => startUpload()}>
                Завантажити файли
              </Button>
            ) : undefined
          }
        />
      )
    ) : (
      <div className={cx(GRID, "transition-opacity duration-200", media.stale && "opacity-60")} aria-busy={media.stale || undefined}>
        {items.map((item) => (
          <Tile key={item.id} media={item} active={item.id === openId} onOpen={() => list.set({ id: item.id }, { resetPage: false })} />
        ))}
      </div>
    );

  return (
    <Page>
      <PageHeader
        title="Медіатека"
        light={libraryTotal !== undefined ? formatNumber(libraryTotal) : undefined}
        subtitle="Зображення та документи, які використовують статті, товари, матеріали й замовлення."
        meta={
          totalBytes !== undefined && totalBytes > 0 ? (
            <span className={cx(TEXT.caption, "inline-flex h-7 items-center rounded-full bg-white px-3 text-[13px] text-neutral-700 tabular-nums")}>
              {filteredBytes !== undefined
                ? `Обсяг знайдених: ${formatBytes(filteredBytes)} з ${formatBytes(totalBytes)}`
                : `Обсяг файлів: ${formatBytes(totalBytes)}`}
            </span>
          ) : undefined
        }
        actions={
          canUpload ? (
            <Button iconLeft={ArrowUpTrayIcon} onClick={() => startUpload()}>
              Завантажити файли
            </Button>
          ) : undefined
        }
      />

      <FilterBar
        search={<SearchInput label="Пошук у медіатеці" placeholder="Назва файлу або опис" value={list.q} onChange={(q) => list.set({ q })} />}
        filters={
          <>
            <div className="w-[190px] max-w-full">
              <Select
                aria-label="Папка"
                placeholder="Усі папки"
                clearable
                value={isFolder(folder) ? folder : null}
                onChange={(value) => list.set({ folder: value })}
                options={folderOptions}
                className="w-full"
              />
            </div>
            <div className="w-[170px] max-w-full">
              <Select
                aria-label="Тип файлів"
                placeholder="Усі типи"
                clearable
                value={kind === "image" || kind === "file" ? kind : null}
                onChange={(value) => list.set({ kind: value })}
                options={KIND_OPTIONS}
                className="w-full"
              />
            </div>
            <div className="w-[170px] max-w-full">
              <Select
                aria-label="Доступ"
                placeholder="Будь-який доступ"
                clearable
                value={access === "public" || access === "private" ? access : null}
                onChange={(value) => list.set({ access: value })}
                options={ACCESS_OPTIONS}
                className="w-full"
              />
            </div>
          </>
        }
        actions={
          <div className="w-[180px] max-w-full">
            <Select
              aria-label="Порядок"
              value={SORT_OPTIONS.some((option) => option.value === list.sort) ? list.sort : DEFAULTS.sort}
              onChange={(sort) => list.set({ sort })}
              options={SORT_OPTIONS}
              className="w-full"
            />
          </div>
        }
        chips={chips}
        onReset={list.reset}
      />

      <DropZone
        variant="bare"
        multiple
        accept={ACCEPT_MEDIA}
        disabled={!canUpload}
        onFiles={(files) => startUpload(files)}
        label="Файли медіатеки"
        className={cx(SURFACE.card, "flex min-w-0 flex-col")}
      >
        {({ dragging }) => (
          <>
            {dragging && (
              <p
                className="mx-5 mt-5 rounded-2xl px-4 py-3 text-center text-[14px] font-semibold leading-5 min-[1024px]:mx-6 min-[1024px]:mt-6"
                style={{ backgroundColor: TONES.orange.bg, color: TONES.orange.text }}
              >
                Відпустіть файли, щоб завантажити їх у медіатеку
              </p>
            )}
            <div className="p-5 min-[1024px]:p-6">{tiles}</div>
            {items && items.length > 0 && (
              <div className="border-t border-stroke-subtle px-5 py-3 min-[1024px]:px-6">
                <Pagination
                  page={list.page}
                  limit={list.limit}
                  total={total}
                  limits={LIMITS}
                  onPage={(page) => list.set({ page })}
                  onLimit={(limit) => list.set({ limit })}
                />
              </div>
            )}
          </>
        )}
      </DropZone>

      <MediaDrawer id={openId} onClose={() => list.set({ id: null }, { resetPage: false })} />
      <UploadModal
        open={upload.open}
        files={upload.files}
        folder={uploadFolder}
        orderFolder={filesOrderFolder}
        onClose={() => setUpload({ open: false, files: [] })}
      />
    </Page>
  );
}
