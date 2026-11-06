import type { ReactNode } from "react";

// «Frame 1010106576» - the cabinet content surface right of the 104-px
// side rail in every Admin frame (ctx 4868:30962, 4868:31380, 5192:79072,
// 4396:11388, 4377:61581; the 5052:32106 dashboard render shows it too):
// #f5f5f5 (token bg-cabinet) with a 48-px top-left corner over the
// white page, pb-32 under the last block, stretching down to the legal
// bar. Phones (< 640, D1 / D10, grey slab 3094:4837): both top corners
// r32 under the white header bar and 48 below the last block (the
// max-lg: values; the desktop strings are untouched, so callers'
// lg:pb-* still win from 640). No overflow clipping here: phone sticky
// bars live inside the slab. Wrap a cabinet page's blocks in it
// (CabinetPageHead first).
// `flushBottom`: a page whose last block is a phone StickyBar (the
// assortment selection bar) drops the 48 under it, so once the page is
// scrolled to its end the dark bar sits right on the dark legal bar
// instead of floating 48 px of grey above it.
export function CabinetPage({
  children,
  className = "",
  flushBottom = false,
}: {
  children: ReactNode;
  className?: string;
  flushBottom?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col bg-bg-cabinet pb-8 max-lg:rounded-t-[32px] lg:rounded-tl-[48px] ${
        flushBottom ? "max-lg:pb-0" : "max-lg:pb-12"
      } ${className}`}
    >
      {children}
    </div>
  );
}
