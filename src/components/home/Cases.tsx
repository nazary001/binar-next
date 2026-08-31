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
  // Mobile (<lg) framing crop for the 340x206 rounded image inside the
  // Figma mobile card (node 3094:5130 / 3094:5176). The desktop column
  // uses a different aspect ratio so it has its own `imageStyle`; this
  // one reproduces the phone master's photo crop exactly. Optional —
  // callers that don't supply it (e.g. SupplyExamples) fall back to the
  // desktop `imageStyle` framing on mobile.
  mobileImageStyle?: { left: string; top: string; width: string; height: string };
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
    // Figma 3094:5131 inside the 342x206 box: w 402.805 / h 603.943 at
    // left -25.99 / top -50.69 -> percentages of the container.
    mobileImageStyle: { left: "-7.6%", top: "-24.61%", width: "117.78%", height: "293.18%" },
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
    // Figma 3094:5177: outer frame w402.805/h603.943 at left-25.99/top-50.69
    // with an inner img shifted up 33.14% (~200px), so the net crop is the
    // same width/left but a deeper top offset. Percentages of the 342x206 box.
    mobileImageStyle: { left: "-7.6%", top: "-121.77%", width: "117.78%", height: "293.29%" },
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
// Vertical window (in px) over which the dock-entrance polish plays:
// `--dock-p` ramps from 0 → 1 as the card's top crosses from `LG_DOCK_RAMP`
// px above its sticky target down to the target itself. Tuned so the
// magnetic settle reads as a deliberate "click into place" without feeling
// laggy — too short snaps, too long drags the photo parallax visibly.
const LG_DOCK_RAMP = 220;

