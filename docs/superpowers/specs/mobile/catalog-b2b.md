# catalog-b2b - phone spec (< 640 px)

Area: the B2B skin of the catalog for a signed-in partner (seed b2b):
/catalog, /catalog/[direction], /catalog/[direction]/[category], the same
URLs with `?mine=1`, `?zone= / ?type= / ?brand=` filters. B2B product
cards (partner price, wholesale / retail tile, stepper, cart / preorder
disc), list rows, the «Мій асортимент» head button, the B2B filters sheet,
the toolbar, paging, empty state.

Sources: audit/mobile/catalog-b2b/visual-report.md (V-F01..F25),
audit/mobile/catalog-b2b/functional-report.md (Fn-F1..F23), the shots in
audit/mobile/catalog-b2b/shots (viewed: visual-root-cards-390-01,
-card1 at 320/390, visual-root-list-320-viewport, visual-root-list-390-card1,
visual-dir-top-390-viewport, visual-dir-carousel-320, visual-cat-first-320,
visual-dir-filters-390-ticked, visual-root-pager-320,
functional-direction-longchip-320), audit/mobile/BRIEF.md, DECISIONS.md
(D1-D13), lang/figma-mobile-language.md (TR-01..TR-32),
lang/code-mobile-recipes.md, sibling spec dashboard.md (shared atom names
SN-02 / SN-05 / SN-06 reused here). Text widths used for every "fits at
320" claim were measured in the site fonts with
audit/mobile/catalog-b2b/spec-probe.mjs -> spec-probe.json.

Conventions: phone = unprefixed or `max-lg:` classes, desktop = `lg:`
(sm = md = lg = 640, never `xl:`). Every desktop string below is either
untouched or restored by an `lg:` twin; when a block changes its structure
on phones it is rendered twice (`lg:hidden` phone twin + `max-lg:hidden`
desktop original, the codebase's ProductRow / CheckoutItems pattern), so the
1710 render stays byte-identical. Numbers are CSS px at 390 unless a width
is named; "content" = viewport - 48 (342 at 390, 272 at 320, 552 at 600).

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
| S1 | OP-01 ownership | ONE cluster C-catalog builds both skins; SN-B01 split optional |
| S2 | OP-02 white surface | Confirmed (A-11) |
| S3 | 2.2 crumb -> title 24 (OP-05) | 48 (A-2): text column `gap-12 lg:gap-6` (edited); every y below the crumb on direction / category pages shifts +24 |
| S4 | 2.2 crumb = BackCrumb `truncate` (SN-B09) | ShopCrumbs / PhoneBackCrumb (A19); SN-B09 dropped |
| S5 | 2.2 h1 / tagline classes, SN-02 constants | `CABINET_TITLE` / `CABINET_SUBTITLE` exported by CabinetPageHead (A20) |
| S6 | 2.9 count 22/28 SemiBold | 16/22 Bold +0.16 on phones (A18); edited |
| S7 | 2.9 `editable` | Confirmed (A-10: partner contexts) |
| S8 | 2.10 "counter stays" | Block hidden after the last batch (A-5); edited |
| S9 | 2.11 empty copy / action | One CatalogClient for both skins: catalog-b2c 2.14 copy and action ("Скинути пошук і фільтри", solid, whenever a query or a filter is active); note added |
| S10 | 2.12 single full-width footer + reset row (OP-03) | T5a footer: status "Знайдено N товарів" + "Скинути" / "Показати" flex-1 (A-6); no reset row on phones; edited |
| S11 | SN-B02 / SN-B03 / SN-B04 | A18 / A18 / A27 |
| S12 | SN-B10 / SN-06 / SN-B11 | A14 / A9 / A3 (`usePhone`) |
| S13 | OP-06 ScrollUpDock | Cabinet routes have none (system 3.3) |
| S14 | OP-08 add-to-cart toast | Keep the sheet (O-11) |
| S15 | Build | C-catalog (wave 3) |
| S16 (critique round 1) | 2.3 direction banners 16 apart | Touching tiles with a 1-px seam (catalog-b2c S18, C-43); edited in place |
| S17 (critique round 1) | 2.6 three-row toolbar (row A search + filter, row B count + view switch, row C sort with prefix) | One CatalogClient: catalog-b2c S20 (row A = SearchField + 52 view toggle disc + FilterButton; meta line = count + SortMenu without prefix; toolbar 112; listing `mt-12`) |
| S18 (critique round 1) | 2.6 applied chips text #1d1d1f; filter badge | catalog-b2c S21 / S22 (badge = header cart badge look; chip text `text-neutral-800 lg:text-neutral-900`) |
| S19 (critique round 1) | 2.7 status line, «ВАША ЦІНА» caption, B2BStatusLine, B2BPriceTilePhone dt at 14/20 uppercase | `text-[12px] font-medium uppercase leading-5` on phones everywhere (+ `lg:` restores to the desktop 14/24 where the element renders on desktop; C-49); heights unchanged (line box 20); edited in place. The `Caption` atom (fx note) follows the same 12/20 phone string |
| S20 (critique round 1) | 2.7 price "Stat 30/36 Bold (Cases 3094:5169)" | Bold per D3 until O-15; the cited node is SemiBold; edited in place |
| S21 (critique round 1) | 2.10 load-more (SN-06 `moreRef`, focus stays on the button) | A9 revised: no `moreRef`; focus stays on the button (re-focused), `focusAfterLast` returns the first new card's title link; the counter is not live; batches in `n` (A29) |
| S22 (critique round 1) | 2.12 filters sheet (live apply via replaceState) | catalog-b2c S24 / S29: T5a draft model committed in `onSettled` through A29 `writeListParams`; A5 constants revised (bar 66 one line, footer last child, static below 500 px of height) |
| S23 (critique round 1) | SN-B05 URL state via `window.history.replaceState` | = A29 `writeListParams` (same mechanism); phone batches in `n`, desktop `page` |
| S24 (critique round 1) | 2.7 / 2.8 phone lists | The phone card list is `<ul role="list" aria-label="Товари">` with `li` wrappers (catalog-b2c S27) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Routes and code

| Route | Page kind | Code path (today) |
|---|---|---|
| /catalog | root | app/catalog/page.tsx -> CatalogPageView `PlatformView` (CatalogPageView.tsx:190-251) |
| /catalog/hotels, /protect, /cleaning | direction | same, kind "direction" |
| /catalog/hotels/hotelna-kosmetyka (+ every category slug) | category | same, kind "category" |
| /catalog?mine=1 | root (inert param, see 1.4) | same as /catalog |

Chrome: PlatformChrome.tsx:120-130 (PlatformHeader, SideMenu, `<main>`,
PlatformFooter) while `user.type === "b2b"`; the pre-hydration gate hides
the page until the platform shell is mounted (so the B2B skin has no
pre-hydration flash and no loading skeleton).

Listing: CatalogClient.tsx `mode="b2b"` -> B2BProductCard / B2BProductRow
(B2BProductCard.tsx), FiltersDrawer.tsx, SubcategoryCarousel.tsx
(`pagers="inline"`), CategoryBanners.tsx (`gap="b2b"`), ZoneCard.tsx.

### 1.2 Seeds

- `b2b` (audit/kit/seed-b2b.json, partner «Демо Партнер») - every state.
- Cart seeds for the add-to-cart flows: none, or `shampoo-1:2`.
- Product states in the mock (catalog/data.ts:469-505): every product is
  «В наявності» with wholesale 31,65 / retail 36,00 / partner 28,99, except
  PRODUCTS[1] (shampoo-2: promo + `fxPrice` -> «ціна залежить від курсу»),
  PRODUCTS[2] (shampoo-3: unavailable -> «Під замовлення»), PRODUCTS[3]
  (shampoo-4: «Під замовлення»). All 132 products share the title
  «Шампунь для волосся і тіла».

### 1.3 States (all reached by the two audits unless marked)

| # | State | How |
|---|---|---|
| ST1 | root, cards view, 132 products | /catalog |
| ST2 | root, list view | tap `button[aria-label="Вид списком"]` |
| ST3 | direction, cards / list, carousel at start / swiped / end | /catalog/hotels |
| ST4 | category, cards / list (8 products, one batch) | /catalog/hotels/hotelna-kosmetyka |
| ST5 | filters sheet open / ticked / scrolled to the bottom (root: Товари + Виробник; direction / category: facet + Товари + Виробник) | `button[aria-label="Фільтри"]` |
| ST6 | applied chips incl. the long option «Аксесуари для ванної кімнати: гачки, полички, тримачі, дзеркала» | /catalog/hotels?type=... |
| ST7 | sort panel open / per-page panel open (per-page disappears on phones after this spec) | TextDropdown triggers |
| ST8 | stepper at 1 / 3 / 100 / 120 | +/- taps (and, after this spec, typing) |
| ST9 | add to cart -> cart sheet (390, 320 x 568); preorder product -> cart -> /checkout | card / row disc |
| ST10 | search with no result (`zzz`), filter combination with no result | search field / chips |
| ST11 | paging: page 2..7 today; after this spec: batch 1 (10) .. all (132), counter | pager / «Показати більше» |
| ST12 | card -> PDP (B2B skin) -> browser back | title / photo link |
| ST13 | sign-in from the phone menu on a catalog page (B2C -> B2B swap), sign-out | auth-swap.mjs |
| ST14 | /catalog?mine=1 | URL |
| ST15 | landscape 844 x 390 | desktop canvas (zoom 0.586), out of scope (see CB-33) |
| ST16 | long content: «Засоби індивідуального захисту» / «Засоби та інвентар для прибирання» directions, category «Одноразові аксесуари та гігієнічні набори» | /catalog/protect, /catalog/cleaning, /catalog/hotels/odnorazovi-aksesuary (not shot by the audits; reachable) |

### 1.4 Unreachable or not applicable (with the reason)

- «Немає в наявності» in B2B: B2B maps `!available` to «Під замовлення»
  (B2BProductCard.tsx:42, 194); the out-of-stock card is B2C only.
- `?mine=1` "my assortment" filter: no code reads `mine` any more; the
  head button links /assortment. The desktop baseline pins this URL
  (audit/mobile/baseline/cabinet-1710-catalog-b2b-mine.png), so the
  parameter stays inert (CB-30).
- Different product titles / long titles: every mock product has the same
  title; clamping is specified (2 lines) but can only be proven with
  «Шампунь для волосся і тіла» at 320 (2 lines) or by a DOM-injected long
  title in the verify script.
- Loading / error states: mock data, client-gated route; images load lazily
  over the `bg-bg-product` box (#d5d5d5 = the studio photo background,
  sampled 213-215 grey), which is the only "loading" look. Unknown slugs
  -> `notFound()` (shared 404, owned by the system / shell, not this area).
- Hover states: phones run hover:none; Tailwind hover variants are gated.
- Desktop pager on phones: replaced by load-more (D4).

---------------------------------------------------------------------

## 2. Phone layout

### 2.0 Shell context (owned by shell-cabinet, D1)

PlatformHeader phone bar 66 (logo 100 x 33.45 at x 24, cart disc 48 /
42, burger 48 with the glyph at x 342; no company chip); the burger opens
the cabinet menu sheet (row «Каталог» active brand on every catalog
route). The SideMenu phone strip is removed below 640, so the page starts
at y 66. Footer = the cabinet legal bar (#1d1d1f, px 24 py 24 gap 24,
Onest 14/30, wrapping).

Surface: the B2B catalog stays on the WHITE page on phones (no #f5f5f5
slab). Reason: the desktop B2B catalog has no CabinetPage surface (white
frame 4329:56124 / 4329:56219), and D3 product cards are bordered
#343435-ring cards that read only on white (D2: bordered content cards on
white pages). See section 7, OP-02.

