"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { DetailsIconButton } from "@/components/ui/DetailsIconButton";
import {
  ItemsPanel,
  PANEL_H,
  PANEL_W,
  type PopupPosition,
  computePos,
} from "@/components/ui/ItemsPopup";
import { type PhoneCard, PhoneCardStack } from "@/components/ui/PhoneCardStack";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";

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
      // Updated master grid 3677:35700 uses two white-card heights: the
      // full 393-px tile ("Конференц-зали") and the 196.5-px half tile
      // (the "Басейни" / "Зона рецепції" pair stacked into one 393 row).
      half?: boolean;
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

// Updated Figma master (grid 3677:35700 inside section 1384:11619): the
// old 12-zone bento was redesigned into 7 cards across the same three
// 393/393/394 columns (786-px column height):
//   col 1: photo 393 ("Ванна кімната") + white 393 ("Конференц-зали")
//   col 2: white 196.5 halves ("Басейни" + "Зона рецепції") stacked into
//          one 393 row, then photo 393 ("Номер гостя")
//   col 3: photo 655 ("СПА") + catalog CTA 131
// Item lists for the redesigned zones are curated from the same product
// vocabulary; zones that survived the redesign keep their lists.
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
      label: "Конференц-зали",
      items: [
        "Вода та склянки",
        "Блокноти та ручки",
        "Серветки",
        "Одноразовий посуд для кава-брейків",
        "Антисептики для рук",
        "Бейджі та інформаційні таблички",
      ],
    },
  ],
  [
    {
      kind: "compact",
      half: true,
      label: "Басейни",
      items: [
        "Рушники для басейну",
        "Халати та тапочки",
        "Шапочки для плавання",
        "Кошики для рушників",
        "Антиковзкі покриття",
        "Засоби для догляду за водою",
      ],
    },
    {
      kind: "compact",
      half: true,
      label: "Зона рецепції",
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
      kind: "image",
      label: "Номер гостя",
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
    { kind: "cta", label: "Переглянути каталог" },
  ],
];

// The hotels catalog with one zone ticked. The value must be one of the
// hotels facet values (HOTEL_ZONES in catalog/data.ts); CatalogClient drops
// anything else, so the «СПА» tile passes the facet's Latin «SPA».
const zoneHref = (zone: string) => `/catalog/hotels?zone=${encodeURIComponent(zone)}`;

// Phone zone stack (Figma 3117:14393, redrawn by the designer on
// 2026-11-13), in the design order: photo, two text tiles, photo, text,
// photo, catalog button. Each zone tile opens the catalog filtered by
// that zone (designer 2026-11-11, C37); the button keeps the plain
// /catalog link of the desktop CTA. Photos: Ванна кімната and СПА are
// anchored to the bottom (Figma object-bottom), Номер гостя uses the
// exact Figma fill box.
const PHONE_ZONES: PhoneCard[] = [
  { kind: "photo", label: "Ванна кімната", href: zoneHref("Ванна кімната"), image: "/figma-export/hotels/zone-bathroom.png", objectPosition: "50% 100%" },
  { kind: "text", label: "Басейни", href: zoneHref("Басейни") },
  { kind: "text", label: "Зона рецепції", href: zoneHref("Зона рецепції") },
  { kind: "photo", label: "СПА", href: zoneHref("SPA"), image: "/figma-export/hotels/zone-spa.png", objectPosition: "50% 100%" },
  { kind: "text", label: "Конференц-зали", href: zoneHref("Конференц-зали") },
  {
    kind: "photo",
    label: "Номер гостя",
    href: zoneHref("Номер гостя"),
    image: "/figma-export/hotels/zone-room.png",
    crop: { left: "0%", top: "-48.54%", width: "100%", height: "165.05%" },
  },
  { kind: "cta", label: "Переглянути каталог", href: "/catalog" },
];

