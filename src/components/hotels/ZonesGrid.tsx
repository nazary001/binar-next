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
      label: "Інші зручності",
      items: [
        "Декоративні аромати",
        "Свічки",
        "Парасолі",
        "Подушки декоративні",
        "Пледи",
      ],
    },
    {
      kind: "image",
      label: "Ресторан / Бар",
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
      label: "Кімната / Спальня",
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
// the parent card's hover state. Figma puts the same circular text
// (id 1131:7261) around the orange icon for every hover-card variant.
// SVG-textPath is used so the text follows a circle path; the
// `.zones-details-text` class in globals.css spins the SVG slowly.
function DetailsCircleText() {
  const pathId = useId();
  return (
    <svg
      viewBox="0 0 88 88"
      className="zones-details-text pointer-events-none absolute inset-0 size-full text-neutral-900"
      aria-hidden
    >
      <defs>
        <path
          id={pathId}
          d="M 44 12 A 32 32 0 1 1 44 76 A 32 32 0 1 1 44 12"
          fill="none"
        />
      </defs>
      <text
        className="fill-current"
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.08em",
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
function IconButton({ variant }: { variant: "light" | "dark" }) {
  return (
    <span className="relative size-[52px] shrink-0">
      {/* Circular ДЕТАЛІ text — sits in an 88-px wrapper centred on
          the 52-px icon (-18 px on each side). Hidden by default; the
          parent card's :hover state fades it in. */}
      <span className="pointer-events-none absolute -inset-[18px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <DetailsCircleText />
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
          className="absolute size-6 transition-opacity duration-300 group-hover:opacity-0"
        />
        {/* Hover arrow (always white, fades in over the orange fill). */}
        <img
          src={ARROW_WHITE}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute size-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
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

function ImageCard({
  label,
  image,
  tall,
  onHover,
}: HoverHandlers & { label: string; image: string; tall?: boolean }) {
  return (
    <div
      onMouseEnter={(e) => onHover(e.currentTarget)}
      className={`group relative flex flex-col items-center justify-end overflow-clip rounded-[28px] border border-stroke-default p-6 transition-[box-shadow,transform] duration-500 ease-out hover:-translate-y-1 hover:shadow-[inset_0_0_0_6px_var(--color-brand)] sm:rounded-[36px] sm:p-8 lg:rounded-[40px] lg:p-10 ${
        tall ? "h-[460px] sm:h-[600px] lg:h-[786px]" : "h-[280px] sm:h-[340px] lg:h-[393px]"
      } w-full`}
    >
      <img
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full rounded-[28px] object-cover transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.05] group-hover:saturate-0 sm:rounded-[36px] lg:rounded-[40px]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[160px] transition-opacity duration-500 group-hover:opacity-100 sm:h-[200px]"
        style={{
          background:
            "linear-gradient(to top, rgba(21, 21, 17, 0.9) 0%, rgba(21, 21, 17, 0) 100%)",
        }}
      />
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
      className="group relative flex h-[100px] w-full flex-col justify-end overflow-clip rounded-[28px] border border-stroke-default bg-white p-6 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[inset_0_0_0_6px_var(--color-brand)] sm:h-[120px] sm:rounded-[36px] sm:p-8 lg:h-[131px] lg:rounded-[40px] lg:p-10"
    >
      <div className="flex items-center gap-4 sm:gap-8">
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
      className="group relative flex h-[300px] w-full flex-col items-center justify-end gap-6 rounded-[28px] border border-stroke-default bg-white p-6 transition-[box-shadow,transform] duration-500 hover:-translate-y-1 hover:shadow-[inset_0_0_0_6px_var(--color-brand)] sm:h-[340px] sm:gap-8 sm:rounded-[36px] sm:p-8 lg:h-[393px] lg:gap-10 lg:rounded-[40px] lg:p-10"
    >
      <img
        src={svg}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="h-[140px] w-[164px] transition-transform duration-500 ease-out group-hover:scale-[1.06] group-hover:rotate-1 sm:h-[180px] sm:w-[210px] lg:h-[200px] lg:w-[234px]"
      />
      <div className="flex w-full items-center gap-4 sm:gap-8">
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
      className="group flex h-[100px] w-full cursor-pointer items-center justify-center rounded-[28px] bg-neutral-800 transition-colors hover:bg-neutral-900 sm:h-[120px] sm:rounded-[36px] lg:h-[131px] lg:rounded-[40px]"
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-button-lg text-white transition-transform duration-300 group-hover:-translate-x-1">
          {label}
        </span>
        <span className="inline-flex size-[52px] items-center justify-center rounded-[26px] bg-brand transition-transform duration-300 group-hover:rotate-12 group-hover:scale-105">
          <img src={ARROW_WHITE} alt="" aria-hidden loading="lazy" decoding="async" className="size-6" />
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
    // corners. The header (Frame 1010106611, 587×112) and chips area
    // (Frame 1010106582, 587×512) split the panel vertically.
    <div
      className="flex h-full max-h-full flex-col overflow-hidden rounded-[28px] shadow-[0_24px_64px_-12px_rgba(15,15,20,0.42)] sm:rounded-[36px] lg:rounded-[40px]"
      style={{ background: "#343435" }}
    >
      {/* Header — Figma puts the title at (x=32, y=32) inside a 112-px
          tall row, so 32 px of padding all around the row. py-8 hits
          both top and bottom; px-8 keeps title + X centred at the
          edges. */}
      <div className="flex items-center justify-between gap-4 px-8 py-8">
        <h3 className="text-[32px] font-bold leading-[36px] tracking-[-0.64px] text-white lg:text-h2">
          {zone.label}
        </h3>
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="size-6"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </span>
      </div>
      {/* Chips area — Figma has chips starting at y=0 inside
          Frame 1010106582 with 32 px left padding (= px-8) and 32 px
          bottom padding (= pb-8). No top padding: the first chip row
          sits flush against the header's bottom edge. */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-8 pb-8">
        {/* 15 px gap both directions matches Figma chip layout
            (Frame 1010106572: chips at y=0, 55, 110, 165, ... = 40
            chip height + 15 gap). */}
        <ul className="flex flex-wrap gap-[15px]">
          {zone.items?.map((item) => (
            // Pill chip — Figma chip is 40 px tall with 16 px text
            // padding-x. inline-flex + items-center vertically centres
            // the body-sm (16/24) text inside the 40-px shell. No
            // hover styles or cursor changes because the panel itself
            // is pointer-events-none — chips never receive pointer
            // events; they're informational labels, not click targets.
            <li
              key={item}
              className="inline-flex h-10 items-center rounded-[60px] border border-white px-4 text-body-sm text-white"
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
// clamps them down on viewports that are narrower or shorter so the
// panel always fits with room to breathe.
const PANEL_W = 587;
const PANEL_H = 624;
// Visual breathing space around the panel — used as both the gap
// between the panel and the hovered card AND as the minimum margin
// to the viewport edges. 24 px feels balanced at lg+ without making
// the panel look stranded on ultra-wide viewports.
const PANEL_GAP = 24;

type PopupPosition = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// Compute the panel's viewport-relative position given a hovered
// card. The strategy is built around two ideas:
//
//   1. Symmetric horizontal placement. The panel lands on the
//      opposite side of the viewport from the card's centre — left
//      cards → panel right, right cards → panel left. When the card
//      sits dead-centre we still bias right so the result is
//      deterministic.
//
//   2. Symmetric vertical placement. The panel's centre aligns with
//      the card's centre — visually pairing the two as "this card's
//      details" while staying balanced.
//
// Both axes are then clamped to the viewport with PANEL_GAP margins
// so the panel never spills off screen even when the card is near a
// corner or the user scrolls past it. The size itself is also
// clamped so smaller viewports get a proportionally smaller panel
// rather than a partially-hidden one.
function computePos(cardEl: HTMLDivElement): PopupPosition {
  const cardRect = cardEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const width = Math.min(PANEL_W, vw - 2 * PANEL_GAP);
  const height = Math.min(PANEL_H, vh - 2 * PANEL_GAP);

  // Horizontal: opposite side of the card, then clamp to viewport.
  const cardCenterX = cardRect.left + cardRect.width / 2;
  let left: number;
  if (cardCenterX < vw / 2) {
    // Card on left half — place panel to the right with PANEL_GAP.
    left = cardRect.right + PANEL_GAP;
    if (left + width > vw - PANEL_GAP) {
      // Right side overflows (card too wide / panel too big) —
      // pin to the right viewport edge with the same gap.
      left = vw - width - PANEL_GAP;
    }
  } else {
    // Card on right half — place panel to the left with PANEL_GAP.
    left = cardRect.left - width - PANEL_GAP;
    if (left < PANEL_GAP) {
      left = PANEL_GAP;
    }
  }

  // Vertical: centre the panel on the card's vertical centre, then
  // clamp so the full panel stays inside the viewport.
  const cardCenterY = cardRect.top + cardRect.height / 2;
  let top = cardCenterY - height / 2;
  top = Math.max(PANEL_GAP, Math.min(vh - height - PANEL_GAP, top));

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
        if (el) setPopupPos(computePos(el));
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
    <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:py-[160px]">
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
                <ZoneRenderer key={j} card={card} onHover={handleHover} />
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
              height: popupPos?.height ?? PANEL_H,
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
