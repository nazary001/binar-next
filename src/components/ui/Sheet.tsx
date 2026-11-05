"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
  type SVGProps,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { CheckboxOffIcon, CheckboxOnIcon, XMarkIcon } from "@/components/catalog/icons";
import { OVERLAY_INERT, useModalBehavior } from "@/components/cart/useModalBehavior";
import { useHydrated } from "@/components/platform/ui/useHydrated";
import { usePhone } from "./useMediaQuery";

// Full-screen phone sheet (system spec A5, DECISIONS D7): the phone menu
// master 3117:13578 idiom for every long overlay below 640. A 66-px bar
// (Title Large 22/28 SemiBold, ONE line, + the 24-px cross in a 48 box at
// x vw-48 / y 21 = the menu cross 3117:14330), a scroller with the body at
// px 24 / pt 24, and an optional footer that is the scroller's last child:
// pinned to the viewport bottom while the content is taller, pushed down by
// mt-auto when it is shorter, static below 500 px of height. No scrim, no
// radius: the sheet covers the sticky header (z 60 > 50).
//
// The class constants are exported verbatim: overlays that keep ONE DOM for
// desktop and phone (cart, auth, catalog / materials filters, materials
// preview, Modal718 phone="sheet") restyle their phone branch with them and
// keep their own lg: restorers instead of SHEET_LAYER's lg:hidden.
export const SHEET_LAYER =
  "fixed inset-0 z-[60] flex h-dvh flex-col bg-white transition-[opacity,translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden";
export const SHEET_OPEN = "translate-y-0 opacity-100";
export const SHEET_CLOSED = "pointer-events-none -translate-y-3 opacity-0";
export const SHEET_BAR = "flex h-[66px] shrink-0 items-center justify-between gap-2 bg-white pl-6 pr-3";
export const SHEET_TITLE = "min-w-0 flex-1 truncate text-title-lg text-neutral-900 outline-none";
// A bar title fits 228 px at 320 (vw - 92, about 17 Cyrillic characters);
// a longer one passes `shortTitle`, shown below 375 instead of the full one.
export const SHEET_TITLE_FULL = "max-[374.98px]:hidden";
export const SHEET_TITLE_SHORT = "hidden max-[374.98px]:inline";
export const SHEET_CLOSE =
  "flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-[color,scale] duration-200 hover:text-brand active:scale-90 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
export const SHEET_SCROLLER = "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain";
export const SHEET_BODY = "flex-1 px-6 pt-6 pb-12";
// DECISIONS O-16: no env(safe-area-inset-*) terms; plain 16-px bottom pad.
export const SHEET_FOOTER =
  "sticky bottom-0 z-[1] mt-auto flex shrink-0 flex-col gap-3 border-t border-stroke-subtle bg-white px-6 pt-[15px] pb-4 [@media(max-height:499px)]:static";
export const SHEET_DIVIDER = "my-12 h-px shrink-0 bg-stroke-subtle";

const COARSE = "(pointer: coarse)";

// ----------------------------------------------------------------------
// Bar

export type SheetBarProps = {
  title: string;
  shortTitle?: string;
  titleAs?: "h2" | "p";
  titleId?: string;
  titleRef?: Ref<HTMLElement>;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
  // Specific, never the bare "Закрити": "Закрити фільтри", "Закрити кошик".
  closeLabel: string;
  // `sticky top-0 z-[1]`: the bar lives inside a single scroller.
  sticky?: boolean;
  className?: string;
};

