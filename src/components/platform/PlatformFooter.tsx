/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FIGMA_TEXT_BOX } from "@/components/catalog/textBox";

// The platform's legal bar — Figma 4329:56289 (1710 x 54): #1d1d1f,
// px-32 py-12, the 80 x 27 logo + the Onest 12/30 copyright on the
// left, the two underlined Onest 12/30 legal titles on the right. The
// full marketing footer stays on the public pages only.
// The legal documents have no route and no Figma page yet (MATRIX open
// question 13), so the titles render as plain text with the master's
// underline instead of links to /privacy and /terms, which answered 404.
// Turn them back into <Link>s once those pages exist.
export function PlatformFooter() {
  return (
    <footer
      className="flex flex-col gap-2 bg-neutral-900 px-6 py-3 text-[12px] leading-[30px] text-white sm:flex-row sm:items-center sm:justify-between lg:px-8"
      style={{ fontFamily: "var(--font-onest)" }}
    >
      <div className="flex items-center gap-6">
        <Link href="/" aria-label="Binar — головна" className="relative block h-[27px] w-[80px] shrink-0">
          <span className="absolute" style={{ inset: "0 71.18% 0.04% 0" }}>
            <img src="/figma-export/logo-part-3.svg" alt="" aria-hidden decoding="async" className="absolute inset-0 block size-full max-w-none brightness-0 invert" />
          </span>
          <span className="absolute" style={{ inset: "25.45% 0.06% 25.47% 34.12%" }}>
            <img src="/figma-export/logo-part-1.svg" alt="" aria-hidden decoding="async" className="absolute inset-0 block size-full max-w-none brightness-0 invert" />
          </span>
          <span className="absolute" style={{ inset: "85.1% 0 0.03% 83.77%" }}>
            <img src="/figma-export/logo-part-2.svg" alt="" aria-hidden decoding="async" className="absolute inset-0 block size-full max-w-none brightness-0 invert" />
          </span>
        </Link>
        <p className="whitespace-nowrap">© {new Date().getFullYear()} Binar-2000. All rights reserved</p>
      </div>
      {/* Whole-pixel text boxes (Figma 4329:56312 / 56313: 153 / 157):
          Chrome's Onest runs come out 0.6-0.8 px narrower, which pushed
          this right-aligned pair 1.4 px right of the master. */}
      <div className="flex flex-wrap items-center gap-x-6">
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
