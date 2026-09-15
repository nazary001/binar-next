"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import { CartTrigger } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { ChevronDown16 } from "@/components/catalog/icons";

// «Header :: B2B» — Figma 3888:26393 (1710 x 92): the signed-in shell
// drops the marketing nav; px-32 py-22, the 120-px logo on the left and,
// on the right, a 16-px group of the company «Label» chip (42 tall,
// 1-px #343435 ring, r70, pl-8 pr-16, 32-px round avatar, 16/24
// SemiBold #343435 name, 16-px chevron) and the 48-px cart box. The
// chip opens the account summary in the drawer; on phones the bar keeps
// the public header's 66-px height so the drawers hang from the same
// edge.
export function PlatformHeader() {
  const { user, openAuth } = useAuth();
  const { count, openCart } = useCart();

  // The drawers hang from `--site-header-h` (see Header.tsx). The public
  // header publishes it, but it is unmounted here, so the platform bar
  // keeps the variable in step with its own 92 / 66 heights.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () =>
      document.documentElement.style.setProperty(
        "--site-header-h",
        mq.matches ? "92px" : "66px",
      );
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const company = user?.company.name ?? "";
  const initials = company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="flex h-[66px] items-center justify-between px-6 lg:h-[92px] lg:px-8">
        <Logo />
        <div className="flex items-center gap-2 lg:gap-4">
          <button
            type="button"
            onClick={() => openAuth("account")}
            aria-label={`Особистий кабінет: ${company}`}
            className="flex h-[42px] cursor-pointer items-center gap-2 rounded-[70px] border border-neutral-800 bg-white py-2 pl-2 pr-3 transition-colors duration-200 hover:bg-bg-subtle lg:gap-4 lg:pr-4"
          >
            <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-[12px] font-bold leading-none text-white">
              {user?.logo ? (
                <img src={user.logo} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className="hidden max-w-[220px] truncate text-[16px] font-semibold leading-6 text-neutral-800 sm:block">
              {company}
            </span>
            <ChevronDown16 className="size-4 shrink-0 text-neutral-900" />
          </button>
          <CartTrigger count={count} onOpen={openCart} />
        </div>
      </div>
    </header>
  );
}
