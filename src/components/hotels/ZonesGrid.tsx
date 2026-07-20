"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ItemsPanel,
  PANEL_H,
  PANEL_W,
  type PopupPosition,
  computePos,
} from "@/components/ui/ItemsPopup";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";
const ARROW_DARK = "/figma-export/directions/arrow-up-right-dark.svg";

type ZoneCard =
  | {
      kind: "image";
      label: string;
      image: string;
      tall?: boolean;
      items?: string[];
    }
  | {
      kind: "compact";
      label: string;
      items?: string[];
    }
  | {
      kind: "illustration";
      label: string;
      svg: string;
      items?: string[];
    }
  | {
      kind: "cta";
      label: string;
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
      label: "Обслуговування номерів та приміщень",
      items: [
        "Засоби для прибирання номерів",
        "Візок покоївки",
        "Таблички «Не турбувати»",
        "Мішки для білизни",
        "Засоби для прання",
        "Набір для прасування",
      ],
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
// viewBox (icon 52 + -inset-18 wrapper). The Figma text-path 2567:2617
// spells the ring with FIVE "ДЕТАЛІ" reps (not four). At 9 px Manrope
// Regular five reps sit just under the ~201 path circumference
// (2*pi*32), so `textLength=201` + `lengthAdjust="spacing"` evens out
// only the inter-glyph SPACING to fill the loop seamlessly WITHOUT
// stretching the glyph shapes. (The earlier four-rep Bold version used
// `spacingAndGlyphs`, which deformed the glyphs to fill the ring.)
// Same approach as the ScrollToTopButton circle text.
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
        // xml:space="preserve" keeps the TRAILING space after the last
        // "ДЕТАЛІ · ". Without it SVG trims trailing whitespace, so at the
        // loop seam the final "·" butts straight against the first "Д"
        // (one dot reads too close to the word). Preserving it makes the
        // seam gap identical to every interior " · " gap. textLength +
        // lengthAdjust live on the textPath so only spacing is evened
        // out to fill the ring (glyph shapes stay intact).
        xmlSpace="preserve"
        style={{
          fontSize: 9,
          fontWeight: 400,
          fontFamily: "var(--font-sans)",
        }}
      >
        <textPath
          href={`#${pathId}`}
          textLength={DETAILS_PATH_CIRCUMFERENCE}
          lengthAdjust="spacing"
        >
          {"ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · "}
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
//   base   size-40  rounded-20  arrow-13    hover-ring -inset-14
//   sm     size-48  rounded-24  arrow-15    hover-ring -inset-16
//   lg     size-52  rounded-26  arrow-16.5  hover-ring -inset-18
// lg matches Figma master 1127:5808 (52x52 outlined). NOTE: Figma's
// arrow lives in a 24px `heroicons-outline/arrow-up-right` container
// with the glyph inset 15.62%, so the VISIBLE arrow is ~16.5px, NOT
// 24px. Sizing the img to 16.5 keeps the stroke exactly as thin as the
// design (the old size-6 / 24px rendered the arrow ~1.45x too big, so
// its lines looked too thick). Matches the CTA card arrow (13/15/16.5).
function IconButton({ variant }: { variant: "light" | "dark" }) {
  return (
    // Figma mobile master 3117:14389 sizes the icon at the SAME 52px the
    // desktop master uses (each card is the compact 131-px tile on mobile),
    // so the icon no longer scales down below lg — base already equals the
    // prior lg value, so desktop stays byte-for-byte identical.
    <span className="relative size-[52px] shrink-0">
      {/* Circular ДЕТАЛІ text — wrapper grows in lock-step with the
          icon so the 88-unit SVG viewBox stays centred and the path
          radius reads as a consistent ring around the icon at every
          viewport. Hidden by default; the parent card's :hover state
          fades it in. */}
      <span className="pointer-events-none absolute -inset-[18px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <DetailsCircleText variant={variant} />
      </span>

      <span
        className={`absolute inset-0 flex items-center justify-center rounded-[26px] border transition-[background-color,border-color] duration-300 ${
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
          className="absolute size-[16.5px] transition-opacity duration-300 group-hover:opacity-0"
        />
        {/* Hover arrow (always white, fades in over the orange fill). */}
        <img
          src={ARROW_WHITE}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute size-[16.5px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      </span>
    </span>
  );
}

// Click-aware variants: each card type accepts an `onSelect` callback
// (fired on click / Enter / Space) that publishes both the chosen zone
// AND its DOM element to the parent. The element lets the parent measure
// the card's position via getBoundingClientRect so it can place the
// popup intelligently relative to the clicked card (opposite side
// horizontally, vertically aligned with the card top).
type SelectHandlers = {
  onSelect: (el: HTMLDivElement) => void;
};

// Shared click + keyboard wiring for the (non-link) zone cards so a
// click OR Enter/Space opens the details panel and the card reads as a
// button to assistive tech.
function cardActivationProps(onSelect: (el: HTMLDivElement) => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-haspopup": "dialog" as const,
    onClick: (e: ReactMouseEvent<HTMLDivElement>) => onSelect(e.currentTarget),
    onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(e.currentTarget);
      }
    },
  };
}

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
      className="pointer-events-none absolute inset-0 rounded-[40px] border-[6px] border-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100"
    />
  );
}

function ImageCard({
  label,
  image,
  tall,
  onSelect,
}: SelectHandlers & { label: string; image: string; tall?: boolean }) {
  return (
    <div
      {...cardActivationProps(onSelect)}
      // Figma mobile master 3117:14389 renders EVERY zone card (image cards
      // included, and the СПА `tall` one) as a uniform 206-px tile — the
      // photo fills it as a background. Only at lg do the image cards grow
      // to their distinct master heights (786 tall / 393 standard), so those
      // heights are re-pinned at lg: and desktop stays identical.
      className={`group relative flex min-h-[206px] cursor-pointer flex-col items-center justify-end overflow-clip rounded-[40px] border border-stroke-default p-10 ${
        tall ? "lg:h-[786px]" : "lg:h-[393px]"
      } w-full`}
    >
      {/* No own border-radius on the photo: the card is `overflow-clip`
          + rounded, so it already clips the photo to its INNER rounded
          edge (card radius minus the 1px border). Giving the <img> its
          own rounded-40 made the image corner 1px looser than the
          border's inner curve, so the two radii didn't line up and a
          thin gap showed at each corner. Letting the parent clip handle
          it makes the photo edge sit flush against the border. */}
      <img
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        // Figma anchors the photo to its bottom inside the compact mobile
        // tile; the desktop master centres it in the taller card, so restore
        // object-center at lg to keep desktop byte-for-byte identical.
        className="absolute inset-0 size-full object-cover object-bottom lg:object-center"
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
      {/* Figma mobile label row is full-width inside the p-40 card with a
          gap-32 (gap-8) to the icon; the 313-px cap is a desktop-only
          constraint, re-pinned at lg so desktop is unchanged. */}
      <div className="relative flex w-full items-center gap-8 lg:max-w-[313px]">
        <p className="flex-1 text-button-lg text-white">{label}</p>
        <IconButton variant="light" />
      </div>
    </div>
  );
}

function CompactCard({ label, onSelect }: SelectHandlers & { label: string }) {
  return (
    <div
      {...cardActivationProps(onSelect)}
      // Figma mobile master 3117:14389 sizes the compact tile at the uniform
      // 206-px / rounded-40 / p-40 grid height (min-height so a 2-line label
      // e.g. "Засоби індивідуального захисту" can still grow it). Desktop
      // keeps its fixed 131-px bento height (lg:min-h-0 lets lg:h-[131px]
      // win over the taller mobile min-height) so it stays byte-for-byte.
      className="group relative flex min-h-[206px] w-full cursor-pointer flex-col justify-end overflow-clip rounded-[40px] border border-stroke-default bg-white p-10 lg:h-[131px] lg:min-h-0"
    >
      <HoverRing />
      <div className="relative flex items-center gap-8">
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
  onSelect,
}: SelectHandlers & { label: string; svg: string }) {
  return (
    <div
      {...cardActivationProps(onSelect)}
      // Figma mobile master 3117:14389 hides the illustration and renders
      // these zones as the uniform 206-px tile (label + icon only). The
      // illustration, the 393-px height and the gap to it are desktop-only
      // and re-pinned at lg so desktop stays byte-for-byte identical.
      className="group relative flex min-h-[206px] w-full cursor-pointer flex-col items-center justify-end rounded-[40px] border border-stroke-default bg-white p-10 lg:h-[393px] lg:gap-10"
    >
      <img
        src={svg}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        // Illustration only exists on the desktop master; mobile is the
        // compact label-only tile, so hide it below lg.
        className="relative hidden lg:block lg:h-[200px] lg:w-[234px]"
      />
      <HoverRing />
      <div className="relative flex w-full items-center gap-8">
        <p className="flex-1 text-button-lg text-neutral-900 transition-colors group-hover:text-brand">
          {label}
        </p>
        <IconButton variant="dark" />
      </div>
    </div>
  );
}

function CtaCard({ label, onActivate }: { label: string; onActivate?: () => void }) {
  return (
    <Link
      href="/#contact-form"
      // CTA has no zone items, so clicking it dismisses any open
      // zone-details popup before scrolling to the contact form.
      onClick={onActivate}
      // Hover = Figma "Button catalog" Variant2 (2395:5450): an inverse of
      // the default - the dark fill drops to a 1px outline and the label
      // flips to dark; the orange circle + arrow stay unchanged. The border
      // uses `stroke-default` (#8e8e8f) so it matches the neighbouring
      // zone-card borders in the grid - Figma's Variant2 drew it in #343435,
      // but that reads noticeably darker than the cards it sits beside. A
      // transparent 1px border is kept by default so the hover adds no 1px
      // layout shift.
      // Figma mobile master (3130:19000 "Button catalog") sizes the CTA
      // tile at the compact 131px — same as the desktop bento tile.
      className="group flex h-[131px] w-full cursor-pointer items-center justify-center rounded-[40px] border border-transparent bg-[#343435] transition-colors duration-300 hover:border-stroke-default hover:bg-white"
    >
      {/* Mobile (Figma 3130:19000 render): px-40 row with the 2-line
          label LEFT and the orange circle RIGHT (justify-between).
          Desktop keeps the centred pill+circle group. */}
      <span className="inline-flex items-center gap-2 max-lg:w-full max-lg:justify-between max-lg:px-10">
        {/* Figma "Button catalog" (1217:2490): the label sits in a
            Button/Large container with px-[24px], so the visible
            text-to-circle distance is 24 + 8 (gap) = 32px — NOT a bare
            gap-2. px scales 20/24 with the Button component. */}
        <span className="px-6 text-button-lg text-white transition-colors duration-300 group-hover:text-neutral-900 max-lg:max-w-[140px] max-lg:px-0">
          {label}
        </span>
        {/* Orange circle button + arrow now sit at the 52-px master size on
            every viewport (mobile cards are the compact tile too), matching
            the IconButton — base equals the prior lg value, desktop kept. */}
        <span className="inline-flex size-[52px] items-center justify-center rounded-[26px] bg-brand">
          <img
            src={ARROW_WHITE}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="size-[16.5px]"
          />
        </span>
      </span>
    </Link>
  );
}

function ZoneRenderer({
  card,
  onSelect,
  onClose,
}: {
  card: ZoneCard;
  onSelect: (card: ZoneCard, el: HTMLDivElement) => void;
  onClose: () => void;
}) {
  if (card.kind === "cta") {
    return <CtaCard label={card.label} onActivate={onClose} />;
  }
  // Every non-link card reports its click to the parent; the parent
  // decides whether to open a panel (card has items), toggle it shut
  // (same card clicked again), or just close (no-items filler card).
  const handleSelect = (el: HTMLDivElement) => onSelect(card, el);
  switch (card.kind) {
    case "image":
      return (
        <ImageCard
          label={card.label}
          image={card.image}
          tall={card.tall}
          onSelect={handleSelect}
        />
      );
    case "compact":
      return <CompactCard label={card.label} onSelect={handleSelect} />;
    case "illustration":
      return (
        <IllustrationCard
          label={card.label}
          svg={card.svg}
          onSelect={handleSelect}
        />
      );
  }
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
  // The popup is position:fixed (viewport space), so it can float
  // outside the grid. We keep a ref to it to tell whether a click
  // landed inside the panel (keep open) vs outside (close).
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (card: ZoneCard, cardEl: HTMLDivElement) => {
      // No-details filler card (the "cta" tile has no items), or clicking
      // the already-open card: dismiss the panel. Otherwise open (or switch
      // to) this card.
      if (card.kind === "cta" || !card.items?.length || active === card) {
        setActive(null);
        return;
      }
      setActive(card);
      setLast(card);
      activeCardElRef.current = cardEl;
      setPopupPos(computePos(cardEl));
    },
    [active],
  );

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
        // In click mode the panel stays open across scrolls - it only
        // follows the card. Closing is explicit (X / outside / Escape).
        setPopupPos(computePos(el));
      });
    };
    window.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
    };
  }, [active]);

  // Close the panel when the user clicks outside both the grid and the
  // panel, or presses Escape. Clicks INSIDE the grid are handled by the
  // cards' own onClick (open / toggle / switch); clicks inside the panel
  // are ignored here (its X button closes it). pointerdown fires before
  // click, and the listener only attaches once a panel is open, so the
  // opening click itself can never trip it.
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (gridRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setActive(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    // Figma 1384:11619 — the Zones section caps the Hero with a thin
    // top hairline. The rounded-tl/tr corners that Figma's master shows
    // were collapsing here into triangular page-bg cutouts at the seam
    // that visually thickened the join; with the Hero's bottom border
    // removed (see hotels/Hero.tsx) the next section's flat border-t
    // provides ONE clean uniformly-thin line across the entire width.
    // Padding is 160px top + 130px sides at the design master.
    // Mobile pb-[71px]: the 12-card stack collapses 11 seams by 1px each
    // (-mt-px keeps the borders reading as single hairlines like Figma),
    // so the extra 11px on the bottom padding restores the master's
    // exact 2741px section height.
    <section className="lg-pad-x bg-white px-6 pt-[60px] pb-[71px] sm:px-10 sm:py-20 lg:-mt-px lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default lg:pb-0 lg:pt-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
          <h2 className="flex-1 text-neutral-900">
            <span className="text-h2-light">Комплектація під </span>
            {/* Figma forces a line break after "під" on BOTH the mobile
                master (3117:14391) and desktop, so the break is always on. */}
            <br aria-hidden />
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
          // Figma mobile master 3117:14389 stacks all 12 cards as ONE
          // 340-wide column with 0 spacing (borders touch, seams collapse
          // to 1px like the desktop grid). Hence gap-0 on the mobile grid;
          // the sm 2-col tablet step and the lg 3-col desktop grid are
          // untouched (lg:gap-0 was already the desktop value).
          className="relative grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:items-start lg:gap-0"
        >
          {COLUMNS.map((col, i) => (
            // lg grid is gap-0, so adjacent card borders touch and a shared
            // seam reads as 2px (1px + 1px), looking thicker than the outer
            // 1px edges. Pull every column after the first 1px LEFT so its
            // cards' left borders land ON the previous column's right
            // borders -> the vertical seam collapses to a single 1px line.
            // On mobile the columns stack vertically, so the same overlap
            // is applied UPWARD (-mt-px) to collapse the column-to-column
            // seam; sm:mt-0 cancels it from the 2-col tablet step onward (it
            // persists through lg) so the desktop side-by-side row, which
            // only needs the horizontal lg:-ml-px overlap, is untouched.
            <div
              key={i}
              className={`flex flex-col gap-0 sm:gap-4 lg:gap-0${i > 0 ? " -mt-px sm:mt-0 lg:-ml-px" : ""}`}
            >
              {col.map((card, j) => (
                // Same overlap vertically: every card after the first in its
                // column is pulled 1px UP so its top border sits on the
                // previous card's bottom border (1px seam, not 2px). On
                // mobile the cards stack flush in one column, so the wrapper
                // is a real block (not display:contents) and the -mt-px
                // overlap applies there too; sm:mt-0 cancels it at the 2-col
                // tablet step where cards are gap-spaced instead.
                <div
                  key={j}
                  className={`block${j > 0 ? " -mt-px sm:mt-0 lg:-mt-px" : ""}`}
                >
                  <ZoneRenderer
                    card={card}
                    onSelect={handleSelect}
                    onClose={() => setActive(null)}
                  />
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

              The panel is `pointer-events-auto` while open so its close
              (X) button is clickable, and `pointer-events-none` while
              hidden so it never blocks the cards during the fade-out.
              Chips inside are informational labels (not click targets).

              The transition list includes `left,top,width,height` so
              the panel animates smoothly when:
                • the user moves between cards (left+top change),
                • the window resizes (width/height clamp updates),
                • the user scrolls (top tracks the card). */}
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
              // maxHeight (not height) so the panel sizes itself to
              // its own chip rows — no scroll, no empty space. The
              // cap from computePos keeps it inside the viewport.
              maxHeight: popupPos?.height ?? PANEL_H,
            }}
          >
            {last && last.kind !== "cta" && last.items && (
              <ItemsPanel
                title={last.label}
                items={last.items}
                onClose={() => setActive(null)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
