"use client";

import Link from "next/link";
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
];

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
  const [scrolled, setScrolled] = useState(false);
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

  // The header's padding/shadow is gated on whether the page is scrolled.
  // Two safeguards against jitter when scrollY hovers near the threshold:
  //
  //  1. Hysteresis (8 px / 32 px). The state enters "scrolled" only above
  //     32 px and leaves it only below 8 px. The 24-px dead zone breaks a
  //     feedback loop where the browser's scroll-anchoring nudges scrollY
  //     to compensate for the header's height transition (14↔22 px), the
  //     nudge fires another scroll event, and the state flips on the next
  //     frame — repeating indefinitely while the user is near the top.
  //
  //  2. requestAnimationFrame coalesces bursts of scroll events so we run
  //     at most one state evaluation per frame.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled((prev) => {
        const y = window.scrollY;
        return prev ? y > 8 : y > 32;
      });
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Publish the header's current height as a CSS variable on <html> so
  // any sticky element below (e.g. the Cases card stack) can pin
  // EXACTLY at the bottom edge of the header rather than slipping
  // underneath it. Two states only: not-scrolled (logo 40 + py-22×2 =
  // 84 px) and scrolled (logo 40 + py-14×2 = 68 px). Consumers add
  // `transition-[top] duration-300` so they smoothly follow the header
  // when this variable flips, matching the header's own 300-ms padding
  // transition.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--site-header-h",
      scrolled ? "68px" : "84px",
    );
  }, [scrolled]);

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
    <header
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md transition-[box-shadow,background-color,padding] duration-300 ${
        scrolled
          ? "shadow-[0_1px_0_0_rgba(29,29,31,0.08),0_8px_24px_-12px_rgba(29,29,31,0.12)]"
          : "shadow-none"
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 transition-[padding] duration-300 sm:px-10 lg:px-[130px] ${
          scrolled ? "py-[14px]" : "py-[22px]"
        }`}
      >
        <Logo />

        <nav
          aria-label="Головна навігація"
          className="hidden items-center gap-8 lg:flex"
        >
          {/* === Pill-hover top nav ===
              Every link is its own rounded-full pill. At rest the
              background is transparent so the bar reads as plain text,
              and on hover the pill fills with bg-bg-subtle and the text
              darkens to neutral-900. Padding stays applied at all times
              so nothing shifts on hover — only the colour transitions.
              The «Напрями» trigger reuses the same pill plus an "active"
              state pinned by `segmentsOpen` so the pill stays visible
              while the dropdown is open. */}
          <ul className="flex items-center gap-1">
            <li ref={segmentsRef} className="relative">
              <button
                type="button"
                onClick={() => setSegmentsOpen((v) => !v)}
                aria-expanded={segmentsOpen}
                aria-haspopup="true"
                className={`flex cursor-pointer items-center gap-1 rounded-full px-4 py-2 text-button-md transition-colors duration-200 hover:bg-bg-subtle hover:text-neutral-900 ${
                  segmentsOpen
                    ? "bg-bg-subtle text-neutral-900"
                    : "text-neutral-700"
                }`}
              >
                Напрями
                <ChevronDown
                  className={`transition-transform duration-300 ${segmentsOpen ? "rotate-180" : ""}`}
                />
              </button>
              <ul
                role="menu"
                aria-hidden={!segmentsOpen}
                inert={!segmentsOpen}
                className={`absolute left-0 top-full min-w-[180px] origin-top rounded-2xl border border-stroke-subtle bg-white p-2 shadow-lg transition-[opacity,transform,margin-top] duration-200 ${
                  segmentsOpen
                    ? "pointer-events-auto mt-3 translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none mt-2 -translate-y-1 scale-95 opacity-0"
                }`}
              >
                {SEGMENTS.map((s, i) => (
                  <li key={s.href} role="none">
                    <Link
                      role="menuitem"
                      href={s.href}
                      onClick={() => setSegmentsOpen(false)}
                      style={{
                        transitionDelay: segmentsOpen ? `${i * 30}ms` : "0ms",
                      }}
                      className={`block cursor-pointer rounded-xl px-4 py-2 text-button-md text-neutral-700 transition-[background-color,color,opacity,transform] duration-200 hover:bg-bg-subtle hover:text-neutral-900 ${
                        segmentsOpen
                          ? "translate-x-0 opacity-100"
                          : "-translate-x-1 opacity-0"
                      }`}
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            {TOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block cursor-pointer rounded-full px-4 py-2 text-button-md text-neutral-700 transition-colors duration-200 hover:bg-bg-subtle hover:text-neutral-900"
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
        className={`fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain bg-white/95 backdrop-blur-2xl transition-[transform,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          mobileOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <nav
          aria-label="Мобільна навігація"
          className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-6 pb-12 pt-6 sm:px-10 sm:pt-8"
        >
          <p className="px-4 pb-2 text-title-sm uppercase text-neutral-500">
            Напрями
          </p>
          {SEGMENTS.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => {
                navigatingRef.current = true;
                setMobileOpen(false);
              }}
              style={{
                transitionDelay: mobileOpen ? `${80 + i * 50}ms` : "0ms",
              }}
              className={`group/link flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-button-lg text-neutral-900 transition-[background-color,color,opacity,transform] duration-300 hover:bg-bg-subtle hover:text-brand active:scale-[0.98] ${
                mobileOpen
                  ? "translate-y-0 opacity-100"
                  : "translate-y-3 opacity-0"
              }`}
            >
              <span>{s.label}</span>
              <span
                aria-hidden
                className="text-neutral-400 transition-transform duration-300 group-hover/link:translate-x-1 group-hover/link:text-brand"
              >
                →
              </span>
            </Link>
          ))}
          <p className="mt-4 px-4 pb-2 text-title-sm uppercase text-neutral-500">
            Інше
          </p>
          {TOP_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => {
                navigatingRef.current = true;
                setMobileOpen(false);
              }}
              style={{
                transitionDelay: mobileOpen
                  ? `${230 + i * 50}ms`
                  : "0ms",
              }}
              className={`group/link flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-button-lg text-neutral-900 transition-[background-color,color,opacity,transform] duration-300 hover:bg-bg-subtle hover:text-brand active:scale-[0.98] ${
                mobileOpen
                  ? "translate-y-0 opacity-100"
                  : "translate-y-3 opacity-0"
              }`}
            >
              <span>{link.label}</span>
              <span
                aria-hidden
                className="text-neutral-400 transition-transform duration-300 group-hover/link:translate-x-1 group-hover/link:text-brand"
              >
                →
              </span>
            </Link>
          ))}
          <div
            style={{
              // Use individual transition longhand props so React
              // doesn't warn about mixing the `transition` shorthand
              // with `transitionDelay` on rerender.
              transitionProperty: "opacity, transform",
              transitionDuration: "300ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: mobileOpen ? "460ms" : "0ms",
            }}
            className={`mt-6 px-4 ${
              mobileOpen
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0"
            }`}
          >
            <Button
              href="/#contact-form"
              size="large"
              arrow
              onClick={() => {
                navigatingRef.current = true;
                setMobileOpen(false);
              }}
            >
              Отримати пропозицію
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
}
