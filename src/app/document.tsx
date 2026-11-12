import { Manrope, Onest } from "next/font/google";
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

// The bare document every part of the app is drawn in: <html>, <body>, the
// two font families and the stylesheet. The app has no layout above its
// parts on purpose, so each of them renders this itself:
// - the public site and the customer cabinet (src/app/(site)/layout.tsx);
// - the staff area (src/app/admin/layout.tsx);
// - the page of an unknown address (src/app/global-not-found.tsx).
export function Document({ children }: Readonly<{ children: React.ReactNode }>) {
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
      <body className="flex min-h-full flex-col bg-white text-neutral-900">{children}</body>
    </html>
  );
}
