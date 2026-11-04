/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Fragment } from "react";
import {
  CATALOG_DIRECTIONS,
  directionCatalogHref,
  menuLinkHref,
} from "./catalog/data";
import { useFitZoom } from "./cart/useFitZoom";
import { Button } from "./ui/Button";

// Sheet geometry in the master («Меню каталогу» 4329:39003, sheet
// 4329:39081 on a 1117-px screen): 1582 x 656 (40 + 576 + 40 with the
// 1-px stroke inside) starting 86 px from the top.
// Shorter windows get the whole sheet zoomed to fit with 24 px to spare,
// like the frame fitted to the screen (see cart/useFitZoom.ts).
const SHEET_DESIGN_H = 656;
const SHEET_TOP = 86;
const SHEET_BOTTOM_GAP = 24;

// Figma «Меню каталогу» (4329:39081): three catalog directions, each a
// 420.67 x 576 «Card» - a 64-px head row (52-px Info-icon tile with
// its 34-px glyph 9 px in + Title/Large, gap 16, py 4), the link list
// 32 px below (Text buttons Medium 16/22 #4a4a4c, 16 apart = a 38-px
// step) and the bottom-pinned «Переглянути все» Button/Small (230 x 42).
// Cards sit in a white 48-px-rounded sheet (border #777779, px-80
// py-40) 40 px on either side of a 0-width #d2d2d2 hairline. Column
// data lives in catalog/data.ts; every link opens its «Категорія» page.
const COLUMNS = CATALOG_DIRECTIONS;

// The catalog mega-menu sheet that drops from the header's «Каталог»
// trigger. Rendered INSIDE the sticky <header> so the hover chain
// trigger → sheet never crosses a dead zone (see Header.tsx), and with
// -z-10 so the sheet paints BEHIND the header's white bar: the Figma
// master (4329:39081, y=86 under a 92-px header) tucks the sheet's top
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
  const fit = useFitZoom(SHEET_DESIGN_H, SHEET_TOP + SHEET_BOTTOM_GAP);
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
      // max-w caps the sheet at the 1710 master's 1582 px (the 1550 shop
      // content cap + the designed 16-px bleed each side) and mx-auto centres
      // it once the viewport passes 1710, so on ultra-wide screens the sheet
      // tracks the centred content column below instead of growing unbounded.
      // Below 1710 the inset-x-16 rule still governs (1312 at 1440, 1582 at
      // 1710), unchanged.
      className={`absolute inset-x-16 top-[calc(100%-6px)] -z-10 mx-auto hidden max-w-[1582px] transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] lg:block ${
        open
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      {/* The sheet box itself carries the zoom: percentages resolve
          against the positioned wrapper, so `w-full` keeps the fluid
          1312..1582 footprint on screen while the columns stay 576 tall
          in the master's px (the wrapper's insets are never zoomed). */}
      <div
        className="w-full rounded-[48px] border border-neutral-500 bg-white px-[79px] py-[39px]"
        style={fit < 1 ? { zoom: fit } : undefined}
      >
      <div className="flex items-start gap-10">
        {COLUMNS.map((col, i) => (
          <Fragment key={col.href}>
            {/* Vector 67 / 59: a 0-width line with a centred 1-px
                stroke, so the 1-px div gives half a px back on each
                side and the cards keep the master's 420.67. */}
            {i > 0 && (
              <div
                aria-hidden
                data-menu-divider
                className="-mx-[0.5px] w-px shrink-0 self-stretch bg-stroke-subtle"
              />
            )}
            {/* Column — Figma «Card»: a fixed 576-px column with the
                icon+title header and link list at the top and the
                button pinned to the bottom edge. */}
            <nav
              aria-label={col.title}
              className="flex h-[576px] min-w-0 flex-1 flex-col items-start justify-between"
            >
              <div className="flex w-full flex-col gap-8">
                {/* Header row — 52-px Info-icon tile (the glyph box sits
                    at inset 9 of the tile = 34 px, i.e. 8 px inside the
                    1-px CSS border) + Title/Large, gap-16, py-4.
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
                      className="size-[34px]"
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-title-lg text-neutral-900 transition-colors duration-200 group-hover/cat:text-brand">
                    {col.title}
                  </span>
                </Link>

                <ul className="flex w-full flex-col gap-4">
                  {col.links.map((link) => (
                    <li key={link.label} className="w-full">
                      <Link
                        href={menuLinkHref(col, link)}
                        onClick={onNavigate}
                        className="block w-full cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
                      >
                        {link.label}
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
    </div>
  );
}
