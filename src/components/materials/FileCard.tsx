"use client";

import { DownloadIcon, ExclamationCircleIcon, FileTile, LockIcon } from "./icons";
import type { MaterialFile } from "./data";

// «Завантажити після авторизації.» — Figma «Tooltip» (4634:65705): a
// 268 x 40 white r12 chip (px-12 py-8, 0/2/6 shadow) with the 24-px
// exclamation circle and Body/Small text. The master hangs it 22 px
// above the padlock, its right edge 78 px past the glyph.
export function LockTooltip({ id }: { id: string }) {
  return (
    <span
      id={id}
      role="tooltip"
      className="pointer-events-none absolute bottom-[calc(100%+22px)] right-0 z-10 flex w-[268px] items-center gap-3 rounded-xl bg-white px-3 py-2 text-left opacity-0 shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 lg:-right-[78px]"
    >
      <ExclamationCircleIcon className="size-6 shrink-0 text-neutral-900" />
      <span className="min-w-0 flex-1 text-[14px] leading-6 text-neutral-900">
        Завантажити після авторизації.
      </span>
    </span>
  );
}

// The download / lock action of a file. A visitor gets the padlock with
// the tooltip; clicking it opens the sign-in drawer. Everyone else gets
// the tray-arrow download (a link for the `url` type opens the site).
export function FileAction({
  file,
  canDownload,
  onLocked,
  size = "md",
  className = "",
}: {
  file: MaterialFile;
  canDownload: boolean;
  onLocked: () => void;
  size?: "md" | "lg";
  className?: string;
}) {
  const glyph = size === "lg" ? "size-8" : "size-6";
  if (!canDownload) {
    const tipId = `${file.id}-lock-tip`;
    return (
      <span className={`relative flex shrink-0 ${className}`}>
        <button
          type="button"
          onClick={onLocked}
          aria-label={`Увійти, щоб завантажити «${file.name}»`}
          aria-describedby={tipId}
          className="group flex cursor-pointer items-center justify-center text-neutral-900 outline-none"
        >
          <LockIcon className={glyph} />
          <LockTooltip id={tipId} />
        </button>
      </span>
    );
  }
  const external = file.type === "url";
  return (
    <a
      href={file.href}
      download={external ? undefined : file.name}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={`${external ? "Відкрити" : "Завантажити"} «${file.name}»`}
      onClick={(e) => e.stopPropagation()}
      className={`flex shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand ${className}`}
    >
      <DownloadIcon className={glyph} />
    </a>
  );
}

// One file row — Figma «Frame 1010107003» (4634:64383, 495 x 82): a
// #f8f8f8 r24 card padded 16 / 24 with the 48-px #343435 badge tile,
// the 18/24 ExtraBold name (one line, ellipsis) over «Розмір: …» in
// 16/24 #777779, and the 24-px action at the right edge, 32 px away.
// The name opens the preview panel.
export function FileCard({
  file,
  canDownload,
  onOpen,
  onLocked,
}: {
  file: MaterialFile;
  canDownload: boolean;
  onOpen: (file: MaterialFile) => void;
  onLocked: () => void;
}) {
  return (
    <article className="flex items-center gap-4 rounded-3xl bg-bg-subtle py-4 pl-4 pr-6 lg:gap-8">
      <button
        type="button"
        onClick={() => onOpen(file)}
        className="group flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left lg:gap-6"
      >
        <FileTile type={file.type} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900 transition-colors duration-200 group-hover:text-brand">
            {file.name}
          </span>
          <span className="text-body-sm text-neutral-500">Розмір: {file.size}</span>
        </span>
      </button>
      <FileAction file={file} canDownload={canDownload} onLocked={onLocked} />
    </article>
  );
}
