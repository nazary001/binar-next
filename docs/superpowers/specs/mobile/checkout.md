# Phone spec - area "checkout" (/checkout)

Status: area spec, 2026-11-05. Phone = below 640 px (unprefixed / `max-lg:`
classes); desktop = `lg:` and must stay byte-identical (pixel guard
`shop-1710-checkout-empty`, `shop-1710-checkout-cart`,
`cabinet-1710-checkout-cart`). Inputs merged: `audit/mobile/checkout/
visual-report.md` (CO-V-xx), `audit/mobile/checkout/functional-report.md`
(CO-F-xx), shots under `audit/mobile/checkout/shots/` (viewed:
cart-none-390-01/02, errors-390-01, menu-locker-open-390, sumrow-huge-320,
success-390-01, empty-none-390-01, soldout-none-390, labels-invoice-320,
fab-submit-320), the source files and the shell-public audit proposals
P3 (crumb) / P4 (corner FAB). Shell specs (`shell-public.md`,
`shell-cabinet.md`) did not exist when this was written; section 7 lists
what the system spec must reconcile.

Binding sources: `audit/mobile/DECISIONS.md` (D1..D13), translation
rules TR-01..TR-32 (`audit/mobile/lang/figma-mobile-language.md` section
23), recipes and gotchas (`audit/mobile/lang/code-mobile-recipes.md`).

Two implementation rules used everywhere below (they are what keeps the
desktop byte-identical):

- R1. A phone change to an EXISTING element that the desktop also renders
  is written as `max-lg:` deltas only (`max-lg:rounded-[32px]`,
  `max-lg:bg-white`, ...). The existing class string stays as is, so the
  desktop computed style cannot move.
