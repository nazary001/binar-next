"use client";
/* eslint-disable @next/next/no-img-element */
import { CartTrigger, usePublishHeaderHeight } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { ChevronDown16 } from "@/components/catalog/icons";

// «Header :: B2B» — Figma 3888:26393 (1710 x 92): the signed-in shell
// drops the marketing nav; px-32 py-22, the 120-px logo on the left and,
// on the right, a 16-px group of the company «Label» chip and the 48-px
// cart box. Chip (pixel scan of the dashboard render 5052:32106 with
// «Mirotel LTD»: x 1433..1613 = 181 wide): 42 tall, 1-px #343435 ring
// INSIDE the box (so pl-7 / pr-15 + the 1-px border = the master's 8 /
// 16), r70, the 32-px round avatar 8 px before the 16/24 SemiBold
// #343435 name, then 16 px to the 16-px chevron. The chip opens the
// account summary of the auth drawer («Перейти в профіль» -> /profile
// and «Вийти»), like the public header's «Кабінет» pill, so a partner
// can sign out from every cabinet page. On phones the bar keeps the
// public header's 66-px height so the drawers hang from the same edge.
export function PlatformHeader() {
  const { user, open: authOpen, entry: authEntry, openAuth } = useAuth();
  const { count, openCart } = useCart();

  // The drawers hang from `--site-header-h`; the public header that
  // publishes it is unmounted here, and this bar has the same 92 / 66.
  usePublishHeaderHeight();
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
            aria-haspopup="dialog"
            aria-expanded={authOpen && authEntry === "account"}
            aria-label={`Особистий кабінет: ${company}`}
            className="flex h-[42px] cursor-pointer items-center gap-2 rounded-[70px] border border-neutral-800 bg-white pl-[7px] pr-[11px] transition-colors duration-200 hover:bg-bg-subtle lg:gap-4 lg:pr-[15px]"
          >
            <span className="flex min-w-0 items-center gap-2">
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
            </span>
            <ChevronDown16 className="size-4 shrink-0 text-neutral-900" />
          </button>
          <CartTrigger count={count} onOpen={openCart} />
        </div>
      </div>
    </header>
  );
}
