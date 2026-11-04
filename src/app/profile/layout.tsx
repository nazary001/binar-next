import type { ReactNode } from "react";

// «Мій профіль» is designed on the 1710-px platform frames like the shop;
// the marker keys the desktop html zoom on that canvas (globals.css).
export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div data-canvas="shop" className="contents">
      {children}
    </div>
  );
}
