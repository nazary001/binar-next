"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";

// One-line text that shrinks to fit (system spec A25 = dashboard SN-04):
// while `media` matches, the element's font-size steps down just enough
// for its content to fit its own width (never below `min`); line-height
// comes from the class and never changes, so the row rhythm stays put.
// Re-fits after every render, on resize (ResizeObserver) and once the
// fonts are loaded; outside `media` the inline size is cleared (the
// class size rules). The element must have a width of its own (block /
// flex item with min-w-0) and `whitespace-nowrap`. Generalises the
// landing's FitStepLabel (spivpratsya/HowItWorks.tsx), which stays as is.
function fit(el: HTMLElement, min: number, media: string) {
  el.style.fontSize = "";
  if (!window.matchMedia(media).matches) return;
  const avail = el.clientWidth;
  const need = el.scrollWidth;
  if (avail > 0 && need > avail) {
    const base = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = `${Math.max(min, Math.floor(base * (avail / need) * 100) / 100)}px`;
  }
}

export function FitText({
  as = "span",
  min,
  media = "(max-width: 639px)",
  className = "",
  children,
}: {
  as?: "span" | "p" | "div";
  min: number;
  media?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  // Every render may change the text.
  useLayoutEffect(() => {
    if (ref.current) fit(ref.current, min, media);
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => fit(el, min, media);
    const ro = new ResizeObserver(run);
    ro.observe(el);
    const mq = window.matchMedia(media);
    mq.addEventListener("change", run);
    document.fonts?.ready.then(run).catch(() => {});
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", run);
    };
  }, [min, media]);

  const Tag = as as "span";
  return (
    <Tag ref={ref as Ref<HTMLSpanElement>} className={className}>
      {children}
    </Tag>
  );
}
