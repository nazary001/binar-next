"use client";

import { ArrowUpTrayIcon, CheckCircleIcon, DocumentArrowUpIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { countOf, cx, formatBytes } from "../lib/format";
import { invalidate } from "../lib/query";
import { Button, IconButton } from "../ui/Button";
import { RadioGroup } from "../ui/Checkbox";
import { Modal } from "../ui/Modal";
import { DropIcon, DropZone } from "../ui/media/DropZone";
import { checkFile, fileTypeLabel, mediaErrorMessage } from "../ui/media/upload";
import { Select } from "../ui/Select";
import { Spinner } from "../ui/Spinner";
import { toast } from "../ui/Toast";
import { TEXT, TONES } from "../ui/tokens";
import { prepareForUpload, sendMedia } from "./transfer";
import { MEDIA_FOLDERS, MEDIA_MAX_BYTES, type MediaAccess, type MediaDto, type MediaFolder } from "./types";

// "Завантажити файли": several files at once into one folder with one
// access. Files are chosen, dropped or pasted, wait in a list (the folder
// and the access can still change), then go one after another, each with
// its own progress bar and its own result. A file the library refuses
// (type, size) says why on its line; the others still go.

export const ACCEPT_MEDIA = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

const FOLDER_OPTIONS = MEDIA_FOLDERS.map((folder) => ({ value: folder.value, label: folder.label }));

const ACCESS_OPTIONS = [
  { value: "public" as const, label: "Публічний", hint: "Відкривається за прямою адресою. Для зображень статей і товарів." },
  {
    value: "private" as const,
    label: "Приватний",
    hint: "Лише для панелі та сторінок сайту, що перевіряють доступ: матеріали, документи замовлень.",
  },
];

type Status = "waiting" | "preparing" | "uploading" | "done" | "duplicate" | "error";

type Item = { key: number; file: File; size: number; status: Status; progress: number; error: string; media: MediaDto | null };

// Keys of list lines; only ever read in event handlers.
let nextKey = 1;

function itemOf(file: File): Item {
  const refused = checkFile(file, ACCEPT_MEDIA);
  return {
    key: nextKey++,
    file,
    size: file.size,
    status: refused ? "error" : "waiting",
    progress: 0,
    error: refused ? mediaErrorMessage(refused) : "",
    media: null,
  };
}

function StatusLine({ item }: { item: Item }) {
  if (item.status === "error") {
    return (
      <span role="alert" className="text-[12px] font-medium leading-4" style={{ color: TONES.red.text }}>
        {item.error}
      </span>
    );
  }
  if (item.status === "done") return <span className="text-[12px] font-medium leading-4" style={{ color: TONES.green.text }}>Завантажено</span>;
  if (item.status === "duplicate") {
    return (
      <span className="text-[12px] font-medium leading-4" style={{ color: TONES.blue.text }}>
        Такий самий файл уже є в медіатеці: новий не створено
      </span>
    );
  }
  if (item.status === "preparing") return <span className={TEXT.caption}>Готуємо зображення...</span>;
  if (item.status === "uploading") return <span className={cx(TEXT.caption, "tabular-nums")}>Завантажуємо, {Math.round(item.progress * 100)}%</span>;
  return <span className={TEXT.caption}>Очікує</span>;
}

export function UploadModal({
  open,
  onClose,
  folder: startFolder,
  files: startFiles,
}: {
  open: boolean;
  onClose: () => void;
  // The folder new files go to at first (the one the library is filtered by).
  folder: MediaFolder;
  // Files dropped on the library before the dialog opened.
  files: File[];
}) {
  const [folder, setFolder] = useState<MediaFolder>(startFolder);
  const [access, setAccess] = useState<MediaAccess>("public");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);

  // Every opening starts with the files it was opened with.
  const [seenOpen, setSeenOpen] = useState(false);
  if (seenOpen !== open) {
    setSeenOpen(open);
    if (open) {
      setFolder(startFolder);
      setAccess(startFolder === "materials" || startFolder === "orders" ? "private" : "public");
      setItems(startFiles.map(itemOf));
    }
  }

  const waiting = items.filter((item) => item.status === "waiting");
  const finished = items.some((item) => item.status === "done" || item.status === "duplicate" || item.status === "error");

  const update = (key: number, patch: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const add = (files: File[]) => setItems((current) => [...current, ...files.map(itemOf)]);

  const run = async () => {
    const queue = waiting;
    if (queue.length === 0 || running) return;
    setRunning(true);
    let sent = 0;
    let failed = 0;
    for (const item of queue) {
      update(item.key, { status: "preparing", progress: 0 });
      const ready = await prepareForUpload(item.file);
      update(item.key, { status: "uploading", size: ready.size });
      const result = await sendMedia(ready, { folder, access }, (progress) => update(item.key, { progress }));
      if (result.ok) {
        sent += 1;
        update(item.key, { status: result.data.duplicate ? "duplicate" : "done", progress: 1, media: result.data.media });
        // The grid behind the dialog fills as the files arrive.
        invalidate("/media?");
      } else {
        failed += 1;
        update(item.key, { status: "error", error: mediaErrorMessage(result) });
      }
    }
    setRunning(false);
    if (sent > 0 && failed === 0) toast.success(`Завантажено ${countOf(sent, ["файл", "файли", "файлів"])}.`);
    else if (sent > 0) toast.info(`Завантажено ${countOf(sent, ["файл", "файли", "файлів"])}, не вдалося: ${failed}. Причини в списку.`);
    else toast.error("Жоден файл не завантажено. Причини в списку.");
  };

  const close = () => {
    if (!running) onClose();
  };

  const primary =
    waiting.length > 0 || running ? (
      <Button iconLeft={ArrowUpTrayIcon} loading={running} onClick={() => void run()} disabled={waiting.length === 0 && !running}>
        {running ? "Завантажуємо..." : waiting.length === 1 ? "Завантажити файл" : `Завантажити ${countOf(waiting.length, ["файл", "файли", "файлів"])}`}
      </Button>
    ) : finished ? (
      <Button onClick={close}>Готово</Button>
    ) : (
      <Button iconLeft={ArrowUpTrayIcon} disabled>
        Завантажити
      </Button>
    );

  return (
    <Modal
      open={open}
      onClose={close}
      busy={running}
      size="lg"
      title="Завантажити файли"
      description={`Зображення JPG, PNG, WebP, GIF і документи PDF, Word, Excel, PowerPoint до ${formatBytes(MEDIA_MAX_BYTES)}. Великі фото зменшуються перед відправкою.`}
      footer={
        <>
          {!finished || waiting.length > 0 ? (
            <Button variant="secondary" onClick={close} disabled={running}>
              Скасувати
            </Button>
          ) : null}
          {primary}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Select
          label="Папка"
          value={folder}
          onChange={setFolder}
          options={FOLDER_OPTIONS}
          disabled={running}
          hint="Лише для порядку в медіатеці: за папкою файл потім легко знайти."
          className="min-[640px]:max-w-[320px]"
        />
        <RadioGroup label="Доступ" value={access} onChange={setAccess} options={ACCESS_OPTIONS} variant="tiles" direction="horizontal" disabled={running} />

        <DropZone multiple accept={ACCEPT_MEDIA} onFiles={add} disabled={running} label="Файли для завантаження">
          {({ choose, dragging }) => (
            <div className="flex min-w-0 flex-col gap-3 px-4 py-5 min-[640px]:flex-row min-[640px]:items-center">
              <DropIcon>{dragging ? <ArrowUpTrayIcon strokeWidth={1.7} /> : <DocumentArrowUpIcon strokeWidth={1.7} />}</DropIcon>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={TEXT.bodyStrong}>{dragging ? "Відпустіть, щоб додати до списку" : "Перетягніть файли сюди"}</span>
                <span className={TEXT.caption}>Або вставте зображення з буфера (Ctrl+V), або оберіть кілька файлів.</span>
              </span>
              <Button size="sm" variant="secondary" onClick={choose} disabled={running} className="self-start min-[640px]:self-auto">
                Обрати файли
              </Button>
            </div>
          )}
        </DropZone>

        {items.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Файли до завантаження">
            {items.map((item) => (
              <li key={item.key} className="flex min-w-0 items-center gap-3 rounded-2xl bg-bg-subtle px-3 py-2.5">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[11px] font-bold leading-none text-neutral-800"
                >
                  {item.status === "preparing" || item.status === "uploading" ? (
                    <Spinner className="text-neutral-900" />
                  ) : (
                    fileTypeLabel(item.file.name, item.file.type)
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className={cx(TEXT.bodyStrong, "truncate")} title={item.file.name}>
                      {item.file.name}
                    </span>
                    <span className={cx(TEXT.caption, "shrink-0 tabular-nums")}>{formatBytes(item.size)}</span>
                  </span>
                  {item.status === "uploading" || item.status === "preparing" ? (
                    <span className="flex flex-col gap-1">
                      <span
                        role="progressbar"
                        aria-label={`Завантаження ${item.file.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(item.progress * 100)}
                        className="block h-1.5 w-full overflow-hidden rounded-full bg-white"
                      >
                        <span
                          className="block h-full rounded-full bg-neutral-900 transition-[width] duration-200 motion-reduce:transition-none"
                          style={{ width: `${Math.max(4, Math.round(item.progress * 100))}%` }}
                        />
                      </span>
                      <StatusLine item={item} />
                    </span>
                  ) : (
                    <StatusLine item={item} />
                  )}
                </span>
                {item.status === "done" && <CheckCircleIcon aria-hidden className="size-6 shrink-0" style={{ color: TONES.green.dot }} strokeWidth={1.7} />}
                {item.status === "duplicate" && (
                  <InformationCircleIcon aria-hidden className="size-6 shrink-0" style={{ color: TONES.blue.dot }} strokeWidth={1.7} />
                )}
                {(item.status === "waiting" || item.status === "error") && !running && (
                  <IconButton
                    size="sm"
                    icon={XMarkIcon}
                    label={`Прибрати ${item.file.name} зі списку`}
                    onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
