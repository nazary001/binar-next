// Mobile decorative cross/sparkle for the dark CTA caps (Figma 3137:15415).
// A white "+" anchored near the right edge whose four inner corners are
// rounded (~30px radius), so the vertical and horizontal hairlines meet in
// a 4-point sparkle. Built the same way as the desktop DecorCluster: four
// quadrant boxes, each drawing only its two inner borders + the rounded
// inner corner, so no phantom outer lines appear.
//
// Stroke matches the master exactly: SOLID white at 0.624px (the Figma
// rects carry a 0.624 stroke; the sub-pixel width is what renders the
// line at ~62% intensity over the dark cap - an explicit white/40 looked
// visibly dimmer than the design). The left arms are 143px (Figma
// Rectangle 105) and dissolve toward the heading via a mask gradient
// that reaches full opacity at ~78% of the arm, matching the rendered
// master's ramp. Desktop renders its own (richer) DecorCluster, so the
// caller gates this to < lg with `lg:hidden`.
export function MobileCapCross({ className }: { className?: string }) {
  const r = "30px";
  // Ramp stops sampled from the master render (values at 36% / 56% of
  // the arm), so the dissolve is slightly ease-out like Figma's, not a
  // straight linear wipe.
  const fade =
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.56) 36%, rgba(0,0,0,0.87) 56%, #000 78%)";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {/* upper-left quadrant - bottom + right borders, rounded bottom-right */}
      <div
        className="absolute right-[33px] top-0 h-[44%] w-[143px] border-b border-r border-white"
        style={{
          borderBottomRightRadius: r,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      {/* upper-right quadrant - bottom + left borders, rounded bottom-left */}
      <div
        className="absolute right-0 top-0 h-[44%] w-[33px] border-b border-l border-white"
        style={{ borderBottomLeftRadius: r }}
      />
      {/* lower-left quadrant - top + right borders, rounded top-right */}
      <div
        className="absolute bottom-[11%] right-[33px] top-[44%] w-[143px] border-t border-r border-white"
        style={{
          borderTopRightRadius: r,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      {/* lower-right quadrant - top + left borders, rounded top-left */}
      <div
        className="absolute bottom-[11%] right-0 top-[44%] w-[33px] border-t border-l border-white"
        style={{ borderTopLeftRadius: r }}
      />
    </div>
  );
}
