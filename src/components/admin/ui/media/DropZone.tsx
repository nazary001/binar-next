"use client";

import { useRef, useState, type ClipboardEvent, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { cx } from "../../lib/format";
import { COLOR_TRANSITION } from "../tokens";

// The region that takes files for the media widgets: drag and drop, a
// press to choose, and a paste (Ctrl+V while focus is inside it, a
// screenshot for example). It owns the hidden <input type="file">; the
// content it frames gets `choose` to open the browser's file dialog from
// its own button.
//
//   <DropZone accept="image/*" onFiles={(files) => upload(files[0])} label="Зображення товару">
//     {({ choose, dragging }) => (
//       <>
//         <p>{dragging ? "Відпустіть, щоб завантажити" : "Перетягніть зображення сюди"}</p>
//         <Button size="sm" variant="secondary" onClick={choose}>Обрати файл</Button>
//       </>
//     )}
//   </DropZone>
//
// Props
// - onFiles(files): the files dropped, chosen or pasted (never empty).
// - accept: the input's accept list; the widgets check the files again
//   (a drop or a paste ignores accept).
// - multiple: more than one file at a time.
// - disabled: takes nothing, greys the region.
// - invalid: the field has an error; the dashed frame turns red.
// - variant: "box" (default) the dashed 16-px tile of an empty field;
//   "bare" no frame until files are dragged over it (the library grid).
// - label: the region's accessible name (role="group").
// - className: size and spacing.
// A press on the region itself (not on a control in it) opens the dialog,
// so the whole tile is a target for the pointer; keyboard users reach the
// button the content renders.

export type DropZoneApi = { choose: () => void; dragging: boolean };

export type DropZoneProps = {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  variant?: "box" | "bare";
  label?: string;
  className?: string;
  children: (api: DropZoneApi) => ReactNode;
};

function hasFiles(event: DragEvent<HTMLElement>): boolean {
  return [...event.dataTransfer.types].includes("Files");
}

// Renders the content through a component of its own: `choose` touches a
// ref, and the React rules allow handing it to an element, not calling a
// function with it during render.
function DropContent({ render, api }: { render: DropZoneProps["children"]; api: DropZoneApi }) {
  return <>{render(api)}</>;
}

export function DropZone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  invalid = false,
  variant = "box",
  label,
  className,
  children,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const choose = () => {
    if (!disabled) inputRef.current?.click();
  };

  const take = (list: FileList | null | undefined) => {
    const files = list ? [...list] : [];
    if (files.length === 0 || disabled) return;
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!dragging) setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files);
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (disabled || event.clipboardData.files.length === 0) return;
    // A paste into a text field inside the region stays text.
    const target = event.target as HTMLElement;
    if (target.closest("input:not([type=file]), textarea, [contenteditable='true']")) return;
    event.preventDefault();
    take(event.clipboardData.files);
  };

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (variant === "bare") return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label, [role='button']")) return;
    choose();
  };

  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-dragging={dragging || undefined}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={onPaste}
      onClick={onClick}
      className={cx(
        "relative min-w-0 motion-reduce:transition-none",
        COLOR_TRANSITION,
        variant === "box" && "rounded-2xl border border-dashed",
        variant === "box" &&
          (disabled
            ? "cursor-not-allowed border-stroke-subtle bg-bg-subtle"
            : dragging
              ? "border-brand bg-bg-subtle"
              : invalid
                ? "cursor-pointer border-negative bg-white"
                : "cursor-pointer border-neutral-400 bg-white hover:border-neutral-800"),
        variant === "bare" && "rounded-2xl outline-2 -outline-offset-2 outline-dashed",
        variant === "bare" && (dragging ? "outline-brand" : "outline-transparent"),
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          take(event.target.files);
          // The same file chosen again must fire a change next time.
          event.target.value = "";
        }}
      />
      <DropContent render={children} api={{ choose, dragging }} />
    </div>
  );
}

// The dark icon tile of an empty drop zone (the cabinet's upload sign, one
// size down).
export function DropIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white [&>svg]:size-5">
      {children}
    </span>
  );
}
