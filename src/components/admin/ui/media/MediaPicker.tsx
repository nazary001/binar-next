"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowUpTrayIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { MEDIA_FOLDERS, MEDIA_IMAGE_TYPES, MEDIA_ORDER_FOLDER, type MediaAccess, type MediaDto, type MediaFolder } from "../../media/types";
import { useStaff } from "../../shell/StaffProvider";
import { invalidate, useAdminQuery } from "../../lib/query";
import { cx, formatBytes, qs } from "../../lib/format";
import { Button } from "../Button";
import { SearchInput } from "../Input";
import { Modal, ModalFooter } from "../Modal";
import { Pagination } from "../Pagination";
import { Select } from "../Select";
import { Skeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, TONES } from "../tokens";
import { DropZone } from "./DropZone";
import { checkImageFile, fileTypeLabel, mediaErrorMessage, uploadMedia } from "./upload";

// The media library in a dialog: pick a file that is already uploaded, or
// upload a new one from inside it.
//
//   const [open, setOpen] = useState(false);
//   <Button variant="secondary" onClick={() => setOpen(true)}>Обрати з медіатеки</Button>
//   <MediaPicker open={open} onClose={() => setOpen(false)} folder="products"
//     onPick={(media) => setCover(media.url ?? media.adminUrl)} />
//
// Props
// - open, onClose: controlled, as Modal.
// - onPick(media): the chosen file (then the dialog closes itself through
//   onClose).
// - folder: the folder the list starts on and where new uploads go
//   (default: every folder, uploads to "misc").
// - kind: "image" (default) lists and uploads only images; "file" only
//   documents.
// - access: of new uploads (default "public").
// - title: the dialog's heading (default "Медіатека").
//
// The list is GET /api/admin/media?folder=&kind=&q=&page=&limit= (24 per
// page) through useAdminQuery, so a reopened dialog paints at once. A
// tile is selected with a press (Enter / Space), picked with a double
// press or "Вибрати". Files dragged onto the grid upload into the folder
// shown (or `folder`), and the new file is selected.

export type MediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (media: MediaDto) => void;
  folder?: MediaFolder;
  kind?: "image" | "file";
  access?: MediaAccess;
  title?: string;
};

type MediaPage = { ok: true; items: MediaDto[]; total: number; page: number; limit: number };

const LIMIT = 24;
const FOLDER_OPTIONS = MEDIA_FOLDERS.map((entry) => ({ value: entry.value, label: entry.label }));
const IMAGE_ACCEPT = MEDIA_IMAGE_TYPES.join(",");

const GRID = "grid grid-cols-2 gap-3 min-[640px]:grid-cols-4 min-[1024px]:grid-cols-6";

