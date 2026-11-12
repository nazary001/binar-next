import type { ReactNode } from "react";

// Dev gallery of the shared cabinet atoms (src/components/platform/ui).
// The folder is "ui-gallery" (URL /ui-gallery; an underscore-prefixed
// folder would be private and the %5F-encoded name broke next build). Same
// 1710-px shop canvas as the cabinet pages.
export default function UiGalleryLayout({ children }: { children: ReactNode }) {
  return (
    <div data-canvas="shop" className="contents">
      {children}
    </div>
  );
}
