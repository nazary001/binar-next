/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

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
    body: "Товари для ефективної роботи закладів гостинності  та якісного обслуговування гостей",
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
      className="group flex w-full cursor-pointer flex-col gap-6 py-2 sm:gap-8 sm:py-6"
    >
      {/* Mobile keeps the Figma 336-px height but rounds the corners
          a hair tighter (28 vs 40) so the card feels phone-native;
          the arrow icon scales down to 44 px and pins to the bottom-
          right via inset offsets so it scales with the card no matter
          the device width. Desktop returns to the Figma master. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] sm:aspect-auto sm:h-[336px] sm:rounded-[40px]">
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full rounded-[28px] object-cover transition duration-300 ease-out group-hover:grayscale sm:rounded-[40px]"
        />
        <span
          aria-hidden
          className="absolute bottom-4 right-4 flex size-[44px] items-center justify-center rounded-[22px] border border-neutral-900 text-neutral-900 transition-colors duration-300 ease-out group-hover:border-brand group-hover:bg-brand group-hover:text-white sm:bottom-auto sm:top-[268px] sm:size-[52px] sm:rounded-[26px]"
        >
          <svg
            width="16.5"
            height="16.5"
            viewBox="0 0 16.4999 16.4999"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className="size-[16.5px]"
          >
            <path
              d="M16.4999 12C16.4999 12.4142 16.1642 12.75 15.7499 12.75C15.3357 12.75 14.9999 12.4142 14.9999 12V2.56055L1.28022 16.2803C0.987323 16.5732 0.512563 16.5732 0.21967 16.2803C-0.0732232 15.9874 -0.0732232 15.5126 0.21967 15.2197L13.9394 1.5H4.49994C4.08573 1.5 3.74994 1.16421 3.74994 0.75C3.74994 0.335787 4.08573 0 4.49994 0H15.7499C15.9489 0 16.1396 0.0790744 16.2802 0.219727C16.4209 0.360379 16.4999 0.551088 16.4999 0.75V12Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:gap-4">
        <h3 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">{title}</h3>
        <p className="text-body-sm text-neutral-500">{body}</p>
      </div>
    </Link>
  );
}

export function Directions() {
  return (
    <section id="segments">
      {/* Hero now omits border-b at lg+ (see home/Hero.tsx) so
          Directions's border-t draws the seam on its own as a single
          uniformly-thin hairline across the full width. Dropping the
          rounded-tl/tr at lg eliminates the triangular page-bg cutouts
          that previously made the join read as a thick gap. */}
      <div className="lg-pad-x flex flex-col gap-10 px-5 py-12 sm:gap-16 sm:px-10 sm:py-20 lg:gap-[120px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default lg:pt-[160px] lg:pb-0">
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

        <ul className="flex flex-col items-stretch gap-8 sm:gap-10 lg:flex-row lg:items-stretch lg:gap-0 lg:divide-x lg:divide-stroke-subtle">
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
