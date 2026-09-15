import type { ReactNode } from "react";

// The platform pages are designed on the 1710-px frames like the shop;
// the marker keys the desktop html zoom on that canvas (globals.css).
export default function OrdersLayout({ children }: { children: ReactNode }) {
  return (
    <div data-canvas="shop" className="contents">
      {children}
    </div>
  );
}
