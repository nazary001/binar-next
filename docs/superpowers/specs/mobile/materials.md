# Materials library - phone spec (< 640 px)

Area: materials (/materials, /materials/[category]; public skin for
visitors and B2C customers, partner skin inside the cabinet shell for B2B).
Spec agent, 2026-11-05. Specification only: nothing under src/ was edited.

Inputs read: audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md (D1-D13,
binding), audit/mobile/lang/figma-mobile-language.md (TR-01..TR-32),
audit/mobile/lang/code-mobile-recipes.md, audit/mobile/materials/
visual-report.md (MAT-V01..V17) and functional-report.md (M-01..M-16), the
shots under audit/mobile/materials/shots/ (viewed: visual-materials-none-
390-01, visual-catalogs-none-390-01, visual-catalogs-none-preview-pdf-390,
visual-catalogs-none-preview-url-390, visual-catalogs-none-filters-390,
visual-catalogs-b2b-390-01, visual-materials-b2b-390-01, visual-pricelists-
b2b-390-01, visual-catalogs-none-empty-390, visual-techcards-none-head-320,
functional-misc-none-unknown-category; landing reference lang/shots/
blog-390-01), the sources src/components/materials/{FileCard,FolderCard,
FiltersDrawer,Hero,MaterialsCategory,MaterialsHome,PartnerMaterials,
PreviewPanel,data,icons}.tsx|ts, src/app/materials/**, src/components/cart/
useModalBehavior.ts, ui/Button.tsx, ui/Breadcrumb.tsx, platform/ui/
{CabinetPage,CabinetPageHead,useHydrated,icons}.tsx, auth/AuthProvider.tsx,
app/layout.tsx, platform/PlatformChrome.tsx, and the sibling specs already
written (shell-public, shell-cabinet, catalog-b2c, cart, auth, dashboard,
order-detail) so that the shared atoms below use their names.

New read-only probes for this spec: audit/mobile/materials/spec-probe.mjs
(-> spec-probe.json: every file name at 16/22 Bold and 22/28 SemiBold, line
counts at the proposed row widths, label widths) and spec-probe2.mjs (->
spec-probe2.json: folder titles at 22/28 SemiBold vs 16/22 Bold).

Precedence: DECISIONS (D-x) > TR rules > sibling specs (for shared atoms)
> audit proposals. Line numbers are as of 2026-11-05. UI strings are
Ukrainian verbatim; new strings are marked NEW.

Style rule used below: the desktop class strings are left untouched and
the phone values are APPENDED as `max-lg:` overrides wherever possible
(minimal risk for the pixel guard). Where the phone needs a different base
(the two sheets), the catalog-b2c 2.15 recipe is mirrored: base = phone,
`lg:` restorers = today's desktop values.

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
| S1 | 2.0 / 2.3 / 7.11 search row (or chips) -> list 48 | 24 (A-4): partner toolbar block `pb-6 lg:pb-8`; public lists `mt-6` under the search row / chips (desktop margins unchanged); edited |
| S2 | MS-1 modal stack | A2 (F1) |
| S3 | MS-2 useSheetHistory | A4 `useBackToClose` (the viewer keeps its own `?file=` entry) |
| S4 | MS-3 crumbs | A19 |
| S5 | MS-4 FilterButton `badgeDesktop` | A11 (black disc + brand badge everywhere, C-07 / A-6) |
| S6 | MS-5 SheetBar / SheetFooter | A5 constants (footer `pt-[15px]` + 1-px line) |
| S7 | MS-6 LoadMore | A9 |
| S8 | MS-7 useIsPhone | A3 `usePhone()` (false on the server = the SSR full list, same behaviour) |
| S9 | MS-8 PanelEmptyState | A14 (`surface="none"` public, `"panel"` partner) |
| S10 | MS-11 / MS-12 / MS-14 | A26 / C-23 / O-3 |
| S11 | 2.3 MaterialsSearchField | A11 SearchField (`surface`) |
| S12 | 2.4 MaterialsAppliedFilters | A11 AppliedChips (identical strings) |
| S13 | 7.2 partner panel, 7.10 filled folder cards | Confirmed (C-34, C-35) |
| S14 | 7.6 URL state on desktop | Accepted (O-13) |
| S15 | Build | C-materials (wave 3) |
| S16 (critique round 1) | 2.6 FileCard name `max-lg:line-clamp-2` (7 of 31 public names clipped at 320) | `max-lg:line-clamp-3` (A16: one 3-line clamp for TR-25 file / document names, A-10; the viewer keeps the full wrap); edited in place |
| S17 (critique round 1) | MS-6 LoadMore `moreRef` | A9 revised: no `moreRef`; the counter is not live; focus stays on the button, `focusAfterLast` returns the first new row |
| S18 (critique round 1) | 2.9 filters sheet live apply; 2.10 useMaterialsUrlState writes via replaceState | T5a draft model (A4 `onSettled` commit through A29 `writeListParams`; no URL write while the sheet's entry is on top); phone batches in `n`; the viewer's own `?file=` entry is unchanged |
| S19 (critique round 1) | 2.8 / 2.9 sheets (bar, footer, focus, inert) | A5 constants revised (bar 66 one line - the viewer keeps "Перегляд"; footer = the scroller's last child, static below 500 px of height); crosses "Закрити перегляд" / "Закрити фільтри"; initial focus = the bar title on coarse pointers; the viewer and the drawer render inside `main` - the A2 sibling walk inerts the rest (no portal); auth over the viewer is ordered by the stack (z 60 + depth) |
| S20 (critique round 1) | MS-4 FilterButton badge | A11 revised: the phone badge gets the 1.5-px white ring + 12 Bold; `lg:border-0 lg:font-semibold` keeps the desktop badge of Hero.tsx:69-75 identical |
| S21 (critique round 1) | 2.4 applied chips text #1d1d1f | `text-neutral-800 lg:text-neutral-900` (master chip 3176:5479; C-20 revised) |
| S22 (critique round 1) | Phone file / folder lists | `ul role="list"` (system 3.1.6); the partner panel = ListPanel without `overflow-clip` |
| S23 (critique round 1) | S1 search row -> list 24 | Kept (A-4), now labelled an invention (no master evidence) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Routes and code

| Item | Value |
|---|---|
| Routes | `/materials` (`src/app/materials/page.tsx` -> `MaterialsHome`), `/materials/[category]` (`src/app/materials/[category]/page.tsx`, SSG via generateStaticParams over 7 slugs: catalogs, certificates, presentations, tech-cards, instructions, price-lists, brand; unknown slug -> `notFound()`) |
| Canvas | `src/app/materials/layout.tsx` wraps both in `data-canvas="shop"` (desktop zoom only; phones zoom 1). The shell-public rules keyed on the marker (FAB off on shop phones, PS-04) apply here |
| Skins | `useAuth().user?.type === "b2b"` -> PartnerMaterialsHome / PartnerMaterialsCategory (cabinet shell, PlatformChrome `materials(?:\/[^/]+)*`); everyone else -> PublicMaterialsHome / PublicMaterialsCategory (public shell) |
| Area files | `src/components/materials/` FileCard.tsx (175 lines), FolderCard.tsx (38), FiltersDrawer.tsx (177), Hero.tsx (151), MaterialsCategory.tsx (111), MaterialsHome.tsx (85), PartnerMaterials.tsx (207), PreviewPanel.tsx (247), data.ts (250), icons.tsx (135) |
| Data | static placeholder feed (data.ts): 31 files in 7 folders (9 / 5 / 3 / 4 / 4 / 3 / 3); visitor-locked: cat-9, cert-5, price-1..3; partner-locked: price-3; `url` files: cat-3, ins-4; `png`: cat-7, brand-2 |

### 1.2 Seeds

| Id | Seed | Notes |
|---|---|---|
| S1 | none | visitor, public skin; locked files show the padlock and open the sign-in |
| S2 | `audit/mobile/kit/seed-b2c.json` | signed-in customer, public skin; locked files download |
| S3 | `audit/kit/seed-b2b.json` | partner "Демо Партнер", cabinet skin; price-3 "Прайс-лист: клінінг 2026.pdf" is partner-locked |

### 1.3 States

| # | State | How | Audited |
|---|---|---|---|
| ST1 | Landing, 7 folder cards | S1 / S2 `/materials` | yes |
| ST2 | Landing search hit ("Серт" -> 1 folder; "Leoniti" -> folders with matching files) | type in the search | yes |
| ST3 | Landing search miss ("zzzz") -> empty state | type | yes |
| ST4 | Landing filters sheet (directions only, 3 options), one checked, applied chips, reset | filter disc | yes (chips are new) |
| ST5 | Folder, 9 rows (8 downloadable, 1 visitor padlock) | S1 `/materials/catalogs` | yes |
| ST6 | Folder search hit / miss, filters sheet (2 groups, 8 options), chips | folder | yes |
| ST7 | Viewer: pdf (cat-1), ppt (cat-2), url (cat-3), doc (cat-4), png (cat-7), visitor-locked (cat-9) | tap a row | yes |
| ST8 | Lock flow: viewer cat-9 -> "Увійти, щоб завантажити" -> auth sheet -> sign in B2C (viewer stays, action becomes "Завантажити") / B2B (skin swaps, viewer reopens from `?file=cat-9`) | S1 | yes (old flow; new behaviour to verify) |
| ST9 | Row padlock tap (visitor) -> auth sheet | S1 cat-9 / price-lists | yes |
| ST10 | Back (Android back / iOS swipe / browser back) with the viewer or the filters sheet open -> closes the overlay, stays on the folder | S1 / S3 | yes (bug M-04) |
| ST11 | Deep link `/materials/catalogs?file=cat-1` (and `?q=Leon&dir=hotels&type=pdf`) | URL | no (new) |
| ST12 | Back from a folder to the landing restores `q` / `dir` | S1 | yes (bug M-11) |
| ST13 | `/materials/price-lists` visitor: 3 locked rows with captions | S1 | yes |
| ST14 | `/materials/tech-cards`: long names (2-line clamp), `/materials/brand`: 2-line H1 at 320 | S1 | yes |
| ST15 | B2C first paint (no padlock flash) | S2, 6x CPU | yes (bug M-13) |
| ST16 | B2B root: CabinetPageHead + toolbar + white folder cards | S3 `/materials` | yes |
| ST17 | B2B folder: back + title (+ tagline on price-lists) + toolbar + white panel rows | S3 `/materials/catalogs`, `/materials/price-lists` | yes |
| ST18 | B2B partner-locked row + viewer (disabled action + caption) | S3 price-3 | yes |
| ST19 | B2B search miss -> empty state inside a white panel | S3 | yes |
| ST20 | Unknown folder `/materials/unknown` -> 404 | S1 / S3 | yes (routed) |

Unreachable / not applicable, with the reason:
- Loading: none. The feed is static (data.ts); the only wait is the
  hydration skin switch (public SSR -> partner) covered by the
  PlatformChrome pre-hydration gate (shell-cabinet 2.9) and, for B2C, by
  ST15.
- Error: none. No fetch, no failure path.
- Load-more (D4): page size 10 on phones, but no folder has more than 9
  files in the mock, so the button never renders. The verify agent checks
  that it is absent (total <= 10) and that the shared LoadMore atom works
  on its own pages (catalog / orders); materials cannot reach it without
  more data.
- Lock tooltip on touch: removed below 640 by design (captions replace it,
  MAT-08); the tooltip stays the desktop hover / focus affordance.
- Real document rendering: every pdf / doc / ppt shows the same
  placeholder page (`/figma-export/materials/preview-doc.png`, 1196 x
  1692); readability is judged on that image.
- iOS safe area / dvh with a collapsing toolbar: Chromium emulation only;
  `env(safe-area-inset-bottom)` is 0 until the root viewport gets
  `viewportFit: "cover"` (shell-public N4 / catalog SN-C12).
- Landscape phones (844 x 390) are the desktop canvas (>= 640, frozen).

---------------------------------------------------------------------

## 2. Phone layout

### 2.0 Shell context

- Public skin (S1, S2): shell-public. Header 66 sticky (logo / cart disc /
  burger), white page, 24 gutters (`px-6`, content 272 / 342 / 552 at 320
  / 390 / 600), last block -> footer 60, footer + legal bar unchanged,
  corner FAB hidden on shop-canvas phones (shell-public 2.8, PS-04), the
  footer ring stays. Crumb = one-line PhoneBackCrumb (shell-public 2.4,
  N1). TR-01, D2.
- Partner skin (S3): shell-cabinet per D1. PlatformHeader 66 (logo / cart
  disc / burger; cabinet menu sheet), no SideMenu strip, `CabinetPage`
  slab #f5f5f5 with top corners r32 starting at y 66, pb 48, legal bar
  (shell-cabinet 2.4 / 2.6). `CabinetPageHead` phone variant
  (shell-cabinet 2.5: py 48, back -> title 48, title -> subtitle 16, H1
  30/36, subtitle 14/20; first page block has no top padding). TR-02, D1.
- Everything below that is not shell is owned by this area.

Common block rules (both skins):
- Single column at every phone width; widths stretch 272..591 (320..639),
  heights fixed (D10, language 4).
- Spacing: head -> search row 48; search row -> applied chips 16; search
  row (or chips) -> list 24 (SYSTEM A-4; superseded: 48 per TR-03; the blog master
  separates its filter chips from the cards by 48 + rule + 60, 3176:5478);
  folder cards 24 apart (filled cards, TR-25 / 3085:3974); file rows
  touching, separated by 1-px #d2d2d2 lines (TR-25); list -> load-more 48
  (D4); last block -> footer 60 (public) / -> legal bar 48 (cabinet slab
  pb, shell-cabinet 2.4).
- Type (D9): public H1 40/42 Bold (`text-h1`), cabinet H1 30/36
  (CabinetPageHead), card title Title Large 22/28 SemiBold -0.44, row name
  Title Small 16/22 Bold +0.16, meta Body Small 14/20 #777779, captions
  12/16 #777779, sheet titles Title Large 22/28.
- Targets: every control >= 44 (pills 42, D8); inputs 16 px.

### 2.1 Vertical maps at 390 x 844 (after the change)

Public landing `/materials` (ST1, S1):

| y | Block | Rule / source |
|---|---|---|
| 0-66 | header | shell-public, 3082:3661 |
| 114-154 | crumb: back disc 40 + "Головна" | 48 under the bar; TR-05, article crumb 3176:6558 |
| 202-244 | H1 "Матеріали" 40/42 | crumb -> H1 48 (3176:5637), D9 |
| 260-320 | tagline 14/20 #777779 (3 lines; 4 at 320 = 80, 2 at 430+) | H1 -> body 16 (hero 3082:3248) |
| 368-420 | search row: pill 282 x 46 (y 371) + 8 + 52 filter disc (x 314) | 48; TR-10 |
| (436-472) | applied chips row, only with filters on | 16; TR-10, blog chips 3176:5478 |
| 468-1312 | 7 folder cards 342 x 100, 24 apart ("Брендбук та логотипи" 228 px fits the 230 column by 2 px; if it wraps that card is 128 and everything below moves 28) | 48; TR-25 folder cards, filled card 3085:3974 |
| 1372 | footer | 60; D10 |

Document ~2658 tall (today 2980; folder list 844 vs 1202).

Public folder `/materials/catalogs` (ST5, S1):

| y | Block | Rule / source |
|---|---|---|
| 0-66 | header | |
| 114-154 | crumb: back disc 40 + "Матеріали" (-> /materials) | TR-05; never wraps (today 78 tall) |
| 202-244 | H1 "Каталоги" (2 lines for "Технічні карти" at 320, "Брендбук та логотипи" at 320-360) | 48 |
| 292-344 | search row | 48 (no tagline on public folders) |
| 392-1240 | file list: 1-px #d2d2d2 top line, 9 rows (80 one-line name / 102 two-line name / 120 locked with caption), 1-px lines between, bottom line | 48; TR-25 |
| ~1300 | footer | 60 |

Viewer sheet (ST7, cat-1 pdf, S1) - fixed, covers the viewport:

| y | Block | Rule / source |
|---|---|---|
| 0-66 | bar: "Перегляд" Title Large at x 24; close 48 box x 330..378 / y 9..57, 24 glyph at x 342 / y 21 | TR-09, menu bar 3117:13578 / "clear" 3117:14330 |
| 66-769 | scroll body px 24: pt 24, head (48 tile + 16 + name 22/28 wrapping + 4 + "Розмір: 14 MB"), 24, description 14/20 #343435, 24, document 342 x ~522 r24 (image at the box width), pb 24 | TR-09 body, TR-25 tile, hero trust row 3085:3718 |
| 769-844 | footer: 1-px #d2d2d2 line, pt 16, Button/Small full width 342 x 42 "Завантажити" (y 786), pb 16 + safe area | TR-18, menu button 3117:14325 |

Locked file: footer grows by caption 16 + 12 (y 741..844).

Filters sheet (ST6, folder, S1) - fixed, covers the viewport:

| y | Block | Rule / source |
|---|---|---|
| 0-66 | bar: "Фільтри" Title Large + close (as above), sticky | TR-09 |
| 90-... | group "Напрямки" (head 44 + 3 options x 44), 40 + line + 40, group "Тип документу" (head + 5 x 44) | TR-28 / catalog-b2c 2.15 |
| 737-844 | sticky footer: line, pt 16, status "Знайдено 9 файлів" 14/20, 12, two pills 167 x 42 "Скинути" / "Показати" (8 apart), pb 16 + safe area | TR-10, TR-18 |

Partner root `/materials` (ST16, S3, D1 shell):

| y | Block | Rule / source |
|---|---|---|
| 0-66 | PlatformHeader | D1 |
| 66 | slab top, r32 | D1 / shell-cabinet 2.4 |
| 114-150 | H1 "Матеріали" 30/36 | CabinetPageHead (shell-cabinet 2.5.5 lists 114..150) |
| 166-226 | subtitle (3 lines) | 16 |
| 274-326 | toolbar row (transparent pill + disc) | head pb 48 |
| 374-1218 | 7 white folder cards r32, 24 apart | toolbar pb 48 |
| 1266 | legal bar | slab pb 48 |

Partner folder `/materials/price-lists` (ST17, S3): back "До матеріалів"
114..154, H1 "Прайс-листи" 202..238, subtitle "Ціни для партнерів
оновлюються щомісяця." 254..274, toolbar 322..374, white panel 422..~760
(3 rows, price-3 with the caption), legal bar 48 below the slab content.
`/materials/catalogs` (no tagline): H1 202..238, toolbar 286..338, panel
386.

### 2.2 B1 - Public head: crumb, H1, tagline (Hero.tsx:81-136)

What: page head of both public pages. Shell-public owns the crumb atom;
this area applies the call site (shell-public 2.4 table, row
materials/Hero.tsx).

Recipe (Hero.tsx:102-135):
```tsx
// back = the last crumb with an href, else Головна
const back = [...crumbs].reverse().find((c) => c.href) ?? { href: "/", label: "Головна" };

<section className="flex flex-col gap-12 pt-12 lg:pt-[72px]">            {/* :102 was gap-8 lg:gap-12 */}
  <ShopCrumbs back={{ href: back.href ?? "/", label: back.label }}>
    {/* :104-129 unchanged: BackCrumb "Головна" + crumbs.map(Slash + label/link) */}
  </ShopCrumbs>
  <div className="flex flex-col gap-4">                                   {/* :132 was gap-3 lg:gap-4 */}
    <h1 className="text-h1 text-neutral-900">{title}</h1>
    {tagline && <p className="text-body-sm text-neutral-500">{tagline}</p>}
  </div>
