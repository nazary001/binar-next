"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowUpTrayIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useRef, useState, type ReactNode } from "react";
import { MEDIA_IMAGE_TYPES, MEDIA_MAX_BYTES, type MediaAccess, type MediaDto, type MediaFolder } from "../../media/types";
import { invalidate } from "../../lib/query";
import { cx, formatBytes } from "../../lib/format";
import { Button } from "../Button";
import { Field, useFieldIds, type FieldError } from "../Field";
import { Input } from "../Input";
import { Spinner } from "../Spinner";
import { TEXT } from "../tokens";
import { DropIcon, DropZone } from "./DropZone";
import { MediaPicker } from "./MediaPicker";
import { checkImageFile, mediaErrorMessage, mediaHref, uploadMedia } from "./upload";

// One picture of a record: a product photo, a post cover, a category
// image. Empty, it is a drop zone (drag a file in, press to choose, or
// paste a screenshot with Ctrl+V); filled, a preview with "Замінити",
// "Обрати з медіатеки" and "Прибрати". Large photos are scaled down in the
// browser before they are sent (upload.ts prepareImage).
//
//   <ImageField label="Обкладинка" folder="blog" aspect="wide"
//     value={post.cover} onChange={(cover) => setPost({ ...post, cover })}
//     alt={post.coverAlt} onAltChange={(coverAlt) => setPost({ ...post, coverAlt })} />
//   <ImageField label="Фото товару" folder="products" aspect="square" value={photo} onChange={setPhoto}
//     hint="Квадратне, на білому тлі" error={errors.photo} required />
//
// Props
// - value: the image's address ("" for none); onChange(url, media?) gets
//   the new address and, after an upload or a pick, the MediaDto ("" and
//   no media after "Прибрати").
// - folder: where uploads go (MEDIA_FOLDERS); access: "public" (default).
// - label, hint, error, required, optional: the Field frame.
// - aspect: "square" (240 px tile), "wide" (16:9, up to 480 px), "free"
//   (the picture as it is, inside 480 x 240).
// - alt, onAltChange: with onAltChange an "Альтернативний текст" field sits
//   under the preview; a picked file's own alt fills an empty one.
// - disabled.
// While a file uploads, its local preview shows dimmed with a spinner and
// what is happening ("Готуємо зображення", "Завантажуємо"); a refusal
// (too large, not an image, the server's answer) shows as the field's
// error until the next try.

export type ImageAspect = "square" | "wide" | "free";

export type ImageFieldProps = {
  value: string;
  onChange: (url: string, media?: MediaDto) => void;
  folder: MediaFolder;
  access?: MediaAccess;
  label?: ReactNode;
  hint?: ReactNode;
  error?: FieldError;
  required?: boolean;
  optional?: boolean;
  aspect?: ImageAspect;
  alt?: string;
  onAltChange?: (alt: string) => void;
  disabled?: boolean;
  className?: string;
};

const ACCEPT = MEDIA_IMAGE_TYPES.join(",");

// The preview's box per aspect.
const FRAME: Record<ImageAspect, string> = {
  square: "aspect-square w-full max-w-[240px]",
  wide: "aspect-video w-full max-w-[480px]",
  free: "h-[240px] w-full max-w-[480px]",
};

// The empty drop zone: room for its text and buttons whatever the aspect
// (a square of a narrow column would wrap every line).
const EMPTY: Record<ImageAspect, string> = {
  square: "min-h-[208px] w-full max-w-[480px]",
  wide: "min-h-[208px] w-full max-w-[480px] min-[640px]:aspect-video",
  free: "min-h-[208px] w-full max-w-[480px]",
};

type Pending = { preview: string; stage: "prepare" | "upload" };

