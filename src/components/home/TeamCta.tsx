/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { MobileCapCross } from "@/components/ui/MobileCapCross";
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
//      sits at Figma design coords (1114, 168) of the 1440x392 master
//      frame - i.e. 326 px from the right edge, 168 px from the top.
//      Built as four quadrant L-shapes that share borders at the meeting
//      line; each quadrant's INNER corner is rounded with 48 px radius
//      so all four curves meet flush at the center and trace the "+"
//      with soft inner curls. Borders use white at 30 % opacity to match
//      the subtle Figma stroke.
//
//   2. Four FIGMA-EXPORTED SVG ICONS sitting inside the cross quadrants
//      (positions from absoluteBoundingBox on the dark frame):
//      * Orange tag with circular hole (Ellipse 50, +90° rotation) -
//        upper-right quadrant, anchored at right=425 top=98 (Figma master).
//      * Dark leaf + orange 4-point sparkle (Vector A) - centered on the
//        cross horizontal axis, anchored at right=365 top=224.5.
//      * Dark gear (Vector B, -9° rotation) - bottom-right quadrant left
//        side, anchored at right=167 top=166.
//      * Orange heart with internal EKG zigzag (Vector 83, -22° rotation,
//        x-flipped) - bottom-right far right, anchored at right=57 top=212.
//
// Everything (cross AND icons) is positioned with FIXED PX OFFSETS from
// the dark frame's RIGHT EDGE - never percentages. That's the key to
// "no drift on different PC screens": the page already runs at the 1440
// CSS-pixel master via the `html { zoom: 100vw/1440px }` rule, but if
// that rule fails to apply (older Firefox, certain webviews), fixed-px
// right anchors keep the cross intersection and the icons sitting at the
// same relative position regardless of how wide the dark frame ends up.
// The cluster is hidden below xl - the cross + icons only fit beside the
// heading on viewports >= 1280 CSS px.
const ICON_BASE = "/figma-export/decor";

// Figma master dimensions for the cross intersection. The intersection
// is at (1114, 168) on the 1440x392 dark frame, so:
//   - cross right offset = 1440 - 1114 = 326 px (intersection x from right)
//   - cross top offset = 168 px (intersection y from top)
//   - upper rects height = 168 (top edge to intersection)
//   - lower rects height = 392 - 168 = 224 (intersection to bottom edge)
//   - left arms width = 1114 - 516 = 598 (intersection to where Rect 105
//     starts in Figma)
//   - right arms width = 1440 - 1114 = 326 (intersection to right edge)
// Constants kept here so the geometry is reviewable in one place rather
// than scattered across four absolute-positioned divs.
const CROSS_RIGHT = 326;
const CROSS_TOP = 168;
const CROSS_BOTTOM_HEIGHT = 224;
const CROSS_LEFT_ARM_WIDTH = 598;
const CROSS_RIGHT_ARM_WIDTH = 326;
const CROSS_RADIUS = 48;

