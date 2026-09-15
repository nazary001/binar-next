"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PlatformFooter } from "./PlatformFooter";
import { PlatformHeader } from "./PlatformHeader";
import { SideMenu } from "./SideMenu";

// Which routes belong to the B2B platform once a partner is signed in
// (Figma «Каталог :: B2B» 4329:56124: the catalog family in the
// platform shell - B2B header, side rail, legal bar). Exactly the three
// listing depths that have a B2B skin (CatalogPageView): /catalog,
// /catalog/<direction>, /catalog/<direction>/<category>. The product
// page keeps the public chrome until the «PDP B2B» frames (4329:56628)
// are built - the shell must never wrap a page that was not adapted.
export function isPlatformRoute(pathname: string): boolean {
  return /^\/catalog(\/[^/]+){0,2}\/?$/.test(pathname);
}

// Swaps the marketing chrome (public header, full footer, scroll dock)
// for the platform shell on platform routes while an account is signed
// in. The session lives in localStorage, so the server always renders
// the public chrome and the client switches right after hydration.
export function PlatformChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const platform = Boolean(user) && isPlatformRoute(pathname);

  if (!platform) {
    return (
      <>
        {header}
        <div className="flex flex-1 flex-col">{children}</div>
        {footer}
      </>
    );
  }

  return (
    <>
      <PlatformHeader />
      <div className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
        <SideMenu />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
      <PlatformFooter />
    </>
  );
}
