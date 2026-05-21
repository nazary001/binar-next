/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";

const AUDIENCES = [
  {
    title: "Готелів",
    body: "Для регулярного прибирання номерів, зон загального користування та пральні. Ресторани, кафе, кухні, кейтеринг.",
    icon: "/figma-export/hero/icon-hotel.svg",
    iconClass: "size-[60%] rotate-90",
  },
  {
    title: "HoReCa",
    body: "Для кухонь, ресторанів і кейтерингу, де критично важливі стабільна гігієна та відповідність стандартам.",
    icon: "/figma-export/protect/icon-horeca.svg",
    iconClass: "h-[76%] w-[79%]",
  },
  {
    title: "Клінінгові компанії",
    body: "Для ефективної роботи на об'єктах і економії на витратах.",
    icon: "/figma-export/protect/icon-cleaning.svg",
    iconClass: "h-[84%] w-[80%]",
  },
  {
    title: "Медичні заклади",
    body: "Для підвищених вимог до дезінфекції та документації.",
    icon: "/figma-export/hero/icon-medical.svg",
    iconClass: "h-[76%] w-[91%]",
  },
  {
    title: "Виробничі підприємства",
    body: "Для гігієни персоналу, зон виробництва та побутових приміщень.",
    icon: "/figma-export/hero/icon-factory.svg",
    iconClass: "h-[80%] w-[86%]",
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
      <div className="lg-pad-x flex flex-col gap-10 px-5 pb-12 pt-16 sm:gap-12 sm:px-10 sm:pb-16 sm:pt-20 lg:gap-[120px] lg:pb-[120px] lg:pt-[160px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[540px] text-neutral-900">
            <span className="text-h2">Для кого </span>
            <span className="text-h2-light">ми постачаємо cleaning &amp; hygiene</span>
          </h2>
          <Button href="/#contact-form" arrow>
            Отримати пропозицію
          </Button>
        </div>

        <ul className="flex flex-col">
          {AUDIENCES.map((a, i) => (
            <li
              key={a.title}
              className={`group/row flex flex-col gap-4 py-6 transition-colors duration-300 sm:gap-6 sm:py-10 lg:flex-row lg:items-center lg:gap-8 ${
                i > 0 ? "border-t border-stroke-subtle" : ""
              }`}
            >
              <p className="flex-1 max-w-[574px] text-h2 text-neutral-900 transition-colors duration-300 group-hover/row:text-brand">
                {a.title}
              </p>
              <p className="flex-1 max-w-[480px] text-body-sm text-neutral-500">
                {a.body}
              </p>
              <span className="flex size-[72px] shrink-0 items-center justify-center overflow-clip rounded-[14px] border border-stroke-default transition-all duration-500 group-hover/row:rotate-3 group-hover/row:scale-105 sm:size-[96px] sm:rounded-[18px]">
                <img src={a.icon} alt="" aria-hidden loading="lazy" decoding="async" className={a.iconClass} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
