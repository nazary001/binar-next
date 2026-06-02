/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";
const ARROW_DARK = "/figma-export/directions/arrow-up-right-dark.svg";

// "Що ми закриваємо?" bento grid. The clickable variant lives at Figma
// 1870:6039 / grid 2532:7660 - the same card system used on the protect
// and hotels pages: every card is a link with a 52-px arrow-circle
// button bottom-right and a brand hover ring.
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

// All cards point at the same lead form the "Підбір під проєкт" button uses.
const CARD_HREF = "#contact-form";

type TextCardData = { kind: "text"; title: string };
type PhotoCardData = { kind: "photo"; title: string; src: string };
type ButtonCardData = { kind: "button"; title: string; href: string };
type Card = TextCardData | PhotoCardData | ButtonCardData;

const COL_1: Card[] = [
  {
    kind: "photo",
    title: "Тапочки (стандарт / кастом)",
    src: "/figma-export/spivpratsya/cover-tapochki.png",
  },
  { kind: "text", title: "Галантерея та витратні матеріали" },
  { kind: "text", title: "Текстиль і комплектація номерів" },
  { kind: "text", title: "PROTECT (ЗІЗ, одноразовий одяг)" },
];

const COL_2: Card[] = [
  { kind: "text", title: "HoReCa Hygiene (гігієна, прибирання)" },
  { kind: "text", title: "Брендування та пакування" },
  {
    kind: "photo",
    title: "Міні-косметика та аксесуари",
    src: "/figma-export/spivpratsya/cover-cosmetics.png",
  },
];

const COL_3: Card[] = [
  {
    kind: "photo",
    title: "Оснащення ванної (включно з Valera)",
    src: "/figma-export/spivpratsya/cover-bathroom.png",
  },
  { kind: "button", title: "Підбір під проєкт", href: CARD_HREF },
];

// 6-px brand border that fades in on card hover (the hotels/protect
// "HoverRing"). Each card is `relative` + `group` so this hugs the
// card's rounded edge and lights up on hover.
function HoverRing() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[28px] border-[6px] border-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:rounded-[40px]"
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
  className,
}: {
  title: string;
  src: string;
  className?: string;
}) {
  return (
    <Link
      href={CARD_HREF}
      className={`group relative flex cursor-pointer flex-col justify-end overflow-clip rounded-[28px] border border-stroke-default p-6 sm:p-8 lg:rounded-[40px] lg:p-10 ${className ?? ""}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full max-w-none object-cover"
      />
      {/* Desaturate the photo on hover (saturation-blend square), same as
          the hotels / protect image cards. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[-6px] bottom-[-6px] left-1/2 aspect-square -translate-x-1/2 bg-[#151511] opacity-0 transition-opacity duration-300 [mix-blend-mode:saturation] group-hover:opacity-100"
      />
      {/* Dark bottom gradient for title legibility (approximates the
          Figma blur-22 ellipse below the bottom edge). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 block h-[55%] bg-[linear-gradient(to_top,rgba(21,21,17,0.78)_0%,rgba(21,21,17,0.55)_45%,rgba(21,21,17,0)_100%)]"
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
  // (Figma 2532 row sits p-10 from the card bottom). Title eases to brand
  // on hover, the arrow circle fills brand - same as the protect cards.
  return (
    <Link
      href={CARD_HREF}
      className={`group relative flex cursor-pointer flex-col justify-end overflow-clip rounded-[28px] border border-stroke-default bg-white p-7 sm:p-8 lg:rounded-[40px] lg:p-10 ${className ?? ""}`}
    >
      <HoverRing />
      <div className="relative flex w-full items-center gap-4 sm:gap-8">
        <p className="flex-1 text-button-lg text-neutral-900 transition-colors group-hover:text-brand">
          {title}
        </p>
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
  // Figma 1870:6116 - deep #343435 (= neutral-800) slab with a Title/Large
  // label and a filled-brand arrow disc. Hover matches the catalog button
  // on hotels / protect / cleaning: the slab inverts to white with a
  // stroke border, the label flips to neutral-900, the arrow disc stays.
  // Border starts transparent so the hover border does not shift layout.
  return (
    <Link
      href={href}
      className={`group flex cursor-pointer items-center justify-between gap-4 rounded-[28px] border border-transparent bg-neutral-800 px-6 py-6 transition-colors duration-300 hover:border-stroke-default hover:bg-white sm:px-8 sm:py-8 lg:justify-center lg:rounded-[40px] lg:px-10 lg:py-10 ${className ?? ""}`}
    >
      <span className="text-title-lg text-white transition-colors duration-300 group-hover:text-neutral-900">
        {title}
      </span>
      <span className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[26px] bg-brand sm:size-[52px]">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="size-5 sm:size-6"
        >
          <path
            d="M7 17L17 7M17 7H8M17 7V16"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
}: {
  cards: Card[];
  // Visual heights at lg in px, summing to the 786-px column height.
  // Below lg each card sizes to its own content (photos via aspect-square).
  ratios: number[];
  index: number;
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
          // `--lg-basis` resolves into flex-basis only inside the lg:
          // variant. `lg:min-h-0` is critical: without it a flex item
          // defaults to `min-height: auto` (its content size), so the
          // 131-px cards - whose 52-px arrow row + p-10 padding measure
          // ~132 px - refuse to shrink to their basis and grow, pushing
          // column 1 to ~795 px and breaking the 786-px alignment. With
          // min-h-0 each card stays exactly on its flex-basis (the 1-px
          // content overflow on the short cards is clipped from the empty
          // top padding, the bottom-pinned row stays fully visible).
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

export function Coverage() {
  return (
    <section className="lg-pad-x flex w-full flex-col gap-10 bg-white px-5 py-16 sm:gap-14 sm:px-10 sm:py-20 lg:gap-[120px] lg:py-[160px]">
      <h2 className="text-h2-light text-neutral-900 max-w-[640px]">
        Що ми <span className="text-h2">закриваємо?</span>
      </h2>

      <div className="flex w-full flex-col gap-4 sm:gap-5 lg:flex-row lg:items-stretch lg:gap-0">
        <Column cards={COL_1} ratios={[393, 131, 131, 131]} index={0} />
        <Column cards={COL_2} ratios={[196.5, 196.5, 393]} index={1} />
        <Column cards={COL_3} ratios={[655, 131]} index={2} />
      </div>
    </section>
  );
}
