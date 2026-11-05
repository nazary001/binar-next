# Phone spec - «Мій асортимент» (/assortment, B2B cabinet)

Status: area spec, phase 2 (design). Author: spec agent «assortment»,
2026-11-05. Phone = below 640 px (unprefixed classes / `max-lg:`), desktop
= `lg:` and stays byte-identical.

Inputs (all read): audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md (D1-D13,
binding), audit/mobile/lang/figma-mobile-language.md (TR-01..TR-32),
audit/mobile/lang/code-mobile-recipes.md, audit/mobile/assortment/
visual-report.md (AS-V01..V16, proposal P1-P13), audit/mobile/assortment/
functional-report.md (A1-A19), screenshots under audit/mobile/assortment/
shots/ (viewed: visual-rows-390-01/02, visual-selected3-390-01,
visual-emptyFresh-390-01, visual-removeModal-320-viewport,
visual-hscroll-390-x684, visual-toast-320-viewport,
visual-added-drawer-390-viewport), the source files below. Text widths for
the new strings come from a canvas probe with the served Manrope:
audit/mobile/assortment/spec-probe.mjs -> out/spec-probe.json /
out/spec-probe-digest.txt. shell-cabinet.md did not exist when this was
written; every shell number below is the D1 / D10 value and is marked
"shared". The sibling specs that landed meanwhile define the shared atoms
this page reuses, and this spec follows their APIs and rhythm:
orders-list.md (S3 CabinetPageHead phone, S10 SortMenu, S11 ListPanel /
ListRow / RowDisc / ListEmpty, S12 LoadMore; head pt 48 / pb 24, blocks
24 apart), cart.md (N3 QtyStepper hit boxes + 16/22 count, N6
ProductLine, N8 useMediaQuery), order-detail.md (back -> title 24, open
point O-1; N12 Toast, N13 usePhone).

Desktop sources (Figma section 4209:74148): default 4202:36108, empty
4929:65033, rows selected 4204:54233, added to the cart 4204:55408,
confirmation modal 4929:66214. There is no Figma phone frame; every phone
rule names the mobile master pattern (node id), the TR rule or the D
decision it comes from.

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
| S1 | 2.1 / 2.3 / 7.1 back -> title 24, head pb 24 | 48 / 48 (A-2, A-3): back 114-154, H2 202-238, subtitle 254-294, CTA 326-368, search 416-462, meta 466-510, panel 522; y map edited |
| S2 | S1 Button focus ring | Rejected (C-32, landing frozen); only the D8 strings change (A1); edited |
| S3 | S5 SearchField clear | A11 SearchField |
| S4 | S6 ListPanel / ListRow / RowDisc / ListEmpty | A7 / A14 |
| S5 | S7 LoadMore | A9 |
| S6 | S8 SortMenu | A12 (options from data.ts) |
| S7 | S9 StickyBar | A13 dark, `position="sticky"`; publishes `--phone-bottom-bar` |
| S8 | S15 phone media hook | A3 |
| S9 | 7.3 typed quantity, S16 | RowStepper copies the A18 recipe INCLUDING `editable` (A-10, partner context) |
| S10 | S17 ProductLine `titleLines` | A8 `titleLines={3}` |
| S11 | S18 / 7.7 toast | ExcelNoticeToast stays local (desktop identity) with the A23 phone classes and `z-[55]` below 640 (above the bar via `--phone-bottom-bar`, under the cart sheet z-60) |
| S12 | 7.13 empty action | A14: the reset "Скинути пошук" is outlinedDark (the head shows a solid primary); fresh state: no duplicate CTA |
| S13 | 7.8 / 7.9 desktop behaviour | Desktop frozen: phone-only divergences accepted |
| S14 | Build | C-assortment (wave 3) |
| S15 (critique round 1) | 2.7 block B ProductLine inside the `flex flex-col gap-3` row gains the atom's `py-6` (TR-07 lines 12 apart broken, row 337 -> 385) | A8 revised: `<ProductLine as="div">` has no vertical padding (`padded` false), blocks A / B / C stay 12 apart, row heights of 2.7 hold; edited in place |
| S16 (critique round 1) | 2.7 price dt `text-[14px] leading-5 text-neutral-500` (Regular) | `font-medium` added (KV labels 14/20 Medium, system 3.1.1 / D9); the same for "Роздрібна ціна"; edited in place |
| S17 (critique round 1) | 2.9 bar `bg-[#2d2d2f]`, Regular "Обрано:" label, `aria-live` on the whole line 1 | C-40: `bg-neutral-900`; label `font-medium` (SUMMARY_LABEL type); the live region wraps only `{count} {productsPlural(count)}` (`aria-live="polite" aria-atomic="true"`), not the total; the bar stays ONE line (a selection line, A13); edited in place |
| S18 (critique round 1) | 2.9 bar on short viewports; the row just ticked can sit under the bar | `[@media(max-height:499px)]:static` (system 3.1.6); after the bar mounts the code runs `document.activeElement?.scrollIntoView({ block: "nearest" })` (A13, WCAG 2.4.11); html `scroll-padding-bottom` reads `--phone-bottom-bar`; edited in place |
| S19 (critique round 1) | 2.6 ListPanel | A7 revised: `ul role="list"`, no `overflow-clip`, rows carry the r32 corners and the focus ring |
| S20 (critique round 1) | 2.8 LoadMore | A9 revised (counter not live; focus stays on the button; `focusAfterLast`) |
| S21 (critique round 1) | 2.10 ExcelNoticeToast; 2.11 confirm card | A23 revised rules (queue while the confirm card is open; action toasts persistent) apply to the phone classes; the confirm card follows the A6 one-DOM recipe |
| S22 (critique round 1) | 2.4 / 2.5 toolbar -> list 24 | Kept (A-4, labelled an invention); acceptance: the first row's top edge is on screen at 390 x 844 (system 6.3 item 13) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Route and files

| Route | Renders | Source |
|---|---|---|
| /assortment | B2B partner: cabinet shell (PlatformHeader, PlatformFooter) + `AssortmentView` on the `CabinetPage` slab. Visitor / B2C: public shell + `SignInPrompt` | src/app/assortment/page.tsx:25-27, layout.tsx:6-11 (`data-canvas="shop"`), src/components/platform/assortment/AssortmentView.tsx (790 lines), data.ts, store.ts, icons.tsx |

### 1.2 Seeds (localStorage)

| Seed | How | Result |
|---|---|---|
| b2b (demo partner) | `audit/kit/seed-b2b.json` | 48 lines (data.ts:67-85), 10 shown per page / per load step |
| fresh partner | seed-b2b with `accounts[0].id = "acc-fresh"`, `sessionId "acc-fresh"` | empty assortment (store.ts:43-46) |
| emptied demo | b2b + `binar.assortment.v1:demo-b2b = {"lines":[],"selected":[]}` | same empty state |
| long quantity | b2b + `binar.assortment.v1:demo-b2b` with `{id:"shampoo-alt-1",qty:1200}` first | long stepper count / sum |
| b2c | `audit/mobile/kit/seed-b2c.json` | SignInPrompt («Кабінет») |
| none | visitor | SignInPrompt («Увійти») |

### 1.3 States

Reached by the audits (all must be built and verified):

| # | State | How |
|---|---|---|
| S1 | rows (default) | b2b seed |
| S2 | selected (1..N rows) | tap row checkboxes |
| S3 | all shown selected | tap «Обрати всі» |
| S4 | added («Додано у кошик», 4204:55408) | bulk add -> cart sheet opens -> close it |
| S5 | remove confirm (one row) | row remove disc |
| S6 | bulk remove confirm | bar trash |
| S7 | after removal | confirm S5 / S6 |
| S8 | empty, fresh partner | acc-fresh seed |
| S9 | empty, emptied list | emptied seed or remove every row |
| S10 | no match | search «zzzz» |
| S11 | search hit | search «мило» |
| S12 | search hides a selected row | select row 1, search «Тапочки» |
| S13 | load more (20 / 30 / 48 shown) | «Показати більше» (replaces page 2 / per-page 50 of the audits) |
| S14 | sorted by sum desc / asc | sort menu (replaces the «Сума» head sort) |
| S15 | sort menu open | sort trigger (replaces the per-page listbox state) |
| S16 | Excel notice toast (long file name), with and without the bar | head or empty-state «Завантажити з Excel», pick a .xlsx |
| S17 | signed out / B2C | none / b2c seed |
| S18 | pre-hydration | first ~280 ms: PlatformGate hides the page (keep, works) |

Not reachable (no work, reason given):

| State | Reason |
|---|---|
| Excel upload modal / progress / parse error | no import endpoint; the picker only raises the notice (AssortmentView.tsx:62-92, data.ts:134-138). Figma has no upload frame for this page either. TR-26 dropzone is NOT used here. |
| Confirm button busy | `ConfirmModal busy` is never passed (AssortmentView.tsx:781-787) |
| Network / loading errors | the data is a localStorage mock read synchronously by `useSyncExternalStore` (store.ts:138-143); storage failure falls back to the in-memory session (store.ts:81-100) - no visible state |
| Disabled «Додати у кошик» | never disabled |
| Real iOS safe area / dynamic toolbar | Chromium emulation only; `env(safe-area-inset-bottom)` is 0 until the root viewport gets `viewport-fit=cover` (D12, shared) |
| Cart sheet content after the bulk add | cart area spec (seen in visual-added-drawer-390-viewport.png) |
| 640..1196 desktop band (landscape 844x390) | desktop canvas, frozen, no tablet layout (BRIEF) |

---------------------------------------------------------------------

## 2. Phone layout, block by block

### 2.0 Principles for this page

- Two trees in one component: the existing desktop tree (head, toolbar
  with the in-flow SelectionBar, the 1400-px table, the numbered pager)
  gets `max-lg:hidden` on its phone-broken parts and keeps every desktop
  class; a NEW phone tree (`lg:hidden`) renders the list panel, the meta
  row, load-more and the sticky selection bar. Hidden trees are
  `display:none`, so there is no duplicate in the a11y tree and no desktop
  pixel change (D12, code recipes section 5).
