/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FOCUS_RING } from "../ui/tokens";

// The site's logo (the same three SVG parts as components/Logo.tsx) with
// the tag that tells staff they are in the panel. Links to the overview.
export function AdminLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/admin"
      aria-label="Binar: панель керування, огляд"
      className={`inline-flex items-center gap-2.5 rounded-xl ${FOCUS_RING} ${className}`}
    >
      <span className="relative block h-[33.448px] w-[100px] shrink-0">
        <span className="absolute" style={{ inset: "-0.01% 71.18% 0.04% 0" }}>
          <img
            src="/figma-export/logo-part-3.svg"
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 block size-full max-w-none"
          />
        </span>
        <span className="absolute" style={{ inset: "25.44% 0.06% 25.48% 34.12%" }}>
          <img
            src="/figma-export/logo-part-1.svg"
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 block size-full max-w-none"
          />
        </span>
        <span className="absolute" style={{ inset: "85.09% 0 0.04% 83.77%" }}>
          <img
            src="/figma-export/logo-part-2.svg"
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 block size-full max-w-none"
          />
        </span>
      </span>
      <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold leading-[14px] text-white">
        Адмін
      </span>
    </Link>
  );
}
