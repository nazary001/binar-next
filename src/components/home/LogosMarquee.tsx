/* eslint-disable @next/next/no-img-element */
type LogoImage = {
  kind: "img";
  src: string;
  alt: string;
  className: string;
};

type LogoText = {
  kind: "text";
  // The literal placeholder text Figma uses (5 tiles per copy, plus the
  // first one renders the same string from vector icons - we substitute
  // the text so we don't ship a separate per-letter SVG group).
  text: string;
};

type LogoTile = LogoImage | LogoText;

// Sizes mirror the Figma "Logos animation" component (id 686:3358):
// each logo placeholder is 124×70 px on lg, with the inner SVG sized to
// match the design's logo-3 / logo-footer / etc. dimensions exactly.
//
// Per Figma, a single copy of the strip contains 12 tiles:
//   1..6 — branded SVG logos (logo-3 / footer / Group / rotated / last)
//   7    — "LOGO" rendered from a vector icon group
//   8..12 — five "LOGO" text placeholders (Intro_Cond:Black_Free 27.138px)
// The designer placed the LOGO placeholders as filler tiles meant to be
// replaced with real brand SVGs. Until those are supplied we render them
// faithfully so the marquee tile count and visual rhythm match Figma.
const LOGOS: LogoTile[] = [
  { kind: "img", src: "/figma-export/logos/client-1.svg", alt: "Client", className: "h-[33px] w-[110px]" },
  { kind: "img", src: "/figma-export/logos/client-2.svg", alt: "Client", className: "h-[35px] w-[77px]" },
  { kind: "img", src: "/figma-export/logos/client-3.svg", alt: "Client", className: "h-[43px] w-[72px]" },
  { kind: "img", src: "/figma-export/logos/client-4.svg", alt: "Client", className: "h-[57px] w-[40px]" },
  { kind: "img", src: "/figma-export/logos/client-5.svg", alt: "Client", className: "h-[58px] w-[53px] rotate-90" },
  { kind: "img", src: "/figma-export/logos/client-6.svg", alt: "Client", className: "h-[46px] w-[82px]" },
  { kind: "text", text: "LOGO" },
  { kind: "text", text: "LOGO" },
  { kind: "text", text: "LOGO" },
  { kind: "text", text: "LOGO" },
  { kind: "text", text: "LOGO" },
  { kind: "text", text: "LOGO" },
];

// REPEATS copies × LOGOS.length × per-li width must stay >= viewport + one
// copy's width at every breakpoint, otherwise the right edge of the track
// passes the right edge of the viewport before the next copy catches up
// and a blank gap appears. At lg one copy is 12×124=1488px (Figma), so
// 4 copies (5952px total) clear viewports up to 4464px — comfortably
// past 4K.
const REPEATS = 4;

export function LogosMarquee() {
  const loop = Array.from({ length: REPEATS }, () => LOGOS).flat();

  return (
    <section
      aria-label="Клієнти, які нам довіряють"
      className="overflow-hidden py-12 sm:py-16 lg:py-[160px]"
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
            to those at the new start — wrap-around is invisible.
            `--marquee-duration: 10s` mirrors Figma's Smart Animate
            transition on component set 686:3359 (Default → Variant2,
            LINEAR easing, 10 s) — Variant2 has the track translated by
            -1488 px (one copy width: 12 tiles × 124 px), which is what
            -25% of the 4-copy track resolves to. */}
        <ul
          className="animate-marquee flex w-max items-center"
          style={
            {
              "--marquee-shift": `${-100 / REPEATS}%`,
              "--marquee-duration": "10s",
            } as React.CSSProperties
          }
        >
          {loop.map((logo, i) => (
            <li
              key={i}
              aria-hidden={i >= LOGOS.length || undefined}
              className="flex h-[56px] w-[100px] shrink-0 items-center justify-center bg-white sm:h-[64px] sm:w-[112px] lg:h-[70px] lg:w-[124px]"
            >
              {logo.kind === "img" ? (
                <img
                  src={logo.src}
                  alt={i < LOGOS.length ? logo.alt : ""}
                  loading="lazy"
                  decoding="async"
                  className={logo.className}
                />
              ) : (
                // Figma uses Intro Cond Black Free at 27.138px for the
                // LOGO text placeholders. That family is not part of the
                // project's font stack, so we fall back to a heavy,
                // condensed system look via wide tracking + extrabold
                // weight on the existing Manrope variable font. The
                // visual rhythm of the marquee is preserved without
                // shipping an extra webfont.
                <span
                  aria-hidden={i >= LOGOS.length || undefined}
                  className="select-none text-[24px] font-extrabold uppercase leading-none tracking-[0.06em] text-black sm:text-[26px] lg:text-[27.138px]"
                >
                  {logo.text}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
