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

// All cards point at the same lead form the "Переглянути каталог" button uses.
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
  { kind: "button", title: "Переглянути каталог", href: CARD_HREF },
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
  // Figma 2532:7673 ("Button catalog") - deep #343435 (= neutral-800) slab
  // holding the STANDARD Button/Large label (18 px text-button-lg). This
  // differs from the cleaning / protect / hotels catalog cards, which carry
  // a 24-px Title/Large designer override; the spivpratsya frame uses the
  // default button size, so the label is text-button-lg, centered as a
  // compact pill (text + 8-px gap + 52-px arrow disc) like those cards.
  // Hover matches them: the slab inverts to white with a stroke border, the
  // label flips to neutral-900, the filled-brand arrow disc stays. Border
  // starts transparent so the hover border does not shift layout.
  return (
    <Link
      href={href}
      className={`group flex cursor-pointer items-center justify-center rounded-[28px] border border-transparent bg-neutral-800 px-6 py-6 transition-colors duration-300 hover:border-stroke-default hover:bg-white sm:px-8 sm:py-8 lg:rounded-[40px] lg:px-10 lg:py-10 ${className ?? ""}`}
    >
      <span className="inline-flex items-center gap-2">
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

// === Mobile-only stack (Figma 3166:8824) ===
// Below lg the bento collapses to a single column of uniform 190-px
// cards (16-px gaps -> 206-px pitch) capped by the catalog CTA. Image
// cards carry a photo + dark blur halo + white label/arrow; outline
// cards are plain white with a dark label/arrow; the CTA is a
// neutral-800 pill with the brand-orange arrow.
type MobileItem =
  | {
      kind: "image";
      label: string;
      image: string;
      // Exact Figma fill placement inside the 342x206 tile (the master
      // does NOT centre-cover: each photo has its own crop window).
      crop: { left: string; top: string; width: string; height: string };
    }
  | { kind: "outline"; label: string }
  | { kind: "cta"; label: string };

const MOBILE_ITEMS: MobileItem[] = [
  {
    kind: "image",
    label: "Тапочки (стандарт / кастом)",
    image: "/figma-export/spivpratsya/cover-tapochki.png",
    // Figma 3166:8829
    crop: { left: "0%", top: "-26.25%", width: "100%", height: "127.5%" },
  },
  { kind: "outline", label: "Галантерея та витратні матеріали" },
  { kind: "outline", label: "Текстиль і комплектація номерів" },
  { kind: "outline", label: "PROTECT (ЗІЗ, одноразовий одяг)" },
  { kind: "outline", label: "HoReCa Hygiene (гігієна, прибирання)" },
  // The master's label here is a broken copy-paste ("PROTECT Брендування
  // та пакуванняЗІЗ, одноразовий одяг)") — we keep the intended clean
  // category name.
  { kind: "outline", label: "Брендування та пакування" },
  {
    kind: "image",
    label: "Міні-косметика та аксесуари",
    image: "/figma-export/spivpratsya/cover-cosmetics.png",
    // Figma 3166:8833
    crop: { left: "0%", top: "-10.04%", width: "100%", height: "170%" },
  },
  {
    kind: "image",
    label: "Оснащення ванної (включно з Valera)",
    image: "/figma-export/spivpratsya/cover-bathroom.png",
    // Figma 3166:8837
    crop: { left: "-28.35%", top: "-17.68%", width: "156.76%", height: "282.21%" },
  },
  { kind: "cta", label: "Переглянути каталог" },
];

function MobileArrow({ tone }: { tone: "light" | "dark" }) {
  return (
    <span
      className={`flex size-[52px] shrink-0 items-center justify-center rounded-[26px] border ${
        tone === "light" ? "border-white" : "border-neutral-900"
      }`}
    >
      <img
        src={tone === "light" ? ARROW_WHITE : ARROW_DARK}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="size-[16.5px]"
      />
    </span>
  );
}

function MobileItemCard({ item, first }: { item: MobileItem; first?: boolean }) {
  if (item.kind === "cta") {
    return (
      <Link
        href={CARD_HREF}
        // Figma 3167:4969: the label+disc cluster is centred as a group,
        // which lands the 140-wide 2-line label at x40 and the orange
        // disc at x248..300 — px-[40px] + justify-between reproduces both
        // anchors on the 342 card (probe: label x64, disc x272..323 abs).
        className="flex h-[131px] w-full items-center justify-between rounded-[40px] bg-neutral-800 px-[40px] py-[15px]"
      >
        <p className="max-w-[140px] text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-white">
          {item.label}
        </p>
        <span className="inline-flex size-[52px] shrink-0 items-center justify-center rounded-[26px] bg-brand">
          <img src={ARROW_WHITE} alt="" aria-hidden loading="lazy" decoding="async" className="size-[16.5px]" />
        </span>
      </Link>
    );
  }
  const isImage = item.kind === "image";
  return (
    <Link
      href={CARD_HREF}
      className={`relative flex h-[206px] w-full flex-col justify-end overflow-clip rounded-[40px] border border-stroke-default p-[40px] ${
        first ? "" : "-mt-px"
      } ${isImage ? "" : "bg-white"}`}
    >
      {item.kind === "image" && (
        <>
          <img
            src={item.image}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute max-w-none"
            style={{
              left: item.crop.left,
              top: item.crop.top,
              width: item.crop.width,
              height: item.crop.height,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[-61.5px] left-[-57.5px] h-[137px] w-[507px] bg-[#151511] opacity-80 blur-[22px]"
          />
        </>
      )}
      <div className="relative flex w-full items-center gap-8">
        <p
          className={`flex-1 text-[16px] font-semibold leading-[22px] tracking-[0.16px] ${
            isImage ? "text-white" : "text-neutral-900"
          }`}
        >
          {item.label}
        </p>
        <MobileArrow tone={isImage ? "light" : "dark"} />
      </div>
    </Link>
  );
}

export function Coverage() {
  return (
    // Mobile (3166:8820): pt-60 / title-36 / gap-48 / stack / pb-60.
    // pb-[67px] = 60 + 7: the 8-tile stack collapses 7 seams by 1px each
    // (-mt-px de-doubling below), so the section compensates to keep the
    // master's 1983-px total.
    <section className="lg-pad-x flex w-full flex-col gap-12 bg-white px-6 pb-[67px] pt-[60px] sm:gap-14 sm:px-10 sm:py-20 lg:gap-[120px] lg:py-[160px]">
      <h2 className="text-h2-light text-neutral-900 max-w-[640px]">
        Що ми <span className="text-h2">закриваємо?</span>
      </h2>

      {/* MOBILE (<lg) — Figma 3166:8824: a single column of uniform 206-px
          cards that TOUCH (0 gap, borders de-doubled via -mt-px) followed by
          the 131-px catalog CTA. */}
      <div className="flex flex-col gap-0 lg:hidden">
        {MOBILE_ITEMS.map((item, i) => (
          <MobileItemCard key={item.label} item={item} first={i === 0} />
        ))}
      </div>

      {/* DESKTOP (lg+) — the Figma 1440 bento grid, hidden below lg. */}
      <div className="hidden w-full flex-col gap-4 sm:gap-5 lg:flex lg:flex-row lg:items-stretch lg:gap-0">
        <Column cards={COL_1} ratios={[393, 131, 131, 131]} index={0} />
        <Column cards={COL_2} ratios={[196.5, 196.5, 393]} index={1} />
        <Column cards={COL_3} ratios={[655, 131]} index={2} />
      </div>
    </section>
  );
}
