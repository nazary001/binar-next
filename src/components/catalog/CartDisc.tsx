"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { DetailsCircleText } from "@/components/ui/DetailsIconButton";
import { RollingNumber } from "@/components/ui/RollingNumber";

const bubbleCount = (n: number) => (n > 99 ? "99+" : String(n));

// Feedback of the 52-px cart discs on the catalog cards and rows (B2C
// CartButton, B2B B2BCartButton):
// - a tap pops the disc (scale 1 -> 0.86 -> 1.1 -> 1, 480 ms) while the
//   cart glyph shrinks away and a check draws itself in (stroke dash,
//   360 ms);
// - as long as the product stays in the cart the disc keeps the brand
//   fill, the white check and a dark count bubble (the header badge
//   idiom) with the quantity in the cart, so the catalog shows what is
//   already taken;
// - another tap adds more and replays the pop; the bubble pops on every
//   change of the count.
// The resting state is plain CSS (so it survives reloads: the cart lives
// in localStorage); the pop runs through the Web Animations API, which
// restarts cleanly on every tap without remounting the button (keyboard
// focus stays). Reduced motion: no pop / draw, the layers switch with
// no transition.

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// How many of `id` the cart holds (0 when absent). Server snapshot 0;
// the client updates right after hydration, like the header badge.
export function useInCartQty(id: string): number {
  const { lines } = useCart();
  return lines.find((l) => l.id === id)?.qty ?? 0;
}

// Wires a disc: `inCart` for the resting look, `ref` for the button,
// `pop()` to call after an add (the animations run after the commit, so
// the fresh bubble exists when they start).
export function useCartDisc(id: string): {
  inCart: number;
  ref: RefObject<HTMLButtonElement | null>;
  pop: () => void;
} {
  const inCart = useInCartQty(id);
  const ref = useRef<HTMLButtonElement>(null);
  const [tick, setTick] = useState(0);
  const pop = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    const el = ref.current;
    if (tick === 0 || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.86)", offset: 0.35 },
        { transform: "scale(1.1)", offset: 0.7 },
        { transform: "scale(1)" },
      ],
      { duration: 480, easing: "ease-out" },
    );
    el.querySelector<SVGPathElement>("[data-check-path]")?.animate(
      [{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }],
      { duration: 360, delay: 90, easing: "ease-out", fill: "backwards" },
    );
    el.querySelector<HTMLElement>("[data-cart-badge]")?.animate(
      [
        { transform: "scale(0.4)", opacity: 0 },
        { transform: "scale(1.2)", opacity: 1, offset: 0.6 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 420, delay: 60, easing: SPRING, fill: "backwards" },
    );
  }, [tick]);
  return { inCart, ref, pop };
}

// Accessible name of a disc: plain add, or "add more" with the count.
export function cartDiscLabel(title: string, inCart: number, preorder = false): string {
  if (inCart > 0) return `Додати ще «${title}» в кошик, у кошику: ${inCart}`;
  return preorder ? `Замовити «${title}» під замовлення` : `Додати «${title}» в кошик`;
}

// The in-cart look of a disc on any tone (hover gives the same fill).
export const CART_DISC_IN_CART = "border-brand bg-brand text-white";

// The hover look of a disc, on the disc itself only (designer
// 2026-11-11: the hover zone is the button, not the whole card or row):
// brand fill, white glyph (2766:4534). Tailwind gates `hover:` behind
// `(hover: hover)`, so touch screens never keep it after a tap. A disc
// button carries `group/disc` for the ring below.
export const CART_DISC_HOVER = "hover:border-brand hover:bg-brand hover:text-white";

// The rotating «У КОШИК» ring of the hover state (2766:4534): the Figma
// text-path I2766:4586;1127:5860 is a radius-36 circle around the 52-px
// disc, the same «Icon button decorative» family as the «ДЕТАЛІ» ring
// (ui/DetailsIconButton.tsx: 9-px Regular, a 14-s spin that stops under
// reduced motion). It fades in while the pointer is on the disc or the disc has
// keyboard focus, in-cart discs included; it never takes the pointer.
// Render it as the button's FIRST child so the count bubble paints above.
// `tone="light"` = the white ring of the dark band.
const CART_RING_TEXT = "У КОШИК · У КОШИК · У КОШИК · У КОШИК · ";

export function CartDiscRing({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -inset-[18px] opacity-0 transition-opacity duration-300 group-hover/disc:opacity-100 group-focus-visible/disc:opacity-100 motion-reduce:transition-none"
    >
      <DetailsCircleText variant={tone} text={CART_RING_TEXT} radius={36} />
    </span>
  );
}

// 24-px check: a 2.25-px round stroke; `pathLength` 24 lets the draw
// animation run the dash offset from 24 (hidden) to 0 (drawn).
function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        data-check-path
        d="M5.5 12.5L9.75 16.75L18.5 7.75"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={24}
        style={{ strokeDasharray: 24 }}
      />
    </svg>
  );
}

const LAYER =
  "absolute inset-0 flex items-center justify-center transition-[scale,opacity] duration-300 ease-out motion-reduce:transition-none";

// The body of a disc button (the button itself keeps its size, ring and
// fill classes and must be `relative`): the idle glyph and the check
// cross-fade on the same centre; the count bubble sits on the top-right
// edge. `tone="light"` = the disc on a dark band (the bubble inverts).
export function CartDiscBody({
  inCart,
  idle,
  tone = "dark",
}: {
  inCart: number;
  idle: ReactNode;
  tone?: "dark" | "light";
}) {
  const added = inCart > 0;
  return (
    <>
      <span className={`${LAYER} ${added ? "scale-50 opacity-0" : "scale-100 opacity-100"}`}>{idle}</span>
      <span className={`${LAYER} ${added ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
        <CheckGlyph className="size-6" />
      </span>
      {added && (
        <span
          data-cart-badge
          className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] px-1 text-[12px] font-bold leading-none ${
            tone === "light"
              ? "border-neutral-900 bg-white text-neutral-900"
              : "border-white bg-neutral-900 text-white"
          }`}
        >
          <RollingNumber value={inCart} format={bubbleCount} />
        </span>
      )}
    </>
  );
}