- Phone content width: 342 at 390, 272 at 320, 312 at 360, 382 at 430,
  552 at 600 (D10 gutters 24). Panel row content (panel px 24) = 294 /
  224 / 264 / 334 / 504.
- Type only from the phone scale (D9). Buttons only Button/Small 42 (D8).
  Every target >= 44 except 42 pills and the 40 stepper boxes (D8, TR-15,
  TR-32). Dividers 1 px #d2d2d2 (D10). No 0.5-px lines.
- Interactive phone controls get `focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-brand` (white ring on the dark
  bar) (D12).

### 2.1 Vertical map at 390 x 844 (S1, expected after the shell work)

| y | Block | Rule |
|---|---|---|
| 0-66 | PlatformHeader (logo, cart disc, burger; no chip, no strip) | D1, shared |
| 66 | slab #f5f5f5 starts, top corners r32 | D1, shared CabinetPage |
| 114-154 | back «До каталогу» (40 disc + 16/22 SemiBold) | TR-05, article crumb 3176:6558, shared head |
| 202-238 | H2 «Мій асортимент» 30/36 Bold -0.6 (229.6 wide: 1 line at 320), 48 below the back row (SYSTEM A-2) | D9, TR-03, shared head |
| 254-294 | subtitle 14/20 #777779 (2 lines; 3 at 320 / 360) | D9, TR-03 |
| 326-368 | Button/Small «Завантажити з Excel» 204 x 42, left (all states) | TR-04, hero CTA 3082:3250 |
| 416-462 | search pill 342 x 46 (head pb 48, SYSTEM A-3) | TR-03 head -> first block 48, TR-10, 2.4 |
| 466-510 | list meta row (44 box; text 478-498) | TR-11, TR-07, 2.5 |
| 522- | list panel, row 1 522-859 (337 tall) | TR-07, TR-08, 2.6-2.7 |
| ~3880 | panel bottom (10 rows, height varies with name lines) | |
| +48 | «Показано 10 із 48» 14/20, +16 Button «Показати більше» | D4, TR-12, blog 3176:5601 |
| +48 (shared CabinetPage pb) | cabinet legal bar | D10, shared |
| viewport bottom (when selected) | sticky dark selection bar, 114 tall | D5, TR-18, 2.9 |

The head numbers (pt 48, back -> title 24, title -> subtitle 16, subtitle
-> actions 32, head pb 24, then blocks 24 apart) are the shared
CabinetPageHead phone variant as orders-list.md (S3, 2.0) and
order-detail.md (head table) assume them; TR-03's 48 below a crumb is
order-detail's open point O-1. This page passes props only and inherits
whatever the system spec settles (section 7 item 1). First viewport at 390
x 844: head, search, meta row and row 1 complete. At 320 x 568: subtitle
230-290, CTA 322-364, search 388-434, meta 438-482, panel 494.

### 2.2 Shell (shared, not built here)

- Header 66 + burger sheet with the account row and the «Кабінет» group;
  «Мій асортимент» is a row of that group and is the ACTIVE (brand) row on
  /assortment (D1; today the strip lights «Каталог»). No strip: the page
  starts at y 66 instead of 148 (D1, TR-02).
- Slab: `bg-bg-cabinet`, phone top corners r32, bottom 48 to the legal bar
  (D1, D10). The slab must NOT get `overflow: hidden/auto` on phones: the
  selection bar is `position: sticky` inside it (section 7 item 6).
- Legal bar phone band (D1, shell spec).

### 2.3 Page head (CabinetPageHead, shared phone variant)

Call site AssortmentView.tsx:587-597, props unchanged:

```tsx
<CabinetPageHead
  className="lg:h-[208px]"
  back={{ label: "До каталогу", href: "/catalog" }}
  title="Мій асортимент"
  subtitle="Швидке замовлення регулярних товарів: оберіть потрібні позиції та додайте їх у кошик в один клік."
  actions={<Button type="button" size="responsive" onClick={excel.open}>Завантажити з Excel</Button>}
/>
```

- Phone geometry comes from the shared variant (S2): pt 48, back 40, 24,
  H2 30/36 Bold -0.6 (`text-h2`), 16, Body Small 14/20 #777779, 32, hug
  Button/Small 204 x 42 left-aligned, pb 24 (TR-03, TR-04, D9, D10; hero
  text block 3082:3246 -> 3082:3250).
- The head CTA stays in EVERY state (also S8 / S9), so the head never
  changes height between states; the duplicate «Завантажити з Excel» is
  removed from the phone empty panel instead (2.12). Same choice as
  orders-list.md 2.8 (fresh orders: head CTA kept, panel action dropped).
  Fixes the duplicate CTA of AS-V06 without a new shared prop.
- 320..639: title 1 line everywhere (229.6 <= 272); subtitle 3 lines at
  320 / 360 (60), 2 lines from 390 (40).

### 2.4 Search (toolbar)

Today: toolbar AssortmentView.tsx:600-633 = `flex flex-col gap-4 px-6 pb-6
lg:min-h-[46px] lg:flex-row lg:items-center lg:justify-between lg:pb-8
lg:pl-10 lg:pr-8` holding SearchField, the «Скинути виділення» text button
and the in-flow SelectionBar.

Phone:
- Toolbar classes become `flex flex-col gap-4 px-6 lg:min-h-[46px]
  lg:flex-row lg:items-center lg:justify-between lg:pb-8 lg:pl-10 lg:pr-8`
  (phone `pb-6` dropped; desktop already has `lg:pb-8`, so desktop is
  identical) plus `max-lg:hidden` when `empty` (S8 / S9: no search on an
  empty assortment, AS-V06). CTA -> search = the head's pb 24 (D10).
- SearchField (shared, orders/listParts.tsx:137-159): full width 342 x 46,
  r50, 1-px #8e8e8f ring, 16-px text (no iOS zoom), placeholder «Пошук»,
  magnifier 24 at right 16; NEW clear control when filled (S5): 24 «clear»
  glyph in a 44 box replacing the magnifier, tap -> query "" + focus the
  input (fixes A16). No filter button: the page has no filters (TR-10
  search row without the 52 disc).
- «Скинути виділення» text button (AssortmentView.tsx:613-622): add
  `max-lg:hidden` (phones reset from the bar, 2.9; fixes A11 / AS-V11).
- SelectionBar (AssortmentView.tsx:433): add `max-lg:hidden` to its root
  div (fixes A2 / AS-V02 on phones; the phone bar is 2.9).
- Search behaviour on phones: typing resets the phone load step to 10
  (2.8) and the desktop page to 1 (as today).

### 2.5 List meta row (replaces the dark table head on phones)

New, first child of the phone list section, only when the filtered list is
not empty (hidden in S8 / S9 / S10).

```tsx
<div data-block="list-meta" className="relative mt-1 flex h-11 items-center justify-between gap-4">
  <button type="button" role="checkbox" aria-checked={mixed ? "mixed" : allShown}
    aria-label="Обрати всі показані товари" onClick={toggleShown}
    className="-ml-2.5 flex h-11 cursor-pointer items-center gap-2 rounded-full pl-2.5 pr-2 text-[14px] font-medium leading-5 text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
    {/* CheckboxMixedIcon / CheckboxOnIcon (text-brand) / CheckboxOffIcon (text-neutral-900), size-6 */}
    <span>Обрати всі</span>
  </button>
  <SortMenu label="Сортування" value={sortKey} options={ASSORTMENT_SORT_OPTIONS} onChange={...} />  {/* shared S8 = orders S10 */}
</div>
```

- Geometry: 44-px box, 20-px text centred (12 above / below): search bottom
  -> text 16 (mt-1 + 12), text -> panel 24 (12 + panel `mt-3`) - the
  orders meta line rhythm (orders-list.md 2.0: search, 16, meta, 24,
  panel). Checkbox glyph at x 24 (content edge) thanks to `-ml-2.5
  pl-2.5`.
- «Обрати всі» = all SHOWN rows (D4 load-more replaces pages): on / mixed /
  off exactly like the desktop head checkbox (AssortmentView.tsx:275-282,
  540-544) but over `shownIds`. Visible text «Обрати всі» is inside the
  accessible name (WCAG 2.5.3).
- Sort (TR-11 trigger 14/20 Medium #343435 + 16 chevron, TR-07 «column
  headers disappear; their sort moves into the sort control»): options
  «Без сортування» (null), «Сума: від більшої» (desc), «Сума: від меншої»
  (asc) - the same option wording as the orders sort (orders P4). The
  trigger shows the current option. Selecting: `setSort`, desktop page 1,
  phone step back to 10, menu closes, focus back on the trigger (fixes
  AS-V13: no sort control existed in the phone flow).
- Fits 320 (272): left button layout = 24 + 8 + 71.7 + 8 (pr-2) = 111.7
  (its 10-px `pl-2.5` is cancelled by `-ml-2.5`), right trigger layout =
  115 + 4 + 16 + 8 (pl of `px-2`) = 143 for the widest label «Сума: від
  більшої» (its right `px-2` is cancelled by `-mr-2`); 111.7 + 16 + 143 =
  270.7 <= 272. The cancelled paddings are hit area reaching into the
  24-px gutters (allowed). Verify no offRight at 320.
- Sort menu panel (shared S8): anchored to this `relative` row, full
  content width (342), opens downward, z-20, white r24, shadow 0 2 6
  rgba(29,29,31,.1), items 44 tall px 16 16/24, 1-px #d2d2d2 between items,
  selected brand (TR-11, checkout select menu 4329:41044).

### 2.6 List panel (TR-07, D5, D11)

