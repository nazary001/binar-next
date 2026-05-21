/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";

// Decorative cluster on the dark CTA — same cross pattern + orange tag
// as the home TeamCta (Figma reuses the asset between sections). Cross
// has its inner-corner curls at the same percentages, the orange tag
// hangs from the upper-right quadrant. The hotels-specific slippers/
// bottle/flower icons from Figma Group 73/76/69/77 aren't included yet
// — they require pulling several SVGs and pixel-positioning each, and
// the cross + tag already carry the bulk of the visual identity.
function HotelsDecorCluster() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[40px] sm:rounded-t-[56px] lg:rounded-t-[68px] xl:block"
    >
      {/* Cross pattern: 4 quadrant L-shapes meeting at (77.4 %, 42.86 %).
          Each quadrant draws only the two borders facing the cross
          centre, with a 48-px rounded inner corner where they meet.
          Identical math to the home TeamCta DecorCluster — the design
          uses the same composition for both dark CTA caps. */}
      <div className="absolute inset-0">
        <div
          className="absolute rounded-br-[48px] border-b border-r border-white/30"
          style={{ left: "35.93%", right: "22.59%", top: 0, bottom: "57.14%" }}
        />
        <div
          className="absolute rounded-bl-[48px] border-b border-l border-white/30"
          style={{ left: "77.41%", right: 0, top: 0, bottom: "57.14%" }}
        />
        <div
          className="absolute rounded-tr-[48px] border-t border-r border-white/30"
          style={{ left: "35.93%", right: "22.59%", top: "42.86%", bottom: 0 }}
        />
        <div
          className="absolute rounded-tl-[48px] border-t border-l border-white/30"
          style={{ left: "77.41%", right: 0, top: "42.86%", bottom: 0 }}
        />
      </div>

      {/* Orange tag (Ellipse 50 stroke) — hangs in the upper-right
          quadrant. Same SVG as the home DecorCluster, rotated −90°. */}
      <div
        className="absolute flex items-center justify-center"
        style={{ right: "425px", top: "98px", width: "150px", height: "70px" }}
      >
        <img
          src="/figma-export/decor/ellipse50-stroke.svg"
          alt=""
          className="block -rotate-90"
          style={{ width: "70px", height: "150px" }}
        />
      </div>
    </div>
  );
}

const CUSTOMIZATIONS = [
  {
    title: "Дизайн",
    tags: ["логотип", "кольори"],
    icon: "/figma-export/hotels/solutions/icon-design.svg",
  },
  {
    title: "Матеріали",
    tags: ["економ", "стандарт", "преміум"],
    icon: "/figma-export/hotels/solutions/icon-materials.svg",
  },
  {
    title: "Формати і розміри",
    tags: ["під ваші стандарти"],
    icon: "/figma-export/hotels/solutions/icon-size.svg",
  },
  {
    title: "Аромати",
    tags: ["стандарт", "преміум"],
    icon: "/figma-export/hotels/solutions/icon-aroma.svg",
  },
];

const PRODUCTS = [
  "/figma-export/hotels/solutions/img-product-1.png",
  "/figma-export/hotels/solutions/img-product-2.png",
  "/figma-export/hotels/solutions/img-product-3.png",
  "/figma-export/hotels/solutions/img-product-4.png",
];

export function Solutions() {
  // Loop products for marquee continuity.
  const productLoop = [...PRODUCTS, ...PRODUCTS, ...PRODUCTS];

  return (
    <section className="flex flex-col">
      {/* Figma 1384:11958 — dark CTA cap is exactly 392 px tall on lg
          (pt-68 + 196 content + pb-128 = 392) and overlaps the light
          "Кастомізація" card below by 72 px (the card's rounded top
          eats into the dark band). Same pattern as the home TeamCta:
          rounded-t corners + negative bottom margin pulls the next
          sibling up so it covers the cap's bottom 72 px. */}
      <div
        className="lg-pad-x relative -mb-12 overflow-hidden rounded-t-[40px] px-6 pb-20 pt-10 sm:-mb-14 sm:rounded-t-[56px] sm:px-10 sm:pb-24 sm:pt-14 lg:-mb-[72px] lg:rounded-t-[68px] lg:pb-[128px] lg:pt-[68px]"
        style={{ background: "#2d2d2f" }}
      >
        <div className="relative z-10 flex max-w-[571px] flex-col gap-8 sm:gap-12 lg:gap-12">
          <h2 className="text-white">
            <span className="text-h2-light">Основні рішення</span>
            <br aria-hidden />
            <span className="text-h2">для готелів</span>
          </h2>
          <Button href="/#contact-form" variant="outlined" arrow>
            Підібрати рішення
          </Button>
        </div>
        <HotelsDecorCluster />
      </div>

      <div className="relative rounded-[40px] bg-bg-subtle pb-12 pt-12 sm:rounded-[56px] sm:pb-16 sm:pt-16 lg:rounded-[68px] lg:pb-[80px]">
        <div className="lg-pad-x px-5 sm:px-10">
          <div className="flex flex-col gap-6 pt-8 sm:gap-8 sm:pt-12 lg:flex-row lg:items-start lg:gap-8 lg:pb-20 lg:pt-[80px]">
            <h3 className="flex-1 text-neutral-900">
              <span className="text-h2">Кастомізація</span>
              <br aria-hidden />
              <span className="text-h2-light">під ваш бренд</span>
            </h3>
            <p className="flex-1 max-w-[560px] text-body-md text-neutral-500">
              Кастомізовані деталі — це не просто витратні матеріали, а частина
              сервісу, яку гість помічає одразу. Саме вони формують відчуття
              рівня готелю, уваги до деталей і турботи.
            </p>
          </div>
          <ul className="flex flex-col">
            {CUSTOMIZATIONS.map((c, i) => (
              <li
                key={c.title}
                className={`group/row flex flex-col gap-4 py-6 transition-colors duration-300 sm:gap-6 sm:py-10 lg:flex-row lg:items-center lg:gap-8 hover:[&_p:first-child]:text-brand ${
                  i > 0 ? "border-t border-stroke-subtle" : ""
                }`}
              >
                <p className="flex-1 max-w-[574px] text-h2 text-neutral-900 transition-colors duration-300">
                  {c.title}
                </p>
                <ul className="flex flex-1 flex-wrap items-center gap-2 sm:gap-4">
                  {c.tags.map((t) => (
                    <li
                      key={t}
                      className="cursor-default rounded-full border border-neutral-800 px-3 py-2 text-body-sm text-neutral-800 whitespace-nowrap transition-all duration-300 hover:bg-neutral-900 hover:text-white sm:px-4 sm:py-3"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
                <span className="flex size-[72px] shrink-0 items-center justify-center overflow-clip rounded-[14px] border border-stroke-default transition-all duration-500 group-hover/row:rotate-3 group-hover/row:scale-105 sm:size-[96px] sm:rounded-[18px]">
                  <img
                    src={c.icon}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="size-[68%] object-contain"
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 overflow-hidden sm:mt-12">
          <ul className="animate-marquee flex w-max items-center gap-4 sm:gap-6 lg:gap-8">
            {productLoop.map((src, i) => (
              <li
                key={i}
                aria-hidden={i >= PRODUCTS.length || undefined}
                className="group/product h-[260px] w-[220px] shrink-0 cursor-pointer overflow-hidden rounded-[28px] bg-white transition-transform duration-500 ease-out hover:-translate-y-2 hover:shadow-xl sm:h-[320px] sm:w-[270px] sm:rounded-[36px] lg:h-[370px] lg:w-[309px] lg:rounded-[48px]"
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-700 ease-out group-hover/product:scale-110"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