function DecorCluster() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[40px] sm:rounded-t-[56px] lg:block lg:rounded-t-[68px]"
    >
      {/* Z-ORDER: Figma master 1384:12828 paints the 4 decorative icons
          UNDER the cross hairlines, so the orange tag / leaf-sparkle /
          gear / heart all sit BEHIND the white "+" cross. The hairlines
          stay crisp and continuous over the dark surface even where
          they pass across an icon. In DOM that means icons must render
          FIRST (lower in the stacking order) and the cross borders
          render LAST (so they paint on top). Previously the order was
          inverted - icons were after the cross divs and were clipping
          the cross's bottom-right curve and the horizontal arm where
          the gear and heart sit. */}

      {/* === Orange tag (Ellipse 50 (Stroke), rotated +90° clockwise) ===
          Figma absoluteBoundingBox of node 1384:12834 on the dark frame:
          x=865.41, y=98.01, w=149.68, h=70.24 (post-rotation bbox).
          Underlying SVG is 70x150 vertical; rotated 90° clockwise to
          fit the horizontal bbox. Flex centers the rotated image. */}
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
          Figma absoluteBoundingBox of node 1384:12835: x=920.03, y=224.50,
          w=155.46, h=92.03. No rotation. Two-path SVG with dark leaf and
          orange sparkle baked in. */}
      <img
        src={`${ICON_BASE}/vector-a.svg`}
        alt=""
        className="absolute block"
        style={{ right: "365px", top: "224.5px", width: "155.5px", height: "92px" }}
      />

      {/* === Dark gear (Vector B), -9° rotation (CSS +9° clockwise) ===
          Figma absoluteBoundingBox of node 1384:12836: x=1109.62, y=166.25,
          w=162.60, h=156.01 (post-rotation bbox). Underlying gear is
          ~143x135; rotated -9° around its center in the bbox. */}
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

      {/* === Orange heart + EKG zigzag (Vector 83), -22° + x-flip ===
          Figma absoluteBoundingBox of node 1384:12837: x=1244.38, y=211.98,
          w=138.26, h=127.69 (post-transform bbox). Figma applies
          rotation=-158° which is equivalent to -22° + 180° flip; we get
          the same look by rotating -22° and mirroring horizontally. The
          SVG combines the heart body and the EKG line in one path
          (fill-rule evenodd). */}
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

      {/* === Cross pattern: 4 quadrant L-shapes meeting at right=326, top=168 ===
          Painted AFTER the icons so the white hairlines render ON TOP
          (the icons sit visually behind the cross).
          Each quadrant draws TWO borders along the inner cross axes and a
          rounded corner where they meet. Drawing only the two visible
          borders (and not all four) avoids extra phantom lines at the
          outer container edges.

          Borders use solid `border-white` (full opacity, matching the
          Figma master 1384:12833 cap — earlier `border-white/30` was a
          guess at the visually-gray hairline in Figma's render, but the
          design itself sets each piece at 100% white and the gray look
          comes from anti-aliasing a 1-px line on a #2d2d2f surface).

          Left arms (UL + LL) carry a `mask-image` gradient that fades
          the LEFT half of the arm from transparent at the heading edge
          to fully opaque around 64% of the arm's width. Same treatment
          as the protect / cleaning / hotels caps so the cross
          dissolves under the heading instead of cutting through the
          text. */}
      {/* Upper-left quadrant - bottom + right borders, rounded bottom-right */}
      <div
        className="absolute border-b border-r border-white"
        style={{
          top: 0,
          right: `${CROSS_RIGHT}px`,
          width: `${CROSS_LEFT_ARM_WIDTH}px`,
          height: `${CROSS_TOP}px`,
          borderBottomRightRadius: `${CROSS_RADIUS}px`,
          maskImage: "linear-gradient(to right, transparent 0%, #000 64%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 64%)",
        }}
      />
      {/* Upper-right quadrant - bottom + left borders, rounded bottom-left */}
      <div
        className="absolute border-b border-l border-white"
        style={{
          top: 0,
          right: 0,
          width: `${CROSS_RIGHT_ARM_WIDTH}px`,
          height: `${CROSS_TOP}px`,
          borderBottomLeftRadius: `${CROSS_RADIUS}px`,
        }}
      />
      {/* Lower-left quadrant - top + right borders, rounded top-right */}
      <div
        className="absolute border-t border-r border-white"
        style={{
          top: `${CROSS_TOP}px`,
          right: `${CROSS_RIGHT}px`,
          width: `${CROSS_LEFT_ARM_WIDTH}px`,
          height: `${CROSS_BOTTOM_HEIGHT}px`,
          borderTopRightRadius: `${CROSS_RADIUS}px`,
          maskImage: "linear-gradient(to right, transparent 0%, #000 64%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 64%)",
        }}
      />
      {/* Lower-right quadrant - top + left borders, rounded top-left */}
      <div
        className="absolute border-t border-l border-white"
        style={{
          top: `${CROSS_TOP}px`,
          right: 0,
          width: `${CROSS_RIGHT_ARM_WIDTH}px`,
          height: `${CROSS_BOTTOM_HEIGHT}px`,
          borderTopLeftRadius: `${CROSS_RADIUS}px`,
        }}
      />
    </div>
  );
}

