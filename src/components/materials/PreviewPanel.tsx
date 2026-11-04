"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import { FileAction } from "./FileCard";
import { ClearIcon, FileTile } from "./icons";
import type { MaterialFile } from "./data";

// The preview sheet — Figma «Component 3» (4825:61120): a 1103-px white
// panel hanging from the sticky header at the right edge (1-px #8e8e8f
// stroke, rounded-tl-48, pl-60 pr-80 py-60, 40-px rhythm) over the
// blurred scrim; the CSS border adds to the box, so the paddings are
// one px under the master's 60 / 80 to keep the 963-px content column.
// Head row: the badge tile, Title/Large Bold name over
// «Розмір: …», and at the right the 32-px download, a #d2d2d2 hairline
// and the 32-px close mark (24 / 23 px apart). The 851-px name group
// meets the 112-px actions with no gap (4825:60622), so the name's
// ellipsis box is 779 wide; phones keep a 16-px gap. Body: the 16/24 #343435
// description, then the document box (1-px #d2d2d2, r24) filling the
// rest of the height with its own 8-px scrollbar: track #f8f8f8 inset
// 16 / 15 / 16 from the stroked edge (Frame 1010107153 4825:60636 at
// 940 / 16 in the 963 x 654 box), i.e. 15 / 14 / 15 inside the CSS
// border; thumb #343435 (Rectangle 157), both r24.

// Placeholder document until real files are wired: the master's page
// render. Figma lays the 963-px image box at +1 / +1 inside the stroke
// (so it overhangs the right edge by 2 px, clipped) and crops the bitmap
// to 108.08 % of that box, 8.08 % off the left: 1040.8 px wide.
const PREVIEW_IMAGE = "/figma-export/materials/preview-doc.png";

// Rectangle 157 (4825:60637 / 4825:61137): a fixed 120-px thumb that
// travels the track, not a proportional one.
const THUMB_H = 120;

function DocumentScroller({ file }: { file: MaterialFile }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false });

  // The thumb mirrors the hidden native scrollbar: the master's fixed
  // 120-px height (capped by a shorter track), position from scrollTop.
  const measure = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const trackH = track.clientHeight;
    const ratio = el.clientHeight / el.scrollHeight;
    if (ratio >= 1) {
      setThumb({ top: 0, height: 0, visible: false });
      return;
    }
    const height = Math.min(THUMB_H, trackH);
    const maxTop = trackH - height;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const top = maxScroll > 0 ? Math.round((el.scrollTop / maxScroll) * maxTop) : 0;
    setThumb({ top, height, visible: true });
  }, []);

  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure, file.id]);

  // Dragging the thumb scrolls the document.
  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    e.preventDefault();
    const startY = e.clientY;
    const startTop = thumb.top;
    const maxTop = track.clientHeight - thumb.height;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const move = (ev: PointerEvent) => {
      const next = Math.min(maxTop, Math.max(0, startTop + (ev.clientY - startY) / zoom));
      el.scrollTop = maxTop > 0 ? (next / maxTop) * maxScroll : 0;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-stroke-subtle">
      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label={`Перегляд: ${file.name}`}
        className="scrollbar-hidden absolute inset-0 overflow-y-auto overscroll-contain outline-none"
      >
        {file.type === "url" ? (
          <div className="flex h-full items-center justify-center p-10">
            <a
              href={file.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-button-md text-brand underline underline-offset-4 transition-opacity duration-200 hover:opacity-80"
            >
              {file.href}
            </a>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="w-[calc(100%+2px)]">
              <div className="-ml-[8.08%] w-[108.08%]">
                <img
                  src={file.type === "png" ? file.href : PREVIEW_IMAGE}
                  alt=""
                  decoding="async"
                  className="block w-full"
                  onLoad={measure}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div
        ref={trackRef}
        aria-hidden
        className={`absolute bottom-[15px] right-[14px] top-[15px] w-2 rounded-3xl bg-bg-subtle transition-opacity duration-200 ${
          thumb.visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          onPointerDown={onThumbPointerDown}
          className="absolute left-0 w-2 cursor-grab rounded-3xl bg-neutral-800 active:cursor-grabbing"
          style={{ top: thumb.top, height: thumb.height }}
        />
      </div>
    </div>
  );
}

// The partner pages reuse it unchanged (B2B «Component 3» 4825:60620 is
// the same 1103 x 948 sheet); a file outside the partner's agreement
// shows the static padlock (no `onLocked`) with `lockedHint`.
export function PreviewPanel({
  file,
  onClose,
  canDownload,
  onLocked,
  lockedHint,
}: {
  file: MaterialFile | null;
  onClose: () => void;
  canDownload: boolean;
  onLocked?: () => void;
  lockedHint?: string;
}) {
  const open = file !== null;
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // The last shown file stays rendered through the slide-out.
  const [shown, setShown] = useState<MaterialFile | null>(file);
  if (file && file !== shown) setShown(file);

  useModalBehavior({
    open,
    onClose,
    container: panelRef,
    initial: closeRef,
    inertSelector: "header",
  });

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={shown ? `Перегляд файлу ${shown.name}` : "Перегляд файлу"}
        tabIndex={-1}
        style={{ top: "var(--site-header-h, 92px)" }}
        className={`absolute bottom-0 right-0 flex w-[1103px] max-w-full flex-col gap-6 overflow-hidden rounded-tl-[32px] border border-stroke-default bg-white px-6 py-6 outline-none transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] lg:gap-10 lg:rounded-tl-[48px] lg:py-[59px] lg:pl-[59px] lg:pr-[79px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {shown && (
          <>
            <div className="flex w-full items-start justify-between gap-4 lg:gap-0">
              <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
                <FileTile type={shown.type} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h2 className="truncate text-[20px] font-bold leading-7 tracking-[-0.4px] text-neutral-900 lg:text-[24px] lg:tracking-[-0.48px]">
                    {shown.name}
                  </h2>
                  <p className="text-body-sm text-neutral-500">Розмір: {shown.size}</p>
                </div>
              </div>
              <div className="flex h-8 shrink-0 items-center">
                <FileAction
                  file={shown}
                  canDownload={canDownload}
                  onLocked={onLocked}
                  lockedHint={lockedHint}
                  size="lg"
                  className="size-8"
                />
                <span aria-hidden className="ml-6 h-8 w-px shrink-0 bg-stroke-subtle" />
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Закрити перегляд"
                  className="ml-[23px] flex size-8 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand"
                >
                  <ClearIcon className="size-8" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 w-full flex-1 flex-col gap-6 lg:gap-8">
              <p className="text-body-sm text-neutral-800">{shown.description}</p>
              <DocumentScroller key={shown.id} file={shown} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
