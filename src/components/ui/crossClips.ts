// Clip-paths that de-duplicate the shared hairlines of a 4-quadrant
// decorative cross (the dark-cap "sparkle" used on home/hotels/cleaning/
// protect). Each quadrant box draws TWO inner borders + a rounded inner
// corner; neighbouring quadrants would otherwise paint the SAME cross
// axis twice (two adjacent 1px lines = the "double line" the Figma
// master does not have - there the rects overlap and their strokes
// merge into one hairline). Convention: the UL quadrant owns the top
// V-line and the left H-line, UR owns the right H-line, LL owns the
// bottom V-line; the boxes are nudged 1px (UL right-edge +1, UL/UR
// height +1) so every kept border lands on the SAME pixel row/column,
// and these clips cut the now-exactly-overlapping straight runs from
// UR (left border), LL (top border) and LR (top + left borders) while
// keeping the corner-arc region of each border (last `r` px), where the
// border curves away from the shared axis and is the only painter.
export function crossClips(r: number) {
  return {
    // UR: cut the left border's straight run (keep the bottom r px arc)
    ur: `polygon(1px 0, 100% 0, 100% 100%, 0 100%, 0 calc(100% - ${r}px), 1px calc(100% - ${r}px))`,
    // LL: cut the top border's straight run (keep the right r px arc)
    ll: `polygon(0 1px, calc(100% - ${r}px) 1px, calc(100% - ${r}px) 0, 100% 0, 100% 100%, 0 100%)`,
    // LR: cut both straight runs (keep the top-left arc region)
    lr: `polygon(0 0, ${r}px 0, ${r}px 1px, 100% 1px, 100% 100%, 1px 100%, 1px ${r}px, 0 ${r}px)`,
  };
}
