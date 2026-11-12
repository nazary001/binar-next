"use client";

import { ArrowTopRightOnSquareIcon, ArrowUpTrayIcon, DocumentArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRef, useState, type ReactNode } from "react";
import { MEDIA_MAX_BYTES, type MediaAccess, type MediaDto, type MediaFolder } from "../../media/types";
import { adminUrl } from "../../lib/api";
import { invalidate } from "../../lib/query";
import { cx, formatBytes } from "../../lib/format";
import { Button, IconButton } from "../Button";
import { Field, useFieldIds, type FieldError } from "../Field";
import { Spinner } from "../Spinner";
import { TEXT } from "../tokens";
import { DropIcon, DropZone } from "./DropZone";
import { checkFile, fileTypeLabel, mediaErrorMessage, uploadMedia } from "./upload";

// One document of a record: an invoice PDF of an order, a material's
// file, a price list. Empty, a drop zone row; filled, the file's tile
// (type, name, size) with "Відкрити", "Замінити" and the cross.
//
//   <FileField label="Рахунок" folder="orders" access="private" accept=".pdf"
//     value={doc} onChange={setDoc} hint="PDF до 4 МБ" />
//   <FileField label="Файл матеріалу" folder="materials" access="public"
//     value={file} onChange={(next, media) => setFile(next)} required error={errors.file} />
//
// Props
// - value: { mediaId, name, size } or null; onChange(value, media?) gets
//   the new value and, after an upload, the MediaDto (null after the cross).
// - folder, access: where the upload goes and who may read it ("private"
//   files are read through /api/admin/media/<id>/file by staff only).
// - accept: extensions or types (default: PDF and office documents,
//   ACCEPT_DOCUMENTS); a file outside it is refused in the browser.
// - label, hint, error, required, optional, disabled, className.
// "Відкрити" opens the staff address of the file in a new tab.

export type FileValue = { mediaId: string; name: string; size: number };

export type FileFieldProps = {
  value: FileValue | null;
  onChange: (value: FileValue | null, media?: MediaDto) => void;
  folder: MediaFolder;
  access: MediaAccess;
  accept?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: FieldError;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
};

export const ACCEPT_DOCUMENTS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv";

// "PDF, DOC, DOCX ..." for the caption, from an accept list.
function acceptText(accept: string): string {
  const names = accept
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith("."))
    .map((entry) => entry.slice(1).toUpperCase());
  if (names.length === 0) return "Будь-який файл";
  return names.length > 5 ? `${names.slice(0, 5).join(", ")} та інші` : names.join(", ");
}

const ROW = "flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 min-[640px]:px-4";

export function FileField({
  value,
  onChange,
  folder,
  access,
  accept = ACCEPT_DOCUMENTS,
  label,
  hint,
  error,
  required,
  optional,
  disabled = false,
  className,
}: FileFieldProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(0);
  const ids = useFieldIds({ hint, error: failure ?? error });

  const start = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const refused = checkFile(file, accept);
    if (refused) {
      setFailure(mediaErrorMessage(refused));
      return;
    }
    const mine = ++attempt.current;
    setFailure(null);
    setPending(file.name);
    // Documents go as they are: prepareImage would redraw a photo of a
    // signed page, and it is not ours to change.
    const result = await uploadMedia(file, { folder, access, prepare: false });
    if (mine !== attempt.current) return;
    setPending(null);
    if (!result.ok) {
      setFailure(mediaErrorMessage(result));
      return;
    }
    const media = result.data.media;
    invalidate("/media");
    onChange({ mediaId: media.id, name: media.filename, size: media.size }, media);
  };

  return (
    <Field
      label={label}
      hint={hint}
      error={failure ?? error}
      required={required}
      optional={optional}
      labelAs="span"
      labelId={ids.labelId}
      hintId={ids.hintId}
      errorId={ids.errorId}
      disabled={disabled}
      className={className}
    >
      <DropZone
        accept={accept}
        onFiles={(files) => void start(files)}
        disabled={disabled || pending !== null}
        invalid={ids.invalid}
        variant={value || pending ? "bare" : "box"}
        label={typeof label === "string" ? label : "Файл"}
      >
        {({ choose, dragging }) =>
          pending ? (
            <div className={cx(ROW, "bg-bg-subtle")} role="status">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white">
                <Spinner className="text-neutral-900" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cx(TEXT.bodyStrong, "truncate")}>{pending}</span>
                <span className={TEXT.caption}>Завантажуємо...</span>
              </span>
            </div>
          ) : value ? (
            <div className={cx(ROW, "bg-bg-subtle")}>
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[11px] font-bold leading-none text-neutral-800"
              >
                {fileTypeLabel(value.name)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cx(TEXT.bodyStrong, "truncate")} title={value.name}>
                  {value.name}
                </span>
                <span className={cx(TEXT.caption, "tabular-nums")}>{formatBytes(value.size)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <IconButton
                  size="sm"
                  icon={ArrowTopRightOnSquareIcon}
                  label={`Відкрити ${value.name}`}
                  href={adminUrl(`/media/${encodeURIComponent(value.mediaId)}/file`)}
                  external
                />
                <IconButton size="sm" icon={ArrowUpTrayIcon} label="Замінити файл" onClick={choose} disabled={disabled} />
                <IconButton size="sm" variant="danger" icon={XMarkIcon} label="Прибрати файл" onClick={() => onChange(null)} disabled={disabled} />
              </span>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3 px-4 py-4 min-[640px]:flex-row min-[640px]:items-center">
              <DropIcon>{dragging ? <ArrowUpTrayIcon strokeWidth={1.7} /> : <DocumentArrowUpIcon strokeWidth={1.7} />}</DropIcon>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={TEXT.bodyStrong}>{dragging ? "Відпустіть, щоб завантажити" : "Перетягніть файл сюди"}</span>
                <span className={TEXT.caption}>
                  {acceptText(accept)} до {formatBytes(MEDIA_MAX_BYTES)}
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={choose}
                disabled={disabled}
                aria-describedby={ids.describedBy}
                className="self-start min-[640px]:self-auto"
              >
                Обрати файл
              </Button>
            </div>
          )
        }
      </DropZone>
    </Field>
  );
}
