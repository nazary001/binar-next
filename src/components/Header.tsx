"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogMenu } from "./CatalogMenu";
import { Logo } from "./Logo";
import {
  Burger,
  isShopOrCabinetRoute,
  PhoneMenuCtaDock,
  PhoneMenuDivider,
  PhoneMenuGroup,
  PhoneMenuLabel,
  PhoneMenuRow,
  PhoneMenuSheet,
} from "./PhoneMenu";
import { Button } from "./ui/Button";
import { useCart } from "./cart/CartProvider";
import { useAuth } from "./auth/AuthProvider";
import { useFitZoom } from "./cart/useFitZoom";

// Landing routes only: the phone menu stack height in the master
// (3117:13841): py-60 x 2 + label group + links + button = 706 px under
// the 66-px bar of an 844 screen. Shorter phones get the stack zoomed to
// fit. Shop / cabinet routes use the natural-scroll menu with the docked
// CTA instead (PhoneMenu.tsx).
const MOBILE_MENU_DESIGN_H = 706;
const MOBILE_HEADER_H = 66;

type NavLink = {
  href: string;
  label: string;
};

// Desktop nav after the «Каталог» trigger (Figma header master 129:1279,
// seen on 3603:11433): Співпраця, Блог, Матеріали, Контакти. The old
// Кейси / FAQ anchors were dropped by the redesign; the former «Ресурси»
// placeholder became the «Матеріали» library (4635:33058, /materials).
const TOP_LINKS: NavLink[] = [
  { href: "/spivpratsya", label: "Співпраця" },
  { href: "/blog", label: "Блог" },
  { href: "/materials", label: "Матеріали" },
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
  { href: "/materials", label: "Матеріали" },
  CONTACTS_LINK,
];

// On shop / cabinet routes the menu "Контакти" row scrolls to the page's
// own footer (every public page renders footer#contacts) instead of
// leaving the shop for "/"; the landing routes keep "/#contacts".
const SHOP_CONTACTS_HREF = "#contacts";

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

