/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

// Figma 1870:6009 + 1870:6011 (desktop) / 3166:7447 (mobile master).
// Title strip "Кому ми будемо корисні?" sits above a vertical list of
// 4 audience rows. Each row is:
//   • h3 "Дизайнерам інтер'єру" (text-h2, 574-px column on lg)
//   • body copy (271-px column on lg)
//   • Info icon tile on the right (52px mobile / 96px lg)
// Rows are separated by a 1-px stroke-default divider.
type Audience = {
  // Title may include explicit line breaks (Figma forces `<br>` for
  // visual rhythm — e.g. "Дизайнерам \n інтер'єру"). React renders an
  // array of [string, <br>, string] elements transparently.
  title: ReactNode;
  body: string;
  icon: string;
  // Sizing class for the glyph inside the tile. Zone exports use the
  // uniform 9/52 inset; the developer helmet is a bare edge-to-edge
  // glyph, sized to the master's measured 26px ink (50% of 52).
  iconClass: string;
};

// Each icon SVG is the Figma "Info icon" 34px-zone export (glyph padding
// and orientation baked in), rendered at a uniform 17.31% inset (= 9/52)
// of the tile so the glyph lands at exactly the master's size — the same
// system as the hero/faq/cleaning info icons. The previous per-icon
// percentage classes (59-68%) rendered the glyphs ~20% larger than the
// master's ~25-px ink.
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
    icon: "/figma-export/info-icons/aud-designer.svg",
    iconClass: "absolute inset-[17.31%] size-[65.38%] max-w-none",
  },
  {
    title: "Архітекторам",
    body: "Допомагаємо із специфікаціями і рішеннями, які впливають на експлуатацію об’єкта.",
    icon: "/figma-export/info-icons/aud-architect.svg",
    iconClass: "absolute inset-[17.31%] size-[65.38%] max-w-none",
  },
  {
    title: "Девелоперам",
    body: "Беремо на себе операційну частину комплектації: підбір, прорахунок, постачання.",
    // The zone export of this Info icon comes back with the component
    // MASTER's door-hanger glyph instead of the instance's helmet
    // override (a known get_design_context instance quirk), so this row
    // keeps the desktop-era edge-to-edge helmet export sized to the
    // master's measured 26-px ink.
    icon: "/figma-export/spivpratsya/aud-developer.svg",
    iconClass: "size-[50%] object-contain",
  },
  {
    title: "Консультантам",
    body: "Працюємо як постачальник у ваших проєктах: швидкі КП, варіанти, готовність до запуску.",
    icon: "/figma-export/info-icons/aud-consultant.svg",
    iconClass: "absolute inset-[17.31%] size-[65.38%] max-w-none",
  },
];

export function Audiences() {
  return (
    // lg: Figma Audiences = title strip 288 (pt-160 + title-48 + pb-80)
    // + list 664 (3 rows × 176 + last row 136 with pb-0) = 952 px.
    // Section has NO bottom padding on lg — the Coverage section's own
    // lg:pt-[160px] provides Figma's 160-px gap.
    // Mobile (3166:7447): pt-60 / title-72 / gap-60 / list-756 / pb-60
    // = 1008 px.
    <section className="lg-pad-x flex w-full flex-col gap-[60px] bg-white px-6 pb-[60px] pt-[60px] sm:gap-14 sm:px-10 sm:py-20 lg:gap-[80px] lg:pb-0 lg:pt-[160px]">
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
              // Mobile row rhythm (Figma 3166:7450): first row starts
              // flush under the title strip; bordered rows use
              // pt-[39px] so border + padding = the master's 40px gap
              // above the content; every row but the last closes with
              // pb-10 before the next divider.
              className={`group/row relative flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-0 lg:py-10 ${
                i > 0
                  ? "max-lg:border-t max-lg:border-stroke-default max-lg:pt-[39px]"
                  : "max-lg:pt-0"
              } ${isLast ? "max-lg:pb-0 lg:pb-0" : "max-lg:pb-10"}`}
            >
              {/* Mobile: title + icon on one row, body below. On lg the
                  wrapper drops to `display: contents` so its children
                  (title, icon) become direct flex children of the row.
                  `lg:order-*` reorders to Figma 1870:6014's title -> body
                  -> icon flow; `lg:ml-8` on the body gives the Figma
                  title-body gap of 32 px; `lg:ml-auto` on the icon
                  consumes all remaining slack so the icon sits flush
                  against the row's right edge. */}
              <div className="flex items-center justify-between gap-6 lg:contents">
                <h3 className="text-h2 text-neutral-900 lg:w-[574px] lg:shrink-0">
                  {a.title}
                </h3>
                <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-16 sm:rounded-[14px] lg:order-3 lg:ml-auto lg:size-24 lg:rounded-[18px]">
                  <img
                    src={a.icon}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className={a.iconClass}
                  />
                </span>
              </div>
              {/* Figma 1870:6016 body uses `Text/Subtle #777779`
                  (neutral-500), not the darker Text/Medium token. */}
              <p className="text-body-sm text-neutral-500 lg:order-2 lg:ml-8 lg:max-w-[271px]">
                {a.body}
              </p>
              {/* Hairline divider between rows — lg only (mobile rows
                  carry it as border-t on the row below). The last row
                  drops it; Figma's frame is shorter precisely because
                  there is no closing divider after it. */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 hidden h-px bg-stroke-default lg:block"
                />
              )}
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
