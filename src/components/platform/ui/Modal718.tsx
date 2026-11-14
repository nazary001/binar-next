"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useFitZoom } from "@/components/cart/useFitZoom";
import { OVERLAY_INERT, useModalBehavior } from "@/components/cart/useModalBehavior";
import { ClearIcon, DotIcon } from "./icons";
import { useHydrated } from "./useHydrated";

// «Component 3» - the 718-wide cabinet modal card shared by the
// Confirmation modal 4929:66257, «Документи замовлення» 4990:76237,
// «Скасувати замовлення» 4994:79346 / 5192:81052 and the profile contract
// modals (4868:31164 / 31194 / 31275 / 31303 / 31336). Master geometry:
//   white, 1-px #8e8e8f stroke INSIDE the box, r48, py-60, rows px-60
//   (CSS pads 59 + the 1-px border), column gap 40;
//   header = title row (Caption/Large: Manrope Bold 32/28, -0.64 px;
//     optional adornment 16 px right of it, e.g. the 60x38 status badge of
//     4868:31173 - the row then grows to 38 with the title centred; the
//     32-px «clear» cross top-right) + an optional Body/Large 20/28 line
//     16 px below («№48291037 · 12.04.2025», «ТОВ “Міротель”», the
//     confirm question);
//   slot = a column with gap 24 (document tiles, info rows, fields);
//   actions = a row with gap 32 of full-width Button/Large (two -> 283
//     each, one -> 598).
// Modal718 adds the house overlay (StockModal pattern): fixed z-60 over a
// #343435/50 + 4-px blur scrim, centred, Escape / scrim click close, Tab
// trap, <html> scroll lock and focus return (useModalBehavior), and the
// height fit of the other overlays (useFitZoom: the card is zoomed so the
// whole master fits inside 40-px gutters on a short desktop window
// instead of scrolling). So from 640 the card never scrolls and does not
// clip: a select menu at the bottom of the slot (the one-select «Скасувати
// замовлення») draws over the card's edge and the scrim instead of being
// cut with no visible scroll (designer 2026-11-13, C33: «меню викидати
// поверх модалки»).
//
// Phones (< 640, system spec A6 / DECISIONS D7), ONE DOM for both widths:
// - phone="card" (default, the D7 short modal): card = viewport - 48 (342 at
//   390), r32, the 1-px #8e8e8f ring, p 24 incl. the ring, title 24/28 Bold,
//   the 24 cross in a 44 box (glyph edge on the content edge), description
//   16/24 #343435 16 under the title, actions stacked 8 apart; the card is
//   at most 100dvh - 48 tall and scrolls inside, the title row and the
//   actions row stay pinned (sticky) while it overflows, the actions then
//   get a 1-px #d2d2d2 top line; a card that scrolls shows a scroll
//   indicator on the right (C33: thin, #d2d2d2 on a transparent track). align="top" starts the card 24 from the
//   top (cards whose slot holds inputs: the keyboard never covers them).
// - phone="sheet" (tables, > 3 fields, unbounded lists, the cancel order
//   radios): the same nodes become the full-screen sheet of ui/Sheet.tsx -
//   66-px bar with a one-line Title Large title (+ `shortTitle` below 375)
//   and the 48 cross box, body px 24 pt 24, actions = the sheet footer.
// The desktop strings (`sm:` = 640) are today's values, untouched, but
// for the card's overflow (C33, above).

export type Modal718CardProps = {
  title: ReactNode;
  // Element next to the title (status badge of a contract). Drops under
  // the title on phones when both do not fit one line.
  titleAdornment?: ReactNode;
  // Body/Large line(s) under the title.
  description?: ReactNode;
  // The slot column (gap 24).
  children?: ReactNode;
  // The bottom row of buttons (gap 32); see ModalActions.
  actions?: ReactNode;
  // Renders the 32-px close cross when given.
  onClose?: () => void;
  closeLabel?: string;
  // Card width in master px: 718 for every cabinet modal; the return
  // wizard 5192:81118 is the same shell at 1286.
  width?: number;
  className?: string;
  // Phone presentation (< 640): the centred card or the full-screen sheet.
  phone?: "card" | "sheet";
  // phone="sheet": the bar title below 375 when the full title does not fit
  // 228 px at 320 (the dialog name stays the full title).
  shortTitle?: string;
  // Wiring used by Modal718 (ids for aria, refs for focus / measuring).
  titleId?: string;
  descriptionId?: string;
  cardRef?: Ref<HTMLDivElement>;
  innerRef?: Ref<HTMLDivElement>;
  closeRef?: Ref<HTMLButtonElement>;
  titleRef?: Ref<HTMLHeadingElement>;
  style?: CSSProperties;
  dialog?: boolean;
};

