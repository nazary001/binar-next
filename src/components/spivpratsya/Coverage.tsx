/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

// Figma 1870:6039 + 1870:6041 — "Що ми закриваємо?" bento grid.
//
// 1440-master spec: section is full-width, 130-px gutters, h2 title row
// 168 px tall, then a 1180 x 786 three-column grid:
//
//   Column 1 (393 px)
//     - photo card 393 x 393 — Тапочки (стандарт / кастом) — dark
//       overlay, white title pinned to bottom-left.
//     - white card 393 x 131 — Галантерея та витратні матеріали
//     - white card 393 x 131 — Текстиль і комплектація номерів
//     - white card 393 x 131 — PROTECT (ЗІЗ, одноразовий одяг)
//
//   Column 2 (393 px)
//     - white card 393 x 196 — HoReCa Hygiene (гігієна, прибирання)
//     - white card 393 x 196 — Брендування та пакування
//     - photo card 393 x 393 — Міні-косметика та аксесуари
//
//   Column 3 (394 px)
//     - photo card 394 x 655 — Оснащення ванної (включно з Valera)
//     - button card 394 x 131 — Підбір під проєкт (dark bg + brand arrow)
//
// Master is STATIC — no hover transitions, no numeric overlays, no
// scroll-in fade. Below lg the grid collapses to a single stacked
// column with each card keeping its rounded corners + Figma copy
// (proportional adaptive only, no extra mobile chrome).

type TextCardData = {
  kind: "text";
  title: string;
};

type PhotoCardData = {
  kind: "photo";
  title: string;
  src: string;
};

type ButtonCardData = {
  kind: "button";
  title: string;
  href: string;
};

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
  {
    kind: "button",
    title: "Підбір під проєкт",
    href: "#contact-form",
  },
];

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
    <div
      className={`relative overflow-clip rounded-[28px] border border-stroke-default lg:rounded-[40px] ${className ?? ""}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full max-w-none object-cover"
      />
      {/* Dark blur gradient at bottom — pre-rendered in Figma via a blur
          22.15 ellipse below the bottom edge. We approximate with a CSS
          gradient that keeps the title readable on any photo. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 block h-[55%] bg-[linear-gradient(to_top,rgba(21,21,17,0.78)_0%,rgba(21,21,17,0.55)_45%,rgba(21,21,17,0)_100%)]"
      />
      <p className="absolute bottom-6 left-6 right-6 text-title-lg text-white sm:bottom-8 sm:left-8 sm:right-8 lg:bottom-10 lg:left-10 lg:right-10">
        {title}
      </p>
    </div>
  );
}

function TextCardEl({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  // Figma text card: white bg, 1-px stroke-default border, title
  // vertically centered with 40-px padding on all sides at lg
  // (Title/Large SemiBold 24/28, #1d1d1f). items-center handles the
  // vertical centering for both 1- and 2-line titles per Figma's
  // text-frame y math (e.g. Брендування at y=84.25 in a 196.5-tall
  // card → 84.25 / (196.5 - 28) = centred).
  return (
    <div
      className={`flex items-center rounded-[28px] border border-stroke-default bg-white p-7 sm:p-8 lg:rounded-[40px] lg:p-10 ${className ?? ""}`}
    >
      <p className="text-title-lg text-neutral-900 lg:w-full">{title}</p>
    </div>
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
  // Figma 1870:6116 fills the dark slab with Backgroud/Deep #343435
  // (= neutral-800). Arrow disc Button/Orange #f85a0b on a 52-px
  // rounded square.
  // Mobile: anchor the title to the left and push the arrow to the
  // right (justify-between) so the CTA reads like a real button rather
  // than a centred banner — that mirrors the home page's CTA rhythm and
  // makes the tap affordance clearer at narrow widths.
  return (
    <Link
      href={href}
      className={`group flex cursor-pointer items-center justify-between gap-4 rounded-[28px] bg-neutral-800 px-6 py-6 transition-colors hover:bg-neutral-900 sm:px-8 sm:py-8 lg:justify-center lg:rounded-[40px] lg:px-10 lg:py-10 ${className ?? ""}`}
    >
      <span className="text-title-lg text-white">{title}</span>
      <span className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[26px] bg-brand transition-transform group-hover:scale-105 sm:size-[52px]">
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
}: {
  cards: Card[];
  // Visual heights at lg in px, summing to the 786-px column height.
  // Each entry maps 1:1 to `cards`. Below lg the card sizes to its own
  // content (text cards: intrinsic, photo cards: aspect-square via the
  // className renderCard hands down).
  ratios: number[];
}) {
  return (
    <div className="flex w-full flex-col gap-4 sm:gap-5 lg:h-[786px] lg:gap-0">
      {cards.map((card, i) => (
        <div
          key={i}
          // `--lg-basis` resolves into flex-basis only inside the lg:
          // variant — below lg the card sizes to its own intrinsic
          // content (otherwise the 131-px text-card slabs would force
          // tall empty boxes on mobile).
          className="flex w-full lg:[flex-basis:var(--lg-basis)] lg:shrink-0 lg:grow-0"
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

      {/* Figma 1870:6041 packs the 3 columns and the cards within each
          column edge-to-edge on lg — visual separation there comes
          purely from the cards' rounded corners. On mobile / sm we
          break the bento and stack everything in a single column with
          a small gap (16-24 px) — matches the gap rhythm used by the
          rest of the spivpratsya page. */}
      <div className="flex w-full flex-col gap-4 sm:gap-5 lg:flex-row lg:items-stretch lg:gap-0">
        <Column cards={COL_1} ratios={[393, 131, 131, 131]} />
        <Column cards={COL_2} ratios={[196.5, 196.5, 393]} />
        <Column cards={COL_3} ratios={[655, 131]} />
      </div>
    </section>
  );
}
