/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

// Figma 1870:6009 + 1870:6011. Title strip "Кому ми будемо корисні?"
// sits above a vertical list of 4 audience rows. Each row is:
//   • h3 "Дизайнерам інтер'єру" (text-h2-bold, 574-px column)
//   • body copy in a 271-px column
//   • 96-px square Info icon button on the right
// Rows are separated by a 1-px horizontal divider that spans the
// 1180-px content area (130 px gutters on a 1440 master).
type Audience = {
  // Title may include explicit line breaks (Figma forces `<br>` for
  // visual rhythm — e.g. "Дизайнерам \n інтер'єru"). React renders an
  // array of [string, <br>, string] elements transparently.
  title: ReactNode;
  body: string;
  icon: string;
  // % of the 96-px Info icon container per Figma 545:4114's per-icon
  // inset (9-px symbol inset, then a per-icon Vector inset within the
  // 78-px inner zone). Each glyph has its own native bbox - sizing them
  // identically (the old `size-[81.2%]` blanket value) makes them
  // 20-37 % bigger than Figma's render. Per-icon classes restore the
  // Figma-master glyph size at every breakpoint via percentages.
  iconClass: string;
};

const AUDIENCES: Audience[] = [
  {
    // Figma 1870:6015 forces a line break after "Дизайнерам".
    title: (
      <>
        Дизайнерам
        <br aria-hidden="true" />
        інтер{"’"}єру
      </>
    ),
    body: "Підбираємо комплектацію під стиль і бюджет, готуємо варіанти та зразки для погодження.",
    icon: "/figma-export/spivpratsya/aud-designer.svg",
    // Figma I1870:6017 — Vector inset 13.7%/13.63% in 78-px zone =>
    // 56.74 / 56.62 px, ~59% of 96.
    iconClass: "size-[59%]",
  },
  {
    title: "Архітекторам",
    body: "Допомагаємо із специфікаціями і рішеннями, які впливають на експлуатацію об’єкта.",
    icon: "/figma-export/spivpratsya/aud-architect.svg",
    // Figma I1870:6024 — inset 6.67%/15.96%/12.01%/11.51%, taller than wide.
    iconClass: "w-[59%] h-[66%]",
  },
  {
    title: "Девелоперам",
    body: "Беремо на себе операційну частину комплектації: підбір, прорахунок, постачання.",
    icon: "/figma-export/spivpratsya/aud-developer.svg",
    // Figma I1870:6031 — inset 8.33%/8.5%, fills more of the inner zone.
    iconClass: "w-[67%] h-[68%]",
  },
  {
    title: "Консультантам",
    body: "Працюємо як постачальник у ваших проєктах: швидкі КП, варіанти, готовність до запуску.",
    icon: "/figma-export/spivpratsya/aud-consultant.svg",
    // Figma I1870:6038 — square chat bubble centered with aspect-1:1.
    iconClass: "size-[63%]",
  },
];

export function Audiences() {
  return (
    // Figma Audiences = title strip 288 (pt-160 + title-48 + pb-80)
    // + list 664 (3 rows × 176 + last row 136 with pb-0) = 952 px.
    // Code matches via lg:pt-[160px] + lg:gap-[80px] (= Figma's
    // title-strip pb-80) + list rows with lg:pb-0 on the last row.
    // Section has NO bottom padding - the Coverage section's
    // own lg:pt-[160px] provides Figma's 160-px gap to "Що ми
    // закриваємо?".
    <section className="lg-pad-x flex w-full flex-col gap-10 bg-white px-5 py-12 sm:gap-14 sm:px-10 sm:py-20 lg:gap-[80px] lg:pt-[160px] lg:pb-0">
      <Reveal as="h2" className="text-neutral-900 max-w-[640px]">
        <span className="text-h2-light">Кому ми будемо </span>
        <span className="text-h2">корисні?</span>
      </Reveal>

      <ul className="flex w-full flex-col">
        {AUDIENCES.map((a, i) => {
          const isLast = i === AUDIENCES.length - 1;
          return (
            <Reveal
              as="li"
              key={i}
              delay={i * 80}
              direction="up"
              className={`group/row relative flex flex-col gap-3 py-6 sm:gap-5 sm:py-8 lg:flex-row lg:items-center lg:gap-0 lg:py-10 ${isLast ? "lg:pb-0" : ""}`}
            >
              {/* Mobile: title + icon on one row, body below. On lg the
                  wrapper drops to `display: contents` so its children
                  (title, icon) become direct flex children of the row.
                  `lg:order-*` reorders to Figma 1870:6014's title -> body
                  -> icon flow; `lg:ml-8` on the body gives the Figma
                  title-body gap of 32 px; `lg:ml-auto` on the icon
                  consumes all remaining slack so the icon sits flush
                  against the row's right edge. */}
              <div className="flex items-center justify-between gap-4 lg:contents">
                <h3 className="text-h2 text-neutral-900 lg:w-[574px] lg:shrink-0">
                  {a.title}
                </h3>
                <span className="flex size-14 shrink-0 items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-16 sm:rounded-[14px] lg:order-3 lg:ml-auto lg:size-24 lg:rounded-[18px]">
                  <img
                    src={a.icon}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className={`object-contain ${a.iconClass}`}
                  />
                </span>
              </div>
              {/* Figma 1870:6016 body uses `Text/Subtle #777779`
                  (neutral-500), not the darker Text/Medium token. */}
              <p className="text-body-sm text-neutral-500 lg:order-2 lg:ml-8 lg:max-w-[271px]">
                {a.body}
              </p>
              {/* Hairline divider between rows. The last row drops it —
                  Figma's frame is shorter (136 vs 176 px) precisely
                  because there is no closing divider after it. */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 block h-px bg-stroke-default"
                />
              )}
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
