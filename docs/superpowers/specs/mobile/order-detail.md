# Phone spec - order details (/orders/[id]), cancel modal, return wizard

Area: order-detail. Author: spec agent, 2026-11-05. Status: draft for the
system spec (docs/superpowers/specs/2026-11-05-mobile-shop-cabinet-design.md).

Inputs merged: audit/mobile/order-detail/visual-report.md (OD-V-01..25),
audit/mobile/order-detail/functional-report.md (F01..F20), the shots under
audit/mobile/order-detail/shots/ (viewed: visual-48291037-390-01..03,
visual-48291063-390-01, visual-cancel-48291062-390-initial-01,
visual-cancel-48291062-320-initial, visual-wizard-48291056-390-initial-01,
visual-notfound-390-01), the source files cited below, audit/mobile/BRIEF.md,
audit/mobile/DECISIONS.md (D1..D13), audit/mobile/lang/figma-mobile-language.md
(TR-01..TR-32), audit/mobile/lang/code-mobile-recipes.md, and for the shared
detail blocks the returns lens audit/mobile/returns/visual-report.md section 3.
The shell specs (shell-public.md / shell-cabinet.md) did not exist when this
was written; every shell number below is quoted from D1 / D10 and marked
"shell" so the system spec can reconcile.

Rules used everywhere below:
- Phone = < 640 px = unprefixed classes (or `max-lg:`); desktop = `lg:`. Every
  phone class that changes a property the desktop relied on gets its `lg:`
  restore, so >= 640 stays byte-identical (D12, BRIEF "Breakpoint architecture").
- Phone-only duplicates (`lg:hidden`) next to desktop-only originals
  (`max-lg:hidden`) are allowed (the CheckoutItems.tsx table/cards pattern):
  a `display:none` child is not a flex item, so it adds no gap on desktop.
- Line-height on phones only from the mobile scale (D9). Tokens (`text-body-sm`,
  `text-title-lg`, `text-title-sm`) are used only on elements that never render
  on desktop (their desktop values differ: body-sm is 16/24, title-lg 24/28);
  on shared elements literals + `lg:` restores are used (recipes gotcha 1-3).
