import type { ReactNode } from "react";

// The dashboard is designed on the 1710-px platform frame like the shop
// and the orders list; the marker keys the desktop html zoom on that
// canvas (globals.css).
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div data-canvas="shop" className="contents">
      {children}
    </div>
  );
}
