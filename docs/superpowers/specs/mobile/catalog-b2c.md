# Public catalog (catalog-b2c) - phone spec (< 640 px)

Area: the public / B2C catalog on phones: `/catalog` (direction banners),
`/catalog/[direction]` (subcategory carousel), `/catalog/[direction]/[category]`
(category hero); toolbar (search, filter button, view switch, sort), applied
chips, filters sheet, product cards (grid view) and product rows (list view),
load-more, empty state, add to cart.

Inputs merged here: `audit/mobile/catalog-b2c/visual-report.md` (V01-V24),
`audit/mobile/catalog-b2c/functional-report.md` (F1-F20), the screenshots in
`audit/mobile/catalog-b2c/shots/` (viewed: visual-catalog-none-cards-390-01/02,
visual-catalog-none-list-390-02, visual-hotels-carousel-start-390,
visual-category-none-cards-390-01, visual-hotels-filters-checked-390,
visual-catalog-chips-applied-390; landing references lang/shots/blog-390-02,
hotels-390-03), the sources below, BRIEF.md, DECISIONS.md (D1-D13), the Figma
language (TR-01..TR-32) and the code recipes. The catalog-b2b audit
(`audit/mobile/catalog-b2b/*-report.md`) was read for the files both skins
share. Text widths quoted below were measured in the site fonts with
`audit/mobile/catalog-b2c/spec-measure.mjs` (output `spec-measure.txt`).

Conventions: phone = unprefixed classes (and `max-lg:`), desktop = `lg:`.
Every phone class that changes a property the desktop relied on gets its
`lg:` restore in the same string; the desktop (>= 640) and the landing stay
byte-identical (pixel guard, baseline includes `shop-1710-catalog`,
`shop-1710-catalog-hotels`, `shop-1710-catalog-cat`, `shop-1710-catalog-filters`,
`shop-1710-catalog-b2c-signed` and the cabinet catalog shots). All y values
are CSS px at 390 x 844 measured from the page top (header 0..66).

Source files (line numbers as of 2026-11-05):
- `src/components/catalog/CatalogPageView.tsx` (PublicView 106-157, CategoryHero 87-102, crumb pieces 34-81)
- `src/components/catalog/CatalogClient.tsx` (TextDropdown 100-237, state 268-313, toolbar 413-485, chips 491-514, results row 517-548, list/grid 561-621, pager 623-663, sheet 666-673)
- `src/components/catalog/ProductCard.tsx` (StatusLine 39-79, ChipsRow 87-111, QtyStepper 120-172, PriceTag 179-212, PriceAndQty 215-248, CartButton 255-283, SaleChip 287-296, ProductCard 300-348, ProductRow 355-409)
- `src/components/catalog/FiltersDrawer.tsx` (DrawerSection 35-116, FiltersDrawer 131-229)
- `src/components/catalog/SubcategoryCarousel.tsx` (track 73-92, pagers 56-58, 98-117)
- `src/components/catalog/CategoryBanners.tsx` (row 180-195)
- `src/components/catalog/ZoneCard.tsx` (155-216)
- shared: `src/components/ui/Breadcrumb.tsx`, `ui/Button.tsx`, `ScrollUpDock.tsx`, `cart/useModalBehavior.ts`, `cart/CartProvider.tsx`

---------------------------------------------------------------------

## System alignment (2026-11-05)

Added by the system-spec agent. System spec:
docs/superpowers/specs/2026-11-05-mobile-shop-cabinet-design.md (atoms
A1..A28 in section 3.4, amendments A-1..A-14 and conflicts C-xx in
section 7, templates T1..T6 in section 4, build clusters in section 6).
Where this block and the body below disagree, THIS BLOCK WINS; where an
atom of the system spec covers a recipe of this file, the atom's API and
classes win over the local recipe. Body edits made by the same pass are
marked "SYSTEM".

