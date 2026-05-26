/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";

// Icon % sizes derived from the lg 96-px container in Figma 1327:3887
// (and the matching Info icon instances on rows 2-5). Each Info icon has
// a 9-px inset on the symbol layer (96 - 18 = 78 px usable), then the
// Vector inside has its own per-icon inset percent within that 78-px
// box. Width % = 78 * (1 - left - right) / 96; Height % computed the
// same way against top/bottom insets. Values rounded to the nearest
// whole percent so Tailwind arbitrary-value classes stay readable.
const AUDIENCES = [
  {
    title: "Виробничі підприємства",
    body: "Харчові, фармацевтичні та промислові об'єкти з високими вимогами до чистоти, безпеки та контрольованих процесів.",
    icon: "/figma-export/hero/icon-factory.svg",
    iconClass: "w-[70%] h-[66%]",
  },
  {
    title: "Медичні заклади",
    body: "Рішення для лікарень, медичних центрів, амбулаторій і інших закладів охорони здоров'я.",
    icon: "/figma-export/hero/icon-medical.svg",
    iconClass: "w-[74%] h-[62%]",
  },
  {
    title: "Клінінгові компанії",
    body: "Для команд, яким потрібні ефективні, передбачувані та економічно виправдані рішення для обслуговування об'єктів.",
    icon: "/figma-export/protect/icon-cleaning.svg",
    iconClass: "w-[65%] h-[68%]",
  },
  {
    title: "HoReCa",
    body: "Для готелів, кухонь, ресторанів і кейтерингу, де критично важливі стабільна гігієна та відповідність стандартам.",
    icon: "/figma-export/protect/icon-horeca.svg",
    iconClass: "w-[64%] h-[62%]",
  },
  {
    title: "SPA, косметологія та салони",
    body: "Для просторів, де чистота, комфорт і враження клієнта напряму впливають на якість сервісу.",
    icon: "/figma-export/hero/icon-beauty.svg",
    iconClass: "size-[63%]",
  },
];

export function TargetAudiences() {
  return (
    // Hero now omits border-b at lg+ (see protect/Hero.tsx); this
    // section's border-t alone draws the seam as a single uniformly-
    // thin hairline. Dropped rounded-t to remove triangular page-bg
    // cutouts that read as a thick gap at the corners.
    <section className="bg-white lg:border-l lg:border-r lg:border-t lg:border-stroke-default">
      <div className="lg-pad-x flex flex-col gap-10 px-5 pb-12 pt-16 sm:gap-12 sm:px-10 sm:pb-16 sm:pt-20 lg:gap-[54px] lg:pb-[136px] lg:pt-[160px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[540px] text-neutral-900">
            <span className="text-h2">Для яких бізнесів </span>
            <span className="text-h2-light">цей напрям</span>
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
                  (title LEFT, icon RIGHT — cross-page mobile
                  consistency), body below. lg restores Figma's exact
                  row geometry (1327:3882): title-block w=574 + gap 33
                  + body w=270 + auto gap 207 + icon w=96 = total 1180.
                  Implemented with `lg:contents` to flatten the
                  inner row into the li flex, per-item `lg:order`, and
                  `lg:ml-auto` on the icon to absorb the 207-px gap. */}
              <div className="flex items-center justify-between gap-4 lg:contents">
                <p className="flex-1 text-h2 text-neutral-900 lg:order-1 lg:w-[574px] lg:flex-none">
                  {a.title}
                </p>
                <span className="flex size-[56px] shrink-0 items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-[72px] sm:rounded-[14px] lg:order-3 lg:ml-auto lg:size-[96px] lg:rounded-[18px]">
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
              <p className="text-body-sm text-neutral-500 lg:order-2 lg:ml-[33px] lg:w-[270px] lg:flex-none">
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
