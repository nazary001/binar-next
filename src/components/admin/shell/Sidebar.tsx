"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, navItemOf, type NavCounter, type NavItem } from "../lib/nav";
import { useAdminQuery } from "../lib/query";
import { FOCUS_RING_INSET, TEXT } from "../ui/tokens";
import { AdminLogo } from "./AdminLogo";
import { NavIcon } from "./NavIcon";
import { useStaff } from "./StaffProvider";

// The side menu of the panel: the labelled sibling of the cabinet's icon
// rail. White, on the left of the grey slab; the open page is marked the
// cabinet's way, with a brand-orange icon tile. Lines the role cannot open
// are not rendered; a group left empty disappears with its label.

type Counts = Partial<Record<NavCounter, number>>;

function Counter({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums"
      aria-label={`Потребують уваги: ${value}`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

function Line({ item, active, count, onNavigate }: { item: NavItem; active: boolean; count: number; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex h-11 items-center gap-3 rounded-2xl px-2 transition-colors duration-200",
        FOCUS_RING_INSET,
        active ? "bg-bg-cabinet" : "hover:bg-bg-subtle",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200",
          active ? "bg-brand text-white" : "text-neutral-500 group-hover:text-neutral-900",
        ].join(" ")}
      >
        <NavIcon name={item.icon} />
      </span>
      <span
        className={[
          "truncate text-[14px] leading-5",
          active ? "font-semibold text-neutral-900" : "font-medium text-neutral-700 group-hover:text-neutral-900",
        ].join(" ")}
      >
        {item.label}
      </span>
      <Counter value={count} />
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useStaff();
  const current = navItemOf(pathname);
  const counts = useAdminQuery<{ counts: Counts }>("/nav-counts").data?.counts ?? {};

  const groups = NAV.map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) })).filter(
    (group) => group.items.length > 0,
  );

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex h-[72px] shrink-0 items-center px-5">
        <AdminLogo />
      </div>
      <nav aria-label="Розділи панелі" className="admin-scroll flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((group) => (
          <div key={group.key} className={group.label ? "pt-4" : ""}>
            {group.label && <p className={`${TEXT.caption} px-3 pb-1.5`}>{group.label}</p>}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Line
                    item={item}
                    active={current?.href === item.href}
                    count={item.counter ? (counts[item.counter] ?? 0) : 0}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
