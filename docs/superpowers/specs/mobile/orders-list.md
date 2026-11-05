# Phone spec - orders list (/orders, /orders?tab=returns)

Area: orders-list. Phone = below 640 px (unprefixed + `max-lg:` classes);
desktop (>= 640, `lg:`) and the landing stay byte-identical (pixel guard).
Date 2026-11-05. Spec phase only: nothing under src/ was edited.

Inputs merged here:
- audit/mobile/orders-list/visual-report.md (ids OL-Vxx, proposals Pxx)
- audit/mobile/orders-list/functional-report.md (ids Fxx)
- audit/mobile/returns/visual-report.md + functional-report.md, list part
  only (ids R-Bx / R-Mx / R-mx / R-nx / R-Fxx): the returns list is the
  `?tab=returns` half of OrdersView.tsx, so its findings land here.
- audit/mobile/lang/code-mobile-recipes.md section 6b (/orders row).
- Binding: audit/mobile/DECISIONS.md D1-D13, translation rules TR-01..TR-32
  (audit/mobile/lang/figma-mobile-language.md section 23).
- Text widths measured in the live Manrope font:
  audit/mobile/orders-list/spec-measure.mjs -> out/spec-measure.txt
  (quoted below as "m:").
- Shell specs (docs/superpowers/specs/mobile/shell-cabinet.md,
  shell-public.md) did not exist when this was written; section 2.0 states
  what this page assumes from them.

