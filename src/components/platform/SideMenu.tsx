"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CatalogueIcon, DashboardIcon, MaterialsIcon, OrdersIcon } from "./icons";

// «Side menu» — Figma 4328:30586 on the B2B frames: a 104-px rail
// (px-16 py-32) of 72-px items 32 px apart, each a 40-px icon tile (p-8,
// r12; the active one fills brand with a white glyph) over a 10-px
// SemiBold #777779 label. Only «Каталог» has pages on the site today:
// «Дашборд» opens the account summary, «Замовлення» and «Матеріали»
// wait for their sections. Below lg the rail becomes a horizontal
// strip under the header.
type Item = {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  href?: string;
  action?: "account";
};

const ITEMS: Item[] = [
  { key: "dashboard", label: "Дашборд", Icon: DashboardIcon, action: "account" },
  { key: "catalog", label: "Каталог", Icon: CatalogueIcon, href: "/catalog" },
  { key: "orders", label: "Замовлення", Icon: OrdersIcon },
  { key: "materials", label: "Матеріали", Icon: MaterialsIcon },
];

function itemClass(active: boolean) {
  return `group flex w-[72px] shrink-0 flex-col items-center gap-1 ${
    active ? "" : "cursor-pointer"
  }`;
}

function Tile({ active, Icon }: { active: boolean; Icon: Item["Icon"] }) {
  return (
    <span
      className={`flex size-10 items-center justify-center rounded-xl transition-colors duration-200 ${
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
    <span className="whitespace-nowrap text-center text-[10px] font-semibold leading-normal tracking-[-0.2px] text-neutral-500">
      {children}
    </span>
  );
}

export function SideMenu() {
  const pathname = usePathname();
  const { openAuth } = useAuth();

  const items = ITEMS.map((item) => {
    const active = Boolean(item.href && pathname.startsWith(item.href));
    if (item.href) {
      return (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={itemClass(active)}
        >
          <Tile active={active} Icon={item.Icon} />
          <Label>{item.label}</Label>
        </Link>
      );
    }
    if (item.action === "account") {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => openAuth("account")}
          className={itemClass(false)}
        >
          <Tile active={false} Icon={item.Icon} />
          <Label>{item.label}</Label>
        </button>
      );
    }
    return (
      <span
        key={item.key}
        aria-disabled="true"
        title="Розділ у розробці"
        className="flex w-[72px] shrink-0 cursor-default flex-col items-center gap-1"
      >
        <Tile active={false} Icon={item.Icon} />
        <Label>{item.label}</Label>
      </span>
    );
  });

  return (
    <>
      <aside className="hidden w-[104px] shrink-0 lg:block">
        <nav
          aria-label="Меню платформи"
          className="sticky top-[var(--site-header-h,92px)] flex flex-col items-center gap-8 px-4 py-8"
        >
          {items}
        </nav>
      </aside>
      <nav
        aria-label="Меню платформи"
        className="scrollbar-hidden flex items-start gap-2 overflow-x-auto px-4 py-3 lg:hidden"
      >
        {items}
      </nav>
    </>
  );
}