```tsx
<section data-block="list-phone" className="flex flex-col px-6 lg:hidden">
  {meta row 2.5}
  <ListPanel label="Товари асортименту" className={metaVisible ? "mt-3" : empty ? "" : "mt-6"}>   {/* shared S6 = orders S11 */}
    {shown.map((row) => <PhoneRow key={row.id} row={row} ... />)}
    {/* or the ListEmpty content of 2.12 */}
  </ListPanel>
  {load-more 2.8}
  {selection bar 2.9 is rendered after this section, as the last child of CabinetPage}
</section>
```

- Panel top: 24 below the meta text (S1-S3, `mt-3`), 24 below the search
  when the meta row is hidden (S10, `mt-6`), 24 below the head CTA when the
  toolbar is hidden (S8 / S9: head pb 24, no margin). D10 blocks 24 apart.
- `ListPanel` = `ul flex flex-col overflow-clip rounded-[32px] bg-white`
  (white r32 panel without a stroke on the slab: D1, D5; TR-07 cabinet
  variant). Width 342 at 390 (100% - 48). `overflow-clip` is safe: no row
  control reaches outside the panel (the -m hit boxes stay inside the
  24-px row padding).
- Rows separated by 1-px #d2d2d2 lines inset 24 (the row content width),
  none above the first row (`[&+&]:before:` recipe of orders S11; TR-07,
  D10; customisation rows 3127:17385).
- Desktop: the table wrapper `<div className="px-6 lg:pl-10 lg:pr-8">`
  (AssortmentView.tsx:635) gets `max-lg:hidden`; the dead phone helpers
  `max-lg:[container-type:inline-size]` (639) and the EmptyRow sticky pin
  `max-lg:sticky max-lg:left-0 max-lg:w-[100cqw]` (400) are removed (no
  desktop effect). Fixes A1 / AS-V01 / A15 / A19.

### 2.7 Row (the 11 table columns as one block)

Borrows: blog card head row 3176:5545 (state left, disc right), hero trust
row 3085:3718 via TR-08 (64 photo tile + 16 + text; the cart's shared
ProductLine N6), footer contact rows 3111:14916 via TR-27 (label / value
lines), checkout phone cards CheckoutItems.tsx:156-186 (product line, then
stepper | total), TR-14 (status pill colours), TR-15 (stepper), TR-07
(row action disc top right; row lines 12 apart).

```tsx
<ListRow data-row={row.id} className="@container">   {/* shared S6 = orders S11: li relative px-6 py-6 has-[a:active]:bg-bg-subtle + [&+&]:before: 1-px line */}
  <div className="flex flex-col gap-3">

    {/* A. head line: select | availability | remove */}
    <div className="grid grid-cols-[24px_minmax(0,1fr)_40px] items-center gap-x-3 @max-[250px]:gap-y-3">
      <Checkbox phone checked={checked} onToggle={onToggle} label={`Обрати «${row.name}»`} />
      <div className="flex min-w-0 @max-[250px]:col-span-3 @max-[250px]:row-start-2">
        <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
      </div>
      <RowDisc label={`Видалити «${row.name}» з асортименту`} onClick={onRemove}
        data-action="remove" className="col-start-3 row-start-1">            {/* shared S6 RowDisc: 44 box, 40 ring */}
        <RemoveIcon className="size-6" />
      </RowDisc>
    </div>

    {/* B. product line (TR-08) = shared ProductLine (cart N6) */}
    <ProductLine as="div" image={row.product.image} title={row.name} titleLines={3}
      meta={`Артикул: ${row.sku}`} href={productHref(row.product)} />

    {/* C. prices (TR-27, dense: no lines between the three) */}
    <dl className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-[14px] font-medium leading-5 text-neutral-500">Оптова ціна</dt>   {/* SYSTEM critique round 1: KV labels 14/20 Medium */}
        <dd className="whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900">{formatPrice(row.wholesale)}</dd>
      </div>
      {/* «Роздрібна ціна» identical */}
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-[14px] font-medium leading-5 text-neutral-900">Ваша ціна</dt>
        <dd className="whitespace-nowrap text-[16px] font-bold leading-6 text-neutral-900">{formatPrice(row.partner)}</dd>
      </div>
    </dl>

    <div aria-hidden className="h-px bg-stroke-subtle" />

    {/* D. order line: stepper | sum */}
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <RowStepper phone qty={row.qty} name={row.name} onQty={onQty} />
      <p className="ml-auto flex flex-col items-end">
        <span className="text-[12px] leading-4 text-neutral-500">Сума</span>
        <span className="whitespace-nowrap text-title-lg text-neutral-900">{formatPrice(row.sum)}</span>
      </p>
    </div>
  </div>
</ListRow>
```

Atoms. Local ones live in the area file `parts.tsx` (moved out of
AssortmentView.tsx so both trees share them; with `phone` false the
desktop class strings are byte-identical):

| Atom | Phone classes | Desktop (unchanged) | Rule |
|---|---|---|---|
| `Checkbox phone` (area) | button `relative -m-2.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`, glyph 24 (on / mixed `text-brand`, off `text-neutral-900`) -> 44 target, 24 layout | AssortmentView.tsx:150 (`size-6` + `before:-inset-2`) | TR-22 24 checkbox, D8 >= 44 |
| `RowDisc` (shared S6, orders S11) | button `relative z-[1] -m-0.5 flex size-11 cursor-pointer items-center justify-center rounded-full` > span `flex size-10 items-center justify-center rounded-full border border-neutral-900 bg-white text-neutral-900 transition-colors duration-200 [button:active>&]:bg-bg-subtle` > glyph; must forward `data-action` and `className` (S6) | new (desktop row keeps the borderless 42 button, :373-381) | TR-07 «40 outlined discs at the row's top right», back disc 3176:6559, D8 44 target |
| `ProductLine` (shared S17, cart N6) | photo `size-16 rounded-2xl bg-bg-product` (64 r16), column `flex min-w-0 flex-1 flex-col gap-1`, name `line-clamp-3` (new `titleLines={3}`) `text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900`, meta `line-clamp-2 text-body-sm text-neutral-500`; with `href` photo + column are ONE `Link` (`aria-label={title}`, focus ring) | desktop keeps the 60 r12 photo + truncated name cell (:331-353) | TR-08, D5 photo r16 at 64 |
| `RowStepper phone` (area) | `flex items-center gap-2`; +/- `relative -m-3 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 active:text-brand disabled:cursor-default disabled:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand` with the 16 glyph (40 box, 16 layout = the cart N3 recipe); count `min-w-7 whitespace-nowrap text-center text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900` (TR-15 16/22 Bold, = QtyStepper `size="xs"`); aria-labels keep the product name («Зменшити кількість: {name}») | :166-188 (16 boxes + `before:-inset-2`, 20/22 count) | TR-15, D8, cart N3 |

Geometry and stretch (row content W = 294 at 390, 224 at 320, 504 at 600;
blocks 12 apart = TR-07 «lines 12 apart»):

| Part | 390 (W 294) | 320 (W 224) | 600 (W 504) |
|---|---|---|---|
| A head | checkbox glyph x 48, pill 38 tall starting x 84 (12 after the 24 checkbox), remove ring 40 ending at x 342; line 40 tall | container query `@max-[250px]` (W < 250, i.e. viewports < 346): the pill drops to its own grid row under the checkbox / remove line, 12 below, for EVERY row (one rhythm per screen). Pill room inline = W - 88: 136 at 320 (only «В наявності» 116.5 would fit) vs 176 at 360 (all three fit: 116.5 / 144.7 / 171.1) | one line |
| B product | photo 64 r16; name column 214: names 2 lines (ALDA 3); SKU 127.6 | name column 144: Botanica names 3 lines, ALDA 4 -> clamped at 3 with an ellipsis | name column 424: 1-2 lines |
| C prices | 3 lines 24 tall, 8 apart = 88; label left, value right | widest pair 98.6 + 16 + 85.3 = 200 <= 224 | lines 504 wide (TR-27 rows are full width) |
| line | 1 px #d2d2d2, 12 above / below | | |
| D order | stepper visual 76 (16 + 8 + 28 + 8 + 16), +/- boxes 40; sum 106.5 max («15 197,50 ₴»); 44 tall (caption 16 + value 28) | 76 + 16 + 106.5 = 198.5 <= 224; qty 1200 (count ~38) -> 86 + 16 + 106.5 = 208.5 still fits; a wider case wraps the sum to its own line, kept right by `ml-auto` (no overflow) | one line |
| Row height | 24 + 40 + 12 + 68 (name 2 lines 44 + 4 + SKU 20) + 12 + 88 + 12 + 1 + 12 + 44 + 24 = 337; 359 with a 3-line name | 24 + 40 + 12 + 38 (pill row) + 12 + 90 (name 3 lines) + 12 + 88 + 12 + 1 + 12 + 44 + 24 = 409 | 333 (1-line name, the 64 photo sets the line) |

Behaviour:
- Photo + name + SKU are one link to the PDP (ProductLine `href`; as today
  the name links there, now the target is >= 64 x 68). The desktop name's
  `title` tooltip is not repeated (touch has no hover; the 3-line clamp
  shows volume and brand: fixes A4 / AS-V04). Pressing it tints the row
  #f8f8f8 (`has-[a:active]`, ListRow).
- Name clamp is 3 lines, not the 2 of TR-08 / the language doc section 7 /
  ProductLine's default: the distinguishing volume and brand sit at the
  END of every name («Шампунь для волосся і тіла, 40мл, Botanica»), 2 lines
  at 320 cut the brand (AS-V04). Deliberate deviation, section 7 item 4.
- Selected row: only the checkbox turns brand (as desktop; no row tint, no
  colour invention, D13).
- Stepper: `setLineQty` (min 1, as today); a quantity change of a selected
  row updates the bar total and ends the added state (selectionKey,
  AssortmentView.tsx:503-504).
- Remove disc -> ConfirmModal (2.11).

### 2.8 Load-more (D4, TR-12)

```tsx
<LoadMore shown={shown.length} total={filtered.length}
  onMore={() => setShownCount((n) => n + PHONE_STEP)} />   // shared S7 = orders S12; renders nothing when shown >= total
```