export function SheetBar({
  title,
  shortTitle,
  titleAs = "h2",
  titleId,
  titleRef,
  onClose,
  closeRef,
  closeLabel,
  sticky = false,
  className = "",
}: SheetBarProps) {
  const Title = titleAs;
  return (
    <div data-sheet-bar className={`${SHEET_BAR}${sticky ? " sticky top-0 z-[1]" : ""} ${className}`.trim()}>
      <Title
        ref={titleRef as Ref<HTMLHeadingElement & HTMLParagraphElement>}
        id={titleId}
        tabIndex={-1}
        data-sheet-title
        aria-label={shortTitle ? title : undefined}
        className={SHEET_TITLE}
      >
        {shortTitle ? (
          <>
            <span className={SHEET_TITLE_FULL}>{title}</span>
            <span aria-hidden className={SHEET_TITLE_SHORT}>
              {shortTitle}
            </span>
          </>
        ) : (
          title
        )}
      </Title>
      <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel} className={SHEET_CLOSE}>
        <XMarkIcon className="size-6" />
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// Footer, divider, groups, option rows

export function SheetFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${SHEET_FOOTER} ${className}`.trim()}>{children}</div>;
}

export function SheetDivider() {
  return <div aria-hidden className={SHEET_DIVIDER} />;
}

function ChevronDown24({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M5.47 8.47a.75.75 0 0 1 1.06 0L12 13.94l5.47-5.47a.75.75 0 1 1 1.06 1.06l-6 6a.75.75 0 0 1-1.06 0l-6-6a.75.75 0 0 1 0-1.06Z"
        fill="currentColor"
      />
    </svg>
  );
}

// A titled block of a sheet body (filter group, wizard part): Title Large
// 22/28, 24 to the content, optional 12/16 caption 8 under the title.
// `collapsible` turns the title into a 44-tall disclosure (TR-28): 24
// chevron (rotates 180 when open), body grid 0fr / 1fr, collapsed content
// inert.
export function SheetGroup({
  id,
  title,
  caption,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  id: string;
  title: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const captionNode = caption ? (
    <p className="mt-2 text-[12px] leading-4 text-neutral-500">{caption}</p>
  ) : null;

  if (!collapsible) {
    return (
      <section aria-labelledby={titleId} className="flex flex-col">
        <h3 id={titleId} className="text-title-lg text-neutral-900">
          {title}
        </h3>
        {captionNode}
        <div className="mt-6">{children}</div>
      </section>
    );
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col">
      <h3 id={titleId} className="text-title-lg text-neutral-900">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="min-w-0">{title}</span>
          <ChevronDown24
            className={`size-6 shrink-0 transition-[rotate] duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      {captionNode}
      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div inert={!open} className="min-h-0 overflow-hidden">
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

// The master radio (Quizz Card 3111:14541 "Ellipse 49", built as QuizForm
// RadioMarker) at glyph size in a 24 box: off = 18 circle, 1.5 brand ring on
// white; on = 18 brand disc with a white check (the 18.6 x 12.4 master check
// scaled to about 9 x 6, stroke 1.5, round caps). The only radio look on
// phones.
export function RadioOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="8.25" className="fill-white stroke-brand" strokeWidth="1.5" />
    </svg>
  );
}

export function RadioOnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" className="fill-brand" />
      <path
        d="M7.5 12L10.7 14.9L16.5 9.1"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// TR-10 filter row: 24 glyph + label 16/22 Medium, 44 tall at least, long
