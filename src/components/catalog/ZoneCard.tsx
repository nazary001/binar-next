/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { MouseEventHandler } from "react";
import { DetailsIconButton } from "@/components/ui/DetailsIconButton";

// The zones-style photo card (Figma component set 1127:5789) shared by
// the /catalog direction banners and the direction-page subcategory
// carousel: p-40 / rounded-40 photo card, blurred #151511 blob for
// label legibility, white Button/Large label + the ДЕТАЛІ arrow
// button. Hover per the Platform frame 4329:39250 / banner 4329:39265
// (ctx/4329-39265.md): 6-px brand ring, photo desaturation, the arrow
// button filled brand with a white arrow. No rotating text ring there
// (that one belongs to the hotels landing zones only).
export function ZoneCard({
  href,
  label,
  image,
  crop,
  bg,
  className,
  onMouseEnter,
  phonePad = "tile",
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
  // Phones (< 640): the master zone tile (3130:18944) carries a 1-px
  // #8e8e8f ring inside its box; "tile" = the 342 x 206 banner with the
  // master's 40 padding (24 below 360, so the label column keeps room for
  // "індивідуального"), "compact" = the 280-px carousel tile with 24.
  // The 1-px ring is inside the box, so the paddings are 39 / 23.
  phonePad?: "tile" | "compact";
}) {
  const phone =
    phonePad === "compact"
      ? "max-lg:p-[23px]"
      : "min-[360px]:max-lg:p-[39px] max-[359.98px]:p-[23px]";
  return (
    <Link
      href={href}
      onMouseEnter={onMouseEnter}
      className={`group relative flex cursor-pointer flex-col items-center justify-end overflow-clip rounded-[40px] p-10 max-lg:border max-lg:border-stroke-default ${phone} ${className ?? ""}`}
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
      {/* Figma I4329:39265;1127:5898: soft blurred dark blob pinned to the
          bottom edge (l/r -63, bottom -67, h 137, blur 22.15, 80 %). */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[-67px] inset-x-[-63px] h-[137px] bg-[#151511] opacity-80 blur-[22.15px]"
      />
      {/* 6-px brand hover ring painted ABOVE the photo. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[40px] border-[6px] border-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="relative flex w-full items-center gap-6">
        {/* overflowWrap inline: the unlayered phone rule `span {
            overflow-wrap: anywhere }` (globals.css) beats any utility and
            split "індивідуально|го"; labels break on word boundaries only.
            The desktop default is `normal` already. */}
        <span className="flex-1 text-button-lg text-white" style={{ overflowWrap: "normal" }}>
          {label}
        </span>
        <DetailsIconButton variant="light" ring={false} />
      </span>
    </Link>
  );
}
