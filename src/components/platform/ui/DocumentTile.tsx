import type { ReactNode } from "react";
import { DocumentGlyph, DotIcon, DownloadIcon, EyeIcon } from "./icons";

// Document row of «Документи замовлення» (modal 4990:76250, 598 x 100)
// and of the order / return documents card (5052:56956 flex-1 = 463 in a
// 1014 card, 5052:56992 fixed 463): #f8f8f8 r24 p-24, gap 27 between the
// info and the actions; info = the 52-px «Info icon» tile (#343435 r12,
// 24-px document glyph 14 px in, white) + gap 16 + a column (gap 4) of
// the name (Manrope Bold 16/24 #1d1d1f) and the meta line «19.09.2025 ·
// 0.9 МБ · PDF» (Regular 14/24 #777779, 14-px dots, gap 4); actions =
// 24-px eye + download glyphs #1d1d1f, gap 12. Pending variant
// (4990:76287 «Надходження на рахунок»): tile #e8e8e9 with a #bbbbbc
// glyph, name #a5a5a5, meta «З'явиться після оплати», no actions.
// No width of its own: it stretches in a column (598 in the modal) and
// takes flex-1 / w-[463px] from the caller in the documents card.
// Narrower than the master (the shop canvas at zoom 0.7 shrinks the
// flex-1 tiles to ~340 px, phones to ~290): the meta line wraps between
// its parts (each part carries its trailing dot) instead of running under
// the actions, and on phones the actions drop under the info, aligned
// with the text column (52 tile + 16 = 68).
export type DocumentTileProps = {
  name: string;
  // Meta parts joined by dots, e.g. ["19.09.2025", "0.9 МБ", "PDF"].
  meta?: ReactNode[];
  // Pending document: true for the master's «З'явиться після оплати», or
  // a custom note.
  pending?: boolean | string;
  // Download URL (rendered as a link with the download attribute).
  href?: string;
  downloadName?: string;
  onPreview?: () => void;
  className?: string;
};

export const DOCUMENT_PENDING_NOTE = "З'явиться після оплати";

const ACTION =
  "relative flex size-6 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 before:absolute before:-inset-2 before:content-[''] hover:text-brand";

export function DocumentTile({
  name,
  meta = [],
  pending = false,
  href,
  downloadName,
  onPreview,
  className = "",
}: DocumentTileProps) {
  const isPending = pending !== false;
  return (
    <div
      className={`flex min-w-0 items-center gap-[27px] overflow-clip rounded-[24px] bg-bg-subtle p-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-4 ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          aria-hidden
          className={`relative size-[52px] shrink-0 overflow-clip rounded-xl ${
            isPending ? "bg-button-disabled text-[#bbbbbc]" : "bg-neutral-800 text-white"
          }`}
        >
          <DocumentGlyph className="absolute left-[14px] top-[14px] size-6" />
        </span>
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <p
            className={`truncate text-[16px] font-bold leading-6 ${
              isPending ? "text-neutral-300" : "text-neutral-900"
            }`}
          >
            {name}
          </p>
          {isPending ? (
            <p className="truncate text-[14px] leading-6 text-neutral-500">
              {typeof pending === "string" ? pending : DOCUMENT_PENDING_NOTE}
            </p>
          ) : (
            meta.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-1 text-[14px] leading-6 text-neutral-500">
                {meta.map((part, i) => (
                  <span key={i} className="flex items-center gap-1 whitespace-nowrap">
                    {part}
                    {i < meta.length - 1 && <DotIcon className="size-[14px] shrink-0" />}
                  </span>
                ))}
              </p>
            )
          )}
        </div>
      </div>
      {!isPending && (onPreview || href) && (
        <div className="flex shrink-0 items-start gap-3 max-sm:pl-[68px]">
          {onPreview && (
            <button type="button" onClick={onPreview} aria-label={`Переглянути: ${name}`} className={ACTION}>
              <EyeIcon className="size-6" />
            </button>
          )}
          {href && (
            <a href={href} download={downloadName ?? true} aria-label={`Завантажити: ${name}`} className={ACTION}>
              <DownloadIcon className="size-6" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