// The header cart button: the 42-px brand disc inside a 48-px hit box
// with the count badge (hidden while the cart is empty).
export function CartTrigger({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={count > 0 ? `Відкрити кошик, товарів: ${count}` : "Відкрити кошик"}
      className="relative size-12 shrink-0 cursor-pointer"
    >
      <span className="absolute left-1/2 top-1/2 flex size-[42px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[26px] bg-brand text-white transition-transform duration-200 active:scale-95">
        <CartIcon />
      </span>
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-white bg-neutral-900 px-1 text-[12px] font-bold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

// The burger glyph and the menu rows' arrow-up-right live in PhoneMenu.tsx
// (shared with the cabinet menu).

// Publishes the header's fixed height as `--site-header-h` on <html> so
// any sticky element below (e.g. the Cases card stack) can pin EXACTLY at
// the bottom edge of the header rather than slipping underneath it, and
// the drawers hang from it. The header is locked at a single height per
// breakpoint - 92 px on desktop (cart button 48 + py-22 x 2, Figma master
// 129:1279) and 66 px on mobile (Figma 3082:3661); the previous
// scroll-driven shrink/shadow wasn't in the design and caused layout
// jitter near the top of the page (sticky elements re-pinning every time
// the header height toggled). Updated when the viewport crosses the lg
// breakpoint. The platform header (PlatformHeader, same 92 / 66) calls it
// too, because the public header is unmounted in the cabinet shell.
export function usePublishHeaderHeight() {
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () =>
      document.documentElement.style.setProperty(
        "--site-header-h",
        mq.matches ? "92px" : "66px",
      );
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
}

export function Header() {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Stable: PhoneMenuSheet and the rows call it; the logo wrapper too.
  const closeMenu = useCallback(() => setMobileOpen(false), []);
  const menuFit = useFitZoom(MOBILE_MENU_DESIGN_H, MOBILE_HEADER_H, "(max-width: 639px)");
  const { count: cartCount, open: cartOpen, openCart } = useCart();
  const { user, open: authOpen, welcomeOpen, openAuth } = useAuth();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  // Focus target when the phone menu closes, and the auth sheet's opener
  // when the menu's account row opens it.
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  // Shop / cabinet routes get the natural-scroll phone menu (docked CTA,
  // active rows, in-page "Контакти"); landing routes keep the frozen one.
  const shop = isShopOrCabinetRoute(pathname);

  // Safety net: a client-side navigation (logo, a menu row, Back, any
  // route change) always dismisses the mega-menu and the phone menu even
  // when no close handler fired. Render-phase adjustment (the
  // React-endorsed "derive state from a changed prop" pattern) instead of
  // an effect, so the closed state paints in the same commit as the new
  // page.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setCatalogOpen(false);
    setMobileOpen(false);
  }
  // An overlay opening while the phone menu is open (the cart from a
  // toast action, the auth sheet, the welcome modal) closes the menu in
  // the same commit, so the overlay never opens under the z-45 sheet and
  // never takes the open menu's `inert` as its own.
  if (mobileOpen && (cartOpen || authOpen || welcomeOpen)) {
    setMobileOpen(false);
  }

  // The phone bar's cart disc closes the menu before the cart opens.
  const openCartFromBar = () => {
    setMobileOpen(false);
    openCart();
  };
  // The menu's account row: focus the burger first (the auth sheet's
  // opener, so closing the sheet refocuses it), close, then open.
  const openAuthFromMenu = () => {
    burgerRef.current?.focus({ preventScroll: true });
    setMobileOpen(false);
    openAuth();
  };

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


  usePublishHeaderHeight();

  // The phone menu's page lock (html overflow, no body pinning), inert
  // page, Escape, focus return and the close on crossing into the desktop
  // canvas live in PhoneMenuSheet.

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
      {/* Figma header: fixed 80-px gutters at 1440 AND in the 1710 shop
          frames (logo x=80, nav right edge at vw-80), i.e. the bar is fluid
          with no max-width cap. */}
      <div className="flex h-[66px] w-full items-center justify-between px-6 sm:px-10 lg:h-auto lg:px-20 lg:py-[22px]">
        {/* A logo tap also closes the phone menu (on "/" it only scrolls
            to the top, so no route change would close it). display:
            contents keeps the logo the bar's flex item. */}
        <span className="contents" onClickCapture={closeMenu}>
          <Logo />
        </span>

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
            <li onMouseEnter={() => setCatalogOpen(false)}>
              <Link
                href={CONTACTS_LINK.href}
                className="block cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
              >
                {CONTACTS_LINK.label}
              </Link>
            </li>
          </ul>

          {/* Login + cart group (Figma 3917:40504): gap-16 between the
              dark «Увійти» pill and the 48-px cart box. Both header
              masters (129:1279 on the 1440 pages, 4329:39832 on the shop
              frames) replaced the old «Отримати пропозицію» CTA with the
              Button/Small «Увійти» (98 x 42, #1d1d1f, 16/22 medium). The
              pill opens the account drawer (Figma «Authorisation NEW»
              5420:38169); once signed in it reads «Кабінет» and opens
              the account summary (the masters keep the same header). */}
          <div
            className="flex items-center gap-4"
            onMouseEnter={() => setCatalogOpen(false)}
          >
            <Button
              type="button"
              size="small"
              onClick={() => {
                setCatalogOpen(false);
                openAuth();
              }}
              aria-label={user ? "Відкрити особистий кабінет" : "Увійти до кабінету"}
            >
              {user ? "Кабінет" : "Увійти"}
            </Button>
            {/* Cart icon-button (Figma 3917:40130): 48-px hit box, 42-px
                brand circle (r 26) with the white cart glyph, 20-px
                counter badge at the top-right — #1d1d1f fill, 1.5-px
                white ring, 12-px bold count. Opens the «Кошик» drawer
                (4329:39905); the badge is the live line count. */}
            <CartTrigger count={cartCount} onOpen={openCart} />
          </div>
        </nav>

        {/* Below lg the cart lives beside the burger (the mobile header
            master 3082:3661 predates the shop; the same 42-px orange disc
            keeps the cart reachable on phones). */}
        <div className="flex items-center gap-2 lg:hidden">
          <CartTrigger count={cartCount} onOpen={openCartFromBar} />
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Закрити меню" : "Відкрити меню"}
            className="-mr-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-transform active:scale-90"
          >
            <Burger open={mobileOpen} />
          </button>
        </div>
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

      {/* === Phone menu (Figma 3117:13578 / 3117:13841) ===
          Sits BELOW the sticky header (top anchored to `--site-header-h`)
          and stretches to the viewport bottom. Lives OUTSIDE the <header>
          element on purpose: a filter / transform on the header would
          become the containing block of `position: fixed` descendants and
          clamp the overlay to the bar. px-24 py-60, gap-48 between the
          label group / divider / link group / divider / full-width button;
          Manrope Medium 14/20 rows (#4a4a4c) with a trailing arrow. On
          landing routes the stack keeps its fit zoom; on shop / cabinet
          routes it scrolls with the CTA docked at the bottom. */}
      <PhoneMenuSheet
        id="mobile-nav"
        open={mobileOpen}
        onClose={closeMenu}
        label="Мобільна навігація"
        returnFocus={burgerRef}
        landingZoom={shop ? undefined : menuFit}
      >
        <PhoneMenuGroup>
          <PhoneMenuLabel open={mobileOpen} delay={80}>
            Напрями
          </PhoneMenuLabel>
          {MOBILE_DIRECTIONS.map((s, i) => (
            <PhoneMenuRow
              key={s.href}
              href={s.href}
              open={mobileOpen}
              delay={120 + i * 50}
              active={shop && isActiveRoute(s.href, pathname)}
              stayOnCurrent={shop}
              onClick={closeMenu}
            >
              {s.label}
            </PhoneMenuRow>
          ))}
        </PhoneMenuGroup>

        <PhoneMenuDivider open={mobileOpen} delay={280} />

        <PhoneMenuGroup>
          {MOBILE_LINKS.map((link, i) => (
            <PhoneMenuRow
              key={link.href}
              href={shop && link === CONTACTS_LINK ? SHOP_CONTACTS_HREF : link.href}
              open={mobileOpen}
              delay={320 + i * 50}
              active={shop && isActiveRoute(link.href, pathname)}
              stayOnCurrent={shop}
              onClick={closeMenu}
            >
              {link.label}
            </PhoneMenuRow>
          ))}
          {/* The account entry (the mobile menu master 3117:13841
              predates the account area; the row keeps the link
              styling). Closes the menu, then opens the sheet. */}
          <PhoneMenuRow
            open={mobileOpen}
            delay={320 + MOBILE_LINKS.length * 50}
            ariaHaspopup="dialog"
            onClick={openAuthFromMenu}
          >
            {user ? "Особистий кабінет" : "Увійти"}
          </PhoneMenuRow>
        </PhoneMenuGroup>

        <PhoneMenuDivider open={mobileOpen} delay={520} />

        <PhoneMenuCtaDock open={mobileOpen} delay={560} sticky={shop}>
          <Button
            href="/#contact-form"
            size="small"
            onClick={closeMenu}
            className="w-full [&>span]:flex-1"
          >
            Отримати пропозицію
          </Button>
        </PhoneMenuCtaDock>
      </PhoneMenuSheet>
    </>
  );
}
