"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import { Button } from "@/components/ui/Button";
import { SHEET_FOOTER } from "@/components/ui/Sheet";
import { FileAction, FileMeta, lockCaption } from "./FileCard";
import { ClearIcon, FileTile } from "./icons";
import type { MaterialFile } from "./data";

const COPY = {
  bar: "Перегляд",
  dialog: (name?: string) => (name ? `Перегляд файлу ${name}` : "Перегляд файлу"),
  close: "Закрити перегляд",
  region: (name: string) => `Перегляд: ${name}`,
  download: "Завантажити",
  openLink: "Відкрити посилання",
  signIn: "Увійти, щоб завантажити",
} as const;

// The preview sheet — Figma «Component 3» (4825:61120): a 1103-px white
// panel hanging from the sticky header at the right edge (1-px #8e8e8f
// stroke, rounded-tl-48, pl-60 pr-80 py-60, 40-px rhythm) over the
// blurred scrim; the CSS border adds to the box, so the paddings are
// one px under the master's 60 / 80 to keep the 963-px content column.
// Head row: the badge tile, Title/Large Bold name over
// «Розмір: …», and at the right the 32-px download, a #d2d2d2 hairline
// and the 32-px close mark (24 / 23 px apart). The 851-px name group
// meets the 112-px actions with no gap (4825:60622), so the name's
// ellipsis box is 779 wide. Body: the 16/24 #343435
// description, then the document box (1-px #d2d2d2, r24) filling the
// rest of the height with its own 8-px scrollbar: track #f8f8f8 inset
// 16 / 15 / 16 from the stroked edge (Frame 1010107153 4825:60636 at
// 940 / 16 in the 963 x 654 box), i.e. 15 / 14 / 15 inside the CSS
// border; thumb #343435 (Rectangle 157), both r24.
//
// Phones (< 640, materials spec 2.8, system A5 / T5d): the same DOM as a
// full-screen sheet over the header (z 60, no scrim): a 66-px bar with
// «Перегляд» (file names never go into the bar) and the shared close, the
// cross pinned at x vw-48 / y 21 above the scrolling body; the body pads
// 24: tile + the FULL name in Title Large 22/28 (wraps) + the size, the
// description, the document at the full content width (natural height,
// no nested scroller, no drag thumb; a url file shows a 56-px link card);
// the footer (pinned, static below 500 px of height) holds the lock
// caption and ONE full-width action. Motion: opacity + 12-px drop.

