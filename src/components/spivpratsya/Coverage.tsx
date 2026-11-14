"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ItemsPanel,
  PANEL_H,
  PANEL_W,
  type PopupPosition,
  computePos,
} from "@/components/ui/ItemsPopup";
import { type PhoneCard, PhoneCardStack } from "@/components/ui/PhoneCardStack";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";
const ARROW_DARK = "/figma-export/directions/arrow-up-right-dark.svg";

// "Що ми закриваємо?" bento grid. The clickable variant lives at Figma
// 1870:6039 / grid 2532:7660 - the same card system used on the protect
// and hotels pages: every card is a link with a 52-px arrow-circle
// button bottom-right and a brand hover ring.
//
// Hovering a card (lg+) opens the shared dark items panel beside it
// (same window as the hotels ZonesGrid details popup) listing what the
// category covers; the panel follows the cursor between cards and
// closes when the pointer leaves the grid+panel area (or Escape / X).
// Per user direction the card TITLE stays black on hover - only the
// ring/arrow carry the brand accent.
//
// 1440-master: section is full-width, 130-px gutters, h2 title row, then
// a 1180 x 786 three-column grid:
//   Column 1 (393): photo 393 + 3 text cards 131
//   Column 2 (393): 2 text cards 196.5 + photo 393
//   Column 3 (394): photo 655 + button card 131
//
// On lg the grid is edge-to-edge (gap-0); adjacent 1px borders are
// de-doubled to a single line by overlapping columns (lg:-ml-px) and
// stacked cards (lg:-mt-px). Below lg the bento collapses to one stacked
// column with a small gap.

// The text / photo cards point at the lead form; the «Переглянути
// каталог» button card (and its phone twin) leads to the catalog.
const CARD_HREF = "#contact-form";
const CATALOG_HREF = "/catalog";

type TextCardData = { kind: "text"; title: string; items: string[] };
type PhotoCardData = {
  kind: "photo";
  title: string;
  src: string;
  // Exact Figma fill placement inside the card (percent box relative to
  // the card); absent = plain centred cover.
  crop?: { left: string; top: string; width: string; height: string };
  items: string[];
};
type ButtonCardData = { kind: "button"; title: string; href: string };
type Card = TextCardData | PhotoCardData | ButtonCardData;

// Item chips per category for the hover details panel. The Figma tile
// component has no hover variant, so these lists are curated from the
// same product vocabulary the hotels/protect/cleaning pages use.
const COL_1: Card[] = [
  {
    kind: "photo",
    title: "Тапочки (стандарт / кастом)",
    src: "/figma-export/spivpratsya/cover-tapochki.png",
    // Figma 2532:7662 anchors the 4:3 slippers photo to the card's LEFT
    // edge (a centred cover would pan it 65px right and crop the
    // Marriott slipper).
    crop: { left: "-0.13%", top: "0%", width: "133.33%", height: "100%" },
    items: [
      "Закриті та відкриті моделі",
      "Махра, велюр, вафельна тканина",
      "Одноразові та багаторазові",
      "Брендування вишивкою чи принтом",
      "Індивідуальне пакування",
    ],
  },
  {
    kind: "text",
    title: "Галантерея та витратні матеріали",
    items: [
      "Зубні набори",
      "Бритвені набори",
      "Шапочки для душу",
      "Гребінці та пилки",
      "Ватні диски й палички",
      "Швейні набори",
    ],
  },
  {
    kind: "text",
    title: "Текстиль і комплектація номерів",
    items: [
      "Рушники та халати",
      "Постільна білизна",
      "Наматрацники",
      "Подушки та ковдри",
      "Текстиль на 200+ прань",
      "Специфікації для тендерів",
    ],
  },
  {
    kind: "text",
    title: "PROTECT (ЗІЗ, одноразовий одяг)",
    items: [
      "Одноразові халати",
      "Рукавички",
      "Маски та респіратори",
      "Бахіли та шапочки",
      "Одноразова білизна",
    ],
  },
];

