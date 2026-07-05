/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";

// Icon sizes calculated from Figma 1327:4446 design context (verified
// via MCP plugin_figma__get_design_context). Each icon container is
// 96 x 96 (size-[96px]) with `inset-[9px]` interior padding → 78 x 78
// inner box, and the SVG vector itself has Figma-specific insets within
// that 78 x 78. Resulting visible vector dimensions as % of the 96 px
// container are derived as:
//   visible.w% = (78 − 78*(right + left)) / 96
//   visible.h% = (78 − 78*(top + bottom)) / 96
// (the inset percentages from Figma are listed in the iconClass comment
// per row). Previously every icon used larger 76–91 % values which
// pushed the silhouettes past their Figma-master crop and made them
// look noticeably bigger than the design.
// Each icon SVG is the Figma "Info icon" 34px-zone export (glyph padding
// and orientation baked in), rendered at a uniform 17.31% inset (= 9/52)
// of the tile so the glyph lands at exactly the master's size.
const AUDIENCES = [
  {
    title: "Готелів",
    body: "Для регулярного прибирання номерів, зон загального користування та пральні.\nРесторани, кафе, кухні, кейтеринг",
    icon: "/figma-export/info-icons/aud-hotel.svg",
  },
  {
    title: "HoReCa",
    body: "Для кухонь, ресторанів і кейтерингу, де критично важливі стабільна гігієна та відповідність стандартам.",
    icon: "/figma-export/info-icons/aud-horeca.svg",
  },
  {
    title: "Клінінгові компанії",
    body: "Для ефективної роботи на об'єктах і економії на витратах.",
    icon: "/figma-export/info-icons/aud-cleaning.svg",
  },
  {
    title: "Медичні заклади",
    body: "Для підвищених вимог до дезінфекції та документації.",
    icon: "/figma-export/info-icons/aud-medical.svg",
  },
  {
    title: "Виробничі підприємства",
    body: "Для гігієни персоналу, зон виробництва та побутових приміщень.",
    icon: "/figma-export/info-icons/aud-factory.svg",
  },
];

export function CleaningAudience() {
  return (
    // Figma — section sits as its own bordered/rounded card
    // (border L+R+T, rounded-tl/tr 48). `lg:-mt-px` overlaps Hero's
    // bottom border so the two 1-px hairlines share the SAME pixel row
    // and the seam reads as ONE thin line, not a 2-px band.
    <section className="bg-white lg:-mt-px lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default">
      {/* Figma 1327:4446 structure: pt-160 / heading-96 / gap-54 / list-840
          / pb-136 = total 1286. The previous lg:gap-[120px] +
          lg:pb-[120px] were 66 + (-16) = +50 px taller than Figma. */}
      <div className="lg-pad-x flex flex-col gap-10 px-6 pb-[60px] pt-[60px] sm:gap-12 sm:px-10 sm:pb-16 sm:pt-20 lg:gap-[54px] lg:pb-[136px] lg:pt-[160px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[540px] text-neutral-900">
            <span className="text-h2">Для кого</span>
            <span className="text-h2-light"> ми постачаємо cleaning &amp; hygiene</span>
          </h2>
          {/* Figma MOBILE master (3165:6679) keeps only the heading here;
              the CTA moves to the bottom of the list (below). lg shows it
              beside the heading via max-lg:hidden. */}
          <Button href="/#contact-form" arrow className="max-lg:hidden">
            Отримати пропозицію
          </Button>
        </div>

        {/* max-lg:mt-5: the Figma mobile master separates the heading from
            the list by 60px (container gap-10 provides 40). */}
        <ul className="flex flex-col max-lg:mt-5 sm:mt-0">
          {AUDIENCES.map((a, i) => {
            const isLast = i === AUDIENCES.length - 1;
            return (
            <li
              key={a.title}
              // Mobile: first row starts flush (no top padding in the
              // master); bordered rows use pt-[39px] so border + padding
              // = the master's 40px gap above the content.
              className={`flex flex-col gap-8 pb-10 lg:flex-row lg:items-center lg:gap-0 ${
                i > 0
                  ? "border-t border-stroke-default pt-[39px] lg:pt-10"
                  : "pt-0 lg:pt-10"
              } ${isLast ? "max-lg:pb-0 lg:pb-0" : ""}`}
            >
              {/* Mobile / sm: title + icon sit in one row at the top
                  (title LEFT, icon RIGHT — mirrors Spivpratsya
                  Audiences for consistency across the site), body
                  below. `justify-between` pushes the icon flush to
                  the row's right edge on mobile / sm.
                  At lg+ the wrapper dissolves via `lg:contents`, then
                  per-item `lg:order` rules pin title to slot 1, body
                  to slot 2, icon to slot 3. Spacing matches Figma
                  1327:4446: title w-[574px] + mr-[33px] gap to body
                  (270 max), body has `mr-auto` so the leftover space
                  collapses BEFORE the icon, pinning the icon flush
                  to the row's right edge (Figma's `justify-between`
                  on the row with an 877-wide title+body wrapper +
                  96-wide icon at the right). NO hover state — Figma
                  master has no rest/hover variants on this row, so
                  the title stays `text-neutral-900` regardless of
                  pointer position. */}
              <div className="flex items-center justify-between gap-6 lg:contents">
                <p className="flex-1 text-h2 text-neutral-900 max-w-[574px] lg:order-1 lg:w-[574px] lg:max-w-none lg:flex-none lg:mr-[33px]">
                  {a.title}
                </p>
                <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-[72px] sm:rounded-[14px] lg:order-3 lg:size-[96px] lg:rounded-[18px]">
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
              <p className="flex-1 lg:order-2 lg:max-w-[270px] lg:mr-auto text-body-sm text-neutral-500 whitespace-pre-line">
                {a.body}
              </p>
            </li>
            );
          })}
        </ul>

        {/* Figma MOBILE master (3165:6720) — section CTA at the bottom of
            the list, right-aligned to the content column. lg:hidden
            (desktop uses the heading CTA above). */}
        <div className="flex justify-end lg:hidden">
          <Button href="/#contact-form" size="responsive" arrow>
            Отримати пропозицію
          </Button>
        </div>
      </div>
    </section>
  );
}
