# Mobile shop + cabinet design (phones < 640 px) - system spec

Status: design phase output, 2026-11-05. Author: system-spec agent.
Scope: the phone layouts (< 640 px) of every shop and B2B cabinet page
and their shells. Desktop (>= 640) and the landing pages are frozen.

Inputs read in full: audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md
(D1..D13), audit/mobile/lang/figma-mobile-language.md (TR-01..TR-32),
audit/mobile/lang/code-mobile-recipes.md, and the fifteen area specs in
docs/superpowers/specs/mobile/ (shell-public, shell-cabinet,
catalog-b2c, catalog-b2b, pdp, cart, checkout, auth, dashboard,
orders-list, order-detail, returns, profile, assortment, materials).

Precedence (binding for every build and verify agent):

1. The user's directive (section 1.1).
2. DECISIONS.md D1..D13 as AMENDED by this spec (amendments are
   numbered A-1..A-17 in section 7.1; each names the D it changes).
   Critique round 1 (section 10, 2026-11-05) revised A-7 back to D7 and
   added A-15..A-17; its values are merged into sections 3-9.
3. This system spec (tokens, shells, atoms, templates, build plan).
4. The translation rules TR-01..TR-32 of the language doc.
5. The area specs. Each area spec now starts with a "System alignment"
   block that lists where this spec overrides it; inside an area spec,
   that block wins over the body text below it.

Conventions: phone = unprefixed classes and `max-lg:`; desktop = `lg:`
(sm / md / lg all flip at 640, never `xl:`). Numbers are CSS px at
390 x 844 unless a width is named. "Content" = viewport - 48 (272 at
320, 312 at 360, 342 at 390, 382 at 430, 552 at 600). "Inner" = content
- 48 (inside a p-24 card: 224 / 264 / 294 / 334 / 504). UI strings are
Ukrainian verbatim. File:line references are as of 2026-11-05.

---------------------------------------------------------------------

## 1. Intent

### 1.1 The user's directive (2026-11-05)

"Проверь абсолютно все страницы проекта где нету мобильной версии в
фигме и сделай мобильную версию ориентируясь на то что у нас уже
сделано и на что мобильная версия есть в фигме, чтобы все было в 1 и
том же дизайне. Сделай максимальное количество проверок, анализа ...
максимально красиво." / "Поработай максимально качественно над
мобильными версиями этих страниц." / "Максимальное число проверок ...
максимально приближенный дизайн к тому который уже был на фигме нашей
мобайл. И так же все баги устрани в дизайнах."

Why: Figma has phone masters only for the landing pages (six 390-px
masters + the phone menu + the mobile typescale 3085:3865). Every shop /
cabinet page was drawn at 1710 only, so their phone layouts were
improvised during the desktop builds: tables scroll sideways inside
342-px cards, a 10-px side strip replaces navigation, three button
heights coexist, overlays are desktop drawers squeezed to 92vw. The
user wants those pages to look as if the landing's mobile designer drew
them, with every visual and functional bug fixed and proven by checks.

### 1.2 Goals

- G1. One phone design language across landing, shop and cabinet: the
  master header / menu idiom, 24 gutters, the mobile typescale only,
  r32 cards, Button/Small 42 pills, 1-px dividers, the 48 / 24 / 60
  rhythm, full-screen sheets and centred cards (section 3).
- G2. Every listed route and state works at 320 / 360 / 375 / 390 /
  414 / 430 / 600 / 639 with no horizontal overflow, nothing clipped,
  no tap target under 44 (42 for pills), no input under 16 px.
- G3. Every bug in the fifteen area specs' section 3 is fixed, or is
  explicitly rejected / deferred with a reason (section 5 counts them).
- G4. Shared atoms instead of fifteen local copies: one Sheet, one
  modal card, one list row, one product line, one load-more, one
  search row, one sort menu, one empty state, one toast (section 3.4).
- G5. Proof: per-cluster verify agents (screens, domChecks, measured
  geometry, flows, console errors) plus the pixel guard for the frozen
  surfaces (section 6).

### 1.3 Non-goals

- No tablet layout (640..1023 stays the zoomed desktop canvas, D13).
- No change to any desktop layout (>= 640) or to any landing page at
  any width; landing bugs found at 320 are reported only (D13).
- No new Figma frames, no Figma MCP calls in this pass.
- No content / product decisions beyond the phone copy listed in
  section 9 (legal pages, CRM archive downloads, prices, mock data).
- No landscape-phone LAYOUT: 844 x 390 stays the desktop canvas. Two
  pixel-neutral landscape fixes ARE built in F1 (critique round 1):
  drawers and modals stop shrinking on touch screens (O-4, A26) and shop /
  cabinet canvases letterbox the notch (O-16, A26).

### 1.4 Anti-goals (any of these makes the pass a failure)

| # | Failure | How it is detected |
|---|---|---|
| X1 | A pixel changes on a desktop (>= 640) render or on any landing page | compare.mjs over the 50 frozen baseline shots = 0 differing files; per-cluster desktop before / after sets for overlays not in the baseline (6.4) |
| X2 | A tablet layout, a new width breakpoint, an `xl:` or `md:` class, or an `sm:` value that differs from `lg:` | grep of the diff for `xl:` / `md:` and for new `sm:` tokens. Allowed: new `sm:` tokens only as the restore of an unprefixed phone value in files whose desktop strings are already `sm:`-based (Button `large`, Modal718, ModalActions); `max-[N]:` only for N < 640 phone-only tweaks (e.g. the sheet short title below 375); height queries `[@media(max-height:499px)]:` (3.1.6). Review |
| X3 | A bottom tab bar, a bottom sheet, a side drawer on phones, a swipe carousel with dots | review + screenshots (D13, TR-09, TR-29) |
| X4 | An invented colour (anything outside section 3.1.2) | grep of the diff for `#` / `rgb(` literals not in the palette (3.1.2 incl. its desktop-identity list) |
| X5 | A hover-only affordance (information or an action reachable only on hover) | review; flows run with touch emulation (hover: none) |
| X6 | Horizontal overflow or clipped content at 320 | domChecks overflowX / offRight / offLeft / wideElement / clippedText = clean at 320 on every route and overlay |
| X7 | Type off the mobile scale on phones (32/36 titles, 14/24 captions, 15-px pills, 10-px labels, 18/26 modal text) | computed-style probes in the verify runs; domChecks tinyText |
| X8 | A tap target < 44 (pills 42, stepper boxes 40, chips 36 with a 44 pseudo hit) or an input < 16 px | domChecks smallTarget / inputZoom |
| X9 | Two looks for one role (two filter buttons, two list rows, two sheet bars, two empty states) | the consistency review of phase 4 against section 3.4 |
| X10 | A console error or page error in any verified state | phone.mjs `errors` = [] |

---------------------------------------------------------------------

## 2. Constraints

- Breakpoints (BRIEF "Breakpoint architecture"): globals.css `@theme`
  `--breakpoint-sm: 639.98px; --breakpoint-md: 639.99px;
  --breakpoint-lg: 640px`. New code: phone unprefixed, desktop `lg:`.
  Any unprefixed class that changes a property the desktop relied on
  gets its `lg:` restore in the same string; a `lg:text-*` token that
  follows an unprefixed `leading-*` re-declares the lg leading (recipes
  gotcha 2). Phone typescale tokens are UNLAYERED inside
  `@media (max-width: 639px)` and beat every utility on phones (gotcha
  1): never stack a phone override on a token element; on elements that
  also render on desktop use literals + `lg:` restores, or swap the
  token (`text-title-lg lg:text-title-md`).
- From 640 the page is the desktop at `html { zoom }` (landing 1440,
  shop 1710 via `data-canvas="shop"` from 1024). Phones: zoom 1.
- Pixel guard (BRIEF, D12): audit/mobile/baseline holds 76 shots; the
  50 frozen ones (landing-phone-* x 8 incl. landing-phone-menu,
  landing-1440-* x 7, shop-1710-* x 16, cabinet-1710-* x 19) must stay
  byte-identical; the 26 phone-390-* shots are expected to change.
  Tools: audit/mobile/kit/baseline.mjs, compare.mjs (procedure 6.4).
- Shared components that the landing renders (Header, Footer, Button,
  IconButton, Logo, ScrollUpDock, globals.css) may change only if the
  landing shots stay identical (D12); changes there are new props /
  variants, pixel-neutral additions, or shop-scoped selectors.
- Dev server: http://localhost:3000 is already running (Turbopack).
  Never start a second one, never kill it. A stale arbitrary class after
  a batch edit: verify computed styles, re-save, or `rm -rf .next` only
  with the orchestrator's go (memory: Tailwind v4 stale class).
- Git: no commit, push, stash or reset by any phase agent (BRIEF);
  the orchestrator commits on the user's request only.
- Figma: no MCP calls by spec / build / verify agents (BRIEF; remote
  server capped, desktop server needs the window in front). Masters are
  read from audit/figma-inventory/meta/ dumps with the python kit.
- Seeds: audit/kit/seed-b2b.json (partner), audit/mobile/kit/
  seed-b2c.json (customer); demo accounts B2B 0500000001 / B2C
  0500000002, password binar2026.
- Output hygiene: ASCII punctuation in code comments and docs (memory:
  the user's terminal breaks on non-ASCII glyphs); UI strings stay
  Ukrainian verbatim. NBSP in code is written via the code point
  (memory: tool decodes unicode escapes).

---------------------------------------------------------------------

## 3. The mobile system

### 3.1 Tokens

#### 3.1.1 Type roles (phone values; D9 + language 7)

| Role | Phone value | Class on a PHONE-ONLY element | Class on an element that also renders on desktop |
|---|---|---|---|
| Public page title (H1) | 40/42 Bold -0.8 | `text-h1 text-neutral-900` | same (token switches at 640) |
| Cabinet page title | 30/36 Bold -0.6 (Light run 300 only where desktop has it: "Вітаю,") | `text-h2 text-neutral-900` = `CABINET_TITLE` | same (desktop 44/48 -0.88 = today's literal) |
| Public section title (two weights) | 30/36 Bold + Light spans | `text-h2` / `text-h2-light` spans | same |
| Sheet bar title | 22/28 SemiBold -0.44 | `text-title-lg text-neutral-900` | n/a (bars are phone-only) |
| In-card / in-page section title | 22/28 SemiBold -0.44 | `text-title-lg` | `CABINET_SECTION_TITLE` = `text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 lg:font-bold` |
| Modal card title | 24/28 Bold -0.48 | `text-[24px] font-bold leading-7 tracking-[-0.48px]` | Modal718 keeps `sm:text-[32px] sm:tracking-[-0.64px]` |
| Product card title | 22/28 SemiBold, 2 lines | `text-title-lg line-clamp-2` | `text-title-lg max-lg:line-clamp-2` |
| Row id / item name / file name | 16/22 Bold +0.16 | `text-[16px] font-bold leading-[22px] tracking-[0.16px]` (`text-title-sm` is identical on both widths and may be used) | same literal |
| Amount / total / line total | 22/28 SemiBold -0.44 | `text-title-lg` | `text-[22px] font-semibold leading-7 tracking-[-0.44px]` + lg restores |
| Stat (KPI value, product card price, PDP hero price) | 30/36 Bold -0.6 (D3 / D9). The master Stat 30 (Cases 3094:5169, TeamCta 3117:12894, language 7) is SemiBold: weight ruling pending O-15 - do not cite those nodes as evidence for Bold | `text-[30px] font-bold leading-9 tracking-[-0.6px]` | same + lg restores |
| Body | 16/24 | `text-body-md` | `text-[16px] leading-6` |
| Modal / sheet description; explain-plus-one-CTA text (SignInPrompt, hero body 3082:3249) | 16/24 #343435 | `text-[16px] leading-6 text-neutral-800` | Modal718: `+ sm:text-[20px] sm:leading-7 sm:text-neutral-900`; SignInPrompt: `+ lg:text-body-sm lg:text-neutral-500` |
| Subtitle / meta / caption-like text | 14/20 #777779 | `text-body-sm text-neutral-500` | `text-[14px] leading-5 text-neutral-500 lg:leading-6` = `CABINET_SUBTITLE` |
| Labels, chips, menu rows, sort trigger, KV labels (KeyValueLine / KeyValueList dt, price-row dt) | 14/20 Medium | `text-[14px] font-medium leading-5` | same + lg restores |
| Pill label | 16/22 Medium | via `Button` (all phone pills are Button/Small, A1) | - |
| Eyebrow / status line / uppercase caption | 12/20 Medium UPPERCASE (tone colour; the only uppercase type in the masters, blog eyebrow 3176:5546). EVERY uppercase string on phones: StatusLine, B2BStatusLine, PhoneAvailability, PhonePrice / B2BYourPrice captions, B2BPriceTilePhone dt, ProductLine status, RecordRow eyebrow. No 14-px uppercase on phones | `text-[12px] font-medium uppercase leading-5` | same + `lg:` restores to the desktop 14/24 |
| Caption / helper | 12/16 #777779 | `text-[12px] leading-4 text-neutral-500` | same |
| Field error | 12/16 #d92d20, 8 below the ring | via fields.tsx Hint (A26) | - |
| Legal | Onest 14/30 | shells only | - |
| Inputs | 16 px always | `text-[16px]` | - |

Line-heights on phones come only from this table. `whitespace-nowrap`
on prices, counters, dates, ids (global `overflow-wrap: anywhere` on
phones splits numbers - gotcha 12); NBSP inside compound labels.
Titles: `text-balance` or `text-pretty` against orphans.

#### 3.1.2 Colours (no inventions, D13 / X4)

brand #f85a0b (`brand`); #1d1d1f `neutral-900` (text, solid pills,
disc rings); #343435 `neutral-800` (body on white, chip text, product
card ring); #4a4a4c `neutral-700` (menu rows, text buttons); #616162
`neutral-600` (lines on dark); #777779 `neutral-500` (meta, captions,
menu labels); #8e8e8f `stroke-default` / `neutral-400` (public panel
rings, chip rings, labels on dark); #d2d2d2 `stroke-subtle` (all
dividers inside panels, sheet lines); #d5d5d5 `bg-product` (product
photo box); #f5f5f5 `bg-cabinet` (cabinet slab); #f8f8f8 `bg-subtle`
(filled cards, pressed rows); #1d1d1f `bg-neutral-900` is ALSO the one
fill of every shop / cabinet DARK surface on phones (StickyBar dark, cart
summary, checkout summary footer, order / return TotalCard, KPI tiles,
assortment selection bar, cabinet legal bar: the desktop identity of every
shop dark band; C-40); #2d2d2f `bg-[#2d2d2f]` only for toasts (TR-31) and
the return wizard's Quizz-card band (TR-15; the landing footer and quiz
are landing code); #e8e8e9 `bg-button-disabled`; #a5a5a5 (inactive
glyphs); #ffe7e5 (error alert tile); status / payment sets unchanged
(#4a9200 positive, #d92d20 negative, #f26164 attention caption,
StatusPill tones; TR-14). White on dark: `text-white`, `text-white/60`.

Desktop-identity colours that phone recipes reuse (allowed, not
inventions; the X4 grep whitelists them): #ffe0cc `brand-soft`, #f1f1f2
`neutral-40` and the progress track `rgba(241,241,242,0.63)`, #ffbfba
(overdue chip fill), #bbbbbc (pending document tile glyph), #e8e8e9 (B2B
price tile, view-switch track).

Contrast (WCAG 1.4.3, measured by the UX critic). Accepted master
exceptions: white 14/20 on brand chips (3.25:1, chip 3176:5479), brand
12/20 eyebrows (3176:5546), the active menu row (brand +
`aria-current`), the selected ChoiceRow label (brand + the filled 40
marker; quiz option 3111:14541 as built in QuizForm.tsx:842-846). Brand
never carries a state alone. Labels on dark surfaces are #8e8e8f on
#1d1d1f (5.2:1). Open: 14/20 #777779 meta directly on the #f5f5f5 slab
measures 4.10:1 (D9 colour) - O-17.

#### 3.1.3 Radii (D5 + language 9)

| Element | Radius |
|---|---|
| Top-level card / panel / tile at content width (incl. dark KPI tiles, summary cards, list panels, form cards, folder cards, product cards, photo 206 boxes, category hero, PDP gallery stage) | r32 `rounded-[32px]` |
| Zone / CTA photo tiles (catalog banners, subcategory carousel) | r40 (kept) |
| Product line photo 64 | r16 `rounded-2xl` |
| List-view product photo 96 | r24 |
| Logo avatar 120 (welcome, profile logo card) | r16 (A-12: never rounder than desktop r19.3 at 144) |
| Icon tile 52 / document tile 48 | r12 `rounded-xl` / `rounded-[12px]` |
| Pills | r24 (Button) |
| Chips | r60 |
| Menus / dropdown panels / alert tiles / dropzones / field rings | r24 `rounded-3xl` |
| Dark sticky bar | top r32; white sticky bar square |
| Full-screen sheet | square (no ring, no radius) |
| Modal card | r32 |

Never make a phone corner rounder than its desktop counterpart.

#### 3.1.4 Gutters, rhythm, dividers (D10 as amended by A-2..A-4)

- Gutters 24 (`px-6`) on every page block and in every sheet / bar.
  Full-bleed only: header, footer, legal bars, PDP dark band, sticky
  bars, sheets, the subcategory carousel track (bleeds with `-mx-6 px-6`).
- Card padding 24 (`p-6`, or 23 + 1-px ring when the card has a ring).

