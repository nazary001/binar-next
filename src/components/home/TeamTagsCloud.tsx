"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type CSSProperties } from "react";

type TagPos = { cx: number; cy: number; rot: number };

type Tag = {
  label: string;
  // Four explicit waypoints from the Figma component-set variants of
  // `team-tags` (1327:6050):
  //   p1 — "1-start"   : chip waiting above the cloud, rotated.
  //   p2 — "2-drop"    : chip crashed into the floor / mid-pile.
  //   p3 — "3-settle"  : chip nudged a little after impact.
  //   p4 — "4-final"   : chip at its designer-intended resting pose.
  // Each is the chip's CENTER (cx, cy) in the 220 × 373 cloud frame
  // plus the rotation applied around that center. The CSS keyframe in
  // globals.css interpolates between these four points so the
  // gravity-fall + bounce + settle motion matches the designer's
  // keyframed sequence exactly (not a straight diagonal slide).
  p1: TagPos;
  p2: TagPos;
  p3: TagPos;
  p4: TagPos;
};

// All centers in the 220 × 373 frame. Extracted from
// Figma symbols 1327:6107 (1-start), 1327:6089 (2-drop),
// 1327:6069 (3-settle), 1327:6051 (4-final) — each chip's container
// bounding box was reduced to its center + rotation.
const TAGS: Tag[] = [
  {
    label: "персональний менеджер",
    p1: { cx: 173.16, cy: -78.56, rot: -36.79 },
    p2: { cx: 110, cy: 363.5, rot: 0 },
    p3: { cx: 110, cy: 353.5, rot: 0 },
    p4: { cx: 110, cy: 353.5, rot: 0 },
  },
  {
    label: "підбір товарів",
    p1: { cx: 167.42, cy: -122.97, rot: -36.79 },
    p2: { cx: 153.86, cy: 309.13, rot: -17.61 },
    p3: { cx: 148.26, cy: 311.41, rot: -0.77 },
    p4: { cx: 132, cy: 314.5, rot: 0 },
  },
  {
    label: "брендування",
    p1: { cx: 196.44, cy: -195.26, rot: -7.09 },
    p2: { cx: 69.67, cy: 282.25, rot: -5.79 },
    p3: { cx: 71.67, cy: 275.26, rot: -5.79 },
    p4: { cx: 69, cy: 275.5, rot: 0 },
  },
  {
    label: "контроль якості",
    p1: { cx: 89.61, cy: -203.62, rot: -43.68 },
    p2: { cx: 156.15, cy: 212.57, rot: 41.11 },
    p3: { cx: 157.6, cy: 225.96, rot: 36.45 },
    p4: { cx: 154.91, cy: 252.17, rot: 30.91 },
  },
  {
    label: "логістика",
    p1: { cx: -9.18, cy: -180.56, rot: -52.36 },
    p2: { cx: 46.13, cy: 220.52, rot: -15.58 },
    p3: { cx: 53.13, cy: 217.52, rot: -15.58 },
    p4: { cx: 47.13, cy: 216.6, rot: -15.58 },
  },
  {
    label: "виробництво",
    p1: { cx: 184.3, cy: -291.83, rot: 36.66 },
    p2: { cx: 145.06, cy: 119.53, rot: 39.25 },
    p3: { cx: 110.06, cy: 137.53, rot: 39.25 },
    p4: { cx: 118.06, cy: 177.53, rot: 39.25 },
  },
  {
    label: "дизайн",
    p1: { cx: -0.06, cy: -329.94, rot: -17.72 },
    p2: { cx: 35.72, cy: 156.61, rot: -49.98 },
    p3: { cx: 34.72, cy: 166.61, rot: -49.98 },
    p4: { cx: 32.72, cy: 167.61, rot: -49.98 },
  },
];

// Decorative orange hexagons that drop in with the chips. Figma's
// component-set keeps three of them (Polygon 12 instances) scattered
// between the settled tags. They share the same 4-phase keyframe but
// are 16-px hexagons with no text and a brand-orange fill — purely
// visual flavour matching the designer's pile composition.
type PolyPos = TagPos;
type Polygon = { id: string; p1: PolyPos; p2: PolyPos; p3: PolyPos; p4: PolyPos };

const POLYGONS: Polygon[] = [
  {
    id: "poly-a",
    p1: { cx: 54.42, cy: -142.64, rot: -36.79 },
    p2: { cx: 76, cy: 245, rot: 0 },
    p3: { cx: 41, cy: 252, rot: 0 },
    p4: { cx: 41, cy: 247, rot: 0 },
  },
  {
    id: "poly-b",
    p1: { cx: 47.53, cy: -238.65, rot: -36.79 },
    p2: { cx: 81, cy: 187, rot: 0 },
    p3: { cx: 87, cy: 178, rot: 0 },
    p4: { cx: 81, cy: 182, rot: 0 },
  },
  {
    id: "poly-c",
    p1: { cx: 173.88, cy: -303.26, rot: -36.79 },
    p2: { cx: 147, cy: 262, rot: 0 },
    p3: { cx: 171, cy: 277, rot: 0 },
    p4: { cx: 161, cy: 286, rot: 0 },
  },
];

// Whole-animation duration: 1-start → 2-drop → 3-settle → 4-final is
// noticeably longer than the old straight-line drop (850 ms), so we
// give the four phases room to read distinctly without dragging.
const FALL_DURATION_MS = 1200;
// Per-chip stagger. Bottom-up release order (chip with the largest
// p4.cy goes first) is preserved — combined with the staggered start
// it keeps the pile growing visibly from the floor upward.
const STAGGER_MS = 130;

type Phase = "prefall" | "falling" | "settled";

