"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { Button } from "./ui/Button";

type NavLink = {
  href: string;
  label: string;
};

const SEGMENTS: NavLink[] = [
  { href: "/hotels", label: "Готелі" },
  { href: "/protect", label: "PROTECT" },
  { href: "/cleaning", label: "CLEANING" },
];

const TOP_LINKS: NavLink[] = [
  { href: "/#cases", label: "Кейси" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contacts", label: "Контакти" },
  { href: "/spivpratsya", label: "Співпраця" },
  { href: "/blog", label: "Блог" },
];

// Mobile menu (Figma 3117:13578) lists the directions by their full
// product names under the "Напрями" label, then a second group of links.
const MOBILE_DIRECTIONS: NavLink[] = [
  { href: "/hotels", label: "Усе для готелів" },
  { href: "/protect", label: "Засоби індивідуального захисту" },
  { href: "/cleaning", label: "Засоби та інвентар для прибирання" },
];

const MOBILE_LINKS: NavLink[] = [
  { href: "/#segments", label: "Каталог" },
  { href: "/spivpratsya", label: "Співпраця" },
  { href: "/blog", label: "Блог" },
  { href: "/#contacts", label: "Контакти" },
];

// A top-level route link is "active" when the current path is inside it.
// Anchor links (/#...) never highlight — only real routes like /blog or
// /spivpratsya pick up the brand-orange active colour seen in Figma.
function isActiveRoute(href: string, pathname: string) {
  if (!href.startsWith("/") || href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// heroicons-outline/arrow-up-right — the trailing glyph on every mobile
// menu row (Figma 3117:14194 etc.). Inherits the row's text colour via
// currentColor so it tracks the hover -> brand transition.
function ArrowUpRight({ className }: { className?: string }) {
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

// Burger → X morph: three absolutely positioned bars that animate via
// `transform` + `opacity` (both GPU-composed) instead of swapping
// between two SVG path strings. Closed state shows the three bars;
// open state slides the top bar down + rotates 45°, fades the middle,
// and slides the bottom bar up + rotates −45°, meeting at the centre
// to form an X. The eased curve keeps the morph fluid on either
// direction (open ↔ close) so it never feels like an abrupt swap.
function Burger({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block size-6">
      <span
        className={`absolute inset-x-0 top-[6px] block h-[1.75px] rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-y-[5px] rotate-45" : ""
        }`}
      />
      <span
        className={`absolute inset-x-0 top-[11px] block h-[1.75px] rounded-full bg-current transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute inset-x-0 top-[16px] block h-[1.75px] rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "-translate-y-[5px] -rotate-45" : ""
        }`}
      />
    </span>
  );
}

export function Header() {
  const [segmentsOpen, setSegmentsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const segmentsRef = useRef<HTMLLIElement | null>(null);
  // True when the mobile menu is being closed BECAUSE the user clicked
  // a navigation link (vs. dismissing the menu with Escape / outside-
  // click / close button). When true, the body-lock cleanup below skips
  // its `window.scrollTo(0, scrollY)` step — restoring the previous
  // scroll on the OLD page would leak that position onto the NEW page
  // before Next.js's own scroll-to-top kicks in, leaving mobile users
  // dropped halfway down the new page. Reset to false after each cycle.
  const navigatingRef = useRef(false);

  // Close the «Напрями» dropdown on outside pointerdown OR Escape.
  // Replaces a fragile `onBlur` + `setTimeout(120)` pattern that could
  // race with a re-click — when the user clicked the trigger to close
  // the menu, blur fired first (queuing a close), the click then fired
  // (toggling open), and 120 ms later the close finally ran, snapping
  // the menu shut. `pointerdown` outside also closes the menu before a
  // page link is followed, so navigation feels instant.
  useEffect(() => {
    if (!segmentsOpen) return;
    const onPointer = (e: PointerEvent) => {
      const el = segmentsRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setSegmentsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSegmentsOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [segmentsOpen]);

  // Publish the header's fixed height as a CSS variable on <html> so any
  // sticky element below (e.g. the Cases card stack) can pin EXACTLY at
  // the bottom edge of the header rather than slipping underneath it.
  // The header is locked at a single height of 84 px (logo 40 + py-22 × 2)
  // to match Figma exactly — the previous scroll-driven shrink/shadow
  // wasn't in the design and caused layout jitter near the top of the
  // page (sticky elements re-pinning every time the header height
  // toggled). Set once on mount.
  useEffect(() => {
    document.documentElement.style.setProperty("--site-header-h", "84px");
  }, []);

  // Close mobile nav on Escape; lock body scroll while open. We also
  // pin the body to its current scroll offset (position:fixed + top:
  // -scrollY) so iOS Safari doesn't rubber-band when the user drags
  // inside the overlay — that bug was the reason previous attempts at
  // "overflow:hidden" felt unresponsive on touch. Scroll position is
  // restored when the menu closes.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const scrollY = window.scrollY;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      // Only restore the pre-lock scroll position if the menu was
      // dismissed without navigation. When the user followed a nav
      // link, restoring the old scroll leaks it onto the new page
      // (`y=620` from `/spivpratsya` would land mid-page on `/hotels`)
      // — let Next.js's own scroll-to-top handle the new page instead.
      if (navigatingRef.current) {
        navigatingRef.current = false;
      } else {
        window.scrollTo(0, scrollY);
      }
    };
  }, [mobileOpen]);

  // Auto-close the mobile menu when the viewport crosses the lg
  // breakpoint — otherwise rotating a phone to landscape or resizing
  // a desktop window past 1024 px leaves the menu "open" in state but
  // hidden by `lg:hidden`, and a return to mobile width would reveal
  // it unexpectedly.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    // <> fragment so the mobile menu can sit OUTSIDE the <header>
    // element. Inside the header, `backdrop-blur-md` establishes a
    // containing block for `position: fixed` descendants (per the
    // backdrop-filter spec), which would shrink the fullscreen overlay
    // to the header's own 84-px bounding box. Rendering the overlay
    // as a sibling of <header> at the top level of the body keeps its
    // `fixed inset-x-0 bottom-0` anchored to the actual viewport.
    <>
    <header className="sticky top-0 z-50 bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-[22px] sm:px-10 lg:px-[130px]">
        <Logo />

        <nav
          aria-label="Головна навігація"
          className="hidden items-center gap-[49px] lg:flex"
        >
          {/* === Top nav ===
              Figma «Text button» has two variants — Default (#4a4a4c) and
              Variant2 (#f85a0b). The hover state on every nav link is
              a colour swap to brand orange. NO pill background, NO
              padding shift on hover. The «Напрями» trigger uses the
              same swap and additionally rotates its chevron when the
              dropdown is open. */}
          <ul className="flex items-center gap-[35px]">
            <li
              ref={segmentsRef}
              className="relative"
              // Open on hover (desktop nav is lg+ / hover-capable). The
              // mouseenter/leave live on the <li>, which contains both the
              // trigger AND the absolutely-positioned dropdown, so the menu
              // stays open while the cursor is anywhere inside either.
              onMouseEnter={() => setSegmentsOpen(true)}
              onMouseLeave={() => setSegmentsOpen(false)}
            >
              <button
                type="button"
                // Click toggle kept as a fallback for touch screens and
                // keyboard (Enter) - there is no hover there.
                onClick={() => setSegmentsOpen((v) => !v)}
                aria-expanded={segmentsOpen}
                aria-haspopup="true"
                className={`flex cursor-pointer items-center gap-[2px] text-button-md transition-colors duration-200 hover:text-brand ${
                  segmentsOpen ? "text-brand" : "text-neutral-700"
                }`}
              >
                Напрями
                <ChevronDown
                  className={`transition-[rotate] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${segmentsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {/* Dropdown wrapper sits flush under the trigger (top-full,
                  no margin) and uses a transparent `pt-3` as a HOVER BRIDGE:
                  it fills the 12-px visual gap so the cursor can travel from
                  the trigger down to the menu without crossing a dead zone
                  that would fire mouseleave and snap the menu shut. The white
                  box keeps its 12-px offset via this padding. */}
              <div
                className={`absolute left-0 top-full pt-3 ${
                  segmentsOpen ? "pointer-events-auto" : "pointer-events-none"
                }`}
              >
                <ul
                  role="menu"
                  aria-hidden={!segmentsOpen}
                  inert={!segmentsOpen}
                  // Single cohesive reveal: fade + a gentle 8px slide-down
                  // on one premium ease-out curve, GPU-composited. No scale
                  // (scaling the border/text reads slightly fuzzy mid-motion)
                  // and no per-item stagger (a second competing animation is
                  // what made it feel jittery) - the panel moves as one unit.
                  className={`min-w-[180px] rounded-2xl border border-stroke-subtle bg-white p-2 shadow-lg transition-[opacity,translate] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] ${
                    segmentsOpen
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-2 opacity-0"
                  }`}
                >
                  {SEGMENTS.map((s) => (
                    <li key={s.href} role="none">
                      <Link
                        role="menuitem"
                        href={s.href}
                        onClick={() => setSegmentsOpen(false)}
                        className="block cursor-pointer rounded-xl px-4 py-2 text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
                      >
                        {s.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            {TOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={
                    isActiveRoute(link.href, pathname) ? "page" : undefined
                  }
                  className={`block cursor-pointer text-button-md transition-colors duration-200 hover:text-brand ${
                    isActiveRoute(link.href, pathname)
                      ? "text-brand"
                      : "text-neutral-700"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <Button href="/#contact-form" size="small">
            Отримати пропозицію
          </Button>
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Закрити меню" : "Відкрити меню"}
          className="-mr-2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-transform active:scale-90 lg:hidden"
        >
          <Burger open={mobileOpen} />
        </button>
      </div>
    </header>

      {/* === Mobile overlay menu ===
          Sits BELOW the sticky header (top anchored to `--site-header-h`
          — published by the scroll-state effect above) and stretches to
          the viewport bottom. Lives OUTSIDE the <header> element on
          purpose: the header uses `backdrop-blur-md`, and any element
          with backdrop-filter becomes a containing block for
          `position: fixed` descendants, which would clamp this overlay
          to the header's 84-px box.

          Animates via `transform` + `opacity` only (both GPU-composed),
          so the open/close transition stays at 60 fps on phones — the
          previous `max-height` animation was CPU-bound layout work and
          stuttered on iOS Safari. The `backdrop-blur-2xl` gives the
          overlay a frosted-glass feel against the page behind. */}
      <div
        id="mobile-nav"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
        style={{
          top: "var(--site-header-h, 84px)",
        }}
        className={`fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain bg-white transition-[transform,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          mobileOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        {/* Figma 3117:13841 — px-24 py-60, gap-48 between the label
            group / divider / link group / divider / full-width button,
            vertically centred in the panel. Each row is a Manrope Medium
            14/20 link (#4a4a4c) with a trailing arrow-up-right glyph. */}
        <nav
          aria-label="Мобільна навігація"
          className="mx-auto flex min-h-full w-full max-w-[480px] flex-col justify-center gap-12 px-6 py-[60px] sm:px-10"
        >
          <div className="flex flex-col gap-8">
            <p
              style={{ transitionDelay: mobileOpen ? "80ms" : "0ms" }}
              className={`text-body-sm font-medium text-neutral-500 transition-[opacity,transform] duration-300 ${
                mobileOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              Напрями
            </p>
            {MOBILE_DIRECTIONS.map((s, i) => (
              <Link
                key={s.href}
                href={s.href}
                onClick={() => {
                  navigatingRef.current = true;
                  setMobileOpen(false);
                }}
                style={{
                  transitionDelay: mobileOpen ? `${120 + i * 50}ms` : "0ms",
                }}
                className={`group/link flex cursor-pointer items-center justify-between gap-4 text-body-sm font-medium text-neutral-700 transition-[color,opacity,transform] duration-300 hover:text-brand active:opacity-70 ${
                  mobileOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0"
                }`}
              >
                <span>{s.label}</span>
                <ArrowUpRight className="size-4 shrink-0" />
              </Link>
            ))}
          </div>

          <div
            style={{ transitionDelay: mobileOpen ? "280ms" : "0ms" }}
            className={`h-px w-full bg-stroke-subtle transition-opacity duration-300 ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          <div className="flex flex-col gap-8">
            {MOBILE_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  navigatingRef.current = true;
                  setMobileOpen(false);
                }}
                style={{
                  transitionDelay: mobileOpen ? `${320 + i * 50}ms` : "0ms",
                }}
                className={`group/link flex cursor-pointer items-center justify-between gap-4 text-body-sm font-medium text-neutral-700 transition-[color,opacity,transform] duration-300 hover:text-brand active:opacity-70 ${
                  mobileOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0"
                }`}
              >
                <span>{link.label}</span>
                <ArrowUpRight className="size-4 shrink-0" />
              </Link>
            ))}
          </div>

          <div
            style={{ transitionDelay: mobileOpen ? "520ms" : "0ms" }}
            className={`h-px w-full bg-stroke-subtle transition-opacity duration-300 ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            style={{
              transitionProperty: "opacity, transform",
              transitionDuration: "300ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: mobileOpen ? "560ms" : "0ms",
            }}
            className={`${
              mobileOpen
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0"
            }`}
          >
            <Button
              href="/#contact-form"
              size="small"
              onClick={() => {
                navigatingRef.current = true;
                setMobileOpen(false);
              }}
              className="w-full [&>span]:flex-1"
            >
              Отримати пропозицію
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
}