| # | This file says | System decision |
|---|---|---|
| S1 | 2.3 hand-made BackCrumb phone row | ShopCrumbs / PhoneBackCrumb (A19, shell-public 2.4 call-site table); same geometry |
| S2 | SN-C1 QtyStepper hit boxes at all widths | A18: extracted to catalog/QtyStepper.tsx by F2; boxes `max-lg:` only; phone count 16/22 Bold for every size |
| S3 | SN-C2 ChipsRow | A18 (catalog/ChipsRow.tsx, F2) |
| S4 | SN-C3 BackCrumb truncation | Not needed (PhoneBackCrumb truncates) |
| S5 | SN-C4 LoadMore; 2.13 "the counter stays" | A9: the whole block disappears when everything is shown (A-5); edited in place |
| S6 | SN-C5 FilterButton | A11 (black 52 disc + brand badge, F2) - matches 2.8 |
| S7 | SN-C6 ScrollUpDock gate | C-23: CornerFab hidden on shop phones (shell-public 2.8) |
| S8 | SN-C7 PanelEmptyState | A14 EmptyState `surface="none"`; the reset action stays solid (no other solid primary in view) |
| S9 | SN-C8 SheetBar / SheetFooter / useSheetHistory | A5 constants (footer `pt-[15px]` + 1-px line) + A4 useBackToClose |
| S10 | SN-C9 useIsPhone (null, max-width 639px) | A3 `usePhone()` (boolean, false on the server; the SSR desktop slice behaves the same) |
| S11 | SN-C10 branded 404 | Orchestrator point O-3 (not built) |
| S12 | SN-C11 anchor offset | A26 phone rule `scroll-margin-top: 0` (F1); the filter "Показати" scroll keeps its explicit 66 + 16 offset |
| S13 | 2.16 TextDropdown `variant="phone"` | A12 SortMenu (row C with `prefix` SUPERSEDED by S20: the meta line, no prefix); TextDropdown keeps only its desktop variant; flip rule and 44-px rows = SortMenu |
| S14 | 2.8 search form + clear | A11 SearchField (input string identical to today) |
| S15 | 2.9 chips in place | Strings = A11 AppliedChips (identical) |
| S16 | 7.x add-to-cart feedback | Keep opening the cart sheet (O-11) |
| S17 | Build | ONE cluster C-catalog with catalog-b2b (OP-01); QtyStepper / ChipsRow edits are F2's pre-cluster edits |
| S18 (critique round 1) | 2.4 banners `gap-4` (16 apart) | Touching tiles with a 1-px seam (C-43; ZonesGrid 3117:14393): row without a phone gap + banner `max-lg:[&+&]:-mt-px`; 616 tall; edited in place |
| S19 (critique round 1) | 2.7 listing `mt-[60px]` | `mt-12 lg:mt-[148px]` (48, D10 big blocks); edited in place |
| S20 (critique round 1) | 2.8 / 2.10 3-row toolbar (row A search + filter, row B count + view switch, row C sort with prefix = 172) | C-47: row A = SearchField (`min-w-0 flex-1`; 152 at 320, 222 at 390) + ONE 52 view toggle disc + FilterButton 52, gap 8. Toggle = the master outlined icon button 3117:12801: `flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border border-neutral-900 bg-white text-neutral-900 transition-colors duration-200 active:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:hidden` with the glyph of the OTHER view and `aria-label` "Вид списком" (cards shown) / "Вид картками" (list shown) - the label names the action, so no `aria-pressed`. Then [AppliedChips, 16] and the meta line 16 below (count 14/20 #777779 left, SortMenu without prefix right, 44 tall); list 24 below. Toolbar 112. Map at 390: /catalog row A 956, first card 1092; direction 546 / 682; category 588 / 724; notes added, 2.0 map edited |
| S21 (critique round 1) | 2.8 FilterButton badge (no ring, SemiBold) | A11 revised: the header cart badge look (1.5-px white ring, 12 Bold) on the brand fill |
| S22 (critique round 1) | 2.9 chip text #1d1d1f | `text-neutral-800 lg:text-neutral-900` (master chip 3176:5479; C-20 revised) |
| S23 (critique round 1) | 2.13 LoadMore `moreRef`, live counter, `page` = phone batches | A9 revised (no `moreRef`; the counter is not live; focus stays on the button; `focusAfterLast` = the first new card's title link). Phones persist the batch in `n` (A29), desktop keeps `page`; a phone hard load with `n > 10` server-renders items 1-10 and appends the rest after `usePhone()` resolves (below the fold); edited in place |
| S24 (critique round 1) | 2.15 live apply (URL replace on every tick); "Показати" closes then scrolls | T5a draft model (A4 `onSettled` commit through A29 `writeListParams`; the scroll runs in a rAF after the swallowed popstate); desktop keeps the live apply; edited in place |
| S25 (critique round 1) | 2.19 `replaceParams` -> `router.replace(url, { scroll: false })` | A29 `writeListParams` (`window.history.replaceState`; Next syncs useSearchParams; no RSC fetch per tap / keystroke on the SSG routes); edited in place |
| S26 (critique round 1) | 2.10 row B `<p aria-live="polite">` | The meta-line count is `aria-live="off"` while any overlay is open (the sheet footer status is the only announcer, system 3.1.6) |
| S27 (critique round 1) | 2.11 phone list `<div className="flex flex-col gap-6">` | `<ul role="list" aria-label="Товари" className="flex flex-col gap-6">` with `<li>` wrappers; edited in place |
| S28 (critique round 1) | 2.11 price "Stat 30/36 Bold (Cases stat 3094:5169)" | Bold per D3 until O-15; the cited node is SemiBold (do not verify the weight against it) |
| S29 (critique round 1) | 2.15 sheet bar / footer / focus | A5 constants revised: bar 66 with one title line, footer = the scroller's last child (sticky, static below 500 px of height); cross "Закрити фільтри"; initial focus = the bar title on coarse pointers; the drawer renders inside `main` - the A2 sibling walk inerts the rest (no portal) |
| S30 (critique round 1) | 2.17 add to cart opens the cart sheet | Unchanged (O-11; the critique recommends a toast for list adds - orchestrator) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Routes

| Route | Page kind | Listing pool | Sheet groups |
|---|---|---|---|
| `/catalog` | root: crumb, H1 "Каталог", 3 direction banners | 132 products, 7 pages of 20 on desktop | "Товари" (union) + "Виробник" |
| `/catalog/hotels` (also `/protect`, `/cleaning`) | direction: crumb, H1 = direction title, subcategory carousel (8 / 6 / 4 tiles) | 62 / ... products | facet ("Готельні зони" / "Промислові ризики та галузі" / "Зони Клінінгу") + "Товари" + "Виробник" |
| `/catalog/hotels/hotelna-kosmetyka` (any category) | category: crumb, H1 = category label, hero photo | 7-8 products (one page) | same three groups as the direction |

The B2B skin of the same routes (seed b2b, `PlatformView`, `B2BProductCard`)
belongs to the catalog-b2b spec; the toolbar, applied chips, sheet, sort
menu, load-more, carousel, banners and hero below are SHARED by both skins
(same components, `mode="b2b"` only swaps the pill colours and the card /
row components) and are specified here once.

### 1.2 Seeds

| id | Seed | Result on phones |
|---|---|---|
| S0 | none (visitor) | public shell, menu row "Увійти" |
| S1 | `audit/mobile/kit/seed-b2c.json` | identical render to S0 (no account pill on the phone bar; menu row "Особистий кабінет") |
| S2 | S0 + cart `shampoo-1:2` | header badge "2" (cart drawer belongs to the cart area) |

### 1.3 States

| id | State | How to reach | Audited today |
|---|---|---|---|
| ST1 | Root, cards view, nothing applied | `/catalog` | yes |
| ST2 | Direction, carousel at start / swiped / end | `/catalog/hotels`, swipe the track | yes |
| ST3 | Category with hero, one batch (8 items, no load-more) | `/catalog/hotels/hotelna-kosmetyka` | yes |
| ST4 | List view | tap `button[aria-label="Вид списком"]`; URL gains `view=list` (new) | yes (URL part new) |
| ST5 | Filters sheet open, nothing ticked | tap `button[aria-label^="Фільтри"]` | yes |
| ST6 | Sheet with ticks (count line updates, "Скинути" enabled) | tick "Ванна кімната" on `/catalog/hotels` | yes (count line new) |
| ST7 | Sheet scrolled to the end (sticky bar + footer) | scroll the sheet | yes |
| ST8 | Applied chips incl. the long option | `/catalog/hotels?type=Аксесуари для ванної кімнати: гачки, полички, тримачі, дзеркала&type=Вага` | yes |
| ST9 | Sort menu open (below the trigger / flipped above) | tap the phone sort trigger near the top / near the bottom of the viewport | yes (flip new) |
| ST10 | Load-more: 10 shown, 20 shown, all shown | `/catalog`, tap "Показати більше" (new) | no (new) |
| ST11 | Search typing, search with clear button, Enter | type "шамп", tap the clear cross (new) | partly |
| ST12 | Empty result (search or filters) | type "zzz" | yes (phone block new) |
| ST13 | Out-of-stock card / row, promo card / row | the 3rd / 2nd product of the list (shampoo-3 / shampoo-2 placements in PRODUCTS) | yes |
| ST14 | Add to cart from a card (drawer opens, card qty back to 1) | tap a card cart disc | yes (qty reset new) |
| ST15 | Back from a PDP restores view / sort / search / batches and scroll | list + "за назвою" + 3 batches -> product -> Back | yes (fix new) |
| ST16 | 3-digit quantity in the card / row stepper | tap "+" 120 times or set via devtools | yes (b2b audit) |
| ST17 | Long direction title in the back crumb | `/catalog/protect/<category>` and `/catalog/cleaning/<category>` | yes (truncate new) |
| ST18 | Phone menu over the catalog | burger | yes (shared, unchanged) |

Unreachable or not emulated, with the reason:
- Real momentum + snap feel of the carousel: headless CDP drags end off-grid and `synthesizeScrollGesture` is a no-op; programmatic scroll proves `scroll-snap-type: x mandatory` only (F-report harness notes). Check on a device.
- iOS keyboard / visualViewport resize on search focus, safe-area insets (no `viewport-fit=cover` until D12 lands), VoiceOver / TalkBack output, the Android system back gesture (only `history.back()` is emulated).
- Production loading state: in `next dev` the listing is server-rendered; in a production build `useSearchParams` makes the `<Suspense>` subtree render on the client, so the first paint shows the fallback for one frame. Check with `next build && next start` in the review phase.
- Error state: the catalog data is static; there is no fetch to fail. Unknown slugs are the 404 (F20, shared). A broken product image falls back to the #d5d5d5 photo box (alt text hidden, see 2.13).

---------------------------------------------------------------------

## 2. Phone layout

### 2.0 Global numbers

| Width | Content (gutters 24) | Card inner (card px 24 incl. ring) | List text column (342 - 96 - 16) |
|---|---|---|---|
| 320 | 272 | 224 | 160 |
| 360 | 312 | 264 | 200 |
| 390 | 342 | 294 | 230 |
| 430 | 382 | 334 | 270 |
| 600 | 552 | 504 | 440 |

Vertical map after the change (390 x 844):

| Block | /catalog | /catalog/hotels | category |
|---|---|---|---|
| Header | 0-66 | 0-66 | 0-66 |
| Back crumb (40) | 114-154 | 114-154 | 114-154 |
| H1 | 202-244 | 202-244 | 202-286 (2 lines) |
| Banners / carousel / hero | 292-908 (3 x 206 touching, 1-px seams; SYSTEM critique round 1) | 292-498 | 334-540 |
| Toolbar row A (52: search + view toggle + filter) | 956-1008 | 546-598 | 588-640 |
| Meta line (44: count + SortMenu) | 1024-1068 | 614-658 | 656-700 |
| First card top | 1092 | 682 (photo visible above the fold) | 724 (visible) |
| Card / pitch | 490 / 514 | same | same |
| Load-more block | after 10 cards: 48 below the list | same | none (8 items) |
| Footer | 60 below the last block | same | same |

Today: first photo at 1360 / 894 / ~1010, card pitch 660, 20 cards per page
(V09, V10, F8). /catalog keeps the banners above the products on purpose
(they are the root page's content, TR-29).

### 2.1 Shell (shared, not changed by this area)

- Header 66 (Header.tsx), phone menu sheet, footer + orange legal bar:
  unchanged, frozen (D2, TR-01). The page is white.
- ScrollUpDock CornerFab: its 100-px box covers the card cart disc in the
  bottom-right corner (F2, V21). Fixed in the shared layer (SN-C6); this
  area only verifies it (6.6).

### 2.2 Page wrapper

`CatalogPageView.tsx:112` `px-6 sm:px-10 lg-shop-pad-x` unchanged (24
gutters, D10).

### 2.3 Head: back crumb + H1 (TR-03, TR-05, article master 3176:6558)

(SYSTEM A19: build the phone crumb with `ShopCrumbs` / `PhoneBackCrumb` from
ui/Breadcrumb.tsx, shell-public 2.4, instead of the hand-made BackCrumb row
below; geometry and parents are identical.)

Head section `CatalogPageView.tsx:113`:
- today `flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]`
- new `flex flex-col gap-12 pt-12 lg:pt-[72px]` (crumb -> H1 48 on phones
  like the article master; desktop gap is already 48, so the `lg:gap-12`
  becomes redundant and is folded into `gap-12`).

Phone crumb row (new, before the desktop row):
```
<div className="flex min-w-0 lg:hidden">
  <BackCrumb href={parent.href} label={parent.label} className="max-w-full" />
</div>
```
- parent per page: root -> "Головна" `/`; direction -> "Каталог"
  `/catalog`; category -> the direction title (e.g. "Усе для готелів")
  `directionCatalogHref(dir)`. This makes the direction reachable in one tap
  from a category (F13: today the back disc goes to "/" and the direction
  crumb is a plain span).
- "/ current" is dropped on phones: the current crumb equals the H1 48 px
  below it (TR-05 allows the drop; catalog-b2b F11 agrees). One row, 40
  tall, never wraps (fixes V14 / F13 dangling "/" and the 2-4 line rows).
- Disc 40 r26 1-px #1d1d1f + 16 gap + label 16/22 SemiBold #343435 (the
  existing BackCrumbBody phone strings). Long labels truncate with an
  ellipsis (SN-C3): "Засоби індивідуального захисту" is 258.6 px and
  "Засоби та інвентар для прибирання" 285.4 px against 216 (320) / 256
  (360) / 286 (390) of room.
- Desktop crumb row `CatalogPageView.tsx:114` gets `max-lg:hidden` and is
  otherwise untouched (`flex flex-wrap items-center gap-4 max-lg:hidden`).

H1 `CatalogPageView.tsx:131` `text-h1 text-neutral-900` unchanged (40/42
Bold -0.8, D9). Category H1 "Готельна косметика" is 2 lines at 390.

### 2.4 Root: direction banners (TR-29 "stacked zone tiles 16 apart", zone tile 3130:18944)

- Section `CatalogPageView.tsx:135` `mt-12 lg:mt-20` unchanged (H1 -> 48).
- Row `CategoryBanners.tsx:182` (SYSTEM critique round 1, C-43: the
  master photo tiles TOUCH - ZonesGrid 3117:14393, 3130:17608 at y 1407,
  3130:18944 at 1613): no phone gap; full class `relative flex flex-col
  lg:flex-row ${gap === "b2b" ? "lg:gap-[26px]" : "lg:gap-8"}`; each
  banner adds `max-lg:[&+&]:-mt-px` (the 1-px rings overlap into one
  seam, as hotels/ZonesGrid.tsx does).
- Banner `CategoryBanners.tsx:193`: `h-[220px] w-full lg:h-[260px] lg:flex-1`
  -> `h-[206px] w-full lg:h-[260px] lg:flex-1` (master tile 342 x 206; V19,
  catalog-b2b F14). 3 x 206 - 2 = 616 (today 708).
- ZoneCard phone tile (new prop `phonePad: "tile" | "compact"`, default
  "tile"), `ZoneCard.tsx:158` gains:
  - always on phones: `max-lg:border max-lg:border-stroke-default` (the
    1-px #8e8e8f ring of the master zone tile and ZonesGrid.tsx:257);
  - "tile": `min-[360px]:max-lg:p-[39px] max-[359px]:p-[23px]` (40 / 24
    visual incl. the ring; non-overlapping ranges so no variant-order
    question); "compact": `max-lg:p-[23px]`.
  - `p-10` stays as the desktop value (no ring on desktop).
- Label `ZoneCard.tsx:213`: keep `flex-1 text-button-lg text-white` (16/22
  SemiBold on phones) and add `style={{ overflowWrap: "normal" }}`. The
  unlayered phone rule `span { overflow-wrap: anywhere }` (globals.css
  1597-1602) beats any utility, so only an inline style stops
  "індивідуально|го" splitting (V05). Desktop default is `normal` already
  (identical). Label column: 186 at 390 (= master 186), 156 at 360, 148 at
  320 with the 24 padding; the longest word "індивідуального" is 131.4.
- 52 white-ring disc (DetailsIconButton light) unchanged; hover panel stays
  `lg:block` only (gotcha 18). One tap navigates.

### 2.5 Direction: subcategory carousel (TR-29, D11)

- Section `CatalogPageView.tsx:140` `mt-8 lg:mt-12` -> `mt-12` (48 like
  every head -> first block, TR-03).
- Track `SubcategoryCarousel.tsx:77`, full-bleed on phones so tiles do not
  get cut flat at the gutters (V04, F5):
  `-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 [-ms-overflow-style:none] [scrollbar-width:none] max-lg:overscroll-x-contain lg:mx-0 lg:scroll-px-0 lg:gap-8 lg:px-0 [&::-webkit-scrollbar]:hidden`
  (+ the existing `min-w-0 flex-1` when `inline`). `overscroll-x-contain`
  stops a swipe at scrollLeft 0 from chaining into the browser back
  gesture.
- Tile `SubcategoryCarousel.tsx:89`:
  `h-[206px] w-[min(280px,calc(100vw-72px))] shrink-0 snap-start lg:h-[260px] lg:w-[393px]`
  + `phonePad="compact"` (24 padding incl. ring). Widths and peek of the
  next tile: 320 -> 248, peek 32; 360 -> 280, peek 40; 390 -> 280, peek 70;
  430 -> 280, peek 110; 600 -> two full tiles (the second ends at the screen
  edge). Fixes the 48 / 8 px clipping at 320 / 360 (V03, F4) and the zero
  peek at 390 (V04, F5). Label column 124 (320) .. 156 (390); longest
  carousel word "обладнання" 97.1, "Арома-маркетинг" breaks at its hyphen.
- No arrows, no dots on phones (D11). The ghost pagers stay `lg:flex`
  (`SubcategoryCarousel.tsx:56-58`). Carousel for every direction
  (8 / 6 / 4 tiles) - see open point 7.1 about TR-29's "<= 4 stack" clause.
- Tap opens the category page; vertical swipes scroll the page (works).

### 2.6 Category hero (TR-30, article cover 3176:6105)

`CatalogPageView.tsx:90`:
`relative h-[240px] w-full overflow-clip rounded-[32px] sm:h-[320px] lg:h-[640px] lg:rounded-[40px]`
-> `relative h-[206px] w-full overflow-clip rounded-[32px] lg:h-[640px] lg:rounded-[40px]`
(the `sm:h-[320px]` is dead: lg wins from 640). Section `mt-12` unchanged.
Object-position from `card.hero.position` keeps working at 342 x 206.

### 2.7 Listing section

`CatalogPageView.tsx:150` `mt-[60px] lg:mt-[148px]` -> `mt-12
lg:mt-[148px]` (SYSTEM critique round 1: 48 = D10 big blocks; the first
product comes on screen at 390 x 844). Everything below is
`CatalogClient.tsx`.

### 2.8 Toolbar row A: search + filter button (TR-10)

(SYSTEM critique round 1, S20 / C-47: row A = SearchField + ONE 52 view
toggle disc + FilterButton, gap 8; the view switch does NOT move to row B,
and rows B / C of 2.10 become one meta line. The search and filter
strings below stay.)

Wrapper `CatalogClient.tsx:413`:
`flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`
-> `flex items-center gap-2 lg:justify-between lg:gap-4` (desktop: row,
centre, space-between, gap 16 = today).

Search (`CatalogClient.tsx:414-427`) becomes a form (all widths, no pixel
change):
```
<form role="search" onSubmit={(e) => { e.preventDefault(); inputRef.current?.blur(); }}
  className={`relative min-w-0 flex-1 lg:w-[...as today...] lg:min-w-auto lg:flex-initial`}>
```
(today `relative w-full lg:w-[495px | calc((100%-64px)/3)]`; the phone
`flex-1 min-w-0` is restored to `flex: 0 1 auto` / `min-width: auto` at
lg).
- Input unchanged (46 tall, r50, 1-px #8e8e8f, 16-px text, `pl-4 pr-12`,
  placeholder "Пошук", aria-label "Пошук по каталогу") + `enterKeyHint="search"`
  + `autoComplete="off"`. Enter submits -> blur -> keyboard closes (F15).
- Phone clear button (new) while `query !== ""`: `<button type="button"
  aria-label="Очистити пошук" className="absolute right-px top-1/2 flex
  size-11 -translate-y-1/2 items-center justify-center rounded-full
  text-neutral-700 focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-brand lg:hidden"><XMarkIcon className="size-6"
  /></button>`; the magnifier gets `max-lg:hidden` while the query is not
  empty. Clearing refocuses the input. (V20, F15; desktop untouched.)
- Width at 390: 342 - 8 - 52 = 282 (320: 212).

Filter button `CatalogClient.tsx:474-483`: 52 black disc as today plus the
active-filter count badge on phones (TR-10, V12, catalog-b2b F13), using
the shop's existing badge (materials/Hero.tsx:69-75):
`<span aria-hidden className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[12px] font-semibold leading-none text-white lg:hidden">{count}</span>`
on a `relative` button; count = zone + type + brand values. aria-label
"Фільтри" when 0, "Фільтри, обрано N" otherwise (materials wording).
Desktop: badge hidden (`lg:hidden`), button identical. Prefer the shared
`FilterButton` atom (SN-C5) if the shared layer builds it.

The view switch (`CatalogClient.tsx:435-470`) moves to row B on phones:
extract it as a local `ViewSwitch({ b2b, view, onView, className })`
component and render it twice: here with `className="max-lg:hidden"`, and
in row B with `lg:hidden`. Only one is displayed at a time (display none
removes the other from the tab order and the a11y tree).

### 2.9 Applied chips (TR-10 chips, blog chips 3176:5479)

Row `CatalogClient.tsx:492`: `mt-8 flex flex-wrap items-center gap-4 lg:mt-12`
-> `mt-4 flex flex-wrap items-center gap-2 lg:mt-12 lg:gap-4` (16 under row
A, chips 8 apart in both axes; wraps, never scrolls).

Chip `CatalogClient.tsx:494-503`: the button becomes the 44-px hit box and
an inner span draws the pill (same box on desktop):
```
<button type="button" onClick=... aria-label={`Прибрати фільтр «${v}»`}
  className="group -my-1 flex h-11 min-w-0 max-w-full cursor-pointer items-center lg:my-0 lg:h-9">
  <span className="flex h-9 min-w-0 max-w-full items-center gap-2 rounded-[60px] border border-stroke-default px-[15px] text-[14px] font-medium leading-5 text-neutral-900 transition-colors duration-200 group-hover:border-brand group-hover:text-brand lg:text-button-md lg:leading-[22px]">
    <span className="min-w-0 truncate">{value}</span>
    <XMarkIcon className="size-4 shrink-0" />
  </span>
</button>
```
- Phone label 14/20 Medium (master chips); desktop 16/22 Medium restored
  with `lg:text-button-md lg:leading-[22px]` (gotcha 2: the phone
  `leading-5` would leak into the token otherwise).
- One line, ellipsis: the long option (437.4 px) becomes a 272 / 342 pill
  instead of a 3-line spill (V02, catalog-b2b F7). The full value stays in
  the aria-label.
- The `-my-1 h-11` box keeps the 36 + 8 rhythm visually and gives 44-px
  targets without overlapping the next row.
- "Скинути фільтрацію" text button `CatalogClient.tsx:505-512` gets
  `h-11 lg:h-auto` (44 hit) and phone 14/20: `text-[14px] font-medium
  leading-5 lg:text-button-md lg:leading-[22px]`; colour #4a4a4c as today.

### 2.10 Results area: row B (count + view switch) and row C (sort) (TR-11, D4)

(SYSTEM critique round 1, S20: on phones rows B and C are replaced by the
T2 meta line `relative flex flex-wrap items-center justify-between
gap-x-4` = "Знайдено N товарів" `text-[14px] leading-5 text-neutral-500`
(`aria-live="off"` while an overlay is open) left + SortMenu (no prefix)
right, 44 tall, 16 under row A (or the chips), list 24 below; toolbar 52
+ 16 + 44 = 112. The desktop parts below (`max-lg:hidden` on the desktop
count and the sort + per-page group) stay.)

Results row `CatalogClient.tsx:517`:
`mt-8 flex flex-wrap items-center justify-between gap-4 lg:mt-12`
-> `mt-4 flex flex-col gap-2 lg:mt-12 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4`.

Children:
1. Row B (new, phone only):
   ```
   <div className="flex items-center justify-between gap-4 lg:hidden">
     <p aria-live="polite" className="min-w-0 text-body-sm font-medium text-neutral-900">Знайдено {n} {productsPlural(n)}</p>
     <ViewSwitch className="lg:hidden" ... />   // 104 x 52, pill r32, two 52 buttons
   </div>
   ```
   14/20 Medium #1d1d1f ("Знайдено 132 товари" 141.5 px, room 230 at 390 /
   160 at 320).
2. Row C (new, phone only): `<TextDropdown variant="phone" label="Сортування" ... className="lg:hidden" />` (2.16).
3. The desktop `<p>` (`:518`) gets `max-lg:hidden` and `aria-live="polite"`.
4. The desktop sort + per-page group (`:521`) gets `max-lg:hidden`: the
   per-page control disappears on phones (D4, V18).

Row A -> B 16, B -> C 8, C -> list 24. Toolbar height without chips: 52 +
16 + 52 + 8 + 44 = 172 (today 244, V08). With 0 results the view switch
and row C are hidden (`paged.length === 0`), the count stays (V17).

### 2.11 Product grid (D3, TR-16, blog card 3176:5541)

Grid wrapper `CatalogClient.tsx:563`: base `pt-12` -> `pt-6` (C -> first
card 24); every `lg:pt-*` of both modes stays; `scroll-mt-[96px]` stays
(desktop). `gap-12` (list -> load-more 48) stays.

Phone list (JS-gated, see 2.19): when `isPhone === true` render a flat list
instead of the rows of four:
```
<ul role="list" aria-label="Товари" className="flex flex-col gap-6">{phoneItems.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}</ul>   {/* SYSTEM critique round 1 */}
```
Keys are product ids, so appending a batch never remounts the cards above
(today's row keys `${current}-${ri}` would remount every row on a page
change). Desktop keeps the rows: `CatalogClient.tsx:586` `flex flex-col
gap-12 lg:gap-20` -> `flex flex-col gap-6 lg:gap-20`; row `:590`
`grid grid-cols-1 gap-12 sm:grid-cols-2 lg:flex lg:gap-[39.5px]` -> `grid
grid-cols-1 gap-6 lg:flex lg:gap-[39.5px]` (the `sm:grid-cols-2` only ever
matched 639.98-640, V09).

Card anatomy on phones (ProductCard, `ProductCard.tsx:300-348`):

| Piece | Phone classes | Desktop restore | Rule |
|---|---|---|---|
| article `:306` | `group/card @container flex h-full flex-col rounded-[32px] border border-neutral-800` | `lg:gap-8 lg:rounded-none lg:border-0 lg:py-6` (today `gap-8 py-6` unprefixed: move both to lg) | D3 / TR-16: Blog card shell, 1-px #343435 ring r32 |
| photo link `:315-319` | `relative block h-[206px] w-full shrink-0 overflow-clip rounded-[32px] bg-bg-product max-lg:-mt-px` + `aria-hidden tabIndex={-1}` | `lg:aspect-[655/656] lg:h-auto lg:rounded-[40px]` | blog card photo 342 x 206 r32, image under the top ring (BlogCard.tsx:26); photo box #d5d5d5 = the studio backdrop of product-shampoo.png (sampled 213/213/213), so `object-contain` shows no bands and never crops (D3) |
| img `:320-326` | unchanged `absolute inset-0 size-full object-contain` (+ grayscale when out) | - | |
| SaleChip `:327` | unchanged `absolute right-6 top-6` (24 into the photo) | - | TR-14 keep badge look |
| content `:330` | `flex flex-1 flex-col gap-6 px-[23px] pb-[23px] pt-6` | `lg:gap-8 lg:p-0` | D3 content px 24 pt 24 pb 24 (23 + ring, strokes inside, gotcha 13) -> inner 294 at 390 |
| stack `:331` | `flex flex-col gap-3` | `lg:gap-4` | card title -> body 12 (D10) |
| StatusLine | `<StatusLine out={out} compactOnPhone />` -> 12/20 Medium uppercase | 14/24 at lg | eyebrow 12/20 (D9); "В НАЯВНОСТІ . РОЗДРІБНА ЦІНА (i)" = 208 px, one line from 320; "НЕМАЄ В НАЯВНОСТІ" wraps at 320/360 with the dot travelling (existing rule) |
| title `:333-335` | h3 `text-title-lg text-neutral-900 max-lg:line-clamp-2 max-lg:[text-wrap:pretty]`; Link `max-lg:-my-[6px] max-lg:block max-lg:py-[6px]` | - | Title Large 22/28, 2 lines max (283 px: 1 line at 390, 2 at 360/320); the padded link is 40 tall without moving layout; `text-wrap: pretty` fixes the 320 orphan (V22) |
| chips `:336` | ChipsRow (SN-C2 phone 14/20) | - | 36 chips, gap 8, wrap: "40 мл" + "ALDA hotel cosmetics" = 253 > 224 -> 2 rows at 320 |
| desktop price row `:341-344` | add `max-lg:hidden` | unchanged | |
| phone price block (new) | see below, `lg:hidden` | - | D3 |

Phone price block (new, inside the content column after the stack):
```
<div className="flex flex-col gap-4 lg:hidden">
  <div className="flex flex-wrap items-baseline gap-x-2">
    <span className={`whitespace-nowrap text-[30px] font-bold leading-9 tracking-[-0.6px] ${sale ? "text-brand" : "text-neutral-900"}`}>{formatPrice(price)}</span>
    {sale && oldPrice !== undefined && <s className="whitespace-nowrap text-[14px] leading-5 text-neutral-500">{formatPrice(oldPrice)}</s>}
  </div>
  <div className="flex items-center justify-between">
    <QtyStepper qty={qty} onQty={setQty} disabled={out} />
    <CartButton product={product} out={out} qty={qty} phoneBrand onAdded={() => setQty(1)} />
  </div>
</div>
```
- Price Stat 30/36 Bold -0.6 (Cases stat 3094:5169, D3): "31,65" 95.3,
  "24,50" 102.0, "4 736,25" 139.7 px. Old price 14/20 line-through #777779
  on the same baseline (D3; the desktop compact card hides it).
- Action row 52: stepper (TR-15, SN-C1: 40 hit boxes, count 16/22 Bold)
  left, 52 cart disc right. `CartButton phoneBrand` = brand fill + white
  glyph on phones (`max-lg:border-brand max-lg:bg-brand max-lg:text-white`,
  not when out of stock: the grey #e8e8e9 inert disc stays). Touch has no
  hover, so the desktop "hover turns brand" affordance becomes the phone
  default (TR-32).
- Cart disc x 290..342, stepper glyph "-" at x 48 (hit 36..76).

Card height at 390: photo 206 (it covers the top ring) + 24 + status 20 + 12
+ title 28 + 12 + chips 36 + 24 + price 36 + 16 + action 52 + 23 + ring 1 =
490; 518 at 360 / 320 (2-line title). Cards 24 apart (D3) -> 10 cards =
5116 px (today 20 x 660).
At 600 the card is 552 wide: the 206-tall photo shows the 206-px square
photo centred on its own #d5d5d5 backdrop (no visible letterbox, F8 / V09
at 600 resolved by the shorter box).

Out of stock (ST13): status "НЕМАЄ В НАЯВНОСТІ" #d92d20, grayscale photo,
stepper disabled (#a5a5a5 glyphs), grey 52 disc, no brand fill. Promo:
SaleChip on the photo, brand price, struck 14/20 old price.

### 2.12 List view rows (D3 "compact row", TR-08)

`ProductRow` `ProductCard.tsx:355-409`, phone result (390):
```
| [96 photo r24] 16 [status 12/20      ]   |
|                   [name 16/22 Bold, 2l]   |
|                   [meta 14/20 #777779 ]   |
| 16                                        |
| [price 22/28 / old 14/20]   [- 1 +] 16 [cart 52] |
```
- Row padding `py-6` unchanged; hairline `:406` unchanged (#d2d2d2, -mt-px).
  List wrapper `CatalogClient.tsx:576` `flex flex-col` -> `flex flex-col
  max-lg:border-t max-lg:border-stroke-subtle` so the first row also sits
  between lines (D3 "between 1-px #d2d2d2 lines").
- Photo `:369` unchanged (`size-[96px] rounded-[24px] ... sm:size-[120px]`,
  r24 for 96+ tiles, D5) + `aria-hidden tabIndex={-1}` (one tab stop per
  row, F17).
- Stack `:381` `flex min-w-0 flex-1 flex-col gap-4` -> `flex min-w-0 flex-1
  flex-col gap-1 lg:gap-4`.
- Status: `<StatusLine out={out} compactOnPhone noteOnPhone={false} />` ->
  availability only on phones (12/20 uppercase); the "роздрібна ціна (i)"
  note and its dot are hidden below 640 (every public price is retail; the
  wrapped 2-line status with an orphan dot was V11).
- Title `:383`: h3 `text-title-sm text-neutral-900 max-lg:line-clamp-2
  lg:text-title-lg` (16/22 Bold +0.16 on phones; `text-title-lg` cannot be
  used on phones because its unlayered phone rule wins over utilities,
  gotcha 1; at lg the token restores 24/28 600 -0.02em: title-sm sets no
  `--tw-*` vars). Link `max-lg:-my-[9px] max-lg:block max-lg:py-[9px]` (40
  tall). "Шампунь для волосся і тіла" = 222 px: 1 line from 390, 2 at 320 /
  360.
- Chips `:386`: `<ChipsRow product={product} className="max-lg:hidden" />`
  (SN-C2 adds `className`) and a phone meta line
  `<p className="text-body-sm text-neutral-500 lg:hidden">{chips.join(", ")}</p>`
  ("40 мл, ALDA hotel cosmetics" ~185 px: 1 line at 390, 2 at 320; ASCII comma
  separator, no glyph). The
  card chips are inert spans that look tappable (F18), the meta line is
  honest and fits 160 (V01).
- Desktop cluster `:391` unchanged (`hidden ... sm:flex ...`).
- Phone cluster `:401-404` replaced:
  ```
  <div className="mt-4 flex items-center justify-between gap-4 lg:hidden">
    <div className="flex min-w-0 flex-col">
      <span className={`whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] ${sale ? "text-brand" : "text-neutral-900"}`}>{formatPrice(price)}</span>
      {sale && <s className="whitespace-nowrap text-[14px] leading-5 text-neutral-500">{formatPrice(oldPrice)}</s>}
    </div>
    <div className="flex shrink-0 items-center gap-4">
      <QtyStepper qty={qty} onQty={setQty} disabled={out} />
      <CartButton product={product} out={out} qty={qty} phoneBrand onAdded={() => setQty(1)} />
    </div>
  </div>
  ```
  Amount 22/28 SemiBold (D9 amounts). Widths at 320: price 73.5 + 16 +
  stepper 76 + 16 + 52 = 233.5 <= 272 (with a 3-digit qty 251.5); the cart
  disc always ends at the content edge (x 366 at 390, 296 at 320): fixes
  V01 / F1 (the "+" at x 329..345 and the brand chip at 331 off a 320
  screen), V11 / F14 (two left edges, cart jumping to its own line) and
  catalog-b2b F03 for the shared pattern.
- Row height at 390: 24 + 96 + 16 + 52 + 24 = 212 (320: 24 + 112 + 16 + 52
  + 24 = 228). Today 332 / 372.

### 2.13 Load-more and counter (D4, TR-12, blog 3176:5601)

- Phone batch = 10 cards (D3). SYSTEM critique round 1 (A29): phones keep
  the shown count in their own `n` param (multiple of 10, 10 omitted);
  `page` stays desktop-only (2.19).
- After the list (inside the grid wrapper, so `gap-12` = 48 above it):
  `<LoadMore shown={shown} total={filtered.length} onMore={more} focusAfterLast={() => firstNewTitleLink()} className="lg:hidden" />` (SYSTEM critique round 1, A9: no `moreRef`; the counter is not live)
  (SN-C4 = dashboard SN-06): counter "Показано 10 із 132" 14/20 #777779
  `role="status" aria-live="polite"`, 16, Button/Small with the plus disc
  "Показати більше" (129 + 46 + 8 + 42 = 225 x 42, centred). Rendered only
  when `filtered.length > 10`; the whole block disappears when everything
  is shown (SYSTEM A-5: no counter after the last batch).
- Desktop pager `CatalogClient.tsx:624-626` gets `max-lg:hidden` (V06, V16,
  F11; catalog-b2b F07).
- `more()`: `n + 10` into the URL (`writeListParams`, A29), focus stays
  on "Показати більше"; when the button unmounts (last batch) LoadMore
  focuses the first new card's title link via `focusAfterLast` (A9; F17).
- Bottom: the grid wrapper's `pb-[60px]` gives 60 to the footer (TR-12).

### 2.14 Empty state (TR-24, F-report V17)

When `filtered.length === 0`:
- Phone block (new, `lg:hidden`), shared atom SN-C7 (= dashboard SN-05
  PanelEmptyState, used here on white without a panel):
  title "За запитом нічого не знайдено." (Title Large 22/28, 327 px: 1
  line at 390, 2 at 320), 16, text "Спробуйте змінити пошук або фільтри."
  (Body Small 14/20 #777779, max 294), 32, `<Button size="small"
  onClick={resetAll}>Скинути пошук і фільтри</Button>` (233 x 42; new
  string, see 7.6). Root `flex flex-col items-center px-6 py-12
  text-center`. `resetAll` clears the query and every filter.
- The desktop paragraph `CatalogClient.tsx:572` gets `max-lg:hidden`.
- Row B keeps "Знайдено 0 товарів" (live region), the view switch and row
  C are hidden, no load-more.

### 2.15 Filters sheet (D7, TR-09, TR-10, TR-18, TR-28; menu master 3117:13578)

Full-screen sheet on phones; the desktop right-side drawer (baseline
`shop-1710-catalog-filters`) stays byte-identical.

Layer `FiltersDrawer.tsx:168`: `fixed inset-0 z-40 ...` -> `fixed inset-0
z-[60] max-lg:h-dvh lg:z-40 ...` (above the z-50 header, D7; `h-dvh` keeps
the footer above the mobile URL bar). Scrim `:172-178` unchanged (it fades
under the sheet).

Aside `FiltersDrawer.tsx:180-191`: drop the inline `style={{ top: ... }}`
and use classes (same computed value on desktop):
```
absolute bottom-0 right-0 top-0 flex w-full flex-col overflow-y-auto overscroll-contain bg-white px-6
transition-[opacity,translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] motion-reduce:transition-none
lg:top-[var(--site-header-h,92px)] lg:w-[502px] lg:max-w-[92vw] lg:gap-16 lg:rounded-tl-[48px] lg:border-l lg:border-t lg:border-stroke-subtle lg:pb-20 lg:pl-[59px] lg:pr-20 lg:pt-[59px]
open:   opacity-100 translate-y-0 lg:translate-x-0
closed: opacity-0 -translate-y-3 lg:opacity-100 lg:translate-y-0 lg:translate-x-full
```
Notes: today's unprefixed `gap-10 py-10 max-w-[92vw] w-[502px]
rounded-tl-[48px] border-l border-t` all move to `lg:` (desktop keeps
`lg:gap-16` etc. exactly as today: `py-10` was overridden by `lg:pb-20
lg:pt-[59px]` already; `gap-10` by `lg:gap-16`). Phone motion = the menu's
opacity + translateY(-12) 400 ms (TR-09); desktop slide unchanged
(opacity stays 1 at lg).

Children, top to bottom:
1. Bar (sticky, 66; master menu bar): today's title row `:192` becomes
   `sticky top-0 z-[1] -mx-6 flex h-[66px] shrink-0 items-center justify-between bg-white px-6 lg:static lg:mx-0 lg:h-auto lg:w-full lg:px-0`.
   - h2 `:193`: `text-title-lg text-neutral-900 lg:text-h2 lg:leading-[48px] lg:tracking-[-0.88px]`
     (phone 22/28 SemiBold -0.44 = sheet title, D9; desktop 44/48 Bold
     -0.88 exactly as today: `lg:text-h2` brings weight 700 because
     title-lg sets no `--tw-font-weight`).
   - Close `:196-204`: `-mr-3 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:mr-0 lg:size-8 lg:rounded-none`,
     glyph `XMarkIcon className="size-6 lg:size-8"` -> 24 cross at x 342 in a
     48 hit box (master "clear" 3117:14330). Initial focus stays here.
   - The bar stays visible while the body scrolls (F7: today the title and
     the cross scroll away).
2. "Скинути фільтрацію" `:207-216`: add `max-lg:hidden` (on phones reset
   lives in the footer; the row no longer pushes the list down 64 px on
   the first tick, V15).
3. Sections wrapper (new): `<div className="flex flex-col pb-12 pt-6 max-lg:divide-y max-lg:divide-stroke-subtle lg:contents">`
   around the `sections.map` (`display: contents` on desktop keeps the
   aside's gap between the sections as today). Body starts 24 under the
   bar (TR-09 task sheet), groups are separated by 1-px #d2d2d2 lines
   (menu divider) with 40 + 8 = 48 visual above / below.
4. DrawerSection `:51` root `flex w-full flex-col` -> `flex w-full flex-col
   max-lg:py-10 max-lg:first:pt-0 max-lg:last:pb-0`.
   - Head `:56`: + `min-h-11 lg:min-h-0` (44 target; title Title Large
     22/28 + 24 chevron, TR-28; today 28 tall, V13 / F12).
   - Options column `:78` `flex flex-col gap-4 pt-6` -> `flex flex-col pt-[14px] lg:gap-4 lg:pt-6`.
   - Option `:88` + `min-h-11 py-[10px] lg:min-h-0 lg:py-0` -> 44-tall rows
     on a 44 pitch (24 checkbox + 8 + 16/22 Medium #343435, TR-10; a long
     label wraps to 64). Head -> first checkbox 24 visual.
   - "Показати більше" `:102-110`: + `min-h-11 lg:min-h-0`.
5. Footer (new, phone only, TR-18 + TR-10):
   ```
   <div className="sticky bottom-0 z-[1] -mx-6 mt-auto flex flex-col gap-3 border-t border-stroke-subtle bg-white px-6 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 lg:hidden">
     <p role="status" aria-live="polite" className="text-body-sm text-neutral-500">Знайдено {n} {productsPlural(n)}</p>
     <div className="flex gap-2">
       <Button size="small" variant="outlinedDark" fullWidth disabled={!hasActive} onClick={onReset}>Скинути</Button>
       <Button size="small" fullWidth onClick={onShow}>Показати</Button>
     </div>
   </div>
   ```
   Height 1 + 16 + 20 + 12 + 42 + 16 = 107 (+ safe area). Two flex-1 pills
   = 132 each at 320 ("Скинути" 111, "Показати" 119 needed). The result
   count line is the feedback the sheet lacked (V12, F7); "Показати N
   товарів" inside the button would need 204 px and does not fit a half
   row at 390 (167). Order secondary first, primary last (TR-04 / TR-10).
- New props: `FiltersDrawer({ ..., resultCount: number, onShow: () => void })`.
  `onShow` = close, then on the next animation frame scroll the window so
  toolbar row A sits 16 below the header:
  `window.scrollTo({ top: rowA.getBoundingClientRect().top + window.scrollY - 66 - 16, behavior: reduced ? "auto" : "smooth" })`.
- Behaviour: on phones a DRAFT (SYSTEM critique round 1, T5a / A4): ticks
  edit a draft seeded from the URL on open, the footer status counts the
  draft, any close (Показати, cross, Escape, Back) commits once in
  `onSettled` via `writeListParams`, then "Показати" scrolls in a rAF;
  desktop keeps the live apply. Kept: html scroll
  lock + restore (useModalBehavior), focus trap, Escape, focus back to the
  filter button, scrim tap (desktop), "Показати більше" per section,
  collapse via the head (grid 0fr/1fr, inert when collapsed).
- At 320 x 568: bar 66 + body 395 + footer 107. Sheet scrollHeight ~1300
  for 21 options; bar and footer stay put.
- Android back closes the sheet: only if the shared layer adopts SN-C8
  (open point 7.3); otherwise the system back leaves the page as today.

### 2.16 Sort menu (TR-11; checkout select menu 4329:41044)

(SYSTEM A12: row C is the shared SortMenu with `prefix`; TextDropdown keeps
only its desktop variant. The trigger, panel, 44-px rows and flip rule below
are the SortMenu rules.)

`TextDropdown` gains `variant: "inline" | "phone"` (default "inline" =
today) and `className` on its root.

Phone variant, root `relative flex h-11 w-full items-center lg:hidden`:
- Trigger: `flex h-11 cursor-pointer items-center gap-1 text-body-sm
  font-medium focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-brand` with `<span className="text-neutral-500">
  Сортування:</span><span className={open ? "text-brand" :
  "text-neutral-800"}>{value}</span><ChevronDown16 className="size-4 ...rotate"/>`.
  14/20 Medium; "Сортування: за популярністю" = 86.1 + 4 + 112.5 + 16 = 219
  <= 272. 44 tall (today 147 x 22, V13).
- Panel: `absolute inset-x-0 z-30 overflow-clip rounded-3xl bg-white
  shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)] transition-[opacity,translate]
  duration-[240ms] motion-reduce:transition-none` + `top-full mt-2` or,
  flipped, `bottom-full mb-2`; full content width (342 / 272).
- List `ul.divide-y divide-stroke-subtle`, option `flex h-11 w-full
  cursor-pointer items-center px-4 text-left text-[16px] font-medium
  leading-6` + `text-brand` when selected else `text-neutral-800`; 3 x 44
  + 2 = 134 tall.
- Flip rule (V07, F10): on open read the trigger rect; if
  `innerHeight - rect.bottom < 134 + 8 + 16` and `rect.top - 66 > innerHeight - rect.bottom`,
  open above; else below. Never below the fold.
- Keyboard, listbox semantics, outside press, Escape and focus return are
  the existing TextDropdown logic (`:111-237`), shared by both variants.
- Per-page selector: not rendered on phones (D4).

### 2.17 Add to cart and stepper

- Stepper "+/-" (SN-C1): 40 x 40 hit boxes around the 16 glyphs, count
  16/22 Bold on phones (TR-15). Card qty survives until the add; after a
  successful add the card's qty returns to 1 (`CartButton onAdded`, F16).
- Cart disc: `add(id, qty)` with `show = true` as today: the cart opens
  (its phone layout is the cart area's; F9 is theirs). Whether phones
  should keep opening the cart on every add is open point 7.4.
- Focus returns to the card cart disc when the cart closes (works today).

### 2.18 Loading, long content, images

- Loading: `<Suspense fallback={<div aria-busy className="min-h-[100dvh]" />}>`
  around CatalogClient (`CatalogPageView.tsx:151`) so the footer does not
  jump up during the production client render; no skeleton visuals (no
  master).
- Product images: `loading="lazy"`; the #d5d5d5 photo box shows while
  loading; on `error` hide the img (`onError={(e) => (e.currentTarget.style.visibility = "hidden")}`)
  so no alt text paints into the box.
- Long content rules: card title clamp 2 + pretty wrap; list name clamp 2;
  applied chip one line with ellipsis; back crumb ellipsis; zone / carousel
  labels wrap on word boundaries only (max 3 lines = 66 in a 206 tile);
  prices `whitespace-nowrap` (4-digit price 139.7 fits); stepper count
  `min-w-7 whitespace-nowrap` (existing) grows for 3 digits; the search
  input scrolls its text.

### 2.19 State in the URL, phone detection, back navigation (F3)

- `view` (`list`; absent = cards), `sort` (`name` | `price`; absent =
  popularity, mapped to SORT_OPTIONS), `q` (search text, written with a
  300-ms debounce), `page` (desktop page / phone batches) live in the URL;
  `pageSize` stays local (desktop only). One helper
  `replaceParams(patch)` builds the next URLSearchParams FROM the current
  one (unknown params such as a future `mine` are preserved) and calls
  `window.history.replaceState(null, "", url)` (SYSTEM critique round 1:
  this helper IS A29 `writeListParams`; no RSC request per tap or
  keystroke). Phone batches use `n`, desktop pages `page` (A29).
- `applyFilters` (`CatalogClient.tsx:306-313`) keeps q / view / sort and
  deletes `page`. The render-phase page reset (`:299-304`) keys on the
  filter values only (`zone|type|brand`), not on the whole query string.
  Sort, view and search changes delete `page`.
- `useIsPhone()` (SN-C9): `null` during SSR / hydration, then the
  `(max-width: 639px)` match. Phone items = `filtered.slice(0, 10 * page)`
  when `isPhone === true`, else today's desktop slice. Items 1-10 are the
  same in both slices, so the hydration switch only trims cards below the
  fold.
- Back from a PDP restores view, sort, search, the number of batches and
  (via Next's scroll restoration on the same URL) the scroll position on
  the same items.
- `goTo` (`:391-394`) uses `behavior: "auto"` under
  `prefers-reduced-motion` (F17).
- Root vocabulary: `zone` accepts nothing on `/catalog` (no zone group in
  the root sheet; F19): `vocab.zone = direction ? direction.facet.options : []`.

---------------------------------------------------------------------

## 3. Bugs to fix (both lenses merged, deduplicated)

Severity: B = blocker, M = major, m = minor, n = nit. Owner "area" =
fixed in this area's files; "shared" = section 4; "cart" etc. = other area.

| id | sev | src | where | what | fix | file:line | owner |
|---|---|---|---|---|---|---|---|
| CB-01 | B | V01, F1 | list view, 320, every route | sale row price + stepper 321 px in 272: "+" at x 329-345 and the brand chip to 331 are off-screen, unreachable | new phone row cluster (price column + stepper + cart right-aligned, 233.5 px at 320), chips -> meta line on phones | ProductCard.tsx:237, 401-404, 100-108 | area |
| CB-02 | M | V02 (b2b F7) | applied chips, all phone widths | long option wraps 2-3 lines inside a fixed 36-px pill, text spills over the border | chip = 44 hit button + 36 pill span, `max-w-full`, label `truncate`, 14/20 | CatalogClient.tsx:494-503 | area |
| CB-03 | M | V03, F4 | /catalog/hotels carousel, 320 / 360 | fixed 320 tile in a 272 / 312 track: 48 / 8 px cut, arrow disc sliced, snap cannot align | tile `w-[min(280px,calc(100vw-72px))] h-[206px]` | SubcategoryCarousel.tsx:89 | area |
| CB-04 | M | V04, F5 | carousel, 390+ | zero peek (344 > 342), no cue that 7 more exist; tiles cut flat at the gutters | full-bleed track `-mx-6 px-6 scroll-px-6 gap-4`, 70-px peek at 390 | SubcategoryCarousel.tsx:77 | area |
| CB-05 | M | V05 | /catalog banners, 320 | label column 116: "індивідуально|го" split mid-word (global overflow-wrap anywhere) | 24 padding below 360 (column 148), inline `overflowWrap: "normal"` on the label | ZoneCard.tsx:158, 213 | area |
| CB-06 | M | V06, V16, F11 (b2b F07) | pager, 320 and the language | 7 x 40 + gaps = 304 > 272 wraps; 40-px numbers off-language | load-more (SN-C4) on phones, pager `max-lg:hidden` | CatalogClient.tsx:623-663 | area + shared |
| CB-07 | M | V07, F10 (b2b F21) | sort / per-page popups | `absolute top-full` never flips: 102 of 132 px below the fold; 38-px options | phone TextDropdown variant: full-width r24 panel, 44 rows, flip rule; per-page hidden | CatalogClient.tsx:187-231 | area |
| CB-08 | M | V08 (b2b F13) | toolbar | 5 stacked rows, 244 px, controls left-packed with an empty right half | rows A (search + filter) / B (count + view) / C (sort): 172 px | CatalogClient.tsx:413-548 | area |
| CB-09 | M | V09, F8 (b2b F15, F24) | grid | one 612-px unbordered card, pitch 660, 13 200 px per 20; 552-wide letterbox at 600 | D3 card (490, pitch 514), 10 per batch | ProductCard.tsx:306-344, CatalogClient.tsx:586-590 | area |
| CB-10 | M | V10 | first viewport | no product above the fold (1360 / 894 / ~1010) | head 48/48, 206 media, 172 toolbar: first card at 754 / 796 on direction / category; root keeps the banners first (by design) | CatalogPageView.tsx:113-148 | area |
| CB-11 | M | V11, F14 (b2b F03) | list rows | 2 left edges, wrapped status with orphan dot, chips one per line, cart floats / drops to its own line, row 332-372 | 2.12 row (212 / 228), status availability-only, meta line, cart pinned right | ProductCard.tsx:363-404 | area |
| CB-12 | M | V12, F7, V15 (b2b F6, F20) | filters sheet | 92vw desktop sheet: no result feedback, title + X scroll away, 26-35 px scrim strip as the only close, r48, inert header still visible, reset row pushes content | full-screen TR-09 sheet: sticky 66 bar, sticky footer with count + "Скинути" / "Показати", z-60 over the header | FiltersDrawer.tsx:165-226 | area |
| CB-13 | M | V13, F6, F12 (b2b F3, F13) | tap targets | stepper 16 x 16, sort 147 x 22, per-page 38 x 22, options 38, checkbox rows 24, section heads 28, sheet X 32, pager 40, crumb links 22, title links 28-30 | stepper 40 (SN-C1), sort 44, options 44, rows 44, heads 44, X 48, pager gone, single 40 back crumb, title links 40, chips 44 hit | ProductCard.tsx:146-168; CatalogClient.tsx:153-231; FiltersDrawer.tsx:52-110, 196-204 | area + shared |
| CB-14 | M | F2, V21 | every card near the bottom of the screen | the ScrollUpDock CornerFab (x 270-370, y 724-824) sits over the card cart disc: a tap scrolls to top instead of adding | shared ScrollUpDock change on shop canvases (SN-C6); area verifies `elementFromPoint` | ScrollUpDock.tsx:55-56, 290-364 | shared |
| CB-15 | M | F3 (b2b F8) | back from a PDP / reload | page / sort / view / search reset but the old scrollY is restored: user lands among other products | URL state (2.19) | CatalogClient.tsx:268-313 | area |
| CB-16 | m | V14, F13 (b2b F11, F14) | crumbs | 2-4 line crumb rows with a dangling "/", direction crumb is a plain span, back disc goes to "/" from a category | phone = one back crumb to the parent (2.3) | CatalogPageView.tsx:113-130, 57-63 | area |
| CB-17 | m | V17 (b2b F22) | empty result | one grey paragraph, sort + per-page stay, no action | TR-24 block + "Скинути пошук і фільтри"; hide view + sort at 0 | CatalogClient.tsx:571-574 | area + shared |
| CB-18 | m | V18 | category | per-page selector shown while everything fits one page | per-page not rendered on phones (D4) | CatalogClient.tsx:538-546 | area |
| CB-19 | m | V19 | radii / heights | photo r40 / 328, banners 220, carousel 220, hero 240, crumb -> H1 32 | 206 media everywhere, photo r32, crumb -> H1 48 | ProductCard.tsx:318, CategoryBanners.tsx:193, SubcategoryCarousel.tsx:89, CatalogPageView.tsx:90, 113 | area |
| CB-20 | m | V20, F15 | search | no clear button, no `enterkeyhint`, Enter keeps the keyboard, no role=search, query not in the URL | form role=search, clear button (phone), enterKeyHint, blur on submit, `q` param | CatalogClient.tsx:414-427 | area |
| CB-21 | m | F16 (b2b F19) | card stepper | qty stays after an add; the next tap adds it again | `onAdded -> setQty(1)` | ProductCard.tsx:301, 343, 403 | area |
| CB-22 | m | F17 | a11y | count change not announced; focus left on the pager; photo + title = two tab stops; smooth scroll ignores reduced motion | aria-live counts, focus first new card on load-more, photo link `aria-hidden tabIndex=-1`, reduced-motion `auto` | CatalogClient.tsx:391-394, 518; ProductCard.tsx:315-335, 366-370 | area |
| CB-23 | m | F9 (b2b F11), code-recipes 6b | cart drawer opened from a card, 320 x 568 / 375 x 667 | list viewport 76 / 175 px; the 32 X overlaps "Очистити" by 24 x 9 px | not fixed here: cart area (full-screen cart sheet, D7 / TR-19) | CartDrawer.tsx:306, 325, 340 | cart |
| CB-24 | m | F20 | /catalog/unknown, /catalog/hotels/unknown, unknown product | English default Next 404, system font, no way back | shared `src/app/not-found.tsx` (SN-C10) | (missing file) | shared |
| CB-25 | n | F18, V24 | cards | info glyph after "роздрібна ціна" and the inert chips look tappable | glyph `aria-hidden`, no pointer; chips stay spans (no hover on touch; list rows use a meta line) | ProductCard.tsx:75, 100-108 | area |
| CB-26 | n | F19 | `/catalog?zone=...` | root shows a zone chip the root sheet cannot untick | root `vocab.zone = []` | CatalogClient.tsx:281-288 | area |
| CB-27 | n | V22 | card title, 320 | one-word orphan "тіла" | `max-lg:[text-wrap:pretty]` (+ clamp 2) | ProductCard.tsx:333 | area |
| CB-28 | n | V23 (b2b F22) | page change | grid lands 192 below the top (scroll-margin 96 + scroll-padding 96) | phones: no page jumps any more (load-more); filter "Показати" scrolls with an explicit 66 + 16 offset; global 96 -> 66 on phones is shared (SN-C11, optional) | CatalogClient.tsx:393, 563 | area / shared |
| CB-29 | m | F7 (part) | sheet + Android back | system back leaves the page instead of closing the sheet | shared `useSheetHistory` for every TR-09 sheet (SN-C8) or accepted as is (open point 7.3) | FiltersDrawer.tsx:156-162 | shared |

Rejected / not this area's bug (kept for the record):
- V-report "first banner shows its hover ring": Playwright mouse artefact
  (probe-hover.mjs: ring opacity 0 under hover:none). Not a bug.
- F-report "tap on the sheet X after a CDP drag only focuses it":
  reproduced only with two mixed CDP touch streams (debug-closex2.mjs). Not
  a bug.
- V-report footer note "r32 top corners invisible because <footer> is
  #2d2d2f" (Footer.tsx:56-63): shell-public / frozen landing footer, not
  this area.
- V-report proposal "2 columns from 480 px" and "stepper moves to the
  drawer": overruled by D3 (one column at every phone width, stepper on
  the card).
- V-report proposal "sort opens a bottom sheet": overruled by D13 (no
  bottom sheets) and TR-11 (anchored panel).
- V-report proposal "carousel counter / dots": overruled by D11 (no dots).
- V-report "drop the hero / show a 52 thumb": overruled by TR-30 (342 x 206
  cover).
- Scrollbar / clippedText flags on the banner blob and the footer ring
  (domChecks): intentional decor.

---------------------------------------------------------------------

## 4. Shared needs

| id | Atom / API | Status | Needed for |
|---|---|---|---|
| SN-C1 | `QtyStepper` (ProductCard.tsx:120-172) TR-15 hit boxes, all sizes, all widths, pixel-neutral: both buttons `relative -m-3 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default ${btn}` (40 box, -12 margins = the old 16 footprint, so the row layout does not move); count for `size="md"` `text-title-sm lg:text-title-lg` (phone 16/22 Bold +0.16, TR-15; desktop 24/28 600 -0.02em unchanged because title-sm sets no `--tw-*`); `size="sm"` (cart) unchanged unless the cart spec asks. Consumers: catalog card / row, B2B card / row, PDP hero + BoughtTogether, cart drawer, stock modal, checkout | exists, needs change (shared, before the catalog build) | CB-13, D3, D8 |
| SN-C2 | `ChipsRow` (ProductCard.tsx:87-111): new `className?: string` on the root; chip phone typography `text-[14px] font-medium leading-5 lg:text-button-md lg:leading-[22px]` (master chips 14/20, catalog-b2b F19) + `max-w-full` and the label in `<span className="min-w-0 truncate">`. Consumers: catalog card / row, B2B card / row, cart drawer, BoughtTogether | exists, needs change (shared) | 2.11, 2.12 |
| SN-C3 | `BackCrumb` / `BackCrumbBody` (ui/Breadcrumb.tsx:19-41) phone truncation: Link `min-w-0` (callers pass `max-w-full`), label `min-w-0 max-lg:truncate` (keeps `whitespace-nowrap` on desktop). Not used by the landing (blog has its own copy) | exists, needs change (shared) | 2.3, ST17 |
| SN-C4 | `LoadMore` = dashboard SN-06 (`src/components/ui/LoadMore.tsx`): `{ shown, total, onMore, onLess?, className?, moreRef? }`, root `flex flex-col items-center gap-4`, counter `<p role="status" aria-live="polite" className="text-[14px] leading-5 text-neutral-500">Показано {shown} із {total}</p>`, `<Button size="small" plus>Показати більше</Button>` | new (shared) | 2.13 |
| SN-C5 | `FilterButton` (new, `src/components/ui/FilterButton.tsx`, extracted from materials/Hero.tsx:50-79): `{ count: number; expanded: boolean; onClick(); badgeDesktop?: boolean = false }`; button `relative flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] bg-neutral-900 text-white transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`; badge `absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[12px] font-semibold leading-none text-white` (+ `lg:hidden` unless `badgeDesktop`); aria-label "Фільтри" / "Фільтри, обрано N"; `aria-haspopup="dialog"`. Fallback: inline the same classes in CatalogClient | new (shared, optional) | 2.8 |
| SN-C6 | ScrollUpDock on shop canvases below 640 (F2, V21): the CornerFab must never cover a card's cart disc. Proposal: on `html:has([data-canvas="shop"])` phones show the FAB only after an upward scroll (scroll-direction gate, opacity-only like today; hidden while scrolling down and near the footer), and limit its pointer area to the 43-px disc (`pointer-events-none` on the ring). Landing behaviour unchanged (no data-canvas there) | exists, needs change (shell-public) | CB-14 |
| SN-C7 | `PanelEmptyState` = dashboard SN-05 (`platform/ui/PanelEmptyState.tsx`): `{ title, text?, icon?, action?, className? }`, root `flex flex-col items-center px-6 py-12 text-center`, title `text-title-lg text-neutral-900`, text `mt-4 max-w-[294px] text-body-sm text-neutral-500`, action `mt-8`. Used on white here (no panel). If the shared layer places it under `platform/ui`, the public catalog importing it is fine | new (shared) | 2.14 |
| SN-C8 | Sheet primitives for every TR-09 sheet (cart, auth, catalog filters, materials filters, preview): `SheetBar({ title, onClose, closeRef, className })` = `sticky top-0 z-[1] flex h-[66px] shrink-0 items-center justify-between bg-white px-6` + h2 `text-title-lg text-neutral-900` + close `-mr-3 flex size-12 items-center justify-center rounded-full text-neutral-900 focus-visible:ring-2 focus-visible:ring-brand` (XMark 24); `SheetFooter({ children, className })` = `sticky bottom-0 z-[1] mt-auto flex flex-col gap-3 border-t border-stroke-subtle bg-white px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]`; optional `useSheetHistory(open, onClose)` (pushState on open, popstate closes, close pops its own entry) for the Android back gesture. The catalog filters sheet keeps its own desktop markup and may use these for the phone bar / footer; the classes in 2.15 are the same strings | new (shared) | 2.15, CB-29 |
| SN-C9 | `useIsPhone()` (new, `src/components/ui/useIsPhone.ts`): `useSyncExternalStore(subscribe to matchMedia("(max-width: 639px)"), () => mq.matches, () => null)` -> `boolean | null` | new (shared) | 2.19 (also orders / assortment / materials load-more) |
| SN-C10 | Branded 404 (`src/app/not-found.tsx`): public shell, H1 40/42, Body Small text, Button/Small "На головну" + "До каталогу" (TR-03 / TR-04) | new (shared) | CB-24 |
| SN-C11 | (optional) phone anchor offset: `@media (max-width: 639px) { html { scroll-padding-top: 82px } }` scoped to shop / cabinet canvases (66 header + 16) | exists, needs change (shared, optional) | CB-28 |
| SN-C12 | Root layout `export const viewport = { viewportFit: "cover", themeColor }` (D12) so `env(safe-area-inset-bottom)` in the sheet footer is non-zero on notched phones | new (shared, D12) | 2.15 |
| SN-C13 | Button: nothing new. This area uses `size="small"` (load-more, sheet footer, empty state). No default-large Button is rendered by the catalog on phones | exists | - |

Fallbacks: SN-C4, SN-C5, SN-C7, SN-C9 can be implemented locally in
CatalogClient.tsx with exactly these classes if the shared layer has not
landed them, and swapped later with no visual change. SN-C1 and SN-C2 must
be done ONCE (they are imported by five areas).

---------------------------------------------------------------------

## 5. Files

Area files (catalog cluster; see 7.2 for the split with catalog-b2b):

| File | Change |
|---|---|
| `src/components/catalog/CatalogPageView.tsx` | PublicView head (gap 48, phone back crumb, desktop crumb row `max-lg:hidden`), carousel section `mt-12`, CategoryHero `h-[206px]`, Suspense fallback. (PlatformView / PlatformTitle belong to catalog-b2b.) |
| `src/components/catalog/CatalogClient.tsx` | URL state + `replaceParams`, `useIsPhone` list slicing, toolbar row A (form, clear button, filter badge), `ViewSwitch` extraction, chips 44/14px/truncate, results area rows B / C, `TextDropdown variant="phone"` with flip, flat phone list, grid gaps, list border-top, load-more, phone empty state, pager `max-lg:hidden`, reduced-motion goTo, root `vocab.zone = []`, `onShow` scroll, sheet `resultCount` |
| `src/components/catalog/FiltersDrawer.tsx` | full-screen phone sheet: layer z-60 + h-dvh, aside classes, sticky 66 bar, phone motion, sections wrapper, 44 rows / heads, phone footer, new props `resultCount`, `onShow` |
| `src/components/catalog/ProductCard.tsx` | ProductCard phone card (shell, 206 photo, content padding, phone price block, title clamp + 40 link), ProductRow phone row (status, title-sm, meta line, phone cluster), StatusLine props `compactOnPhone`, `noteOnPhone`, CartButton props `phoneBrand`, `onAdded`, info glyph aria-hidden. (QtyStepper + ChipsRow edits = SN-C1 / SN-C2, shared, done first.) |
| `src/components/catalog/SubcategoryCarousel.tsx` | full-bleed phone track, tile size, `phonePad="compact"` |
| `src/components/catalog/CategoryBanners.tsx` | row gap 16, banner height 206 |
| `src/components/catalog/ZoneCard.tsx` | `phonePad` prop, phone ring + padding, label `overflowWrap: normal` |

New files in this area: none (the new atoms are shared, section 4).

Audit helpers added by this spec (gitignored): `audit/mobile/catalog-b2c/spec-measure.mjs`, `spec-measure.txt`.

Not touched by this area: Header.tsx, Footer.tsx, ScrollUpDock.tsx,
ui/Button.tsx, ui/Breadcrumb.tsx, cart/*, B2BProductCard.tsx, product/*,
materials/*, globals.css, app/layout.tsx (all shared or other areas).

---------------------------------------------------------------------

## 6. Verification checklist (fresh verify agent)

### 6.1 Runs

Widths 320 x 568, 360 x 780, 390 x 844, 430 x 932, 600 x 960 (+ 639 x 900
for the last phone width); touch emulation (kit `openPhone`, hover:none);
seeds S0 and S1 (S1 must render identically to S0). Routes: `/catalog`,
`/catalog/hotels`, `/catalog/protect`, `/catalog/cleaning`,
`/catalog/hotels/hotelna-kosmetyka`, `/catalog/protect/<first category>`.

### 6.2 Measurements (390 unless stated)

| Check | Expected |
|---|---|
| Gutters | every block x 24 .. 366 (320: 24 .. 296; 600: 24 .. 576); carousel track 0 .. 390 with first tile at x 24 |
| Back crumb | one row, 40 tall at y 114; label "Головна" / "Каталог" / direction title; href "/", "/catalog", "/catalog/hotels"; never wraps; at 320 the protect / cleaning category label ends in an ellipsis inside 296 |
| H1 | y 202, 40/42 Bold -0.8 |
| Banners | 342 x 206, r40, 1-px #8e8e8f ring, 16 apart; label column 186 (390) / 148 (320); no word split (compare `innerText` line breaks: no line ends mid-word) |
| Carousel | tiles 280 x 206 (248 at 320), gap 16, peek 70 at 390 / 32 at 320 / 40 at 360; no tile clipped by the track at scrollLeft 0; snap aligns tile starts at x 24 |
| Hero | 342 x 206 r32 at y 334 (category) |
| Toolbar | row A 52: search 282 x 46 (r50, 16-px text) + 52 filter at x 314; row B count 14/20 Medium + view pill 104 x 52 right-aligned (x 262); row C sort trigger 44 tall, 14/20; first card top 754 (hotels) / 796 (category) / 1198 (root) |
| Filter badge | after ticking 2 filters: 20-px brand badge with "2" on the filter disc; aria-label "Фільтри, обрано 2" |
| Chips | 36-px pills inside 44-px buttons, 8 apart, 14/20 Medium; the long option is one line with an ellipsis, pill <= 342 (272 at 320) |
| Card | 342 wide, 1-px #343435 ring, r32; photo 340 x 206 r32 #d5d5d5 starting under the top ring; content inner 294; status 12/20; title 22/28 <= 2 lines; chips 36; price 30/36 Bold; action row 52 with stepper buttons 40 x 40 and a 52 brand disc at x 290; card 490 tall (518 at 320 / 360); cards 24 apart |
| List row | photo 96 r24; name 16/22 Bold <= 2 lines; meta 14/20 #777779; cluster: price 22/28 left, cart disc right edge at 366 (296 at 320); row 212 (228 at 320); 1-px #d2d2d2 lines above the first and below every row; nothing right of x 296 at 320 |
| Load-more | 48 below the last card: counter 14/20 #777779 "Показано 10 із 132", 16, button 225 x 42 centred; footer 60 below |
| Sort menu | panel 342 wide r24, rows 44, 3 options, selected brand; opened with the trigger in the lower 160 px of the viewport -> panel above the trigger, fully on screen |
| Filter sheet | covers 0..844 (above the header), bar 66 with "Фільтри" 22/28 SemiBold and a 48 close box with a 24 cross at x 342; body pt 24; groups split by 1-px #d2d2d2; heads >= 44; option rows 44; footer 107 + safe area with the count line and two 42 pills ("Скинути" disabled until a tick) |
| Empty | after searching "zzz": Title Large "За запитом нічого не знайдено.", Body Small text, Button "Скинути пошук і фільтри" 42 tall; no view switch, no sort row, no load-more |

### 6.3 DOM checks (kit `domChecks`) expected

- No `overflowX`, `offRight`, `offLeft`, `wideElement` at any width / view /
  state (today: offRight x12 in list view at 320).
- `smallTarget` (min 40): none in the catalog content. Allowed: the shared
  header logo (known false positive). Chips are 44, stepper 40, sort 44,
  options 44, sheet rows 44, close 48, back crumb 40, title links 40.
- `tinyText`: none (status / badge 12 = floor).
- `inputZoom`: none (search 16).
- `clippedText`: only intentional ellipsis / clamp entries (chip labels,
  back crumb label, line-clamped titles) and the banner blob / footer ring.
- `hScroller`: exactly one on direction pages (the carousel track); none
  elsewhere.
- No console errors, no hydration warnings (watch the `useIsPhone` switch).
- Duplicated controls by design: the view switch (`Вид картками` / `Вид
  списком`), the sort trigger and the results count exist twice (phone copy
  `lg:hidden`, desktop copy `max-lg:hidden`); scripts must target the
  visible one (`page.locator('button[aria-label="Вид списком"]:visible')`).

### 6.4 Flows

1. View switch: cards -> list -> cards; URL `view=list` toggles; reload
   keeps the view.
2. Sort: phone menu -> "за ціною": first card price 24,50; URL `sort=price`;
   focus returns to the trigger; Escape closes; outside tap closes.
3. Search: type "шамп" -> count updates (live region), URL `q=шамп` after
   300 ms; Enter blurs the input; the clear button empties it and
   refocuses; "zzz" -> empty state; its button resets query + filters.
4. Filters: open the sheet (focus on the close); tick "Ванна кімната" on
   `/catalog/hotels` -> footer count "Знайдено 11 товарів" (or the current
   number), badge 1, chip appears behind; scroll the sheet to the end (bar
   and footer stay); "Показати" closes and lands row A 16 below the
   header; focus on the filter button; html overflow restored; scrollY
   otherwise unchanged; "Скинути" in the footer clears and disables
   itself; Escape closes.
5. Applied chips: remove a chip; "Скинути фільтрацію" clears all; page
   resets to batch 1.
6. Load-more: `/catalog` 10 -> 20 -> ... -> 132 cards; counter updates;
   the button disappears at the end; focus lands on the first new card's
   title without a scroll jump; no card above re-mounts (images do not
   reload).
7. Back navigation: list + "за назвою" + 3 batches + scroll -> tap a
   product title -> Back: same view, sort, 30 cards, same scrollY over the
   same products.
8. Add to cart: tap "+" twice on a card (40 hit boxes, a tap 10 px off the
   glyph still counts), tap the brand disc -> cart opens with qty 3; close
   -> the card shows 1 again; header badge updated.
9. FAB: scroll down until a card's cart disc is in the lowest 120 px;
   `elementFromPoint` at the disc centre must be the cart button (after
   SN-C6); tapping adds to the cart.
10. Carousel: swipe / programmatic scroll snaps tile starts to x 24; a tap
    opens the category; a swipe at scrollLeft 0 does not trigger history
    back (`overscroll-behavior-x: contain`).
11. Root `/catalog?zone=Ванна кімната`: no chip, 132 products (zone
    ignored on the root).
12. 404: `/catalog/unknown` shows the branded not-found (after SN-C10).
13. Keyboard (desktop-width sanity of shared logic + phone with a
    keyboard): Tab order per card = title link, "-", "+", cart; sheet traps
    focus.
14. Reduced motion (`prefers-reduced-motion: reduce`): sheet and sort
    panel appear without transition; scrolls are instant.

### 6.5 Desktop / landing pixel guard

- `node audit/mobile/kit/baseline.mjs audit/mobile/after` then
  `node audit/mobile/kit/compare.mjs audit/mobile/baseline audit/mobile/after`:
  0 differing files among the landing (1440 + phone) and every
  `shop-1710-*` / `cabinet-1710-*` shot, in particular
  `shop-1710-catalog`, `-catalog-hotels`, `-catalog-cat`,
  `-catalog-filters` (open sheet), `-catalog-b2c-signed`,
  `-pdp-*` (ProductGridSection renders ProductCard), `-cart-drawer`
  (ChipsRow, QtyStepper), `-checkout-cart` (QtyStepper) and the cabinet
  catalog shots. The `phone-390-catalog*` shots are EXPECTED to differ.
- Spot checks at 640 x 900 and 1024 x 768 (desktop canvas): the toolbar is
  one row, the pager is visible, the sheet is the 502 right-side drawer
  with no footer, the card has no ring.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

7.1 TR-29 says "with <= 4 items stack touching tiles"; this spec uses the
    carousel for every direction (cleaning has 4 subcategories). Reasons:
    one template for all three direction pages, and the stack would put
    the first product 824 px lower on `/catalog/cleaning`. D11 restates
    TR-29 without the stack clause. Decide globally.

7.2 File ownership with catalog-b2b: `CatalogClient.tsx`,
    `FiltersDrawer.tsx`, `SubcategoryCarousel.tsx`, `CategoryBanners.tsx`,
    `ZoneCard.tsx` and `CatalogPageView.tsx` (CategoryHero + crumb pieces)
    are rendered by BOTH skins. Proposal: one catalog-cluster builder does
    catalog-b2c first (this spec owns the shared toolbar / sheet / sort /
    load-more / carousel / banners / hero for both modes), then catalog-b2b
    edits only `B2BProductCard.tsx` and `PlatformView` / `PlatformTitle` in
    `CatalogPageView.tsx` (+ the b2b grid-wrapper `pb` for the 60 to the
    legal bar). If two builders run in parallel, `CatalogPageView.tsx`
    must be split (e.g. move PlatformView to `PlatformCatalogView.tsx`)
    first.

7.3 Android back gesture closing sheets (F7 part, CB-29): needs a shared
    decision for every TR-09 sheet (SN-C8 `useSheetHistory`). Next's App
    Router integrates `history.pushState` but the interplay with
    `router.replace` (filters write the URL while the sheet is open) must
    be tested; if not adopted, accept today's behaviour (back leaves the
    page) for all sheets consistently.

7.4 Cart on every add (F16 part, catalog-b2b F23): today each add opens the
    cart; on phones the cart becomes a full-screen sheet (D7), which
    interrupts browsing more than the 92vw drawer did. Options: keep (the
    sheet is the confirmation, consistent with desktop), or show a TR-31
    toast "Додано в кошик" with a "Кошик" action on phones. Cart area +
    system spec decide; this spec only resets the card qty.

7.5 ScrollUpDock on shop phones (SN-C6): the scroll-up-only FAB is a
    shell-public change; alternatives are hiding the FAB on shop canvases
    below 640 or leaving it and accepting CB-14 (not recommended: it eats
    the primary commerce action).

7.6 New UI strings (Ukrainian, need a yes): "Скинути" and "Показати"
    (sheet footer, TR-10 wording), "Скинути пошук і фільтри" (empty-state
    action), "Очистити пошук" (aria-label of the clear button),
    "Фільтри, обрано N" (aria-label, materials wording). The empty-state
    title / text reuse the existing sentence split in two.

7.7 Shared atoms touched for five areas (SN-C1 QtyStepper hit boxes +
    phone count 16/22 Bold, SN-C2 ChipsRow 14/20 + truncate): the cart,
    checkout, stock modal and PDP specs must agree (TR-15 / master chips
    say yes). They are pixel-neutral on desktop; on phones they change the
    cart drawer, checkout and PDP renders.

7.8 Filter-group divider colour: TR-09 (sheet groups) says #d2d2d2, TR-28
    (collapsible heads) says #8e8e8f. This spec uses #d2d2d2 (menu master,
    D10 "inside panels"). The materials filters sheet should use the same.

7.9 Public shop crumb -> H1 = 48 here (TR-03, article master). The other
    public shop heads (checkout, materials hero, PDP) use 32 today
    (`gap-8`); the system spec should set 48 for all of them.

7.10 The phone filter button keeps the desktop's solid black disc (shop
    identity, materials uses the same) instead of TR-10's "outlined Icon
    button". Same for the view switch pill.

7.11 Product photo on phones is 206 tall (D3); the square studio shots then
    show the product at 206 x 206 in the middle of a 342-wide grey box.
    That is D3's choice (open question 3 of the language doc); flag if the
    designer prefers a taller box.

7.12 StatusLine on list rows drops the "роздрібна ціна (i)" note on phones
    (public prices are always retail). If the product owner wants the note
    everywhere, it fits the grid card (208 px) but not the 160-px row
    column at 320 without wrapping.