Typography / spelling conventions of this file: UI strings are quoted in
double quotes and stay Ukrainian verbatim. The period range is whatever
`formatRange()` (orders/data.ts:573-576) prints; it is written here as
"24.04.2026 - 24.05.2026" (the real separator is unchanged).

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
| S1 | 2.0 / 2.2 head pb 24, tabs 24 under the head | Head pb 48 (A-3): tabs 308-344 at 390, every y below +24; y map edited |
| S2 | 2.3.1 outlined filter disc + #1d1d1f badge (7.5) | A11 FilterButton = black 52 disc + brand badge (A-6); edited |
| S3 | 2.3.1 SearchField + clear | A11 SearchField (listParts SearchField may wrap it) |
| S4 | 2.3.2 36-px chips, "Скинути" (7.6) | A11 AppliedChips: 44-hit chips with a 36 pill, text #1d1d1f, "Скинути фільтрацію", 16 under the search row; note added |
| S5 | 2.3.3 / 2.5 sort | A12 SortMenu (no prefix here), items 16/24 Medium with `divide-y`, flip rule |
| S6 | 2.4 footer = hug "Скинути" + "Показати N" | T5a: status "Знайдено N замовлень" / "Знайдено N повернень" + "Скинути" / "Показати" flex-1; Sheet = A5; note added |
| S7 | 2.6 list, S11 atoms | A7 (same strings); ListEmpty = A14 |
| S8 | 2.9 / S12 | A9 |
| S9 | 2.10 / S6 DocumentTile phone layout | A16 DocumentRow twins; DocumentTile unchanged; add `OrderDocumentRow` next to `OrderDocumentTile` in DocumentsModal.tsx; notes added |
| S10 | S5 Modal718 | A6 |
| S11 | S7 / S8 / S9 / S10 / S13 / S14 / S15 / S17 | A5 / A11 / A11 / A12 / A10 / A4 / A22 / A26 |
| S12 | S2 / S3 / S4 / S16 | Shell-cabinet (A20, 3.3) |
| S13 | Returns list | This cluster builds the returns rows (ReturnRows.tsx, returns 2.1.4 as aligned there) |
| S14 | 7.7 dashboard reuse | The dashboard uses A7 RecordRow directly |
| S15 | 7.12 TR deviations | Ratified (date under the id, 3-line document names, no CTA in the fresh panel, outlinedDark reset) |
| S16 | 7.13 modal cap at 480 | No cap (C-37) |
| S17 | SN-10 NBSP (dashboard) | This cluster edits orders/data.ts `formatAmount` only; revert on any desktop diff |
| S18 | Build | C-orders-list (wave 3): OrdersView, listParts (after F2's re-export edit), DocumentsModal, orders/data.ts, NEW listPhone.tsx, listState.ts, PaymentCell.tsx, ReturnRows.tsx |
| S19 (critique round 1) | 2.4 radio glyph "18 circle, 1.5 #1d1d1f ring, brand ring + 10 dot ... drawn like the quiz radio colours QuizForm.tsx:141-168" | Claim corrected: the glyph is the master radio (A5 revised) - RadioOffIcon = 18 circle, 1.5 `stroke-brand` ring, white fill; RadioOnIcon = 18 brand-filled circle with a white ~9 x 6 check (stroke 1.5); 24 glyph box; exported from ui/Sheet.tsx; edited in place |
| S20 (critique round 1) | 2.4 filter sheet live apply + 2.12 mirror pause | T5a draft model (A4 `onSettled`): the sheet edits a draft seeded from the list state on open, the status "Знайдено N ..." counts the draft, any close (Показати, cross, Escape, Back) commits state + URL once through A29 `writeListParams`; the mirror never writes while an A4 entry is on top |
| S21 (critique round 1) | 2.4 sheet bar / footer / focus | A5 constants revised (bar 66 one line; footer = the scroller's last child, static below 500 px of height); cross "Закрити фільтри"; initial focus = the bar title on coarse pointers |
| S22 (critique round 1) | 2.9 counter `aria-live`; focus to the first new row | A9 revised: the counter is not a live region; focus stays on "Показати більше"; `focusAfterLast` returns the first new row link when the button unmounts; edited in place |
| S23 (critique round 1) | 2.6 / 2.7 ListPanel `overflow-clip` + the link's own focus ring | A7 revised: `ul role="list"`, no `overflow-clip` (flipped KebabMenu / SortMenu panels are not clipped), rows `first:rounded-t-[32px] last:rounded-b-[32px]`, the focus ring is drawn by ListRow (`has-[a[data-row-link]:focus-visible]`); the chevron is `ChevronSideIcon mirrored size-6` |
| S24 (critique round 1) | S4 / 2.3.2 applied chips text #1d1d1f | Phone text #343435 (`text-neutral-800 lg:text-neutral-900`; master chip 3176:5479; C-20 revised) |
| S25 (critique round 1) | S2 / 2.3.1 FilterButton badge | A11 revised: the header cart badge look (1.5-px white ring, 12 Bold) on the brand fill |
| S26 (critique round 1) | 2.3.3 meta range 14/20 #777779 directly on the slab (4.10:1) | Kept (D9 colour); the contrast proposal is open point O-17 |
| S27 (critique round 1) | 2.10 documents modal card (pinned head / CTA) | A6 one-DOM recipe (sticky title row / actions row inside the scrolling card, `sm:static`); DocumentRow names clamp at 3 lines (A16) |
| S28 (critique round 1) | Withdraw / cancel toasts, toolbar -> list | A23 revised (queue while a modal is open, `keepOnNavigate` when a navigation follows); toolbar -> list 24 kept (A-4, an invention); acceptance: the first row's top edge is on screen at 390 x 844 (system 6.3 item 13) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Routes and files

| Route | Renders | Source |
|---|---|---|
| /orders | `OrdersRoute` -> `OrdersView tab="orders"` | src/app/orders/page.tsx (Suspense fallback = `<OrdersView tab="orders" />`), src/app/orders/layout.tsx (`data-canvas="shop"`) |
| /orders?tab=returns | `OrdersView tab="returns"` | same |
| new query params (this spec) | `q`, `period`, `cp`, `status`, `sort`, `n` (phone), `page` / `size` (desktop pager) | section 2.12 |

Component files: src/components/platform/orders/OrdersView.tsx (695
lines), orders/listParts.tsx (344), orders/DocumentsModal.tsx (92),
orders/data.ts, orders/store.ts, orders/payment.ts; atoms in
src/components/platform/ui/ (CabinetPage, CabinetPageHead, SignInPrompt,
Modal718, DocumentTile, Select, TableEmptyRow, OrderStatusBadge,
PaymentBadge, ReturnStatusBadge, StatusPill).

### 1.2 Seeds

| Seed | What it gives | How |
|---|---|---|
| b2b | demo partner "Демо Партнер": 28 orders (statuses rotate, data.ts PLAN), 12 returns 9104..9093 (8 return statuses) | `openPhone(..., { seed: "b2b" })` (audit/kit/seed-b2b.json) |
| fresh partner | partner without history: 0 orders, 0 returns | b2b seed with `accounts[0].id = sessionId = "acc-fresh"` (as in audit/mobile/orders-list/functional.mjs `fresh`) |
| none | visitor -> public chrome + SignInPrompt | `seed: "none"` |
| b2c | signed-in customer -> public chrome + SignInPrompt ("Кабінет") | `seed: "b2c"` |

### 1.3 States

Reached by the audits and specified below:

| # | State | Seed | Spec section |
|---|---|---|---|
| S1 | orders tab, default (period 30 days, all counterparties, all statuses, sort date desc), 10 of 28 shown | b2b | 2.1-2.9 |
| S2 | returns tab, default, 10 of 12 shown | b2b | 2.7 |
| S3 | fresh partner, orders tab (empty ledger) | fresh | 2.8 |
| S4 | fresh partner, returns tab | fresh | 2.8 |
| S5 | no matches (search "zzzz", or status "Скасовано" + counterparty 'ТОВ "Мережа готелів "Зоряний шлях"') | b2b | 2.8 |
| S6 | search with results ("4829", "Mirotel") | b2b | 2.3 |
| S7 | filters applied (period, long counterparty, status) | b2b | 2.3, 2.4 |
| S8 | sorted (4 orders) | b2b | 2.5 |
| S9 | load-more pressed until all shown (28 / 12) | b2b | 2.9 |
| S10 | "Документи" modal, orders + returns, 320x568 / 390x844 / 600 | b2b | 2.10 |
| S11 | row -> /orders/<id> and Back (state restore) | b2b | 2.12 |
| S12 | tab switch both ways | b2b | 2.2, 2.12 |
| S13 | signed out, both tab URLs | none | 2.11 |
| S14 | B2C customer | b2c | 2.11 |
| S15 | pre-hydration paint (visitor: footer jump; partner: gate) | none / b2b | 2.11 |
| S16 | store-driven statuses (cancellation / withdrawn return from another tab) | b2b | 2.6 (badges only) |

New states introduced by this spec (must be verified): S17 filter sheet
open (each group, scrolled to the bottom, footer), S18 sort menu open,
S19 applied-filter chips row (1, 2, 3 chips, long chip at 320), S20 search
filled with the clear button, S21 load-more focus hand-off.

Not reachable (and why):
- Disabled "Завантажити усі документи": every mock order / return has 2
  ready documents (data.ts:377-401 `documentsFor`).
- Returns documents modal for a return whose order is missing: the mock
  always resolves `ret.orderId` (OrdersView.tsx:590 guards it anyway).
- Loading and error states: the lists come from localStorage
  (orders/store.ts) synchronously after hydration; there is no fetch.
  The only "loading" is the pre-hydration gate (shell) and the
  SignInPrompt null render (S15).
- KebabMenu: not used on this page.
- Real iOS Safari (dynamic toolbar, safe-area insets, html overflow lock,
  multi-download): Chromium emulation only.
- Landscape 844x390 is the desktop canvas at zoom 0.586 (no phone layout
  by architecture, BRIEF "no tablet layout").

---------------------------------------------------------------------

## 2. Phone layout, block by block

### 2.0 Frame and what this page assumes from the shell (D1, D10, D12)

| Block | Owner | Assumed phone geometry |
|---|---|---|
| Sticky cabinet bar | shell-cabinet (PlatformHeader.tsx) | 66 tall, logo left, cart disc + burger right (D1, TR-02). The 82-px SideMenu strip is GONE on phones, so the page content starts at y 66 (today 148). |
| Burger sheet | shell-cabinet | menu idiom 3117:13578, "Замовлення" row active (brand). |
| Slab | shared CabinetPage.tsx:12 | #f5f5f5 `bg-bg-cabinet`, top corners r32 on phones (D1, TR-02, grey slab 3094:4837), bottom padding 48 before the legal bar (D10). |
| Page head | shared CabinetPageHead.tsx:60-77 | pt 48, H2 30/36 Bold -0.6, 16, Body Small 14/20 #777779, 32, actions; head bottom padding 24 (D9, D10, TR-03, TR-04). |
| Legal bar | shell-cabinet (PlatformFooter.tsx) | px 24 py 24 gap 24, Onest 14/30, #1d1d1f (D1). |

Every number below is measured from the slab top (y 66 at 390). If the
shell spec lands a different head padding, the absolute y values move but
every relative distance in this section stays.

Gutters: 24 (`px-6`) on every block (D10, figma-mobile-language section
4): content 272 at 320, 312 at 360, 342 at 390, 382 at 430, 552 at 600.
Panel inner width (24 padding): 224 / 264 / 294 / 334 / 504.

Y map at 390 x 844, orders tab, b2b default (S1):

| y | Block | Height |
|---|---|---|
| 0-66 | cabinet bar (shell) | 66 |
| 66 | slab top (r32) | |
| 114-150 | H2 "Мої замовлення" (m: 231.2 wide, one line down to 320) | 36 |
| 166-186 | subtitle "Переглядайте статуси та деталі ваших замовлень" (m: 332.4 -> 1 line at 390 / 430 / 600, 2 lines at 320 / 360) | 20 |
| 218-260 | CTA "Зробити замовлення" hug Button/Small (m: 162.3 + 48 = 210) | 42 |
| 308-344 | tabs chip row (48 under the head, SYSTEM A-3) | 36 |
| 368-420 | search row (search 46 centred in the 52 row + filter disc 52) | 52 |
| 436-456 | meta line: range left + sort trigger right (44-px hit box) | 20 |
| 480 | list panel top (first row content at 504) | |
| 480-714 | row 1 (48291064, caption under the payment chip) | 234 |
| ... | rows 2-10 (210..260 each, see 2.6) | |
| panel end + 48 | counter "Показано 10 із 28" | 20 |
| + 16 | "Показати більше" + plus disc | 42 |
| + 48 | legal bar (slab pb 48) | |

First viewport at 390 x 844: head + toolbar + row 1 complete + row 2
partly (today: 0 complete rows, first row at y 720; OL-V06, R-M4).

At 320 x 568: title 114-150, subtitle 166-206 (2 lines), CTA 238-280,
tabs 328-364, search row 388-440, meta 456-504 (wraps: range line 1, sort
line 2, right-aligned), panel 528 (SYSTEM A-3).

### 2.1 Page head (shared CabinetPageHead, orders passes props only)

- What: title "Мої замовлення", subtitle "Переглядайте статуси та деталі
  ваших замовлень", one action.
- Phone geometry: see 2.0 (pt 48 / H2 36 / 16 / subtitle / 32 / CTA 42 /
  pb 24). Title one line at every phone width (m: 231.2 <= 272).
- Rule: TR-03 (title token mapping desktop 44/48 -> H2 30/36, never the
  off-scale 32/36), TR-04 (one action = hug Button/Small, left-aligned),
  hero rhythm 3082:3247 / 3082:3250 (16 / 32), D9, D10.
- Change owned by THIS area (OrdersView.tsx:642-652): the CTA renders on
  BOTH tabs on phones so the tab row never moves under the thumb
  (OL-V08, F07):

```tsx
actions={
  <Button
    href="/catalog"
    size="responsive"
    className={tab === "orders" ? "shrink-0" : "shrink-0 lg:hidden"}
  >
    Зробити замовлення
  </Button>
}
```

  Desktop: the returns tab gets an actions wrapper whose only child is
  `display:none` (CabinetPageHead.tsx:75 `flex flex-wrap items-center
  gap-4 lg:shrink-0 lg:justify-end`): zero width, justify-between keeps
  the title block at the start, the head height is the title block's.
  Expected pixel-identical; the verify agent must diff
  /orders?tab=returns desktop (section 6).
- `size="responsive"` = 42 on phones, = large from 640 (Button.tsx:80-91):
  already correct, keep.

### 2.2 Tabs: chip row (TR-13, D11; blog chips 3176:5478 / 3176:5479)

- What: the "Замовлення" / "Повернення" tablist (OrdersView.tsx:654-677).
- Geometry: 36 tall chips, r60, 14/20 Medium; active brand fill + white;
  inactive 1-px #8e8e8f ring + #343435 text; gap 8; left-aligned; wraps
  (never scrolls). Widths (m): "Замовлення" 83.5 + 32 = 115.5, "Повернення"
  83.9 + 32 = 115.9; row 239.4 <= 272, so one line at every width.
- Spacing: 48 below the head (head pb 48, SYSTEM A-3), 24 above the search row.
- Recipe (copy of BlogList.tsx:106 with the stroke-inside px, plus the lg
  restorations of today's segmented pill):
  - wrapper (unchanged) `px-6 pb-6 lg:px-10 lg:pb-[30px] lg:pt-[14px]`
  - tablist: `flex flex-wrap items-center gap-2 rounded-[40px] lg:inline-flex lg:flex-nowrap lg:bg-[#e8e8e9]`
    (today `inline-flex items-center gap-2 rounded-[40px] bg-[#e8e8e9]`)
  - tab: `cursor-pointer whitespace-nowrap rounded-[60px] border px-[15px] py-[7px] text-[14px] font-medium leading-5 transition-colors duration-200 lg:border-0 lg:px-4 lg:py-3 lg:text-button-md lg:leading-[22px]`
    + active `border-transparent bg-brand text-white`
    + inactive `border-stroke-default text-neutral-800 hover:text-brand`
  - `lg:leading-[22px]` is mandatory (gotcha 2: the unprefixed `leading-5`
    would leak into the desktop token).
- Semantics unchanged: role=tablist / tab, aria-selected, aria-controls,
  roving tabindex + ArrowLeft / ArrowRight / Home / End (OrdersView.tsx:
  623-638). Focus ring: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` (D12).
- Tab switch keeps `q`, `period`, `cp`, `sort` and drops `status`, `n`,
  `page` (section 2.12). Page scroll does not move.

### 2.3 Toolbar: search row, applied chips, meta + sort (TR-10, TR-11)

Phone-only block, rendered only when the tab has history (`hasHistory`;
fresh partner = no toolbar, OL-V16 / F18). Replaces the stacked desktop
filter row on phones (232-256 px -> 88 px; OL-V06, R-M4).

Container (new, in listPhone.tsx): `flex flex-col gap-4 px-6 pb-6 lg:hidden`
(16 between the three lines, 24 to the list panel).

The desktop filter row (OrdersView.tsx:425 and :529) gets `max-lg:hidden`
prepended; nothing else in it changes:
`max-lg:hidden flex flex-col gap-4 px-6 pb-6 lg:flex-row lg:items-center lg:justify-between lg:pb-8 lg:pl-10 lg:pr-8`.
Two SearchField instances share the same state; only one is displayed.

#### 2.3.1 Search row (TR-10; Direction card disc 3117:12801)

- Row: `flex items-center gap-2` (52 tall).
- Search: `SearchField` (listParts.tsx:137-159) with the new optional
  props `className="min-w-0 flex-1"`, `placeholder="№ або контрагент"`,
  `clearable`, `label` unchanged ("Пошук замовлень" / "Пошук повернень").
  Width = content - 60: 212 at 320, 282 at 390, 492 at 600. 46 tall,
  r50, 1-px #8e8e8f, 16-px text (no iOS zoom), white on the slab.
  Placeholder fits: "№ або контрагент" ~135 <= 212 - 64 (F22: tells what
  the field searches; desktop keeps "Пошук").
  `enterKeyHint="search"`; Enter blurs the input (closes the keyboard).
- Clear (OL-V17, R-F16): when `value !== ""` the decorative magnifier
  (listParts.tsx:156) is replaced by a button `absolute right-[3px] top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-neutral-700`
  (40 hit inside the 46 field; the field itself is the 46-tall target
  around it) holding `XMarkIcon size-6` (catalog/icons.tsx:190),
  `aria-label="Очистити пошук"`; tap -> `onChange("")` + focus the input.
  The native cancel button stays hidden.
- Filter disc = the shared FilterButton (SYSTEM A11 / A-6: black 52 disc
  `bg-neutral-900 text-white` + brand count badge `-right-1 -top-1 bg-brand`;
  the outlined disc and the #1d1d1f badge below are superseded). Superseded
  proposal: 52 circle,
  `relative flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-900 bg-white text-neutral-900 transition-colors duration-200 active:bg-bg-subtle`
  + `FilterIcon size-6` (catalog/icons.tsx:65); count badge when 1-3
  filters differ from the default = the header cart badge
  (Header.tsx:126-129): `absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-white bg-neutral-900 px-1 text-[12px] font-bold leading-none text-white`.
  `aria-label` "Фільтри" (+ ", обрано N" when N > 0),
  `aria-haspopup="dialog"`, `aria-expanded={sheetOpen}`. Opens the filter
  sheet (2.4).
- 320: 212 + 8 + 52 = 272. Nothing fixed-width beyond the disc.

#### 2.3.2 Applied-filter chips (TR-10; blog chips 3176:5479; catalog CatalogClient.tsx:486-508)

(SYSTEM A11: use AppliedChips - 44-px hit chips with a 36 pill, text #1d1d1f,
reset label "Скинути фільтрацію" with a 44 hit; supersedes the chip and
reset strings below.)

- Rendered only when at least one of period / counterparty / status
  differs from the default ("30" / "all" / "all"). The search query is
  NOT a chip (it is visible in the field).
- Row: `flex flex-wrap items-center gap-2`.
- Chip: `flex h-9 min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-[60px] border border-stroke-default bg-white px-[15px] text-[14px] font-medium leading-5 text-neutral-800 active:border-brand active:text-brand`
  + label `<span className="truncate">` + `XMarkIcon size-4 shrink-0`.
  `aria-label` `Прибрати фільтр «${label}»` (catalog wording). Tap ->
  that filter back to its default.
  Labels: the period label ("Останні 90 днів" / "Цей рік" / "Увесь час"),
  the counterparty name, the status label.
- Long chip at 320 (m: 'ТОВ "Мережа готелів "Зоряний шлях"' 252 + 15 +
  15 + 8 + 16 + 2 = 308 > 272): the chip caps at the row width and the
  label truncates with an ellipsis (accepted: the full name is in the
  sheet). Never overflows.
- Reset: text button "Скинути" after the chips:
  `flex h-9 cursor-pointer items-center gap-[2px] px-1 text-button-md text-neutral-700 active:text-brand`
  + `XMarkIcon size-4`; resets period / counterparty / status (not the
  query). 36 tall = the master chip height (accepted target, D8 / TR-32
  note: chips are a master size).

#### 2.3.3 Meta + sort line (TR-11; checkout menu 4329:41044; menu label size 3117:14194)

- Container: `relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2`.
- Left: the period range `whitespace-nowrap text-[14px] leading-5 text-neutral-500`
  ("24.04.2026 - 24.05.2026", "до 24.05.2026" for "Увесь час"). This is
  the only on-page statement of the period now that the period select
  lives in the sheet (OL-V13: no visible filter labels).
- Right: sort trigger `ml-auto -my-3 flex cursor-pointer items-center gap-1 py-3 text-[14px] font-medium leading-5 text-neutral-800`
  + `ChevronDown16 size-4 shrink-0 transition-[rotate] duration-200` (rotate-180
  when open, `motion-reduce:transition-none`). Hit box 44 tall (20 + 12 +
  12, negative margins keep the 20-px visual line). Label = current sort
  label; `aria-label` `Сортування: ${label}`. Combobox semantics via the
  existing `useListbox` hook (listParts.tsx:49-134; export it).
- Widths (m): range 161.6, trigger 101.4 + 4 + 16 = 121.4 ("Спочатку
  старі"), so 299 > 272 at 320: the trigger wraps to line 2 and `ml-auto`
  keeps it right-aligned (block 48 tall). With the sum sorts (~140) it also
  wraps at 360. One line from 390 up.
- Menu: see 2.5.

### 2.4 Filter sheet (TR-09 full-screen sheet + TR-10 groups + TR-18 footer; D7, D11)

(SYSTEM T5a / A-6: the sheet is the shared A5 Sheet; footer = status line
"Знайдено N замовлень" / "Знайдено N повернень" + "Скинути" outlinedDark and
"Показати" solid, flex-1 each, gap 8 - supersedes the hug + "Показати N"
footer below.)

- What: Період / Контрагент / Статус замовлення (or Статус повернення) as
  single-choice lists. Replaces the three desktop Selects on phones (the
  Select bugs OL-V04, OL-V05, F05, F06, R-F05, R-F15 disappear on this page
  by construction).
- Built from the shared full-screen Sheet + filter parts (section 4 S7);
  composed in listPhone.tsx as `OrdersFilterSheet`.
- Overlay: `fixed inset-0 z-[60] flex h-dvh flex-col bg-white` (covers the
  sticky header, TR-09); motion = the phone menu's (opacity + translateY
  -12 -> 0, 400 ms `ease-[cubic-bezier(0.22,1,0.36,1)]`,
  `motion-reduce:transition-none motion-reduce:translate-y-0`).
- Bar (66, the menu master's bar 3117:13578 with the title in place of the
  logo): `flex h-[66px] shrink-0 items-center justify-between px-6`;
  title `h2` "Фільтри" `text-title-lg text-neutral-900` (22/28 SemiBold
  -0.44 on phones; m: 82.1); close `-mr-3 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 active:scale-90`
  + 24 cross (`XMarkIcon size-6`), glyph at x 342 / y 21 at 390,
  `aria-label="Закрити фільтри"`.
- Body: `min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-6`.
  Groups separated by 48 / 1-px #d2d2d2 line / 48 (menu Vector 59;
  `my-12 h-px bg-stroke-subtle`).
- Group: title `h3` `text-title-lg text-neutral-900` ("Період",
  "Контрагент", "Статус замовлення" / "Статус повернення"), 24, then a
  `role="radiogroup" aria-labelledby=<h3 id>` list of option rows, no gap
  between rows (each row is 44+).
- Option row (TR-10 row with a radio glyph; single choice like today's
  Selects): `flex min-h-11 w-full cursor-pointer items-start gap-2 py-[11px] text-left`
  + 24 radio glyph (SYSTEM critique round 1: the master radio of Quizz
  Card 3111:14541 / QuizForm RadioMarker at glyph size, exported from
  ui/Sheet.tsx as RadioOffIcon = 18 circle with a 1.5 `stroke-brand` ring
  on white, RadioOnIcon = 18 brand-filled circle with a white ~9 x 6
  check, stroke 1.5; the earlier "#1d1d1f ring + brand dot" was not the
  quiz look) `mt-[-1px] size-6 shrink-0`
  + label `min-w-0 flex-1 text-button-md text-neutral-800` (16/22 Medium
  #343435), wrapping (never truncated, never wider than the screen:
  'ТОВ "Мережа готелів "Зоряний шлях"' m: 288 -> 1 line at 390 (310
  available), 2 lines at 320 (240 available), row 66).
  role=radio, aria-checked, roving tabindex + arrows inside the group.
- Options:
  - Період: "Останні 30 днів", "Останні 90 днів", "Цей рік", "Увесь час"
    (data.ts:222-227), then an 8-px gap and the caption
    `text-[12px] leading-4 text-neutral-500` = the range of the chosen
    period ("24.04.2026 - 24.05.2026") (master helper caption 3167:4823).
  - Контрагент: "Усі контрагенти" + COUNTERPARTIES (data.ts:215-220).
  - Статус: "Усі статуси" + ORDER_STATUS_KEYS labels (7) or
    RETURN_STATUS_KEYS labels (8).
- Apply model: every tap applies immediately (same as the catalog sheet,
  catalog/FiltersDrawer.tsx:117-128): the list behind, the chips and the
  footer count update live; page / `n` reset.
- Footer (TR-18 white bar): `shrink-0 border-t border-stroke-subtle bg-white px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]`,
  row `flex items-center gap-2`:
  - "Скинути": `Button size="small" variant="outlinedDark"` (hug, m: 64.8
    + 48 = 113), `disabled` when all three groups are default; resets the
    three groups (not the query).
  - `Показати ${count}`: `Button size="small" fullWidth` (solid); count =
    the filtered length for the current query + groups (m: "Показати 28"
    94.6 + 48 = 143). Tap closes the sheet. Width at 320: 272 - 113 - 8 =
    151 >= 143 (fits; with 3-digit counts it would not, mock max is 28).
  - Why a sticky bar: body content is ~1170 px at 390 (3 groups, 17
    rows), the visible body is 844 - 66 - 75 = 703 (D7: bar only when the
    primary action would be off-screen).
- Behaviour (shared useModalBehavior): html scroll lock, focus to the
  close button on open, Tab trap, Escape closes, focus returns to the
  filter disc, `inertSelector: "body > header"`; closes when the viewport
  crosses 640 (matchMedia, like Header.tsx:309-316); optional Back closes
  it (S14, section 4).
- Height at 320 x 568: bar 66 + footer 75, body 427 visible (scrolls);
  every option row stays >= 44.

### 2.5 Sort menu (TR-11)

- Trigger in 2.3.3. Menu `ul role="listbox"` (useListbox ids):
  `absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-clip rounded-3xl bg-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]`
  (full content width, 342 at 390; anchored to the meta line container).
- Options (4): "Спочатку нові" (date desc, default), "Спочатку старі"
  (date asc), "Сума: від більшої" (total desc), "Сума: від меншої" (total
  asc). Item: `flex min-h-11 cursor-pointer items-center px-4 py-[10px] text-[16px] leading-6 [&+&]:shadow-[inset_0_1px_0_var(--color-stroke-subtle)]`
  + selected `text-brand`, else `text-neutral-900`; highlighted
  (keyboard) `bg-bg-subtle`. 4 x 44 = 176 tall.
- Opens on tap; closes on pick, outside pointerdown (`useDismiss`,
  listParts.tsx:22-39), Escape, Tab. On open the menu is scrolled into
  view: `menu.scrollIntoView({ block: "nearest" })` (fixes the
  below-the-fold class of bug, F06 / R-F15, for this control at 320 x 568).
- Shares the `sort` state with the desktop table heads (same {key, dir});
  picking resets `n` / page.

### 2.6 List panel + order row (TR-07, D3/D5/D11; Case card content 3094:5049, footer contact rows 3111:14916; code recipe DashboardView.tsx:276-300)

- Wrapper (new, listPhone.tsx): `px-6 lg:hidden`; the desktop table
  wrapper (OrdersView.tsx:462 / :566) gets `max-lg:hidden` prepended:
  `max-lg:hidden px-6 lg:pl-10 lg:pr-8`. No horizontal table on phones
  (OL-V02, OL-V03, F02, R-F01, R-B2, recipes 6b).
- Panel: shared ListPanel (S11): `ul` `flex flex-col overflow-clip rounded-[32px] bg-white`
  (D5: 342-wide panels are r32), `aria-label="Список замовлень"` /
  `"Список повернень"`.
- Row `li`: `relative px-6 py-6 has-[a:active]:bg-bg-subtle` + divider for
  every row after the first: `before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-stroke-subtle`
  (1-px #d2d2d2 spanning the 294 inner width, no layout height; never
  0.5 px: OL-V14, D10).
- Row anatomy (TR-07 "lines 12 apart"): `flex flex-col gap-3`
  1. Head line, 46 tall: `flex items-center gap-3`
     - left `flex min-w-0 flex-1 flex-col gap-1`:
       id = the row link (stretched): `<Link href={`/orders/${id}`} aria-label={`Деталі замовлення №${number}`} className="self-start whitespace-nowrap text-title-sm text-neutral-900 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:shadow-[inset_0_0_0_2px_var(--color-brand)]">№{number}</Link>`
       (16/22 Bold +0.16; m: 95.8);
       date `whitespace-nowrap text-[14px] leading-5 text-neutral-500` ("24.05.2026", m: 72.6).
       Deviation from TR-07 "date right": the date sits UNDER the id at
       every width because id + date + 72-px right cluster = 264 > 224 at
       320; one layout for all widths.
     - right `flex shrink-0 items-center gap-1`:
       documents disc (shared RowDisc, S11): `button` `relative z-[1] -m-0.5 flex size-11 cursor-pointer items-center justify-center rounded-full`
       with an inner `span` `flex size-10 items-center justify-center rounded-full border border-neutral-900 bg-white text-neutral-900 transition-colors duration-200 [button:active>&]:bg-bg-subtle`
       + `OrderDocumentsIcon size-5` (platform/orderIcons.tsx:6);
       `aria-label={`Документи замовлення №${number}`}`, `aria-haspopup="dialog"`;
       opens DocumentsModal (2.10). It sits above the stretched link
       (z-[1]) and is not nested in it.
       chevron `ChevronSideIcon mirrored` `size-6 shrink-0 text-neutral-900`, `aria-hidden`
       (decorative; the whole row is the link). Visual gap disc ring ->
       chevron 8 (2 negative margin + 4 gap + 2 ring inset).
  2. Amount group: sum `whitespace-nowrap text-title-lg text-neutral-900`
     (22/28 SemiBold -0.44; m: "12 836,10 ₴" 106.3) + 4 +
     counterparty `line-clamp-2 text-[14px] leading-5 text-neutral-800`
     (no underline: OL-V18, F15, R-n2; m: 247.4 -> 1 line from 390, 2 at
     320 / 360). `flex flex-col gap-1`.
  3. Badges: `flex flex-wrap items-start gap-2`: `OrderStatusBadge` +
     `PaymentCell` (moved to orders/PaymentCell.tsx unchanged, so the
     caption / attention / three-line partial variants stay identical to
     desktop; TR-14 colours kept).
- Heights at 390 (24 + 46 + 12 + 52 + 12 + badges + 24): badges one line
  38 -> 208; with a 26-px caption 64 -> 234; partial-overdue variant 38 +
  22 + 26 = 86 -> 256; wrapped badges (e.g. "Заблоковано" 128 + "Частково
  оплачено" 182 = 318 > 294) add 46. At 320 the two badges always wrap
  ("Нове" 73 + "Очікується оплата" 175 = 256 > 224): rows 254..302. The
  longest payment caption (m: "Залишок 6 336,10 ₴ прострочено" 186.9 +
  20) fits 224.
- Interaction: tap anywhere on the row except the disc -> /orders/<id>
  (F04 fixed); :active tint #f8f8f8; keyboard: the link is one Tab stop
  per row, then the disc. No hover-only affordance (TR-32).
- 600: inner 504; badges one line; counterparty one line.

### 2.7 Return row (same panel and recipe)

- Same `li` / dividers / link pattern; link -> `/orders/returns/${ret.id}`,
  `aria-label={`Деталі повернення №${ret.id} за замовленням №${number}`}`.
- Extra line ABOVE the head line (identity, OL-V20, F21, R-F12, R-m11):
  eyebrow `text-[12px] font-medium uppercase leading-5 text-brand`
  "Повернення №9104" (blog card eyebrow 3176:5546; m: 121.4). Row stack
  gap: eyebrow -> head line 8 (`-mb-1` on the eyebrow inside the gap-3
  column), other lines 12.
- Head line: "№48291061" (order number, the link) + return date; docs
  disc `aria-label={`Документи повернення за замовленням №${number}`}`
  (existing string) -> DocumentsModal title "Документи повернення".
- Amount: `formatSum(total)` (return total) + counterparty
  (`order?.counterparty`, line-clamp-2).
- Badges: `ReturnStatusBadge` (widest "Прийнято складом" 165, fits 224).
- Height at 390: 24 + 20 + 8 + 46 + 12 + 52 + 12 + 38 + 24 = 236.

### 2.8 Empty states (TR-24, D11; form success panel + hero spacing)

Rendered INSIDE the phone panel (shared ListPanel empty slot, S11), never
inside the desktop table (OL-V01, F01, F03, R-F02, R-B1 fixed). The
desktop keeps `TableEmptyRow` unchanged.

- Panel content: `flex flex-col items-center px-6 py-12 text-center`:
  [52 icon tile] 24 [title] 16 [text] 32 [action].
  - Icon tile (fresh states only; master "Info icon" 3085:3719):
    `relative flex size-[52px] items-center justify-center rounded-xl border border-stroke-default bg-white text-neutral-900`
    + `SideMenuOrdersIcon size-6` (platform/icons.tsx:72, = PreorderIcon,
    the "Замовлення" side-menu glyph).
  - Title `text-title-lg text-neutral-900` (22/28 SemiBold).
  - Text `max-w-[294px] text-body-sm text-neutral-500` (14/20 #777779).
- Copies (existing, verbatim from OrdersView.tsx:206-216 / 303-308):
  | State | Title | Text | Action |
  |---|---|---|---|
  | S3 fresh orders | "Замовлень ще немає" (m: 217.7, 1 line at 320) | "Оформіть перше замовлення, щоб воно з’явилося у цьому списку." | none on phones: the head CTA "Зробити замовлення" sits ~150 px above (fixes the duplicated CTA, OL-V16) |
  | S4 fresh returns | "Повернень ще немає" | "Оформити повернення можна на сторінці отриманого замовлення." | none |
  | S5 no matches, orders | "Замовлень не знайдено" (m: 249.9, 2 lines at 320) | "Змініть пошук або умови фільтрів." | `Button size="small" variant="outlinedDark"` "Скинути фільтри" (m: 129 + 48 = 177): clears query + period + counterparty + status |
  | S5 no matches, returns | "Повернень не знайдено" | same | same |
- Fresh partner: no toolbar (2.3), no load-more (2.9); the panel follows
  the tabs 24 below (y 344 at 390), fully visible without any swipe.
- No-matches: toolbar stays (the user fixes the query there), no
  load-more, no "0-0 із 0" (F11).

### 2.9 Load-more (TR-12, D4; blog 3176:5601, BlogList.tsx:146-152)

- Phone only (`lg:hidden`); the desktop pager wrappers (OrdersView.tsx:473
  / :577) get `max-lg:hidden` prepended (`max-lg:hidden lg:pb-[3px]`,
  `max-lg:hidden lg:pb-[4px]`); the per-page control disappears on phones
  (D4). Fixes OL-V12, F09, F10 (pager part), F11, R-m4, R-F06.
- State `n` (shown count), starts 10, step 10; reset to 10 on any
  query / filter / sort change; persisted in the URL (2.12).
- Block (shared LoadMore, S12), rendered only while `n < total`:
  `mt-12 flex flex-col items-center gap-4 px-6 lg:hidden`
  - counter `p` `text-body-sm text-neutral-500` "Показано 10 із 28" (m:
    113), NOT a live region (SYSTEM critique round 1, A9);
  - `Button size="small" plus` "Показати більше" (pill 177 + 8 + 42 disc
    = 227, the blog master width) centred.
- Tap: `n += 10`; the new rows append below (no scroll jump); focus stays
  on "Показати більше" (re-focused, A9); when the button unmounts (last
  batch) `focusAfterLast` returns the first new row's link (focus never
  falls to body; SYSTEM critique round 1).
- When all rows are shown (or total <= 10) the block is not rendered and
  the panel is the last block: 48 to the legal bar (slab pb).

### 2.10 "Документи" modal (D7 short modal, TR-17, TR-25)

(SYSTEM A16: phone rows are the new DocumentRow (platform/ui) rendered
`lg:hidden` next to the untouched `max-lg:hidden` DocumentTile grid; the
in-place DocumentTile change of S6 is not built. Add `OrderDocumentRow`
next to `OrderDocumentTile` in DocumentsModal.tsx.)

- Opened by the row docs disc (2.6 / 2.7). Component: DocumentsModal.tsx
  on the shared Modal718 phone card (S5) with DocumentTile phone rows
  (S6). Fixes OL-V07, F10 (modal part), F12, F13, R-F04, R-m6.
- Card (shared, D7): centred, width `calc(100% - 48px)` (342 at 390, 272
  at 320, 552 at 600), white, r32, 1-px #8e8e8f ring, p 24, max-height
  `calc(100dvh - 48px)`, inner scroll, scrim #343435/50 + blur 4.
- Head: title "Документи замовлення" / "Документи повернення" 24/28 Bold
  -0.48 (m: 273.3 -> 2 lines at every phone width), cross 24 in a 44 hit
  box top right; 16; meta `ModalMeta` "№48291064" [dot] "24.05.2026" at
  16/24 #343435 (TR-17 description). When the card content overflows,
  the title row and the actions row stay pinned (shared S5) so the cross
  never scrolls away (F13).
- Body (24 below the meta): this area wraps the tiles in
  `<div className="flex flex-col max-lg:-my-4 max-lg:divide-y max-lg:divide-stroke-subtle lg:gap-6">`
  (desktop: identical gap-6 column inside the slot) -> TR-25 rows with
  1-px #d2d2d2 lines between them:
  - row (shared DocumentTile phone layout): `py-4`, [48 dark tile r12,
    24 glyph] 16 [name 16/22 Bold, max 3 lines / meta 14/20 #777779
    "24.05.2026 [dot] 0.9 МБ [dot] PDF"] 12 [44 hit box, 24 download
    glyph, `-mr-2.5` so the glyph's right edge sits on the content edge];
    the tile + text area is the preview button (`onPreview`), the glyph
    is the download link.
  - name column (m): 112 at 320, 152 at 360, 182 at 390. "Видаткова
    накладна №5848" (223.2) -> 2 lines at 360-600 ("накладна №5848" 135.9
    fits 152), 3 lines at 320 (the number stays visible; TR-25 says 2
    lines - the 320 floor forces 3, see 7).
  - pending row ("Надходження на рахунок" / "З'явиться після оплати"):
    #e8e8e9 tile + #bbbbbc glyph, name #a5a5a5, note 14/20 #777779, no
    actions, not interactive.
- Actions: one full-width `Button variant="accent" fullWidth` (42 via D8
  or `size="small"`), label `<span className="lg:hidden">Завантажити все</span><span className="max-lg:hidden">Завантажити усі документи</span>`
  (m: the long label 212.9 + 48 = 261 does not fit the 224 card at 320;
  the short one ~125 + 48 does). Desktop text unchanged.
- Heights: 390 x 844 card ~494 (no scroll); 360 x 780 ~574 (no scroll);
  320 x 568 ~618 in a 520 max -> inner scroll with the pinned head and
  pinned CTA.
- Behaviour (existing, keep): portal z-60, html lock, focus to the cross,
  Tab trap, Escape / scrim / cross close, focus back to the row disc.
  `downloadAll` (DocumentsModal.tsx:20-31): stagger the programmatic
  clicks 250 ms apart (Chrome Android prompts once and then gets all;
  iOS Safari keeps only the first - open point 7.10).

### 2.11 Signed out / B2C (shared SignInPrompt; TR-01, TR-03)

- OrdersView.tsx:608-610 stays: `SignInPrompt title="Мої замовлення"
  text="Історія замовлень доступна в особистому кабінеті бізнес-клієнта."`
  on BOTH tab URLs (the signed-in head also says "Мої замовлення" on the
  returns tab; a per-tab title would also change desktop pixels). The
  OL-V15 sub-point "?tab=returns titles Мої замовлення" is rejected for
  that reason.
- Look and the pre-hydration jump (OL-V15, F17, R-F13) are fixed in the
  shared SignInPrompt (S4): public chrome, 48 below the header, title
  token per the shell spec (H1 40/42 public-page title or H2 30/36),
  16, Body Medium 16/24 #343435 text (m: 501 -> 2 lines at 390), 32, hug
  Button/Small "Увійти" / "Кабінет", 60 to the footer; before hydration
  it renders a same-height `invisible` placeholder instead of null.
- Flows to keep: "Увійти" opens the auth drawer; signing in as the partner
  swaps to the cabinet list in place; "Вийти" on /orders swaps back.

### 2.12 State model and URL (fixes F08, R-F07)

- `useListState` moves to orders/listState.ts and becomes URL-backed:
  initial values read ONCE from `useSearchParams()` (lazy initializer),
  React state is the source of truth afterwards, and an effect mirrors it
  into the URL with `window.history.replaceState(null, "", url)` (the
  mechanism the tab switch already uses, OrdersView.tsx:618-621; the
  query mirror debounced 300 ms). Default values are omitted.
- Params: `q` (string), `period` (`90` | `year` | `all`; `30` omitted),
  `cp` (counterparty name; validated against COUNTERPARTIES), `status`
  (OrderStatus / ReturnStatus key; validated per tab), `sort`
  (`date-asc` | `total-desc` | `total-asc`; `date-desc` omitted), `n`
  (phone shown count, multiple of 10, clamped to the total; 10 omitted),
  `page` / `size` (desktop pager; 1 / 10 omitted). Invalid values fall
  back to the default silently.
- Back from /orders/<id> or /orders/returns/<id> remounts the page with
  the same URL -> same rows, same `n`, so the browser scroll restoration
  lands on the same row (works today for the default state: 693 -> 693).
- Tab switch (`switchTab`): new URL = `?tab=returns` (or none) + `q`,
  `period`, `cp`, `sort`; `status`, `n`, `page` dropped (status sets
  differ). The keyed remount (OrdersView.tsx:683-685) re-reads the URL.
  The switch stays a replaceState (Back leaves /orders; F20 / R-F18
  accepted as designed).
- While an overlay that pushes a history entry is open (if the shared
  layer adopts "Back closes the overlay", S14) the mirror pauses and
  writes once after the overlay closed, so the base entry carries the
  final filters.
- Desktop gets the same persistence (behaviour only, no pixel change).
  If the orchestrator wants zero desktop behaviour change, gate the
  mirror with `matchMedia("(max-width: 639px)")` (open point 7.8).

### 2.13 Interactions summary

| Trigger | Opens / does | Kind | Scroll lock | Focus |
|---|---|---|---|---|
| tab chip | switches tab (replaceState) | in place | no | stays on the chip |
| search input | live filter, `n` reset | in place | no | iOS: 16 px, no zoom |
| clear x | empties the query | in place | no | back to the input |
| filter disc | filter sheet | full-screen sheet z-60 | html | close button; back to the disc |
| chip x | resets that filter | in place | no | next chip or "Скинути" |
| "Скинути" (chips row) | resets 3 filters | in place | no | the filter disc |
| sort trigger | sort menu | anchored popover z-20 | no | option highlight via aria-activedescendant |
| row | /orders/<id> or /orders/returns/<id> | navigation | - | - |
| docs disc | DocumentsModal | centred short modal z-60 | html | cross; back to the disc |
| "Показати більше" | appends 10 | in place | no | first new row link |
| empty "Скинути фільтри" | clears query + filters | in place | no | the search input |
| "Увійти" / "Кабінет" | auth drawer (auth area) | drawer | html | per auth spec |

No sticky bars on the page itself (the only sticky bar is the sheet
footer). No hover-only meaning anywhere (TR-32). Every new transition has
`motion-reduce:` (D12). Every new control has a brand 2-px focus-visible
ring (D12).

### 2.14 Width behaviour 320..639

| Block | 320 | 360 | 390 | 430 | 600 |
|---|---|---|---|---|---|
| subtitle lines | 2 | 2 | 1 | 1 | 1 |
| tabs | 1 row | 1 row | 1 row | 1 row | 1 row |
| search width | 212 | 252 | 282 | 322 | 492 |
| meta + sort | 2 lines (48) | 1 line (2 for sum sorts) | 1 | 1 | 1 |
| panel inner | 224 | 264 | 294 | 334 | 504 |
| counterparty lines | 2 | 1-2 | 1 | 1 | 1 |
| badges row | wraps | wraps for wide pairs | wraps for wide pairs | mostly 1 | 1 |
| docs modal width | 272 | 312 | 342 | 382 | 552 |
| docs name lines (longest) | 3 | 2 | 2 | 2 | 1 |
| sheet option 'ТОВ "Мережа..."' | 2 lines | 2 lines | 1 | 1 | 1 |

Rule: every fixed-width row fits 272 at 320 (section 22 of the language
doc): search row 272, tabs 239.4, row head 95.8 + 12 + 72 = 180 <= 224,
load-more 227 <= 272, sheet footer 113 + 8 + 143 = 264 <= 272.

### 2.15 Desktop guard (what changes in desktop DOM / CSS)

| Element | Change | Desktop effect |
|---|---|---|
| head actions, returns tab | Button `lg:hidden` inside the actions wrapper | empty-looking wrapper, expected 0 px diff (verify) |
| tablist + tabs | phone classes + `lg:` restorations (2.2) | identical computed styles (verify 16/22 500, py 12, px 16, no border, #e8e8e9 track) |
| filter rows, table wrappers, pager wrappers | `max-lg:hidden` prepended | none |
| phone toolbar, phone panel, load-more | new `lg:hidden` blocks | `display:none` |
| SearchField | optional props, defaults = today | none (desktop instance passes nothing new) |
| DocumentsModal | tiles wrapped in a `lg:gap-6` column; CTA label in two spans | identical layout and text (verify the open modal at 1440 / 1710) |
| PaymentCell | moved to its own file, same markup | none |
| URL mirror, downloadAll stagger | behaviour | none in pixels |

---------------------------------------------------------------------

## 3. Bugs to fix (merged, deduplicated)

Severity per the reports (max of the merged sources). "By construction" =
the phone layout no longer renders the broken element on phones.

| Id | Sev | Sources | Where | What | Fix | File:line |
|---|---|---|---|---|---|---|
| OL-01 | blocker | OL-V01, F01, F03, R-F02, R-B1 | both tabs, fresh partner + no matches, 320-600 | empty / no-match state is a `td colSpan` inside the 1180 table, centred at x ~614: blank white box, CTA unreachable | phone panel renders the TR-24 empty state (2.8); desktop TableEmptyRow unchanged | OrdersView.tsx:203-217, 300-309; ui/TableEmptyRow.tsx:58-69 |
| OL-02 | blocker | OL-V02, F02, F04, recipes 6b | orders tab, 320-600 | 1180-px table in a 272..552 scroller; status, payment, documents, details off-screen; row tap does nothing; counterparty 5-line wraps | phone card list (2.6), whole row = link, table `max-lg:hidden` | OrdersView.tsx:165-259 (181), 462-470 |
| OL-03 | blocker | OL-V03, R-F01, R-B2 | returns tab | same as OL-02 for returns; "Статус повернення" invisible | return rows (2.7) | OrdersView.tsx:263-357 (279), 566-574 |
| OL-04 | major | OL-V04, F05 | filter selects after picking the long counterparty, 320-390 | implicit grid track takes the value's max-content: all three selects 373 wide, clipped | by construction (selects `max-lg:hidden`, sheet rows wrap). Select atom hardening for other pages = S15 | OrdersView.tsx:110, 427, 531; ui/Select.tsx:86, 102 |
| OL-05 | major | OL-V05, R-F05 | counterparty menu at 320 | listbox `min-w-max` 320 wide from x 24, option clipped | by construction (sheet); S15 for the atom | ui/Select.tsx:112 |
| OL-06 | major | F06, R-F15, OL-V13 (menu part) | select menus near the bottom of the screen | menus always drop down, open below the fold | by construction; the new sort menu scrolls itself into view (2.5) | ui/Select.tsx:112 |
| OL-07 | major | OL-V06, R-M4 | head + filters, all widths | 232-256 px of stacked filters; 0 complete rows in the first viewport | TR-10 toolbar 52 + 16 + 20 (2.3); strip removal (shell) | OrdersView.tsx:425-470, 529-574 |
| OL-08 | major | OL-V07, F12, F13, R-F04, R-m6, F10 (modal part) | Документи modal, 320-600 | 16-px margins, 140-164 tall grey tiles, names truncated ("Видаткова на..."), 48.5 / 15 px CTA, 32 close, at 320x568 the CTA and the cross scroll away | D7 short card + TR-25 rows + pinned head/actions + phone CTA label (2.10) | DocumentsModal.tsx:53-92; ui/Modal718.tsx:88-142, 214-215; ui/DocumentTile.tsx:52-102 |
| OL-09 | major | OL-V08, F07 | tab switch, all widths | CTA only on the orders tab: the tablist jumps 66 px under the finger | CTA on both tabs on phones (2.1) | OrdersView.tsx:645-651 |
| OL-10 | major | F08, R-F07 | Back from details, tab peeking | search / filters / sort / page live in useState only: lost | URL-backed state (2.12) | OrdersView.tsx:361-389, 601-621 |
| OL-11 | major | F09 | pager tap at 390 / 320 | new page renders 743-1087 px above the viewport | load-more appends below + focus hand-off (2.9) | OrdersView.tsx:472-483; listParts.tsx:306-340 |
| OL-12 | minor | OL-V09, R-m3 | tabs | desktop segmented pill (46 tall) | TR-13 chip row (2.2) | OrdersView.tsx:654-677 |
| OL-13 | minor | OL-V10, R-m2 | page head | H1 32/36 off-scale, subtitle 14/24 8 below, CTA 24 below | shared CabinetPageHead phone variant (S3); this area passes props only | ui/CabinetPageHead.tsx:63-75 |
| OL-14 | minor | OL-V11, F16 | sort | only in the dark table head ("Сума" half off-screen), same glyph for both directions | TR-11 sort trigger + menu (2.3.3, 2.5) | listParts.tsx:168-216; OrdersView.tsx:186-191, 284-289 |
| OL-15 | minor | OL-V12, F11, R-m4, R-F06, F10 (pager part) | pager | desktop pager squeezed, 59x34 pill, 40 discs, "0-0 із 0" on no matches, page-size menu overflows at 320 | pager `max-lg:hidden`; TR-12 load-more (2.9) | listParts.tsx:236-344; OrdersView.tsx:472-483, 576-587 |
| OL-16 | minor | OL-V13 | filter row | three unlabeled full-width selects, still stacked at 600 | sheet with group titles + applied chips + range line (2.3, 2.4) | OrdersView.tsx:110, 425-460, 529-564 |
| OL-17 | minor | OL-V14 | row dividers | 0.5-px gradient hairlines | 1-px #d2d2d2 lines in the phone panel (2.6); desktop untouched | listParts.tsx:225-226; ui/TableEmptyRow.tsx:53-54 |
| OL-18 | minor | OL-V15, F17, R-F13 | signed out / B2C | bare block on the dark footer, 32/36 title, footer paints first and jumps ~262 px at hydration | shared SignInPrompt phone look + same-height placeholder (S4); per-tab title rejected (2.11) | ui/SignInPrompt.tsx:16-27 (19); OrdersView.tsx:608-610 |
| OL-19 | minor | OL-V16, F18 | fresh partner | search + 3 selects above an empty ledger; two identical "Зробити замовлення" CTAs | no toolbar without history; empty panel without CTA on phones (2.8) | OrdersView.tsx:401-470, 496-574 |
| OL-20 | minor | OL-V17, R-F16 | search | native cancel hidden, magnifier decorative: no way to clear on a phone | clear button when filled (2.3.1) | listParts.tsx:154-156 |
| OL-21 | minor | F10, R-F10, recipes 6b | targets | 40 pager, 59x34 pill, 32 close, 24 doc glyphs (40 hit 12 apart), 42 row buttons | 44-hit row disc (2.6); pager hidden; modal close + doc actions via S5 / S6 | listParts.tsx:229-231, 277, 313-336; ui/Modal718.tsx:118; ui/DocumentTile.tsx:37-38 |
| OL-22 | minor | R-F14 | "Завантажити усі документи" | one tap = 2-3 programmatic downloads; iOS keeps the first, Chrome asks | 250 ms stagger now; real fix = one archive URL from the CRM (7.10) | DocumentsModal.tsx:20-31 |
| OL-23 | minor | F14 (+ shell F9) | Back with the docs modal / a sheet open | Back leaves the page; overlay stays mounted in some cases | shared overlay "Back closes" + close on pathname change (S14) | cart/useModalBehavior.ts |
| OL-24 | nit | OL-V18, F15, R-n2 | counterparty | underlined like a link, not a link | plain 14/20 text in the phone row (desktop frozen) | OrdersView.tsx:228-230, 320-322 |
| OL-25 | nit | OL-V19 | table scroll after a filter change | rows shown without their numbers | by construction (no table on phones) | OrdersView.tsx:180, 278 |
| OL-26 | nit | OL-V20, F21, R-F12, R-m11 (list part) | returns | two returns of order 48291061 indistinguishable | eyebrow "Повернення №<id>" + status + sum on every row (2.7) | OrdersView.tsx:310-351 |
| OL-27 | nit | F22 | search placeholder | "Пошук" does not say what is searchable | phone placeholder "№ або контрагент" (2.3.1) | listParts.tsx:152 |

Not fixed here, with the reason:

| Id | Sources | Decision |
|---|---|---|
| OL-28 | F20, R-F18 (tabs use replaceState, Back leaves /orders) | rejected: the tab is a view of one page; pushState would make Back cycle tabs. Kept as designed. |
| OL-29 | F23, R-F19 (landscape 844x390 = desktop canvas, 16-px cross, 5.9-px rail labels) | rejected: by architecture (no tablet layout, desktop frozen). |
| OL-30 | R-F17, R-m11 (pending return document "Надходження на рахунок / З'явиться після оплати" copied from the order) | rejected for this pass: mock data / product copy, not phone layout; flagged in 7.11. |
| OL-31 | OL-V15 sub-point (returns URL titled "Мої замовлення") | rejected: matches the signed-in head; a per-tab title changes desktop. |
| OL-32 | inherited shell items: strip 10-px labels (tinyText x4), strip scrolls at 320, cabinet legal bar copyright offRight at 320 (PlatformFooter.tsx:31), footer 122 tall at 320/360, auth drawer title typo "осбистого" | owned by shell-cabinet / auth; listed so the verify agent expects them gone after the shell build. |
| OL-33 | desktop-only leftovers seen in the audits: "0-0 із 0" pager under an empty desktop table, 0.5-px hairlines, underlined counterparty, decorative (i) head glyph (R-F09), per-page menu styling (R-m4) | desktop frozen (D-scope); not touched. |
| OL-34 | R-F09 (list (i) glyph not focusable) | phones have no column heads; n/a. |

Total to fix in this area: 27 (OL-01..OL-27; OL-08 / 13 / 18 / 21 / 23 partly
through shared atoms).

---------------------------------------------------------------------

## 4. Shared needs (shared layer, not in this area's file set)

Marks: EXISTS = usable as is; CHANGE = existing atom needs a phone
variant; NEW = new atom.

S1. Button phone sizes (D8) - CHANGE, ui/Button.tsx:80-115.
- `size="large"` phone strings become the `small` strings (42 pill,
  16/22 Medium, 42 disc, 11 arrow, 13 plus). Needed by the DocumentsModal
  CTA (default size today = 48.5 / 15 px).
- Fallback if S1 does not land: DocumentsModal passes `size="responsive"`
  (desktop identical, Button.tsx:85-87).

S2. CabinetPage phone surface (D1, D10) - CHANGE, ui/CabinetPage.tsx:12.
- Phone: `rounded-t-[32px]` + bottom padding 48 (`pb-12`); desktop keeps
  `pb-8 lg:rounded-tl-[48px]` (restore `lg:rounded-tr-none`, `lg:pb-8`).

S3. CabinetPageHead phone list variant (TR-03, TR-04, D9, D10) - CHANGE,
ui/CabinetPageHead.tsx:60-77.
- Phone: `px-6 pt-12 pb-6`; title = H2 30/36 Bold -0.6 (`text-h2`
  token, desktop 44/48 unchanged); title -> subtitle 16; subtitle
  `text-body-sm text-neutral-500` (14/20); text block -> actions 32;
  one action = hug, left. API unchanged (title, subtitle, actions, back,
  meta). This page relies on: actions wrapper renders even if its only
  child is `lg:hidden` (2.1).

S4. SignInPrompt phone (TR-01, TR-03) - CHANGE, ui/SignInPrompt.tsx:16-27.
- API unchanged `{ title, text }`. Phone: pt 48 under the header, title
  token per shell spec, 16, `text-body-md text-neutral-800`, 32,
  `Button size="small"` hug; 60 to the footer. Pre-hydration: render the
  same block with `invisible` (or reserve `min-h`) instead of `null` so
  the footer does not jump (F17, R-F13, shell F10).

S5. Modal718 phone card (D7, TR-17) - CHANGE, ui/Modal718.tsx:88-142,
214-233.
- Overlay `p-6` (24 gutters) on phones (`lg:p-10` kept); card
  `max-h-[calc(100dvh-48px)]`, r32, 1-px #8e8e8f ring, p 24 (rows
  `px-[23px] py-[23px]` incl. border), column gap 24.
- Title 24/28 Bold -0.48 (exists); close = 24 glyph in a 44 hit box
  (`-m-2.5 size-11`), today 32x32.
- Description 16/24 #343435 on phones (today 18/26).
- NEW: when the content overflows, the title row and the actions row are
  pinned: title row `sticky top-0 z-[1] bg-white` (with the card's top
  padding moved into it), actions row `sticky bottom-0 bg-white pt-4`;
  proposal prop-free (always on phones, harmless when nothing overflows).
- ModalActions phone = stacked full-width, 8 apart (`gap-2`, today 16).
- Who else: CancelOrderModal, ReturnWizardModal (sheet per D7), profile
  AccountForms, ui-gallery.

S6. DocumentTile phone row (TR-25) - SUPERSEDED by system A16 (new
DocumentRow; DocumentTile unchanged); kept for the record: CHANGE,
ui/DocumentTile.tsx:40-102.
- API unchanged `{ name, meta, pending, href, downloadName, onPreview, className }`.
- Phone layout (desktop strings restored with `lg:`): no grey tile
  background / radius / p-6 on phones; row `flex items-start gap-4 py-4`;
  tile `size-12 rounded-xl` (48, r12) with the 24 glyph centred (12
  inset); text column `min-w-0 flex-1` with the name
  `line-clamp-3 text-title-sm` (16/22 Bold; 2 lines at >= 360 for every
  mock name) and the meta `text-body-sm text-neutral-500` (parts wrap
  between dots, as today); when `onPreview` is set, tile + text are one
  `button` (aria-label `Переглянути: ${name}`); trailing download link
  `-mr-2.5 flex size-11 shrink-0 items-center justify-center` + 24 glyph
  (aria-label `Завантажити: ${name}`); no eye glyph on phones.
- Dividers come from the parent (DocumentsModal wraps the rows, 2.10).
  The order-detail / return-detail documents card (detailParts.tsx:215-238)
  needs the same wrapper (order-detail area).

S7. Full-screen Sheet + filter parts (TR-09, TR-10, TR-18, D7) - NEW
(platform/ui/Sheet.tsx or ui/Sheet.tsx; one implementation for the
catalog, materials, orders and assortment filter sheets).
- `Sheet({ open, onClose, title, children, footer?, initialFocus?, closeLabel = "Закрити" })`:
  `fixed inset-0 z-[60] flex h-dvh flex-col bg-white` + menu motion
  (2.4), bar 66 (title `text-title-lg`, 48-hit close with a 24 cross at
  x 342), body `min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-6`,
  footer slot = `SheetFooter`. Uses useModalBehavior (html lock, focus,
  trap, Escape, inert header), closes on `(min-width: 640px)`, optional
  Back-closes (S14). Kept mounted with `inert` + `aria-hidden` when closed
  (FiltersDrawer.tsx:165-168 pattern) so the exit motion plays.
- `SheetGroup({ title, caption?, children, id })`: `h3 text-title-lg`,
  24, children, optional caption `mt-2 text-[12px] leading-4 text-neutral-500`;
  groups separated by `<SheetDivider />` = `my-12 h-px bg-stroke-subtle`.
- `OptionRow({ type: "radio" | "checkbox", checked, onSelect, children })`:
  `flex min-h-11 w-full cursor-pointer items-start gap-2 py-[11px] text-left`
  + 24 glyph + `text-button-md text-neutral-800` label; radio glyphs NEW
  (`RadioOffIcon` / `RadioOnIcon`, 24 box, 18 circle 1.5 stroke, on = brand
  ring + 10 brand dot), checkbox glyphs EXIST (catalog/icons.tsx:166-188).
  Radio groups: `role="radiogroup"`, roving tabindex, arrows.
- `SheetFooter({ children })`: `shrink-0 border-t border-stroke-subtle bg-white px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]`
  with `flex items-center gap-2`.
- Needs D12 `viewport-fit=cover` in the root layout for the inset to be
  non-zero.

S8. FilterButton (TR-10) - NEW (today inline in CatalogClient.tsx:472-482
as a filled black disc, and MaterialsFiltersButton in materials/Hero.tsx).
- `FilterButton({ count = 0, expanded, onClick, label = "Фільтри" })`,
  classes in 2.3.1. One variant for every shop / cabinet search row
  (conflict 7.5).

S9. AppliedChips (TR-10) - NEW (inline today in CatalogClient.tsx:486-508).
- `AppliedChips({ chips: { key: string; label: string; onRemove(): void }[], onReset, resetLabel = "Скинути" })`,
  classes in 2.3.2 (chip label truncates, chip `max-w-full`).

S10. SortMenu (TR-11) - NEW (useListbox EXISTS in listParts.tsx:49-134;
the catalog sort popup CatalogClient.tsx:176-188 is a different 22-px
trigger).
- `SortMenu({ value, options: { value: string; label: string }[], onChange, label = "Сортування" })`,
  trigger + menu classes in 2.3.3 / 2.5; menu anchors to the nearest
  `relative` ancestor (full content width); scrollIntoView on open.
- If the shared layer keeps useListbox inside orders/listParts.tsx, this
  area exports it (additive).

S11. ListPanel / ListRow / RowLink / RowDisc / ListEmpty (TR-07, TR-24, D5,
D11) - NEW (the closest existing recipe is DashboardView.tsx:276-300,
r24 / px-4 / 0.5-px hairline - not reused as is).
- `ListPanel({ label, children })`: `ul flex flex-col overflow-clip rounded-[32px] bg-white`.
- `ListRow({ children })`: `li relative px-6 py-6 has-[a:active]:bg-bg-subtle`
  + `[&+&]:before:absolute [&+&]:before:inset-x-6 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-stroke-subtle`.
- `RowLink({ href, label, children, className })`: stretched link classes
  in 2.6.
- `RowDisc({ label, onClick, children })`: 44 hit / 40 ring classes in 2.6
  (`z-[1]` above the stretched link).
- `ListEmpty({ icon?, title, text?, action? })`: classes in 2.8 (TR-24).
- Consumers: orders (this area), returns list (this area), assortment,
  counterparties, employees, dashboard lists, materials file rows.

S12. LoadMore (TR-12, D4) - NEW (blog recipe BlogList.tsx:146-152 EXISTS).
- `LoadMore({ shown, total, onMore, label = "Показати більше", counter = (s, t) => `Показано ${s} із ${t}` })`:
  classes in 2.9; renders nothing when `shown >= total`; the caller owns
  the focus hand-off (it knows the first new row) - or the atom accepts
  `onAfterMore(firstNewIndex)`.

S13. Chip tabs (TR-13) - NEW class helper (blog chip recipe EXISTS inline,
BlogList.tsx:106): `chipClass(active: boolean)` returning the phone
string `cursor-pointer whitespace-nowrap rounded-[60px] border px-[15px] py-[7px] text-[14px] font-medium leading-5 transition-colors duration-200`
+ active / inactive colours; each caller appends its own `lg:`
restorations (orders 2.2, profile tabs, PDP tabs).

S14. Overlay plumbing (useModalBehavior, cart/useModalBehavior.ts:15-90) -
CHANGE.
- Close every open sheet / modal on a pathname change (shell F9).
- Optional `closeOnBack`: push one history entry on open, close on
  popstate, `history.back()` when closed by the UI. Must coexist with
  this page's replaceState mirror (2.12) and Next's history state;
  verify with Android Back emulation (page.goBack()) on /orders with the
  docs modal and the filter sheet open.

S15. Select hardening (platform/ui/Select.tsx) - CHANGE, not required by
this page on phones (the selects are hidden below 640) but by the
dashboard counterparty select: wrapper `min-w-0`, menu
`max-w-[calc(100vw-48px)]` with wrapping options below 640, open upward
or scrollIntoView when the menu would end below the viewport.

S16. Shell (D1): PlatformHeader burger + cabinet menu sheet, SideMenu
strip removed on phones, PlatformFooter phone legal bar. Owned by
shell-cabinet.

S17. Root layout viewport (D12): `export const viewport` with
`viewportFit: "cover"` so `env(safe-area-inset-bottom)` works in the
sheet footer.

---------------------------------------------------------------------

## 5. Files

This area's file set (disjoint from the other areas):

| File | Change |
|---|---|
| src/components/platform/orders/OrdersView.tsx | head CTA on both tabs (2.1); tab chip classes (2.2); `max-lg:hidden` on the desktop filter rows (:425, :529), table wrappers (:462, :566), pager wrappers (:473, :577); renders the phone toolbar, phone list and load-more from listPhone.tsx; `useListState` and `PaymentCell` move out (to listState.ts / PaymentCell.tsx); `switchTab` keeps q / period / cp / sort (2.12). Desktop markup otherwise untouched. |
| src/components/platform/orders/listParts.tsx | `SearchField` gains optional `className`, `placeholder` (default "Пошук"), `clearable` (default false) - additive, AssortmentView keeps working; `useListbox` exported (for the sort trigger, unless S10 lands a shared SortMenu). `Head`, `CELL`, `DIVIDER`, `ROW_ICON_BUTTON`, `Pager`, `useDismiss` unchanged. |
| src/components/platform/orders/DocumentsModal.tsx | tiles wrapped in the phone divider column (2.10); CTA phone label "Завантажити все"; `downloadAll` staggered 250 ms. Exports `openDocument`, `downloadAll`, `documentMeta`, `OrderDocumentTile` keep their signatures (used by detailParts.tsx:8 and OrderDetailsView.tsx:40). |

New files (this area):

| File | Content |
|---|---|
| src/components/platform/orders/listPhone.tsx | `OrdersPhoneToolbar` (search row + AppliedChips + meta/sort), `OrdersFilterSheet` (Sheet composition, 2.4), `OrderListRow`, `ReturnListRow` (2.6, 2.7), `OrdersPhoneList` / `ReturnsPhoneList` (ListPanel + ListEmpty + LoadMore + focus hand-off). Everything rendered `lg:hidden`. `OrderListRow` is exported so the dashboard may reuse it (7.7). |
| src/components/platform/orders/listState.ts | URL-backed `useListState(tab, params)`, `SORT_OPTIONS` (4 labels + {key, dir}), param parse / serialize / validation, the replaceState mirror (debounced q), defaults. |
| src/components/platform/orders/PaymentCell.tsx | `PaymentCell` moved verbatim from OrdersView.tsx:112-156 (comment + function); imported by OrdersView (desktop table) and listPhone (rows). DashboardView.tsx:162 keeps its own copy unless the dashboard area switches to it. |

Shared files this area needs but does NOT edit (section 4): ui/Button.tsx,
platform/ui/CabinetPage.tsx, CabinetPageHead.tsx, SignInPrompt.tsx,
Modal718.tsx, DocumentTile.tsx, Select.tsx, platform/ui/index.ts (new
exports), new shared Sheet / FilterButton / AppliedChips / SortMenu /
ListPanel / LoadMore / chipClass / radio icons, cart/useModalBehavior.ts,
platform/PlatformHeader.tsx, SideMenu.tsx, PlatformFooter.tsx,
src/app/layout.tsx (viewport), src/app/ui-gallery/UiGallery.tsx (gallery
entries for the new atoms).

No change: src/app/orders/page.tsx, layout.tsx, orders/data.ts,
store.ts, payment.ts.

Fallback if a shared atom is not ready when this area builds: implement it
locally inside listPhone.tsx with exactly the API of section 4 and the same
classes, and tell the system spec so it can be lifted (never fork a second
look).

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Tools: audit/mobile/kit/phone.mjs (`openPhone`, `domChecks`,
`shootSegments`, `shootViewport`), touch emulation on; reuse the flows of
audit/mobile/orders-list/functional.mjs and visual.mjs (their table
selectors must be switched to the phone list: `ul[aria-label="Список замовлень"]`).
Use `scrollTo({ behavior: "instant" })` (global smooth scroll, gotcha 10)
and real `tap()` (gotcha 14).

Widths: 320x568, 360x780, 390x844, 430x932, 600x960 for S1, S2, S3, S4,
S5, S7, S13; 390 for the rest; 320x568 + 390x844 for every overlay.

### 6.1 Measurements at 390 (b2b, S1), tolerance 0.5 px

- Slab top 66 (after the shell build); every block x 24, width 342.
- H2 "Мої замовлення": 30px / 36px / 700 / -0.6px, one line; subtitle
  14px / 20px #777779, 16 below; CTA 210x42, 32 below, 16/22 500.
- Tabs y = head bottom + 0 (head pb 24 to the chips): chips 36 tall,
  ~115.5 / ~115.9 wide, gap 8, active bg rgb(248,90,11) white text,
  inactive 1-px rgb(142,142,143) ring, 14px / 20px / 500. Tablist y
  identical on both tabs (OL-09).
- Search row 24 below the chips: input 282x46 at x 24, 16-px font;
  filter disc 52x52 at x 314, 1-px rgb(29,29,31) ring; badge 20 tall when
  filters are applied.
- Meta line 16 below: range 14/20 #777779; sort trigger box >= 44 tall.
- Panel 24 below: x 24, w 342, radius 32px, white; row padding 24;
  id 16/22 700; date 14/20 #777779 4 below; docs button 44x44 with a 40
  ring; chevron 24; sum 22/28 600; counterparty 14/20 rgb(52,52,53), not
  underlined; badges 38; dividers 1px rgb(210,210,210) from x 48 to 342.
- Row 1 height 234 (+-1), row with partial-overdue payment 256.
- Load-more: counter 48 below the panel, 14/20 #777779 centred;
  button 16 below, pill 42 + disc 42, total ~227, centred.
- Last block -> legal bar 48.
- Docs modal 390x844: card x 24 w 342, r32, 1-px #8e8e8f ring, p 24;
  close hit 44; rows: tile 48 r12, name 16/22 700 (no ellipsis on any
  mock name), meta 14/20, download hit 44; CTA 42 full width "Завантажити
  все"; no inner scroll.
- Filter sheet 390x844: bar 66, title 22/28 600, close glyph at x 342 /
  y 21 in a 48 hit; groups 48 / 1px / 48; option rows >= 44; footer 75
  with "Скинути" ~113 and "Показати 28" fill.

### 6.2 Width checks

- 320: nothing (except the full-bleed slab / legal bar) ends right of 296;
  search 212; meta wraps with the sort trigger right-aligned; badges wrap;
  counterparty <= 2 lines; long counterparty chip truncated inside 272;
  docs modal card 272, longest name 3 lines, pinned cross visible at the
  scroll end; sheet long counterparty option 2 lines.
- 360 / 430 / 600: no wrapping beyond 2.14; at 600 the docs card is 552
  wide (D7) and the sheet body 552.

### 6.3 DOM checks (domChecks) expected clean on every state and width

overflowX 0, offRight 0, offLeft 0, wideElement 0, hScroller 0 (no
table scroller on phones; the strip is gone), tinyText 0, inputZoom 0,
brokenImage 0, overlapText 0, fixedTall only for an open sheet / modal.
Accepted leftovers (must be the only ones): smallTarget for the 36-px
chips and the "Скинути" text button (master chip size), 42-px pills;
clippedText for the truncated counterparty chip at 320 and line-clamped
text. No console errors / page errors.

### 6.4 Flows

1. Row tap (not on the disc) -> /orders/48291064; Back -> same rows, same
   scroll Y (+-2), same `n`, same filters (also after searching "4829"
   and loading 20).
2. Docs disc -> modal; close via cross, scrim, Escape; focus returns to
   the disc; html overflow restored; preview opens the PDF; "Завантажити
   все" fires the staggered downloads.
3. Filter sheet: open (focus on the close button), pick "Увесь час",
   'ТОВ "Мережа готелів "Зоряний шлях"', "Скасовано" -> list updates
   live, footer "Показати N" matches the list, close via "Показати N",
   3 chips + badge 3; chip x removes one; "Скинути" clears all; Escape
   and cross close; Tab stays inside; header inert while open.
4. Sort: each of the 4 options reorders the list (date desc / asc,
   total desc / asc), `n` resets to 10, menu closes on pick / outside
   tap / Escape; at 320x568 the open menu is fully on screen.
5. Load-more on orders: 10 -> 20 -> 28, counter text updates (aria-live),
   focus lands on the first new row link, no scroll jump, button gone at
   28; returns 10 -> 12.
6. Search: "4829" filters; clear x empties and refocuses; "zzzz" -> the
   no-match panel visible without any swipe; "Скинути фільтри" restores
   S1.
7. Tabs: tap "Повернення" with q = "Mirotel" and status = "Скасовано":
   tablist y unchanged, q kept, status dropped; back to "Замовлення":
   q still "Mirotel". Keyboard arrows still switch tabs.
8. Fresh partner, both tabs: no toolbar, no load-more, the empty panel
   (tile + title + text) fully visible at 320 and 390; no CTA in the
   panel on phones.
9. Visitor and B2C, both tab URLs: prompt per S4; no footer jump between
   the pre-hydration and hydrated frames (delay JS 1.5 s as in
   functional.mjs `gate`); "Увійти" opens the auth drawer.
10. Keyboard pass (non-touch context, 390): tab order head CTA -> tabs ->
    search -> filter disc -> sort -> rows (link, disc) -> load-more;
    visible brand focus rings.
11. Store sync: cancel an order on /orders/<id> (CancelOrderModal) ->
    back -> the row badge reads "Скасовано".
12. If S14 lands: Android Back (page.goBack()) with the modal / sheet open
    closes the overlay and stays on /orders with the same filters.
13. Crossing 640 with the sheet open (resize 390 -> 700): the sheet closes,
    the desktop layout shows the same filters.

### 6.5 Desktop / landing pixel guard

- `node audit/mobile/kit/compare.mjs audit/mobile/baseline audit/mobile/after`
  over the 76 baseline shots: 0 differing files (landing + desktop).
- Extra desktop shots before / after (1440 and 1710, seed b2b): /orders,
  /orders?tab=returns, /orders with the docs modal open, /orders with a
  long counterparty picked, fresh partner /orders, visitor /orders; and
  the consumers of listParts.tsx: /dashboard, /assortment. All 0 diff.
- Computed-style spot check at 1440: tab 16px / 22px / 500, padding 12px
  16px, border-width 0, tablist background rgb(232,232,233); the phone
  toolbar / panel / load-more `display: none`; desktop filter row, table
  and pager visible.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

7.1 Shell dependency. Every y in section 2 assumes the D1 shell (no strip,
slab from y 66 with r32 top corners, pb 48) and the S3 head rhythm (pt 48
/ 16 / 32 / pb 24). The shell-cabinet spec was not available; if it picks
another head padding (its audit proposed pt 24, title -> subtitle 8,
-> actions 24) the system spec must choose one; D10 says pt 48 / 16 / 32.

7.2 listParts.tsx is imported by AssortmentView.tsx:21 (`SearchField`,
`useDismiss`) and DashboardView.tsx:10 (`ROW_ICON_BUTTON`). This area
owns the file; its changes are additive. If the assortment phone search
wants the clear button it passes `clearable`; it must not edit
listParts.tsx. Alternative: the system spec lifts SearchField into a
shared `platform/ui/SearchField.tsx` (then listParts re-exports it) and
unifies the catalog / materials copies.

7.3 DocumentsModal.tsx exports are used by the order-detail area
(detailParts.tsx:8, 224, 233; OrderDetailsView.tsx:40). Signatures stay;
the `downloadAll` stagger changes the detail card too (intended). The
detail documents card needs the same divider wrapper around DocumentTile
rows (order-detail area).

7.4 The returns area audit covered /orders?tab=returns. The returns list
lives in OrdersView.tsx (this area); the returns spec must limit itself to
/orders/returns/[id].

7.5 Filter button look: TR-10 = outlined 52 disc (this spec); the catalog
today uses a filled #1d1d1f 52 disc (CatalogClient.tsx:478) and materials
has MaterialsFiltersButton. One FilterButton for all (S8) - the system
spec picks the variant.

7.6 Applied-chip spacing: 16 below the search row here vs `mt-8` (32) on
the catalog phone today (CatalogClient.tsx:490). Pick one.

7.7 Order row recipe vs the dashboard "Останні замовлення" list
(DashboardView.tsx:276-300: r24, px-4 py-4, id 16/24 SemiBold, date on the
right, no docs disc, 0.5-px hairline). Same data, two looks. Proposal: the
dashboard reuses `OrderListRow` (exported from listPhone.tsx) with a
`documents={false}` prop, and `PaymentCell` is consolidated into
orders/PaymentCell.tsx (DashboardView.tsx:162 is a near copy built on a
`paymentCaption` helper - check they render the same captions before
merging).

7.8 URL state changes desktop behaviour (filters / page in the URL, no
pixel change). Confirm, or gate the mirror to phones.

7.9 Overlay Back-closes (S14) + this page's replaceState mirror + Next's
history state: needs one shared implementation and a test; until then F14
stays (minor).

7.10 Multi-download: iOS Safari keeps only the first programmatic
download; the real fix is one archive URL from the CRM (backend, out of
scope). Stagger is a partial fix.

7.11 Content decisions to confirm: eyebrow "Повернення №<id>" (exposes the
internal return id 9104...); phone-only strings "Завантажити все", search
placeholder "№ або контрагент", sort labels "Спочатку нові" / "Спочатку
старі" / "Сума: від більшої" / "Сума: від меншої", empty-state button
"Скинути фільтри"; the pending return document copy (OL-30).

7.12 TR deviations taken here (system spec to ratify): date under the id
instead of right (TR-07, 320 fit); document names up to 3 lines at 320
(TR-25 says 2); no CTA in the fresh-orders empty panel on phones (TR-24
says hug Button, the head CTA already offers it); no-match action is
outlinedDark (TR-24 says solid; solid stays reserved for the page CTA).

7.13 D7 modal width at 600 = 552 (100% - 48). The menu master caps its
column at 480 (Header.tsx:520); the system spec may cap short modals at
480 for 430..639.

7.14 Single-choice filters: the sheet keeps today's single-select model
(radio rows) because the desktop Selects are single-select; a
multi-status filter would diverge from desktop.

7.15 `has-[a:active]` row tint and `[&+&]:before:` dividers rely on
Tailwind v4 variants (`has-*`, arbitrary sibling) - fine in this repo, but
the shared ListRow should be checked once in the ui-gallery.
