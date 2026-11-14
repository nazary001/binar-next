"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { CatalogueIcon, DashboardIcon, MaterialsIcon, SideMenuOrdersIcon } from "./icons";

// «Side menu» - the instance 5052:32110 of master 4328:30586
// (ctx/5052-32110.md): a 104-px rail, px-16 py-32, rounded-tr-48, of
// exactly four 72-px items 32 px apart. Item = a 40-px «Info icon» tile
// (p-8, r12, 24-px glyph; the active one is filled brand #f85a0b with a
// white glyph, the others have no fill and #777779 glyphs) + 4 px + the
// label Manrope SemiBold 10 / normal (font-intrinsic, not Tailwind's
// 1.5), -0.2 px, #777779 for every item incl. the active one. Glyphs:
// Dashboard, Catalogue, Orders (the box with a clock), Materials.
// Routes: Дашборд /dashboard, Каталог /catalog (also active on «Мій
// асортимент» /assortment, opened from the catalog head), Замовлення
// /orders (returns and detail pages live under it), Матеріали
// /materials*; /profile (via the header chip's «Мій профіль» menu) lights
// none. Hover (not drawn in Figma): #f8f8f8 tile + #1d1d1f glyph. The
// rail is desktop-only (>= 640); phones switch sections from the header
// burger's cabinet menu sheet (CabinetMenu, DECISIONS D1).
type Item = {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  href: string;
  match: RegExp;
};

const ITEMS: Item[] = [
  { key: "dashboard", label: "Дашборд", Icon: DashboardIcon, href: "/dashboard", match: /^\/dashboard(\/|$)/ },
  { key: "catalog", label: "Каталог", Icon: CatalogueIcon, href: "/catalog", match: /^\/(catalog|assortment)(\/|$)/ },
  { key: "orders", label: "Замовлення", Icon: SideMenuOrdersIcon, href: "/orders", match: /^\/orders(\/|$)/ },
  { key: "materials", label: "Матеріали", Icon: MaterialsIcon, href: "/materials", match: /^\/materials(\/|$)/ },
];

function Tile({ active, Icon }: { active: boolean; Icon: Item["Icon"] }) {
  return (
    <span
      className={`flex size-10 items-center justify-center overflow-clip rounded-xl p-2 transition-colors duration-200 ${
        active
          ? "bg-brand text-white"
          : "text-neutral-500 group-hover:bg-bg-subtle group-hover:text-neutral-900"
      }`}
    >
      <Icon className="size-6" />
    </span>
  );
}

function Label({ children }: { children: string }) {
  return (
    <span className="whitespace-nowrap text-center text-[10px] font-semibold leading-[normal] tracking-[-0.2px] text-neutral-500">
      {children}
    </span>
  );
}

export function SideMenu() {
  const pathname = usePathname();

  const items = ITEMS.map((item) => {
    const active = item.match.test(pathname);
    return (
      <Link
        key={item.key}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`group flex w-[72px] shrink-0 flex-col items-center gap-1 ${active ? "" : "cursor-pointer"}`}
      >
        <Tile active={active} Icon={item.Icon} />
        <Label>{item.label}</Label>
      </Link>
    );
  });

  return (
    <aside className="hidden w-[104px] shrink-0 lg:block">
      <nav
        aria-label="Меню платформи"
        className="sticky top-[var(--site-header-h,92px)] flex flex-col items-center gap-8 rounded-tr-[48px] px-4 py-8"
      >
        {items}
      </nav>
    </aside>
  );
}
