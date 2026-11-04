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
import { useModalBehavior } from "@/components/cart/useModalBehavior";
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
// instead of scrolling). Phones get a full-width card with 24-px gutters.

export type Modal718CardProps = {
  title: ReactNode;
  // Element next to the title (status badge of a contract).
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
  // Wiring used by Modal718 (ids for aria, refs for focus / measuring).
  titleId?: string;
  descriptionId?: string;
  cardRef?: Ref<HTMLDivElement>;
  innerRef?: Ref<HTMLDivElement>;
  closeRef?: Ref<HTMLButtonElement>;
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
  titleId,
  descriptionId,
  cardRef,
  innerRef,
  closeRef,
  style,
  dialog = false,
}: Modal718CardProps) {
  const row = "px-[23px] sm:px-[59px]";
  return (
    <div
      ref={cardRef}
      role={dialog ? "dialog" : undefined}
      aria-modal={dialog ? true : undefined}
      aria-labelledby={dialog ? titleId : undefined}
      aria-describedby={dialog && description ? descriptionId : undefined}
      tabIndex={dialog ? -1 : undefined}
      style={{ ...style, maxWidth: width }}
      className={`scrollbar-hidden relative w-full shrink-0 overflow-y-auto overscroll-contain rounded-[32px] border border-stroke-default bg-white py-[23px] text-neutral-900 outline-none sm:rounded-[48px] sm:py-[59px] ${className}`}
    >
      <div ref={innerRef} className="flex flex-col gap-6 sm:gap-10">
        <div className={`flex flex-col gap-4 ${row}`}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex min-w-0 items-center gap-4">
              <h2
                id={titleId}
                className="min-w-0 text-[24px] font-bold leading-7 tracking-[-0.48px] sm:text-[32px] sm:tracking-[-0.64px]"
              >
                {title}
              </h2>
              {titleAdornment}
            </div>
            {onClose && (
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-900 outline-none transition-colors duration-200 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
              >
                <ClearIcon className="size-8" />
              </button>
            )}
          </div>
          {description !== undefined && (
            <div id={descriptionId} className="text-[18px] leading-[26px] sm:text-[20px] sm:leading-7">
              {description}
            </div>
          )}
        </div>
        {children !== undefined && children !== null && (
          <div className={`flex flex-col gap-6 ${row}`}>{children}</div>
        )}
        {actions !== undefined && actions !== null && <div className={row}>{actions}</div>}
      </div>
    </div>
  );
}

// The bottom button row: Button/Large `fullWidth` children share it with
// a 32-px gap (283 + 32 + 283 = 598, or a single 598). Stacks on phones.
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">{children}</div>;
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
  "titleId" | "descriptionId" | "cardRef" | "innerRef" | "closeRef" | "style" | "dialog" | "onClose"
> & {
  open: boolean;
  onClose: () => void;
  // Element to focus on open (defaults to the close cross).
  initialFocus?: RefObject<HTMLElement | null>;
};

// Master card = inner column + py 59 x 2 + the 1-px border x 2.
const CARD_CHROME = 120;
// 40-px gutters above and below the card (the overlay's sm:p-10).
const FIT_RESERVE = 80;

export function Modal718({ open, onClose, initialFocus, ...card }: Modal718Props) {
  const hydrated = useHydrated();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [inner, setInner] = useState<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // The natural column height (offsetHeight ignores the card's own zoom)
  // drives the height fit; it is re-measured whenever the slot changes.
  useEffect(() => {
    if (!inner) return;
    const ro = new ResizeObserver(() => setContentHeight(inner.offsetHeight));
    ro.observe(inner);
    return () => ro.disconnect();
  }, [inner]);
  const fit = useFitZoom(contentHeight > 0 ? contentHeight + CARD_CHROME : 0, FIT_RESERVE);

  const attachInner = useCallback((el: HTMLDivElement | null) => setInner(el), []);

  // useModalBehavior re-runs (and hands focus back to the opener) whenever
  // onClose changes identity, so consumers may pass inline callbacks: the
  // dialog calls the latest one through a stable wrapper.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const close = useCallback(() => onCloseRef.current(), []);

  useModalBehavior({
    open: open && hydrated,
    onClose: close,
    container: dialogRef,
    initial: initialFocus ?? closeRef,
  });

  if (!open || !hydrated) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-10">
      <div
        aria-hidden
        onClick={close}
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
        style={fit < 1 ? { zoom: fit } : undefined}
        className={`max-h-full ${card.className ?? ""}`}
      />
    </div>,
    document.body,
  );
}
