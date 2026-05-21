/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { TeamTagsCloud } from "@/components/home/TeamTagsCloud";

const PROCESS = [
  {
    icon: "/figma-export/team-process/icon-personal.svg",
    title: "Персональний супровід",
    body: "Ви отримуєте персонального відповідального менеджера, чіткий план поставки та швидкий зворотний зв'язок.",
  },
  {
    icon: "/figma-export/team-process/icon-team.svg",
    title: "Команда під задачу",
    body: "За потреби ми підключаємо дизайнерів для кастомізації, виробництво для виготовлення брендованих рішень і логістику для контролю термінів.",
  },
  {
    icon: "/figma-export/team-process/icon-result.svg",
    title: "Результат для вас",
    body: "Так ми забезпечуємо стабільність, передбачуваність і якість у кожному замовленні.",
  },
];

// Decorative cluster - 1:1 replica of Figma's Group 61 (1384:12828) inside
// the dark CTA. Two visual layers:
//
//   1. A "+" CROSS PATTERN with rounded inner corners. The cross center
//      sits at design coords (1115, 168) of the 1440x392 CTA - i.e.
//      x ≈ 77.4% from left, y ≈ 42.86% from top. Built as four quadrant
//      L-shapes that share borders at the meeting line; each quadrant's
//      INNER corner is rounded with 48 px radius so all four curves meet
//      flush at the center and trace the "+" with soft inner curls.
//      Borders use white at 30 % opacity to match the subtle Figma stroke.
//
//   2. Four FIGMA-EXPORTED SVG ICONS sitting inside the cross quadrants:
//      * Orange tag with circular hole (Ellipse 50, -90° rotation) -
//        sits in the upper-right quadrant.
//      * Dark leaf + orange 4-point sparkle (Vector A) - sits centered
//        on the cross horizontal axis, just left of center.
//      * Dark gear (Vector B, +9° rotation) - sits in the bottom-right
//        quadrant, left side.
//      * Orange heart with internal EKG zigzag (Vector 83, -22° rotation,
//        x-flipped) - sits in the bottom-right quadrant, far right.
//
// All positioning uses fixed Figma pixel offsets from the CTA's right and
// top edges so the cluster keeps Figma proportions at the 1440 master and
// at any wider viewport (the dark CTA grows but the cluster stays in the
// right portion). On lg+ the dark CTA's right padding (lg-pad-x) absorbs
// any viewport > 1440 surplus, so the cluster's right edge stays at the
// designed margin from the right side of the content column.
const ICON_BASE = "/figma-export/decor";

function DecorCluster() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[40px] sm:rounded-t-[56px] lg:rounded-t-[68px] xl:block"
    >
      {/* === Cross pattern: 4 quadrant L-shapes meeting at (77.4%, 42.86%) ===
          Each quadrant draws TWO borders along the inner cross axes and a
          rounded corner where they meet. Drawing only the two visible
          borders (and not all four) avoids extra phantom lines at the
          outer container edges. */}
      <div className="absolute inset-0">
        {/* Upper-left small box (Rect 3 in Figma) - bottom + right borders */}
        <div
          className="absolute border-b border-r border-white/30 rounded-br-[48px]"
          style={{ left: "35.93%", right: "22.59%", top: 0, bottom: "57.14%" }}
        />
        {/* Upper-right quadrant (Rect 2) - bottom + left borders */}
        <div
          className="absolute border-b border-l border-white/30 rounded-bl-[48px]"
          style={{ left: "77.41%", right: 0, top: 0, bottom: "57.14%" }}
        />
        {/* Lower-left quadrant (Rect 4) - top + right borders */}
        <div
          className="absolute border-t border-r border-white/30 rounded-tr-[48px]"
          style={{ left: "35.93%", right: "22.59%", top: "42.86%", bottom: 0 }}
        />
        {/* Lower-right quadrant (Rect 1) - top + left borders */}
        <div
          className="absolute border-t border-l border-white/30 rounded-tl-[48px]"
          style={{ left: "77.41%", right: 0, top: "42.86%", bottom: 0 }}
        />
      </div>

      {/* === Orange tag (Ellipse 50 (Stroke), rotated -90°) ===
          SVG intrinsic 70x150 vertical; rotated -90° in a 150x70
          horizontal box. Flex centers the rotated image inside the box. */}
      <div
        className="absolute flex items-center justify-center"
        style={{ right: "425px", top: "98px", width: "150px", height: "70px" }}
      >
        <img
          src={`${ICON_BASE}/ellipse50-stroke.svg`}
          alt=""
          className="block -rotate-90"
          style={{ width: "70px", height: "150px" }}
        />
      </div>

      {/* === Dark leaf + orange sparkle (Vector A) ===
          Two-path SVG: dark leaf + orange sparkle baked in. Positioned
          centered on the cross horizontal axis, just left of center. */}
      <img
        src={`${ICON_BASE}/vector-a.svg`}
        alt=""
        className="absolute block"
        style={{ right: "365px", top: "224.5px", width: "155.5px", height: "92px" }}
      />

      {/* === Dark gear (Vector B), +9° rotation ===
          Wrapped in a containing box; the SVG is given the gear's
          natural aspect (143x135) and rotated about center. */}
      <div
        className="absolute flex items-center justify-center"
        style={{ right: "167px", top: "166px", width: "163px", height: "156px" }}
      >
        <img
          src={`${ICON_BASE}/vector-b.svg`}
          alt=""
          className="block rotate-[9deg]"
          style={{ width: "143px", height: "135px" }}
        />
      </div>

      {/* === Orange heart + EKG zigzag (Vector 83), -22° rotation, x-flipped ===
          The SVG combines the heart body and the carved EKG line in a
          single path (fill-rule evenodd). x-flip mirrors the heart so
          the EKG dip points to the right side as in Figma. */}
      <div
        className="absolute flex items-center justify-center"
        style={{ right: "57px", top: "212px", width: "138px", height: "128px" }}
      >
        <img
          src={`${ICON_BASE}/vector-83.svg`}
          alt=""
          className="block"
          style={{
            width: "112px",
            height: "93px",
            transform: "rotate(-22deg) scaleX(-1)",
          }}
        />
      </div>
    </div>
  );
}

