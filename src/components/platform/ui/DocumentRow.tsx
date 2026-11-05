import type { ReactNode } from "react";
import { DOCUMENT_PENDING_NOTE } from "./DocumentTile";
import { DocumentGlyph, DotIcon, DownloadIcon } from "./icons";

const COPY = {
  preview: (name: string) => `Переглянути: ${name}`,
  download: (name: string) => `Завантажити: ${name}`,
} as const;

// Phone document row (TR-25, system spec A16) - the twin of DocumentTile
// (which stays the desktop atom, `max-lg:hidden`): no grey tile, rows
// split by 1-px #d2d2d2 lines (py 16, the first / last flush). The 48-px
// r12 #343435 tile + 16 + the name (16/22 Bold, up to 3 lines) over the
// meta parts (14/20 #777779, nowrap parts between 14-px dots) form ONE
// preview button when `onPreview` is set; the 44-px download link sits
// at the right edge (glyph edge on the content edge). Pending: grey tile
// with a #bbbbbc glyph, #a5a5a5 name, the note in 14/20 #777779, no
// actions. Lists are `DocumentRowList` (`ul role="list"`).
export type DocumentRowProps = {
  name: string;
  meta?: ReactNode[];
  pending?: boolean | string;
  href?: string;
  downloadName?: string;
  onPreview?: () => void;
  as?: "li" | "div";
  className?: string;
};

export function DocumentRowList({ label, children, className = "" }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <ul role="list" aria-label={label} className={`flex flex-col ${className}`}>
      {children}
    </ul>
  );
}

export function DocumentRow({
  name,
  meta = [],
  pending = false,
  href,
  downloadName,
  onPreview,
  as = "li",
  className = "",
}: DocumentRowProps) {
  const isPending = pending !== false;
  const Root = as;
  const body = (
    <>
      <span
        aria-hidden
        className={`relative size-12 shrink-0 overflow-clip rounded-xl ${
          isPending ? "bg-button-disabled text-[#bbbbbc]" : "bg-neutral-800 text-white"
        }`}
      >
        <DocumentGlyph className="absolute left-3 top-3 size-6" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span
          className={`line-clamp-3 text-[16px] font-bold leading-[22px] tracking-[0.16px] ${
            isPending ? "text-neutral-300" : "text-neutral-900"
          }`}
        >
          {name}
        </span>
        {isPending ? (
          <span className="text-[14px] leading-5 text-neutral-500">
            {typeof pending === "string" ? pending : DOCUMENT_PENDING_NOTE}
          </span>
        ) : (
          meta.length > 0 && (
            <span className="flex flex-wrap items-center gap-x-1 text-[14px] leading-5 text-neutral-500">
              {meta.map((part, i) => (
                <span key={i} className="flex items-center gap-1 whitespace-nowrap">
                  {part}
                  {i < meta.length - 1 && <DotIcon className="size-[14px] shrink-0" />}
                </span>
              ))}
            </span>
          )
        )}
      </span>
    </>
  );
  const BODY = "flex min-h-12 min-w-0 flex-1 items-center gap-4";
  return (
    <Root
      className={`flex items-center gap-2 py-4 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-stroke-subtle ${className}`}
    >
      {!isPending && onPreview ? (
        <button
          type="button"
          onClick={onPreview}
          aria-label={COPY.preview(name)}
          className={`${BODY} cursor-pointer rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand`}
        >
          {body}
        </button>
      ) : (
        <div className={BODY}>{body}</div>
      )}
      {!isPending && href && (
        <a
          href={href}
          download={downloadName ?? true}
          aria-label={COPY.download(name)}
          className="-mr-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-neutral-900 outline-none transition-colors duration-200 motion-reduce:transition-none hover:text-brand active:text-brand focus-visible:ring-2 focus-visible:ring-brand"
        >
          <DownloadIcon className="size-6" />
        </a>
      )}
    </Root>
  );
}
