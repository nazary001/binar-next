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
const AUDIENCES = [
  {
    title: "Готелів",
    body: "Для регулярного прибирання номерів, зон загального користування та пральні.\nРесторани, кафе, кухні, кейтеринг",
    icon: "/figma-export/hero/icon-hotel.svg",
    // Figma 1327:4457 — the SVG file has a HORIZONTAL viewBox
    // (29.38 × 13.79, aspect ≈ 2.13:1, "door hanger lying on its side").
    // Figma's master renders the SVG into a 71.6 × 33.6 horizontal box
    // (matching the SVG's natural aspect), then rotates the wrapper 90°
    // so the visual reads as a VERTICAL door hanger 33.6 × 71.6 in the
    // 96 × 96 frame. We replicate the trick on the img directly: set the
    // PRE-rotation bbox to `w-[75%] h-[35%]` (horizontal, ≈ SVG aspect),
    // then `rotate-90` makes the rendered icon vertical. Earlier
    // `w-[35%] h-[75%]` was the POST-rotation aspect ratio — the SVG
    // then squeezed itself into the narrow horizontal strip of that
    // vertical bbox, rendering at ~15 × 33 px and reading as tiny.
    iconClass: "w-[75%] h-[35%] rotate-90",
  },
  {
    title: "HoReCa",
    body: "Для кухонь, ресторанів і кейтерингу, де критично важливі стабільна гігієна та відповідність стандартам.",
    icon: "/figma-export/protect/icon-horeca.svg",
    // Figma 1327:4465 — inset 13.16/9.21/10.53/11.84 → 61.6 × 59.5 px.
    iconClass: "w-[64%] h-[62%]",
  },
  {
    title: "Клінінгові компанії",
    body: "Для ефективної роботи на об'єктах і економії на витратах.",
    icon: "/figma-export/protect/icon-cleaning.svg",
    // Figma 1327:4473 — inset 3.95/9.21/11.84/10.53 → 62.6 × 65.7 px.
    iconClass: "w-[65%] h-[68%]",
  },
  {
    title: "Медичні заклади",
    body: "Для підвищених вимог до дезінфекції та документації.",
    icon: "/figma-export/hero/icon-medical.svg",
    // Figma 1327:4481 — inset 11.81/4.26/11.81/4.27 → 71.4 × 59.6 px.
    iconClass: "w-[74%] h-[62%]",
  },
  {
    title: "Виробничі підприємства",
    body: "Для гігієни персоналу, зон виробництва та побутових приміщень.",
    icon: "/figma-export/hero/icon-factory.svg",
    // Figma 1327:4489 — inset 9.55/7.22/9.54/7.23 → 66.7 × 63.1 px.
    iconClass: "w-[69%] h-[66%]",
  },
];

export function CleaningAudience() {
  return (
    // `lg:-mt-px` collapses the doubled hairline at the Hero seam — the
    // Hero card carries a full 4-side border and this section carries a
    // top border, so without the overlap both strokes render as a 2-px
    // line at the join. Matches Figma where Hero ends at y=746 and the
    // next section starts at y=747 to share one visual edge.
    <section className="bg-white lg:-mt-px lg:rounded-t-[48px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default">
      {/* Figma 1327:4446 structure: pt-160 / heading-96 / gap-54 / list-840
          / pb-136 = total 1286. The previous lg:gap-[120px] +
          lg:pb-[120px] were 66 + (-16) = +50 px taller than Figma. */}
      <div className="lg-pad-x flex flex-col gap-10 px-5 pb-12 pt-16 sm:gap-12 sm:px-10 sm:pb-16 sm:pt-20 lg:gap-[54px] lg:pb-[136px] lg:pt-[160px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[540px] text-neutral-900">
            <span className="text-h2">Для кого</span>
            <span className="text-h2-light"> ми постачаємо cleaning &amp; hygiene</span>
          </h2>
          <Button href="/#contact-form" arrow>
            Отримати пропозицію
          </Button>
        </div>

        <ul className="flex flex-col">
          {AUDIENCES.map((a, i) => {
            const isLast = i === AUDIENCES.length - 1;
            return (
            <li
              key={a.title}
              className={`flex flex-col gap-4 py-6 sm:gap-6 sm:py-10 lg:flex-row lg:items-center lg:gap-0 ${
                i > 0 ? "border-t border-stroke-default" : ""
              } ${isLast ? "lg:pb-0" : ""}`}
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
              <div className="flex items-center justify-between gap-4 lg:contents">
                <p className="flex-1 text-h2 text-neutral-900 max-w-[574px] lg:order-1 lg:w-[574px] lg:max-w-none lg:flex-none lg:mr-[33px]">
                  {a.title}
                </p>
                <span className="flex size-[56px] shrink-0 items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-[72px] sm:rounded-[14px] lg:order-3 lg:size-[96px] lg:rounded-[18px]">
                  <img src={a.icon} alt="" aria-hidden loading="lazy" decoding="async" className={a.iconClass} />
                </span>
              </div>
              <p className="flex-1 lg:order-2 lg:max-w-[270px] lg:mr-auto text-body-sm text-neutral-500 whitespace-pre-line">
                {a.body}
              </p>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
