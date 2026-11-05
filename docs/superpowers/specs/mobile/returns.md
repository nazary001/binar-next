# Phone spec - Returns (list rows, return details, withdraw confirm)

Area: returns. Phase: design (specification only, nothing under src/ edited).
Date 2026-11-05. Phone = below 640 px (320 hard floor, 390 primary).
Inputs: audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md (D1..D13, binding),
audit/mobile/lang/figma-mobile-language.md (TR-01..TR-32),
audit/mobile/lang/code-mobile-recipes.md, audit/mobile/returns/visual-report.md
(B1, B2, M1..M6, m1..m12, n1, n2), audit/mobile/returns/functional-report.md
(R-F01..R-F19), the shots under audit/mobile/returns/shots/ (viewed:
visual-list-390-default-01, visual-list-390-empty-fresh-01, visual-detail-9104-390-01/02,
visual-confirm-9104-390-open, visual-extra-docs-modal-320), the sibling audits
audit/mobile/orders-list/*-report.md and audit/mobile/order-detail/visual-report.md
(same page family), audit/mobile/shell-cabinet/visual-report.md.
Text widths used below were measured in Chromium with the site's Manrope:
audit/mobile/returns/spec-measure.mjs -> audit/mobile/returns/out/spec-measure.txt.

Conventions of this document
- Geometry is CSS px at 390 x 844 unless a width is named; "content" = the
  342-px column between the 24-px gutters (272 at 320, 312 at 360, 382 at 430,
  552 at 600); "card inner" = content - 48 (294 at 390, 224 at 320, 264 at 360,
  334 at 430, 504 at 600).
- y values assume the shell decisions are built (D1: 66-px cabinet header, no
  side-menu strip, slab with r32 top corners starting at y 66).
- "Phone twin" = a block rendered only below 640 (`lg:hidden`) next to the
  untouched desktop block (`max-lg:hidden`); desktop stays byte-identical by
  construction. "In place" = one element with phone classes unprefixed and
  the desktop value restored with `lg:`.
- Owner tags: [returns] = this area's files; [shared] = shared layer
  (platform/ui, ui, cart, detailParts); [orders-list] / [order-detail] /
  [shell] = sibling areas. A block owned elsewhere is restated here only with
  the values the returns screens need.

------------------------------------------------------------------------------

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
| S1 | 2.1.4 row line 1 with a 46 documents disc + a 46 details disc | A7 RecordRow: eyebrow "Повернення №9104", id over date, documents RowDisc (40 ring, 44 hit, `OrderDocumentsIcon size-5`) + 24 chevron; no details disc (the id is the stretched link); edited |
| S2 | S2 back -> title 24 (`mb-2`), 7.5 | 48 (A-2; shell-cabinet 2.5.4 recipe wins); edited |
| S3 | 2.2 phone twins (KeyValueCard, LineItemList, DocumentRow) + S12 `className` (7.1) | A-11: build with the detailParts phone variants of order-detail N11 (SummaryCard `compact`, TotalCard, ItemsTable `phone` with `extra` = the reason, KeyValueList for "Деталі повернення", DocumentsCard rows); the visual values of this file stay |
| S4 | 7.6 head -> first block | 48 (A-3) |
| S5 | 7.7 total 22/28 | Confirmed for both detail pages (A-10) |
| S6 | S7 Toast | A23 (global host, phone-only default) |
| S7 | S8 RecordRow / S9 DocumentRow / S10 KeyValueCard / S11 LineItemList / S13 EmptyPanel | A7 / A16 / A15 / A8 / A14 `surface="panel"` |
| S8 | S14 NARROW_PILL (14-px label below 360), 7.11 | Rejected (A-14): phone label "Завантажити все" (`lg:hidden` / `max-lg:hidden` spans), 16/22 |
| S9 | S15 / S16 / S6 | A9 / A5 / A2 `fallbackFocus` (pass `() => titleRef.current`) |
| S10 | 7.8 toast on desktop | Phone-only (A23 default) |
| S11 | 7.10 clamp 3 lines | Accepted (A-10) |
| S12 | Build | List rows -> C-orders-list (ReturnRows.tsx); detail page -> C-order-detail (ReturnDetailsView.tsx) |
| S13 (critique round 1) | 2.1 rows (A7) inside the orders panel | A7 revised: `ul role="list"`, no `overflow-clip`, rows carry the r32 corners and the focus ring; chevron `ChevronSideIcon mirrored size-6` |
| S14 (critique round 1) | S6 toast (withdraw confirmation) | A23 revised: queued while the confirm card is open, `keepOnNavigate` when a navigation follows; host z-55 |
| S15 (critique round 1) | S9 LoadMore | A9 revised (counter not live; focus stays on the button; `focusAfterLast`) |
| S16 (critique round 1) | 2.2 detail head attention / payment caption | PaymentCaptionLine `lg:hidden` on its own line 8 under the badges (A21; order-detail S19) |
| S17 (critique round 1) | 2.2 total band | Dark summary anatomy (C-40: #1d1d1f, A13 SUMMARY_LABEL over SUMMARY_AMOUNT) |
| S18 (critique round 1) | 2.2 withdraw confirm card | A6 one-DOM recipe (pinned title / actions when the card overflows) |
| S19 (critique round 1) | Returns filter sheet | T5a draft model (orders-list S20); A5 constants revised (bar 66 one line) |

------------------------------------------------------------------------------

## 1. Scope

### 1.1 Routes

| Route | Component | Notes |
|---|---|---|
| `/orders?tab=returns` | `OrdersView tab="returns"` -> `ReturnsTab` (src/components/platform/orders/OrdersView.tsx:496-599) | the «Повернення» tab of «Мої замовлення» |
| `/orders/returns` | redirect to `/orders?tab=returns` (src/app/orders/returns/page.tsx) | no UI |
| `/orders/returns/[id]` | `ReturnDetailsView` (src/components/platform/orders/ReturnDetailsView.tsx) | ids 9104..9093 prerendered (src/app/orders/returns/[id]/page.tsx:16-18), any other id renders on demand |

### 1.2 Seeds

| Seed | What it gives |
|---|---|
| `b2b` (audit/kit/seed-b2b.json, demo partner) | 12 returns; the list shows 10 + load-more (default period «Останні 30 днів» holds all 12) |
| fresh partner (`b2b` seed with `accounts[0].id = "acc-fresh"`, `sessionId "acc-fresh"`) | no returns -> list empty state; every return id -> not-found state |
| `none` (visitor), `b2c` | SignInPrompt on both routes |

### 1.3 The 12 seeded returns (8 statuses)

| id | status (badge, tone) | order | lines | withdrawable (head button) | sum |
|---|---|---|---|---|---|
| 9104 | review «На розгляді» (amber) | 48291061 | 3 | yes | 6 690,15 ₴ |
| 9103 | created «Створено» (blue) | 48291056 | 1 | yes | 1 899,00 ₴ |
| 9102 | approved «Погоджено» (mint) | 48291058 | 2 | yes | 6 330,00 ₴ |
| 9101 | rejected «Відхилено» (red) | 48291052 | 1 | no | 316,50 ₴ |
| 9100 | inTransit «Товар у дорозі» (indigo) | 48291050 | 1 | no | 3 798,00 ₴ |
| 9099 | accepted «Прийнято складом» (orange) | 48291047 | 2 | no | 3 160,60 ₴ |
| 9098 | completed «Завершено» (green) | 48291046 | 1 | no | 759,60 ₴ |
| 9097 | cancelled «Скасовано» (neutral) | 48291042 | 1 | no | 720,30 ₴ |
| 9096 | completed | 48291041 | 2 | no | 6 810,20 ₴ |
| 9095 | review | 48291039 | 1 | yes | 759,60 ₴ |
| 9094 | completed | 48291038 | 1 | no | 316,50 ₴ |
| 9093 | created | 48291061 (same order as 9104) | 1 | yes | 2 532,00 ₴ |

Withdrawable = `RETURN_WITHDRAWABLE` (data.ts:193: created / review / approved).

### 1.4 States

Reached by the audits and specified below:

| Id | Route | State |
|---|---|---|
| L1 | list | default (10 of 12 rows, load-more visible) |
| L2 | list | load-more tapped (12 of 12, load-more gone) |
| L3 | list | filter sheet open (Період / Контрагент / Статус повернення) |
| L4 | list | filtered (e.g. status «Скасовано» -> 1 row, chip shown, no load-more) |
| L5 | list | search with no match («zzzz») -> no-matches panel |
| L6 | list | fresh partner -> «Повернень ще немає» panel, no search row |
| L7 | list | «Документи повернення» modal open from a row |
| L8 | list | sort menu open / sorted by sum |
| L9 | list | Back from a detail page (filters, sort, loaded rows and scroll restored) |
| L10 | list | visitor / B2C -> SignInPrompt [shell] |
| L11 | list | pre-hydration: the B2B gate keeps the cabinet hidden (works today, keep) |
| D1 | detail | withdrawable status (9104, 9103, 9102, 9095, 9093): head with «Скасувати повернення» |
| D2 | detail | final status (9101, 9100, 9099, 9098, 9097, 9096, 9094): head without action |
| D3 | detail | confirm modal open |
| D4 | detail | after confirm: badge «Скасовано», no button, toast, focus on the title |
| D5 | detail | not found (/orders/returns/1234, /orders/returns/abc, fresh partner on 9104) |
| D6 | detail | visitor / B2C -> SignInPrompt «Деталі повернення» [shell] |
| D7 | detail | pre-hydration gate (keep) |

Long-content variants covered by the rules: longest counterparty
'ТОВ "Мережа готелів "Зоряний шлях"' (247 px at 14/20, 283 px at 16/24), longest
item name «Шампунь для волосся і тіла, 40мл, Botanica» (344 px at 16/22 Bold),
document names «Видаткова накладна №5806» (224 px at 16/22 Bold), reason
«Пошкоджено при доставці» (174 px at 14/20), delivery «Відправити поштою (Нова
Пошта)» (257 px at 16/24), widest badge «Прийнято складом» (165 px), widest
total «6 330,00 ₴» (110 px at 22/28 SemiBold), a return with many lines (the
card grows; no inner scroll).

Not reachable / out of scope (reason):
- Error / offline state: the data is local mock (data.ts + localStorage store);
  there is no request that can fail.
- Creating a return (the wizard) lives on /orders/[id] (order-detail area); its
  result (a new «Створено» row) is just another list row here.
- Partial-quantity returns: no quantity control exists (order-detail OD-V-21).
- Real PDF preview / real multi-download behaviour of Mobile Safari, iOS
  safe-area and dvh behaviour: Chromium emulation only.
- Landscape 844 x 390: >= 640 = the desktop canvas by architecture (D13).
- Real return documents: the CRM will supply them (data.ts:514-518 repeats the
  order's papers, as the master 5192:79167 does).

------------------------------------------------------------------------------

## 2. Phone layout, block by block

### 2.0 Shell around both routes [shell]

- Header 66, sticky, logo + cart disc + burger (D1, TR-02, master bar 3082:3661).
  The strip (SideMenu phone branch) is gone (D1).
- Slab: `bg-bg-cabinet` (#f5f5f5) with `rounded-t-[32px]` from y 66 (D1, grey slab
  3094:4837), white r32 cards without strokes on it (D1, D5).
- Last block -> legal bar 48 (D10): CabinetPage phone `pb-12`, desktop `lg:pb-8`.
- Cabinet legal bar per D1 (px 24 py 24 gap 24, Onest 14/30, wraps).
- No ScrollUpDock on cabinet routes (shell decision; nothing here depends on it).

### 2.1 /orders?tab=returns (returns list)

Top to bottom at 390 (y assumes the orders-list head keeps the CTA on both
tabs below 640, orders-list proposal P2; if it does not, everything below the
subtitle moves up 74).

| # | Block | Geometry at 390 | Owner |
|---|---|---|---|
| 1 | Head | pt 48: H2 «Мої замовлення» y 114 (30/36 Bold -0.6, 240 px, 1 line at every width); 16; subtitle 14/20 #777779 y 166 (1 line at 390, 2 at 320/360); 32; «Зробити замовлення» Button/Small 42 y 218 | [shared] CabinetPageHead + [orders-list] |
| 2 | Chip tabs «Замовлення» / «Повернення» | 32 below; 36 tall; active «Повернення» brand fill | [orders-list] |
| 3 | Search row | 24 below; search pill flex-1 x 46 + 8 + 52 outlined filter disc (active-count badge) | [orders-list] |
| 4 | Applied filter chips | 16 below the search row, only when a filter differs from its default | [orders-list] |
| 5 | Meta + sort line | 16 below; period range «24.04.2026 - 24.05.2026» + (dot) + count «12», 14/20 #777779 left (the UI keeps its em dash in the range; (dot) = the 14-px DotIcon of ModalMeta), sort trigger right | [orders-list] |
| 6 | Returns panel (rows) | 24 below; white r32; rows 216 tall | [returns] |
| 7 | Load more | 48 below the panel | [shared] LoadMore + [orders-list] |
| 8 | Legal bar | 48 below (D10) | [shell] |

#### 2.1.1 Head (block 1) [shared CabinetPageHead, orders-list]
- Master pattern: TR-03 (hero 3082:3246: title -> 16 -> body -> 32 -> CTA), D9
  (cabinet titles H2 30/36 Bold -0.6), D10 (head pt 48).
- Title on this tab stays «Мої замовлення» (the desktop frame 5192:78615 keeps
  the same texts). Subtitle «Переглядайте статуси та деталі ваших замовлень».
- Returns-specific requirement: the head height must be the same on both tabs
  (orders-list OL-V08: today the tabs jump 66 px when the CTA disappears on the
  returns tab).

#### 2.1.2 Chip tabs (block 2) [orders-list]
- TR-13 / D11 (blog chips 3176:5478): 36 tall (`px-4 py-[7px]` + 1-px ring), r60,
  14/20 Medium; active `bg-brand text-white`, inactive `border border-stroke-default
  text-neutral-800`; gap 8; left-aligned; tablist semantics and roving tabindex kept
  (OrdersView.tsx:623-677). Desktop pill track unchanged (`lg:`).

#### 2.1.3 Search row, filter sheet, chips, sort (blocks 3-5) [orders-list + shared sheet]
Values the returns tab needs (the components are owned by orders-list):
- Search placeholder «Пошук»; aria-label «Пошук повернень» (OrdersView.tsx:530);
  matches the order number and the counterparty (OrdersView.tsx:516). 16-px text
  (no iOS zoom). A clear button (24 x glyph in a 44 hit box) appears when the
  field is not empty (R-F16).
- Filter sheet (TR-09 full-screen sheet, D7; title «Фільтри»): three radio groups
  (TR-10 / TR-22 rows per the shared FilterSheet recipe):
  - «Період»: Останні 30 днів (default) / Останні 90 днів / Цей рік / Увесь час
    (data.ts:222-227) + the resulting range caption 12/16 #777779;
  - «Контрагент»: Усі контрагенти (default) + the 4 names of COUNTERPARTIES
    (data.ts:215-220); option text wraps, never wider than the sheet (fixes R-F05
    on phones);
  - «Статус повернення»: Усі статуси (default) + Створено, На розгляді, Погоджено,
    Відхилено, Товар у дорозі, Прийнято складом, Завершено, Скасовано
    (RETURN_STATUS_KEYS order, ReturnStatusBadge.tsx:36-45). Plain text options,
    no badges (TR-14: badges are not tappable).
  - Sticky footer TR-18: «Скинути» outlinedDark + «Показати N» solid, flex-1 each,
    gap 8; N = number of returns matching the draft filters.
- Applied chips: one outline chip 36 with a 16 x mark per non-default filter
  («Останні 90 днів», «Mirotel LTD», «Скасовано»), gap 8, wrapping + «Скинути»
  text button 16/22 Medium #4a4a4c (TR-10, blog chips 3176:5478).
- Meta line left: period range + the 14-px DotIcon (gap 4, ModalMeta pattern) + filtered count, 14/20 #777779,
  `whitespace-nowrap` per part.
- Sort trigger right (TR-11): «Спочатку нові» 14/20 Medium #343435 + 16 chevron,
  44-tall hit box; menu: Спочатку нові / Спочатку старі / Сума: від більшої /
  Сума: від меншої (the date / total sort keys of `Sort`, listParts.tsx:232).
  For the returns tab "Сума" = return sum.
- Hidden for the fresh partner (no history): no search row, no chips, no meta
  line (orders-list P9 / functional proposal 6).
- The desktop filter row (search + three Selects) and the dark table head sort
  stay as they are from 640.

#### 2.1.4 Returns panel (block 6) [returns, built on the shared RecordRow]
Master pattern: TR-07 (data tables -> one list panel with row blocks), D11, D5
(r32), D9 (ids Title Small, amounts 22/28 SemiBold), blog card head row
3176:5545 (row label column + 46 disc, 46 tall), blog card disc 3176:5547.
Code recipe source: dashboard/DashboardView.tsx:276-300 (RecentOrdersList).
The row recipe MUST be identical to the orders-tab row (same RecordRow); only
the badge slot and the link target differ.

Panel: `<ul className="flex flex-col overflow-clip rounded-[32px] bg-white lg:hidden">`
(342 x n*216 at 390). The desktop ReturnsTable wrapper gets `max-lg:hidden`
(OrdersView.tsx:278, owner orders-list).

Row (li), top to bottom, all values at every phone width:

| Line | Content | Classes | Rule |
|---|---|---|---|
| frame | li, the whole row is the link (stretched) | `relative px-6 py-6 transition-colors duration-200 has-[a:active]:bg-bg-subtle` | TR-07 rows px 24 py 24 |
| divider (rows 2..n) | 1-px line inset 24 | `<span aria-hidden className="absolute inset-x-6 top-0 h-px bg-stroke-subtle" />` | TR-07 / D10 1-px #d2d2d2 |
| line 1 (46 tall; SYSTEM A7 recipe) | left: «№48291061» over «23.05.2026» (return date); right: documents disc + 8 + details disc | row `flex items-start justify-between gap-4`; left `flex min-w-0 flex-col gap-1`; id `whitespace-nowrap text-title-sm text-neutral-900` (16/22 Bold +0.16); date `whitespace-nowrap text-[14px] leading-5 text-neutral-500`; right `flex shrink-0 items-center gap-2` | TR-07 line 1, D9 row ids, blog head row 3176:5545 |
| documents disc (SYSTEM A7: RowDisc 40 ring in a 44 box, `OrderDocumentsIcon size-5`; the 46 disc here is superseded) | button, 46 | `relative z-[1] flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-200 active:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` + `<OrderDocumentsIcon className="size-6" />`; aria-label «Документи повернення за замовленням №48291061» (OrdersView.tsx:334); not rendered when the row has no order | TR-07 row actions as outlined discs, D8 >= 44, blog disc 3176:5547 |
| details disc (SYSTEM A7: NOT rendered - the id is the stretched row link, a decorative 24 chevron follows the documents disc) | the row link (Next Link), 46 | `flex size-[46px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` + `<ArrowUpRight className="size-[16.5px]" />` (blog/icons.tsx); href `/orders/returns/<id>`; NOT positioned itself, so its ::after covers the li | BlogCard.tsx:41-47 disc + stretched link |
| line 2 (16 below) | return sum «6 690,15 ₴» | `mt-4 whitespace-nowrap text-title-lg text-neutral-900` (22/28 SemiBold -0.44 on phones) | D9 amounts, TR-07 line 2 |
| line 3 (4 below) | counterparty, plain text (no underline: n2) | `mt-1 line-clamp-2 text-[14px] leading-5 text-neutral-800` | TR-07 key/value line, orders-list P6 |
| line 4 (16 below) | ReturnStatusBadge (38) | `mt-4 flex flex-wrap items-start gap-2` | TR-14 (desktop colours, not a chip) |

- Row height 24 + 46 + 16 + 28 + 4 + 20 + 16 + 38 + 24 = 216 (236 when the
  counterparty wraps: 'ТОВ "Мережа готелів "Зоряний шлях"' wraps at 320 only).
- Fit at 320 (card content 224): line 1 = 91 (id) + 100 (discs) + gap 16 = 207
  <= 224; widest badge 165 <= 224; widest sum 110. Nothing is wider than 272.
- Accessible name of the row link (the visible text is not inside the link):
  aria-label `Повернення за замовленням №{number}, {date}, {sum}, {status label}`
  e.g. «Повернення за замовленням №48291061, 23.05.2026, 6 690,15 ₴, На розгляді».
  The two returns of order 48291061 (9104 «На розгляді» 6 690,15 ₴ 23.05 and 9093
  «Створено» 2 532,00 ₴ 21.05) are now distinct on screen and in the label
  (R-F12, OL-V20).
- `whitespace-nowrap` on id, date and sum (globals `overflow-wrap:anywhere`
  would split numbers, recipes gotcha 12).
- Pressed state colour only (TR-32, D12): `has-[a:active]:bg-bg-subtle`, so a tap
  on the documents disc does not flash the row.
- Order of rows = the current sort (default date desc), same as desktop.
- Interaction: tap anywhere on the row except the documents disc -> navigate to
  `/orders/returns/<id>`; documents disc -> DocumentsModal (2.1.7).

#### 2.1.5 Empty states inside the panel (L5, L6) [returns copy, shared EmptyPanel]
Master pattern: TR-24 (form success panel: Title Large + Body Small centred,
py 48; hero spacing 16 / 32), D11. Replaces the off-screen TableEmptyRow on
phones (B1, R-F02); the desktop TableEmptyRow rows stay.

| State | Title (Title Large 22/28 SemiBold) | Text (14/20 #777779, max 294) | Action (32 below) |
|---|---|---|---|
| L6 fresh partner (`!hasHistory`) | «Повернень ще немає» (226 px, 2 lines at 320) | «Оформити повернення можна на сторінці отриманого замовлення.» (OrdersView.tsx:304) | none (desktop has none either) |
| L5 no matches | «Повернень не знайдено» (260 px, 2 lines at 320) | «Змініть пошук або умови фільтрів.» | hug Button/Small outlinedDark «Скинути фільтри» (176 x 42): clears the query and restores the default period / counterparty / status / sort |

Classes: panel `flex flex-col items-center rounded-[32px] bg-white px-6 py-12 text-center lg:hidden`;
title `text-title-lg text-neutral-900`; text `mt-4 max-w-[294px] text-[14px] leading-5 text-neutral-500`;
action wrapper `mt-8`. Load-more and the meta count are hidden in both states;
in L5 the search row and chips stay (the user must be able to edit them).

#### 2.1.6 Load more (block 7) [shared LoadMore, mounted by orders-list]
Master pattern: D4 / TR-12 (blog «Показати більше» 3176:5601, list -> button 48).
- 48 below the panel: counter «Показано 10 із 12» 14/20 #777779 centred
  (`aria-live="polite"`), 16, Button/Small «Показати більше» with the plus disc
  (`<Button size="small" plus>`, 129 + 48 + 8 + 42 = 227 wide), centred. Tap appends
  the next 10 rows (focus stays on the button; the new rows appear above it).
- Hidden when all filtered rows are shown and in L5 / L6. Reset to 10 when a
  filter, the query or the sort changes.
- The desktop Pager (listParts.tsx:236-344, per-page pill, numbered pages) gets
  `max-lg:hidden` (fixes m4, R-F06, R-F10 pager part on phones).

#### 2.1.7 «Документи повернення» modal (L7) [orders-list owns DocumentsModal.tsx; shared Modal718 + DocumentRow]
Master pattern: D7 (DocumentsModal with <= 3 tiles = short centred modal), TR-17,
TR-25. Same component as the orders tab; returns passes title «Документи
повернення», meta «№48291061» (dot) «23.05.2026» (ModalMeta parts: order number + RETURN date,
OrdersView.tsx:589-596) and `returnDocuments(ret, order)`.
- Card: `w-[calc(100%-48px)]` = 342 at 390 / 272 at 320, white r32, 1-px #8e8e8f
  ring, p 24, title 24/28 Bold -0.48 (2 lines at every phone width: about 287 px
  of text beside the cross), clear cross 24 glyph in a 44 hit box, meta 16/24 #343435 16 below.
- 24 below: TR-25 DocumentRows (S9 anatomy, the same rows as 2.2.5), then 24, full-width accent
  Button/Small «Завантажити усі документи» (disabled when nothing is ready) with
  the narrow-pill fit below 360 (S14).
- At 320 x 568 the card is ~556 tall > 520 available: the card scrolls inside
  (max-height 100dvh - 48) and the action row stays pinned at the card bottom
  (S4 sticky actions), so the CTA is always visible (fixes m6 and the hidden-CTA
  note of OL-V07).
- Focus: opens on the cross; closes on cross / Escape / scrim; focus returns to the row's documents disc (useModalBehavior, works).

#### 2.1.8 Back navigation (L9) [orders-list]
- Coming back from `/orders/returns/<id>` must restore the query, the three
  filters, the sort, the number of loaded rows and the scroll position (the
  tapped row back under the finger). Today the filters reset to «Останні 30
  днів» (R-F07). Mechanism owned by orders-list (URL query per its functional
  proposal 3 or sessionStorage `binar.orders.list.v1:<tab>`); the loaded-row
  count must be part of it, otherwise the page is shorter than the restored
  scroll offset.
- Tabs keep `history.replaceState` (R-F18 rejected, see 3).

### 2.2 /orders/returns/[id] (return details)

Top to bottom at 390. Order on phones = head -> summary + total -> returned
lines -> «Деталі повернення» -> «Документи повернення» -> legal bar (fixes M2;
identical order to /orders/[id], order-detail proposal P-02..P-07).

| # | Block | y at 390 (D1 withdrawable / D2 final) | Owner |
|---|---|---|---|
| 1 | Head: back crumb, title, badge, action | 66 + 48 = 114 .. 378 / 114 .. 304 | [shared] CabinetPageHead + [returns] props |
| 2 | «Підсумок» key/value card + dark total band | 426 / 352, 596 tall | [returns] composition on [shared] KeyValueCard + TotalCard |
| 3 | «Товари» line items | +24 | [returns] composition on [shared] LineItemList |
| 4 | «Деталі повернення» key/value card | +24 | [returns] on [shared] KeyValueCard |
| 5 | «Документи повернення» rows + download-all | +24 | [returns] on [shared] DocumentRow |
| 6 | legal bar | +48 | [shell] |

Body wrapper: DetailsBody phone (S12): `px-6`, blocks 24 apart (D10), the right
column (summary + total) first via `max-lg:order-first`, its clip r32.

#### 2.2.1 Head [shared CabinetPageHead phone variant, props from ReturnDetailsView.tsx:96-111]
Master pattern: TR-03, TR-04, TR-05 (article crumb 3176:6558), D9, D10.

| Element | Phone geometry | Classes / props |
|---|---|---|
| top padding | 48 below the header (D10) | CabinetPageHead section `pt-12` |
| back crumb | «До замовлень» -> `/orders?tab=returns`; 40 disc + 16 + label 16/22 SemiBold #343435 (BackCrumbBody, unchanged), 168 x 40 at x 24 y 114; hit area 44 via a pseudo, no layout change (m8, R-F10) | BackButton gets `relative before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-['']` [shared] |
| title | 24 below the crumb (y 178); «Замовлення» Bold + forced break + «№48291061» Light, H2 30/36 -0.6, always 2 lines (72) at 320..639 (Bold part 191 px, Light part 161 px; together 352 > 342, so without the break it flips to 1 line at 430) | ReturnDetailsView title: `<>Замовлення{" "}<br className="lg:hidden" /><TitleLight>№{order.number}</TitleLight></>`; h1 classes per S2 |
| badge row | 16 below the title (y 266): ReturnStatusBadge 38 | `meta` slot, `flex flex-wrap items-start gap-2` |
| action (D1 only) | 32 below the badge (y 336): one hug Button/Small 42, left aligned, «Скасувати повернення» 226 x 42 (label 178 + 48), outlinedDark | `<Button variant="outlinedDark" onClick=...>` - 42 on phones through D8 (S1); fallback if S1 is late: `size="responsive"` (desktop-identical) |
| bottom padding | 48 to the first block (TR-03 head -> first block) | CabinetPageHead section `pb-12` |

Head height: D1 360 (first block y 426), D2 286 (first block y 352). Today 383 /
309 with the strip, 32/36 title and a 48.5 button.

#### 2.2.2 «Підсумок» card + total band (right column, first on phones)
Master pattern: TR-27 key/value rows (footer contact row on light 3111:14916),
D9, D5, TR-20 / D9 for the amount; fixes M2, M3, m1, R-F08, R-F09, m11, R-F12, n1.

Right column (DetailsBody, S12): `flex w-full shrink-0 flex-col overflow-clip
rounded-[32px] max-lg:order-first lg:w-[494px] lg:rounded-3xl`. Children:
1. desktop SummaryCard, hidden on phones (`className="max-lg:hidden"`, S12;
   it keeps the status row with the (i) glyph on desktop);
2. phone twin `<KeyValueCard className="lg:hidden" flush title="Підсумок" rows={...} />` (S10);
3. TotalCard with the phone stacked layout (S12).

Phone summary card (white, p 24, no own radius because the column clips it):
- title «Підсумок» `text-title-lg text-neutral-900` (22/28 SemiBold, D9) at y 450;
- 24 below: rows, each `flex flex-col gap-2 border-t border-stroke-subtle py-4
  first:border-t-0 first:pt-0 last:pb-0`; label `text-[14px] font-medium leading-5
  text-neutral-500` (Medium 14/20 #777779); value `text-[16px] leading-6 text-neutral-900`
  (16/24 Regular, wraps, never truncated, never underlined unless it is a link):

| Row | Value | Note |
|---|---|---|
| «Номер замовлення» | «48291061» as a phone link to `/orders/<orderId>`: `underline decoration-1 underline-offset-4` (footer link value idiom 3111:14916), aria-label «Відкрити замовлення №48291061» | fixes R-F09 (no path from a return to its order) |
| «Дата замовлення» | `formatDate(order.date)` | |
| «Дата повернення» | `formatDate(ret.date)` - phone-only row (desktop has no such row) | fixes m11 / R-F12 (the return date is shown nowhere on the detail) |
| «Створив замовлення» | `order.createdBy`, plain (not ExtraBold, not underlined: it is not a link) | fixes R-F09 dead affordance |
| «Контрагент» | `order.counterparty`, plain, wraps (283 px max -> 2 lines at 320/360) | fixes m1 / R-F08 (140-px clip, ragged alignment) |

- «Статус повернення» row is NOT in the phone card: the head badge above
  says it (M2); the decorative (i) glyph therefore never appears on phones (n1).
- Height at 390: 24 + 28 + 24 + (68 + 3 x 85 + 69) + 24 = 492.

Total band (TotalCard, S12 in place): #1d1d1f, p 24; label «Сума повернення»
14/20 Medium #8e8e8f; 8 below the value 22/28 SemiBold -0.44 white nowrap
(D9 amounts, TR-27 headline value); always stacked, so the height is 104 at
every width and every amount (fixes M3 wrap on 6 of 12 returns at 390, all at
320/360). Bottom corners come from the column clip (r32).

#### 2.2.3 «Товари» line items (phone twin of ItemsTable)
Master pattern: TR-08 (product line items: hero trust row 3085:3718 anatomy at
the 64 size), TR-07 panel, D5, D11; code recipe checkout/CheckoutItems.tsx:155-186.
Fixes M1, R-F03.

- Desktop ItemsTable hidden on phones (`className="max-lg:hidden"`, S12).
- Phone twin: `<LineItemList className="lg:hidden" title="Товари" aside="3 позиції" items={...} />` (S11).
  Same title as the order page (order-detail P-05) so both detail pages read
  the same; the count uses `позиція / позиції / позицій` (1 / 2-4 except 12-14 /
  other).
- Card: `flex flex-col gap-6 rounded-[32px] bg-white p-6`; head row `flex items-baseline
  justify-between gap-4`: title `text-title-lg text-neutral-900`, aside
  `whitespace-nowrap text-[14px] leading-5 text-neutral-500`.
- Row (li): `relative flex flex-col gap-3 border-t border-stroke-subtle py-6
  first:border-t-0 first:pt-0 last:pb-0`.
  - top: `flex items-start gap-4`: photo `relative size-16 shrink-0 overflow-clip
    rounded-2xl bg-bg-subtle` + `<img className="absolute inset-0 size-full object-cover">`
    (64 r16, D5); column `flex min-w-0 flex-1 flex-col gap-1`: name
    `line-clamp-3 text-title-sm text-neutral-900` (16/22 Bold), article
    `whitespace-nowrap text-[14px] leading-5 text-neutral-500` («Артикул: BT-SP-040»,
    max 135 px, never splits at the hyphen: R-F03).
  - line 2 (12 below, full row width): `flex items-baseline justify-between gap-4`:
    left returned quantity «200 шт» `whitespace-nowrap text-[14px] leading-5
    text-neutral-500`; right line sum «6 330,00 ₴» `whitespace-nowrap text-[16px]
    font-semibold leading-[22px] text-neutral-900` (SUM_COLUMN value, detailParts.tsx:80-85).
  - line 3 (12 below, returns only, the `note` slot): `text-[14px] leading-5
    text-neutral-500` «Причина: » + `<span className="text-neutral-900">Брак</span>`
    (TR-27 label/value colours; «Причина: Пошкоджено при доставці» = 234 px: one
    line at >= 360, two at 320).
- Name clamp: 3 lines (TR-08 says 2; at 320 the column is 144 px and «Шампунь
  для волосся і тіла, 40мл, Botanica» needs 3 lines; touch has no title tooltip,
  so the third line is allowed instead of an ellipsis). At >= 360 every seeded
  name fits 2 lines (column 184 at 360, 214 at 390).
- Row height at 390 (1-line name): 24 + 64 + 12 + 22 + 12 + 20 + 24 = 178;
  2-line name: col 68 -> 182.
- No horizontal scroller at any width (hScroller must be 0).

#### 2.2.4 «Деталі повернення» (phone twin of InfoCard)
Master pattern: TR-27; fixes m7 (values truncated at 320).
- Desktop InfoCard hidden on phones (`className="max-lg:hidden"`, S12).
- Phone twin `<KeyValueCard className="lg:hidden" title="Деталі повернення" rows=[
  {label: "Бажане рішення", value: ret.solution},
  {label: "Варіанти зворотньої доставки", value: ret.delivery}] />` - same row
  recipe as 2.2.2, card `rounded-[32px] bg-white p-6`, title -> rows 24.
- «Відправити поштою (Нова Пошта)» (257 px) wraps to 2 lines at 320; nothing
  truncates.
- Height at 390: 24 + 28 + 24 + 68 + 69 + 24 = 237.

#### 2.2.5 «Документи повернення» (phone twin of DocumentsCard)
Master pattern: TR-25 (document rows: hero trust row 3085:3718 + footer row
padding), TR-06 (head-row link moves under the list), D8 (full-width pill),
D11. Fixes M6, R-F04, m8 / R-F10 (231 x 22 text button).
- Desktop DocumentsCard hidden on phones (`className="max-lg:hidden"`, S12).
- Phone card `flex flex-col gap-6 rounded-[32px] bg-white p-6 lg:hidden`:
  title «Документи повернення» `text-title-lg` (256 px: 2 lines at 320, 1 line
  from 360); 24; `<ul>` of DocumentRow (S9) for `returnDocuments(ret, order)`;
  24; `<Button variant="outlinedDark" size="small" fullWidth disabled={!anyReady}
  onClick={() => downloadAll(docs)} className={NARROW_PILL}>Завантажити усі документи</Button>`
  (label 213 px + 48 = 261: fits the 294 / 264 inner at 390 / 360; below 360 the
  narrow-pill fit drops the label to 14 px = 186 + 24 = 210 <= 224, S14). Full
  width rather than the TR-06 right-aligned hug: a 261-px hug pill in a 294-px
  card leaves a 33-px ragged gap (D8 full-width pills).
- Row anatomy: see S9. With the seeded documents: «Рахунок на оплату» (1 line at
  >= 360), «Видаткова накладна №5827» (2 lines at 360-600, 3 at 320), pending
  «Надходження на рахунок» + «З'явиться після оплати» (no actions, greyed).
- Interactions: tap a ready row -> preview in a new tab (`openDocument`,
  DocumentsModal.tsx:14-16); the trailing download glyph -> download (link with
  `download`); download-all -> `downloadAll` (R-F14 stays, see 3).

#### 2.2.6 Withdraw: confirm modal (D3) and result (D4)
Master pattern: D7 / TR-17 short modal (hero text card ring, Quizz card title
size), TR-04 action order, TR-31 toast. Fixes M5 (modal part), m5, m12, R-F11.
- Trigger: head «Скасувати повернення» (2.2.1). Component: ConfirmModal
  (ReturnDetailsView.tsx:156-167) on Modal718 - no returns-specific layout; it
  inherits S4 (phone card) + S1 (42 pills) + S5 (gap 8).
- Card at 390: x 24, 342 wide, white r32, 1-px #8e8e8f, p 24; title «Скасувати
  повернення?» 24/28 Bold -0.48 (2 lines); clear cross 24 in a 44 hit box top
  right; 16 below: body 16/24 #343435 «Запит на повернення за замовленням
  №48291061 буде скасовано. Цю дію неможливо скасувати.» (4 lines at 320, 3 at
  390); 24 below: «Повернутись» outlinedDark full width 42, 8, «Скасувати
  повернення» solid full width 42 (secondary first, destructive last: TR-04;
  keeps the master's black confirm, ReturnDetailsView.tsx:51-55). Height ~332 at
  320: fits 568 - 48 without scrolling.
- Scrim / scroll lock / focus trap: unchanged (useModalBehavior: html overflow
  hidden, Tab trap, Escape, scrim tap). Cancel paths (cross, Escape, scrim,
  «Повернутись») return focus to the head button (works today, keep).
- Confirm: `withdrawReturn(ret.id)`; modal closes; the badge flips to
  «Скасовано»; the action row unmounts (content moves up 74 = 32 + 42; accepted,
  the toast explains it); focus goes to the page title (h1, `tabIndex={-1}`,
  `outline-none`) through the new `returnFocus` (S6) because the opener is gone
  (today: <body>); a toast «Запит на повернення скасовано» appears (S7, role=status,
  4 s, bottom-centred 24 above the safe area). The toast is phone-only in this
  pass (`lg:hidden`, desktop frozen); the focus fix applies at every width (no
  pixel change).
- The list row of the same return shows «Скасовано» (store) and the order page
  offers «Оформити повернення» again (works today, keep).

#### 2.2.7 Not found (D5) [returns]
Master pattern: TR-24 (minus its Title Large: the H2 above already names the
state), TR-03. Fixes m10.
- Head unchanged: back crumb «До замовлень» + H2 «Повернення не знайдено»
  (378 px: 2 lines at 320-429, 1 line at 430+; natural wrap).
- 48 below (head pb): `<div className="px-6 lg:hidden">` with the panel
  `flex flex-col items-center rounded-[32px] bg-white px-6 py-12 text-center`:
  text `max-w-[294px] text-[14px] leading-5 text-neutral-500` «Можливо, запит
  створив інший партнер або посилання застаріло.»; 32; hug Button/Small solid
  «До повернень» (109 + 48 = 157 x 42) -> `/orders?tab=returns`.
- Same state for an unknown id, a non-numeric id and the fresh partner.
- Desktop keeps its bare head (the panel is phone-only).

#### 2.2.8 Signed out / B2C (D6) and loading (D7) [shell]
- SignInPrompt «Деталі повернення» + DETAILS_PROMPT_TEXT (data.ts:131) per the
  shell spec; it must reserve its space before hydration instead of returning
  null (R-F13, SignInPrompt.tsx:19).
- Pre-hydration: the B2B gate (PlatformChrome) keeps the page hidden; no
  skeleton (works, keep).

#### 2.2.9 Stretch 320..639 (both routes)
- Gutters stay 24, cards stretch (content 272..591, card inner 224..543),
  heights fixed by the recipes above. Card titles may wrap to 2 lines at 320
  («Документи повернення», «Повернень не знайдено»). Nothing has a fixed width
  except the 46 discs, the 64 photos, the 48 file tiles and the 44 hit boxes.
- At 600 the twins still render (phone layout until 639.98); the layout is the
  390 layout with wider cards (no two-column grids, D13 no tablet layout).

### 2.3 Interactions summary

| From | Action | Result |
|---|---|---|
| list row | tap (not on the documents disc) | navigate to /orders/returns/<id> |
| list row documents disc | tap | DocumentsModal (centred card, D7) |
| search row filter disc | tap | full-screen filter sheet (TR-09), html scroll lock, focus on the sheet |
| filter sheet | «Показати N» | apply, close, list from row 1, load-more reset |
| applied chip x | tap | remove that filter (no sheet) |
| sort trigger | tap | anchored TR-11 menu (342 wide), pick -> resort, close |
| «Показати більше» | tap | +10 rows, counter updates (aria-live) |
| detail back crumb | tap | /orders?tab=returns with the list state restored (L9) |
| «Номер замовлення» value | tap | /orders/<orderId> |
| document row | tap | preview in a new tab; trailing glyph downloads |
| «Скасувати повернення» | tap | ConfirmModal -> D4 |

No sticky bars on these screens (TR-18: the only primary action, «Скасувати
повернення», is in the first viewport).

------------------------------------------------------------------------------

## 3. Bugs to fix (merged from both lenses)

Ids RT-xx; sources in brackets. Severity: blocker / major / minor / nit.
"Owner" says which spec's builder lands the fix.

| Id | Sev | Where | What | Fix | File:line | Owner |
|---|---|---|---|---|---|---|
| RT-01 | blocker | /orders?tab=returns, 320-600 | Returns list is an 1180-px table in a 342 (272 at 320) scroller: status, documents and the only link (chevron at x 1098-1122) need 3 swipes; the row itself is not a link; no scroll hint [B2, R-F01, OL-V03, OL-V19] | TR-07 phone panel of RecordRows with a stretched row link (2.1.4); table `max-lg:hidden` | OrdersView.tsx:263-357 (278-279) | returns (rows) + orders-list (mount) |
| RT-02 | blocker | list, fresh partner and «zzzz» | Empty / no-match message is a 1132-px `td colSpan=9` centred off-screen: blank 200-px box; no-match still shows «0-0 із 0» + «Показувати по: 10» [B1, R-F02] | TR-24 panel inside the phone list (2.1.5), pager hidden | OrdersView.tsx:300-309, TableEmptyRow.tsx:58-69, OrdersView.tsx:576-587 | returns + orders-list |
| RT-03 | major | detail, all ids | Returned-lines table 720 in 342: names cut to 120 px, «Артикул» splits at the hyphen, Сума and Причина повернення off-screen, Кількість cut at 320 [M1, R-F03] | LineItemList twin (2.2.3) | detailParts.tsx:89-136 (53, 56, 91-92), ReturnDetailsView.tsx:63-68, 116 | returns (composition) + shared (atom) |
| RT-04 | major | detail | Key facts (sum, author, counterparty) at y 2224 of 2425, after 622 px of documents; status shown twice [M2] | summary + total first (`max-lg:order-first`), phone status row dropped (2.2.2) | detailParts.tsx:16-23, ReturnDetailsView.tsx:113-154 | shared (DetailsBody) + returns |
| RT-05 | major | detail 320-390 | Summary rows wrap at random (38 / 52 / 66 tall, left vs right values); total wraps on 6 of 12 returns at 390 and all at 320/360 [M3, R-F08] | TR-27 stacked KV rows (phone twin) + stacked TotalCard (104 at every width) | detailParts.tsx:244-254, 301-323 | returns + shared (TotalCard) |
| RT-06 | major | list 390 | 442 px of chrome (head, tabs, four stacked 46-px controls) before the first row; at 320 x 568 the first row is below the fold [M4] | TR-10 search row + filter sheet + meta/sort line (2.1.3): first row at y 464 instead of 654 | OrdersView.tsx:529-564, listParts.tsx:137-159, Select.tsx | orders-list |
| RT-07 | minor | list 320, counterparty select | Select menu `min-w-max` is 320 wide from x 24 -> right edge 344, longest option clipped [R-F05, OL-V05] | on phones the select is replaced by the sheet group (option rows wrap); Select keeps `min-w-max` on desktop; add `max-lg:max-w-[calc(100vw-48px)]` + wrapping options as a guard for any remaining phone Select | Select.tsx:112 | orders-list / shared |
| RT-08 | minor | list 320, page-size menu | Listbox `left-0 min-w-[120px]` from x 233 -> 353 > 320, overlaps the legal bar [R-F06] | the Pager is `max-lg:hidden` (2.1.6) | listParts.tsx:283-288 | orders-list |
| RT-09 | nit | list 320 x 568 | Period / status menus open below the fold, the page does not scroll to them [R-F15] | no dropdown Selects on phones (sheet); sheet groups scroll inside the sheet | OrdersView.tsx:531-563 | orders-list |
| RT-10 | major | detail head, confirm modal, docs modal | Button default "large" renders 48.5 tall, 15 px Regular on phones (not Button/Small) [M5] | D8 fix in Button.tsx (S1); returns call sites need no change | ReturnDetailsView.tsx:106, ConfirmModal.tsx:47-52, DocumentsModal.tsx:76-83, Button.tsx:80-83 | shared |
| RT-11 | major (320) / minor | detail documents card | Grey r24 tiles nested in a p24 card: names cut to 178 px at 390, 108 at 320 («Рахунок на оп...», «Надходжен...», «З'явиться післ...»); actions dropped under the info (164-tall tiles); meta wraps in some tiles only [M6, R-F04] | TR-25 DocumentRow twin (2.2.5, S9): 3-line name clamp, meta wraps by whole parts, no nested tile | DocumentTile.tsx:52, 65, 72, 77-84, 90; detailParts.tsx:215-238 | returns + shared |
| RT-12 | minor | detail summary | Counterparty clipped to 140 px with free space beside it; misaligned when the row wraps (x 104 vs 48) [m1, R-F08] | phone KV value full width, wraps, left aligned (2.2.2) | detailParts.tsx:267-278 (272) | returns |
| RT-13 | minor | list + detail + not-found heads | Titles 32/36 (off the mobile scale); detail title flips 2 lines -> 1 line at 430 [m2, shell #14] | H2 30/36 via CabinetPageHead phone variant (S2); forced break `<br className="lg:hidden" />` in the detail title | CabinetPageHead.tsx:68, ReturnDetailsView.tsx:98-102 | shared + returns |
| RT-14 | minor | list tabs | Desktop segmented pill (#e8e8e9 track, 46 pills) [m3, OL-V09] | TR-13 chip row (2.1.2) | OrdersView.tsx:656-677 | orders-list |
| RT-15 | minor | list bottom | Desktop pager on phones; still «1-1 із 1» + «Показувати по: 10» with one result; per-page menu style differs from the filter menus [m4] | D4 LoadMore, pager `max-lg:hidden` (2.1.6) | listParts.tsx:236-344 | orders-list + shared |
| RT-16 | minor | confirm modal 320-600 | 358-wide card on 16-px gutters, description 18/26 #1d1d1f, cross 32 x 32, buttons 48.5 and 16 apart [m5] | TR-17 card (S4) + D8 pills + 8-px stack (S5) | Modal718.tsx:88-142, 215; ConfirmModal.tsx:47-52 | shared |
| RT-17 | minor | list documents modal | Title 2 lines, 140/164-tall tiles, 124-px names at 320, card scrolls at 320 x 568 with the CTA hidden under the fold, 48.5 accent CTA [m6, OL-V07] | TR-17 card + TR-25 rows + pinned actions (2.1.7, S4, S9) | DocumentsModal.tsx:68-91, DocumentTile.tsx | orders-list + shared |
| RT-18 | minor | detail «Деталі повернення» at 320 | ReadField values one-line truncate in 224 («Привезти на склад самостій...», «Відправити поштою (Нова П...») [m7] | phone KV twin, values wrap (2.2.4) | detailParts.tsx:141-150 (146) | returns |
| RT-19 | minor | list + detail | Tap targets < 44: «Завантажити усі документи» text button 231 x 22, page-size pill 59 x 34, pager 40, modal cross 32, row icon buttons 42, back link 168 x 40, document glyphs 24 (40 via before) [m8, R-F10] | full-width 42 pill (2.2.5), pager hidden, cross 44 (S4), row discs 46 (2.1.4), back crumb pseudo 44 (S2), download glyph 44 (S9) | detailParts.tsx:221-229, listParts.tsx:277, 313-336, Modal718.tsx:113-121, listParts.tsx:229-230, DocumentTile.tsx:37-38 | returns + shared + orders-list |
| RT-20 | minor | detail (and every cabinet card) | Cards r24 and 26 apart, nested r24 tiles [m9] | D5 r32 top-level cards on phones, D10 24 apart (S12 DetailsBody / CARD) | detailParts.tsx:18-27 | shared |
| RT-21 | minor | detail not-found / fresh partner | Bare crumb + 2-line H1 then 420 px of empty grey [m10] | TR-24 phone panel with «До повернень» (2.2.7) | ReturnDetailsView.tsx:80-86 | returns |
| RT-22 | minor | list + detail | Two returns of order 48291061 (9104, 9093) are identical on the phone list (only the order number visible) and the detail never shows the return date [m11 part, R-F12, OL-V20] | row shows sum + status + return date and names them in the link label (2.1.4); phone «Дата повернення» row (2.2.2) | OrdersView.tsx:310-352, ReturnDetailsView.tsx:129-150 | returns |
| RT-23 | minor | detail + docs modal | Return documents are the order's papers, incl. «Надходження на рахунок / З'явиться після оплати» on rejected / cancelled returns [m11 part, R-F17] | REJECTED for this pass: content comes from data.ts:514-518, shared with the frozen desktop and drawn this way in the master 5192:79167; flagged to the user as a content question for the CRM integration | data.ts:516-518 | - (open point 7.12) |
| RT-24 | minor | detail after confirm | No feedback; focus falls to <body> because the opener unmounts; content jumps 72 [m12, R-F11] | toast (S7) + `returnFocus` to the h1 (S6, S2 `titleRef`); jump accepted | ReturnDetailsView.tsx:156-167, useModalBehavior.ts:76-82 | returns + shared |
| RT-25 | nit | detail summary, list head | (i) glyph after «Статус повернення» is aria-hidden, not focusable, no tooltip [n1, R-F09 part] | the phone summary has no status row and the phone list has no table head, so the glyph never renders below 640; desktop unchanged | detailParts.tsx:249, OrdersView.tsx:291 | returns |
| RT-26 | nit | list + detail | Counterparty underlined in the list; «Створив замовлення» / «Контрагент» ExtraBold underlined in the summary - look like links, are not [n2, R-F09 part] | plain text values on phones (2.1.4 line 3, 2.2.2) | OrdersView.tsx:320-322, detailParts.tsx:267-278 | returns |
| RT-27 | minor | detail | No link from a return to its order anywhere («Номер замовлення» is plain text) [R-F09 part] | phone «Номер замовлення» value = link to /orders/<orderId> (2.2.2) | ReturnDetailsView.tsx:136-138 | returns |
| RT-28 | minor | list Back | Back from a return resets the filters (period back to 30 days) and the horizontal table offset (825 -> 0) [R-F07] | the horizontal part disappears with RT-01; filters / sort / loaded rows / scroll restored (2.1.8) | OrdersView.tsx:361-389 | orders-list |
| RT-29 | minor | visitor / B2C on both routes | SignInPrompt returns null before hydration: footer paints under the header, then jumps ~260 px [R-F13] | render the prompt block (or a same-height placeholder) before hydration | SignInPrompt.tsx:19 | shell |
| RT-30 | minor | «Завантажити усі документи» (detail + modal) | One tap fires one programmatic download per ready document (3 for 9098): Mobile Safari keeps only the first, Chrome Android asks for a multi-download permission [R-F14] | REJECTED for this pass: a single archive needs a server (the placeholder documents share one URL); behaviour kept identical to desktop; every row has its own download on phones, so nothing is unreachable; flagged for the CRM integration | DocumentsModal.tsx:20-31 | - (open point 7.12) |
| RT-31 | nit | list search | No clear button (native cancel hidden, magnifier decorative) [R-F16, OL-V17] | 24 x glyph in a 44 hit box when the field is filled (2.1.3) | listParts.tsx:154-156 | orders-list |
| RT-32 | nit | list tabs | Tab switch uses replaceState, so Back from the returns tab leaves /orders [R-F18] | REJECTED: tabs must not create history entries (WAI-ARIA tabs pattern, no back-button trap); the URL keeps `?tab=returns`, so Back from a return detail lands on the returns tab | OrdersView.tsx:618-621 | - |
| RT-33 | nit | landscape 844 x 390 | Desktop canvas at zoom 0.586 [R-F19] | REJECTED: by architecture (>= 640 = desktop, D13 no tablet layout); the confirm modal fits | globals.css zoom | - |
| RT-34 | minor | every cabinet route | Strip labels 10 px, strip scrolls at 320, legal bar copyright ends at x 346 at 320, legal links are underlined spans [visual shell notes, R-F shell notes] | D1 (burger sheet, legal bar per D1) | SideMenu.tsx:53, 89; PlatformFooter.tsx:19, 31 | shell |

Counts: 34 findings; 4 rejected with reasons (RT-23, RT-30, RT-32, RT-33);
30 to fix (16 touch the returns files, the rest land through the shared layer and
the orders-list / shell builders, as tagged).

------------------------------------------------------------------------------

## 4. Shared needs (atoms and shell APIs)

Status: EXISTS = usable as is; CHANGE = existing atom gets phone classes or a
new prop (landing / desktop strings unchanged, pixel-guarded, D12); NEW = new
shared file.

| Id | Atom | Status | API | Phone classes / behaviour | Why (returns) |
|---|---|---|---|---|---|
| S1 | ui/Button.tsx size "large" phone strings | CHANGE (D8, in progress by the Button fix) | unchanged | phone strings of `labelSize.large` = the `small` strings (42 pill, 16/22 Medium, px 23); `arrowWrap.large` phone 42 | head «Скасувати повернення», confirm buttons, docs-modal CTA |
| S2 | platform/ui/CabinetPageHead.tsx phone variant + `titleRef` | CHANGE | `titleRef?: Ref<HTMLHeadingElement>` (when given, h1 gets `tabIndex={-1}` and `outline-none`) | section `flex flex-col gap-8 px-6 pb-12 pt-12 lg:flex-row lg:items-center lg:justify-between lg:gap-[26px] lg:pb-8 lg:pt-8 lg:pl-10 lg:pr-8` (physical lg:pt/pb so they beat the phone pt/pb whatever v4 emits for py); left column `flex min-w-0 flex-col items-start gap-4 lg:gap-6` with the phone back row `max-lg:mb-6` (48 to the title, SYSTEM A-2; the shell-cabinet 2.5.4 recipe wins over this row); title group `flex flex-col gap-4 lg:gap-2`; h1 `text-[30px] font-bold leading-9 tracking-[-0.6px] text-neutral-900 lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]` (H2 30/36 -0.6); subtitle `text-[14px] leading-5 text-neutral-500 lg:leading-6`; BackButton hit pseudo `relative before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-['']` | head geometry 2.2.1, focus target after withdraw (RT-24), RT-13 |
| S3 | platform/ui/CabinetPage.tsx slab | CHANGE (D1) [shell] | unchanged | `rounded-t-[32px] pb-12 lg:rounded-tr-none lg:rounded-tl-[48px] lg:pb-8` (verify the computed radii) | 2.0 |
| S4 | platform/ui/Modal718.tsx phone card (TR-17, D7) | CHANGE | new optional `returnFocus?: RefObject<HTMLElement \| null>` passed to useModalBehavior | overlay `p-6 sm:p-10`; card keeps `rounded-[32px] border-stroke-default py-[23px]`, rows `px-[23px]`; close `-mr-2.5 -mt-2.5 flex size-11 ... sm:m-0 sm:size-8` + `ClearIcon size-6 sm:size-8` (24 glyph centred in a 44 box whose glyph edge stays 24 from the card edge; the file already switches with sm:); description `text-[16px] leading-6 text-neutral-800 sm:text-[20px] sm:leading-7 sm:text-neutral-900`; when the card scrolls, the actions row is `sticky bottom-0` inside the card with a white background and a 1-px #d2d2d2 top line (TR-18), max height `calc(100dvh - 48px)` | confirm modal (RT-16), docs modal pinned CTA (RT-17) |
| S5 | ModalActions (Modal718.tsx:141-143) + platform/ui/ConfirmModal.tsx | CHANGE | ConfirmModal forwards `returnFocus?` to Modal718 | ModalActions `flex flex-col gap-2 sm:flex-row sm:gap-8` (8 apart, D7) | withdraw confirm |
| S6 | cart/useModalBehavior.ts | CHANGE | `returnFocus?: RefObject<HTMLElement \| null>` | on cleanup: focus the opener if `isConnected`, else `returnFocus.current` (lines 76-82) | RT-24 focus lands on <body> today |
| S7 | platform/ui/Toast.tsx (TR-31) | NEW | `useToast(): { show(message: string): void; node: ReactNode }` or `<Toast message={string \| null} onDone={() => void} className? />`; auto-hide 4000 ms; live region always mounted | wrapper `pointer-events-none fixed inset-x-0 bottom-0 z-[55] flex justify-center px-6 pb-[calc(24px+env(safe-area-inset-bottom))]` role=status aria-live=polite; pill `pointer-events-auto w-full max-w-[342px] rounded-3xl bg-[#2d2d2f] px-6 py-3 text-[14px] leading-5 text-white transition-[opacity,translate] duration-300 motion-reduce:transition-none` (hidden: `opacity-0 translate-y-2`); returns passes `className="lg:hidden"` | RT-24 feedback |
| S8 | platform/ui/RecordRow.tsx (TR-07 list panel + row) | NEW (shared with orders tab and dashboard) | `ListPanel({ children, className })` = `ul flex flex-col overflow-clip rounded-[32px] bg-white`; `RecordRow({ href, linkLabel, id, date, amount, sub?, badges, action?: { label, icon, onClick }, divider: boolean })` | exactly the classes of 2.1.4 | RT-01, RT-22, RT-26 |
| S9 | platform/ui/DocumentRow.tsx (TR-25) | NEW (also for the order page and the docs modal) | same props as DocumentTileProps (`name, meta, pending, href, downloadName, onPreview`) + `divider?: boolean` | li `relative flex items-center gap-4 py-4` (+ `border-t border-stroke-subtle` when divider; first row `pt-0`, last `pb-0` handled by the list); tile `relative size-12 shrink-0 overflow-clip rounded-xl` `bg-neutral-800 text-white` / pending `bg-button-disabled text-[#bbbbbc]`, glyph `absolute left-3 top-3 size-6`; column `flex min-w-0 flex-1 flex-col gap-1`; name = `<button>` when previewable: `line-clamp-3 cursor-pointer text-left text-title-sm text-neutral-900 after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` aria-label «Переглянути: {name}» (pending `<p>` `text-neutral-300`); meta `flex flex-wrap items-center gap-x-1 text-[14px] leading-5 text-neutral-500` with nowrap parts and the 14 dot; download `<a download aria-label="Завантажити: {name}" className="relative z-[1] -mr-[10px] flex size-11 shrink-0 items-center justify-center text-neutral-900 active:text-brand">` + DownloadIcon 24. Row height 80 (1-line name) / 100 (2) / 122 (3), +20 when the meta wraps (320) | RT-11, RT-17, RT-19 |
| S10 | platform/ui/KeyValueCard.tsx (TR-27) | NEW (also order page summary / delivery, profile) | `KeyValueCard({ title?, rows: { key?, label, value, href?, linkLabel? }[], flush?: boolean, className? })`; `flush` drops the radius (card inside a clipped column) | card `flex flex-col gap-6 bg-white p-6` + `rounded-[32px]` unless flush; title `text-title-lg text-neutral-900`; `<dl>` rows `flex flex-col gap-2 border-t border-stroke-subtle py-4 first:border-t-0 first:pt-0 last:pb-0`; dt `text-[14px] font-medium leading-5 text-neutral-500`; dd `text-[16px] leading-6 text-neutral-900`; link value `underline decoration-1 underline-offset-4 active:text-brand` | RT-05, RT-12, RT-18, RT-22, RT-26, RT-27 |
| S11 | platform/ui/LineItemList.tsx (TR-08) | NEW (also order page items, wizard rows) | `LineItemList({ title, aside?, items: { id, image, name, meta, left?, right?, note? }[], className? })` | classes of 2.2.3 | RT-03 |
| S12 | orders/detailParts.tsx (shared by both detail pages) | CHANGE | `className?: string` on ItemsTable, InfoCard, DocumentsCard, SummaryCard (appended to their root); no other API change | DetailsBody `flex flex-col gap-6 px-6 lg:flex-row lg:items-start lg:gap-[26px] lg:pl-10 lg:pr-8 lg:pt-4`, left column `flex min-w-0 flex-1 flex-col gap-6 lg:gap-[26px]`, right column `flex w-full shrink-0 flex-col overflow-clip rounded-[32px] max-lg:order-first lg:w-[494px] lg:rounded-3xl`; TotalCard section `flex flex-col gap-6 bg-[#1d1d1f] p-6 lg:gap-8 lg:p-8`, row `flex flex-col items-start gap-2 text-white lg:flex-row lg:items-center lg:justify-between lg:gap-4`, label `whitespace-nowrap text-[14px] font-medium leading-5 text-neutral-400 lg:text-[20px] lg:font-normal lg:leading-7 lg:text-white`, value `whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] lg:text-[24px] lg:tracking-[-0.48px]`; CARD `... rounded-[32px] lg:rounded-3xl gap-6 lg:gap-8` only if the desktop cards stay visible on phones anywhere (with the twins they do not) | RT-04, RT-05, RT-20 |
| S13 | platform/ui/EmptyPanel.tsx (TR-24) | NEW (orders, assortment, profile lists) | `EmptyPanel({ title?, text?, action?, icon?, className? })` | `flex flex-col items-center rounded-[32px] bg-white px-6 py-12 text-center`; title `text-title-lg text-neutral-900`; text `mt-4 max-w-[294px] text-[14px] leading-5 text-neutral-500` (no `mt-4` without a title); action `mt-8` | RT-02, RT-21 |
| S14 | narrow-pill fit for long Button/Small labels below 360 | NEW constant (precedent auth/AuthDrawer.tsx:136 PHONE_PILL) | `export const NARROW_PILL = "max-[360px]:[&>span]:px-[11px] max-[360px]:[&>span]:text-[14px]"` in ui/Button.tsx (or a `fit="narrow"` prop) | label 14 px and px 11 below 360 only | «Завантажити усі документи» (261 px) in a 224-px card at 320 |
| S15 | LoadMore (TR-12 / D4) | NEW (orders, returns, assortment, materials, catalog) | `LoadMore({ shown, total, onMore, className? })`; renders nothing when `shown >= total` | `mt-12 flex flex-col items-center gap-4`; counter `<p aria-live="polite" className="text-[14px] leading-5 text-neutral-500">Показано {shown} із {total}</p>`; `<Button size="small" plus onClick={onMore}>Показати більше</Button>` | RT-15, 2.1.6 |
| S16 | FullScreenSheet + FilterSheet + applied chips + SortMenu (TR-09 / TR-10 / TR-11) | NEW [shared sheet atom; orders-list composes] | `FullScreenSheet({ open, onClose, title, footer?, children })`; the orders FilterSheet takes `groups: { key, title, options: { value, label }[], value, onChange, caption? }[]` | per D7 / TR-09: 66 bar (Title Large title + 24 cross in a 48 box at x 342), body px 24 pt 24, `h-dvh`, html scroll lock, safe-area footer | RT-06, RT-07, RT-09, 2.1.3 |
| S17 | chip tabs (TR-13) | CHANGE [orders-list, OrdersView.tsx:656-677] | unchanged tablist API | 2.1.2 classes + `lg:` restoring the pill | RT-14 |
| S18 | SearchField clear button | CHANGE [orders-list, listParts.tsx:137-159] | unchanged | 44 hit box x glyph when value != "" | RT-31 |
| S19 | SignInPrompt pre-hydration placeholder | CHANGE [shell] | unchanged | same-height invisible block before hydration | RT-29 |
| S20 | Cabinet header + burger sheet, legal bar | CHANGE (D1) [shell] | - | D1 | RT-34, all y values |

Atoms that EXIST and are used unchanged: ReturnStatusBadge / StatusPill (TR-14),
BackButton / BackCrumbBody (TR-05), OrderDocumentsIcon, ArrowUpRight
(blog/icons.tsx), DownloadIcon / DocumentGlyph / ClearIcon (platform/ui/icons.tsx),
`openDocument`, `downloadAll`, `documentMeta` (orders/DocumentsModal.tsx),
`withdrawReturn`, `useReturn`, `useReturns`, `useOrders` (orders/store.ts),
formatters in orders/data.ts.

------------------------------------------------------------------------------

## 5. Files

### 5.1 This area's files (disjoint)

| File | Change |
|---|---|
| src/components/platform/orders/ReturnDetailsView.tsx | MODIFY: (a) title with the phone forced break; (b) `titleRef` on CabinetPageHead + `returnFocus={titleRef}` on ConfirmModal; (c) wrap/flag the desktop blocks `max-lg:hidden` (ItemsTable, InfoCard, DocumentsCard, SummaryCard via the S12 `className`); (d) phone twins `lg:hidden`: KeyValueCard «Підсумок» (flush, 5 rows incl. the order link and «Дата повернення») in the right slot before TotalCard, LineItemList «Товари» with the reason note, KeyValueCard «Деталі повернення», documents card with DocumentRows + the full-width download-all Button (NARROW_PILL); (e) not-found branch: the phone EmptyPanel with «До повернень»; (f) toast «Запит на повернення скасовано» (phone only) on confirm; (g) `positionsPlural` helper (local) |
| src/components/platform/orders/ReturnRows.tsx | NEW: `export type ReturnRow = { ret; order; total }` (moved from OrdersView.tsx:261); `ReturnRowList({ rows, empty: "none" \| "noReturns" \| "noMatches", onDocuments, onReset, className })` = ListPanel of RecordRows (2.1.4) or the EmptyPanel copy (2.1.5); `returnRowLabel(row)` for the link aria-label |

No change: src/app/orders/returns/[id]/page.tsx, src/app/orders/returns/page.tsx,
data.ts (RT-23 rejected), store.ts.

### 5.2 Files this area depends on (owned elsewhere, listed under 4)

- src/components/platform/orders/OrdersView.tsx [orders-list]: mount
  `<ReturnRowList className="lg:hidden" rows={filtered.slice(0, shown)} .../>`
  in ReturnsTab, `max-lg:hidden` on the ReturnsTable wrapper and the Pager,
  phone LoadMore / search row / sheet / chips / sort, import `ReturnRow` from
  ReturnRows.tsx, list-state restore.
- src/components/platform/orders/detailParts.tsx [shared / order-detail] (S12).
- src/components/platform/orders/listParts.tsx [orders-list] (S18, Pager hide).
- src/components/platform/orders/DocumentsModal.tsx [orders-list] (rows -> S9).
- src/components/platform/ui/{CabinetPageHead, CabinetPage, Modal718,
  ConfirmModal, SignInPrompt, Select}.tsx [shared / shell] (S2-S5, S19, RT-07).
- NEW src/components/platform/ui/{Toast, RecordRow, DocumentRow, KeyValueCard,
  LineItemList, EmptyPanel, LoadMore, FullScreenSheet}.tsx [shared] (+ exports
  in platform/ui/index.ts).
- src/components/ui/Button.tsx [shared] (S1, S14), src/components/cart/useModalBehavior.ts [shared] (S6).
- platform/PlatformHeader.tsx, SideMenu.tsx, PlatformFooter.tsx, PlatformChrome.tsx [shell] (S20).

------------------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Setup: dev server http://localhost:3000; kit audit/mobile/kit/phone.mjs (touch
emulation, DPR 1). Use `scrollTo({behavior:"instant"})` before shots
(recipes gotcha 10); judge focus rings with real taps (gotcha 14). Re-seed b2b
before each withdraw run (withdrawals persist in `binar.orders.v1:demo-b2b`).

### 6.1 Desktop / landing pixel guard (first and last)
- BEFORE the build, the builder shoots extra desktop states into
  audit/mobile/returns/desktop-before/ (not in the 76 baseline shots): seed b2b at
  640 x 900, 1024 x 768 and 1710 x 1117 full page: /orders?tab=returns, the same
  with status «Скасовано», search «zzzz», fresh partner; /orders/returns/9104,
  9097, 1234; the ConfirmModal open on 9104 (1710); the documents modal open from
  row 1 (1710).
- AFTER: `node audit/mobile/kit/compare.mjs audit/mobile/baseline audit/mobile/after`
  -> 0 differing files except the expected phone shots
  phone-390-cabinet-orders-returns.png, phone-390-cabinet-return-detail.png (and the
  other phone cabinet shots changed by the shell); cabinet-1710-orders-returns.png,
  cabinet-1710-return-detail.png, cabinet-1710-orders.png and every landing-*
  shot identical. The desktop-before set re-shot after the build: 0 differing
  pixels.

### 6.2 Widths and routes
Widths 320 x 568, 360 x 780, 390 x 844, 430 x 932, 600 x 960 for: L1, L2, L4, L5,
L6, L7, D1 (9104), D2 (9097), D3, D4, D5 (1234 and fresh on 9104); all 12 ids
at 390; 9099 / 9100 / 9103 / 9104 at 320 (longest names / counterparty / delivery).

### 6.3 Measurements (390 unless noted; tolerance 0.5 px)
List:
- no strip; slab top y 66 with r32 top corners (shell).
- panel x 24, w 342 (272 at 320, 552 at 600), radius 32, white, no border; rows
  216 tall (236 when the counterparty wraps), px 24, py 24; dividers 1 px #d2d2d2
  at x 48..342 (inset 24); id 16/22 700; date 14/20 #777779; sum 22/28 600 -0.44;
  counterparty 14/20 #343435, no underline; badge 38; both discs 46 x 46, 1-px
  #1d1d1f ring; every row: `elementFromPoint` at the row centre resolves inside
  the row link; at the documents disc centre it resolves to the button.
- load-more: counter 14/20 #777779 centred, button 42 tall, 48 below the panel,
  16 between counter and button; gone after one tap with 12 returns.
- empty panels: title 22/28 600, text 14/20 #777779 <= 294 wide, py 48; no
  pager text anywhere (search «Показувати по» -> 0 matches).
- returns table and Pager computed `display: none` below 640, visible at 640.
Detail (9104):
- back crumb y 114, 40 tall, hit area >= 44 (pseudo); h1 y 178, 30/36 700
  -0.6, exactly 2 lines at 320, 360, 390, 430, 600 (72 tall), Light part 300;
  badge y 266; button y 336, 42 tall, 16/22 500, x 24, width 226 +-2; first card
  y 426 (9097: 352).
- right column is first visually (y 426, `order` -1 below 640; DOM order unchanged), radius 32; summary
  title 22/28 600; 5 rows, labels 14/20 500 #777779, values 16/24 #1d1d1f, 8
  apart, rows separated by 1-px #d2d2d2; no «Статус повернення» row, no (i)
  glyph; «Номер замовлення» value is an <a href="/orders/<id>">; «Дата повернення»
  = 23.05.2026; counterparty not truncated (scrollWidth == clientWidth).
- total band 104 tall at every width and for every id (check 9102 6 330,00 ₴,
  9096 6 810,20 ₴ at 320); label 14/20 500 #8e8e8f; value 22/28 600 white.
- items card 24 below the total; photo 64 r16; name 16/22 700, no ellipsis at >=
  360, at most 3 lines at 320; article never wraps; qty / sum line; «Причина: ...»
  line; no element with scrollWidth > clientWidth in the card.
- «Деталі повернення»: 2 rows, values wrap (no `text-overflow: ellipsis`).
- documents card: rows 80 / 100 / 122 tall (1 / 2 / 3-line name; +20 when the meta line wraps at 320), tile 48 r12, download hit 44; pill
  294 x 42 (224 x 42 with a 14-px label at 320, 264 x 42 with 16 px at 360).
- last card -> legal bar 48.
Confirm modal (390 and 320 x 568): card x 24, w 342 (272), r32, 1-px #8e8e8f,
p 24; title 24/28 700; close hit 44, glyph 24; body 16/24 #343435; buttons 42,
8 apart, «Повернутись» first; card fully inside the viewport, no inner scroll at
320 x 568.
Documents modal at 320 x 568: CTA visible without scrolling the card (pinned
actions), card bottom <= 544.

### 6.4 DOM checks (domChecks at every width and state of 6.2)
Must be clean: overflowX, offRight, offLeft, wideElement, hScroller, clippedText
(line-clamped names count as clipped only if clamped - none at >= 360 with the
seeded data), inputZoom, overlapText, brokenImage, stretchedImage, fixedTall.
smallTarget: only the accepted 42 pills and the header logo. tinyText: 0 (needs
the shell strip removal). No console errors / page errors.

### 6.5 Flows
1. L1 -> tap «Показати більше» -> 12 rows, button gone, counter announced.
2. Filter disc -> sheet (html overflow hidden, header inert or covered) -> status
   «Скасовано» -> «Показати 1» -> 1 row (9097) + chip «Скасовано» -> chip x -> 12.
3. Search «zzzz» -> no-matches panel -> «Скинути фільтри» -> default list.
4. Sort -> «Сума: від більшої» -> first row 9096 (6 810,20 ₴).
5. Load more, filter period «Увесь час», tap row 9100 -> detail -> back crumb and
   browser Back -> same filter, same loaded count, row 9100 back in view.
6. Row 1 documents disc -> modal -> preview opens a popup, download fires ->
   Escape -> focus back on that disc.
7. 9104 «Скасувати повернення» -> modal (focus on the cross) -> «Повернутись» ->
   focus on the head button; again -> confirm -> badge «Скасовано», no button,
   toast visible (role=status text «Запит на повернення скасовано», gone after
   ~4 s), `document.activeElement` is the h1; reload -> still «Скасовано»; list
   row 9104 «Скасовано»; /orders/48291061 offers «Оформити повернення».
8. Repeat 7 on 9103 at 360 x 780 and 9102 at 320 x 568 (tap targets reachable).
9. Not found: /orders/returns/1234, /orders/returns/abc, fresh partner on 9104 ->
   head + panel + «До повернень» -> /orders?tab=returns.
10. Fresh partner list -> «Повернень ще немає» panel, no search row, no counter.
11. Visitor and b2c on both routes -> SignInPrompt, no footer jump during
    hydration (compare early and hydrated shots).
12. Keyboard (Tab through the list and the detail at 390): visible 2-px brand
    focus rings on the discs, the row link, document rows, the order link.

------------------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

1. detailParts.tsx is shared by /orders/[id] (order-detail) and this page. It
   needs ONE owner and ONE mechanism. This spec assumes: phone twins built from
   shared atoms (KeyValueCard, LineItemList, DocumentRow) + in-place phone classes
   only on DetailsBody and TotalCard (S12). If order-detail instead restyles
   SummaryCard / ItemsTable / DocumentsCard in place, the returns twins become
   redundant: pick one approach for both pages.
2. OrdersView.tsx belongs to orders-list. Returns delivers ReturnRows.tsx and the
   `ReturnRow` type; orders-list mounts it and moves the type import. Both tabs
   must use the same RecordRow.
3. RecordRow line 1: this spec (and orders-list visual P6) uses id-over-date +
   46 outlined discs (blog card head row 3176:5545 / disc 3176:5547); TR-07 and
   the orders-list functional proposal say id + date right + 24 chevron + a 40
   documents disc with a 44 hit box. One recipe for orders, returns and the
   dashboard list.
4. Key/value rows: TR-27 (label -> value 8, py 16, 1-px lines, one column) is used
   here; order-detail P-03 proposes 4 px, rows 16 apart and a two-column grid
   for short values. One recipe for both detail pages.
5. Back crumb -> title: TR-03 says 48 (article 3176:6558); the desktop master
   5192:79073, shell-cabinet P5 and order-detail P-02 use 24. This spec uses 24
   (CabinetPageHead owns it).
6. Head -> first block: 48 here (TR-03, D10); orders-list puts the chip tabs 32
   under the head CTA (tabs = head controls). CabinetPageHead `pb-12` must then
   not apply on the list page, or the tabs move into the head.
7. Total amount size: D9 / TR-27 (22/28 SemiBold) used here; order-detail P-04
   and the returns visual report proposed Stat 30 (30/36). Same value on both
   detail pages.
8. Toast on desktop: phone-only here to keep desktop frozen (D12); the system
   spec may allow it at every width (an interaction-only change, invisible to the
   static pixel guard).
9. Phone-only content: «Дата повернення» row and the order link exist only on
   phones. Accept, or add them to desktop later (desktop frozen now).
10. Clamp relaxations: item names and document names clamp at 3 lines (TR-08 /
    TR-25 say 2) because at 320 the seeded names need 3 lines and touch has no
    tooltip. Accept for every list that uses S9 / S11.
11. NARROW_PILL (14-px label below 360) bends D8 (16/22 everywhere); the
    alternative is a shorter label on phones («Завантажити всі»), which changes
    copy. Decide once for the site (AuthDrawer already uses the 14-px fit).
12. Product / content questions for the user (rejected here): RT-23 return
    documents copy and RT-30 single-archive download need the CRM.
13. List state restore (L9) lives in OrdersView useListState (orders-list): URL
    query or sessionStorage; must include the loaded-row count.
14. Head CTA «Зробити замовлення» on the returns tab (orders-list P2 shows it on
    both tabs below 640 to stop the tab jump): the y values of 2.1 assume it.
15. Modal718 pinned actions while the card scrolls (S4) are needed by the docs
    modal at 320 x 568 and by order-detail P-08; specify once in the shared layer.
16. useModalBehavior `returnFocus` (S6) is a behaviour change for every overlay
    whose opener disappears on confirm (cancel order, remove employee ...); the
    fallback only triggers when the opener is disconnected.
