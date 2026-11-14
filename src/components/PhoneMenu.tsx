"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { acquireScrollLock, MENU_INERT } from "./cart/useModalBehavior";
import { DESKTOP_QUERY } from "./ui/useMediaQuery";

// Phone menu sheet primitives (Figma phone menu 3117:13578 / stack
// 3117:13841): the full-width white overlay under the 66-px header bar,
// a px-24 py-60 stack of label groups, Bold 16/20 rows 24 apart with a
// trailing arrow-up-right, 1-px #d2d2d2 dividers and the full-width
// Button/Large (the designer's master as updated on 2026-11-14, rows
// 5491:10593: «шрифти дуже малі», «Кнопка завузька»; the older master
// had 14/20 Medium rows and a Button/Small).
// One implementation for the public menu (Header.tsx, #mobile-nav) and
// the cabinet menu (platform/CabinetMenu.tsx, #cabinet-nav), so both
// share the overlay, motion, lock, rows and CTA dock.

// The routes whose pages sit on the shop canvas (their route layouts set
// data-canvas="shop"): the shop and the B2B cabinet. The public menu
// shows active rows and the in-page "Контакти" anchor only there; the
// landing routes keep "/#contacts" and no active row.
const SHOP_OR_CABINET =
  /^\/(?:catalog|checkout|materials|dashboard|orders|assortment|profile)(?:\/|$)/;

export function isShopOrCabinetRoute(pathname: string): boolean {
  return SHOP_OR_CABINET.test(pathname);
}

const IN = "translate-y-0 opacity-100";
const OUT_UP = "translate-y-3 opacity-0";

// Overlay: fixed under the sticky header (top = --site-header-h), scrolls
// on its own. Transitions name `translate` (Tailwind v4 compiles
// translate-y-* to the translate property; a `transform` list snapped it).
const SHEET =
  "fixed inset-x-0 bottom-0 z-[45] overflow-y-auto overscroll-contain bg-white transition-[translate,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden";
const SHEET_OPEN = "pointer-events-auto translate-y-0 opacity-100";
const SHEET_CLOSED = "pointer-events-none -translate-y-3 opacity-0";
// Focus not obscured: a focused row scrolled into view stops above the
// docked CTA (dock 16 + 52 + 16 = 84, plus 16).
const SHEET_SCROLL_PAD = "scroll-pb-[100px] [@media(max-height:499px)]:scroll-pb-0";

// The stack, on every route: rows span the content width at every phone
// width (24-px gutters, no cap), natural type, the overlay scrolls when
// the stack is taller than the window and the CTA docks at its bottom.
// The landing routes used to zoom the whole stack to fit the window
// height, which shrank the type to ~11.5 pt in iPhone Safari (designer
// 2026-11-14, «шрифти дуже малі»): no zoom any more.
const STACK = "flex min-h-full w-full flex-col gap-12 px-6 py-[60px]";

// Bold 16/20 #4a4a4c rows (3117:13578). `gap-2` between the label and the
// arrow keeps the longest row, «Засоби та інвентар для прибирання» (284.5
// px in Bold 16), on one line down to a 360-px phone.
const ROW =
  "group/link flex w-full cursor-pointer items-center justify-between gap-2 py-3 -my-3 text-left text-[16px] font-bold leading-[20px] transition-[color,opacity,translate] duration-300 active:opacity-70 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const ROW_ACTIVE = "text-brand";
const ROW_IDLE = "text-neutral-700 hover:text-brand";

// The CTA dock: sticky at the sheet bottom so the primary action is on
// screen on short phones; -mx-6 / -my-4 cancel px-6 / pt-4 / pb-4, so the
// Button sits on its natural pixel and the white band only shows while it
// is stuck. Below 500 px of height it stays in flow (the sheet scrolls
// to it).
const DOCK =
  "sticky bottom-0 z-[1] -mx-6 -my-4 bg-white px-6 pt-4 pb-4 [@media(max-height:499px)]:static";

const delayStyle = (open: boolean, delay: number) => ({
  transitionDelay: open ? `${delay}ms` : "0ms",
});

// heroicons-outline/arrow-up-right - the trailing glyph on every menu row
// (Figma 3117:14194 etc.). currentColor, so it follows the row colour.
export function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M4.5 19.5 19.5 4.5m0 0H8.25m11.25 0v11.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Burger -> X morph: three absolutely positioned bars that animate via
// transform + opacity (both GPU-composed) instead of swapping between two
// SVG path strings. Closed shows the three bars; open slides the top bar
// down + rotates 45 deg, fades the middle and slides the bottom bar up +
// rotates -45 deg, meeting at the centre to form an X. Bar geometry
// mirrors the Figma "menu" icon (3084:3674): three 17.85-px lines
// (x 3.07 -> 20.93) of 1.5-px stroke with round caps, centred on
// y = 7.79 / 12 / 16.21 inside the 24-px box.
export function Burger({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block size-6">
      <span
        className={`absolute inset-x-[2.3px] top-[7.04px] block h-[1.5px] rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? "translate-y-[4.21px] rotate-45" : ""
        }`}
      />
      <span
        className={`absolute inset-x-[2.3px] top-[11.25px] block h-[1.5px] rounded-full bg-current transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute inset-x-[2.3px] top-[15.46px] block h-[1.5px] rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? "-translate-y-[4.21px] -rotate-45" : ""
        }`}
      />
    </span>
  );
}

