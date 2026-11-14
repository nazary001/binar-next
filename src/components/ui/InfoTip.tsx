"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { InfoCircleIcon } from "@/components/catalog/icons";
import { ExclamationCircleIcon } from "@/components/materials/icons";

// The (i) glyph that explains its label (designer 2026-11-11, C23: «По
// ховеру мали б бути тултіпи»; C42: on phones a tap shows the same popup).
// The explanation is the Figma «Tooltip» chip 4634:65682: white, r12,
// px-12 py-8, gap 12, the 24-px exclamation circle (Icons/Deep #1d1d1f),
// Body/Small 14/24 Regular #1d1d1f, the «Drow shadow» 0/2/6 #1D1D1F1A,
// at most 400 wide (the long fx text wraps to three lines, 400 x 88, as
// drawn). Phones keep the 14/20 body line of the phone type scale.
//
// When it shows:
// - mouse: 100 ms after the pointer enters the glyph (sweeping over a grid
//   flashes nothing), until it leaves both the glyph and the chip (the
//   chip can be hovered, WCAG 1.4.13);
// - keyboard focus (:focus-visible), until blur;
// - a tap (touch has no hover) or Enter / Space toggles it, a mouse click
//   shows it at once; a tap elsewhere, a scroll that moves the glyph, a
//   resize or Escape closes it. Escape is
//   taken before any dialog around the glyph sees it (the cart drawer, the
//   cancel modal close on the next Escape, not this one).
// One chip at a time: opening one closes the other.
//
// Where: the chip is portalled into <body> (fixed, z 70: above the sticky
// headers 50 and the drawers / modals 60), so it inherits neither the
// labels' uppercase nor any overflow clip. It sits 8 px above the glyph,
// centred on it and kept 16 px inside the window; under the sticky header
// (--site-header-h) it opens 8 px below the glyph instead. The position is
// computed in the canvas px (the client rects divided by the <html> zoom,
// as ItemsPopup.computePos does).
//
// The trigger is a real button (keyboard stop) whose box keeps the glyph's
// layout: p-1 with -m-1 around it. On phones its tap area is 44 wide and
// 38 tall (::before), the height of a row of the phone price tile, so the
// two (i) of the tile never share a pixel. The text is also the button's
// aria-describedby, present before the chip shows.

const GAP = 8;
const EDGE = 16;
const MAX_W = 400;
const OPEN_DELAY = 100;
const CLOSE_DELAY = 100;

// The close function of the chip on screen.
let shown: (() => void) | null = null;

export function InfoTip({
  label,
  text,
  icon,
  className = "",
}: {
  // What the (i) explains, for its accessible name «Пояснення: <label>».
  label: string;
  text: string;
  // The glyph; the catalog's 16-px information-circle by default.
  icon?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const descId = `${id}-desc`;
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // The glyph's client position at the last placement: a scroll that does
  // not move it (a carousel, a list elsewhere) leaves the chip alone.
  const anchorAt = useRef("");
  // The pointer that pressed the button ("" = keyboard).
  const pressedBy = useRef("");
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || focus || pinned;

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setHover(false);
    setFocus(false);
    setPinned(false);
  }, []);
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  };

  // Writes the chip's position to its style (no re-render).
  const place = useCallback(() => {
    const btn = btnRef.current;
    const chip = chipRef.current;
    if (!btn || !chip) return;
    const root = getComputedStyle(document.documentElement);
    const z = parseFloat(root.zoom) || 1;
    const vw = window.innerWidth / z;
    const vh = window.innerHeight / z;
    const header = parseFloat(root.getPropertyValue("--site-header-h")) || 0;
    const a = btn.getBoundingClientRect();
    chip.style.maxWidth = `${Math.min(MAX_W, vw - 2 * EDGE)}px`;
    const c = chip.getBoundingClientRect();
    const w = c.width / z;
    const h = c.height / z;
    const left = Math.min(Math.max((a.left + a.right) / 2 / z - w / 2, EDGE), vw - EDGE - w);
    const above = a.top / z - GAP - h;
    const below = a.bottom / z + GAP;
    const top = above >= header + GAP || below + h > vh - EDGE ? above : below;
    chip.style.left = `${left}px`;
    chip.style.top = `${top}px`;
    anchorAt.current = `${a.left},${a.top}`;
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, text]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    if (shown && shown !== close) shown();
    shown = close;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target instanceof Node ? e.target : null;
      if (target && btnRef.current?.contains(target)) return;
      // The mouse may rest on the chip; a tap on it closes it, like a tap
      // anywhere else.
      if (target && e.pointerType === "mouse" && chipRef.current?.contains(target)) return;
      close();
    };
    const onScroll = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const a = btn.getBoundingClientRect();
      if (`${a.left},${a.top}` === anchorAt.current) return;
      // Hover and tap chips close; a keyboard one follows its glyph.
      setHover(false);
      setPinned(false);
      place();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", close);
      if (shown === close) shown = null;
    };
  }, [open, close, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`Пояснення: ${label}`}
        aria-describedby={descId}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          if (open) {
            window.clearTimeout(timer.current);
            setHover(true);
          } else {
            later(() => setHover(true), OPEN_DELAY);
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") later(() => setHover(false), CLOSE_DELAY);
        }}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) setFocus(true);
        }}
        onBlur={() => {
          setFocus(false);
          setPinned(false);
        }}
        onPointerDown={(e) => {
          pressedBy.current = e.pointerType;
        }}
        onClick={() => {
          const by = pressedBy.current;
          pressedBy.current = "";
          // A mouse click shows it at once (it stays while the pointer is
          // on the glyph or the chip); a tap or Enter / Space toggles it.
          if (by === "mouse") {
            window.clearTimeout(timer.current);
            setHover(true);
          } else if (open) {
            close();
          } else {
            setPinned(true);
          }
        }}
        className={`relative -m-1 inline-flex shrink-0 cursor-help items-center justify-center rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-brand max-lg:before:absolute max-lg:before:-inset-x-2.5 max-lg:before:-inset-y-[7px] max-lg:before:content-[''] ${className}`}
      >
        {icon ?? <InfoCircleIcon className="size-4" />}
        <span id={descId} hidden>
          {text}
        </span>
      </button>
      {open &&
        createPortal(
          <span
            ref={chipRef}
            role="tooltip"
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") window.clearTimeout(timer.current);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") later(() => setHover(false), CLOSE_DELAY);
            }}
            className="fixed left-0 top-0 z-[70] flex w-max items-center gap-3 rounded-xl bg-white px-3 py-2 text-left text-[14px] font-normal normal-case leading-5 tracking-normal text-neutral-900 shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)] transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none lg:leading-6"
          >
            <ExclamationCircleIcon className="size-6 shrink-0" />
            <span className="min-w-0 flex-1">{text}</span>
          </span>,
          document.body,
        )}
    </>
  );
}
