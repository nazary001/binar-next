"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";
const ARROW_DARK = "/figma-export/directions/arrow-up-right-dark.svg";

type ZoneCard =
  | {
      kind: "image";
      label: string;
      image: string;
      tall?: boolean;
      items?: string[];
      // Hide this card below the lg breakpoint. Used for the
      // duplicate-label filler tile that Figma stacks in the 6-col
      // grid; below lg the column collapses to a single stack and the
      // duplicate reads as a list bug instead of as designed.
      lgOnly?: boolean;
    }
  | {
      kind: "compact";
      label: string;
      items?: string[];
      lgOnly?: boolean;
    }
  | {
      kind: "illustration";
      label: string;
      svg: string;
      items?: string[];
      lgOnly?: boolean;
    }
  | {
      kind: "cta";
      label: string;
      lgOnly?: boolean;
    };

// Item lists per zone. Source of truth for "Ванна кімната" is the
// Figma hover-state frame 1333:7785 — the full 21-item list of
// bathroom supplies the hotel can stock. The other zones get curated
// lists that match the same product categories Binar carries.
const BATHROOM_ITEMS = [
  "Косметика в малій упаковці",
  "Косметика в дозаторах",
  "Набори для гігієни",
  "Шапочка для душу",
  "Фен",
  "Набір для гоління",
  "Набір для зубів",
  "Вага",
  "Смітник",
  "Аксесуари для ванної кімнати: гачки, полички, тримачі, дзеркала",
  "Дзеркало над умивальником",
  "Лоток під косметику",
  "Тримач для туалетного паперу",
  "Туалетний папір",
  "Пакети для предметів гігієни",
  "Рушник-коврик",
  "Халат",
  "Ярлик «Збережемо планету»",
  "Органайзер для серветок",
  "Рушники",
  "Стрічка «Продезінфіковано»",
];

const COLUMNS: ZoneCard[][] = [
  [
    {
      kind: "image",
      label: "Ванна кімната",
      image: "/figma-export/hotels/zone-bathroom.png",
      items: BATHROOM_ITEMS,
    },
    {
      kind: "compact",
      label: "Рецепція",
      items: [
        "Папки для документів",
        "Ручки з логотипом",
        "Брошури та буклети",
        "Стійка з ключ-картами",
        "Інформаційні таблички",
        "Стрічка «Welcome»",
      ],
    },
    {
      kind: "compact",
      label: "Засоби індивідуального захисту",
      items: [
        "Одноразові маски",
        "Латексні рукавички",
        "Антисептик для рук",
        "Дезінфекційні серветки",
        "Бахіли",
      ],
    },
    {
      kind: "compact",
      label: "Засоби індивідуального захисту",
      // Figma 1384:11629 duplicates card 3's label with no items list,
      // so omit `items` so the hover popup carries no invented chips.
      // On mobile the single-stack flow reads the duplicate as a list
      // bug rather than a designed filler tile - hide below lg.
      lgOnly: true,
    },
    {
      kind: "image",
      label: "Ресторан/Бар",
      image: "/figma-export/hotels/zone-restaurant.png",
      items: [
        "Серветки",
        "Зубочистки",
        "Чашки одноразові",
        "Соломинки",
        "Підставки під чашки",
        "Меню-холдери",
      ],
    },
  ],
  [
    {
      kind: "illustration",
      label: "Мінібар",
      svg: "/figma-export/hotels/zone-minibar.svg",
      items: [
        "Склянки",
        "Бокали для вина",
        "Штопор",
        "Льодяні щипці",
        "Серветки",
        "Прайс-лист",
      ],
    },
    {
      kind: "image",
      label: "Кімната/спальня",
      image: "/figma-export/hotels/zone-room.png",
      items: [
        "Тапочки",
        "Халат для номера",
        "Постільна білизна",
        "Подушки",
        "Ковдра",
        "Накидка для ліжка",
        "Чохол на матрац",
        "Інформаційна папка гостя",
      ],
    },
    {
      kind: "illustration",
      label: "Обслуговування територій",
      svg: "/figma-export/hotels/zone-services.svg",
      items: [
        "Засоби для прибирання",
        "Інвентар прибиральника",
        "Засоби для вікон",
        "Засоби для підлоги",
        "Сміттєві пакети",
      ],
    },
  ],
  [
    {
      kind: "image",
      label: "СПА",
      image: "/figma-export/hotels/zone-spa.png",
      tall: true,
      items: [
        "Рушники для СПА",
        "Халати для СПА",
        "Тапочки для СПА",
        "Аромо-масла",
        "Свічки",
        "Маски для обличчя",
        "Косметика для тіла",
      ],
    },
    {
      kind: "compact",
      label: "Санвузли загального користування",
      items: [
        "Туалетний папір промислова намотка",
        "Паперові рушники",
        "Тримачі для рушників",
        "Дозатори рідкого мила",
        "Освіжувач повітря",
      ],
    },
    {
      kind: "compact",
      label: "Інші зручності для гостей",
      items: [
        "Парасолі для гостей",
        "Дитячі набори",
        "Дорожні набори",
        "Аптечка",
      ],
    },
    { kind: "cta", label: "Переглянути каталог" },
  ],
];

