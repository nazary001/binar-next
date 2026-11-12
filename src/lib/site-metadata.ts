import type { Metadata } from "next";

// What the public site says about itself to search engines and to the
// networks a link is shared in. Two files export it as their `metadata`:
// the layout of the site's pages (src/app/(site)/layout.tsx) and the page
// an unknown address gets (src/app/global-not-found.tsx). The staff area
// never does.
const SITE_URL = "https://binar-2000.com";

export const SITE_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Binar 2000 — готельний текстиль, ЗІЗ та засоби прибирання",
    template: "%s | Binar 2000",
  },
  description:
    "B2B-постачання одноразової продукції, ЗІЗ та засобів прибирання для готелів, HoReCa, медицини, виробництв та клінінгу. Кастомізація під бренд готелю з 2000 року.",
  keywords: [
    "готельний текстиль",
    "тапочки для готелів",
    "готельна косметика",
    "ЗІЗ",
    "засоби прибирання",
    "B2B постачальник",
    "Binar 2000",
  ],
  applicationName: "Binar 2000",
  authors: [{ name: "Binar 2000" }],
  creator: "Binar 2000",
  publisher: "Binar 2000",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: SITE_URL,
    siteName: "Binar 2000",
    title: "Binar 2000 — готельний текстиль, ЗІЗ та засоби прибирання",
    description:
      "B2B-постачання одноразової продукції, ЗІЗ та засобів прибирання для готелів, HoReCa, медицини та виробництв. Кастомізація під бренд готелю.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Binar 2000",
    description:
      "B2B-постачання одноразової продукції, ЗІЗ та засобів прибирання для готелів, HoReCa, медицини та виробництв.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};