### 2.1 Vertical map (390 x 844, after the change)

Root /catalog (ST1):

| y | Block | Height | Rule |
|---|---|---|---|
| 0 | PlatformHeader | 66 | D1 / 3082:3661 |
| 114 | H2 «Каталог» | 36 | pt 48 (D10, TR-03) |
| 166 | subtitle «Усі напрями, ціни вашого договору та швидке замовлення» (2 lines) | 40 | 16 below the title (D10) |
| 238 | «Мій асортимент» hug pill | 42 | 32 below (D10, TR-04) |
| 328 | 3 direction banners 342 x 206, 16 apart | 650 | 48 below the head (TR-03), TR-29 |
| 1026 | toolbar row A: search + filter disc | 52 | 48 below the banners (D10 big blocks) |
| 1094 | toolbar row B: «Знайдено 132 товари» + view switch | 52 | 16 |
| 1162 | toolbar row C: sort trigger | 20 (44 hit) | 16 |
| 1206 | card 1 (601 tall) ... card 10 | 10 x 601 + 9 x 24 | 24 below the toolbar, cards 24 apart (D3) |
| ~7480 | counter «Показано 10 із 132» | 20 | 48 below the list (D4) |
| ~7516 | «Показати більше» | 42 | 16 (D4) |
| ~7606 | cabinet legal bar | ~190 | 48 above it (D10 cabinet rule) |

Doc height ~7800 at 390 (today 16 462); first product photo at 1206 (today
1450).

Direction /catalog/hotels (ST3): header 66, 48, back crumb row 40 (y 114),
24, H2 «Усе для готелів» 36 (y 178), 16, tagline 2 lines 40 (y 230), 32,
pill 42 (y 302), 48, carousel track 206 (y 392), 48, toolbar 156 (y 646),
24, first card y 826 (its photo starts 18 px above the 844 fold).

Category /catalog/hotels/hotelna-kosmetyka (ST4): header, 48, back crumb
«Усе для готелів» 40 (y 114), 24, H2 «Готельна косметика» 36 (1 line at
>= 360, 2 lines at 320), tagline hidden on phones, 32, pill 42 (y 246),
48, hero 342 x 206 r32 (y 336), 48, toolbar (y 590), 24, first card y 770.

### 2.2 B1 - Head (PlatformTitle)

What: crumb (direction / category only), page title, tagline, the single
«Мій асортимент» action. Code today: CatalogPageView.tsx:161-188 and the
crumb nodes :198-221 (moves to B2BCatalogView.tsx, section 5).

Geometry: section px 24, pt 48, pb 48 (the 48 to the next block lives in
the head, like the CabinetPageHead phone variant SN-02 of dashboard.md);
column gap 48 crumb -> title (SYSTEM A-2; same as CabinetPageHead's back
-> title); title -> tagline 16; text column -> pill 32.

Recipe (phone classes + desktop twins):
- section: `flex flex-col gap-8 px-6 pb-12 pt-12 lg:flex-row lg:items-center lg:gap-[10px] lg:py-8 lg:pl-10 lg:pr-8`
  (today `gap-6 px-6 py-6 ...`; `lg:gap-[10px]` and `lg:py-8` override the
  phone values, desktop identical).
- text column: `flex min-w-0 flex-1 flex-col gap-12 lg:gap-6` (SYSTEM A-2:
  crumb -> title 48 on phones; desktop gap 24 unchanged).
- crumb, desktop (unchanged pieces): `<div className="flex flex-wrap items-center gap-4 max-lg:hidden">{Back «До каталогу» / Current | Crumb / Current}</div>`.
- crumb, phone twin (TR-05, article crumb 3176:6558, collapsed to ONE
  level, never wraps): `<BackCrumb href={parentHref} label={parentLabel} truncate className="max-w-full lg:hidden" />`
  - direction page: parent = /catalog, label «До каталогу» (96.9 + 56 =
    153 wide);
  - category page: parent = `directionCatalogHref(dir)`, label = the
    direction title («Усе для готелів» 178 wide; «Засоби індивідуального
    захисту» 315 and «Засоби та інвентар для прибирання» 341 truncate with
    an ellipsis at 320 / 360 via the new `truncate` prop, SN-B09);
  - no «/», no current crumb on phones: the H2 right below repeats it
    (fixes the dangling «/» and the 3-row crumb, CB-14).
