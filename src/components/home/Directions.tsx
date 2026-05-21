/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

const ARROW = "/figma-export/directions/arrow-up-right-dark.svg";

type Card = {
  href: string;
  title: string;
  body: string;
  image: string;
};

const CARDS: Card[] = [
  {
    href: "/hotels",
    title: "Усе для готелів",
    body: "Товари для ефективної роботи закладів гостинності та якісного обслуговування гостей",
    image: "/figma-export/directions/card-hotels.png",
  },
  {
    href: "/protect",
    title: "Засоби індивідуального захисту",
    body: "Забезпечення індивідуального захисту та гігієни на виробничих підприємствах, у медичних закладах, салонах краси, закладах HORECA",
    image: "/figma-export/directions/card-protect.png",
  },
  {
    href: "/cleaning",
    title: "Засоби та інвентар для прибирання",
    body: "Професійна хімія та інвентар для щоденного прибирання комерційних об'єктів",
    image: "/figma-export/directions/card-cleaning.png",
  },
];

function DirectionCard({ href, title, body, image }: Card) {
  return (
    <Link
      href={href}
      className="group flex w-full cursor-pointer flex-col gap-8 py-6"
    >
      <div className="relative h-[336px] w-full overflow-hidden rounded-[40px]">
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full rounded-[40px] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[40px] bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="absolute right-4 top-[268px] flex size-[52px] items-center justify-center rounded-[26px] border border-neutral-900 bg-white/0 transition-all duration-300 group-hover:bg-neutral-900 group-hover:rotate-12"
        >
          <img
            src={ARROW}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="size-6 transition-[filter] duration-300 group-hover:invert"
          />
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">
          {title}
        </h3>
        <p className="text-body-sm text-neutral-500">{body}</p>
      </div>
    </Link>
  );
}

export function Directions() {
  return (
    <section id="segments">
      {/* `lg:-mt-px` collapses the doubled hairline at the Hero/Directions
          seam. Hero's left card carries a full 4-side border (lg:border)
          and this section carries a top border, so without the overlap
          both 1-px strokes would render on adjacent pixel rows and read
          as a 2-px stroke at the join. Matches the Figma source where
          Hero (y=0..746) and Directions (y=747..) sit one px apart so
          the strokes share a single visual edge. */}
      <div className="lg-pad-x flex flex-col gap-10 px-5 py-12 sm:gap-16 sm:px-10 sm:py-20 lg:-mt-px lg:gap-[120px] lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default lg:py-[120px]">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
          <h2 className="flex-1 text-neutral-900 lg:max-w-[574px]">
            <span className="text-h2">Оберіть напрямок, </span>
            <span className="text-h2-light">актуальний для вашого бізнесу</span>
          </h2>
          <p className="flex-1 text-body-sm text-neutral-500">
            Працюємо як системний B2B-партнер: оптимізуємо закупівлі,
            скорочуємо кількість постачальників і забезпечуємо стабільні поставки
            з прогнозованими термінами та контрольованою якістю.
          </p>
        </div>

        <ul className="flex flex-col items-stretch gap-8 sm:gap-10 lg:flex-row lg:items-start lg:gap-0 lg:divide-x lg:divide-stroke-subtle">
          {CARDS.map((c, i) => (
            <Reveal
              as="li"
              key={c.href}
              delay={i * 120}
              className="flex-1 lg:px-10 lg:first:pl-0 lg:last:pr-0"
            >
              <DirectionCard {...c} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