// "ДЕТАЛІ · ДЕТАЛІ" curving around the icon button — only revealed on
// the parent card's hover state. Figma node 1333:7835 (hover state for
// the white-variant icon button on image cards) shows the rotating
// text in WHITE against the desaturated photo. For the dark variant
// (compact / illustration cards) the text sits on top of a white
// card surface, so we keep it in neutral-900 there.
//
// Path geometry: Figma "Circle text" master 572:4542 is an 86×86 frame
// with the text-path bounds at (10.83, 10.83) size 64.37 — i.e. a
// radius-32 circle centred at (44, 44). We mirror that in an 88×88
// viewBox (icon 52 + -inset-18 wrapper). At 9 px Manrope Bold the
// natural text width of `ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · ` is
// ~170 SVG units — well under the 2π × 32 ≈ 201.06 path circumference,
// so `textLength=201.06` + `lengthAdjust=spacingAndGlyphs` stretches
// both glyphs and inter-letter spacing evenly to fill the loop. The
// last "·" lands exactly where the next "Д" would start, so the
// rotation is seamless and the spacing reads as uniform around the
// icon — matching the Figma `ОБРАТИ · ОБРАТИ` master verbatim.
const DETAILS_PATH_RADIUS = 32;
const DETAILS_PATH_CIRCUMFERENCE = 2 * Math.PI * DETAILS_PATH_RADIUS;

function DetailsCircleText({ variant }: { variant: "light" | "dark" }) {
  const pathId = useId();
  return (
    <svg
      viewBox="0 0 88 88"
      className={`zones-details-text pointer-events-none absolute inset-0 size-full ${
        variant === "light" ? "text-white" : "text-neutral-900"
      }`}
      aria-hidden
    >
      <defs>
        <path
          id={pathId}
          d={`M 44 ${44 - DETAILS_PATH_RADIUS} A ${DETAILS_PATH_RADIUS} ${DETAILS_PATH_RADIUS} 0 1 1 44 ${44 + DETAILS_PATH_RADIUS} A ${DETAILS_PATH_RADIUS} ${DETAILS_PATH_RADIUS} 0 1 1 44 ${44 - DETAILS_PATH_RADIUS}`}
          fill="none"
        />
      </defs>
      <text
        className="fill-current"
        textLength={DETAILS_PATH_CIRCUMFERENCE}
        lengthAdjust="spacingAndGlyphs"
        style={{
          fontSize: 9,
          fontWeight: 700,
          fontFamily: "var(--font-sans)",
        }}
      >
        <textPath href={`#${pathId}`}>
          ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ ·
        </textPath>
      </text>
    </svg>
  );
}

