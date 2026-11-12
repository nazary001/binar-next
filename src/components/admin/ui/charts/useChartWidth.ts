"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Split from scale.ts: a module that imports effects must be a client
// module, and scale.ts stays importable from server pages.
//
//   const [box, width] = useChartWidth<HTMLDivElement>();
//   <div ref={box}>{width > 0 && <svg width={width} ... />}</div>
//
// Measures the width of the chart box. The width lands in state from the
// ResizeObserver callback (a callback, not an effect body), and it is 0
// until the first measurement, so a chart renders only its empty box on
// the server and in the first client render: no hydration mismatch.
export function useChartWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