- `PHONE_STEP = 10` (data.ts). `shown = filtered.slice(0, shownCount)`;
  `shownCount` resets to 10 on query / sort change and after the list
  shrinks below it.
- Block 48 below the panel (`mt-12`): counter «Показано 10 із 48» 14/20
  #777779 centred (113.2 wide, `aria-live="polite"`), 16, Button/Small
  «Показати більше» with the plus disc (128.9 + 48 + 8 + 42 = 227 wide, =
  blog 3176:5601), centred. When everything is shown (or the filtered
  total is <= 10) the block is not rendered and the panel is the last
  block (orders S12 behaviour; fixes «1-1 із 1 Показувати по: 10» of
  AS-V08).
- After a tap: rows are appended below the old last row; the scroll
  position does not move (Chrome scroll anchoring keeps the visible rows
  put); focus moves to the first appended row's checkbox with
  `{ preventScroll: true }` (the button may unmount on the last tap: focus
  must never fall to `<body>`).
- The desktop pager (AssortmentView.tsx:692-779) gets `max-lg:hidden` on
  its root div; the per-page control does not exist on phones (D4). Fixes
  A8 / A9 / AS-V08 on phones.
- Bottom: last block -> legal bar = 48 (shared CabinetPage pb, D10); with
  an active selection the bar rests 48 below the last block (2.9).

### 2.9 Selection bar (TR-18 dark, D5)

New component `PhoneSelectionBar` (area file), rendered as the LAST child of
`CabinetPage` (after the phone list section), only when
`selectedRows.length > 0`.

```tsx
<section ref={barRef} data-block="selection-bar-phone" aria-label="Обрані товари"
  className="sticky bottom-0 z-30 mt-12 rounded-t-[32px] bg-neutral-900 [@media(max-height:499px)]:static px-6 pt-4 pb-[calc(16px_+_env(safe-area-inset-bottom))] text-white transition-[translate,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-full starting:opacity-0 motion-reduce:transition-none lg:hidden">
  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <p className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[14px] font-medium leading-5 text-neutral-400">Обрано:</span>
      <span aria-live="polite" aria-atomic="true" className="text-[16px] font-bold leading-[22px] tracking-[0.16px]">{count} {productsPlural(count)}</span>
    </p>
    <p className="whitespace-nowrap text-title-lg"><span className="sr-only">Сума: </span>{formatPrice(total)}</p>
  </div>
  {hiddenBySearch > 0 && (
    <p className="mt-1 text-[12px] leading-4 text-neutral-400">Приховано пошуком: {hiddenBySearch}</p>
  )}
  <div className="mt-3 flex items-center gap-2">
    <Button type="button" size="small" fullWidth
      variant={added ? "outlined" : "accent"}
      onClick={added ? openCart : onAdd}>
      {added ? "Відкрити кошик" : "Додати у кошик"}
    </Button>
    <button type="button" onClick={added ? onReset : onRemove}
      aria-label={added ? "Скинути виділення" : "Видалити обрані товари з асортименту"}
      className="group -m-px flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
      <span className="flex size-[42px] items-center justify-center rounded-full border border-white text-white transition-colors duration-200 group-active:bg-white group-active:text-neutral-900">
        {added ? <RemoveIcon className="size-6" /> : <TrashIcon className="size-6" />}
      </span>
    </button>
  </div>
</section>
```

- Sticky, not fixed: the bar sits at the viewport bottom while its in-flow
  slot (after the last block) is below the fold, and rests in flow (48
  below the last block, then the 48 slab padding, then the legal bar) when
  the user reaches the bottom. It therefore reserves its own height (TR-18
  «the page reserves the bar height») without a spacer and never covers
  the legal bar or the last row. The cart sheet uses the same sticky-dark
  idiom for its footer (cart.md 2.3: `sticky bottom-0 ... rounded-t-[32px]
  bg-[#2d2d2f]`). Appearing adds height only
  at the END of the page: no row moves (fixes A3 / AS-V05: 98-px jump).
- Geometry: full bleed (CabinetPage has no phone padding), #1d1d1f
  (SYSTEM critique round 1, C-40: the one shop / cabinet dark; was
  #2d2d2f of TR-18), top corners r32 (D5 «sticky bars top r32
  (dark)»), px 24, pt 16, pb 16 + safe area. Line 1 28 tall (total 22/28
  SemiBold, `text-title-lg` phone token = D9 amounts); 12; line 2 = 42
  pill + 44 disc box. Height 114 (134 with the hidden-by-search caption).
  At 320 x 568 that is 20 % of the viewport (fixedTall threshold 30 %).
- Line 1 fits 272 at 320: «Обрано:» 55.1 + 4 + «10 товарів» 82 (48: 84) +
  16 + total 106.5 = 263.6. A 6-digit total (122.7) wraps the total onto
  a second line (flex-wrap, 4 apart) instead of overflowing (fixes A2 /
  AS-V02). The «Сума:» word of the desktop bar is visually dropped on
  phones (kept as `sr-only`): with it line 1 needs 300 px and would wrap
  at 320 for any count.
- Line 2: Button/Small accent fullWidth (D8; the accent «Додати у кошик» of
  4204:55404) + the 42 outlined-white trash disc (TR-18 outlined-white
  controls on dark). One Button element with conditional props (not two
  elements), so the DOM node survives the state flip and the cart sheet
  hands focus back to it.
- Added state (S4, phone only): after the bulk add the pill becomes the
  outlined-white «Відкрити кошик» (opens the cart sheet) and the trash disc
  becomes the «clear» disc «Скинути виділення» (same 42 geometry, nothing
  jumps). Rationale: on a phone the full-screen cart sheet hides the page,
  so a second «Додати у кошик» tap silently doubled the quantities (A10 /
  AS-V11, badge 99+). The state ends when the selection or a selected
  quantity changes (existing `selectionKey` logic). Desktop keeps the Figma
  label (4204:55408) - section 7 item 8.
- The added key persists for the tab session:
  `sessionStorage["binar.assortment.added.v1:<ownerId>"] = selectionKey`
  (store.ts helpers), read on mount, cleared on reset / removal (fixes the
  «lost on reload» part of A10; without it a reload would re-arm the
  double add).
- Hidden by search (S12): `hiddenBySearch = selectedRows that are not in
  filtered` (only when the query is non-empty); the caption tells the
  partner that the count / total / bulk add include rows the search hides
  (A13). The cross-search selection itself is kept (the store persists it,
  desktop behaves the same).
- Motion: slides up from its own height + fades in, 400 ms
  `cubic-bezier(0.22,1,0.36,1)` = the menu master motion (3117:13578
  built in Header.tsx), via `@starting-style` (`starting:`); no exit
  animation (unmount). `motion-reduce:transition-none`.
- z-30: above the page, below the toast (z-[35]), drawers / sheets (z-40+)
  and modals (z-[60]); the header (z-50) never meets it.
- Height for the toast: `barRef` is observed with a ResizeObserver; its
  `offsetHeight` (0 when there is no bar or at >= 640 where it is
  `display:none`) is written to the CSS variable `--bar-h` on the toast
  container (2.10).

### 2.10 Excel notice toast (TR-31)

ExcelNoticeToast, AssortmentView.tsx:98-122, restyled with `lg:` restoring
every desktop value:

| Element | Phone | Desktop restore |
|---|---|---|
| container (:103) | `pointer-events-none fixed inset-x-0 z-[35] flex justify-center px-6 bottom-[max(calc(24px_+_env(safe-area-inset-bottom)),calc(var(--bar-h,0px)_+_8px))]` + `style={{ "--bar-h": `${barH}px` }}` | `lg:bottom-6 lg:z-50 lg:px-4` |
| card (:106) | `pointer-events-auto flex w-full max-w-[342px] items-center gap-2 rounded-3xl bg-[#2d2d2f] py-3 pl-6 pr-1 text-[14px] leading-5 text-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]` | `lg:w-auto lg:max-w-[560px] lg:gap-3 lg:bg-neutral-900 lg:pl-5 lg:pr-3 lg:leading-6` |
| text (:107-109) | `<p className="min-w-0 flex-1 lg:min-w-auto lg:flex-initial">Імпорт з Excel ще недоступний: файл <span className="max-lg:inline-flex max-lg:max-w-full max-lg:align-bottom"><span>«</span><span className="max-lg:min-w-0 max-lg:truncate">{name}</span><span>»</span></span> не завантажено.</p>` (sentence verbatim; the quoted name truncates as one unit instead of breaking mid-word) | `lg:min-w-auto lg:flex-initial` restore the flex-item defaults (min-width auto, flex 0 1 auto) the bare `<p>` has today; the extra spans are plain inline on desktop (same text, same breaks) |
| close (:110-117) | `flex size-11 shrink-0 ... rounded-full text-white`, glyph `RemoveIcon size-6` | `lg:size-8`, glyph `lg:size-5` |

- Width min(342, 100% - 48): 342 at 390, 272 at 320, 342 centred at 600.
- Bottom: 24 above the safe area, or 8 above the selection bar when it
  shows (TR-31 «above any sticky bar + 8»).
- z-[35]: under the cart sheet / drawers (z-40) and modals (fixes A12:
  the toast covered «Оформити замовлення»), above the bar.
- Height at 320 <= 104 (4 lines x 20 + 24) instead of 144-168; at 390
  84 (3 lines: line 1 «Імпорт з Excel ще недоступний: файл» is 244 wide
  and fits the 262 text column).
- `role="status" aria-live="polite"` region stays mounted (as today); auto
  hide 8 s (as today).

### 2.11 Remove confirmation (S5 / S6 / S7; shared ConfirmModal, D7 short modal)

- Opened by the row RowDisc remove (single, `name` given) or the bar trash
  (bulk). Copy unchanged (AssortmentView.tsx:575-581): «Видалити товар?» /
  «Видалити 3 товари?», the «Ви впевнені...» body.
