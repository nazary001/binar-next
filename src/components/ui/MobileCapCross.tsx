// Mobile decorative cross/sparkle for the dark CTA caps (Figma 3137:15415).
// A faint white "+" anchored near the right edge whose four inner corners
// are rounded (~30px radius), so the vertical and horizontal hairlines meet
// in a 4-point sparkle. Built the same way as the desktop DecorCluster: four
// quadrant boxes, each drawing only its two inner borders + the rounded inner
// corner, so no phantom outer lines appear. The left arm fades out under the
// heading via a mask gradient. Desktop renders its own (richer) DecorCluster,
// so the caller gates this to < lg with `lg:hidden`.
export function MobileCapCross({ className }: { className?: string }) {
  const r = "30px";
  const fade = "linear-gradient(to right, transparent 0%, #000 60%)";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {/* upper-left quadrant - bottom + right borders, rounded bottom-right */}
      <div
        className="absolute right-[33px] top-0 h-[44%] w-[280px] border-b border-r border-white/40"
        style={{
          borderBottomRightRadius: r,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      {/* upper-right quadrant - bottom + left borders, rounded bottom-left */}
      <div
        className="absolute right-0 top-0 h-[44%] w-[33px] border-b border-l border-white/40"
        style={{ borderBottomLeftRadius: r }}
      />
      {/* lower-left quadrant - top + right borders, rounded top-right */}
      <div
        className="absolute bottom-[11%] right-[33px] top-[44%] w-[280px] border-t border-r border-white/40"
        style={{
          borderTopRightRadius: r,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      {/* lower-right quadrant - top + left borders, rounded top-left */}
      <div
        className="absolute bottom-[11%] right-0 top-[44%] w-[33px] border-t border-l border-white/40"
        style={{ borderTopLeftRadius: r }}
      />
    </div>
  );
}