// Icon button that morphs on the parent card's hover:
//   default — outlined (white border for light variant, dark border
//             + white fill for dark variant) with the matching arrow
//   hover  — solid brand-orange background with a white arrow, and
//            the "ДЕТАЛІ" circular text fades in around it
// All transitions sit on the icon itself (not the parent), and arrow
// images are layered with opacity-fade so they swap smoothly between
// the default + hover assets without a flicker.
//
// Sizing scales with the card it sits inside so the icon keeps the
// same visual weight across breakpoints (compact cards are
// 100/120/131 high, so a fixed 52-px icon used to dominate the small
// mobile card at ~40 % of its height versus ~13 % on image cards at
// lg). All inner pieces scale together so the visible composition
// stays identical at every viewport:
//   base   size-40  rounded-20  arrow-18  hover-ring -inset-14 (=68²)
//   sm     size-48  rounded-24  arrow-22  hover-ring -inset-16 (=80²)
//   lg     size-52  rounded-26  arrow-24  hover-ring -inset-18 (=88²)
// lg matches Figma master 1127:5808 (52×52 outlined, 24×24 arrow, 88
// hover envelope); below lg the same ratios are preserved so the
// icon doesn't "jump" between breakpoints.
function IconButton({ variant }: { variant: "light" | "dark" }) {
  return (
    <span className="relative size-[40px] shrink-0 sm:size-[48px] lg:size-[52px]">
      {/* Circular ДЕТАЛІ text — wrapper grows in lock-step with the
          icon so the 88-unit SVG viewBox stays centred and the path
          radius reads as a consistent ring around the icon at every
          viewport. Hidden by default; the parent card's :hover state
          fades it in. */}
      <span className="pointer-events-none absolute -inset-[14px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:-inset-[16px] lg:-inset-[18px]">
        <DetailsCircleText variant={variant} />
      </span>

      <span
        className={`absolute inset-0 flex items-center justify-center rounded-[20px] border transition-[background-color,border-color] duration-300 sm:rounded-[24px] lg:rounded-[26px] ${
          variant === "light"
            ? "border-white"
            : "border-neutral-900 bg-white"
        } group-hover:border-brand group-hover:bg-brand`}
      >
        {/* Default arrow — fades out on hover. */}
        <img
          src={variant === "light" ? ARROW_WHITE : ARROW_DARK}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute size-[18px] transition-opacity duration-300 group-hover:opacity-0 sm:size-[22px] lg:size-6"
        />
        {/* Hover arrow (always white, fades in over the orange fill). */}
        <img
          src={ARROW_WHITE}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute size-[18px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:size-[22px] lg:size-6"
        />
      </span>
    </span>
  );
}

// Hover-aware variants: each card type accepts an `onHover` callback
// (mouse enter) that publishes both the hovered zone AND its DOM
// element to the parent. The element lets the parent measure the
// card's position via getBoundingClientRect so it can place the
// popup intelligently relative to the hovered card (opposite side
// horizontally, vertically aligned with the card top).
type HoverHandlers = {
  onHover: (el: HTMLDivElement) => void;
};

// Figma 1127:5789 "Property 1=Hover, Fill=yes" defines the active-card
// look used in frame 1333:7764 "While howering". Three things change
// when the user mouses over a card:
//
//   1. The 1-px stroke-default outline is replaced by a 6-px brand
//      ring. We render the ring as a `position: absolute` sibling
//      sitting on top of the photo (DOM order = z-order), instead of
//      via the card's own `border`, because the photo fills the
//      rounded card edge-to-edge and would obscure any
//      box-shadow/inset effect drawn under it. Keeping the ring as
//      an overlay also avoids the 5-px content shift a `border-6`
//      utility would cause on hover.
//
//   2. For image cards only: a square `mix-blend-mode: saturation`
//      overlay sized to the card (+6 px top/bottom, with `aspect-
//      square` for width = card-height + 12) desaturates the photo
//      to a near-grayscale palette. The overlay sits BETWEEN the
//      photo and the bottom blur blob in DOM order so the label /
//      icon stay full-color and the gradient under the label is
//      unchanged.
//
//   3. The icon button (existing IconButton component) already fills
//      with brand orange on group-hover and the "ДЕТАЛІ" circular
//      text fades in around it — both pre-existed; we only need to
//      add the border + desaturation here.
//
// All three transitions share a 300 ms duration to read as a single
// state change.

// Drop-in 6-px brand ring rendered as an absolute overlay so it paints
// on TOP of the card photo (CSS `border` would be drawn before the
// `<img inset-0 />` and stay hidden underneath). Sits inside every
// card; opacity fades in/out with the parent .group's :hover state.
function HoverRing() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[28px] border-[6px] border-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:rounded-[36px] lg:rounded-[40px]"
    />
  );
}

