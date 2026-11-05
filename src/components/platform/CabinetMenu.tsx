"use client";
/* eslint-disable @next/next/no-img-element */
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import {
  PhoneMenuCtaDock,
  PhoneMenuDivider,
  PhoneMenuGroup,
  PhoneMenuLabel,
  PhoneMenuRow,
  PhoneMenuSheet,
} from "@/components/PhoneMenu";
import { useAuth } from "@/components/auth/AuthProvider";
import { PersonIcon } from "@/components/auth/icons";
import { MENU_INERT } from "@/components/cart/useModalBehavior";
import { ChevronDown16 } from "@/components/catalog/icons";
import { Button } from "@/components/ui/Button";
import { companyInitials } from "./companyInitials";

const COPY = {
  menu: "Меню кабінету",
  account: "Особистий кабінет",
  group: "Кабінет",
  cta: "Зробити замовлення",
} as const;

// The cabinet sections (D1), in the master menu's row idiom; the active
// row is brand + aria-current="page" (exactly one per cabinet route).
const CABINET_ROWS = [
  { href: "/dashboard", label: "Дашборд", match: /^\/dashboard(\/|$)/ },
  { href: "/catalog", label: "Каталог", match: /^\/catalog(\/|$)/ },
  { href: "/assortment", label: "Мій асортимент", match: /^\/assortment(\/|$)/ },
  { href: "/orders", label: "Замовлення", match: /^\/orders(\/|$)/ },
  { href: "/materials", label: "Матеріали", match: /^\/materials(\/|$)/ },
  { href: "/profile", label: "Профіль", match: /^\/profile(\/|$)/ },
];

// The site group (cabinet pages have no #contacts footer, so "Контакти"
// leaves for the home page's contacts section).
const SITE_ROWS = [
  { href: "/spivpratsya", label: "Співпраця" },
  { href: "/blog", label: "Блог" },
  { href: "/#contacts", label: "Контакти" },
];

// The open menu makes the cabinet content wrapper and the legal bar
// (both marked data-cabinet-behind) inert, plus every other body child
// except the header, the menus and the toast host.
const CABINET_INERT = `${MENU_INERT}, [data-cabinet-behind]`;

// A-16 stagger: the cabinet menu is the section switcher, so it settles
// fast - delay = 40 + k * 20 ms (k = 0 account row ... 13 the CTA dock).
const delay = (k: number) => 40 + k * 20;

type AvatarUser = { logo?: string; company: { name: string } } | null | undefined;

// The 32-px round account avatar: the uploaded company logo, else the
// two-letter monogram (companyInitials), else the person glyph. One look
// for the desktop header chip and the phone menu's account row.
export function CompanyAvatar({ user }: { user: AvatarUser }) {
  const initials = companyInitials(user?.company.name ?? "");
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-[12px] font-bold leading-none text-white">
      {user?.logo ? (
        <img src={user.logo} alt="" className="absolute inset-0 size-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <PersonIcon className="size-5" />
      )}
    </span>
  );
}

// "Меню кабінету" - the phone menu sheet of the B2B cabinet (D1 as amended
// by A-1; Figma phone menu 3117:13578 / stack 3117:13841), built on the
// shared PhoneMenu primitives: natural 14/20 rows (no fit zoom), the
// overlay scrolls and the CTA docks at the sheet bottom. Order: the
// account row (avatar + company, opens the account summary), 48, the
// "Кабінет" label + six section rows, 48 / divider / 48, the three site
// rows, 48 / divider / 48, the full-width "Зробити замовлення".
// Closes on the cross, Escape, a route change, the 640 crossing
// (PhoneMenuSheet), the logo, the cart disc and the account row
// (PlatformHeader).
export function CabinetMenu({
  open,
  onClose,
  burgerRef,
}: {
  open: boolean;
  onClose: () => void;
  burgerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { user, openAuth } = useAuth();
  const pathname = usePathname();
  const company = user?.company.name.trim() ?? "";

  // The burger becomes the account sheet's opener (closing the sheet
  // refocuses it, not a row of the closed, inert menu); the menu closes
  // before the sheet opens.
  const openAccount = () => {
    burgerRef.current?.focus({ preventScroll: true });
    onClose();
    openAuth("account");
  };

  return (
    <PhoneMenuSheet
      id="cabinet-nav"
      open={open}
      onClose={onClose}
      label={COPY.menu}
      returnFocus={burgerRef}
      inertSelector={CABINET_INERT}
    >
      <PhoneMenuRow
        open={open}
        delay={delay(0)}
        ariaLabel={company ? `${COPY.account}: ${company}` : COPY.account}
        ariaHaspopup="dialog"
        trailing={<ChevronDown16 className="size-4 shrink-0 -rotate-90 text-neutral-900" />}
        onClick={openAccount}
      >
        <span className="flex min-w-0 items-center gap-3">
          <CompanyAvatar user={user} />
          <span className="line-clamp-2 min-w-0 text-[16px] font-semibold leading-6 text-neutral-800">
            {company || COPY.account}
          </span>
        </span>
      </PhoneMenuRow>

      <PhoneMenuGroup>
        <PhoneMenuLabel open={open} delay={delay(1)}>
          {COPY.group}
        </PhoneMenuLabel>
        {CABINET_ROWS.map((r, i) => (
          <PhoneMenuRow
            key={r.href}
            href={r.href}
            open={open}
            delay={delay(2 + i)}
            active={r.match.test(pathname)}
            onClick={onClose}
          >
            {r.label}
          </PhoneMenuRow>
        ))}
      </PhoneMenuGroup>

      <PhoneMenuDivider open={open} delay={delay(8)} />

      <PhoneMenuGroup>
        {SITE_ROWS.map((r, i) => (
          <PhoneMenuRow key={r.href} href={r.href} open={open} delay={delay(9 + i)} onClick={onClose}>
            {r.label}
          </PhoneMenuRow>
        ))}
      </PhoneMenuGroup>

      <PhoneMenuDivider open={open} delay={delay(12)} />

      <PhoneMenuCtaDock open={open} delay={delay(13)}>
        <Button href="/catalog" size="small" onClick={onClose} className="w-full [&>span]:flex-1">
          {COPY.cta}
        </Button>
      </PhoneMenuCtaDock>
    </PhoneMenuSheet>
  );
}