// The overlay + nav stack + the page lock. While open:
// - the page cannot scroll (acquireScrollLock: the shared, refcounted
//   <html> overflow lock; scrollY never changes, so dismissing keeps the
//   place, a row link lets Next scroll the new page to 0, and Back
//   restores the old page's scroll);
// - everything matched by `inertSelector` is inert (default MENU_INERT:
//   every body child but the header, the menus and the toast host), so
//   Tab goes logo -> cart -> burger -> rows -> CTA and never behind;
// - Escape closes; so do a route change and crossing into the desktop
//   canvas (the overlay is lg:hidden there);
// - on close, focus that was inside the sheet (or dropped to <body>)
//   returns to `returnFocus` (the burger) without scrolling.
export function PhoneMenuSheet({
  id,
  open,
  onClose,
  label,
  returnFocus,
  inertSelector = MENU_INERT,
  children,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  label: string;
  returnFocus: RefObject<HTMLElement | null>;
  inertSelector?: string;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Latest onClose behind a ref: the lock effect must not re-run (and
  // hand focus back to the burger) when a caller passes a new callback.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const focusBack = returnFocus.current;
    const release = acquireScrollLock();
    // Elements that are already inert (a closed sheet React keeps inert)
    // are skipped, so their owner stays the only one touching them.
    const inerted = [...document.querySelectorAll<HTMLElement>(inertSelector)].filter(
      (el) => !el.hasAttribute("inert") && !(sheet && el.contains(sheet)),
    );
    for (const el of inerted) el.setAttribute("inert", "");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onCloseRef.current();
    };
    // On window, not document: an overlay opened over the menu registers
    // its document listener later, so it runs first and preventDefaults
    // the Escape it consumed; the window listener then sees it.
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      release();
      for (const el of inerted) el.removeAttribute("inert");
      const active = document.activeElement;
      if (!active || active === document.body || (sheet && sheet.contains(active))) {
        focusBack?.focus({ preventScroll: true });
      }
    };
  }, [open, inertSelector, returnFocus]);

  // Crossing into the desktop canvas closes the menu (rotation, resize).
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) onCloseRef.current();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open]);

  // A route change (a row, the logo, Back) closes the menu. The public
  // header also closes it in its render phase; this is the net for
  // callers that do not.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (open) onCloseRef.current();
  }, [pathname, open]);

  return (
    <div
      id={id}
      ref={sheetRef}
      aria-hidden={!open}
      inert={!open}
      style={{ top: "var(--site-header-h, 92px)" }}
      className={`${SHEET} ${SHEET_SCROLL_PAD} ${open ? SHEET_OPEN : SHEET_CLOSED}`}
    >
      <nav aria-label={label} className={STACK}>
        {children}
      </nav>
    </div>
  );
}

// A label + rows column: rows 24 apart (5491:10593 / 3117:14259).
export function PhoneMenuGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

// Group label: 14/20 Medium #777779, 32 above the first row (3117:14242:
// the group's 24-px gap + mb-2).
export function PhoneMenuLabel({
  open,
  delay = 80,
  children,
}: {
  open: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <p
      style={delayStyle(open, delay)}
      className={`mb-2 text-body-sm font-medium text-neutral-500 transition-[opacity,translate] duration-300 motion-reduce:transition-none ${
        open ? IN : OUT_UP
      }`}
    >
      {children}
    </p>
  );
}

// A menu row: Bold 16/20 #4a4a4c (active: brand + aria-current="page")
// with a trailing glyph, 20 tall on a 44 pitch; `py-3 -my-3` makes the
// tap target the full 44 without moving a pixel. The keyboard ring sits
// 2 px outside that box (in the gutter), clear of the label at x 24. Renders a Next Link for
// "/..." hrefs, a plain <a> for "#..." (native in-page scroll) and a
// button without an href. `stayOnCurrent`: the row of the page you are on
// only runs onClick (closes the menu, keeps the scroll) instead of
// re-navigating to it.
export function PhoneMenuRow({
  open,
  delay,
  href,
  onClick,
  active = false,
  stayOnCurrent = true,
  trailing = <ArrowUpRight className="size-4 shrink-0" />,
  ariaLabel,
  ariaHaspopup,
  className = "",
  children,
}: {
  open: boolean;
  delay: number;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  stayOnCurrent?: boolean;
  trailing?: ReactNode;
  ariaLabel?: string;
  ariaHaspopup?: "dialog" | "menu";
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (stayOnCurrent && href === pathname) e.preventDefault();
    onClick?.();
  };
  const props = {
    style: delayStyle(open, delay),
    className: `${ROW} ${active ? ROW_ACTIVE : ROW_IDLE} ${open ? IN : OUT_UP} ${className}`.trim(),
    onClick: handleClick,
    "aria-current": active ? ("page" as const) : undefined,
    "aria-label": ariaLabel,
    "aria-haspopup": ariaHaspopup,
  };
  const body = (
    <>
      {typeof children === "string" ? <span>{children}</span> : children}
      {trailing}
    </>
  );
  if (href?.startsWith("/")) {
    return (
      <Link href={href} {...props}>
        {body}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} {...props}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" {...props}>
      {body}
    </button>
  );
}

// 1-px #d2d2d2 rule between the groups.
export function PhoneMenuDivider({ open, delay }: { open: boolean; delay: number }) {
  return (
    <div
      style={delayStyle(open, delay)}
      className={`h-px w-full -mb-px bg-stroke-subtle transition-opacity duration-300 motion-reduce:transition-none ${
        open ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

// The full-width CTA at the end of the stack, docked at the sheet bottom
// (DOCK above) on every route.
export function PhoneMenuCtaDock({
  open,
  delay = 560,
  children,
}: {
  open: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <div
      style={delayStyle(open, delay)}
      className={`${DOCK} transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        open ? IN : OUT_UP
      }`}
    >
      {children}
    </div>
  );
}
