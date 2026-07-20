/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

type Card = {
  href: string;
  title: string;
  body: string;
  image: string;
  // Figma mobile master 3117:12427 fills card 1 with a DIFFERENT photo
  // version than the desktop master and maps the whole 1024x1000 frame
  // into the 342x206 box with a non-uniform stretch (not a cover crop).
  // card-hotels-mobile.png is that stretch pre-baked at 2x (684x412), so
  // plain object-cover renders the master 1:1 at 390 and degrades by
  // cropping - not by stretching further - at wider sub-lg widths.
  // Cards 2/3 share one asset per breakpoint (plain centre cover in Figma).
  mobileImage?: string;
};

const CARDS: Card[] = [
  {
    href: "/hotels",
    title: "Усе для готелів",
    body: "Товари для ефективної роботи закладів гостинності  та якісного обслуговування гостей",
    image: "/figma-export/directions/card-hotels.png",
    mobileImage: "/figma-export/directions/card-hotels-mobile.png",
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

function DirectionCard({ href, title, body, image, mobileImage }: Card) {
  return (
    <Link
      href={href}
      // Mobile (Figma 3117:12426): a bordered card - stroke/deep #343435,
      // rounded-32, with the image + title/body wrapped as ONE column and
      // no gap between them (the text block carries its own px-6 py-[50px]).
      // Desktop is the master 3-column divided row: borderless, no internal
      // padding, gap-8 between the image and the title/body block.
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-[32px] border border-neutral-800 lg:gap-8 lg:overflow-visible lg:rounded-none lg:border-0 lg:py-6"
    >
      {/* Image: Figma mobile h-206, rounded-32. Desktop returns to the
          336-px master. The arrow icon overlaps the image bottom-right
          (Figma left-272 top-138 within the 340-wide card = 16-px insets);
          on desktop it pins to top-[268px] to sit 16 px above the 336 image. */}
      <div className="relative h-[206px] w-full overflow-hidden rounded-[32px] lg:h-[336px] lg:rounded-[40px]">
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full rounded-[32px] object-cover transition duration-300 ease-out group-hover:grayscale lg:rounded-[40px] ${mobileImage ? "max-lg:hidden" : ""}`}
        />
        {mobileImage && (
          <img
            src={mobileImage}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full rounded-[32px] object-cover transition duration-300 ease-out group-hover:grayscale lg:hidden"
          />
        )}
        <span
          aria-hidden
          className="absolute bottom-4 right-4 flex size-[52px] items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 ease-out group-hover:border-brand group-hover:bg-brand group-hover:text-white lg:bottom-auto lg:top-[268px]"
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
      {/* Mobile carries the Figma px-6 py-48 gap-3 (3117:12428) inside the
          bordered card; py-[47px] because the card's 1px borders live
          INSIDE the Figma box. Desktop strips the padding entirely. */}
      <div className="flex flex-col gap-3 px-6 py-[47px] lg:gap-4 lg:p-0">
        <h3 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">{title}</h3>
        <p className="text-body-sm text-neutral-500">{body}</p>
      </div>
    </Link>
  );
}

export function Directions() {
  return (
    <section id="segments">
      {/* Figma — Directions sits as its own bordered/rounded card
          (border L+R+T, rounded-tl/tr 48). `lg:-mt-px` overlaps Hero's
          bottom border so the two 1-px hairlines share the SAME pixel
          row and the seam reads as ONE thin line, not a 2-px band. */}
      <div className="lg-pad-x flex flex-col gap-12 px-6 py-[60px] sm:gap-16 sm:px-10 sm:py-20 lg:-mt-px lg:gap-[120px] lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:border-l lg:border-r lg:border-t lg:border-stroke-default lg:pt-[160px] lg:pb-0">
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

        <ul className="flex flex-col items-stretch gap-12 sm:gap-10 lg:flex-row lg:items-stretch lg:gap-0 lg:divide-x lg:divide-stroke-subtle">
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