| Relation | Public pages | Cabinet pages |
|---|---|---|
| Header -> first element (crumb or title) | 48 | 48 (slab `py-12` of the head) |
| Crumb -> title | 48 | 48 (A-2) |
| Title -> subtitle | 16 | 16 |
| Title block -> badge row | - | 24 |
| Text -> head actions | 32 | 32 |
| Head actions between each other | 8 (stacked) | 8 (stacked) |
| Head -> first block | 48 | 48, lives in the head's `pb-12`; the first block has NO top padding (A-3) |
| Toolbar -> its list | 24 (A-4; an invention - the only master chips -> list is 48 + #8e8e8f rule + 60, blog 3176:5463) | 24 (A-4) |
| Search row -> applied chips / meta line | 16 | 16 |
| Sibling cards / panels in one section | 24 (product cards, filled cards) | 24 (KPI tiles included: D10 related cards 24 beats TR-20's 16, C-42) |
| Zone / photo tiles in a stack | touching with a 1-px seam (`max-lg:[&+&]:-mt-px`; ZonesGrid 3117:14393, 3130:17608 -> 3130:18944 pitch 206; C-43) | - |
| Titled sections | 60 (`py-[60px]` section bands) / 48 between big blocks | 48 |
| Section title -> its content | 48 (H2 -> content, master section 6) | 24 (in-slab Title Large -> its panel; master "Поділитись" 3176:6132 -> socials and "Теги" 3176:6138 -> chips = 24; TR-06) |
| Panel -> trailing link ("Усі замовлення") | 24, right-aligned | 24, right-aligned |
| List -> LoadMore block | 48 | 48 |
| Counter -> load-more button | 16 | 16 |
| Last block -> footer / legal bar | 60 | 48 (slab `pb-12`) |
| Inside a card: title -> content | 24 | 24 |
| Inside a record row: lines | 12 apart | 12 apart |
| Fields | pitch 70 (gap 24); last field (or its helper) -> action row 48 (contact form 3166:7864: field ends y 8922, Button at 8970; Quizz Card 3111:14541: options end 12017.7, footer 12065.7; C-41) | same; 24 only inside D7 modal CARDS (compact modal exception, A6) |

Dividers: 1 px only, never 0.5 (D10). #d2d2d2 inside panels, sheets,
lists and between product lines; #8e8e8f only for section rules on
white (public) and public panel rings; #616162 on dark.

#### 3.1.5 Layers (z-index ladder on phones)

| z | Element |
|---|---|
| 10 | local decor / list layers |
| 20 | in-page popups: SortMenu, Select, SelectField menu, KebabMenu |
| 30 | sticky / fixed bottom bars (StickyBar) |
| 35 | ScrollUpDock (landing only on phones; hidden on shop phones, absent on cabinet routes) |
| 40 | desktop drawers (`lg:z-40`) |
| 45 | phone menu sheets (`#mobile-nav`, `#cabinet-nav`), UNDER the header |
| 50 | sticky headers |
| 55 | toast host |
| 60 + depth | full-screen sheets and centred modal cards (cart, auth, filters, preview, stock, wizard, Modal718, ConfirmModal, Welcome); the A2 stack sets `zIndex = 60 + depth` on each open overlay root |

Stacked overlays (auth over the materials viewer, a ConfirmModal over a
Modal718 sheet) are ordered by the A2 stack (`60 + depth`), never by DOM
or portal order (a kept-mounted Sheet portaled at hydration would
otherwise paint under a Modal718 portaled later).

#### 3.1.6 Motion, focus, touch, safe area

- Sheets and menus: `opacity` + `translate` (Y -12 -> 0), 400 ms
  `ease-[cubic-bezier(0.22,1,0.36,1)]`; transition lists name
  `translate`, never `transform` (Tailwind v4 compiles `translate-y-*`
  to the `translate` property; memory note). Menu rows stagger 300 ms.
  Every new transition carries `motion-reduce:transition-none`. No
  slide-from-right on phones.
- Focus: new phone controls get `focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-brand` (+ `ring-offset-2` on
  transparent chips, `ring-white` on dark bars). Elements that also
  render on desktop scope the ring with `max-lg:`. Button keeps the
  browser default (landing frozen; A1).
- Initial focus of a sheet (one rule, A5): coarse pointers -> the
  SHEET_TITLE (`tabIndex={-1}`, `outline-none`: screen readers hear the
  title, no keyboard pops); fine pointers -> the cross (desktop parity).
  Every cross carries a specific label ("Закрити кошик", "Закрити
  фільтри", "Закрити перегляд", ...), never the bare "Закрити".
- Touch: no hover-only affordance; `active:` colour states; targets per
  X8; 44-px hit areas via layout-neutral pseudo elements
  (`before:` / `after:` insets) or negative margins; every fixed-width
  row fits 272 at 320.
- Safe area: `viewport` with `viewportFit: "cover"` exported by the
  seven shop / cabinet SEGMENT layouts, not by the root (A26 as amended by
  A-17; the landing keeps Safari's own safe-area handling). Every bottom
  bar pads `pb-[calc(<N>px+env(safe-area-inset-bottom))]` (N = 16 light
  bars / sheet footers / menu dock, 24 dark bars; on landing routes env()
  is 0, so the same strings stay correct there); never `max(...)` (one
  formula everywhere, C-29). Landscape shop / cabinet canvases letterbox
  the notch (A26, O-16).
- Heights: `h-dvh` / `max-h-dvh` / `calc(100dvh - 48px)`; never `h-screen`
  / `100vh` in new phone code. Short viewports (landscape phones below
  640 wide, any phone with the keyboard up): below 500 px of HEIGHT
  nothing pins to the bottom - SHEET_FOOTER and PhoneMenuCtaDock
  `[@media(max-height:499px)]:static` (both are the LAST child inside
  their scroller, so the body scrolls to them), the sticky StickyBar
  (assortment) `:static`, the fixed StickyBar (PDP buy bar) `:hidden`
  (its in-flow CTA exists). A pinned bar never exceeds 30 % of the
  viewport.
- Keyboard: `enterKeyHint` on every input (next / go / search / done);
  Enter on a search field blurs it. The segment viewport sets
  `interactiveWidget: "resizes-content"` (A26): on Android `dvh` shrinks
  with the keyboard, so sheet footers and modal cards stay above it. iOS
  and landing routes: `useKeyboardInset()` (F1, in useMediaQuery.ts, run
  by ToastHost) publishes `--kb` on documentElement from a
  `visualViewport` resize listener (`innerHeight - vv.height` when > 120,
  else 0); scrollers that hold inputs pad `pb-[calc(<N>px+var(--kb,0px))]`.
  Never pad from `:focus` / `:has(input:focus)` (the padding collapses
  when the submit's pointerdown blurs the input and the button jumps
  away from the finger).
- Focus not obscured (WCAG 2.4.11): on shop / cabinet phones
  `html { scroll-padding-bottom: var(--phone-bottom-bar, 0px) }` (A26);
  sheet scrollers and the menu overlay carry `scroll-pb-[calc(<footer or
  dock height>+16px)]`; after a StickyBar becomes shown, after every
  LoadMore and after an error focus the code runs
  `document.activeElement?.scrollIntoView({ block: "nearest" })`
  (instant under reduced motion).
- Lists: Tailwind preflight removes list semantics in WebKit, so every
  phone `ul` gets `role="list"` (ListPanel, ProductLine lists,
  CheckoutLines, filter option groups, DocumentRow lists, the catalog
  phone list `<ul role="list" aria-label="Товари">` with `li` wrappers).
- Live regions: one announcer per fact. While an overlay is open its own
  status line is the only live region; counters behind it are
  `aria-live="off"` (catalog row B count); LoadMore counters are never
  live (A9); the assortment bar announces only the selected count.

### 3.2 Public shell (owner: shell-public; spec docs/superpowers/specs/mobile/shell-public.md)

- Header bar 66 (master 3082:3661): unchanged pixels. Logo 100 x 33.45 at
  (24, 16.3); cluster CartTrigger 48 box (42 brand disc, badge 20) + 8 +
  burger 48 (`-mr-3`, glyph at x vw-48 / y 21). Behaviour fixes only:
  the phone cart disc closes the menu first, the logo closes the menu,
  the burger is the focus target when the menu closes.
- Phone menu sheet (3117:13578): built on the new primitives in
  src/components/PhoneMenu.tsx (PhoneMenuSheet, PhoneMenuGroup,
  PhoneMenuLabel, PhoneMenuRow, PhoneMenuDivider, PhoneMenuCtaDock; exact
  classes shell-public 2.3). Landing-safe defaults until O-1 is answered
  (critique round 1): the three landing-visible changes apply ONLY when
  `isShopOrCabinetRoute(pathname)` (pathname starts with /catalog,
  /checkout, /materials, /dashboard, /orders, /assortment, /profile):
  (a) no fit zoom (A-1) - natural 14/20 rows, the overlay scrolls, the
  CTA sits in a sticky dock (`sticky bottom-0 -mx-6 -my-4 bg-white px-6
  pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]
  [@media(max-height:499px)]:static`, pixel-neutral when not stuck); on
  every other route the stack keeps today's `style={{ zoom: fit }}` from
  `useFitZoom(706, 66, "(max-width: 639px)")` (the R7 path is the
  default); (b) active row brand + `aria-current`: `active={
  isShopOrCabinetRoute(pathname) && isActiveRoute(s.href, pathname)}`;
  (c) "Контакти" -> "#contacts" on shop routes, "/#contacts" elsewhere.
  On every route: lock = `acquireScrollLock()` (A2, shared refcount),
  inert = MENU_INERT (`body > :not(header):not(#mobile-nav):not(#cabinet-nav):not([data-toast-host])`,
  which also covers the landing CornerFab), close on route change /
  Escape / 640 crossing, rows `py-4 -my-4` (52 hit on the 52 pitch), the
  overlay `scroll-pb-[calc(<dock height>+16px)]`. Back closes the menu on
  shop / cabinet routes (A4; rows navigate with `release({ navigate:
  href })`, the current route's row only releases, the cart disc hands
  off); landing routes keep today's Back until O-1. PhoneMenuRow gains
  `ariaLabel?: string; ariaHaspopup?: "dialog" | "menu"` (rendered as
  `aria-label` / `aria-haspopup` on the Link, a or button; built by
  C-shell-public in wave 2a for the cabinet account row of wave 2b). The
  guard shots landing-phone-menu (390 x 844) and the two added by 6.4
  step 0 (/hotels 390 x 844, / 375 x 667) must stay identical.
- Footer + legal bar (3111:14902): unchanged except the shop-scoped 320
  gap fix (`max-[339.98px]:[:root:has([data-canvas=shop])_&]:gap-*`).
- Scroll-up: footer ring kept; CornerFab hidden below 640 on shop
  canvases (`max-lg:[:root:has([data-canvas=shop])_&]:hidden`); the
  landing keeps it.
- Breadcrumbs: `ShopCrumbs` / `PhoneBackCrumb` (A19).
- Page frame: white page, `px-6 lg-shop-pad-x`, head `flex flex-col
  gap-12 pt-12 lg:pt-[72px]` (crumb -> H1 48), last block -> footer 60.
- Anchors: phone rule scoped to shop / cabinet canvases (D12):
  `@media (max-width: 639.98px) { :root:has([data-canvas=shop])
  :where(h1, h2, h3, h4, [id]) { scroll-margin-top: 0; } }` (targets land
  at the 96 scroll padding once, not 192; landing anchors unchanged).
- Landscape (O-16): the CornerFab on shop canvases uses `right:
  max(<value>, env(safe-area-inset-right))` (env() = 0 on the guard).

### 3.3 Cabinet shell (owner: shell-cabinet; spec docs/superpowers/specs/mobile/shell-cabinet.md)

- Header cluster (D1): PlatformHeader phone bar = the public bar's
  pixels: logo left, CartTrigger + burger right, 66 tall, sticky z-50,
  px 24. The company chip is `max-lg:hidden`. The burger opens the
  cabinet menu sheet (`#cabinet-nav`).
- Cabinet menu sheet contents (D1 as amended by A-1, built on the
  PhoneMenu primitives in src/components/platform/CabinetMenu.tsx):
  1. account row: 32 `CompanyAvatar` (uploaded logo or `companyInitials`,
     PersonIcon fallback) + 12 + company name 16/24 SemiBold #343435
     (`line-clamp-2`: the row grows to 48 when a long legal name wraps;
     `aria-label` keeps the full name) + 16 chevron; hit 64 (`py-4
     -my-4`); tap = close the menu and `openAuth("account")` in the same
     handler (A4 handoff: the account summary sheet with "Перейти в
     профіль" / "Вийти" adopts the menu's history entry);
  2. 48, label "Кабінет" 14/20 Medium #777779;
  3. rows Дашборд, Каталог, Мій асортимент, Замовлення, Матеріали,
     Профіль (14/20 Medium #4a4a4c, 16 arrow-up-right, pitch 52, active
     row brand + `aria-current="page"`);
  4. 48 / 1-px #d2d2d2 / 48; rows Співпраця, Блог, Контакти;
  5. 48 / divider / 48; full-width solid Button/Small "Зробити
     замовлення" -> /catalog in the PhoneMenuCtaDock.
  Motion: overlay opacity + translate 400 ms; items stagger 300 ms with
  delays `40 + k * 20` ms (k = 0 account row, 1 label, 2..7 rows, 8
  divider, 9..11 site rows, 12 divider, 13 dock = 300; A-16: the cabinet
  menu is the section switcher, so it is in place 600 ms after the tap);
  none with reduced motion. Lock: `acquireScrollLock()` (A2); inert =
  `[data-cabinet-behind]` (content wrapper + legal bar) plus MENU_INERT
  (3.2). Closes on the cross, Escape, route change, Back (A4: rows
  navigate with `release({ navigate })`, history stays [old, new]; the
  current row only releases), the cart disc (handoff), the logo, and a
  640 crossing.
- SideMenu phone strip: deleted (the desktop rail is untouched).
- Slab (CabinetPage.tsx:12): `flex min-w-0 flex-1 flex-col bg-bg-cabinet
  pb-12 rounded-t-[32px] lg:pb-8 lg:rounded-tr-none lg:rounded-tl-[48px]`;
  no `overflow: hidden|auto` on the slab or its ancestors below 640
  (sticky bars live inside it).
- B2B shop surfaces (A-11): the B2B catalog and the B2B PDP stay on the
  WHITE page inside the cabinet chrome (no slab); every other cabinet
  route (dashboard, orders, order / return detail, profile, assortment,
  partner materials) uses the slab with white r32 panels without strokes.
- CabinetPageHead (A20): the phone head contract of section 3.4 A20.
- Legal bar (PlatformFooter): #1d1d1f band, px 24 py 24 gap 24, Onest
  14/30, mini logo 29.2 x 33.7 (44 hit pseudo) + 16 + wrapping copyright,
  each legal title on its own row; desktop strings restored with `lg:`
  (shell-cabinet 2.6 recipe).
- SignInPrompt (visitors / B2C on cabinet routes, public chrome): hero
  text card (ring t/r/b #8e8e8f, rounded right 32, px 24 py 48), 48 under
  the header, H2 30/36, 16, text 16/24 #343435 (`text-[16px] leading-6
  text-neutral-800 lg:text-body-sm lg:text-neutral-500`: the hero body
  3082:3249 of the borrowed card, T6 descriptions), 32, Button/Small
  hug; the public
  main reserves `max-lg:min-h-[calc(100dvh-var(--site-header-h,66px))]`
  on platform routes so the footer does not jump at hydration.
- Pre-hydration gate: the phone header stays visible during the gate
  (identical bars), desktop gate unchanged.
- No ScrollUpDock on cabinet routes (the sticky burger is the way back).
- WelcomeModal: owned by shell-cabinet (A-13); D7 short card numbers of
  A6; logo tile with the 120 r16 avatar (A-12). Below 640 the scrim does
  not close it (cross, Escape and the CTA only: a stray tap in the 24-px
  edge strip must not end the one-time onboarding); desktop unchanged.

### 3.4 Shared atoms

Each atom: file, status (NEW / CHANGE), API, phone classes, desktop
strategy, consumers. "Build" names the cluster that owns the file
(section 6). Area specs reference these by id (A1..A29); where an area
spec shows a local recipe for the same role, the recipe here wins.

#### A1 Button phone fix (D8) - src/components/ui/Button.tsx, CHANGE, build F1

- `labelSize.large` = `"rounded-[24px] border px-[23px] py-[9px]
  text-button-md whitespace-nowrap sm:rounded-[25px] sm:px-[23px]
  sm:py-[14px] sm:text-button-lg"`; `arrowWrap.large` = `"size-[42px]
  rounded-[21px] sm:size-[52px] sm:rounded-[26px]"`; `arrowIcon.large` =
  `"size-[11px] sm:size-[16.5px]"`; `plusIcon.large` = `"size-[13px]
  sm:size-[18.75px]"`. Nothing else changes (no focus-ring change: the
  landing is frozen).
- Desktop strategy: only the phone halves of the `large` strings change;
  the landing renders no `large` Button below 640 (all 8 are
  `max-lg:hidden` / `max-sm:hidden`): prove with compare.mjs AND a probe
  listing every visible Button at 390 on the 7 landing routes.
- Call-site rules: phone pills are 42 / 16/22 Medium at every width; hide
  with `max-lg:hidden` / `lg:hidden` (never `hidden lg:inline-flex`);
  full width in a column = `className="w-full [&>span]:flex-1"` or the
  phone-only `max-lg:w-full max-lg:[&>span]:flex-1`; full width in a row
  = `fullWidth`; labels that do not fit get a phone label pair
  (`<span className="lg:hidden">short</span><span
  className="max-lg:hidden">long</span>`), never 14-px labels (A-14).
  Two actions in a head or a modal card: stacked 8 apart, secondary
  outlinedDark first, primary last; two actions in a sticky bar or a
  sheet footer: side by side, `flex-1` each, gap 8 (A-6), unless a full
  label does not fit half the row at 320 (pill = label + 46 > 132): then
  the two stack 8 apart, secondary first (A-6 exception: stock sheet,
  cancel sheet). Icon buttons 52; back disc 40 (44 pseudo hit); crosses
  24 in 44-48 boxes.

#### A2 useModalBehavior - src/components/cart/useModalBehavior.ts, CHANGE, build F1

```ts
export const OVERLAY_INERT = "body > header, #mobile-nav, #cabinet-nav";  // kept; redundant with the walk below
export const MENU_INERT = "body > :not(header):not(#mobile-nav):not(#cabinet-nav):not([data-toast-host])"; // z-45 menus only
export function acquireScrollLock(): () => void;  // refcounted html overflow lock (shared with PhoneMenuSheet)
export function useModalBehavior(opts: {
  open: boolean; onClose: () => void;
  container: RefObject<HTMLElement | null>;
  layer?: RefObject<HTMLElement | null>;          // NEW: overlay root that gets zIndex = 60 + depth
  initial?: RefObject<HTMLElement | null>;
  inertSelector?: string;                          // extra selector, added to the walk below
  fallbackFocus?: () => HTMLElement | null;        // NEW: used when the opener is gone or inert
}): void;
```
- Module-level stack (materials MS-1). `acquireScrollLock()` is a
  refcount on `documentElement.style.overflow = "hidden"`: the first
  acquire saves the previous value, the last release restores it, in any
  order; useModalBehavior AND PhoneMenuSheet use it (one owner of the
  lock). Only the TOP entry handles Escape and the Tab trap.
- Inert = the standard modal algorithm (critique round 1): from the
  dialog container walk up to `body`; at every level set `inert` on each
  sibling element except `[data-toast-host]`, `script` and `template`.
  It covers in-place dialogs too (catalog / materials FiltersDrawer and
  PreviewPanel render inside `main`: main stays, its other children go
  inert), so no portal is needed and the desktop DOM does not move.
  Reference-counted per element, and ONLY elements that do NOT carry
  `inert` when the entry opens are counted and touched: a pre-existing
  React-managed `inert` (the closed `#mobile-nav` / `#cabinet-nav`) is
  never removed. `inertSelector` matches join the same counted set
  (desktop drawers keep `"body > header"`; phone callers may still pass
  OVERLAY_INERT, it changes nothing).
- z order: each entry sets `layer.style.zIndex = String(60 + depth)` on
  open (depth = its stack index) and clears it on close; Sheet, Modal718,
  the cart, auth and the viewer pass their layer root.
- All focus calls use `{ preventScroll: true }` (shell-public N2: today
  every close scrolls the page 300-440 px up).
- On close, in this order: release this entry's inert; then focus the
  opener if `opener.isConnected && !opener.closest("[inert]")`, else
  `fallbackFocus()`, else the new top entry's initial element.
- `initial` without client rects (display:none twin) -> first
  `[data-autofocus]` with rects inside the container, else the container
  (cart N1 hardening).
- Desktop: behaviour only (no pixel change); the baseline drawer shots
  must stay identical. F1 verify probe: open / close the cart and the
  auth sheet on / and /catalog, then
  `document.getElementById("mobile-nav").inert === true` and the cart
  disc has focus without a scroll change; with any sheet open an
  accessibility snapshot shows no node outside the dialog.

#### A3 useMediaQuery / usePhone - src/components/ui/useMediaQuery.ts, NEW, build F1

```ts
export function useMediaQuery(query: string, serverValue = false): boolean; // useSyncExternalStore over matchMedia
export function usePhone(): boolean; // = !useMediaQuery("(min-width: 640px)", true); false on the server
export function useKeyboardInset(): void; // critique round 1: publishes --kb (3.1.6); run once by ToastHost
```
- The JS split uses the same query as the CSS `lg:` (fractional widths
  639.5 cannot fall between). Replaces useIsPhone (catalog, materials),
  useIsDesktop (auth), local hooks (cart, order-detail, profile).
- Allowed uses: client-only views that render twins with different
  structure (profile tree, order-detail wizard, stock modal), list
  slicing (catalog / materials load-more), phone-only behaviour (toast
  triggers). SSR renders the desktop branch; phone-only trees must not
  cause a visible first-paint jump above the fold (verify).

#### A4 useBackToClose - src/components/ui/useBackToClose.ts, NEW, build F1

Rewritten in critique round 1 (the first contract undid in-sheet
navigations, reverted live filters and closed handed-off overlays).
```ts
export function useBackToClose(open: boolean, onClose: () => void, opts?: {
  media?: string;            // default "(max-width: 639.98px)"
  onSettled?: () => void;    // fires ONCE after this overlay's history entry is gone (or was never pushed)
  onStep?: () => void;       // Back popped a step entry pushed by rearm()
}): {
  release(o?: { navigate?: string }): Promise<void>; // close path for in-overlay navigation
  isTop(): boolean;          // history.state?.__btc === this entry's token
  rearm(): void;             // push one more same-URL step entry (wizard steps 2 / 3)
  unarm(): void;             // pop the top step entry silently (wizard "Назад" button)
};
```
Module-level stack of entries `{ token, href, onClose, onSettled, steps }`
(one per open overlay; the phone menus on shop / cabinet routes too):
- Open (open && media matches): `history.pushState({ ...history.state,
  __btc: token }, "", location.href)`. The spread keeps Next's `__NA`, so
  the patched pushState passes it straight through without a router
  update (node_modules/next/dist/client/components/app-router.js:255-257);
  a later popstate to an `__NA` entry is a same-URL traverse.
- Handoff: a UI close defers its `history.back()` by one microtask. An
  overlay that opens before it runs (cart -> stock sheet, stock -> cart,
  auth sign-in -> welcome card, profile M3 -> M4 -> M3, menu row -> auth /
  cart sheet) ADOPTS the entry with `history.replaceState({
  ...history.state, __btc: newToken }, "")`; the closing entry is dropped
  without back(). Openers therefore close the old overlay and open the
  next one in the same event handler (never after a timeout).
- popstate: if the swallow token equals the top token -> pop it silently
  and fire its onSettled. Otherwise, when `history.state?.__btc !==
  top.token`: a top with step entries decrements and calls `onStep` (the
  wizard goes one step back); else pop ONLY the top entry and call its
  `onClose`, then `onSettled` (one entry per Back press, never two
  overlays at once).
- UI close (cross, Escape, Показати, scrim) or unmount of the top entry
  while `location.href === entry.href`: set the swallow token and call
  `history.back()` (after the handoff microtask); onSettled fires on the
  matching popstate. Unmount while open is handled the same way (the
  conditionally mounted CancelOrderModal no longer leaves a dead entry).
- Close or unmount when `location.href !== entry.href` (a navigation
  already happened): drop the entry WITHOUT back(), onSettled at once.
  The hook NEVER calls back() because of a pathname change.
- `release({ navigate })` for links inside an overlay: drops the entry and
  calls `router.replace(navigate)` over the dummy entry, so history ends
  [page, target] and one Back returns to the page with the overlay
  closed. Every link / router call that navigates FROM inside a
  back-closable overlay uses it, or `<Link replace>` / `<Button href
  replace>` (Link props pass through Button.tsx:43) plus the overlay's
  onClose: cart row -> PDP, cart / stock "Оформити замовлення" ->
  /checkout, "Повернутись до каталогу", auth "Перейти в профіль", menu
  rows, the wizard success (-> /orders?tab=returns).
- `media` stops matching while open (rotation across 640): release the
  entry (swallowed back()) without closing the overlay (A5
  `closeOnDesktop`).
- URL writes: while an entry is on top, NOTHING writes the URL (Next's
  HistoryUpdater rebuilds history.state on every router commit,
  app-router.js:51-57, and a replace would land on the dummy entry, so
  the Back / close would restore the pre-overlay query). Filter sheets
  edit a draft and commit in `onSettled` (T5a); the orders URL mirror
  pauses (orders-list 2.12); the materials viewer keeps its own `?file=`
  entry (materials 2.10, not this hook). The app router never sets
  `history.scrollRestoration`, so the popstate of the swallowed back()
  may restore the pre-overlay scroll: scroll moves made in onSettled run
  inside a `requestAnimationFrame` (they land after the restoration).
- Used by: the Sheet atom (A5), the restyled sheets (cart, auth, catalog
  filters, materials filters), Modal718 / ConfirmModal on phones (A6),
  the wizard sheet (steps via `rearm` / `onStep` / `unarm`), both phone
  menus on shop / cabinet routes (3.2 / 3.3). NOT by the materials
  viewer.
- Kill switch: `const BACK_TO_CLOSE = true` at the top of the file; if the
  verify flows show router breakage, set false: the hook pushes nothing,
  `release()` navigates with `router.push`, `onSettled` fires
  synchronously on close, and every overlay falls back to
  close-on-pathname-change (risk R5).
- Verify flows (6.3 item 12): tick 2 filters -> "Показати" -> URL and list
  keep both, reload keeps them, one Back leaves the page (catalog B2C /
  B2B, materials both skins, orders, returns); cart row -> PDP -> one
  Back = the page with the cart closed; cart CTA -> /checkout -> Back ->
  the page; stock sheet cross reopens the cart and the cart stays open;
  auth sign-in -> the welcome card stays open; profile M3 -> M4 -> M3 each
  stays open; wizard step 3 -> Back -> 2 -> Back -> 1 -> Back -> closed,
  then one Back leaves the page; cancel request -> one Back leaves
  /orders/[id]; auth over the viewer -> cross keeps the viewer; menu open
  -> Back -> menu closed, same page, same scroll.

#### A5 Sheet (full-screen) - src/components/ui/Sheet.tsx, NEW, build F1

Class constants (exported; overlays restyled in place reuse the bar /
title / close / scroller / body / footer constants verbatim, while their
layers keep their own `lg:` desktop restorers instead of SHEET_LAYER's
`lg:hidden`):
```ts
export const SHEET_LAYER = "fixed inset-0 z-[60] flex h-dvh flex-col bg-white transition-[opacity,translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden";
export const SHEET_OPEN = "translate-y-0 opacity-100";
export const SHEET_CLOSED = "pointer-events-none -translate-y-3 opacity-0";
export const SHEET_BAR = "flex h-[66px] shrink-0 items-center justify-between gap-2 bg-white pl-6 pr-3";
export const SHEET_TITLE = "min-w-0 flex-1 truncate text-title-lg text-neutral-900 outline-none";
export const SHEET_TITLE_FULL = "max-[374.98px]:hidden";            // span holding the full title
export const SHEET_TITLE_SHORT = "hidden max-[374.98px]:inline";    // span holding shortTitle
export const SHEET_CLOSE = "flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-[color,scale] duration-200 hover:text-brand active:scale-90 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
export const SHEET_SCROLLER = "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain";
export const SHEET_BODY = "flex-1 px-6 pt-6 pb-12";
export const SHEET_FOOTER = "sticky bottom-0 z-[1] mt-auto flex shrink-0 flex-col gap-3 border-t border-stroke-subtle bg-white px-6 pt-[15px] pb-[calc(16px+env(safe-area-inset-bottom))] [@media(max-height:499px)]:static";
export const SHEET_DIVIDER = "my-12 h-px shrink-0 bg-stroke-subtle";
```
Geometry (D7; critique round 1 restored the fixed bar): the bar is 66 on
every phone and the title ONE line (menu master bar 3117:13580): title
box y 19..47 at x 24; close hit box x vw-60..vw-12 / y 9..57; the 24
glyph (`XMarkIcon size-6`) at x vw-48 / y 21 = the menu master cross
3117:14330. Body starts 24 under the bar. The footer is the LAST child of
the scroller: sticky at the viewport bottom while the content is taller,
pushed to the bottom by `mt-auto` when it is shorter, static below 500
px of height (3.1.6); 16 visual top padding (15 + 1-px line), 16 + safe
area bottom. A body that holds inputs pads `pb-[calc(48px+var(--kb,0px))]`
(3.1.6 keyboard); every scroller carries `scroll-pb-[calc(<footer
height>+16px)]` (focus not obscured).

Bar title rule (A-7 revised): a bar title fits 228 px at 320 (vw - 92;
about 17 Cyrillic characters at 22/28 SemiBold). A longer title passes
`shortTitle`; the bar title element renders
`<span className={SHEET_TITLE_FULL}>{title}</span><span aria-hidden
className={SHEET_TITLE_SHORT}>{shortTitle}</span>` with
`aria-label={title}`, so the full title shows from 375 and the short one
below; the dialog name is always the full title. Known short titles (new
copy, O-12): auth sign-in "Вхід", set password "Новий пароль", stock
"Наявність товарів", cancel order "Скасування", return wizard
"Повернення". `truncate` stays as the safety net only: a truncated bar
title at 320 is a build bug (add a shortTitle). Dynamic names that can be
long (file names) never go into the bar: the body opens with them under a
context-word bar ("Перегляд").

Components:
```ts
Sheet(props: {
  open: boolean; onClose: () => void;
  title: string; shortTitle?: string; titleId?: string;
  closeLabel: string;                                        // specific: "Закрити фільтри", ...
  initialFocus?: RefObject<HTMLElement | null>;              // default: the title (coarse) / the cross (fine)
  footer?: ReactNode;                                        // rendered in SHEET_FOOTER as the scroller's last child
  children: ReactNode; bodyRef?: Ref<HTMLDivElement>;
  describedBy?: string; className?: string;
  closeOnDesktop?: boolean;                                  // default true; false for the wizard and overlays with a desktop twin
  onSettled?: () => void;                                    // forwarded to useBackToClose (A4)
}): React.JSX.Element | null;
SheetBar(props: { title: string; shortTitle?: string; titleAs?: "h2" | "p"; titleId?: string;
  titleRef?: Ref<HTMLElement>; onClose: () => void; closeRef?: Ref<HTMLButtonElement>;
  closeLabel: string; sticky?: boolean /* sticky top-0 z-[1] inside a scroller */; className?: string });
SheetFooter(props: { children: ReactNode; className?: string });
SheetGroup(props: { id: string; title: ReactNode; caption?: ReactNode; children: ReactNode;
  collapsible?: boolean; defaultOpen?: boolean });   // title text-title-lg; 24 to content; caption mt-2 12/16
SheetDivider();
OptionRow(props: { type: "radio" | "checkbox"; checked: boolean; onSelect: () => void; children: ReactNode });
RadioOnIcon(props: SVGProps<SVGSVGElement>); RadioOffIcon(props: SVGProps<SVGSVGElement>);  // exported here
```
- OptionRow (TR-10 filter rows): `flex min-h-11 w-full cursor-pointer
  items-start gap-2 py-[10px] text-left` + 24 glyph (`size-6 shrink-0`:
  CheckboxOn/OffIcon from catalog/icons, RadioOn/OffIcon from this file)
  + label `min-w-0 flex-1 text-button-md text-neutral-800`; long labels
  wrap; option groups are `role="radiogroup"` (roving tabindex) or
  `role="group"`, rows inside a `ul role="list"` when listed.
- RadioOffIcon / RadioOnIcon = the master radio (Quizz Card 3111:14541
  Ellipse 49, built as QuizForm RadioMarker) at glyph size in a 24 box:
  off = 18 circle with a 1.5 `stroke-brand` ring on a white fill; on = 18
  brand-filled circle with a white check (the master 18.6 x 12.4 check
  scaled to about 9 x 6, stroke 1.5, round caps). ONE radio look on
  phones (critique round 1: no #1d1d1f ring-and-dot variant, X9).
- Collapsible SheetGroup (TR-28): head `flex min-h-11 w-full items-center
  justify-between gap-4 text-left` + 24 chevron (rotate 180 open, 200 ms);
  body grid 0fr / 1fr, collapsed content `inert`.
- Behaviour: portal to body after hydration; kept mounted when closed
  (`inert` + `aria-hidden`, SHEET_CLOSED) so the exit motion plays;
  `role="dialog" aria-modal aria-labelledby`; useModalBehavior (A2 walk,
  `layer` = the root); initial focus = the title on coarse pointers
  (`tabIndex={-1}`, no keyboard pop), the cross on fine pointers (3.1.6);
  useBackToClose (A4); closes on pathname change; when `(min-width:
  640px)` starts matching it closes if `closeOnDesktop`, otherwise it
  stays open and only releases its history entry (A4).
- Coexistence: the sheet covers the sticky header (z 60 + depth > 50; the
  header is inert, no scrim, no visible "live" header under it); a phone
  menu (z-45) hands off to it (A4) or is closed first; ScrollUpDock
  (z-35) is under it; toasts fired while it is open are QUEUED and shown
  after the last overlay closes (A23). Sticky bars of the page (z-30) are
  covered.
- Who uses the atom directly: orders / returns filter sheet, return
  wizard, stock sheet, any new phone-only long overlay. Who restyles in
  place with the SAME constants (desktop identity in one DOM tree): cart
  drawer, auth drawer, catalog FiltersDrawer, materials FiltersDrawer,
  materials PreviewPanel, Modal718 `phone="sheet"` (incl. the cancel
  sheet, T5h). Their recipes are in the area specs (cart 2.1, auth 2.1,
  catalog-b2c 2.15, materials 2.8 / 2.9) and must resolve to the
  constants above (verify: computed bar height 66 at 320 / 360 / 390 with
  ONE title line, cross glyph at x vw-48 / y 21, body pt 24, footer pt
  16, pinned or static per height).

Filter-sheet composition (template T5a; orders, returns, catalog B2C /
B2B, materials): bar "Фільтри" (cross "Закрити фільтри"); body groups
separated by 48 / 1-px #d2d2d2 / 48 (SHEET_DIVIDER or `divide-y` with
`py-10` sections + 44 heads). DRAFT model (critique round 1, A4): on open
the sheet seeds a `useState` draft from the page's applied filters;
every tap edits the draft only (no URL write and no list re-render while
the history entry is on top); the footer status counts the DRAFT; ANY
close (Показати, cross, Escape, Back) commits once in `onSettled`: page
state + `writeListParams` (A29), then "Показати" scrolls in a
`requestAnimationFrame` with `window.scrollTo({ top: <toolbar top> +
scrollY - 66 - 16, behavior: "instant" })` when the toolbar is above the
viewport; "Скинути" clears the draft. Restyled drawers branch on
`usePhone()`: draft on phones, today's live apply on desktop (behaviour
only). Footer = status line `<p role="status" aria-live="polite"
className="text-body-sm text-neutral-500">Знайдено N ...</p>` (the only
live region while the sheet is open) + row `flex gap-2`: `<Button
size="small" variant="outlinedDark" fullWidth disabled={!active}>Скинути
</Button>` + `<Button size="small" fullWidth>Показати</Button>`. Status
strings: "Знайдено N товарів" (productsPlural), "Знайдено N файлів" / "N
категорій" (materials), "Знайдено N замовлень" / "N повернень" (orders;
plural helper in listState.ts).

#### A6 Modal card (Modal718 phone) + ConfirmModal - src/components/platform/ui/Modal718.tsx, ConfirmModal.tsx, CHANGE, build F1

Phone card (D7 short modal, TR-17), desktop strings untouched (`sm:` =
640). ONE DOM for both widths and both phone modes (critique round 1):
the card column's children become, in order, [title row] [description]
[children] [actions]. Today the title row and the description share a
`flex flex-col gap-4` group; that group is dissolved, because a sticky
element only sticks inside its parent box and the pinned title must be a
direct child of the full-height column.
- overlay `fixed inset-0 z-[60] flex items-center justify-center p-6
  sm:p-10` (today `p-4`): card width vw - 48 (342 / 272 / 552). Cards
  whose slot holds inputs pass `align="top"` -> `max-sm:items-start
  max-sm:pt-6`, so the keyboard never covers the focused field (profile
  M1 / M7 / M8).
- card: `scrollbar-hidden relative w-full shrink-0 overflow-y-auto
  overscroll-contain rounded-[32px] border border-stroke-default bg-white
  pt-0 pb-[23px] text-neutral-900 outline-none max-h-[calc(100dvh-48px)]
  sm:max-h-full sm:rounded-[48px] sm:py-[59px]`. The max-height pair
  REPLACES the `max-h-full` that Modal718 passes in the card className
  today (never two unprefixed max-heights on one element).
- column `flex flex-col gap-6 sm:gap-10` (today's values).
- title row `sticky top-0 z-[1] flex items-start justify-between gap-4
  bg-white px-[23px] pt-[23px] sm:static sm:px-[59px] sm:pt-0` (the card's
  23 top padding moves into the row, so it pins WITH its padding); title
  group `flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2
  sm:flex-initial sm:flex-nowrap` (`flex-initial` = 0 1 auto = today:
  long desktop titles still shrink and never push the cross out); title
  24/28 Bold -0.48 (existing phone string) + `[overflow-wrap:
  break-word]!`; the adornment drops under the title on phones.
- close: `-mr-2.5 -mt-2.5 flex size-11 ... sm:m-0 sm:size-8` + `ClearIcon
  className="size-6 sm:size-8"` (24 glyph, glyph edge on the content edge).
- description `-mt-2 px-[23px] text-[16px] leading-6 text-neutral-800
  sm:-mt-6 sm:px-[59px] sm:text-[20px] sm:leading-7 sm:text-neutral-900`
  (16 under the title: column gap 24 - 8 on phones, 40 - 24 on desktop =
  today's `gap-4`).
- actions row (ModalActions) `sticky bottom-0 z-[1] -mb-[23px] flex
  flex-col gap-2 bg-white px-[23px] pb-[23px]
  data-[overflowing]:border-t data-[overflowing]:border-stroke-subtle
  data-[overflowing]:pt-4 sm:static sm:mb-0 sm:flex-row sm:gap-8
  sm:px-[59px] sm:pb-0` (stacked 8 apart, secondary first; ConfirmModal
  already passes cancel first). The row's own 23 bottom padding overlaps
  the card's, so the static position is unchanged and the pinned row
  keeps its padding. `data-overflowing` is set on the card by a
  ResizeObserver while scrollHeight > clientHeight; without overflow the
  gap stays 24 and no line shows. Slot fields: last field -> actions 24
  (the compact modal exception of 3.1.4).
- `phone?: "card" | "sheet"` (default "card"): "sheet" swaps the SAME
  nodes with `max-sm:` strings: overlay `max-sm:p-0`; card `max-sm:h-dvh
  max-sm:max-h-dvh max-sm:w-full max-sm:rounded-none max-sm:border-0
  max-sm:pb-0 max-sm:flex max-sm:flex-col`; title row = SHEET_BAR geometry
  (`max-sm:h-[66px] max-sm:items-center max-sm:pl-6 max-sm:pr-3
  max-sm:pt-0`, title = SHEET_TITLE incl. `shortTitle`, cross =
  SHEET_CLOSE); description and slot `max-sm:px-6`, the description 24
  under the bar; actions = SHEET_FOOTER (`max-sm:mt-auto max-sm:mb-0
  max-sm:border-t max-sm:border-stroke-subtle max-sm:pt-[15px]
  max-sm:pb-[calc(16px+env(safe-area-inset-bottom))]
  max-sm:[@media(max-height:499px)]:static`); no scrim visible.
- Scrim closes only when the pointerdown started on the scrim and no
  `[role="menu"]` was open inside the dialog (profile SN-16 e).
- `fallbackFocus?` forwarded to useModalBehavior (ConfirmModal forwards
  too), `layer` = the overlay root; useBackToClose on phones; the A2 walk
  makes the header inert for AT.
- Desktop strategy: phone values unprefixed, `sm:` restores already in
  the file; the shared builder shoots the Modal718 / ConfirmModal states
  of the EXISTING route /ui-gallery (src/app/ui-gallery/page.tsx +
  UiGallery.tsx, NOT /%5Fui-gallery, which is a 404) at 1710 before and
  after (they are not in the baseline): 0 diffs, and every shot must
  contain `[role=dialog]`. F1's own new gallery states live in the new
  route /ui-gallery/f1 (6.1); verify at 320 x 568 with the documents card
  there: the cross is visible at max scroll, the actions are pinned.
- Classification (D7 + A-8): cards for confirm / invite / edit / remove
  / welcome / documents (<= 3 files, rows not tiles) / change password /
  single contract / add contract; sheets for tables, > 3 fields,
  unbounded lists (profile M3 "Договори", M6 "Додати контрагента"), the
  return wizard, previews, the stock modal (every count, A-9) and the
  cancel-order modal (radios, A22 / T5h).

#### A7 ListPanel / ListRow / RecordRow / RowDisc / KeyValueLine - src/components/platform/ui/RecordRow.tsx, NEW, build F2

TR-07 list panel for every table on cabinet phones (orders, returns,
dashboard orders + payments, assortment, counterparties, employees).
```ts
ListPanel(props: { label: string; children: ReactNode; className?: string }); // ul
ListRow(props: { children: ReactNode; className?: string } & LiHTMLAttributes);
RecordRow(props: {
  id: ReactNode;                       // "№48291064"
  linkLabel: string;                   // aria-label of the row link / button
  href?: string; onOpen?: () => void;  // link row, button row, or neither (static)
  eyebrow?: ReactNode;                 // "Повернення №9104"
  date?: ReactNode; amount?: ReactNode; sub?: ReactNode;
  badges?: ReactNode; caption?: ReactNode;
  action?: ReactNode;                  // a RowDisc (documents, kebab)
  chevron?: boolean;                   // default true for link / button rows
  className?: string;
});
RowDisc(props: { label: string; onClick: () => void; children: ReactNode;
  haspopup?: "dialog" | "menu"; expanded?: boolean });
KeyValueLine(props: { label: ReactNode; value: ReactNode; nowrap?: boolean });
```
Classes:
- ListPanel `<ul role="list" aria-label={label} className="flex flex-col
  rounded-[32px] bg-white">` - NO `overflow-clip` (critique round 1: it
  clipped KebabMenu / SortMenu panels that flip above a row and squared
  the first / last focus rings); the rows carry the corners instead.
- ListRow `relative px-6 py-6 first:rounded-t-[32px] last:rounded-b-[32px]
  has-[a:active]:bg-bg-subtle has-[button[data-row-open]:active]:bg-bg-subtle
  has-[a[data-row-link]:focus-visible]:shadow-[inset_0_0_0_2px_var(--color-brand)]
  has-[button[data-row-open]:focus-visible]:shadow-[inset_0_0_0_2px_var(--color-brand)]
  [&+&]:before:absolute [&+&]:before:inset-x-6 [&+&]:before:top-0
  [&+&]:before:h-px [&+&]:before:bg-stroke-subtle` (1-px #d2d2d2 inset 24,
  no layout height; the row owns the panel corners, so the :active tint
  and the focus ring follow the r32 corners).
- RecordRow column `flex flex-col gap-3`:
  - eyebrow `-mb-1 text-[12px] font-medium uppercase leading-5 text-brand`;
  - line 1 `flex items-center gap-3`: left `flex min-w-0 flex-1 flex-col
    gap-1` = id (the stretched link `data-row-link` or button
    `data-row-open`: `self-start whitespace-nowrap text-[16px] font-bold
    leading-[22px] tracking-[0.16px] text-neutral-900 outline-none
    after:absolute after:inset-0 after:content-['']`; its focus ring is
    drawn by ListRow)
    over the date (`whitespace-nowrap text-[14px] leading-5
    text-neutral-500`); right `flex shrink-0 items-center gap-1` = action
    + `ChevronSideIcon mirrored size-6 text-neutral-900` (aria-hidden;
    THE row chevron on every phone list - orders, payments, counterparty
    rows; ChevronRightIcon has the same path and may stay;
    PaymentChevronIcon is not used on phones);
  - amount group `flex flex-col gap-1`: amount `whitespace-nowrap
    text-[22px] font-semibold leading-7 tracking-[-0.44px]
    text-neutral-900` + sub `line-clamp-2 text-[14px] leading-5
    text-neutral-800` (plain text, never underlined);
  - badges + caption group `flex flex-col items-start gap-2`: badges
    `flex flex-wrap items-start gap-2`, caption = PaymentCaptionLine (A28).
- RowDisc: `<button className="relative z-[1] -m-0.5 flex size-11
  shrink-0 cursor-pointer items-center justify-center rounded-full
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-brand">` > `<span className="flex size-10
  items-center justify-center rounded-full border border-neutral-900
  bg-white text-neutral-900 transition-colors duration-200
  [button:active>&]:bg-bg-subtle">` + 20 glyph (44 hit, 40 ring; above
  the stretched link, never nested in it).
- KeyValueLine `flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5
  text-[14px] leading-5` (label `font-medium text-neutral-500` = the 14/20
  Medium KV label of 3.1.1 / A15, value `text-neutral-900`,
  `whitespace-nowrap` when `nowrap`).
- Geometry: rows 208..302 at 390 depending on wraps; line 1 fits 224 at
  320 (id 96 + disc 44 + chevron 24 + gaps).
- Empty: EmptyState `surface="panel"` replaces the panel (A14).
- Desktop strategy: phone-only atom; consumers render it `lg:hidden` next
  to the untouched desktop table (`max-lg:hidden`).

#### A8 ProductLine - src/components/ui/ProductLine.tsx, NEW, build F2

TR-08 line for the cart sheet, stock sheet, checkout lines, order /
return items, wizard rows and assortment rows.
```ts
ProductLine(props: {
  image: string; title: string;
  href?: string; onNavigate?: () => void;      // with href: photo + text = ONE link
  status?: { label: string; tone: "positive" | "negative" | "brand" | "muted" };
  meta?: ReactNode;                             // "40 мл, ALDA hotel cosmetics" / "Артикул: ..."
  price?: ReactNode;                            // "31,65 ₴ за од." (+ promo / partner variants)
  note?: ReactNode;                             // 12/16 caption ("Ціна залежить від курсу")
  grey?: boolean; titleLines?: 2 | 3;           // 3 for assortment / documents-like names
  leading?: ReactNode;                          // checkbox (assortment)
  trailing?: ReactNode;                         // trash 44 / RowDisc
  bottom?: ReactNode;                           // stepper + total, or read-only meta + amount
  as?: "li" | "div"; padded?: boolean; className?: string;
});
```
Classes: root `flex flex-col gap-4`, plus `py-6` only when `padded`
(default `true` for `as="li"`, `false` for `as="div"`; critique round 1: a
line nested in a list item - the stock sheet's sold-out line and its
alternative, the assortment row's block B - adds no padding, the list
item owns it); top `flex items-start`; block
(Link when `href`, else div) `flex min-w-0 flex-1 items-start gap-4
rounded-2xl focus-visible:outline-none focus-visible:ring-2
focus-visible:ring-brand` with `aria-label={title}`; photo `relative
block size-16 shrink-0 overflow-clip rounded-2xl bg-bg-product` + img
`absolute inset-0 size-full object-cover` (+ `grayscale`), `alt=""`;
column `flex min-w-0 flex-1 flex-col gap-1`: status `whitespace-nowrap
text-[12px] font-medium uppercase leading-5` + tone (`text-positive` /
`text-negative` / `text-brand` / `text-neutral-500`), name
`line-clamp-2|3 text-[16px] font-bold leading-[22px] tracking-[0.16px]
text-neutral-900`, meta / price `text-[14px] leading-5 text-neutral-500`
(promo price `text-brand` + struck old price), note `text-[12px] leading-4
text-neutral-500`; trailing trash `-mr-[10px] -mt-[10px] flex size-11
shrink-0 items-center justify-center rounded-full text-neutral-900
active:text-brand focus-visible:outline-none focus-visible:ring-2
focus-visible:ring-brand` + `TrashIcon size-6`; bottom `flex flex-wrap
items-center justify-between gap-x-4 gap-y-2` with the total `ml-auto
whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px]
text-neutral-900` (wraps to its own right-aligned line at 320).
Rules (A-10): the status eyebrow renders only for exception states
("Немає в наявності", "Під замовлення", sold-out lines in the stock
sheet); lists are `<ul role="list">` and draw the dividers (`divide-y
divide-stroke-subtle`, framed lists add `border-y`); no chips in lines (chips become the meta text).

#### A9 LoadMore - src/components/ui/LoadMore.tsx, NEW, build F2

```ts
LoadMore(props: { shown: number; total: number; onMore: () => void;
  onLess?: () => void; label?: string /* "Показати більше" */;
  lessLabel?: string /* "Приховати" */; className?: string;
  focusAfterLast?: () => HTMLElement | null }): React.JSX.Element | null;
```
- shown < total: counter + `<Button size="small" plus>Показати більше</Button>`;
  shown >= total and `onLess` and total > first batch: counter + `<Button
  size="small" minus>Приховати</Button>` (dashboard payments only);
  otherwise renders nothing (the counter does NOT stay, A-5).
- Root `flex flex-col items-center gap-4` (+ caller `mt-12 lg:hidden` = 48
  under the list); counter `<p className="text-[14px] leading-5
  text-neutral-500">Показано {shown} із {total}</p>` - NOT a live region
  (one announcer per fact, 3.1.6; the focus rule below carries the
  change); button 225..227 x 42 centred (blog master 3176:5601).
- Focus (ONE rule for every list, critique round 1): LoadMore keeps a ref
  on its own root div. After `onMore` the focus stays on "Показати
  більше" (re-focused after the commit with `root.querySelector("button")
  ?.focus({ preventScroll: true })`, iOS does not focus a tapped
  button); when the button unmounts (last batch) LoadMore calls
  `focusAfterLast()?.focus({ preventScroll: true })` (the caller returns
  the first newly shown item's primary link) and then
  `scrollIntoView({ block: "nearest" })`. No `moreRef` prop (Button
  cannot take a ref without a Button.tsx type change, A1); area specs
  that pass `moreRef` follow this rule instead.
- Callers: batch 10, reset on any filter / search / sort change, append
  in place (no scroll); phones persist the shown count in their own `n`
  URL param (A29: catalog, orders, materials), desktop pagers keep `page`
  (`max-lg:hidden`); per-page selectors are not rendered on phones (D4).

#### A10 ChipTabs - src/components/ui/ChipTabs.tsx, NEW, build F2

```ts
export const CHIP_TAB = "relative cursor-pointer whitespace-nowrap rounded-[60px] border px-[15px] py-[7px] text-[14px] font-medium leading-5 transition-colors duration-200 motion-reduce:transition-none after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
export const CHIP_TAB_ON = "border-transparent bg-brand text-white";
export const CHIP_TAB_OFF = "border-stroke-default text-neutral-800 active:border-brand active:text-brand";
export function chipTabClass(active: boolean): string;
export function ChipTabs<K extends string>(props: { items: { key: K; label: string }[];
  value: K; onChange: (k: K) => void; label: string; idPrefix: string; className?: string });
```
- 36 tall (master chip 3176:5479: 15 + 1-px ring = 16 padding), 44 hit
  via the `after:` box (rows 8 apart, hit boxes touch, never overlap);
  tablist `flex flex-wrap gap-2`, left-aligned, wraps, never scrolls;
  roving tabindex, ArrowLeft / ArrowRight / Home / End select and focus,
  `aria-selected`, `aria-controls` on the selected tab.
- Placement: page-switching chips sit in the CabinetPageHead actions slot
  when the head has no action (profile "Дані" / "Контрагенти" /
  "Співробітники"), otherwise they are the first block 48 under the head
  (orders "Замовлення" / "Повернення"). PDP info chips: in place, 48 under
  the CTA stack.
- Desktop strategy: profile renders the atom only in its phone tree;
  orders and PDP keep their desktop tab element and append the phone
  strings with `lg:` restores (orders 2.2, pdp 2.7 recipes).

#### A11 SearchField + FilterButton + AppliedChips (search row) - src/components/ui/SearchField.tsx, FilterButton.tsx, AppliedChips.tsx, NEW, build F2

SearchField:
```ts
SearchField(props: { value: string; onChange: (v: string) => void; label: string;
  placeholder?: string /* "Пошук" */; surface?: "white" | "none";
  className?: string /* wrapper; default "relative w-full" */; inputRef?: Ref<HTMLInputElement> });
```
- `<form role="search" onSubmit={blur}>` wrapper (className supplies
  today's desktop width per caller: `relative w-full lg:w-[364px]` orders,
  `lg:w-[495px]` materials, the catalog string; phone row callers
  `relative min-w-0 flex-1`); input = today's identical string
  `h-[46px] w-full rounded-[50px] border border-stroke-default bg-white
  pl-4 pr-12 text-[16px] leading-6 text-neutral-900 outline-none
  transition-colors duration-200 placeholder:text-neutral-500
  focus:border-neutral-800 [&::-webkit-search-cancel-button]:hidden`
  (`bg-transparent` for surface "none") + `type="search"
  enterKeyHint="search" autoComplete="off"`; magnifier as today, hidden
  on phones while the value is non-empty; clear button (value non-empty)
  `absolute right-px top-1/2 flex size-11 -translate-y-1/2 cursor-pointer
  items-center justify-center rounded-full text-neutral-700
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
  lg:hidden` + `XMarkIcon size-6`, `aria-label="Очистити пошук"`, tap ->
  `onChange("")` + focus the input.
FilterButton (A-6: the shop's black disc wins over TR-10's outline - a deliberate departure from the outlined master disc 3117:12801):
```ts
FilterButton(props: { count: number; expanded: boolean; onClick: () => void; badgeDesktop?: boolean });
```
- `relative flex size-[52px] shrink-0 cursor-pointer items-center
  justify-center rounded-[26px] bg-neutral-900 text-white
  transition-opacity duration-200 hover:opacity-85
  max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2
  max-lg:focus-visible:ring-brand max-lg:focus-visible:ring-offset-2` +
  `FilterIcon size-6`; badge (count > 0) `absolute -right-1 -top-1 flex
  h-5 min-w-5 items-center justify-center rounded-full border-[1.5px]
  border-white bg-brand px-1 text-[12px] font-bold leading-none
  text-white lg:border-0 lg:font-semibold` (critique round 1: the header
  cart badge look, Header.tsx:126-129 - TR-10 - with the brand fill kept
  for contrast on the black disc; the `lg:` pair keeps the materials
  desktop badge of Hero.tsx:69-75 identical) + `lg:hidden` unless
  `badgeDesktop` (materials); `aria-label` "Фільтри" / "Фільтри, обрано
  N"; `aria-haspopup="dialog"`.
AppliedChips:
```ts
AppliedChips(props: { chips: { key: string; label: string; onRemove: () => void }[];
  onReset: () => void; resetLabel?: string /* "Скинути фільтрацію" */; className?: string });
```
- Renders nothing without chips. Root `flex flex-wrap items-center gap-2`
  (+ caller `mt-4 lg:hidden` = 16 under the search row); chip `<button
  className="group -my-1 flex h-11 min-w-0 max-w-full cursor-pointer
  items-center">` > `<span className="flex h-9 min-w-0 max-w-full
  items-center gap-2 rounded-[60px] border border-stroke-default
  px-[15px] text-[14px] font-medium leading-5 text-neutral-800
  transition-colors duration-200 group-active:border-brand
  group-active:text-brand lg:text-neutral-900">` (phone text #343435 =
  master chip 3176:5479 and CHIP_TAB_OFF; desktop #1d1d1f identity) + label `min-w-0 truncate` + `XMarkIcon
  size-4 shrink-0`; `aria-label="Прибрати фільтр «{label}»"`; reset `-my-1
  flex h-11 cursor-pointer items-center gap-[2px] text-[14px] font-medium
  leading-5 text-neutral-700 active:text-brand` + `XMarkIcon size-4`.
  Resets filters only (not the query; the query lives in the field).
Search row: `flex items-center gap-2` = SearchField (`min-w-0 flex-1`,
212 at 320 / 282 at 390) + FilterButton 52. Catalog keeps its in-place
toolbar with the same strings; orders, assortment (search only) and
materials use the atoms.

#### A12 SortMenu - src/components/ui/SortMenu.tsx (+ src/components/ui/useListbox.ts), NEW, build F2

```ts
SortMenu(props: { value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; label?: string /* "Сортування" */;
  prefix?: boolean /* show "Сортування:" before the value */; className?: string });
```
- Trigger (44 hit, 20 visual): `-my-3 flex cursor-pointer items-center
  gap-1 py-3 text-[14px] font-medium leading-5 text-neutral-800
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`
  + optional `<span className="text-neutral-500">Сортування:</span>` +
  value + `ChevronDown16 size-4 shrink-0 transition-[rotate] duration-200
  motion-reduce:transition-none` (`rotate-180` open); `aria-haspopup=
  "listbox"`, `aria-expanded`, `aria-label="{label}: {value}"`.
- Panel anchored to the caller's `relative` row container (full content
  width): `absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-clip
  rounded-3xl bg-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]`
  (flipped: `bottom-[calc(100%+8px)] top-auto`); `ul role="listbox"
  className="divide-y divide-stroke-subtle"`; option `flex min-h-11 w-full
  cursor-pointer items-center px-4 py-[10px] text-left text-[16px]
  font-medium leading-6` + selected `text-brand` / else
  `text-neutral-800`; keyboard highlight `bg-bg-subtle`.
- Placement rule: open below; flip above when `innerHeight - rect.bottom
  < panelH + 24` and `rect.top - 66 > innerHeight - rect.bottom`; if
  neither fits, below + `scrollIntoView({ block: "nearest" })`. Closes on
  pick, outside pointerdown, Escape, Tab; focus returns to the trigger.
- Placement on pages: at the right end of the list meta line (`relative
  flex flex-wrap items-center justify-between gap-x-4 gap-y-2`, left = the
  count or the period range 14/20 #777779, wraps right-aligned with
  `ml-auto`) - orders, returns, assortment AND the catalog (critique
  round 1: the catalog's count + view-switch row and its separate sort
  row became this one meta line, C-47); `prefix` is not used on phones.
- useListbox / useDismiss move from orders/listParts.tsx:22-134 to
  src/components/ui/useListbox.ts; listParts.tsx re-exports them
  (pre-cluster edit by F2, section 6.2).

#### A13 StickyBar (white / dark) - src/components/ui/StickyBar.tsx, NEW, build F1

```ts
export const STICKY_BAR_LIGHT = "z-30 border-t border-stroke-subtle bg-white px-6 pt-[15px] pb-[calc(16px+env(safe-area-inset-bottom))] lg:hidden";
export const STICKY_BAR_DARK = "z-30 rounded-t-[32px] bg-neutral-900 px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-white lg:hidden";
export const SUMMARY_LABEL = "text-[14px] font-medium leading-5 text-neutral-400";
export const SUMMARY_AMOUNT = "whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-white";
StickyBar(props: { tone: "light" | "dark"; position: "sticky" | "fixed"; show?: boolean;
  label: string; barRef?: Ref<HTMLDivElement>; className?: string; children: ReactNode });
```
- position sticky = `sticky bottom-0 [@media(max-height:499px)]:static`
  (assortment selection bar inside the slab; cart summary inside the cart
  scroller with `mt-auto`); fixed = `fixed inset-x-0 bottom-0
  [@media(max-height:499px)]:hidden` (PDP buy bar; its in-flow CTA
  exists). Hidden state: `pointer-events-none translate-y-full opacity-0`
  + `inert`; motion `transition-[opacity,translate] duration-300
  ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none`. Only
  when the primary action would otherwise be off-screen (TR-18).
- Dark fill #1d1d1f (critique round 1, C-40: the desktop identity of
  every shop dark band - CartDrawer footer, CheckoutForm.tsx:263,
  TotalCard; TR-18's #2d2d2f is not used on shop / cabinet phones).
- Content: light = Button/Small fullWidth (two = flex-1 gap 8, secondary
  outlinedDark first; A-6 exception when a label does not fit); dark =
  ONE summary anatomy for every total on dark (cart summary, checkout
  footer, order / return TotalCard): `flex flex-col gap-2` =
  SUMMARY_LABEL ("Сума замовлення") stacked over SUMMARY_AMOUNT; the
  assortment selection bar keeps its one line "Обрано: N товарів" +
  total (a selection line, not a total block) with SUMMARY_LABEL type;
  pills outlined-white / accent.
- Publishes its height as `--phone-bottom-bar` on documentElement while
  shown (ResizeObserver), removes it when hidden / unmounted; the toast
  host and the html `scroll-padding-bottom` read it (A23, A26). When it
  becomes shown it runs `document.activeElement?.scrollIntoView({ block:
  "nearest" })`, so the control just tapped is never under it (WCAG
  2.4.11). The cart sheet's summary bar may stay inline in CartSheetPhone
  with the DARK constant (it lives inside a z-60 sheet and must not
  publish the variable).

#### A14 EmptyState - src/components/ui/EmptyState.tsx, NEW, build F2

```ts
EmptyState(props: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode;
  titleAs?: "h2" | "h3" | "p"; titleRef?: Ref<HTMLElement>;
  surface?: "none" | "panel" | "ring"; role?: "status"; className?: string });
```
- Root `flex flex-col items-center px-6 py-12 text-center`; panel = `+
  rounded-[32px] bg-white` (cabinet, replaces the ListPanel); ring = `+
  rounded-[32px] border border-stroke-default bg-white px-[23px]
  py-[47px]` (public standalone: checkout empty / success); none = on the
  page (catalog, materials public, cart sheet).
- Icon tile `mb-6 flex size-[52px] items-center justify-center
  rounded-[12px] border border-stroke-default bg-white text-neutral-900`
  (24 glyph centred; illustrated glyphs use the fixed 9-px zone of the
  TrustBand recipe); title `text-[22px] font-semibold leading-7
  tracking-[-0.44px] text-neutral-900 outline-none` (`tabIndex={-1}` when
  `titleRef`); text `mt-4 max-w-[294px] text-[14px] leading-5
  text-neutral-500`; action `mt-8`.
- Action rule (A-10): a next-step link = `<Button href size="small"
  arrow>` solid (e.g. "Переглянути каталог", "Перейти в каталог",
  "Продовжити покупки"); an in-place reset = `<Button size="small">`
  solid when the page has no other solid primary in view (catalog,
  materials), `variant="outlinedDark"` when the page head already shows a
  solid primary (orders, assortment); a fresh-state panel whose head
  already offers the same action shows no button. Never accent in an
  empty state.
- Replaces ListEmpty (orders), PanelEmptyState (dashboard, catalog,
  materials, profile), EmptyPanel (returns), the checkout EmptyState S5.

#### A15 KeyValueList / KeyValueCard - src/components/ui/KeyValueList.tsx, NEW, build F2

```ts
type KeyValueRow = { id?: string; label: ReactNode; value: ReactNode; href?: string; emphasis?: boolean }; // `id`, not `key`: spreading `key` into JSX is a React 19 error (X10)
KeyValueList(props: { rows: KeyValueRow[]; className?: string });   // <dl>
KeyValueCard(props: { title?: ReactNode; rows: KeyValueRow[]; flush?: boolean; className?: string });
```
- Row `flex flex-col gap-2 py-4 first:pt-0 last:pb-0 [&+&]:border-t
  [&+&]:border-stroke-subtle`; dt `text-[14px] font-medium leading-5
  text-neutral-500`; dd `text-[16px] leading-6 text-neutral-900`
  (emphasis: `text-[22px] font-semibold leading-7 tracking-[-0.44px]`);
  link value `underline decoration-1 underline-offset-4 active:text-brand`
  (only real links are underlined). One column always (TR-27).
- Card `flex flex-col gap-6 bg-white p-6` + `rounded-[32px]` unless
  `flush`; title `text-title-lg text-neutral-900` (phone-only element).
- Consumers: order detail summary / delivery, return details, auth
  account summary (`className="bg-bg-subtle"` filled card), profile
  contract data. PDP characteristics keep SpecTable with the same row
  numbers (pdp 2.8).

#### A16 DocumentRow - src/components/platform/ui/DocumentRow.tsx, NEW, build F2

```ts
DocumentRow(props: { name: string; meta?: ReactNode[]; pending?: boolean | string;
  href?: string; downloadName?: string; onPreview?: () => void; className?: string });
```
- Row `flex items-center gap-2 py-4 first:pt-0 last:pb-0 [&+&]:border-t
  [&+&]:border-stroke-subtle`; preview target (when `onPreview`) `<button
  className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center
  gap-4 rounded-2xl text-left outline-none focus-visible:ring-2
  focus-visible:ring-brand" aria-label="Переглянути: {name}">` holding the
  tile `relative size-12 shrink-0 overflow-clip rounded-xl bg-neutral-800
  text-white` (+ `DocumentGlyph absolute left-3 top-3 size-6`) and the
  text `flex min-w-0 flex-col gap-1`: name `line-clamp-3 text-[16px]
  font-bold leading-[22px] tracking-[0.16px] text-neutral-900` (3 lines
  max, A-10 amendment of TR-25), meta `flex flex-wrap items-center gap-x-1
  text-[14px] leading-5 text-neutral-500` (nowrap parts, 14 DotIcon);
  download `<a download className="-mr-2.5 flex size-11 shrink-0
  items-center justify-center rounded-full text-neutral-900 outline-none
  active:text-brand focus-visible:ring-2 focus-visible:ring-brand"
  aria-label="Завантажити: {name}">` + `DownloadIcon size-6`; pending =
  a div, tile `bg-button-disabled text-[#bbbbbc]`, name `text-neutral-300`,
  note 14/20 #777779, no action.
- Desktop strategy: DocumentTile is NOT changed; phone twins render
  DocumentRow `lg:hidden` next to the `max-lg:hidden` tiles (documents
  modal, order / return documents cards). Materials file rows keep their
  own FileCard recipe (materials 2.6) with the same numbers, including
  the 3-line name clamp (`max-lg:line-clamp-3`, critique round 1).
- `OrderDocumentRow({ doc })` (mapping of an OrderDocument, same as
  OrderDocumentTile) lives in orders/DocumentsModal.tsx (orders-list
  cluster).

#### A17 Dropzone phone - src/components/platform/ui/Dropzone.tsx, CHANGE, build C-profile

TR-26: full width (342 / 294 in a card), r24 dashed 1-px ring, `min-h-[206px]
lg:h-[270px]`, p 24, centred stack: 52 icon tile r12 (`size-[52px]
rounded-xl lg:size-[60px] lg:rounded-[19.286px]`), 16, text 16/24 #777779,
32, hug Button/Small, 12, caption `text-[12px] leading-4
lg:text-[14px] lg:leading-6`; new props `phoneText?`, `phoneHint?`
(rendered `lg:hidden`, desktop strings `max-lg:hidden`). Profile is the
only phone consumer, so the profile cluster owns the file (with
KebabMenu.tsx and UploadedFileTile.tsx; profile SN-19..SN-21).

#### A18 QtyStepper (hit boxes, count, editable) - src/components/catalog/QtyStepper.tsx, NEW file (extracted), build F2

- F2 moves `QtyStepper` from catalog/ProductCard.tsx:120-172 into
  catalog/QtyStepper.tsx and leaves `import { QtyStepper } from
  "./QtyStepper"; export { QtyStepper };` in ProductCard.tsx (6.2: a bare
  `export ... from` creates no local binding, and ProductCard's own call
  sites :245 / :336 / :386 need one; imports elsewhere keep working).
  QtyStepper.tsx and ChipsRow.tsx never import from ProductCard.tsx (no
  circular import): what they need moves with them or into a types
  module.
- Buttons append `max-lg:relative max-lg:-m-3 max-lg:flex max-lg:size-10
  max-lg:items-center max-lg:justify-center max-lg:rounded-full
  max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2
  max-lg:focus-visible:ring-brand` (40 boxes centred on the 16 glyphs,
  footprint unchanged; desktop untouched).
- Count on phones = 16/22 Bold +0.16 for EVERY size (TR-15, A-10): `md`
  `text-title-sm lg:text-title-lg`; `sm` `text-[16px] font-bold
  leading-[22px] tracking-[0.16px] lg:text-[20px] lg:tracking-[0.2px]`;
  `min-w-7 whitespace-nowrap`. No `size="xs"`.
- New props: `label?: string = "Кількість"` (wrapper `role="group"
  aria-label`), count `aria-live="polite" aria-atomic="true"`;
  `editable?: boolean` = phone-only numeric input (span `max-lg:hidden`,
  `<input type="text" inputMode="numeric" pattern="[0-9]*"
  enterKeyHint="done" autoComplete="off" maxLength={5} aria-label=
  "Кількість" className="min-w-7 bg-transparent p-0 text-center
  outline-none focus-visible:rounded-md focus-visible:ring-2
  focus-visible:ring-brand lg:hidden">` + the count type classes, width
  `calc(max(2, len)ch + 4px)`; wrapper `max-lg:gap-3`; commit on blur /
  Enter: empty or 0 -> 1, cap 99999). A-10: `editable` is passed in
  partner (B2B) contexts only: B2B catalog card + row, PDP B2B buy block,
  partner cart sheet rows, assortment rows (RowStepper copies the recipe).
- ChipsRow likewise moves to catalog/ChipsRow.tsx (import + re-export kept) and
  gets `className?` + phone chips `text-[14px] font-medium leading-5
  max-lg:min-w-0 max-lg:max-w-full lg:text-button-md lg:leading-[22px]`
  with the label in `max-lg:min-w-0 max-lg:truncate` (catalog SN-C2 /
  SN-B03).

#### A19 Breadcrumb phone (one level) - src/components/ui/Breadcrumb.tsx, CHANGE (new exports), build F2

- `PhoneBackCrumb({ href, label, className })` and `ShopCrumbs({ back,
  label = "Навігаційний ланцюжок", children })`: exact code in
  shell-public 2.4 (40 ring + 16 + label 16/22 SemiBold +0.16 #343435,
  one line, `truncate` at vw - 104, 44 hit via `before:`; ShopCrumbs =
  one `nav` landmark: phone crumb + the desktop trail in `hidden
  flex-wrap items-center gap-4 lg:flex`). BackCrumb / BackCrumbBody /
  Slash unchanged.
- Rule (TR-05 / A-2): every phone page shows at most ONE crumb = the
  parent; never "/ current" (the title repeats it). Public pages and the
  B2B catalog / PDP heads use ShopCrumbs; CabinetPageHead renders
  PhoneBackCrumb `lg:hidden` and keeps its desktop BackButton
  `max-lg:hidden`. Parent labels: /catalog -> "Головна"; /catalog/<dir>
  -> "Каталог"; category -> the direction title (truncates at 320..389
  for protect / cleaning); PDP -> the category label; /checkout ->
  "Каталог"; /materials -> "Головна"; /materials/<cat> -> "Матеріали";
  cabinet details -> their desktop back labels ("До замовлень", "До
  каталогу", ...).

#### A20 CabinetPageHead phone + CabinetPage + constants - platform/ui/CabinetPageHead.tsx, CabinetPage.tsx, CHANGE, build C-shell-cabinet

- Recipe = shell-cabinet 2.5.4 with two additions: the phone back row is
  PhoneBackCrumb (A19) and a `titleRef?: Ref<HTMLHeadingElement>` prop.
  Section `flex flex-col gap-8 px-6 py-12 lg:flex-row lg:items-center
  lg:justify-between lg:gap-[26px] lg:py-8 lg:pl-10 lg:pr-8`; left column
  `flex min-w-0 flex-col items-start gap-6`; back row `max-lg:mb-6`
  (back -> title 48); title group `flex flex-col gap-4 lg:gap-2`; h1
  `CABINET_TITLE` with `tabIndex={-1} outline-none` (focus fallback
  target); subtitle `CABINET_SUBTITLE`; meta (badges) row 24 under the
  title block; actions slot `flex flex-col items-start gap-2
  max-lg:has-[>*+*]:items-stretch
  max-lg:[&>*>span:last-child]:flex-1
  max-lg:[&>*>span:last-child]:whitespace-normal lg:shrink-0 lg:flex-row
  lg:flex-wrap lg:items-center lg:justify-end lg:gap-4` (1 action hug,
  2+ full width 8 apart, labels may wrap inside the pill).
- `TitleLight({ children, line })`: `line` puts the Light run on its own
  line below 640 (detail titles "Замовлення" / "№48291064").
- Exports: `CABINET_TITLE = "text-h2 text-neutral-900"`, `CABINET_SUBTITLE
  = "text-[14px] leading-5 text-neutral-500 lg:leading-6"`,
  `CABINET_SECTION_TITLE = "text-[22px] font-semibold leading-7
  tracking-[-0.44px] text-neutral-900 lg:font-bold"` (used by the B2B
  catalog PlatformTitle, the PDP B2B head, dashboard / profile / detail
  card titles so no head drifts). Consumers import them from
  `@/components/platform/ui/CabinetPageHead` directly (the
  platform/ui/index.ts barrel has no `export *` and is frozen after F2).
- Contract for page areas: the first block after the head has no top
  padding on phones (head pb 48 = head -> first block).

#### A21 StatusPill and badges usage (TR-14)

- Keep StatusPill / OrderStatusBadge / ReturnStatusBadge / PaymentBadge
  colours and sizes exactly as desktop (no colour inventions); in phone
  rows they sit in the RecordRow badges slot (`flex flex-wrap gap-2`,
  wrap at 320); in detail heads the `md` (38) size as desktop. Badges are
  never buttons, never chips, never outline variants. Categories use the
  eyebrow (12/20 uppercase brand), never a pill. Payment captions =
  PaymentCaptionLine (A28) on their own line 8 under the badges - in
  list rows AND in detail heads (order / return detail:
  `<PaymentCaptionLine tone="attention" className="lg:hidden">`; never a
  PaymentBadge `caption` at 12/22 on phones).

#### A22 Select / menus on phones

- No page-level filter dropdowns on phones: filters live in the filter
  sheet (A5), sort in SortMenu (A12), per-page is not rendered (D4),
  form choices with <= 6 options become ChoiceRow radios (A24: checkout
  delivery / payment, wizard reasons / delivery, cancel-order reasons (4)
  / solutions (2)). A modal whose radios push it past the D7 short-card
  budget becomes `Modal718 phone="sheet"` (the cancel modal, T5h; its N6
  menu workaround is dropped).
- Remaining dropdowns follow the TR-11 panel: full field width, r24,
  `shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]`, 44-tall items 16/24
  Medium with 1-px #d2d2d2 lines, wrapping labels, selected brand.
  - platform/ui/Select.tsx (dashboard counterparty; F2, dashboard SN-03):
    menu `w-full lg:min-w-max`, items `whitespace-normal
    lg:whitespace-nowrap`, pick on `onClick` (`onMouseDown` only
    preventDefault), document `pointerdown` outside closes, flip above /
    `scrollIntoView({ block: "nearest" })` when the space below is short,
    wrapper `min-w-0`.
  - checkout/fields.tsx SelectField / AutocompleteField (F2): A26.
  - KebabMenu (profile cluster, profile SN-19): trigger = 40 outlined
    disc on phones (`phoneDisc`), menu flips above when short, item tap
    focuses the trigger before running the action.

#### A23 Toast - src/components/ui/Toast.tsx, NEW, build F1

```ts
export function showToast(input: string | {
  message: ReactNode; action?: { label: string; onClick: () => void };
  dismissible?: boolean;
  durationMs?: number | null /* default 4000; default null when `action` is set */;
  keepOnNavigate?: boolean /* survives the next pathname change */;
  phoneOnly?: boolean /* default true */ }): void;
export function ToastHost(): React.JSX.Element;   // mounted ONCE in src/app/layout.tsx
```
- Host `<div data-toast-host className="pointer-events-none fixed
  inset-x-0 z-[55] flex justify-center px-6">` (+ `lg:hidden` for
  phone-only toasts) with style `bottom: max(calc(24px +
  env(safe-area-inset-bottom)), calc(var(--phone-bottom-bar, 0px) +
  8px))`; live region always mounted (`role="status"
  aria-live="polite"`); `data-toast-host` exempts it from the A2 inert
  walk and from MENU_INERT.
- Toast `pointer-events-auto flex w-full max-w-[342px] items-center gap-3
  rounded-3xl bg-[#2d2d2f] px-6 py-3 text-[14px] leading-5 text-white
  transition-[opacity,translate] duration-300 motion-reduce:transition-none`
  (hidden `translate-y-2 opacity-0`); message `min-w-0 flex-1`; action
  `-my-3 shrink-0 py-3 font-medium underline underline-offset-4`; close
  (dismissible) `-my-2.5 -mr-3 flex size-11 shrink-0 items-center
  justify-center` + `XMarkIcon size-5`. One toast at a time (the newest
  replaces the current one).
- Rules (critique round 1):
  - Queue: while any `[aria-modal="true"]:not([inert])` is open, a new
    toast is queued and shown when the last overlay closes (never
    rendered invisibly under a z-60 sheet; profile "Договір додано"
    shows when M3 closes).
  - Navigation: on a pathname change the host clears only the toasts
    created before the navigation started; `keepOnNavigate` toasts
    (wizard success, cancel request, withdraw) survive it.
  - Actions: a toast with `action` defaults to `durationMs: null` +
    dismissible (WCAG 2.2.1); every timer pauses while the toast holds
    focus or a pointer.
  - Coalescing: autosave feedback fires only when a value actually
    changed and at most once per card, 800 ms after the last blur in that
    card (profile 2.10).
- Phone-only by default (desktop frozen): callers fire it on any width,
  the host hides phone-only toasts from 640. The assortment Excel notice
  keeps its desktop identity in AssortmentView but uses these phone
  classes and z-[55] below 640. ToastHost also runs `useKeyboardInset()`
  (3.1.6).
- Uses: profile saves / invites / uploads, cancel request + withdraw
  confirmation, wizard success, assortment notices. Not used for
  add-to-cart (the cart sheet opens, desktop parity; O-11).

#### A24 ChoiceRow / RadioGroup (TR-22) - src/components/ui/ChoiceRow.tsx, NEW, build F2

```ts
ChoiceRow(props: { type: "radio" | "checkbox"; name: string; value?: string; checked: boolean;
  onChange: (checked: boolean) => void; label: ReactNode; hint?: ReactNode;
  invalid?: boolean; describedBy?: string });
RadioGroup(props: { name: string; label: string; options: { value: string; label: string; hint?: string }[];
  value: string; onChange: (v: string) => void; error?: string; className?: string });
```
- Row `<label className="relative flex min-h-10 w-full cursor-pointer
  items-center gap-4 text-left after:absolute after:inset-x-0
  after:-inset-y-0.5 after:content-['']">` with `<input className="peer
  sr-only">` first (critique round 1: row box 40 = the master option /
  radio, QuizForm.tsx:831-835 `min-h-10`; 44 hit from the pseudo box;
  rows are 40 apart, so the hit boxes never overlap); text `flex min-w-0
  flex-1 flex-col gap-1` (label `text-[16px] font-bold leading-6
  text-black peer-checked:text-brand` - the master's selected option,
  QuizForm.tsx:842-846, an accepted contrast exception with the marker as
  the second cue, 3.1.2; hint `text-[14px] leading-5 text-neutral-500`);
  radio marker `relative flex size-10 shrink-0 items-center
  justify-center rounded-full border-[1.5px] border-brand bg-white
  peer-checked:border-0 peer-checked:bg-brand peer-focus-visible:ring-2
  peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2` + its
  own white 18 x 12 check when checked (path copied from QuizForm
  RadioMarker; F2 does not depend on F1's icons); checkbox marker = 24
  CheckboxOn/OffIcon in a 40 box.
- RadioGroup `role="radiogroup" aria-labelledby aria-invalid
  aria-describedby` `flex flex-col gap-4`; legend `text-[14px] font-medium
  leading-5 text-neutral-500`; rows `flex flex-col gap-10` (Quizz Card
  3111:14541: options 48 tall at y 11793.7 / 11881.7 / 11969.7, 40 apart;
  built QuizForm.tsx:712 `gap-10`): one-line rows pitch 80, label + hint
  rows and 2-line rows pitch 88 = the master; error `pt-2 text-[12px]
  font-medium leading-4 text-negative`. QuizForm (landing) stays
  untouched.

#### A25 FitText - src/components/ui/FitText.tsx, NEW, build F2

dashboard SN-04 verbatim: `<FitText as min media className>` shrinks the
font-size of ONE element on phones until it fits (line-height from the
class), clears the inline style outside `media`. Used for KPI values and
payment amounts; landing FitStepLabel untouched.

#### A26 Viewport (segment layouts) + useFitZoom + fields.tsx + globals

- Viewport (F1; A-17 amends D12): the ROOT layout src/app/layout.tsx gets
  no viewport export (the 7 frozen landing routes keep Safari's own
  safe-area handling and browser-chrome colour; viewport-fit=cover there
  would move landscape renders on notched iPhones, which the Chromium
  guard cannot see). The seven shop / cabinet segment layouts
  src/app/{catalog,checkout,materials,assortment,dashboard,orders,profile}/layout.tsx
  and src/app/ui-gallery/layout.tsx export
  `export const viewport: Viewport = { viewportFit: "cover",
  interactiveWidget: "resizes-content", themeColor: "#ffffff" }` (Next
  merges segment viewport exports; `interactiveWidget` is typed in
  node_modules/next/dist/lib/metadata/types/extra-types.d.ts:53). Every
  `calc(Npx+env(safe-area-inset-bottom))` string yields N on the
  landing, so the cart / auth sheets opened there stay correct. Verify:
  client navigation landing -> /catalog -> landing updates
  `document.querySelector('meta[name=viewport]').content` both ways (R16).
- src/app/layout.tsx (F1): mount `<ToastHost />` once inside AuthProvider
  after PlatformChrome (renders nothing until a toast fires:
  pixel-neutral); nothing else changes there.
- src/app/globals.css (F1), every rule pixel-neutral at the guard:
  - phone anchor rule scoped to shop / cabinet canvases (shell-public N3,
    D12): `@media (max-width: 639.98px) { :root:has([data-canvas=shop])
    :where(h1, h2, h3, h4, [id]) { scroll-margin-top: 0; } }`;
  - focus not obscured: `@media (max-width: 639.98px) {
    :root:has([data-canvas=shop]) { scroll-padding-bottom:
    var(--phone-bottom-bar, 0px); } }`;
  - landscape notch letterbox on shop / cabinet canvases (O-16 default):
    `@media (min-width: 640px) { :root:has([data-canvas=shop]) body {
    padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
    } }`, and the two html zoom formulas subtract the insets (`zoom:
    min(1, (100vw - env(safe-area-inset-left) -
    env(safe-area-inset-right)) / 1440px)` and the 1710 shop variant).
    env() is 0 on every desktop browser and on the landing (no cover), so
    the guard sees identical pixels.
- src/components/cart/useFitZoom.ts (F1, O-4 built): `read()` returns 1
  when `matchMedia("(pointer: coarse)").matches` AND the hook runs with
  its default desktop media `(min-width: 640px)`: drawers and modals on
  touch landscape phones and tablets scroll instead of shrinking to
  5-8 px text (and stop triggering the iOS focus zoom). The phone-menu
  caller (`"(max-width: 639px)"`, 3.2) is unaffected; mouse desktops are
  unchanged.
- src/components/checkout/fields.tsx (F2; checkout S8 a-g, auth N-D / N-E,
  profile SN-17, order-detail N6): SelectField `{ primary, secondary }`
  two-line options on phones, menu `max-lg:max-h-[232px]`, open ->
  menu visible (flip or `scrollIntoView` inside the nearest scroller);
  AutocompleteField phone focus / menu-height / keep-focus rules;
  `announceError` (default true); Hint `max-lg:pt-2` + `max-lg:text-negative`
  (D6: 8 below, #d92d20; desktop keeps 3 px #d32f2f); `aria-controls`
  only while open + option ids; CheckboxField `label: ReactNode` + row
  `max-lg:min-h-11`; resting label `max-lg:max-w-[calc(100%-48px)]
  max-lg:truncate`; RING `max-lg:text-ellipsis`; pass-through
  `autoCapitalize`, `autoCorrect`, `spellCheck`, `enterKeyHint`,
  `onKeyDown`. Field = 46 tall, r24, 1-px #d2d2d2, 16-px text, pitch 70
  (D6).
- src/components/Logo.tsx (F1, optional, pixel-neutral): 44 hit pseudo
  `max-lg:before:absolute max-lg:before:inset-x-0
  max-lg:before:-inset-y-[5.3px] max-lg:before:content-['']`.

#### A27 Tokens of shared catalog atoms

StatusLine (B2C) and B2BStatusLine phone forms (12/20 uppercase, no
orphan dot, info glyph `max-lg:hidden` + aria-hidden), CartButton /
B2BCartButton phone brand fill (`max-lg:border-brand max-lg:bg-brand
max-lg:text-white`, not when out of stock): owned by the catalog cluster
(they live in ProductCard.tsx / B2BProductCard.tsx); the PDP consumes them
unchanged. Critique round 1: the same 12/20 uppercase string is used by
B2BYourPrice's caption, B2BPriceTilePhone's dt (catalog) and the PDP's
PhoneAvailability / PhonePrice caption (3.1.1: no 14-px uppercase on
phones).

#### A28 PaymentCaptionLine - platform/ui/PaymentBadge.tsx, CHANGE (new export), build F2

`PaymentCaptionLine({ text, tone: "subtle" | "attention" })` = `flex
items-start gap-1 text-[12px] font-medium leading-4` + `AttentionSmallIcon
size-4 shrink-0` + `text-[#f26164]` / `text-neutral-500`; PaymentBadge
render unchanged. Money strings group digits with NBSP (orders/data.ts
`formatAmount`, orders-list cluster, pixel-guarded: revert on any diff).

#### A29 List URL state - src/components/ui/listUrl.ts, NEW, build F2

```ts
export function writeListParams(patch: Record<string, string | null>): void;
export const PHONE_BATCH = 10;
```
- Builds the next query FROM the current `location.search` (unknown
  params such as `mine` are kept; `null` deletes) and calls
  `window.history.replaceState(null, "", url)`: Next 16 patches
  replaceState and syncs `usePathname` / `useSearchParams`
  (node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
  "Native History API"), with no RSC request per filter tap or debounced
  keystroke on the SSG catalog routes. `router.replace` only where a
  server render must change. One helper for catalog (replaces
  catalog-b2c's `router.replace` recipe), materials and orders.
- Phones persist the shown count in `n` (multiple of 10, 10 omitted,
  clamped to the total); desktop keeps `page` (desktop page N). A phone
  ignores `page`, a desktop ignores `n`. A phone hard load with `n > 10`
  server-renders items 1-10 (SSR = the desktop branch, page 1) and
  appends the rest after `usePhone()` resolves (below the fold).
- Never called while an A4 history entry is on top: overlays commit in
  `onSettled` (T5a).

---------------------------------------------------------------------

## 4. Page templates

### T1 Public shop page (catalog, PDP, checkout, materials visitor / B2C)

```
header 66 (public bar)                               3082:3661
48
ShopCrumbs: one back crumb to the parent (40, hit 44) TR-05 / 3176:6558
48
H1 40/42 (wraps, balanced)                           TR-03
16  subtitle / SKU 14/20 #777779 (optional)
48
first block: media 342 x 206 r32 / banners (zone tiles 206, touching with
a 1-px seam, ZonesGrid 3117:14393) / carousel (280 tiles, peek) / the
product stage 342 x 342
48 (big blocks, incl. the catalog listing `mt-12`) - 60 (section bands)
toolbar: search row 52 (SearchField + [catalog: 52 view toggle disc] +
FilterButton 52) / 16 AppliedChips / 16 meta line 44 (count left,
SortMenu right) ; 24 ; list
list of D3 cards (24 apart) or open TR-08 rows between 1-px lines
48  LoadMore (counter + "Показати більше")
60  footer + legal bar (unchanged)
optional sticky white bar (PDP buy bar) fixed z-30 (hidden below 500 px of height)
```
White page; panels with a ring use 1-px #8e8e8f r32 (form cards, the
empty / success panel); content cards use the 1-px #343435 ring r32
(product cards). Lists on public pages are open rows between 1-px
#d2d2d2 lines framed top and bottom (A-11), not ring panels. Corner FAB
hidden; footer ring kept. Acceptance: at 390 x 844 the first list item's
top edge is on screen on a catalog category page (y 724).

### T2 Cabinet list page (orders, returns tab, assortment, partner materials, profile groups)

```
cabinet header 66 + menu sheet                       D1
slab #f5f5f5 r32 top from y 66
head: pt 48 / [back crumb 40, 48] / H2 30/36 / 16 / subtitle 14/20 / 32 / action(s)
48 (head pb)
[chip tabs 36 when they are not in the head] ; 24
toolbar: search row 52 (SearchField + FilterButton) / 16 AppliedChips /
16 meta line (count or range left, SortMenu right) ; 24
ListPanel (white r32, role=list) of RecordRows / ProductLines ; empty = EmptyState panel
48  LoadMore
48  legal bar (slab pb 48)
optional dark sticky bar (assortment selection, #1d1d1f) inside the slab,
z-30, static below 500 px of height
```
Filter sheet = T5a. Overlays: modal cards (A6) and sheets (A5).
Acceptance: at 390 x 844 the first row's top edge is on screen on
/orders and /assortment.

### T3 Cabinet detail page (order detail, return detail)

```
head: back crumb "До замовлень" / 48 / title "Замовлення" + TitleLight line "№48291064"
      / 24 badges (StatusPill md + PaymentBadge, wrap) / 8 attention caption
      (PaymentCaptionLine tone attention, lg:hidden, A21)
      / 16 status line 14/20 #777779 / 32 actions (1 hug, 2 stacked full width)
48
summary card (first on phones): white KeyValueList (5 rows) + dark total band
  #1d1d1f (SUMMARY_LABEL over SUMMARY_AMOUNT, A13; "До оплати" accent full width)
24  items panel: title "Товари" + count, ProductLine rows (read-only bottom line)
24  delivery KeyValueCard (+ note 14/20)
24  documents card: DocumentRows + full-width outlinedDark "Завантажити усі документи"
48  legal bar
```
Order on phones: head -> summary -> items -> delivery -> documents
(right column `max-lg:order-first`). Cancel = `Modal718 phone="sheet"`
with RadioGroups (T5h); return wizard = Sheet with Quizz-card steps
(T5e).

### T4 Form page / form cards (checkout, profile cards, auth screens, modal forms)

- Public form card (checkout): white body with a 1-px #8e8e8f ring, r32,
  pt 32 px 24 pb 48 (master contact form 3166:7864), sections 48 apart,
  section title Title Large -> 24 -> fields; the dark summary footer
  (#1d1d1f desktop identity) closes the card: SUMMARY_LABEL over
  SUMMARY_AMOUNT (A13), submit full-width accent 42.
- Cabinet settings card (profile): white r32 on the slab, p 24, title
  Title Large -> 24 -> fields; save = hug Button/Small right-aligned 48
  below the last field (contact form 3166:7864 / Quizz Card 3111:14541;
  `max-lg:mt-6` on top of the gap-6 stack; C-41); cards 24 apart.
- Sheet forms (auth) follow the same 48: action wrappers `max-lg:mt-6`
  on top of the gap-6 column. Only D7 modal CARDS keep 24 (A6).
- Fields (D6): fields.tsx floating-label 46 r24, full width, pitch 70,
  error 12/16 #d92d20 8 below; form choices = RadioGroup (A24); remaining
  selects = TR-11 panel; checkboxes 44 rows; one resting label size (16;
  long labels truncate, phone short labels where needed).
- Keyboard (3.1.6): `enterKeyHint` next / go / done; Enter moves to the
  next field; the first invalid field (visible twin only) is focused
  with `preventScroll` then scrolled to the centre (`behavior: "auto"`
  under reduced motion); scrollers that hold inputs pad
  `pb-[calc(<N>px+var(--kb,0px))]` (no `:has(input:focus)` padding);
  modal cards with fields pass `align="top"` (A6).
- Inputs never < 16 px; prefill only where it does not change a baseline
  shot (O-6).

### T5 Sheet flows (A5)

- T5a Filters: bar "Фільтри" / groups / footer status + Скинути /
  Показати; draft model, commit in `onSettled` (A5, A4, A29).
- T5b Cart: bar "Кошик" (cross "Закрити кошик"); scroller `pt-3` so the
  44 head row (count + "Очистити") centres its text 24 under the bar;
  ProductLine rows with trash and stepper; dark sticky summary (#1d1d1f,
  SUMMARY_LABEL over SUMMARY_AMOUNT, free-delivery meter, accent
  "Оформити замовлення"; static below 500 px of height); empty =
  EmptyState none; after "Очистити" the empty state offers "Повернути
  товари" (cart S21); in-sheet links navigate with `release({ navigate
  })`.
- T5c Auth / account: bar = the screen title, one line (`shortTitle`
  "Вхід" / "Новий пароль" below 375), body pt 24, forms per T4 (last
  field -> action 48; the submit stays adjacent to its fields and the
  Google alternative follows it, A-15), account summary = filled
  KeyValueCard + "Перейти в профіль" (accent) / "Вийти" (outlinedDark)
  stacked, secondary first.
- T5d Preview (materials): bar "Перегляд" (cross "Закрити перегляд"),
  body = head row (tile, full name 22/28, size) + description + document
  at full width, footer = caption + one full-width action.
- T5e Wizard (return): bar "Оформити повернення" (`shortTitle`
  "Повернення"), Quizz Card steps inside the body (#2d2d2f band 76 with
  counter "1/3" 16/24 + 32 + step title 24/28 SemiBold white; white panel
  r32 with 1-px #1d1d1f ring, px 24 pt 32 pb 48), ChoiceRow radios 40
  apart, footer = SHEET_FOOTER with back "<-" text button left + primary
  right; steps 2 / 3 `rearm()` so Back steps back (A4);
  `closeOnDesktop={false}`.
- T5f Stock (A-9): bar "Деякі товари закінчилися" (`shortTitle`
  "Наявність товарів"), body = intro 16/24 #343435 + the "Замінити всі"
  text action + issue rows (li `py-6` holding two `as="div"`
  ProductLines + stepper / resolve slot); footer = SHEET_FOOTER with the
  status "Залишилось вирішити: N з M" + the two pills stacked 8 apart
  (A-6 exception), outlinedDark "Повернутись до каталогу" first, accent
  "Оформити замовлення" last; close per `issuesFrom` (cart S23).
- T5g Profile long modals: Modal718 `phone="sheet"`.
- T5h Cancel order (critique round 1): Modal718 `phone="sheet"`, bar
  "Скасувати замовлення" (`shortTitle` "Скасування"), body = meta,
  badges, KeyValueList, request note, RadioGroup "Оберіть причину" (4)
  [+ 48 / line / 48 + RadioGroup "Бажане рішення" (2)], footer =
  SHEET_FOOTER with "Повернутись" outlinedDark + accent "Скасувати
  замовлення" stacked (A-6 exception).
- Common: covers the header, no scrim, cross / Escape / Back / route
  change close, focus returns to the opener without scrolling, the page
  keeps its scroll position, bar 66 with one title line, footer pinned
  (static below 500 px of height).

### T6 Modal card flows (A6)

Centred card vw - 48, r32, ring #8e8e8f, p 24, title 24/28, 24 cross in a
44 box, description 16/24 #343435, slot 24, actions stacked 8 apart (24
under the last field), max-height 100dvh - 48 with pinned title / actions
when overflowing (one DOM, A6), `align="top"` when the slot holds fields,
scrim #343435/50 + blur 4. Welcome (scrim does not close it below 640),
confirm, invite / edit / remove, documents, change password, single
contract, add contract.

---------------------------------------------------------------------

## 5. Per-area index

Counts are the rows of each area spec's section 3 ("to fix" includes
fixes that land through the shared layer).

- shell-public (docs/superpowers/specs/mobile/shell-public.md): the
  public header / menu / footer / crumbs on shop routes. Menu rebuilt on
  PhoneMenu primitives without the fit zoom (A-1), CornerFab hidden on
  shop phones, one-line ShopCrumbs, 320 footer gap fix, anchor offset.
  29 findings: 18 to fix (12 area + 6 shared / call sites), 4 routed, 7
  rejected / deferred / accepted.
- shell-cabinet (shell-cabinet.md): cabinet header = public bar pixels +
  burger, cabinet menu sheet (account row, Кабінет group, site group,
  CTA dock), strip deleted, slab r32, CabinetPageHead phone contract,
  legal band, SignInPrompt hero card, WelcomeModal card (owner, A-13).
  24 findings: 21 to fix, 1 resolved by design, 2 deferred / rejected.
- catalog-b2c (catalog-b2c.md): one-column D3 product cards (206 photo
  contain, Stat 30 price, stepper + 52 brand disc), compact list rows,
  search row + meta-line toolbar (C-47), applied chips, full-screen
  filters sheet (draft model), load-more 10,
  206 media everywhere, URL state. 29 findings: 27 to fix (incl. the
  shared ones), 1 routed to cart (CB-23), CB-24 (branded 404) pending O-3.
- catalog-b2b (catalog-b2b.md): the B2B skin of the same files on the
  WHITE page inside the cabinet chrome (A-11): PlatformTitle head (H2
  30/36, one back crumb, hug "Мій асортимент"), B2B D3 card with the
  partner tile, editable stepper (A-10). Built by the same cluster as
  B2C (C-catalog). 33 findings: 22 to fix in-area, 4 verified only,
  rest rejected / routed.
- pdp (pdp.md): article-style head with SKU caption, 342 gallery stage
  with thumbs, PhoneBuyBlock, fixed white StickyBuyBar (IO-driven),
  info chips, TR-27 spec rows, dark "Купують разом" slab, D3 series
  cards. 35 findings: 22 area, 9 shared / routed, PDP-24 pending O-9,
  PDP-28 pending O-3, 1 deferred, 1 rejected.
- cart (cart.md): full-screen cart sheet (bar, head row, ProductLine
  rows, dark sticky summary), empty state, stock sheet for every count
  (A-9), close on route change, menu-first opening. 28 findings: 24 to
  fix, 4 deferred / no change.
- checkout (checkout.md): one-line crumb, open ProductLine list with
  subtotal, white ring form card with the dark summary footer, delivery /
  payment RadioGroups, two-line branch selects, empty / success
  EmptyState ring panels, validation focus. 40 findings: 32 to fix, CO-24
  (prefill) deferred to O-6, 5 rejected, 2 forwarded.
- auth (auth.md): auth / account drawer as a full-screen sheet with the
  screen title in the SheetBar, 14/20 alerts, 44 targets, keyboard
  padding, close on route change and Back. WelcomeModal moved to
  shell-cabinet (A-13). 39 findings: 30 to fix in-area, 5 shared / other,
  3 rejected, 2 deferred (AUTH-27 copy, AUTH-04 landscape O-4).
- dashboard (dashboard.md): greeting head with a 2-line clamp and stacked
  actions, white select, dark KPI tiles r32 (14/20 #8e8e8f labels, Stat
  30 values via FitText), orders + payments as RecordRow panels,
  payments load-more with "Приховати", manager card, TR-24 empties.
  31 findings: 28 to fix (5 of them through the shell / auth clusters),
  1 rejected, 2 deferred.
- orders-list (orders-list.md): head CTA on both tabs, chip tabs 48 under
  the head (A-3), search row + filter sheet + chips + SortMenu, RecordRow
  panel for orders and returns (ReturnRows built here), load-more with
  URL state, documents modal card with DocumentRows. 34 rows: 27 to fix,
  7 not fixed (reasons in the spec).
- order-detail (order-detail.md): detail head (TitleLight line, status
  line, stacked actions), summary + dark total first, ProductLine items,
  KV delivery, DocumentRows, cancel sheet with RadioGroups and a request
  note (T5h),
  return wizard sheet with Quizz-card steps, branded order not-found via
  a route segment not-found.tsx. 34 findings: 29 to fix, 1 pending, 3
  forwarded, 1 rejected.
- returns (returns.md): return rows inside the orders RecordRow panel
  (eyebrow "Повернення №"), return detail on the order-detail detailParts
  phone variants (A-11), withdraw confirm card + toast, link to the
  order. 34 findings: 30 to fix, 4 rejected.
- profile (profile.md): phone tree via usePhone: H2 head with ChipTabs
  (Дані / Контрагенти / Співробітники), four white r32 cards for Дані,
  ListPanel rows for counterparties / employees with 40 kebab discs,
  9 overlays classified card vs sheet (Modal718 `phone`), toasts, logo
  120 r16. Owns KebabMenu, Dropzone, UploadedFileTile. 40 findings: 30
  to fix, 4 deferred, 2 rejected, 3 shell, 1 conditional.
- assortment (assortment.md): back crumb head, search + meta line +
  SortMenu, ListPanel rows built on ProductLine (3-line names, checkbox,
  editable RowStepper, remove disc), load-more, dark sticky selection
  bar, Excel notice toast, confirm card. 26 findings: 20 area, 4 other
  owners, 1 rejected, 1 not a bug.
- materials (materials.md): public + partner skins: one-line crumb, search
  row + black FilterButton (badge on desktop too) + applied chips, filled
  folder row cards, TR-25 file rows with lock captions, full-screen
  filters sheet and viewer sheet ("Перегляд"), URL state + `?file=` deep
  link. 24 findings: 23 to fix (16 area, 7 shared / routed), MAT-24
  (branded 404) pending O-3, the MAT-22 badge part rejected.

---------------------------------------------------------------------

## 6. Build plan

### 6.1 Waves and clusters (disjoint file ownership)

A file belongs to exactly one cluster. A cluster may READ any file. The
only cross-cluster edits are the "pre-cluster edits" of F2 (6.2), made
before any area cluster starts.

Wave 1 (parallel):

- F1 foundations / overlays: src/app/layout.tsx (ToastHost only, no
  viewport); the segment layouts src/app/{catalog,checkout,materials,
  assortment,dashboard,orders,profile}/layout.tsx and
  src/app/ui-gallery/layout.tsx (viewport export, A26 / A-17);
  src/app/globals.css; src/components/ui/Button.tsx;
  src/components/Logo.tsx (optional); src/components/cart/
  useModalBehavior.ts, useFitZoom.ts (O-4); NEW src/components/ui/
  useMediaQuery.ts (+ useKeyboardInset), useBackToClose.ts, Sheet.tsx
  (exports RadioOnIcon / RadioOffIcon), StickyBar.tsx, Toast.tsx;
  src/components/platform/ui/Modal718.tsx, ConfirmModal.tsx; NEW route
  src/app/ui-gallery/f1/page.tsx (+ F1Gallery.tsx next to it) for the F1
  atoms. src/app/ui-gallery/UiGallery.tsx is NOT edited: it is the page
  behind the scrim in the Modal718 / ConfirmModal desktop before / after
  shots (6.4).
- F2 atoms: src/components/ui/Breadcrumb.tsx; NEW src/components/ui/
  EmptyState.tsx, LoadMore.tsx, ChipTabs.tsx, SearchField.tsx,
  FilterButton.tsx, AppliedChips.tsx, SortMenu.tsx, useListbox.ts,
  ProductLine.tsx, ChoiceRow.tsx, KeyValueList.tsx, FitText.tsx,
  listUrl.ts (A29); NEW
  src/components/catalog/QtyStepper.tsx, ChipsRow.tsx; NEW
  src/components/platform/ui/RecordRow.tsx, DocumentRow.tsx;
  src/components/platform/ui/Select.tsx, PaymentBadge.tsx, index.ts;
  src/components/checkout/fields.tsx; gallery for the F2 atoms in a NEW
  route src/app/ui-gallery/phone/page.tsx (+ PhoneAtomsGallery.tsx next
  to it), so F1 and F2 never edit the same gallery file.
  F2 needs Button (A1) only for labels; no dependency on F1 code (ChoiceRow
  draws its own marker). src/components/platform/ui/index.ts is frozen
  after F2 (CABINET_* consumers import CabinetPageHead directly, A20).

Wave 2 (sequential: shell-public, then shell-cabinet):

- C-shell-public: src/components/Header.tsx, Footer.tsx,
  ScrollUpDock.tsx; NEW src/components/PhoneMenu.tsx (PhoneMenuRow ships
  with `ariaLabel` / `ariaHaspopup`: wave 2b's CabinetMenu needs them).
- C-shell-cabinet (needs PhoneMenu.tsx): src/components/platform/
  PlatformHeader.tsx, SideMenu.tsx, PlatformFooter.tsx,
  PlatformChrome.tsx; src/components/platform/ui/CabinetPage.tsx,
  CabinetPageHead.tsx, SignInPrompt.tsx; src/components/auth/
  WelcomeModal.tsx; NEW src/components/platform/CabinetMenu.tsx,
  companyInitials.ts.

Wave 3 (parallel, after waves 1-2):

- C-catalog (catalog-b2c + catalog-b2b): src/components/catalog/
  CatalogPageView.tsx, CatalogClient.tsx, FiltersDrawer.tsx,
  ProductCard.tsx, B2BProductCard.tsx, SubcategoryCarousel.tsx,
  CategoryBanners.tsx, ZoneCard.tsx; optional NEW B2BCatalogView.tsx,
  CatalogHeadParts.tsx (split not required with one agent).
- C-cart: src/components/cart/CartDrawer.tsx, StockModal.tsx,
  CartProvider.tsx, data.ts; NEW CartSheetPhone.tsx, StockSheetPhone.tsx.
  Adds `buyNow(id, qty)` to CartProvider first (PDP needs it).
- C-checkout: src/app/checkout/page.tsx; src/components/checkout/
  CheckoutClient.tsx, CheckoutForm.tsx, CheckoutItems.tsx, data.ts; NEW
  CheckoutLines.tsx, useCheckoutDraft.ts.
- C-auth: src/components/auth/AuthDrawer.tsx, AuthProvider.tsx, data.ts.
- C-materials: src/components/materials/Hero.tsx, FolderCard.tsx,
  FileCard.tsx, FiltersDrawer.tsx, PreviewPanel.tsx, MaterialsHome.tsx,
  MaterialsCategory.tsx, PartnerMaterials.tsx, data.ts; NEW
  phoneParts.tsx, useMaterialsUrlState.ts.
- C-dashboard: src/components/platform/dashboard/DashboardView.tsx,
  data.ts; NEW phoneParts.tsx.
- C-profile: src/components/platform/profile/ProfileView.tsx,
  LogoCard.tsx, AccountForms.tsx, shared.tsx, CounterpartiesPanel.tsx,
  ContractParts.tsx, EmployeesPanel.tsx, data.ts; NEW phoneParts.tsx;
  src/components/platform/ui/KebabMenu.tsx, Dropzone.tsx,
  UploadedFileTile.tsx.
- C-assortment: src/components/platform/assortment/AssortmentView.tsx,
  store.ts, data.ts; NEW parts.tsx, PhoneList.tsx, PhoneSelectionBar.tsx.
- C-orders-list (orders-list + the returns LIST): src/components/
  platform/orders/OrdersView.tsx, listParts.tsx (after F2's re-export
  edit), DocumentsModal.tsx (adds OrderDocumentRow), data.ts
  (`formatAmount` NBSP only); NEW listPhone.tsx, listState.ts,
  PaymentCell.tsx, ReturnRows.tsx.
- C-pdp (after C-cart for `buyNow`; its verify after C-catalog): src/
  components/product/ProductPageView.tsx, ProductView.tsx,
  BoughtTogether.tsx, ProductGridSection.tsx, SpecTable.tsx; NEW
  phoneParts.tsx, PhoneBuyBlock.tsx, StickyBuyBar.tsx.

Wave 4:

- C-order-detail (order-detail + returns DETAIL; after C-orders-list):
  src/components/platform/orders/detailParts.tsx, OrderDetailsView.tsx,
  ReturnDetailsView.tsx, CancelOrderModal.tsx, ReturnWizardModal.tsx;
  NEW ReturnWizardSheet.tsx, OrderNotFound.tsx; src/app/orders/[id]/
  page.tsx; NEW src/app/orders/[id]/not-found.tsx.

Fallback rule (every cluster): if a shared atom is late, a local copy with
EXACTLY the section 3.4 API and classes is allowed in the area's
phoneParts file and must be swapped for the atom before the cluster is
verified (no second look ships). Shared icon files (catalog/icons.tsx,
platform/ui/icons.tsx, cart/icons.tsx, materials/icons.tsx) are frozen
during wave 3: a cluster that needs a new glyph adds it to its own new
file (phoneParts.tsx or <area>/phoneIcons.tsx).

### 6.2 Pre-cluster edits (F2, before wave 3)

1. catalog/ProductCard.tsx: replace the QtyStepper and ChipsRow
   definitions with `import { QtyStepper } from "./QtyStepper"; import {
   ChipsRow } from "./ChipsRow"; export { QtyStepper, ChipsRow };` (a bare
   `export ... from` creates no local binding and the file's own call
   sites at :245, :336, :386 would fail tsc; desktop byte-identical). QtyStepper.tsx / ChipsRow.tsx never import from
   ProductCard.tsx.
2. platform/orders/listParts.tsx: delete the `useListbox` (not exported
   today, used at :252) and `useDismiss` (exported at :22) definitions and
   add `import { useDismiss, useListbox } from
   "@/components/ui/useListbox"; export { useDismiss };`.
Nothing else outside F2's list.

### 6.3 What each cluster's verify agent checks

A fresh agent per cluster (not the builder), with audit/mobile/kit/
phone.mjs (touch emulation, real taps, `scrollTo({ behavior: "instant" })`):

1. Widths 320 x 568, 360 x 780, 375 x 667, 390 x 844, 430 x 932, 600 x 960
   (639 x 800 spot check) for every route / state / overlay of the area
   spec's 1.x tables; shootSegments viewed with the Read tool.
2. domChecks clean (no overflowX / offRight / offLeft / wideElement /
   tinyText / inputZoom / smallTarget / clippedText / hScroller /
   overlapText) except the documented false positives of each spec.
3. The area spec's section 6 measurements (tolerance 1 px) AND the
   system values of section 3 that apply: gutters 24, head rhythm
   (48 / 48 / 16 / 24 / 32 / 48), toolbar -> list 24, sheet bar 66 with
   the cross glyph at x vw-48 / y 21, body pt 24, footer pt 16, pills 42
   with 16/22 500, crosses 44-48 hit, list dividers 1 px #d2d2d2, radii
   per 3.1.3, type per 3.1.1 (computed styles, not class strings).
4. Flows of the area spec (taps, sheets open / close, focus return
   without scroll jump, Back closes sheets, route change closes
   overlays, keyboard Tab / Escape, reduced motion), console errors = 0.
5. Consistency: the atoms of section 3.4 are used (no local look-alike
   left after the atom landed).
6. Pixel guard (6.4) for the cluster's surfaces + its own desktop
   before / after set for overlays not in the baseline.
7. `npx tsc --noEmit` and `npx eslint <changed files>` clean (6.5
   conventions; no synchronous setState in effect bodies).
8. Short viewports and the keyboard (critique round 1): 390 x 420 and
   320 x 300 (keyboard-open proxies) and 568 x 320 (landscape below 640):
   every submit / "Показати" / CTA is reachable, nothing is covered,
   footers / docks / bars are static or hidden per 3.1.6, no pinned bar
   exceeds 30 % of the viewport.
9. Landscape desktop canvas on touch (844 x 390, touch emulation): cart,
   stock, auth, welcome, Modal718 text >= the base canvas text (O-4), CTA
   reachable by scrolling. Real-device step (orchestrator, once): an
   iPhone with a notch in landscape, landing + /catalog + the cart open:
   nothing under the sensor housing on shop canvases (O-16), the landing
   unchanged.
10. Accessibility tree: with each sheet / card open a Playwright
    accessibility snapshot exposes no node outside the dialog; one
    announcement per filter tick; after any overlay closes
    `document.getElementById("mobile-nav").inert === true` and the opener
    has focus without a scroll jump.
11. Focus not obscured: Tab through the last visible row at 320 x 568 with
    the PDP / assortment bar shown - the focused control is fully
    visible.
12. History: the A4 flow list (filters -> "Показати" keep URL + list, one
    Back leaves; in-sheet links leave history [page, target]; handoffs
    keep the new overlay open; the wizard steps back; the menus close on
    Back on shop / cabinet routes).
13. First screen: at 390 x 844 the first list item's top edge is on screen
    on a catalog category page, /orders and /assortment.

### 6.4 Regression guard procedure

0. Before wave 2 (orchestrator or F1, from the pre-shell tree; critique
   round 1): extend audit/mobile/kit/baseline.mjs with
   landing-phone-menu-hotels (/hotels, 390 x 844, menu open) and
   landing-phone-menu-short (/, 375 x 667, menu open) and shoot them into
   audit/mobile/baseline (frozen set 50 -> 52), so the guard sees the
   menu on more than one route and height.
1. Before the first edit of a cluster: confirm audit/mobile/baseline
   exists (76 shots, taken before the pass); clusters that touch desktop
   overlays not in the baseline shoot their own 1710 before-set into
   audit/mobile/<area>/desktop-before (examples: Modal718 / ConfirmModal
   states on /ui-gallery (F1; shot before F1 edits Modal718; every before
   / after shot must contain `[role=dialog]` - a 404 compares equal and
   proves nothing), stock modal (cart), welcome modal (shell-cabinet),
   documents / cancel / wizard modals (orders, order-detail), profile
   modals, materials viewer + filters, assortment confirm + toast).
2. After the cluster: `node audit/mobile/kit/baseline.mjs
   audit/mobile/after-<cluster>` then `node audit/mobile/kit/compare.mjs
   audit/mobile/baseline audit/mobile/after-<cluster>`.
3. Expected: the frozen shots (52 after step 0: landing-phone-*,
   landing-1440-*, shop-1710-*, cabinet-1710-*) = 0 differing pixels; phone-390-* may
   change only for the cluster's own routes (list them in the report).
   Desktop before / after sets of step 1 = 0 diffs.
4. Any diff on a frozen shot: the cluster is not done; fix, or explain
   it to the orchestrator with the diff crop (D12: "each difference
   explained and accepted by the orchestrator").
5. Final run after wave 4 over the whole set; then phase 4 reviews.

### 6.5 Static checks

- Per cluster: `npx tsc --noEmit` (whole project) and `npx eslint` on the
  changed files; zero new warnings.
- Conventions (critique round 1): return types `React.JSX.Element` or
  none (@types/react 19.2 has no global `JSX` namespace); never spread an
  object holding `key` into JSX (React 19 logs an error; rows use `id`);
  new files that render `<img>` start with `/* eslint-disable
  @next/next/no-img-element */` (repo convention, 57 files;
  eslint-config-next 16.2.6 core-web-vitals); the react-hooks 7.1.1
  recommended rules (set-state-in-effect, refs, purity) are on: resets
  stay render-phase or derived.
- End of the pass (orchestrator, phase 4): `npm run lint` and `next
  build` (Next 16 writes the dev build under .next/dev; if the build
  cannot run next to the dev server, the orchestrator schedules it).

---------------------------------------------------------------------

## 7. Conflict log

### 7.1 Amendments to DECISIONS (A-x) and global resolutions

| Id | Conflict | Sources | Resolution |
|---|---|---|---|
| A-1 | Menu fit zoom: D1 asks the cabinet sheet to use "the same useFitZoom(706, 66) logic" | D1 vs shell-public 2.3 / PS-07, shell-cabinet C1 | AMEND D1: both menus drop the fit zoom (stale 706, 10-px text at 320 x 568); natural 14/20 rows, scrolling overlay, sticky CTA dock; the landing-phone-menu guard shot stays identical. Landing short-phone menus change behaviour (O-1). Critique round 1: on landing routes the public menu keeps the fit zoom, no active row and "/#contacts" until O-1 is answered (3.2); the cabinet stagger is compressed (A-16) |
| A-2 | Back crumb -> title 48 vs 24 | shell-cabinet 2.5.1 (48) vs returns S2, order-detail N2, assortment S2, catalog-b2b OP-05 (24) | 48 on every page (TR-03, article master, same as the public crumb -> H1). CabinetPageHead `max-lg:mb-6`; catalog-b2b text column `gap-12 lg:gap-6` |
| A-3 | Head -> first block: head `pb-12` + block pt 0 vs head `pb-6` + 24 | shell-cabinet, dashboard, profile, returns vs orders-list, assortment, order-detail | Head pb 48, first block no top padding. Orders tabs move to 48 under the head; order-detail `DetailsBody pt-0 lg:pt-4`; assortment search 48 under the head |
| A-4 | Toolbar -> list 24 vs 48 | orders / assortment / catalog (24) vs materials (48) | 24 everywhere (toolbar and its list are related items, D10). Critique round 1: this is an INVENTION - the only master chips -> list (blog 3176:5463) is 48 + #8e8e8f rule + 60; verify agents do not look for master evidence |
| A-5 | LoadMore after the last batch: counter stays vs block hidden; `onLess` | catalog-b2c / b2b vs orders / returns / assortment; dashboard | Block hidden when everything is shown; `onLess` only for dashboard payments |
| A-6 | Filter button look; two actions in a sticky bar | orders-list (TR-10 outlined + #1d1d1f badge) vs catalog / materials (black disc + brand badge); D8 "stacked" vs TR-10 / TR-18 "flex-1 side by side"; catalog-b2b single full-width footer | FilterButton = black 52 disc + brand badge (shop identity, 3 of 4 consumers); sticky bars and sheet footers put two actions side by side `flex-1` gap 8 (TR-18); D8 stacking applies to heads and modal cards. Exception (critique round 1): when a full label does not fit half the row at 320 (pill > 132) the two actions stack 8 apart, secondary first (stock sheet, cancel sheet) |
| A-7 | Sheet bar title for long / dynamic titles | cart ("Кошик" for the stock sheet), materials ("Перегляд"), auth (2-line titles), order-detail (line-clamp-2 in 66) | REVISED in critique round 1 - D7 stands, this is no longer an amendment: the bar is 66 and ONE line on every phone; SHEET_TITLE truncates only as a safety net; a title wider than 228 px at 320 passes `shortTitle`, shown below 375 ("Вхід", "Новий пароль", "Наявність товарів", "Скасування", "Повернення"; O-12); the dialog name stays the full title; dynamic names go to the body under a context word ("Перегляд") |
| A-8 | D7 modal classification at the edges | profile 7.3 / 7.4 (M3 sheet, M7 / M8 cards), orders docs modal (rows), cart stock | Profile's classification accepted; documents modal = card with DocumentRows and pinned head / CTA |
| A-9 | Stock modal: card for 1-2 issues vs sheet | D7 literal vs cart 7.1 (a 1-issue card is already 793-821 px) | Sheet for every count on phones |
| A-10 | Line anatomy, totals, steppers, empty actions, clamps | cart vs checkout vs order-detail vs returns vs assortment; TotalCard 30/36 vs 22/28; stepper count 22/28 (catalog-b2b) vs 16/22; editable steppers; empty-state variants; TR-08 / TR-25 2-line clamps | One ProductLine (one link block, bottom slot full width, total 22/28, eyebrow only for exceptions); every total / amount 22/28 SemiBold (Stat 30 only for KPI values and card prices); stepper count 16/22 Bold everywhere; `editable` steppers in partner contexts; EmptyState action rule (3.4 A14); names may clamp at 3 lines in documents and assortment lines |
| A-11 | Surfaces and lists | D1 slab vs catalog-b2b OP-02 / pdp C5 (white); TR-07 public ring panel vs checkout 7.1 / materials (open rows); detailParts twins (returns) vs in-component phone variants (order-detail) | B2B catalog + PDP white; other cabinet routes on the slab. Public lists = open rows between 1-px lines. detailParts gets phone variants (order-detail N11) used by BOTH detail pages; one cluster owns both |
| A-12 | Logo avatar size / radius | shell-cabinet 96 r12.8 vs auth 120 vs profile 120 r24 | 120 x 120 r16 in the welcome tile and the profile logo card (proportional to desktop 144.6 / r19.3; D5's r24 would be rounder than desktop) |
| A-13 | WelcomeModal ownership | BRIEF lists it under auth; shell-cabinet C5 | shell-cabinet owns WelcomeModal.tsx; auth 2.9 is informative only |
| A-14 | 14-px pill labels below 360 | returns S14 NARROW_PILL, auth PHONE_PILL vs D8 16/22 | No 14-px labels: shorter phone labels ("Завантажити все", "Запит надіслано", "Завантажити лого"); `px-[11px]` kept only on the Google pill below 360 (auth); head pills may wrap to 2 lines. Critique round 1: the 14-px RESTING field label below 360 (auth) is dropped too |
| A-15 | Form submit + an alternative sign-in vs D8 "secondary first, primary last" | auth 2.2 / 7 C2 (submit first, Google second) vs D8 | AMEND D8 (critique round 1): a form's submit stays adjacent to its fields and the alternative method (Google) follows it; D8's order applies to alternative actions of one decision (cancel / confirm, back / next, secondary / primary in heads, modal cards and footers) |
| A-16 | Cabinet menu motion vs D1 "same motion" | shell-cabinet 2.2 delays 80..600 (the CTA settles ~900 ms after the tap; rows tappable while nearly transparent) vs the cabinet menu being THE section switcher | AMEND D1, delay curve only (properties, 400 / 300 ms durations and easing unchanged): cabinet items k = 0..13 use `40 + k * 20` ms (last 300); the public menu keeps its timings |
| A-17 | Viewport export location | D12 "Root layout gets export const viewport with viewport-fit=cover and themeColor" vs the frozen landing (cover moves landscape renders on notched iPhones; the Chromium guard sees env() = 0) | AMEND D12: the root layout exports no viewport; the seven shop / cabinet segment layouts (+ ui-gallery) export `{ viewportFit: "cover", interactiveWidget: "resizes-content", themeColor: "#ffffff" }` (A26); landscape letterbox on shop canvases (O-16) |

### 7.2 Atom-level conflicts (resolved in section 3.4)

| # | Conflict | Sources | Resolution |
|---|---|---|---|
| C-01 | Sheet atom name / home / API | ui/Sheet.tsx (order-detail N9), platform/ui/Sheet.tsx (orders S7), FullScreenSheet (returns S16), SheetBar (cart N7, auth N-A), SheetBar / SheetFooter (catalog SN-C8), Modal718 sheet (profile SN-16) | A5: ui/Sheet.tsx with constants; restyled overlays copy the constants; Modal718 `phone="sheet"` uses them |
| C-02 | SheetBar gap and wrapping | cart gap-4 truncate; auth gap-2 wrap; order-detail fixed 66 | A5 (revised in critique round 1, D7): `h-[66px] items-center gap-2`, title ONE line (`truncate` safety net) + `shortTitle` below 375 |
| C-03 | Phone media hook | useIsPhone (catalog, materials: null, max-width 639px), usePhone (order-detail, profile), useMediaQuery (cart, catalog-b2b), useIsDesktop (auth) | A3: ui/useMediaQuery.ts; usePhone = not (min-width: 640px), server false |
| C-04 | Back gesture hook | useSheetHistory (catalog, materials), useBackToClose (order-detail, auth), closeOnBack (orders S14), history option (profile SN-22) | A4 (rewritten in critique round 1): module stack of tagged entries, handoff, `release({ navigate })`, `onSettled`, `rearm` / `onStep` / `unarm`, never back() on a pathname change, kill switch; all phone sheets + phone modal cards + both menus on shop / cabinet routes; materials viewer keeps `?file=` |
| C-05 | useModalBehavior extensions | preventScroll (shell-public N2, cart N1, dashboard SN-09), fallbackFocus (shell-cabinet SN-4, profile SN-09), returnFocus (returns S6), modal stack (materials MS-1) | A2: one change set; `fallbackFocus` is the single name (returns' ref passes `() => ref.current`) |
| C-06 | Empty state atom | ListEmpty (orders), PanelEmptyState (dashboard, catalog, materials, profile), EmptyPanel (returns), EmptyState framed (checkout) | A14 with `surface` |
| C-07 | Empty-state action variant | TR-24 solid; cart / checkout success accent; orders outlinedDark; catalog-b2b reset only with filters | A14 rule (A-10) |
| C-08 | LoadMore home and API | ui/LoadMore (dashboard, catalog), platform/ui (returns), orders S12 counter fn | A9 at ui/LoadMore.tsx |
| C-09 | List row line 1 | orders (id over date, 40 / 44 disc + chevron), returns (46 discs), dashboard (id + date + chevron on one line) | A7 = orders version for all three |
| C-10 | List panel padding / dividers | ListPanel + ListRow pseudo divider (orders, assortment) vs `ul px-6` + li border-t (dashboard, profile) | A7 = ListRow pseudo divider; profile rows use ListRow + their own bodies |
| C-11 | Product line atom | ProductLine (cart N6), LineItemRow (checkout S3), ItemsList (order-detail), LineItemList (returns S11), ProductLine + titleLines (assortment S17) | A8 |
| C-12 | Key / value atom | KeyValueList (order-detail N7), KeyValueCard (returns S10), KeyValueLine (profile SN-07) | A15 (+ KeyValueLine in A7) |
| C-13 | Documents on phones | DocumentTile phone layout in place (orders S6) vs DocumentRow (returns S9, order-detail N8); clamp 2 / 3 / none | A16: DocumentRow twins, DocumentTile untouched, clamp 3 |
| C-14 | Radio choices | RadioGroup gap-9 min-h-11 (checkout S4) vs ChoiceRow gap-10 min-h-10 (order-detail N10) | A24 revised in critique round 1: `min-h-10` + 44 pseudo hit, rows `gap-10` (pitch 80 one-line / 88 label + hint or 2-line = Quizz Card 3111:14541) - order-detail's values |
| C-15 | Toast host | local hooks (returns S7, profile SN-18), global host z-70 (order-detail N12), assortment local z-35 with close | A23: global host z-55, phone-only default, optional close / action |
| C-16 | Chip tabs | ChipTabs atom px-4 (profile SN-15) vs in-place px-[15px] (orders), PDP after-hit | A10: px-[15px] + after hit; atom + class helper |
| C-17 | QtyStepper | hit boxes all widths (catalog SN-C1) vs max-lg (cart, checkout, pdp, catalog-b2b); size "xs" (cart); count sizes; editable; file in a catalog file | A18: extracted file owned by F2, max-lg boxes, 16/22 count, editable in partner contexts |
| C-18 | Crumb atoms | ShopCrumbs / PhoneBackCrumb (shell-public N1), BackCrumb phone row (catalog-b2c), PhoneCrumb (checkout S6), BackCrumb truncate (catalog-b2b SN-B09), BackButton (CabinetPageHead) | A19: PhoneBackCrumb everywhere on phones; CabinetPageHead renders it `lg:hidden` |
| C-19 | Search field | three copies (catalog, listParts, materials) + three clear-button recipes | A11 SearchField |
| C-20 | Applied chips | 36 buttons, "Скинути" (orders) vs 44-hit chips, "Скинути фільтрацію" (catalog, materials) | A11 AppliedChips = catalog recipe; text #343435 on phones (master chip 3176:5479, critique round 1), #1d1d1f from `lg:` (catalog / materials desktop identity) |
| C-21 | Filter sheet footer | orders (hug reset + "Показати N"), catalog-b2c / materials (status + two flex-1), catalog-b2b (single "Показати N товарів") | A5 template T5a (A-6) |
| C-22 | Sort control | TextDropdown phone variant with prefix + flip (catalog) vs label-only trigger + scrollIntoView (orders, assortment) | A12 SortMenu (flip rule, 16/24 Medium items, divide-y); on phones always at the right end of the meta line, no prefix (C-47) |
| C-23 | ScrollUpDock on shop phones | hidden (shell-public) vs scroll-direction gate (catalog SN-C6) vs `data-scrollup-avoid` (checkout S7) vs `--phone-bottom-bar` offset (pdp S6) | Hidden on shop phones (shell-public 2.8); landing unchanged; cabinet none |
| C-24 | Not-found | drop `notFound()` (shell-cabinet SC-09) vs route not-found.tsx (order-detail) vs global not-found (catalog SN-C10, pdp S9, materials MS-14) | order-detail's segment not-found.tsx (keeps the 404 status); global branded 404 = O-3 (not built by default) |
| C-25 | Cabinet section title weight | SemiBold (dashboard SN-13) vs Bold (profile today) | CABINET_SECTION_TITLE SemiBold on phones, Bold on desktop |
| C-26 | Head actions full width | CabinetPageHead slot (shell-cabinet) vs per-button PHONE_STACK (dashboard, order-detail) | The slot does it; per-button classes are redundant but harmless |
| C-27 | Head title tokens on B2B shop heads | PDP literal 30/36, catalog-b2b `text-h2` | Both use `CABINET_TITLE` / `CABINET_SUBTITLE` exports |
| C-28 | Modal card details | p-4 / p-6, pinned head (orders, profile) vs pinned actions only (order-detail), description 18/26 vs 16/24, returnFocus vs fallbackFocus | A6 |
| C-29 | Safe-area formula | `calc(16px+env())` (TR-18, orders, catalog) vs `max(16px, env())` (shell-public dock, order-detail N9) vs `max(24px, env())` (cart, auth) | `calc(N + env)` everywhere (3.1.6); the three leftovers (cart stock bar, wizard footer, auth scroller) fixed in critique round 1 |
| C-30 | Typed quantity | catalog-b2b `editable` vs assortment / checkout "one decision for all, deferred" | A-10: editable in partner contexts (B2B card / row, PDP B2B, partner cart rows, assortment) |
| C-31 | Add-to-cart feedback | cart 7.9 / catalog-b2b OP-08 toast proposal vs today's sheet | Keep opening the cart sheet (desktop parity, Figma 4204:56703); O-11 carries the critique's toast recommendation |
| C-32 | Button focus ring | assortment S1 adds a ring to Button | Rejected (landing frozen); new controls only (3.1.6) |
| C-33 | PDP band / series cards | PhoneAvailability in BoughtTogether vs catalog StatusLine; B2B series cards with partner prices | Band and series cards follow the catalog card (StatusLine compactOnPhone); only the PDP hero uses PhoneAvailability / PhonePrice; series cards stay B2C like desktop (O-9) |
| C-34 | Partner file rows | white r32 panel vs rows on the slab (materials 7.2) | Panel (TR-07 cabinet look, same as every cabinet list) |
| C-35 | Public folder cards | filled #f8f8f8 vs D2 ring | Filled (desktop identity, master filled card on white) |
| C-36 | Inert selectors | `"body > header"`, `"header"`, `"body > header, #mobile-nav"`, `[data-cabinet-behind]` | Overlays: the A2 sibling walk (OVERLAY_INERT kept, redundant); menus: MENU_INERT (+ `[data-cabinet-behind]` in the cabinet); a pre-existing React `inert` is never touched (critique round 1) |
| C-37 | Modal width at 430..639 | cap at 480 (orders 7.13, dashboard 7.15, shell-cabinet C10) vs vw - 48 | vw - 48 at every phone width (one rule; the menu cap was dropped too) |
| C-38 | Cart line status eyebrow | every row (cart) vs exceptions only (checkout 7.4) | Exceptions only (A-10) |
| C-39 | Dark KPI tile radius | TR-20 "keep 24" vs D5 "r32" | D5 wins: r32 (dashboard spec already) |
| C-40 | Dark summary fill and anatomy (critique round 1) | cart / assortment #2d2d2f + a Regular one-row label (TR-18) vs checkout / order-detail #1d1d1f + a Medium label stacked over the amount (desktop identity, checkout CO-33) | #1d1d1f for every shop / cabinet dark surface; one anatomy for totals: SUMMARY_LABEL stacked over SUMMARY_AMOUNT, gap 8 (A13); #2d2d2f stays for toasts and the wizard's Quizz band |
| C-41 | Last field -> action | TR-23 / spec 32, profile Security 24, auth 32 vs the masters' 48 (3166:7864, 3111:14541) | 48 on pages and in sheets; 24 only inside D7 modal cards |
| C-42 | KPI tile gap | TR-20 16 vs D10 related cards 24 | 24 (D10 wins; dashboard y map +8 per gap) |
| C-43 | Catalog direction banners | TR-29 "16 apart" vs the master photo tiles touching (ZonesGrid 3117:14393, 3130:17608 -> 3130:18944) | Touching with a 1-px seam (`max-lg:[&+&]:-mt-px`); 616 tall for three |
| C-44 | PDP media | blurred PhotoBackdrop + full-width snap track (pdp 2.4 / 2.9) vs D3 / TR-30 / TR-29 | Static 342 stage on `bg-bg-product` with `object-contain`, switched by the thumbs; no blur anywhere; off-grey assets are re-exported onto #d5d5d5 |
| C-45 | Cancel-order choices | selects in a short card (order-detail 2.9, N6) vs A22 radios / the wizard radios | RadioGroups in `Modal718 phone="sheet"` (T5h) |
| C-46 | LoadMore ref / focus / live counter | `moreRef` (catalog, catalog-b2b, dashboard, materials) vs no ref in A9; focus the first new item vs stay on the button; counter role=status | A9: `focusAfterLast`, focus stays on the button, counter not live |
| C-47 | Catalog toolbar | 3 rows (search / count + view switch / sort with prefix = 172) vs the T2 meta line (orders, returns, assortment) | Search row with a 52 view toggle disc + FilterButton, then the meta line (count left, SortMenu right): 112 |
| C-48 | List URL writes | `router.replace` (catalog-b2c 2.19) vs `replaceState` (catalog-b2b, orders, materials); `page` with two meanings | A29 `writeListParams` (replaceState) everywhere; phone batches in `n`, desktop `page` |
| C-49 | Uppercase captions | PDP PhoneAvailability / PhonePrice, catalog-b2b status / price captions / tile dt at 14/20 vs D9 / the B2C card (12/20) | 12/20 Medium uppercase everywhere on phones (3.1.1) |
| C-50 | Pinned bottoms on short viewports | only the cart (`[@media(max-height:499px)]:static`) | Baked into SHEET_FOOTER, PhoneMenuCtaDock and StickyBar (3.1.6) |

### 7.3 Edits made to the area specs (all on 2026-11-05 by this agent)

Every area spec got a "System alignment (2026-11-05)" block right after
its intro (before section 0 / 1). The block lists, per conflict above,
what in that file is overridden and the replacement value or atom (rows
S1..Sn). Where a recipe or number in the body was now wrong, the value
was replaced in place or a short note "(SYSTEM A-x / Ax: ...)" was added
at the start of the affected section; prose edits carry the word SYSTEM
(grep for it), pure value swaps inside code / class strings are listed
as "edited" in the file's alignment block. Line endings were preserved (catalog-b2c.md
and profile.md are CRLF, the rest LF). Pre-edit copies are in the
system-spec agent's scratchpad (specs-backup/). Per file:

| Area spec | Alignment block | In-place edits |
|---|---|---|
| shell-public.md | A-1 accepted; safe-area formula; ScrollUpDock decision confirmed; atoms N1..N6 now = A19 / A2 / A26 / PhoneMenu | PhoneMenuCtaDock `pb-[max(16px,...)]` -> `pb-[calc(16px+env(safe-area-inset-bottom))]` |
| shell-cabinet.md | A-1, A-2 confirmed; A20 additions (PhoneBackCrumb back row, titleRef, constants); A-12 avatar 120 r16; SC-09 via segment not-found (C-24); welcome = A6 numbers | WelcomeModal avatar row of 2.8 (size-24 -> 120 r16); 2.10 not-found note |
| catalog-b2c.md | A19 crumb, A11 atoms, A12 SortMenu, A9 (A-5), A14, A3, A4, A18 / A-10, C-23 | 2.3 crumb note (ShopCrumbs); 2.13 counter line (A-5); 2.16 SortMenu note; SN-C1..C13 mapped in the block |
| catalog-b2b.md | one cluster with B2C; A-2 crumb -> title 48; filter footer = T5a; stepper count 16/22; empty-state copy = B2C; load-more hides; A19 crumb | 2.2 text column gap; 2.9 count; 2.10 counter; 2.11 empty; 2.12 footer |
| pdp.md | C-33 (band cards follow the catalog card, no B2B series cards); A18 count; editable in B2B; A13 StickyBar; A26 | 2.10 `phoneCard="b2b"` marked not built (O-9); the band status-line rule is in the block (S2) |
| cart.md | A-9 stock = sheet always; A-7 bar title; A8 ProductLine (eyebrow exceptions); A14 empty action; A18 (no size "xs"); A3, A4, A5 constants; C-29 | 2.4 variant pick; 2.3 empty CTA variant; 2.2.2 status rule note; 2.2.3 safe-area formula |
| checkout.md | A19 ShopCrumbs (no PhoneCrumb); A8 ProductLine (one link block, total 22/28); A24 RadioGroup; A14 empty / success solid; O-6 prefill deferred; A26 fields | 2.1 recipe; S3 / S4 / S5 / S6 mapped |
| auth.md | A-13 welcome moved; A5 SheetBar; A3 hook; A-14 pill rule kept (Google only); A4 Back; landscape FINE_DESKTOP deferred (O-4); typo O-5 | 2.9 marked informative; AUTH-04 deferral is in the block (S4) |
| dashboard.md | A7 RecordRow line 1; A14; A9 `onLess`; A25 FitText home; A22 Select owner F2; C-39 | 2.6 line 1 recipe |
| orders-list.md | A-3 tabs 48 under the head (y map +24); A-6 FilterButton black; A11 chips; T5a footer; A12; A16 DocumentRow twins; A7 names | 2.0 y map (390 and 320); 2.2 spacing line; 2.3.1 filter disc; 2.3.2 chips note; 2.4 footer note; 2.10 rows note; S6 marked superseded |
| order-detail.md | A-2 / A-3 / C-26 head; TitleLight line; A-10 total 22/28; A8 items; A15 / A16 / A5 / A24 / A23 / A3 / A4 homes; C-24 kept | 2.1 head table rows; 2.2 total classes; 2.6 DetailsBody pt |
| returns.md | A7 rows (no 46 discs); A-2 head; A-11 detailParts phone variants instead of twins; A14 / A15 / A16 / A23 / A9 homes; A-14 no NARROW_PILL | 2.1.4 line 1 + both disc rows; S2 back gap; S14 rejection is in the block (S8) |
| profile.md | A10 ChipTabs px-[15px]; A-12 logo 120 r16; A14; A23; A3; A6 `phone`; A17 ownership confirmed | 2.3.1 avatar radius |
| assortment.md | A-2 / A-3 head (y map +48); A23 toast z-55; A13 StickyBar; A8 titleLines 3; A18 editable RowStepper; C-32 focus ring rejected | 2.1 y map; S1 focus ring |
| materials.md | A-4 toolbar -> list 24; A3 usePhone; A4 name; A14; A5 SheetFooter constants; A11 FilterButton (badgeDesktop) | 2.0 spacing line; 2.3 partner toolbar pb |

Critique round 1 (section 10) appended rows to every alignment block,
marked "(critique round 1)" after the S number and continuing the S
numbering; same precedence (the block wins over the body). A few body
values were replaced in place (each listed in the file's new rows).
Rows of the first pass that a critique row supersedes carry "SUPERSEDED
by Sn". Line endings preserved; pre-edit copies in the editor agent's
scratchpad (specs-backup-critique1/).

---------------------------------------------------------------------

## 8. Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | A shared change leaks into the landing or desktop (Button, Header menu, Footer, fields.tsx, Modal718, useModalBehavior) | Phone-only strings / `max-lg:` / pixel-neutral pseudo elements; compare.mjs over the 50 frozen shots after F1, F2 and each shell cluster; gallery before / after sets for Modal718 / ConfirmModal; a probe listing visible Buttons on the landing at 390 |
| R2 | Tailwind v4 skips a new arbitrary class (stale dev server) or a `:has()` / `has-[]` / `[&+&]` variant is not emitted | Verify computed styles, not class strings; re-save; `rm -rf .next` only with the orchestrator; fallback = the same selector as unlayered CSS under `@media (max-width: 639.98px)` in globals.css (F1 only) |
| R3 | Unlayered phone tokens beat utilities (gotcha 1) and unprefixed leading leaks to desktop (gotcha 2) | Rule 2 of section 2; verify agents probe desktop computed type on touched shared elements |
| R4 | JS twins (usePhone) flash the wrong tree on first paint or break hydration | Only in client-only views or below the fold; server snapshot = desktop; verify agents screenshot the first paint with CPU throttling x4 |
| R5 | `useBackToClose` pushes history entries that fight the Next router (double back, lost scroll restore, stale `?tab=` / `?file=`) | Kill switch in A4; the rewritten A4 contract (tagged entries keep `__NA`, no URL write while an entry is on top, `release({ navigate })` for in-overlay links, handoff, never back() on a pathname change); the A4 flow list (6.3 item 12) incl. the orders mirror and the materials `?file=` entry |
| R6 | Modal stack changes every overlay's lock / inert / focus order (materials MS-1) | F1 unit flows: cart + stock, auth over the viewer, welcome after sign-in, Escape order, Tab trap with two dialogs, html overflow restored after any close order |
| R7 | Removing the menu fit zoom changes the landing menu on short phones | Landing-safe DEFAULT (critique round 1): the zoom path, inactive rows and "/#contacts" stay on non-shop routes (3.2); guard shots landing-phone-menu (390 x 844) + menu-hotels + menu-short (6.4 step 0); O-1 decides whether the landing adopts the shop menu |
| R8 | The html overflow lock does not stop iOS Safari < 16 background scroll | Sheets are opaque and full-screen; accepted (shell-public O16) |
| R9 | Sticky elements stop sticking because an ancestor gains `overflow: hidden|auto` | Contract in 3.3 (slab) and A13; verify: the assortment bar and sheet footers stay pinned at 320 x 568 |
| R10 | Wave-3 clusters assume atom APIs that drift during F1 / F2 | Section 3.4 is the API contract; F1 / F2 verify includes a type-only usage file in the gallery for every atom; area builders code against 3.4 |
| R11 | Duplicate controls in the DOM (desktop select + phone radios, two SearchFields) confuse error focus, tests and AT | `display:none` twins only; error focus picks the visible control (checkout 2.10); verify agents assert exactly one visible control per name |
| R12 | NBSP money grouping or mock-data fixes change desktop pixels | NBSP behind the guard (revert on any diff); mock data and typo fixes are deferred to the orchestrator (O-5, O-8) |
| R13 | Toast host or sticky-bar variable left behind after navigation | StickyBar clears `--phone-bottom-bar` on unmount; on a pathname change the host clears only toasts created before the navigation (`keepOnNavigate` survives, A23) |
| R14 | Phone layout of the B2B catalog cards differs from the B2C cards after two builders | One cluster for both skins (C-catalog) |
| R15 | Load-more unreachable with the mocks (materials 9 files, assortment, returns) | Verify with an injected long list (audit script seeding extra mock items in localStorage where possible) or a gallery story of LoadMore |
| R16 | Segment viewport exports do not update the meta tag on client navigation between landing and shop routes | A26 verify step (meta content both ways); if it fails, report to the orchestrator (a root export would touch the landing) |
| R17 | Next's HistoryUpdater rebuilds history.state on router commits and could wipe the A4 marker | No router write while an entry is on top (A4); `isTop()` re-checks the marker; flows of 6.3 item 12 |
| R18 | The A2 inert walk inerts something an open dialog needs (a field menu portaled outside, the toast host) | In-dialog popups render inside the dialog (z-20); `[data-toast-host]` exempt; accessibility snapshot in 6.3 item 10 |
| R19 | `interactiveWidget: "resizes-content"` reflows shop pages when the Android keyboard opens (dvh shrinks) | Intended for sheets / cards; verify 390 x 420 proxies (6.3 item 8); landing routes do not get it (A-17) |

---------------------------------------------------------------------

## 9. Open points for the orchestrator

| # | Question | Default in this spec |
|---|---|---|
| O-1 | Should the LANDING phone menu adopt the shop menu: no fit zoom below 810 px of height, active row brand, "Контакти" -> "#contacts", Back closes it? (Its html lock / route-change close ship everywhere: behaviour only, the guard shots stay identical.) | Not adopted until answered: landing-safe default (critique round 1; 3.2, R7) |
| O-2 | Overlay behaviour reaching the landing routes: cart / auth sheets full screen on phones, modal stack, Back closes sheets | Accept (D7 already accepts the cart / auth / welcome overlays there) |
| O-3 | Global branded src/app/not-found.tsx (changes the desktop and landing 404 page; not in the baseline) | Not built; only /orders/[id] gets a segment not-found |
| O-4 | Landscape phones on the desktop canvas (844 x 390): fit zoom on top of the html zoom -> 5-8 px text in drawers / modals | BUILT in F1 (critique round 1, A26): `useFitZoom` returns 1 on coarse pointers with its default desktop media; the phone-menu caller is unaffected; mouse desktops unchanged |
| O-5 | Typo "Вхід до осбистого кабінету" (Figma copy): fix on all widths (changes shop-1710-auth-signin) | Keep verbatim |
| O-6 | Checkout prefill from the account (CO-24) changes cabinet-1710-checkout-cart | Deferred; the session draft is built |
| O-7 | Content: legal titles are dead spans; multi-file download needs a CRM archive | Out of scope |
| O-8 | Mock string 'ТОВ "Мережа готелів "Зоряний шлях"' quotes (desktop diff) | Deferred |
| O-9 | PDP B2B "З цієї серії" with partner prices on phones (desktop shows B2C cards) | No (desktop content parity) |
| O-10 | Partners check out in the public chrome (/checkout not in the platform route list) | Unchanged (product question) |
| O-11 | Add-to-cart feedback on phones: open the sheet (today) vs a toast with a "Кошик" action | Keep the sheet. Critique round 1 recommends, at least for the partner skin, `showToast({ message: "Додано у кошик", action: { label: "Кошик", onClick: openCart }, durationMs: null, dismissible: true })` + the header badge bump on LIST adds (the sheet stays for the PDP button and on desktop): one tap and no lost scroll per SKU |
| O-12 | New phone-only copy (native check): "Дані", "Завантажити все", "Запит надіслано", "Завантажити лого" / "Замінити лого", "Скинути пошук і фільтри", "Спробуйте змінити пошук або фільтри.", "Показано N із M", "Знайдено N товарів / файлів / категорій / замовлень / повернень", "Перегляд", "Очистити пошук", "Відкрити посилання", "Увійти, щоб завантажити", "№ або контрагент", "Спочатку нові" / "Спочатку старі" / "Сума: від більшої" / "Сума: від меншої", "Без сортування", "Скинути фільтри", "Приховати", "Ліміт не встановлено", "Повернутися до входу", "Незабаром", "Кількість", the toast strings of profile / orders / assortment, "Повертається вся доступна кількість товару."; critique round 1: short bar titles "Вхід", "Новий пароль", "Наявність товарів", "Скасування", "Повернення"; cart "Кошик очищено", "Повернути товари", "Повернути"; PDP bar "У кошик"; cross labels "Закрити фільтри", "Закрити перегляд", "Закрити перевірку наявності", "Закрити вікно входу", "Закрити особистий кабінет" | Ship as specified; native check before release |
| O-13 | URL state on desktop (catalog `view` / `sort` / `q` / `page`, materials `q` / `dir` / `type` / `file`, orders `q` / `period` / `cp` / `sort` / `n`): behaviour change on desktop, no pixel change | Accept |
| O-14 | Typed quantity (A-10) only in partner contexts; retail steppers stay +/- | Accept |
| O-15 | Stat weight: D3 / D9 say 30/36 Bold, but the master Stat 30 (Cases 3094:5169, TeamCta 3117:12894; language 7) and the built Cases.tsx:265 / TeamCta.tsx:432 are SemiBold; a 30/36 Bold price is the H2 token | Bold (D3 / D9 binding) until ruled; if fidelity wins: `font-semibold` for card prices, KPI values and the PDP hero price, and amend D3 / D9 |
| O-16 | Landscape notch on shop / cabinet canvases (viewport-fit=cover lets the 1440 / 1710 canvas run under the sensor housing; Chromium reports env() = 0) | (b) built in F1 (A26): body `padding-inline: env(safe-area-inset-*)` from 640 on `[data-canvas=shop]`, zoom formulas minus the insets, fixed right offsets `max(<v>, env(...))`; alternative (a): no cover anywhere and no env() terms (home-indicator overlap accepted) |
| O-17 | Contrast of 14/20 #777779 meta directly on the #f5f5f5 slab (4.10:1 < 4.5:1: head subtitles, LoadMore counters, orders / assortment meta lines) | D9 colour kept; proposal: `text-neutral-600` (#616162, 5.67:1, in the palette) for 14/20 meta that sits on the slab (an amendment of D9) |

---------------------------------------------------------------------

## 10. Critique round 1 - change log (2026-11-05, editor agent)

Three critic lenses reviewed this spec and the fifteen area specs: Figma
fidelity (26 findings), phone UX + accessibility (26) and implementation
+ regression risk (17). Every blocker and major is applied unless noted;
minors were applied where cheap. Area specs got "(critique round 1)" rows
in their alignment blocks (7.3).

Applied - Figma fidelity:
- A24 / C-14: ChoiceRow `min-h-10` + 44 pseudo hit, RadioGroup `gap-10`
  (pitch 80 / 88 = Quizz Card 3111:14541); order-detail S11 restored,
  checkout 2.5 group heights recomputed.
- A5 OptionRow radio = the master radio (brand ring / brand fill + white
  check); orders-list 2.4 claim corrected.
- 3.1.4 / T4 / C-41: last field -> action 48 on pages and sheets (auth
  `max-lg:mt-6`, profile Security `max-lg:mt-6`); 24 only in modal cards.
- 3.1.4 / C-42: KPI tiles 24 apart; dashboard y map shifted.
- 3.1.1 / A27 / C-49: one uppercase size (12/20) for PDP availability /
  price captions and the B2B status, price captions and tile labels.
- 3.1.2 / A13 / C-40: one dark (#1d1d1f) and one summary anatomy
  (label stacked over the amount) for cart, checkout and order totals;
  the assortment bar adopts the fill and label type.
- A8: ProductLine padding moved to the list item (`padded`); cart stock
  rows and assortment block B fixed.
- A5 / A-7: sheet bar fixed 66, one line, `shortTitle` below 375 (D7
  restored); auth, cart stock, cancel and wizard titles mapped.
- Cart stock footer = SHEET_FOOTER with a T5a-style status and stacked
  pills (named A-6 exception); "Замінити всі" moved into the body; S16.
- C-44: PDP PhotoBackdrop dropped; flat `bg-bg-product` + contain.
- 3.1.4: in-slab section title -> panel 24 (dashboard `pb-6`).
- C-43: catalog direction banners touch with a 1-px seam.
- A11 / C-20: AppliedChips text #343435 on phones.
- A11: FilterButton badge = the header cart badge look (ring, 12 Bold);
  A-6 noted as a departure from 3117:12801.
- A7: KeyValueLine label Medium; assortment price dt Medium.
- A21: order-detail attention caption = PaymentCaptionLine `lg:hidden`.
- A7: one row chevron (`ChevronSideIcon mirrored`); dashboard payments.
- 3.1.2: desktop-identity colours whitelisted; the stock brand-soft tile
  dropped.
- Cart scroller `pt-3` (head text 24 under the bar).
- Auth: `calc()` safe-area padding; A-15 names the D8 exception.
- SignInPrompt text 16/24 #343435.
- Materials FileCard `line-clamp-3`.
- PDP gallery: static stage switched by thumbs (TR-30), no snap track.
- Auth: the 14-px resting label below 360 dropped.
- A-4 labelled an invention (24 kept).

Applied - phone UX + accessibility:
- A4 rewritten (release / isTop / rearm / unarm, onSettled, handoff,
  tagged entries, no back() on route change); T5a draft model; flows in
  6.3 item 12.
- Keyboard / short-viewport model: segment `interactiveWidget`,
  `--kb` from visualViewport, the `:has(input:focus)` hack deleted,
  height-500 rules baked into SHEET_FOOTER / PhoneMenuCtaDock /
  StickyBar, A6 `align="top"`, verify 8.
- A2 inert = the standard sibling walk (toast host exempt); live-region
  rules (A9 counter not live, catalog row B off, assortment count only).
- viewport-fit=cover: decided (A-17 + O-16 default b, real-device step).
- O-4 built (useFitZoom = 1 on coarse pointers, desktop media only).
- Cart "Очистити": inline undo in the empty state + "Повернути" for the
  last removed line (cart S21).
- A23: queue while a modal is open, `keepOnNavigate`, action toasts
  persistent with paused timers, autosave coalescing.
- C-47: catalog toolbar = search row (+ view toggle disc) + meta line;
  listing `mt-12`; first-screen acceptance (6.3 item 13).
- Focus not obscured: `scroll-padding-bottom`, scroller `scroll-pb`,
  scrollIntoView after bars / LoadMore / errors.
- Checkout stock gate: `issuesFrom: "checkout"` (cart S23).
- Menus on shop / cabinet routes use A4 (Back closes the menu).
- ListPanel without overflow-clip; row-drawn focus ring.
- `role="list"` on every phone list; catalog phone list as `ul`.
- A22 / T5h / C-45: cancel modal = radios in a phone sheet.
- A5 `closeOnDesktop`; A4 releases the entry on a 640 crossing.
- PDP bar short label "У кошик" via a container query.
- Cabinet account row `line-clamp-2`.
- A29: phone batches in `n` (catalog too).
- MENU_INERT covers the CornerFab / toast host rule.
- A-16: cabinet menu stagger `40 + k * 20` (last 300).
- Welcome scrim does not close below 640.
- One initial-focus rule (title on coarse, cross on fine); specific
  cross labels.
- Leftover `max()` safe-area formulas replaced; checkout error scroll
  honours reduced motion.

Applied - implementation + regression risk:
- A4 / T5a: never write the URL inside a back-closable overlay; draft +
  `onSettled` commit; `requestAnimationFrame` scroll after the
  swallowed popstate.
- A4 module stack: swallow token, href check, unmount handling, replace
  navigation from overlays.
- A26 / A-17: viewport only in the seven segment layouts (+ ui-gallery),
  assigned to F1.
- 3.2: landing-safe defaults (zoom, active row, "/#contacts") until O-1;
  anchor rule scoped to `[data-canvas=shop]`; 6.4 step 0 adds two menu
  guard shots.
- A6: one DOM with sticky title / actions rows (`sm:static`), exact
  strings.
- A2: only elements without a pre-existing `inert` are counted; inert
  released before the opener test.
- 6.2: import + export for QtyStepper / ChipsRow; useListbox import.
- A6 / 6.1 / 6.4: /ui-gallery (not %5F); F1 entries in /ui-gallery/f1;
  `[role=dialog]` check.
- 3.2: PhoneMenuRow `ariaLabel` / `ariaHaspopup` built in wave 2a.
- A9: `focusAfterLast`, no `moreRef`; one focus rule.
- A29: `writeListParams` (replaceState) and `n` for phones.
- 6.1: CABINET_* imported from CabinetPageHead; RadioOn/OffIcon in
  Sheet.tsx; icon files frozen in wave 3; orders/[id]/page.tsx added to
  C-order-detail.
- A6: `sm:flex-initial`; the max-height pair replaces `max-h-full`.
- A2: overlay z-index = 60 + depth.
- 6.5: React.JSX.Element, `id` not `key`, no-img-element convention,
  react-hooks rules.
- X2 wording allows the `sm:` restores, `max-[N]:` below 640 and height
  queries.
- A2 `acquireScrollLock()` shared with PhoneMenuSheet.

Rejected (with the reason):
- Dropping `peer-checked:text-brand` from ChoiceRow (UX contrast
  finding): the master selected option colours its label brand
  (3111:14541, built QuizForm.tsx:842-846); the filled marker is the
  second cue, so the state is never carried by colour alone. Kept and
  listed as an accepted exception in 3.1.2.
- Portaling the restyled in-place sheets to body (UX inert finding): not
  needed - the A2 sibling walk inerts the rest of `main` for in-place
  dialogs, and a portal would move desktop DOM that the pixel guard
  protects.
- `text-white/70` labels on dark bars (UX contrast finding): superseded
  by C-40 - the bars move to #1d1d1f, where the #8e8e8f label measures
  5.2:1.
- `aria-pressed` on the single catalog view toggle: a toggle whose label
  changes must not also expose a pressed state; the button names the
  action ("Вид списком" / "Вид картками") instead.

Open (orchestrator):
- O-15 Stat 30 weight (D3 / D9 Bold vs master SemiBold).
- O-16 landscape notch: default (b) built, confirm or choose (a).
- O-17 slab meta contrast (D9 #777779 vs #616162).
- O-11 add-to-cart toast for list adds (critique recommendation).
- O-1 landing menu adoption (default now landing-safe).
- O-12 new copy added by this round (native check).