// Small orange diamond (8x8 rotated square) used as a decorative marker
// where vertical/horizontal column borders intersect - matches Figma's
// Polygon 11 / Polygon 12 nodes at the photo-grid border lines.
function CornerDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute hidden size-2 rotate-45 bg-brand lg:block ${className ?? ""}`}
    />
  );
}

export function TeamCta() {
  return (
    <section id="partnership" className="flex flex-col">
      {/* === Dark CTA cap (Figma 1384:12824) ===
          Dark surface with rounded TOP corners and a negative bottom
          margin so the next sibling - the light "team card" - slides
          UP over the bottom 72 px of this cap. That overlap is the
          designed effect: the team card's rounded top corners eat into
          the dark frame from below, leaving a dark "tab" peeking out
          above. On lg the asymmetric pt-[68px]/pb-[128px] reproduces
          Figma's 392-tall band exactly (68 + 196 content + 128 = 392),
          which keeps the cross horizontal arm (y = 168 px) sitting in
          the gap between the heading (ends 164 px) and the button
          (starts 212 px) - same negative space as the design. */}
      <div
        className="lg-pad-x relative -mb-12 overflow-hidden rounded-t-[40px] px-6 pb-20 pt-10 sm:-mb-14 sm:rounded-t-[56px] sm:px-10 sm:pb-24 sm:pt-14 lg:-mb-[72px] lg:rounded-t-[68px] lg:pb-[128px] lg:pt-[68px]"
        style={{ background: "#2d2d2f" }}
      >
        <div className="relative z-10 flex flex-col items-start gap-7 sm:gap-9 lg:max-w-[571px] lg:gap-12">
          {/* h2 carries text-h2 directly so its strut line-height matches the
              inner span's (48 px). Without this the h2 inherits body
              line-height (24 px) from the page; CSS then takes max(strut,
              span) for line-box height but anchors the first baseline to the
              parent strut's font metrics - pushing the rendered caps ~6 px
              above the padding-top edge. text-h2-light on the second span
              overrides only weight (300) while keeping 44/48 metrics. */}
          <h2 className="text-h2 text-white">
            Підберемо рішення
            <span className="text-h2-light"> для вашого бізнесу</span>
          </h2>
          <Button href="/#contact-form" variant="outlined" size="large" arrow>
            Підібрати рішення
          </Button>
        </div>
        <DecorCluster />
      </div>

      {/* === Light team card (Figma 1384:12838) ===
          The whole team / process portion of the section sits inside
          one big rounded-[68px] card with bg-bg-subtle (#f8f8f8). The
          card slides up under the dark cap via the cap's negative
          bottom margin above. `relative` + no z-index puts it on top
          of the dark cap in DOM order so its rounded top corners are
          visible against the dark band. */}
      <div className="relative flex flex-col rounded-[40px] bg-bg-subtle sm:rounded-[56px] lg:rounded-[68px]">
      {/* === Команда title + intro paragraph ===
          Figma 1384:12839: pt-160 pb-120 px-130, two columns gap-32 each
          1fr. Below lg the paragraph drops under the heading. */}
      <div className="lg-pad-x flex flex-col items-start gap-6 px-5 pb-10 pt-12 sm:gap-8 sm:px-10 sm:pb-12 sm:pt-16 lg:flex-row lg:gap-8 lg:pb-[120px] lg:pt-[160px]">
        <h3 className="flex-1 text-h2 text-neutral-900">
          Команда,{" "}
          <span className="text-h2-light">яка супроводжує ваше замовлення</span>
        </h3>
        <p className="flex-1 text-body-sm text-neutral-500">
          Ми працюємо як єдина команда, щоб ваші закупівлі проходили спокійно,
          швидко та без збоїв. У процесі залучені не лише менеджери, а й
          логістика, закупівлі, склад, виробництво та фінанси - кожен відповідає
          за свою частину результату.
        </p>
      </div>

      {/* === Photo section ===
          Figma 1384:12842: three columns 372 / 220 / 588 inside the 1180
          design column. Director (left) and Group photo (right) each have
          stroke-subtle L/R borders; team-tags column (middle) is 373 px
          tall with bg-subtle + border-b. The orange "24+ працівників"
          tile lives in a 99-px strip BELOW the group photo (separated by
          a horizontal stroke-subtle divider), NOT overlapping the photo.

          Responsive:
          * mobile (<md): single column stack - director -> group photo ->
            team-tags chips. Photos use aspect ratios so they stay
            readable without fixed pixel heights.
          * md (768-1023): two columns side-by-side for the photos, with
            team-tags spanning both below as wrapping chips.
          * lg (1024+): full 3-column Figma grid using fr units that
            scale with the container so the proportions hold at any
            viewport >= 1024. DOM order is director -> group -> tags; CSS
            order rules visually re-place tags between the two photos on
            lg. Mobile / md keep DOM order so the natural reading flow
            (director, group, then tags) is preserved. */}
      <div className="lg-pad-x px-5 pb-12 sm:px-10 sm:pb-16 lg:pb-[80px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-6 md:gap-y-12 lg:grid-cols-[372fr_220px_588fr] lg:gap-0">
          {/* === Director column === */}
          <div className="relative flex flex-col gap-8 lg:order-1 lg:border-l lg:border-r lg:border-stroke-subtle lg:pb-6 lg:pl-10 lg:pr-10">
            <div className="group relative aspect-[292/336] w-full overflow-clip rounded-[20px] lg:aspect-auto lg:h-[336px]">
              <img
                src="/figma-export/team/director.png"
                alt="Михайло Цигелик - директор Binar 2000"
                loading="lazy"
                decoding="async"
                className="absolute h-[121%] w-[103%] max-w-none object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                style={{ left: "-1.5%", top: "calc(50% - 175px)" }}
              />
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              <p className="text-title-lg text-neutral-900">Михайло Цигелик</p>
              <p className="text-body-sm text-neutral-500">Директор компанії</p>
            </div>
            {/* Decorative diamonds on the column border lines (lg only) */}
            <CornerDot className="left-[-4px] top-[157px]" />
            <CornerDot className="right-[-4px] bottom-[64px]" />
          </div>

          {/* === Group photo column === */}
          <div className="relative flex flex-col lg:order-3 lg:border-l lg:border-r lg:border-stroke-subtle lg:pl-10 lg:pr-10">
            <div className="group relative aspect-[508/336] w-full overflow-clip rounded-[20px] lg:aspect-auto lg:h-[336px]">
              <img
                src="/figma-export/team/production.png"
                alt="Команда Binar 2000"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            {/* Bottom strip - 24+ tile right-aligned. On lg the strip
                is fixed 99 px tall with a stroke-subtle top divider that
                lines up with the team-tags column's border-b on the same
                y-line. Below lg it just sits flush under the photo. */}
            <div className="relative mt-6 flex justify-end sm:mt-8 lg:-mx-10 lg:mt-[37px] lg:h-[99px] lg:border-t lg:border-stroke-subtle">
              <div
                className="flex h-[80px] w-full items-center justify-center gap-3 sm:h-[99px] sm:w-[271px] sm:gap-4"
                style={{ background: "#f85a0b" }}
              >
                <p className="text-[36px] font-semibold leading-[40px] tracking-[-0.7px] text-white sm:text-[44px] sm:leading-[48px] sm:tracking-[-0.88px]">
                  24<span>+</span>
                </p>
                <p className="text-body-sm text-white">працівників</p>
              </div>
            </div>
            {/* Decorative diamond on the right border line (lg only) */}
            <CornerDot className="right-[-4px] top-[92px]" />
          </div>

          {/* === Team-tags column ===
              On lg this sits between director and group photo at 220 px
              wide. On md and below it spans the entire row underneath
              the two photos. Component handles its own responsive
              internals (chips fall on lg, wrap on smaller). */}
          <div className="md:col-span-2 lg:col-span-1 lg:order-2">
            <TeamTagsCloud />
          </div>
        </div>
      </div>

      {/* === Process steps ===
          Figma 1384:12859 — desktop is a clean 3-column row (icon at
          top, title + body below) with no card chrome, since the
          section already sits inside the light team card.
          On mobile the same bare stack felt too plain against the
          page's other carded mobile blocks (WhyPartners, Audiences),
          so we wrap each step in a `bg-white border rounded-[24px]`
          card with hover lift + shadow — matching the broader mobile
          card vocabulary. At `lg` the card chrome dissolves
          (`lg:bg-transparent lg:border-0 lg:p-0`) to recover Figma's
          plain layout, and the hover-lift detaches too so the desktop
          tile feels rooted on the section's surface. */}
      {/* === Process steps ===
          Figma 1384:12859 — desktop is a clean 3-column row (icon at
          top, title + body below) with no card chrome since the
          section sits inside the light team card.
          Mobile gets a richer card treatment: bg-white card with a
          large oversized "0N" numeral as a typographic accent in the
          corner, the illustration sitting prominently below it with
          a soft bg-bg-subtle disk behind for depth, and the
          title/body anchored to the bottom of the card. The numeral
          + disk + larger icon combination gives the mobile section
          the visual weight that the bare-stack version was missing,
          and matches the typographic-accent rhythm of FAQ / AboutUs
          / WhyUs on the rest of the site. At `lg` all of this
          dissolves back to Figma's plain 3-column layout. */}
      <div className="lg-pad-x px-5 pb-16 pt-4 sm:px-10 sm:pb-20 sm:pt-10 lg:pb-[160px] lg:pt-[80px]">
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {PROCESS.map((p, i) => (
            <li
              key={p.title}
              className="group/step relative flex flex-col gap-6 overflow-hidden rounded-[28px] border border-stroke-subtle bg-white p-7 transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1 hover:border-neutral-900 hover:shadow-[0_24px_60px_-24px_rgba(29,29,31,0.24)] sm:gap-7 sm:rounded-[32px] sm:p-8 lg:gap-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:hover:translate-y-0 lg:hover:border-transparent lg:hover:shadow-none"
            >
              {/* === Top row: BIG step numeral + large illustration ===
                  The "0N" is a hero-scale typographic accent
                  (text-h1, font-light, neutral-200) — same family
                  used by AboutUs and FAQ. The icon sits on the
                  right inside a soft bg-bg-subtle disk that
                  "spotlights" the illustration. Both dissolve on lg
                  back to Figma's plain icon-on-top layout. */}
              <div className="flex items-center justify-between gap-4 lg:contents">
                <span
                  aria-hidden
                  className="text-h1 font-light leading-none tracking-[-1px] text-neutral-200 transition-colors duration-500 group-hover/step:text-brand lg:hidden"
                >
                  0{i + 1}
                </span>
                <span className="relative flex size-[120px] shrink-0 items-center justify-center rounded-full bg-bg-subtle transition-[background-color,transform] duration-500 ease-out group-hover/step:scale-105 group-hover/step:bg-white sm:size-[132px] lg:size-[120px] lg:bg-transparent lg:group-hover/step:bg-transparent">
                  <img
                    src={p.icon}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="block size-[64%] object-contain transition-transform duration-500 ease-out group-hover/step:rotate-3 lg:size-full"
                  />
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <h4 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover/step:text-brand">
                  {p.title}
                </h4>
                <p className="text-body-sm text-neutral-500 transition-colors duration-300 group-hover/step:text-neutral-700">
                  {p.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </section>
  );
}
