"use client";

import { useId } from "react";
import { ArrowUpRight } from "@/components/blog/icons";
import { DownloadIcon, ExclamationCircleIcon, FileTile, LockIcon } from "./icons";
import { FILE_TYPE_LABELS, type MaterialFile } from "./data";

// «Завантажити після авторизації.» — Figma «Tooltip» (4634:65705): a
// 268 x 40 white r12 chip (px-12 py-8, 0/2/6 shadow) with the 24-px
// exclamation circle and Body/Small text. The master hangs it 22 px
// above the padlock, its right edge 78 px past the glyph. Partners get
// the same chip with their own hint (no B2B master draws one), aligned
// to the glyph's right edge instead: the partner grid runs to the 32-px
// gutter, so the master's 78-px overhang would leave the window in the
// third column; in the preview head it opens below for everyone (above,
// the panel's top edge would clip it).
// Every class sits whole in a plain string: a variant glued to `${`
// in a template literal is not extracted by Tailwind's scanner (the
// `group-focus-visible:` reveal went missing that way).
// Phones (< 640, materials spec 2.6): the tooltip is a desktop hover /
// focus affordance and is hidden; the same sentence is printed as a 12/16
// caption under the file size instead (it clipped at 320, MAT-16).
const SIGN_IN_HINT = "Завантажити після авторизації.";

const COPY = {
  sizeLabel: "Розмір: ",
  // Phone meta of a `url` file: the type label instead of a byte size.
  link: FILE_TYPE_LABELS.find((t) => t.value === "url")?.label ?? "Посилання",
  locked: (name: string) => `Файл «${name}» недоступний`,
  signIn: (name: string) => `Увійти, щоб завантажити «${name}»`,
  open: (name: string) => `Відкрити «${name}»`,
  download: (name: string) => `Завантажити «${name}»`,
} as const;

type TooltipPlacement = "master" | "above" | "below";
const TOOLTIP_POSITION: Record<TooltipPlacement, string> = {
  master: "bottom-[calc(100%+22px)] right-0 lg:-right-[78px]",
  above: "bottom-[calc(100%+22px)] right-0",
  below: "top-[calc(100%+22px)] right-0",
};

export function LockTooltip({
  id,
  text = SIGN_IN_HINT,
  placement = "master",
}: {
  id: string;
  text?: string;
  placement?: TooltipPlacement;
}) {
  return (
    <span
      id={id}
      role="tooltip"
      className={`pointer-events-none absolute ${TOOLTIP_POSITION[placement]} z-10 flex w-[268px] items-center gap-3 rounded-xl bg-white px-3 py-2 text-left opacity-0 shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 max-lg:hidden`}
    >
      <ExclamationCircleIcon className="size-6 shrink-0 text-neutral-900" />
      <span className="min-w-0 flex-1 text-[14px] leading-6 text-neutral-900">
        {text}
      </span>
    </span>
  );
}

// The phone hit box of a row action (`hitArea`): a 44 box whose 24 glyph
// keeps its x (the box overhangs the content edge by 10 px); from 640 the
// bare glyph as before.
const HIT_BOX = "size-11 -mr-2.5 lg:mr-0 lg:size-auto";
const HIT_INNER = "size-full lg:size-auto";
const PHONE_RING = "max-lg:rounded-full max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand";

