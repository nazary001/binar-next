/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Fragment } from "react";
import { CATALOG_DIRECTIONS, directionCatalogHref } from "./catalog/data";
import { Button } from "./ui/Button";

// Figma «Меню каталогу» (3603:11515): three catalog directions, each a
// 52-px info-icon tile + Title/Large heading, a 16-px-gapped link list
// and a bottom-pinned «Переглянути все» small button. Columns sit in a
// white 48-px-rounded sheet (border #777779, px-80 py-40) and are
// separated by solid 1-px hairlines centred in 80-px gutters (gap-40 +
// line + gap-40) — the same divider recipe as the blog CardGrid.
// Column data lives in catalog/data.ts (shared with the /catalog
// filters); every subcategory link deep-links into the catalog with
// that subcategory pre-applied as a filter chip.
const COLUMNS = CATALOG_DIRECTIONS;

const subcategoryHref = (col: (typeof COLUMNS)[number], label: string) =>
  `${directionCatalogHref(col)}?sub=${encodeURIComponent(label)}`;

// The catalog mega-menu sheet that drops from the header's «Каталог»
// trigger. Rendered INSIDE the sticky <header> so the hover chain
// trigger → sheet never crosses a dead zone (see Header.tsx), and with
// -z-10 so the sheet paints BEHIND the header's white bar: the Figma
// master (3603:11515, y=86 under a 92-px header) tucks the sheet's top
// 6 px + corner arcs under the bar, and during the open animation the
// sheet visibly slides out from beneath the header.
//
// Width: the master pins the sheet 64 px from each viewport edge
// (1582 px on the 1710 canvas). The site's desktop layout is the
// zoom-scaled 1440 space, where the same 64-px rule yields a 1312-px
// sheet — wider than the 130-px page gutters on purpose, exactly like
// the design overshoots its own 80-px content padding.
export function CatalogMenu({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  return (
    <div
      id="catalog-menu"
      aria-hidden={!open}
      inert={!open}
      // Single cohesive reveal (Figma prototype: SMART_ANIMATE 300ms
      // ease-out): fade + a gentle 12-px slide-down on the house
      // ease-out curve, GPU-composited via `translate` + `opacity`.
      // px/py are the Figma 80/40 minus 1px: the master's stroke sits
      // INSIDE its 1582x656 box, so the CSS border must come out of the
      // padding to keep the sheet at exactly 656px tall with content
      // 80/40 from the sheet edge.
      className={`absolute inset-x-16 top-[calc(100%-6px)] -z-10 hidden rounded-[48px] border border-neutral-500 bg-white px-[79px] py-[39px] transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] lg:block ${
        open
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      <div className="flex items-start gap-10">
        {COLUMNS.map((col, i) => (
          <Fragment key={col.href}>
            {i > 0 && (
              <div aria-hidden className="w-px shrink-0 self-stretch bg-stroke-subtle" />
            )}
            {/* Column — Figma «Card»: a fixed 576-px column with the
                icon+title header and link list at the top and the
                button pinned to the bottom edge. */}
            <nav
              aria-label={col.title}
              className="flex h-[576px] min-w-0 flex-1 flex-col items-start justify-between"
            >
              <div className="flex w-full flex-col gap-8">
                {/* Header row — 52-px Info-icon tile (32-px glyph zone
                    centred per the master) + Title/Large, gap-16, py-4.
                    min-h-16 pins the Figma 64-px row height when the
                    title is 1-2 lines; a longer wrap (possible at the
                    1440 canvas where columns are narrower than the
                    1710 master's 420px) grows the row instead of
                    clipping. The whole row links to the direction page. */}
                <Link
                  href={directionCatalogHref(col)}
                  onClick={onNavigate}
                  className="group/cat flex min-h-16 w-full cursor-pointer items-center gap-4 py-1"
                >
                  <span className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-stroke-default">
                    <img
                      src={col.icon}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      decoding="async"
                      className="size-8"
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-title-lg text-neutral-900 transition-colors duration-200 group-hover/cat:text-brand">
                    {col.title}
                  </span>
                </Link>

                <ul className="flex w-full flex-col gap-4">
                  {col.links.map((label) => (
                    <li key={label} className="w-full">
                      <Link
                        href={subcategoryHref(col, label)}
                        onClick={onNavigate}
                        className="block w-full cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                href={directionCatalogHref(col)}
                size="small"
                arrow
                onClick={onNavigate}
              >
                Переглянути все
              </Button>
            </nav>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
