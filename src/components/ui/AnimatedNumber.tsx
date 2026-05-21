"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (n: number) => string;
};

export function AnimatedNumber({
  value,
  duration = 1600,
  className,
  formatter,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setDisplay(value));
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      queueMicrotask(() => setDisplay(value));
      return;
    }
    const runAnimation = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const startTime = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        setDisplay(Math.round(value * ease(t)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        runAnimation();
        obs.disconnect();
      },
      // Match Reveal: trigger as soon as the number enters the
      // expanded-viewport rather than only when 40 % is on screen.
      // On mobile, a tall stat block can otherwise stay frozen at "1"
      // until the user has nearly fully scrolled past it.
      { threshold: 0, rootMargin: "0px 0px 200px 0px" },
    );
    obs.observe(el);

    // Safety net: if IO is throttled or doesn't fire (some mobile browsers
    // delay IO callbacks heavily during fast scrolls), skip the count-up
    // after 1.5 s and just show the final value rather than leaving it
    // frozen at 0.
    const fallback = window.setTimeout(() => {
      if (!startedRef.current) {
        startedRef.current = true;
        setDisplay(value);
        obs.disconnect();
      }
    }, 1500);

    return () => {
      obs.disconnect();
      window.clearTimeout(fallback);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {formatter ? formatter(display) : display.toLocaleString("uk-UA")}
    </span>
  );
}