// Small orange diamond (8x8 rotated square) used as a decorative marker
// where vertical/horizontal column borders intersect - matches Figma's
// Polygon 11 / Polygon 12 nodes at the photo-grid border lines.
// 6.93×8 hexagon — matches Figma's Polygon11 asset. Renders as an
// inline SVG so the proper √3/2 hexagon aspect is preserved (a CSS
// rotate-45 square is a diamond, not a hexagon, and looked subtly
// squashed at 8 px).
function CornerDot({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 6.9282 8"
      className={`pointer-events-none absolute hidden h-2 w-[6.9282px] fill-brand lg:block ${className ?? ""}`}
    >
      <path d="M3.4641 0L6.9282 2V6L3.4641 8L0 6V2L3.4641 0Z" />
    </svg>
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
        className="lg-pad-x relative -mb-[72px] overflow-hidden rounded-t-[32px] bg-[#343435] px-6 pt-[60px] pb-[120px] sm:rounded-t-[56px] sm:px-10 sm:pt-[60px] sm:pb-[120px] lg:-mb-[72px] lg:rounded-t-[68px] lg:bg-[#2d2d2f] lg:pb-[128px] lg:pt-[68px]"
      >
        <MobileCapCross className="lg:hidden" />
        <div className="relative z-10 flex flex-col items-start gap-6 sm:gap-7 lg:max-w-[571px] lg:gap-12">
          {/* h2 carries text-h2 directly so its strut line-height matches the
              inner span's (48 px). Without this the h2 inherits body
              line-height (24 px) from the page; CSS then takes max(strut,
              span) for line-box height but anchors the first baseline to the
              parent strut's font metrics - pushing the rendered caps ~6 px
              above the padding-top edge. text-h2-light on the second span
              overrides only weight (300) while keeping 44/48 metrics. */}
          <h2 className="text-h2 text-white">
            Підберемо рішення
            {/* Figma mobile (3109:14093) breaks after «рішення» */}
            <br aria-hidden className="lg:hidden" />
            <span className="text-h2-light"> для вашого бізнесу</span>
          </h2>
          <Button href="/#contact-form" variant="outlined" size="responsive" arrow>
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
      <div className="relative flex flex-col rounded-[32px] bg-bg-subtle sm:rounded-[56px] lg:rounded-[68px]">
      {/* === Команда title + intro paragraph ===
          Figma 1384:12839: pt-160 pb-120 px-130, two columns gap-32 each
          1fr. Below lg the paragraph drops under the heading.
          Mobile (Figma 3109:14096): px-24 py-60 gap-24, single column. */}
      {/* Mobile (Figma 3109:14096): the heading sits 120px below the white
          card's top edge (60px frame offset + 60px inner padding), pb-60. */}
      <div className="lg-pad-x flex flex-col items-start gap-6 px-6 pb-[60px] pt-[120px] sm:gap-8 sm:px-10 lg:flex-row lg:gap-8 lg:pb-[120px] lg:pt-[160px]">
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
      {/* === Mobile photo section (Figma 3109:14099 + 3117:12887) ===
          The phone master abandons the desktop 3-column photo grid and
          the falling team-tags cloud entirely. Instead it stacks:
            1. Director block — px-24 py-48, a tall 342×393.534 portrait
               (rounded-20) with the director's name (title-lg) + role
               (body-sm) below, gap-32.
            2. Group block — a bordered (t/b/r) box with rounded-tr/br-32,
               px-24 py-48 gap-40, holding the wide group photo
               (aspect 508/336) and a right-aligned 24+ tile sitting under
               a hairline divider with a small orange polygon marker.
          This whole block is hidden on lg; the desktop grid below takes
          over from 1024 up. */}
      <div className="flex flex-col lg:hidden">
        {/* Director block */}
        <div className="flex flex-col items-start gap-8 px-6 py-12 sm:px-10">
          <div className="relative aspect-[342/393.534] w-full overflow-clip rounded-[20px]">
            {/* Exact Figma crop (3109:14102): the photo box is 103.27% x
                120.61% of the frame, centred horizontally and shifted
                28.75px down (-11.8px top at 390). */}
            <img
              src="/figma-export/team/director.png"
              alt="Михайло Цигелик - директор Binar 2000"
              loading="lazy"
              decoding="async"
              className="absolute max-w-none object-cover"
              style={{
                width: "103.268%",
                height: "120.611%",
                left: "-1.634%",
                top: "-2.999%",
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-title-lg text-neutral-900">Михайло Цигелик</p>
            <p className="text-body-sm text-neutral-500">Директор компанії</p>
          </div>
        </div>

        {/* Group block — bordered box (t/b/r) with the wide team photo
            and the 24+ tile under a hairline divider. */}
        <div className="flex flex-col gap-10 rounded-br-[32px] rounded-tr-[32px] border-y border-r border-stroke-default px-6 py-12 sm:px-10">
          <div className="relative aspect-[508/336] w-full overflow-clip rounded-[20px]">
            <img
              src="/figma-export/team/production.png"
              alt="Команда Binar 2000"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          </div>
          <div className="flex flex-col items-end">
            {/* Hairline divider + orange polygon marker (Figma Group 80) */}
            <div className="relative -mb-1 h-2 w-full">
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-stroke-subtle" />
              <svg
                aria-hidden
                viewBox="0 0 6.9282 8"
                className="absolute left-[54px] top-0 h-2 w-[6.9282px] fill-brand"
              >
                <path d="M3.4641 0L6.9282 2V6L3.4641 8L0 6V2L3.4641 0Z" />
              </svg>
            </div>
            <div
              className="flex h-[72px] w-[226px] items-center justify-center gap-4"
              style={{ background: "#f85a0b" }}
            >
              <p className="text-[30px] font-semibold leading-[36px] tracking-[-0.6px] text-white">
                24+
              </p>
              <p className="text-body-sm text-white">працівників</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg-pad-x hidden px-5 pb-12 sm:px-10 sm:pb-16 lg:block lg:pb-[80px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-6 md:gap-y-12 lg:grid-cols-[372fr_220px_588fr] lg:gap-0">
          {/* === Director column === */}
          <div className="relative flex flex-col gap-8 lg:order-1 lg:border-l lg:border-r lg:border-stroke-subtle lg:pb-6 lg:pl-10 lg:pr-10">
            <div className="group relative aspect-[292/336] w-full overflow-clip rounded-[20px] lg:aspect-auto lg:h-[336px]">
              <img
                src="/figma-export/team/director.png"
                alt="Михайло Цигелик - директор Binar 2000"
                loading="lazy"
                decoding="async"
                className="absolute h-[121%] w-[103%] max-w-none object-cover"
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
                className="absolute inset-0 size-full object-cover"
              />
            </div>
            {/* Bottom strip - 24+ tile right-aligned. On lg the strip
                is fixed 100 px tall (`h-[100px]`) starting at `mt-[36px]`
                so its `border-t` lands on the SAME pixel row as the
                team-tags column's `border-b` (y=372 with box-sizing:
                border-box; both 373-tall tags box and (336 photo + 36
                gap)-offset strip resolve to border at row 372). Without
                this the strip's border-t sat on row 373 — one pixel
                below tags' border on row 372 — and the horizontal
                divider had a visible 1-px staircase at the
                tags|group column boundary. The strip's content area
                after the border is still 99 px (100 - 1 px top
                border with border-box sizing), so the orange 24+ box
                (h-99) fits exactly with no leftover space. Below lg
                this just sits flush under the photo. */}
            <div className="relative mt-6 flex justify-end sm:mt-8 lg:-mx-10 lg:mt-[36px] lg:h-[100px] lg:border-t lg:border-stroke-subtle">
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
          Figma 1384:12859 (desktop) / 3109:14115 (mobile) — a clean
          column of bare blocks: a 120-px illustration on top with the
          title (title-lg) + body (body-sm) below, gap-12. No card
          chrome, no numeral — the section already sits inside the
          light team card. Desktop is a 3-column row; mobile stacks the
          same bare blocks (px-24 pt-48, gap-40 inside each block,
          gap-24 between blocks). */}
      <div className="lg-pad-x px-6 pb-12 pt-12 sm:px-10 sm:pb-16 sm:pt-12 lg:pb-[80px] lg:pt-[80px]">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-8">
          {PROCESS.map((p) => (
            <li
              key={p.title}
              className="relative flex flex-col gap-10 lg:gap-4"
            >
              <span className="relative flex size-[120px] shrink-0 items-center justify-center">
                <img
                  src={p.icon}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="block size-full object-contain"
                />
              </span>

              <div className="flex flex-col gap-3 lg:gap-4">
                <h4 className="text-title-lg text-neutral-900">{p.title}</h4>
                <p className="text-body-sm text-neutral-500">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </section>
  );
}
