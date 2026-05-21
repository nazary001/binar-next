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

const directionTransform = (direction: Direction, distance: number) => {
  switch (direction) {
    case "up":
      return `translate3d(0, ${distance}px, 0)`;
    case "down":
      return `translate3d(0, -${distance}px, 0)`;
    case "left":
      return `translate3d(${distance}px, 0, 0)`;
    case "right":
      return `translate3d(-${distance}px, 0, 0)`;
    case "none":
      return "translate3d(0, 0, 0)";
  }
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
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  // Tracks whether the reveal animation is still playing. We toggle
  // `will-change` based on this so each Reveal lifts onto its own GPU
  // layer only for the ~1 s it actually animates — not forever. With
  // dozens of Reveals on a page, the permanent compositor lift was a
  // real memory cost on mobile, and the page now has the same animation
  // quality without the always-on overhead.
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect users who prefer reduced motion — show the content
    // immediately without the slide/fade transition. Deferring with
    // queueMicrotask avoids the synchronous-effect lint warning.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      queueMicrotask(() => setVisible(true));
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      // Graceful fallback for ancient browsers — show content immediately.
      queueMicrotask(() => setVisible(true));
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          setAnimating(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
          setAnimating(true);
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);

    // Safety net: in some mobile browsers, IntersectionObserver callbacks
    // are throttled or delayed enough that elements stay at opacity 0 for
    // visibly longer than the user expects when scrolling fast (especially
    // iOS Safari with rapid swipes). After 1.5 s of being observed, fall
    // back to forcing visible — if the element is genuinely below the
    // fold the user hasn't reached it yet, so a 1.5-second-late show is
    // imperceptible; if it's above the fold and IO simply hasn't fired
    // yet, this prevents content from sitting blank.
    const fallback = window.setTimeout(() => {
      setVisible(true);
      setAnimating(true);
      if (once) obs.disconnect();
    }, 1500);

    return () => {
      obs.disconnect();
      window.clearTimeout(fallback);
    };
  }, [threshold, rootMargin, once]);

  // Drop `will-change` after the transition has finished. Reading the
  // computed style every frame is the browser's only cost for an idle
  // `will-change: transform`, so leaving it on permanently for hundreds
  // of revealed elements is what we want to avoid; once the transition
  // has played we set it back to `auto`.
  useEffect(() => {
    if (!animating) return;
    const total = delay + duration + 80;
    const t = window.setTimeout(() => setAnimating(false), total);
    return () => window.clearTimeout(t);
  }, [animating, visible, delay, duration]);

  // After the reveal animation finishes we drop transform back to "none"
  // (rather than leaving translate3d(0,0,0)). A lingering 3D transform
  // keeps the element on its own GPU compositor layer with an independent
  // sub-pixel grid, so the right edges of long horizontal lines drawn
  // inside multiple staggered Reveals can land on slightly different
  // physical pixels and read as a misaligned "jump." Returning to
  // transform: none merges the layer back into the parent's pixel grid.
  const settled = visible && !animating;
  const animationStyle: CSSProperties = {
    ...style,
    opacity: visible ? 1 : 0,
    transform: settled
      ? "none"
      : visible
        ? "translate3d(0, 0, 0)"
        : directionTransform(direction, distance),
    transition: animating
      ? `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`
      : `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    willChange: animating ? "opacity, transform" : "auto",
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
