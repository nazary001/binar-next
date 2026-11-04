"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AUTH_STORAGE_KEY } from "@/components/auth/data";
import { PlatformFooter } from "./PlatformFooter";
import { PlatformHeader } from "./PlatformHeader";
import { SideMenu } from "./SideMenu";
import { useHydrated } from "./ui/useHydrated";

// Which routes belong to the B2B platform once a partner is signed in:
// - the catalog family with a B2B skin (Figma «Каталог :: B2B» 4329:56124
//   and «PDP B2B» 4329:56628): /catalog, /catalog/<direction>,
//   /catalog/<direction>/<category> (CatalogPageView) and the product
//   page /catalog/<direction>/<category>/<product> (ProductPageView);
// - the cabinet (Figma «Admin» 5052:31506): /dashboard, /orders and
//   everything under it (order details, returns), /profile, /assortment
//   («Мій асортимент» 4209:74148), /materials and its folders
//   («Матеріали B2B» 4593:59619);
// - /ui-gallery, the dev gallery of the shared cabinet atoms (dev
//   builds only: the page itself answers 404 in production).
// A visitor or B2C customer on any of them keeps the public chrome.
const PLATFORM_SECTIONS = [
  String.raw`catalog(?:\/[^/]+){0,3}`,
  String.raw`orders(?:\/[^/]+)*`,
  String.raw`dashboard(?:\/[^/]+)*`,
  String.raw`profile(?:\/[^/]+)*`,
  String.raw`assortment(?:\/[^/]+)*`,
  String.raw`materials(?:\/[^/]+)*`,
  ...(process.env.NODE_ENV === "production" ? [] : ["ui-gallery"]),
];
const PLATFORM_ROUTE = new RegExp(String.raw`^\/(?:${PLATFORM_SECTIONS.join("|")})\/?$`);

export function isPlatformRoute(pathname: string): boolean {
  return PLATFORM_ROUTE.test(pathname);
}

// The session lives in localStorage, so the server always renders the
// public chrome and the client swaps to the platform shell right after
// hydration - which used to flash the B2C header / page for a partner.
// This inline script (first child of <body>, runs while the HTML is
// parsed, before anything below it paints) mirrors store.ts readStorage:
// on a platform route with a signed-in B2B session (an account without
// a type counts as B2B, like store.ts withType) it adds a style that hides
// every later <body> child. PlatformChrome removes it in the first
// effect after hydration - by then the auth store has switched to the
// session and the platform shell is in the DOM. Visitors and B2C
// customers never get the style; a 4-s timeout un-hides the page if the
// app never hydrates.
// The <script> exists only in the server HTML: React warns when it has
// to create a script element on the client (it never runs there), which
// happened whenever a notFound() boundary re-rendered the root tree on
// the client. `fromServer` is true while React hydrates the server
// markup (server snapshot) and false on any client-only mount; the state
// keeps the hydrated script mounted afterwards, so the sibling selector
// of the gate style keeps matching until the effect below removes it.
const GATE_ID = "platform-gate";
const GATE_STYLE_ID = "platform-gate-style";
const GATE_SCRIPT = `(function(){try{if(!new RegExp(${JSON.stringify(
  PLATFORM_ROUTE.source,
)}).test(location.pathname))return;var raw=localStorage.getItem(${JSON.stringify(
  AUTH_STORAGE_KEY,
)});if(!raw)return;var s=JSON.parse(raw);if(!s||typeof s.sessionId!=="string"||!Array.isArray(s.accounts))return;var a=null;for(var i=0;i<s.accounts.length;i++){var x=s.accounts[i];if(x&&typeof x==="object"&&x.id===s.sessionId&&typeof x.phone==="string"&&typeof x.login==="string"&&typeof x.passwordHash==="string"&&x.company&&typeof x.company==="object"&&x.person&&typeof x.person==="object"){a=x;break;}}if(!a||a.type==="b2c")return;var st=document.createElement("style");st.id="${GATE_STYLE_ID}";st.textContent="#${GATE_ID}~*{visibility:hidden!important}";document.head.appendChild(st);setTimeout(function(){st.remove();},4000);}catch(e){}})();`;

const noopSubscribe = () => () => {};

function PlatformGate() {
  const fromServer = useSyncExternalStore(
    noopSubscribe,
    () => false,
    () => true,
  );
  const [render] = useState(fromServer);
  if (!render) return null;
  return (
    <script
      id={GATE_ID}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }}
    />
  );
}

// Swaps the marketing chrome (public header, full footer, scroll dock)
// for the platform shell on platform routes while a partner (B2B
// account) is signed in; a B2C customer keeps the public chrome.
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
  const hydrated = useHydrated();
  const platform = user?.type === "b2b" && isPlatformRoute(pathname);

  useEffect(() => {
    if (hydrated) document.getElementById(GATE_STYLE_ID)?.remove();
  }, [hydrated]);

  if (!platform) {
    return (
      <>
        <PlatformGate />
        {header}
        {/* The only <main> landmark on public routes: pages render a plain
            <div> root, so it exists in the server HTML for visitors and
            B2C customers too. */}
        <main className="flex flex-1 flex-col">{children}</main>
        {footer}
      </>
    );
  }

  return (
    <>
      <PlatformGate />
      <PlatformHeader />
      <div className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
        <SideMenu />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
      <PlatformFooter />
    </>
  );
}
