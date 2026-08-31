/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { MouseEventHandler } from "react";
import { DetailsIconButton } from "@/components/ui/DetailsIconButton";

// The zones-style photo card (Figma component set 1127:5789) shared by
// the /catalog direction banners and the direction-page subcategory
// carousel: p-40 / rounded-40 photo card, blurred #151511 blob for
// label legibility, white Button/Large label + the ДЕТАЛІ arrow
// button. Hover (the Figma Hover variant): 6-px brand ring, photo
// desaturation, orange arrow + rotating ring.
export function ZoneCard({
  href,
  label,
  image,
  crop,
  bg,
  className,
  onMouseEnter,
}: {
  href: string;
  label: string;
  image: string;
  // Exact Figma fill placement (percent box relative to the card) for
  // masters that zoom the photo; absent = plain centred cover.
  crop?: { left: string; top: string; width: string; height: string };
  // Underlay colour for photos with transparent/white padding.
  bg?: string;
  className?: string;
  onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onMouseEnter}
      className={`group relative flex cursor-pointer flex-col items-center justify-end overflow-clip rounded-[40px] p-10 ${className ?? ""}`}
    >
      {bg && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: bg }}
        />
      )}
      {crop ? (
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute max-w-none"
          style={{
            left: crop.left,
            top: crop.top,
            width: crop.width,
            height: crop.height,
          }}
        />
      ) : (
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {/* Hover desaturation — full-bleed #151511 in saturation blend
          mode between the photo and the label layers (the zones master
          derives a square from the card height, which cannot cover
          these WIDE cards; inset-[-6px] guarantees edge-to-edge and the
          card's overflow-clip trims the bleed). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-6px] bg-[#151511] opacity-0 transition-opacity duration-300 [mix-blend-mode:saturation] group-hover:opacity-100"
      />
      {/* Figma 1127:5896 — soft blurred dark blob pinned to the bottom
          edge (l/r −57, bottom −61, h 137, 80 %). */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[-61px] inset-x-[-57px] h-[137px] bg-[#151511] opacity-80 blur-[22px]"
      />
      {/* 6-px brand hover ring painted ABOVE the photo. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[40px] border-[6px] border-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="relative flex w-full items-center gap-6">
        <span className="flex-1 text-button-lg text-white">{label}</span>
        <DetailsIconButton variant="light" />
      </span>
    </Link>
  );
}
