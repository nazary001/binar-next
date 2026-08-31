"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CatalogMenu } from "./CatalogMenu";
import { Logo } from "./Logo";
import { Button } from "./ui/Button";

type NavLink = {
  href: string;
  label: string;
};

// Desktop nav after the «Каталог» trigger (Figma header master 129:1279,
// seen on 3603:11433): Співпраця, Блог, Ресурси, Контакти. The old
// Кейси / FAQ anchors were dropped by the redesign. «Ресурси» has no
// destination in the prototype (hover-only state) — rendered as a
// non-navigating item below until the page exists.
const TOP_LINKS: NavLink[] = [
  { href: "/spivpratsya", label: "Співпраця" },
  { href: "/blog", label: "Блог" },
];

const CONTACTS_LINK: NavLink = { href: "/#contacts", label: "Контакти" };

// Mobile menu (Figma 3117:13578) lists the directions by their full
// product names under the "Напрями" label, then a second group of links.
const MOBILE_DIRECTIONS: NavLink[] = [
  { href: "/hotels", label: "Усе для готелів" },
  { href: "/protect", label: "Засоби індивідуального захисту" },
  { href: "/cleaning", label: "Засоби та інвентар для прибирання" },
];

const MOBILE_LINKS: NavLink[] = [
  { href: "/catalog", label: "Каталог" },
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

// heroicons-outline/chevron (Figma 616:3451, exported 1:1): an ~11×6
// filled glyph inside a 16-px box. The export is the OPEN state's
// point-up orientation; the closed trigger rotates it 180° to point
// down. fill=currentColor so it tracks the trigger colour
// (neutral-700 ↔ brand) for free.
function CatalogChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={`shrink-0 transition-[rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? "" : "rotate-180"
      }`}
    >
      <path
        d="M7.72463 5.08224C7.91871 4.95407 8.18268 4.97583 8.35354 5.14669L13.3535 10.1467C13.5488 10.342 13.5488 10.6585 13.3535 10.8537C13.1583 11.049 12.8418 11.049 12.6465 10.8537L8.00002 6.20724L3.35354 10.8537C3.15828 11.049 2.84177 11.049 2.64651 10.8537C2.45125 10.6585 2.45125 10.342 2.64651 10.1467L7.64651 5.14669L7.72463 5.08224Z"
        fill="currentColor"
      />
    </svg>
  );
}

// «cart bold» glyph (Figma 3917:40132, exported 1:1): a 17.23x20.03
// vector inside a 24-px box, inset 1.55 left / 2.1 top per the master.
// White fill + 1-px white stroke exactly as exported; currentColor so
// it rides the orange circle's text-white.
function CartIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <g transform="translate(1.545, 2.1)">
        <path
          d="M6.375 16.2334C7.42295 16.2337 8.2724 17.0829 8.27246 18.1309C8.27246 19.1789 7.42298 20.029 6.375 20.0293C5.32679 20.0293 4.47656 19.1791 4.47656 18.1309C4.47662 17.0827 5.32683 16.2334 6.375 16.2334ZM15.3291 16.2334C16.377 16.2337 17.2265 17.0829 17.2266 18.1309C17.2266 19.1789 16.3771 20.029 15.3291 20.0293C14.2809 20.0293 13.4307 19.1791 13.4307 18.1309C13.4307 17.0827 14.2809 16.2334 15.3291 16.2334ZM5.74512 0C5.88319 0 5.99512 0.111929 5.99512 0.25V2.90527C5.99512 3.04334 6.10705 3.15527 6.24512 3.15527H16.9766C17.1146 3.15527 17.2266 3.2672 17.2266 3.40527V12.0156C17.2266 12.1537 17.1146 12.2656 16.9766 12.2656H6.24512C6.10705 12.2656 5.99512 12.3776 5.99512 12.5156V13.3896C5.99512 13.5277 6.10705 13.6396 6.24512 13.6396H16.9766C17.1146 13.6396 17.2266 13.7516 17.2266 13.8896V14.9082C17.2266 15.0463 17.1146 15.1582 16.9766 15.1582H4.72656C4.58849 15.1582 4.47656 15.0463 4.47656 14.9082V1.76855C4.47656 1.63048 4.36463 1.51855 4.22656 1.51855H0.25C0.111929 1.51855 0 1.40663 0 1.26855V0.25C0 0.111929 0.111929 0 0.25 0H5.74512Z"
          fill="currentColor"
          stroke="currentColor"
        />
      </g>
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
// Bar geometry mirrors the Figma "menu" icon (3084:3674): three 17.85-px
// lines (x 3.07 → 20.93) of 1.5-px stroke with round caps, centred on
// y = 7.79 / 12 / 16.21 inside the 24-px box.
function Burger({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block size-6">
      <span
        className={`absolute inset-x-[2.3px] top-[7.04px] block h-[1.5px] rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-y-[4.21px] rotate-45" : ""
        }`}
      />
      <span
        className={`absolute inset-x-[2.3px] top-[11.25px] block h-[1.5px] rounded-full bg-current transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute inset-x-[2.3px] top-[15.46px] block h-[1.5px] rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "-translate-y-[4.21px] -rotate-45" : ""
        }`}
      />
    </span>
  );
}