function ImageCard({
  label,
  image,
  tall,
  onHover,
}: HoverHandlers & { label: string; image: string; tall?: boolean }) {
  return (
    <div
      onMouseEnter={(e) => onHover(e.currentTarget)}
      className={`group relative flex flex-col items-center justify-end overflow-clip rounded-[28px] border border-stroke-default p-6 sm:rounded-[36px] sm:p-8 lg:rounded-[40px] lg:p-10 ${
        tall ? "h-[460px] sm:h-[600px] lg:h-[786px]" : "h-[280px] sm:h-[340px] lg:h-[393px]"
      } w-full`}
    >
      <img
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full rounded-[28px] object-cover sm:rounded-[36px] lg:rounded-[40px]"
      />
      {/* Figma 1127:6470 — `aspect-[526/526] bg-[#151511] mix-blend-
          saturation top-[-6px] bottom-[-6px] left-1/2 -translate-x-1/2`.
          With top + bottom set to -6 the element is `card_height + 12`
          tall; aspect-square then derives the matching width. With
          `mix-blend-mode: saturation` the dark fill removes saturation
          from everything BEHIND it (the photo), without touching the
          blur blob or footer that sit on top of it in DOM order.
          Hidden until the parent .group is hovered. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-6px] bottom-[-6px] left-1/2 aspect-square -translate-x-1/2 bg-[#151511] opacity-0 transition-opacity duration-300 [mix-blend-mode:saturation] group-hover:opacity-100"
      />
      {/* Figma I1384:11625;1127:5896 — soft blurred dark ellipse anchored
          bottom-left to keep the label legible without darkening the
          full card edge-to-edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-61.5px] left-[-57.5px] h-[137px] w-[507px] bg-[#151511] opacity-80 blur-[22px]"
      />
      <HoverRing />
      <div className="relative flex w-full max-w-[313px] items-center gap-4 sm:gap-8">
        <p className="flex-1 text-button-lg text-white">{label}</p>
        <IconButton variant="light" />
      </div>
    </div>
  );
}

function CompactCard({ label, onHover }: HoverHandlers & { label: string }) {
  return (
    <div
      onMouseEnter={(e) => onHover(e.currentTarget)}
      className="group relative flex h-[100px] w-full flex-col justify-end overflow-clip rounded-[28px] border border-stroke-default bg-white p-6 sm:h-[120px] sm:rounded-[36px] sm:p-8 lg:h-[131px] lg:rounded-[40px] lg:p-10"
    >
      <HoverRing />
      <div className="relative flex items-center gap-4 sm:gap-8">
        <p className="flex-1 text-button-lg text-neutral-900 transition-colors group-hover:text-brand">
          {label}
        </p>
        <IconButton variant="dark" />
      </div>
    </div>
  );
}

function IllustrationCard({
  label,
  svg,
  onHover,
}: HoverHandlers & { label: string; svg: string }) {
  return (
    <div
      onMouseEnter={(e) => onHover(e.currentTarget)}
      className="group relative flex h-[300px] w-full flex-col items-center justify-end gap-6 rounded-[28px] border border-stroke-default bg-white p-6 sm:h-[340px] sm:gap-8 sm:rounded-[36px] sm:p-8 lg:h-[393px] lg:gap-10 lg:rounded-[40px] lg:p-10"
    >
      <img
        src={svg}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="relative h-[140px] w-[164px] sm:h-[180px] sm:w-[210px] lg:h-[200px] lg:w-[234px]"
      />
      <HoverRing />
      <div className="relative flex w-full items-center gap-4 sm:gap-8">
        <p className="flex-1 text-button-lg text-neutral-900 transition-colors group-hover:text-brand">
          {label}
        </p>
        <IconButton variant="dark" />
      </div>
    </div>
  );
}

function CtaCard({ label }: { label: string }) {
  return (
    <Link
      href="/#contact-form"
      className="group flex h-[100px] w-full cursor-pointer items-center justify-center rounded-[28px] sm:h-[120px] sm:rounded-[36px] lg:h-[131px] lg:rounded-[40px]"
      style={{ background: "#343435" }}
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-button-lg text-white">
          {label}
        </span>
        {/* Orange circle button + arrow scale with the same
            40 / 48 / 52 ratio as the IconButton so the dark CTA card
            visually matches its row-mates at every viewport. */}
        <span className="inline-flex size-[40px] items-center justify-center rounded-[20px] bg-brand sm:size-[48px] sm:rounded-[24px] lg:size-[52px] lg:rounded-[26px]">
          <img
            src={ARROW_WHITE}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="size-[13px] sm:size-[15px] lg:size-[16.5px]"
          />
        </span>
      </span>
    </Link>
  );
}

function ZoneRenderer({
  card,
  onHover,
}: {
  card: ZoneCard;
  onHover: (card: ZoneCard, el: HTMLDivElement) => void;
}) {
  if (card.kind === "cta") {
    return <CtaCard label={card.label} />;
  }
  const handleHover = (el: HTMLDivElement) => {
    if (card.items?.length) onHover(card, el);
  };
  switch (card.kind) {
    case "image":
      return (
        <ImageCard
          label={card.label}
          image={card.image}
          tall={card.tall}
          onHover={handleHover}
        />
      );
    case "compact":
      return <CompactCard label={card.label} onHover={handleHover} />;
    case "illustration":
      return (
        <IllustrationCard
          label={card.label}
          svg={card.svg}
          onHover={handleHover}
        />
      );
  }
}