// labels wrap. Built on a native (visually hidden) input, so a radio group
// that shares `name` gets the browser's arrow-key roving for free and the
// checkbox / radio state is announced natively. Wrap groups in
// role="radiogroup" / role="group" (or a ul role="list" when listed).
// The input is a transparent 24 box laid exactly over the glyph (focus
// scrolling keeps the input's box in view, so the glyph and its ring come
// with it); the label is `relative` so that box belongs to the scroller,
// not the fixed sheet layer, or focusing a row below the fold would not
// scroll it into view.
export function OptionRow({
  type,
  checked,
  onSelect,
  children,
  name,
  value,
  disabled,
  className = "",
}: {
  type: "radio" | "checkbox";
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}) {
  const Glyph =
    type === "radio" ? (checked ? RadioOnIcon : RadioOffIcon) : checked ? CheckboxOnIcon : CheckboxOffIcon;
  return (
    <label
      className={`relative flex min-h-11 w-full cursor-pointer items-start gap-2 py-[10px] text-left has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${className}`.trim()}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="peer absolute top-2.5 left-0 m-0 size-6 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-[6px] peer-focus-visible:ring-2 peer-focus-visible:ring-brand ${
          type === "checkbox" ? (checked ? "text-brand" : "text-neutral-800") : ""
        }`}
      >
        <Glyph className="size-6" />
      </span>
      <span className="min-w-0 flex-1 pt-px text-button-md text-neutral-800">{children}</span>
    </label>
  );
}

// ----------------------------------------------------------------------
// Sheet

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  shortTitle?: string;
  titleId?: string;
  closeLabel: string;
  // Default: the bar title on coarse pointers (screen readers hear the
  // title, no keyboard pops), the cross on fine pointers.
  initialFocus?: RefObject<HTMLElement | null>;
  // Rendered in SHEET_FOOTER as the scroller's last child.
  footer?: ReactNode;
  children: ReactNode;
  bodyRef?: Ref<HTMLDivElement>;
  describedBy?: string;
  className?: string;
  // Close when the window crosses into the desktop canvas (default). Pass
  // false for overlays with a desktop twin that should stay open.
  closeOnDesktop?: boolean;
  // Fires once after every close, whatever closed it (cross, Escape, a
  // footer action that calls onClose, a route change, the 640 crossing):
  // filter sheets commit their draft here.
  onSettled?: () => void;
};

export function Sheet({
  open,
  onClose,
  title,
  shortTitle,
  titleId: titleIdProp,
  closeLabel,
  initialFocus,
  footer,
  children,
  bodyRef,
  describedBy,
  className = "",
  closeOnDesktop = true,
  onSettled,
}: SheetProps) {
  const hydrated = useHydrated();
  const autoId = useId();
  const titleId = titleIdProp ?? `${autoId}-title`;
  const layerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const phone = usePhone();

  // Latest callbacks behind stable wrappers (the bar cross, the route-change
  // and 640-crossing effects and onSettled call whatever the parent passed
  // last; useModalBehavior keeps its own latest onClose too).
  const onCloseRef = useRef(onClose);
  const onSettledRef = useRef(onSettled);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    onSettledRef.current = onSettled;
  }, [onClose, onSettled]);
  const close = useCallback(() => onCloseRef.current(), []);

  // Pick the initial focus target before useModalBehavior's effect reads it.
  // The portal (title, cross) exists only after hydration: a sheet mounted
  // open picks its target in the post-hydration pass, not before.
  useLayoutEffect(() => {
    if (!open || !hydrated) return;
    focusRef.current =
      initialFocus?.current ??
      (window.matchMedia(COARSE).matches ? titleRef.current : closeRef.current) ??
      null;
  }, [open, hydrated, initialFocus]);

  // Phones only: the layer is lg:hidden from 640, so a sheet left open
  // there (closeOnDesktop={false}) must not lock the page or trap Tab.
  useModalBehavior({
    open: open && hydrated && phone,
    onClose: close,
    container: layerRef,
    initial: focusRef,
    inertSelector: OVERLAY_INERT,
  });

  // A route change closes the sheet (no history entries in this pass).
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (open) onCloseRef.current();
  }, [pathname, open]);

  // Crossing into the desktop canvas closes it (its layer is lg:hidden and
  // would otherwise stay open unseen); only a real phone -> desktop
  // change counts, not the hydration pass (server snapshot = desktop).
  const wasPhone = useRef(phone);
  useEffect(() => {
    const before = wasPhone.current;
    wasPhone.current = phone;
    if (before && !phone && open && closeOnDesktop) onCloseRef.current();
  }, [phone, open, closeOnDesktop]);

  // onSettled once per close.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) onSettledRef.current?.();
    wasOpen.current = open;
  }, [open]);

  // Focus not obscured (WCAG 2.4.11): the pinned footer covers the bottom
  // of the scroller, so the scroller's scroll padding follows its height.
  const hasFooter = footer !== undefined && footer !== null;
  useEffect(() => {
    const scroller = scrollerRef.current;
    const foot = footerRef.current;
    if (!scroller || !foot || !hydrated) return;
    const ro = new ResizeObserver(() => {
      scroller.style.scrollPaddingBottom = `${foot.offsetHeight + 16}px`;
    });
    ro.observe(foot);
    return () => {
      ro.disconnect();
      scroller.style.scrollPaddingBottom = "";
    };
  }, [hydrated, hasFooter]);

  if (!hydrated) return null;

  return createPortal(
    <div
      ref={layerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      data-sheet
      className={`${SHEET_LAYER} ${open ? `${SHEET_OPEN} starting:-translate-y-3 starting:opacity-0` : SHEET_CLOSED} outline-none ${className}`.trim()}
    >
      <SheetBar
        title={title}
        shortTitle={shortTitle}
        titleId={titleId}
        titleRef={titleRef}
        onClose={close}
        closeRef={closeRef}
        closeLabel={closeLabel}
      />
      <div ref={scrollerRef} className={SHEET_SCROLLER}>
        <div ref={bodyRef} className={SHEET_BODY}>
          {children}
        </div>
        {hasFooter && (
          <div ref={footerRef} className={SHEET_FOOTER}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