export function Header() {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);

  // Safety net: a client-side navigation (logo, keyboard nav link, any
  // route change) always dismisses the mega-menu even when no close
  // handler fired. Render-phase adjustment (the React-endorsed
  // "derive state from a changed prop" pattern) instead of an effect,
  // so the closed state paints in the same commit as the new page.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setCatalogOpen(false);
  }
  // True when the mobile menu is being closed BECAUSE the user clicked
  // a navigation link (vs. dismissing the menu with Escape / outside-
  // click / close button). When true, the body-lock cleanup below skips
  // its `window.scrollTo(0, scrollY)` step — restoring the previous
  // scroll on the OLD page would leak that position onto the NEW page
  // before Next.js's own scroll-to-top kicks in, leaving mobile users
  // dropped halfway down the new page. Reset to false after each cycle.
  const navigatingRef = useRef(false);

  // Close the «Каталог» mega-menu on outside pointerdown OR Escape.
  // The outside test is against the whole <header> because the sheet
  // renders INSIDE it (see CatalogMenu) — any press on the page below
  // dismisses the menu before the pressed link navigates.
  useEffect(() => {
    if (!catalogOpen) return;
    const onPointer = (e: PointerEvent) => {
      const el = headerRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setCatalogOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCatalogOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [catalogOpen]);


  // Publish the header's fixed height as a CSS variable on <html> so any
  // sticky element below (e.g. the Cases card stack) can pin EXACTLY at
  // the bottom edge of the header rather than slipping underneath it.
  // The header is locked at a single height per breakpoint — 92 px on
  // desktop (cart button 48 + py-22 × 2, Figma master 129:1279) and
  // 66 px on mobile (Figma 3082:3661) — the previous scroll-driven
  // shrink/shadow wasn't in the design and caused layout jitter near
  // the top of the page (sticky elements re-pinning every time the
  // header height toggled). Updated when the viewport crosses the lg
  // breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () =>
      document.documentElement.style.setProperty(
        "--site-header-h",
        mq.matches ? "92px" : "66px",
      );
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
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
    <header
      ref={headerRef}
      // Leaving the header block (bar OR the mega-menu sheet hanging
      // from it) closes the catalog — the hover chain trigger → sheet
      // stays inside this one element, so no bridge/timer is needed.
      onMouseLeave={() => setCatalogOpen(false)}
      className="sticky top-0 z-50 bg-white"
    >
      {/* Mobile (Figma 3082:3661): the header bar is exactly 66 px tall
          with the 100x33.45 logo and the 24-px burger vertically centred.
          Desktop is the 92-px bar of the redesigned master 129:1279 —
          80-px side padding (not the 130 content gutter), py-22, with
          the 48-px cart box setting the row height. */}
      <div className="mx-auto flex h-[66px] w-full max-w-[1440px] items-center justify-between px-6 sm:px-10 lg:h-auto lg:px-20 lg:py-[22px]">
        <Logo />

        <nav
          aria-label="Головна навігація"
          className="hidden items-center gap-12 lg:flex"
        >
          {/* === Top nav ===
              Figma «Text button» has two variants — Default (#4a4a4c) and
              Variant2 (#f85a0b). The hover state on every nav link is
              a colour swap to brand orange. NO pill background, NO
              padding shift on hover. The «Напрями» trigger uses the
              same swap and additionally rotates its chevron when the
              dropdown is open. */}
          <ul className="flex items-center gap-[35px]">
            {/* «Напрями» is a plain link in the new header (Figma
                3603:11434) — the three direction pages moved into the
                «Каталог» mega-menu, so this now points at the home
                Directions section. Hovering any non-trigger item
                dismisses an open catalog, menubar-style. */}
            <li onMouseEnter={() => setCatalogOpen(false)}>
              <Link
                href="/#segments"
                className="block cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
              >
                Напрями
              </Link>
            </li>
            <li>
              {/* Hover opens the mega-menu; CLICK navigates to /catalog
                  (the Figma prototype wires the menu's click to the
                  catalog listing page). The trigger stays brand-orange
                  while the menu is open OR while /catalog is the
                  current route — the catalog-page master (3603:11640)
                  shows it orange with the chevron down. */}
              <Link
                href="/catalog"
                onMouseEnter={() => setCatalogOpen(true)}
                onClick={() => setCatalogOpen(false)}
                aria-expanded={catalogOpen}
                aria-haspopup="true"
                aria-controls="catalog-menu"
                aria-current={
                  isActiveRoute("/catalog", pathname) ? "page" : undefined
                }
                className={`flex cursor-pointer items-center gap-[2px] text-button-md transition-colors duration-200 hover:text-brand ${
                  catalogOpen || isActiveRoute("/catalog", pathname)
                    ? "text-brand"
                    : "text-neutral-700"
                }`}
              >
                Каталог
                <CatalogChevron open={catalogOpen} />
              </Link>
            </li>
            {TOP_LINKS.map((link) => (
              <li key={link.href} onMouseEnter={() => setCatalogOpen(false)}>
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
            {/* «Ресурси» (Figma 2749:6914) has only a hover state in the
                prototype — no destination page exists yet, so it renders
                as a non-navigating item with the same colour swap. */}
            <li onMouseEnter={() => setCatalogOpen(false)}>
              <span className="block text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand">
                Ресурси
              </span>
            </li>
            <li onMouseEnter={() => setCatalogOpen(false)}>
              <Link
                href={CONTACTS_LINK.href}
                className="block cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
              >
                {CONTACTS_LINK.label}
              </Link>
            </li>
          </ul>

          {/* CTA + cart group (Figma 3917:40504): gap-16 between the
              dark pill and the 48-px cart box. */}
          <div
            className="flex items-center gap-4"
            onMouseEnter={() => setCatalogOpen(false)}
          >
            <Button href="/#contact-form" size="small">
              Отримати пропозицію
            </Button>
            {/* Cart icon-button (Figma 3917:40130): 48-px hit box, 42-px
                brand circle (r 26) with the white cart glyph, 20-px
                counter badge at the top-right — #1d1d1f fill, 1.5-px
                white ring, 12-px bold count. Decorative until the cart
                feature ships (no click target in the prototype). */}
            <div className="relative size-12 shrink-0">
              <span className="absolute left-1/2 top-1/2 flex size-[42px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[26px] bg-brand text-white">
                <CartIcon />
              </span>
              <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-full border-[1.5px] border-white bg-neutral-900 text-[12px] font-bold leading-none text-white">
                2
              </span>
            </div>
          </div>
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Закрити меню" : "Відкрити меню"}
          className="-mr-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-transform active:scale-90 lg:hidden"
        >
          <Burger open={mobileOpen} />
        </button>
      </div>

      {/* Catalog mega-menu sheet — anchored to the sticky header so it
          tracks it while the page scrolls, painted behind the white bar
          (-z-10 inside the header's z-50 stacking context) so its top
          6 px tuck under the bar exactly like the Figma master. */}
      <CatalogMenu
        open={catalogOpen}
        onNavigate={() => setCatalogOpen(false)}
      />
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
          top: "var(--site-header-h, 92px)",
        }}
        className={`fixed inset-x-0 bottom-0 z-[45] overflow-y-auto overscroll-contain bg-white transition-[transform,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          mobileOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        {/* Figma 3117:13841 — px-24 py-60, gap-48 between the label
            group / divider / link group / divider / full-width button.
            The rendered master TOP-ALIGNS the stack right under the
            header (label at 60px below the bar), leaving free space at
            the bottom on tall screens. Each row is a Manrope Medium
            14/20 link (#4a4a4c) with a trailing arrow-up-right glyph. */}
        <nav
          aria-label="Мобільна навігація"
          className="mx-auto flex min-h-full w-full max-w-[480px] flex-col gap-12 px-6 py-[60px] sm:px-10"
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
            className={`h-px w-full -mb-px bg-stroke-subtle transition-opacity duration-300 ${
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
            className={`h-px w-full -mb-px bg-stroke-subtle transition-opacity duration-300 ${
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
