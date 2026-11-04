"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "./useHydrated";

// What visitors and retail (B2C) customers see on a partner-cabinet route
// (orders, returns, dashboard, profile, assortment): the page title, one
// line on where the page lives and «Увійти» («Кабінет» once signed in)
// opening the account drawer. No Figma frame draws it. They get the
// public chrome, so the block sits on the shop gutter (80 at 1710,
// `.lg-shop-pad-x`) under the header logo. The session lives in
// localStorage: nothing renders until the client knows who is signed in,
// so a partner never sees the prompt flash before their cabinet.
export function SignInPrompt({ title, text }: { title: ReactNode; text: ReactNode }) {
  const { user, openAuth } = useAuth();
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return (
    <div className="flex flex-col items-start gap-6 px-6 py-12 lg-shop-pad-x lg:py-20">
      <h1 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]">
        {title}
      </h1>
      <p className="text-body-sm text-neutral-500">{text}</p>
      <Button type="button" size="responsive" onClick={() => openAuth()}>
        {user ? "Кабінет" : "Увійти"}
      </Button>
    </div>
  );
}
