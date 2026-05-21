"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export type CaseTag = string;

export type CaseEntry = {
  name: string;
  logo: string;
  logoClass: string;
  description: string;
  tags: CaseTag[];
  image: string;
  imageStyle: { left: string; top: string; width: string; height: string };
  stats: { value: string; suffix?: string; label: string }[];
};

const CASES: CaseEntry[] = [
  {
    name: "Rixos",
    logo: "/figma-export/cases/logo-rixos.svg",
    logoClass: "h-[47px] w-[160px]",
    description:
      "Розробка унікального кастомного дизайну з інтеграцією логотипу готелю, що підкреслює його індивідуальність та стиль, забезпечуючи впізнаваність бренду та привабливість для гостей.",
    tags: ["готельна косметика", "косметичні набори", "тапочки"],
    image: "/figma-export/cases/img-rixos.png",
    imageStyle: { left: "-12.06%", top: "-0.82%", width: "158.25%", height: "205.07%" },
    stats: [
      { value: "4", label: "роки співпраці" },
      { value: "200", label: "оснащених номерів" },
    ],
  },
  {
    name: "Mirotel",
    logo: "/figma-export/cases/logo-mirotel.svg",
    logoClass: "h-[54px] w-[119px]",
    description:
      "Розробка унікального кастомного дизайну з інтеграцією логотипу готелю, що підкреслює його індивідуальність та стиль, забезпечуючи впізнаваність бренду та привабливість для гостей.",
    tags: ["готельна косметика", "косметичні набори", "тапочки"],
    image: "/figma-export/cases/img-mirotel.png",
    imageStyle: { left: "-12.06%", top: "-34.65%", width: "113.17%", height: "146.64%" },
    stats: [
      { value: "3", label: "роки співпраці" },
      { value: "1200", label: "оснащених номерів" },
    ],
  },
];

// Stack-on-scroll constants. Each case card pins below the previous one
// at the height of the logo placeholder (197 px), so the previous card's
// logo (positioned absolute at top-right inside the card) stays visible
// while the next card comes to rest on its bottom edge. Card height
// is also encoded inline as `lg:h-[729px]` on the photo column and the
// left content column — keep them in sync with `LG_CARD_HEIGHT`.
const LG_LOGO_HEIGHT = 197;
const LG_CARD_HEIGHT = 729;
// How many extra pixels of scroll each upper card holds its sticky
// offset before exiting with the section. A short pin (~200 px) lets
// Card 2 visibly "land" on Card 1's logo strip — the layered look the
// designer asked for — without recreating the long dead zone that the
// original 532-px pin produced. The scroll-driven parallax wired up in
// the Cases component below keeps the photo inside each card shifting
// during this 200-px pin, so the scrollbar never tracks a frame where
// the viewport is fully static.
const LG_STACK_PIN = 200;
// Maximum vertical parallax shift applied to the right-column photo
// (lg only) is 96 px, defined in globals.css under
// `.cases-parallax-sleeve` so the transform lives behind a
// `min-width: 1024px` media query — kept the cap at 96 px so the
// bottom edge of Mirotel's photo stays ≥ y=729 across the full sweep
// without revealing the background colour at the top edge.