- Phone card from the shared Modal718 short-modal variant (S4): centred,
  width 100% - 48 (342 at 390), white r32, 1-px #8e8e8f ring, p 24, title
  24/28 Bold -0.48 + 24 clear glyph in a 44 box; body 16/24 #343435;
  actions stacked full width 8 apart: «Скасувати» outlinedDark first,
  «Підтвердити» solid last (TR-17, D7, D8; contact form card 3166:7864
  ring). Expected at 320: title 2 lines, body 6 lines (144), card ~382
  tall <= 568 - 48; at 390: title 1 line, body 4 lines.
- Scroll lock on documentElement, focus on the close cross, Escape /
  scrim / «Скасувати» close, focus returns to the opener (useModalBehavior,
  works today).
- After «Підтвердити» (AssortmentView.tsx:557-572 rewritten for both
  trees): the target is looked up in the VISIBLE tree (`listRef` when the
  shared `useMediaQuery("(min-width: 640px)")` (cart N8) / `usePhone()`
  (order-detail N13) says phone - whichever the system spec keeps - else
  `tableRef`), with the index taken from `shownIds` on phones and
  `pageIds` on desktop:
  - single removal: the next row's RowDisc (`[data-action="remove"]`) at
    the removed index, `focus({ preventScroll: true })` - the next row
    slides into the removed row's place, so nothing moves (fixes A7 /
    AS-V03: the table used to swing to scrollLeft 1058);
  - bulk removal: the first remaining row's checkbox at the smallest
    removed index; if it is outside the viewport, `focus({ preventScroll:
    true })` then `li.scrollIntoView({ block: "nearest" })`;
  - nothing left: the empty panel's «Переглянути каталог» link (phones) /
    the empty row's first button (desktop, as today); no match left: the
    search input.
  The desktop path keeps today's `tbody button[data-action="remove"]`
  lookup exactly.

### 2.12 Empty states (S8 / S9 / S10; TR-24, D11)

Phone-only content of the phone ListPanel (shared `ListEmpty`, S6 = orders
S11 / orders 2.8), never a table row; the desktop EmptyRow /
TableEmptyState stay as they are.

```tsx
<ListPanel label="Товари асортименту">
  <ListEmpty
    icon={<CatalogueIcon className="size-6" />}            // S8 / S9 only
    title="Ваш асортимент ще не сформовано"
    text="Зробіть перше замовлення, щоб автоматично додати ваші найзатребуваніші товари, або завантажте власний список товарів з Excel."
    action={<Button href="/catalog" size="small" variant="accent">Переглянути каталог</Button>}
  />
</ListPanel>
```

ListEmpty content (orders 2.8): `flex flex-col items-center px-6 py-12
text-center`: [52 icon tile `relative flex size-[52px] items-center
justify-center rounded-xl border border-stroke-default bg-white
text-neutral-900`] 24 [title `text-title-lg text-neutral-900`] 16 [text
`max-w-[294px] text-body-sm text-neutral-500`] 32 [action].

- S8 / S9 (fresh partner, emptied list): no search, no meta row, no
  load-more; the head (with its «Завантажити з Excel» CTA, 2.3) stays, the
  panel follows the CTA 24 below (head pb). Icon tile = the «Каталог» rail
  glyph `CatalogueIcon` (platform/icons.tsx:20; the strip lights «Каталог»
  on this route today), the same «rail glyph in a 52 Info-icon tile» as
  the fresh orders state (master Info icon 3085:3719). Title Large 22/28
  SemiBold, 2 lines at 320..430 (1 at 600); text 14/20 #777779, 5 lines at
  320 / 360, 4 at 390, 3 at 430; ONE hug Button/Small accent «Переглянути
  каталог» (165.1 + 48 = 213; TR-24 «hug Button/Small»). The outlined
  «Завантажити з Excel» of the desktop empty row is NOT repeated on phones:
  the identical head CTA sits right above (fixes the duplicate of AS-V06).
  At 390: panel 368-766 (48 + 52 + 24 + 56 + 16 + 80 + 32 + 42 + 48 = 398),
  legal bar from 814: the whole state reads without scrolling.
- S10 (no match): toolbar (search) stays, meta row and load-more hidden;
  panel 24 below the search; no icon; «Нічого не знайдено» Title Large (1
  line), 16, «За запитом «{q}» товарів в асортименті немає.» 14/20 #777779
  (2 lines at 320..390), 32, hug Button/Small outlinedDark «Скинути пошук»
  (116 + 48 = 164): clears the query, resets the step to 10, focuses the
  search input. The selection bar stays if a selection exists (with the
  hidden-by-search caption, 2.9).

### 2.13 Signed out / B2C (S17) and the gate (S18)

- `SignInPrompt` (shared, AssortmentView.tsx:529-536 unchanged call):
  phone composition comes from the shared spec (orders P11 / shell-cabinet
  proposal 7: hero text card 48 below the header, H1 40/42, Body Medium
  text, hug Button/Small «Увійти» / «Кабінет»). Nothing local.
- Pre-hydration: PlatformGate keeps the page blank until the platform
  shell renders (works; shell owns any change).

### 2.14 Interactions summary

| Action | Result (phone) |
|---|---|
| Tap a row checkbox | store selection (persisted), bar slides up at the viewport bottom; list does not move |
| Tap «Обрати всі» | toggles all shown rows (on / mixed / off) |
| Stepper +/- | quantity (min 1); bar total updates; ends the added state |
| Tap name / photo | PDP (as today) |
| Remove disc | confirm modal (single) |
| Bar trash | confirm modal (bulk, plural title) |
| Bar «Додати у кошик» | `addMany` + added key + `openCart()` -> cart sheet (cart area, D7 full-screen sheet over everything; html scroll lock, inert header) |
| Close the cart sheet | focus back on the bar pill, now «Відкрити кошик» |
| Bar «Відкрити кошик» | `openCart()` |
| Bar «clear» disc (added) | `setSelected(owner, [])`, added key cleared, bar unmounts |
| Sort trigger | TR-11 menu; outside tap / Escape closes; choose -> reorder, step 10 |
| «Показати більше» | +10 rows, no scroll jump, focus first new checkbox |
| Search | filters name / SKU / subcategory (as today); clear glyph (shared) |
| «Завантажити з Excel» | OS file picker (.xlsx) -> toast |
| Rotate / resize across 640 | the phone tree hides, the desktop tree shows (and back); no state lost (selection in the store; shownCount / page are separate) |

Sheets vs modals: the cart is a full-screen sheet (cart area, D7); the
confirmation is a short centred modal (D7); there are no bottom sheets
(D13). Scroll lock: documentElement via useModalBehavior for both.

---------------------------------------------------------------------

## 3. Bugs to fix (merged visual + functional lenses)

