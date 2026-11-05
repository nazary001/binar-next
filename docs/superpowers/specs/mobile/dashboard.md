# /dashboard - phone spec (< 640 px)

Area: dashboard (B2B cabinet overview). Spec agent, 2026-11-05. Specification
only: nothing under src/ was edited.

Inputs read: audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md (D1-D13,
binding), audit/mobile/lang/figma-mobile-language.md (TR-01..TR-32),
audit/mobile/lang/code-mobile-recipes.md, audit/mobile/dashboard/
visual-report.md (findings D1-D20) and functional-report.md (F1-F19),
audit/mobile/shell-cabinet/visual-report.md (#1-#19, shell items), the
shots under audit/mobile/dashboard/shots/ (viewed: visual-demo-390-01/02,
visual-demo-320-orders, visual-demo-320-payments, visual-fresh-390-01,
visual-select-open-320-viewport), and the sources:
src/components/platform/dashboard/{DashboardView.tsx,data.ts,icons.tsx},
src/components/platform/ui/{CabinetPageHead.tsx,CabinetPage.tsx,Select.tsx,
PaymentBadge.tsx,StatusPill.tsx,OrderStatusBadge.tsx,TableEmptyRow.tsx,
SignInPrompt.tsx}, src/components/platform/PlatformFooter.tsx,
src/components/ui/Button.tsx, src/components/platform/orders/data.ts,
src/components/cart/useModalBehavior.ts, src/app/dashboard/*.
The shell specs (shell-public.md, shell-cabinet.md) did not exist yet when
this was written; section 4 states what this page needs from them.

Precedence used below: DECISIONS (D-x) > TR rules > audit proposals.
Money in prose is written "UAH"; the site prints the hryvnia sign.
Line numbers are as of 2026-11-05.

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
| S1 | 2.6 order row line 1 = id + date + chevron on one line | A7 RecordRow: id over date in the left column, 24 chevron right, no action disc (C-09); note added |
| S2 | SN-01 / SN-02 | Shell-cabinet 3.3 / A20 (head pb 48, first block pt 0) |
| S3 | SN-03 Select | A22, built by F2 |
| S4 | SN-04 FitText | A25 (ui/FitText.tsx, F2) |
| S5 | SN-05 PanelEmptyState | A14 `surface="panel"` (or inside the panel) |
| S6 | SN-06 LoadMore + `onLess` | A9 (`onLess` allowed here only) |
| S7 | SN-07 ListPanel + RecordRow | A7 |
| S8 | SN-08 PaymentCaptionLine | A28 |
| S9 | SN-09 | A2 |
| S10 | SN-10 NBSP grouping | Built by C-orders-list behind the pixel guard |
| S11 | SN-13 section title constant | `CABINET_SECTION_TITLE` (A20) |
| S12 | 7.1 / 7.3 rhythm, 7.2 weight | Confirmed (A-3, C-25) |
| S13 | 7.6 "Приховати" | Accepted for the payments list only (A9) |
| S14 | 7.7 empty CTA | A14 action rule |
| S15 | 7.11 mock quotes | Deferred (O-8) |
| S16 | Build | C-dashboard (wave 3) |
| S17 (critique round 1) | 2.1 / 2.4 KPI stack `gap-4` (16, TR-20) | `flex flex-col gap-6 lg:flex-row lg:gap-[26px]` (D10 related cards 24; C-42); y map and 2.4 edited in place |
| S18 (critique round 1) | 2.6 / 2.7 / 2.8 title rows `pb-4` (16 to the panel) | `pb-6 lg:py-4` (24: system 3.1.4 cabinet title -> panel, master 3176:6132 / TR-06); y map shifted (+8 per section); edited in place |
| S19 (critique round 1) | 2.7 `PaymentChevronIcon` (12-tall stroked chevron) | `ChevronSideIcon mirrored className="mt-0.5 size-6 shrink-0 text-neutral-900"` - one row chevron with the orders panel (A7); edited in place |
| S20 (critique round 1) | 2.4 value "Stat 30/36 Bold" citing TeamCta 3117:12894 / Cases 3094:5169 | Bold per D9 until O-15; the cited master nodes are SemiBold - verify agents do not compare the weight against them |
| S21 (critique round 1) | 2.7 load-more counter `role=status`; first-revealed-row focus effect | A9 revised: the counter is not a live region; focus stays on "Показати більше" (re-focused), `focusAfterLast` returns the first new phone row link when the button turns into "Приховати" or unmounts; no `moreRef` (SN-06) |
| S22 (critique round 1) | 2.5 track rgba(241,241,242,.63), 2.7 #ffbfba overdue chip | Allowed desktop-identity colours (system 3.1.2 list) |
| S23 (critique round 1) | 2.6 / 2.7 phone `ul` panels | ListPanel (A7): `role="list"`, no `overflow-clip`, rows carry the r32 corners and the focus ring |
| S24 (critique round 1) | 2.4 / 2.5 tile fill #1d1d1f | Confirmed as the one shop / cabinet dark (C-40) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Route and code

| Item | Value |
|---|---|
| Route | `/dashboard` - `src/app/dashboard/page.tsx` renders `DashboardView`; `src/app/dashboard/layout.tsx` wraps it in `data-canvas="shop"` (desktop zoom only; phones zoom 1) |
| Shell | PlatformChrome (signed-in partner): PlatformHeader + SideMenu + main + PlatformFooter. Visitors / B2C get the public chrome + `SignInPrompt` |
| Area files | `src/components/platform/dashboard/DashboardView.tsx` (604 lines), `data.ts` (224), `icons.tsx` (59) |
| Phone breakpoint | below 640 = unprefixed / `max-lg:`; desktop = `lg:` (BRIEF "Breakpoint architecture") |

### 1.2 Seeds

| Id | Seed | Notes |
|---|---|---|
| S1 | `audit/kit/seed-b2b.json` | "Демо Партнер", account id `demo-b2b` (isDemoAccount -> the demo ledger) |
| S2 | S1 with `accounts[0].id = sessionId = "acc-fresh"` | fresh partner: NO_KPIS, no orders, no payments, no counterparties (`audit/mobile/dashboard/functional.mjs:22-24`) |
| S3 | S2 + `"binar.profile.v1": {"acc-fresh": {counterparties: [cp-1 'ТОВ "Мережа готелів та ресторанів «Карпатська перлина»"', cp-2 "ФОП Петренко"], employees: [], inviteToken: "a8f3k2"}}` | fresh partner with 2 counterparties, one 55-char name (`functional.mjs:25-37`) |
| S4 | S3 with only cp-2 | fresh partner with ONE counterparty (new state for the select-hide rule) |
| S5 | S1 with `company.name = "Товариство з обмеженою відповідальністю Готельний комплекс Прем'єр Палац"` | long legal name (visual.mjs "longname") |
| S6 | S1 with `company.name = ""` | "Вітаю!" fallback (visual.mjs "noname") |
| S7 | none | visitor |
| S8 | `audit/mobile/kit/seed-b2c.json` | signed-in B2C |
| S9 | S1, then cancel order 48291064 on `/orders/48291064` (cancel modal) | stored in `binar.orders.v1:demo-b2b`; the recent list then holds a cancelled order (bare payment chip, no caption) |

### 1.3 States

| # | State | How to reach | Audited |
|---|---|---|---|
| ST1 | Demo ledger, "Усі контрагенти" | S1 | yes (both lenses) |
| ST2 | One counterparty selected (4 options: 'ТОВ "Мережа готелів "Зоряний шлях"', "Mirotel LTD", "Готель «Дністер»", "Rixos Prykarpattya") | S1 + select | yes |
| ST3 | Payments revealed 3 -> 8 -> 13 -> 15, then collapsed (new "Приховати") | S1 + "Показати більше" | yes (to 15); collapse is new |
| ST4 | Counterparty menu open (844 and 568 tall; 320 and 390 wide) | tap the combobox | yes |
| ST5 | Fresh partner, empty ledger | S2 | yes |
| ST6 | Fresh partner with 2 counterparties (long name) | S3 | yes |
| ST7 | Fresh partner with 1 counterparty | S4 | no (new rule) |
| ST8 | Filtered to a counterparty with 0 orders / 0 payments | S3 + pick "ФОП Петренко" | yes (implicitly) |
| ST9 | Long company name | S5 | yes |
| ST10 | Empty company name | S6 | yes |
| ST11 | Cancelled order among the recent 3 | S9 | no (new; verify) |
| ST12 | Visitor / B2C -> SignInPrompt "Дашборд" | S7 / S8 | yes |
| ST13 | Pre-hydration gate (blank until the session is known) | S1, 6x CPU | yes |
| ST14 | Back from an order / payment / "Усі замовлення" with a filter set | S1 + flow | yes (bug F8) |
| ST15 | Overlays opened from this page: cart sheet, account sheet, cabinet menu sheet (D1) | header | yes (owned by shell / cart / auth) |

Unreachable / not applicable, with the reason:
- Loading: none. There is no fetch; the ledger is the localStorage orders
  mock read synchronously after hydration. The only wait is ST13 (owned by
  PlatformChrome / `DashboardView.tsx:497` returns `<div className="flex-1" />`).
- Error: none. No network and no failure path exists in DashboardView;
  nothing to design.
- Desktop table `RecentOrdersTable` (`DashboardView.tsx:193-270`): display
  none below a 1012-px column (`@min-[1012px]:block`), never on phones.
- 7/8-digit KPI values, 6-digit payment sums, 6-digit overdue remainders:
  not in the mock; only by DOM injection (`audit/mobile/dashboard/
  visual-probe.mjs`). The layout below must survive them (FitText).
- Non-demo partner with a non-zero credit limit: impossible today (every
  non-demo partner gets NO_KPIS, `data.ts:87`, `DashboardView.tsx:516`).
- "Оплачено вчасно" / "Оплачено із простроченням" captions in the recent 3:
  only if a counterparty filter surfaces a paid order among its 3 newest;
  otherwise DOM stress only.

---------------------------------------------------------------------

## 2. Phone layout

### 2.0 Shell context (owned by shell-cabinet, D1)

The numbers below assume the D1 cabinet shell: PlatformHeader 66 sticky
(logo + cart disc + burger, no company chip), NO SideMenu strip, the
#f5f5f5 slab (`bg-bg-cabinet`) starting at y 66 with top corners r32, the
legal bar footer (#1d1d1f, px 24 py 24 gap 24, Onest 14/30, wrapping). If
the shell lands differently only the absolute y values shift; the
in-page distances stay.

Page skeleton (phone): gutters 24 (`px-6`, content 342 at 390, 272 at 320,
552 at 600, D10), single column at every phone width, white r32 panels
without strokes on the slab (D1, D5), dark KPI tiles r32 (D5), titled
sections 48 apart, last block -> legal bar 48 (D10).

### 2.1 Vertical map (390 x 844, ST1, after the change)

| y (390) | Block | Spacing rule | Source |
|---|---|---|---|
| 0-66 | header bar | 66 | D1, 3082:3661 |
| 66 | slab top, r32 | | D1, grey slab 3094:4837 |
| 114-186 | H1 "Вітаю," / "Демо Партнер" (2 lines x 36) | pt 48 | D10, TR-03 (article crumb 3176:6558 = header + 48) |
| 202-222 | subtitle (1 line; 2 at 320/360) | 16 | TR-03, hero H1 -> body 16 (3082:3248) |
| 254-346 | actions: 342 x 42 outlined, 8, 342 x 42 solid | 32 | TR-04, D8, hero body -> CTA 32 (3082:3250), menu Button 3117:14325 |
| 394-440 | counterparty select 342 x 46 (white) | 48 | TR-03 head -> first block 48, D10 |
| 456-568 | KPI "Поточний баланс" 342 x 112 | 16 | TR-20 |
| 592-704 | KPI "Прострочена ДЗ" 342 x 112 | 24 | D10 related cards 24 (SYSTEM critique round 1, C-42) |
| 728-902 | KPI "Кредитний ліміт" 342 x 174 (bar + caption) | 24 | D10 (C-42) |
| 950-978 | "Останні замовлення" Title Large | 48 | D10 big blocks 48 |
| 1002-1648 | orders panel, 3 rows (184 / 230 / 230 incl. wrapped badges) | 24 | title -> panel 24 (SYSTEM critique round 1; master 3176:6132, TR-06) |
| 1672-1714 | "Усі замовлення" (right-aligned, 216 wide incl. disc) | 24 | TR-06, WhyUs CTA 3176:5435 |
| 1762-1790 | "Найближчі платежі" | 48 | D10 |
| 1814-2222 | payments panel, 3 overdue rows x 130 + 2 lines + py 8 | 24 | title -> panel 24; TR-07 / TR-25 |
| 2270-2290 | "Показано 3 із 15" | 48 | D4, TR-12, blog more 3176:5601 |
| 2306-2348 | "Показати більше" + plus disc, centred | 16 | D4 |
| 2396-2424 | "Ваш менеджер" | 48 | D10 |
| 2448-2729 | manager card 342 x 281 | 24 | title -> card 24; TR-25 / TR-27 |
| 2777- | legal bar | 48 | D10 |

Document ~2970 tall (SYSTEM critique round 1: +40) (today 2764 incl. the 82-px strip that D1 removes).
First screen at 390 x 844: head + select + 2.5 KPI tiles. At 320 x 568: head
(title 2 lines, subtitle 2 lines) + select; the first tile starts at ~476.

### 2.2 B1 - Greeting head (CabinetPageHead + DashboardView title node)

What: page title (Light "Вітаю," + Bold company), subtitle, two actions.
Code: `DashboardView.tsx:530-551`, `CabinetPageHead.tsx:60-78` (shared).

Geometry at 390: pt 48 under the slab top; H1 x 24 w 342; line 1 "Вітаю,"
(Light 300), line 2 company (Bold 700), each 36 tall; 16; subtitle Body
Small 14/20 #777779 (1 line at 390-639, 2 lines at 320/360); 32; two
full-width pills 342 x 42, 8 apart: "Замовити акт звірки" outlinedDark
first, "Зробити замовлення" solid last (TR-04 / D8 order: secondary first,
primary last); 48 to the select. 320: content 272, same stack. 600: pills
552 wide (stretch like every full-width element on the page).

Title rules (TR-03, D9): H2 token 30/36 Bold -0.6 with the Light run where
the desktop has it; "Вітаю," always on its own line on phones (forced
break, master H2 "Основні рішення" / "для готелів" 3117:14558); company
clamped to 2 lines with an ellipsis (names in lists clamp to 2 lines,
language section 7). Long name ST9 -> max title height 108 (36 + 72).
Empty name ST10 -> the existing "Вітаю!" Light, one line.

Recipe:
- Title node (area, DashboardView.tsx:532-538):
  `<><TitleLight>Вітаю,</TitleLight> <span className="max-lg:line-clamp-2">{company}</span></>`.
  `max-lg:line-clamp-2` makes the span `display:-webkit-box` (block-level)
  on phones only, which forces the break after "Вітаю," and clamps; on
  desktop the span is a plain inline span = identical pixels. The screen
  reader still reads the full name (clamp is visual).
- H1 / subtitle / action-row classes come from the shared CabinetPageHead
  phone variant (section 4, SN-02): H1 `text-h2 text-neutral-900` (phone
  30/36 -0.6 via the unlayered token, desktop 44/48 -0.88 700 = today's
  literal), subtitle `text-[14px] leading-5 text-neutral-500 lg:leading-6`,
  section `gap-8 pt-12 pb-12 lg:gap-[26px] lg:py-8 ...`, title block
  `gap-4 lg:gap-2`, actions `flex flex-wrap items-center gap-2 lg:shrink-0
  lg:justify-end lg:gap-4`.
- Buttons (area, DashboardView.tsx:543-548): keep `size="responsive"`
  (42 on phones, 52 from 640) and add
  `className="max-lg:w-full max-lg:[&>span]:flex-1"` to both (phone-only
  version of the landing menu CTA recipe `w-full [&>span]:flex-1`,
  Header.tsx:634). Order unchanged (outlinedDark, then solid).
- Fallback if SN-02 lands with a different actions gap: wrap the two
  buttons in `<div className="flex w-full flex-col gap-2 lg:contents">`
  inside DashboardView (`lg:contents` dissolves the wrapper on desktop).

Interactions: "Замовити акт звірки" = mailto (subject/body with company +
ЄДРПОУ, unchanged, no navigation); "Зробити замовлення" -> /catalog.

### 2.3 B2 - Counterparty select

What: `<Select label="Контрагент">` scoping KPIs, orders and payments.
Code: `DashboardView.tsx:556-564`, `platform/ui/Select.tsx` (shared).

Geometry: full width 342 x 46 (272 at 320), r24 (field radius, D6 / TR-21
keep <= 32), 1-px #d2d2d2 ring, value 16/24 Medium (iOS-safe), WHITE fill
on phones (cabinet language = white controls on the slab, same as the
orders filter selects `bg="white"`; fixes D20 1.2:1 boundary), 16 to the
first KPI tile (unchanged `pb-4`).

Visibility: shown on phones only when there is something to choose, i.e.
`names.length >= 2` (`DashboardView.tsx:509-512`). ST5 (0 counterparties)
and ST7 (1) hide it on phones; the desktop keeps today's behaviour.

Recipe (area):
- wrapper `DashboardView.tsx:556`: `className={`${names.length < 2 ? "max-lg:hidden " : ""}pb-4`}`
- Select `className="w-full lg:w-[234px] max-lg:[&>button]:bg-white"`
  (`[&>button]` = specificity 0,1,1 beats the button's `bg-transparent`;
  phone only).

Menu (TR-11 anchored panel, shared fix SN-03): exactly the field width
(342 / 272), white r24, shadow 0 2 6 rgba(29,29,31,.1), options 16/24
Medium px 16 py 10 (44 tall), wrap onto 2 lines instead of `min-w-max`
nowrap, 1-px #d2d2d2 lines, chosen option brand; opens upward (or scrolls
itself into view) when fewer than menu-height + 8 px remain below the
field (568-tall phones); closes on a tap outside (document pointerdown),
on Escape, on pick; picking works on `click` (mousedown only prevents the
blur). Not a sheet: one short single-choice list next to its field (TR-11;
TR-10's filter sheet is for list pages with several filters).

After a pick: KPIs, orders and payments update; Payments remounts per
filter (`key={filter}`, `DashboardView.tsx:598`) so the payments reveal
collapses back to 3. The filter persists across Back (B10, DB-18).

### 2.4 B3 - KPI tiles "Поточний баланс", "Прострочена ДЗ"

What: two dark stat tiles. Code: `KpiTile`, `DashboardView.tsx:85-117`,
stack at 565-571 (`flex flex-col gap-6 lg:flex-row lg:gap-[26px]`,
SYSTEM critique round 1: 24 apart - D10 related cards 24 beats TR-20's
16, C-42; desktop unchanged).

Geometry at 390: 342 x 112, #1d1d1f (desktop identity kept, D5), r32
(D5), p 24; 52 icon tile #343435 r12 (unchanged) + 16 + text column 218
(156 at 320, 258 at 430, 428 at 600): label Body Small Medium 14/20
#8e8e8f (TR-20, footer label on dark 3111:14920; 5.1:1 vs 3.77 today),
8, value Stat 30/36 Bold -0.6 white (D9 "stats 30/36 Bold"; TR-20 Stat 30
TeamCta 3117:12894). Same sizes at every phone width (the
`@max-[250px]` shrink is desktop-only after the change). Overflow guard:
value is one line; if it does not fit (8-digit sums at 320) it shrinks
via FitText (SN-04) to >= 24 px, line box stays 36 so the tile never
changes height. Tile height 24 + max(52, 20 + 8 + 36) + 24 = 112.

Recipe (area, one component, phone first + lg restores):
- tile `@container flex min-w-0 flex-1 overflow-clip rounded-[32px] bg-neutral-900 p-6 lg:rounded-3xl`
- row `flex min-w-0 flex-1 items-start gap-4 lg:gap-6 lg:@max-[250px]:gap-4`
- column `flex min-w-0 flex-1 flex-col gap-6 lg:gap-8`
- label/value wrapper `flex flex-col items-start gap-2 whitespace-nowrap text-white lg:gap-3`
- label `text-[14px] font-medium leading-5 tracking-normal text-neutral-400 lg:text-[18px] lg:leading-6 lg:tracking-[-0.36px] lg:text-white`
- value: `<FitText as="p" min={24} className="text-[30px] font-bold leading-9 tracking-[-0.6px] max-lg:self-stretch lg:text-[32px] lg:leading-7 lg:tracking-[-0.64px] lg:@max-[250px]:text-[28px]">`
  (FitText active only below 640; `max-lg:self-stretch` gives it the
  column width to measure against; desktop leading re-declared, gotcha 2).
- Verify the stacked `lg:@max-[250px]:` variants still win over
  `lg:text-[32px]` on narrow desktop canvases (section 6, G3).

### 2.5 B4 - KPI tile "Кредитний ліміт" with usage

Code: `CreditUsage`, `DashboardView.tsx:119-139`.

Geometry at 390: same tile; 24 under the value: the 6-px bar spans the
whole tile content (x 48..342, 294 wide; 224 at 320) instead of the text
column (D7), 12, caption "Доступно: 420 881 UAH" 14/20 Medium #8e8e8f
(nowrap, 135 wide, fits 224). Tile 112 + 24 + 6 + 12 + 20 = 174. Bar look
unchanged (TR-20 "progress bars keep the desktop look": rgba(241,241,242,
.63) track, brand fill, r8).

Limit 0 (ST5..ST8, fresh partner): phones hide the empty bar and print
one caption "Ліміт не встановлено" (14/20 #8e8e8f) instead of "Доступно:
0 UAH" (F13: the empty bar reads like a blocked account). Tile 112 + 24 +
20 = 156. Desktop unchanged.

Recipe (area):
- root `flex flex-col items-start gap-3 max-lg:-ml-[68px]` (-68 = icon 52
  + gap 16: in the stretch column the block then spans the tile content;
  phone only).
- progressbar: unchanged classes; when `limit === 0` add `max-lg:hidden`.
- caption `whitespace-nowrap text-[14px] font-medium capitalize leading-5 text-neutral-400 lg:leading-6 lg:text-neutral-500`;
  when `limit === 0`: existing caption gets `max-lg:hidden`, plus
  `<p className="text-[14px] font-medium leading-5 text-neutral-400 lg:hidden">Ліміт не встановлено</p>`.

### 2.6 B5 - "Останні замовлення" (head, panel, link)

Code: section `DashboardView.tsx:574-593`, `RecentOrdersList` 276-303
(shown below a 1012-px column, i.e. ALSO on narrow desktop canvases 640..
1196 - so it must stay as is there).

Composition (TR-06, D11, visual D1 / functional F5):
- Section title alone on its row: Title Large 22/28 SemiBold -0.44 (D9),
  24 to the panel (SYSTEM critique round 1: master "Поділитись" 3176:6132
  -> socials = 24, TR-06). The desktop "Усі замовлення" head button is hidden on
  phones; a phone link sits UNDER the panel, right-aligned, 24 below
  (WhyUs 3176:5435): Button/Small outlinedDark + arrow disc, 166 + 8 + 42
  = 216 wide (fits 272).
- One white r32 panel (D1, D5, TR-07), px 24, rows py 24 separated by
  1-px #d2d2d2 lines (D10, no 0.5-px), the whole row is the link.
- Row anatomy (TR-07, D9), lines 12 apart:
  1. "№48291064" Title Small 16/22 Bold (flex-1, nowrap) + date 14/20
     #777779 (nowrap) + 24 chevron, gap 8. At 320: 92 + 76 + 24 + 16 = 208
     <= 224.
  2. amount Title Large 22/28 SemiBold, nowrap.
  3. badges, wrap, gap 8: OrderStatusBadge + PaymentBadge (chip only, no
     caption) - status colours kept (TR-14).
  4. payment caption (when any), 8 under the badges, full row width:
     12/16 Medium; tone attention = 16 attention glyph + 4 + #f26164,
     subtle = #777779 (colours kept, TR-14 / D13); wraps if needed (needs
     NBSP digit grouping, SN-10).
  Row 184 tall when the badges fit one line (390: "Нове" 73 + 8 + 175 =
  256 <= 294), 230 when they wrap ("Відвантажено" / "Заблоковано" + chip at
  390; every row at 320). Cancelled order (ST11): line 4 absent.
- Empty (ST5, ST8): TR-24 block inside the panel (B8); the phone link is
  hidden when there are no orders.

Recipe (area):
- title row `DashboardView.tsx:575`: `flex items-center justify-between gap-4 pb-6 lg:py-4` (SYSTEM critique round 1: 24)
- H2 constant `DashboardView.tsx:69` (used by all three section titles):
  `text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 lg:font-bold`
  (phone = Title Large weight; desktop Bold unchanged; see 7.2).
- desktop head button: `<Button href="/orders" size="small" variant="outlinedDark" className="max-lg:hidden">`
- existing `RecentOrdersList` ul: add `max-lg:hidden` (narrow desktop
  canvases keep today's list byte-identical).
- NEW `RecentOrdersPhoneList` (phoneParts.tsx), rendered after it:
  - ul `flex flex-col rounded-[32px] bg-white px-6 lg:hidden`
  - li `[&+&]:border-t [&+&]:border-stroke-subtle`
  - Link `flex flex-col gap-3 py-6 outline-none transition-opacity active:opacity-70 motion-reduce:transition-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-brand`
  - (SYSTEM A7 supersedes this line: RecordRow line 1 = id over date, 24
    chevron right, no action disc.) line 1 `flex items-center gap-2`: id `min-w-0 flex-1 truncate whitespace-nowrap text-title-sm text-neutral-900` "№{number}", date `shrink-0 whitespace-nowrap text-[14px] leading-5 text-neutral-500`, `<ChevronRightIcon className="size-6 shrink-0 text-neutral-900" />`
  - line 2 `whitespace-nowrap text-title-lg text-neutral-900` (phone token 22/28 600 -0.44; element is phone-only)
  - line 3+4 group `flex flex-col items-start gap-2`: badges `flex flex-wrap gap-2` (`<OrderStatusBadge/>` + `<PaymentBadge kind=... />` without caption), caption = SN-08 `PaymentCaptionLine` (or the local twin, see 4).
  - Prefer the shared `ListPanel` + `RecordRow` (SN-07) once it exists;
    the classes above ARE that recipe.
- phone link after the lists: `<div className="mt-6 flex justify-end lg:hidden"><Button href="/orders" size="small" variant="outlinedDark" arrow>Усі замовлення</Button></div>` (render only when `orders.length > 0`).

### 2.7 B6 - "Найближчі платежі"

Code: `PaymentRow` `DashboardView.tsx:311-366`, `Payments` 368-425.

Composition (visual D3/D4, functional F7/F16; TR-07 panel + TR-25 tile row
rhythm; D4 load-more):
- Title Large title row (`pb-6 lg:py-4`, `DashboardView.tsx:386`), 24 (SYSTEM critique round 1).
- ONE white r32 panel px 24 py 8; rows py 16 between 1-px #d2d2d2 lines
  (first row top and last row bottom land 24 inside the panel = TR-07
  inset; 16 + line + 16 between rows = TR-25 file-row rhythm, hero trust
  row 3085:3718 tile + 16 + label). No nested cards, no pink row fill on
  phones: overdue is carried by the red date tile and the
  "Протерміновано" chip (both kept, TR-14).
- Row (link to /orders/<orderId>): date tile FIXED 64 wide (D17) x 82,
  r12, #343435 (default, "до" brand) or #d92d20 (overdue, "до" white),
  day 24/28 SemiBold white, month 14 uppercase white/70 (tile internals =
  desktop identity) + 16 + column:
  1. amount 22/28 SemiBold -0.44 (D9 amounts), nowrap, flex-1, FitText
     min 16 (fits "11 378,70 UAH" at 320 without touching the chevron) +
     8 + 24 chevron top-right (TR-07: chevron in the row's top-right, not
     a 56-wide column).
  2. 4 below: "Рахунок №" #777779 + number Medium #1d1d1f, 14/20, ONE
     nowrap unit ("Рахунок № 7891053" = 125 px, fits the 144 column at 320).
  3. overdue only: chip "Протерміновано" (desktop chip classes, 38 tall,
     #ffbfba / #d92d20) 8 below, left-aligned in the column.
  Row 114 (default) / 130 (overdue) tall; column at 320 = 224 - 64 - 16 =
  144 (amount line 112), at 390 = 214 (amount line 182).
- Load-more (D4 / TR-12, blog more 3176:5601): 48 below the panel, centred
  counter "Показано 3 із 15" 14/20 #777779 (role=status, polite), 16,
  Button/Small solid with the plus disc "Показати більше" (227 wide).
  Each press reveals PAYMENTS_STEP = 5 (data.ts:168). When everything is
  shown the button turns into "Приховати" with the minus disc (the landing
  FAQ toggle, home/Faq.tsx:296-320) and collapses back to
  PAYMENTS_VISIBLE = 3. Hidden when payments.length <= 3.
- Empty (ST5, ST8): TR-24 block (B8).

Recipe (area):
- existing desktop panel `DashboardView.tsx:391`: add `max-lg:hidden` (the
  desktop "Показати ще N" outlinedDark button lives inside it and stays).
- NEW `PaymentsPhonePanel` / `PaymentPhoneRow` (phoneParts.tsx), rendered
  in `Payments` after the desktop panel, sharing its `count` state:
  - ul `flex flex-col rounded-[32px] bg-white px-6 py-2 lg:hidden`
  - li `[&+&]:border-t [&+&]:border-stroke-subtle`
  - Link `flex items-start gap-4 py-4 outline-none transition-opacity active:opacity-70 motion-reduce:transition-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-brand`
  - tile `flex w-16 shrink-0 flex-col items-center gap-1 overflow-clip rounded-xl py-2 text-center ${overdue ? "bg-negative" : "bg-neutral-800"}` + the desktop "до" / day / month spans verbatim (`DashboardView.tsx:333-343`)
  - column `flex min-w-0 flex-1 flex-col items-start`
  - line 1 `flex w-full items-start gap-2`: `<FitText as="span" min={16} className="min-w-0 flex-1 whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900">` + `<ChevronSideIcon mirrored className="mt-0.5 size-6 shrink-0 text-neutral-900" />` (SYSTEM critique round 1: the one row chevron of A7; PaymentChevronIcon stays desktop-only)
  - line 2 `mt-1 whitespace-nowrap text-[14px] leading-5`: `<span className="text-neutral-500">Рахунок №</span> <span className="font-medium text-neutral-900">{invoice}</span>`
  - chip `mt-2 inline-flex h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-[40px] bg-[#ffbfba] px-3 py-1 text-[14px] font-medium leading-[22px] text-negative`
  - load-more: `<LoadMore className="mt-12 lg:hidden" shown={shown.length} total={payments.length} onMore=... onLess=... />` (SN-06; local fallback = the same markup with `Button size="small" plus|minus`).
- Focus: keep the "first revealed row takes focus" behaviour
  (`DashboardView.tsx:371-381`) with a second ref array for the phone rows;
  the effect focuses `phoneLinks[i]` when
  `matchMedia("(max-width: 639px)").matches`, else `links[i]`. "Приховати"
  keeps focus on the button (it stays mounted, label flips) and calls
  `button.scrollIntoView({ block: "nearest" })` after the collapse.

### 2.8 B7 - "Ваш менеджер"

Code: `ManagerCard`, `DashboardView.tsx:429-477`.

Composition (visual D13 / functional F10; hero trust row 3085:3718 tile +
16 + label; footer contact rows with lines 3111:14916 adapted to light =
TR-27; D8 pills 42):
- Title Large title row (`pb-6 lg:py-4`, line 432), 24 (SYSTEM critique round 1).
- White r32 card p 24 (294 inner):
  - row: 52 icon tile #1d1d1f r12 with the person glyph 36 + 16 + column:
    name Title Small 16/22 Bold "Олена Коваль", role Body Small 14/20
    #777779 in sentence case "Менеджер B2B клієнтів" (CSS
    `first-letter:uppercase`; the desktop Title Case `capitalize` is not
    Ukrainian; the data string stays "менеджер B2B клієнтів").
  - 24, then two contact rows between 1-px #d2d2d2 lines (top, middle,
    bottom): each a full-width link >= 44 tall: 20 glyph + 12 + 16/24
    #1d1d1f ("+380 67 123 4567" -> tel:, "sales@binar2000.com" -> mailto:).
  - 24, full-width Button/Small 42 solid "Написати менеджеру" (294; D8 - no
    38-px xsmall pill on phones).
  Card height 24 + 52 + 24 + 1 + 44 + 1 + 44 + 1 + 24 + 42 + 24 = 281.

Recipe (area):
- existing card div `DashboardView.tsx:437`: add `max-lg:hidden` (desktop
  card with the 0.5-px hairlines and the xsmall pill unchanged).
- NEW `ManagerCardPhone` (phoneParts.tsx) after it:
  - card `flex flex-col rounded-[32px] bg-white p-6 lg:hidden`
  - row `flex items-center gap-4`; tile `flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white` + `<PersonFilledIcon className="size-9" />`; column `flex min-w-0 flex-1 flex-col gap-0.5`; name `text-title-sm text-neutral-900`; role `text-[14px] leading-5 text-neutral-500 first-letter:uppercase`
  - contacts `ul mt-6 flex flex-col border-y border-stroke-subtle`, li `[&+&]:border-t [&+&]:border-stroke-subtle`, link `flex min-h-11 items-center gap-3 py-2.5 text-[16px] leading-6 text-neutral-900 transition-colors active:text-brand motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-brand` + `<PhoneIcon className="size-5 shrink-0" />` / `<MailIcon className="size-5 shrink-0" />`
  - `<Button href={`mailto:${MANAGER.email}`} size="small" fullWidth className="mt-6">Написати менеджеру</Button>`

### 2.9 B8 - Empty and filtered variants

| State | Phone rendering | Source |
|---|---|---|
| ST5 fresh, no counterparties | select hidden; KPI tiles show "0 UAH" (factual zeros kept); credit tile "0 UAH" + "Ліміт не встановлено", no bar; orders panel = TR-24 block A; no "Усі замовлення" link; payments panel = TR-24 block B; no load-more; manager card as usual | TR-24, F13, visual D12 |
| ST6 fresh + 2 counterparties | select shown (3 options); otherwise as ST5 | |
| ST7 fresh + 1 counterparty | select hidden (choosing the only one equals "Усі"); as ST5 | new rule |
| ST8 filtered, no orders | orders panel = TR-24 block C; payments = block B | |
| ST1 filtered with < 4 payments | no load-more | D4 |

TR-24 blocks (inside the white r32 panel, centred, py 48 px 24 - shared
atom SN-05 `PanelEmptyState`, no icon tile):
- A (`orders.length === 0 && filter === ALL`): title "Замовлень ще немає"
  Title Large 22/28 #1d1d1f, 16, text "Оформіть перше замовлення, щоб воно
  з’явилося у цьому списку." Body Small 14/20 #777779 (max 294; copy
  verbatim from the orders empty row, `OrdersView.tsx:206-207`), 32, hug
  Button/Small solid "Зробити замовлення" -> /catalog.
- B (`payments.length === 0`): title "Найближчих платежів немає" only.
- C (`orders.length === 0 && filter !== ALL`): title "Замовлень цього
  контрагента ще немає" only.
Copies drop the trailing period of today's `<p>` strings (titles, not
sentences). The desktop `<p>` blocks (`DashboardView.tsx:584-586, 393`)
get `max-lg:hidden`; the phone blocks are `lg:hidden` (orders) or live in
the phone panel (payments: the phone ul is replaced by the block inside a
`rounded-[32px] bg-white lg:hidden` div).

### 2.10 B9 - Long content and stress variants

| Case | Expected phone behaviour |
|---|---|
| ST9 long company name | H1 = "Вітаю," + 2 clamped lines with ellipsis (108 tall max at every width); no overflow; first KPI tile at 320 still within ~2 screens |
| ST10 empty name | "Вітаю!" Light, 1 line |
| Long counterparty in the menu (S3 cp-1, demo 'ТОВ "Мережа готелів "Зоряний шлях"') | option wraps to 2 lines inside the field-wide menu; field value ellipsised (one line) |
| 8-digit KPI ("12 500 000 UAH") at 320 | FitText shrinks to ~25 px, tile height unchanged |
| 6/7-digit payment ("125 806,10 UAH", "1 125 806,10 UAH") at 320 | FitText shrinks to >= 16, never under the chevron |
| 6-digit overdue remainder caption at 320 | caption wraps between words, never inside a number (NBSP grouping SN-10) |
| Wrapped badges | line 3 wraps (gap 8 both axes); caption stays full-width under them |

### 2.11 B10 - Interactions and behaviour

- Navigation: header burger -> cabinet menu sheet; header cart -> cart
  sheet (shell / cart areas, D1 / D7). This page owns no sheet, no modal,
  no sticky bar (TR-18 not needed: no primary action ever goes off-screen;
  the head actions are top-of-page).
- Select: anchored menu (2.3); Escape and outside tap close; arrows /
  Home / End / Enter / Space keyboard model unchanged.
- Rows: whole-row links (orders -> /orders/<id>, payments ->
  /orders/<orderId>); press feedback `active:opacity-70` (menu row
  recipe Header.tsx:543-551); no hover-only affordances (TR-32).
- Load-more / collapse: 2.7.
- Filter persistence (F8): the chosen counterparty is kept in
  sessionStorage key `binar.dashboard.counterparty.v1` (read in the
  `useState` initializer behind `typeof window` + try/catch - safe because
  nothing renders before `hydrated`, `DashboardView.tsx:497`; written in the
  Select `onChange`). The existing validation (`DashboardView.tsx:514`)
  falls back to "Усі" for an unknown name, so another account in the same
  tab can never get a foreign filter. Back then restores both the scroll
  offset (Next) and the content it belongs to.
- Focus rings: brand 2-px `focus-visible` on every new control (D12);
  `motion-reduce:` on every new transition.
- Scroll lock / focus restore of the drawers opened from this page:
  shared useModalBehavior fix SN-09 (F1 437-px jump).

### 2.12 B11 - 320..639

Single column at every phone width (masters stop at 390; BRIEF: no
sub-breakpoints, D13 no tablet). Content stretches: 272 (320), 312 (360),
342 (390), 382 (430), 552 (600), 591 (639). Fixed things that must fit
272: line 1 of an order row (208), "Усі замовлення" + disc (216), load-more
button (227), payment tile + gaps (64 + 16 + chevron 24 + 8), invoice line
(125 in a 144 column). Heights do not change with width except text
wraps (subtitle 2 lines at 320/360; badge rows; captions).
Landscape 568 x 320 = the same phone layout (passes today).

---------------------------------------------------------------------

## 3. Bugs to fix (merged: visual D1-D20, functional F1-F19, shell refs)

Owner: A = this area (DashboardView / phoneParts / data.ts), S = shared
layer (section 4), SH = shell-cabinet, AU = auth area.

| id | sev | where | what | fix | owner, file:line |
|---|---|---|---|---|---|
| DB-01 (D1, F5) | major | orders title row, 320..356 | "Останні / замовле / ння": H2 squeezed by the 166-px pill, `overflow-wrap:anywhere` splits the word | phone: title alone (`pb-4 lg:py-4`), desktop button `max-lg:hidden`, phone link under the panel (2.6) | A, DashboardView.tsx:575-582 |
| DB-02 (D2, F4) | major | select menu, 320 (demo) and every width (55-char profile name) | menu `min-w-max` + nowrap options: 320 wide from x 24 at 320 (24 px clipped), 490 wide at 390 with S3 (124 px off-screen); html overflow-x clip hides it | phone menu = field width (`w-full lg:min-w-max`), options `whitespace-normal lg:whitespace-nowrap` | S (SN-03), Select.tsx:112, 126 |
| DB-03 (F2) | major | select, iPhone WebKit | menu never closes on an outside tap (Safari does not focus a tapped button, so `onBlur` never fires); stays over the tiles after scrolling | document `pointerdown` listener while open, close when the target is outside the root | S (SN-03), Select.tsx:97 |
| DB-04 (F3) | major (plausible) | select, WebKit touch | options picked only in `onMouseDown`; touch emulation sends no mousedown -> value never changes | pick in `onClick`, keep `onMouseDown={e => e.preventDefault()}` so the trigger keeps focus | S (SN-03), Select.tsx:120-124 |
| DB-05 (D3, F7) | major | payments, 320 (360 for 7 digits) | nowrap amount in a 94-px column runs 13.8..41.5 px into the 56-px chevron cell; invoice line wraps to 2 lines | phone row anatomy: fixed 64 tile, amount line flex-1 with FitText min 16, chevron 24 inline top-right, invoice one nowrap unit (2.7) | A, DashboardView.tsx:327-363 |
| DB-06 (D4, F16) | major | payments, all widths | card-in-card (white p-16 panel of pink r24 cards), 0-px gaps notch the corners, "Показати ще 5" touches the last card, chip wraps under the text, 15 rows / 2032 px with no collapse | one r32 list panel with 1-px lines, overdue = red tile + chip, load-more 48 below with counter, "Приховати" after the last reveal (2.7) | A, DashboardView.tsx:318-320, 391-421 |
| DB-07 (D5, F15, shell #7-#9) | major | greeting head, all widths | H1 32/36 (off-scale), subtitle 14/24, ragged hug pills on 2 rows, head 300 px at 320; long name: 7 lines, first tile below the fold | title node with `max-lg:line-clamp-2` company + forced break (A); pills `max-lg:w-full max-lg:[&>span]:flex-1` (A); H1 `text-h2`, subtitle 14/20, gaps 16/32/8, pt/pb 48 (S) | A DashboardView.tsx:530-551; S (SN-02) CabinetPageHead.tsx:63-75 |
| DB-08 (F1) | major | any page, closing the account or cart drawer (Android Chrome) | page scrolls up ~437 px: `opener.focus()` on a sticky-header control + `scroll-padding-top: 96px` | `opener.focus({ preventScroll: true })`; consider dropping html `scroll-padding-top` on phones | S (SN-09), cart/useModalBehavior.ts:78-79; globals.css:1327 |
| DB-09 (F6, D15, shell #1) | major | legal bar, 320..345 | copyright `whitespace-nowrap` ends at x 346, "All rights rese" clipped | phone legal bar per D1 (wrapping, stacked rows) | SH, PlatformFooter.tsx:16-31 |
| DB-10 (D6) | minor | KPI tiles | label 18/24, value 32/28 (28 at 320 only), icon gap 24 (16 at 320), 8-digit value 8 px into the padding | phone label 14/20 #8e8e8f, value 30/36 Bold one size + FitText min 24, gap 16, gap label->value 8 (2.4) | A, DashboardView.tsx:102-110 |
| DB-11 (D7, D14 part) | minor | credit tile | bar spans the text column only (218 / 156); "Доступно" #777779 on #1d1d1f 3.77:1 | `max-lg:-ml-[68px]` on the usage block (bar 294 wide), caption 14/20 #8e8e8f (5.1:1) (2.5) | A, DashboardView.tsx:119-139 |
| DB-12 (D8) | minor | panels | inner insets differ: orders px 16, payments p 16 (+16 cards), manager p 24, empties px 24 py 40 / p 16 + py 16 | every phone panel px 24 (rows py 24 / py 16 in a py 8 panel), TR-24 empties py 48 px 24 | A, DashboardView.tsx:278, 391, 393, 584 |
| DB-13 (D9) | minor | all panels and tiles | `rounded-3xl` r24 vs the mobile card radius r32 | phone panels / tiles r32 (`rounded-[32px] lg:rounded-3xl` where the element is shared with desktop) | A, DashboardView.tsx:102, 278, 391, 437, 584 |
| DB-14 (D10, D15 part, shell #16) | minor | page rhythm | gaps 56 / 56 / 40 / 32 (tiles->orders H2, orders->payments H2, payments->manager H2, manager->legal bar); square slab | sections 48 apart (`gap-12` phone on the body / columns, title rows `pb-4 lg:py-4`); slab r32 top + pb 48 (S) | A, DashboardView.tsx:553-554, 575, 386, 432, 596; SH CabinetPage.tsx:12 |
| DB-15 (D11) | minor | order rows, 390-430 / 320 | row height jumps 169 / 215 on a 2.7-px wrap (badge column 274 next to the 24 chevron column); caption floats under the chip; at 320 "Залишок 6 336,10 UAH прострочено" nowrap 2.9 px (14.7 with 6 digits) past the column | phone row: chevron on line 1, badges get the full 294 / 224, caption its own full-width line 8 below, wrapping (2.6) | A, DashboardView.tsx:276-303; caption source PaymentBadge.tsx:58-70 |
| DB-16 (D12, F13) | minor | fresh partner | bare 104 / 88-px empty texts with different insets, no title, no next step; dead one-option select; "0 UAH" credit with an empty bar reads as blocked | TR-24 blocks A/B/C, select hidden when < 2 counterparties (phone), "Ліміт не встановлено" without bar (2.3, 2.5, 2.9) | A, DashboardView.tsx:392-394, 557-571, 583-586 |
| DB-17 (D13, F10 part) | minor | manager card | 38-px xsmall 14/22 pill; tel / mail links 140 x 24 / 174 x 24, 8 apart; 60 r8 avatar; name 18/24 w800; role `capitalize` -> "Менеджер B2B Клієнтів" | phone card (2.8): 52 r12 tile, Title Small name, sentence-case role, 44-px contact rows, full-width 42 pill | A, DashboardView.tsx:437-473 |
| DB-18 (F8) | minor | Back after a filter | filter is component state: Back restores the scroll offset but resets the filter -> different content under the restored offset | sessionStorage persistence (2.11) | A, DashboardView.tsx:484, 561 |
| DB-19 (F9) | minor | select on 568-tall phones | 230-px menu opens below the fold (101 px hidden at 390, 161 at 320) | flip up when space below < menu + 8 and above is larger, else `scrollIntoView({block:"nearest"})` on open | S (SN-03), Select.tsx:107-113 (ul at 201-207 of the file) |
| DB-20 (F11, F12, D15, shell #4-#6) | minor | SideMenu strip | 344 wide at 320 (scrolls, last item cut), 10-px labels, scrolls away (only nav) | D1: strip removed on phones, burger + cabinet menu sheet in the sticky header | SH, SideMenu.tsx:53, 87-92; PlatformHeader.tsx |
| DB-21 (F14) | minor | select value | chosen long name ellipsised with no way to read it | resolved by DB-02 (the menu shows wrapped full names); field stays one line (46 fixed, D6) | S (SN-03) |
| DB-22 (F17) | minor | account drawer from the header, 568 tall | close cross inside the scroller scrolls away; only a 26-px scrim strip remains | D7 full-screen sheet with a fixed 66 bar + cross | AU, AuthDrawer.tsx:898-908 |
| DB-23 (D14) | minor | small text contrast | label on dark 3.77:1; "Протерміновано" 3.09:1; red caption #f26164 3.15:1; overdue tile "до" 3.48:1; subtitle 4.10:1 | ACCEPTED for the dark-tile label and the credit caption (#8e8e8f, DB-10/11). REJECTED for status / payment colours (TR-14, D13 "no colour inventions") and the #777779 subtitle (Body Small tagline colour of every master) | A (partial) |
| DB-24 (D16) | nit | money format | digit groups use U+0020, only the sign is NBSP: any wrap can split "6 / 336,10" | group with U+00A0 in `formatAmount` (write it via code point, memory note on escapes); pixel-guard the desktop | S (SN-10), orders/data.ts:531-536 |
| DB-25 (D17) | nit | payment date tile | tile hugs its digits (57.7 / 58.9 / 61.5) -> amount column jumps | phone tile `w-16` (64) | A, DashboardView.tsx:329 |
| DB-26 (D18) | nit | 600 px | KPI tiles 552 wide with 277 px of empty dark area | REJECTED: no sub-breakpoints below 640 (BRIEF, D13); the masters never go past 390; single column stays | - |
| DB-27 (D19) | nit | mock data | 'ТОВ "Мережа готелів "Зоряний шлях"' has unbalanced straight quotes | DEFERRED: the string is mock data rendered on the frozen desktop /orders and dashboard menu; change only if the orchestrator accepts the desktop diff (proposal: 'ТОВ «Мережа готелів «Зоряний шлях»»') | S data, orders/data.ts:216 |
| DB-28 (D20) | nit | select | transparent on #f5f5f5 (1.2:1 ring); no visible "Контрагент" caption | white fill on phones (2.3). Caption REJECTED: the default value "Усі контрагенти" and the option list name the dimension; the field stays the TR-21 one-line control | A, DashboardView.tsx:557-563 |
| DB-29 (F18) | nit | empty company name | chip avatar = empty black disc; aria-label "Особистий кабінет: " with a dangling colon | shell: the D1 account row must fall back to initials of the person / a glyph and drop the colon when the name is empty | SH, PlatformHeader.tsx:28-34, 46 |
| DB-30 (F19) | nit | legal bar | "Політика конфіденційності" / "Угода про публічну оферту" are underlined non-links | DEFERRED: no pages exist (MATRIX q13); shell decides | SH, PlatformFooter.tsx:36-43 |
| DB-31 (F10 part) | minor | legal bar | logo link 80 x 27 target | shell legal bar recipe (D1) | SH, PlatformFooter.tsx:20 |

Kept (works today, must not regress): 0 console / page errors in every
state; no document overflow; pre-hydration gate (no prompt flash at 1x /
6x CPU); 23 links resolve; mailto subject/body carry company + ЄДРПОУ;
reveal moves focus to the first revealed row without a scroll jump; every
filter updates KPIs / list / payments consistently; progressbar ARIA;
select ARIA + keyboard + Escape; no sticky hover on touch; visitor / B2C
get SignInPrompt.

---------------------------------------------------------------------

## 4. Shared needs

| id | Atom / API | Status | Needed for |
|---|---|---|---|
| SN-01 | Cabinet shell per D1: PlatformHeader phone = logo + CartTrigger + burger (no chip); cabinet menu sheet; SideMenu strip removed below 640; CabinetPage slab `rounded-t-[32px] pb-12 lg:rounded-t-none lg:rounded-tl-[48px] lg:pb-8` (today `pb-8 lg:rounded-tl-[48px]`, CabinetPage.tsx:12); PlatformFooter phone legal bar (wraps, px 24 py 24 gap 24, 14/30) | exists, needs change (shell-cabinet) | DB-09, DB-14, DB-20, DB-29..31; all y values in 2.1 |
| SN-02 | CabinetPageHead phone variant. Section `flex flex-col gap-8 px-6 pb-12 pt-12 lg:flex-row lg:items-center lg:justify-between lg:gap-[26px] lg:py-8 lg:pl-10 lg:pr-8`; inner column unchanged; title block `flex flex-col gap-4 lg:gap-2`; H1 `text-h2 text-neutral-900` (phone 30/36 -0.6 700; desktop 44/48 -0.02em 700 = today's literal); subtitle `text-[14px] leading-5 text-neutral-500 lg:leading-6`; actions `flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end lg:gap-4`. No new props needed; two-action stacking comes from the callers' `max-lg:w-full max-lg:[&>span]:flex-1` buttons (TR-04: one action stays a hug pill) | exists, needs change (shell-cabinet) | DB-07 |
| SN-03 | Select phone fixes (no API change). ul `absolute left-0 top-[calc(100%+4.5px)] z-20 max-h-[250px] w-full overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)] lg:min-w-max` (+ `bottom-[calc(100%+4.5px)] top-auto` when flipped); li `cursor-pointer px-4 py-2.5 text-[16px] font-medium leading-6 whitespace-normal [&+&]:shadow-[inset_0_1px_0_var(--color-stroke-subtle)] lg:py-3 lg:text-button-md lg:whitespace-nowrap lg:[&+&]:shadow-[inset_0_0.5px_0_var(--color-stroke-subtle)]`; pick on `onClick`, `onMouseDown` only `preventDefault`; document `pointerdown` outside -> close (effect while open); on open measure space below vs above (header 66 counted) and flip or `scrollIntoView({block:"nearest"})` | exists, needs change (shared) | DB-02, DB-03, DB-04, DB-19, DB-21; also /orders filters |
| SN-04 | `FitText` (new, `src/components/ui/FitText.tsx`): `<FitText as?: "span" \| "p" = "span", min: number, media?: string = "(max-width: 639px)", className?, children>` renders ONE element; while `media` matches, after layout / on ResizeObserver / `document.fonts.ready` it clears the inline size, measures `clientWidth` vs `scrollWidth` and sets `style.fontSize = max(min, floor(base * avail / need * 100) / 100)px`; line-height comes from the class and never changes; outside `media` it clears the inline style. Generalises spivpratsya/HowItWorks.tsx FitStepLabel (79-112), which stays untouched (landing frozen) | new (shared) | DB-05, DB-10; likely orders / cart amounts |
| SN-05 | `PanelEmptyState` (new, `src/components/platform/ui/PanelEmptyState.tsx`, TR-24): props `{ title: ReactNode; text?: ReactNode; icon?: ReactNode; action?: ReactNode; className? }`; classes: root `flex flex-col items-center px-6 py-12 text-center`, icon tile `mb-6 flex size-[52px] items-center justify-center rounded-xl border border-stroke-default`, title `text-title-lg text-neutral-900`, text `mt-4 max-w-[294px] text-body-sm text-neutral-500`, action wrapper `mt-8`. Phone-only by convention (callers `lg:hidden`); TableEmptyState stays the desktop atom | new (shared) | DB-16 |
| SN-06 | `LoadMore` (new, `src/components/ui/LoadMore.tsx`, D4 / TR-12): props `{ shown: number; total: number; onMore(): void; onLess?(): void; className?; moreRef?: Ref<HTMLButtonElement> }`; root `flex flex-col items-center gap-4`; counter `<p role="status" aria-live="polite" className="text-[14px] leading-5 text-neutral-500">Показано {shown} із {total}</p>`; button `<Button size="small" plus>Показати більше</Button>` or, when `shown >= total && onLess`, `<Button size="small" minus>Приховати</Button>`; renders nothing when `total <= shown` and no `onLess` | new (shared) | DB-06; also orders, returns, assortment, materials, catalog |
| SN-07 | `ListPanel` + `RecordRow` (new, `src/components/platform/ui/RecordRow.tsx`, TR-07): `ListPanel` = `ul.flex flex-col rounded-[32px] bg-white px-6` (prop `inset?: "rows" \| "tight"` -> rows py 24 or panel py 8 + rows py 16); `RecordRow` props `{ href: string; id: ReactNode; date?: string; amount?: ReactNode; badges?: ReactNode; caption?: { text: string; tone: "subtle" \| "attention" }; children? }` with the classes of 2.6 | new (shared) | B5 (and the orders / returns lists) |
| SN-08 | `PaymentCaptionLine` exported from PaymentBadge.tsx (new export; the existing PaymentBadge render untouched): `{ text: ReactNode; tone: "subtle" \| "attention" }` -> `flex items-start gap-1 text-[12px] font-medium leading-4` + `AttentionSmallIcon size-4 shrink-0` + `text-[#f26164]` / `text-neutral-500` | new export (shared) | B5 line 4, DB-15 |
| SN-09 | useModalBehavior: `opener.focus({ preventScroll: true })` on cleanup (cart/useModalBehavior.ts:78-79); optionally `scroll-padding-top` 66 on phones (globals.css:1327, anchors use `scroll-margin-top` anyway) | exists, needs change (shared) | DB-08 |
| SN-10 | Money grouping with NBSP: `formatAmount` replaces groups with U+00A0 (orders/data.ts:533-535) | exists, needs change (shared data, owner orders-list) | DB-15 caption wrap, DB-24 |
| SN-11 | Button: nothing new. This page uses `size="responsive"` (head), `small` (links, load-more, phone manager pill) and keeps `xsmall` on the desktop manager card only; the D8 change of the `large` phone strings does not touch the dashboard. Phone-only full width = call-site `className="max-lg:w-full max-lg:[&>span]:flex-1"`; hide/show = `max-lg:hidden` / `lg:hidden` (gotcha 5) | exists | B1, B5, B6, B7 |
| SN-12 | SignInPrompt phone composition (visitor / B2C on /dashboard) | exists, needs change (shell-cabinet #12) | ST12 |
| SN-13 | (optional) cabinet section-title constant in platform/ui, e.g. `CABINET_SECTION_TITLE = "text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 lg:font-bold"`, so dashboard / profile / order detail use one phone section title | new (shared, optional) | B5-B7 |

Fallbacks: if SN-04..SN-08 are not built before this area, implement them
locally in `phoneParts.tsx` with exactly these classes and swap to the
shared atoms afterwards (no visual change).

---------------------------------------------------------------------

## 5. Files

Area files (disjoint from other areas):

| File | Change |
|---|---|
| `src/components/platform/dashboard/DashboardView.tsx` | H2 constant phone weight (69); KpiTile classes (102-110); CreditUsage phone bar width, caption colour, limit-0 variant (119-139); `RecentOrdersList` + `max-lg:hidden` (278); Payments: desktop panel `max-lg:hidden`, phone panel + LoadMore + collapse + second ref array (368-425); ManagerCard desktop card `max-lg:hidden` + phone card (437); title node clamp (532-538); head buttons phone full width (543-548); body / column gaps `gap-12` phone (553, 554, 596); select wrapper hide rule + white fill (556-563); orders title row + desktop button `max-lg:hidden` + phone list + phone link + phone empty block (574-592); payments / manager title rows `pb-4 lg:py-4` (386, 432); filter persistence (484, 561) |
| `src/components/platform/dashboard/phoneParts.tsx` (NEW) | `RecentOrdersPhoneList`, `PaymentsPhonePanel` / `PaymentPhoneRow`, `ManagerCardPhone`, local fallbacks of SN-04..SN-08 if needed |
| `src/components/platform/dashboard/data.ts` | `DASHBOARD_FILTER_KEY = "binar.dashboard.counterparty.v1"` + `readStoredFilter()` / `storeFilter()` helpers (try/catch); no data changes |
| `audit/mobile/dashboard/verify.mjs` (NEW, audit only) | the verification run of section 6 |

Shared files this area depends on (listed under 4, NOT edited by this
area): `platform/ui/CabinetPageHead.tsx`, `platform/ui/CabinetPage.tsx`,
`platform/ui/Select.tsx`, `platform/ui/PaymentBadge.tsx`,
`platform/ui/index.ts` (exports), `platform/ui/PanelEmptyState.tsx`
(new), `platform/ui/RecordRow.tsx` (new), `ui/FitText.tsx` (new),
`ui/LoadMore.tsx` (new), `cart/useModalBehavior.ts`,
`platform/orders/data.ts`, `platform/PlatformHeader.tsx`,
`platform/SideMenu.tsx`, `platform/PlatformFooter.tsx`,
`platform/PlatformChrome.tsx`, `platform/ui/SignInPrompt.tsx`,
`app/globals.css`.

---------------------------------------------------------------------

## 6. Verification checklist (fresh verify agent)

Tools: `audit/mobile/kit/phone.mjs` (`openPhone`, `shootSegments`,
`shootViewport`, `domChecks`), `audit/kit/geom.mjs`, `audit/mobile/kit/
compare.mjs`. Touch contexts (hover:none, pointer:coarse). Use
`scrollTo({behavior:"instant"})` before viewport shots (gotcha 10); judge
focus rings with taps, not `el.click()` (gotcha 14).

G0 (build agent, BEFORE editing): capture desktop references of the
dashboard that the 76-shot baseline lacks: 640 x 900, 1024 x 768,
1280 x 800, 1536 x 791 (S1), 1710 x 1157 (S2 fresh, S3 with the select
open), saved under `audit/mobile/dashboard/desktop-before/`.

Widths: 320 x 568, 360 x 780, 390 x 844, 430 x 932, 600 x 960 (+ 375 x 667,
414 x 896, 639 x 900 for DOM checks; 568 x 320 landscape).

States: ST1, ST2 (each of the 4 counterparties), ST3 (8 / 13 / 15 /
collapsed), ST4 (320, 390, 390 x 568, 320 x 568), ST5, ST6, ST7, ST8, ST9,
ST10, ST11, ST12, ST14; stress: 8-digit KPI, 6/7-digit payment, 6-digit
remainder caption (DOM injection as in visual-probe.mjs).

Measurements at 390 (ST1), tolerance 1 px:
- every block x 24, width 342 (panels, tiles, select, head pills); 272 at
  320, 552 at 600.
- H1 top = slab top + 48 (114 with the D1 shell); computed 30 px / 36 /
  -0.6 / 700; first span weight 300 and on its own line; company <= 2
  lines (ST9: `-webkit-line-clamp: 2`, height <= 72).
- subtitle 14 / 20 #777779, top = H1 bottom + 16; pills 42 tall, 8 apart,
  outlined first, top = subtitle bottom + 32.
- select top = pill 2 bottom + 48, 46 tall, background white, menu width
  = field width at 320 and 390, options >= 44 tall, 16 px.
- KPI tiles: radius 32, padding 24, heights 112 / 112 / 174, 16 apart;
  label 14 / 20 500 #8e8e8f; value 30 / 36 700 white; icon -> text gap 16;
  bar left = tile left + 24, bar width 294 (224 at 320).
- section titles 22 / 28 600 -0.44, title -> panel 16, previous block ->
  title 48.
- orders panel r32, row padding 24, 1-px #d2d2d2 borders between rows,
  no element right of x 342 inside rows; id 16 / 22 700; date 14 / 20;
  amount 22 / 28 600; caption 12 / 16; chevron 24 on line 1.
- "Усі замовлення" right edge 366, top = panel bottom + 24 (absent in ST5).
- payments panel r32 py 8 px 24, rows py 16, tile width 64, amount never
  overlaps the chevron box (amount right <= chevron left - 8) at 320 with
  the expanded list and the stress sums; computed amount size >= 16.
- counter top = panel bottom + 48, 14 / 20, centred; button 42 tall
  centred, top = counter bottom + 16; after 3 presses label "Приховати"
  with the minus disc; collapse returns to 3 rows.
- manager card r32 p 24; tile 52 r12; contact links >= 44 tall; pill
  294 x 42; role text starts with "Менеджер".
- legal bar top = last block bottom + 48.
- no 0.5-px lines and no `rounded-3xl` (24) on any phone panel / tile;
  no `text-[14px] leading-6` captions in the phone DOM.

DOM checks (`domChecks`) expected clean at every width for ST1, ST3-full,
ST5, ST6, ST9: overflowX, offRight, offLeft, wideElement, tinyText,
inputZoom, clippedText (except the intentional line-clamp ellipsis of the
H1 in ST9), hScroller, overlapText, brokenImage, stretchedImage.
smallTarget: only the header logo 100 x 33 (accepted shell item).
Console / page errors: 0.

Flows:
1. Select: open, pick each option by TAP (Chromium touch and WebKit
   iPhone 13); outside tap on the H1 closes (WebKit); Escape closes;
   390 x 568 / 320 x 568: whole menu visible (flipped or scrolled).
2. Filter "Mirotel LTD" -> open a payment row -> Back: filter still
   "Mirotel LTD", KPI and scroll offset consistent (DB-18).
3. Payments: "Показати більше" x 3 -> 15 rows, focus on the first revealed
   row each time, counter text updates; "Приховати" -> 3 rows, focus on the
   button, button in view.
4. Every link resolves (orders rows, payment rows, "Усі замовлення",
   "Зробити замовлення" in head and empty block); tel / mailto taps cause
   no navigation and no errors.
5. Open + close the cart sheet and the account sheet at scrollY 1200: no
   scroll jump (DB-08, after SN-09).
6. ST12 visitor / B2C: SignInPrompt renders, "Увійти" / "Кабінет" opens the
   auth sheet.
7. ST13: 6x CPU, no SignInPrompt flash for S1 / S2.

Pixel guard:
- `node audit/mobile/kit/baseline.mjs audit/mobile/after` then
  `node audit/mobile/kit/compare.mjs audit/mobile/baseline audit/mobile/after`:
  0 differing files among landing-* and cabinet-1710-* / shop-1710-*
  (`cabinet-1710-dashboard.png` identical); `phone-390-cabinet-dashboard.png`
  is EXPECTED to differ (it is the old phone layout).
- G0 set re-shot and compared: identical at 640 / 1024 / 1280 / 1536 /
  1710 (these hit the narrow-canvas `RecentOrdersList`, the KPI container
  query and the desktop empty states).
- G3: computed KPI value font-size at 1024 x 768 (tile content < 250) =
  28 px and icon gap 16 (the stacked `lg:@max-[250px]:` variants still
  win), at 1710 = 32 px.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

1. Section spacing on cabinet pages: this spec uses 48 between titled
   sections (D10 "big blocks 48", TR-03 head -> first block 48) and 16
   for related tiles (TR-20); D10's "then blocks 24 apart on the slab" is
   read as the gap between sibling cards inside one section (profile
   cards). The system spec should state this once for every cabinet page.
2. Cabinet section-title weight on phones: Title Large is SemiBold 600 in
   the masters (D9, language 7); the cabinet desktop titles and the
   profile panel titles are 22/28 Bold. This spec makes phone section
   titles 600 (SN-13); profile / order-detail specs must match.
3. CabinetPageHead bottom padding (head -> first block): 48 here (SN-02
   `pb-12`); if the shell spec picks 24, the dashboard body needs `pt-6`
   on phones to keep 48.
4. Head action order: D8 / TR-04 (secondary outlined first, primary solid
   last) is followed; the functional audit proposed primary first.
5. Overdue payments on phones drop the pink #ffe7e5 row fill (red tile +
   chip carry the state). Alternative if the orchestrator wants the
   desktop identity: full-bleed pink bands inside the `overflow-clip`
   panel.
6. Load-more label: D4 "Показати більше" replaces the desktop "Показати ще
   N" on phones; the collapse "Приховати" (minus disc) is borrowed from the
   landing FAQ and is not in D4 - accept for every list that can grow
   long, or drop here.
7. New copy: "Ліміт не встановлено" (credit tile, limit 0) and the reuse of
   the orders empty-row texts; empty-state CTA variant: TR-24 says solid,
   the orders master empty row 4990:72302 uses accent - pick one for all
   areas.
8. Phone-only behaviour differences vs desktop (desktop frozen): select
   hidden with < 2 counterparties, credit tile without bar at limit 0,
   payments collapse. The orchestrator may want them on desktop too
   (desktop baseline has only the 1710 demo shot).
9. Filter persistence (sessionStorage) also changes desktop behaviour on
   Back (no pixel change on first load).
10. SN-10 NBSP grouping touches every money string on desktop; NBSP and
    space should share the advance in Manrope but the pixel guard decides.
11. DB-27 mock quotes: the fix changes desktop /orders pixels - orchestrator
    call.
12. FitText location (`ui/` vs `platform/ui/`) and whether orders / cart
    use it too.
13. 1-px row borders are CSS borders (add 1 px); a strict Figma-inside
    translation would be `pt-[23px]` on rows after the first - not done
    (invented layout, no master to match to the pixel).
14. Platform routes have no ScrollUpDock (shell-cabinet #6); with a
    ~2930-px page the burger in the sticky header is the way back; the
    shell spec decides whether the dock joins the cabinet.
15. Full-width head pills stretch to 552 at 600; the menu sheet caps its
    column at 480 (Header.tsx:518). If the system spec wants a cap for
    stacked page actions, apply it to every cabinet head.
