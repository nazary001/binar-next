"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { CabinetPage, CabinetPageHead, SignInPrompt } from "@/components/platform/ui";
import { DETAILS_PROMPT_TEXT } from "./data";

const COPY = {
  back: "До замовлень",
  title: "Замовлення не знайдено",
  promptTitle: "Деталі замовлення",
  text: "Перевірте номер у посиланні або знайдіть замовлення в списку.",
  action: "Усі замовлення",
} as const;

// Phone panel under a "not found" head (TR-24 without its Title Large:
// the H2 above already names the state): white r32 on the slab, py 48
// px 24, the 14/20 hint, 32, one hug Button/Small link. Desktop keeps the
// bare head (the panel is lg:hidden).
export function NotFoundPanel({ text, action }: { text: string; action: { label: string; href: string } }) {
  return (
    <div className="px-6 lg:hidden">
      <div className="flex flex-col items-center rounded-[32px] bg-white px-6 py-12 text-center">
        <p className="max-w-[294px] text-pretty text-[14px] leading-5 text-neutral-500">{text}</p>
        <Button size="small" arrow href={action.href} className="mt-8">
          {action.label}
        </Button>
      </div>
    </div>
  );
}

// An order this partner cannot see (another partner's id, or an id that
// does not exist: src/app/orders/[id]/not-found.tsx renders this for the
// 404). Visitors and retail customers get the cabinet sign-in prompt.
export function OrderNotFound() {
  const { user } = useAuth();
  if (user?.type !== "b2b") return <SignInPrompt title={COPY.promptTitle} text={DETAILS_PROMPT_TEXT} />;
  return (
    <CabinetPage>
      <CabinetPageHead back={{ label: COPY.back, href: "/orders" }} title={COPY.title} />
      <NotFoundPanel text={COPY.text} action={{ label: COPY.action, href: "/orders" }} />
    </CabinetPage>
  );
}