Severity: B blocker, M major, m minor, n nit, i info. «Owner» = where the
fix lands (area = this spec's files; shared = section 4; other area).

| Id | Sev | Where | What | Fix | File:line | Sources |
|---|---|---|---|---|---|---|
| AS-01 | B | rows, 320-600 | 1400-px table in a 272-552 scroller: only checkbox + photo + a cut name visible; availability, 3 prices, stepper, sum, remove need an 820-1128 px sideways swipe with no hint; at 320/360 name + SKU cut by the card edge without ellipsis («BN-6») | phone list panel + row block (2.6, 2.7); table wrapper `max-lg:hidden` | AssortmentView.tsx:635-686 (641), 311-386 | AS-V01, A1 |
| AS-02 | B | any selection, 320-390 | SelectionBar row 1 never wraps (`whitespace-nowrap` x2 + `min-w-[156px]`): total cut / invisible (right edge 386-404 > 320-390), hidden only by `overflow-x: clip` | desktop bar `max-lg:hidden`; phone sticky bar with a 272-safe line 1 that wraps instead of overflowing (2.9) | AssortmentView.tsx:433-446 (434, 442) | AS-V02, A2 |
| AS-03 | M | selecting, 390 / 320 | bar is in flow ABOVE the table: first tick pushes the list 98 px (146 in the added state); while ticking rows 3-10 the count, total and bulk action are off-screen | sticky bar as the last child of the slab (2.9), no in-flow block above the list | AssortmentView.tsx:600-633, 419-464 | AS-V05, A3 |
| AS-04 | M | rows, all widths | names `truncate` in a fixed 170-px box: 9/10 names cut, volume + brand lost, five rows read «Шампунь для воло...»; full name only in a hover `title` | `line-clamp-3` name in a 144-424 column (2.7 B) | AssortmentView.tsx:342-351 (346) | AS-V04, A4 |
| AS-05 | M | rows | remove (x 1318-1360) and stepper are a sideways swipe away from the name: the user deletes / changes quantities blind | remove disc + stepper in the same row block as the name (2.7 A / D) | AssortmentView.tsx:366-382 | AS-V03, A5 |
| AS-06 | M | after a removal | focus restore `focus()` on the next row's remove (x 1342) swings the scroller to scrollLeft 1058; the viewport shows anonymous qty / sum / x columns | visible-tree lookup + `preventScroll` (2.11) | AssortmentView.tsx:557-572 | A7, AS-V03 |
| AS-07 | M | rows | stepper +/- hit areas 32 x 32 (16 glyph + 8 pseudo); no typed entry (50 -> 500 = 450 taps) | layout-neutral 40 x 40 boxes + 16/22 count (`RowStepper phone` = cart N3 recipe, 2.7). Typed entry: NOT fixed here - it would make this one stepper behave unlike the catalog / cart / checkout steppers; raised for the system spec (7 item 3) | AssortmentView.tsx:166-188 | A6, AS-V12 |
| AS-08 | M | pager, 320-600 | desktop pager squeezed: 138-220 tall, «next» wraps alone at 320, page buttons 40, size pill 34, per-page listbox opens upward 30 px off-screen at 320; page change leaves the reader at the bottom of the next page; a single hit still shows «1-1 із 1 Показувати по: 10» | load-more (2.8), pager `max-lg:hidden`. Desktop parts (no scroll on page change, upward listbox, duplicate of orders `Pager`) are frozen-desktop behaviour: rejected for this pass, raised in 7 item 9 | AssortmentView.tsx:692-779 (710, 716, 743-772) | AS-V08, A8, A9 |
| AS-09 | M | empty / no match | built as a table: dead dark head with a disabled «Обрати всі», search shown for an empty list, «Завантажити з Excel» twice, title 18/24 ExtraBold (off-scale), 16/24 #343435 text 5-6 lines, ragged hug pills; no-match has no reset | phone ListEmpty panels without a table head (2.12): search hidden on empty, the head CTA kept and the duplicate panel CTA dropped, Title Large / Body Small type, one hug action, «Скинути пошук» for no match | AssortmentView.tsx:396-406, 654-671, 587-597; ui/TableEmptyRow.tsx:26-51 | AS-V06, A15 |
| AS-10 | M | remove modals | 16-px margins (card 358 / 288), body 18/26 (6 lines at 320), actions = Button «large» phone fallback 48.5 / 15px Regular, 16 apart, close 32 x 32, title breaks | shared Modal718 short-modal phone card + Button D8 (S1, S4) | ui/ConfirmModal.tsx:40-55; ui/Modal718.tsx:98, 106, 113-121, 125, 142, 215; ui/Button.tsx:80-81 | AS-V07, A18 |
| AS-11 | m | head | H1 32/36 -0.64 (phone H2 is 30/36 -0.6), subtitle 14/24 (Body Small 14/20), title -> subtitle 8, subtitle -> CTA 24; 0 full rows in the first 320 x 568 viewport | shared CabinetPageHead phone variant (S2) + strip removal (D1); with them row 1 is complete in the first 390 x 844 viewport (2.1) | ui/CabinetPageHead.tsx:63, 68, 71, 75 | AS-V09 |
| AS-12 | m | Excel toast | 16-px margins, #1d1d1f, 14/24, 4-6 lines with a mid-word break of the file name, close 32, `z-50` paints over the cart drawer CTA, ignores the safe area | TR-31 restyle with lg restores, name truncation, z-[35], bottom above the bar / safe area (2.10) | AssortmentView.tsx:98-122 (103, 106-116) | AS-V10, A12 |
| AS-13 | m | added state | after the bulk add nothing on the page says so; the button still reads «Додати у кошик» and every tap doubles the quantities (cart 50 -> 100 -> 150, badge 99+); state lost on reload; «Скинути виділення» is a 147 x 22 text target on its own row | phone added-state bar («Відкрити кошик» + «clear» disc), session-persisted added key, text button `max-lg:hidden` (2.4, 2.9) | AssortmentView.tsx:496-504, 546-550, 613-622, 447-461; cart/store.ts:84-96 | AS-V11, A10, A11 |
| AS-14 | m | row atoms | photo 60 r12, SKU 16/24 #343435, 0.5-px gradient hairlines, checkbox 24 + pseudo, borderless 42 remove | phone row recipe: ProductLine 64 r16, SKU 14/20 #777779, 1-px ListRow lines, 44 checkbox, RowDisc 40 ring / 44 box (2.7) | AssortmentView.tsx:251-252, 333-350, 150, 373-381 | AS-V12 |
| AS-15 | m | sort | the only sort is the off-screen «Сума» head; reaching it scrolls the table 1058 px | meta row sort trigger + TR-11 menu (2.5) | AssortmentView.tsx:298-303, 646-650 | AS-V13 |
| AS-16 | m | search + selection | a selection hidden by the search still drives the bar («Обрано: 1 товар» with no visible ticked row) and the bulk add adds the hidden row | caption «Приховано пошуком: N» in the bar (2.9); cross-search selection itself kept (intended, persisted) | AssortmentView.tsx:502, 624-632 | A13 |
| AS-17 | m | search | no clear control on touch (`[&::-webkit-search-cancel-button]:hidden`, no own button) | shared SearchField clear glyph (S5) | orders/listParts.tsx:147-158 | A16 |
| AS-18 | m | cart sheet | Android back with the cart drawer open: URL /catalog but the drawer stays, html overflow hidden, header inert | close the cart on route change - OWNER: cart area | cart/CartDrawer.tsx:259 | A14 |
| AS-19 | m | signed out / B2C | bare 262-px SignInPrompt (H1 32/36) on the dark footer | shared SignInPrompt phone variant - OWNER: shell spec | ui/SignInPrompt.tsx:21-26 | AS-V14 |
| AS-20 | m | shell on this route | strip labels 10 px (tinyText x4), strip scrolls at 320, legal bar copyright clipped at 320 (right 346), legal bar 122 tall at 320/360 | D1 burger sheet + legal band - OWNER: shell-cabinet | platform/SideMenu.tsx:53, 86-91; PlatformFooter.tsx:16-41 | A17, AS-V inherited |
| AS-21 | n | focus | focus returns to the pill with the browser's square outline; the dark-head checkbox ring has low contrast | shared Button `focus-visible` ring (S1); every new phone control carries the brand ring (2.0); the dark head does not exist on phones | ui/Button.tsx:226-227 | AS-V15, A19 |
| AS-22 | n | bottom rhythm | pager py 24 + slab pb 32 = 56 above the legal bar (empty state too) | load-more mt-12 + shared CabinetPage phone pb 48 (D10) | AssortmentView.tsx:695; ui/CabinetPage.tsx:12 | AS-V16 |
| AS-23 | n | keyboard | Tab walk swings the table 3 times per row (scrollLeft 0 -> 875 -> 1058 -> 0) | gone with the phone list (no horizontal scroller, AS-01) | AssortmentView.tsx:641 | A19 |
| AS-24 | n | cart sheet (seen here) | cart drawer close cross (32, right 16 / top 16) overlaps «Очистити» | OWNER: cart area | cart/CartDrawer.tsx:306, 315-327 | visual report «inherited», code recipes 6b |
| AS-25 | i | landscape 844 x 390 | desktop canvas at zoom 0.586, table still scrolls sideways on the 640..1196 band, ~8 px effective type | REJECTED: desktop frozen and no tablet layout by design (BRIEF) | - | functional «Info» |
| AS-26 | i | test capture | hover-coloured pill / «+» in some fullPage shots | NOT A BUG (verified in the visual report: `(hover: hover)` false, computed colour correct); verify agents move the mouse to (5,5) before full-page shots | - | visual «Capture note» |

---------------------------------------------------------------------

## 4. Shared needs

Where a sibling spec already proposes the atom, this page uses THAT API
(reference in brackets) and lists only what it adds.

| # | Atom / API | Exists? | Proposed API and classes | Why (this page) |
|---|---|---|---|---|
| S1 | `ui/Button.tsx` phone fix (orders S1, cart N4, D8) (SYSTEM C-32: the focus-ring ADD below is rejected - landing frozen) | change | `labelSize.large` phone string = the `small` string (`rounded-[24px] border px-[23px] py-[9px] text-button-md whitespace-nowrap` + the existing `sm:` large values), `arrowWrap.large` / `arrowIcon.large` / `plusIcon.large` phone = small values. ADD (this page): a pill focus ring `focus-visible:outline-none` on the wrapper + `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2` on the pill (rounded with it). Landing renders no `large` below 640 (code recipes 2.5) - pixel guard proves it | ConfirmModal buttons (AS-10), focus ring (AS-21) |
| S2 | `CabinetPageHead` phone list variant (orders S3) | change | phone `px-6 pt-12 pb-6`; back -> title 24 (existing `gap-6`; order-detail O-1); title `text-h2` (30/36 -0.6 phone, desktop 44/48 unchanged); title -> subtitle 16; subtitle `text-body-sm text-neutral-500` (14/20; desktop leading restored); text block -> actions 32; one action hug left. No new prop needed here | AS-11 |
| S3 | `CabinetPage` phone surface (orders S2) | change | phone `rounded-t-[32px] pb-12`, desktop `lg:pb-8 lg:rounded-tl-[48px]` (+ `lg:rounded-tr-none`). ADD (this page): no `overflow-hidden` / `overflow-auto` on the slab or any ancestor below 640 (`overflow-clip` is fine) | slab rhythm (AS-22); the sticky selection bar (2.9) |
| S4 | `Modal718` / `ConfirmModal` short-modal phone card (orders S5, D7, TR-17) | change | overlay `p-6` (24 margins: card 342 at 390, 272 at 320); r32, ring #8e8e8f, p 24 (`py-[23px]` + rows `px-[23px]`), `max-h-[calc(100dvh-48px)]`; close `-m-2.5 size-11` with a 24 glyph; description 16/24 #343435 (`text-[16px] leading-6 text-neutral-800 sm:text-[20px] sm:leading-7 sm:text-neutral-900` - desktop inherits #1d1d1f from the card today); `ModalActions` `gap-2 sm:gap-8`; ConfirmModal order stays cancel (outlinedDark) first, confirm last | AS-10 |
| S5 | `SearchField` clear control (orders/listParts.tsx:137-159) | change | when `value` is non-empty: magnifier `max-lg:hidden`, plus a `lg:hidden` button `absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand` with a 24 «clear» glyph, `aria-label="Очистити пошук"`; tap -> `onChange("")` + input focus. Optional prop `onClear?: () => void` (default `onChange("")`). Orders uses the same field | AS-17 |
| S6 | `ListPanel` / `ListRow` / `RowDisc` / `ListEmpty` (orders S11, TR-07, TR-24) | NEW | as orders S11: `ListPanel({ label, children })` = `ul flex flex-col overflow-clip rounded-[32px] bg-white`; `ListRow({ children })` = `li relative px-6 py-6 has-[a:active]:bg-bg-subtle [&+&]:before:absolute [&+&]:before:inset-x-6 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-stroke-subtle`; `RowDisc({ label, onClick, children })` = 44 box / 40 ring (2.7); `ListEmpty({ icon?, title, text?, action? })` (2.12). ADD (this page): `ListPanel` and `ListRow` accept `className`; `ListRow` and `RowDisc` forward rest props (`data-row`, `data-action`) | AS-01, AS-05, AS-09, AS-14 |
| S7 | `LoadMore` (orders S12, D4, TR-12) | NEW | `LoadMore({ shown, total, onMore, label = "Показати більше", counter })`: `mt-12 flex flex-col items-center gap-4` + counter `text-body-sm text-neutral-500` `aria-live="polite"` + `Button size="small" plus`; renders nothing when `shown >= total`; the caller owns the focus hand-off | AS-08 |
| S8 | `SortMenu` (orders S10, TR-11) | NEW | `SortMenu({ value, options: { value: string; label: string }[], onChange, label = "Сортування" })`; trigger 14/20 Medium #343435 + 16 chevron in a 44-tall hit box, menu anchored to the nearest `relative` ancestor at full content width, items 44 tall 16/24 with 1-px #d2d2d2 lines, selected brand, listbox keyboard (`useListbox`, listParts.tsx:49-134, exported) and outside-tap close (`useDismiss`, listParts.tsx:22) | AS-15 |
| S9 | Dark sticky bar recipe (TR-18) | NEW, optional | no sibling atom yet (the cart footer is inline, cart.md 2.3). Proposal `StickyBar({ tone: "light" \| "dark", barRef, className, children, "aria-label" })` with base `sticky bottom-0 z-30 px-6 pt-4 pb-[calc(16px_+_env(safe-area-inset-bottom))] transition-[translate,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-full starting:opacity-0 motion-reduce:transition-none lg:hidden`, dark `rounded-t-[32px] bg-[#2d2d2f] text-white`, light `border-t border-stroke-subtle bg-white`. If the system spec does not create it, PhoneSelectionBar.tsx keeps exactly these classes locally | AS-02, AS-03 |
| S10 | Root viewport (orders S17, cart N5, D12) | change | `export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" }` in app/layout.tsx | `env(safe-area-inset-bottom)` in the bar and the toast |
| S11 | Colour token #2d2d2f | optional NEW | `--color-surface-dark: #2d2d2f` in `@theme` -> `bg-surface-dark`; until then `bg-[#2d2d2f]` (as cart.md / order-detail.md do) | bar, toast (TR-18, TR-31) |
| S12 | Cart sheet (cart area, D7) | other area | full-screen sheet z >= 40 (above the bar z-30 and this page's toast z-[35]); close on route change / Back (orders S14, order-detail N14) fixes AS-18; focus returns to the opener with `preventScroll` (cart N1) | bulk add flow |
| S13 | Cabinet shell (shell-cabinet, D1) | other area | burger sheet with «Мій асортимент» as the ACTIVE row on /assortment; strip removed; legal band; if a CornerFab / ScrollUpDock is added on cabinet routes, it must sit 8 above any sticky bar | AS-20, 2.2 |
| S14 | `SignInPrompt` phone variant (orders S4) | change | per the shell / orders spec | AS-19 |
| S15 | Phone media hook (cart N8 `useMediaQuery` / order-detail N13 `usePhone`) | NEW | one of the two; this page needs a boolean «phone» in `confirmRemoval` (2.11) | AS-06 |
| S16 | `QtyStepper` hit boxes + `size="xs"` (cart N3, TR-15) | change (catalog / cart) | not consumed here: RowStepper stays area-local because its aria-labels carry the product name and its desktop strings are the Figma 4204:42463 stepper; its phone classes copy N3 exactly (`-m-3 size-10` layout-neutral boxes, 16/22 Bold count) so every phone stepper looks and hits the same | consistency |
| S17 | `ProductLine` (cart N6, TR-08) | NEW | as cart N6. ADD (this page): `titleLines?: 2 \| 3` (default 2) -> `line-clamp-2` / `line-clamp-3` on the name | AS-04 (rows told apart by volume + brand at the end of the name) |
| S18 | Toast (order-detail N12, TR-31) | NEW (other area) | NOT used here: N12 is text-only, auto-hides in 4 s and sits at z-[70] over every sheet, while the Excel notice needs a close button, a truncating file name and must stay UNDER the cart sheet (AS-12). This page keeps its own ExcelNoticeToast (2.10); see section 7 item 7 | - |
| S19 | Reused unchanged | exist | `StatusPill` md, `CheckboxOnIcon` / `CheckboxOffIcon` (catalog/icons.tsx:166-188), area `CheckboxMixedIcon`, `RemoveIcon` / `TrashIcon`, `CatalogueIcon` (platform/icons.tsx:20), `formatPrice`, `productsPlural`, `useModalBehavior` | - |

---------------------------------------------------------------------

## 5. Files

Area-owned (disjoint from every other area):

| File | Change |
|---|---|
| src/components/platform/assortment/AssortmentView.tsx | phone tree wiring: `shownCount` state + `shown` / `shownIds`; `listRef`, `barRef` + ResizeObserver -> `barH`; toolbar classes (drop phone `pb-6`, `max-lg:hidden` when empty); `max-lg:hidden` on the reset text button (613-622), the SelectionBar root (433), the table wrapper (635) and the pager (692-695); remove the dead `max-lg:` helpers (400, 639); ExcelNoticeToast restyle (98-122); `confirmRemoval` visible-tree focus routing (557-572); added key read / write via the store helpers; sort + query handlers also reset `shownCount`; import Checkbox / RowStepper from parts.tsx; render `PhoneListSection` after the table block and `PhoneSelectionBar` as the last child of `CabinetPage` |
| src/components/platform/assortment/store.ts | `readAddedKey(ownerId)`, `writeAddedKey(ownerId, key \| null)` on sessionStorage key `binar.assortment.added.v1:<id>` (try / catch like the localStorage helpers) |
| src/components/platform/assortment/data.ts | `PHONE_STEP = 10`; `ASSORTMENT_SORT_OPTIONS` = `[{ value: "none", label: "Без сортування" }, { value: "desc", label: "Сума: від більшої" }, { value: "asc", label: "Сума: від меншої" }]` |
| NEW src/components/platform/assortment/parts.tsx | `Checkbox` (moved, + `phone` flag), `RowStepper` (moved, + `phone` flag); desktop strings byte-identical |
| NEW src/components/platform/assortment/PhoneList.tsx | `PhoneListSection` (meta row, ListPanel, rows, ListEmpty states, LoadMore), `PhoneRow` |
| NEW src/components/platform/assortment/PhoneSelectionBar.tsx | the sticky dark bar (2.9) |
| unchanged | src/components/platform/assortment/icons.tsx, src/app/assortment/layout.tsx, page.tsx |

Shared files this page depends on (built by the shared layer, section 4;
NOT edited by the assortment builder): ui/Button.tsx,
platform/ui/CabinetPageHead.tsx, platform/ui/CabinetPage.tsx,
platform/ui/Modal718.tsx, platform/ui/ConfirmModal.tsx,
platform/orders/listParts.tsx (SearchField, useListbox export), the NEW
ListPanel / ListRow / RowDisc / ListEmpty, LoadMore, SortMenu, (optional)
StickyBar, ProductLine (+ `titleLines`), the phone media hook,
app/layout.tsx (viewport), app/globals.css (optional token),
platform/ui/SignInPrompt.tsx, PlatformHeader / SideMenu / PlatformFooter /
PlatformChrome (shell), cart/CartDrawer.tsx + useModalBehavior (cart).

Audit-only (not src): the verify agent's script under
audit/mobile/assortment/; spec-probe.mjs (exists).

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Setup: dev server on :3000 (never start / kill it). Kit:
`audit/mobile/kit/phone.mjs` (`openPhone(..., { seed: "b2b", w, h })`,
touch emulation). Use instant scrolls (`scrollTo({top, behavior:
"instant"})`), real `page.tap()` for focus checks, and `mouse.move(5,5)`
before full-page shots (AS-26).

### 6.1 Widths and states

Widths 320x568, 360x780, 390x844, 430x932, 600x960, plus 639x900 (last
phone) and 640x900 (first desktop). Every state of 1.3 (S1-S17) at 390;
S1, S2 (3 and 10 rows), S4, S8, S10, S12, S13, S16 at all five phone
widths. Seeds per 1.2. Shoot segments at 390 and 320 for S1, S2, S4, S8,
S10; viewport shots for S5, S6, S15, S16.

### 6.2 Measurements (390 unless stated; tolerance +-1 px)

- Header 66, no strip; slab starts at y 66 (shared).
- Head (shared numbers, 2.1): back 40 at y 114; H2 30/36 700 -0.6 at y
  178; subtitle 14/20 #777779 at y 230; CTA 42 tall, 204 wide at y 302;
  CTA bottom -> search top 24; the head is the same in every state.
- Search 342 x 46 at x 24; input font-size 16.
- Meta row: box 44; checkbox glyph left edge x 24; text 14/20 500
  #343435; sort trigger right; search bottom -> meta text 16; meta text
  -> panel 24 (panel top y 474).
- Panel x 24 w 342, radius 32, bg #fff, no border; row 1 474-811 (337).
- Row: padding 24 (content x 48, w 294); separator 1 px #d2d2d2 from x 48
  to x 342, none above row 1; head line 40 tall; checkbox button 44 x 44
  (glyph 24 at x 48); pill 38 tall at x 84; remove button 44 x 44 with a
  40 ring 1 px #1d1d1f ending at x 342; blocks 12 apart; photo 64 x 64
  radius 16 bg #d5d5d5 and photo + name + SKU inside ONE link; name 16/22
  700 max 3 lines; SKU 14/20 #777779 4 below the name; prices 3 lines
  (label 14/20 #777779 / «Ваша ціна» 14/20 500 #1d1d1f; values 16/24
  600 / 700), 8 apart; separator 12 above / below; stepper buttons 40 x
  40 (glyph 16), count 16/22 700 min-w 28; «Сума» 12/16 #777779 over
  22/28 600 -0.44. At 320: every pill on its own row under the checkbox
  line (12 below); row content stays inside x 48..272 (panel 24..296).
- Load-more: counter 48 below the panel bottom, 14/20 #777779 centred;
  button 42 tall (227 wide with the plus disc), 16 below, centred; the
  whole block absent when the filtered total <= 10 and after the 4th tap
  (48 of 48 shown): the panel is then the last block, 48 above the legal
  bar.
- Bar (S2): width = viewport, bg #2d2d2f, top radii 32, pt 16, pb 16;
  line 1 total 22/28 white right-aligned; pill 42 tall accent; disc box
  44 with a 42 white ring; bar bottom = viewport bottom while scrolled
  mid-page; 114 tall (134 in S12). At 320 with 10 rows (total
  «15 197,50 ₴») line 1 on ONE line, nothing past x 296.
- Toast (S16): width 342 (272 at 320), bg #2d2d2f, radius 24, 14/20
  white, close 44 x 44; bottom 24 without a bar, bar top - 8 with a bar;
  file name on one truncated line; <= 104 tall at 320.
- Confirm modal (S5 / S6): card 342 (272 at 320), radius 32, ring #8e8e8f,
  padding 24; title 24/28 700; close 44 box; body 16/24 #343435; buttons
  42 tall, 8 apart, «Скасувати» above «Підтвердити»; card height <=
  viewport - 48 at 320 x 568.
- Empty (S8 / S9): head unchanged (CTA present), no search, no meta row,
  no load-more; panel 24 below the CTA (y 368); 52 icon tile (r12, 1-px
  #8e8e8f, CatalogueIcon 24), 24, title 22/28 600 (2 lines), 16, text
  14/20 #777779, 32, ONE hug accent «Переглянути каталог» 42 tall; panel
  398 tall; legal bar top at y 814 (visible in 844).
- No match (S10): panel 24 below the search; no icon; «Скинути пошук» 42
  hug centred.

### 6.3 DOM checks expected clean (domChecks at every width and state)

overflowX 0, offRight 0, offLeft 0, wideElement 0, tinyText 0 (once the
shell removed the strip), inputZoom 0, smallTarget 0 except the header
logo (100 x 33, known), clippedText only entries marked «(ellipsis/
clamp)» (names over 3 lines at 320, the toast file name), hScroller 0 (no
table scroller visible), fixedTall 0 (bar < 30 % of the viewport),
brokenImage 0, stretchedImage 0, overlapText 0. Console / page errors 0,
no hydration warnings.

### 6.4 Flows

1. Tick row 1 at the top: row 1 `getBoundingClientRect().top` unchanged
   (+-1) before / after; bar appears at the viewport bottom.
2. Scroll to row 7, tick it: bar visible, count 2, total correct.
3. «Обрати всі»: all shown ticked; again: none; tick 1 then «Обрати всі»
   shows mixed first (aria-checked "mixed").
4. Bulk add: cart sheet opens over the bar; close it: focus on the bar
   pill (`document.activeElement` text «Відкрити кошик»); pill variant
   outlined; disc «Скинути виділення»; tap the pill: sheet opens again,
   cart quantities NOT doubled; reload: added state still shown (same
   tab); change a selected quantity: back to «Додати у кошик» + trash.
5. Row remove -> modal -> «Підтвердити»: row gone, `activeElement` = next
   row's remove button, `scrollY` unchanged (+-1), no element with
   `scrollLeft > 0`.
6. Bulk remove (3 rows) -> modal title «Видалити 3 товари?» -> confirm:
   bar gone, focus on the first remaining row's checkbox.
7. Remove every row (or emptied seed): empty panel, focus on
   «Переглянути каталог».
8. Load more x4: 48 rows; after each tap the previously last row keeps
   its viewport position (+-1) and focus is on the first new row's
   checkbox.
9. Search «zzzz»: no-match panel, meta row and load-more hidden;
   «Скинути пошук» clears and focuses the input; the shared clear glyph
   does the same.
10. S12: select row 1, search «Тапочки»: bar shows «Приховано пошуком: 1».
11. Sort: open the menu (listbox visible, full content width), tap outside
    closes, Escape closes and refocuses the trigger; «Сума: від більшої»
    orders rows by sum desc, shown resets to 10.
12. Excel: `setInputFiles` with a 60-char .xlsx name: toast above the bar
    (when selected), below the cart sheet (elementFromPoint at the sheet
    CTA is the sheet, not the toast); closes by its cross and after 8 s.
13. Keyboard Tab through one row: checkbox -> name -> minus -> plus ->
    remove; every stop shows the brand focus ring; nothing scrolls
    sideways.
14. Resize 390 -> 640 -> 390 with a selection: at 640 the table + in-flow
    SelectionBar show, the phone list / bar are `display:none`, the toast
    uses `bottom: 24px` (lg); back at 390 the phone tree returns with the
    same selection.
15. Visitor and b2c: SignInPrompt (shared look), «Увійти» / «Кабінет»
    open the account sheet.

### 6.5 Desktop / landing pixel guard

- BEFORE the first src edit: `node audit/kit/assortment-states.mjs` and
  copy audit/out/assortment-{default,selected,added,empty}.png to
  audit/mobile/assortment/desk-before/; also shoot /assortment default +
  3 rows selected + empty at 640x900 and 1024x900 into the same folder.
- AFTER: the same shots into desk-after/ and
  `node audit/mobile/kit/compare.mjs audit/mobile/assortment/desk-before audit/mobile/assortment/desk-after`
  -> 0 differing files.
- Full regression set: `node audit/mobile/kit/baseline.mjs audit/mobile/after`
  then `compare.mjs audit/mobile/baseline audit/mobile/after`: every
  landing and desktop shot identical (cabinet-1710-assortment.png
  included); phone-390-cabinet-assortment.png is EXPECTED to differ.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

1. CabinetPageHead phone numbers: this page follows orders-list S3 /
   order-detail (pt 48, back -> title 24, title -> subtitle 16, subtitle ->
   actions 32, pb 24, blocks 24 apart). TR-03 asks 48 below a crumb and 48
   from the head to the first block (order-detail open point O-1). If the
   system spec switches to 48, this page needs no change (props only); the
   y values of 2.1 / 6.2 shift.
2. Row action disc: 40 ring in a 44 box (TR-07 + D8), the orders S11
   `RowDisc`. The orders AUDIT proposal had 46 discs; the orders SPEC uses
   the same 44 / 40 RowDisc - no conflict left, noted for the reviewers.
3. Steppers: the phone RowStepper copies cart N3 (16/22 Bold count, 40
   layout-neutral boxes, TR-15). Typed quantity entry (A6, «50 -> 500 = 450
   taps») should be ONE decision for every stepper (catalog cards, PDP,
   cart, checkout, assortment), e.g. a QtyStepper `editable` prop with an
   `inputMode="numeric"` count; not built here alone.
4. Name clamp 3 lines (TR-08, the language doc section 7 and the cart's
   ProductLine say 2): needed because the volume and brand end every
   assortment name (AS-04). Needs `ProductLine titleLines={3}` (S17);
   accept as a documented exception for product lines whose names carry
   variant data.
5. New Ukrainian strings (please confirm): «Обрати всі», «Без сортування»
   (the other two sort labels «Сума: від більшої» / «Сума: від меншої» are
   the orders ones), «Показано N із M» / «Показати більше» (D4), «Скинути
   пошук», «Відкрити кошик» (already the prefix of the cart trigger's
   aria-label), «Приховано пошуком: N»; aria «Обрати всі показані товари»,
   «Обрані товари», «Сортування», «Очистити пошук», «Товари асортименту».
6. Sticky bar mechanics: the selection bar is `position: sticky` inside
   CabinetPage (no spacer, no measurement for layout). The shared
   CabinetPage / PlatformChrome must not put `overflow: hidden|auto` on any
   ancestor below 640, or the bar stops sticking. If the system spec
   prefers `fixed`, it must also provide the bottom spacer.
7. Toasts: order-detail N12 proposes a shared Toast at z-[70] (over every
   sheet) with no close button and a 4-s life. That stacking is exactly
   AS-12 here (the Excel notice covered the cart CTA). This page keeps its
   own toast at z-[35] (under sheets, over the sticky bar, offset above it
   via `--bar-h`). Recommendation: the shared Toast host should sit under
   sheets / modals (or move above their footers) and support an optional
   close button + truncating inline value; then ExcelNoticeToast can
   migrate. If a CornerFab / ScrollUpDock appears on cabinet routes
   (shell-cabinet), it needs the same «8 above any sticky bar» rule.
8. Added-state divergence: phones show «Відкрити кошик» + «Скинути
   виділення» after the bulk add (prevents silent double adds, A10);
   desktop keeps Figma 4204:55408 («Додати у кошик» stays, re-add
   possible). Same for the hidden-by-search caption (A13 exists on desktop
   too) and the toast z-index over the desktop drawer (A12 exists on
   desktop too). Fixing desktop changes desktop pixels in non-baseline
   states; the system spec decides whether behaviour fixes on frozen
   desktop are allowed.
9. Desktop pager behaviour (A8 / A9): page change does not scroll to the
   table top, the per-page listbox opens upward, and the assortment
   duplicates orders `Pager`. Frozen desktop; out of this pass unless the
   system spec allows behaviour-only desktop fixes.
10. Search clear control (S5) is phone-only (`lg:hidden`) to keep desktop
    pixels; orders uses the same SearchField and gets it too.
11. Phone media hook: cart N8 `useMediaQuery` and order-detail N13
    `usePhone` are two proposals for the same thing; keep one (S15).
12. `#2d2d2f` has no token; bar and toast use `bg-[#2d2d2f]` (like the
    cart footer and N12) unless S11 adds `--color-surface-dark`.
13. Empty-state action: following orders 2.8, the duplicated head action
    is NOT repeated in the phone empty panel (only «Переглянути каталог»);
    the desktop empty row keeps both buttons (4929:65033).
