import type { Metadata } from "next";
import { Manrope, Onest } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollUpDock } from "@/components/ScrollUpDock";
import { CartProvider } from "@/components/cart/CartProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PlatformChrome } from "@/components/platform/PlatformChrome";
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
      {/* Design is built against Figma's 1440 master. Between 1024 and
          1440 the `html { zoom: min(1, 100vw/1440px) }` rule in
          globals.css shrinks the page proportionally; at 1440 and
          wider zoom is 1, so type renders at the exact Figma px and
          content is centred in a 1440 column by the growing
          `--lg-pad-x` gutters, while section backgrounds and the hero
          photo bleed edge-to-edge.

          The body itself stays full-width so the document scrolls
          and `position: fixed` elements (mobile menu overlay) anchor
          to the viewport correctly. */}
      <body className="flex min-h-full flex-col bg-white text-neutral-900">
        {/* The cart (Figma «Кошик», 4329:39830) is site-wide: the provider
            keeps the lines in localStorage and mounts the drawer + the
            stock modal after the page, so the header badge, the catalog
            cards and the product page all talk to one cart. */}
        <CartProvider>
          {/* The account area (Figma «Реєстрація», 4573:36735) is site-wide
              too: the header «Увійти» pill opens the sign-up / sign-in
              drawer, the first login shows the welcome modal. */}
          <AuthProvider>
            {/* Signed-in partners see the catalog inside the B2B platform
                shell (Figma «Каталог :: B2B» 4329:56124): PlatformChrome
                swaps the public header, footer and scroll dock for the
                platform header, side rail and legal bar on those routes. */}
            <PlatformChrome
              header={<Header />}
              footer={
                <>
                  <Footer />
                  {/* Single travelling scroll-to-top arrow: appears in the
                      corner on scroll, then glides into its footer slot
                      ([data-scrollup-slot]). */}
                  <ScrollUpDock />
                </>
              }
            >
              {children}
            </PlatformChrome>
          </AuthProvider>
        </CartProvider>
      </body>
    </html>
  );
}
