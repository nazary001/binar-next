"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { UploadIcon } from "./icons";

// Dropzone 4868:31321 (ctx/4868-31306.md; same block in «Додати договір»
// 4868:31286 / 31348): 598 x 270, 1-px DASHED #343435 stroke, r24, py-24,
// no fill (the white modal shows through); a 598 column (gap 16): the
// 60-px «<Avatar>» #1d1d1f r19.286 with the white 24-px upload glyph
// centred, then a column (gap 32) of «Перетягніть файл сюди або»
// (Body/Medium 16/24 #777779) and a column (gap 12) of the OUTLINED
// Button/Large «Обрати файл» (164 x 52, #343435 stroke) over «PNG,JPG до
// 5МБ» (Regular 14/24 #777779). CSS dashes approximate Figma's dash
// pattern. Drag-over (not drawn): brand stroke + #f8f8f8 fill.
export type DropzoneProps = {
  onFiles: (files: File[]) => void;
  // input accept list, e.g. ".pdf,.png,.jpg".
  accept?: string;
  multiple?: boolean;
  // Files above this size are reported through onReject.
  maxSizeMb?: number;
  onReject?: (file: File, reason: "size" | "type") => void;
  text?: string;
  buttonLabel?: string;
  hint?: string;
  disabled?: boolean;
  // Forces the drag-over look (a parent that tracks a page-wide drag, or
  // the gallery).
  active?: boolean;
  className?: string;
};

function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .some((t) =>
      t.startsWith(".")
        ? name.endsWith(t)
        : t.endsWith("/*")
          ? file.type.startsWith(t.slice(0, -1))
          : file.type === t,
    );
}

export function Dropzone({
  onFiles,
  accept,
  multiple = false,
  maxSizeMb,
  onReject,
  text = "Перетягніть файл сюди або",
  buttonLabel = "Обрати файл",
  hint = "PNG,JPG до 5МБ",
  disabled = false,
  active = false,
  className = "",
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hintId = useId();
  const [dragging, setOver] = useState(false);
  const over = dragging || active;

  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const picked = multiple ? [...list] : [...list].slice(0, 1);
    const ok: File[] = [];
    for (const file of picked) {
      if (!matchesAccept(file, accept)) onReject?.(file, "type");
      else if (maxSizeMb !== undefined && file.size > maxSizeMb * 1024 * 1024) onReject?.(file, "size");
      else ok.push(file);
    }
    if (ok.length) onFiles(ok);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dragging) setOver(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-state={over ? "over" : undefined}
      className={`flex h-[270px] min-w-0 flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-6 text-center transition-colors duration-200 ${
        over ? "border-brand bg-bg-subtle" : "border-neutral-800"
      } ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <span
        aria-hidden
        className="relative flex size-[60px] shrink-0 items-center justify-center rounded-[19.286px] bg-neutral-900 text-white"
      >
        <UploadIcon className="size-6" />
      </span>
      <p className="mt-4 text-[16px] leading-6 text-neutral-500">{text}</p>
      <Button
        variant="outlinedDark"
        className="mt-8"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-describedby={hintId}
      >
        {buttonLabel}
      </Button>
      <p id={hintId} className="mt-3 text-[14px] leading-6 text-neutral-500">
        {hint}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
