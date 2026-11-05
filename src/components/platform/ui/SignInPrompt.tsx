"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "./useHydrated";

const COPY = {
  signIn: "Увійти",
  cabinet: "Кабінет",
} as const;

// What visitors and retail (B2C) customers see on a partner-cabinet route
// (orders, returns, dashboard, profile, assortment): the page title, one
// line on where the page lives and «Увійти» («Кабінет» once signed in)
// opening the account drawer. No Figma frame draws it. They get the
// public chrome, so the block sits on the shop gutter (80 at 1710,
// `.lg-shop-pad-x`) under the header logo. The session lives in
// localStorage: nothing renders until the client knows who is signed in,
// so a partner never sees the prompt flash before their cabinet (on
// phones the public <main> reserves the first screen meanwhile).
// Phones (< 640): the master's hero text card without the photo band
// (3082:3246 / 3176:4376): full bleed, 1-px #8e8e8f ring on the top /
// right / bottom, r32 right corners, px 24 py 48, 48 under the header;
// title 30/36 (the cabinet title size), 16, text 16/24 #343435, 32, the
// 42 pill.
export function SignInPrompt({ title, text }: { title: ReactNode; text: ReactNode }) {
  const { user, openAuth } = useAuth();
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return (
    <div className="mt-12 flex flex-col items-start gap-4 rounded-r-[32px] border-y border-r border-stroke-default px-6 py-[47px] lg-shop-pad-x lg:mt-0 lg:gap-6 lg:rounded-none lg:border-0 lg:py-20">
      <h1 className="text-h2 text-neutral-900">{title}</h1>
      <p className="text-[16px] leading-6 text-neutral-800 lg:text-body-sm lg:text-neutral-500">{text}</p>
      <Button type="button" size="responsive" className="max-lg:mt-4" onClick={() => openAuth()}>
        {user ? COPY.cabinet : COPY.signIn}
      </Button>
    </div>
  );
}
