/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

// The frame of the pages a member of staff sees before the panel opens
// (sign in, first password): the form on the right, and on the left a dark
// tile with the site's large rounded corner and one orange disc, the shapes
// the storefront is drawn with. The tile is decoration: phones show only
// the form.

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block h-[40px] w-[120px] shrink-0 ${className}`}>
      <span className="absolute" style={{ inset: "-0.01% 71.18% 0.04% 0" }}>
        <img src="/figma-export/logo-part-3.svg" alt="" aria-hidden className="absolute inset-0 block size-full max-w-none" />
      </span>
      <span className="absolute" style={{ inset: "25.44% 0.06% 25.48% 34.12%" }}>
        <img src="/figma-export/logo-part-1.svg" alt="" aria-hidden className="absolute inset-0 block size-full max-w-none" />
      </span>
      <span className="absolute" style={{ inset: "85.09% 0 0.04% 83.77%" }}>
        <img src="/figma-export/logo-part-2.svg" alt="" aria-hidden className="absolute inset-0 block size-full max-w-none" />
      </span>
    </span>
  );
}

export function AuthFrame({ title, lead, children }: { title: ReactNode; lead: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full bg-white">
      <div className="relative hidden w-[46%] max-w-[720px] shrink-0 overflow-hidden rounded-br-[64px] bg-neutral-900 min-[1024px]:flex min-[1024px]:flex-col min-[1024px]:justify-between min-[1024px]:p-12">
        <div aria-hidden className="absolute -bottom-[260px] -right-[260px] size-[520px] rounded-full bg-brand" />
        <div aria-hidden className="absolute -bottom-[160px] -right-[160px] size-[320px] rounded-full bg-neutral-900" />
        {/* The logo's dark parts turn white on the dark tile. */}
        <LogoMark className="relative brightness-0 invert" />
        {/* Narrow enough to stay clear of the disc at every width. */}
        <div className="relative max-w-[320px]">
          <p className="text-[52px] font-bold leading-[56px] tracking-[-0.02em] text-white">
            Панель <span className="font-light">керування</span>
          </p>
          <p className="mt-5 text-[18px] leading-7 text-neutral-300">
            Замовлення, каталог, клієнти та контент сайту Binar 2000 в одному місці.
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          <LogoMark className="mb-10 min-[1024px]:hidden" />
          <h1 className="text-[28px] font-bold leading-9 tracking-[-0.02em] text-neutral-900">{title}</h1>
          <p className="mt-2 text-[15px] leading-[22px] text-neutral-500">{lead}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

// The field of these two forms: a label above a 48-px pill.
export const AUTH_LABEL = "mb-1.5 block text-[13px] font-semibold leading-[18px] text-neutral-800";
export const AUTH_INPUT =
  "h-12 w-full rounded-full border border-stroke-subtle bg-white px-5 text-[15px] leading-[22px] text-neutral-900 " +
  "placeholder:text-neutral-400 transition-colors duration-200 hover:border-neutral-400 " +
  "focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand aria-invalid:border-negative";
export const AUTH_SUBMIT =
  "flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-transparent bg-neutral-900 px-6 " +
  "text-[16px] font-semibold leading-[22px] text-white transition-colors duration-300 " +
  "hover:border-neutral-900 hover:bg-white hover:text-neutral-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-button-disabled disabled:text-neutral-300";
export const AUTH_ERROR = "rounded-2xl bg-[#fff0f0] px-4 py-3 text-[14px] leading-5 text-[#b33a3a]";
