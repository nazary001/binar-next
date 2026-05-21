/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Binar — головна"
      className={`group relative block h-[40px] w-[120px] shrink-0 cursor-pointer transition-opacity duration-300 hover:opacity-80 ${className ?? ""}`}
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