// Items popup — Figma 1333:7785 "803" frame:
//   • bg: #343435 (the design token --stroke/deep — same dark slab
//     the StarRequestStrip header uses)
//   • rounded-[40px]
//   • Title: text-h2 (44 / 48 bold) white
//   • Close X icon in the top-right (informational only — the popup
//     closes automatically when the mouse leaves the grid)
//   • Chips: white border, white text, transparent fill — opposite
//     of the light-grid chips used elsewhere on the site, suited to
//     the dark surface.
function ItemsPanel({ zone }: { zone: ZoneCard & { items?: string[] } }) {
  return (
    // Figma Frame 803 (1333:7785) — 587×624 dark slab with rounded
    // corners. Panel sizes itself to its content (header + chips
    // rows) — no inner scroll. The outer wrapper caps the panel's
    // height via maxHeight so it can never spill out of the viewport;
    // overflow-hidden clips any rare overflow silently rather than
    // showing a scrollbar.
    <div
      className="flex max-h-full flex-col overflow-hidden rounded-[28px] shadow-[0_24px_64px_-12px_rgba(15,15,20,0.42)] sm:rounded-[36px] lg:rounded-[40px]"
      style={{ background: "#343435" }}
    >
      {/* Header — Figma 1333:7786 has `p-[32px] items-center
          justify-between w-full`, so 32 px on all four sides. Title
          is text-h2 (44/48 bold -0.88px) white at lg, shrinks on
          smaller viewports so the modal still fits. */}
      <div className="flex items-center justify-between gap-4 p-8">
        <h3 className="text-[32px] font-bold leading-[36px] tracking-[-0.64px] text-white lg:text-h2">
          {zone.label}
        </h3>
        {/* Figma 1333:7788 — heroicons-outline/x-mark inside a 40-px
            container with inset 21.88% → visual X ~22.5 px. Stroke
            color = white via currentColor. */}
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="size-[22.5px]"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </span>
      </div>
      {/* Chips area — Figma 1333:7789 sits below the header at
          `pb-[32px] px-[32px]` (no top padding; the first chip row
          starts flush against the header's 32 px bottom). The chip
          row is `flex-wrap gap-[15px] w-[523px]` (= panel 587 - 2*32
          padding). No overflow scroll — the panel grows to fit its
          chip rows; on tight viewports the outer wrapper's maxHeight
          + overflow-hidden clips any rare excess silently. */}
      <div className="px-8 pb-8">
        <ul className="flex flex-wrap gap-[15px]">
          {zone.items?.map((item) => (
            // Figma chip 1333:7791 — `border border-white px-[16px]
            // py-[12px] rounded-[60px]` with body-sm text (16/24)
            // forced onto a single line via whitespace-nowrap. Even
            // the long "Аксесуари ... дзеркала" pill stays on one
            // row in Figma, so the chip stretches to fit its text
            // rather than wrapping mid-pill. The panel itself is
            // pointer-events-none, so chips are pure labels — no
            // hover/click affordances.
            //
            // Manrope Cyrillic renders ~3 % wider in Chrome than in
            // Figma's text engine, which used to push "Смітник" off
            // the row that holds "Набір для гоління / Набір для
            // зубів / Вага". `tracking-[-0.025em]` claws back the
            // delta so each row packs the exact same chips as the
            // Figma master — same 523-px chip area, same px-[16px]
            // / py-[12px] padding, same 9 rows of pills.
            <li
              key={item}
              className="inline-flex items-center whitespace-nowrap rounded-[60px] border border-white px-4 py-3 text-[16px] leading-[16px] tracking-[-0.025em] text-white"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Figma Frame 1333:7785 — panel is 587×624 at the design master
// resolution. We keep these as the *target* dimensions; computePos()
// will shrink them or pick a different side when a viewport can't
// hold the full Figma panel beside the hovered card.
const PANEL_W = 587;
const PANEL_H = 624;
// Visual breathing space around the panel — `24` of ACTUAL screen
// pixels regardless of html zoom. Used as both the gap between the
// panel and the hovered card AND as the minimum margin to the
// viewport edges. computePos() divides by `zoom` to express this
// in logical/pre-zoom pixels for the rest of its math, so the
// rendered gap stays 24 visual px at 1024, 1440, 1920, 2560+.
const PANEL_GAP_VISUAL = 24;
// Smallest acceptable width before we fall back to placing the panel
// above/below the card. 360 leaves room for two chip columns at the
// Figma px-16 py-12 padding without breaking the layout.
const PANEL_MIN_W = 360;

type PopupPosition = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// Decide where to anchor the items panel relative to the hovered card
// so that the panel is ALWAYS fully visible inside the viewport AND
// never sits on top of the card it belongs to.
//
// Decision tree (checked in order — first match wins):
//
//   1. Right side has room for the full 587-wide panel → anchor right
//      at full width. This matches Figma's master `1333:7764` framing
//      for column-1 and column-2 cards at the design's 1440 canvas.
//
//   2. Left side has room for the full 587-wide panel → anchor left
//      at full width. Used by column-3 cards (СПА, Санвузли,
//      Інші зручності, CTA) where the right gutter is too narrow.
//
//   3. Neither side fits the full panel — shrink the panel to the
//      WIDER of the two sides (down to PANEL_MIN_W = 360). This is
//      what kicks in for column-2 cards: at 1440 each lateral gutter
//      is ~500 px, just under 587, so the panel renders ~500 wide
//      without overlapping either neighbour. Chip area scrolls if
//      its 21 pills wrap onto more rows than the panel height holds.
//
//   4. Neither side has min room — fall back to placing the panel
//      ABOVE or BELOW the card (whichever has more room). Edge case
//      for ultra-narrow viewports.
//
// Vertical anchor: panel top aligned with card top so the design
// reads "details for THIS card" the way Figma's master pins them.
// Clamped to PANEL_GAP from the viewport top/bottom so the panel
// follows tall cards (СПА is 786 px tall in the design) and
// mid-scroll cards smoothly into view.
function computePos(cardEl: HTMLDivElement): PopupPosition {
  // `html { zoom: calc(100vw / 1440px) }` in globals.css scales the
  // whole page so every desktop viewport renders as 1440 effective.
  // getBoundingClientRect() returns POST-zoom (visual) pixels, but
  // an element's `style.left` is interpreted as a PRE-zoom CSS pixel
  // that the browser THEN zooms — so we'd be applying zoom twice if
  // we mixed the two. Convert the visual rect + window.innerWidth /
  // Height back into logical/pre-zoom coords and do all the math
  // there. The returned position is in the same logical space, so
  // setting it via style.left/top renders correctly under any zoom.
  const visualRect = cardEl.getBoundingClientRect();
  const zoomStr = getComputedStyle(document.documentElement).zoom;
  const zoom = parseFloat(zoomStr) || 1;

  const cardRect = {
    left: visualRect.left / zoom,
    right: visualRect.right / zoom,
    top: visualRect.top / zoom,
    bottom: visualRect.bottom / zoom,
    width: visualRect.width / zoom,
    height: visualRect.height / zoom,
  };
  const vw = window.innerWidth / zoom;
  const vh = window.innerHeight / zoom;
  // Convert the visual 24-px gap to logical pixels so the rendered
  // breathing room stays 24 actual screen pixels at every zoom level.
  const PANEL_GAP = PANEL_GAP_VISUAL / zoom;

  // Available space on each side of the card, accounting for the
  // PANEL_GAP that sits between the panel and the card.
  const spaceRight = vw - cardRect.right - PANEL_GAP;
  const spaceLeft = cardRect.left - PANEL_GAP;
  const spaceAbove = cardRect.top - PANEL_GAP;
  const spaceBelow = vh - cardRect.bottom - PANEL_GAP;

  // Reserve PANEL_GAP at the OUTER viewport edge too — i.e. the
  // panel never abuts the screen, always has 24 px of breathing
  // room. Hence the lateral side must hold `panel + PANEL_GAP`.
  const fitsRightFull = spaceRight >= PANEL_W + PANEL_GAP;
  const fitsLeftFull = spaceLeft >= PANEL_W + PANEL_GAP;
  const fitsRightMin = spaceRight >= PANEL_MIN_W + PANEL_GAP;
  const fitsLeftMin = spaceLeft >= PANEL_MIN_W + PANEL_GAP;

  let side: "right" | "left" | "below" | "above";
  let width: number;
  let height: number;

  if (fitsRightFull) {
    side = "right";
    width = PANEL_W;
    height = Math.min(PANEL_H, vh - 2 * PANEL_GAP);
  } else if (fitsLeftFull) {
    side = "left";
    width = PANEL_W;
    height = Math.min(PANEL_H, vh - 2 * PANEL_GAP);
  } else if (fitsRightMin || fitsLeftMin) {
    // Pick the wider of the two horizontal sides, then shrink the
    // panel to fit it (minus the outer viewport gap). Bias right
    // when both have the same room — keeps placement deterministic
    // and matches Figma's right-anchor default for left/middle
    // cards.
    side = spaceRight >= spaceLeft ? "right" : "left";
    width = (side === "right" ? spaceRight : spaceLeft) - PANEL_GAP;
    height = Math.min(PANEL_H, vh - 2 * PANEL_GAP);
  } else {
    // Vertical fallback. Pick the taller of above / below, cap the
    // height to the available room, and clamp the width to the
    // viewport (minus the lateral gaps).
    side = spaceBelow >= spaceAbove ? "below" : "above";
    width = Math.min(PANEL_W, vw - 2 * PANEL_GAP);
    const vSpace = side === "below" ? spaceBelow : spaceAbove;
    height = Math.min(PANEL_H, vSpace - PANEL_GAP);
  }

  let left: number;
  let top: number;

  if (side === "right" || side === "left") {
    left = side === "right"
      ? cardRect.right + PANEL_GAP
      : cardRect.left - width - PANEL_GAP;
    // Top-align with the card (Figma master), then clamp to the
    // viewport. For tall cards or cards scrolled near the bottom
    // edge, this slides the panel up so it stays fully visible
    // instead of running off-screen.
    top = Math.max(
      PANEL_GAP,
      Math.min(vh - height - PANEL_GAP, cardRect.top),
    );
  } else {
    top = side === "below"
      ? cardRect.bottom + PANEL_GAP
      : cardRect.top - height - PANEL_GAP;
    // Centre on the card horizontally so the visual link to the
    // hovered card reads cleanly even when the panel is above/below
    // rather than alongside it.
    left = Math.max(
      PANEL_GAP,
      Math.min(
        vw - width - PANEL_GAP,
        cardRect.left + cardRect.width / 2 - width / 2,
      ),
    );
  }

  return { left, top, width, height };
}

export function ZonesGrid() {
  const [active, setActive] = useState<ZoneCard | null>(null);
  // Keep the LAST hovered zone around even when active goes back to
  // null, so the popup content stays correct during the fade-out
  // transition. Updated TOGETHER with `active` in the same setter so
  // no chained effect / cascading render is needed.
  const [last, setLast] = useState<ZoneCard | null>(null);
  // Panel position in VIEWPORT coordinates (position: fixed). Null
  // until the first hover — the panel JSX renders with sensible
  // fallback values so the DOM exists for the fade-in transition,
  // but it stays invisible (opacity-0) and out of the way until a
  // real position is computed.
  const [popupPos, setPopupPos] = useState<PopupPosition | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // Remember which card is currently "active" via its DOM ref so the
  // scroll/resize listeners can re-measure it without re-running
  // handleHover.
  const activeCardElRef = useRef<HTMLDivElement | null>(null);
  // Latest known pointer position (viewport coords). The OS only fires
  // mousemove when the cursor itself moves — a page scroll that slides
  // the grid out from under a still cursor fires no mousemove, so the
  // close-on-leave check would never run. We stash the cursor's last
  // coords here and re-run the outside-the-grid test on scroll too.
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  const handleHover = useCallback((card: ZoneCard, cardEl: HTMLDivElement) => {
    setActive(card);
    setLast(card);
    activeCardElRef.current = cardEl;
    setPopupPos(computePos(cardEl));
  }, []);

  // Track the active card while the user scrolls or the viewport
  // resizes — recompute the panel's position so it follows the card
  // (and stays fully inside the viewport via computePos's clamping).
  // requestAnimationFrame throttles the work to once per frame so
  // scroll handlers stay smooth.
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
        const newPos = computePos(el);
        setPopupPos(newPos);

        // Scroll moves the grid under the cursor without firing
        // mousemove, so the mousemove-only close-on-leave listener
        // can't catch it — the popup would stay visible until the
        // user wiggled the mouse. Re-run the outside-region test
        // here against the last known pointer coords + the freshly
        // computed popup position so the popup auto-dismisses the
        // moment the cursor effectively leaves the grid+popup
        // region during a scroll.
        const p = pointerRef.current;
        if (!p) return;
        const gridEl = gridRef.current;
        if (!gridEl) return;
        const g = gridEl.getBoundingClientRect();
        const inGrid =
          p.x >= g.left && p.x < g.right &&
          p.y >= g.top && p.y < g.bottom;
        const inPopup =
          p.x >= newPos.left && p.x < newPos.left + newPos.width &&
          p.y >= newPos.top && p.y < newPos.top + newPos.height;
        if (!inGrid && !inPopup) {
          setActive(null);
        }
      });
    };
    window.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
    };
  }, [active]);

  // Close-on-leave detection. The panel is position:fixed so it can
  // float outside the grid's bounding box — that means we can't rely
  // on a grid-level onMouseLeave, which would fire as soon as the
  // mouse crossed the grid edge into a fixed panel that hangs over
  // an adjacent section. Instead we listen on document.mousemove and
  // close the panel only when the cursor sits OUTSIDE both the grid
  // AND the panel rectangles. mousemove is cheap (the work is two
  // bbox checks) and we only attach the listener while a panel is
  // actually visible.
  useEffect(() => {
    if (!active || !popupPos) return;
    const onMove = (e: MouseEvent) => {
      const gridEl = gridRef.current;
      if (!gridEl) return;
      const g = gridEl.getBoundingClientRect();
      const inGrid =
        e.clientX >= g.left &&
        e.clientX < g.right &&
        e.clientY >= g.top &&
        e.clientY < g.bottom;
      const inPopup =
        e.clientX >= popupPos.left &&
        e.clientX < popupPos.left + popupPos.width &&
        e.clientY >= popupPos.top &&
        e.clientY < popupPos.top + popupPos.height;
      if (!inGrid && !inPopup) {
        setActive(null);
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [active, popupPos]);

  return (
    // Figma 1384:11619 — the Zones section is a rounded-top container
    // that visually caps the Hero with a curved top. It has white bg,
    // left/right/top borders (#8e8e8f), and rounded-tl/tr 48px corners.
    // The padding is 160px top + 130px sides at the design master.
    <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default lg:pb-0 lg:pt-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
          <h2 className="flex-1 text-neutral-900">
            <span className="text-h2-light">Комплектація під </span>
            <br aria-hidden className="hidden lg:inline" />
            <span className="text-h2">кожну зону готелю</span>
          </h2>
          <p className="flex-1 text-body-sm text-neutral-500">
            Ви можете обрати потрібну зону та отримати готовий набір товарів і
            рекомендацій: що має бути в стандарті, які позиції критичні для
            безперебійної роботи, і де є сенс у персоналізації під бренд.
          </p>
        </div>

        {/* The ref lets the document-level mousemove listener decide
            whether the cursor is inside the grid (and therefore the
            popup should stay open). Close-on-leave is handled in the
            mousemove effect above rather than via onMouseLeave here,
            because the fixed-position popup can float outside the
            grid's bounding box and onMouseLeave would close it the
            moment the mouse crossed that bound. */}
        <div
          ref={gridRef}
          className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:items-start lg:gap-0"
        >
          {COLUMNS.map((col, i) => (
            <div key={i} className="flex flex-col gap-3 sm:gap-4 lg:gap-0">
              {col.map((card, j) => (
                <div
                  key={j}
                  className={card.lgOnly ? "hidden lg:block" : "contents lg:block"}
                >
                  <ZoneRenderer card={card} onHover={handleHover} />
                </div>
              ))}
            </div>
          ))}

          {/* Inline items popup — only renders on lg+. The panel
              uses position: fixed so it lives in VIEWPORT space, not
              grid space. That gives it two key guarantees:
                • It stays fully on screen regardless of scroll, since
                  computePos clamps to viewport margins.
                • It can float beside cards near the grid's vertical
                  edges (e.g. the bottom-of-column "Ресторан / Бар")
                  without being cropped by the grid's bounding box.

              `pointer-events-none` is intentional ALWAYS so the mouse
              passes straight through the panel onto the cards behind
              it. That lets the user sweep across cards and have the
              panel hop to each one without needing to dodge the
              panel itself. Chips inside are informational labels —
              never click targets — so giving up pointer events costs
              nothing UX-wise.

              The transition list includes `left,top,width,height` so
              the panel animates smoothly when:
                • the user moves between cards (left+top change),
                • the window resizes (width/height clamp updates),
                • the user scrolls (top tracks the card). */}
          <div
            aria-hidden={!active}
            className={`pointer-events-none fixed z-50 hidden transition-[opacity,transform,left,top,width,height] duration-300 ease-out lg:block ${
              active
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-1 scale-[0.98] opacity-0"
            }`}
            style={{
              left: popupPos?.left ?? 0,
              top: popupPos?.top ?? 0,
              width: popupPos?.width ?? PANEL_W,
              // maxHeight (not height) so the panel sizes itself to
              // its own chip rows — no scroll, no empty space. The
              // cap from computePos keeps it inside the viewport.
              maxHeight: popupPos?.height ?? PANEL_H,
            }}
          >
            {last && last.kind !== "cta" && last.items && (
              <ItemsPanel zone={last} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
