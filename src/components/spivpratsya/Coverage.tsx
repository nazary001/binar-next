/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

// Figma 1870:6039 + 1870:6041 — "Що ми закриваємо?" bento grid.
//
// 1440-master spec: section is full-width, 130-px gutters, h2 title row
// 168 px tall, then a 1180×786 three-column grid:
//
//   Column 1 (393 px)
//     ├ photo card 393×393 — Тапочки (стандарт / кастом) — dark overlay,
//     │   white title pinned to bottom-left.
//     ├ white card 393×131 — Галантерея та витратні матеріали
//     ├ white card 393×131 — Текстиль і комплектація номерів
//     └ white card 393×131 — PROTECT (ЗІЗ, одноразовий одяг)
//
//   Column 2 (393 px)
//     ├ white card 393×196 — HoReCa Hygiene (гігієна, прибирання)
//     ├ white card 393×196 — Брендування та пакування
//     └ photo card 393×393 — Міні-косметика та аксесуари
//
//   Column 3 (394 px)
//     ├ photo card 394×655 — Оснащення ванної (включно з Valera)
//     └ button card 394×131 — Підбір під проєкт (dark bg + brand arrow)
//
// On below-lg viewports the grid collapses to a single column and each
// card keeps its rounded corners + Figma copy.

type TextCard = {
  kind: "text";
  title: string;
  // 1-based index across all cards (1..N) — rendered as a big "0N"
  // accent in the card's corner on mobile/sm, matching the numeric
  // accent used by Benefits and TeamCta on the rest of the site.
  // Dissolves on lg where the bento grid does the structural work.
  no: number;
};

type PhotoCard = {
  kind: "photo";
  title: string;
  src: string;
  no: number;
};

type ButtonCard = {
  kind: "button";
  title: string;
  href: string;
};

type Card = TextCard | PhotoCard | ButtonCard;

const COL_1: Card[] = [
  {
    kind: "photo",
    no: 1,
    title: "Тапочки (стандарт / кастом)",
    src: "/figma-export/spivpratsya/cover-tapochki.png",
  },
  { kind: "text", no: 2, title: "Галантерея та витратні матеріали" },
  { kind: "text", no: 3, title: "Текстиль і комплектація номерів" },
  { kind: "text", no: 4, title: "PROTECT (ЗІЗ, одноразовий одяг)" },
];

const COL_2: Card[] = [
  { kind: "text", no: 5, title: "HoReCa Hygiene (гігієна, прибирання)" },
  { kind: "text", no: 6, title: "Брендування та пакування" },
  {
    kind: "photo",
    no: 7,
    title: "Міні-косметика та аксесуари",
    src: "/figma-export/spivpratsya/cover-cosmetics.png",
  },
];

const COL_3: Card[] = [
  {
    kind: "photo",
    no: 8,
    title: "Оснащення ванної (включно з Valera)",
    src: "/figma-export/spivpratsya/cover-bathroom.png",
  },
  {
    kind: "button",
    title: "Підбір під проєкт",
    href: "#contact-form",
  },
];

function PhotoCard({
  title,
  src,
  no,
  className,
}: {
  title: string;
  src: string;
  no: number;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-clip rounded-[28px] border border-stroke-default lg:rounded-[40px] ${className ?? ""}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full max-w-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      {/* Dark blur gradient at bottom — pre-rendered in Figma via a blur
          22.15 ellipse below the bottom edge. We approximate with a CSS
          gradient that keeps the title readable on any photo. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 block h-[55%] bg-[linear-gradient(to_top,rgba(21,21,17,0.78)_0%,rgba(21,21,17,0.55)_45%,rgba(21,21,17,0)_100%)]"
      />
      {/* Small numeric accent in the top-left, mobile/sm only. Matches
          the typographic accent style used in Benefits and TeamCta —
          carries the bento sequence through the photo cards too. */}
      <span
        aria-hidden
        className="absolute left-6 top-6 text-[15px] font-mono font-medium tracking-[0.18em] text-white/70 transition-colors duration-500 group-hover:text-white sm:left-8 sm:top-8 lg:hidden"
      >
        {String(no).padStart(2, "0")}
      </span>
      <p className="absolute bottom-6 left-6 right-6 text-title-lg text-white sm:bottom-8 sm:left-8 sm:right-8 lg:bottom-10 lg:left-10 lg:right-10">
        {title}
      </p>
    </div>
  );
}

