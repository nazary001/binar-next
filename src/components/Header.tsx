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
import { CartIcon } from "./catalog/icons";
import { Button } from "./ui/Button";
import { RollingNumber } from "./ui/RollingNumber";
import { useCart } from "./cart/CartProvider";
import { useAuth } from "./auth/AuthProvider";
import { DASHBOARD_HREF } from "@/components/auth/data";

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

// The three direction pages by their full product names (phone menu
// master 3117:13578): the phone menu lists them under the "Напрями"
// label (then a second group of links), and the desktop «Напрями»
// dropdown shows the same three rows. Same titles and pages as
// CATALOG_DIRECTIONS in catalog/data.ts; the 3-item list here keeps the
// catalog data out of the header.
const DIRECTIONS: NavLink[] = [
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

// «Контакти» as an in-page fragment: every page that renders this header
// also renders footer#contacts (SiteShell renders Header and Footer
// together), so the link scrolls the current page's own footer instead
// of leaving it for "/". The desktop nav uses it on every route; the
// phone menu on shop / cabinet routes (its landing routes keep
// "/#contacts").
const IN_PAGE_CONTACTS_HREF = "#contacts";

// A top-level route link is "active" when the current path is inside it.
// Anchor links (/#...) never highlight — only real routes like /blog or
// /spivpratsya pick up the brand-orange active colour seen in Figma.
function isActiveRoute(href: string, pathname: string) {
  if (!href.startsWith("/") || href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const badgeCount = (n: number) => (n > 99 ? "99+" : String(n));

// The header cart button: the 42-px brand disc inside a 48-px hit box
// with the count badge (hidden while the cart is empty; the count rolls
// with the cart's steppers, ui/RollingNumber.tsx).
// `data-cart-target` / `data-cart-disc` are where an added product flies
// to and what bumps when it lands (cart/flyToCart.ts: adding to the cart
// no longer opens it, designer 2026-11-11).
// The glyph is Figma «cart bold» 3917:40132, the shared catalog/icons
// CartIcon (fill only, 24-px box, white via the disc's text-white). The
// header used to keep its own copy with an extra 1-px stroke that
// swelled the handle and wheels and closed the gap under the basket
// (designer 2026-11-11: «Іконка поплила»).
// The badge is the master's «Counter» 3917:40133: a 20-px circle at the
// box's top-right (x 28, y 0), 1.5-px white ring, Manrope Bold 12. One
// and two digit counts stay inside that circle (no side padding: the
// widest pair, «20», is 15 px + the 3-px ring), so the badge never grows
// left over the basket; only «99+» widens into a pill.
export function CartTrigger({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-cart-target
      aria-label={count > 0 ? `Відкрити кошик, товарів: ${count}` : "Відкрити кошик"}
      className="relative size-12 shrink-0 cursor-pointer"
    >
      <span
        data-cart-disc
        className="absolute left-1/2 top-1/2 flex size-[42px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[26px] bg-brand text-white transition-transform duration-200 active:scale-95"
      >
        <CartIcon className="size-6 shrink-0" />
      </span>
      {count > 0 && (
        <span
          className={`absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-white bg-neutral-900 text-[12px] font-bold leading-none text-white ${
            count > 99 ? "px-1" : ""
          }`}
        >
          <RollingNumber value={count} format={badgeCount} />
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
  // The desktop «Напрями» dropdown; at most one of it and the «Каталог»
  // mega-menu is open (menubar-style).
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const closeDesktopMenus = useCallback(() => {
    setCatalogOpen(false);
    setDirectionsOpen(false);
  }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Stable: PhoneMenuSheet and the rows call it; the logo wrapper too.
  const closeMenu = useCallback(() => setMobileOpen(false), []);
  const { count: cartCount, open: cartOpen, openCart } = useCart();
  const { user, open: authOpen, welcomeOpen, openAuth } = useAuth();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  // Focus target when the phone menu closes, and the auth sheet's opener
  // when the menu's account row opens it.
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  // Shop / cabinet routes get active rows and the in-page "Контакти" in
  // the phone menu; landing routes keep "/#contacts" and no active row.
  // The menu itself (rows, scrolling, docked CTA) is the same everywhere.
  const shop = isShopOrCabinetRoute(pathname);

  // Safety net: a client-side navigation (logo, a menu row, Back, any
  // route change) always dismisses the mega-menu, the «Напрями» dropdown
  // and the phone menu even when no close handler fired. Render-phase
  // adjustment (the React-endorsed "derive state from a changed prop"
  // pattern) instead of an effect, so the closed state paints in the same
  // commit as the new page.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setCatalogOpen(false);
    setDirectionsOpen(false);
    setMobileOpen(false);
  }
  // The desktop «Напрями» trigger (its "/" and other-route forms share
  // these, see the nav). Orange while its dropdown is open and on a
  // direction page, like «Каталог» on /catalog.
  const onDirectionPage = DIRECTIONS.some((d) => isActiveRoute(d.href, pathname));
  const directionsTriggerProps = {
    onClick: () => setDirectionsOpen(false),
    "aria-expanded": directionsOpen,
    "aria-haspopup": true,
    "aria-controls": "directions-menu",
    className: `block cursor-pointer text-button-md transition-colors duration-200 hover:text-brand ${
      directionsOpen || onDirectionPage ? "text-brand" : "text-neutral-700"
    }`,
  } as const;
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

  // Close the «Каталог» mega-menu and the «Напрями» dropdown on outside
  // pointerdown OR Escape. The outside test is against the whole <header>
  // because both panels render INSIDE it (see CatalogMenu): any press on
  // the page below dismisses them before the pressed link navigates.
  const desktopMenuOpen = catalogOpen || directionsOpen;
  useEffect(() => {
    if (!desktopMenuOpen) return;
    const onPointer = (e: PointerEvent) => {
      const el = headerRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        closeDesktopMenus();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDesktopMenus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [desktopMenuOpen, closeDesktopMenus]);


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
      // Leaving the header block (bar OR the mega-menu sheet / «Напрями»
      // dropdown hanging from it) closes both: the hover chain trigger ->
      // panel stays inside this one element, so no timer is needed.
      // The white cap above the bar (`before:`, designer 2026-11-14: «меню
      // було крайнім верхнім елементом»): in-app browsers (Telegram,
      // Instagram) stick the header below their own bar's inset and keep
      // painting the scrolled page above it; the cap paints that strip
      // white. In a normal browser it sits above the viewport (or above the
      // document at the top), adds no scroll height (negative overflow) and
      // takes no pointer events, so hover and taps are unchanged.
      onMouseLeave={closeDesktopMenus}
      className="sticky top-0 z-50 bg-white before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-screen before:bg-white before:content-['']"
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
              padding shift on hover. The «Каталог» trigger uses the
              same swap and stays orange while its menu is open; it is
              text only, no chevron (master 129:1279, designer
              2026-11-11). */}
          <ul className="flex items-center gap-[35px]">
            {/* «Напрями»: hover drops the three direction pages (designer
                2026-11-11: «Випадайка десь пропала із напрямками»); a
                click goes to the home Напрями section. On "/" the trigger
                is a plain fragment link, because a Next Link to the URL
                you are already on ("/#segments") does nothing on a repeat
                click (same as «Контакти», below); elsewhere it is a Link
                to "/#segments" (the section only exists on the home page).
                The header master 129:1279 draws no open state, so the
                panel follows the site's «<Menu>» recipe (4329:41026, see
                checkout/fields.tsx): white, r 24, the soft 2/6 shadow,
                Medium 16/22 #1d1d1f rows, px-16 py-12, 0.5-px #d2d2d2
                lines between rows; hover / current page in brand like the
                nav links. It hangs 8 px under the 92-px bar (the 22-px
                label sits at y 35, so 35 + 8 = 43 px down from the label;
                that transparent padding is the hover bridge, inside the
                <li> and the <header>, so no mouseleave fires on the way
                down) and reveals like the mega-menu (CatalogMenu: 300 ms,
                fade + 12-px slide). Hovering any other item swaps or
                dismisses it, menubar-style. */}
            <li
              className="relative"
              onMouseEnter={() => {
                setCatalogOpen(false);
                setDirectionsOpen(true);
              }}
            >
              {pathname === "/" ? (
                <a href="#segments" {...directionsTriggerProps}>
                  Напрями
                </a>
              ) : (
                <Link href="/#segments" {...directionsTriggerProps}>
                  Напрями
                </Link>
              )}
              <div
                id="directions-menu"
                aria-hidden={!directionsOpen}
                inert={!directionsOpen}
                className={`absolute left-0 top-full w-max pt-[43px] transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] motion-reduce:transition-none ${
                  directionsOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-3 opacity-0"
                }`}
              >
                <ul className="overflow-clip rounded-3xl bg-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]">
                  {DIRECTIONS.map((d) => {
                    const current = isActiveRoute(d.href, pathname);
                    return (
                      <li
                        key={d.href}
                        className="[&+&]:shadow-[inset_0_0.5px_0_var(--color-stroke-subtle)]"
                      >
                        <Link
                          href={d.href}
                          onClick={() => setDirectionsOpen(false)}
                          aria-current={current ? "page" : undefined}
                          className={`block cursor-pointer whitespace-nowrap px-4 py-3 text-button-md transition-colors duration-200 hover:text-brand ${
                            current ? "text-brand" : "text-neutral-900"
                          }`}
                        >
                          {d.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
            <li>
              {/* Hover opens the mega-menu; CLICK navigates to /catalog
                  (the Figma prototype wires the menu's click to the
                  catalog listing page). The trigger stays brand-orange
                  while the menu is open OR while /catalog is the
                  current route. Text only, like every nav item of the
                  header master 129:1279 (the old catalog master's
                  chevron is gone: designer 2026-11-11, «стрілку
                  забираємо»). */}
              <Link
                href="/catalog"
                onMouseEnter={() => {
                  setDirectionsOpen(false);
                  setCatalogOpen(true);
                }}
                onClick={() => setCatalogOpen(false)}
                aria-expanded={catalogOpen}
                aria-haspopup="true"
                aria-controls="catalog-menu"
                aria-current={
                  isActiveRoute("/catalog", pathname) ? "page" : undefined
                }
                className={`block cursor-pointer text-button-md transition-colors duration-200 hover:text-brand ${
                  catalogOpen || isActiveRoute("/catalog", pathname)
                    ? "text-brand"
                    : "text-neutral-700"
                }`}
              >
                Каталог
              </Link>
            </li>
            {TOP_LINKS.map((link) => (
              <li key={link.href} onMouseEnter={closeDesktopMenus}>
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
            <li onMouseEnter={closeDesktopMenus}>
              {/* A plain fragment link, not a Next Link: the browser starts
                  the (CSS smooth) scroll in the click's own frame, scrolls
                  again on every repeat click (a Link to the URL you are
                  already on, "/#contacts", did nothing the second time and
                  refetched the page first) and never leaves /blog,
                  /catalog... for the home page. Designer 2026-11-11: «При
                  кліку щось не відразу спрацьовує». */}
              <a
                href={IN_PAGE_CONTACTS_HREF}
                className="block cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
              >
                {CONTACTS_LINK.label}
              </a>
            </li>
          </ul>

          {/* Login + cart group (Figma 3917:40504): gap-16 between the
              dark «Увійти» pill and the 48-px cart box. Both header
              masters (129:1279 on the 1440 pages, 4329:39832 on the shop
              frames) replaced the old «Отримати пропозицію» CTA with the
              Button/Small «Увійти» (98 x 42, #1d1d1f, 16/22 medium). The
              pill opens the account drawer (Figma «Authorisation NEW»
              5420:38169); once signed in it reads «Кабінет» (the masters
              keep the same header): a partner's pill is a link to the
              dashboard (designer 2026-11-13: the partner never sees the
              account drawer), a retail customer's opens the account
              summary. */}
          <div
            className="flex items-center gap-4"
            onMouseEnter={closeDesktopMenus}
          >
            {user?.type === "b2b" ? (
              <Button href={DASHBOARD_HREF} size="small" onClick={closeDesktopMenus}>
                Кабінет
              </Button>
            ) : (
              <Button
                type="button"
                size="small"
                onClick={() => {
                  closeDesktopMenus();
                  openAuth();
                }}
                aria-label={user ? "Відкрити особистий кабінет" : "Увійти до кабінету"}
              >
                {user ? "Кабінет" : "Увійти"}
              </Button>
            )}
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
          Manrope Bold 16/20 rows (#4a4a4c) 24 apart with a trailing arrow
          and the Button/Large CTA (designer 2026-11-14: «шрифти дуже малі»,
          «Кнопка завузька»). On every route the stack keeps its natural
          size (no fit zoom), scrolls on a short window and docks the CTA
          at the bottom. The second group keeps «Матеріали» and the account
          row, which the master does not show. */}
      <PhoneMenuSheet
        id="mobile-nav"
        open={mobileOpen}
        onClose={closeMenu}
        label="Мобільна навігація"
        returnFocus={burgerRef}
      >
        <PhoneMenuGroup>
          <PhoneMenuLabel open={mobileOpen} delay={80}>
            Напрями
          </PhoneMenuLabel>
          {DIRECTIONS.map((s, i) => (
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
              href={shop && link === CONTACTS_LINK ? IN_PAGE_CONTACTS_HREF : link.href}
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
              styling). A signed-in partner's row links to the
              dashboard (no account sheet for partners, designer
              2026-11-13); otherwise it closes the menu, then opens the
              sheet. */}
          {user?.type === "b2b" ? (
            <PhoneMenuRow
              href={DASHBOARD_HREF}
              open={mobileOpen}
              delay={320 + MOBILE_LINKS.length * 50}
              onClick={closeMenu}
            >
              Особистий кабінет
            </PhoneMenuRow>
          ) : (
            <PhoneMenuRow
              open={mobileOpen}
              delay={320 + MOBILE_LINKS.length * 50}
              ariaHaspopup="dialog"
              onClick={openAuthFromMenu}
            >
              {user ? "Особистий кабінет" : "Увійти"}
            </PhoneMenuRow>
          )}
        </PhoneMenuGroup>

        <PhoneMenuDivider open={mobileOpen} delay={520} />

        <PhoneMenuCtaDock open={mobileOpen} delay={560}>
          <Button
            href="/#contact-form"
            size="largeFixed"
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
