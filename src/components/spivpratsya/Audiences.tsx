/* eslint-disable @next/next/no-img-element */
import { Reveal } from "@/components/ui/Reveal";

// Figma 1870:6009 + 1870:6011. Title strip "Кому ми будемо корисні?"
// sits above a vertical list of 4 audience rows. Each row is:
//   • h3 "Дизайнерам інтер'єру" (text-h2-bold, 574-px column)
//   • body copy in a 271-px column
//   • 96-px square Info icon button on the right
// Rows are separated by a 1-px horizontal divider that spans the
// 1180-px content area (130 px gutters on a 1440 master).
const AUDIENCES = [
  {
    title: "Дизайнерам інтер’єру",
    body: "Підбираємо комплектацію під стиль і бюджет, готуємо варіанти та зразки для погодження.",
    icon: "/figma-export/spivpratsya/aud-designer.svg",
  },
  {
    title: "Архітекторам",
    body: "Допомагаємо із специфікаціями і рішеннями, які впливають на експлуатацію об’єкта.",
    icon: "/figma-export/spivpratsya/aud-architect.svg",
  },
  {
    title: "Девелоперам",
    body: "Беремо на себе операційну частину комплектації: підбір, прорахунок, постачання.",
    icon: "/figma-export/spivpratsya/aud-developer.svg",
  },
  {
    title: "Консультантам",
    body: "Працюємо як постачальник у ваших проєктах: швидкі КП, варіанти, готовність до запуску.",
    icon: "/figma-export/spivpratsya/aud-consultant.svg",
  },
];

export function Audiences() {
  return (
    <section className="lg-pad-x flex w-full flex-col gap-10 bg-white px-5 py-12 sm:gap-14 sm:px-10 sm:py-20 lg:gap-[80px] lg:pt-[80px] lg:pb-[60px]">
      <Reveal as="h2" className="text-h2-light text-neutral-900 max-w-[640px]">
        Кому ми будемо корисні?
      </Reveal>

      <ul className="flex w-full flex-col">
        {AUDIENCES.map((a, i) => {
          const isLast = i === AUDIENCES.length - 1;
          return (
            <Reveal
              as="li"
              key={a.title}
              delay={i * 80}
              direction="up"
              className="group/row relative flex flex-col gap-3 py-6 sm:gap-5 sm:py-8 lg:flex-row lg:items-center lg:gap-10 lg:py-10"
            >
              {/* Mobile: title + icon on one row, body below. On lg the
                  wrapper drops to `display: contents` so its children
                  (title, icon) become direct flex children of the row.
                  Combined with `lg:order-*` on body+icon we get Figma's
                  title-574 | body-271 | icon-96 horizontal flow. */}
              <div className="flex items-center justify-between gap-4 lg:contents">
                <h3 className="text-h2 text-neutral-900 lg:w-[574px] lg:shrink-0">
                  {a.title}
                </h3>
                <span className="relative block size-14 shrink-0 overflow-clip rounded-[12px] border border-stroke-default transition-all duration-300 group-hover/row:-translate-y-1 group-hover/row:border-neutral-900 sm:size-16 sm:rounded-[14px] lg:order-3 lg:size-24 lg:rounded-[18px]">
                  <img
                    src={a.icon}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-[18%] size-[64%] object-contain transition-transform duration-300 group-hover/row:scale-110"
                  />
                </span>
              </div>
              <p className="text-body-sm text-neutral-800 lg:order-2 lg:max-w-[271px] lg:flex-1">
                {a.body}
              </p>
              {/* Hairline divider between rows. The last row drops it —
                  Figma's frame is shorter (136 vs 176 px) precisely
                  because there is no closing divider after it. */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 block h-px bg-stroke-subtle"
                />
              )}
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