// The "ДЕТАЛІ"-ring icon button previously lived here; it moved to
// ui/DetailsIconButton.tsx so the catalog category banners (instances
// of the same Figma component set) can share it. Imported above as
// DetailsIconButton; rendered below via the IconButton alias.
const IconButton = DetailsIconButton;

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
//   1. The card edge is replaced by a 6-px brand ring. We render the
//      ring as a `position: absolute` sibling sitting on top of the
//      photo (DOM order = z-order), instead of via the card's own
//      `border`, because the photo fills the rounded card edge-to-edge
//      and would obscure any box-shadow/inset effect drawn under it.
//      Keeping the ring as an overlay also avoids the 5-px content
//      shift a `border-6` utility would cause on hover. Figma draws
//      the 6-px stroke INSIDE the card box, so its outer edge is the
//      card edge: the designer noted on 2026-11-11 that the lines did
//      not match on hover (the ring sat 1 px inside a grey hairline).
//      The white card's ring is now pulled out over its 1-px hairline
//      (HoverRing outset) and the photo card has no hairline at all
//      (C12), so the ring covers the card edge exactly; the hovered
//      card lifts to z-10 so no neighbour's seam paints over it.
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
// Figma hover (1127:5789 family) puts the stroke inside the card box,
// so the ring's outer edge must be the card edge: white cards draw a
// 1-px CSS border outside their padding box, so their ring is pulled
// out by that pixel (`outset`, -inset-px) to cover it exactly; photo
// cards have no border, so inset-0 already is the card edge.
function HoverRing({ outset = false }: { outset?: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${outset ? "-inset-px" : "inset-0"} rounded-[40px] border-[6px] border-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
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
      // Desktop-only card (the phone layout renders PHONE_ZONES through
      // the shared PhoneCardStack): the updated grid 3677:35700 heights,
      // 655 for the tall СПА photo and 393 for the others.
      // No outline on a photo card (designer 2026-11-11: «обводку там де
      // є фото не потрібно»); the white cards keep theirs. hover:z-10
      // lifts the hovered card over its neighbours' seams (see HoverRing).
      className={`group relative flex cursor-pointer flex-col items-center justify-end overflow-clip rounded-[40px] p-10 hover:z-10 ${
        tall ? "lg:h-[655px]" : "lg:h-[393px]"
      } w-full`}
    >
      {/* No own border-radius on the photo: the card is `overflow-clip`
          + rounded, so it already clips the photo to the card's rounded
          edge (the card has no border, so the clip IS the card edge and
          the hover ring at inset-0 lines up with it exactly). */}
      <img
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        // The desktop master centres the photo in the card.
        className="absolute inset-0 size-full object-cover object-center"
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
      {/* Desktop label row: gap-32 (gap-8) to the icon, capped at the
          master's 313 px. */}
      <div className="relative flex w-full max-w-[313px] items-center gap-8">
        <p className="flex-1 text-button-lg text-white">{label}</p>
        <IconButton variant="light" />
      </div>
    </div>
  );
}

