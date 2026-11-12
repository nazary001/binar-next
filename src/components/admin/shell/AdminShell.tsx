"use client";

import { ArrowTopRightOnSquareIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { StaffMe } from "../lib/permissions";
import { lockScroll } from "../ui/overlay";
import { EASE_OUT, FOCUS_RING, SCRIM, Z } from "../ui/tokens";
import { AdminLogo } from "./AdminLogo";
import { Sidebar } from "./Sidebar";
import { StaffProvider } from "./StaffProvider";
import { UserMenu } from "./UserMenu";

// The frame of every panel page: the white side menu and top bar, and the
// grey slab with the large rounded top-left corner the pages sit on (the
// cabinet's signature shape).
//
//   +----------+----------------------------------------------+
//   | logo     |  [menu]                    site link   user  |
//   | menu     +----------------------------------------------+
//   |          | (slab, rounded top-left)                     |
//   |          |   page                                       |
//   +----------+----------------------------------------------+
//
// From 1024 px the menu is a fixed column; below that it is a drawer
// opened from the top bar. `slots` lets the kit plug the global search and
// the layers every page shares (toasts, dialogs) without this file knowing
// them.
//
// Printing: the side menu, the top bar, the phone menu and the toasts
// carry `data-print-hide` and are left out of a printed page; a page can
// mark its own chrome the same way (a toolbar, the buttons over a
// document): one print rule on the shell hides every [data-print-hide].

export type ShellSlots = {
  // Rendered in the top bar between the menu button and the account chip.
  search?: ReactNode;
  // Rendered once, after the page (toast host, confirm dialog host, ...).
  layers?: ReactNode;
};

const ICON_BUTTON = `flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-800 transition-colors duration-200 hover:bg-bg-subtle ${FOCUS_RING}`;

export function AdminShell({ me, slots, children }: { me: StaffMe; slots?: ShellSlots; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // A page change closes the drawer in the same commit as the new page.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setMenuOpen(false);
  }

  // The drawer: Escape closes it, and the page behind does not scroll.
  // The kit's lock is shared with every other layer (it counts its
  // holders and sits on <html>, never on <body>: the storefront's rule),
  // so a dialog opened over the drawer and the drawer never undo each
  // other's lock.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const release = lockScroll();
    document.addEventListener("keydown", onKey);
    return () => {
      release();
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <StaffProvider me={me}>
      <div className="flex min-h-dvh w-full bg-white text-neutral-900 print:block print:min-h-0 print:[&_[data-print-hide]]:hidden">
        {/* Desktop menu: a fixed column. */}
        <aside data-print-hide="" className="sticky top-0 hidden h-dvh w-[264px] shrink-0 min-[1024px]:block print:hidden">
          <Sidebar />
        </aside>

        {/* Phone / tablet menu: a drawer. Always in the DOM so it can slide. */}
        <div
          data-print-hide=""
          className={`fixed inset-0 min-[1024px]:hidden print:hidden ${Z.sidebar} ${menuOpen ? "" : "pointer-events-none"}`}
          aria-hidden={!menuOpen}
          inert={!menuOpen}
        >
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${SCRIM} ${menuOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Меню панелі"
            className={`absolute inset-y-0 left-0 w-[288px] max-w-[86vw] overflow-hidden rounded-r-3xl bg-white transition-[translate] duration-[400ms] ${EASE_OUT} ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <Sidebar onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              aria-label="Закрити меню"
              onClick={() => setMenuOpen(false)}
              className={`absolute right-3 top-4 ${ICON_BUTTON}`}
            >
              <XMarkIcon aria-hidden className="size-6" strokeWidth={1.7} />
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            data-print-hide=""
            className={`sticky top-0 flex h-[72px] shrink-0 items-center gap-3 bg-white px-4 min-[1024px]:px-8 print:hidden ${Z.topbar}`}
          >
            <button
              type="button"
              aria-label="Відкрити меню"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className={`min-[1024px]:hidden ${ICON_BUTTON}`}
            >
              <Bars3Icon aria-hidden className="size-6" strokeWidth={1.7} />
            </button>
            <AdminLogo className="min-[1024px]:hidden max-[479px]:hidden" />
            <div className="flex min-w-0 flex-1 items-center">{slots?.search}</div>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className={`hidden h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium leading-5 text-neutral-800 transition-colors duration-200 hover:bg-bg-subtle min-[640px]:inline-flex ${FOCUS_RING}`}
            >
              Відкрити сайт
              <ArrowTopRightOnSquareIcon aria-hidden className="size-[18px]" strokeWidth={1.7} />
            </a>
            <UserMenu />
          </header>

          <main className="flex min-w-0 flex-1 flex-col bg-bg-cabinet min-[1024px]:rounded-tl-[40px]">{children}</main>
        </div>
      </div>
      {slots?.layers}
    </StaffProvider>
  );
}