- R2. Where a phone change needs a different typographic TOKEN
  (`text-body-md` -> 14/20 etc.), do not stack tokens on one element:
  the unlayered phone token rules beat every utility (recipes gotcha 1).
  Either use literal classes (`text-[22px] font-semibold leading-7
  tracking-[-0.44px]` + `lg:` literals) or render a phone twin
  (`lg:hidden`) next to the untouched desktop element (`max-lg:hidden`
  added). New phone-only markup = `lg:hidden`; a Button is hidden with
  `max-lg:hidden` / `lg:hidden` only (never `hidden lg:inline-flex`,
  recipes gotcha 5).

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
| S1 | 2.1 / S6 PhoneCrumb | ShopCrumbs back "Каталог" (A19, shell-public 2.4 call-site table); edited |
| S2 | 2.3 / S3 LineItemRow | A8 ProductLine: photo + name are ONE link block, trash trailing, bottom slot full width (stepper left, line total 22/28 SemiBold right, wraps right-aligned at 320); unit price line via `price`; eyebrow only for exceptions (as here) |
| S3 | S4 RadioGroup | A24 (ui/ChoiceRow.tsx) - same recipe; row box / gap SUPERSEDED by S13 |
| S4 | S5 EmptyState; 2.11 success accent | A14 `surface="ring"`; empty "Перейти в каталог" solid with arrow (as here); success "Продовжити покупки" solid with arrow (not accent) |
| S5 | S2 QtyStepper | A18 |
| S6 | S7 CornerFab | Hidden on shop phones (C-23) |
| S7 | S8 fields.tsx | A26 (cluster F2) |
| S8 | S9 / S10 | A2 / A4 |
| S9 | 7.8 prefill CO-24 | Deferred (O-6); the session draft is built |
| S10 | 7.1 open list, 7.2 form skin, 7.11 crumb gap | Confirmed (A-11, T4, A-2) |
| S11 | 7.6 partner checkout shell, 7.9 typed qty | O-10; typed qty only in partner contexts (A-10) |
| S12 | Build | C-checkout (wave 3) |
| S13 (critique round 1) | 2.5 rows `min-h-11` + `gap-9` (pitch 80) | A24 revised: ChoiceRow `min-h-10` + 44 pseudo hit, RadioGroup rows `gap-10` (1-line pitch 80, 2-line pitch 88 = the master). Delivery group 324 at 390 / 340 at 320, payment 236; the selected label stays brand (master quiz option, QuizForm.tsx:842-846); edited in place |
| S14 (critique round 1) | 2.10 first-error `scrollIntoView({ ..., behavior: "smooth" })` | `behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"`; edited in place |
| S15 (critique round 1) | 2.13 stock gate -> `issuesFrom` "cart" (closing the stock sheet would open the cart sheet over the form) | The gate passes "checkout": closing the stock sheet only dismisses it and focuses the "Кошик" h2 of CheckoutLines (`tabIndex={-1}`, preventScroll) - cart S23; edited in place |
| S16 (critique round 1) | 2.8 summary footer | Confirmed as THE dark summary anatomy (C-40: #1d1d1f, A13 SUMMARY_LABEL over SUMMARY_AMOUNT, gap 8); the cart sheet now matches it |
| S17 (critique round 1) | 2.3 lines `<ul>` | `<ul role="list">` (3.1.6); ProductLine rows `as="li"` keep their `py-6` (A8 `padded`) |
| S18 (critique round 1) | Fields / form card | Last field (or its helper) -> next action 48 (3.1.4, C-41); the form card's pb 48 already gives it; delivery / payment radios per S13 |

---------------------------------------------------------------------

## 1. Scope

Routes: `/checkout` only (`src/app/checkout/page.tsx` +
`src/app/checkout/layout.tsx` `data-canvas="shop"`). Shell: public header
+ public footer for every seed (TR-01 / D2; see 7.6 for B2B).

Seeds and carts used by the audits and by verification:

| Name | Seed | Cart (`binar-cart-v1`) |
|---|---|---|
| audit cart | none / b2c / b2b | shampoo-1:2, soap-1:1, lotion-1:3 (189,90 ₴ retail, 173,94 ₴ partner) |
| long cart | none | audit cart + conditioner-1:1, slippers-1:1, robe-1:1 (6 lines, 1 662,15 ₴ class totals) |
| big qty | none / b2b | shampoo-1:999, soap-1:120, lotion-1:1500 (5-6 digit totals) |
| stale stock | none / b2b | shampoo-3:1 (sold out), shampoo-2:2 (promo = sold out by the mock rule), shampoo-1:1 |
| long names | none | shampoo-long-notes:1 + audit cart |

States (all reached by the audits unless marked):

| # | State | How |
|---|---|---|
| S1 | Hydrating placeholder | first client render before the cart is read (CPU x6 throttle shows it); also the no-JS render |
| S2 | Empty | no cart, any seed; also after removing every line |
| S3 | Filled, nothing chosen | audit cart |
| S4 | Long content | long cart, long names (150 chars), big qty, 75-char email, long street, long comment |
| S5 | Validation errors | empty submit (6 errors), format errors (email / phone), invoice errors (company, ЄДРПОУ 8 цифр, ІПН 10/12, address, email) |
| S6 | Delivery variants | Самовивіз (notice), Нова Пошта (Самовивіз) (+ Відділення), Нова Пошта (Поштомат) (+ Поштомат), Нова Пошта (Адресна доставка) (+ Вулиця, Будинок, Квартира) |
| S7 | Menus open | city autocomplete, branch, locker (delivery / payment menus become radio rows on phones, see 2.5) |
| S8 | Invoice on | checkbox ticked, 5 company fields |
| S9 | Success | submit valid form (none / b2c / b2b), incl. 320 x 568 |
| S10 | Stale stock | stale-stock cart opened directly on /checkout -> stock sheet (cart area) on mount and on submit |
| S11 | Cart sheet over /checkout | header cart disc -> cart sheet (cart area), close / scrim / Back |
| S12 | B2B partner | seed b2b: partner prices, public shell |

Not reachable (recorded, not verified):
- Real virtual keyboard and iOS Safari behaviour (touch adjustment, focus
  zoom, fixed-element behaviour with the keyboard): Chromium emulation
  only; CO-F14 numbers are computed from a 336-px keyboard.
- Server order / payment flow: none exists. "До оплати" places a mock
  order (`CheckoutClient.tsx:32-39`); there is no payment page.
- Live Nova Poshta data (cities, branches, lockers, streets): placeholder
  lists in `data.ts:32-70`; "Вулиця" has no suggestions (`options={[]}`).
- Desktop success state: not a phone concern, unchanged.

---------------------------------------------------------------------

## 2. Phone layout, block by block

Geometry is for 390 x 844 (content 342, x 24..366); 320 / 600 values in
brackets where they differ (content 272 / 552). Heights stay fixed,
widths stretch (language section 4).

### 2.0 Page frame (`src/app/checkout/page.tsx:19`)

- Wrapper keeps `px-6 sm:px-10 lg-shop-pad-x pb-[60px] lg:pb-[148px]`:
  24 gutters (D10), 60 from the last block to the footer (language 5:
  last section block -> footer 60). No change.
- Head section `page.tsx:20`: `flex flex-col gap-8 pt-12 lg:gap-12
  lg:pt-[72px]` -> `flex flex-col gap-12 pt-12 lg:pt-[72px]`. Header ->
  crumb 48, crumb -> H1 48 (TR-03, article crumb 3176:6558 -> title
  3176:5637: 48 each; D10). Desktop unchanged (gap 48 already).
- `page.tsx:40` `mt-12 lg:mt-[104px]` stays: H1 -> first block 48 (D10
  "head -> first block 48").
- No page-level sticky bar, no fixed element of its own, no scroll lock
  (overlays lock `<html>` through useModalBehavior).

### 2.1 Breadcrumb (CO-V-01, CO-F18)

- Phone: ONE 40-px row, back disc 40 + 16 + parent label "Каталог"
  (16/22 SemiBold +0.16 #343435) -> `/catalog`. No "/" and no current
  crumb (the H1 repeats it). Source: TR-05 (article crumb 3176:6558),
  shell-public proposal P3 ("/checkout -> «Каталог»"), D10.
- y 114..154, x 24, width 122 (disc 40 + 16 + label ~66); fits 272 at 320.
- (SYSTEM A19 supersedes PhoneCrumb: `<ShopCrumbs back={{ href: "/catalog",
  label: "Каталог" }}>` around the existing desktop children, shell-public 2.4.)
  Original proposal, not built: the shared `PhoneCrumb` (section 4, S6):
  `<PhoneCrumb href="/catalog" label="Каталог" />` = `<nav
  aria-label="Навігація" className="lg:hidden"><BackCrumb href="/catalog"
  label="Каталог" /></nav>`. The existing desktop trail
  (`page.tsx:21-35`) gets `max-lg:hidden` appended to its nav class (R1);
  its markup is otherwise untouched. Both navs are siblings in the head
  flex column; the hidden one is `display:none`, so it creates no gap.
- If the shared atom is late, inline the same two lines in page.tsx.

### 2.2 H1 (`page.tsx:37`, unchanged)

- `text-h1 text-neutral-900` = 40/42 Bold -0.8 on phones (D9 public shop
  H1, TR-03). "Оформити / замовлення" = 2 lines at 320..430 (84 tall),
  1 line at 600. y 202..286.

### 2.3 Order lines: the "Кошик" list (CO-V-02, -12, -14, -24, CO-F04, -05, -16, -20, -23)

Phone list replaces the current phone `ul` (`CheckoutItems.tsx:156-192`)
with a new section `CheckoutLines` (new file, section 5). It sits on the
white page at the full content width, NO panel (see 7.1 for why this
deviates from the TR-07 ring panel): rows are the shared product line row
(TR-08 / TR-19, shared atom S3 `LineItemRow`), identical to the cart sheet
rows one tap away (fixes the "three anatomies" CART-V16 / CO-V-12).

Wrapper (`CheckoutItems.tsx:79`): keep `overflow-clip rounded-3xl
bg-bg-subtle`, append `max-lg:overflow-visible max-lg:rounded-none
max-lg:bg-transparent` (R1; overflow must be visible so the 44-px trash
hit box can reach 10 px into the gutter). The desktop `table` (`hidden
... md:table`) is untouched. The phone `ul md:hidden` is replaced by
`<CheckoutLines entries={entries} className="md:hidden" onEmptied={...} />`.

Geometry at 390 (audit cart): section top y 334.

| Piece | Recipe | Source |
|---|---|---|
| Head row | `flex items-baseline justify-between gap-4`; h2 "Кошик" `text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 outline-none` (`tabIndex={-1}`, id for `aria-labelledby`); count `whitespace-nowrap text-[14px] leading-5 text-neutral-500` = `${count} ${productsPlural(count)}` ("6 товарів", count = units, same number as the header badge) | TR-06 in-block title Title Large, D9; TR-19 cart sheet title + count; copy see 7.5 |
| Rows list | `<ul className="mt-6">`, one `<li>` per entry holding `LineItemRow` | head -> content 24 (TR-06 in-card) |
| Row | see S3; each row `border-t border-stroke-subtle pt-[23px] pb-6` (1-px #d2d2d2 line drawn inside: 23 + 1 = 24) | TR-08, D10 dividers 1 px, memory "strokes inside" |
| Subtotal row | `flex flex-col gap-2 border-t border-stroke-subtle pt-[23px]`: label "Сума замовлення" `text-[14px] font-medium leading-5 text-neutral-500`; amount `whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900` = `formatPrice(subtotal)` | TR-27 key/value (label 14/20 Medium #777779, 8, headline value 22/28 SemiBold) |

Row anatomy in this list (S3 props as checkout passes them):
- Photo 64 x 64 r16 on `bg-bg-product` (#d5d5d5), object-cover, link to
  the PDP with `tabIndex={-1} aria-hidden` (the name is the one link,
  CO-F23). Grayscale when the line is sold out / "Під замовлення".
- Text column (flex-1, gap 4): optional status eyebrow, name = product
  title only (16/22 Bold +0.16, `line-clamp-2`, link), meta
  `${volume}, ${brand}` (14/20 #777779), unit price line
  `${formatPrice(unit)} за од.` (14/20 #777779).
- Remove: 44 x 44 hit box, 24 trash glyph, top right of the row, glyph
  right edge on the content edge (x 366): `-mr-[10px] -mt-[10px]`;
  aria-label `Видалити «${title}» із замовлення` (unchanged copy).
- Bottom line, indented to the text column: stepper (shared QtyStepper
  `size="sm"`, 40 x 40 +/- boxes, count 16/22 Bold, S2) with `-ml-3` so
  the minus glyph aligns with the name; line total right (16/22 Bold
  +0.16 `whitespace-nowrap`, `ml-auto`). `flex-wrap`: at 320 a 4-digit+
  line total moves to its own line, right-aligned (no overflow).
- Widths: text column 220 at 390 (150 at 320, 430 at 600) after photo
  64 + 16 and the trash 34 (44 - 10) + 8. Heights: 2-line name row ~197,
  1-line ~175 (vs 166/144 today but no 3-5 line names: CO-V-02).

Status / price variants (CO-V-24, CO-F04; text from existing atoms):

| Line | Status eyebrow (12/20 Medium uppercase) | Photo | Stepper | Price line |
|---|---|---|---|---|
| retail, in stock | none (see 7.4) | colour | enabled | `31,65 ₴ за од.` #777779 |
| retail, `!available` | "Немає в наявності" `text-negative` (StatusLine copy) | grayscale | disabled (`locked`, `CheckoutItems.tsx:75-76`) | as above |
| retail, promo (`oldPrice`) | none | colour | enabled | `24,50 ₴ за од.` in `text-brand` + 8 + old `31,65 ₴` `line-through` #777779 |
| partner, in stock | none | colour | enabled | `28,99 ₴ за од. (ваша ціна)` (copy see 7.6) |
| partner, preorder / `!available` | "Під замовлення" `text-negative` (B2BStatusLine copy) | grayscale | enabled (preorder rule) | as partner |

Removal focus (CO-F16): `CheckoutLines` keeps a `Map<id, HTMLButtonElement>`
of the remove buttons; on remove it focuses (`preventScroll: true`) the
next row's remove button, else the previous one; when the last line goes,
it calls `onEmptied()` and CheckoutClient focuses the empty-state title
(2.8) once it mounts.

Long content: 150-char names clamp at 2 lines; 4-digit quantities grow
the count slot (`min-w-7`, nowrap); 6-digit line totals wrap to their
own line at 320; a 6-line cart is ~1 150 px of list (no inner scroll, no
"show more": a cart is short and every line must stay editable).

### 2.4 The form card (`CheckoutForm.tsx:72-276`; CO-V-11, -13, -17, -19, D2, D5, D6)

ONE card, 48 below the subtotal row (`CheckoutClient.tsx:95` grid `gap-10`
-> `gap-12 lg:gap-20`; desktop gap 80 unchanged): a white body with a
1-px #8e8e8f ring (D2 public panel ring, hero text card 3082:3246) and the
dark summary footer attached at the bottom (desktop identity), r32 (D5).
Width 342 (272 at 320, 552 at 600); inner 294 (224 / 504). Source for the
inner rhythm: the master contact form card 3166:7864 (white content panel,
px 24, pt 32, pb 48, fields full inner width, submit at the end).

| Element | Existing classes | Phone deltas (R1) | Result on phones |
|---|---|---|---|
| `<form>` `:72` | `flex flex-col overflow-clip rounded-3xl` | `max-lg:rounded-[32px]` | r32 clip (D5) |
| body `:73` | `flex flex-col gap-10 bg-bg-subtle p-6 sm:p-8 lg:gap-[60px]` | `max-lg:gap-12 max-lg:rounded-t-[32px] max-lg:border max-lg:border-b-0 max-lg:border-stroke-default max-lg:bg-white max-lg:px-[23px] max-lg:pt-[31px] max-lg:pb-12 max-lg:[--field-surface:#fff]` | white, ring top/left/right (the dark footer closes the bottom), pt 32 / px 24 / pb 48, sections 48 apart (D10 big blocks 48), floating labels cut the ring on white |
| section `:74`, `:112` | `flex flex-col gap-6 lg:gap-8` | none | title -> fields 24 (TR-06 in-card) |
| section h2 `:75`, `:113` | `text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900` | `max-lg:text-[22px] max-lg:font-semibold max-lg:tracking-[-0.44px]` | Title Large 22/28 SemiBold (TR-06, D9). "Інформація про доставку" = 1 line at 390, 2 at 320/360 |
| fields column `:78`, `:116` | `flex flex-col gap-6` | `max-lg:@container` on `:116` | pitch 70 (TR-21, D6) |

Section 1 "Особиста інформація": Ім'я, Email, Номер телефону stacked
(the `sm:grid-cols-2` pair at `:87` stays stacked on phones, unchanged),
each 294 x 46, r24, 16-px text (D6, TR-21). Changes: phone `maxLength={19}`
and validation (2.10).

Section 2 "Інформація про доставку", top to bottom:
1. Місто (AutocompleteField, unchanged call) - keyboard behaviour in S8.
2. Delivery: radio group on phones (2.5), the select stays on desktop.
3. Conditional block, 24 below the group (2.6).
4. Payment: radio group on phones (2.5), the select stays on desktop.
5. Коментар textarea 294 x 120, r24 (TR-21; desktop identity, unchanged).
6. Invoice checkbox row (2.7) and, when ticked, the company fields.

Field ring contrast (CO-V-19): the #d2d2d2 ring stays (D6 names it
explicitly); see 7.3.

### 2.5 Delivery and payment as radio rows (CO-V-04, CO-F07, CO-V-08/CO-F03 for these two)

TR-22 (quiz option rows 3111:14541) replaces the two selects on phones,
so every option is readable at 320 and no menu can open off-screen.

- Desktop untouched: wrap each existing `SelectField` (`:126-133`,
  `:191-198`) in `<div className="max-lg:hidden">` (an extra block wrapper
  is layout-neutral in the flex column).
- Phone: `<RadioGroup className="lg:hidden" name="delivery"
  label="Варіанти доставки" options={DELIVERY_OPTIONS} value onChange
  error />` and the same for payment (`name="payment"`,
  `label="Варіанти оплати"`, options from PAYMENT_OPTIONS). Atom S4.
- Anatomy: legend 14/20 Medium #777779 (menu label "Напрями" 3117:13578),
  16 below the first row; rows: label 16/24 Bold #000 (selected: brand)
  left + 40 radio marker right (1.5-px brand ring, white; selected = brand
  fill + white check), whole row is the label/target. SYSTEM critique
  round 1 (A24): row `min-h-10` (the master option / radio box) + a 44
  hit from `after:-inset-y-0.5`, rows `gap-10` = the master's 40 apart
  (Quizz Card 3111:14541): one-line rows pitch 80, 2-line rows pitch 88.
- Sizes at 390: text column 294 - 16 - 40 = 238; "Нова Пошта (Адресна
  доставка)" wraps to 2 lines (48 tall), others 1 line. Delivery group =
  20 + 16 + 40 + 40 + 40 + 40 + 40 + 40 + 48 = 324; payment = 20 + 16 +
  3 x 40 + 2 x 40 = 236. At 320 (text column 168) the three Nova Poshta
  labels take 2 lines each: delivery = 20 + 16 + 3 x 48 + 40 + 3 x 40 =
  340.
- Error (S5): caption under the last row, 8 below, 12/16 Medium #d92d20
  (`text-negative`, D6); the group gets `aria-invalid` +
  `aria-describedby`.
- Keyboard: native radios (`peer sr-only`), arrow keys move the choice;
  focus-visible = 2-px brand ring on the marker (D12).

### 2.6 Conditional delivery block (S6)

- Самовивіз - pickup notice `CheckoutForm.tsx:136`: `flex items-start
  gap-2 text-[14px] leading-6 text-neutral-800` + `max-lg:leading-5` ->
  Body Small 14/20 #343435 (D9; FAQ answer colour), info glyph 24
  #a5a5a5 unchanged. 6 lines at 320, 5 at 390.
- Нова Пошта (Самовивіз) / (Поштомат): `SelectField` "Відділення" /
  "Поштомат" stays a select (real lists are long) with the shared
  two-line option support (S8a): data.ts gives each option `label` (full
  string, desktop unchanged), `primary` ("Поштомат №10233") and
  `secondary` ("бульв. Лесі Українки, 26") split at ": ". Phones: menu
  items 2 lines (16/22 Medium + 14/20 #777779, px 16 py 12, 66 tall), menu
  `max-h` 232 (3.5 items so the cut reads as scrollable, CO-V-10), the
  chosen value shows both lines inside the ring (auto height >= 46,
  py 10) so the picked address is visible (CO-F07). TR-11 panel, TR-21.
- Нова Пошта (Адресна доставка): Вулиця (Autocomplete, unchanged; magnifier
  kept, see CO-31) + Будинок / Квартира. The pair `:172` `grid gap-6
  sm:grid-cols-2 sm:gap-4` gets `@min-[288px]:grid-cols-2
  @min-[288px]:gap-4` (container = the fields column, `max-lg:@container`):
  side by side from 390 (2 x 139), stacked at 320 / 360 where a 104-124
  field cannot hold "Квартира" + its error line (CO-V-18).

### 2.7 Invoice block (S8; CO-V-16, CO-F15, CO-F08, CO-V-18)

- Checkbox row: shared CheckboxField with a 44-px row on phones (S8f).
  Label passed as nodes so the compound word never splits:
  `<>Потрібен <span className="whitespace-nowrap">рахунок-фактура</span></>`
  (wraps as "Потрібен / рахунок-фактура" at 320, one line from 360).
- Fields when ticked: Назва компанії; ЄДРПОУ / ІПН pair (`:222`, same
  container-query recipe as 2.6, pair from 390); Адреса; Email для
  отримання рахунку.
- Resting labels never overflow the ring (CO-F08): on the form body add
  the AuthDrawer host recipe (`AuthDrawer.tsx:173-174`):
  `max-lg:[&_input:placeholder-shown:not(:focus)+span]:max-w-[calc(100%-48px)]
  max-lg:[&_input:placeholder-shown:not(:focus)+span]:truncate`. At 320
  "Email для отримання рахунку" reads "Email для отримання ра..." resting
  and in full once floated (12 px, 192 wide). The shared layer may bake
  this into fields.tsx instead (S8g); then drop the host class.
- maxLength: ЄДРПОУ 8, ІПН 12 (CO-F22).

### 2.8 Summary footer + submit (CO-V-05, CO-F09, CO-V-07, CO-V-20)

Dark footer `CheckoutForm.tsx:263` keeps `bg-neutral-900` (#1d1d1f desktop
identity; D5 precedent "dark tiles keep their desktop fill") and `p-6
sm:p-8 gap-6 lg:gap-8` (24 on phones). Contents on phones:

- Sum row: the existing row `:265-268` gets `max-lg:hidden`; a phone twin
  `lg:hidden` before it (R2): `flex flex-col gap-2`: label "Сума
  замовлення" `text-[14px] font-medium leading-5 text-neutral-400`
  (#8e8e8f, footer contact-row label on dark 3111:14916), amount
  `whitespace-nowrap text-[22px] font-semibold leading-7
  tracking-[-0.44px] text-white` (TR-27 headline value). Never splits the
  "₴"; the label never squeezes the amount (CO-V-05, CO-F09).
- Reserve note `:269`: `text-[14px] leading-6 text-white/60` +
  `max-lg:leading-5`, and the minutes glued: `Товари зарезервовано на
  <span className="whitespace-nowrap">{RESERVE_MINUTES} хвилин</span>.`
  (CO-V-20; desktop unaffected, it fits one line there).
- Submit `:273` `<Button type="submit" variant="accent" fullWidth>До
  оплати</Button>` unchanged: with the shared Button fix (D8, S1) it is a
  294 x 42 pill, 16/22 Medium on phones (menu button 3117:14325), 52 on
  desktop. Do NOT switch the call to `size="small"`/"responsive" (keeps
  the desktop string byte-identical).
- Footer height at 390: 24 + 56 + 16 + 20 + 24 + 42 + 24 = 206.
- Not sticky (TR-18 only when the action would otherwise be off-screen;
  the subtotal in 2.3 already shows the total early, and a fixed bar
  would ride the iOS keyboard). 60 below it the public footer starts.

### 2.9 Empty state (S2; CO-V-22)

- Desktop card `CheckoutClient.tsx:77-89` gets `max-lg:hidden`.
- Phone twin `lg:hidden`: shared `EmptyState` (S5, TR-24; the same atom
  the cart sheet uses for "Кошик порожній"): white panel r32 with a 1-px
  #8e8e8f ring (D2), centred, py 48 px 24: 52 icon tile (r12, 1-px
  #8e8e8f ring, cart glyph 24) -> 24 -> "Кошик порожній" Title Large
  22/28 SemiBold (title `tabIndex={-1}` for focus after the last removal)
  -> 16 -> "Додайте товари з каталогу, щоб оформити замовлення." 14/20
  #777779 max-w 294 -> 32 -> `<Button href="/catalog" arrow
  size="small">Перейти в каталог</Button>` (42 pill + 42 disc, D8).
- y 334 at 390, ~330 tall, 60 to the footer.

### 2.10 Validation and errors (S5; CO-F06, CO-F17)

- Errors keep the shared State=Error ring (#d92d20) and the hint line;
  the hint offset/colour on phones follows D6 (8 below, #d92d20) via
  the shared fields change S8d.
- Phone number: `data.ts:117` `PHONE` regex is replaced by
  `isValidPhone()` from `src/components/auth/data.ts` (10 national digits
  0[3-9]XXXXXXXX after stripping "+38", spaces, brackets, dashes); same
  message "Перевірте номер телефону". `maxLength={19}` on the field.
- First-error focus (`CheckoutForm.tsx:58-66`): delivery / payment now
  exist twice (desktop select button and phone radios, both
  `name="delivery"` / `"payment"`), so pick the first VISIBLE control:
  `Array.from(form.querySelectorAll<HTMLElement>(`[name="${first}"]`)).find((el) => el.getClientRects().length > 0)`;
  for a radio, focus the checked one or the first and scroll its
  `[role="radiogroup"]` instead; call `el.focus({ preventScroll: true })`
  then `scrollIntoView({ block: "center", behavior:
  matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" :
  "smooth" })` (SYSTEM critique round 1).
- One announcement instead of six (CO-F17): checkout fields pass
  `announceError={false}` (S8d); the focused first field carries its
  message through `aria-describedby`.

### 2.11 Success (S9; CO-V-15, CO-F10)

- Desktop panel `CheckoutClient.tsx:41-67` gets `max-lg:hidden` (both
  wrappers keep `role="status"`; the hidden one is not announced).
- Phone twin `lg:hidden`: `EmptyState` (S5) variant: 52 icon tile with
  `CheckCircleIcon` (cart/icons.tsx) in brand -> 24 -> title "Дякуємо!
  Замовлення <span className="whitespace-nowrap">{number}</span>
  прийнято" (Title Large, centred; "BN-466486" never splits) -> 16 ->
  body "Підтвердження надіслано на {email}. Менеджер зв'яжеться з вами
  найближчим часом, щоб узгодити деталі оплати та доставки." 14/20
  #777779 -> 32 -> `<Button href="/catalog" variant="accent"
  size="small">Продовжити покупки</Button>` (hug, TR-24). No dark band.
- Focus + scroll: the effect at `:28-30` focuses the VISIBLE title; on
  phones (`!matchMedia("(min-width: 640px)").matches`) use
  `focus({ preventScroll: true })`, skip the `window.scrollTo` in
  `place()` (`:38`), and after render: if the panel's bottom at scrollY 0
  fits (`panelTop + panelHeight <= innerHeight - 24`) scroll to 0, else
  scroll so the panel top sits 24 below the header
  (`top = panelTop - 66 - 24`). Result: 390 x 844 shows crumb + H1 +
  panel; 320 x 568 shows the whole panel with its button (CO-V-15).
  Desktop keeps today's `scrollTo(0)` + `focus()`.

### 2.12 Hydrating placeholder (S1)

`CheckoutClient.tsx:72` `min-h-[60vh]` + `max-lg:min-h-[60dvh]` (brief:
dvh on phones). Nothing else renders; no empty-state flash (kept).

### 2.13 Behaviour and interactions

- Stock gate (CO-F04, S10): CheckoutClient calls
  `useCart().checkout("checkout")` (SYSTEM critique round 1: `issuesFrom
  = "checkout"`, cart 2.4.1 / 2.6) once after hydration when the cart has
  lines (ref-guarded), and again at the top of `place()`; `false` = the stock sheet (cart area, D7
  full-screen) took over and the order is not placed. Its "Оформити
  замовлення" returns to /checkout with the cleaned cart. Desktop gets
  the same (functional, no baseline diff: the baseline carts are clean).
- Prefill (CO-F11): initial values = EMPTY_VALUES < account < session
  draft. Account (`useAuth().user`): name = person.fullName, email =
  person.email, phone = `formatPhone(person.phone || user.phone)`;
  partner adds company = company.name, edrpou = company.edrpou,
  invoiceEmail = person.email; `invoice` stays false (7.6).
- Draft (CO-F12): `sessionStorage["binar.checkout.draft.v1:" +
  (user?.id ?? "guest")]` = JSON of the values, written on every change,
  read on mount, removed on success; every access in try/catch.
- Payload pruning (CO-F21): `pruneDelivery(values)` in data.ts keeps
  branch / locker / street+house+flat only for their method and the
  company fields only when `invoice`.
- Cart sheet over /checkout (S11): opening/closing never moves the page
  (shared S9 `preventScroll`), Back closes the sheet first (shared S10);
  qty edits in the sheet update the lines, both totals and the sr-only
  live total (`CheckoutClient.tsx:98-100`, kept).
- City autocomplete: on phones the focused field scrolls to the top of
  the viewport and the menu is capped above the keyboard (shared S8c);
  picking a city keeps focus in the input (no blur, CO-F16).
- Branch / locker menus scroll into view on open with 24 px clearance
  (shared S8b).
- No corner "ВГОРУ" FAB over the form (shared S7, shell-public P4); the
  footer's own ring stays.
- No horizontal scrollers, no sticky bars, no load-more (a cart is
  short), no sheets owned by this page.

---------------------------------------------------------------------

## 3. Bugs to fix (both lenses merged)

Ids CO-01..CO-40; original ids in brackets. "Owner" = this area (A) or the
shared layer (S#, section 4). Severity from the reports (major/minor/nit);
merged items keep the higher one.

| Id | Sev | Where | What | Fix | File:line | Owner |
|---|---|---|---|---|---|---|
| CO-01 (CO-V-06, CO-F01) | major | all seeds, 320..600, scrolled | Touch CornerFab 100 x 100 fixed bottom-right (z 35) sits on select chevrons, textarea, total and the right third of "До оплати"; taps scroll to top; paints over open menus | No corner FAB on shop routes below 640 (shell-public P4); fallback API `data-scrollup-avoid` (S7) on the lines section and the form | `ScrollUpDock.tsx:56, 290-365` | S7 |
| CO-02 (CO-F02) | major | /checkout 390 (437 px), 320 (299 px) | Closing the cart sheet restores focus to the header button and the browser scrolls the page | `opener.focus({ preventScroll: true })` | `cart/useModalBehavior.ts:79` | S9 |
| CO-03 (CO-V-08, CO-F03) | major | delivery / payment / branch / locker menus near the bottom | Menus drop below the fold, page never scrolls | Delivery + payment become radio rows (2.5, A); branch / locker / city menus scroll into view on open (S8b) | `fields.tsx:251-270, 327-330, 466-490`; `CheckoutForm.tsx:126-198` | A + S8 |
| CO-04 (CO-F04, CO-V-24) | major | stale cart opened on /checkout | Sold-out and promo lines are ordered without a check; rows show no status | Stock gate on mount and in `place()` via `useCart().checkout()`; row status / grayscale / promo price (2.3) | `CheckoutClient.tsx:32-39`; `CheckoutItems.tsx:75-76, 157-190` | A |
| CO-05 (CO-V-03, CO-F05) | major | every line, every width | Qty +/- are bare 16 x 16 glyphs | 40 x 40 boxes on phones (TR-15) in the shared stepper | `catalog/ProductCard.tsx:145-170` | S2 |
| CO-06 (CO-F06) | major | Номер телефону | Regex counts characters: "----------", 9 digits pass | `isValidPhone()` from auth/data.ts, `maxLength={19}` | `data.ts:117, 124-125`; `CheckoutForm.tsx:98-107` | A |
| CO-07 (CO-V-01, CO-F18) | major | head, 320..430 | Crumb wraps to 2 rows with an orphan "/", repeats the H1; "Каталог" link 63 x 22 | One-row phone crumb back disc + "Каталог" (2.1) | `page.tsx:20-35` | A (+ S6) |
| CO-08 (CO-V-02) | major | lines, 320..390 | Names 3-5 lines (trash in the name row, title+volume+brand in one string, no clamp) | LineItemRow: title only, clamp 2, meta line, trash as a 44 box (2.3) | `CheckoutItems.tsx:39-60, 157-178` | A + S3 |
| CO-09 (CO-V-04, CO-F07) | major | delivery / payment / branch / locker values, 320 and 390 | Chosen value truncated ("Нова Пошта (По..."), the picked address never visible | Radio rows for delivery/payment (2.5); two-line value + items for branch/locker (2.6, S8a) | `fields.tsx:385-391`; `CheckoutForm.tsx:126-198`; `data.ts:56-70` | A + S8 |
| CO-10 (CO-V-05, CO-F09) | major | dark footer, 320 (and 360 with 6 digits) | Label wraps, amount splits "₴" onto its own line, row 120 tall | Phone twin: label above amount, amount nowrap (2.8) | `CheckoutForm.tsx:264-268` | A |
| CO-11 (CO-V-07) | major | "До оплати", "Продовжити покупки" | Un-designed large-on-phone pill 48.5 / 15px / 400 | D8 Button fix (phone strings of size large = small); success twin uses `size="small"` | `ui/Button.tsx:80-81`; `CheckoutForm.tsx:273`; `CheckoutClient.tsx:61` | S1 (+ A for the twin) |
| CO-12 (CO-V-09, CO-F19) | major (decision) | seed b2b | Partner drops out of the cabinet shell; partner prices unlabelled; no prefill | Keep the public shell on /checkout (desktop baseline `cabinet-1710-checkout-cart` is the public shell; a viewport-dependent shell is worse); label partner prices "(ваша ціна)" in the row; prefill (CO-24). Shell question to 7.6 | `PlatformChrome.tsx:24-33`; `CheckoutItems.tsx` | A (labels) / system spec (shell) |
| CO-13 (CO-V-10) | minor | branch / locker menu, 320 / 390 | Items wrap with orphans ("просп. Науки, / 8"); max-h 250 cuts item 4 so its text lines up with the content under the menu | Two-line items (primary / secondary), phone max-h 232 (3.5 items) | `fields.tsx:265, 292`; `data.ts:56-70` | S8 + A (data) |
| CO-14 (CO-V-11) | minor | items wrapper, form, empty, success | r24 panels | r32 (D5) via max-lg deltas / twins | `CheckoutItems.tsx:79`; `CheckoutForm.tsx:72`; `CheckoutClient.tsx:45, 77` | A |
| CO-15 (CO-V-12) | minor | lines | Desktop recipe on phones: 0.5-px inset hairlines, p 16, 60 r12 photo, 14/24 meta; differs from the cart row | Shared LineItemRow, 1-px #d2d2d2 lines, 64 r16, 14/20 | `CheckoutItems.tsx:20-37, 62-68, 156-192` | A + S3 |
| CO-16 (CO-V-13) | minor | lines -> form, form sections | 40-px gaps | 48 (D10): grid `gap-12 lg:gap-20`, body `max-lg:gap-12` | `CheckoutClient.tsx:95`; `CheckoutForm.tsx:73` | A |
| CO-17 (CO-V-14, CO-F20) | minor | lines | No list heading, total only after the whole form (1.7 screens at 390, 3.1 at 320 x 568) | "Кошик" head + count; subtotal key/value row under the list (2.3) | `CheckoutItems.tsx:156-192` | A |
| CO-18 (CO-V-15, CO-F10) | minor | success, 320 | Number breaks at "BN-"; CTA below the fold at 568; 48.5 pill; dark band holding only the button | Phone success panel with nowrap number, scroll rule, hug 42 button (2.11) | `CheckoutClient.tsx:28-67` | A |
| CO-19 (CO-V-16, CO-F15) | minor | invoice checkbox | "рахунок-" / "фактура" split at 320; tap row 24 tall, a tap 10 px below misses | Nowrap compound (label as nodes); 44-px row on phones | `CheckoutForm.tsx:205-210`; `fields.tsx:545-575` | A + S8f |
| CO-20 (CO-V-17) | minor | h2s, meta, notice, note | 24/28 Bold titles, 14/24 leading | Title Large 22/28 SemiBold; Body Small 14/20 (2.3, 2.4, 2.6, 2.8) | `CheckoutForm.tsx:75, 113, 136, 269`; `CheckoutItems.tsx:166`; `CheckoutClient.tsx:51, 78` | A |
| CO-21 (CO-V-18) | minor | Будинок/Квартира, ЄДРПОУ/ІПН | Short pairs stacked full width (form 1504 tall at 390) | Container-query pairs from inner 288 (390+) | `CheckoutForm.tsx:172, 222` | A |
| CO-22 (CO-V-19) | minor | every field | #d2d2d2 ring on the panel = 1.42 : 1 (WCAG 1.4.11 wants 3 : 1) | REJECTED for this pass: D6 fixes the ring at #d2d2d2 on every shop form; the white phone body raises it to 1.5 : 1. Raised as open point 7.3 | `fields.tsx:23` | - |
| CO-23 (CO-F08) | minor | invoice on, 320 | "Email для отримання рахунку" resting label (253) overflows the 224 ring, clipped by the form | Host truncate recipe on phones (2.7); or baked into fields (S8g) | `fields.tsx:50-51`; `CheckoutForm.tsx:73` | A (S8g optional) |
| CO-24 (CO-F11) | minor | seeds b2c / b2b | Signed-in users retype name / email / phone / company | Prefill from `useAuth().user` (2.13). Changes the desktop shot `cabinet-1710-checkout-cart` (values in the fields) - needs orchestrator acceptance (7.8) | `CheckoutForm.tsx:47` | A |
| CO-25 (CO-F12) | minor | any | Typed form lost on PDP round trip / reload | sessionStorage draft (2.13) | `CheckoutForm.tsx:47-52` | A |
| CO-26 (CO-F13) | minor | cart sheet open on /checkout | Hardware Back leaves /checkout (form lost) | Sheets own a history entry; Back closes the sheet first | `cart/CartDrawer.tsx` (+ every TR-09 sheet) | S10 |
| CO-27 (CO-F14, plausible) | minor | city field mid-screen | 250-px menu ends under a 336-px keyboard (4 of 8 hidden) | Phone: scroll the focused field to the top + cap menu height with visualViewport | `fields.tsx:466-490` | S8c |
| CO-28 (CO-F16) | minor (a11y) | trash, city pick | Focus drops to `<body>` | Trash: focus next / previous remove or the empty title (2.3, A); city: no `blur()` (S8c) | `CheckoutItems.tsx:170-177`; `fields.tsx:530` | A + S8 |
| CO-29 (CO-F17) | minor (a11y) | empty submit, selects | Six `role=alert` at once; `aria-controls` to an unmounted listbox; no `aria-activedescendant` | `announceError` prop (checkout passes false); `aria-controls` only while open; option ids + `aria-activedescendant` | `fields.tsx:98, 379, 414, 481` | S8d/S8e |
| CO-30 (CO-V-20) | nit | reserve note, 320 | Orphan "хвилин." | Nowrap "15 хвилин" (2.8) | `CheckoutForm.tsx:269-271` | A |
| CO-31 (CO-V-21) | nit | Вулиця | Magnifier shown although `options={[]}` never suggests | REJECTED (deferred): the master draws the adornment on both autocomplete fields at every width; it becomes true when the NP street API lands (data.ts placeholder note). No phone-only divergence | `CheckoutForm.tsx:163-171` | - |
| CO-32 (CO-V-22) | nit | empty | r24 left-aligned card with 24/28 Bold title | TR-24 EmptyState twin (2.9) | `CheckoutClient.tsx:75-89` | A + S5 |
| CO-33 (CO-V-23) | nit | summary vs footer | #1d1d1f block 60 above the #2d2d2f footer (two blacks) | REJECTED: #1d1d1f is the desktop identity of the summary (D5 keeps desktop dark fills), the 60-px white gap separates them | `CheckoutForm.tsx:263` | - |
| CO-34 (CO-F21) | nit | submit | Stale branch / locker / street stay in the payload | `pruneDelivery()` before `onSubmit` | `CheckoutForm.tsx:68`; `data.ts` | A |
| CO-35 (CO-F22) | nit | ЄДРПОУ / ІПН / phone | No maxLength | 8 / 12 / 19 | `CheckoutForm.tsx:98-107, 223-238` | A |
| CO-36 (CO-F23) | nit | lines | Photo and name both link to the PDP (two tab stops) | Phone row photo `tabIndex={-1} aria-hidden`; desktop `Thumb` the same (pixel-neutral) | `CheckoutItems.tsx:20-37` | A + S3 |
| CO-37 (CO-F24) | nit | stepper | No typed quantity (1500 units = 1499 taps) | REJECTED for this pass: a typed-quantity control is a product feature for every breakpoint with no master; open point 7.9 | `catalog/ProductCard.tsx:120-172` | - |
| CO-38 (CO-F25) | nit | 844 x 390 landscape | Desktop canvas at zoom 0.586 (tiny targets) | REJECTED: by design (brief: no tablet layout, >= 640 is the frozen desktop) | - | - |
| CO-39 (shell, CO-V section 5) | minor | 320 near the footer | Corner FAB and the footer ring visible together | Forwarded to shell-public (solved by S7) | `ScrollUpDock.tsx:331` | S7 |
| CO-40 (outside, functional report) | - | auth drawer, burger | Heading typo "Вхід до осбистого кабінету"; burger menu jumps the page to 0 while open | Forwarded to the auth and shell-public specs | `auth/AuthDrawer.tsx`; `Header.tsx:273-302` | other areas |

Spec additions that are not audit findings: hint offset / colour per D6
(S8d), `min-h-[60dvh]` placeholder (2.12), focus-visible rings on the new
controls (D12), `motion-reduce:transition-none` on the trash colour
transition.

Count to fix: 33 (CO-01..CO-21, CO-23..CO-30, CO-32, CO-34..CO-36);
rejected 5 (CO-22, CO-31, CO-33, CO-37, CO-38); forwarded 2 (CO-39,
CO-40). Kit false positives that stay: `overlapText` on the transparent
select value span under its resting label (now only branch / locker),
`clippedText` on the footer "ВГОРУ" ring, logo / "Made by Chilline"
small targets (shell).

---------------------------------------------------------------------

## 4. Shared needs

Exists = the file exists today; "change" = phone-only deltas required;
"new" = new atom. Every change must keep the landing + desktop pixel
guard at 0 diffs (D12).

### S1 Button phone strings (exists, change pending - D8)
- `ui/Button.tsx:80-81, 93-115`: phone strings of `size="large"` become
  the small strings (42 pill `rounded-[24px] px-[23px] py-[9px]
  text-button-md`, 42 disc, 11 arrow); the `sm:` desktop strings stay.
- Checkout relies on it for "До оплати" (no call-site change).

### S2 QtyStepper touch boxes (exists, change - TR-15, D8, D11)
- `catalog/ProductCard.tsx:120-172`. Phone-only classes, no new prop:
  wrapper `flex items-center gap-2 max-lg:gap-0`; each button adds
  `max-lg:flex max-lg:size-10 max-lg:items-center max-lg:justify-center
  focus-visible:outline-2 focus-visible:outline-brand`; `size="sm"` count
  adds `max-lg:text-[16px] max-lg:tracking-[0.16px]` (16/22 Bold, min-w-7
  kept). Visual width 108 (40 + 28 + 40).
- Also used by the cart sheet, stock sheet, catalog cards (their specs
  must agree on the count size).

### S3 LineItemRow (new - TR-08 / TR-19)
- Proposed `src/components/ui/LineItemRow.tsx` (shared by cart sheet,
  stock sheet, checkout).
- API:
  ```ts
  type LineItemRowProps = {
    href: string; image: string; title: string;
    meta?: ReactNode;            // "40 мл, Botanica"
    price?: ReactNode;           // "31,65 ₴ за од." (+ promo / partner variants)
    status?: ReactNode;          // eyebrow, rendered only when given
    grey?: boolean;              // grayscale photo
    qty: number; onQty: (n: number) => void; qtyDisabled?: boolean;
    total: ReactNode;            // line total, nowrap
    onRemove: () => void; removeLabel: string;
    removeRef?: (el: HTMLButtonElement | null) => void;
    className?: string;
  };
  ```
- Classes: root `flex flex-col gap-4 border-t border-stroke-subtle
  pt-[23px] pb-6`; top `flex items-start gap-4`; photo link `relative
  block size-16 shrink-0 overflow-clip rounded-2xl bg-bg-product`
  (`tabIndex={-1} aria-hidden`), img `absolute inset-0 size-full
  object-cover` (+ `grayscale`); text column `flex min-w-0 flex-1 flex-col
  gap-1`; status `text-[12px] font-medium uppercase leading-5`; name link
  `line-clamp-2 text-[16px] font-bold leading-[22px] tracking-[0.16px]
  text-neutral-900`; meta / price `text-[14px] leading-5
  text-neutral-500`; remove `-mr-[10px] -mt-[10px] flex size-11 shrink-0
  cursor-pointer items-center justify-center rounded-full text-neutral-900
  transition-colors duration-200 motion-reduce:transition-none
  hover:text-brand active:text-brand focus-visible:outline-2
  focus-visible:outline-brand` + `TrashIcon size-6`; bottom `flex flex-wrap
  items-center justify-between gap-x-4 gap-y-2 pl-20`, stepper wrapper
  `-ml-3`, total `ml-auto whitespace-nowrap text-[16px] font-bold
  leading-[22px] tracking-[0.16px] text-neutral-900`.
- Fallback if the shared atom is late: CheckoutLines renders the same
  markup locally with these exact classes; the shared layer swaps it in.

### S4 RadioGroup (new - TR-22)
- Proposed `src/components/ui/RadioGroup.tsx` (checkout delivery /
  payment; also cancel-order / return reasons, roles in other areas).
- API: `{ name: string; label: string; options: { value: string;
  label: string; hint?: string }[]; value: string; onChange: (v: string)
  => void; error?: string; className?: string }`.
- Markup / classes: `<div role="radiogroup" aria-labelledby={labelId}
  aria-invalid={!!error || undefined} aria-describedby={error ? errId :
  undefined} className="flex flex-col gap-4">`; label `<p id={labelId}
  className="text-[14px] font-medium leading-5 text-neutral-500">`; rows
  wrapper `flex flex-col gap-9`; row `<label className="flex min-h-11
  w-full cursor-pointer items-center gap-4 text-left">` with `<input
  type="radio" className="peer sr-only" name value checked onChange />`,
  text column `flex min-w-0 flex-1 flex-col gap-1` (label
  `text-[16px] font-bold leading-6` black / `text-brand` when selected;
  hint `text-[14px] leading-5 text-neutral-500`), marker `relative flex
  size-10 shrink-0 items-center justify-center rounded-full
  peer-focus-visible:ring-2 peer-focus-visible:ring-brand
  peer-focus-visible:ring-offset-2` = unselected `border-[1.5px]
  border-brand bg-white`, selected `bg-brand` + white 18 x 12 check
  (QuizForm CheckmarkIcon geometry; QuizForm itself is landing code and
  stays untouched); error `pt-2 text-[12px] font-medium leading-4
  text-negative` (D6). No transition on the swap (master is static).

### S5 EmptyState / status panel (new - TR-24)
- Proposed `src/components/ui/EmptyState.tsx` (checkout empty + success,
  cart sheet empty, cabinet lists).
- API: `{ icon: ReactNode; title: ReactNode; text?: ReactNode; action?:
  ReactNode; titleRef?: Ref<HTMLHeadingElement>; framed?: boolean
  (default true: own ring panel; false inside a list panel); role?:
  "status"; className?: string }`.
- Classes (framed): `flex flex-col items-center rounded-[32px] border
  border-stroke-default bg-white px-[23px] py-[47px] text-center`; tile
  `flex size-[52px] items-center justify-center rounded-[12px] border
  border-stroke-default` (glyph 24); title `mt-6 text-[22px]
  font-semibold leading-7 tracking-[-0.44px] text-neutral-900
  outline-none` (`tabIndex={-1}`); text `mt-4 max-w-[294px] text-[14px]
  leading-5 text-neutral-500`; action wrapper `mt-8`.

### S6 PhoneCrumb (new export in exists `ui/Breadcrumb.tsx` - TR-05, shell-public P3)
- `export function PhoneCrumb({ href, label }: { href: string; label:
  string })` -> `<nav aria-label="Навігація" className="lg:hidden"><BackCrumb
  href={href} label={label} /></nav>`. Desktop trails add `max-lg:hidden`
  in their own files. Row 40 tall, one line, never wraps.

### S7 No corner FAB over shop forms (exists, change - TR-18 note, shell-public P4)
- Preferred: CornerFab not rendered on `data-canvas="shop"` routes below
  640 (footer ring stays).
- Fallback API if the shell keeps the FAB: elements marked
  `data-scrollup-avoid` hide it while any of them intersects the bottom
  130 px of the viewport (IntersectionObserver with a px rootMargin
  recomputed on resize); checkout marks the lines section and the form.

### S8 fields.tsx (exists in `src/components/checkout/`, but shared by auth, orders, profile - owned by the shared layer)
- a) SelectField options `{ value; label; primary?; secondary? }`: on
  phones items render `primary` 16/22 Medium + `secondary` 14/20 #777779
  (two `lg:hidden` / `max-lg:hidden` spans; desktop keeps `label`); the
  closed value shows both lines with the trigger `max-lg:h-auto
  max-lg:min-h-[46px] max-lg:py-[10px]` and the value span
  `max-lg:whitespace-normal`; menu `max-lg:max-h-[232px]`.
- b) Menu `ref` + `scroll-mb-6`; after opening, `requestAnimationFrame(()
  => menu.scrollIntoView({ block: "nearest", behavior: "smooth" }))`
  (24 px clear of the viewport bottom; header-aware via scroll-padding).
- c) AutocompleteField on phones: on focus scroll the input to the top
  (`scrollIntoView({ block: "start" })`, lands at y 96), cap the menu
  height to `visualViewport.height + offsetTop - menuTop - 8` (min 140)
  while open; after a pick keep focus (drop `inputRef.current?.blur()`
  at `:530`), close the menu.
- d) Hint: new `announceError?: boolean` (default true) on TextField /
  SelectField / AutocompleteField; `role="alert"` only when true. Phone
  offset and colour per D6: `max-lg:pt-2` and the error tone
  `max-lg:text-negative` (#d92d20; desktop keeps Figma #d32f2f / 3 px).
- e) `aria-controls` only while the menu is open; option ids +
  `aria-activedescendant` for the arrow-key highlight.
- f) CheckboxField: `label: ReactNode`; label row `max-lg:min-h-11`
  (44-px target), glyph and text centred.
- g) Optional: bake the phone resting-label truncation
  (`max-w-[calc(100%-48px)] truncate` while resting) into LABEL_REST for
  phones; then checkout drops its host class (2.7).

### S9 useModalBehavior (exists, change)
- `cart/useModalBehavior.ts:79` `opener.focus({ preventScroll: true })`.

### S10 Sheet history (new behaviour for TR-09 sheets, cart area / shared)
- Opening a phone sheet pushes a history state; `popstate` closes it;
  closing by cross / scrim pops it. Needed by the cart sheet on /checkout.

### Used as is (exist, no change)
- `useCart()` (`checkout`, `count`, `entries`, `subtotal`, `priceMode`,
  `unitPrice`, `setQty`, `remove`, `clear`), `useAuth().user`,
  `isValidPhone` / `formatPhone` (`auth/data.ts:215-234`),
  `productsPlural` / `formatPrice` / `productHref` / `discountPercent`
  (`catalog/data.ts`), `useHydrated`, `CheckCircleIcon` / `TrashIcon`
  (`cart/icons.tsx`), `CartIcon` (`catalog/icons.tsx`), StockModal (cart
  area; on phones a full-screen sheet per D7).

---------------------------------------------------------------------

## 5. Files

This area only (disjoint from other areas):

| File | Change |
|---|---|
| `src/app/checkout/page.tsx` | head gap `gap-12`; PhoneCrumb "Каталог"; desktop nav `max-lg:hidden` (2.0-2.1) |
| `src/components/checkout/CheckoutClient.tsx` | grid `gap-12 lg:gap-20`; stock gate (mount + place); phone EmptyState twin + desktop `max-lg:hidden`; phone success twin, visible-title focus, phone scroll rule; `onEmptied` focus; placeholder `max-lg:min-h-[60dvh]` |
| `src/components/checkout/CheckoutForm.tsx` | max-lg deltas on form / body / h2s / notice / note; `max-lg:@container` + `@min-[288px]` pairs; RadioGroup twins + select wrappers `max-lg:hidden`; sum-row phone twin; minutes nowrap; checkbox label nodes; resting-label host class; maxLength; visible-first-error focus; `announceError={false}`; prefill + draft wiring; `pruneDelivery` before submit |
| `src/components/checkout/CheckoutItems.tsx` | wrapper `max-lg:` resets; phone `ul` replaced by CheckoutLines; desktop `Thumb` link `tabIndex={-1} aria-hidden` (pixel-neutral) |
| `src/components/checkout/data.ts` | phone validation via `isValidPhone`; BRANCHES / LOCKERS options with `primary` / `secondary` (helper `splitPlace`); `pruneDelivery()`; `DRAFT_KEY` |

New files (this area):

| File | Content |
|---|---|
| `src/components/checkout/CheckoutLines.tsx` | phone "Кошик" section: head + count, LineItemRow list with status / price variants, subtotal row, removal focus, `onEmptied` |
| `src/components/checkout/useCheckoutDraft.ts` | initial values (EMPTY < account prefill < session draft), sessionStorage read/write/clear in try/catch |

Not touched by this area (shared layer, see section 4):
`src/components/checkout/fields.tsx` (S8), `src/components/ui/Button.tsx`
(S1), `src/components/catalog/ProductCard.tsx` (S2), new
`src/components/ui/LineItemRow.tsx` (S3), `ui/RadioGroup.tsx` (S4),
`ui/EmptyState.tsx` (S5), `ui/Breadcrumb.tsx` (S6),
`src/components/ScrollUpDock.tsx` (S7), `cart/useModalBehavior.ts` (S9),
`cart/CartDrawer.tsx` / `cart/StockModal.tsx` (cart area),
`platform/PlatformChrome.tsx` (shell-cabinet). Unchanged:
`src/app/checkout/layout.tsx`, `src/components/checkout/icons.tsx`.

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Kit: `audit/mobile/kit/phone.mjs` (touch on), reuse
`audit/mobile/checkout/functional-flows.mjs` / `visual.mjs` sections.
Use `shootViewport` for post-tap states (fullPage drops touch emulation,
functional report "Kit caveat"); `scrollTo({ behavior: "instant" })`.

Widths x heights: 320x568, 360x780, 390x844, 430x932, 600x960 (+375,
414 spot checks). Seeds none / b2c / b2b. Carts from section 1.

Measurements at 390 (320 / 600 in brackets):
1. Gutters: every block x 24..366 (24..296 / 24..576); no horizontal
   overflow (`scrollWidth == innerWidth`) in every state.
2. Crumb: one row, y 114, height 40, disc 40, label 16/22 600 #343435,
   link -> /catalog; no "/" or current crumb visible; desktop trail
   `display:none`.
3. H1 y 202, 40/42 700 -0.8, 2 lines (1 at 600).
4. "Кошик" head y 334, 22/28 600 -0.44; count 14/20 #777779 = header
   badge number.
5. Rows: photo 64 x 64 r16; name 16/22 700 <= 2 lines (<= 44 tall) for
   every product incl. shampoo-long-notes; meta + price 14/20 #777779;
   remove button 44 x 44, glyph right edge = 366 (296 / 576); +/- buttons
   40 x 40; count 16/22 700; line total 16/22 700 one line; row lines
   1-px #d2d2d2 (no 0.5-px gradient lines); big qty cart at 320: totals
   wrap to their own line, nothing clipped.
6. Subtotal: label 14/20 500 #777779, amount 22/28 600 one line, equals
   the dark-footer amount.
7. Form card: x 24 w 342 r32; body white, ring 1-px #8e8e8f on top/left/
   right, pt 32, px 24, pb 48; section titles 22/28 600; sections 48
   apart; fields 294 x 46 (224 / 504) r24, 16-px text, floating label
   background white; field pitch 70.
8. Radio groups: legend 14/20 500 #777779; rows >= 44 tall, radio
   markers 40, marker pitch 80 (84 for 2-line rows); selected label
   brand; tapping anywhere in a row selects; no select button visible
   for delivery / payment below 640.
9. Pickup notice 14/20; branch / locker: picked value shows 2 lines in
   the ring (both lines readable at 320); menu items 2 lines, menu max
   232 tall; menu bottom <= innerHeight - 24 after opening with the field
   120 px above the bottom (390x844 and 320x568).
10. Address / invoice pairs side by side at 390 / 430 / 600 (2 x 139 at
   390), stacked at 320 / 360.
11. Checkbox row >= 44 tall; "рахунок-фактура" never split; tap 10 px
   below the text toggles it.
12. Dark footer: label 14/20 500 #8e8e8f above the amount 22/28 600
   white nowrap; "15 хвилин" on one line; "До оплати" 294 x 42 (224 /
   504), 16/22 500, accent; footer 206 tall; 60 to the page footer.
13. Empty: panel r32 ring, centred, tile 52, title 22/28, button 42 +
   42 disc; 60 to the footer.
14. Success at 320x568: whole panel incl. "Продовжити покупки" inside the
   viewport after submit; number on one line; title focused; cart badge
   gone.

DOM checks (`domChecks`) expected clean in every state at every width:
overflowX, offRight, offLeft, wideElement, tinyText, inputZoom (all
inputs >= 16 px), smallTarget (only the shell false positives: logo,
"Made by Chilline"), clippedText (only the footer ring), hScroller none,
fixedTall none, brokenImage none. elementFromPoint 30 px inside the
right edge of every control (city, radios, branch, textarea, checkbox,
submit) at the bottom of the viewport returns the control, never a fixed
element.

Flows:
- F1 Fill name/email/phone, pick city via the menu, each delivery
  variant (+ branch / locker / address), payment, comment, invoice on ->
  submit -> success; reload -> empty state.
- F2 Empty submit -> 6 errors (name, email, phone, city, delivery,
  payment), the first invalid VISIBLE control focused and centred under
  the header, at most ONE alert-type announcement; delivery / payment
  errors under their radio groups (8 below, #d92d20); errors clear while
  typing / on choice. Invoice on + empty submit -> company, ЄДРПОУ,
  address, invoice email errors.
- F3 Phone validation: "----------", "0000000000", "050 123 45 6" rejected;
  "+38 050 123 45 67", "0501234567" accepted.
- F4 Stepper +/- and remove on each row: subtotal, footer total, header
  badge, sr-only live total update; focus after remove lands on the next
  remove button; removing the last line shows the empty state with its
  title focused.
- F5 Stale stock cart: /checkout opens the stock sheet on load; closing it
  and submitting re-opens it; resolving all returns to a clean /checkout;
  rows show "Немає в наявності" / promo prices; b2b shows "Під замовлення".
- F6 Header cart disc -> sheet -> close (cross, scrim, Back) at scrollY
  600 / 1200: scrollY unchanged; Back with the sheet open stays on
  /checkout.
- F7 Draft: type name + email, open a product from a row, Back -> values
  restored; success clears the draft.
- F8 Prefill: seed b2c -> name / email / phone filled; seed b2b -> also
  company / ЄДРПОУ / invoice email; invoice unchecked.
- F9 Keyboard: Tab order (crumb, row name link, -, +, remove per row,
  fields, radios as one stop each group, ...), arrow keys in radio
  groups and select menus, Escape closes menus, Enter in city picks.
- F10 No corner FAB anywhere on /checkout below 640 (or hidden over the
  form if S7 fallback).

Desktop / landing pixel guard: `node audit/mobile/kit/baseline.mjs
audit/mobile/after` then `node audit/mobile/kit/compare.mjs
audit/mobile/baseline audit/mobile/after`: `shop-1710-checkout-empty`,
`shop-1710-checkout-cart` identical; `cabinet-1710-checkout-cart`
identical, or differing ONLY by the prefilled field values if the
orchestrator accepted CO-24 (7.8); every landing shot identical.
`phone-390-checkout-empty` is expected to change. tsc, eslint clean; no
console errors.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

7.1 Lines on the open page vs the TR-07 ring panel. TR-07 lists
"checkout lines" among the tables that become a ring panel on public
pages (D11 lists tables generally). This spec puts the lines on the white
page (no panel) because (a) TR-08 / TR-19 define product line items as
rows between 1-px #d2d2d2 lines, exactly what the cart sheet shows one tap
away (CO-V-12 / CART-V16 "three anatomies"); (b) a ring panel costs 48 px
of row width and leaves a 102-px name column at 320. If the system spec
insists on the panel: wrap CheckoutLines in `rounded-[32px] border
border-stroke-default px-[23px] pb-6 pt-6` and move the remove button
into the bottom line.

7.2 Form card skin. D2 (white + #8e8e8f ring) is applied to the form body
on phones; the desktop keeps #f8f8f8. Alternative considered: keep the
#f8f8f8 filled card r32 (master filled card 3085:3974, desktop identity)
or a full-bleed #f8f8f8 slab (grey slab 3094:4837, fields 342 wide). The
system spec should pick one skin for every public-shop form (checkout,
auth sheet, materials) and keep it.

7.3 Field ring contrast (CO-22 rejected): D6 fixes #d2d2d2; WCAG 1.4.11
wants 3 : 1 (#8e8e8f would pass on white). System-wide decision.

7.4 LineItemRow status eyebrow: checkout passes it only for exception
lines (sold out / Під замовлення); the cart audit proposes it on every
row. Both work with the same atom; the system spec should pick one rule
for cart + checkout.

7.5 Copy: the list head "Кошик" + "N товарів" reuses existing strings
(cart title, `productsPlural`); alternative "Ваше замовлення" is new copy.
Partner price suffix "(ваша ціна)" reuses the B2B caption.

7.6 B2B partner on /checkout keeps the public shell at every width
(desktop baseline is public; a viewport-dependent shell is not an
option). Whether partners should check out inside the cabinet shell is a
product question (no Figma); if yes it is a desktop change and goes
beyond this pass. Also open: invoice ticked by default for partners
(this spec: no, fields prefilled only).

7.7 Duplicate controls: delivery / payment exist twice in the DOM
(desktop select + phone radios, same `name`). Anything that queries by
name (error focus, tests, future analytics) must filter by visibility;
the verify agent checks only one is rendered per breakpoint.

7.8 Prefill (CO-24) changes `cabinet-1710-checkout-cart` (values in the
fields). The orchestrator must accept that diff or defer CO-24 (then the
draft still helps).

7.9 Typed quantity for wholesale (CO-37) and the "Вулиця" magnifier
(CO-31) wait for product / API decisions.

7.10 fields.tsx physically lives in `src/components/checkout/` but is a
shared atom (auth, orders, profile); in this pass the shared layer owns
it (S8). D6 hint offset / colour (8 px, #d92d20 on phones vs Figma
desktop 3 px #d32f2f) applies to every form using it.

7.11 Crumb -> H1 spacing: this spec uses 48 (TR-03, master article); the
shop pages currently use 32 on phones (catalog). The shell spec must set
one value for every shop page (shell-public P3 leaves 48 vs 32 open).

7.12 The stock gate on mount also runs on desktop (functional fix; the
baseline carts are clean, so no pixel diff).