export function CaseCard({
  data,
  index = 0,
  onActivate,
}: {
  data: CaseEntry;
  index?: number;
  onActivate?: () => void;
}) {
  const isClickable = Boolean(onActivate);
  return (
    <article
      className={`flex w-full flex-col overflow-hidden rounded-[28px] border border-stroke-default bg-white shadow-md sm:rounded-[36px] lg:overflow-visible lg:rounded-none lg:border-0 lg:shadow-sm lg:sticky lg:flex-row lg:transition-[top] lg:duration-300 lg:focus-visible:outline-none lg:focus-visible:ring-2 lg:focus-visible:ring-brand lg:focus-visible:ring-offset-2 ${
        isClickable ? "lg:cursor-pointer" : ""
      }`}
      style={{
        // Pin each card BELOW the sticky site header rather than at the
        // viewport's literal top edge — otherwise the card slides under
        // the header and reads as broken. `--site-header-h` is published
        // by Header.tsx (68 px scrolled / 84 px not) and the
        // `transition-[top]` class above keeps the card aligned with the
        // header as it grows/shrinks. The 84-px fallback covers the
        // tick of first render before the Header effect runs.
        top: `calc(var(--site-header-h, 84px) + ${index * LG_LOGO_HEIGHT}px)`,
      }}
      onClick={onActivate}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate?.();
              }
            }
          : undefined
      }
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Показати кейс ${data.name}` : undefined}
    >
      <div
        className="relative order-2 flex-1 overflow-hidden border-button-subtle bg-white lg:order-1 lg:h-[729px] lg:rounded-r-[48px] lg:border-b lg:border-r lg:border-t"
      >
        <div className="absolute right-0 top-0 hidden h-[197px] w-[227px] items-center justify-center overflow-clip border-b border-l border-button-subtle lg:flex">
          <img src={data.logo} alt={`${data.name} logo`} loading="lazy" decoding="async" className={data.logoClass} />
        </div>

        <div className="absolute bottom-0 right-0 hidden h-[202px] w-[227px] overflow-clip border-l border-t border-button-subtle lg:block">
          <img
            src="/figma-export/cases/img-sub.png"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        </div>

        {/* On lg, the parent's gap is suppressed (lg:gap-0) and each child
            uses an explicit lg:mt to match the exact Figma offsets in the
            810×729 left-content frame:
              • h3 starts at y=91 (lg:pt-[91px]).
              • tags start at y=197 — i.e. exactly on the horizontal line
                under the logo placeholder, so the pill borders align with
                the brand line. Gap from h3 (ends y=155) = 42 px.
              • description starts at y=346. Gap from tags (end y=292) = 54.
              • stats start at y=595. Gap from description (end y=442) = 153.
            Below lg the original gap-5/sm:gap-6 + sm:mt-2 / mt-4 sm:mt-6
            spacing is unchanged. */}
        <div className="lg-pad-x flex flex-col gap-5 px-5 py-10 sm:gap-6 sm:px-10 sm:py-12 lg:gap-0 lg:pt-[91px]">
          <div className="flex items-center gap-4 lg:hidden">
            <img src={data.logo} alt={`${data.name} logo`} loading="lazy" decoding="async" className={data.logoClass} />
          </div>

          <h3 className="text-[44px] font-semibold leading-[1.03] tracking-[-1px] text-neutral-900 sm:text-[52px] sm:tracking-[-1.1px] lg:whitespace-nowrap lg:text-[62px] lg:tracking-[-1.24px]">
            {data.name}
          </h3>

          <ul className="flex max-w-[413px] flex-wrap items-center gap-2 sm:gap-[15px] lg:mt-[42px]">
            {data.tags.map((tag) => (
              <li
                key={tag}
                className="cursor-default rounded-[60px] border border-neutral-800 px-3 py-2 transition-all duration-300 hover:bg-neutral-900 hover:text-white sm:px-4 sm:py-3"
              >
                <span className="text-body-sm whitespace-nowrap">
                  {tag}
                </span>
              </li>
            ))}
          </ul>

          <p className="max-w-[393px] text-body-sm text-black sm:mt-2 lg:mt-[54px]">
            {data.description}
          </p>

          <ul className="mt-4 flex flex-wrap gap-6 sm:mt-6 sm:gap-10 lg:mt-[153px]">
            {data.stats.map((s) => {
              const numericMatch = /^(\d+)$/.exec(s.value);
              const isPureNumber = numericMatch !== null;
              return (
                <li key={s.label} className="flex flex-col gap-2">
                  <p className="whitespace-nowrap font-semibold leading-[1.03] tracking-[-0.6px] text-black sm:tracking-[-0.85px]">
                    <span className="text-[32px] sm:text-[38px] lg:text-[42.74px]">
                      {isPureNumber ? (
                        <AnimatedNumber value={Number(numericMatch[1])} />
                      ) : (
                        s.value
                      )}
                    </span>
                    <span className="text-[32px] text-brand sm:text-[38px] lg:text-[42.74px]">{s.suffix ?? "+"}</span>
                  </p>
                  <p className="text-body-sm text-neutral-500">{s.label}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div
        className="group relative order-1 h-[240px] shrink-0 overflow-clip sm:h-[300px] lg:order-2 lg:h-[729px] lg:w-[630px] lg:rounded-l-[48px]"
        style={{ background: "#56595b" }}
      >
        {/* Parallax sleeve — shifts the photo upward across the
            section's viewport sweep ON LG ONLY. The `--cases-progress`
            variable is updated by the parent <Cases> (0 = section
            just entering, 1 = section just exiting), so even while
            the card is sticky-pinned the photo continues to slide and
            the scroll never feels frozen. Below `lg` the cards lay
            out as normal blocks (no sticky stack), so a parallax shift
            on the photo would only make it jitter against the user's
            scroll — `.cases-parallax-sleeve` (globals.css) wraps the
            transform in a `min-width: 1024px` media query so mobile
            keeps the photo perfectly still. The img inside still
            scales on hover; that transform lives on its own child. */}
        <div className="cases-parallax-sleeve">
          <img
            src={data.image}
            alt={`${data.name} hotel`}
            loading="lazy"
            decoding="async"
            className="absolute max-w-none object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            style={data.imageStyle}
          />
        </div>
      </div>
    </article>
  );
}

export function Cases({ entries = CASES }: { entries?: CaseEntry[] } = {}) {
  const sectionRef = useRef<HTMLElement | null>(null);

  // Click-to-feature: smooth-scroll the page to the position where card
  // `i` is the topmost stuck card. The target equals the absolute scroll
  // value at which card `i`'s sticky engages — i.e. its natural flow top
  // minus its sticky offset (header height + i × logo). At that scroll
  // the user sees card `i` pinned right under the header and the cards
  // below sit in flow off-screen (or, for clicks on card 2+, the cards
  // above show only their logo strips). No-op on viewports below lg,
  // where the cards aren't sticky-stacked.
  const handleCardActivate = (i: number) => {
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionDocTop = window.scrollY + rect.top;
    const headerHRaw = getComputedStyle(document.documentElement)
      .getPropertyValue("--site-header-h")
      .trim();
    const headerH = parseFloat(headerHRaw) || 84;
    const target =
      sectionDocTop + i * (LG_CARD_HEIGHT - LG_LOGO_HEIGHT) - headerH;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  };

  // rAF-throttled scroll listener that publishes the section's traversal
  // progress (0..1) as a CSS variable on the <section>. Every parallax
  // wrapper inside reads that variable to drive its translate. We only
  // run the listener while an IntersectionObserver flags the section as
  // near-viewport (200 px rootMargin), so the listener is idle on every
  // other page and during long scrolls past Cases.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;
    let inView = false;

    const update = () => {
      raf = 0;
      // Below lg the photo is static (`.cases-parallax-sleeve`
      // disables its transform via media query), so there's no point
      // recomputing or republishing the progress variable on every
      // scroll tick — bail early and let the photo sit still.
      if (window.innerWidth < 1024) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when section's top is at viewport bottom (first paint of any
      // section pixel); 1 when section's bottom hits viewport top
      // (section just left). Linear in between.
      const totalScroll = vh + rect.height;
      const scrolled = vh - rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScroll));
      section.style.setProperty("--cases-progress", String(progress));
    };

    const onScroll = () => {
      if (raf || !inView) return;
      raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) update();
      },
      { rootMargin: "200px 0px" },
    );

    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Trailing scroll runway on lg: gives each upper card the room sticky
  // needs to actually pin on its `top: i * 197 px` offset for LG_STACK_PIN
  // pixels of scroll. The parallax above keeps the photo moving during
  // that window, so the pin reads as a deliberate "landing" — not a
  // dead zone.
  const stackTrail = Math.max(0, entries.length - 1) * LG_STACK_PIN;

  return (
    // On mobile / tablet the section adds horizontal padding so each
    // case-article reads as a separated "card" (matching the rounded
    // + bordered look applied on <article> at < lg) and a gap between
    // cards so they don't touch. lg neutralises both — the sticky
    // stack pattern needs cards flush against viewport edges and
    // directly adjacent in the document.
    <section
      id="cases"
      ref={sectionRef}
      className="flex flex-col gap-6 px-5 py-6 sm:gap-8 sm:px-10 sm:py-8 lg:gap-0 lg:px-0 lg:py-0"
    >
      {entries.map((c, i) => (
        <CaseCard
          key={c.name}
          data={c}
          index={i}
          onActivate={() => handleCardActivate(i)}
        />
      ))}
      {stackTrail > 0 ? (
        <div
          aria-hidden
          className="hidden lg:block"
          style={{ height: `${stackTrail}px` }}
        />
      ) : null}
    </section>
  );
}
