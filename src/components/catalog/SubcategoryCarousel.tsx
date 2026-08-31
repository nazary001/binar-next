"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronSideIcon } from "./icons";
import { ZoneCard } from "./ZoneCard";
import { categoryHref, type CatalogDirection } from "./data";

// Direction-page subcategory carousel — Figma «Карусель» (3685:54317)
// on the «Напрям» frame (3682:46834): a single 260-px row of 393-px
// zones-style cards with 32-px gaps, clipped at the content edges,
// paged by two 40-px ghost chevron buttons that sit in the side
// gutters, vertically centred on the row. Each card deep-links into
// this direction's catalog with its subcategory pre-applied.
export function SubcategoryCarousel({
  direction,
}: {
  direction: CatalogDirection;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows]);

  // Page by exactly one card (card width + the 32-px gap), measured
  // live so the step stays correct at every breakpoint.
  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    const card = el?.querySelector("a");
    if (!el || !card) return;
    el.scrollBy({
      left: dir * (card.getBoundingClientRect().width /
        (parseFloat(getComputedStyle(document.documentElement).zoom) || 1) +
        32),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateArrows}
        aria-label={`Підкатегорії: ${direction.title}`}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:gap-8 [&::-webkit-scrollbar]:hidden"
      >
        {direction.carousel.map((card) => (
          <ZoneCard
            key={card.label}
            href={categoryHref(direction, card)}
            label={card.label}
            image={card.image}
            crop={card.crop}
            bg={card.bg}
            className="h-[220px] w-[320px] shrink-0 snap-start lg:h-[260px] lg:w-[393px]"
          />
        ))}
      </div>

      {/* Ghost chevron pagers — 40-px icon buttons living in the page's
          side gutters (16 px off the content edge, centred on the row),
          per the «Напрям» frame. Desktop-only: below lg the gutters are
          too narrow and the row swipes natively. */}
      <button
        type="button"
        aria-label="Попередні підкатегорії"
        disabled={!canPrev}
        onClick={() => scrollByCard(-1)}
        className="absolute left-[-56px] top-1/2 hidden size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 lg:flex"
      >
        <ChevronSideIcon className="size-6" />
      </button>
      <button
        type="button"
        aria-label="Наступні підкатегорії"
        disabled={!canNext}
        onClick={() => scrollByCard(1)}
        className="absolute right-[-56px] top-1/2 hidden size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 lg:flex"
      >
        <ChevronSideIcon mirrored className="size-6" />
      </button>
    </div>
  );
}
