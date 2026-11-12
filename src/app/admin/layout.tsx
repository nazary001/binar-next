import type { Metadata } from "next";
import { Document } from "../document";

// The staff area is its own document: this is a root layout (the app has no
// layout above its parts), so nothing of the storefront is rendered or sent
// here: no catalog registry, cart, customer session, public header or
// footer, and none of the site's search metadata. Going from the panel to
// the site (or back) is a full page load. Everything under /admin:
// - is never indexed (metadata here, "X-Robots-Tag" in next.config.ts,
//   "Disallow" in robots.ts);
// - is rendered per request: the pages read the staff session cookie, and
//   the Content-Security-Policy of src/proxy.ts carries a nonce that Next
//   can only put on its scripts while it renders the answer;
// - renders at zoom 1 with its own shell: the `data-admin` wrapper switches
//   the storefront's canvas zoom off (globals.css).
export const metadata: Metadata = {
  title: { default: "Панель керування", template: "%s · Панель Binar" },
  description: "Панель керування сайтом Binar 2000.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Document>
      <div data-admin className="flex min-h-dvh w-full flex-1 flex-col bg-white text-[14px] leading-5 text-neutral-900">
        {children}
      </div>
    </Document>
  );
}
