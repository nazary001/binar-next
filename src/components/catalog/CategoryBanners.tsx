"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ItemsPanel,
  PANEL_H,
  PANEL_W,
  type PointerPopupPosition,
  computePointerPos,
} from "@/components/ui/ItemsPopup";
import { ZoneCard } from "./ZoneCard";
import {
  CATALOG_DIRECTIONS,
  categoryHref,
  directionCatalogHref,
  type CatalogDirection,
} from "./data";

// Figma «Frame 1010106880» (4329:39196): three 495.33 x 260 banners —
// instances of the SAME zones-card component set the hotels ZonesGrid
// uses (1127:5789 «Property 1=Default/Hover, Fill=yes»). Each is a
// p-40 / rounded-40 photo card with the white Button/Large label and
// the outlined arrow button bottom-aligned, plus the blurred #151511
// blob keeping the label legible. Hover (per the Figma hover variant
// AND the «Каталог :: ховер на напрям» frame 4329:39250): 6-px brand
// ring, photo desaturation, orange arrow + «ДЕТАЛІ» ring — and the
// shared dark items panel (Figma 4329:39318, 587 x 478) opens with the
// direction's category chips (each opens its «Категорія» page) and a
// white-outlined «Переглянути все» CTA. The panel opens with its top-left
// corner on the pointer where it entered the banner (designer 2026-11-11:
// on the banner's edge it opened too far from the pointer) and stays
// there; it flips to the pointer's left / above it at the window's right /
// bottom gutter (computePointerPos). The banner keeps its hover look while
// the pointer is in its panel (ZoneCard `active`).
const BANNER_IMAGES: Record<string, string> = {
  "/hotels": "/figma-export/catalog/banner-hotels.png",
  "/protect": "/figma-export/catalog/banner-protect.png",
  "/cleaning": "/figma-export/catalog/banner-cleaning.png",
};

// Logical (pre-zoom) height of the panel's rendered content — lets
// computePointerPos test the REAL height against the bottom gutter
// instead of the 624-px cap, so a short panel is not flipped above the
// pointer to reserve room it won't use. The computed height is layout px
// before the html zoom and before the 0.98 scale-in (a bounding rect read
// mid-fade came out 2 % short, so a panel flipped above the pointer
// ended ~10 px below it).
function measurePanelH(panelEl: HTMLDivElement | null): number | undefined {
  const inner = panelEl?.firstElementChild;
  if (!inner) return undefined;
  return parseFloat(getComputedStyle(inner).height) || undefined;
}

