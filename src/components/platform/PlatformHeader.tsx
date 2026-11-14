"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { CartTrigger, usePublishHeaderHeight } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { Burger } from "@/components/PhoneMenu";
import { useAuth } from "@/components/auth/AuthProvider";
import { PROFILE_HREF } from "@/components/auth/data";
import { useCart } from "@/components/cart/CartProvider";
import { ChevronDown16 } from "@/components/catalog/icons";
import { CabinetMenu, CompanyAvatar } from "./CabinetMenu";
import { KebabMenu } from "./ui/KebabMenu";

const COPY = {
  account: "Особистий кабінет",
  // The page title of «Мій профіль» (4868:30958).
  profile: "Мій профіль",
  signOut: "Вийти",
  openMenu: "Відкрити меню",
  closeMenu: "Закрити меню",
} as const;

// «Header :: B2B» — Figma 3888:26393 (1710 x 92): the signed-in shell
// drops the marketing nav; px-32 py-22, the 120-px logo on the left and,
// on the right, a 16-px group of the company «Label» chip and the 48-px
// cart box. Chip (pixel scan of the dashboard render 5052:32106 with
// «Mirotel LTD»: x 1433..1613 = 181 wide): 42 tall, 1-px #343435 ring
// INSIDE the box (so pl-7 / pr-15 + the 1-px border = the master's 8 /
// 16), r70, the 32-px round avatar 8 px before the 16/24 SemiBold
// #343435 name, then 16 px to the 16-px chevron. The designer dropped the
// account-summary drawer for partners (2026-11-13, «Такого стану не
// було»): the chip opens the design-system «<Menu>» (KebabMenu, 220-px
// white r24 sheet 6 px under the chip, right edges aligned) with «Мій
// профіль» (/profile) and «Вийти», so a partner can sign out from every
// cabinet page; the chevron turns while it is open.
// Phones (< 640, D1): the public phone bar's exact pixels (66 tall, px 24,
// logo left, cart disc + burger right; Figma 3082:3661); the chip is
// hidden and the burger opens the cabinet menu sheet (CabinetMenu, its
// account row and «Вийти» row replace the chip).
export function PlatformHeader() {
  const { user, open: authOpen, welcomeOpen, signOut } = useAuth();
  const { count, open: cartOpen, openCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // Stable: PhoneMenuSheet's lock effect and the rows call it.
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Focus target when the menu closes.
  const burgerRef = useRef<HTMLButtonElement | null>(null);

  // The drawers hang from `--site-header-h`; the public header that
  // publishes it is unmounted here, and this bar has the same 92 / 66.
  usePublishHeaderHeight();

  // A route change (a row, the logo, Back) closes the menu in the same
  // commit as the new page (render-phase adjustment, as in Header.tsx).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }
  // An overlay opening while the menu is open (the toast "Кошик" action,
  // the account sheet, the welcome modal) closes the menu in the same
  // commit, so no overlay opens under the z-45 sheet.
  if (menuOpen && (cartOpen || authOpen || welcomeOpen)) {
    setMenuOpen(false);
  }

  // The bar's cart disc closes the menu before the cart opens (on desktop
  // the menu is never open, so this is plain openCart there).
  const openCartFromBar = () => {
    setMenuOpen(false);
    openCart();
  };

  const company = user?.company.name ?? "";
  const trimmed = company.trim();

  return (
    <>
      {/* The white cap above the bar (`before:`): the same in-app browser
          fix as the public header (Header.tsx, designer 2026-11-14). */}
      <header className="sticky top-0 z-50 bg-white before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-screen before:bg-white before:content-['']">
        <div className="flex h-[66px] items-center justify-between px-6 lg:h-[92px] lg:px-8">
          {/* A logo tap also closes the menu (display: contents keeps the
              logo the bar's flex item). */}
          <span className="contents" onClickCapture={closeMenu}>
            <Logo />
          </span>
          <div className="flex items-center gap-2 lg:gap-4">
            <KebabMenu
              label={trimmed ? `${COPY.account}: ${trimmed}` : COPY.account}
              className="max-lg:hidden"
              lastDivider={false}
              items={[
                { key: "profile", label: COPY.profile, onSelect: () => router.push(PROFILE_HREF) },
                { key: "sign-out", label: COPY.signOut, onSelect: signOut },
              ]}
              triggerClassName="flex h-[42px] cursor-pointer items-center gap-2 rounded-[70px] border border-neutral-800 bg-white pl-[7px] pr-[11px] transition-colors duration-200 hover:bg-bg-subtle lg:gap-4 lg:pr-[15px]"
              trigger={(open) => (
                <>
                  <span className="flex min-w-0 items-center gap-2">
                    <CompanyAvatar user={user} />
                    <span className="hidden max-w-[220px] truncate text-[16px] font-semibold leading-6 text-neutral-800 sm:block">
                      {company}
                    </span>
                  </span>
                  <ChevronDown16
                    className={`size-4 shrink-0 text-neutral-900 transition-transform duration-200 motion-reduce:transition-none ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            />
            <CartTrigger count={count} onOpen={openCartFromBar} />
            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="cabinet-nav"
              aria-label={menuOpen ? COPY.closeMenu : COPY.openMenu}
              className="-mr-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-transform active:scale-90 motion-reduce:transition-none lg:hidden"
            >
              <Burger open={menuOpen} />
            </button>
          </div>
        </div>
      </header>
      {/* The menu sheet sits OUTSIDE the <header> (a body child, like the
          public #mobile-nav), anchored under the bar by --site-header-h. */}
      <CabinetMenu open={menuOpen} onClose={closeMenu} burgerRef={burgerRef} />
    </>
  );
}