export function ImageField({
  value,
  onChange,
  folder,
  access = "public",
  label,
  hint,
  error,
  required,
  optional,
  aspect = "square",
  alt = "",
  onAltChange,
  disabled = false,
  className,
}: ImageFieldProps) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Only the newest upload may write its answer (a second file chosen while
  // the first is on its way wins).
  const attempt = useRef(0);
  const ids = useFieldIds({ hint, error: failure ?? error });

  const start = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const refused = checkImageFile(file);
    if (refused) {
      setFailure(mediaErrorMessage(refused));
      return;
    }
    const mine = ++attempt.current;
    const preview = URL.createObjectURL(file);
    setFailure(null);
    setPending({ preview, stage: file.size > MEDIA_MAX_BYTES / 4 ? "prepare" : "upload" });
    const result = await uploadMedia(file, { folder, access, alt });
    URL.revokeObjectURL(preview);
    if (mine !== attempt.current) return;
    setPending(null);
    if (!result.ok) {
      setFailure(mediaErrorMessage(result));
      return;
    }
    invalidate("/media");
    onChange(mediaHref(result.data.media), result.data.media);
  };

  const pick = (media: MediaDto) => {
    setFailure(null);
    onChange(mediaHref(media), media);
    if (onAltChange && !alt.trim() && media.alt) onAltChange(media.alt);
  };

  const shown = pending?.preview ?? value;
  const busy = pending !== null;
  const status = pending ? (pending.stage === "prepare" ? "Готуємо і завантажуємо зображення" : "Завантажуємо зображення") : "";

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
        accept={ACCEPT}
        onFiles={(files) => void start(files)}
        disabled={disabled || busy}
        invalid={ids.invalid}
        variant={shown ? "bare" : "box"}
        label={typeof label === "string" ? label : "Зображення"}
        className={cx(!shown && EMPTY[aspect], !shown && "flex flex-col items-center justify-center gap-3 px-4 py-5 text-center")}
      >
        {({ choose, dragging }) =>
          shown ? (
            <div className="flex flex-col gap-3">
              <div className={cx("relative overflow-hidden rounded-2xl bg-bg-subtle", FRAME[aspect])}>
                <img
                  src={shown}
                  alt={alt || (typeof label === "string" ? label : "")}
                  className={cx("size-full", aspect === "free" ? "object-contain" : "object-cover", busy && "opacity-50")}
                />
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 px-4 text-center">
                    <Spinner size="lg" className="text-neutral-900" />
                    <span className={cx(TEXT.bodyStrong)}>{pending?.stage === "prepare" ? "Готуємо зображення..." : "Завантажуємо..."}</span>
                    {/* An indeterminate bar: the upload reports no progress. */}
                    <span aria-hidden className="h-1 w-32 overflow-hidden rounded-full bg-white">
                      <span className="block h-full w-1/3 animate-pulse rounded-full bg-brand" />
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" iconLeft={ArrowUpTrayIcon} onClick={choose} disabled={disabled || busy}>
                  Замінити
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPickerOpen(true)} disabled={disabled || busy}>
                  З медіатеки
                </Button>
                <Button size="sm" variant="dangerGhost" onClick={() => onChange("")} disabled={disabled || busy}>
                  Прибрати
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DropIcon>{dragging ? <ArrowUpTrayIcon strokeWidth={1.7} /> : <PhotoIcon strokeWidth={1.7} />}</DropIcon>
              <span className="flex flex-col gap-1">
                <span className={TEXT.bodyStrong}>{dragging ? "Відпустіть, щоб завантажити" : "Перетягніть зображення сюди"}</span>
                <span className={TEXT.caption}>
                  JPEG, PNG, WebP або GIF до {formatBytes(MEDIA_MAX_BYTES)}
                  <br />
                  або вставте з буфера: Ctrl+V
                </span>
              </span>
              <span className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={choose} disabled={disabled} aria-describedby={ids.describedBy}>
                  Обрати файл
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPickerOpen(true)} disabled={disabled}>
                  З медіатеки
                </Button>
              </span>
            </>
          )
        }
      </DropZone>
      <span aria-live="polite" className="sr-only">
        {status}
      </span>
      {onAltChange && value && (
        <Input
          label="Альтернативний текст"
          hint="Що зображено: для пошуку і для тих, хто не бачить картинку."
          value={alt}
          onChange={onAltChange}
          maxLength={200}
          disabled={disabled}
          className="max-w-[480px]"
        />
      )}
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={pick} folder={folder} kind="image" access={access} />
    </Field>
  );
}
