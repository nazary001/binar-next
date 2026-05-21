/* eslint-disable @next/next/no-img-element */
type Logo = {
  src: string;
  alt: string;
  className: string;
};

// Sizes mirror the Figma "Logos animation" component (id 686:3358):
// each logo placeholder is 124×70 px on lg, with the inner SVG sized to
// match the design's logo-3 / logo-footer / etc. dimensions exactly.
const LOGOS: Logo[] = [
  { src: "/figma-export/logos/client-1.svg", alt: "Client", className: "h-[33px] w-[110px]" },
  { src: "/figma-export/logos/client-2.svg", alt: "Client", className: "h-[35px] w-[77px]" },
  { src: "/figma-export/logos/client-3.svg", alt: "Client", className: "h-[43px] w-[72px]" },
  { src: "/figma-export/logos/client-4.svg", alt: "Client", className: "h-[57px] w-[40px]" },
  { src: "/figma-export/logos/client-5.svg", alt: "Client", className: "h-[58px] w-[53px] rotate-90" },
  { src: "/figma-export/logos/client-6.svg", alt: "Client", className: "h-[46px] w-[82px]" },
];

// REPEATS copies × LOGOS.length × per-li width must stay >= viewport + one
// copy's width at every breakpoint, otherwise the right edge of the track
// passes the right edge of the viewport before the next copy catches up
// and a blank gap appears. At lg one copy is 6×124=744px, so 8 copies
// (5952px total) clear viewports up to 5208px — comfortably past 4K.
const REPEATS = 8;

export function LogosMarquee() {
  const loop = Array.from({ length: REPEATS }, () => LOGOS).flat();

  return (
    <section
      aria-label="Клієнти, які нам довіряють"
      className="overflow-hidden py-12 sm:py-16 lg:py-[120px]"
    >
      <div className="relative w-full">
        {/* Soft fade at the edges — logos enter / leave smoothly instead
            of clipping abruptly at the viewport edge. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-24"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-24"
          aria-hidden
        />
        {/* The shared `@keyframes marquee` interpolates translateX(0) →
            translateX(var(--marquee-shift)). 100/REPEATS % shifts the
            track by exactly one copy each cycle, so when the animation
            snaps back to 0 the logos on screen are visually identical
            to those at the new start — wrap-around is invisible. */}
        <ul
          className="animate-marquee flex w-max items-center"
          style={
            { "--marquee-shift": `${-100 / REPEATS}%` } as React.CSSProperties
          }
        >
          {loop.map((logo, i) => (
            <li
              key={i}
              aria-hidden={i >= LOGOS.length || undefined}
              className="group/logo flex h-[56px] w-[100px] shrink-0 items-center justify-center bg-white transition-transform duration-500 hover:scale-110 sm:h-[64px] sm:w-[112px] lg:h-[70px] lg:w-[124px]"
            >
              <img
                src={logo.src}
                alt={i < LOGOS.length ? logo.alt : ""}
                loading="lazy"
                decoding="async"
                /* Scope the transition to filter only — `transition-all`
                   includes width/height/box-shadow/transform/etc, so the
                   browser re-watches every property on every frame even
                   when nothing else changes. */
                className={`${logo.className} grayscale transition-[filter] duration-500 group-hover/logo:grayscale-0`}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