// `gap="b2b"`: the platform frames (4329:56141) space the three 494-px
// banners 26 px apart on the 1534-px content column; the public page
// keeps 32 on its 1550 column.
export function CategoryBanners({ gap = "b2c" }: { gap?: "b2c" | "b2b" } = {}) {
  const [active, setActive] = useState<CatalogDirection | null>(null);
  // Keep the LAST hovered direction around even when active goes back
  // to null, so the panel content stays correct during the fade-out.
  const [last, setLast] = useState<CatalogDirection | null>(null);
  const [popupPos, setPopupPos] = useState<PointerPopupPosition | null>(null);
  // True right after an EXPLICIT close (X / Escape / chip / CTA click).
  // The fading panel is pointer-events-none, so the browser immediately
  // fires mouseenter on whatever banner sits under the cursor — which
  // would instantly reopen the window the user just dismissed. While
  // suppressed, hovers are ignored until the pointer leaves the
  // banners row.
  const [suppressed, setSuppressed] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Client coords of the pointer when the panel opened (the corner it
  // hangs from) and of its latest move (for the leave test on scroll).
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // The anchor is taken when the pointer enters a banner and does not
  // follow later moves: a panel that followed the pointer could never be
  // entered moving right / down, and would swallow the click on the
  // banner. Re-entering the SAME banner from its own panel keeps it.
  const handleHover = useCallback(
    (dir: CatalogDirection) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (suppressed) return;
      if (active?.slug === dir.slug) return;
      anchorRef.current = { x: e.clientX, y: e.clientY };
      lastPointerRef.current = anchorRef.current;
      setActive(dir);
      setLast(dir);
      setPopupPos(
        computePointerPos(e.clientX, e.clientY, measurePanelH(panelRef.current)),
      );
    },
    [suppressed, active],
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

  // The first computePointerPos runs before the panel content is
  // measurable (the window may still show the PREVIOUS direction's
  // chips). One frame later the real height is known: re-solve from the
  // same anchor so the below / above choice uses it.
  useEffect(() => {
    if (!active) return;
    const id = requestAnimationFrame(() => {
      const a = anchorRef.current;
      const h = measurePanelH(panelRef.current);
      if (a && h) setPopupPos(computePointerPos(a.x, a.y, h));
    });
    return () => cancelAnimationFrame(id);
  }, [active]);

  // Hover mode (same recipe as spivpratsya/Coverage): close when the
  // pointer leaves the banners row AND the panel (checked with a grace
  // margin on document mousemove — onMouseLeave on the row alone would
  // close the panel the moment the cursor crosses toward it, since the
  // fixed panel floats outside the row's bounding box). Escape closes.
  // The panel is fixed at the pointer, so on scroll it stays where it
  // opened and the same leave test runs with the last pointer position
  // (the row moves away under a still pointer); a resize re-solves it
  // from the anchor so it stays inside the window.
  useEffect(() => {
    if (!active) return;
    const MARGIN = 32;
    const inside = (r: DOMRect, x: number, y: number) =>
      x >= r.left - MARGIN &&
      x <= r.right + MARGIN &&
      y >= r.top - MARGIN &&
      y <= r.bottom + MARGIN;
    const leaveTest = (x: number, y: number) => {
      const g = rowRef.current?.getBoundingClientRect();
      const p = panelRef.current?.getBoundingClientRect();
      if ((g && inside(g, x, y)) || (p && inside(p, x, y))) return;
      setActive(null);
    };
    const onMove = (e: MouseEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      leaveTest(e.clientX, e.clientY);
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const pt = lastPointerRef.current;
        if (pt) leaveTest(pt.x, pt.y);
      });
    };
    const onResize = () => {
      const a = anchorRef.current;
      if (a) setPopupPos(computePointerPos(a.x, a.y, measurePanelH(panelRef.current)));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [active, dismiss]);

  return (
    <div
      ref={rowRef}
      // Phones: the 342 x 206 photo tiles stack 16 px apart, each with its
      // own 1-px ring (designer 2026-11-11: "give a 16 vertical gap between
      // the cards"; they used to touch like the ZonesGrid master 3117:14393,
      // the rings overlapping into one seam). The lg: gaps win from 640.
      className={`relative flex flex-col gap-4 lg:flex-row ${
        gap === "b2b" ? "lg:gap-[26px]" : "lg:gap-8"
      }`}
    >
      {CATALOG_DIRECTIONS.map((dir) => (
        <ZoneCard
          key={dir.slug}
          href={directionCatalogHref(dir)}
          label={dir.title}
          image={BANNER_IMAGES[dir.href]}
          onMouseEnter={handleHover(dir)}
          active={active?.slug === dir.slug}
          className="h-[206px] w-full lg:h-[260px] lg:flex-1"
        />
      ))}

      {/* Hover items panel — the shared fixed-position window (same as
          the hotels ZonesGrid / Coverage popups). Fades and scales in
          from the corner that sits on the pointer (transformOrigin); it
          appears at the new pointer spot rather than gliding there, so
          left / top are not transitioned. Reduced motion: opacity only.
          Hit-testing follows the panel's rounded shape (the wrapper is
          pointer-events-none, the panel itself takes the events while
          open), so a click right where the pointer entered still lands
          on the banner under the 40-px corner. lg-only. inert while
          closed: the faded panel keeps its last direction's links, which
          must leave the tab order along with the accessibility tree. */}
      <div
        ref={panelRef}
        aria-hidden={!active}
        inert={!active}
        className={`pointer-events-none fixed z-50 hidden transition-[opacity,translate,scale] duration-300 ease-out lg:block ${
          active
            ? "translate-y-0 scale-100 opacity-100 [&>*]:pointer-events-auto"
            : "translate-y-1 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
        }`}
        style={{
          left: popupPos?.left ?? 0,
          top: popupPos?.top ?? 0,
          width: popupPos?.width ?? PANEL_W,
          // maxHeight (not height) so the panel sizes itself to its own
          // chip rows; the cap keeps it inside the viewport.
          maxHeight: popupPos?.height ?? PANEL_H,
          transformOrigin: popupPos?.origin ?? "top left",
        }}
      >
        {last && (
          <ItemsPanel
            title={last.title}
            items={last.panelItems}
            itemHref={(item) => {
              // Panel chips are the direction's categories, so every
              // item resolves to its «Категорія» page (the direction
              // page if the lists ever diverge).
              const card = last.carousel.find((c) => c.label === item);
              return card ? categoryHref(last, card) : directionCatalogHref(last);
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