</section>
```
- Landing back = "Головна" -> "/"; folder back = "Матеріали" -> "/materials"
  (label 84.2 px, fits 216 at 320). One line at every width, 40 tall, 44
  hit (PhoneBackCrumb `before:` inset). No "/ current" on phones (the H1
  repeats it, TR-05).
- `ShopCrumbs` replaces `<nav aria-label="Навігація" className="flex
  flex-wrap items-center gap-4">` (Hero.tsx:103): its inner desktop div is
  the same `flex flex-wrap items-center gap-4` row (byte-identical at
  >= 640) and the landmark label becomes "Навігаційний ланцюжок" (PS-11).
- Gaps: crumb -> H1 48 (`gap-12`, desktop `lg:gap-12` = 48 unchanged),
  H1 -> tagline 16 (`gap-4`; desktop was `lg:gap-4` = 16 unchanged).
- H1 wraps at words; "Брендбук та логотипи" is 2 lines at 320 / 360,
  "Технічні карти" 2 lines at 320. Never truncated.
- Fallback if shell-public N1 has not landed when this area is built:
  inline the PhoneBackCrumb JSX of shell-public 2.4 in Hero.tsx with the
  same classes, then swap to the atom (no visual change).

### 2.3 B2 - Search row (Hero.tsx:22-79, 141-148; PartnerMaterials.tsx:51-72)

What: search pill + filter disc, shared by both skins (public white pill,
partner transparent pill on the slab). TR-10; recipe mirrors catalog-b2c
2.8 so the two shop search rows are identical.

Row wrapper (public, Hero.tsx:141): `mt-10 flex items-center
justify-between gap-4 lg:mt-20` -> `mt-12 flex items-center
justify-between gap-2 lg:mt-20 lg:gap-4` (48 under the head, 8 between pill
and disc; desktop 80 / 16 unchanged).

Partner toolbar (PartnerMaterials.tsx:67) becomes a block with the row and
the chips:
```tsx
<div className={`pb-6 lg:pb-8 ${GUTTERS}`}>
  <div className="flex items-center justify-between gap-2 lg:gap-4">
    <MaterialsSearchField ... surface="none" />
    <MaterialsFiltersButton ... />
  </div>
  {chips}
</div>
```
Desktop: outer block `pb-8` + gutters, inner row `flex items-center
justify-between gap-4` = today's single div (same 52-px row, same
padding). Phone: no top padding (the head already gives 48, shell-cabinet
2.5.1 contract), 24 to the list (SYSTEM A-4).

MaterialsSearchField (Hero.tsx:33-45) -> a search form (all widths, no
pixel change; same as catalog-b2c 2.8):
```tsx
<form role="search" onSubmit={(e) => { e.preventDefault(); inputRef.current?.blur(); }}
  className="relative min-w-0 flex-1 lg:w-[495px] lg:min-w-auto lg:flex-initial">
  <input ref={inputRef} type="search" enterKeyHint="search" autoComplete="off" ... /* classes :41 unchanged */ />
  <MagnifierIcon className={value ? "pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-neutral-700 max-lg:hidden" : "pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-neutral-700"} />
  {value && (
    <button type="button" aria-label="Очистити пошук"
      onClick={() => { onChange(""); inputRef.current?.focus(); }}
      className="absolute right-px top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden">
      <XMarkIcon className="size-6" />
    </button>
  )}
</form>
```
- Today's root `relative w-full lg:w-[495px]`; phone `flex-1 min-w-0`
  (pill 282 at 390, 212 at 320, 492 at 600), desktop restored to `flex: 0
  1 auto` + 495.
- Enter / the keyboard "Пошук" key blurs the field (keyboard closes,
  results visible; M-10). Search filters live on every keystroke as today.
- "Очистити пошук" is NEW copy (= catalog-b2c). Whole-class strings only
  (FileCard.tsx:16-18 note: a variant glued to `${` is not extracted).

