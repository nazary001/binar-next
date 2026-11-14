/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";
const ARROW_DARK = "/figma-export/directions/arrow-up-right-dark.svg";

// Phone (< 640) category / zone tiles of the landing pages, redesigned by
// the designer on 2026-11-13 (comments C37, C47..C50): the hotels stack
// 3117:14393 and the same 5492:* tiles in protect 3165:6549, cleaning
// 3165:6803 and spivpratsya 3166:8824. One shared stack so all four
// pages take the same values:
//   stack  one column, 16-px gaps (the old tiles touched with 1-px seams)
//   photo  342 x 206, rounded-32, p-24, no outline (designer 2026-11-11),
//          label row pinned 24 px from the bottom, white 42-px arrow disc
//   text   min 131 tall, rounded-32, p-24, 1-px #8e8e8f outline, label
//          row centred vertically, dark 42-px arrow disc. No fill of its
//          own: it shows the surface it sits on (#f8f8f8 inside the
//          protect / cleaning light card, white on hotels / spivpratsya),
//          as in the renders of those stacks.
//   cta    «Button catalog» 342 x 131, rounded-32, px-24, 18-px label on
//          one line, 42-px orange disc
// No hooks and no "use client": the client ZonesGrid / Coverage and the
// server Solutions sections all render it.
export type PhoneCard =
  | {
      kind: "photo";
      label: string;
      href: string;
      image: string;
      // Exact Figma fill placement (percent box of the tile); absent = cover.
      crop?: { left: string; top: string; width: string; height: string };
      // object-position for the cover fill (e.g. "50% 100%" = Figma object-bottom).
      objectPosition?: string;
    }
  | { kind: "text"; label: string; href: string }
  | { kind: "cta"; label: string; href: string };

// Figma 5492:10995: Manrope SemiBold 16 / 22, tracking 0.16, flex-1 in a
// gap-24 row next to the 42-px disc (228 px wide in the 342 tile). Kept in
// a <p>: the phone rule `span { overflow-wrap: anywhere }` in globals.css
// would split words inside a bare <span>.
const LABEL = "flex-1 text-[16px] font-semibold leading-[22px] tracking-[0.16px]";

// «Icon button decorative» (5492:10996 / 5492:11001) and the catalog disc
// (5492:10980): 42 px, the 24-px heroicons frame holds the same 16.5-px
// arrow glyph the site ships, centred. Static: no hover on touch layouts.
function Disc({ tone }: { tone: "light" | "dark" | "brand" }) {
  const fill =
    tone === "brand"
      ? "bg-brand"
      : tone === "light"
        ? "border border-white"
        : "border border-neutral-900";
  return (
    <span
      aria-hidden
      className={`flex size-[42px] shrink-0 items-center justify-center rounded-full ${fill}`}
    >
      <img
        src={tone === "dark" ? ARROW_DARK : ARROW_WHITE}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="size-[16.5px]"
      />
    </span>
  );
}

function Tile({ card }: { card: PhoneCard }) {
  if (card.kind === "cta") {
    // Figma 5492:10978 «Button catalog»: label at x 24, disc at x 276.
    // Plain px values instead of text-button-lg, which is overridden to
    // 16 px below 640 in globals.css.
    return (
      <Link
        href={card.href}
        className="flex h-[131px] w-full items-center justify-between rounded-[32px] bg-neutral-800 px-6"
      >
        <p className="whitespace-nowrap text-[18px] font-semibold leading-[22px] tracking-[0.18px] text-white">
          {card.label}
        </p>
        <Disc tone="brand" />
      </Link>
    );
  }
  if (card.kind === "text") {
    // Figma 5492:10987. p-[23px]: Figma's p-24 is measured from the outer
    // edge with the 1-px stroke inside it; the CSS border sits outside the
    // padding, so 23 + 1 puts the row at x 24 and leaves the label 228 wide.
    return (
      <Link
        href={card.href}
        className="flex min-h-[131px] w-full flex-col justify-center rounded-[32px] border border-stroke-default p-[23px]"
      >
        <div className="flex w-full items-center gap-6">
          <p className={`${LABEL} text-neutral-900`}>{card.label}</p>
          <Disc tone="dark" />
        </div>
      </Link>
    );
  }
  // Figma 5492:10997: photo fill + dark halo, row 24 px above the bottom.
  return (
    <Link
      href={card.href}
      className="relative flex h-[206px] w-full flex-col justify-end overflow-clip rounded-[32px] p-6"
    >
      {card.crop ? (
        <img
          src={card.image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute max-w-none"
          style={{
            left: card.crop.left,
            top: card.crop.top,
            width: card.crop.width,
            height: card.crop.height,
          }}
        />
      ) : (
        <img
          src={card.image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          style={card.objectPosition ? { objectPosition: card.objectPosition } : undefined}
        />
      )}
      {/* Figma 5492:10998: #151511 strip blurred 22.15 at 80 %, 57 px past
          both sides and 61 px below the tile, clipped by the tile, so the
          white label stays legible on any photo. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[-57px] bottom-[-61px] h-[137px] bg-[#151511] opacity-80 blur-[22.15px]"
      />
      <div className="relative flex w-full items-center gap-6">
        <p className={`${LABEL} text-white`}>{card.label}</p>
        <Disc tone="light" />
      </div>
    </Link>
  );
}

export function PhoneCardStack({
  cards,
  className,
}: {
  cards: PhoneCard[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      {cards.map((card) => (
        <Tile key={card.label} card={card} />
      ))}
    </div>
  );
}
