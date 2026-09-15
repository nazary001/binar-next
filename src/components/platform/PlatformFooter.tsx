/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

// The platform's legal bar — Figma 4329:56289 (1710 x 54): #1d1d1f,
// px-32 py-12, the 80 x 27 logo + the Onest 12/30 copyright on the
// left, the two underlined Onest 12/30 links on the right. The full
// marketing footer stays on the public pages only.
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
      <div className="flex flex-wrap items-center gap-x-6">
        <Link href="/privacy" className="cursor-pointer whitespace-nowrap underline decoration-white underline-offset-2">
          Політика конфіденційності
        </Link>
        <Link href="/terms" className="cursor-pointer whitespace-nowrap underline decoration-white underline-offset-2">
          Угода про публічну оферту
        </Link>
      </div>
    </footer>
  );
}
