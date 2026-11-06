/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FIGMA_TEXT_BOX } from "@/components/catalog/textBox";

// The platform's legal bar — Figma 4329:56289 (1710 x 54): #1d1d1f,
// px-32 py-12, the 80 x 27 logo + the Onest 12/30 copyright on the
// left, the two underlined Onest 12/30 legal titles on the right. The
// full marketing footer stays on the public pages only.
// Phones (< 640, D1 / legal band 3111:14958 on the cabinet #1d1d1f): px 24
// py 24 gap 24, row 1 = the 29.2 x 33.7 mini logo (44-px hit via the
// pseudo element) + 16 + the Onest 14/30 copyright (wraps at 320), then
// each legal title on its own row (54 pitch).
// The legal documents have no route and no Figma page yet (MATRIX open
// question 13), so the titles render as plain text with the master's
// underline instead of links to /privacy and /terms, which answered 404.
// Turn them back into <Link>s once those pages exist.
// `data-cabinet-behind`: inert while the phone cabinet menu is open.
// `data-canvas-end="dark"`: globals.css paints the phone canvas beyond the
// page's end in this bar's colour (see Footer.tsx).
export function PlatformFooter() {
  return (
    <footer
      data-cabinet-behind
      data-canvas-end="dark"
      className="flex flex-col items-start gap-6 bg-neutral-900 px-6 py-6 text-[14px] leading-[30px] text-white sm:flex-row sm:items-center sm:justify-between lg:gap-2 lg:px-8 lg:py-3 lg:text-[12px]"
      style={{ fontFamily: "var(--font-onest)" }}
    >
      {/* Phones: a strip of the bar's colour pinned behind the page at the
          viewport bottom, the fallback for browsers that anchor fixed
          layers to the visible bottom when the browser bar collapses at
          the page end (see Footer.tsx). */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-48 bg-neutral-900 lg:hidden" />
      <div className="flex items-center gap-4 lg:gap-6">
        <Link
          href="/"
          aria-label="Binar — головна"
          className="relative block h-[33.684px] w-[29.237px] shrink-0 before:absolute before:-inset-x-[7.4px] before:-inset-y-[5.2px] before:content-[''] lg:h-[27px] lg:w-[80px] lg:before:hidden"
        >
          <img
            src="/figma-export/footer-mini-logo.svg"
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 block size-full lg:hidden"
          />
          <span className="absolute max-lg:hidden" style={{ inset: "0 71.18% 0.04% 0" }}>
            <img src="/figma-export/logo-part-3.svg" alt="" aria-hidden decoding="async" className="absolute inset-0 block size-full max-w-none brightness-0 invert" />
          </span>
          <span className="absolute max-lg:hidden" style={{ inset: "25.45% 0.06% 25.47% 34.12%" }}>
            <img src="/figma-export/logo-part-1.svg" alt="" aria-hidden decoding="async" className="absolute inset-0 block size-full max-w-none brightness-0 invert" />
          </span>
          <span className="absolute max-lg:hidden" style={{ inset: "85.1% 0 0.03% 83.77%" }}>
            <img src="/figma-export/logo-part-2.svg" alt="" aria-hidden decoding="async" className="absolute inset-0 block size-full max-w-none brightness-0 invert" />
          </span>
        </Link>
        <p className="lg:whitespace-nowrap">© {new Date().getFullYear()} Binar-2000. All rights reserved</p>
      </div>
      {/* Whole-pixel text boxes (Figma 4329:56312 / 56313: 153 / 157):
          Chrome's Onest runs come out 0.6-0.8 px narrower, which pushed
          this right-aligned pair 1.4 px right of the master. */}
      <div className="flex flex-col items-start gap-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-0">
        <span style={FIGMA_TEXT_BOX} className="whitespace-nowrap underline decoration-white underline-offset-2">
          Політика конфіденційності
        </span>
        <span style={FIGMA_TEXT_BOX} className="whitespace-nowrap underline decoration-white underline-offset-2">
          Угода про публічну оферту
        </span>
      </div>
    </footer>
  );
}
