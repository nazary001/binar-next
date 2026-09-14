import type { ReactNode } from "react";

// Same shop canvas marker as /catalog: the checkout is drawn on the
// 1710-px frames, so it scales like them (see globals.css desktop zoom).
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div data-canvas="shop" className="contents">
      {children}
    </div>
  );
}
