import type { Metadata } from "next";
import { Manrope, Onest } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollTopFab } from "@/components/ScrollTopFab";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const SITE_URL = "https://binar-2000.com";

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${onest.variable} h-full antialiased`}
    >
      {/* Design is built against Figma's 1440 master. On viewports
          wider than 1440, the `html { zoom: ... }` rule in
          globals.css scales the page up proportionally so the
          layout fills the screen with the same visual proportions
          as the 1440 master - no white margins on big monitors,
          no growing hero photo on big monitors. Below 1440 the
          existing responsive code handles the scale-down.

          The body itself stays full-width so the document scrolls
          and `position: fixed` elements (mobile menu overlay) anchor
          to the viewport correctly. */}
      <body className="flex min-h-full flex-col bg-white text-neutral-900">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
        {/* Global floating scroll-to-top FAB (appears on scroll, hides
            over the footer which has its own copy of the button). */}
        <ScrollTopFab />
      </body>
    </html>
  );
}
