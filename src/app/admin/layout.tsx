import type { Metadata } from "next";

// The staff area. Everything under /admin:
// - is never indexed (metadata here, "X-Robots-Tag" in next.config.ts,
//   "Disallow" in robots.ts);
// - is rendered per request (the pages read the staff session cookie);
// - renders at zoom 1 with its own shell: the `data-admin` wrapper switches
//   the storefront's canvas zoom off (globals.css) and PlatformChrome
//   renders no public header or footer around it.
export const metadata: Metadata = {
  title: { default: "Панель керування", template: "%s · Панель Binar" },
  description: "Панель керування сайтом Binar 2000.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-admin className="flex min-h-dvh w-full flex-1 flex-col bg-white text-[14px] leading-5 text-neutral-900">
      {children}
    </div>
  );
}
