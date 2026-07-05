/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";

// Each icon SVG is the Figma "Info icon" 34px-zone export (glyph padding
// baked in), rendered at a uniform 17.31% inset (= 9/52) of the tile so
// the glyph lands at exactly the master's size on every breakpoint.
const AUDIENCES = [
  {
    title: "Виробничі підприємства",
    body: "Харчові, фармацевтичні та промислові об'єкти з високими вимогами до чистоти, безпеки та контрольованих процесів.",
    icon: "/figma-export/info-icons/aud-factory.svg",
  },
  {
    title: "Медичні заклади",
    body: "Рішення для лікарень, медичних центрів, амбулаторій і інших закладів охорони здоров'я.",
    icon: "/figma-export/info-icons/aud-medical.svg",
  },
  {
    title: "Клінінгові компанії",
    body: "Для команд, яким потрібні ефективні, передбачувані та економічно виправдані рішення для обслуговування об'єктів.",
    icon: "/figma-export/info-icons/aud-cleaning.svg",
  },
  {
    title: "HoReCa",
    body: "Для готелів, кухонь, ресторанів і кейтерингу, де критично важливі стабільна гігієна та відповідність стандартам.",
    icon: "/figma-export/info-icons/aud-horeca.svg",
  },
  {
    title: "SPA, косметологія та салони",
    body: "Для просторів, де чистота, комфорт і враження клієнта напряму впливають на якість сервісу.",
    icon: "/figma-export/info-icons/aud-beauty.svg",
  },
];

export function TargetAudiences() {
  return (
    // Figma 1327:3876 — section has its own bordered/rounded card
    // (border L+R+T, rounded-tl/tr 48). `lg:-mt-px` overlaps Hero's
    // bottom border so the two 1-px hairlines paint the SAME pixel row
    // and the seam reads as ONE thin line instead of a 2-px band.
    <section className="bg-white lg:-mt-px lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default">
      {/* Mobile (Figma 3165:5956): pt-60, heading -> list gap 60 (the ul
          adds mt-5 on top of the container's gap-10), list -> CTA 40. */}
      <div className="lg-pad-x flex flex-col gap-10 px-6 pb-[60px] pt-[60px] sm:gap-12 sm:px-10 sm:pb-16 sm:pt-20 lg:gap-[54px] lg:pb-[136px] lg:pt-[160px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[540px] text-neutral-900">
            <span className="text-h2">Для яких бізнесів </span>
            <span className="text-h2-light">цей напрям</span>
          </h2>
          {/* Figma MOBILE master (3165:5957) keeps only the heading in this
              row — the CTA moves to the bottom of the list (see below). On
              lg the Figma desktop master pairs the heading with the button,
              so it shows only at lg via max-lg:hidden (the Button wrapper
              hardcodes inline-flex, which beats a bare `hidden`). */}
          <Button href="/#contact-form" arrow className="max-lg:hidden">
            Отримати пропозицію
          </Button>
        </div>

        <ul className="flex flex-col max-lg:mt-5 sm:mt-0">
          {AUDIENCES.map((a, i) => {
            const isLast = i === AUDIENCES.length - 1;
            return (
            <li
              key={a.title}
              // Mobile: first row starts flush (Figma item 1 has no top
              // padding); bordered rows use pt-[39px] so border + padding
              // = the master's 40px gap above the content.
              className={`flex flex-col gap-8 pb-10 lg:flex-row lg:items-center lg:gap-0 ${
                i > 0
                  ? "border-t border-stroke-default pt-[39px] lg:pt-10"
                  : "pt-0 lg:pt-10"
              } ${isLast ? "max-lg:pb-0 lg:pb-0" : ""}`}
            >
              {/* Mobile / sm (Figma 3165:6057): title + 52-px icon sit in
                  one row at the top (title LEFT 266 wide, icon RIGHT,
                  24-px gap), body below with a 32-px gap. lg restores
                  Figma's exact desktop row geometry (1327:3882):
                  title-block w=574 + gap 33 + body w=270 + auto gap 207
                  + icon w=96 = total 1180. Implemented with `lg:contents`
                  to flatten the inner row into the li flex, per-item
                  `lg:order`, and `lg:ml-auto` on the icon to absorb the
                  207-px gap. */}
              <div className="flex items-center justify-between gap-6 lg:contents">
                <p className="flex-1 text-h2 text-neutral-900 lg:order-1 lg:w-[574px] lg:flex-none">
                  {a.title}
                </p>
                <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-[72px] sm:rounded-[14px] lg:order-3 lg:ml-auto lg:size-[96px] lg:rounded-[18px]">
                  <img
                    src={a.icon}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-[17.31%] size-[65.38%] max-w-none"
                  />
                </span>
              </div>
              <p className="text-body-sm text-neutral-500 lg:order-2 lg:ml-[33px] lg:w-[270px] lg:flex-none">
                {a.body}
              </p>
            </li>
            );
          })}
        </ul>

        {/* Figma MOBILE master (3165:6176) — the section CTA sits at the
            bottom of the list, right-aligned to the content column (its
            right edge lands on the 24-px gutter). lg:hidden because the
            desktop master shows it beside the heading instead (above). */}
        <div className="flex justify-end lg:hidden">
          <Button href="/#contact-form" size="responsive" arrow>
            Отримати пропозицію
          </Button>
        </div>
      </div>
    </section>
  );
}