const COL_2: Card[] = [
  {
    kind: "text",
    title: "HoReCa Hygiene (гігієна, прибирання)",
    items: [
      "Професійна хімія",
      "Дозатори та диспенсери",
      "Протиральні матеріали",
      "Інвентар для прибирання",
      "Засоби дезінфекції",
    ],
  },
  {
    kind: "text",
    title: "Брендування та пакування",
    items: [
      "Логотип на продукції",
      "Індивідуальні коробки",
      "Пакування під бренд об'єкта",
      "Дизайн-макети та зразки",
    ],
  },
  {
    kind: "photo",
    title: "Міні-косметика та аксесуари",
    src: "/figma-export/spivpratsya/cover-cosmetics.png",
    items: [
      "Шампуні та гелі",
      "Кондиціонери та лосьйони",
      "Мило й мініфлакони",
      "Косметика в дозаторах",
      "Кастомні аромати",
    ],
  },
];

const COL_3: Card[] = [
  {
    kind: "photo",
    title: "Оснащення ванної (включно з Valera)",
    src: "/figma-export/spivpratsya/cover-bathroom.png",
    // Figma 2532:7672 zooms the Valera-dryer photo slightly past a
    // centred cover and pans it left/up by a few px.
    crop: { left: "-30.46%", top: "-1.33%", width: "161.17%", height: "102.66%" },
    items: [
      "Фени Valera",
      "Дзеркала",
      "Дозатори та тримачі",
      "Аксесуари для ванної кімнати",
      "Полички та гачки",
    ],
  },
  { kind: "button", title: "Переглянути каталог", href: CATALOG_HREF },
];

// 6-px brand border that fades in on card hover (the hotels/protect
// "HoverRing"). Each card is `relative` + `group` so this hugs the
// card's rounded edge and lights up on hover. Figma hover (1127:5789
// family) draws the stroke INSIDE the card box, so its outer edge is the
// card edge (designer 2026-11-11: the lines did not match on hover).
// White cards draw a 1-px CSS border outside their padding box, so their
// ring is pulled out by that pixel (`outset`, -inset-px) to cover it
// exactly; photo cards have no border, so inset-0 is the edge. Only the
// desktop bento (lg+) uses it, hence the single 40 radius.
function HoverRing({ outset = false }: { outset?: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${outset ? "-inset-px" : "inset-0"} rounded-[40px] border-[6px] border-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
    />
  );
}