export function CaseCard({
  data,
  index = 0,
  onActivate,
}: {
  data: CaseEntry;
  index?: number;
  onActivate?: () => void;
}) {
  void onActivate;
  // Staggered sticky stack — each card pins below the previous one's
  // 197 px logo strip so as the user scrolls the new card slides up
  // and parks under the prior logo, leaving the prior card's top
  // (the brand-mark band) visible above it. Card 0 pins right under
  // the site header; card N pins `headerH + N × 197 px` below the
  // viewport top. `--site-header-h` is published by Header.tsx and
  // flips between 84/68 px on scroll, so we transition `top` to follow
  // smoothly. Below lg the article isn't sticky so the inline `top`
  // is inert and the cards stack normally in flow.
  return (
    <article
      data-case-card
      data-case-index={index}
      className="case-card flex w-full max-w-[342px] flex-col items-center overflow-hidden rounded-[32px] border border-neutral-700 bg-white lg:max-w-none lg:items-stretch lg:sticky lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:flex-row"
      style={{
        top: `calc(var(--site-header-h, 92px) + ${index * LG_LOGO_HEIGHT}px)`,
      }}
    >
      <div
        className="case-card-body relative order-2 w-full flex-1 overflow-hidden border-neutral-700 bg-white lg:order-1 lg:w-auto lg:h-[729px] lg:rounded-r-[48px] lg:border-b lg:border-r lg:border-t"
      >
        <div className="case-card-logo absolute right-0 top-0 hidden h-[197px] w-[227px] items-center justify-center overflow-clip border-b border-l border-stroke-default lg:flex">
          <img src={data.logo} alt={`${data.name} logo`} loading="lazy" decoding="async" className={data.logoClass} />
        </div>

        {/* Figma 1384:12758 (Vector75): full-width hairline at y=526
            crossing the entire 810-wide left content area, sitting just
            above the sub-photo + logo strip. Pixel-aligned (integer
            top + `h-px`) so the line renders as a sharp 1-px row —
            `top-[526.5px]` would straddle two pixel rows and antialias
            into a 2-px band that read as visibly thicker / softer than
            the surrounding CSS borders. */}
        <span
          aria-hidden
          className="absolute left-0 right-0 top-[526px] hidden h-px bg-stroke-default lg:block"
        />
        {/* Figma 1384:12767 (Vector78): vertical hairline at x=583
            from y=0 to y=728, the line that the photo's left edge sits
            on. The logo strip's `border-l` and the sub-photo wrapper's
            `border-l` only cover the top 197px and the bottom 202px of
            this line; this span fills the 330px middle gap so the
            vertical reads as one continuous line rising out of the
            photo's top-left corner up to the logo strip. Span goes
            from row 197 to row 526 (height 330, exclusive of row 527)
            so it butts against the V75 horizontal at row 526 and the
            sub-photo's border-l starting at row 527 — every fragment
            of the vertical sits on integer pixel rows and stays a
            uniform 1-px line. */}
        <span
          aria-hidden
          className="absolute right-[226px] top-[197px] hidden h-[330px] w-px bg-stroke-default lg:block"
        />
        {/* `top-[527px]` puts the sub-photo's top edge one pixel below
            the V75 hairline (row 526), so the line stays visible across
            the full body width and the photo sits flush under it. The
            previous `top-[526.5px]` straddled the line, blending the
            photo's first row into the hairline and making both look
            softer than the surrounding pixel-aligned borders. */}
        <div className="absolute bottom-0 right-0 top-[527px] hidden w-[227px] overflow-clip border-l border-stroke-default lg:block">
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
        <div className="lg-pad-x flex flex-col gap-4 px-6 pt-10 pb-[38px] sm:gap-4 sm:px-6 sm:py-10 lg:gap-0 lg:pb-0 lg:pt-[91px]">
          {/* Figma mobile (3094:5129) title — Manrope Bold 40/42, -0.8px,
              text/default. The `text-h1` token resolves to exactly that
              below lg; desktop keeps the 62px display size via lg: below. */}
          <h3 className="text-h1 font-bold text-neutral-900 lg:font-semibold lg:whitespace-nowrap lg:text-[62px] lg:leading-[1.03] lg:tracking-[-1.24px]">
            {data.name}
          </h3>

          <ul className="flex w-full max-w-[413px] flex-wrap content-center items-center gap-2 lg:w-auto lg:gap-[15px] lg:mt-[42px]">
            {data.tags.map((tag) => (
              <li
                key={tag}
                // Mobile (<lg) follows the Figma phone-master Cases chip
                // (3094:5134): stroke/default border, `px-4 py-2` (16/8),
                // `rounded-60`, 14/20 medium text in text/medium. Desktop
                // keeps its original `px-4 py-3` + neutral-800 border +
                // 16/16 text (matching the ZonesGrid hotels chips) via the
                // lg: overrides, so the desktop sticky-stack is unchanged.
                className="flex cursor-default items-center rounded-[60px] border border-stroke-default px-4 py-[7px] lg:border-neutral-800 lg:py-3"
              >
                <span className="whitespace-nowrap text-body-sm font-medium text-neutral-800 lg:font-normal lg:text-[16px] lg:leading-[16px]">
                  {tag}
                </span>
              </li>
            ))}
          </ul>

          {/* Figma mobile (3094:5142) description — Manrope Regular 14/20,
              text/medium (#343435). Desktop keeps its original text-black /
              body-sm@16 via the lg: overrides. */}
          <p className="max-w-[271px] lg:max-w-[393px] text-body-sm text-neutral-800 lg:text-black lg:mt-[54px]">
            {data.description}
          </p>

          {/* Desktop stats block — unchanged from the original sticky-stack
              layout; hidden below lg where the Figma mobile card renders the
              logo + stats in the dedicated bottom band (see below). */}
          <ul className="mt-4 hidden flex-wrap gap-6 sm:mt-6 sm:gap-10 lg:mt-[153px] lg:flex">
            {data.stats.map((s) => {
              const numericMatch = /^(\d+)$/.exec(s.value);
              const isPureNumber = numericMatch !== null;
              return (
                <li key={s.label} className="flex flex-col gap-2">
                  <p className="whitespace-nowrap font-semibold leading-[1.03] tracking-[-0.6px] text-neutral-900 sm:tracking-[-0.85px]">
                    <span className="text-[32px] sm:text-[38px] lg:text-[42.74px]">
                      {isPureNumber ? (
                        <AnimatedNumber value={Number(numericMatch[1])} />
                      ) : (
                        s.value
                      )}
                    </span>
                    <span className="text-[32px] text-brand sm:text-[38px] lg:text-[42.74px]">{s.suffix ?? "+"}</span>
                  </p>
                  {/* Figma `1384:12763/12766` uses `leading-[16px]` for the
                      stats labels — keep that compact line-height on lg
                      so the label sits flush under the numeral. Below lg
                      we use the default body-sm (16/24) for breathing
                      room on smaller cards. */}
                  <p className="text-[16px] leading-[24px] text-neutral-500 lg:leading-[16px]">{s.label}</p>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Figma mobile (<lg) bottom band — node 3094:5149 (hairline) +
            3094:5151 (logo cell | vertical divider | stats). Hidden at lg
            where the desktop sticky-stack layout renders the logo strip
            and stats via the absolutely-positioned elements above. */}
        <div className="lg:hidden">
          <span aria-hidden className="block h-px w-full -mb-px bg-stroke-default" />
          <div className="flex items-stretch">
            <div className="flex w-[140px] shrink-0 items-center justify-center pl-6 pr-4 py-[60px]">
              {/* Figma mobile logos are ~24px tall (3094:5161 / 3137:16191);
                  size by height with auto width so both brand marks keep
                  their aspect ratio inside the 140px cell. */}
              <img
                src={data.logo}
                alt={`${data.name} logo`}
                loading="lazy"
                decoding="async"
                className="h-6 w-auto max-w-full object-contain"
              />
            </div>
            <span aria-hidden className="w-px shrink-0 self-stretch bg-stroke-default" />
            <ul className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-4 pl-4 pr-6">
              {data.stats.map((s) => {
                const numericMatch = /^(\d+)$/.exec(s.value);
                const isPureNumber = numericMatch !== null;
                return (
                  <li key={s.label} className="flex flex-col">
                    <p className="whitespace-nowrap font-semibold leading-[1.03] tracking-[-0.6px] text-black">
                      <span className="text-[30px]">
                        {isPureNumber ? (
                          <AnimatedNumber value={Number(numericMatch[1])} />
                        ) : (
                          s.value
                        )}
                      </span>
                      <span className="text-[30px] text-brand">{s.suffix ?? "+"}</span>
                    </p>
                    <p className="text-[13px] leading-[20px] text-neutral-500">{s.label}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div
        className="case-card-photo group relative order-1 h-[206px] w-full shrink-0 overflow-clip rounded-[32px] lg:order-2 lg:h-[729px] lg:w-[630px] lg:rounded-l-[48px] lg:rounded-r-none"
        style={{ background: "#56595b" }}
      >
        {/* Photo wrapper — `.cases-photo-parallax` is a lg-only class that
            reads `--enter-p` (published per-card by the scroll listener)
            and translates the entire photo composition up to ~24 px as
            the card sweeps the viewport. Below lg the class is inert
            (no transform rule in the media query) so the photo sits
            still on phones / tablets. The `imageStyle` offset on the
            <img> below is the designer's framing crop and composes on
            top of the wrapper transform. */}
        <div className="cases-photo-parallax absolute inset-0">
          {/* Mobile (<lg) crop — Figma phone-master framing inside the
              340x206 rounded image. Hidden at lg where the desktop
              column uses its own wider crop below (unchanged). */}
          <img
            src={data.image}
            alt={`${data.name} hotel`}
            loading="lazy"
            decoding="async"
            className="absolute max-w-none object-cover lg:hidden"
            style={data.mobileImageStyle ?? data.imageStyle}
          />
          <img
            src={data.image}
            alt={`${data.name} hotel`}
            loading="lazy"
            decoding="async"
            className="absolute hidden max-w-none object-cover lg:block"
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
    const headerH = parseFloat(headerHRaw) || 92;
    const target =
      sectionDocTop + i * (LG_CARD_HEIGHT - LG_LOGO_HEIGHT) - headerH;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  };

  // rAF-throttled scroll listener that publishes per-card progress
  // variables on every `[data-case-card]` article inside the section.
  // CSS rules in globals.css (`@media (min-width: 1024px)`) read these.
  // Of the original dock-stack polish only the magnetic settle is still
  // active — the elevation shadow, push-back dim, and fold hairline were
  // all removed to keep the cards flat like Figma (no darkening, no
  // stray lines appearing as the next card approaches). We gate the
  // listener behind an IntersectionObserver with a generous 240-px
  // rootMargin so it's idle on every other page section and during long
  // scrolls past Cases — and bail early below lg where the cards aren't
  // sticky-stacked.
  //
  // Published per-card (clamped to [0, 1]):
  //   • --dock-p   1 when the card has reached its sticky dock position,
  //                ramping from 0 at `LG_DOCK_RAMP` px above the dock.
  //                Drives the magnetic settle (translateY 6 → 0). The
  //                soft elevation shadow it once drove is disabled.
  //   • --push-p   1 when the NEXT card has fully docked on top of this
  //                one (i.e. this card has been pushed into the
  //                background of the stack). Currently unused by CSS —
  //                it drove the brightness dim + fold hairline, both now
  //                disabled. Still published so either can be re-enabled
  //                without touching this listener. Stays 0 for the last
  //                card and for cards with no next docked yet.
  //   • --enter-p  Linear 0..1 traversal of the card through the
  //                viewport: 0 when its top is at viewport bottom, 1
  //                when its top reaches viewport top. Drives the slow
  //                photo parallax (±24 px around the natural position).
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const cards = Array.from(
      section.querySelectorAll<HTMLElement>("[data-case-card]"),
    );
    if (!cards.length) return;

    let raf = 0;
    let inView = false;

    const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

    const update = () => {
      raf = 0;
      if (window.innerWidth < 1024) return;
      const vh = window.innerHeight;
      const headerHRaw = getComputedStyle(document.documentElement)
        .getPropertyValue("--site-header-h")
        .trim();
      const headerH = parseFloat(headerHRaw) || 92;

      // First pass: dock progress + enter progress for every card.
      const dockProgress: number[] = new Array(cards.length);
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const rect = card.getBoundingClientRect();
        const dockTop = headerH + i * LG_LOGO_HEIGHT;
        // distToDock > 0 while still scrolling toward dock, 0 the moment
        // sticky pins. Sticky never lets the card go past its top, so
        // negative values won't happen during normal scroll.
        const distToDock = rect.top - dockTop;
        const dockP = clamp01(1 - distToDock / LG_DOCK_RAMP);
        dockProgress[i] = dockP;
        card.style.setProperty("--dock-p", dockP.toFixed(3));

        // `--enter-p`: 0 when the card's top equals viewport bottom
        // (just entering from below), 1 when its top reaches viewport
        // top or further. Linear traversal independent of dock.
        const enterP = clamp01((vh - rect.top) / vh);
        card.style.setProperty("--enter-p", enterP.toFixed(3));
      }

      // Second pass: each card's push-back is driven by the NEXT card's
      // own dock progress — when card N+1 has fully docked, card N is
      // fully pushed into the background.
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const nextDock = i + 1 < cards.length ? dockProgress[i + 1] : 0;
        card.style.setProperty("--push-p", nextDock.toFixed(3));
      }
    };

    const onScroll = () => {
      if (raf || !inView) return;
      raf = requestAnimationFrame(update);
    };

    const onResize = () => {
      // Window resize can flip across the lg breakpoint or change
      // viewport height, both of which invalidate every cached progress
      // value. Re-run regardless of inView so the cards correct.
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) update();
      },
      { rootMargin: "240px 0px" },
    );

    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // On mobile / tablet the section adds horizontal padding so each
    // case-article reads as a separated "card" (matching the rounded
    // + bordered look applied on <article> at < lg) and a gap between
    // cards so they don't touch. lg neutralises both — the sticky
    // stack pattern needs cards flush against viewport edges and
    // directly adjacent in the document.
    //
    // lg:block overrides the flex-col layout we use on smaller
    // viewports. Sticky stacking is brittle inside flex containers
    // (siblings ended up sharing a bounding rect once a second card
    // pinned, collapsing the staggered offsets); a plain block
    // formatting context makes each card's sticky range independent.
    //
    // Scroll-runway spacer — see the trailing <div> below. The previous
    // attempt used `lg:pb-[532px]` on the section, but `position: sticky`
    // is released when its CONTENT BOX bottom reaches `sticky-offset +
    // element-height`; padding-bottom expands the padding box, not the
    // content box, so the runway was invisible to sticky and every
    // non-first card had a dwell time of ~0 scroll units (instantly
    // engaged and instantly released, with no visible pin). Moving the
    // runway inside the section as an inner block fixes that.
    <section
      id="cases"
      ref={sectionRef}
      className="flex flex-col items-center gap-6 px-6 pt-12 pb-[60px] sm:gap-8 sm:py-14 lg:block lg:items-stretch lg:gap-0 lg:px-0 lg:py-0"
    >
      {entries.map((c, i) => (
        <CaseCard
          key={c.name}
          data={c}
          index={i}
          onActivate={() => handleCardActivate(i)}
        />
      ))}
      {/* Scroll-runway spacer — small (one logo strip's worth per card
          beyond the first) so the last card visibly docks onto the tab
          of the card behind it for a short beat before the page keeps
          scrolling. Previously this was (N - 1) × LG_CARD_HEIGHT which
          gave a full card height of dwell — long enough that the user
          could scroll a whole card length with no visible motion. At
          (N - 1) × LG_LOGO_HEIGHT the dwell is ~197 px (about one mouse
          wheel notch) which reads as a deliberate pin rather than a
          stuck scrollbar. Hidden below lg where the cards aren't
          sticky-stacked. */}
      {entries.length > 1 ? (
        <div
          aria-hidden
          className="hidden lg:block"
          style={{ height: `${(entries.length - 1) * LG_LOGO_HEIGHT}px` }}
        />
      ) : null}
    </section>
  );
}
