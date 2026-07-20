import { crossClips } from "@/components/ui/crossClips";

// Mobile decorative cross/sparkle for the dark CTA caps (Figma 3137:15415).
// A white "+" anchored near the right edge whose four inner corners are
// rounded (~30px radius), so the vertical and horizontal hairlines meet in
// a 4-point sparkle. Built like the desktop DecorCluster: four quadrant
// boxes, each drawing only its two inner borders + the rounded inner
// corner, so no phantom outer lines appear.
//
// Stroke: the Figma rects carry a SOLID white stroke at 0.624px, which
// the master renders as a ~178/255 hairline over the #343435 cap. A 1px
// border at 62.4% alpha (`border-white/[.624]`) reproduces that exact
// line value at ANY DPR - a literal 0.624px border-width would round up
// to a full-intensity device pixel and read thicker/brighter than the
// design (the desktop masters use a true 1px stroke; only the mobile
// masters are 0.624).
//
// SINGLE-LINE construction: in Figma the quadrant rects OVERLAP so their
// strokes merge into ONE hairline; four naive bordered boxes paint each
// axis twice (adjacent pixel columns = a visible double line). Here the
// UL box owns the top V-line + left H-line (its right edge is nudged
// 1px out and its height 1px down so its borders land exactly on the
// shared axis pixels), UR owns the right H-line, LL owns the bottom
// V-line, and crossClips() cuts the duplicated straight runs from
// UR/LL/LR while keeping their corner arcs tangent to the same pixels.
//
// The left arms are 143px (Figma Rectangle 105) and dissolve toward the
// heading via a mask gradient that reaches full opacity at ~78% of the
// arm, matching the rendered master's ramp. Desktop renders its own
// (richer) DecorCluster, so the caller gates this to < lg with
// `lg:hidden`.
//
// `lineY` / `bottomInset` position the horizontal axis and the bottom
// end of the vertical arm (defaults = the home/hotels/cleaning caps;
// protect passes px values for its taller cap).
export function MobileCapCross({
  className,
  lineY = "44%",
  bottomInset = "11%",
}: {
  className?: string;
  lineY?: string;
  bottomInset?: string;
}) {
  const r = 30;
  const clips = crossClips(r);
  const upperH = `calc(${lineY} + 1px)`;
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
      {/* upper-left quadrant - OWNS the top V-line and left H-line */}
      <div
        className="absolute w-[143px] border-b border-r border-white/[.624]"
        style={{
          right: "32px",
          top: 0,
          height: upperH,
          borderBottomRightRadius: r,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      {/* upper-right quadrant - OWNS the right H-line; left border
          clipped to its arc */}
      <div
        className="absolute w-[33px] border-b border-l border-white/[.624]"
        style={{
          right: 0,
          top: 0,
          height: upperH,
          borderBottomLeftRadius: r,
          clipPath: clips.ur,
        }}
      />
      {/* lower-left quadrant - OWNS the bottom V-line; top border
          clipped to its arc */}
      <div
        className="absolute w-[143px] border-t border-r border-white/[.624]"
        style={{
          right: "32px",
          top: lineY,
          bottom: bottomInset,
          borderTopRightRadius: r,
          maskImage: fade,
          WebkitMaskImage: fade,
          clipPath: clips.ll,
        }}
      />
      {/* lower-right quadrant - arcs only; both straight borders clipped */}
      <div
        className="absolute w-[33px] border-t border-l border-white/[.624]"
        style={{
          right: 0,
          top: lineY,
          bottom: bottomInset,
          borderTopLeftRadius: r,
          clipPath: clips.lr,
        }}
      />
    </div>
  );
}