- title group: `flex flex-col gap-4 lg:gap-2`.
- h1: `text-h2 text-neutral-900` = phone 30/36 Bold -0.6 (unlayered token),
  desktop 44/48 -0.02em 700 = today's literal `lg:text-[44px]
  lg:leading-[48px] lg:tracking-[-0.88px]` (D9 cabinet title, TR-03; same
  as SN-02). Long titles wrap (H2 «Засоби індивідуального захисту» 466 wide
  -> 2 lines at 342 and at 272); `max-lg:text-pretty`.
- tagline: `text-[14px] leading-5 text-neutral-500 lg:leading-6` (D9 Body
  Small 14/20). On the CATEGORY page add `max-lg:hidden`: its tagline is
  the direction title, already the crumb label 24 px above (Fn-F21).
- action: `<Button href="/assortment" size="responsive" className="shrink-0 self-start lg:self-auto">Мій асортимент</Button>`
  - 171 x 42 hug pill at x 24 (TR-04 one action = hug Button/Small
  left-aligned; D8 42 pill); `self-start` removes the 342-wide invisible
  tap strip (CB-15), `lg:self-auto` restores the desktop centring.

Interactions: back crumb -> parent route; «Мій асортимент» -> /assortment.

### 2.3 B2 - Direction banners (root only)

What: three ZoneCard tiles «Усе для готелів», «Засоби індивідуального
захисту», «Засоби та інвентар для прибирання». Section (area):
`px-6 lg:py-8 lg:pl-10 lg:pr-8` (today `px-6 py-6 ...`; phone py 0, the
head carries the 48 above, the toolbar section carries the 48 below).

Shared (catalog layer, SN-B07): stacked zone tiles 342 x 206, r40,
TOUCHING with a 1-px seam (SYSTEM critique round 1, C-43: the master photo
tiles touch, ZonesGrid 3117:14393; TR-29's "16 apart" is superseded):
CategoryBanners row `flex flex-col lg:flex-row ...` and cards
`max-lg:[&+&]:-mt-px`; cards `h-[206px] w-full lg:h-[260px] lg:flex-1`. Label column
(16/22 SemiBold white, flex-1) + 52 white-ring disc, p 40 at >= 360; the
label must not break inside a word at 320 (shared ZoneCard fix, see the
catalog-b2c V05). Hover items panel stays lg-only. Tap -> direction page.

### 2.4 B3 - Subcategory carousel (direction only)

Section (area): `px-6 lg:px-2 lg:py-8` (today `px-6 py-6 lg:px-2
lg:py-8`). Inline pagers stay `hidden ... lg:flex`.

Shared (SN-B07, TR-29 zone tiles on the marquee track 3127:17560): track
bleeds to the screen edges and snaps, so the next tile always peeks:
- track: add `max-lg:-mx-6 max-lg:px-6 max-lg:scroll-px-6 max-lg:gap-4`
  (keeps `flex snap-x snap-mandatory overflow-x-auto` + hidden scrollbar;
  `lg:gap-8` unchanged);
- tile: `h-[206px] w-[min(280px,calc(100vw-88px))] shrink-0 snap-start lg:h-[260px] lg:w-[393px]`
  -> 232 at 320 (next tile peeks 48), 272 at 360 (peek 48), 280 at 390
  (peek 70), 280 at 600 (peek 280). No card is ever wider than the
  viewport minus 48 (CB-05). No arrows, no dots on phones (TR-29).
Tap -> category page. Horizontal swipe is the only horizontal scroller on
the page (domChecks hScroller expected = this track only).

### 2.5 B4 - Category hero (category only)

Section (area): `px-6 lg:py-8 lg:pl-10 lg:pr-8`. Shared CategoryHero
(SN-B08, TR-30 / article cover 3176:6105): `relative h-[206px] w-full
overflow-clip rounded-[32px] lg:h-[640px] lg:rounded-[40px]` (today 240 /
dead `sm:h-[320px]`). `object-cover`, `fetchPriority="high"` unchanged.

### 2.6 B5 - Toolbar (CatalogClient, shared; B2B-mode values)

Catalog section (area): `px-6 pt-12 pb-12 lg:py-8 lg:pl-10 lg:pr-8`
(today `px-6 py-6 ...`): 48 above the toolbar, 48 between the load-more
and the legal bar (D10).

Shared phone toolbar (SN-B05; rendered as a `lg:hidden` twin, the desktop
rows get `max-lg:hidden`), `flex flex-col gap-4`:
1. Row A `flex items-center gap-2` (TR-10): search field (existing input
   classes, `min-w-0 flex-1`, 46 tall, r50, 16-px text, `enterKeyHint="search"`)
   + filter disc 52 `bg-neutral-900 text-white` with the active-filter
   count badge (phone only: `lg:hidden`), badge recipe = materials
   MaterialsFiltersButton (materials/Hero.tsx:69-75): `absolute -right-1
   -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand
   px-1 text-[12px] font-semibold leading-none text-white`, aria-label
   `Фільтри, обрано ${n}` when n > 0. Fits 320: 212 + 8 + 52.
2. Applied chips (only with filters, TR-10 / blog chips 3176:5478):
   `flex flex-wrap items-center gap-2`; chip `flex h-9 min-w-0 max-w-full
   items-center gap-2 rounded-[60px] border border-stroke-default px-[15px]
   text-[14px] font-medium leading-5 text-neutral-900` with the label in
   `<span className="min-w-0 truncate">` + 16 x-mark (one line always, the
   long option truncates: CB-08); then «Скинути фільтрацію» text button
   14/20 Medium #4a4a4c + 16 x-mark with a 44 hit (`py-3 -my-3`).
3. Row B `flex items-center justify-between gap-4`: «Знайдено N товарів»
   `text-[14px] font-medium leading-5 text-neutral-900` (141.5 wide for 132)
   + the B2B view switch (light #e8e8e9 pill, two 52 buttons, 104 x 52,
   unchanged markup). Fits 320: 141.5 + 104 = 245.5.
4. Row C: sort trigger only (TR-11): label «Сортування:» 14/20 Medium
   #777779 + value 14/20 Medium #343435 + 16 chevron (221 wide), 44-tall
   hit via `py-3 -my-3`. The per-page control and its divider are not
   rendered on phones (TR-11 / TR-12 / D4).
Toolbar -> first card / first list hairline: 24.

Sort panel (TR-11): anchored to the toolbar column, full content width
(342), white, r24, `shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]`, no
border, options `min-h-11 px-4 py-[10px] text-[16px] font-medium leading-6`
separated by 1-px #d2d2d2 lines, selected = brand; opens upward when the
space under the trigger is smaller than the panel + 12 (catalog-b2c V07).
Outside tap / Escape / choice close it, focus returns to the trigger
(today's TextDropdown behaviour kept).

### 2.7 B6 - B2B grid card (B2BProductCard, area file) - D3 / TR-16

What: one column at every phone width, bordered card (Direction / Blog
card shell 3117:12426 / 3176:5541), partner price, stepper + cart disc.

Anatomy at 390 (card 342 x 601, content inner width 294; 320: 272 x 673,
inner 224; 600: 552 x 601, inner 504):

| y in card | Piece | Size | Rule |
|---|---|---|---|
| -1 | photo box, slides under the top border | 342 x 206, r32, `bg-bg-product`, `object-contain` (square studio photo, #d5d5d5 bands invisible) | D3, TR-16, BlogCard.tsx:26 |
| 229 | status line «В НАЯВНОСТІ» (+ «ЦІНА ЗАЛЕЖИТЬ ВІД КУРСУ» on its own line when `fxPrice`) | 20 / 40 | D9 12/20 uppercase (SYSTEM critique round 1, C-49) |
| 261 | title, Title Large 22/28 SemiBold, max 2 lines | 28 (56 at 320 / 360) | D3, D9 |
| 301 | chips 36, 14/20 Medium (2 rows at 320: 70 + 8 + 174.5 > 224) | 36 / 80 | D3, blog chip 3176:5479 |
| 361 | price tile, full width, two label / value rows | 64 | D3 "partner-price tile full width" |
| 449 | «ВАША ЦІНА» caption 12/20 uppercase (SYSTEM critique round 1) + price Stat 30/36 Bold -0.6 (weight O-15) | 60 | D3 price row, D9 stats |
| 525 | action row: stepper (40 hit boxes) left, 52 brand cart disc right | 52 | D3 "stepper + cart on one line", TR-15 |
| 601 | card end (pb 24 incl. the 1-px ring) | | |

Gaps: status / title / chips 12 apart (card title -> body 12); chips ->
tile 24; tile -> price 24; price -> action row 16. Cards 24 apart (D3).

Recipe (B2BProductCard.tsx:213-254):
- article: `group/card @container flex h-full flex-col max-lg:rounded-[32px] max-lg:border max-lg:border-neutral-800 lg:gap-8 lg:py-6`
  (today `... flex-col gap-8 py-6`; `gap-8 py-6` move behind `lg:`).
- photo link: `relative block h-[206px] w-full shrink-0 overflow-clip rounded-[32px] bg-bg-product max-lg:-mt-px lg:h-[328px] lg:rounded-[40px]`
  (today `h-[328px] ... rounded-[40px]`; ProductGridSection's
  `lg:[&_article>a]:h-[328px]` still matches the direct child). The photo
  keeps all four r32 corners (BlogCard recipe; OP-04).
- content: `flex flex-1 flex-col max-lg:gap-6 max-lg:px-[23px] max-lg:pb-[23px] max-lg:pt-6 lg:gap-8`
  (the 1-px ring is inside the Figma box: 23 + 1 = the master's 24, so the
  inner width is exactly 294).
- head group: `flex flex-col gap-3 lg:gap-4` with
  `<B2BStatusLine product={product} stack />`,
  `<h3 className="text-title-lg text-neutral-900 max-lg:line-clamp-2 max-lg:text-pretty">`
  (text-pretty keeps «і» off the line end, CB-27),
  `<ChipsRow product={product} />` (shared phone chip, SN-B03),
  `<B2BPriceTile product={product} />` (desktop flavour, now
  `max-lg:hidden` inside the atom),
  `<B2BPriceTilePhone product={product} className="mt-3" />` (12 gap + 12
  = 24 above it).
- phone price + actions (new, `lg:hidden`):
  ```
  <div className="flex flex-col gap-4 lg:hidden">
    <B2BYourPrice product={product} size="stat" />
    <div className="flex items-center justify-between gap-4">
      <QtyStepper qty={qty} onQty={setQty} editable />
      <B2BCartButton product={product} qty={qty} />
    </div>
  </div>
  ```
- desktop row unchanged + `max-lg:hidden`:
  `mt-auto flex flex-wrap items-center justify-between gap-y-3 max-lg:hidden`
  with `B2BPriceAndQty` + `B2BCartButton` (B2BPriceAndQty is untouched, it
  also serves the PDP hero and the «Купують разом» band).

Atoms (same file):
- `B2BStatusLine({ product, tone, stack?: boolean })`: texts
  `text-[12px] font-medium uppercase leading-5 lg:text-[14px] lg:leading-6`
  (SYSTEM critique round 1: 12/20 on phones like every uppercase line,
  system 3.1.1; desktop 14/24 unchanged); info glyphs `size-4 shrink-0 max-lg:hidden` (TR-32,
  CB-25). With `stack` the wrapper is
  `flex flex-col items-start lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-[2px]`
  (desktop = today's `flex flex-wrap items-center gap-x-[2px]`), the 4-px
  dot box gets `max-lg:hidden`, and the fx span swaps `whitespace-nowrap`
  for `max-lg:whitespace-normal lg:whitespace-nowrap` (wraps inside the
  160 list column at 320). Without `stack` the layout is today's (PDP hero,
  cart rows). Fits: fx note 183.4 < 224 (card at 320).
- `Caption` (inside the file): `leading-5 lg:leading-6`, glyph
  `max-lg:hidden`.
- `B2BPriceTile({ product, inline })`: both existing roots gain
  `max-lg:hidden`; nothing else changes (desktop inline «Оптова ціна (i):
  31,65» keeps its master colon).
- NEW `B2BPriceTilePhone({ product, className })`:
  ```
  <dl className={`flex flex-col gap-1 rounded-lg bg-[#e8e8e9] px-3 py-2 lg:hidden ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <dt className="text-[12px] font-medium uppercase leading-5 text-neutral-500">Оптова ціна</dt>   {/* SYSTEM critique round 1 */}
      <dd className="ml-auto whitespace-nowrap text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900">{formatPrice(wholesale)}</dd>
    </div>
    <div ...same...>роздрібна ціна / {formatPrice(retail)}</div>
  </dl>
  ```
  64 tall (8 + 22 + 4 + 22 + 8). r8 = the desktop tile radius (radii <= 32
  are kept, language section 9). Fits 320: 112.7 + 12 + 59.5 = 184 < 200
  (tile inner at 320); a 4-digit price wraps its value to a right-aligned
  second line instead of overflowing. No glyph, no colon (CB-19).
- `B2BYourPrice({ product, tone, size?: "md" | "stat" | "amount" })`:
  `md` (default) = today's `text-[32px] font-bold leading-7
  tracking-[-0.64px]` (PDP keeps it); `stat` = `text-[30px] font-bold
  leading-9 tracking-[-0.6px]` (Stat 30/36 Bold per D3; weight O-15 - the Cases node 3094:5169 is SemiBold); `amount` =
  `text-title-lg` (22/28 SemiBold -0.44 on phones, D9 amounts). Both new
  sizes are used only inside `lg:hidden` blocks. Wrapper `gap-1`.
- `B2BCartButton({ product, qty, tone })`: for `tone="dark"` add
  `max-lg:border-brand max-lg:bg-brand max-lg:text-white` (D3 "52 brand
  cart disc"; the desktop outlined disc + hover fill unchanged; the light
  tone of the «Купують разом» band is not touched) and
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`
  (D12). Preorder keeps the PreorderIcon glyph and its aria-label.
- Photo `grayscale` for preorder unchanged.

Fits at 320 (inner 224): price block 103 (28,99) / 140 (4 736,25); action
row: stepper layout 76 (1-2 digits) .. 114 (5 digits) + 52 disc, 16 gap
minimum -> never wraps (CB-03).

### 2.8 B7 - B2B list row (B2BProductRow, area file) - D3 list / TR-08

What: «Вид списком» = compact row: 96 photo r24 + text column; price tile
and buy line at full row width under it; 1-px #d2d2d2 line under every
row. Row 342 x 292 at 390 / 430 / 600 (296 at 360, 316 at 320); 10 rows per batch.

Anatomy:
- top block (unchanged `flex items-start gap-4 sm:gap-8`): photo link
  96 r24 `bg-bg-product` (unchanged); column (inner group
  `flex min-w-0 flex-1 flex-col gap-2 lg:gap-4`):
  - `<B2BStatusLine product={product} stack />` (20, or 40-60 with fx
    at 160 wide);
  - title `text-title-sm text-neutral-900 max-lg:line-clamp-2 max-lg:text-pretty lg:text-title-lg`
    (Title Small 16/22 Bold, TR-08 / D9; desktop = today's title-lg; 222
    wide -> 1 line at 390 (column 230), 2 lines at 320);
  - chips: desktop only `<div className="max-lg:hidden"><ChipsRow product={product} /></div>`;
  - phone meta line instead of pills (TR-08 meta 14/20 #777779):
    `<p className="text-[14px] leading-5 text-neutral-500 lg:hidden">{(product.chips ?? [product.volume, product.brand]).join(", ")}</p>`
    («40 мл, ALDA hotel cosmetics», 184 wide, wraps at 320);
  - `<B2BPriceTile product={product} inline />` (desktop only now).
- `<B2BPriceTilePhone product={product} className="mt-4" />` after the top
  block, full row width (fixes the 225-px inline tile in the 160 column,
  CB-01).
- buy line (today `mt-4 flex flex-wrap items-center gap-x-4 gap-y-3
  sm:hidden`, B2BProductCard.tsx:296-299):
  ```
  <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:hidden">
    <B2BYourPrice product={product} size="amount" />
    <div className="ml-auto flex items-center gap-4">
      <QtyStepper qty={qty} onQty={setQty} editable />
      <B2BCartButton product={product} qty={qty} />
    </div>
  </div>
  ```
  Fits 320 (272): price block 75 + 16 + stepper 76 + 16 + disc 52 = 235;
  1200 pcs -> 260; only a 5-digit quantity wraps, and then the stepper +
  disc group moves as one to a right-aligned second line (never a lone
  disc, never off-screen: CB-02).
- row hairline: unchanged `-mt-px h-px w-full bg-stroke-subtle`. The list
  container gets a 1-px #d2d2d2 top line on phones (rows "between 1-px
  lines", D3): shared, SN-B05.

### 2.9 B8 - Quantity stepper (QtyStepper, shared, SN-B02) - TR-15 / D8

Phone: each -/+ button is a 40 x 40 box around the unchanged 16 glyph,
laid out with negative margins so the visual rhythm stays 16 + 8 + 28 + 8
+ 16 = 76: `max-lg:-m-3 max-lg:flex max-lg:size-10 max-lg:items-center
max-lg:justify-center max-lg:rounded-full focus-visible:outline-none
focus-visible:ring-2 focus-visible:ring-brand`. Count 16/22 Bold +0.16
on phones (SYSTEM A18 / A-10), `min-w-7`, nowrap.

`editable` (B2B cards and rows pass it): below 640 the count is an input
(the desktop span gets `max-lg:hidden`, the input `lg:hidden`):
`<input type="text" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" autoComplete="off" maxLength={5} aria-label="Кількість" ...>`,
classes `min-w-7 bg-transparent p-0 text-center outline-none
focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-brand` +
the count type classes, width `calc(${Math.max(2, draft.length)}ch + 4px)`
inline; the stepper gap becomes `max-lg:gap-3` when editable so the 40
hit boxes never overlap the input. Behaviour: digits only while typing,
commit on blur / Enter: empty or 0 -> 1, cap 99999; -/+ keep working on the
committed value. 22-px text: no iOS zoom (>= 16).

### 2.10 B9 - Paging: load-more (D4 / TR-12)

10 cards (or rows) per batch on phones (D3); the numbered pager nav gets
`max-lg:hidden`, the load-more block is `lg:hidden`:
- list -> 48 -> `LoadMore` (dashboard.md SN-06): counter «Показано 10 із
  132» `text-[14px] leading-5 text-neutral-500`, `role="status"
  aria-live="polite"`, 16, `<Button size="small" plus>Показати більше</Button>`
  centred (225 x 42, blog 3176:5601). The button disappears when all items
  are shown (SYSTEM A-5: no counter after the last batch); hidden entirely when
  the result fits one batch (category pages: 8 products).
- Tap appends the next 10 in place: no scroll, focus stays on the button;
  when the button unmounts (last batch) focus moves to the title link of
  the first newly shown item with `{ preventScroll: true }`.
- Filters / search / sort changes reset to the first batch; the view
  switch keeps the count.
- State lives in the URL (SN-B05, CB-07): `?page=N` (desktop page N,
  phones the first N x 10 items), `?view=list`, `?sort=name|price`
  (absent = за популярністю), `?q=...`, written with
  `window.history.replaceState` (Next docs 01-getting-started/04: syncs
  with useSearchParams, no server round trip); the page-reset rule only
  watches zone / type / brand / q / sort. Back from a PDP restores the
  same view, batch count and therefore the scroll target.

### 2.11 B10 - Empty result (TR-24)

(SYSTEM: one CatalogClient serves both skins: use the catalog-b2c 2.14 copy
and action - "Скинути пошук і фільтри", solid, shown whenever a query or a
filter is active.)

Search without match or an empty filter combination: inside the listing
area, phone twin `PanelEmptyState` (dashboard.md SN-05, `lg:hidden`) with
title «За запитом нічого не знайдено» (Title Large 22/28), text «Спробуйте
змінити пошук або фільтри.» (Body Small 14/20 #777779, max 294), and only
when filters are active the action `<Button size="small">Скинути
фільтрацію</Button>` (clears zone / type / brand; the search field right
above handles the query). Copy = today's sentence split in two plus
today's reset label (no new strings). Row B shows «Знайдено 0 товарів»,
the sort row is not rendered at 0. The desktop `<p>` keeps its classes +
`max-lg:hidden`.

### 2.12 B11 - Filters sheet (FiltersDrawer, shared, SN-B06) - D7 / TR-09 / TR-10 / TR-18

Same sections as B2C (Figma B2B 4329:56505 = the B2C sheet): facet
(direction / category pages), «Товари», «Виробник».
- Full-screen sheet over the header: layer `fixed inset-0 z-[60]`, panel
  `h-dvh w-full` white, square corners, no side strip; motion opacity +
  translateY(-12) 400 ms ease-out-expo (menu master), `motion-reduce`
  without transform.
- Bar 66 (sticky inside the panel): «Фільтри» Title Large 22/28 SemiBold
  at x 24 + 24 cross in a 48 hit box with the glyph at x 342 / y 21
  (TR-09, menu cross 3117:14330); 1-px #d2d2d2 line under it when the body
  is scrolled.
- Body `overflow-y-auto overscroll-contain px-6 pt-6 pb-6`: «Скинути
  фільтрацію» text button (only with active filters, 44 hit) then the
  sections, 48 / 1-px #d2d2d2 line / 48 between them (TR-09); head row =
  Title Large + 24 chevron, `min-h-11`; option rows `min-h-11` (24
  checkbox + 8 + 16/22 Medium #343435, long labels wrap); «Показати більше»
  14/20 brand with a 44 hit.
- (SYSTEM T5a / A-6 supersedes the single button of this bullet: footer =
  status line "Знайдено N товарів" + "Скинути" outlinedDark / "Показати"
  solid, flex-1 each, gap 8, exactly catalog-b2c 2.15; no reset text row in
  the body on phones.) Sticky footer (TR-18): white, 1-px #d2d2d2 top line, `px-6 pt-4
  pb-[calc(16px+env(safe-area-inset-bottom))]`, ONE full-width
  `<Button size="small" fullWidth>` «Показати N товарів» (N =
  `filtered.length` with `productsPlural`, new prop `resultCount`; 158 +
  pill padding fits 272). Tap = close the sheet and, if the toolbar is
  above the viewport, `scrollTo` the toolbar top with `behavior:
  "instant"`. N = 0 -> the button is disabled (50 %), the reset row at the
  top stays the way out. (OP-03: TR-10's two flex-1 buttons vs D8.)
- useModalBehavior unchanged (lock on documentElement, focus -> cross,
  Tab trap, Escape, focus back to the filter disc). Filters still apply
  live (URL `router.replace`, scroll false).

### 2.13 B12 - Interactions summary

| Trigger | Result | Surface |
|---|---|---|
| burger (shell) | cabinet menu sheet, «Каталог» active | D1 sheet |
| header cart disc / card disc / row disc | `add(id, qty)` then the cart sheet opens (today's behaviour, Figma «Мій асортимент :: Додано у кошик» 4204:56703 shows the drawer after an add) | cart area sheet (D7) |
| preorder disc | same add, request semantics unchanged | cart sheet |
| photo / title | PDP B2B skin | route |
| back crumb | parent route | route |
| «Мій асортимент» | /assortment | route |
| banner tile / carousel tile | direction / category page | route |
| filter disc | filters sheet | full-screen sheet |
| chip x | removes that filter (URL) | inline |
| sort trigger | anchored panel (not a sheet) | panel |
| view switch | cards / list (URL `view`) | inline |
| «Показати більше» | appends 10 | inline |
| stepper -/+ / typed count | local qty for the next add | inline |

No sticky bars on the page itself; the only sticky bar is the sheet
footer. Scroll lock only while a sheet is open (documentElement). No hover
affordances (card hover fill is desktop-only; the phone disc is already
filled).

### 2.14 B13 - 320..639 behaviour

| Width | Content | Card inner | Card h | Row h | Notes |
|---|---|---|---|---|---|
| 320 | 272 | 224 | 673 (title 2 l, chips 2 rows) | 316 | crumb label truncates for the long directions; H2 2 lines; carousel tile 232 |
| 360 | 312 | 264 | 629 (title 2 l) | 296 | carousel tile 272 |
| 390 | 342 | 294 | 601 | 292 | primary target |
| 430 | 382 | 334 | 601 | 292 | |
| 600 | 552 | 504 | 601 (photo 552 x 206, product centred, bands invisible) | 292 | tile rows stretch; carousel tile 280 |

Heights from the masters stay fixed (photo 206, pills 42, discs 52),
widths stretch (language section 4).

---------------------------------------------------------------------

## 3. Bugs to fix (merged: visual V-F01..F25, functional Fn-F1..F23)

Owner "area" = catalog-b2b files; "shared" = the catalog shared layer
(section 4); other owners are verified here but fixed there.

| id | sev | where | what | fix | file:line | owner |
|---|---|---|---|---|---|---|
| CB-01 | blocker | list view, 320 / 360 / 375, every route (V-F01, V-F02, Fn-F1) | inline price tile 225 wide in a 160 column (prices cut «31,6» / «36,(»), nowrap chip «ALDA hotel cosmetics» to x 331, nowrap fx status 203 in 160; 360: 1 px past the viewport | phone tile at full row width (B2BPriceTilePhone), meta line instead of pills, stacked + wrapping fx note | B2BProductCard.tsx:100-115, 279-287, 53-71; ProductCard.tsx:100-109 | area |
| CB-02 | major | list view, all widths (V-F03, Fn-F2) | buy cluster left-packed (cart at x 275 at every width), cart drops alone to a 2nd line at 320 | buy line justify-between, stepper + disc group `ml-auto`, price 22/28 | B2BProductCard.tsx:296-299 | area |
| CB-03 | major | cards, 320, qty >= 100 (V-F04, Fn-F15) | price + stepper + cart (263 of 272) wraps, cart alone at x 24 | phone price block on its own line, action row stepper / disc justify-between | B2BProductCard.tsx:170, 247-250 | area |
| CB-04 | major | every card / row (V-F05, Fn-F3) | stepper -/+ hit boxes 16 x 16; reaching 120 = 119 taps | 40 hit boxes with -m-3; `editable` numeric input for B2B | ProductCard.tsx:146-169 | shared (SN-B02) + area passes `editable` |
| CB-05 | major | direction, 320 / 360 / 375 / 390 (V-F06, Fn-F5) | carousel tile fixed 320: clipped 48 / 8 px, no peek at 375 / 390, pagers lg-only | bleeding snap track, tile `w-[min(280px,calc(100vw-88px))] h-[206px]` | SubcategoryCarousel.tsx:77, 89; CatalogPageView.tsx:233 | shared (SN-B07) + area section |
| CB-06 | major | /catalog 320, every width (V-F07, Fn-F4, Fn-F22) | pager wraps at 320 (304 > 272), 40 targets, 24 px to the footer; double scroll offset after a page change | load-more on phones (D4), pager `max-lg:hidden`, section pb 48 to the legal bar | CatalogClient.tsx:563-569, 623-663 | shared (SN-B05) + area section |
| CB-07 | major | back from PDP (Fn-F8) | page / view / sort / search are local state: back lands mid page 1 in the cards view | page, view, sort, q in the URL via history.replaceState | CatalogClient.tsx:268-272, 299-304 | shared (SN-B05) |
| CB-08 | major | applied chips, 320 / 390 (Fn-F7) | long option wraps 3 lines inside the fixed 36 pill and overlaps the switch and the reset | one-line chip, `min-w-0 max-w-full`, label `truncate`, 14/20 | CatalogClient.tsx:493-503 | shared (SN-B05) |
| CB-09 | major | filters sheet (V-F20, Fn-F6, Fn-F13 part) | 92vw side sheet r48: no result feedback, close X scrolls away, rows 24, X 32, heads 28 | full-screen sheet, sticky 66 bar, 44 rows, sticky footer «Показати N товарів» | FiltersDrawer.tsx:52-110, 180-226 | shared (SN-B06) |
| CB-10 | major | legal bar, 320, every platform route (V-F08, Fn-F9) | copyright nowrap ends at x 346, text cut | stacked phone legal bar (D1) | PlatformFooter.tsx:19, 31 | shell-cabinet (verify here) |
| CB-11 | major | side menu strip, 320 (V-F09, Fn-F10) | strip 344 > 320, «Матеріали» clipped, 10-px labels | strip removed on phones, burger sheet (D1) | SideMenu.tsx:53, 69, 89 | shell-cabinet (verify here) |
| CB-12 | major | cart sheet after an add, 320 x 568 (Fn-F11) | list window 76 px under the summary; 32 X overlaps «Очистити» | full-screen cart sheet (D7 / TR-19) | CartDrawer.tsx:300-310, 330, 337 | cart (verify here) |
| CB-13 | minor | head, all B2B routes (V-F10) | H1 32/36 -0.64 (no token), tagline 14/24 | `text-h2` (30/36 phone, 44/48 desktop), tagline 14/20 | CatalogPageView.tsx:175, 178 | area (B2BCatalogView) |
| CB-14 | minor | head crumbs, direction / category (V-F11, Fn-F14, Fn-F21, Fn-F13 crumb 119 x 22) | crumb wraps 2-3 rows with a dangling «/», current crumb repeats the H1, category tagline repeats the direction | phone twin = ONE BackCrumb to the parent (40 tall, truncating); category tagline hidden on phones | CatalogPageView.tsx:173, 198-221 | area + SN-B09 |
| CB-15 | minor | head (V-F12, Fn-F12) | «Мій асортимент» link stretched to 342 (171 pill + invisible strip) | `self-start lg:self-auto` | CatalogPageView.tsx:183 | area |
| CB-16 | minor | toolbar (V-F13) | 5 stacked rows, 316 px from the search to the first photo, no active-filter count | 3-row phone toolbar (search + filter disc with badge / count + switch / sort), per-page hidden | CatalogClient.tsx:413-548 | shared (SN-B05) |
| CB-17 | minor | root banners (V-F14) | 3 x 220 + 2 x 24 = 708 px | 206 tall, 16 apart | CategoryBanners.tsx:182-193 | shared (SN-B07) |
| CB-18 | minor | cards (V-F15, V-F24) | borderless 696 cards, 98 px of white between cards, 16-19k px pages; 552 x 328 photo band at 600 | D3 bordered card (601 at 390), 24 apart, 10 per batch, photo 206 | B2BProductCard.tsx:219-237; CatalogClient.tsx:586-590 | area + shared |
| CB-19 | minor | price tile (V-F16, V-F17) | stacks into 4 lines (116) at 320; «(i) :» stray colon | phone tile = two label / value rows (64), no glyph, no colon | B2BProductCard.tsx:102-127 | area |
| CB-20 | nit | status line (V-F18) | «В НАЯВНОСТІ» + the 4-px dot dangling at the line end | `stack` prop: fx note on its own line, dot hidden on phones | B2BProductCard.tsx:53-71 | area |
| CB-21 | minor | product chips (V-F19) | chips 16/22 (desktop size) | 14/20 Medium, one line, truncate | ProductCard.tsx:100-109 | shared (SN-B03) |
| CB-22 | minor | sort / per-page (V-F21, Fn-F13) | triggers 147 x 22 / 38 x 22, options 38, 180 panel overlapping the next row | TR-11 panel (full width, 44 options, flips up), triggers 44 hit, per-page not rendered on phones | CatalogClient.tsx:145-236, 521-547 | shared (SN-B05) |
| CB-23 | minor | empty result (V-F22) | bare grey line 24 px above the footer | PanelEmptyState with title / text / reset (TR-24) | CatalogClient.tsx:571-574 | shared (SN-B05, SN-B10) |
| CB-24 | minor | small targets (Fn-F13) | crumb 119 x 22, sheet rows 24, X 32, sheet «Показати більше» 147 x 22, pager 40 | closed by CB-14, CB-09, CB-06 (no separate change) | - | merged |
| CB-25 | minor | info glyphs (Fn-F16) | (i) after every price label / status is a dead span on touch (and on desktop) | hidden below 640 (TR-32); no explanation copy exists (OP-07) | B2BProductCard.tsx:46-49, 64-70, 76-86 | area |
| CB-26 | minor | long pages (Fn-F17) | no scroll-to-top on platform routes | page drops to ~7.8k px with load-more; dock decision for the platform shell | PlatformChrome.tsx:120-130 | shell-cabinet (OP-06) |
| CB-27 | nit | titles (V-F25) | «... і» / «тіла» orphan at the line end | `max-lg:text-pretty` on card + row titles and the H2 | B2BProductCard.tsx:240, 282; CatalogPageView.tsx:175 | area |
| CB-28 | minor | add to cart (V-F23) | every add opens the full cart sheet | REJECTED: designed feedback (Figma 4204:56703 shows the drawer after an add; TR-19); product decision in OP-08 | - | - |
| CB-29 | nit | stepper after add (Fn-F19) | qty stays 3 after «Додати» | REJECTED: deliberate batch repeat, desktop parity; the cart sheet shows the total | - | - |
| CB-30 | nit | /catalog?mine=1 (Fn-F20) | dead parameter | NO CHANGE: the desktop baseline pins this URL; «Мій асортимент» covers the need | - | - |
| CB-31 | nit | pager scroll offset (Fn-F22) | scroll-mt 96 + html scroll-padding 96 | resolved on phones by CB-06 (append, no scroll); desktop untouched | CatalogClient.tsx:563 | merged |
| CB-32 | nit | sign-out on a catalog page (Fn-F23) | scroll resets to 0 | NOT THIS AREA (auth / shell swap of the whole chrome); leave | - | auth |
| CB-33 | minor | landscape 844 x 390 (Fn-F18) | desktop canvas at zoom 0.586, cart drawer ~5-px text | NOT FIXED: >= 640 is the frozen desktop and there is no tablet / landscape layout (BRIEF); orchestrator note | - | - |

To fix in this pass on behalf of this area: 22 (CB-01..09, CB-13..23,
CB-25, CB-27). Verified here, fixed elsewhere: CB-10, CB-11, CB-12, CB-26.

---------------------------------------------------------------------

## 4. Shared needs

| id | Atom / API | Status | Needed for |
|---|---|---|---|
| SN-B01 | Catalog split (prerequisite, mechanical, desktop byte-identical): move `PlatformTitle` + `PlatformView` (CatalogPageView.tsx:159-251) to the area file `catalog/B2BCatalogView.tsx` (`export function PlatformView({ page }: { page: CatalogPageKind })`); move `Crumb`, `Current`, `PlainCrumb`, `Back`, `CrumbSlash`, `CategoryHero` and `type PageKind` (renamed export `CatalogPageKind`) to `catalog/CatalogHeadParts.tsx`; CatalogPageView imports both. Not needed if catalog-b2c + catalog-b2b are built by ONE agent (OP-01) | new (shared) | B1, file disjointness |
| SN-B02 | `QtyStepper` (ProductCard.tsx:120-172): phone 40 hit boxes `max-lg:-m-3 max-lg:flex max-lg:size-10 max-lg:items-center max-lg:justify-center max-lg:rounded-full` + focus ring; new props `editable?: boolean` (phone numeric input, 2.9) and `max?: number = 99999`. Default rendering unchanged for the cart / checkout / stock modal / PDP except the hit boxes | exists, needs change | CB-04 |
| SN-B03 | `ChipsRow` (ProductCard.tsx:87-111) phone chip: `flex h-9 items-center justify-center whitespace-nowrap rounded-[60px] border px-[15px] text-[14px] font-medium leading-5 max-lg:min-w-0 max-lg:max-w-full lg:text-button-md lg:leading-[22px] ...` with the label in `<span className="max-lg:min-w-0 max-lg:truncate">` (`lg:leading-[22px]` re-declares the desktop leading, gotcha 2) | exists, needs change | CB-21, cards |
| SN-B04 | `StatusLine` (B2C, ProductCard.tsx:39-79): same phone leading 20 and `max-lg:hidden` (i) glyph as B2BStatusLine, so B2C and B2B cards / cart rows match | exists, needs change (consistency) | OP-09 |
| SN-B05 | `CatalogClient` phone deltas (both modes, values per 2.6 / 2.10 / 2.11): phone toolbar twin; chips one-line; per-page + divider not rendered < 640; TR-11 sort panel with flip-up; grid rows `gap-6 lg:gap-20` and row grid `gap-6 sm:grid-cols-2 lg:flex lg:gap-[39.5px]` (cards 24 apart, D3); grid wrapper phone `pt-6` (toolbar -> first card 24), list container phone `mt-6 border-t border-stroke-subtle`; 10-item batches + LoadMore (SN-06) + pager `max-lg:hidden`; URL state `page`, `view`, `sort`, `q` via `window.history.replaceState`; PanelEmptyState twin (SN-05); filter disc badge (`lg:hidden`); pass `resultCount={filtered.length}` to FiltersDrawer; uses `usePhone()` (SN-B11) to pick the slice (B2B is gated until hydration, so no wrong first paint) | exists, needs change | CB-06/07/08/16/22/23, D4 |
| SN-B06 | `FiltersDrawer` phone sheet per 2.12; new prop `resultCount: number`; desktop sheet (`lg:` 502 right sheet, r48, pl 59 pr 80) untouched | exists, needs change | CB-09, D7 |
| SN-B07 | `SubcategoryCarousel` bleeding snap track + `w-[min(280px,calc(100vw-88px))] h-[206px]` tiles; `CategoryBanners` `gap-4` + `h-[206px]`; ZoneCard label never breaks inside a word at 320 | exists, needs change | CB-05, CB-17 |
| SN-B08 | `CategoryHero` `h-[206px] rounded-[32px] lg:h-[640px] lg:rounded-[40px]` (in CatalogHeadParts after SN-B01) | exists, needs change | B4 |
| SN-B09 | `BackCrumb` / `BackCrumbBody` (ui/Breadcrumb.tsx:19-41): new prop `truncate?: boolean` -> link `min-w-0 max-w-full` and label `min-w-0 truncate` (keeps `whitespace-nowrap`); default unchanged (landing does not use this file) | exists, needs change | B1 crumb |
| SN-B10 | `PanelEmptyState` = dashboard.md SN-05 (`{ title, text?, icon?, action?, className? }`, `flex flex-col items-center px-6 py-12 text-center`, title `text-title-lg`, text `mt-4 max-w-[294px] text-body-sm text-neutral-500`, action `mt-8`) | new (shared) | CB-23 |
| SN-06 | `LoadMore` = dashboard.md SN-06 (`{ shown, total, onMore, onLess?, className?, moreRef? }`, counter «Показано {shown} із {total}» role=status, `<Button size="small" plus>Показати більше</Button>`) | new (shared) | CB-06 |
| SN-B11 | `useMediaQuery(query, serverValue = false)` + `usePhone()` = `"(max-width: 639px)"` in `src/components/ui/useMediaQuery.ts` (useSyncExternalStore over matchMedia; no generic hook exists today, only Header / useFitZoom inline ones) | new (shared) | SN-B05 |
| SN-02 | CabinetPageHead phone recipe (dashboard.md SN-02): H1 `text-h2`, subtitle `text-[14px] leading-5 text-neutral-500 lg:leading-6`, section `gap-8 pt-12 pb-12`, title block `gap-4 lg:gap-2`. B1 copies these strings; preferred: export them as constants (`CABINET_TITLE`, `CABINET_SUBTITLE`) from CabinetPageHead.tsx so the catalog head cannot drift | exists, needs change (shell-cabinet) | B1, CB-13 |
| SN-B12 | Cabinet shell per D1 (header burger, menu sheet with «Каталог» active on /catalog*, strip removed, stacked legal bar) | exists, needs change (shell-cabinet) | 2.0, CB-10, CB-11 |
| SN-B13 | Cart sheet per D7 / TR-19 (full screen, partner prices kept: 120 x 28,99 = 3 478,80) | exists, needs change (cart) | CB-12, flows |
| SN-B14 | Button: nothing new (`size="responsive"` head pill, `size="small" plus` load-more, `size="small" fullWidth` sheet footer, `size="small"` empty-state reset); D8 large-string fix does not affect this area | exists | - |

Fallback: if SN-B01 is not done before the build, the area builder edits
only the PlatformTitle / PlatformView block of CatalogPageView.tsx
(lines 159-251) while the catalog-b2c builder works outside it, and the
two run sequentially (OP-01).

---------------------------------------------------------------------

## 5. Files

Area files (disjoint from every other area):

| File | Change |
|---|---|
| src/components/catalog/B2BProductCard.tsx | phone card shell (2.7), phone list row (2.8), `B2BStatusLine` `stack` prop + phone leading + hidden glyphs, `Caption` phone leading, `B2BPriceTile` desktop-only, new `B2BPriceTilePhone`, `B2BYourPrice` `size` prop, `B2BCartButton` phone brand fill + focus ring. Exports keep their names and default behaviour for the PDP (ProductView, BoughtTogether, ProductGridSection) and the cart (CartDrawer) |
| src/components/catalog/B2BCatalogView.tsx (NEW, after SN-B01) | `PlatformView` + `PlatformTitle` with the phone head (2.2), phone section paddings (2.3-2.6), phone crumb twin, category tagline `max-lg:hidden` |

Shared files touched for this area (owned by the shared layer / catalog-b2c,
listed in section 4, NOT edited by the catalog-b2b builder):
src/components/catalog/CatalogPageView.tsx (split only),
src/components/catalog/CatalogHeadParts.tsx (new),
src/components/catalog/CatalogClient.tsx, FiltersDrawer.tsx,
ProductCard.tsx, SubcategoryCarousel.tsx, CategoryBanners.tsx, ZoneCard.tsx,
src/components/ui/Breadcrumb.tsx, src/components/ui/useMediaQuery.ts (new),
src/components/ui/LoadMore.tsx (new, dashboard SN-06),
src/components/platform/ui/PanelEmptyState.tsx (new, dashboard SN-05),
src/components/platform/ui/CabinetPageHead.tsx (constants),
platform shell files (PlatformHeader, SideMenu, PlatformFooter,
PlatformChrome), cart files.

Audit helper written during this spec (read-only probe, gitignored):
audit/mobile/catalog-b2b/spec-probe.mjs -> spec-probe.json.

---------------------------------------------------------------------

## 6. Verification checklist (fresh verify agent)

Setup: dev server on :3000 (never start / kill it), seed `b2b`, touch
emulation (kit `openPhone`). Widths 320 x 568, 360 x 780, 390 x 844,
430 x 932, 600 x 960; routes /catalog, /catalog/hotels,
/catalog/hotels/hotelna-kosmetyka, /catalog/protect, /catalog/cleaning,
/catalog/hotels/odnorazovi-aksesuary, /catalog?mine=1; cards + list view.
Re-run the area scripts: `node audit/mobile/catalog-b2b/sweep.mjs`,
`functional.mjs 390 844`, `functional-extra.mjs`, `compare-b2c.mjs`,
`visual.mjs all`; every finding of section 3 marked area / shared must be
gone.

Measurements (390 unless stated; tolerance 1 px):
- [ ] header 66, no strip under it (shell), first content y 114.
- [ ] head: H1 computed 30px / 36px / -0.6px / 700, x 24; subtitle 14px /
      20px rgb(119,119,121); pill 42 tall, width ~171 (hug), x 24,
      `getBoundingClientRect().width` of the link == the pill; crumb row
      one line, height 40, no «/» visible, right edge <= vw - 24 at 320
      (truncated label for /catalog/protect/... category pages).
- [ ] category tagline `display: none` < 640, visible at 1710.
- [ ] banners 342 x 206, r40, 16 apart; carousel track left 0 / right vw,
      tile width 232 / 272 / 280 / 280 / 280 at 320 / 360 / 390 / 430 /
      600, second tile visible >= 24 px at every width, tile 206 tall;
      category hero 342 x 206 r32.
- [ ] toolbar: row A height 52, search 46 tall, filter disc 52 at
      right = vw - 24; with filters the badge shows the count; row B: count
      text 14/20, switch 104 x 52 right-aligned; sort trigger hit >= 44
      tall; per-page control absent (`display: none` or not rendered).
- [ ] cards: width vw - 48; border 1px rgb(52,52,53); radius 32; photo
      206 tall, top at card top - 1; content inner width 294 (224 at 320);
      card heights 601 (390, 430, 600), 629 (360), 673 (320) for non-fx
      products (+20 for shampoo-2); cards 24 apart; cart disc 52 with
      background rgb(248,90,11); stepper buttons 40 x 40; title <= 2 lines.
- [ ] list rows: no element right edge > vw - 24 at 320 / 360 / 375;
      phone tile full row width (272 at 320); buy line one line at 320 for
      qty 1, 120, 1200; row heights 316 (320) / 292 (390); title 16/22 700;
      hairline 1 px rgb(210,210,210) under each row + one on top of the list.
- [ ] typed quantity: tap the count, type 120, blur -> value 120, +/- work
      from 120; type "0" -> 1; letters ignored; input font >= 16.
- [ ] load-more: 10 items at first; counter «Показано 10 із 132»; button
      42 tall centred 48 below the list; tap -> 20 items, URL `page=2`,
      scrollY unchanged; last batch -> button gone, focus on the first new
      title; category page (8 items): no counter, no button.
- [ ] page end: load-more bottom -> legal bar top = 48.
- [ ] filters sheet: panel rect (0, 0, vw, innerHeight), above the header
      (`elementFromPoint(200, 30)` inside the sheet); bar 66, title 22/28
      600; cross hit 48 with the glyph at x 342; option rows >= 44; footer
      visible without scrolling at 320 x 568 and 390 x 844, label «Показати
      N товарів» equals the toolbar count after each tick; html overflow
      hidden while open; focus on the cross; Escape closes; focus returns
      to the filter disc; after «Показати» the toolbar is in view.
- [ ] sort panel: width 342, options >= 44, opens upward when the trigger
      is in the bottom third; choosing «за ціною» sets `sort=price`.
- [ ] empty: `zzz` -> PanelEmptyState (title 22/28, text 14/20, no button);
      with a filter + `zzz` -> «Скинути фільтрацію» button clears filters.
- [ ] long chip (/catalog/hotels?type=Аксесуари для ванної кімнати: гачки,
      полички, тримачі, дзеркала) -> one line 36 tall with an ellipsis.

DOM checks (kit `domChecks`) expected clean at all five widths, cards and
list, closed and with the sheet open: overflowX 0, offRight 0, offLeft 0,
wideElement 0, tinyText 0, inputZoom 0, clippedText 0 except the ZoneCard
blob bleed (known), hScroller only the carousel track, smallTarget only the
accepted ones (back crumb disc 40, 42 pills, 40 stepper boxes, logo).
Console / page errors: 0.

Flows:
1. /catalog 390, empty cart: stepper to 3, add -> cart sheet line 3 x
   28,99 = 86,97; close -> focus back on the disc that opened it. Empty
   the cart, type 120 on another card, add -> 120 x 28,99 = 3 478,80
   (adding to the same line again would give 123).
2. List view -> «Показати більше» x2 -> tap the 25th title -> PDP B2B ->
   back: list view, 30 items, the tapped row within the viewport.
3. /catalog/hotels: filters -> tick «Ванна кімната» -> footer count
   updates -> «Показати ...» -> chip visible, count matches; remove chip.
4. Preorder product (shampoo-3 / shampoo-4): preorder glyph on the brand
   disc, add -> cart -> «Оформити замовлення» -> /checkout passes the B2B
   stock check.
5. 320 x 568: same as 1 and 3; sheet footer above the fold; cart sheet
   shows at least one full line (cart area fix).
6. Real `tap()` focus: no visible focus ring after taps (rings only on
   keyboard focus).
7. Sign-in from the phone menu on /catalog as visitor -> B2B skin with
   partner prices (auth-swap.mjs), no console errors.
8. Carousel swipe snaps tile by tile; tile tap -> category page.

Pixel guard: `node audit/mobile/kit/baseline.mjs audit/mobile/after` then
`node audit/mobile/kit/compare.mjs audit/mobile/baseline audit/mobile/after`:
every `landing-*`, `shop-1710-*`, `cabinet-1710-*` (incl.
cabinet-1710-catalog-b2b, -hotels, -cat, -mine, -pdp-b2b-main,
-cart-drawer) identical. Expected to differ: phone-390-cabinet-catalog-b2b,
-hotels, -cat, -mine, phone-390-cabinet-pdp-b2b-main (status line leading /
glyphs, similar-products cards), and the B2C phone catalog shots if SN-B03
/ SN-B05 land in the same pass.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

- OP-01 Ownership: CatalogClient, FiltersDrawer, ProductCard atoms,
  SubcategoryCarousel, CategoryBanners, ZoneCard and CatalogPageView serve
  BOTH catalog skins. Recommendation: one build agent for catalog-b2c +
  catalog-b2b (this spec then adds only B2BProductCard + the B2B head). If
  split, SN-B01 runs first and catalog-b2c owns the shared files with the
  B2B-mode values of section 2.6 / 2.10-2.12.
- OP-02 Surface: D1 puts cabinet content on the #f5f5f5 slab; this spec
  keeps the B2B catalog WHITE (desktop B2B catalog has no slab; D3 ring
  cards need white). The same question applies to the PDP B2B skin.
- OP-03 Filter sheet footer: TR-10 asks for «Скинути» + «Показати» side
  by side (flex-1); D8 says two actions stack. Chosen: one full-width
  primary in the sticky footer, reset stays the text row at the top of
  the body (no 124-px double bar on 568-tall phones).
- OP-04 Card photo corners: D3 says "r32 (top corners)"; this spec copies
  BlogCard (all four corners r32 inside the r32 ring, image under the top
  border). catalog-b2c must pick the same.
- OP-05 Crumb -> title gap: TR-03 says 48; CabinetPageHead's back -> title
  is 24 and dashboard SN-02 keeps it. This spec follows the cabinet head
  (24); if the system spec sets 48 for CabinetPageHead, use
  `gap-12 lg:gap-6` on the B1 text column.
- OP-06 ScrollUpDock on platform routes (CB-26): if the shell adds the
  CornerFab, its 100-px ring at bottom-right covers the card cart discs at
  the right edge (catalog-b2c V21); needs a smaller or offset dock on
  catalog grids.
- OP-07 Info glyphs (CB-25): hidden on phones because no explanation copy
  exists (desktop glyphs are equally inert). If the product wants
  tooltips, it must supply the Ukrainian texts; then use a tap popover.
- OP-08 Add-to-cart feedback (CB-28): this spec keeps opening the cart
  sheet after every add (designed). A toast «...» + «Кошик» action would
  need new copy and a TR-31 Toast atom; product decision.
- OP-09 Cross-area effects of the B2B atoms (all phone-only): B2BStatusLine
  leading 20 + hidden glyphs show in the PDP B2B hero, the «Купують
  разом» band and B2B cart rows; B2BProductCard is reused by the PDP
  similar grid (ProductGridSection.tsx:98), so the PDP phone grid gets the
  D3 card and must use 24 gaps; B2C StatusLine / CartButton must match
  (SN-B04, brand disc) so the two skins stay one design.
- OP-10 `?page` param shared by the desktop pager (page N) and the phone
  batches (first N x 10): harmless, documented; resizing across 640 keeps
  the same param.
- OP-11 Landscape phones (CB-33) render the zoomed desktop canvas; out of
  scope by the BRIEF; flagged only.
