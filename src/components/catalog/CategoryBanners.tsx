"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ItemsPanel,
  PANEL_H,
  PANEL_W,
  type PopupPosition,
  computePos,
} from "@/components/ui/ItemsPopup";
import { ZoneCard } from "./ZoneCard";
import {
  CATALOG_DIRECTIONS,
  categoryHref,
  directionCatalogHref,
  type CatalogDirection,
} from "./data";

// Figma «Frame 1010106880» (3603:11684): three 260-px photo banners —
// instances of the SAME zones-card component set the hotels ZonesGrid
// uses (1127:5789 «Property 1=Default/Hover, Fill=yes»). Each is a
// p-40 / rounded-40 photo card with the white Button/Large label and
// the outlined arrow button bottom-aligned, plus the blurred #151511
// blob keeping the label legible. Hover (per the Figma hover variant
// AND the «Каталог :: ховер на напрям» frame 3677:41427): 6-px brand
// ring, photo desaturation, orange arrow + «ДЕТАЛІ» ring — and the
// shared dark items panel (Figma 3677:42133) opens beside the banner
// with the direction's product-type chips (each deep-links into the
// filtered catalog) and a white-outlined «Переглянути все» CTA.
const BANNER_IMAGES: Record<string, string> = {
  "/hotels": "/figma-export/catalog/banner-hotels.png",
  "/protect": "/figma-export/catalog/banner-protect.png",
  "/cleaning": "/figma-export/catalog/banner-cleaning.png",
};

// Logical (pre-zoom) height of the panel's rendered content — lets
// computePos clamp against the REAL height instead of the 624-px cap,
// so the panel top-aligns with the banner like the Figma frame instead
// of sliding up to reserve room it won't use.
function measurePanelH(panelEl: HTMLDivElement | null): number | undefined {
  const inner = panelEl?.firstElementChild;
  if (!inner) return undefined;
  const zoom =
    parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  return inner.getBoundingClientRect().height / zoom;
}

export function CategoryBanners() {
  const [active, setActive] = useState<CatalogDirection | null>(null);
  // Keep the LAST hovered direction around even when active goes back
  // to null, so the panel content stays correct during the fade-out.
  const [last, setLast] = useState<CatalogDirection | null>(null);
  const [popupPos, setPopupPos] = useState<PopupPosition | null>(null);
  // True right after an EXPLICIT close (X / Escape / chip / CTA click).
  // The fading panel is pointer-events-none, so the browser immediately
  // fires mouseenter on whatever banner sits under the cursor — which
  // would instantly reopen the window the user just dismissed. While
  // suppressed, hovers are ignored until the pointer leaves the
  // banners row.
  const [suppressed, setSuppressed] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCardElRef = useRef<HTMLAnchorElement | null>(null);

  const handleHover = useCallback(
    (dir: CatalogDirection) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (suppressed) return;
      setActive(dir);
      setLast(dir);
      activeCardElRef.current = e.currentTarget;
      setPopupPos(
        computePos(e.currentTarget, measurePanelH(panelRef.current)),
      );
    },
    [suppressed],
  );

  // Explicit dismiss — close AND ignore hover reopens until the
  // pointer leaves the banners row.
  const dismiss = useCallback(() => {
    setActive(null);
    setSuppressed(true);
  }, []);

  // Lift the hover suppression once the pointer is outside the row.
  useEffect(() => {
    if (!suppressed) return;
    const onMove = (e: MouseEvent) => {
      const r = rowRef.current?.getBoundingClientRect();
      if (!r) return;
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (!inside) setSuppressed(false);
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    return () => document.removeEventListener("mousemove", onMove);
  }, [suppressed]);

  // The first computePos runs before the panel content is measurable
  // (the window may still show the PREVIOUS direction's chips). One
  // frame later the real height is known — re-clamp so the panel
  // top-aligns with the hovered banner exactly.
  useEffect(() => {
    if (!active) return;
    const id = requestAnimationFrame(() => {
      const el = activeCardElRef.current;
      const h = measurePanelH(panelRef.current);
      if (el && h) setPopupPos(computePos(el, h));
    });
    return () => cancelAnimationFrame(id);
  }, [active]);

  // Hover mode (same recipe as spivpratsya/Coverage): close when the
  // pointer leaves the banners row AND the panel (checked with a grace
  // margin on document mousemove — onMouseLeave on the row alone would
  // close the panel the moment the cursor crosses toward it, since the
  // fixed panel floats outside the row's bounding box). Escape closes.
  useEffect(() => {
    if (!active) return;
    const MARGIN = 32;
    const inside = (r: DOMRect, x: number, y: number) =>
      x >= r.left - MARGIN &&
      x <= r.right + MARGIN &&
      y >= r.top - MARGIN &&
      y <= r.bottom + MARGIN;
    const onMove = (e: MouseEvent) => {
      const g = rowRef.current?.getBoundingClientRect();
      const p = panelRef.current?.getBoundingClientRect();
      if (
        (g && inside(g, e.clientX, e.clientY)) ||
        (p && inside(p, e.clientX, e.clientY))
      )
        return;
      setActive(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, dismiss]);

  // Follow the active banner on scroll/resize so the panel stays glued
  // to it (and inside the viewport via computePos clamping).
  useEffect(() => {
    if (!active) return;
    let ticking = false;
    const recalc = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const el = activeCardElRef.current;
        if (!el) return;
        setPopupPos(computePos(el, measurePanelH(panelRef.current)));
      });
    };
    window.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
    };
  }, [active]);

  return (
    <div ref={rowRef} className="relative flex flex-col gap-6 lg:flex-row lg:gap-8">
      {CATALOG_DIRECTIONS.map((dir) => (
        <ZoneCard
          key={dir.slug}
          href={directionCatalogHref(dir)}
          label={dir.title}
          image={BANNER_IMAGES[dir.href]}
          onMouseEnter={handleHover(dir)}
          className="h-[220px] w-full lg:h-[260px] lg:flex-1"
        />
      ))}

      {/* Hover items panel — the shared fixed-position window (same as
          the hotels ZonesGrid / Coverage popups). Fades/scales in
          beside the hovered banner and animates between banners via
          the left/top/width/height transition. lg-only. */}
      <div
        ref={panelRef}
        aria-hidden={!active}
        className={`fixed z-50 hidden transition-[opacity,translate,scale,left,top,width,height] duration-300 ease-out lg:block ${
          active
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-1 scale-[0.98] opacity-0"
        }`}
        style={{
          left: popupPos?.left ?? 0,
          top: popupPos?.top ?? 0,
          width: popupPos?.width ?? PANEL_W,
          // maxHeight (not height) so the panel sizes itself to its own
          // chip rows; the cap keeps it inside the viewport.
          maxHeight: popupPos?.height ?? PANEL_H,
        }}
      >
        {last && (
          <ItemsPanel
            title={last.title}
            items={last.panelItems}
            itemHref={(item) => {
              // Panel chips mirror the carousel taxonomy, so every item
              // resolves to its «Категорія» page; ?sub= stays as the
              // fallback should the lists ever diverge.
              const card = last.carousel.find((c) => c.label === item);
              return card
                ? categoryHref(last, card)
                : `${directionCatalogHref(last)}?sub=${encodeURIComponent(item)}`;
            }}
            onItemClick={dismiss}
            cta={{
              label: "Переглянути все",
              href: directionCatalogHref(last),
              onClick: dismiss,
            }}
            onClose={dismiss}
          />
        )}
      </div>
    </div>
  );
}
