// Shared "details window" for bento-grid cards: the dark items panel +
// the viewport-aware position solver. Extracted from hotels/ZonesGrid
// (click-to-open) so spivpratsya/Coverage (hover-to-open) and the
// /catalog direction banners render the exact same window; all import
// from here.

import Link from "next/link";
import { Button } from "./Button";

// Items panel — Figma 1333:7785 "803" frame (catalog variant
// 3677:42133):
//   • bg: #343435 (the design token --stroke/deep — same dark slab
//     the StarRequestStrip header uses)
//   • rounded-[40px]
//   • Title: text-h2 (44 / 48 bold) white
//   • Close X icon in the top-right — a real button that closes the
//     panel
//   • Chips: white border, white text, transparent fill — opposite
//     of the light-grid chips used elsewhere on the site, suited to
//     the dark surface. When `itemHref` is given (the catalog banners)
//     the chips become links styled per the newer Chip component
//     (36-px pill, Button/Medium 16/22, hover → brand border + text)
//     and an optional white-outlined «Переглянути все» CTA renders
//     48 px below the chip cloud (Figma 3682:46827).
export function ItemsPanel({
  title,
  items,
  onClose,
  itemHref,
  onItemClick,
  cta,
}: {
  title: string;
  items: string[];
  onClose: () => void;
  itemHref?: (item: string) => string;
  onItemClick?: () => void;
  cta?: { label: string; href: string; onClick?: () => void };
}) {
  return (
    // Figma Frame 803 (1333:7785) — 587×624 dark slab with rounded
    // corners. Panel sizes itself to its content (header + chips
    // rows) — no inner scroll. The outer wrapper caps the panel's
    // height via maxHeight so it can never spill out of the viewport;
    // overflow-hidden clips any rare overflow silently rather than
    // showing a scrollbar.
    <div
      role="dialog"
      aria-label={title}
      className="flex max-h-full flex-col overflow-hidden rounded-[28px] shadow-[0_24px_64px_-12px_rgba(15,15,20,0.42)] sm:rounded-[36px] lg:rounded-[40px]"
      style={{ background: "#343435" }}
    >
      {/* Header — Figma 1333:7786 has `p-[32px] items-center
          justify-between w-full`, so 32 px on all four sides. Title
          is text-h2 (44/48 bold -0.88px) white at lg, shrinks on
          smaller viewports so the modal still fits. */}
      <div className="flex items-center justify-between gap-4 p-8">
        <h3 className="text-[32px] font-bold leading-[36px] tracking-[-0.64px] text-white lg:text-h2">
          {title}
        </h3>
        {/* Figma 1333:7788 — heroicons-outline/x-mark inside a 40-px
            container with inset 21.88% → visual X ~22.5 px. A real
            close button so the panel is always explicitly
            dismissable. Stroke color = white via currentColor. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center text-white transition-colors duration-200 hover:text-brand"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
            className="size-[22.5px]"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {/* Chips area — Figma 1333:7789 sits below the header at
          `pb-[32px] px-[32px]` (no top padding; the first chip row
          starts flush against the header's 32 px bottom). The chip
          row is `flex-wrap gap-[15px] w-[523px]` (= panel 587 - 2*32
          padding). No overflow scroll — the panel grows to fit its
          chip rows; on tight viewports the outer wrapper's maxHeight
          + overflow-hidden clips any rare excess silently. */}
      <div className="px-8 pb-8">
        {itemHref ? (
          // Catalog-banner mode (Figma 3677:42137): 36-px Chip pills in
          // a 16-px-gapped cloud, each deep-linking into the filtered
          // catalog; hover = brand border + label (Chip State=Hover,
          // Colour=Inverted).
          <ul className="flex flex-wrap content-center items-center gap-4">
            {items.map((item) => (
              <li key={item}>
                <Link
                  href={itemHref(item)}
                  onClick={onItemClick}
                  className="flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-[60px] border border-white px-4 text-button-md text-white transition-colors duration-200 hover:border-brand hover:text-brand"
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-wrap gap-[15px]">
            {items.map((item) => (
              // Figma chip 1333:7791 — `border border-white px-[16px]
              // py-[12px] rounded-[60px]` with body-sm text (16/24)
              // forced onto a single line via whitespace-nowrap.
              //
              // Manrope Cyrillic renders ~3 % wider in Chrome than in
              // Figma's text engine; `tracking-[-0.025em]` claws back
              // the delta so chip rows pack like the Figma master.
              <li
                key={item}
                className="inline-flex items-center whitespace-nowrap rounded-[60px] border border-white px-4 py-3 text-[16px] leading-[16px] tracking-[-0.025em] text-white"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
        {cta && (
          // «Переглянути все» — the white-outlined Button/Small + the
          // 42-px brand arrow disc, 48 px below the chip cloud.
          <div className="mt-12">
            <Button
              href={cta.href}
              size="small"
              variant="outlined"
              arrow
              onClick={cta.onClick}
            >
              {cta.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Figma Frame 1333:7785 — panel is 587×624 at the design master
// resolution. We keep these as the *target* dimensions; computePos()
// will shrink them or pick a different side when a viewport can't
// hold the full Figma panel beside the hovered card.
export const PANEL_W = 587;
export const PANEL_H = 624;
// Visual breathing space around the panel — `24` of ACTUAL screen
// pixels regardless of html zoom. Used as both the gap between the
// panel and the hovered card AND as the minimum margin to the
// viewport edges. computePos() divides by `zoom` to express this
// in logical/pre-zoom pixels for the rest of its math, so the
// rendered gap stays 24 visual px at 1024, 1440, 1920, 2560+.
const PANEL_GAP_VISUAL = 24;
// Smallest acceptable width before we fall back to placing the panel
// above/below the card. 360 leaves room for two chip columns at the
// Figma px-16 py-12 padding without breaking the layout.
const PANEL_MIN_W = 360;

export type PopupPosition = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// Decide where to anchor the items panel relative to the active card
// so that the panel is ALWAYS fully visible inside the viewport AND
// never sits on top of the card it belongs to.
//
// Decision tree (checked in order — first match wins):
//
//   1. Right side has room for the full 587-wide panel → anchor right
//      at full width. This matches Figma's master `1333:7764` framing
//      for column-1 and column-2 cards at the design's 1440 canvas.
//
//   2. Left side has room for the full 587-wide panel → anchor left
//      at full width.
//
//   3. Neither side fits the full panel — shrink the panel to the
//      WIDER of the two sides (down to PANEL_MIN_W = 360).
//
//   4. Neither side has min room — fall back to placing the panel
//      ABOVE or BELOW the card (whichever has more room). Edge case
//      for ultra-narrow viewports.
//
// Vertical anchor: panel top aligned with card top so the design
// reads "details for THIS card" the way Figma's master pins them.
// Clamped to PANEL_GAP from the viewport top/bottom so the panel
// follows tall cards and mid-scroll cards smoothly into view.
//
// `panelH` (logical px) lets the caller pass the panel's MEASURED
// content height so the bottom-edge clamp doesn't push a short panel
// needlessly high; defaults to the Figma-master cap.
export function computePos(
  cardEl: HTMLElement,
  panelH: number = PANEL_H,
): PopupPosition {
  // `html { zoom: calc(100vw / 1440px) }` in globals.css scales the
  // whole page so every desktop viewport renders as 1440 effective.
  // getBoundingClientRect() returns POST-zoom (visual) pixels, but
  // an element's `style.left` is interpreted as a PRE-zoom CSS pixel
  // that the browser THEN zooms — so we'd be applying zoom twice if
  // we mixed the two. Convert the visual rect + window.innerWidth /
  // Height back into logical/pre-zoom coords and do all the math
  // there. The returned position is in the same logical space, so
  // setting it via style.left/top renders correctly under any zoom.
  const visualRect = cardEl.getBoundingClientRect();
  const zoomStr = getComputedStyle(document.documentElement).zoom;
  const zoom = parseFloat(zoomStr) || 1;

  const cardRect = {
    left: visualRect.left / zoom,
    right: visualRect.right / zoom,
    top: visualRect.top / zoom,
    bottom: visualRect.bottom / zoom,
    width: visualRect.width / zoom,
    height: visualRect.height / zoom,
  };
  const vw = window.innerWidth / zoom;
  const vh = window.innerHeight / zoom;
  // Convert the visual 24-px gap to logical pixels so the rendered
  // breathing room stays 24 actual screen pixels at every zoom level.
  const PANEL_GAP = PANEL_GAP_VISUAL / zoom;

  // Available space on each side of the card, accounting for the
  // PANEL_GAP that sits between the panel and the card.
  const spaceRight = vw - cardRect.right - PANEL_GAP;
  const spaceLeft = cardRect.left - PANEL_GAP;
  const spaceAbove = cardRect.top - PANEL_GAP;
  const spaceBelow = vh - cardRect.bottom - PANEL_GAP;

  // Reserve PANEL_GAP at the OUTER viewport edge too — i.e. the
  // panel never abuts the screen, always has 24 px of breathing
  // room. Hence the lateral side must hold `panel + PANEL_GAP`.
  const fitsRightFull = spaceRight >= PANEL_W + PANEL_GAP;
  const fitsLeftFull = spaceLeft >= PANEL_W + PANEL_GAP;
  const fitsRightMin = spaceRight >= PANEL_MIN_W + PANEL_GAP;
  const fitsLeftMin = spaceLeft >= PANEL_MIN_W + PANEL_GAP;

  let side: "right" | "left" | "below" | "above";
  let width: number;
  let height: number;

  if (fitsRightFull) {
    side = "right";
    width = PANEL_W;
    height = Math.min(panelH, vh - 2 * PANEL_GAP);
  } else if (fitsLeftFull) {
    side = "left";
    width = PANEL_W;
    height = Math.min(panelH, vh - 2 * PANEL_GAP);
  } else if (fitsRightMin || fitsLeftMin) {
    // Pick the wider of the two horizontal sides, then shrink the
    // panel to fit it (minus the outer viewport gap). Bias right
    // when both have the same room — keeps placement deterministic
    // and matches Figma's right-anchor default for left/middle
    // cards.
    side = spaceRight >= spaceLeft ? "right" : "left";
    width = (side === "right" ? spaceRight : spaceLeft) - PANEL_GAP;
    height = Math.min(panelH, vh - 2 * PANEL_GAP);
  } else {
    // Vertical fallback. Pick the taller of above / below, cap the
    // height to the available room, and clamp the width to the
    // viewport (minus the lateral gaps).
    side = spaceBelow >= spaceAbove ? "below" : "above";
    width = Math.min(PANEL_W, vw - 2 * PANEL_GAP);
    const vSpace = side === "below" ? spaceBelow : spaceAbove;
    height = Math.min(panelH, vSpace - PANEL_GAP);
  }

  let left: number;
  let top: number;

  if (side === "right" || side === "left") {
    left = side === "right"
      ? cardRect.right + PANEL_GAP
      : cardRect.left - width - PANEL_GAP;
    // Top-align with the card (Figma master), then clamp to the
    // viewport. For tall cards or cards scrolled near the bottom
    // edge, this slides the panel up so it stays fully visible
    // instead of running off-screen.
    top = Math.max(
      PANEL_GAP,
      Math.min(vh - height - PANEL_GAP, cardRect.top),
    );
  } else {
    top = side === "below"
      ? cardRect.bottom + PANEL_GAP
      : cardRect.top - height - PANEL_GAP;
    // Centre on the card horizontally so the visual link to the
    // hovered card reads cleanly even when the panel is above/below
    // rather than alongside it.
    left = Math.max(
      PANEL_GAP,
      Math.min(
        vw - width - PANEL_GAP,
        cardRect.left + cardRect.width / 2 - width / 2,
      ),
    );
  }

  return { left, top, width, height };
}
