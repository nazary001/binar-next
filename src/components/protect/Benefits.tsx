/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const FEATURES = [
  {
    title: "Стабільні поставки без зривів",
    body: "Щоб процеси не зупинялись через відсутність ЗІЗ.",
    icon: "/figma-export/why-us/icon-purchases.svg",
  },
  {
    title: "Прогнозовану якість у кожній партії",
    body: "Фіксуємо вимоги і контролюємо відповідність.",
    icon: "/figma-export/protect/icon-quality.svg",
  },
  {
    title: "Підбір під реальні умови роботи",
    body: "Матеріали, щільність, захист, розміри, комфорт персоналу та клієнтів — під ваші задачі.",
    icon: "/figma-export/why-us/icon-custom.svg",
  },
];

export function ProtectBenefits() {
  return (
    <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:border-l lg:border-r lg:border-stroke-default lg:py-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[574px] text-neutral-900">
            <span className="text-h2-light">Що ви </span>
            <span className="text-h2">отримуєте?</span>
          </h2>
          <Button href="/#contact-form" arrow>
            Підібрати рішення
          </Button>
        </div>

        {/* Two layouts in one — toggled by media-query utilities.
            mobile/tablet: each feature is a self-contained
            `bg-bg-subtle` rounded card with a mono index badge in the
            top-right (`02 / 03`), icon stacked on TOP via
            flex-col-reverse, title + body below. Hover lifts the card
            to white with a soft shadow.
            lg: cards melt into the bare-divider grid from Figma
            (rounded-none, bg-transparent, p-0, no shadow, no lift),
            with hairline vertical lines between the three columns. */}
        {/* Figma 1327:3924/1327:3925 — 3 equal-width 340 px blocks with
            80 px gaps and hairline vertical dividers centred in each
            gap (Vector67/68 at x=380 / x=800 on the 1180 master). The
            divider is rendered as an absolutely-positioned `<span>` 40
            px to the left of each non-first li so it sits exactly in
            the middle of the 80 grid gap, matching Figma 1:1 instead
            of border-l flush against the cell edge. */}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-y-0 lg:gap-x-[80px]">
          {FEATURES.map((f, i) => (
            <Reveal
              as="li"
              key={f.title}
              delay={i * 110}
              className="relative flex"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-10 top-0 hidden h-full w-px bg-stroke-subtle lg:block"
                />
              )}
              <article
                className="
                  group relative flex h-full w-full min-w-0 flex-col-reverse items-start gap-5
                  rounded-[24px] bg-bg-subtle p-6


                  sm:gap-6 sm:rounded-[28px] sm:p-7
                  lg:flex-col lg:items-end lg:justify-between lg:gap-10
                  lg:min-h-[344px] lg:rounded-none lg:bg-transparent lg:p-0 lg:py-6
                  lg:shadow-none
                "
              >
                <span
                  aria-hidden
                  className="absolute right-5 top-5 font-mono text-[12px] font-medium tracking-[0.18em] text-neutral-300 transition-colors duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-brand sm:right-6 sm:top-6 sm:text-[13px] lg:hidden"
                >
                  {String(i + 1).padStart(2, "0")}
                  <span className="text-neutral-200">
                    {" "}/ {String(FEATURES.length).padStart(2, "0")}
                  </span>
                </span>

                <div className="flex w-full flex-col gap-3 sm:gap-4">
                  <h3 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">
                    {f.title}
                  </h3>
                  <p className="text-body-sm text-neutral-500">{f.body}</p>
                </div>
                <span
                  aria-hidden
                  className="relative block size-[88px] shrink-0 overflow-clip sm:size-[100px] lg:size-[120px]"
                >
                  <img
                    src={f.icon}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-contain"
                  />
                </span>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