function Tile({ media, selected, onSelect, onPick }: { media: MediaDto; selected: boolean; onSelect: () => void; onPick: () => void }) {
  const preview = media.kind === "image" ? (media.url ?? media.adminUrl) : null;
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={media.filename}
      onClick={onSelect}
      onDoubleClick={onPick}
      className={cx("group flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-2xl text-left motion-reduce:transition-none", FOCUS_RING)}
    >
      <span
        className={cx(
          "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-bg-subtle motion-reduce:transition-none",
          COLOR_TRANSITION,
          selected ? "ring-2 ring-brand" : "ring-1 ring-transparent group-hover:ring-stroke-subtle",
        )}
      >
        {preview ? (
          <img src={preview} alt={media.alt} loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="rounded-xl bg-white px-2.5 py-1.5 text-[13px] font-bold leading-[18px] text-neutral-800">
            {fileTypeLabel(media.filename, media.contentType)}
          </span>
        )}
        {selected && (
          <span aria-hidden className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand text-white">
            <CheckIcon className="size-4" strokeWidth={2.2} />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col px-0.5">
        <span className={cx(TEXT.caption, "truncate text-neutral-800")}>{media.filename}</span>
        <span className="text-[11px] font-medium leading-4 text-neutral-500 tabular-nums">
          {formatBytes(media.size)}
          {media.width && media.height ? `, ${media.width}x${media.height}` : ""}
        </span>
      </span>
    </button>
  );
}

export function MediaPicker({ open, onClose, onPick, folder, kind = "image", access = "public", title = "Медіатека" }: MediaPickerProps) {
  const { can } = useStaff();
  // The order papers answer an empty list to a role without orders.view, so
  // the folder is not offered to it (as on the media screen).
  const folderOptions = can("orders.view") ? FOLDER_OPTIONS : FOLDER_OPTIONS.filter((option) => option.value !== MEDIA_ORDER_FOLDER);
  const [q, setQ] = useState("");
  const [shownFolder, setShownFolder] = useState<MediaFolder | null>(folder ?? null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MediaDto | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "done"; text: string } | null>(null);

  // A new opening starts clean: the first page of the starting folder,
  // nothing selected (state reset in render, behind a comparison).
  const [seenOpen, setSeenOpen] = useState(open);
  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open) {
      setQ("");
      setShownFolder(folder ?? null);
      setPage(1);
      setSelected(null);
      setNotice(null);
    }
  }

  const key = open ? `/media?${qs({ folder: shownFolder ?? undefined, kind, q, page, limit: LIMIT })}` : null;
  const list = useAdminQuery<MediaPage>(key);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const upload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const refused = kind === "image" ? checkImageFile(file) : null;
    if (refused) {
      setNotice({ tone: "error", text: mediaErrorMessage(refused) });
      return;
    }
    setNotice(null);
    setUploading(file.name);
    const result = await uploadMedia(file, { folder: shownFolder ?? folder ?? "misc", access });
    setUploading(null);
    if (!result.ok) {
      setNotice({ tone: "error", text: mediaErrorMessage(result) });
      return;
    }
    setSelected(result.data.media);
    setNotice({ tone: "done", text: `Файл «${result.data.media.filename}» завантажено і вибрано.` });
    setPage(1);
    invalidate("/media");
  };

  const pick = (media: MediaDto) => {
    onPick(media);
    onClose();
  };

  const searching = q !== "" || shownFolder !== null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={title}
      description={kind === "image" ? "Оберіть зображення або завантажте нове." : "Оберіть документ або завантажте новий."}
      busy={uploading !== null}
      footer={
        <ModalFooter
          onCancel={onClose}
          confirmLabel="Вибрати"
          confirmDisabled={!selected}
          onConfirm={() => {
            if (selected) pick(selected);
          }}
        />
      }
    >
      <DropZone
        variant="bare"
        accept={kind === "image" ? IMAGE_ACCEPT : undefined}
        onFiles={(files) => void upload(files)}
        disabled={uploading !== null}
        label="Файли медіатеки"
        className="flex flex-col gap-4"
      >
        {({ choose, dragging }) => (
          <>
            <div className="flex flex-col gap-2 min-[640px]:flex-row min-[640px]:items-center">
              <SearchInput
                value={q}
                onChange={(next) => {
                  setQ(next);
                  setPage(1);
                }}
                placeholder="Назва файлу"
                label="Пошук у медіатеці"
                // flex-1 only in the row: in the phone column it would
                // squash the pill to its text height.
                className="min-w-0 min-[640px]:flex-1"
              />
              <Select
                aria-label="Папка"
                value={shownFolder}
                onChange={(next) => {
                  setShownFolder(next);
                  setPage(1);
                }}
                options={folderOptions}
                placeholder="Усі папки"
                clearable
                className="min-[640px]:w-[220px]"
              />
              <Button variant="secondary" iconLeft={ArrowUpTrayIcon} loading={uploading !== null} onClick={choose}>
                Завантажити
              </Button>
            </div>

            <p aria-live="polite" className="sr-only">
              {uploading ? `Завантажуємо ${uploading}` : ""}
            </p>
            {notice && (
              <p
                role={notice.tone === "error" ? "alert" : "status"}
                className="rounded-2xl px-4 py-2.5 text-[13px] font-medium leading-[18px]"
                style={
                  notice.tone === "error"
                    ? { backgroundColor: TONES.red.bg, color: TONES.red.text }
                    : { backgroundColor: TONES.green.bg, color: TONES.green.text }
                }
              >
                {notice.text}
              </p>
            )}
            {dragging && <p className={cx(TEXT.bodyStrong, "text-center text-brand")}>Відпустіть файл, щоб завантажити його сюди</p>}

            {list.error && items.length === 0 ? (
              <ErrorState failure={list.error} onRetry={list.reload} title="Не вдалося відкрити медіатеку" />
            ) : list.loading ? (
              <div aria-hidden className={GRID}>
                {Array.from({ length: 12 }, (_, index) => (
                  <div key={index} className="flex flex-col gap-1.5">
                    <Skeleton shape="tile" className="aspect-square w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                title={searching ? "Нічого не знайдено" : "Тут ще немає файлів"}
                text={searching ? "Змініть пошук або папку." : "Завантажте перший файл кнопкою вище або перетягніть його сюди."}
              />
            ) : (
              <div className={cx(GRID, list.stale && "opacity-60")} aria-busy={list.stale || undefined}>
                {items.map((media) => (
                  <Tile
                    key={media.id}
                    media={media}
                    selected={selected?.id === media.id}
                    onSelect={() => setSelected(media)}
                    onPick={() => pick(media)}
                  />
                ))}
              </div>
            )}

            {total > LIMIT && <Pagination page={page} limit={LIMIT} total={total} onPage={setPage} />}
          </>
        )}
      </DropZone>
    </Modal>
  );
}