// Arrow circle (Figma "Icon button" 2609:xxxx): a 40/48/52-px bordered
// circle that fills brand on card hover, arrow crossfading. `light` (over
// photos) stays a white arrow; `dark` (white cards) swaps the dark arrow
// for the white one as the circle turns orange.
function CardArrow({ tone }: { tone: "light" | "dark" }) {
  const border = tone === "light" ? "border-white" : "border-neutral-900";
  const restArrow = tone === "light" ? ARROW_WHITE : ARROW_DARK;
  return (
    <span
      aria-hidden
      className={`relative flex size-[40px] shrink-0 items-center justify-center rounded-[20px] border transition-[background-color,border-color] duration-300 group-hover:border-brand group-hover:bg-brand sm:size-[48px] sm:rounded-[24px] lg:size-[52px] lg:rounded-[26px] ${border}`}
    >
      <img
        src={restArrow}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute size-[13px] transition-opacity duration-300 group-hover:opacity-0 sm:size-[15px] lg:size-[16.5px]"
      />
      <img
        src={ARROW_WHITE}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute size-[13px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:size-[15px] lg:size-[16.5px]"
      />
    </span>
  );
}

function PhotoCardEl({
  title,
  src,
  crop,
  className,
}: {
  title: string;
  src: string;
  crop?: { left: string; top: string; width: string; height: string };
  className?: string;
}) {
  // No outline on a photo card (designer 2026-11-11: «обводку там де є
  // фото не потрібно»): the clip is the card edge, so the inset-0 ring
  // lines up with it; hover:z-10 lifts the hovered card over the seams
  // of its neighbours.
  return (
    <Link
      href={CARD_HREF}
      className={`group relative flex cursor-pointer flex-col justify-end overflow-clip rounded-[28px] p-6 hover:z-10 sm:p-8 lg:rounded-[40px] lg:p-10 ${className ?? ""}`}
    >
      {crop ? (
        // Exact Figma fill placement (percent box relative to the card)
        // instead of a centred cover crop.
        <img
          src={src}
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
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full max-w-none object-cover"
        />
      )}
      {/* Desaturate the photo on hover (saturation-blend square), same as
          the hotels / protect image cards. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[-6px] bottom-[-6px] left-1/2 aspect-square -translate-x-1/2 bg-[#151511] opacity-0 transition-opacity duration-300 [mix-blend-mode:saturation] group-hover:opacity-100"
      />
      {/* Figma I2532:7662;1127:5896 - soft blurred dark halo anchored
          bottom-left for title legibility, the same #151511 / blur-22
          strip the hotels / protect / cleaning image cards use (replaces
          the earlier gradient approximation). */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[-61.5px] left-[-57.5px] block h-[137px] w-[507px] bg-[#151511] opacity-80 blur-[22px]"
      />
      <HoverRing />
      <div className="relative flex w-full items-center gap-4 sm:gap-8">
        <p className="flex-1 text-button-lg text-white">{title}</p>
        <CardArrow tone="light" />
      </div>
    </Link>
  );
}

function TextCardEl({ title, className }: { title: string; className?: string }) {
  // White card: title + dark arrow circle in a bottom-pinned row
  // (Figma 2532 row sits p-10 from the card bottom). The title stays
  // neutral-900 on hover (user direction - no brand tint on text); the
  // hover affordances are the ring, the brand arrow fill and the items
  // panel that opens beside the card. No overflow-clip (nothing here
  // needs clipping, and it would cut the outset ring back to the padding
  // box). z-[1] keeps this card's hairline above a photo card that
  // overlaps it at the 1-px seam later in the DOM; hover:z-10 lifts the
  // hovered card over every neighbour.
  return (
    <Link
      href={CARD_HREF}
      className={`group relative z-[1] flex cursor-pointer flex-col justify-end rounded-[28px] border border-stroke-default bg-white p-7 hover:z-10 sm:p-8 lg:rounded-[40px] lg:p-10 ${className ?? ""}`}
    >
      <HoverRing outset />
      <div className="relative flex w-full items-center gap-4 sm:gap-8">
        <p className="flex-1 text-button-lg text-neutral-900">{title}</p>
        <CardArrow tone="dark" />
      </div>
    </Link>
  );
}

function ButtonCardEl({
  title,
  href,
  className,
}: {
  title: string;
  href: string;
  className?: string;
}) {
  // Updated master swaps in the shared "Button catalog" component
  // (1217:2497): deep #343435 (= neutral-800) slab, Button/Large label
  // (18 px text-button-lg) pinned LEFT with the 52-px brand arrow disc
  // pinned RIGHT (justify-between, px-40) - the old centred pill+disc
  // group is gone. Hover matches the other catalog cards: the slab
  // inverts to white with a stroke border, the label flips to
  // neutral-900, the filled-brand arrow disc stays. Border starts
  // transparent so the hover border does not shift layout.
  return (
    <Link
      href={href}
      className={`group flex cursor-pointer items-center justify-between rounded-[28px] border border-transparent bg-neutral-800 px-6 transition-colors duration-300 hover:border-stroke-default hover:bg-white sm:px-8 lg:rounded-[40px] lg:px-10 ${className ?? ""}`}
    >
      <span className="text-button-lg text-white transition-colors duration-300 group-hover:text-neutral-900">
        {title}
      </span>
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

function renderCard(card: Card, className?: string) {
  if (card.kind === "photo") return <PhotoCardEl {...card} className={className} />;
  if (card.kind === "button") return <ButtonCardEl {...card} className={className} />;
  return <TextCardEl {...card} className={className} />;
}

function Column({
  cards,
  ratios,
  index,
  onHover,
}: {
  cards: Card[];
  // Visual heights at lg in px, summing to the 786-px column height.
  // Below lg each card sizes to its own content (photos via aspect-square).
  ratios: number[];
  index: number;
  // Fired on card mouseenter with the card's grid cell element so the
  // parent can open/close the hover items panel next to it.
  onHover: (card: Card, el: HTMLDivElement) => void;
}) {
  return (
    <div
      className={`flex w-full flex-col gap-4 sm:gap-5 lg:h-[786px] lg:gap-0${
        // Columns 2+ overlap the previous column's right border (de-double).
        index > 0 ? " lg:-ml-px" : ""
      }`}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          onMouseEnter={(e) => onHover(card, e.currentTarget)}
          // `--lg-basis` resolves into flex-basis only inside the lg:
          // variant. `lg:min-h-0` is critical: without it a flex item
          // defaults to `min-height: auto` (its content size), so the
          // 131-px cards - whose 52-px arrow row + p-10 padding measure
          // ~132 px - refuse to shrink to their basis and grow, pushing
          // column 1 to ~795 px and breaking the 786-px alignment. With
          // min-h-0 each card stays exactly on its flex-basis (the 1-px
          // content overflow on the short cards lands in the empty top
          // padding, the bottom-pinned row stays fully visible).
          // `lg:-mt-px` on cards 2+ overlaps the card above so the
          // touching 1px borders collapse to a single line.
          className={`flex w-full lg:[flex-basis:var(--lg-basis)] lg:min-h-0 lg:shrink-0 lg:grow-0${
            i > 0 ? " lg:-mt-px" : ""
          }`}
          style={{ ["--lg-basis" as string]: `${ratios[i]}px` }}
        >
          {renderCard(
            card,
            `w-full ${card.kind === "photo" ? "aspect-square lg:aspect-auto lg:h-full" : "lg:h-full"}`,
          )}
        </div>
      ))}
    </div>
  );
}

// === Mobile-only stack (Figma 3166:8824, tile list 5492:10594) ===
// Below lg the bento collapses to the shared phone stack the designer
// redrew on 2026-11-13 (C47..C50 on this frame: 16-px gaps, 42-px arrow
// discs, 24 padding with 131-px centred text tiles, radius 32; see
// ui/PhoneCardStack): 206-px photo tiles, 131-px outlined text tiles and
// the catalog button. Same order, labels and links as before.
const MOBILE_ITEMS: PhoneCard[] = [
  {
    kind: "photo",
    label: "Тапочки (стандарт / кастом)",
    href: CARD_HREF,
    image: "/figma-export/spivpratsya/cover-tapochki.png",
    // Figma 3166:8829: each photo has its own crop window in the 342x206
    // tile (the tile box did not change in the 13.11 redesign).
    crop: { left: "0%", top: "-26.25%", width: "100%", height: "127.5%" },
  },
  { kind: "text", label: "Галантерея та витратні матеріали", href: CARD_HREF },
  { kind: "text", label: "Текстиль і комплектація номерів", href: CARD_HREF },
  { kind: "text", label: "PROTECT (ЗІЗ, одноразовий одяг)", href: CARD_HREF },
  { kind: "text", label: "HoReCa Hygiene (гігієна, прибирання)", href: CARD_HREF },
  // The master's label here is a broken copy-paste ("PROTECT Брендування
  // та пакуванняЗІЗ, одноразовий одяг)"): we keep the intended clean
  // category name.
  { kind: "text", label: "Брендування та пакування", href: CARD_HREF },
  {
    kind: "photo",
    label: "Міні-косметика та аксесуари",
    href: CARD_HREF,
    image: "/figma-export/spivpratsya/cover-cosmetics.png",
    // Figma 3166:8833
    crop: { left: "0%", top: "-10.04%", width: "100%", height: "170%" },
  },
  {
    kind: "photo",
    label: "Оснащення ванної (включно з Valera)",
    href: CARD_HREF,
    image: "/figma-export/spivpratsya/cover-bathroom.png",
    // Figma 3166:8837
    crop: { left: "-28.35%", top: "-17.68%", width: "156.76%", height: "282.21%" },
  },
  { kind: "cta", label: "Переглянути каталог", href: CATALOG_HREF },
];

export function Coverage() {
  const [active, setActive] = useState<Card | null>(null);
  // Keep the LAST hovered card around even when active goes back to
  // null, so the panel content stays correct during the fade-out.
  const [last, setLast] = useState<Card | null>(null);
  const [popupPos, setPopupPos] = useState<PopupPosition | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCardElRef = useRef<HTMLDivElement | null>(null);

  const handleHover = useCallback((card: Card, el: HTMLDivElement) => {
    // The catalog button has no items - hovering it dismisses the panel.
    if (card.kind === "button" || !card.items.length) {
      setActive(null);
      return;
    }
    setActive(card);
    setLast(card);
    activeCardElRef.current = el;
    setPopupPos(computePos(el));
  }, []);

  // Hover mode: close when the pointer leaves the grid AND the panel
  // (checked with a grace margin on document mousemove - onMouseLeave
  // on the grid alone would close the panel the moment the cursor
  // crosses toward it, since the fixed panel can float outside the
  // grid's bounding box). Escape closes too.
  useEffect(() => {
    if (!active) return;
    const MARGIN = 32; // visual px of grace around grid/panel
    const inside = (r: DOMRect, x: number, y: number) =>
      x >= r.left - MARGIN &&
      x <= r.right + MARGIN &&
      y >= r.top - MARGIN &&
      y <= r.bottom + MARGIN;
    const onMove = (e: MouseEvent) => {
      const g = gridRef.current?.getBoundingClientRect();
      const p = panelRef.current?.getBoundingClientRect();
      if (
        (g && inside(g, e.clientX, e.clientY)) ||
        (p && inside(p, e.clientX, e.clientY))
      )
        return;
      setActive(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  // Follow the active card on scroll/resize so the panel stays glued
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

  return (
    // Mobile (3166:8820, 1736 tall): pt-60 / title-36 / gap-48 / stack
    // 1532 / pb-60. The tiles are 16 px apart now (no seams to compensate).
    <section className="lg-pad-x flex w-full flex-col gap-12 bg-white px-6 pb-[60px] pt-[60px] sm:gap-14 sm:px-10 sm:py-20 lg:gap-[120px] lg:py-[160px]">
      <h2 className="text-h2-light text-neutral-900 max-w-[640px]">
        Що ми <span className="text-h2">закриваємо?</span>
      </h2>

      {/* MOBILE (<lg): Figma 3166:8824, the shared phone stack (16-px gaps,
          photo / text tiles, catalog button). No hover panel on touch
          layouts. The section is white, so the text tiles read white. */}
      <PhoneCardStack className="lg:hidden" cards={MOBILE_ITEMS} />

      {/* DESKTOP (lg+) — the Figma 1440 bento grid, hidden below lg. */}
      <div
        ref={gridRef}
        className="relative hidden w-full flex-col gap-4 sm:gap-5 lg:flex lg:flex-row lg:items-stretch lg:gap-0"
      >
        <Column
          cards={COL_1}
          ratios={[393, 131, 131, 131]}
          index={0}
          onHover={handleHover}
        />
        <Column
          cards={COL_2}
          ratios={[196.5, 196.5, 393]}
          index={1}
          onHover={handleHover}
        />
        <Column
          cards={COL_3}
          ratios={[655, 131]}
          index={2}
          onHover={handleHover}
        />

        {/* Hover items panel — same fixed-position window as the hotels
            ZonesGrid details popup (shared ItemsPanel + computePos). It
            fades/scales in beside the hovered card and animates between
            cards via the left/top/width/height transition. */}
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
            // maxHeight (not height) so the panel sizes itself to its
            // own chip rows; the cap keeps it inside the viewport.
            maxHeight: popupPos?.height ?? PANEL_H,
          }}
        >
          {last && last.kind !== "button" && (
            <ItemsPanel
              title={last.title}
              items={last.items}
              onClose={() => setActive(null)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