Filter disc: 52 black disc (Direction card disc 3117:12801), unchanged
look. Use the shared `FilterButton` (catalog-b2c SN-C5, extracted FROM
`MaterialsFiltersButton` Hero.tsx:50-79) with `badgeDesktop` (materials
shows the count badge on desktop today); `MaterialsFiltersButton` becomes a
thin wrapper or is replaced at both call sites (Hero.tsx:143,
PartnerMaterials.tsx:69). If SN-C5 is not built, keep the local component
and add `focus-visible:outline-none focus-visible:ring-2
focus-visible:ring-brand`. The badge keeps today's `-right-1 -top-1` brand
pill (4 px over the disc box, inside the 24 gutter) for parity with SN-C5.

### 2.4 B3 - Applied filter chips (new, phone only)

What: removable chips for the active directions / types under the search
row, plus "Скинути фільтрацію". TR-10; blog chips 3176:5478; recipe =
catalog-b2c 2.9 (same strings, so the two shop pages match).

New component `MaterialsAppliedFilters` (materials/phoneParts.tsx):
```tsx
// props: { directions: Direction[]; types: FileType[]; onRemove(key: "directions" | "types", value: string): void; onReset(): void }
if (!directions.length && !types.length) return null;
<div className="mt-4 flex flex-wrap items-center gap-2 lg:hidden">
  {chips.map(({ key, value, label }) => (
    <button key={`${key}-${value}`} type="button" onClick={() => onRemove(key, value)}
      aria-label={`Прибрати фільтр «${label}»`}
      className="group -my-1 flex h-11 min-w-0 max-w-full cursor-pointer items-center">
      <span className="flex h-9 min-w-0 max-w-full items-center gap-2 rounded-[60px] border border-stroke-default px-[15px] text-[14px] font-medium leading-5 text-neutral-900 transition-colors duration-200 group-active:border-brand group-active:text-brand">
        <span className="min-w-0 truncate">{label}</span>
        <XMarkIcon className="size-4 shrink-0" />
      </span>
    </button>
  ))}
  <button type="button" onClick={onReset}
    className="flex h-11 cursor-pointer items-center gap-[2px] text-[14px] font-medium leading-5 text-neutral-700 active:text-brand">
    Скинути фільтрацію
    <XMarkIcon className="size-4 shrink-0" />
  </button>
</div>
```
- Labels: direction text as is; types via `FILE_TYPE_LABELS` ("PDF",
  "DOC", "Презентація", "Посилання", "Фото"). Order: directions first, in
  DIRECTIONS order, then types in FILE_TYPE_LABELS order.
- Geometry: pill 36 (master chip), hit 44 (`-my-1 h-11` keeps the 8-px
  visual rhythm between wrapped rows); 16 under the search row (`mt-4`
  minus the 4-px negative margin = 16 visual). "Засоби та інвентар для
  прибирання" (241 px at 14/20 + 56) is a ~297 pill: one line from 360,
  ellipsis at 320 (272); full value in the aria-label.
- "Скинути фільтрацію" clears directions + types (not the query).
- Desktop: not rendered (`lg:hidden`); materials desktop has no chips.
- Caller: MaterialsHero gets a `below?: ReactNode` slot rendered after
  the search row (public); the partner toolbar renders it inside its block
  (2.3).

### 2.5 B4 - Folder cards (FolderCard.tsx; MaterialsHome.tsx:66; PartnerMaterials.tsx:107)

What: the category list. TR-25 ("Folder / category cards: full-width
342, p 24, r32, stacked 24 apart"); anatomy = hero trust row (tile + 16 +
label, 3085:3718) inside a filled card (3085:3974); D5 r32.

Phone card: one row, 48 folder glyph + 16 + [name Title Large 22/28
SemiBold #1d1d1f, 4, count 14/20 #777779]; 24 padding; 100 tall (128 when
the name wraps); whole card is the link. Public fill #f8f8f8
(`bg-bg-subtle`, filled card), partner fill white on the slab (D1).

FolderCard.tsx recipe (desktop strings untouched, phone appended):
```tsx
<Link href={`/materials/${category.slug}`}
  className={`group flex h-full flex-col gap-4 rounded-3xl p-6 max-lg:flex-row max-lg:items-center max-lg:rounded-[32px] ${SURFACE[surface]}`}>
  <FolderIcon className="size-12 shrink-0 text-neutral-900" />
  <span className="flex flex-col gap-0.5 max-lg:min-w-0 max-lg:flex-1 max-lg:gap-1">
    <span className="text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900 transition-colors duration-200 group-hover:text-brand max-lg:text-[22px] max-lg:font-semibold max-lg:leading-7 max-lg:tracking-[-0.44px]">
      {category.title}
    </span>
    <span className="text-body-sm text-neutral-500">{filesCount(count)}</span>
  </span>
</Link>
```
- `SURFACE.white` keeps `justify-center` (main axis is horizontal on
  phones: harmless, the text column is flex-1).
- No trailing chevron: with a 24 chevron + 16 the text column is 120 at
  320 and "Сертифікати" (133.2 at 22/28 600), "Прайс-листи" (134.8) would
  break mid-word under the global `overflow-wrap: anywhere`. Without it
  the column is 160 at 320 (longest word 134.8 fits), 230 at 390, 440 at
  600 (spec-probe2.json). Language 22 rule: every fixed row must fit 272.
- Lists: public `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4
  lg:gap-8` -> add `max-lg:gap-6`; partner `grid grid-cols-1 gap-4
  sm:grid-cols-2 lg:grid-cols-4 lg:gap-6` -> add `max-lg:gap-6` (24 apart,
  filled-card spacing 3177 -> 3517). `sm:grid-cols-2` is desktop (sm =
  640); phones stay one column up to 639.
- Count line: `filesCount` plural (1 файл / 2-4 файли / 5+ файлів).
- Stretch: 272..591 wide, height fixed; at 600 one row with a lot of air
  on the right (accepted: same as hero trust rows).

### 2.6 B5 - File rows (FileCard.tsx; MaterialsCategory.tsx:80; PartnerMaterials.tsx:175)