- No horizontal scrolling anywhere on the page or in its overlays (D11, TR-07).
- Figma has no phone frame for this page; every block names the mobile master
  pattern / TR rule / decision it is translated from.

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
| S1 | 2.1 back -> title 24 (O-1) | 48 (A-2) through CabinetPageHead (PhoneBackCrumb + `max-lg:mb-6`); edited |
| S2 | 2.1 title break `<br className="lg:hidden" />` | `<TitleLight line>` (A20); edited |
| S3 | 2.1 title -> badges 16 | 24 (CabinetPageHead keeps `gap-6`); edited |
| S4 | 2.1 / 2.6 head pb 24 + DetailsBody `pt-6` | Head pb 48 + DetailsBody `pt-0 lg:pt-4` (A-3); edited; the head heights in 2.1 grow by 24 + 24 |
| S5 | PHONE_STACK on head buttons | Redundant (the CabinetPageHead actions slot stacks 2+ actions, C-26); harmless |
| S6 | 2.2 total Stat 30/36 Bold | 22/28 SemiBold (A-10, D9, TR-27): `whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] lg:text-[24px] lg:tracking-[-0.48px]`; edited |
| S7 | 2.3 ItemsList rows | A8 ProductLine rows (read-only bottom: qty . unit price parts left, amount 22/28 right) |
| S8 | N7 KeyValueList | A15 (ui/KeyValueList.tsx) |
| S9 | N8 DocumentRow + OrderDocumentRow | A16 (platform/ui/DocumentRow.tsx, F2) + `OrderDocumentRow` exported by C-orders-list from DocumentsModal.tsx |
| S10 | N9 Sheet (fixed 66 bar, line-clamp-2, `starting:` motion) | A5: bar fixed 66 with ONE title line (critique round 1: `shortTitle` "Повернення" below 375), kept-mounted motion |
| S11 | N10 ChoiceRow `min-h-10 gap-10` | `min-h-10` and `gap-10` KEPT (critique round 1: A24 now uses this file's values + a 44 pseudo hit `after:-inset-y-0.5`; pitch 80 / 88 = Quizz Card 3111:14541) |
| S12 | N12 Toast z-70 + host in PlatformChrome | A23: host z-55 in app/layout.tsx, phone-only default |
| S13 | N13 usePhone, N14 useBackToClose | A3, A4 |
| S14 | N2 / N3 / N15 / N16 / N17 | Shell-cabinet (A20, 3.3) / A26 |
| S15 | N11 detailParts phone variants | Confirmed (A-11): used by BOTH detail pages; this cluster also builds ReturnDetailsView.tsx |
| S16 | Not found (OrderNotFound + segment not-found.tsx) | Confirmed (C-24) |
| S17 | O-7 / O-11 | O-11 Back: A4; others per the system open points |
| S18 | Build | C-order-detail (wave 4, after C-orders-list): detailParts, OrderDetailsView, ReturnDetailsView, CancelOrderModal, ReturnWizardModal, NEW ReturnWizardSheet.tsx, OrderNotFound.tsx, app/orders/[id]/not-found.tsx |
| S19 (critique round 1) | 2.1 attention caption through PaymentBadge `caption` (12/22, 26 tall) | `<PaymentCaptionLine tone="attention" className="lg:hidden">` (A28, 12/16 Medium #f26164) on its own line 8 under the badge row; the desktop PaymentBadge renders once, unchanged; head height + 24 (not + 26) when it shows; edited in place |
| S20 (critique round 1) | 2.9 cancel modal = Modal718 card with two SelectFields + the N6 menu workaround | A22 / T5h: `Modal718 phone="sheet"` on phones; bar "Скасувати замовлення" (`shortTitle` "Скасування"); body (24 under the bar): meta, badges, KeyValueList, request note, then RadioGroup "Оберіть причину" (CANCEL_REASONS, 4 rows) and for C2 48 / 1-px #d2d2d2 / 48 + RadioGroup "Бажане рішення" (CANCEL_SOLUTIONS, 2); footer = SHEET_FOOTER with "Повернутись" outlinedDark and accent "Скасувати замовлення" stacked 8 apart (A-6 exception); a premature submit focuses the first unanswered radiogroup. The desktop SelectFields stay (`max-lg:hidden`); N6 is not needed here; note added |
| S21 (critique round 1) | 2.10 wizard footer `pt-4 pb-[max(16px,...)]` | SHEET_FOOTER strings (`pt-[15px]` + 1-px line, `pb-[calc(16px+env(safe-area-inset-bottom))]`, static below 500 px of height); content unchanged (back text button left, primary right); edited in place |
| S22 (critique round 1) | 2.10 Back on steps 2 / 3 (N14 `onBack`), "router.replace when the entry is on top" | A4 contract: `rearm()` on entering step 2 / 3, Back -> `onStep`, "<- Назад" -> `unarm()`; success -> `release({ navigate: "/orders?tab=returns" })`; toast `keepOnNavigate`; `closeOnDesktop={false}` (the answers survive a 640 crossing, the entry is released); edited in place |
| S23 (critique round 1) | 2.9 submit toasts; focus to `main h1` | Toasts are queued until the sheet has closed (A23); focus to the h1 stays |
| S24 (critique round 1) | 2.2 TotalCard | Confirmed as the dark summary anatomy (C-40: #1d1d1f, A13 SUMMARY_LABEL over SUMMARY_AMOUNT) |
| S25 (critique round 1) | 2.3 items list, 2.5 documents | `ul role="list"` (3.1.6); DocumentRow names clamp at 3 lines (A16) |
| S26 (critique round 1) | Build | C-order-detail also owns src/app/orders/[id]/page.tsx (6.1) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Routes

| Route | Component | Notes |
|---|---|---|
| /orders/[id], id 48291037..48291064 | src/app/orders/[id]/page.tsx:24-28 -> platform/orders/OrderDetailsView.tsx:115 | 28 static ids (data.ts PLAN:320-349, number = 48291037 + 27 - i) |
| /orders/[id] unknown id (e.g. 99999999) | page.tsx:26 `notFound()` -> today Next's default English 404 (no not-found.tsx anywhere) | gets a route not-found (section 2.8) |

Layout wrapper src/app/orders/layout.tsx (`data-canvas="shop"`), shell =
PlatformChrome (root layout) for a signed-in partner, public chrome for
visitors / B2C.

### 1.2 Seeds

- b2b = audit/kit/seed-b2b.json (demo partner "Демо Партнер", owns the
  placeholder history; `isDemoAccount` gate OrderDetailsView.tsx:118).
- non-demo partner = seed b2b with accounts[0].id / sessionId "acc-fresh"
  (gets "Замовлення не знайдено").
- b2c = audit/mobile/kit/seed-b2c.json; none = visitor (both: SignInPrompt).
- Per-account store `binar.orders.v1:<id>` (cancellations, returns) is cleared
  by the kit (`clearStores` default true).

### 1.3 States reached by the audits (all must be specified and verified)

| # | Order | Status / payment | Head action (data.ts orderAction:143-161) | Extra |
|---|---|---|---|---|
| S1 | 48291064 | new / awaiting | cancel (1 select) | |
| S2 | 48291063 | shipped / awaiting | hint "Повернення буде доступне після отримання" | |
| S3 | 48291062 | blocked / partial + overdue remainder | cancel (2 selects) | attention caption "Залишок ... прострочено" |
| S4 | 48291061 | received / paid | hint "Повернення вже оформлено на всі товари" | all receipt docs ready |
| S5 | 48291060 | inProgress / overdue 3 days | cancel request (1 select) | attention caption "Прострочено на 3 дні" |
| S6 | 48291059 | inProgress / partial | cancel request (1 select) | |
| S7 | 48291058 | completed / paid late | hint (all returned) | attention caption "Оплачено із простроченням" |
| S8 | 48291057 | new / partial | cancel (2 selects) | |
| S9 | 48291056 | received / overdue | return wizard (3 lines) | |
| S10 | 48291055 | cancelled / awaiting | none | no "Термін оплати", no pay button |
| S11 | 48291052 | completed / paid | return wizard (3 lines) | |
| S12 | 48291050 | received / paid late | return wizard (4 lines) | |
| S13 | 48291047 | completed, window closed | "Звернутись до менеджера" (mailto) | |
| S14 | 48291037 | new / awaiting, 5 lines (the Figma master order) | cancel | longest page |
| S15 | any cancel id after submit | new/blocked -> "Скасовано"; inProgress -> request sent | | persists after reload, syncs across tabs |
| S16 | 48291056 after a wizard submit, history back | hint "Повернення вже оформлено на всі товари" | | |
| S17 | 99999999 (b2b) | unknown id | - | route not-found |
| S18 | 48291064, non-demo partner | foreign order | - | "Замовлення не знайдено" |
| S19 | 48291064, visitor / b2c | signed out of the cabinet | - | SignInPrompt "Деталі замовлення" |
| S20 | "Повторити замовлення" | any | opens the cart drawer | cart area |

Overlays: cancel modal x 4 variants (C1 new/blocked unpaid 1 select = 064;
C2 new/blocked partial 2 selects = 062 / 057; C3 inProgress unpaid request =
060; C4 inProgress partial request = 059) x (initial, empty-submit errors,
menu open, filled, after); return wizard on 056 / 052 / 050 (initial, every
step, errors per step, submit -> /orders?tab=returns); documents (preview,
single download, download all).

### 1.4 Not reachable (and why)

- Loading state: none exists (orders are static + localStorage, read
  synchronously after hydration); the pre-hydration gate paints nothing for a
  partner (works, keep).
- Empty items / empty documents: every order has >= 1 line and 3 documents
  (data.ts itemsFor / documentsFor); `anyReady` is always true (invoice and
  waybill are always ready) - the disabled "Завантажити усі документи" state is
  specified but cannot be seeded without editing data.ts.
- Wizard with 0 returnable lines: impossible (action becomes the hint).
- The real PDF preview (headless opens a new tab / downloads the placeholder).
- "Звернутись до менеджера" mailto target (not followed).
- Partial-quantity returns: no quantity control exists on any width (OD-V-21 /
  F11); the phone copy states that the whole remaining quantity is returned.
- iOS safe-area / dvh behaviour: Chromium emulation only; checked by computed
  styles, not by a device.
- Landscape phones (844 x 390) get the desktop canvas by architecture (BRIEF:
  no tablet layout); see O-7.

---------------------------------------------------------------------

## 2. Phone layout (390 primary, fluid 320..639)

### 2.0 Frame and shell (not owned here; quoted so the page composes)

- Header 66 sticky, logo + cart disc + burger, no company chip, no side strip
  (D1, TR-02, master bar 3082:3661). The 82-px strip and its 10-px labels
  disappear (fixes OD-V-25 / F17 part 2 in the shell).
- Content surface = CabinetPage slab #f5f5f5 (`bg-bg-cabinet`) with top
  corners r32 on phones (D1), white r32 cards on it without strokes (D1, D5).
- Gutters 24 (`px-6`): content 342 at 390, 272 at 320, 312 at 360, 382 at 430,
  552 at 600 (D10). Blocks 24 apart (D10 "cabinet blocks 24", filled cards
  24 apart lang section 5), last block -> legal bar 48 (D10).
- Footer = cabinet legal bar only, wrapping, px 24 py 24 (D1; fixes the 320
  copyright overflow F17 / OD-V-25 in the shell).

### 2.1 Page head (CabinetPageHead detail variant - shared, section 4 N2)

Source: TR-03 / TR-04 / TR-05, article crumb 3176:6558, hero 3082:3246 /
3082:3250, desktop master 5052:56816 (back -> title 24), D8, D9, D10.

Vertical map at 390, S1 (two actions), y in document px:

| Element | Geometry at 390 | Recipe | Source |
|---|---|---|---|
| slab top | y 66, r32 top corners | shell | D1 |
| head padding top | 48 | head section `pt-12 lg:py-8` (today `py-6 lg:py-8`) | D10 "head block pt 48" |
| back row | y 114..154, 168 x 40: 40 disc (1-px #1d1d1f ring, 21-px arrow) + 16 + "До замовлень" 16/22 SemiBold +0.16 #343435 | BackButton / BackCrumbBody unchanged (ui/Breadcrumb.tsx:19-30) | TR-05, 3176:6559; 40 disc accepted by D8 |
| back -> title | 48 (SYSTEM A-2) | CabinetPageHead phone back row (PhoneBackCrumb, `max-lg:mb-6`) | TR-03, article crumb 3176:6558 |
| title | y 178..250, 2 lines at EVERY phone width: "Замовлення" Bold / "№48291037" Light, 30/36 -0.6 | head H1 phone `text-[30px] leading-9 tracking-[-0.6px]` + existing lg classes (shared N2); the line break is area-owned: `Замовлення <TitleLight line>№{order.number}</TitleLight>` (SYSTEM A20) in OrderDetailsView.tsx:146-150 | D9 cabinet title H2 30/36, TR-03 Light+Bold mix, OD-V-14; the forced break removes the 1-vs-2-line flip at 430 |
| title -> badges | 24 (SYSTEM: CabinetPageHead keeps 24) | shared head `gap-6` | desktop 5192:79073 |
| badge row | y 266..304: OrderStatusBadge 38 + 8 + PaymentBadge 38 (wraps to 2 rows at 320 when the pair exceeds 272, e.g. "Заблоковано" + "Частково оплачено" 315) | existing `flex flex-wrap items-start gap-2` | TR-14 (desktop colours, wrap gap 8) |
| attention caption (phone only, S3/S5/S7 and every overdue / paid-late order) | (SYSTEM critique round 1) its own line 8 under the badge row, 16 tall: 16 attention glyph + 12/16 Medium #f26164 ("Прострочено на 3 дні", "Залишок 2 400,00 ₴ прострочено", "Оплачено із простроченням") | the PaymentBadge renders ONCE, unchanged; the caption is `<PaymentCaptionLine text={attention} tone="attention" className="lg:hidden" />` (A28, appended to `meta`, 8 under the badges) with `attention = paymentCaption(order)?.tone === "attention" ? text : undefined` (import paymentCaption from platform/dashboard/data.ts:129, read-only) | the orders list PaymentCell recipe (OrdersView.tsx:115-145); fixes F16 / OD-V-19 part 1 |
| status line (phone only) | 16 below the badge row, full width, 14/20 #777779, wraps: hint text (S2, S4, S7, S16) or, after a cancel request, "Запит на скасування надіслано, очікує підтвердження менеджера" | `<p className="mt-2 w-full text-[14px] leading-5 text-neutral-500 lg:hidden">` appended to `meta` (gap-2 + mt-2 = 16) | TR-03 subtitle (Body Small 14/20 #777779), OD-V-12 |
| badges -> actions | 32 | head section phone `gap-8 lg:gap-[26px]` (shared N2) | TR-03 / D10 "32 / actions" |
| actions, two | y 336..378 and 386..428: full-width 342 x 42 pills 8 apart, secondary outlinedDark first ("Скасувати замовлення" / "Оформити повернення" / "Звернутись до менеджера"), solid "Повторити замовлення" last | container (shared N2) `flex flex-col items-start gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4`; each of the two Buttons gets `className={PHONE_STACK}` with `PHONE_STACK = "max-lg:w-full max-lg:[&>span]:flex-1"` (landing menu CTA recipe Header.tsx:634 scoped to phones); size stays default (D8 makes it 42 / 16/22 Medium on phones) | TR-04, D8, menu button 3117:14325 |
| actions, one | hug Button/Small, left aligned ("Повторити замовлення" ~ 210 x 42) in S2, S4, S7, S10, S15-request, S16 | no PHONE_STACK class | TR-04 |
| head padding bottom | 48 (head `py-12`, SYSTEM A-3); DetailsBody `pt-0 lg:pt-4` | shared head / N11 | TR-03 "head -> first block 48" |

Head heights at 390: two actions 386 (48 + 40 + 24 + 72 + 16 + 38 + 32 + 92
+ 24), one action 336, + 26 when the attention caption shows, + 36 per status
line (16 + 20, 2 lines at 320 = 56). At 320 the title stays 2 lines (72), the
badge row may be 84 (38 + 8 + 38).

Desktop-only pieces kept as they are, hidden on phones:
- StatusAction hint `<p>` (OrderDetailsView.tsx:109) gets `max-lg:hidden`
  (moved to the status line on phones).
- The disabled "Запит на скасування надіслано" outlined Button
  (OrderDetailsView.tsx:85-87) gets `className="max-lg:hidden"` (gotcha 5:
  never `hidden lg:inline-flex`); phones show the status line instead
  (OD-V-12: a disabled pill reads as broken).
- `twoActions = action.kind === "return" || action.kind === "manager" ||
  (action.kind === "cancel" && !pending)`; `pending = useCancelRequest(id)`
  called at the top of OrderDetailsView (before the early returns, hooks rule).

### 2.2 Summary + total = the first block on phones

Source: TR-27 (footer contact row on light 3111:14916), TR-20 / TeamCta
"24+" 3117:12894 / Cases stat 3094:5169 (dark tile with stat), D5 (r32),
D9 (stats 30/36 Bold, labels 14/20 Medium), OD-V-06/07/08/13/24, F13/F14.

Order on phones: head -> summary + total -> items -> delivery -> documents
(DetailsBody right column `max-lg:order-first`, shared N11). Desktop order
(left column | right column) unchanged.

One card = the right column of DetailsBody (`flex w-full shrink-0 flex-col
overflow-clip rounded-[32px] lg:w-[494px] lg:rounded-3xl max-lg:order-first`,
today `rounded-3xl`): white summary part on top, dark total part at the bottom.

White part (SummaryCard, shared N11):
- `flex flex-col gap-6 bg-white p-6 lg:gap-8 lg:p-8` (today `gap-8 p-6 lg:p-8`).
- Title "Підсумок замовлення" = CARD_TITLE phone Title Large 22/28 SemiBold
  -0.44: `text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900
  lg:font-bold` (desktop keeps Bold 22/28; OD-V-23).
- 24 -> KeyValueList (shared N7, `lg:hidden`) with the phone rows, while the
  desktop groups (SummaryRow badges / number / info glyphs / 0.5-px hairline)
  get `max-lg:hidden`. Phone rows, in this order:
  1. "Дата замовлення" - formatDate(order.date)
  2. "Створив замовлення" - order.createdBy
  3. "Контрагент" - order.counterparty (wraps fully, no clip, no tooltip)
  4. "Тип оплати" - order.paymentType
  5. "Термін оплати" - "до " + formatDate(order.paymentDue), omitted when
     cancelled (same rule as OrderDetailsView.tsx:214)
  Dropped on phones (shown in the head 300 px above): "Статус замовлення",
  "Номер замовлення", "Статус оплати" (OD-V-24; also removes the decorative
  18-px info glyphs F13).
- Row anatomy (TR-27): label 14/20 Medium #777779, 8, value 16/24 Regular
  #1d1d1f (not underlined, not ExtraBold: they are not links - F13), rows py 16
  between 1-px #d2d2d2 lines, first row pt 0, last row pb 0. A row never
  changes layout with its data (OD-V-06). Row = 52 tall (76 with a 2-line
  value); 5 rows = 52 x 5 + 4 x 33 = 392 at 390.

Dark part (TotalCard, shared N11), TR-20 dark tile:
- `flex flex-col gap-6 bg-[#1d1d1f] p-6 lg:gap-8 lg:p-8`.
- Value row phone stacked: `flex flex-col items-start gap-2 text-white
  lg:flex-row lg:items-center lg:justify-between lg:gap-4` (today `flex
  items-center justify-between gap-4 max-sm:flex-wrap`).
- Label "Сума замовлення": `whitespace-nowrap text-[14px] font-medium leading-5
  text-neutral-400 lg:text-[20px] lg:font-normal lg:leading-7 lg:text-white`
  (14/20 Medium #8e8e8f = footer label on dark, TR-20).
- Value "11 896,00 ₴" (SYSTEM A-10: 22/28 SemiBold like every total):
  `whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px]
  lg:text-[24px] lg:tracking-[-0.48px]` (stacked under the label; fixes the wrap-or-not reflow
  OD-V-13: 9 of 14 orders wrapped at 390).
- 24 -> "До оплати" accent Button `fullWidth` 294 x 42 (D8), only while unpaid
  and not cancelled (OrderDetailsView.tsx:134, 226-229 unchanged); opens the
  invoice in a new tab.
- Heights at 390: 112 without the button, 178 with it.

Summary card height at 390: white ~ 24 + 28 + 24 + 392 + 24 = 492 (+24 per
2-line value), dark 112 / 178.

No sticky pay bar (TR-18 is only for a primary action that would be
off-screen; the page's primary actions are the head actions; the pay button
sits ~1 100 px down on S14) - see O-6.

### 2.3 Items ("Товари") - list panel instead of the 720-px table

Source: TR-07 (list panel, rows px 24 py 24 between 1-px #d2d2d2 lines), TR-08
(64 photo r16 + 16 + name 16/22 Bold 2 lines + meta 14/20 #777779, then the
price / qty line), checkout/CheckoutItems.tsx:156-186 phone cards (same
family), D5, D11. Fixes OD-V-03 / F04 (only "Товар" visible, names cut to
190 px, qty / price / sum hidden).

- ItemsTable (shared N11) gains an optional `phone` prop; when given, the
  table wrapper (detailParts.tsx:91) gets `max-lg:hidden` and an ItemsList
  renders with `lg:hidden`. OrderDetailsView passes:
  `phone={{ title: "Товари", line: (it) => ({ meta: [formatQty(it.qty, it.unit), formatMoney(it.price) + " за од."], amount: formatMoney(lineSum(it)) }) }}`
  ("за од." = existing checkout copy CheckoutItems.tsx:166).
- Panel `rounded-[32px] bg-white` (D5 r32), 342 wide.
- Head row `flex items-baseline justify-between gap-4 px-6 pt-6`: "Товари"
  22/28 SemiBold -0.44 (CARD_TITLE phone) + count "5 позицій" 14/20 #777779
  `whitespace-nowrap` (plural: 1 позиція, 2-4 позиції, 5-20 позицій, by the
  usual uk rule incl. 11-14; helper `positionsLabel(n)` in detailParts).
- List `<ul>`; row `<li className="mx-6 flex flex-col gap-3 py-6 [&+&]:border-t
  [&+&]:border-stroke-subtle">` (1-px #d2d2d2 inset 24 = Block 3085:3975 inner
  width, title -> first row = the first row's pt 24 = TR-06 in-card 24).
  - Top `flex items-start gap-4`: photo `relative size-16 shrink-0 overflow-clip
    rounded-2xl bg-bg-product` + `<img className="absolute inset-0 size-full
    object-cover" loading="lazy" decoding="async" alt="">`; text `flex min-w-0
    flex-1 flex-col gap-1`: name `line-clamp-2 text-title-sm text-neutral-900`
    (16/22 Bold +0.16), article `text-body-sm text-neutral-500` "Артикул:
    BT-SH-040" (14/20).
  - Bottom `flex flex-wrap items-baseline gap-x-4 gap-y-1`: meta `flex
    flex-wrap items-center gap-x-1 text-body-sm text-neutral-500` = parts with
    the 14-px DotIcon between them, each part `whitespace-nowrap` ("80 шт" .
    "31,65 ₴ за од."); amount `ml-auto whitespace-nowrap text-[16px]
    font-semibold leading-6 text-neutral-900` ("2 532,00 ₴"; `ml-auto` keeps it
    right-aligned when it wraps under the meta at 320).
- Row height ~ 24 + 68 + 12 + 24 + 24 = 152 (name 2 lines) / 128 (1 line).
- 320: inner 272 - 48 = 224; "200 шт . 31,65 ₴ за од." + "6 330,00 ₴" do not
  fit one line -> the amount wraps to its own line, right-aligned. No clipping.
- The panel lists ALL lines (max 5 in the data); no load-more (D4 applies to
  page lists, not to an order's lines).

### 2.4 Delivery ("Інформація про доставку")

Source: TR-27, OD-V-15 (read-only "fields" that look like disabled inputs,
value truncated at 320).

- InfoCard (shared N11): CARD phone `flex flex-col gap-6 overflow-clip
  rounded-[32px] bg-white p-6 lg:gap-8 lg:rounded-3xl lg:p-8` (today `gap-8
  rounded-3xl p-6 lg:p-8`).
- Title CARD_TITLE phone (22/28 SemiBold).
- Fields row (ReadField x 2, detailParts.tsx:179) gets `max-lg:hidden`;
  phone = KeyValueList `lg:hidden` with rows "Місто" / "Варіант доставки"
  (values wrap: "Нова Пошта (Адресна доставка)" no longer truncates at 320).
- Note row (pickup address etc.): keep the element; phone type 14/20:
  `min-w-0 flex-1 text-[14px] leading-5 text-neutral-800 lg:leading-6`
  (Body Small; desktop 14/24 unchanged), 24-px info glyph #a5a5a5 + 8 gap
  (existing), 24 below the KV list (card gap).
- Height at 390 ~ 24 + 28 + 24 + 52 + 33 + 52 + 24 + 80 + 24 = 341.

### 2.5 Documents ("Документи замовлення")

Source: TR-25 (file rows: 48 dark tile r12 + 16 + name 16/22 Bold + meta 14/20
#777779, trailing 24 action glyph in a 44 hit box, rows py 16 between 1-px
#d2d2d2 lines; hero trust row 3085:3718), TR-06 (head-row links move under
the list), D5 (document tiles r12 at 48), D8. Fixes OD-V-09 / F05 (nested grey
tiles, names cut to 178 / 108 px, 164-px tiles, orphan "PDF") and the tap
targets of OD-V-16 / F12 (24-px glyphs 12 apart, 231 x 22 text button).

- DocumentsCard (shared N11): CARD phone classes as 2.4; title row: the
  "Завантажити усі документи" text button (detailParts.tsx:221-229) gets
  `max-lg:hidden`; the tile grid (detailParts.tsx:231) gets `max-lg:hidden`.
- Phone list `lg:hidden`: one OrderDocumentRow (shared N8) per document, then
  24 -> `<Button variant="outlinedDark" fullWidth disabled={!anyReady}
  onClick={() => downloadAll(documents)} className="lg:hidden">Завантажити усі
  документи</Button>` (294 x 42, 16/22 Medium; label 215 px fits 272 at 320).
- DocumentRow anatomy (ready):
  - row `flex items-center gap-2 py-4 first:pt-0 last:pb-0 [&+&]:border-t
    [&+&]:border-stroke-subtle`;
  - preview target = `<button type="button" onClick={onPreview}
    aria-label={"Переглянути: " + name} className="flex min-h-12 min-w-0 flex-1
    cursor-pointer items-center gap-4 rounded-2xl text-left outline-none
    focus-visible:ring-2 focus-visible:ring-brand">` holding the tile `relative
    size-12 shrink-0 overflow-clip rounded-xl bg-neutral-800 text-white` (48,
    r12; DocumentGlyph `absolute left-3 top-3 size-6`) + text `flex min-w-0
    flex-col gap-1`: name `text-title-sm text-neutral-900` (16/22 Bold, wraps,
    NO clamp: "Видаткова накладна №5848" needs 3 lines at 320 and the number
    must stay visible - F05), meta `flex flex-wrap items-center gap-x-1
    text-body-sm text-neutral-500` with DotIcon parts ("27.04.2026" . "0.9 МБ"
    . "PDF", each part whitespace-nowrap);
  - trailing download `<a href download={downloadName} aria-label={"Завантажити:
    " + name} className="-mr-2.5 flex size-11 shrink-0 items-center
    justify-center rounded-full text-neutral-900 outline-none active:text-brand
    focus-visible:ring-2 focus-visible:ring-brand">` + DownloadIcon `size-6`
    (44 hit, glyph right edge on the content edge).
- Pending row ("Надходження на рахунок"): a `<div>` (not a button), tile
  `bg-button-disabled text-[#bbbbbc]`, name `text-neutral-300`, note
  "З'явиться після оплати" 14/20 #777779, no trailing action.
- Row heights at 390: 52 (1-line name + 1-line meta = 22 + 4 + 20 + 16 pad)
  .. 98 at 320 (3-line name + 2-line meta).

### 2.6 Body container and rhythm

- DetailsBody (shared N11): `flex flex-col gap-6 px-6 pt-0 lg:flex-row
  lg:items-start lg:gap-[26px] lg:pl-10 lg:pr-8 lg:pt-4` (today `gap-[26px]
  px-6 pt-4`): blocks 24 apart (D10, OD-V-22), head -> first block 48 from the
  head's pb 48 (SYSTEM A-3).
- Left column `flex min-w-0 flex-1 flex-col gap-6 lg:gap-[26px]`.
- CabinetPage bottom: last block -> legal bar 48 (shell `pb-12 lg:pb-8`, D10).
- No 0.5-px line anywhere on the phone page (D10, OD-V-22): the phone pieces
  use 1-px #d2d2d2; the desktop 0.5-px hairlines live only in the
  `max-lg:hidden` desktop parts.

Page height estimate at 390, S14 (5 lines): head 386 + 24 + summary 670 + 24
+ items ~ 52 + 5 x 152 + 24 = 836 + 24 + delivery 341 + 24 + documents ~ 330
+ 48 = ~2 690 (today 3 082); the sum and the pay button move from y 2 249 /
2 885 to ~ 476 / ~ 1 100.

### 2.7 Per-status phone head summary

| State | Badges | Phone status line | Phone actions |
|---|---|---|---|
| S1, S8, S14 (new) / S3 (blocked) | status + payment (+ attention caption S3) | - | [Скасувати замовлення outlinedDark, full] / [Повторити замовлення solid, full] |
| S5, S6 (in progress) before request | status + payment (+ caption S5) | - | [Скасувати замовлення, full] / [Повторити, full] |
| S5, S6 after request | same | "Запит на скасування надіслано, очікує підтвердження менеджера" | [Повторити, hug] |
| S2 (shipped) | status + payment | "Повернення буде доступне після отримання" | [Повторити, hug] |
| S4, S7, S16 (all returned) | status + payment (+ caption S7) | "Повернення вже оформлено на всі товари" | [Повторити, hug] |
| S9, S11, S12 (return) | status + payment (+ caption S9) | - | [Оформити повернення, full] / [Повторити, full] |
| S13 (manager) | status + payment | - | [Звернутись до менеджера, full] / [Повторити, full] |
| S10 / S15 cancelled | status + payment | - | [Повторити, hug]; summary has no "Термін оплати"; no "До оплати" |

### 2.8 Not found, foreign order, signed out

Source: TR-24 (empty state: centred, py 48 px 24, Body Small, 32, hug
Button/Small), TR-03. Fixes F07 / OD-V-18.

- New area component `OrderNotFound` (client): if the user is not a partner
  -> `<SignInPrompt title="Деталі замовлення" text={DETAILS_PROMPT_TEXT} />`
  (same as OrderDetailsView.tsx:123); else
  `<CabinetPage><CabinetPageHead back={{ label: "До замовлень", href: "/orders"
  }} title="Замовлення не знайдено" />` + phone-only panel.
- Phone panel: `<div className="px-6 pt-6 lg:hidden"><div className="flex
  flex-col items-center rounded-[32px] bg-white px-6 py-12 text-center">`:
  `<p className="max-w-[294px] text-[14px] leading-5 text-neutral-500">Перевірте
  номер у посиланні або знайдіть замовлення в списку.</p>` + 32 + `<Button
  size="small" href="/orders" className="mt-8">Усі замовлення</Button>`.
- Title "Замовлення не знайдено" 30/36 (2 lines at 320-430).
- Used by: OrderDetailsView `!order` branch (OrderDetailsView.tsx:124-130 ->
  `return <OrderNotFound />`, S18) and the new src/app/orders/[id]/not-found.tsx
  (S17; `notFound()` in page.tsx:26 stays, so unknown ids keep the 404 status).
  Desktop of S18 is unchanged (the panel is lg:hidden); desktop of S17 changes
  from the English Next 404 to the S18 desktop head (O-3).
- Signed out (S19): SignInPrompt is shared (shell): phone title H2 30/36
  (D9) and no blank pre-hydration jump (F18) belong to the shell spec.

### 2.9 Cancel modal (TR-17 short modal, D7)

(SYSTEM critique round 1, S20 / T5h: on phones this modal is `Modal718
phone="sheet"` with RadioGroups instead of the two SelectFields; the card
shell, the selects and the N6 menu workaround below are superseded for
phones. Content order, copy, validation and the submit flow stay.)

Source: TR-17 (342 card, 24 margins, r32, 1-px #8e8e8f ring, p 24, title 24/28
Bold, cross 24 in a 44 hit box, description 16/24 #343435, actions full-width
294 pills 8 apart), D7 ("ConfirmModal ... short Modal718s = centred card"; the
cancel modal has at most 2 fields), D8, TR-21, TR-14, TR-27.

Shell (Modal718 phone card, shared N4): overlay `p-6`, card width 342 at 390 /
272 at 320 / 552 at 600, `max-h` = 100dvh - 48 with inner scroll, actions
pinned at the card bottom when the body overflows (fixes OD-V-10 / OD-V-11 /
F08); close 44 hit box; description 16/24 #343435.

Content (CancelOrderModal.tsx, area-owned), top to bottom at 390:
| Piece | Geometry | Recipe | Source |
|---|---|---|---|
| title | "Скасувати замовлення", 24/28 Bold -0.48, 2 lines in the 246-px title column at 320-430 | unchanged (Figma title kept; see O-4) | TR-17 |
| meta | 16 below: "№48291064" DotIcon "24.05.2026", 16/24 #343435 | ModalMeta unchanged, type from N4 | TR-17 description |
| badges (phone) | 24 below: OrderStatusBadge + PaymentBadge, gap 8, wrap | `<div className="flex flex-wrap gap-2 lg:hidden">` | TR-14; replaces the two badge label rows (OD-V-24) |
| key / values (phone) | 24 below: "Створив замовлення" / "Контрагент" (wraps) | `<KeyValueList className="lg:hidden" rows=[...] />` | TR-27; fixes OD-V-06 / OD-V-07 / F14 in the modal |
| request note (phone, C3/C4 only) | 24 below: "Замовлення вже в роботі: скасування підтвердить менеджер." 14/20 #343435 | `<p className="text-[14px] leading-5 text-neutral-800 lg:hidden">` | OD-V-20 (nothing said it is a request) |
| selects | 24 below: "Оберіть причину" (+ 24 + "Бажане рішення" for C2), 294 x 46, r24, 16-px text, errors 12/16 #d92d20 8 below | unchanged SelectField + `[--field-surface:#fff]` | TR-21 / D6 |
| actions | 24 below: "Повернутись" outlinedDark 294 x 42, 8, "Скасувати замовлення" accent 294 x 42 (aria-disabled until valid, press flags + focuses the first empty select - keep) | unchanged ModalActions children; gap 8 from N4 | TR-17, TR-04, D8 |

Desktop rows kept: the existing `<div className="flex flex-col gap-2">` with
the four SummaryRows (CancelOrderModal.tsx:84-97) gets `max-lg:hidden`.

Card heights at 390: C1 ~ 577, C2 ~ 647, C3/C4 ~ 621 (fits 796); at 320 x 568
the card is 520 tall, the body scrolls, the two actions stay visible at the
bottom (pinned).

Interactions:
- Opening a select inside the card: the menu is fully visible (N6: scroll
  the card so the menu is in view, or flip it up) - fixes OD-V-04 / F09 (059
  "Інше" and 062 "Бажане рішення" at 320 x 568 were below the card edge).
- Escape with a menu open closes only the menu (keep); scrim / cross /
  Escape / "Повернутись" close and reset (keep); html overflow lock + restore
  (keep); Android / browser Back closes the modal (N14, fixes F15).
- Submit (valid): `cancelOrder(...)` (unchanged), close, then the new
  `onDone(request)` callback: OrderDetailsView (a) on phones shows the toast
  (N12) "Замовлення скасовано" (C1/C2) or "Запит на скасування надіслано"
  (C3/C4), (b) on every width moves focus to the page H1 in a
  `requestAnimationFrame` after the modal cleanup (`h1.tabIndex = -1;
  h1.focus()`; selector `main h1`) - fixes F10 (focus fell to `<body>`
  because the opener was unmounted / disabled). Focus is invisible on desktop
  (no ring for programmatic focus after a pointer press), so the desktop stays
  pixel-identical.
- After submit the page re-renders per 2.7 (S15).

### 2.10 Return wizard = full-screen sheet with Quizz Card steps (D7, TR-09, TR-15, TR-22)

Source: menu master 3117:13578 (66 bar + "clear" cross at x 342 / y 21,
covers the viewport, motion opacity + translateY(-12) 400 ms), Quizz Card
3111:14541 (#2d2d2f band 76: counter 16/24 white + 32 + title 24/28 SemiBold
white; white content panel r32 with 1-px #1d1d1f ring, pt 32 px 24 pb 48;
options 40 apart: label 16/24 Bold #000 + hint 14/20 #777779, 40 radio
right), TR-18 sticky bar, TR-31 toast, D7, D8. Fixes OD-V-01 / F01 (960-px
table, reason column off-screen), OD-V-02 / F02 (clipped last-row menu),
OD-V-17 (truncated selects), OD-V-21 / F11 (quantity copy), F12 (24-px
checkboxes), F15 (Back), F06 is out of scope (O-7).

Switch: ReturnWizardModal (area) keeps the desktop Modal718 JSX byte-identical;
its state moves into a local `useReturnWizardState(items)` hook (selected,
reasons, solution, delivery, attempted, toggle, setReason, valid, reset,
buildLines) and the component returns `<ReturnWizardSheet ... />` when
`usePhone()` (N13) is true. State lives in ReturnWizardModal, so rotating /
resizing across 640 while open swaps the shell and keeps the answers.

Sheet (shared atom N9) at 390:
| Piece | Geometry | Recipe |
|---|---|---|
| layer | fixed, covers 390 x 844 (`h-dvh`), white, z-[60] (above the z-50 header) | N9 |
| bar | 66 tall, px 24: title "Оформити повернення" Title Large 22/28 SemiBold -0.44, ONE line (SYSTEM critique round 1: `shortTitle` "Повернення" below 375) + cross 24 glyph in a 48 hit box, glyph at x 342 (`-mr-3`) | N9, master 3117:13578 / TR-09 |
| body | `overflow-y-auto overscroll-contain px-6 pt-6 pb-12`, scroll lock on html | N9 |
| meta line | "№48291056" DotIcon "16.05.2026", 14/20 #777779 | ModalMeta parts, Body Small (D9 meta) |
| 24 | | |
| Quizz Card | 342 wide (272 at 320): outer `overflow-hidden rounded-[32px] bg-[#2d2d2f]`; band `flex items-center gap-8 px-6 py-6`: counter `shrink-0 text-[16px] leading-6 tabular-nums text-white` "1/3", title `<h3 ref tabIndex={-1} className="min-w-0 flex-1 text-[24px] font-semibold leading-7 tracking-[-0.48px] text-white outline-none">` (band 76 for 1 line, 104 for 2); panel `rounded-[32px] border border-neutral-900 bg-white px-6 pb-[47px] pt-[31px]` (QuizForm.tsx:536-579 + globals.css:978-990 recipe; strokes inside) | TR-15 |
| footer | SHEET_FOOTER (SYSTEM critique round 1): `sticky bottom-0 z-[1] mt-auto border-t border-stroke-subtle bg-white px-6 pt-[15px] pb-[calc(16px+env(safe-area-inset-bottom))] [@media(max-height:499px)]:static` as the scroller's last child, content `flex items-center justify-between gap-4`, 74 tall | N9 footer slot |

Three steps (the band title is short so it stays <= 2 lines at 320):

Step 1/3 "Оберіть товари"
- Panel: hint `text-body-sm text-neutral-500` "Повертається вся доступна
  кількість товару." (honest replacement for the desktop "Вкажіть кількість";
  OD-V-21 / F11), 24 ->
- select-all row, only when items.length > 1: ChoiceRow (N10)
  `type="checkbox"` label "Обрати всі товари" in the label style 16/22 Medium
  #343435 (`text-button-md text-neutral-800`, checkout checkbox recipe
  fields.tsx:557-572), checkbox 24 icon in a 40 box at the right edge, row
  min-h 44; then 24 / 1-px #d2d2d2 line / 24 ->
- one ChoiceRow `type="checkbox"` per returnable line, 40 apart (`flex
  flex-col gap-10`): label = line name 16/24 Bold #000 (`line-clamp-2`; brand
  when checked, quiz option rule), hint = DotIcon-separated parts "Артикул:
  BT-SP-040" . "80 шт" . "2 532,00 ₴" (14/20 #777779, parts nowrap, wrap by
  part), checkbox right (CheckboxOnIcon brand / CheckboxOffIcon #1d1d1f, 24 in
  a 40 box), the whole row is the label (tap target = row, >= 44 tall with
  the hint). No photos (quiz option anatomy; at 320 the text column is 222 -
  16 - 40 = 166 px, a 64 photo would leave 86).
- Footer: left caption `<p aria-live="polite" className="text-[14px]
  font-medium leading-5 text-neutral-500">Обрано: 2 з 3</p>`, right `<Button
  size="small" aria-disabled={selected.size === 0} onClick={next}>Далі</Button>`.
- Premature "Далі": error `<p role="alert" className="text-[12px] leading-4
  text-negative">Оберіть хоча б один товар</p>` 8 below the hint, focus the
  first checkbox.

Step 2/3 "Причина повернення"
- Panel: for every ticked line (items order), a radiogroup (`<div
  role="radiogroup" aria-labelledby={headId}>`): head = name `text-title-sm
  text-neutral-900` (16/22 Bold, line-clamp-2) + 4 + hint 14/20 #777779
  ("80 шт" . "2 532,00 ₴"), 24 -> four ChoiceRows `type="radio"`
  name=`return-reason-${item.id}` ("Брак", "Пошкоджено при доставці", "Не той
  товар", "Інше" = RETURN_REASONS), 40 apart, 40 radio right (1.5-px brand ring
  / brand fill + white check). Groups separated by 48 / 1-px #d2d2d2 / 48
  (TR-09 groups).
- Error (premature "Далі"): under the group head, 8 below, `text-[12px]
  leading-4 text-negative` "Оберіть причину повернення" (desktop copy,
  ReturnWizardModal.tsx:265); scroll the first missing group into view inside
  the sheet body (`scroll-mt-6`), focus its first radio.
- Footer: back text button `<button className="-ml-2 flex min-h-11 items-center
  gap-1 px-2 text-button-md text-neutral-500"><span aria-hidden>&larr;</span>
  Назад</button>` (quiz footer QuizForm.tsx:613-622, label shown on phones
  here) + `<Button size="small" aria-disabled={!reasonsValid}>Далі</Button>`.

Step 3/3 "Рішення та доставка"
- Panel: radiogroup "Бажане рішення" (head 16/22 Bold), 24 -> 3 ChoiceRows
  (RETURN_SOLUTIONS: "Кредит-нота на баланс", "Повернення коштів", "Заміна
  товару") 40 apart; 48 / 1-px #d2d2d2 / 48; radiogroup "Варіанти зворотньої
  доставки" (desktop label verbatim) -> 3 ChoiceRows (RETURN_DELIVERY:
  "Відправити поштою (Нова Пошта)", "Привезти на склад самостійно", "Забере
  кур'єр").
- Errors: "Оберіть бажане рішення" / "Оберіть спосіб повернення" (desktop
  copies, ReturnWizardModal.tsx:286, 294) under the group heads, focus first
  missing radio.
- Footer: back text button + `<Button size="small" variant="accent"
  aria-disabled={!valid} onClick={submit}>Надіслати запит</Button>` (fits 272
  at 320: ~75 + 16 + 173).

Step mechanics:
- Step change: body `scrollTop = 0` (instant), focus the band h3 (tabIndex
  -1, no ring) so screen readers hear the new step; counter "N/3".
- Unticking a line in step 1 keeps its reason in state but it is ignored (same
  as desktop: submit only uses selected lines).
- Submit: `createReturn({ orderId, lines: selected lines with qty = returnable
  qty and reasons, solution, delivery })` (unchanged payload), reset, close;
  navigate (SYSTEM critique round 1) with A4 `release({ navigate:
  "/orders?tab=returns" })` on phones (history [order, returns], one
  Back), `router.push` on desktop; phones show the toast "Запит на
  повернення створено" with `keepOnNavigate: true` (A23).
- Close: cross, Escape, Back on step 1 -> close and reset (desktop reset rule
  ReturnWizardModal.tsx:138-149). Back on steps 2 / 3 -> previous step
  (SYSTEM critique round 1, A4: entering step 2 / 3 calls `rearm()`, Back
  pops it via `onStep`; the "<- Назад" button calls `unarm()` and sets the
  step). No scrim (full-screen).
- Focus on open: the step-1 band title; Tab trapped in the sheet; focus
  returns to "Оформити повернення" on close (useModalBehavior).
- Motion: enter = opacity 0 -> 1 + translate-y -12 -> 0, 400 ms
  cubic-bezier(0.22,1,0.36,1), `motion-reduce:transition-none`; exit = unmount
  (no exit animation needed).

Heights at 390, 056 (3 lines): step 1 ~ 66 + 24 + 20 + 24 + 575 + 48 + 74 =
831 (fits 844 without scrolling); step 2 with 3 ticked lines ~ 1 300 (scrolls,
footer stays); step 3 ~ 66 + 68 + 104 + 31 + 2 x (22 + 24 + 3 x 48 + 2 x 40)
+ 97 + 47 + 48 + 74 ~ 1 100 (scrolls).

### 2.11 Interactions summary

| Trigger | Opens | Kind | Scroll lock | Focus in / out |
|---|---|---|---|---|
| "Скасувати замовлення" | CancelOrderModal | TR-17 centred card (Modal718 phone) | html overflow | cross -> opener, or H1 after submit |
| "Оформити повернення" | ReturnWizardSheet | TR-09 full-screen sheet | html overflow | step title -> opener |
| "Звернутись до менеджера" | mailto (unchanged) | - | - | - |
| "Повторити замовлення" | cart drawer (cart area) | - | - | - |
| "До оплати" | invoice PDF in a new tab (unchanged) | - | - | - |
| document row tap | that PDF in a new tab (`openDocument`) | - | - | - |
| download glyph / "Завантажити усі документи" | file download(s) (unchanged) | - | - | - |
| back crumb | /orders | link | - | - |

No hover-only affordance remains on phones: the `title` tooltips are no
longer needed (names wrap), non-links lose their link styling (F13).

### 2.12 Width behaviour 320..639

| Width | Content | Notes |
|---|---|---|
| 320 x 568 | 272 | title 2 lines; badges may wrap; buttons 272; item amount wraps under the meta; doc names up to 3 lines; cancel card 272 x 520 with pinned actions; sheet bar title may take 2 lines; wizard text column 166 |
| 360 x 780 | 312 | as 390 |
| 390 x 844 | 342 | reference numbers above |
| 430 x 932 | 382 | title still 2 lines (forced break) |
| 600 x 960 | 552 | everything stretches; buttons 552 full width; card paddings fixed |

### 2.13 Desktop invariants (>= 640, must stay byte-identical)

Every change above is one of: (a) an unprefixed class with its `lg:` restore,
(b) a `max-lg:hidden` on an existing desktop node, (c) a new `lg:hidden` node,
(d) `<br className="lg:hidden" />` in the H1, (e) the phone-only branch of the
wizard (`usePhone()`), (f) invisible focus management. The only intended
desktop change is the unknown-id page (O-3).

---------------------------------------------------------------------

## 3. Bugs to fix (merged, deduplicated)

Severity from the higher of the two lenses. "Owner" = area (files of
section 5) or shared (section 4 id).

| Id | Sev | Where | What | Fix | File:line | Owner | From |
|---|---|---|---|---|---|---|---|
| OD-01 | blocker | wizard, 320-600 | step-1 table 960 in a 240..520 box: the required reason select is off-screen (x 717), checkbox and name scroll away after picking, no hint | phone sheet with 3 Quizz Card steps, line rows + radio reasons (2.10) | ReturnWizardModal.tsx:174-273, 194-195, 255 | area + N9/N10/N13 | OD-V-01, F01 |
| OD-02 | blocker | wizard, last rows | overflow-x:auto forces overflow-y:auto, the last row's reason menu is clipped (1 of 4 options visible) | no scroller and no select menus in the phone wizard (radio rows) | ReturnWizardModal.tsx:194; fields.tsx:265 | area | OD-V-02, F02 |
| OD-03 | major | items, every order | 720-px table: only "Товар" visible, names cut to 190 px (title tooltip only), qty / price / sum hidden | ItemsList phone panel (2.3) | detailParts.tsx:46-60, 89-136 | N11 | OD-V-03, F04 |
| OD-04 | major | wizard step 2 at 390, cancel at 320 x 568 | a select menu opens below the visible card edge, the card does not scroll | SelectField brings the open menu into view inside its scroll container (or flips up); wizard uses radios on phones | fields.tsx:251-270, 327-330; Modal718.tsx:98 | N6 | OD-V-04, F09 |
| OD-05 | major | every SelectField site-wide (here: cancel selects; wizard desktop selects) | resting label `absolute whitespace-nowrap` runs over the chevron and out of the ring (-20 px at 320) | cap the resting label `max-w-[calc(100%-72px)] truncate` (AuthDrawer.tsx:173-174 recipe) | fields.tsx:49-51, 398-413 | N6 | F03 |
| OD-06 | major | head, total, modals | every button is the 48.5 / 15 px / 400 phone "large" | D8 global Button fix | Button.tsx:80-81; call sites OrderDetailsView.tsx:85,89,95,101,165, detailParts.tsx:317, CancelOrderModal.tsx:75,78, ReturnWizardModal.tsx:182,185 | N1 | OD-V-05 |
| OD-07 | major | summary + cancel modal rows | SummaryRow wraps per data (1-4 of 8 rows at 390, all at 320): ragged value column | KeyValueList rows that never depend on data (2.2, 2.9) | detailParts.tsx:244-263; CancelOrderModal.tsx:84-97 | N7/N11 + area | OD-V-06 |
| OD-08 | major | summary + cancel modal | counterparty clipped to 140 px with free space, tooltip-only; when wrapped it floats 4..55 px right of the label column | value wraps fully in a KV row | detailParts.tsx:267-278; OrderDetailsView.tsx:204; CancelOrderModal.tsx:92 | N7/N11 + area | OD-V-07, F14 |
| OD-09 | major | page order | sum and pay action at 73 % of the page (y 2 249 / 2 885 of 3 082) | right column `max-lg:order-first` (2.2) | detailParts.tsx:16-23 | N11 | OD-V-08 |
| OD-10 | major | documents card | grey p24 tiles inside a p24 card: names cut to 178 / 108 px (number lost), 164-px tiles, orphan "PDF", pending note cut | DocumentRow list + full-width download-all button (2.5) | DocumentTile.tsx:50-104; detailParts.tsx:215-238 | N8/N11 | OD-V-09, F05 |
| OD-11 | major | landscape 844 x 390 | desktop canvas zoom 0.586 x Modal718 fit 0.908 / 0.627 -> 8.5 / 5.9-px text | NOT fixed here (architecture); proposal O-7 | Modal718.tsx:192; useFitZoom.ts:5 | orchestrator | F06 |
| OD-12 | major | /orders/99999999 | English Next 404 inside the cabinet shell | route not-found.tsx rendering OrderNotFound (2.8) | src/app/orders/[id]/page.tsx:26 | area | F07, OD-V-18 |
| OD-13 | minor | all modals | Modal718 phone: 16-px gutters (358 card), 32 cross, 18/26 description | TR-17 card (N4) | Modal718.tsx:88,98,106,113-121,125,215 | N4 | OD-V-10 |
| OD-14 | minor | cancel at 320 x 568, tall modals | primary action below the card bottom, hidden scrollbar, no hint | max-h 100dvh-48 + pinned actions (N4); wizard becomes a sheet with a sticky bar | Modal718.tsx:98,133 | N4 + area | OD-V-11, F08 |
| OD-15 | minor | head | unequal hug pills stacked by wrap; hint inside the action group; request-sent = disabled pill at 50 % | TR-04 stack, status line under the badges (2.1) | OrderDetailsView.tsx:84-112,157-166; CabinetPageHead.tsx:75 | area + N2 | OD-V-12 |
| OD-16 | minor | total | label 20/28 + value 24/28 wrap or not depending on the amount | stacked label 14/20 + stat 30/36 (2.2) | detailParts.tsx:301-323 | N11 | OD-V-13 |
| OD-17 | minor | head titles | 32/36 off the phone scale (also "Замовлення не знайдено", SignInPrompt) | H2 30/36 in CabinetPageHead / SignInPrompt | CabinetPageHead.tsx:68; SignInPrompt.tsx:22 | N2/N15 | OD-V-14 |
| OD-18 | minor | delivery card | read-only "fields" look like disabled inputs; value truncated at 320; note 14/24 | KV rows + note 14/20 (2.4) | detailParts.tsx:141-150,167-192 | N11 | OD-V-15 |
| OD-19 | minor | documents, modal close, wizard checkboxes | 24-px glyphs (40 hit, overlapping 4 px), 231 x 22 text button, 32 cross, 24 checkboxes | 44 download hit + row-sized preview target, 42 full-width button, 44 cross (N4), whole-row ChoiceRow. The 40-px back crumb part is REJECTED: D8 sets the back disc at 40 | DocumentTile.tsx:37-42; detailParts.tsx:221-229; Modal718.tsx:113-121; ReturnWizardModal.tsx:73 | N8/N4/N10 + area | OD-V-16, F12 |
| OD-20 | minor | wizard 320 / 390 | select labels and values truncated ("Пошкоджено при ...", "Варіанти зворотньої доставки" under the chevron) | radio rows with wrapping labels (2.10) | ReturnWizardModal.tsx:255,280-295 | area | OD-V-17 |
| OD-21 | minor | foreign partner | bare 2-line title over an empty slab | phone TR-24 panel (2.8) | OrderDetailsView.tsx:124-130 | area | OD-V-18 |
| OD-22 | minor | payment state | overdue invisible on details ("Очікується оплата" only) | phone attention caption under the payment chip (2.1). The cancelled order still showing "Очікується оплата" and the paid order showing "Термін оплати" are desktop data rules -> O-5 | payment.ts:8-17; OrderDetailsView.tsx:153-154, 208-218 | area (+ O-5) | OD-V-19, F16 |
| OD-23 | minor | cancel request | modal does not say it is a request; after submit only a disabled pill; cancel flips the badge silently | phone request note (2.9), status line (2.1), TR-31 toast, focus to H1. Title / button copy kept (Figma) -> O-4 | CancelOrderModal.tsx:68-82; OrderDetailsView.tsx:84-92 | area + N12 | OD-V-20 |
| OD-24 | minor | wizard copy | "Вкажіть кількість" without a quantity control | phone hint "Повертається вся доступна кількість товару."; desktop copy -> O-4 | ReturnWizardModal.tsx:157-162, 193 | area | OD-V-21, F11 |
| OD-25 | minor | rhythm | blocks 26 apart, pt 16, 0.5-px summary hairline | gap 24, pt 24 (+ head pb 24), 1-px lines (2.6) | detailParts.tsx:18-20, 289 | N11 | OD-V-22 |
| OD-26 | nit | type | card titles 22/28 Bold, article 16/24 #343435, notes 14/24, wizard step text 18/26 | Title Large SemiBold, 14/20 tokens, wizard copy in the band (2.2-2.10) | detailParts.tsx:26,56,187; OrderDetailsView.tsx:109; ReturnWizardModal.tsx:56 | N11 + area | OD-V-23 |
| OD-27 | nit | content | head and summary repeat status, number, payment (modal a third time) | phone summary drops those rows; modal shows one badge row | OrderDetailsView.tsx:151-156,191-210; CancelOrderModal.tsx:84-97 | area | OD-V-24 |
| OD-28 | minor | shell | strip labels 10 px, strip scrolls at 320, legal bar copyright off-right at 320, no burger | D1 cabinet shell (forwarded, not built here) | SideMenu.tsx:53,88-93; PlatformFooter.tsx:31 | shell-cabinet | OD-V-25, F17 |
| OD-29 | minor | after cancel / return | focus dropped to `<body>`; no role=status announcement | onDone -> focus H1 (all widths) + phone toast; wizard: toast after navigation | CancelOrderModal.tsx:56-65; useModalBehavior.ts:86-88 | area + N12 | F10 |
| OD-30 | minor | hover-only / fake affordances | names rely on `title`; underlined non-links; decorative info glyphs look like help | phone: names wrap, plain KV values, status rows (with glyphs) dropped | detailParts.tsx:53, 249, 270-273 | N11 + area | F13 |
| OD-31 | minor | Back with an overlay open | Android / browser Back leaves the page, the filled wizard is lost | useBackToClose (N14): Back closes the modal; steps back in the wizard | (new) | N14 + area | F15 |
| OD-32 | minor | visitor | SignInPrompt renders null until hydration, footer jumps | forwarded: reserve the block height before hydration | SignInPrompt.tsx:18-19 | N15 / shell | F18 |
| OD-33 | nit | "Повторити замовлення" | cart shows today's catalog price (28,99 vs 31,65) and a second tap doubles qty | REJECTED: repeat = add the same products to the cart at current prices; the cart drawer opening is the feedback; desktop identical behaviour | OrderDetailsView.tsx:137-140 | - | F19 |
| OD-34 | nit | cross-area | auth title typo "осбистого" (Figma text, auth/data.ts:133); cart close cross over "Очистити" | forwarded to the auth and cart areas | auth/data.ts:133; CartDrawer.tsx:306-327 | auth / cart | F20 |

To be fixed under this spec (area + shared): OD-01..OD-10, OD-12..OD-27,
OD-29, OD-30, OD-31 = 29. Pending a decision: OD-11 (O-7). Forwarded:
OD-28, OD-32 (shell), OD-34 (auth, cart). Rejected: OD-33, and the back-crumb
part of OD-19.

---------------------------------------------------------------------

## 4. Shared needs (atoms / shell APIs)

Each is outside this area's file set. "Exists" = the file exists and needs a
phone variant; "new" = a new shared file.

N1 Button phone size (exists, ui/Button.tsx:80-81, 93-94, 106-107) - D8:
`labelSize.large` / `arrowWrap.large` / `arrowIcon.large` / `plusIcon.large`
phone strings become the small ones (`rounded-[24px] border px-[23px] py-[9px]
text-button-md`, disc `size-[42px] rounded-[21px]`, glyph 11) with the
existing `sm:` desktop values. Needed for every pill here. No API change.

N2 CabinetPageHead detail variant (exists, platform/ui/CabinetPageHead.tsx:60-77):
- section `flex flex-col gap-8 px-6 pt-12 pb-6 lg:flex-row lg:items-center
  lg:justify-between lg:gap-[26px] lg:py-8 lg:pl-10 lg:pr-8`;
- left column keeps `gap-6` between back and title; title -> meta 16 on
  phones (e.g. meta wrapper `-mt-2 lg:mt-0`, or split the column);
- H1 `text-[30px] font-bold leading-9 tracking-[-0.6px] text-neutral-900
  lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]`;
- actions `flex flex-col items-start gap-2 lg:shrink-0 lg:flex-row
  lg:flex-wrap lg:items-center lg:justify-end lg:gap-4` (children decide
  full width with `max-lg:w-full max-lg:[&>span]:flex-1`).
No new props required by this area (the status line rides in `meta`).

N3 CabinetPage slab (exists, platform/ui/CabinetPage.tsx:12) - D1 / D10:
`rounded-t-[32px] pb-12 lg:rounded-t-none lg:rounded-tl-[48px] lg:pb-8`.

N4 Modal718 phone card (exists, platform/ui/Modal718.tsx) - TR-17 / D7:
- overlay `p-6 sm:p-10` (card 342 at 390), overlay height `h-dvh` on phones;
- card max height `calc(100dvh - 48px)`, body scrolls, ACTIONS PINNED at the
  card bottom on phones when the content overflows: white, 1-px #d2d2d2 top
  line, pt 16, pb 24 (e.g. card `pb-0 sm:py-[59px]` + actions row
  `sticky bottom-0 z-[1] bg-white pt-4 pb-[23px] sm:static sm:bg-transparent
  sm:pt-0 sm:pb-0`, line only while `scrollHeight > clientHeight`); gap last
  field -> first action stays 24 when nothing overflows;
- close: `size-11 -m-2.5` hit box, ClearIcon `size-6` on phones (`sm:size-8`
  box + glyph on desktop), focus ring brand 2 px;
- description `text-[16px] leading-6 text-neutral-800 sm:text-[20px]
  sm:leading-7 sm:text-neutral-900`;
- ModalActions `flex flex-col gap-2 sm:flex-row sm:gap-8` (D8: 8 apart);
- phones never use the fit zoom (already true: useFitZoom default media).

N5 (none) - the wizard does not use Modal718 on phones.

N6 SelectField (exists, checkout/fields.tsx:301-420):
- on open, make the whole menu visible inside the nearest scroll container
  without scrolling the locked page (scrollIntoView of the menu with
  `block: "nearest"` limited to the dialog scroller, or flip the menu above
  the trigger when the space below is smaller than the menu);
- resting label `max-w-[calc(100%-72px)] truncate` while
  `placeholder-shown:not(:focus)` / unfilled (F03).

N7 KeyValueList (new, platform/ui/KeyValueList.tsx, export from index.ts) -
TR-27:
```ts
export type KeyValueRow = { label: ReactNode; value: ReactNode; key?: string };
export function KeyValueList(props: { rows: KeyValueRow[]; className?: string }): JSX.Element;
```
Markup: `<dl className={"flex flex-col " + className}>`; row `<div
className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 [&+&]:border-t
[&+&]:border-stroke-subtle">`; `<dt className="text-[14px] font-medium
leading-5 text-neutral-500">`; `<dd className="text-[16px] leading-6
text-neutral-900">` (values wrap; `overflow-wrap:anywhere` is global on
phones). Callers add `lg:hidden` themselves. Also wanted by returns (Деталі
повернення), profile (contract data) and PDP characteristics.

N8 DocumentRow (new, platform/ui/DocumentRow.tsx) + OrderDocumentRow (new
export in platform/orders/DocumentsModal.tsx next to OrderDocumentTile) -
TR-25:
```ts
export type DocumentRowProps = {
  name: string; meta?: ReactNode[]; pending?: boolean | string;
  href?: string; downloadName?: string; onPreview?: () => void; className?: string;
};
export function OrderDocumentRow(props: { doc: OrderDocument }): JSX.Element; // same mapping as OrderDocumentTile
```
Classes in 2.5. Also used by the orders-list DocumentsModal on phones and by
the returns detail.

N9 Sheet (new, ui/Sheet.tsx) - TR-09 / D7, full-screen:
```ts
export type SheetProps = {
  open: boolean; onClose: () => void;
  title: ReactNode;                 // bar title, Title Large 22/28 SemiBold, line-clamp-2
  closeLabel?: string;              // default "Закрити"
  children: ReactNode;              // body
  footer?: ReactNode;               // sticky TR-18 bar content
  initialFocus?: RefObject<HTMLElement | null>;
  bodyRef?: Ref<HTMLDivElement>;    // the scroller (step changes reset it)
  describedBy?: string;
};
```
Markup: portal to body after hydration; layer `fixed inset-x-0 top-0 z-[60]
flex h-dvh flex-col bg-white transition-[opacity,translate] duration-[400ms]
ease-[cubic-bezier(0.22,1,0.36,1)] starting:-translate-y-3 starting:opacity-0
motion-reduce:transition-none` with `role="dialog" aria-modal
aria-labelledby`; bar `flex h-[66px] shrink-0 items-center justify-between
gap-4 px-6`, title `min-w-0 flex-1 line-clamp-2 text-title-lg
text-neutral-900`, cross `-mr-3 flex size-12 shrink-0 cursor-pointer
items-center justify-center rounded-full text-neutral-900 outline-none
active:scale-90 focus-visible:ring-2 focus-visible:ring-brand` + ClearIcon
`size-6`; body `min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-12
pt-6`; footer `shrink-0 border-t border-stroke-subtle bg-white px-6 pt-4
pb-[max(16px,env(safe-area-inset-bottom))]`. Behaviour = useModalBehavior
(Escape, html overflow lock, Tab trap, focus return) + N14. Same atom serves
the cart / auth / filters / preview sheets of D7.

N10 ChoiceRow (new, ui/ChoiceRow.tsx) - TR-22 quiz option row (QuizForm.tsx
Option 802-853 + RadioMarker 141-171, which are local to the frozen landing
file):
```ts
export function ChoiceRow(props: {
  type: "radio" | "checkbox"; name: string; value?: string;
  checked: boolean; onChange: (checked: boolean) => void;
  label: ReactNode; hint?: ReactNode;
  labelTone?: "option" | "control";  // option = 16/24 Bold #000 (brand when checked), control = 16/22 Medium #343435
  invalid?: boolean; describedBy?: string;
}): JSX.Element;
```
Markup: `<label className="relative flex min-h-10 w-full cursor-pointer
items-center gap-4 text-left">`; `<input type={type} className="peer sr-only"
...>` first; text `flex min-w-0 flex-1 flex-col gap-1` (label `text-[16px]
font-bold leading-6 text-black peer-checked:text-brand line-clamp-2`, hint
`text-[14px] leading-5 text-neutral-500`); marker radio `flex size-10
shrink-0 items-center justify-center rounded-full border-[1.5px] border-brand
bg-white peer-checked:border-0 peer-checked:bg-brand
peer-focus-visible:ring-2 peer-focus-visible:ring-brand
peer-focus-visible:ring-offset-2` + white 18 x 12 check (only when checked);
marker checkbox `flex size-10 shrink-0 items-center justify-center` +
CheckboxOnIcon (brand) / CheckboxOffIcon (#1d1d1f) `size-6`. Rows stack in
`flex flex-col gap-10` (40 apart, master). Also needed by checkout
(delivery / payment) and profile (role) per TR-22.

N11 detailParts phone variants (exists, platform/orders/detailParts.tsx -
shared by order-detail and returns):
- `DetailsBody`: 2.6 classes, right column `rounded-[32px] lg:rounded-3xl
  max-lg:order-first`.
- `CARD` / `CARD_TITLE`: 2.4 / 2.2 classes.
- `ItemsTable({ items, columns, phone? })` with
  `phone?: { title: string; line: (item: OrderItem) => { meta: ReactNode[]; amount?: ReactNode; extra?: ReactNode } }`
  (returns passes `extra` = "Причина: Брак" 14/20 #343435 under the meta line)
  -> ItemsList (2.3); export `ItemLine` for reuse; `positionsLabel(n)`.
- `InfoCard`: phone KeyValueList + 14/20 note (2.4).
- `DocumentsCard`: phone OrderDocumentRow list + full-width outlinedDark
  download-all Button (2.5).
- `SummaryCard({ title, groups, compact? })` with
  `compact?: KeyValueRow[]`: when given, groups get `max-lg:hidden` and the
  KeyValueList renders `lg:hidden`; section `gap-6 lg:gap-8` (2.2).
- `TotalCard`: stacked phone label / stat 30/36 Bold (2.2).
- `SummaryRow` / `SummaryValue` / `SummaryLink` / `ReadField` / `ProductCell`:
  unchanged (desktop only after this change).

N12 Toast (new, platform/ui/Toast.tsx + host) - TR-31:
```ts
export function showToast(text: string, opts?: { durationMs?: number }): void; // module store, useSyncExternalStore
export function ToastHost(): JSX.Element | null; // mounted once in PlatformChrome so it survives client navigation
```
Markup: host `pointer-events-none fixed inset-x-0
bottom-[calc(24px+env(safe-area-inset-bottom))] z-[70] flex justify-center
px-6`; toast `pointer-events-auto w-full max-w-[342px] rounded-3xl
bg-[#2d2d2f] px-6 py-3 text-[14px] leading-5 text-white` `role="status"
aria-live="polite"`, auto-hide 4 000 ms, opacity transition with
`motion-reduce:transition-none`. This area calls it only when `usePhone()`
(desktop frozen, O-4).

N13 usePhone (new, ui/usePhone.ts):
```ts
export function usePhone(): boolean; // matchMedia("(max-width: 639.98px)") via useSyncExternalStore, server snapshot false
```

N14 useBackToClose (new, cart/useBackToClose.ts next to useModalBehavior):
```ts
export function useBackToClose(open: boolean, onBack: () => void): { release: () => void; isTop: () => boolean };
```
Pushes one same-URL history entry when `open` turns true (keeping Next's
`history.state` so the app router treats the pop as a no-op), calls `onBack`
on popstate while open (the wizard re-arms it for steps 2 / 3), and pops its
entry on a programmatic close (`release`). Must be verified against the Next
16 router (docs: 01-getting-started/04-linking-and-navigating.md
"window.history.pushState"). Used by the cancel modal and the wizard sheet;
cart / auth / filters sheets want it too.

N15 SignInPrompt (exists, platform/ui/SignInPrompt.tsx) - shell: H2 30/36 on
phones, reserve its height before hydration (F18).

N16 Shell D1 (PlatformHeader burger + menu sheet, SideMenu strip removed on
phones, PlatformFooter wrapping legal bar) - shell-cabinet spec.

N17 Root `export const viewport` with `viewportFit: "cover"` (D12) so the
`env(safe-area-inset-bottom)` paddings of N9 / N12 take effect.

---------------------------------------------------------------------

## 5. Files

### 5.1 Area-owned (disjoint from every other area)

| File | Change |
|---|---|
| src/components/platform/orders/OrderDetailsView.tsx | title `<br className="lg:hidden" />`; meta: duplicated PaymentBadge (desktop `max-lg:hidden`, phone with the attention caption `lg:hidden`) + phone status line; `useCancelRequest(id)` at the top; StatusAction: hint `max-lg:hidden`, pending Button `max-lg:hidden`, PHONE_STACK on the visible two actions; SummaryCard `compact` rows; ItemsTable `phone` config; CancelOrderModal `onDone` -> phone toast + focus H1; `!order` branch -> `<OrderNotFound />`; imports paymentCaption (dashboard/data.ts) and usePhone / showToast |
| src/components/platform/orders/CancelOrderModal.tsx | desktop SummaryRow block `max-lg:hidden`; phone badges row + KeyValueList (Створив / Контрагент) + request note (`lg:hidden`); `onDone?: (request: boolean) => void` called after a valid submit; useBackToClose |
| src/components/platform/orders/ReturnWizardModal.tsx | extract `useReturnWizardState(items)` (DOM-neutral for desktop); `if (usePhone()) return <ReturnWizardSheet .../>`; export the state type |
| src/components/platform/orders/ReturnWizardSheet.tsx (new) | the 3-step phone flow of 2.10 on Sheet + ChoiceRow; local `QuizStepCard` (band + panel) |
| src/components/platform/orders/OrderNotFound.tsx (new) | 2.8 view (SignInPrompt for non-partners, head + phone TR-24 panel for partners) |
| src/app/orders/[id]/not-found.tsx (new) | `export default function NotFound() { return <OrderNotFound />; }` |
| src/app/orders/[id]/page.tsx | no change (keeps `notFound()` for the 404 status) |

### 5.2 Shared files this area depends on (built by the shared layer, section 4)

ui/Button.tsx (N1), platform/ui/CabinetPageHead.tsx (N2),
platform/ui/CabinetPage.tsx (N3), platform/ui/Modal718.tsx (N4),
checkout/fields.tsx (N6), platform/ui/KeyValueList.tsx new (N7),
platform/ui/DocumentRow.tsx new + platform/orders/DocumentsModal.tsx (N8),
ui/Sheet.tsx new (N9), ui/ChoiceRow.tsx new (N10),
platform/orders/detailParts.tsx (N11), platform/ui/Toast.tsx new +
PlatformChrome mount (N12), ui/usePhone.ts new (N13),
cart/useBackToClose.ts new (N14), platform/ui/SignInPrompt.tsx (N15),
PlatformHeader / SideMenu / PlatformFooter (N16), app/layout.tsx viewport
(N17), platform/ui/index.ts (exports).

Read-only imports (no edit): platform/dashboard/data.ts `paymentCaption`,
platform/orders/data.ts, payment.ts, store.ts, catalog/icons.tsx
(CheckboxOn/OffIcon), platform/ui/icons.tsx (DotIcon, DocumentGlyph,
DownloadIcon, ClearIcon).

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

0. Before the build: shoot desktop references that the baseline lacks, with
   seed b2b at 1710 x 1117 and 1280 x 800: cancel modal C1..C4 initial and
   errors, wizard 056 initial / filled, /orders/48291064 at 640 x 900 and
   768 x 1024 (zoomed canvas), /orders/48291037 at 1710. Save to
   audit/mobile/order-detail/desktop-before/. After the build re-shoot and
   pixel-diff (audit/mobile/kit/compare.mjs): 0 differing files.
1. Pixel guard: compare.mjs over the 76 baseline shots - 0 diffs required for
   cabinet-1710-order-detail, cabinet-1710-order-detail-oldest,
   cabinet-1710-return-detail, cabinet-1710-orders, cabinet-1710-orders-returns
   and every landing-* shot. Only phone-390-cabinet-order-detail* and
   phone-390-cabinet-return-detail may change.
2. Widths 320 x 568, 360 x 780, 390 x 844, 430 x 932, 600 x 960, all 14 ids
   (S1..S14) + S15..S19: `domChecks` must report no overflowX, offRight,
   offLeft, wideElement, hScroller, clippedText, inputZoom, fixedTall,
   brokenImage, stretchedImage, tinyText; smallTarget only for the logo and
   the 40-px back crumb (D8); console errors 0.
3. Head at 390 (S1): back row top = 66 + 48; title 30/36 700 -0.6, 2 lines,
   Light run 300; title -> badge row 16; badges 38 tall gap 8; badge row ->
   first action 32; actions 342 x 42, 16/22 500, 8 apart, outlined first; head
   bottom -> summary card top 48. S2 / S4: status line 14/20 #777779 16 below
   the badges and "Повторити замовлення" hug (< 342). S5 / S3 / S7: red 12/22
   attention caption under the payment chip (only on phones). After a C3
   submit: status line text, no disabled pill visible.
4. Summary card: x 24, w 342, r32 (first block on phones, above the items);
   title 22/28 600 -0.44; KV labels 14/20 500 #777779, values 16/24 400
   #1d1d1f, 8 between label and value, 16 + 1-px #d2d2d2 + 16 between rows;
   rows = Дата, Створив, Контрагент, Тип оплати, Термін оплати (not on S10);
   no underline, no info glyph, no element narrower than its text; total
   label 14/20 500 #8e8e8f, value 30/36 700 -0.6 white, never on the same line
   as the label; "До оплати" 294 x 42 only on unpaid, non-cancelled orders.
5. Items panel: no element wider than the panel; photo 64 x 64 r16 on #d5d5d5;
   name 16/22 700 <= 2 lines; article 14/20 #777779; meta + amount visible for
   every line (amount 16/24 600, right-aligned, wraps under at 320); 1-px
   #d2d2d2 lines inset 24; count text "N позицій/позиції/позиція" correct for
   1..5.
6. Delivery: KV rows, no truncation at 320 ("Нова Пошта (Адресна доставка)"),
   note 14/20.
7. Documents: rows with 48 r12 tiles; full names visible (scrollWidth ==
   clientWidth) at 320; download link 44 x 44; preview button height >= 48;
   pending row not focusable; "Завантажити усі документи" 294 x 42 outlined;
   tap a row -> new tab with the PDF; tap download -> one download; download
   all -> 2 downloads (pending skipped).
8. Blocks 24 apart; last block -> legal bar 48; no 0.5-px line rendered on
   phones (scan computed border / background heights).
9. Cancel modal, C1..C4 at 390 and C2 / C4 at 320 x 568: card x 24 w 342
   (272), r32, 1-px #8e8e8f, padding 24; title 24/28 700; cross hit 44 x 44;
   meta 16/24 #343435; one badge row; KV Створив / Контрагент (wraps);
   request note only on C3 / C4; selects 46; actions 294 x 42, 8 apart; at
   320 x 568 both actions visible without scrolling and the body scrolls;
   every option of every open menu hit-testable (elementFromPoint) without
   scrolling by the user; empty submit -> role=alert errors + focus on the
   first select; Escape with a menu open closes only the menu; scrim / cross /
   Escape / "Повернутись" close and reset; Back closes the modal and the page
   stays /orders/<id>; valid submit -> toast (role=status) with the right text,
   focus on the H1, page state per 2.7, persists after reload, syncs to a
   second tab; html overflow restored.
10. Wizard on 056 / 052 at 390, 050 at 320 x 568 and 600 x 960: sheet covers
    the viewport (0, 0, w, h) above the header; bar 66, title 22/28 600, cross
    glyph right edge = w - 24, hit 48; band #2d2d2f with "1/3" 16/24 and title
    24/28 600 white; panel 1-px #1d1d1f ring r32; rows 40 apart, radios 40,
    checkbox boxes 40; no horizontal scroller anywhere (hScroller 0); footer
    border-top 1-px #d2d2d2, pt 16, button 42, stays at the viewport bottom
    while the body scrolls; step 1 "Далі" with nothing ticked -> alert + focus;
    select-all toggles all; step 2 shows one group per ticked line in order;
    premature "Далі" -> group errors + scroll + focus; step 3 errors; Back
    (browser) on step 3 -> step 2 -> step 1 -> closed, page URL unchanged;
    Escape closes; submit -> /orders?tab=returns with the new "Створено"
    row on top, toast visible after navigation, history Back returns to the
    order (S16 hint), not to a dead entry; html overflow restored. Resize the
    open wizard from 390 to 1024: the desktop modal appears with the same
    answers; back to 390: the sheet with the same answers (step resets to 1).
11. Not found: /orders/99999999 (b2b) at 390 -> cabinet head "Замовлення не
    знайдено" + panel + "Усі замовлення" -> /orders; status 404; same id as a
    visitor -> SignInPrompt; acc-fresh on 48291064 -> same head + panel;
    desktop 1710 of acc-fresh unchanged vs before.
12. Keyboard (390 emulated, Tab): page order back -> actions -> pay ->
    document rows -> downloads -> download all; sheet and modal trap Tab;
    focus rings brand 2 px on new controls (DocumentRow, ChoiceRow, Sheet
    cross).
13. Touch emulation: no hover-only state visible after taps (Tailwind hover
    is gated); `prefers-reduced-motion: reduce` -> the sheet appears without
    transition.
14. Landscape 844 x 390: record the before / after shots of the cancel modal
    and the wizard (expected unchanged until O-7 is decided).

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

- O-1 Head spacing back -> title: this spec uses 24 (desktop master
  5052:56816 and today's `gap-6`); TR-03 says 48 below a crumb (article
  3176:6558). D10 gives pt 48 for the head but no back -> title value. The
  system spec must pick one value for every cabinet detail head (orders,
  returns). Head pb 24 + body pt 24 = 48 to the first block assumes the
  shared head ends with pb 24; if N2 chooses pb 48, DetailsBody phone pt
  must be 0.
- O-2 Total value weight: D9 "stats 30/36 Bold" is used here; the returns
  visual report proposed 30/36 SemiBold for the same TotalCard. TotalCard is
  one shared component, so one value for both pages.
- O-3 /orders/99999999 on desktop changes from Next's English 404 to the
  cabinet head "Замовлення не знайдено" (not in the pixel baseline). The
  orchestrator must accept this desktop change or keep the 404 for >= 640.
  The shell-cabinet audit also proposes a global src/app/not-found.tsx; a
  route-level not-found is used here so the global page stays a shell
  decision.
- O-4 Copy that is wrong on desktop too but frozen there: the cancel modal
  title / button for "В роботі" ("Скасувати замовлення" although it sends a
  request), the wizard step text "Вкажіть кількість ...", no toast / feedback
  after cancel on desktop. This spec fixes them on phones only (note, hint,
  toast). Recommend extending to desktop in a later pass.
- O-5 Payment data rules (payment.ts:8-17, OrderDetailsView.tsx:209-218): a
  cancelled order keeps the "Очікується оплата" badge and a paid order shows
  "Термін оплати". Changing them alters desktop; left as is (phones hide the
  overdue ambiguity with the attention caption only).
- O-6 Sticky pay bar (TR-18 dark) for unpaid orders: not built (the pay
  button is ~1 100 px down on the 5-line order). Decide globally whether
  cabinet detail pages get a sticky summary bar.
- O-7 Landscape phones (F06): desktop canvas zoom x Modal718 fit zoom makes
  modals unreadable (0.37 effective). Proposal for the shared layer: pass
  `"(min-width: 640px) and (min-height: 600px)"` as the useFitZoom media in
  Modal718 / StockModal / CartDrawer so short windows scroll instead of
  shrinking; the 1710 x 1117 desktop is unaffected. Needs the orchestrator's
  call (BRIEF: no tablet layout).
- O-8 detailParts.tsx is shared by order-detail and returns (and
  DocumentsModal.tsx by orders-list): N11 / N8 must be built once, by the
  shared layer or by one orders-cluster builder, from this spec's classes;
  the returns spec consumes the same API (ItemsTable `phone.extra` for the
  reason line, SummaryCard `compact`, TotalCard). Both specs agree on the
  phone order head -> summary + total -> lines -> details -> documents.
- O-9 Wizard step split: 3 steps (items / reasons / solution + delivery) is
  this spec's reading of D7 + TR-15 + TR-22; the visual and functional
  reports proposed 2 steps with the reason inline under each ticked line.
  Radio reasons (TR-22 lists "return reason") would make an inline step 1
  too long (4 x 280 px for 4 lines), hence the separate reason step.
- O-10 Toast host placement (PlatformChrome) and the phone-only gating of
  toasts: assortment has a local toast (AssortmentView.tsx:100-106) that the
  shared Toast could replace; decide globally.
- O-11 useBackToClose interacts with the Next app router history; if the
  shared layer cannot make it reliable, drop OD-31 (Back keeps leaving the
  page, as today) rather than ship a broken history.
- O-12 The cart drawer that "Повторити замовлення" opens and the account /
  burger sheet are other areas; their phone specs decide those overlays.
