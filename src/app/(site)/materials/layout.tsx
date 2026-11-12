import type { ReactNode } from "react";

// «Матеріали» is drawn on the 1710-px shop frames (4635:33058), so it
// scales like /catalog and /checkout (globals.css keys the desktop html
// zoom on this marker).
export default function MaterialsLayout({ children }: { children: ReactNode }) {
  return (
    <div data-canvas="shop" className="contents">
      {children}
    </div>
  );
}