export function TeamTagsCloud() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("prefall");

  // Bottom-up release order spans tags AND polygons together — chip
  // with the largest p4.cy fires first, polygons get scheduled at the
  // same cy-rank so they drop interleaved with the chips that share
  // their floor altitude. Each entry gets a unique stagger index in
  // the combined pile-building sequence.
  const fallOrder = (() => {
    const entries: { key: string; finalY: number }[] = [
      ...TAGS.map((t) => ({ key: `tag:${t.label}`, finalY: t.p4.cy })),
      ...POLYGONS.map((p) => ({ key: `poly:${p.id}`, finalY: p.p4.cy })),
    ];
    entries.sort((a, b) => b.finalY - a.finalY);
    const map = new Map<string, number>();
    entries.forEach((e, idx) => map.set(e.key, idx));
    return map;
  })();
  const totalDrops = TAGS.length + POLYGONS.length;

  useEffect(() => {
    if (phase !== "prefall") return;
    const el = containerRef.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      queueMicrotask(() => setPhase("settled"));
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setPhase("falling"));
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("falling");
          obs.disconnect();
        }
      },
      // Trigger only once the user has actually scrolled the cloud
      // into view. No pre-trigger margin, and the cloud must be at
      // least half on-screen — keeps the animation from firing while
      // the chip area is still peeking from the bottom of the viewport
      // (which is when the user has not yet "arrived" at the section).
      { threshold: 0.5, rootMargin: "0px" },
    );
    obs.observe(el);

    // NOTE: no time-based fallback. A blanket setTimeout would fire the
    // animation regardless of whether the user has scrolled to it yet
    // — e.g. while they're still reading the hero — which is exactly
    // the bug we want to avoid. IntersectionObserver has been baseline
    // on every supported browser (Safari 12.2+) for years, so we trust
    // it to fire when the cloud is actually visible.

    return () => {
      obs.disconnect();
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "falling") return;
    const lastFinishMs = (totalDrops - 1) * STAGGER_MS + FALL_DURATION_MS;
    const timer = setTimeout(() => setPhase("settled"), lastFinishMs + 30);
    return () => clearTimeout(timer);
  }, [phase, totalDrops]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-clip border-stroke-subtle bg-bg-subtle lg:h-[373px] lg:border-b"
    >
      {/* Mobile: regular chips, fade-in stagger when in view. */}
      <div className="flex flex-wrap content-start gap-2 p-6 lg:hidden">
        {TAGS.map((t, i) => (
          <span
            key={t.label}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border border-stroke-default bg-white px-4 py-3 text-body-sm text-neutral-800 transition-[opacity,transform] duration-700 ${
              phase === "falling" || phase === "settled"
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0"
            }`}
            style={{ transitionDelay: `${Math.min(i * 80, 480)}ms` }}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* Desktop: 4-phase keyframe drop. Each entry (chip or polygon)
          owns p1-p4 waypoints from Figma's `team-tags` component set
          and gets its slot in the bottom-up stagger. The CSS keyframe
          in globals.css drives every entry through the same eased
          curve so chips and polygons land in sync with the designer's
          pile composition. */}
      <div className="relative hidden h-full w-full lg:block">
        {TAGS.map((t) => {
          let cls = "team-tag-cloud-prefall";
          if (phase === "falling") cls = "team-tag-cloud-falling";
          else if (phase === "settled") cls = "team-tag-cloud-settled";
          const delay =
            (fallOrder.get(`tag:${t.label}`) ?? 0) * STAGGER_MS;

          return (
            <span
              key={t.label}
              className={`team-tag-cloud-tag inline-flex items-center justify-center whitespace-nowrap rounded-full border border-stroke-default bg-white pl-4 pr-2.5 py-3 text-body-sm text-neutral-800 ${cls}`}
              style={waypointStyle(t, delay)}
            >
              {t.label}
            </span>
          );
        })}
        {POLYGONS.map((p) => {
          let cls = "team-tag-cloud-prefall";
          if (phase === "falling") cls = "team-tag-cloud-falling";
          else if (phase === "settled") cls = "team-tag-cloud-settled";
          const delay = (fallOrder.get(`poly:${p.id}`) ?? 0) * STAGGER_MS;

          return (
            <span
              key={p.id}
              aria-hidden
              className={`team-tag-cloud-tag team-tag-cloud-poly block size-4 ${cls}`}
              style={waypointStyle(p, delay)}
            >
              <img
                src="/figma-export/team/polygon-orange.svg"
                alt=""
                aria-hidden
                className="block size-full"
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Build the inline CSS-variable bag every animated entry needs — same
// shape for chips and polygons since both share the same @keyframes.
function waypointStyle(
  w: { p1: TagPos; p2: TagPos; p3: TagPos; p4: TagPos },
  delayMs: number,
): CSSProperties {
  return {
    "--p1-cx": `${w.p1.cx}px`,
    "--p1-cy": `${w.p1.cy}px`,
    "--p1-rot": `${w.p1.rot}deg`,
    "--p2-cx": `${w.p2.cx}px`,
    "--p2-cy": `${w.p2.cy}px`,
    "--p2-rot": `${w.p2.rot}deg`,
    "--p3-cx": `${w.p3.cx}px`,
    "--p3-cy": `${w.p3.cy}px`,
    "--p3-rot": `${w.p3.rot}deg`,
    "--p4-cx": `${w.p4.cx}px`,
    "--p4-cy": `${w.p4.cy}px`,
    "--p4-rot": `${w.p4.rot}deg`,
    "--tag-duration": `${FALL_DURATION_MS}ms`,
    "--tag-delay": `${delayMs}ms`,
  } as CSSProperties;
}
