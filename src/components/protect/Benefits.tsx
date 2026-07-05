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
    <section className="lg-pad-x bg-white px-6 py-[60px] sm:px-10 sm:py-20 lg:border-l lg:border-r lg:border-stroke-default lg:py-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[574px] text-neutral-900">
            <span className="text-h2-light">Що ви </span>
            <span className="text-h2">отримуєте?</span>
          </h2>
          {/* Desktop master pairs the heading with this CTA; the Figma
              MOBILE master (3165:5063) drops it here and adds the bottom
              CTA below the cards instead. max-lg:hidden (not bare
              `hidden`) because the Button wrapper hardcodes inline-flex. */}
          <Button href="/#contact-form" arrow className="max-lg:hidden">
            Підібрати рішення
          </Button>
        </div>

        {/* Two layouts in one — toggled by media-query utilities.
            Below lg the Figma MOBILE master (3165:5063) shows each
            feature as a self-contained `bg-bg-subtle` rounded-32 card
            (p-24): icon 120 px on TOP via flex-col-reverse, then a
            40-px gap to the title + body. No index badge — the phone
            master has none.
            lg: cards melt into the bare-divider grid from Figma
            (rounded-none, bg-transparent, p-0, no shadow, no lift),
            with hairline vertical lines between the three columns.

            The `lg:contents` wrapper holds the card grid + the mobile
            bottom CTA: on mobile it's a flex-col with a 24-px gap (so
            the CTA sits 24 px below the last card, per 3176:5441); at
            lg it dissolves so the <ul> becomes a direct child of the
            outer flex and inherits the lg:gap-[120px] rhythm. */}
        <div className="flex flex-col gap-6 lg:contents">
          {/* Figma 1327:3924/1327:3925 — 3 equal-width 340 px blocks with
              80 px gaps and hairline vertical dividers centred in each
              gap (Vector67/68 at x=380 / x=800 on the 1180 master). The
              divider is rendered as an absolutely-positioned `<span>` 40
              px to the left of each non-first li so it sits exactly in
              the middle of the 80 grid gap, matching Figma 1:1 instead
              of border-l flush against the cell edge. */}
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-0 lg:gap-x-[80px]">
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
                    relative flex h-full w-full min-w-0 flex-col-reverse items-start gap-10
                    rounded-[32px] bg-bg-subtle p-6
                    lg:flex-col lg:items-end lg:justify-between lg:gap-10
                    lg:min-h-[344px] lg:rounded-none lg:bg-transparent lg:p-0 lg:py-6
                    lg:shadow-none
                  "
                >
                  <div className="flex w-full flex-col gap-3 sm:gap-4">
                    <h3 className="text-title-lg text-neutral-900">
                      {f.title}
                    </h3>
                    <p className="text-body-sm text-neutral-500">{f.body}</p>
                  </div>
                  <span
                    aria-hidden
                    className="relative block size-[120px] shrink-0 overflow-clip"
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

          {/* Figma MOBILE master (3176:5441) — bottom CTA, right-aligned
              to the content column. lg:hidden (desktop uses the heading
              CTA above). */}
          <div className="flex justify-end lg:hidden">
            <Button href="/#contact-form" size="responsive" arrow>
              Отримати пропозицію
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
