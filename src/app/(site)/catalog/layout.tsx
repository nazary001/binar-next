import type { ReactNode } from "react";

// The shop is designed on the 1710-px Figma frames, the landing on the
// 1440-px masters. globals.css keys the desktop html zoom on this marker
// (`html:has([data-canvas="shop"])`), so every /catalog route is scaled
// like its 1710 frame while the landing keeps the 1440 canvas. The
// wrapper is `display: contents` and changes nothing else.
export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <div data-canvas="shop" className="contents">
      {children}
    </div>
  );
}