function TextCard({
  title,
  no,
  className,
}: {
  title: string;
  no: number;
  className?: string;
}) {
  return (
    <div
      className={`group flex items-center justify-between gap-4 rounded-[28px] border border-stroke-default bg-white p-7 transition-all duration-500 hover:-translate-y-1 hover:border-neutral-900 hover:shadow-[0_24px_50px_-22px_rgba(29,29,31,0.18)] sm:p-8 lg:items-center lg:justify-center lg:rounded-[40px] lg:p-10 ${className ?? ""}`}
    >
      <p className="text-title-lg text-neutral-900 transition-colors duration-500 group-hover:text-brand lg:w-full lg:text-center">
        {title}
      </p>
      {/* Big numeric accent on the right — visible mobile/sm only to
          match Benefits / TeamCta's typographic rhythm. Hidden on lg
          where Figma's centred-title bento layout takes over. */}
      <span
        aria-hidden
        className="shrink-0 text-h2-light leading-none tracking-[-0.6px] text-neutral-200 transition-colors duration-500 group-hover:text-brand lg:hidden"
      >
        {String(no).padStart(2, "0")}
      </span>
    </div>
  );
}

function ButtonCard({ title, href, className }: { title: string; href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`group flex cursor-pointer items-center justify-center gap-4 rounded-[28px] bg-bg-primary px-6 py-6 transition-colors duration-300 hover:bg-neutral-900 sm:px-8 sm:py-8 lg:rounded-[40px] lg:px-10 lg:py-10 ${className ?? ""}`}
    >
      <span className="text-title-lg text-white transition-transform duration-300 group-hover:translate-x-1">
        {title}
      </span>
      <span className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[26px] bg-brand transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 sm:size-[52px]">
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
  if (card.kind === "photo") return <PhotoCard {...card} className={className} />;
  if (card.kind === "button") return <ButtonCard {...card} className={className} />;
  return <TextCard {...card} className={className} />;
}

function Column({
  cards,
  ratios,
  delay = 0,
}: {
  cards: Card[];
  // Visual height ratios at lg (sum should equal column height = 786).
  // Each entry maps 1:1 to `cards`. On smaller viewports cards keep their
  // intrinsic height (text cards: min-h, photo cards: aspect-square).
  ratios: number[];
  delay?: number;
}) {
  return (
    <div className="flex w-full flex-col gap-4 sm:gap-5 lg:h-[786px] lg:gap-0">
      {cards.map((card, i) => (
        <Reveal
          key={i}
          delay={delay + i * 70}
          direction="up"
          // Pass the lg height as a CSS variable so the flex sizing only
          // kicks in on lg+. Below lg the card sizes to its own content
          // (text cards: intrinsic, photo cards: aspect-square via
          // renderCard className). Setting flex-basis on every viewport
          // forced text cards into 131-px-tall slabs on mobile, which
          // turned each line of copy into a small label floating in a
          // big empty box. The new `[--lg-basis]` custom prop only
          // resolves into flex-basis inside the `lg:` variant below.
          className="flex w-full lg:[flex-basis:var(--lg-basis)] lg:shrink-0 lg:grow-0"
          style={{ ["--lg-basis" as string]: `${ratios[i]}px` }}
        >
          {renderCard(
            card,
            `w-full ${card.kind === "photo" ? "aspect-square lg:aspect-auto lg:h-full" : "lg:h-full"}`,
          )}
        </Reveal>
      ))}
    </div>
  );
}

export function Coverage() {
  return (
    <section className="lg-pad-x flex w-full flex-col gap-10 bg-white px-5 py-16 sm:gap-14 sm:px-10 sm:py-20 lg:gap-[120px] lg:py-[120px]">
      <Reveal as="h2" className="text-h2-light text-neutral-900 max-w-[640px]">
        Що ми <span className="text-h2">закриваємо?</span>
      </Reveal>

      {/* Figma 1870:6041 packs the 3 columns and the cards within each
          column edge-to-edge on lg — visual separation there comes
          purely from the cards' rounded corners. On mobile / sm we
          break the bento and stack everything in a single column with
          a small gap between cards (matches the gap rhythm used by
          Benefits, TeamCta and WhyPartners — 16-24 px). */}
      <div className="flex w-full flex-col gap-4 sm:gap-5 lg:flex-row lg:items-stretch lg:gap-0">
        <Column cards={COL_1} ratios={[393, 131, 131, 131]} />
        <Column cards={COL_2} ratios={[196.5, 196.5, 393]} delay={60} />
        <Column cards={COL_3} ratios={[655, 131]} delay={120} />
      </div>
    </section>
  );
}