// The download / lock action of a file. A visitor gets the padlock with
// the tooltip; clicking it opens the sign-in drawer. A partner whose
// agreement does not cover the file (no `onLocked` action) gets the
// same padlock as a focusable hint only. Everyone else gets the
// tray-arrow download (a link for the `url` type opens the site; on
// phones its glyph is the menu's arrow-up-right, MAT-23).
// The tooltip id comes from useId: the card and the preview head render
// the same file at once, so `${file.id}` alone would repeat.
// `pending` (B2C first paint, MAT-20): until hydration the auth store is
// still the server's visitor, so a locked file renders an empty slot of
// the action's size instead of a padlock a signed-in customer would see
// flash.
export function FileAction({
  file,
  canDownload,
  onLocked,
  lockedHint,
  size = "md",
  className = "",
  hitArea = false,
  pending = false,
}: {
  file: MaterialFile;
  canDownload: boolean;
  onLocked?: () => void;
  lockedHint?: string;
  size?: "md" | "lg";
  className?: string;
  hitArea?: boolean;
  pending?: boolean;
}) {
  const glyph = size === "lg" ? "size-8" : "size-6";
  const tipId = `${useId()}-lock-tip`;
  // In the preview head (lg) the chip opens below the padlock.
  const inPreview = size === "lg";
  if (pending) {
    return (
      <span
        aria-hidden
        className={hitArea ? "size-11 -mr-2.5 shrink-0 lg:mr-0 lg:size-6" : `shrink-0 ${glyph}`}
      />
    );
  }
  if (!canDownload && !onLocked) {
    return (
      <span className={`relative flex shrink-0 ${hitArea ? HIT_BOX : ""} ${className}`}>
        <span
          tabIndex={0}
          role="img"
          aria-label={COPY.locked(file.name)}
          aria-describedby={tipId}
          className={`group flex items-center justify-center text-neutral-900 outline-none ${hitArea ? HIT_INNER : ""} ${PHONE_RING}`}
        >
          <LockIcon className={glyph} />
          <LockTooltip
            id={tipId}
            text={lockedHint}
            placement={inPreview ? "below" : "above"}
          />
        </span>
      </span>
    );
  }
  if (!canDownload) {
    return (
      <span className={`relative flex shrink-0 ${hitArea ? HIT_BOX : ""} ${className}`}>
        <button
          type="button"
          onClick={onLocked}
          aria-label={COPY.signIn(file.name)}
          aria-describedby={tipId}
          className={`group flex cursor-pointer items-center justify-center text-neutral-900 outline-none ${hitArea ? HIT_INNER : ""} ${PHONE_RING} max-lg:active:text-brand`}
        >
          <LockIcon className={glyph} />
          <LockTooltip id={tipId} placement={inPreview ? "below" : "master"} />
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
      aria-label={external ? COPY.open(file.name) : COPY.download(file.name)}
      onClick={(e) => e.stopPropagation()}
      className={`flex shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand ${hitArea ? HIT_BOX : ""} max-lg:outline-none max-lg:active:text-brand ${PHONE_RING} ${className}`}
    >
      {external ? (
        <>
          <DownloadIcon className={`${glyph} max-lg:hidden`} />
          <ArrowUpRight className="size-[16.5px] lg:hidden" />
        </>
      ) : (
        <DownloadIcon className={glyph} />
      )}
    </a>
  );
}

// The size line: «Розмір: 14 MB»; phones print the type label
// «Посилання» for `url` files instead (they have no byte size to speak
// of; the desktop keeps the master's placeholder line).
// The label and the value stay two text nodes, as the desktop always drew
// them (one merged string shapes a sub-pixel differently on the zoomed
// 640 / 1024 canvases).
export function FileMeta({ file, as: Tag = "span" }: { file: MaterialFile; as?: "span" | "p" }) {
  if (file.type === "url") {
    return (
      <>
        <Tag className="text-body-sm text-neutral-500 lg:hidden">{COPY.link}</Tag>
        <Tag className="text-body-sm text-neutral-500 max-lg:hidden">
          {COPY.sizeLabel}
          {file.size}
        </Tag>
      </>
    );
  }
  return (
    <Tag className="text-body-sm text-neutral-500">
      {COPY.sizeLabel}
      {file.size}
    </Tag>
  );
}

// The lock caption under the size (phones only): the visitor's sign-in
// hint or the partner's `lockedHint`; null when the file downloads.
export function lockCaption(canDownload: boolean, onLocked?: () => void, lockedHint?: string): string | null {
  if (canDownload) return null;
  return onLocked ? SIGN_IN_HINT : (lockedHint ?? null);
}

// One file row — Figma «Frame 1010107003» (4634:64383, 495 x 82): a
// #f8f8f8 r24 card padded 16 / 24 with the 48-px #343435 badge tile,
// the 18/24 ExtraBold name (one line, ellipsis) over «Розмір: …» in
// 16/24 #777779, and the 24-px action at the right edge, 32 px away.
// The name opens the preview panel. The partner folder (B2B file card
// 4378:63098, same box and paddings) is white on the #f5f5f5 panel.
// Hover (designer, 2026-11-13: variant `State=Hower` 5474:44899) is a
// state of the whole card (`group/card`), not only of the name: a 2-px
// #f85a0b border, the #f8f8f8 fill (the white partner card too) and the
// name in #f85a0b; the badge tile, the size line and the action glyph
// keep their colours (the glyph still turns orange under the pointer, it
// is a separate action). Padlock rows take the same hover. Figma lays the
// stroke out around the 16 / 24 padding (an 86-tall box); here the 2 px
// is a transparent border at rest taken out of the padding (14 / 22 + 2),
// so the card stays 82 tall and nothing moves when the border shows.
// Phones (< 640, materials spec 2.6, TR-25): an open row between 1-px
// #d2d2d2 lines (the list draws them), py 16 - the 48 tile r12, 16, the
// name in 16/22 Bold +0.16 (3-line clamp, A16), 4, the 14/20 size, the
// 12/16 lock caption, and the 24 action in a 44 hit box at the right
// edge, 8 from the text.
export function FileCard({
  file,
  canDownload,
  onOpen,
  onLocked,
  lockedHint,
  surface = "subtle",
  pending = false,
}: {
  file: MaterialFile;
  canDownload: boolean;
  onOpen: (file: MaterialFile) => void;
  onLocked?: () => void;
  lockedHint?: string;
  surface?: "subtle" | "white";
  // Before hydration (B2C first paint): empty action slot, invisible caption.
  pending?: boolean;
}) {
  const caption = lockCaption(canDownload, onLocked, lockedHint);
  return (
    <article
      className={`group/card flex items-center gap-4 rounded-3xl ${surface === "subtle" ? "bg-bg-subtle" : "bg-white"} py-4 pl-4 pr-6 transition-colors duration-200 lg:gap-8 lg:border-2 lg:border-transparent lg:py-3.5 lg:pl-3.5 lg:pr-[22px] lg:hover:border-brand lg:hover:bg-bg-subtle max-lg:gap-2 max-lg:rounded-none max-lg:bg-transparent max-lg:px-0`}
    >
      <button
        type="button"
        onClick={() => onOpen(file)}
        className="group flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left lg:gap-6 max-lg:min-h-12 max-lg:rounded-2xl max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand"
      >
        <FileTile type={file.type} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 max-lg:gap-1">
          <span className="truncate text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900 transition-colors duration-200 group-hover/card:text-brand max-lg:line-clamp-3 max-lg:whitespace-normal max-lg:text-[16px] max-lg:font-bold max-lg:leading-[22px] max-lg:tracking-[0.16px] max-lg:group-active:text-brand">
            {file.name}
          </span>
          <FileMeta file={file} />
          {caption && (
            <span className={pending ? "invisible text-[12px] leading-4 text-neutral-500 lg:hidden" : "text-[12px] leading-4 text-neutral-500 lg:hidden"}>
              {caption}
            </span>
          )}
        </span>
      </button>
      <FileAction
        file={file}
        canDownload={canDownload}
        onLocked={onLocked}
        lockedHint={lockedHint}
        hitArea
        pending={pending}
      />
    </article>
  );
}