What: the files of a folder. TR-25 (48 dark tile r12 + 16 + name 16/22
Bold 2 lines + size 14/20, trailing 24 glyph in a 44 hit box, rows py 16
between 1-px #d2d2d2 lines); D5 (document tile r12).

Containers:
- Public: rows directly on the white page, framed top and bottom (footer
  contact rows 3111:14916 are framed the same way):
  `grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8` + `max-lg:gap-0
  max-lg:border-y max-lg:border-stroke-subtle max-lg:divide-y
  max-lg:divide-stroke-subtle` (MaterialsCategory.tsx:80).
- Partner: one white r32 panel on the slab (TR-07 cabinet list panel, D1):
  `grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6` + `max-lg:gap-0
  max-lg:rounded-[32px] max-lg:bg-white max-lg:px-6 max-lg:py-2
  max-lg:divide-y max-lg:divide-stroke-subtle` (PartnerMaterials.tsx:175;
  py 8 + row py 16 = 24 from the panel edge, dashboard SN-07 "tight").

Row (FileCard.tsx:151-173), desktop strings untouched:
```tsx
<article className={`flex items-center gap-4 rounded-3xl ${bg} py-4 pl-4 pr-6 lg:gap-8 max-lg:gap-2 max-lg:rounded-none max-lg:bg-transparent max-lg:px-0`}>
  <button type="button" onClick={() => onOpen(file)}
    className="group flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left lg:gap-6">       {/* unchanged */}
    <FileTile type={file.type} />                                                                       {/* 48, r12, #343435 */}
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 max-lg:gap-1">
      <span className="truncate text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900 transition-colors duration-200 group-hover:text-brand max-lg:line-clamp-3 max-lg:whitespace-normal max-lg:text-[16px] max-lg:font-bold max-lg:leading-[22px] max-lg:tracking-[0.16px]">
        {file.name}
      </span>
      <FileMeta file={file} />                                                                          {/* size line, see below */}
      {lockHint && <span className={`text-[12px] leading-4 text-neutral-500 lg:hidden${pending ? " invisible" : ""}`}>{lockHint}</span>}
    </span>
  </button>
  <FileAction file={file} canDownload={canDownload} onLocked={onLocked} lockedHint={lockedHint} hitArea pending={pending} />
</article>
```
(`${bg}` = `bg-bg-subtle` / `bg-white` as today; `" invisible"` must be a
whole class inside a plain string; `lockHint = canDownload ? null :
onLocked ? SIGN_IN_HINT : lockedHint`, with SIGN_IN_HINT the existing
FileCard.tsx:19 constant. Pre-hydration a locked file computes the
visitor hint and renders it `invisible`; after hydration a B2C customer
loses the caption (one 20-px shift on 1-3 rows, B2C only), a visitor sees
it appear in place.)

- Name: Title Small 16/22 Bold +0.16, 2-line clamp with ellipsis, wraps
  at words (`overflow-wrap: anywhere` breaks over-long words). Text width
  = content - 48 - 16 - 8 - 34 (44 box minus its 10-px overhang): public
  166 / 236 / 446 at 320 / 390 / 600, partner 118 / 188 / 398. Probe
  (spec-probe.json): public - every name fits 2 lines from 390, 7 of 31
  are clamped at 320; partner - 4 clamped at 390, most clamped at 320.
  The viewer always shows the full name (2.8). Desktop keeps the 18/24
  ExtraBold one-line truncate.
- Size line (`FileMeta`): `text-body-sm text-neutral-500` = 14/20
  #777779: "Розмір: 14 MB"; for `url` files the phone line reads
  "Посилання" (the FILE_TYPE_LABELS label) instead of a byte size:
  `{file.type === "url" ? <><span className="lg:hidden">Посилання</span><span className="max-lg:hidden">Розмір: {file.size}</span></> : <>Розмір: {file.size}</>}`.
- Lock caption (phone only, D9 caption 12/16 #777779, 4 under the size):
  visitor-locked (`!canDownload && onLocked`) -> "Завантажити після
  авторизації." (the Figma tooltip text 4634:65705, verbatim);
  partner-locked (`!canDownload && !onLocked`) -> `lockedHint` = "Файл
  доступний за запитом." (verbatim). It replaces the hover / focus-only
  tooltip on touch (TR-32 intent; MAT-08). Wraps to 2 lines where the
  column is narrower than 178 / 160 px.
- Row heights: 80 (1-line name), 102 (2 lines), +20 (or +36 at 320) with
  a caption.
- Whole left part = button "open viewer" (min height 48 = tile).

FileAction (FileCard.tsx:58-127), new props `hitArea?: boolean`,
`pending?: boolean` (default false; FileCard passes both, the viewer head
passes neither):
- `hitArea` -> the interactive element is a 44 box whose 24 glyph keeps
  its x (right edge = content edge): link `<a>` gets `size-11 -mr-2.5
  lg:size-auto lg:mr-0` appended to its classes; the locked button and the
  static padlock span: outer span `size-11 -mr-2.5 lg:size-auto lg:mr-0`,
  inner button / span `size-full lg:size-auto`. Desktop: auto size = the
  24 glyph as today.
- `url` files (phone): glyph = 16.5-px arrow-up-right (`ArrowUpRight`
  from blog/icons, the menu link arrow 3117:14194) instead of the tray:
  `<DownloadIcon className={`${glyph} max-lg:hidden`} /><ArrowUpRight
  className="size-[16.5px] lg:hidden" />` (only in the `external` branch;
  desktop keeps the master's tray, 4634:65131).
- `pending` (B2C first paint, MAT-20): render `<span aria-hidden
  className="size-11 -mr-2.5 shrink-0 lg:mr-0 lg:size-6" />` instead of
  the padlock / download until hydration, so a signed-in customer never
  sees the visitor padlock; the caption slot renders `invisible` (keeps
  the visitor's height, no layout shift for the most common user).
- LockTooltip (FileCard.tsx:41): add `max-lg:hidden` to the class string
  (whole token). Tooltips are a desktop hover / focus affordance; below
  640 the caption carries the message (also fixes the 320 clip MAT-16).
- Taps: visitor padlock -> `onLocked` = `openAuth()` (unchanged; the
  caption explains it); partner padlock -> nothing (static, the caption
  explains it); download link -> downloads `file.name`; url link -> new
  tab.

Pending wiring (MaterialsCategory.tsx:60): `const hydrated =
useHydrated();` (platform/ui/useHydrated) and `pending={!hydrated &&
!!file.locked}` on each FileCard. `useHydrated` flips in the same render
in which the auth store leaves its server snapshot.

### 2.7 B6 - Empty, load-more and long-content variants

Empty result (ST3, ST6 miss, ST19) - TR-24; recipe and copy mirror
catalog-b2c 2.14 so both shop pages say the same thing:
```tsx
// materials/phoneParts.tsx
export function MaterialsEmpty({ onReset, panel = false }: { onReset: () => void; panel?: boolean }) {
  return (
    <div className={panel ? "rounded-[32px] bg-white lg:hidden" : "lg:hidden"}>
      <PanelEmptyState
        title="За вашим запитом нічого не знайдено."
        text="Спробуйте змінити пошук або фільтри."
        action={<Button size="small" onClick={onReset}>Скинути пошук і фільтри</Button>}
      />
    </div>
  );
}
```
- PanelEmptyState (dashboard SN-05 / catalog SN-C7): root `flex flex-col
  items-center px-6 py-12 text-center`, title `text-title-lg
  text-neutral-900` (Title Large 22/28; 2 lines at 320 / 390), text `mt-4
  max-w-[294px] text-body-sm text-neutral-500`, action `mt-8`. No icon
  tile (catalog has none).
- The title is the existing desktop sentence; the text and the button
  label are the catalog's NEW strings. `onReset` = clear the query and
  every filter (`resetAll`, 2.10).
- Callers: public MaterialsHome.tsx:61-64 / MaterialsCategory.tsx:75-78
  render `<MaterialsEmpty onReset={resetAll} />` and keep the desktop
  `<p>` with `max-lg:hidden`; partner `Empty()` (PartnerMaterials.tsx:
  74-76) -> desktop `<p>` + `max-lg:hidden`, phone `<MaterialsEmpty panel
  />` (white r32 card on the slab, D1).
- The page keeps the footer 60 under the block (no collapse to a 1-line
  page: MAT-V13).

Load-more (D4, TR-12): file lists only (folders never exceed 7 cards).
```tsx
const PHONE_PAGE = 10;
const isPhone = useIsPhone();               // catalog SN-C9: null on SSR / hydration
const listKey = `${query}|${directions.join()}|${types.join()}`;
const [page, setPage] = useState({ key: listKey, shown: PHONE_PAGE });
if (page.key !== listKey) setPage({ key: listKey, shown: PHONE_PAGE });   // reset on every filter / search change
const visible = isPhone === true ? files.slice(0, page.shown) : files;
...
{isPhone === true && files.length > page.shown && (
  <LoadMore className="mt-12 lg:hidden" shown={page.shown} total={files.length}
    onMore={() => setPage((p) => ({ ...p, shown: p.shown + PHONE_PAGE }))} />
)}
```
LoadMore = dashboard SN-06 / catalog SN-C4 ("Показано N із M" 14/20
#777779, 16, Button/Small with the plus disc "Показати більше", centred,
48 under the list; focus moves to the first revealed row). Unreachable
with the mock (max 9 files).

Long content:
- Names: 2-line clamp in rows, full wrap in the viewer (max 3 lines at
  320, 2 at 390: "Технічна карта: шампунь Leoniti 40 мл.pdf").
- H1 2 lines at 320 ("Технічні карти", "Брендбук та логотипи").
- Tagline 4 lines at 320 (public landing), 3 at 390 (both skins).
- Long direction chip: ellipsis at 320 (2.4).
- Folder title 2 lines ("Брендбук та логотипи") from 320 to ~390.

### 2.8 B7 - Viewer sheet (PreviewPanel.tsx) - full screen on phones

What: D7 lists the materials preview as a full-screen sheet; TR-09 (menu
master 3117:13578 shell), TR-18 sticky action bar, TR-25 head anatomy.
Replaces the squeezed 1103-px panel (MAT-05). Desktop panel unchanged.

Structure (one DOM tree for both widths):
```
layer (fixed inset-0)
  scrim                          desktop only
  aside (dialog)                 phone: full screen, 3 rows (bar / body / footer)
    phone bar  "Перегляд"         lg:hidden
    scroll body                   phone: scrolls; desktop: lg:contents
      head row (tile, name, size, [download | hairline | close])
      body column (description + document)
    phone footer (caption + action)   lg:hidden
```

Layer (PreviewPanel.tsx:180-184): `fixed inset-0 z-40 ...` -> `fixed
inset-0 z-[60] max-lg:h-dvh lg:z-40 ${open ? "" : "pointer-events-none"}`
(above the z-50 header on phones, D7; shell-public 2.10 ladder). Keeps
`aria-hidden` / `inert`.

Scrim (:185-191): add `max-lg:hidden` (the sheet is opaque and full
screen).

Aside (:193-203): drop the inline `style={{ top: ... }}`; classes (catalog
2.15 pattern):
```
absolute bottom-0 right-0 top-0 flex w-full flex-col overflow-hidden bg-white outline-none
transition-[opacity,translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] motion-reduce:transition-none
lg:top-[var(--site-header-h,92px)] lg:w-[1103px] lg:max-w-full lg:gap-10 lg:rounded-tl-[48px] lg:border lg:border-stroke-default lg:py-[59px] lg:pl-[59px] lg:pr-[79px]
open:   opacity-100 translate-y-0 lg:translate-x-0
closed: opacity-0 -translate-y-3 lg:opacity-100 lg:translate-y-0 lg:translate-x-full
```
Today's unprefixed `gap-6 rounded-tl-[32px] border border-stroke-default
px-6 py-6` move to the `lg:` values above (desktop resolves exactly as
today: gap 40, r48, 1-px #8e8e8f, 59/79/59/59, top = --site-header-h, 1103
capped at 100 %). Phone motion = the menu's opacity + translateY(-12) 400
ms (TR-09); desktop slide unchanged.

Phone bar (new, first child): mirrors the shared SheetBar geometry (cart
N7 / auth N-A / catalog SN-C8) but holds only the title, because the
close button is shared with the desktop head (same reason as the cart
drawer, cart 2.1):
`<div aria-hidden className="flex h-[66px] shrink-0 items-center pl-6 pr-[60px] lg:hidden"><p className="min-w-0 truncate text-title-lg text-neutral-900">Перегляд</p></div>`
("Перегляд" NEW, 101.4 px; the dialog keeps `aria-label="Перегляд файлу
<name>"`).

Scroll body (new wrapper around the head row :206-236 and the body
column :238-241):
`<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-6 py-6 lg:contents">`
(`display: contents` on desktop keeps the aside's gap-10 between the head
row and the body column exactly as today).

Head row:
- Row :206 unchanged (`flex w-full items-start justify-between gap-4
  lg:gap-0`).
- Tile + text :207 `flex min-w-0 flex-1 items-center gap-4 lg:gap-6` ->
  append `max-lg:items-start` (tile top-aligned with a 2-3 line name).
- Text column :209 `... gap-0.5` -> append `max-lg:gap-1`.
- h2 :210 append `max-lg:whitespace-normal max-lg:text-[22px]
  max-lg:font-semibold max-lg:tracking-[-0.44px]` (Title Large 22/28
  SemiBold, full wrap; leading-7 = 28 already; desktop keeps truncate
  24/28 Bold -0.48).
- Size :213 -> `FileMeta` (2.6: "Посилання" for url files on phones).
- Actions wrapper :216 `flex h-8 shrink-0 items-center` -> append
  `max-lg:contents`.
- FileAction :217-224 `className="size-8"` -> `className="size-8
  max-lg:hidden"` (download moves to the footer on phones).
- Hairline :225 append `max-lg:hidden`.
- Close :226-234 - ONE close for both widths; on phones it is pinned to
  the bar position relative to the (non-scrolling) aside, so it never
  scrolls away:
  `absolute right-3 top-[9px] z-[1] flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:static lg:ml-[23px] lg:size-8 lg:rounded-none`
  + `<ClearIcon className="size-6 lg:size-8" />` -> 48 box at x vw-60,
  24 glyph at x vw-48 / y 21 (342 / 21 at 390; master "clear"
  3117:14330). Its containing block is the aside (positioned), not the
  scroll body (static), so the body's scrolling does not move it.
  `initial` focus stays on it (closeRef).

Body column :238-241 unchanged (`flex min-h-0 w-full flex-1 flex-col gap-6
lg:gap-8`); description `text-body-sm text-neutral-800` = 14/20 #343435.

Document box (DocumentScroller :96-143):
- Container :96 `relative min-h-0 w-full flex-1 overflow-hidden
  rounded-3xl border border-stroke-subtle` -> `relative w-full
  overflow-hidden rounded-3xl border border-stroke-subtle lg:min-h-0
  lg:flex-1` (phone: natural height, r24 kept: D5 inner element; the
  sheet body is the only scroller - no nested scrolling on touch).
- Scroller :102 `scrollbar-hidden absolute inset-0 overflow-y-auto
  overscroll-contain outline-none` -> `scrollbar-hidden outline-none
  lg:absolute lg:inset-0 lg:overflow-y-auto lg:overscroll-contain`.
- Image branch unchanged: the page renders at the box width (340 -> 367.5
  with the master crop -> ~520 tall at 390, ~413 at 320, ~845 at 600).
  Pinch-zoom of the page stays available (no `touch-action` override).
- URL branch :105 `flex h-full items-center justify-center p-10` -> `flex
  items-center px-6 py-[5px] lg:h-full lg:justify-center lg:p-10`; link
  :110 append `inline-block py-[11px] max-lg:break-all lg:py-0` -> a 56-px
  link card with a 44-px link (no empty 340 x 570 box, MAT-05).
- Thumb track :134 append `max-lg:hidden` (no custom 8-px drag thumb on
  touch).

Phone footer (new, last child of the aside; TR-18; catalog SN-C8
SheetFooter strings):
```tsx
<div className="flex shrink-0 flex-col gap-3 border-t border-stroke-subtle bg-white px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] lg:hidden">
  {!canDownload && <p className="text-[12px] leading-4 text-neutral-500">{onLocked ? "Завантажити після авторизації." : lockedHint}</p>}
  <ViewerAction file={shown} canDownload={canDownload} onLocked={onLocked} />
</div>
```
(`<SheetFooter className="shrink-0 lg:hidden">` if the shared atom exists:
its `sticky bottom-0 mt-auto` are harmless in the non-scrolling aside.)

ViewerAction (new, PreviewPanel.tsx), full-width Button/Small 342 x 42
(menu button 3117:14325, D8):

| File state | Button |
|---|---|
| downloadable pdf / doc / ppt / png | `<Button href={file.href} download={file.name} prefetch={false} size="small" fullWidth>Завантажити</Button>` |
| downloadable url | `<Button href={file.href} target="_blank" rel="noopener noreferrer" prefetch={false} size="small" fullWidth>Відкрити посилання</Button>` (NEW) |
| visitor-locked (`onLocked`) | `<Button size="small" fullWidth onClick={onLocked}>Увійти, щоб завантажити</Button>` (NEW, 191 + 48 fits 272) |
| partner-locked | `<Button size="small" fullWidth disabled disabledStyle="solid">Завантажити</Button>` (#e8e8e9 / #a5a5a5, cabinet disabled state 4868:31335) |

Next Link skips client routing for `download` and `target="_blank"`
(node_modules/next/dist/client/app-dir/link.js:50, 58); `prefetch={false}`
stops a route prefetch of the pdf path.

Heights at 390 x 844: bar 66 + body 703 + footer 75 (103 with a caption).
320 x 568: body 427 / 399 - the head, description and part of the page
are visible, the rest scrolls.

Behaviour:
- Open: tap on a row (2.6). Phones push a history entry with `?file=<id>`
  (2.10). Focus -> close button (no visible ring after a tap).
- Close: cross, Escape, Back (popstate). No scrim on phones.
- Scroll lock on documentElement + inert header (useModalBehavior,
  `inertSelector: "header"` as today; with the stack fix MS-1).
- "Увійти, щоб завантажити" -> `openAuth()`: the auth sheet opens ON TOP
  (auth.md: layer `fixed inset-0 z-[60] lg:z-40`, mounted after the page
  by AuthProvider -> paints above this z-[60] viewer). B2C sign-in: the
  auth sheet closes, the viewer stays, the footer now shows
  "Завантажити"; focus falls back to the viewer (MS-1). B2B sign-in: the
  skin swaps, the URL still holds `?file=cat-9`, the partner page opens
  the same file in its viewer (deep-link mode, 2.10).

### 2.9 B8 - Filters sheet (FiltersDrawer.tsx) - full screen on phones

What: D7 / TR-09 sheet, TR-10 rows and footer, TR-28 groups. The recipe
is catalog-b2c 2.15 string for string, so the shop has one filter sheet
(MAT-09, MAT-10). Desktop drawer unchanged.

Layer (:127-131): `fixed inset-0 z-[60] max-lg:h-dvh lg:z-40 ${open ? "" :
"pointer-events-none"}`. Scrim (:132-138) unchanged (it fades under the
opaque sheet).

Aside (:140-150): drop the inline `style`; classes:
```
absolute bottom-0 right-0 top-0 flex w-full flex-col overflow-y-auto overscroll-contain bg-white px-6 outline-none
transition-[opacity,translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] motion-reduce:transition-none
lg:top-[var(--site-header-h,92px)] lg:w-[502px] lg:max-w-[92vw] lg:gap-16 lg:rounded-tl-[48px] lg:border-l lg:border-t lg:border-stroke-subtle lg:pb-20 lg:pl-[59px] lg:pr-20 lg:pt-[59px]
open:   opacity-100 translate-y-0 lg:translate-x-0
closed: opacity-0 -translate-y-3 lg:opacity-100 lg:translate-y-0 lg:translate-x-full
```
(today's unprefixed `gap-10 py-10 w-[502px] max-w-[92vw] rounded-tl-[48px]
border-l border-t` move to `lg:`; `py-10` was already overridden by
`lg:pb-20 lg:pt-[59px]`, `gap-10` by `lg:gap-16`).

Children:
1. Bar = today's title row :151 -> `sticky top-0 z-[1] -mx-6 flex
   h-[66px] shrink-0 items-center justify-between bg-white px-6 lg:static
   lg:mx-0 lg:h-auto lg:w-full lg:px-0`.
   - h2 :152 -> `text-title-lg text-neutral-900 lg:text-h2
     lg:leading-[48px] lg:tracking-[-0.88px]` (phone 22/28 SemiBold;
     desktop 44/48 Bold -0.88 as today: title-lg sets no
     `--tw-font-weight`, so `lg:text-h2` brings 700).
   - Close :155-163 -> `-mr-3 flex size-12 shrink-0 cursor-pointer
     items-center justify-center rounded-full text-neutral-900
     transition-colors duration-200 hover:text-brand
     focus-visible:outline-none focus-visible:ring-2
     focus-visible:ring-brand lg:mr-0 lg:size-8 lg:rounded-none`, glyph
     `ClearIcon className="size-6 lg:size-8"` (same path as XMarkIcon) ->
     24 cross at x 342 / y 21, 48 hit. Initial focus stays here.
2. Groups wrapper (new) around `groups.map` :166-173: `<div
   className="flex flex-col pb-12 pt-6 max-lg:divide-y
   max-lg:divide-stroke-subtle lg:contents">` (body starts 24 under the
   bar; groups separated by 1-px #d2d2d2 lines with 40 + 8 = 48 visual
   above / below - menu divider rhythm 3117:13578).
3. DrawerGroup :42 `flex w-full flex-col` -> append `max-lg:py-10
   max-lg:first:pt-0 max-lg:last:pb-0`.
   - Head :47 append `min-h-11 lg:min-h-0` (44 target; title
     `text-title-lg` = 22/28 on phones, + 24 chevron, TR-28).
   - Options :65 `flex flex-col gap-4 pt-6` -> `flex flex-col pt-[14px]
     lg:gap-4 lg:pt-6`.
   - Option :75 append `min-h-11 py-[10px] lg:min-h-0 lg:py-0` (44 rows on
     a 44 pitch; 24 checkbox + 8 + 16/22 Medium #343435; "Засоби та
     інвентар для прибирання" wraps to a 64 row at 320).
   - Collapse stays (grid 0fr / 1fr, inert when collapsed).
4. Footer (new, phone only; TR-18 + TR-10; catalog SN-C8 SheetFooter):
```tsx
<div className="sticky bottom-0 z-[1] -mx-6 mt-auto flex flex-col gap-3 border-t border-stroke-subtle bg-white px-6 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 lg:hidden">
  <p role="status" aria-live="polite" className="text-body-sm text-neutral-500">{resultLabel}</p>
  <div className="flex gap-2">
    <Button size="small" variant="outlinedDark" fullWidth disabled={!activeCount} onClick={onReset}>Скинути</Button>
    <Button size="small" fullWidth onClick={onClose}>Показати</Button>
  </div>
</div>
```
   - `resultLabel` = folder: `Знайдено ${filesCount(n)}` ("Знайдено 9
     файлів"); landing: `Знайдено ${categoriesCount(n)}` ("Знайдено 7
     категорій"); NEW strings, same pattern as the catalog's "Знайдено N
     товарів". n = the live result of the current query + filters.
   - Two flex-1 pills = 167 at 390, 132 at 320 ("Скинути" 112.8,
     "Показати" 120.7 needed). Secondary first (TR-04 / TR-10). "Показати
     N файлів" in the pill would need 186+ and does not fit half a row.
   - "Скинути" disabled (50 %) when nothing is checked; clears directions
     + types (the query stays).
   - "Показати" closes the sheet (results are already applied live).
   - Height 107 (+ safe area).

New props: `MaterialsFiltersDrawer({ ..., resultLabel: string, activeCount:
number, onReset: () => void })`. Behaviour kept: live apply, html lock,
focus trap, Escape, focus back to the filter disc, collapse. New: Back
closes the sheet on phones (`useSheetHistory(open, onClose)`, MS-2).

Landing sheet: one group (3 options) - the body is mostly empty above the
footer (accepted; the menu master is equally sparse).

### 2.10 B9 - Page state, URL and history (new area hook)

`src/components/materials/useMaterialsUrlState.ts` (NEW, area file) owns
query, filters and the open file for both skins, so MaterialsHome,
MaterialsCategory and PartnerMaterials share one implementation:
```ts
export function useMaterialsUrlState(files?: MaterialFile[]): {
  query: string; setQuery(v: string): void;
  directions: Direction[]; types: FileType[];
  toggle(key: "directions" | "types", value: string): void;
  resetFilters(): void;   // directions + types
  resetAll(): void;       // + query
  preview: MaterialFile | null; openPreview(f: MaterialFile): void; closePreview(): void;
};
```
- URL shape: `?q=<text>&dir=hotels,cleaning&type=pdf,url&file=<id>`;
  empty params are dropped. `dir` uses `DIRECTION_SLUGS` (data.ts, NEW):
  "Усе для готелів" -> hotels, "Засоби індивідуального захисту" ->
  protect, "Засоби та інвентар для прибирання" -> cleaning (the catalog
  direction slugs). Unknown values are ignored.
- Read once on mount in `useLayoutEffect` (client renders after Back
  apply before paint; SSR first paint shows the unfiltered list, same as
  the auth skin switch). Unknown `file` id (not in `files`) -> strip it
  with `replaceState`.
- Write: filters immediately, query debounced 300 ms, both with
  `window.history.replaceState(null, "", url)` (Next 16 integrates the
  native history API with its router -
  node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-
  navigating.md "Native History API"; no `useSearchParams`, so the SSG
  pages need no Suspense boundary). Fixes M-11: Back from a folder to the
  landing restores `q` / `dir` (filter badge, chips, cards).
- `openPreview(f)`: set state; on phones (`matchMedia("(max-width:
  639.98px)")`) `history.pushState(null, "", url + file)` and remember
  `pushed`. `closePreview()`: set null; if `pushed` -> `history.back()`;
  else if the URL holds `file` (deep link) -> `replaceState` without it.
  `popstate` while `pushed` -> `pushed = false`, close without touching
  history. Fixes M-04 (Back closes the viewer and stays on the folder) and
  makes `?file=` a shareable link at every width (desktop opens its panel
  from a link; desktop never pushes).
- Filters sheet Back: `useSheetHistory` (MS-2) inside
  MaterialsFiltersDrawer, phones only.
- Skin swap with the viewer open (B2B sign-in from the viewer): the public
  component unmounts with its entry still current; the partner component
  mounts, reads `?file=` and opens the viewer in deep-link mode.

### 2.11 B10 - Partner skin specifics (PartnerMaterials.tsx)

- Head: `CabinetPageHead` as today (title, subtitle, back) - all phone
  geometry comes from shell-cabinet 2.5 (H1 `text-h2` 30/36, subtitle
  `text-[14px] leading-5` 14/20, back -> title 48, head py 48). No change
  in this file.
- Toolbar: 2.3 (block with `pb-12 lg:pb-8`), pill `surface="none"`
  (transparent on the slab, the B2B master draws no fill), chips inside.
- Root list: white folder cards r32, 24 apart (2.5). Folder list: one
  white r32 panel (2.6). Empty: white r32 card with PanelEmptyState (2.7).
- Partner lock: price-3 shows the static padlock + caption "Файл
  доступний за запитом."; the viewer shows the caption + disabled
  "Завантажити".
- Same sheets (2.8, 2.9) and the same hook (2.10). The partner pages
  keep the public `GUTTERS = "px-6 lg:pl-10 lg:pr-8"` (24 on phones).

### 2.12 B11 - Interactions summary

| Trigger | Result (phone) | Close / back |
|---|---|---|
| Back crumb (public) | /, /materials | - |
| Back button (partner folder) | /materials | - |
| Search typing | live filter; clear cross appears; URL `q` (debounced) | clear cross refocuses the input; Enter blurs |
| Filter disc | full-screen filters sheet z-60, focus on its close | cross / Escape / "Показати" / Back; focus back to the disc |
| Chip / "Скинути фільтрацію" | removes one / all filters live | - |
| Folder card | /materials/<slug> (URL state of the landing kept in its own entry) | browser Back restores q / dir |
| Row (left part) | viewer z-60, `?file=<id>` pushed | cross / Escape / Back; focus back to the row button |
| Row download | downloads `file.name` | - |
| Row url arrow | opens the link in a new tab | - |
| Row padlock (visitor) | auth sheet z-60 | auth closes -> focus back to the padlock (or its replacement, MS-1) |
| Viewer "Увійти, щоб завантажити" | auth sheet over the viewer | 2.8 |
| Load-more | next 10 rows | - |

Sticky elements on phones: header (shell), the sheets' bar / footer.
No page-level sticky bar. No ScrollUpDock FAB on these routes (shop
phones: off, shell-public PS-04; cabinet: none). Scroll lock: html
overflow (useModalBehavior) for both sheets. Motion: menu idiom, reduced
motion = no transition.

### 2.13 B12 - 320..639 behaviour

| Width | Notes |
|---|---|
| 320 | pill 212; folder text column 160 (every title 1 line, "Технічні карти" 147.7 included, except "Брендбук та логотипи" = 2 lines); public row text 166 (7 names clamped), partner 118; lock captions 2 lines; sheet pills 132 each; viewer name up to 3 lines; long direction chip ellipsis |
| 360 | pill 252; partner row text 158; tagline 3-4 lines |
| 390 | master width; maps in 2.1 |
| 430 | tagline 2 lines; all public names 1-2 lines |
| 600 | content 552; pill 492; folder cards 552 x 100; rows 552 (text 446, 1 line); viewer document 552 wide (~845 tall); sheet pills 272 each |

---------------------------------------------------------------------

## 3. Bugs to fix (both lenses merged; nothing dropped)

Severity: blocker / major / minor / nit. Disposition: Area (this area's
files), Shared (section 4), Routed (another area's file).

| ID | Sev | Source | Where | What | Fix (one or two sentences) | Disposition |
|---|---|---|---|---|---|---|
| MAT-01 | blocker | M-01 | cart/useModalBehavior.ts:31-33, 76; MaterialsCategory.tsx:22-29 | Signing in as a partner from the viewer padlock leaves `<html style="overflow:hidden">` forever: each modal restores its own snapshot and the cleanup order (viewer unmounts first, auth last) writes "hidden" back | Module-level modal stack in useModalBehavior: lock on the first open, restore the original value when the last entry leaves, regardless of order (MS-1) | Shared |
| MAT-02 | blocker | MAT-V01, M-05 | FileCard.tsx:161; PreviewPanel.tsx:210 | Every file name is one truncated line (31/31 at 320-390, 35-60 % visible at 320, tech-cards rows indistinguishable); 18/24 ExtraBold off the phone scale; the full name is readable nowhere | Row name 16/22 Bold with a 2-line clamp; viewer name 22/28 SemiBold wrapping fully (2.6, 2.8) | Area |
| MAT-03 | major | M-02 | cart/useModalBehavior.ts:44-52 | Escape with viewer + auth open closes the BOTTOM dialog (first listener wins), unlocks the page under the auth drawer and un-inerts the header; the second Escape re-locks a page with no dialog | Only the top entry of the stack handles Escape; inert is ref-counted (MS-1) | Shared |
| MAT-04 | minor | spec (code reading, same cause as M-02) | cart/useModalBehavior.ts:54-71 | With the auth sheet over the viewer every Tab runs both traps: the viewer's handler first pulls focus into the viewer, the auth handler pushes it back to its first element - Tab always lands on the first control, Shift+Tab on the last (keyboard users cannot reach the other fields; Bluetooth keyboards on phones, every desktop) | Only the top entry traps Tab (MS-1) | Shared |
| MAT-05 | major | MAT-V02, MAT-V03, M-03 | PreviewPanel.tsx:180-246, 96-143 | The 1103-px desktop panel squeezed to the phone under a live-looking but inert header: name 54-63 % visible (33 % at 320), "Розмір" wraps at 320, download / close 32 px, document 270 x 254 at 320 x 568 and text 3-4 px, custom 8-px thumb on touch, url files show an empty 340 x 570 box | Full-screen viewer: bar 66, wrapped name, native-scrolling body, document at full width, url link card, sticky footer with one full-width action (2.8) | Area |
| MAT-06 | major | M-04 | MaterialsCategory.tsx:44-46; PartnerMaterials.tsx:138-140; FiltersDrawer.tsx | Android back / iOS swipe with the viewer or the filters sheet open leaves the folder for /materials | Phones push `?file=<id>` for the viewer and a history entry for the filters sheet; popstate closes them (2.10, MS-2) | Area + Shared |
| MAT-07 | major | M-06, MAT-V12 | FileCard.tsx:79-125 (24 x 24 actions); PreviewPanel.tsx:216-234 (32 x 32); FiltersDrawer.tsx:155-163 (32), 43-55 (28), 69-85 (24 rows, 16 gaps); Hero.tsx:119-125 (crumb 82 x 22); PreviewPanel.tsx:106-113 (url link 175 x 22) | Primary targets below 44; a near miss on the 24-px row action opens the viewer instead | 44 boxes on row actions (`hitArea`), 48 sheet / viewer closes, 44 group heads and option rows, PhoneBackCrumb 44 hit, 44 url link (2.2, 2.6, 2.8, 2.9) | Area (+ Shared N1) |
| MAT-08 | major | MAT-V04, MAT-V05, M-07 | FileCard.tsx:37-49 (`group-hover` / `group-focus-visible` only), 79-95 | Lock reason never shows on touch: the visitor tap jumps into the auth drawer without context; the partner padlock gives no feedback at 390 (at 320 it depends on Chrome's focus-visible heuristic) | Phone caption under the size with the tooltip text verbatim ("Завантажити після авторизації." / "Файл доступний за запитом."), same caption above the viewer action; tooltip `max-lg:hidden` (2.6, 2.8) | Area |
| MAT-09 | major | MAT-V06 | FiltersDrawer.tsx:127-174 | Filters = desktop side drawer squeezed to 92vw (358.8 + a 31-px scrim strip at 390), r48, #d2d2d2 border, title 32/36 off scale, close 32, heads 28, option rows 24 (13-15 small targets) | Full-screen sheet = catalog-b2c 2.15 recipe: 66 bar, Title Large, 44 rows, #d2d2d2 group dividers (2.9) | Area |
| MAT-10 | major | MAT-V07, M-09 | FiltersDrawer.tsx; Hero.tsx:69-76 | No "show results" and no reset in the sheet; toggles apply invisibly behind a 92 % sheet; afterwards only a 20-px badge tells that a filter is on, no removable chips | Sticky footer with the live "Знайдено N ..." status + "Скинути" / "Показати"; applied chips + "Скинути фільтрацію" under the search row (2.4, 2.9) | Area |
| MAT-11 | major | MAT-V08, M-14 | Hero.tsx:103-130 | Folder crumb wraps to 2 lines (78 tall) with a dangling "/" at the end of line 1 (price-lists up to 430), repeats the H1, generic landmark "Навігація" | ShopCrumbs / PhoneBackCrumb one line "<- Матеріали" / "<- Головна" (2.2) | Shared N1 + Area call site |
| MAT-12 | major | MAT-V09 | FolderCard.tsx:25-35; MaterialsHome.tsx:66; PartnerMaterials.tsx:107 | Folder cards 158 tall for two short lines (70 % empty), 7 cards = 1202 px (40 % of the page), 18/24 800 off scale, r24, 16 apart | One-row filled card 100 tall, Title Large, r32, 24 apart (2.5) | Area |
| MAT-13 | minor | MAT-V10 | Hero.tsx:102, 132, 141; MaterialsHome.tsx:60; MaterialsCategory.tsx:74 | Head rhythm off the master: crumb -> H1 32 (48), H1 -> tagline 12 (16), head -> search 40, search -> list 40 (48 / 48) | `gap-12`, `gap-4`, `mt-12` row, `mt-12` lists (2.2, 2.3) | Area |
| MAT-14 | minor | MAT-V11 | platform/ui/CabinetPageHead.tsx:63-75 | Partner head 32/36 -0.64 (no token), subtitle 14/24, 24-px spacings | shell-cabinet 2.5 (H1 `text-h2`, 14/20, 48 / 16 / 48) | Shared (shell-cabinet) |
| MAT-15 | minor | MAT-V13, M-10 | MaterialsHome.tsx:61-64; MaterialsCategory.tsx:75-78; PartnerMaterials.tsx:74-76; Hero.tsx:33-45 | Empty result = one grey line with no way back, the page collapses (2980 -> 1802); the search has no clear button (native cancel hidden), Enter does nothing and keeps the keyboard up, no `enterKeyHint` | TR-24 empty block with "Скинути пошук і фільтри"; search form + Enter blurs + `enterKeyHint="search"` + phone clear cross (2.3, 2.7) | Area |
| MAT-16 | minor | MAT-V14 | FileCard.tsx:22-26, 41 | Preview-head tooltip (placement "below", right-0) starts at x -53 at 320 on pointer devices, clipped | Tooltip hidden below 640 (`max-lg:hidden`); the caption replaces it (2.6) | Area |
| MAT-17 | minor | M-08 | ScrollUpDock.tsx:55-56, 290-365 | The 100-px corner FAB covers the row download at 320 x 568 and scrolls to the top instead | shell-public PS-04 hides the FAB on shop-canvas phones (this route has the marker); B2B routes have no dock. Verify only | Routed (shell-public) |
| MAT-18 | minor | M-11 | MaterialsHome.tsx:34-37; MaterialsCategory.tsx:40-44; PartnerMaterials.tsx:82-85, 134-138 | Search and filters live in component state only: Back from a folder resets the landing, a filtered list cannot be shared | URL state `q` / `dir` / `type` via `history.replaceState` (2.10) | Area |
| MAT-19 | minor | M-12 | cart/useModalBehavior.ts:78-80 | After a B2C sign-in from the viewer the opener (the "Увійти, щоб завантажити" button / padlock) is replaced, focus lands on `<body>` | Stack fallback: when the opener is gone, focus the new top entry's initial element (the viewer close); with an empty stack use shell-cabinet SN-4 `fallbackFocus` (MS-1) | Shared |
| MAT-20 | minor | M-13 | MaterialsCategory.tsx:60; FileCard.tsx:97-111 | A signed-in B2C customer sees the visitor padlock for ~230 ms (SSR renders the visitor view) | `pending = !useHydrated() && file.locked`: empty action slot + invisible caption until hydration (2.6) | Area |
| MAT-21 | minor | MAT-V15, M-15 | platform/SideMenu.tsx:53, 89; platform/PlatformFooter.tsx:19, 31 | Partner shell on /materials: strip labels 10 px, strip 344 wide scrolls at 320 with the active "Матеріали" tile cut, legal bar copyright ends at x 346 > 320 | D1 shell (strip removed, legal band wraps) | Routed (shell-cabinet SC-02 / SideMenu) |
| MAT-22 | nit | MAT-V16 | Hero.tsx:141, 72 | Search pill -> disc gap 16 (TR-10: 8); count badge 4 px outside the disc | Gap 8 (`gap-2 lg:gap-4`). Badge: rejected - kept as today for parity with the shared FilterButton (catalog SN-C5) and the desktop; it stays inside the 24 gutter | Area (gap) / Rejected (badge) |
| MAT-23 | nit | MAT-V17, M-16 | FileCard.tsx:124, 164; PreviewPanel.tsx:213, 106-113; data.ts:96 | `url` rows / viewer use the tray-arrow download glyph although they open a link; url files read "Розмір: 14 MB" | Phone: arrow-up-right glyph, meta "Посилання", footer "Відкрити посилання"; desktop unchanged (Figma draws the tray) (2.6, 2.8) | Area |
| MAT-24 | minor | functional misc + shell-cabinet SC-09 | src/app/materials/[category]/page.tsx:28 (`notFound()`); no src/app/not-found.tsx | `/materials/unknown` shows Next's English "404 / This page could not be found." in system font (both skins) | Branded global not-found (catalog SN-C10 / shell-cabinet C7); nothing in this area | Routed (shared) |

Count: 24 findings, all to be fixed in this pass. Area 16 (MAT-02, 05,
06 viewer part, 07, 08, 09, 10, 11 call site, 12, 13, 15, 16, 18, 20, 22
gap, 23), Shared 7 (MAT-01, 03, 04, 06 sheet part, 11 atom, 14, 19; 06 and
11 are split between area and shared), Routed 3 (MAT-17, 21, 24), one
part rejected (MAT-22 badge position, reason above). Not reported as bugs: the functional
"harness notes" (synthetic scroll gestures, swallowed tap after a fast
drag) and the landscape 844 x 390 case (desktop canvas, frozen; the panel
is usable there per M-03).

---------------------------------------------------------------------

## 4. Shared needs

| id | Atom / API | Status | Proposed API / classes | Needed for |
|---|---|---|---|---|
| MS-1 | Modal stack in `cart/useModalBehavior.ts` (extends shell-public N2 `preventScroll`, cart N1 hardening, shell-cabinet SN-4 `fallbackFocus`) | exists, needs change (shared) | Module scope: `const stack: { id: symbol; container; initial }[] = []; let savedOverflow: string \| null = null; const inertCount = new Map<Element, number>();`. Open: push the entry; if it is the first, `savedOverflow = root.style.overflow`, set "hidden". Inert: for each `inertSelector` match not containing the container: if `inertCount` has it -> +1; else if it has no `inert` attribute -> set it and count 1; else (someone else set it) skip. Focus `(initial ?? container).focus({ preventScroll: true })`. Keydown: `if (stack[stack.length - 1]?.id !== id) return;` before Escape / Tab handling (keeps the `defaultPrevented` check). Cleanup: remove the entry by id (not pop); if the stack is empty restore `savedOverflow ?? ""` and reset; decrement inert counts, remove the attribute at 0; focus only if the removed entry was the top: opener if `isConnected` and not inside `[inert]`, else the new top entry's `initial ?? container`, else `fallbackFocus?.()`; always `{ preventScroll: true }`. Public signature unchanged (+ `fallbackFocus?` from SN-4) | MAT-01, MAT-03, MAT-04, MAT-19; every overlay (cart, auth, stock, Modal718, filters, viewer) |
| MS-2 | Back-to-close hook for sheets | new (shared) - one hook under one name: catalog SN-C8 `useSheetHistory` = auth N-J / order-detail N14 `useBackToClose` | `useSheetHistory(open: boolean, onClose: () => void, opts?: { media?: string = "(max-width: 639.98px)" })`: on open (media matches) `history.pushState(null, "", location.href)` + remember; `popstate` while remembered -> forget + `onClose()`; closed by other means while remembered -> forget + `history.back()`; unmount -> leave the entry. `onClose` must be stable | MAT-06 (filters sheet). The viewer uses the area hook with `?file=` (2.10) on the same pattern |
| MS-3 | `ShopCrumbs` / `PhoneBackCrumb` (ui/Breadcrumb.tsx) | new exports, shell-public N1 | exact JSX in shell-public 2.4 | MAT-11 (Hero.tsx call site) |
| MS-4 | `FilterButton` (ui/FilterButton.tsx, extracted from materials/Hero.tsx:50-79) | new, catalog SN-C5 (optional) | `{ count; expanded; onClick; badgeDesktop?: boolean }`; materials passes `badgeDesktop` | 2.3 (else the local MaterialsFiltersButton stays, + focus ring) |
| MS-5 | `SheetFooter` (and `SheetBar`) | new, catalog SN-C8 / cart N7 / auth N-A | footer `sticky bottom-0 z-[1] mt-auto flex flex-col gap-3 border-t border-stroke-subtle bg-white px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]` + className. Materials uses the footer in the viewer and mirrors the bar classes (its closes are shared with desktop) | 2.8, 2.9 |
| MS-6 | `LoadMore` (ui/LoadMore.tsx) | new, dashboard SN-06 / catalog SN-C4 | `{ shown; total; onMore; onLess?; className?; moreRef? }` | 2.7 (unreachable with the mock) |
| MS-7 | `useIsPhone()` (ui/useIsPhone.ts) | new, catalog SN-C9 (= catalog-b2b / cart `useMediaQuery` + `usePhone`; one hook) | `boolean \| null` (null on SSR / hydration) via useSyncExternalStore over `matchMedia("(max-width: 639px)")` | load-more slicing (2.7) |
| MS-8 | `PanelEmptyState` (platform/ui/PanelEmptyState.tsx) | new, dashboard SN-05 / catalog SN-C7 | `{ title; text?; icon?; action?; className? }` | 2.7 |
| MS-9 | CabinetPageHead phone variant + CabinetPage slab | exists, needs change (shell-cabinet 2.4 / 2.5) | as shell-cabinet 4b | partner head + slab (MAT-14) |
| MS-10 | Cabinet shell (PlatformHeader burger sheet, no strip, legal band) | exists, needs change (shell-cabinet) | D1 | MAT-21 |
| MS-11 | Root viewport `viewportFit: "cover"` | new, shell-public N4 / catalog SN-C12 | `export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" }` | non-zero `env(safe-area-inset-bottom)` in both sheet footers |
| MS-12 | Corner FAB off on shop phones | shell-public 2.8 / PS-04 | `max-lg:[:root:has([data-canvas=shop])_&]:hidden` on CornerFab | MAT-17 |
| MS-13 | Auth sheet layering contract | auth.md 2.1 (layer `z-[60] lg:z-40`, rendered by AuthProvider after the page) | must stay >= z-60 and after `{children}` in the DOM so it paints over the materials viewer; `openAuth()` callable while the viewer is open | 2.8 lock flow |
| MS-14 | Branded not-found | catalog SN-C10 / shell-cabinet C7 | `src/app/not-found.tsx` | MAT-24 |
| MS-15 | Button | exists, no change | uses `size="small"`, `fullWidth`, `variant="outlinedDark"`, `disabled` + `disabledStyle="solid"`, `href` + `download` / `target` / `prefetch` passthrough (Link rest props), `plus` via LoadMore. The D8 change of `large` does not touch materials (no default-size Button here) | 2.7-2.9 |
| MS-16 | Icons | exist | `XMarkIcon`, `MagnifierIcon` (catalog/icons), `ArrowUpRight` (blog/icons), `ClearIcon`, `FolderIcon`, `FileTile` (materials/icons), `CheckboxOn/OffIcon` | 2.3-2.9 |

Fallbacks if a shared atom is not built when this area runs: MS-3 inline
JSX (2.2), MS-4 local button, MS-5 inline footer classes (given in full in
2.8 / 2.9), MS-6 / MS-7 / MS-8 local copies in materials/phoneParts.tsx
with exactly the classes above (swap later, no visual change). MS-1 and
MS-2 have no area fallback: MAT-01 / 03 / 04 / 19 stay open until the
shared layer lands them; the viewer's own `?file=` history (2.10) works
without MS-2.

---------------------------------------------------------------------

## 5. Files

Area files (disjoint from every other area):

| File | Change |
|---|---|
| src/components/materials/Hero.tsx | head: ShopCrumbs call site, `gap-12`, title block `gap-4` (102-135); search row `mt-12 gap-2 lg:gap-4` (141); `below?: ReactNode` slot for the chips; MaterialsSearchField -> `form role="search"` with `inputRef`, `enterKeyHint`, `autoComplete="off"`, phone clear cross, magnifier hidden on phones while typing (33-45); MaterialsFiltersButton -> shared FilterButton `badgeDesktop` (or + focus ring) (50-79) |
| src/components/materials/FolderCard.tsx | phone row card: `max-lg:` overrides on the link, text column and title (25-35) |
| src/components/materials/FileCard.tsx | LockTooltip `max-lg:hidden` (41); FileAction props `hitArea`, `pending`, 44 boxes, url arrow glyph on phones (58-127); FileCard row overrides, name clamp + type, `FileMeta`, lock caption, `pending` prop (135-175) |
| src/components/materials/FiltersDrawer.tsx | full-screen phone sheet (layer, aside, sticky bar, close, groups wrapper, 44 rows / heads, footer), props `resultLabel`, `activeCount`, `onReset`, `useSheetHistory` (31-177) |
| src/components/materials/PreviewPanel.tsx | full-screen phone viewer (layer, scrim, aside, phone bar, scroll body, head-row overrides, shared close pinned to the bar, document box / url card / thumb, phone footer + `ViewerAction`) (35-247) |
| src/components/materials/MaterialsHome.tsx | use `useMaterialsUrlState`; folder list `max-lg:gap-6`; empty state; chips via the `below` slot; filters sheet new props (`Знайдено ${categoriesCount(n)}`) |
| src/components/materials/MaterialsCategory.tsx | use `useMaterialsUrlState(filesOf(slug))`; phone list container classes; `useIsPhone` + load-more; empty state; `pending` via `useHydrated`; chips; sheet props; preview open / close through the hook |
| src/components/materials/PartnerMaterials.tsx | Toolbar block + chips (51-72); `Empty` desktop `max-lg:hidden` + phone panel empty (74-76); hook in both pages; folder list `max-lg:gap-6` (107); file panel classes (175); load-more; sheet props |
| src/components/materials/data.ts | NEW exports: `DIRECTION_SLUGS` (+ reverse lookup), `categoriesCount(n)` ("1 категорію" / "2 категорії" / "5 категорій"), URL parse / build helpers (`parseMaterialsParams(search)`, `buildMaterialsSearch(state)`); no data changes |

New files (this area):

| File | Content |
|---|---|
| src/components/materials/phoneParts.tsx | `MaterialsAppliedFilters`, `MaterialsEmpty`, `PHONE_PAGE`; local fallbacks of MS-6 / MS-7 / MS-8 only if the shared atoms are missing |
| src/components/materials/useMaterialsUrlState.ts | the page-state hook of 2.10 |
| audit/mobile/materials/verify.mjs (audit only) | the verification run of section 6 |

Shared files this area depends on (section 4; NOT edited by this area):
cart/useModalBehavior.ts (MS-1), ui/useSheetHistory.ts (MS-2, new),
ui/Breadcrumb.tsx (MS-3), ui/FilterButton.tsx (MS-4, new), ui/SheetBar.tsx /
SheetFooter (MS-5, new), ui/LoadMore.tsx (MS-6, new), ui/useIsPhone.ts
(MS-7, new), platform/ui/PanelEmptyState.tsx (MS-8, new) +
platform/ui/index.ts, platform/ui/CabinetPageHead.tsx + CabinetPage.tsx
(MS-9), platform/PlatformHeader.tsx, SideMenu.tsx, PlatformFooter.tsx,
PlatformChrome.tsx (MS-10), app/layout.tsx (MS-11), ScrollUpDock.tsx
(MS-12), auth/AuthDrawer.tsx + AuthProvider.tsx (MS-13), app/not-found.tsx
(MS-14). Routes `src/app/materials/**` need no change.

---------------------------------------------------------------------

## 6. Verification checklist (fresh verify agent)

Tools: audit/mobile/kit/phone.mjs (`openPhone` touch contexts,
`shootSegments`, `shootViewport`, `domChecks`), audit/kit/geom.mjs,
audit/kit/materials-states.mjs (desktop states, `W` / `H` env),
audit/mobile/kit/baseline.mjs + compare.mjs, the audit scripts in
audit/mobile/materials/ (functional.mjs, visual.mjs, probe-*.mjs,
spec-probe*.mjs). Taps with `page.touchscreen.tap(x, y)` (locator.tap
auto-scrolls under the sticky header); `scrollTo({ top, behavior:
"instant" })` before viewport shots; judge focus rings after real taps.

G0 (build agent, BEFORE editing): desktop references of every overlay
state the 76-shot baseline lacks:
`W=640 H=900`, `W=1024 H=768`, `W=1536 H=791`, `W=1710 H=1117` x
`node audit/kit/materials-states.mjs audit/mobile/materials/desktop-before
<prefix> catalogs price-lists` for seeds none (no LOCALSTORAGE_JSON) and
b2b (`LOCALSTORAGE_JSON` = seed-b2b) -> root, root-filters, folder,
folder-filters, preview, lock-tip. Add at 1710: search typed "Leon" (no
clear cross may appear), empty "zzzz", one filter checked (badge, drawer).

Widths x heights: 320 x 568, 360 x 780, 390 x 844, 430 x 932, 600 x 960;
DOM checks also at 375 x 667, 414 x 896, 639 x 900. Seeds S1, S2, S3.

States: ST1-ST20 (section 1.3). Overlays at 320 x 568, 390 x 568 and
430 x 932 in addition.

Measurements (390 x 844 unless noted, tolerance 1 px):
- Public landing: crumb row y 114, height 40, one line, label
  "Головна" 16/22 600 rgb(52,52,53), no "/" and no orange crumb visible;
  H1 y 202, 40/42 700 -0.8; tagline y 260, 14/20 rgb(119,119,121); search
  row top 368, pill x 24 w 282 h 46 font 16, disc x 314 52; first folder
  card y 468.
- Folder cards: x 24, w 342 (272 at 320, 552 at 600), h 100 (128 when the
  title wraps), radius 32, padding 24, 24 apart; public bg rgb(248,248,
  248), partner bg white; glyph 48 at x 48; title x 112, 22/28 600
  -0.44 rgb(29,29,31), never broken inside a word at 320 (each line's
  text is whole words); count 14/20; no element right of x 342 inside
  the card.
- Public folder: crumb label "Матеріали", href /materials; H1 y 202;
  search top 292; list top 392 with a 1-px rgb(210,210,210) top border,
  rows separated by 1-px lines, bottom border; footer top = list bottom +
  60.
- Rows: tile 48 r12 at x 24 (partner x 48); name x 88 (partner 112),
  16/22 700 +0.16, at most 2 lines (height <= 44), `-webkit-line-clamp`
  2; size 14/20; row py 16; action box 44 x 44 with its glyph's right
  edge at x 366 (partner 342) and the box inside the viewport; url rows
  show the arrow glyph and "Посилання"; cat-9 (S1) shows the caption
  "Завантажити після авторизації." 12/16; price-3 (S3) "Файл доступний за
  запитом."; no caption for S2.
- Partner panel: radius 32, bg white, padding x 24 / y 8, first row top =
  panel top + 8.
- Applied chips (one direction + one type checked): row top = search
  bottom + 16 (visual pill top), pills 36 tall inside 44 boxes, 8 apart,
  14/20 500; long direction pill <= 272 at 320 with ellipsis;
  "Скинути фільтрацію" 44 tall; list top = chips bottom + 48.
- Empty (zzzz): block centred, title 22/28 "За вашим запитом нічого не
  знайдено.", text 14/20, Button 42 "Скинути пошук і фільтри" resets query
  + filters; partner: inside a white r32 card; footer still 60 below.
- Filters sheet: layer z-index 60, sheet rect = viewport (390 x 844, 320 x
  568), bar 66 with the title 22/28 600 at x 24 and the close 48 box whose
  glyph sits at x 342 / y 21; group heads >= 44, option rows 44; group
  dividers rgb(210,210,210); footer: status 14/20 "Знайдено 9 файлів"
  (folder) / "Знайдено 7 категорій" (landing), pills 167 x 42 (132 at
  320), "Скинути" disabled with nothing checked; bar and footer stay put
  while the body scrolls at 320 x 568.
- Viewer: layer z 60; aside rect = viewport, no radius, no border; bar
  66 "Перегляд"; close 48 box at (vw-60, 9); body scrolls, close does not
  move after scrolling the body by 300; name 22/28 600 fully visible (no
  ellipsis, <= 3 lines at 320); document box width 342 (272 at 320), r24;
  no element with `cursor: grab` visible (thumb hidden); url file: link
  card height 56, link >= 44 tall; footer 75 tall (103 with a caption),
  button 342 x 42 at y 786; labels per the table in 2.8; partner-locked
  button disabled with bg rgb(232,232,233).
- No 0.5-px lines; no `rounded-3xl` (24) on phone cards / panels (the
  document box r24 is the only one); no `text-[14px] leading-6` captions
  in the phone DOM of these pages.

DOM checks (`domChecks`) at every width for ST1, ST5, ST6 (filters open),
ST7 (viewer open, pdf + url + locked), ST13, ST14, ST16, ST17: no
overflowX, offRight, offLeft, wideElement, tinyText, inputZoom,
hScroller, overlapText, brokenImage, stretchedImage. smallTarget: only
the header logo 100 x 33 (known shell item). clippedText: only intentional
ones (row names `(ellipsis/clamp)` below 390, the long direction chip at
320, the sheet / viewer bar titles never). fixedTall: only the open sheet
/ viewer (and the shell's own known items). Console / page errors: 0
(except the expected 404 resource on /materials/unknown).

Flows (each at 390 x 844 and 320 x 568, touch; console errors 0):
1. Landing: type "Серт" -> 1 card, URL `?q=Серт` (after 300 ms), clear
   cross -> 7 cards, input focused; Enter blurs the input.
2. Landing filters: open, check "Засоби індивідуального захисту" ->
   status updates live, "Показати" closes, focus on the filter disc, chip
   visible, URL `?dir=protect`; remove the chip -> 7 cards; "Скинути" in
   the sheet disabled when empty.
3. Open "Каталоги", Back -> landing with the same `q` / `dir`, chips and
   badge restored.
4. Folder: tap row "Каталог Leoniti 2026.pdf" -> viewer, URL
   `?file=cat-1`, html overflow hidden, header inert; Back -> viewer
   closed, URL without `file`, still on /materials/catalogs, scrollY as
   before, focus on the row button; repeat closing with the cross and
   with Escape (URL entry popped, no extra Back needed).
5. Filters sheet + Back: open, Back -> sheet closed, same URL path, page
   still on the folder; html overflow restored.
6. Deep link `/materials/catalogs?file=cat-3` -> url viewer open on load;
   cross -> URL without `file` (replaceState), Back leaves to the
   previous page; unknown `?file=zzz` -> stripped, no viewer.
7. Lock flow S1: viewer cat-9 -> "Увійти, щоб завантажити" -> auth sheet
   above the viewer (elementFromPoint at the centre is inside the auth
   dialog) -> sign in 0500000002 / binar2026 -> auth closed, viewer
   still open, footer "Завантажити", focus on the viewer close, page still
   locked until the viewer closes, then unlocked (touch drag scrolls).
8. Lock flow B2B: same, sign in 0500000001 / binar2026 -> partner skin,
   viewer reopened on cat-9 with "Завантажити"; close -> html overflow ""
   and the page scrolls by touch (MAT-01).
9. Escape order: viewer + auth open, Escape -> auth closes, viewer stays,
   header still inert, html still hidden; Escape -> viewer closes,
   overflow "" (MAT-03).
10. Tab order: viewer + auth open, Tab x 3 moves focus through three
    different controls inside the auth sheet (MAT-04).
11. Row padlock (S1 price-lists): tap -> auth sheet; close -> focus back
    on the padlock, scrollY unchanged.
12. Partner price-3: padlock tap does nothing (no error); viewer shows
    the caption + disabled button.
13. B2C first paint (S2, 6x CPU throttling, frames at 50 / 150 / 300
    ms): no padlock is ever painted on cat-9's row (MAT-20); visitor (S1):
    the caption slot does not shift (row height constant from first paint).
14. Downloads: row and viewer "Завантажити" download `placeholder.pdf` as
    the file name; url opens https://binar-2000.com in a new tab; no
    client-side navigation to the pdf path.
15. Reduced motion: sheets open / close without transitions; normal
    motion: 60 ms after opening the sheet's `translate` is between -12px
    and 0.
16. Scroll-up: no visible corner "Догори" FAB on the public pages at
    320 x 568 after scrolling 600 (MAT-17).
17. Rotation 390 -> 844 x 390 with the viewer open: desktop panel layout,
    no lock leak after closing.

Pixel guard (mandatory):
- `node audit/mobile/kit/baseline.mjs audit/mobile/after` then
  `node audit/mobile/kit/compare.mjs audit/mobile/baseline
  audit/mobile/after`: 0 differing pixels for every landing-* and
  *-1710-* shot, including shop-1710-materials, shop-1710-materials-cat,
  cabinet-1710-materials-b2b, cabinet-1710-materials-b2b-cat. The four
  phone-390-*materials* shots are EXPECTED to differ.
- G0 set re-shot after the change: identical at 640 / 1024 / 1536 /
  1710 for root, folder, both drawers (incl. checked state), the preview
  panel (pdf, url, locked) and the lock tooltip hover.
- Spot checks at 1710 (computed): filters h2 44 / 48 / 700 / -0.88; drawer
  close 32 x 32; option row height 24; preview h2 24 / 28 / 700 / -0.48
  with ellipsis; preview close 32 static; file name 18 / 24 / 800 one line;
  folder title 18 / 24 / 800; no chips row, no load-more, no phone
  footers in the DOM tree's rendered boxes.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

1. TR-32 says "lock tooltips open on tap". This spec prints the reason as
   a caption instead (always visible) and hides the tooltip below 640:
   the visitor padlock's tap is already the sign-in action, the partner
   padlock has nothing else to do, and the tooltip clips at 320 (MAT-16).
   If the orchestrator wants the tap tooltip anyway: make the partner
   padlock a button toggling the chip and clamp the chip to the gutter.
2. Partner file rows sit in a white r32 panel (D1 / TR-07 cabinet list
   look), which leaves 118 px for names at 320 (most clamp to 2 lines;
   188 at 390, 4 names clamp). Alternative: rows directly on the slab
   between #d2d2d2 lines (the master's rows on a grey panel 3127:17385),
   166 / 236 px like the public skin. The system spec should pick one
   rule for "lists on the slab" across cabinet pages.
3. Filters sheet = catalog-b2c 2.15 verbatim (#d2d2d2 group dividers, 48
   visual rhythm) rather than TR-28's #8e8e8f line + 24; one sheet for the
   whole shop wins. Same for the footer status line, which is an addition
   to TR-10 (both specs need it to make the live apply visible).
4. Shared atom names: the back-to-close hook has three names in the
   sibling specs (catalog `useSheetHistory`, auth N-J / order-detail N14
   `useBackToClose`); the phone media hook has three (catalog
   `useIsPhone`, cart `useMediaQuery`, order-detail `usePhone`); the sheet
   bar / footer has two homes (cart N7 / auth N-A `ui/SheetBar.tsx`,
   catalog SN-C8). This spec uses the catalog names; any single choice
   works.
5. History integration risk (also auth C6 / order-detail O-11): Next 16
   documents native `pushState` / `replaceState` integration, but a
   pushed same-path entry + `history.back()` on close must be verified for
   scroll restoration (flow 4) and for interplay with the cart / auth
   sheets if they adopt MS-2 too (LIFO order). If it misbehaves, drop the
   phone push and keep only the `?file=` deep link + replaceState.
6. URL state (`q` / `dir` / `type` / `file`) and Enter-blurs-the-search
   change DESKTOP behaviour too (no pixel change at load): the desktop
   URL updates while filtering and `?file=` opens the desktop panel. The
   catalog does the same with `router.replace`; materials uses
   `history.replaceState` to avoid a Suspense boundary on the SSG
   folder pages. Orchestrator call.
7. FilterButton extraction (catalog SN-C5) names materials/Hero.tsx:50-79
   as its source: the shared layer creates ui/FilterButton.tsx, this area
   then switches its two call sites. The count badge stays at `-right-1
   -top-1` (MAT-V16 badge part rejected for parity).
8. `url` files: phone-only arrow glyph and "Посилання" meta; the desktop
   keeps the Figma tray glyph and the placeholder "Розмір: 14 MB" (data.ts
   gives every url file a size). A data fix (no size for url files) would
   change desktop pixels - needs sign-off.
9. Folder cards drop the trailing chevron that TR-07 gives row links, to
   keep folder titles from breaking mid-word at 320 (2.5).
10. Public folder cards are FILLED (#f8f8f8, WhyUs filled-card pattern)
    on the white page, while D2 describes public panels with a 1-px
    #8e8e8f ring; the filled card is the desktop identity of this page and
    a master pattern on white pages. Confirm.
11. Head -> search 48 and search -> list 48 (this spec) vs any 24 that
    another shop / cabinet spec uses between a toolbar and its list; the
    system spec should state the toolbar -> list gap once.
12. The viewer bar title "Перегляд" is generic (NEW copy); alternative:
    the file type ("PDF-файл"). Other NEW strings: "Очистити пошук",
    "Відкрити посилання", "Увійти, щоб завантажити", "Знайдено N
    файлів / категорій", "Посилання" (meta), and the catalog's empty-state
    text / button.
13. Readability of real documents: pinch-zoom on the page image is the
    only zoom; when real PDFs land, a secondary "Відкрити файл" action in
    the viewer footer (native viewer) should be considered (not for locked
    files).
14. MS-1 (modal stack) and MS-2 change every overlay on the site,
    including the cart / auth overlays on the frozen landing routes
    (behaviour only; closed-state pixels unchanged). Accept globally, as
    shell-public O1 did for the menu.
15. Load-more cannot be exercised with the mock (max 9 files); keep it
    (D4 lists materials file rows) or drop it until the CMS feed exists.