// Placeholder document until real files are wired: the master's page
// render (a `png` file shows its own picture, `file.preview`). Figma lays the 963-px image box at +1 / +1 inside the stroke
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

  // Phones: the box takes its natural height and the sheet body is the
  // only scroller (no nested scrolling on touch); the image renders at the
  // content width and stays pinch-zoomable with the page.
  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-stroke-subtle max-lg:min-h-auto max-lg:flex-none">
      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label={COPY.region(file.name)}
        className="scrollbar-hidden absolute inset-0 overflow-y-auto overscroll-contain outline-none max-lg:static max-lg:overflow-visible max-lg:overscroll-auto"
      >
        {file.type === "url" ? (
          <div className="flex h-full items-center justify-center p-10 max-lg:h-auto max-lg:justify-start max-lg:px-6 max-lg:py-[5px]">
            <a
              href={file.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-button-md text-brand underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 max-lg:inline-block max-lg:break-all max-lg:py-[11px] max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand"
            >
              {file.href}
            </a>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="w-[calc(100%+2px)]">
              <div className="-ml-[8.08%] w-[108.08%]">
                <img
                  src={file.type === "png" ? (file.preview ?? file.href) : PREVIEW_IMAGE}
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
        className={`absolute bottom-[15px] right-[14px] top-[15px] w-2 rounded-3xl bg-bg-subtle transition-opacity duration-200 max-lg:hidden ${
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

// The phone footer's one action (full-width Button/Small 342 x 42, the
// menu master button 3117:14325): download, open the link, sign in, or
// the cabinet's solid disabled state for a file outside the agreement.
function ViewerAction({
  file,
  canDownload,
  onLocked,
}: {
  file: MaterialFile;
  canDownload: boolean;
  onLocked?: () => void;
}) {
  if (!canDownload) {
    return onLocked ? (
      <Button size="small" fullWidth onClick={onLocked}>
        {COPY.signIn}
      </Button>
    ) : (
      <Button size="small" fullWidth disabled disabledStyle="solid">
        {COPY.download}
      </Button>
    );
  }
  if (file.type === "url") {
    return (
      <Button href={file.href} target="_blank" rel="noopener noreferrer" prefetch={false} size="small" fullWidth>
        {COPY.openLink}
      </Button>
    );
  }
  return (
    <Button href={file.href} download={file.name} prefetch={false} size="small" fullWidth>
      {COPY.download}
    </Button>
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
  coverOpen = false,
}: {
  file: MaterialFile | null;
  onClose: () => void;
  canDownload: boolean;
  onLocked?: () => void;
  lockedHint?: string;
  // An overlay opened from inside the preview is open (the sign-in sheet).
  coverOpen?: boolean;
}) {
  const open = file !== null;
  const panelRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLParagraphElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // The last shown file stays rendered through the slide-out.
  const [shown, setShown] = useState<MaterialFile | null>(file);
  if (file && file !== shown) setShown(file);

  // Initial focus (A5): the bar title on a touch phone, the close mark
  // everywhere else (the desktop behaviour of today).
  const focusRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const touchPhone = window.matchMedia("(max-width: 639.98px) and (pointer: coarse)").matches;
    focusRef.current = touchPhone ? titleRef.current : closeRef.current;
  }, [open]);

  useModalBehavior({
    open,
    onClose,
    container: panelRef,
    initial: focusRef,
    inertSelector: "header",
  });

  // An overlay opened from inside the preview (the sign-in sheet) returns
  // the focus to its opener when it closes; a sign-in replaces that opener
  // («Увійти, щоб завантажити» becomes «Завантажити»), so the focus would
  // fall to <body> (MAT-19). When the cover closes and nothing holds the
  // focus, the preview takes it back (its initial target, no scroll).
  const coverWas = useRef(coverOpen);
  useEffect(() => {
    const was = coverWas.current;
    coverWas.current = coverOpen;
    if (!open || !was || coverOpen) return;
    const id = requestAnimationFrame(() => {
      // Lost = on <body>, detached, or left inside the closed (inert) sheet
      // that the browser is about to blur.
      const active = document.activeElement;
      if (active && active !== document.body && active.isConnected && !active.closest("[inert]")) return;
      focusRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [coverOpen, open]);

  // A route change closes the preview (DECISIONS round 4: overlays that
  // hold a followable link close on a pathname change; no history writes).
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (open) onClose();
  }, [pathname, open, onClose]);

  const caption = shown ? lockCaption(canDownload, onLocked, lockedHint) : null;

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-[60] max-lg:h-dvh lg:z-40 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 max-lg:hidden ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={COPY.dialog(shown?.name)}
        tabIndex={-1}
        className={`absolute bottom-0 right-0 top-0 flex w-[1103px] max-w-full flex-col gap-6 overflow-hidden rounded-tl-[32px] border border-stroke-default bg-white px-6 py-6 outline-none transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] max-lg:w-full max-lg:gap-0 max-lg:rounded-none max-lg:border-0 max-lg:p-0 max-lg:transition-[opacity,translate] max-lg:will-change-[opacity,translate] motion-reduce:transition-none max-lg:motion-reduce:transition-none lg:top-[var(--site-header-h,92px)] lg:gap-10 lg:rounded-tl-[48px] lg:py-[59px] lg:pl-[59px] lg:pr-[79px] ${
          open
            ? "translate-x-0 max-lg:translate-y-0 max-lg:opacity-100"
            : "translate-x-full max-lg:translate-x-0 max-lg:-translate-y-3 max-lg:opacity-0"
        }`}
      >
        {/* Phone bar: the context word only (the name can be long and is
            the body's first line); the close mark lands on its right end. */}
        <div className="flex h-[66px] shrink-0 items-center pl-6 pr-[60px] lg:hidden">
          <p ref={titleRef} tabIndex={-1} className="min-w-0 truncate text-title-lg text-neutral-900 outline-none">
            {COPY.bar}
          </p>
        </div>

        {shown && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:contents">
            <div className="flex flex-col gap-6 px-6 pb-6 pt-6 lg:contents">
              <div className="flex w-full items-start justify-between gap-4 lg:gap-0">
                <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6 max-lg:items-start">
                  <FileTile type={shown.type} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 max-lg:gap-1">
                    <h2 className="truncate text-[20px] font-bold leading-7 tracking-[-0.4px] text-neutral-900 lg:text-[24px] lg:tracking-[-0.48px] max-lg:whitespace-normal max-lg:text-[22px] max-lg:font-semibold max-lg:tracking-[-0.44px]">
                      {shown.name}
                    </h2>
                    <FileMeta file={shown} as="p" />
                  </div>
                </div>
                <div className="flex h-8 shrink-0 items-center max-lg:contents">
                  <FileAction
                    file={shown}
                    canDownload={canDownload}
                    onLocked={onLocked}
                    lockedHint={lockedHint}
                    size="lg"
                    className="size-8 max-lg:hidden"
                  />
                  <span aria-hidden className="ml-6 h-8 w-px shrink-0 bg-stroke-subtle max-lg:hidden" />
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    aria-label={COPY.close}
                    className="ml-[23px] flex size-8 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand max-lg:absolute max-lg:right-3 max-lg:top-[9px] max-lg:z-[1] max-lg:ml-0 max-lg:size-12 max-lg:rounded-full max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand"
                  >
                    <ClearIcon className="size-6 lg:size-8" />
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 w-full flex-1 flex-col gap-6 lg:gap-8 max-lg:flex-none">
                <p className="text-body-sm text-neutral-800">{shown.description}</p>
                <DocumentScroller key={shown.id} file={shown} />
              </div>
            </div>

            <div className={`${SHEET_FOOTER} lg:hidden`}>
              {caption && <p className="text-[12px] leading-4 text-neutral-500">{caption}</p>}
              <ViewerAction file={shown} canDownload={canDownload} onLocked={onLocked} />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