function CompactCard({
  label,
  half,
  onSelect,
}: SelectHandlers & { label: string; half?: boolean }) {
  return (
    <div
      {...cardActivationProps(onSelect)}
      // Desktop-only card (the phone layout renders PHONE_ZONES through
      // the shared PhoneCardStack): the updated master's two bento
      // heights, 393 full tile, or 197 for the stacked half tiles (196.5
      // in Figma; 197 + the -mt-px seam overlap keeps the pair at the 393
      // row height).
      // No overflow-clip: the card holds only the label row and the ring,
      // and a clip would cut the outset ring back to the padding box.
      // z-[1] keeps this white card's hairline on top where a photo card
      // that comes later in the DOM overlaps it by the 1-px seam (as in
      // Figma, where the white card's stroke sits next to the photo);
      // hover:z-10 lifts the hovered card over every neighbour.
      className={`group relative z-[1] flex w-full cursor-pointer flex-col justify-end rounded-[40px] border border-stroke-default bg-white p-10 hover:z-10 ${
        half ? "lg:h-[197px]" : "lg:h-[393px]"
      }`}
    >
      <HoverRing outset />
      <div className="relative flex items-center gap-8">
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
      href="/catalog"
      // CTA has no zone items, so clicking it dismisses any open
      // zone-details popup before leaving for the catalog.
      onClick={onActivate}
      // Hover = Figma "Button catalog" Variant2 (2395:5450): an inverse of
      // the default - the dark fill drops to a 1px outline and the label
      // flips to dark; the orange circle + arrow stay unchanged. The border
      // uses `stroke-default` (#8e8e8f) so it matches the neighbouring
      // zone-card borders in the grid - Figma's Variant2 drew it in #343435,
      // but that reads noticeably darker than the cards it sits beside. A
      // transparent 1px border is kept by default so the hover adds no 1px
      // layout shift.
      // Desktop master uses the shared "Button catalog" component
      // (1217:2497): a 131-px px-40 row with the label pinned LEFT and the
      // orange circle pinned RIGHT (justify-between). The phone catalog
      // button is the PhoneCardStack «cta» tile.
      className="group flex h-[131px] w-full cursor-pointer items-center justify-between rounded-[40px] border border-transparent bg-[#343435] px-10 transition-colors duration-300 hover:border-stroke-default hover:bg-white"
    >
      {/* The 394-px card fits the label on one line. */}
      <span className="text-button-lg text-white transition-colors duration-300 group-hover:text-neutral-900">
        {label}
      </span>
      {/* Orange circle button + arrow at the 52-px desktop master size,
          matching the IconButton. */}
      <span className="inline-flex size-[52px] shrink-0 items-center justify-center rounded-[26px] bg-brand">
        <img
          src={ARROW_WHITE}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="size-[16.5px]"
        />
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
      return (
        <CompactCard label={card.label} half={card.half} onSelect={handleSelect} />
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
    // Phone (3117:14389, 1582 tall): pt-60 + header 176 + gap 48 + stack
    // 1238 + pb-60; the phone tiles are 16 px apart, no seams to compensate.
    <section className="lg-pad-x bg-white px-6 pt-[60px] pb-[60px] sm:px-10 sm:py-20 lg:-mt-px lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default lg:pb-0 lg:pt-[160px]">
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

        {/* Phone (< 640): Figma 3117:14393, the shared phone stack the
            designer redrew on 2026-11-13. Every zone tile links to the hotels
            catalog with that zone's filter (designer 2026-11-11: the cards
            must be clickable and open the catalog filtered); the items
            panel below is desktop-only. The gap-12 above is the design's
            48-px pt. */}
        <PhoneCardStack className="lg:hidden" cards={PHONE_ZONES} />

        {/* The ref lets the document-level mousemove listener decide
            whether the cursor is inside the grid (and therefore the
            popup should stay open). Close-on-leave is handled in the
            mousemove effect above rather than via onMouseLeave here,
            because the fixed-position popup can float outside the
            grid's bounding box and onMouseLeave would close it the
            moment the mouse crossed that bound. */}
        <div
          ref={gridRef}
          // Desktop-only 3-column bento (lg = 640, the start of the desktop
          // canvas); the phone layout shows the PhoneCardStack above.
          className="relative hidden lg:grid lg:grid-cols-3 lg:items-start lg:gap-0"
        >
          {COLUMNS.map((col, i) => (
            // The grid is gap-0, so adjacent card borders touch and a shared
            // seam reads as 2px (1px + 1px), looking thicker than the outer
            // 1px edges. Pull every column after the first 1px LEFT so its
            // cards' left borders land ON the previous column's right
            // borders -> the vertical seam collapses to a single 1px line.
            <div
              key={i}
              className={`flex flex-col${i > 0 ? " -ml-px" : ""}`}
            >
              {col.map((card, j) => (
                // Same overlap vertically: every card after the first in its
                // column is pulled 1px UP so its top border sits on the
                // previous card's bottom border (1px seam, not 2px).
                <div
                  key={j}
                  className={j > 0 ? "-mt-px" : undefined}
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
            inert={!active}
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
