"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

// Rows that leave the cart (the trash, «Очистити») fade and slide out
// while their height collapses, so the rows below glide up instead of
// jumping; a row that arrives while the list is open (an add from the
// catalog, the phone «Повернути») grows in the same way. useLeavingRows
// keeps a removed item in the list, at its old place, for as long as its
// exit runs; LeavingRow runs the motion (Web Animations API, the
// CartDisc / RollingNumber idiom) and reports when it is done. Reduced
// motion: the row just goes / appears.

const DURATION = 380;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
// «Очистити»: the rows leave one after another, 30 ms apart.
const STAGGER = 30;
const STAGGER_MAX = 180;
const SLIDE = "translateX(24px)";

export type RenderedRow<T> = {
  key: string;
  item: T;
  leaving: boolean;
  entering: boolean;
  // Stagger of a batch exit, ms.
  delay: number;
};

type Leaving<T> = { key: string; item: T; index: number };

type State<T> = { source: T[]; leaving: Leaving<T>[]; entered: Set<string> };

// `items` is the live list (a stable array between unrelated renders);
// the returned rows add the leaving ones back at their old index. Call
// `done(key)` when a row's exit has finished.
export function useLeavingRows<T>(
  items: T[],
  keyOf: (item: T) => string,
): { rows: RenderedRow<T>[]; done: (key: string) => void } {
  const [state, setState] = useState<State<T>>({ source: items, leaving: [], entered: new Set() });
  // Derived state (the render-phase pattern): the row must stay in the
  // same commit the store drops it from, or it would unmount for a frame.
  if (state.source !== items) {
    const now = new Set(items.map(keyOf));
    const was = new Set(state.source.map(keyOf));
    const kept = state.leaving.filter((l) => !now.has(l.key));
    const removed = state.source
      .map((item, index) => ({ key: keyOf(item), item, index }))
      .filter((r) => !now.has(r.key) && !kept.some((l) => l.key === r.key));
    const entered = new Set(items.map(keyOf).filter((key) => !was.has(key)));
    setState({ source: items, leaving: [...kept, ...removed], entered });
  }
  const done = useCallback(
    (key: string) =>
      setState((s) =>
        s.leaving.some((l) => l.key === key)
          ? { ...s, leaving: s.leaving.filter((l) => l.key !== key) }
          : s,
      ),
    [],
  );
  const rows: RenderedRow<T>[] = items.map((item) => {
    const key = keyOf(item);
    return { key, item, leaving: false, entering: state.entered.has(key), delay: 0 };
  });
  [...state.leaving]
    .sort((a, b) => a.index - b.index)
    .forEach((l, i) => {
      rows.splice(Math.min(l.index, rows.length), 0, {
        key: l.key,
        item: l.item,
        leaving: true,
        entering: false,
        delay: Math.min(STAGGER_MAX, i * STAGGER),
      });
    });
  return { rows, done };
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LeavingRow({
  as = "div",
  leaving,
  entering = false,
  delay = 0,
  onDone,
  className,
  children,
}: {
  as?: "div" | "li";
  leaving: boolean;
  entering?: boolean;
  delay?: number;
  onDone: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  // Exit: fade + slide out over the first 60 %, the height closes over the
  // whole run; the row is inert meanwhile. Cancelled (the row snaps back)
  // when the item returns before the exit ends.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !leaving) return;
    if (reducedMotion() || typeof el.animate !== "function") {
      doneRef.current();
      return;
    }
    const height = el.offsetHeight;
    el.style.overflow = "clip";
    el.style.pointerEvents = "none";
    const anim = el.animate(
      [
        { height: `${height}px`, opacity: 1, transform: "translateX(0)", offset: 0 },
        { opacity: 0, transform: SLIDE, offset: 0.6 },
        { height: "0px", opacity: 0, transform: SLIDE, offset: 1 },
      ],
      { duration: DURATION, delay, easing: EASING, fill: "forwards" },
    );
    anim.onfinish = () => doneRef.current();
    return () => {
      anim.cancel();
      el.style.overflow = "";
      el.style.pointerEvents = "";
    };
  }, [leaving, delay]);

  // Enter (a row added to an open list): the reverse, once on mount.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !entering || leaving) return;
    if (reducedMotion() || typeof el.animate !== "function") return;
    const height = el.offsetHeight;
    el.style.overflow = "clip";
    // The height opens over the whole run, the content fades in over the
    // last 60 % (a keyframe without `height` leaves it interpolating).
    const anim = el.animate(
      [
        { height: "0px", opacity: 0, transform: SLIDE, offset: 0 },
        { opacity: 0, transform: SLIDE, offset: 0.4 },
        { height: `${height}px`, opacity: 1, transform: "translateX(0)", offset: 1 },
      ],
      { duration: DURATION, easing: EASING },
    );
    anim.onfinish = () => {
      el.style.overflow = "";
    };
    return () => {
      anim.cancel();
      el.style.overflow = "";
    };
    // Mount only: a later re-render with the same flag must not replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inert = leaving || undefined;
  if (as === "li") {
    return (
      <li ref={ref as RefObject<HTMLLIElement>} className={className} inert={inert} aria-hidden={inert}>
        {children}
      </li>
    );
  }
  return (
    <div ref={ref as RefObject<HTMLDivElement>} className={className} inert={inert} aria-hidden={inert}>
      {children}
    </div>
  );
}
