/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  const pathname = usePathname();

  // When already on `/`, clicking the same-route <Link> is a no-op
  // (Next.js short-circuits navigations to the current path). To make
  // the logo feel like a "back-to-top" affordance, intercept the click
  // on the home route and scroll the window to 0 instead. Other
  // routes fall through to Next's normal client-side navigation, which
  // also resets scroll to 0 on arrival - so the perceived behaviour is
  // uniform: clicking the logo ALWAYS takes you to the top of `/`.
  // `behavior: 'smooth'` mirrors the existing ScrollToTopButton
  // animation so both affordances feel like the same control.
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link
      href="/"
      aria-label="Binar — головна"
      onClick={handleClick}
      className={`group relative block h-[33.448px] w-[100px] shrink-0 cursor-pointer lg:h-[40px] lg:w-[120px] ${className ?? ""}`}
    >
      <div
        className="absolute"
        style={{ inset: "-0.01% 71.18% 0.04% 0" }}
      >
        <img
          src="/figma-export/logo-part-3.svg"
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 block size-full max-w-none"
        />
      </div>
      <div
        className="absolute"
        style={{ inset: "25.44% 0.06% 25.48% 34.12%" }}
      >
        <img
          src="/figma-export/logo-part-1.svg"
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 block size-full max-w-none"
        />
      </div>
      <div
        className="absolute"
        style={{ inset: "85.09% 0 0.04% 83.77%" }}
      >
        <img
          src="/figma-export/logo-part-2.svg"
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 block size-full max-w-none"
        />
      </div>
      <span className="sr-only">Binar</span>
    </Link>
  );
}
