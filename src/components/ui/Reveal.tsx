"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

type RevealProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  threshold?: number;
  rootMargin?: string;
  as?: keyof React.JSX.IntrinsicElements;
  once?: boolean;
};

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 750,
  distance = 24,
  threshold = 0,
  // Positive bottom margin extends the IO viewport 200 px past the visible
  // bottom edge, so the reveal-in transition starts BEFORE the element
  // reaches the user's eye. Without that pre-trigger, on mobile the user
  // scrolls quickly enough that they see ~one viewport of blank space
  // (Reveal at opacity 0) before each section fades in. With 200 px of
  // anticipation the content is fully in by the time it actually enters
  // view, so the page reads as solid content rather than blinking gaps.
  rootMargin = "0px 0px 200px 0px",
  as: Tag = "div",
  once = true,
  className,
  style,
  ...rest
}: RevealProps) {
  // Per Figma strict parity: there is no reveal-on-scroll animation in
  // the design - elements just sit at their final position. We keep
  // the component shape so call-sites stay working, but render with the
  // final visible state immediately. The IntersectionObserver/animation
  // logic below is short-circuited via the always-visible state.
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);
  // Tracks whether the reveal animation is still playing. We toggle
  // `will-change` based on this so each Reveal lifts onto its own GPU
  // layer only for the ~1 s it actually animates — not forever. With
  // dozens of Reveals on a page, the permanent compositor lift was a
  // real memory cost on mobile, and the page now has the same animation
  // quality without the always-on overhead.
  // Static render — Figma master has no reveal-on-scroll. We
  // intentionally do not observe intersections or run timeouts; the
  // component renders its children at their final position immediately.
  void ref;
  void visible;
  void setVisible;
  void delay;
  void duration;
  void distance;
  void direction;
  void threshold;
  void rootMargin;
  void once;
  const animationStyle: CSSProperties = {
    ...style,
    opacity: 1,
    transform: "none",
  };

  const Component = Tag as React.ElementType;
  return (
    <Component
      ref={ref}
      className={className}
      style={animationStyle}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function useInView<T extends HTMLElement = HTMLElement>(
  options: { threshold?: number; rootMargin?: string; once?: boolean } = {},
) {
  const { threshold = 0, rootMargin = "0px 0px 200px 0px", once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setInView(true));
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