export function Modal718Card({
  title,
  titleAdornment,
  description,
  children,
  actions,
  onClose,
  closeLabel = "Закрити",
  width = 718,
  className = "",
  phone = "card",
  shortTitle,
  titleId,
  descriptionId,
  cardRef,
  innerRef,
  closeRef,
  titleRef,
  style,
  dialog = false,
}: Modal718CardProps) {
  const sheet = phone === "sheet";
  const hasSlot = children !== undefined && children !== null;
  const hasActions = actions !== undefined && actions !== null;
  // The 44 cross box overhangs the title line by 10 px on three sides
  // (-my / -mr 2.5): the 24 glyph's edges sit on the content edges and a
  // one-line title still has its description 16 below.
  // The phone card's 24 (23 + ring) padding lives on the rows, not on the
  // card, so the sticky title row pins WITH its top padding and the sticky
  // actions row WITH its bottom padding. sticky / z / bg are phone-only:
  // the rows are flex items, so a z-index would make them stacking contexts
  // on desktop too and change how Chrome rasterises the button labels.
  // Scrolling (designer 2026-11-13, C33): from 640 the card is never a
  // scroller (the height fit keeps the whole master in the window), so a
  // select menu near the bottom of the slot opens over the card's edge
  // instead of being cut by it; below 640 the card scrolls and shows the
  // thin #d2d2d2 indicator on the right (the native overlay one on phones).
  const cardClass = [
    "group/m718 relative w-full shrink-0 overflow-y-auto overscroll-contain rounded-[32px] border border-stroke-default bg-white text-neutral-900 outline-none [scrollbar-color:var(--color-stroke-subtle)_transparent] [scrollbar-width:thin] sm:overflow-visible sm:rounded-[48px] sm:py-[59px]",
    sheet
      ? "max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none max-sm:border-0 max-sm:transition-[opacity,translate] max-sm:duration-[400ms] max-sm:ease-[cubic-bezier(0.22,1,0.36,1)] max-sm:starting:-translate-y-3 max-sm:starting:opacity-0 motion-reduce:transition-none max-sm:motion-reduce:transition-none"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const columnClass = [
    "flex flex-col gap-6 sm:gap-10",
    sheet ? "max-sm:min-h-full" : "",
    hasActions ? "" : sheet ? "max-sm:pb-6" : "pb-[23px] sm:pb-0",
  ]
    .filter(Boolean)
    .join(" ");
  const titleRowClass = [
    "flex items-start justify-between gap-4 px-[23px] pt-[23px] max-sm:sticky max-sm:top-0 max-sm:z-[1] max-sm:bg-white sm:gap-6 sm:px-[59px] sm:pt-0",
    sheet
      ? "max-sm:h-[66px] max-sm:shrink-0 max-sm:items-center max-sm:gap-2 max-sm:pl-6 max-sm:pr-3 max-sm:pt-0"
      : "max-sm:[@media(max-height:499px)]:static",
  ]
    .filter(Boolean)
    .join(" ");
  // Class lists are arrays of plain literals: Tailwind's extractor does
  // not see a class written right before a `${` in a template literal.
  const titleGroupClass = [
    "flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:flex-initial sm:flex-nowrap",
    sheet ? "max-sm:flex-nowrap" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const titleClass = [
    "min-w-0 text-[24px] font-bold leading-7 tracking-[-0.48px] max-sm:[overflow-wrap:break-word]! sm:text-[32px] sm:tracking-[-0.64px]",
    sheet ? "outline-none max-sm:truncate max-sm:text-[22px] max-sm:font-semibold max-sm:tracking-[-0.44px]" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const closeClass = [
    "-my-2.5 -mr-2.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-900 outline-none transition-colors duration-200 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand sm:m-0 sm:size-8",
    sheet ? "max-sm:m-0 max-sm:size-12 max-sm:rounded-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const descriptionClass = [
    "-mt-2 px-[23px] text-[16px] leading-6 text-neutral-800 sm:-mt-6 sm:px-[59px] sm:text-[20px] sm:leading-7 sm:text-neutral-900",
    sheet ? "max-sm:mt-0 max-sm:px-6" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const slotClass = [
    "flex flex-col gap-6 px-[23px] sm:px-[59px]",
    sheet ? "max-sm:px-6 max-sm:pb-6" : "",
  ]
    .filter(Boolean)
    .join(" ");
  // Card mode: the overflow line marks the PINNED actions row only; below
  // 500 px of height the row is static (in flow) and keeps no line.
  const actionsClass = [
    "px-[23px] pb-[23px] max-sm:sticky max-sm:bottom-0 max-sm:z-[1] max-sm:bg-white sm:px-[59px] sm:pb-0",
    sheet
      ? "max-sm:mt-auto max-sm:shrink-0 max-sm:border-t max-sm:border-stroke-subtle max-sm:px-6 max-sm:pt-[15px] max-sm:pb-4 max-sm:[@media(max-height:499px)]:static"
      : "max-sm:[@media(min-height:500px)]:group-data-[overflowing]/m718:border-t max-sm:[@media(min-height:500px)]:group-data-[overflowing]/m718:border-stroke-subtle max-sm:[@media(min-height:500px)]:group-data-[overflowing]/m718:pt-4 max-sm:[@media(max-height:499px)]:static",
  ].join(" ");

  return (
    <div
      ref={cardRef}
      role={dialog ? "dialog" : undefined}
      aria-modal={dialog ? true : undefined}
      aria-labelledby={dialog ? titleId : undefined}
      aria-describedby={dialog && description ? descriptionId : undefined}
      tabIndex={dialog ? -1 : undefined}
      data-modal718-phone={phone}
      style={{ ...style, maxWidth: width }}
      className={cardClass}
    >
      <div ref={innerRef} className={columnClass}>
        <div className={titleRowClass}>
          <div className={titleGroupClass}>
            <h2
              ref={titleRef}
              id={titleId}
              tabIndex={sheet && dialog ? -1 : undefined}
              aria-label={sheet && shortTitle && typeof title === "string" ? title : undefined}
              className={titleClass}
            >
              {sheet && shortTitle ? (
                <>
                  <span className="max-[374.98px]:hidden">{title}</span>
                  <span aria-hidden className="hidden max-[374.98px]:inline">
                    {shortTitle}
                  </span>
                </>
              ) : (
                title
              )}
            </h2>
            {titleAdornment}
          </div>
          {onClose && (
            <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel} className={closeClass}>
              <ClearIcon className="size-6 sm:size-8" />
            </button>
          )}
        </div>
        {description !== undefined && (
          <div id={descriptionId} className={descriptionClass}>
            {description}
          </div>
        )}
        {hasSlot && <div className={slotClass}>{children}</div>}
        {hasActions && <div className={actionsClass}>{actions}</div>}
      </div>
    </div>
  );
}

// The bottom button row: Button/Large `fullWidth` children share it with
// a 32-px gap (283 + 32 + 283 = 598, or a single 598). Phones stack them
// 8 apart (secondary first, as the callers already order them).
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">{children}</div>;
}

// «Frame 1010107163» (4990:76244) - Body/Large parts separated by the
// 14-px #bbbbbc dot, gap 4: «№48291037 · 12.04.2025».
export function ModalMeta({ parts }: { parts: ReactNode[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {parts.map((part, i) => (
        <span key={i} className="contents">
          {i > 0 && <DotIcon className="size-[14px] shrink-0" />}
          <span className="whitespace-nowrap">{part}</span>
        </span>
      ))}
    </span>
  );
}

export type Modal718Props = Omit<
  Modal718CardProps,
  "titleId" | "descriptionId" | "cardRef" | "innerRef" | "closeRef" | "titleRef" | "style" | "dialog" | "onClose"
> & {
  open: boolean;
  onClose: () => void;
  // Element to focus on open (defaults to the close cross; a phone="sheet"
  // dialog on a phone with a coarse pointer focuses its bar title instead,
  // like ui/Sheet: screen readers hear the title, no keyboard pops).
  initialFocus?: RefObject<HTMLElement | null>;
  // Phone card position: "top" starts the card 24 below the top edge
  // (slots with inputs), "center" (default) centres it.
  align?: "center" | "top";
};

// Master card = inner column + py 59 x 2 + the 1-px border x 2.
const CARD_CHROME = 120;
// 40-px gutters above and below the card (the overlay's sm:p-10).
const FIT_RESERVE = 80;

export function Modal718({ open, onClose, initialFocus, align = "center", ...card }: Modal718Props) {
  const hydrated = useHydrated();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const scrimDown = useRef(false);
  const [inner, setInner] = useState<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // The natural column height (offsetHeight ignores the card's own zoom)
  // drives the height fit; it is re-measured whenever the slot changes.
  // The same observer flags `data-overflowing` on the card while it scrolls
  // inside (phones: the pinned actions row then shows its top line) and,
  // focus not obscured (WCAG 2.4.11), gives the card scroller a scroll
  // padding the size of its pinned rows: the title row / sheet bar on top,
  // the actions row / sheet footer at the bottom. Only rows that are sticky
  // right now count (phones from 500 px of height); otherwise (desktop,
  // short phone windows) the inline values are cleared.
  useEffect(() => {
    if (!inner) return;
    const pinned = (row: Element | null | undefined) =>
      row instanceof HTMLElement && getComputedStyle(row).position === "sticky" ? row.offsetHeight : 0;
    const ro = new ResizeObserver(() => {
      setContentHeight(inner.offsetHeight);
      const el = dialogRef.current;
      if (!el) return;
      el.toggleAttribute("data-overflowing", el.scrollHeight > el.clientHeight + 1);
      const top = pinned(inner.firstElementChild);
      const bottom = inner.childElementCount > 1 ? pinned(inner.lastElementChild) : 0;
      el.style.scrollPaddingTop = top ? `${top + 8}px` : "";
      el.style.scrollPaddingBottom = bottom ? `${bottom + 16}px` : "";
    });
    ro.observe(inner);
    if (dialogRef.current) ro.observe(dialogRef.current);
    return () => ro.disconnect();
  }, [inner]);
  const fit = useFitZoom(contentHeight > 0 ? contentHeight + CARD_CHROME : 0, FIT_RESERVE);

  const attachInner = useCallback((el: HTMLDivElement | null) => setInner(el), []);

  // Consumers may pass inline callbacks: the cross, the scrim and
  // useModalBehavior call the latest one through a stable wrapper.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const close = useCallback(() => onCloseRef.current(), []);

  // Pick the initial focus target before useModalBehavior's effect reads it.
  const phoneSheet = card.phone === "sheet";
  useLayoutEffect(() => {
    if (!open || !hydrated) return;
    if (initialFocus) {
      focusRef.current = initialFocus.current;
      return;
    }
    const coarsePhone = window.matchMedia("(max-width: 639.98px) and (pointer: coarse)").matches;
    focusRef.current = phoneSheet && coarsePhone ? titleRef.current : closeRef.current;
  }, [open, hydrated, initialFocus, phoneSheet]);

  useModalBehavior({
    open: open && hydrated,
    onClose: close,
    container: dialogRef,
    initial: focusRef,
    // The sticky header (and a phone menu) leave the accessibility tree and
    // the tab order while the dialog is open; pixels are unchanged.
    inertSelector: OVERLAY_INERT,
  });

  if (!open || !hydrated) return null;

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-10",
        align === "top" ? "max-sm:items-start" : "",
        phoneSheet ? "max-sm:p-0" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* The scrim closes the dialog only for a press that started on it
          while no menu inside the dialog was open (the first tap outside
          an open kebab menu just closes that menu). */}
      <div
        aria-hidden
        onPointerDown={() => {
          scrimDown.current = !dialogRef.current?.querySelector('[role="menu"]');
        }}
        onClick={() => {
          if (scrimDown.current) close();
          scrimDown.current = false;
        }}
        className="absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px]"
      />
      <Modal718Card
        {...card}
        dialog
        onClose={close}
        titleId={titleId}
        descriptionId={descriptionId}
        cardRef={dialogRef}
        innerRef={attachInner}
        closeRef={closeRef}
        titleRef={titleRef}
        style={fit < 1 ? { zoom: fit } : undefined}
        className={`max-h-[calc(100dvh-48px)] sm:max-h-full ${card.className ?? ""}`}
      />
    </div>,
    document.body,
  );
}
