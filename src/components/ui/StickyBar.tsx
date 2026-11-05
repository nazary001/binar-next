"use client";

import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";

// Phone bottom bar (system spec A13, TR-18) for a primary action that would
// otherwise be off-screen: the assortment selection bar, the PDP buy bar.
// Light = white with a 1-px #d2d2d2 top line, square; dark = #1d1d1f with
// r32 top corners (the desktop identity of every shop dark band: cart
// summary, checkout summary, order TotalCard). Phone only (lg:hidden).
// DECISIONS O-16: no env(safe-area-inset-*) terms; plain px paddings.
export const STICKY_BAR_LIGHT =
  "z-30 border-t border-stroke-subtle bg-white px-6 pt-[15px] pb-4 lg:hidden";
export const STICKY_BAR_DARK =
  "z-30 rounded-t-[32px] bg-neutral-900 px-6 pt-6 pb-6 text-white lg:hidden";
// One summary anatomy for every total on dark: label stacked over the
// amount, 8 apart (`flex flex-col gap-2`).
export const SUMMARY_LABEL = "text-[14px] font-medium leading-5 text-neutral-400";
export const SUMMARY_AMOUNT =
  "whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-white";

const POSITION = {
  // Inside the page flow (the assortment slab, a scroller with mt-auto).
  sticky: "sticky bottom-0 [@media(max-height:499px)]:static",
  // Over the page; hidden on short viewports (its in-flow CTA exists).
  fixed: "fixed inset-x-0 bottom-0 [@media(max-height:499px)]:hidden",
} as const;

const MOTION =
  "transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
const HIDDEN = "pointer-events-none translate-y-full opacity-0";

// The bar publishes its height as --phone-bottom-bar on <html> while it is
// shown AND covers the viewport bottom (a fixed bar, or a sticky bar that
// is stuck right now, not one still below the fold): the toast host sits
// above it and globals.css turns
// it into `scroll-padding-bottom` on shop / cabinet phones, so keyboard
// focus never lands under the bar (WCAG 2.4.11). With several covering
// bars the tallest one is published, until the last one stops covering.
const VAR = "--phone-bottom-bar";
const covering = new Map<HTMLElement, number>();

function publish(el: HTMLElement, height: number | null) {
  if (height === null) covering.delete(el);
  else covering.set(el, Math.round(height));
  const root = document.documentElement;
  const value = covering.size > 0 ? `${Math.max(...covering.values())}px` : "";
  if (root.style.getPropertyValue(VAR) === value) return;
  if (value) root.style.setProperty(VAR, value);
  else root.style.removeProperty(VAR);
}

// The vertical part of the element's own `translate` in px. Chromium
// reports the hidden state and the running transition as a percentage of
// the box ("0px 100%", "0px 56.18%"), the rest state as "none".
function ownTranslateY(cs: CSSStyleDeclaration, height: number): number {
  const y = cs.translate.split(" ")[1];
  if (!y) return 0;
  const n = parseFloat(y);
  if (Number.isNaN(n)) return 0;
  return y.endsWith("%") ? (n * height) / 100 : n;
}

export type StickyBarProps = {
  tone: "light" | "dark";
  position: "sticky" | "fixed";
  // Default true. A hidden bar slides down + fades out and turns inert.
  show?: boolean;
  // Accessible name of the region ("Дії з вибраними", "Купити").
  label: string;
  barRef?: Ref<HTMLDivElement>;
  className?: string;
  children: ReactNode;
};

export function StickyBar({
  tone,
  position,
  show = true,
  label,
  barRef,
  className = "",
  children,
}: StickyBarProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(barRef, () => elRef.current as HTMLDivElement, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (!show) {
      publish(el, null);
      return;
    }
    // Covers = rendered and pinned to the viewport bottom: fixed, or sticky
    // and stuck right now. A sticky bar covers nothing while it sits in
    // flow above the bottom edge, nor while its natural place is still
    // below the fold (its container starts further down the page). The
    // box is measured without its own translate, so the show / hide motion
    // (up to 100 % of its height) does not count.
    const measure = () => {
      const cs = getComputedStyle(el);
      let covers = false;
      if (cs.display !== "none") {
        if (cs.position === "fixed") {
          covers = true;
        } else if (cs.position === "sticky") {
          const r = el.getBoundingClientRect();
          const ty = ownTranslateY(cs, el.offsetHeight);
          const ih = window.innerHeight;
          covers = r.bottom - ty >= ih - 1 && r.top - ty < ih;
        }
      }
      publish(el, covers ? el.offsetHeight : null);
      return covers;
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    el.addEventListener("transitionend", measure);
    // A sticky bar sticks and unsticks as the page (or its scroller) moves.
    const sticky = position === "sticky";
    if (sticky) document.addEventListener("scroll", measure, { capture: true, passive: true });
    // The control the user just used must not end up under the bar. Only a
    // control the bar actually covers is scrolled: a scroll-driven bar (the
    // PDP buy bar) shows while the focused control is far off-screen, and
    // scrolling back to it would undo the user's scroll.
    const active = document.activeElement;
    if (
      measure() &&
      active instanceof HTMLElement &&
      active !== document.body &&
      active !== document.documentElement &&
      !el.contains(active)
    ) {
      const r = active.getBoundingClientRect();
      if (r.bottom > window.innerHeight - el.offsetHeight && r.top < window.innerHeight) {
        active.scrollIntoView({ block: "nearest" });
      }
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      el.removeEventListener("transitionend", measure);
      if (sticky) document.removeEventListener("scroll", measure, { capture: true });
      publish(el, null);
    };
  }, [show, position]);

  return (
    <div
      ref={elRef}
      role="region"
      aria-label={label}
      aria-hidden={!show}
      inert={!show}
      data-sticky-bar={tone}
      className={`${tone === "dark" ? STICKY_BAR_DARK : STICKY_BAR_LIGHT} ${POSITION[position]} ${MOTION} ${show ? "" : HIDDEN} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
    >
      {children}
    </div>
  );
}
