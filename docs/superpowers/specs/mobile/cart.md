# Phone spec - cart sheet + stock modal (< 640 px)

Area: "cart". Author: spec agent, 2026-11-05. Status: draft for the system
spec. Inputs: audit/mobile/cart/visual-report.md (CART-V01..V21),
audit/mobile/cart/functional-report.md (F1..F20), the screenshots in
audit/mobile/cart/shots/ (viewed: visual-drawer-filled-390x844,
visual-drawer-filled-320x568, visual-drawer-empty-390x844,
visual-drawer-b2b-390x844, visual-drawer-filled-568x320-landscape,
visual-modal-3of3-390-unrolled, functional-catalog-stockmodal-320x568-top,
functional-catalog-menu-then-cart-390x844), the sources below, BRIEF.md,
DECISIONS.md (D1..D13), figma-mobile-language.md (TR-01..TR-32),
code-mobile-recipes.md. Shell specs (shell-public.md, shell-cabinet.md) did
not exist yet when this was written; section 7 lists what they must agree
with.

Text widths quoted below were measured in the site fonts with
audit/mobile/cart/spec/textfit.mjs (output textfit.txt).

Ground rules (from BRIEF / DECISIONS, repeated because every rule below
depends on them):
- Phone = unprefixed classes or `max-lg:`; desktop = `lg:` (640). Desktop
  (>= 640) and the landing must stay pixel-identical. The cart overlays
  also open on landing routes; their CLOSED state must stay invisible and
  byte-identical (D7 last bullet).
- The open desktop drawer is in the pixel baseline
  (audit/mobile/baseline/shop-1710-cart-drawer.png,
  cabinet-1710-cart-drawer.png). The desktop stock modal is NOT in the
  baseline: the build agent shoots its own before-set (section 6.6).

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
| S1 | 2.4 card for 1-2 issues, sheet for 3+ | Sheet for every count (A-9; your 7.1 recommendation); edited |
| S2 | Stock sheet bar shows "Кошик" (7.2) | The bar carries the dialog title "Деякі товари закінчилися" (A-7, up to 2 lines, bar grows to 94); the body starts with the intro, no duplicate H2 - SUPERSEDED by S17 (bar 66, one line) |
| S3 | 2.2.2 status eyebrow on every row | Eyebrow only for exception states (A-10); in-stock rows are 24 shorter; note added |
| S4 | N6 ProductLine | A8 (ui/ProductLine.tsx, F2) - same anatomy (one link block, trash trailing, stepper + total 22/28 bottom) |
| S5 | N3 QtyStepper `size="xs"` | Dropped: pass `size="sm"`; the phone count 16/22 Bold comes from A18; partner rows pass `editable` |
| S6 | N7 SheetBar | A5 (`SheetBar`, gap-2, wrap); the cart's own bar must resolve to SHEET_BAR geometry |
| S7 | N8 useMediaQuery | A3 (ui/useMediaQuery.ts) |
| S8 | 2.3 empty CTA accent (7.11) | Solid with the arrow disc (A14 action rule); edited |
| S9 | 2.2.3 `pb-[max(24px,...)]` | `pb-[calc(24px+env(safe-area-inset-bottom))]` = STICKY_BAR_DARK formula (C-29); edited |
| S10 | N1 useModalBehavior; inertSelector | A2; `inertSelector: OVERLAY_INERT` (includes `#cabinet-nav`, 7.6) |
| S11 | 7.13 Back | A4 useBackToClose on the phone sheet; close on route change kept |
| S12 | 7.7 landscape (CART-25) | O-4 (not built) - SUPERSEDED by S25 (built in F1) |
| S13 | 7.9 add-to-cart toast | O-11: keep the sheet |
| S14 | 7.4 QtyStepper owner, 7.5 shared hooks | F2 / F1 |
| S15 | Build | C-cart (wave 3); add `buyNow(id, qty)` to CartProvider first (C-pdp depends on it) |
| S16 (critique round 1) | 2.4.4 stock action bar (`pt-4`, `pb-[max(16px,...)]`, counter row + stacked pills = 176 / 220) | SHEET_FOOTER strings (last child of the scroller, `pt-[15px]` + 1-px line, `pb-[calc(16px+env(safe-area-inset-bottom))]`, static below 500 px of height); T5a anatomy: status "Залишилось вирішити: N з M" + 12 + two pills stacked 8 apart (named A-6 exception); "Замінити всі" moved into the body (2.4.2); 156 tall; edited in place |
| S17 (critique round 1) | S2 / 2.4.1 stock bar title (2 lines, bar 94) | Bar 66, one line (A-7 revised, D7): `title="Деякі товари закінчилися" shortTitle="Наявність товарів"` (short below 375); dialog name = the full title; body starts with the intro; edited in place |
| S18 (critique round 1) | 2.4.2 52 brand-soft tile above the title | Dropped (the bar carries the title; a second icon-tile look next to the master Info tile, X9); edited in place |
| S19 (critique round 1) | 2.4.3 `li ... py-6` wrapping two ProductLines (nested `py-6` = 64 between them) | A8 `padded`: the two nested lines are `as="div"` (no vertical padding), 16 apart; the li keeps `py-6`; the 306 / 350 row heights hold; edited in place |
| S20 (critique round 1) | 2.2 scroller without top padding (head row y 66..110, text 12 under the bar) | Scroller `pt-3`: the 44 head row centres its 20-px text 24 under the bar (A5 body pt 24); every y of 2.2 moves +12 (head row y 78..122, 21 px below the close hit box) |
| S21 (critique round 1) | 2.2.1 "Очистити" without confirm or undo (CART-08) | Undo without a toast: CartProvider keeps `lastCleared: Entry[]` for the session; the empty state shown right after a clear reads title "Кошик очищено", the same text, then `<Button size="small" variant="outlinedDark">Повернути товари</Button>` (restores the lines, focus to the first trash) stacked 8 above the catalog CTA. Trash: `lastRemoved` single-line restore = a "Повернути" text button (16/22 Medium #4a4a4c, 44 hit, the "Очистити" slot) for 8 s. New copy O-12 |
| S22 (critique round 1) | 2.2.3 summary #2d2d2f, Regular label on one row with the amount | C-40: `bg-neutral-900`; A13 summary anatomy (SUMMARY_LABEL "Сума замовлення" stacked over SUMMARY_AMOUNT, gap 8) like checkout 2.8 / order-detail 2.2; heights +28 (not reached 214 / 234, reached 198); edited in place |
| S23 (critique round 1) | 2.4.1 close = `openCart()` when from the cart | Three close behaviours by `issuesFrom` ("cart" handoff to the cart sheet, "buyNow" dismiss, NEW "checkout" dismiss + focus the CheckoutLines h2); table edited in place; 2.6 type edited |
| S24 (critique round 1) | 2.6 close on pathname change; row link `onClick={closeCart}`; CTA `router.push` | Row links, the CTA hand-off and "Повернутись до каталогу" navigate with A4 `release({ navigate })` (history [page, target], one Back); close on pathname change stays only as the fallback |
| S25 (critique round 1) | 7 item 12 / S12 landscape (CART-25) | O-4 BUILT in F1 (A26: useFitZoom returns 1 on coarse pointers with the desktop media): the desktop drawer and stock modal scroll on touch landscape phones |
| S26 (critique round 1) | 2.1 focus on open; cross labels | A5: the bar title on coarse pointers, the cross on fine pointers; cart cross "Закрити кошик" (today), stock cross "Закрити перевірку наявності" (O-12) |
| S27 (critique round 1) | Toasts / live regions behind the sheet | Toasts fired while the cart or stock sheet is open are queued (A23); the A2 walk inerts everything outside the sheet (toast host exempt) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Components and routes

| Piece | File | Mounted by | Opened from |
|---|---|---|---|
| Cart drawer -> phone: full-screen cart sheet | src/components/cart/CartDrawer.tsx | CartProvider (site-wide, app/layout.tsx) | header CartTrigger (Header.tsx:461 phone cluster, PlatformHeader.tsx:63), product card / PDP add-to-cart (`add(id, qty, show=true)`, CartProvider.tsx:102-111) |
| Stock modal -> phone: stock sheet (3+ issues) or stock card (1-2 issues) | src/components/cart/StockModal.tsx | CartProvider | cart "Оформити замовлення" (`checkout()`, CartProvider.tsx:141-147), PDP "Купити зараз" (`buyNow()`, :113-125) |
| Plumbing | CartProvider.tsx, data.ts, store.ts, useModalBehavior.ts (shared), useFitZoom.ts (shared) | | |

Routes: every route (the overlays are site-wide). Audit / verify routes:
/catalog (public header), /catalog/hotels/odnorazovi-aksesuary/shampoo-2
(PDP "Купити зараз" on a promo = sold-out line), /dashboard and /catalog
with seed b2b (cabinet header), / (landing, closed-state guard only).

### 1.2 Seeds

- Visitor: seed none. B2C customer: seed b2c (same retail prices).
- Partner: seed b2b (priceMode "partner", B2BStatusLine, no stock check).
- Carts (localStorage `binar-cart-v1`):
  - FILLED = shampoo-1:2, soap-1:1, lotion-1:3 (6 items, 189,90 retail /
    173,94 partner) - audit/mobile/cart/lib.mjs:236.
  - STOCK = shampoo-2:2, shampoo-3:2, shampoo-sold-out:2 (3 issues) -
    lib.mjs:241.
  - STOCK1 = shampoo-2:2 (1 issue). STOCK2 = shampoo-2:2, shampoo-3:2 (2
    issues).
  - LONG = lotion-1:999, soap-1:120, shampoo-1:2, conditioner-1:1,
    shampoo-alt-1:1, robe-1:15 (functional.mjs:599-606; sum 37 343,70).
  - REACHED = robe-1:45 (5 402, free delivery reached).
  - OUT = shampoo-3:2 + soap-1:1 (retail: out-of-stock line; partner: "Під
    замовлення" line).
  - FX = slippers-1:2 with seed b2b (fxPrice product, partner note).

### 1.3 States

Reached by the audits (all must be re-verified after the build):

| id | State | Seed / cart |
|---|---|---|
| C1 | Cart empty, visitor | none / [] |
| C2 | Cart empty, partner | b2b / [] |
| C3 | Cart filled, retail | none or b2c / FILLED |
| C4 | Cart filled, partner prices | b2b / FILLED |
| C5 | Free delivery reached | none / REACHED |
| C6 | Long content (qty 999 / 120, 6 lines, 5-digit sums) | none and b2b / LONG |
| C7 | Out-of-stock line (retail grey photo, disabled stepper) / "Під замовлення" (partner) | none / OUT, b2b / OUT |
| C8 | After trash, after "Очистити" (-> C1) | FILLED |
| C9 | Short landscape phone 568x320, 639x360 | FILLED |
| C10 | Phone menu open, then cart tap | none / FILLED |
| C11 | Hand-off to /checkout (retail + partner) | FILLED |
| S1 | Stock, 3 of 3 -> 2 of 3 -> 1 of 3 -> 0 of 3 (sheet) | none / STOCK |
| S2 | Stock "Замінити всі" | none / STOCK |
| S3 | Stock resolved -> "Оформити замовлення" -> /checkout | none / STOCK |
| S4 | Stock "Повернутись до каталогу" -> /catalog | none / STOCK |
| S5 | Stock from PDP "Купити зараз" (1 issue -> card) | none / [] on the shampoo-2 PDP |
| S6 | Stock short landscape 568x320 | none / STOCK |

New states this spec adds (the build must make them reachable):

| id | State | Seed / cart |
|---|---|---|
| S7 | Stock card, 1 issue (D7: <= 2 rows = short modal card) | none / STOCK1 |
| S8 | Stock card, 2 issues | none / STOCK2 |
| C12 | B2B fx line (caption "Ціна залежить від курсу") | b2b / FX |

Unreachable (spec the design anyway, verify by code reading only):
- "Альтернативи немає" / "Видалити" / "Видалено": suggestReplacement
  (data.ts:91-103) always finds an in-stock product in the mock pool.
- Stock modal for partners: checkStock returns [] in partner mode
  (data.ts:69-70) by design.
- Loading / error: the cart is a synchronous localStorage store
  (useSyncExternalStore, store.ts); there is no network call. Before
  hydration the server snapshot is [] and the sheet is closed, so nothing
  to show.
- iOS Safari specifics (focus-on-tap, rubber band) and the Android
  hardware back key (simulated with history back only).

---------------------------------------------------------------------

## 2. Phone layout

### 2.0 Architecture (how desktop stays byte-identical)

- Cart: ONE overlay shell (the existing root / aside / close button,
  restyled for phones with unprefixed classes and their `lg:` restorers),
  and CONTENT TWINS: a new phone subtree `CartSheetPhone` (`lg:hidden`)
  next to the existing desktop subtrees, which each get `max-lg:hidden`.
  The close button stays ONE element (so `initial: closeRef` keeps
  working) and is positioned per breakpoint. Desktop DOM, classes and
  inline zoom styles are unchanged for every `lg:` property.
- Stock modal: it mounts only while open (never during SSR), so it
  switches by JS: `StockModal` becomes a thin switch, the existing JSX
  moves verbatim into `StockDialog` (desktop, >= 640) and a new
  `StockSheetPhone` renders below 640 (`useMediaQuery("(min-width:
  640px)")`, shared need N8). The dead phone branch of the desktop dialog
  (IssueCard, StockModal.tsx:137-184, and `<ul className="lg:hidden">`,
  :309-313) is deleted; it is display:none at >= 640, so desktop pixels do
  not change.
- Rationale: the phone composition (bar + single scroller + sticky dark
  bar) is structurally different from the desktop drawer (title row +
  list scroller + summary footer); prefix-juggling one tree would risk the
  baseline, twins cannot.

### 2.1 Cart sheet shell (all cart states)

Pattern: full-screen sheet TR-09 (menu master 3117:13578) per D7 and
TR-19; z-order per code recipes section 4 ("full-screen sheet over
everything = z-[60]").

| Block | Geometry at 390 x 844 (320..639) | Classes (phone + desktop restorer) | Source |
|---|---|---|---|
| Layer root (CartDrawer.tsx:256-260) | fixed, 0,0 390 x 844 (full viewport at every width) | `fixed inset-0 z-[60] ${overlap ? "lg:z-[51]" : "lg:z-40"} ${open ? "" : "pointer-events-none"}` (was `z-40 ${overlap ? "lg:z-[51]" : ""}`) | D7 full-screen sheet above the sticky header (z-50) and the phone menu (z-[45]); fixes F1 |
| Scrim (:267-273) | not shown on phones | prepend `max-lg:hidden` to the existing string | TR-09: the sheet covers the page, no scrim |
| Aside (:275-287) | 0,0 full width x 100dvh, white, square corners | `absolute bottom-0 right-0 top-0 flex h-dvh w-full flex-col overflow-hidden bg-white transition-[translate,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:motion-reduce:transition-none lg:h-auto lg:w-[576px] lg:max-w-[92vw] lg:rounded-tl-[48px] lg:transition-[translate] lg:will-change-[translate] ${overlap ? "lg:-bottom-px lg:top-[calc(var(--site-header-h,92px)_-_5px)]" : "lg:top-[var(--site-header-h,92px)]"} ${open ? "translate-y-0 opacity-100 lg:translate-x-0" : "-translate-y-3 opacity-0 lg:translate-x-full lg:translate-y-0 lg:opacity-100"}` | TR-09 motion = menu (opacity + translateY(-12), 400 ms, ease-out-expo, Header.tsx:506-511); D7 `h-dvh`; D12 motion-reduce. Desktop: every lg value equals today's resolved value (top, bottom, w 576, max-w 92vw, r48 tl, translate-x, transition-property translate, will-change) |
| Frame (:297-300) | fills the aside, no ring on phones | `relative flex min-h-0 flex-1 flex-col lg:rounded-tl-[48px] lg:border lg:border-stroke-default` (was `rounded-tl-[32px] border border-stroke-default lg:rounded-tl-[48px]`); the fitted inline style is desktop-only already (useFitZoom media) | TR-09 (sheet has no ring) |
| Close button (:301-309, ONE element) | 48 hit box at x 330..378, y 9..57; 24 glyph at x 342..366, y 21..45 at every width (right-anchored) | `absolute right-3 top-[9px] z-[1] flex size-12 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand max-lg:rounded-full max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand lg:right-[23px] lg:top-[23px] lg:size-8`; glyph `XMarkIcon className="size-6 lg:size-8"` | menu cross 3117:14330 at x 342 / y 21 in a 48 box (TR-09, D7, D8 "close cross 24 in 44-48 hit boxes"); fixes F6/V06 overlap, F7/V12 target |
| Desktop subtrees | hidden on phones | EmptyCart root (:193) prepend `max-lg:hidden`; filled body (:315) prepend `max-lg:hidden`; summary (:337) prepend `max-lg:hidden` | architecture 2.0 |
| Phone subtree | fills the frame | `<CartSheetPhone onFocusClose={() => closeRef.current?.focus()} />`, root `flex min-h-0 flex-1 flex-col lg:hidden` | new file |
| useModalBehavior (:247-253) | | `inertSelector: "body > header, #mobile-nav"` (adds the public phone menu; harmless when it is already inert); the cabinet menu id from shell-cabinet must be appended (section 7) | F1 belt and braces |

Phone bar (first child of CartSheetPhone, every cart state):
- `<div className="flex h-[66px] shrink-0 items-center pl-6 pr-[72px]">`
  + `<h2 className="truncate text-title-lg text-neutral-900">Кошик</h2>`
  (22/28 SemiBold -0.44 via the phone token; the bar is phone-only so the
  token cannot leak to desktop). Title box x 24, y 19..47. The close
  button floats over the right 72 px (z-[1]).
- Source: TR-09 bar (66, title in place of the logo), D7, D9 sheet title.
- No divider under the bar (the menu master has none); scrolled content
  clips at y 66 because the bar sits outside the scroller.

Interactions of the shell:
- Open: header CartTrigger tap, add-to-cart with `show`. On phones the
  CartTrigger must also close an open phone menu first (shared need N2);
  the z-[60] layer alone already makes the cart visible above the menu.
- Close: the cross; Escape (keyboard); a route change (CartProvider fix,
  2.6); following a row link; the CTA hand-off. No scrim tap exists on
  phones (full-screen).
- Scroll lock: unchanged useModalBehavior (html overflow hidden, not body).
  The page behind keeps its scroll position on close (shared fix N1
  `preventScroll`).
- Focus: on open -> the close button (`initial: closeRef`, existing); on
  close -> the opener with `preventScroll: true` (N1); after a row is
  removed / the cart is cleared see 2.2.2 / 2.2.1.
- Header: covered by the sheet on phones (was visible but inert, F15 /
  V19); stays `inert` for assistive tech.
- Orientation change across 640 while open: CSS swaps twins in place; the
  open state survives; nothing to do.

### 2.2 Cart sheet - filled (C3, C4, C5, C6, C7, C12)

Structure under the bar:

```
<div  scroller  className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
  head row (2.2.1)
  <ul className="shrink-0 px-6 pb-6">  rows (2.2.2)  </ul>
  summary bar (2.2.3, sticky)
</div>
```

The whole body (head row, rows, summary) is ONE scroller; the summary is
`sticky bottom-0` inside it, so it pins to the viewport bottom while the
list is long and sits after the last row when it is short (`mt-auto`
pushes it down to the bottom when the list is shorter than the screen).
Short-viewport rule: below 500 px of height the summary becomes `static`
(`[@media(max-height:499px)]:static`), so on 568x320 / 639x360 the whole
body scrolls and the CTA is reached at the end, never clipped (F2 / V02).
Source: TR-18 (sticky bar only when the action would otherwise be
off-screen), TR-19.

#### 2.2.1 Head row (count + "Очистити")

- `<div className="flex h-11 shrink-0 items-center justify-between gap-4 px-6">`
  - left `<p className="whitespace-nowrap text-body-sm text-neutral-500">{itemsPhrase(count)}</p>`
    ("6 товарів", 14/20 #777779; new helper in cart/data.ts, see 5.1).
  - right `<button type="button" className="-mr-2 flex h-11 cursor-pointer items-center gap-0.5 rounded-full px-2 text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand active:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Очистити <XMarkIcon className="size-4 shrink-0" /></button>`
    (16/22 Medium #4a4a4c, 44 tall, glyph right edge on the 24 gutter).
- Geometry: y 66..110 at every width; "Очистити" box 92 x 44.
- Source: TR-10 "Скинути" text button (16/22 Medium #4a4a4c), TR-19 count,
  D8 targets >= 44. Moves "Очистити" out of the close button's box (F6).
- After "Очистити": the cart becomes C1; focus -> the close button via
  `onFocusClose()` (the clear button unmounts; F12 / V18). No
  confirmation (see 3, CART-08 note).

#### 2.2.2 Line row (TR-08), one per cart line

(SYSTEM A8 / A-10: the status eyebrow renders only for exception states
("Немає в наявності", "Під замовлення"); in-stock rows have none (heights
below shrink by 24). QtyStepper: pass `size="sm"`, no `size="xs"`; the phone
count comes from A18; partner rows pass `editable`.)

Use the shared `ProductLine` atom (N6) or, if the shared layer does not
provide it, the identical local component (5.2 fallback). Markup:

```
<li className="flex flex-col gap-4 border-t border-stroke-subtle py-6 last:border-b">
  <div className="flex items-start">
    <Link href={productHref(product)} onClick={closeCart} aria-label={product.title}
          className="flex min-w-0 flex-1 items-start gap-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <span className="relative block size-16 shrink-0 overflow-clip rounded-2xl bg-bg-product">
        <img src={product.image} alt="" loading="lazy" decoding="async"
             className={`absolute inset-0 size-full object-cover ${grey ? "grayscale" : ""}`} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`whitespace-nowrap text-[12px] font-medium uppercase leading-5 ${toneClass}`}>{statusLabel}</span>
        <span className="line-clamp-2 text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900">{product.title}</span>
        <span className="line-clamp-2 text-body-sm text-neutral-500">{meta}</span>
        {fxNote && <span className="text-[12px] leading-4 text-neutral-500">Ціна залежить від курсу</span>}
      </span>
    </Link>
    <button type="button" ref={trashRef} onClick={onRemove}
            aria-label={REMOVE_LABEL(product.title)}
            className="-mr-[10px] -mt-[10px] flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:text-brand active:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <TrashIcon className="size-6" />
    </button>
  </div>
  <div className="flex items-center justify-between gap-4">
    <QtyStepper size="xs" slot="fixed" qty={line.qty} onQty={(n) => setQty(product.id, n)} disabled={out} />
    <span className="whitespace-nowrap text-title-lg text-neutral-900">{formatPrice(lineTotal(entry, priceMode))}</span>
  </div>
</li>
```

(REMOVE_LABEL = the exact template string of CartDrawer.tsx:105, copied
verbatim - it carries the site's guillemet quotes around the title.)

Content rules:
- statusLabel / toneClass: retail: available -> "В наявності"
  `text-positive`, else "Немає в наявності" `text-negative`; partner:
  `product.preorder || !product.available` -> "Під замовлення"
  `text-negative`, else "В наявності" `text-positive` (same logic as
  StatusLine ProductCard.tsx:39-79 / B2BStatusLine
  B2BProductCard.tsx:35-74). The desktop price-type notes ("роздрібна
  ціна (i)") are dropped from phone rows (one-line eyebrow, V08 / V14);
  the partner fx note survives as the 12/16 caption (C12).
- grey = same as CartDrawer.tsx:52-53; out = `!b2b && !product.available`
  (stepper disabled, existing rule).
- meta = `(product.chips ?? [product.volume, product.brand]).join(", ")`
  -> "40 мл, ALDA hotel cosmetics" (14/20 #777779; the ", " separator is
  the desktop stock modal's "title, volume, brand" convention,
  StockModal.tsx:55-56, and keeps the source ASCII). The 36-px nowrap chips
  are NOT used on phone rows: a nowrap chip of 195 px cannot fit the 160-px
  column at 320 (F8 / V03). Volume keeps the feed spelling "40 мл".
- The whole photo + text block is ONE link (TR-07 "whole row is the
  link"), so the tap target is >= 64 x 70 (was a 27-px title link, F7);
  tapping it closes the sheet and navigates (F3).
- Trash: 44 box, glyph 24, glyph top-right aligned with the photo top and
  the right gutter (-10 px margins keep the visual 34 px). Remove ->
  focus moves to the trash of the row that takes its index, else the
  previous row's trash, else `onFocusClose()` (F12).
- Stepper (TR-15): QtyStepper `size="xs"` = count 16/22 Bold min-w 28,
  each +/- a 40 x 40 hit box that is layout-neutral (N3). Count
  `whitespace-nowrap` (existing) so "999" never splits.
- Line total: Title Large 22/28 SemiBold (D9 "amounts 22/28 SemiBold"),
  `whitespace-nowrap`.

Geometry (column width = content - 64 photo - 16 gap - 34 trash):

| Width | Content | Text column | "Шампунь для волосся і тіла" (222 px) | meta "40 мл, ALDA hotel cosmetics" (186 px) | Row height (+1 line) |
|---|---|---|---|---|---|
| 320 | 272 | 158 | 2 lines | 2 lines | 24 + 112 + 16 + 28 + 24 = 204 |
| 360 | 312 | 198 | 2 lines | 1 line | 184 |
| 375 | 327 | 213 | 2 lines | 1 line | 184 |
| 390 | 342 | 228 | 1 line | 1 line | 24 + 70 + 16 + 28 + 24 = 162 |
| 430 | 382 | 268 | 1 line | 1 line | 162 |
| 600 | 552 | 438 | 1 line | 1 line | 162 |

Row y at 390: line 1 at y 110, row 1 content y 135..261 (photo 135..199,
eyebrow 135..155, name 159..181, meta 185..205, stepper row 221..249),
next line y 273.

Price / stepper line at 320 with LONG (qty 999, "31 618,35" = 107 px):
stepper 16 + 8 + 30 + 8 + 16 = 78 + 16 + 107 = 201 <= 272: no wrap, no
sideways scroll (F8). Sum of LONG "37 343,70" (112 px) also fits (2.2.3).

#### 2.2.3 Summary bar (TR-18 dark + TR-19)

```
<div className="sticky bottom-0 mt-auto flex shrink-0 flex-col gap-4 rounded-t-[32px] bg-neutral-900 px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] [@media(max-height:499px)]:static">
  <div className="flex flex-col gap-2">   {/* SYSTEM critique round 1 (C-40, A13): SUMMARY_LABEL over SUMMARY_AMOUNT */}
    <span className="text-[14px] font-medium leading-5 text-neutral-400">Сума замовлення</span>
    <span className="whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-white">{formatPrice(subtotal)}</span>
  </div>
  {reached ? (
    <p className="flex items-center gap-2 text-body-sm font-medium text-white">
      Безкоштовна доставка <CheckCircleIcon className="size-5 shrink-0 text-positive" />
    </p>
  ) : (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-white/60">
        До безкоштовної доставки залишилось:{" "}
        <span className="whitespace-nowrap font-medium text-white">{formatPrice(remaining)}</span>
      </p>
      <PhoneMeter pct={pct} subtotal={subtotal} />
    </div>
  )}
  <div>
    <Button variant="accent" size="small" fullWidth onClick={() => { if (checkout()) router.push("/checkout"); }}>
      Оформити замовлення
    </Button>
  </div>
</div>
```

- PhoneMeter: `<div role="progressbar" aria-label="Прогрес до безкоштовної доставки" aria-valuemin={0} aria-valuemax={FREE_DELIVERY_THRESHOLD} aria-valuenow={Math.min(subtotal, FREE_DELIVERY_THRESHOLD)} className="relative h-2 rounded-full bg-neutral-600">`
  + fill `h-full rounded-full bg-brand` width pct% + the 16-px knob
  `absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white`
  at `clamp(8px, calc(pct% - 4px), calc(100% - 8px))` (desktop identity,
  CartDrawer.tsx:155-169). The brand sum chip, the "0" / "5 000 (i)"
  labels and the 48 truck tile are desktop-only (they caused F14 and
  most of the 336-px height, F5).
- Copy is verbatim desktop ("Сума замовлення", "До безкоштовної доставки
  залишилось:", "Безкоштовна доставка", "Оформити замовлення"); the
  forced `<br>` of the desktop is dropped (the amount is nowrap and wraps
  as a unit).
- Colours: #2d2d2f surface (footer 3111:14903, TR-18 dark; D5 sticky
  bar top r32 dark), label #8e8e8f (footer labels on dark), white/60 note.
- Button: accent, `size="small"` (42, 16/22 Medium; D8), wrapped in a
  plain `<div>` because a fullWidth Button is `flex-1` (the EmptyCart
  comment at CartDrawer.tsx:209-211).
- Heights: the note "До безкоштовної доставки залишилось: 4 810,10" + the currency sign
  measures 328-336 px (textfit.txt; the Medium amount adds ~4), so it is
  1 line at 390 (342 content) for most amounts, always 1 line at 430 /
  600, 2 lines at 320..375 (the nowrap amount moves down as a unit).
  Not reached, 1-line note: 24 + 28 + 16 + 20 + 8 + 8 + 16 + 42 + 24 =
  186; 2-line note: 206. Reached: 24 + 28 + 16 + 20 + 16 + 42 + 24 = 170.
  (was 336.5 / 312.5)
- Visible list (viewport - bar 66 - head 44 - summary): 320x568 252 px
  (1.2 rows of 204), 375x667 351 (1.9 rows of 184), 360x780 464 (2.5
  rows), 390x844 548 (3.4 rows of 162; FILLED fits without scrolling;
  528 if the note wraps), 430x932 636. Was 76 / 175 / 288 / 352 / 464
  (F5 / V01).
- Sum: label may wrap, the amount never splits (`shrink-0
  whitespace-nowrap`; F13). "Сума замовлення" 118.5 + 16 + "37 343,70"
  112 = 246 <= 272, so LONG stays on one line even at 320.
- When sticky over rows, the transparent area outside the r32 top
  corners shows the rows passing beneath (the master dark-cap overlap
  look); the list has `pb-6` so the last line clears the bar when
  scrolled to the end.

#### 2.2.4 Partner skin (C4, C12)

Identical sheet; only the row eyebrow (B2BStatusLine logic), the partner
prices (`lineTotal(entry, "partner")`, existing) and the fx caption differ.
The partner cart never opens the stock modal (checkStock partner = []), so
the CTA always hands off to /checkout.

### 2.3 Cart sheet - empty (C1, C2)

Pattern TR-24 (empty state), D7 sheet.

```
<div className="flex min-h-0 flex-1 flex-col lg:hidden">
  bar (2.1)
  <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-12">
    <div className="flex flex-col items-center text-center">
      <span className="relative flex size-[52px] items-center justify-center overflow-clip rounded-[12px] border border-stroke-default bg-white text-neutral-900">
        <CartIcon className="absolute left-[9px] top-[9px] size-[calc(100%-18px)]" />
      </span>
      <p className="mt-6 text-title-lg text-neutral-900">Кошик порожній</p>
      <p className="mt-4 max-w-[294px] text-body-sm text-neutral-500">Додайте товари до кошика, щоб оформити замовлення.</p>
      <div className="mt-8">
        <Button href="/catalog" size="small" arrow onClick={closeCart}>Переглянути каталог</Button>
      </div>
    </div>
  </div>
</div>
```

- Icon tile = the master Info icon tile (52, r12, 1-px #8e8e8f ring, glyph
  zone 34 at a fixed 9-px inset; TrustBand recipe home/TrustBand.tsx:42-54,
  D5 icon tiles r12). Title Large heading (D9), Body Small note, hug
  Button/Small (D8). The CTA keeps the desktop's accent variant (TR-24
  says solid; the cart's primary actions are brand everywhere - section 7).
- Copy verbatim from CartDrawer.tsx:201-213.
- Geometry at 390: tile y 114..166, title 190..218, note 234..274 (2 lines
  at 294 max), button 306..348; content top-aligned under the bar like
  the menu master (no vertical centring). Same at 320 (note 3 lines, +20).
- No head row, no summary in this state.

### 2.4 Stock modal on phones (S1..S8)

Shell by D7: more than 2 issues -> full-screen sheet; 1-2 issues -> short
modal card. Content blocks are identical in both shells; only the
container and the head differ. Pattern TR-17 (modals), TR-09 (sheet),
TR-18 (sticky action bar), TR-08 (lines), TR-15 (stepper).

New component `StockSheetPhone({ variant: "sheet" | "card" })` in
src/components/cart/StockSheetPhone.tsx; `StockModal` picks
`variant = issues.length > 2 ? "sheet" : "card"` when `!isDesktop`.
(SYSTEM A-9: `variant = "sheet"` for EVERY issue count; the "card" branch
described below is not built.)

#### 2.4.1 Shell

| Block | sheet (3+ issues) | card (1-2 issues) |
|---|---|---|
| Layer | `fixed inset-0 z-[60]` | `fixed inset-0 z-[60] flex items-center justify-center p-6` (24 margins -> card 342 at 390, 272 at 320) |
| Scrim | none | `absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px]` onClick = close (existing look, D7) |
| Dialog (role=dialog aria-modal aria-labelledby="stock-modal-title" tabIndex -1, ref=dialogRef) | `relative flex h-dvh w-full flex-col bg-white transition-[opacity,translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] starting:-translate-y-3 starting:opacity-0 motion-reduce:transition-none` | `relative flex max-h-[calc(100dvh-48px)] w-full flex-col overflow-hidden rounded-[32px] border border-stroke-default bg-white transition-[opacity,translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] starting:-translate-y-3 starting:opacity-0 motion-reduce:transition-none` |
| Bar | `flex h-[66px] shrink-0 items-center justify-between gap-4 pl-6 pr-3`: (SYSTEM critique round 1) `SheetBar title="Деякі товари закінчилися" shortTitle="Наявність товарів" closeLabel="Закрити перевірку наявності"` (A5: one line, short title below 375) + close button (below) | none |
| Scroller | `scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pt-6` | `scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-[23px] pt-[23px]` (24 visual incl. the 1-px ring) |
| Close button | in the bar: `flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand` + `XMarkIcon size-6`, glyph at x 342 / y 21 | in the head row (2.4.2): same classes with `size-11 -mr-[10px] -mt-[10px]`, glyph top-right at the 24 inset |
| useModalBehavior | `{ open, onClose: close, container: dialogRef, initial: closeRef }` (no inertSelector: z-[60] covers the header, aria-modal) | same |

- Motion: enter only (`starting:` = @starting-style, Tailwind 4.3). The
  dialog unmounts instantly on close, like the desktop modal.
- `close` (SYSTEM critique round 1, three cases by `issuesFrom`, 2.6):

  | issuesFrom | close does |
  |---|---|
  | "cart" | `dismissIssues()` + `openCart()` in the same handler: the cart sheet adopts the stock sheet's history entry (A4 handoff) - the user returns to the cart they were reviewing (F16) |
  | "buyNow" (PDP) | `dismissIssues()` only |
  | "checkout" (the CheckoutClient gate, checkout S15) | `dismissIssues()` only, then focus the "Кошик" h2 of CheckoutLines (`tabIndex={-1}`) with `preventScroll`; never re-opens the cart sheet over the form |
- Bar label "Кошик" (not a heading): D7 puts the sheet title in the bar;
  the dialog's real title "Деякі товари закінчилися" is the body heading
  because it is 294 px at 24/28 Bold (1 line from 342, 2 lines at 272)
  and would not fit a 66 bar at 320 (section 7).

#### 2.4.2 Head block (SYSTEM critique round 1)

```
<p className="text-body-md text-neutral-800">Схоже, поки ви збирали кошик, {soldOutPhrase(total)}. Ми підібрали схожі товари, які є в наявності.</p>
<button type="button" onClick={resolveAll} disabled={left === 0}
        className="-mb-3 -mr-2 mt-1 flex h-11 cursor-pointer items-center self-end rounded-full px-2 text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand active:text-brand disabled:cursor-default disabled:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
  Замінити всі
</button>
```

- The bar carries the dialog title (2.4.1: "Деякі товари закінчилися",
  "Наявність товарів" below 375; the dialog is labelled by the full
  title). The body starts with the intro 16/24 #343435 (TR-17
  description), 24 under the bar. No 52 brand-soft tile (a second
  icon-tile look next to the master Info tile, X9) and no body H2.
- "Замінити всі" (TR-10 text action, 16/22 Medium #4a4a4c, 44 hit,
  right-aligned) moved here from the action bar: its label 16 under the
  intro (`mt-1` + the 12 of the 44 box), the list 24 under the label (the
  ul's `mt-6`; `-mb-3` cancels the lower half of the hit box).
- Copy verbatim from StockModal.tsx:251-252 (intro) and the desktop
  "Замінити всі".

#### 2.4.3 Issue list (one container level)

`<ul className="mt-6 shrink-0 pb-6">`, issues as rows between 1-px
#d2d2d2 lines (TR-08), no grey panel, no inner cards (V11):

```
<li className="flex flex-col gap-4 border-t border-stroke-subtle py-6 last:border-b">
  <ProductLine as="div" image={issue.product.image} title={issue.product.title} meta={meta(issue.product)}
               status={{ label: "Немає в наявності", tone: "negative" }} />
  {alt ? (
    <>
      <ProductLine as="div" image={alt.image} title={alt.title} meta={meta(alt)}
                   status={{ label: "Альтернатива", tone: "brand" }} />
      <div className="flex items-center justify-between gap-4">
        <QtyStepper size="xs" slot="fixed" qty={issue.qty} onQty={(n) => setIssueQty(issue.lineId, n)} disabled={issue.resolved} />
        <span className="whitespace-nowrap text-title-lg text-neutral-900">{formatPrice(Math.round(unitPrice(alt) * issue.qty * 100) / 100)}</span>
      </div>
    </>
  ) : (
    <p className="text-body-sm text-neutral-500">Альтернативи немає</p>
  )}
  <div className="h-[42px]">
    {issue.resolved ? (
      <span className="flex h-full items-center justify-center gap-1 text-button-md text-positive">
        <CheckCircleIcon className="size-4 shrink-0" />{alt ? "Замінено" : "Видалено"}
      </span>
    ) : (
      <Button size="small" variant="outlinedDark" fullWidth onClick={() => resolveIssue(issue.lineId)}>
        {alt ? "Замінити" : "Видалити"}
      </Button>
    )}
  </div>
</li>
```

- Lines are NOT links here (the desktop MiniProduct is not a link); photo
  in colour (desktop 4329:40406). ProductLine without `href`.
- Eyebrows: sold line "Немає в наявності" negative (TR-14 status colour);
  alternative "Альтернатива" brand (D9 eyebrow 12/20 Medium uppercase
  brand) - it replaces the desktop's separate "АЛЬТЕРНАТИВА" caption +
  "В наявності" status (an alternative is always in stock), saving a line.
- Meta "40 мл, Botanica" (feed spelling with the space; the desktop
  master's "40мл" stays on desktop only; V16).
- Resolved swaps the button for the check line inside the SAME 42-px slot:
  no height change (V13). The stepper turns disabled.
- Row heights: 390 sheet (text column 262, names 1 line): 24 + 70 + 16 +
  70 + 16 + 28 + 16 + 42 + 24 = 306; 320 (column 192, names 2 lines): 24
  + 92 + 16 + 92 + 16 + 28 + 16 + 42 + 24 = 350; card at 390 (column 214):
  350.

#### 2.4.4 Sticky action bar (TR-18 white) - SYSTEM critique round 1

SHEET_FOOTER (A5) as the LAST child of the scroller, T5a footer anatomy
(status line + actions):
```
<div className="sticky bottom-0 z-[1] -mx-6 mt-auto flex shrink-0 flex-col gap-3 border-t border-stroke-subtle bg-white px-6 pt-[15px] pb-[calc(16px+env(safe-area-inset-bottom))] [@media(max-height:499px)]:static">
  <p role="status" className="text-body-sm text-neutral-500">Залишилось вирішити: <span className="whitespace-nowrap font-medium text-neutral-900">{left} з {total}</span></p>
  <div className="flex flex-col gap-2">
    <div><Button variant="outlinedDark" size="small" fullWidth href="/catalog" onClick={(e) => { e.preventDefault(); dismissIssues(); release({ navigate: "/catalog" }); }}>Повернутись до каталогу</Button></div>
    <div><Button variant="accent" size="small" fullWidth disabled={left > 0} onClick={() => { dismissIssues(); release({ navigate: "/checkout" }); }}>Оформити замовлення</Button></div>
  </div>
</div>
```

- Two actions stacked 8 apart, secondary (outlinedDark) first, primary
  (accent) last: the named A-6 exception (the full labels need ~211 px,
  more than half the row at 320 = 132). Disabled CTA = whole button
  50 % (master disabled pill).
- In-sheet navigation goes through A4 `release({ navigate })` (history
  [page, target], one Back returns to the page; never back() + push).
- Height: 1 + 15 + 20 + 12 + 42 + 8 + 42 + 16 = 156 (+ safe area) at
  every width (was 176 / 220 at 320). Visible issue area at 390 x 844:
  844 - 66 - 156 = 622; 320 x 568: 346 (61 %).
- Static below 500 px of height (the whole body scrolls to it).

#### 2.4.5 Flows

- 3 of 3 -> each "Замінити" applies the replacement (existing
  resolveIssue), counter decrements, the CTA enables at 0; "Замінити
  всі" resolves the rest and disables itself; "Оформити замовлення" ->
  /checkout with the merged replacement line; "Повернутись до каталогу"
  -> /catalog; cross / Escape (both shells) / scrim (card) -> close (2.4.1).
- Rotation across 640 while open: StockModal re-renders the other
  component (JS switch), useModalBehavior cleanup/mount hands focus over;
  issue state lives in CartProvider so nothing is lost.

### 2.5 Long-content and edge variants

- Many lines: the scroller scrolls; summary sticky; rows never scroll
  sideways (no nowrap chips; the stepper row fits 272 at qty 999).
- Long numbers: every price, count and "N з M" is `whitespace-nowrap`
  (gotcha 12, globals.css:1599 `overflow-wrap: anywhere`).
- Long names (none in the mock longer than 26 chars): name and meta clamp
  at 2 lines (`line-clamp-2`).
- Badge count > 99 in the header is the shell's job (CartTrigger "99+").
- 600 px: same sheet, content 552, everything stretches (no max-width
  column; D10 content 552 at 600).

### 2.6 Behaviour changes in CartProvider (all widths, no pixel effect)

- Close on route change: render-phase pathname compare (pattern
  Header.tsx:227-231):
  `const pathname = usePathname(); const [seenPath, setSeenPath] = useState(pathname); if (seenPath !== pathname) { setSeenPath(pathname); setOpen(false); setIssues(null); }`
  (F3: row link, history back). The phone row link also calls
  `closeCart` on click; the desktop CartRow links (CartDrawer.tsx:62-80)
  get the same `onClick={closeCart}` (behaviour only).
- `issuesFrom: "cart" | "buyNow" | "checkout"` (SYSTEM critique round 1
  adds "checkout"): set in `checkout(from = "cart")` ("cart", or
  "checkout" when called by the CheckoutClient gate) and `buyNow()`
  ("buyNow"), exposed on the context; read by
  StockSheetPhone's close (F16). The desktop dialog keeps
  `dismissIssues` (desktop behaviour unchanged).
- `itemsPhrase(n)` in cart/data.ts (Ukrainian plural, same rule as
  soldOutPhrase data.ts:107): 1 -> "1 товар", 2-4 -> "N товари", else "N
  товарів" (11-14 -> "товарів").

---------------------------------------------------------------------

## 3. Bugs to fix (merged: visual CART-Vxx + functional Fxx)

Severity = the higher of the two lenses. "Shared" = the fix lands in a
shared file (section 4); the cart build depends on it.

| id | sev | where | what | fix | file:line |
|---|---|---|---|---|---|
| CART-01 (F1) | blocker | public phone menu open, tap the cart disc (390x844) | Drawer opens BEHIND the menu (menu z-[45] > drawer z-40), header inert, burger dead; only a menu link escapes and the drawer then stays open on the next page | Phone cart layer z-[60] above menu + header (2.1); the phone CartTrigger closes the menu first (shared N2); inertSelector adds `#mobile-nav` | CartDrawer.tsx:259, 252; Header.tsx:461 (shared); PlatformHeader.tsx:63 (shared) |
| CART-02 (F2, V02) | blocker | landscape phone 568x320, 639x360 | List 0 px, summary covers title + cross, CTA below the screen inside `overflow-hidden`, unreachable | One scroller + sticky summary that turns static below 500 px height (2.2) | CartDrawer.tsx:284, 337 |
| CART-03 (V01, F5) | blocker | filled, 320x568 (also 375x667, 360x780) | 336.5-px fixed summary leaves 76 / 175 / 288 px of list (0.2 / 0.5 / 0.8 row) | Compact sticky dark bar 186/206/170 (2.2.3) + TR-08 rows 162..204 (2.2.2): 1.2 rows at 320x568, 3.2 at 390x844 | CartDrawer.tsx:337-374, 48-119 |
| CART-04 (V03, F8) | blocker | filled 320; LONG at 320 (qty 999 / 120), retail + partner | Nowrap chip "ALDA hotel cosmetics" 195 px in a 164 column runs past 320; list scrolls sideways; "+" off-screen for qty >= 100 | Phone rows show chips as one meta text line (wraps); stepper + total on their own full-width line (fits 272 at qty 999) | ProductCard.tsx:104 (ChipsRow, untouched); CartDrawer.tsx:85-101 |
| CART-05 (V04, F4) | major | close drawer / stock modal after a tap-focused opener, all phones, both skins | Page smooth-scrolls up ~437 px on every close (sticky-header opener refocused without preventScroll) | `opener.focus({ preventScroll: true })` (shared N1) | useModalBehavior.ts:78-80 |
| CART-06 (F3) | major | row title / photo tap, history back | Drawer stays open across navigation, covering the next page with html overflow locked | Close on pathname change in CartProvider + row link `onClick={closeCart}` (2.6) | CartProvider.tsx:90; CartDrawer.tsx:62-80 |
| CART-07 (V05, V19 nit, F15 minor) | major | drawer, every phone width | Squeezed 92vw side drawer (25-48 px scrim strip, 56/25 gutters, r32 tl) under a live-looking but inert header | Full-screen sheet (2.1), header covered | CartDrawer.tsx:259-299 |
| CART-08 (V06, F6) | major | drawer head, every width | 32-px cross overlaps "Очистити x" by 24 x 9 px; a slightly low tap empties the cart | Cross in the 66 bar at x 330..378 / y 9..57; "Очистити" in the head row y 66..110 (2.2.1). The confirm / undo half of F6 is NOT adopted: the root cause (overlap) is gone, the desktop master 4329:39905 has no confirm, and an undo needs a toast atom that does not exist (section 7, open point) | CartDrawer.tsx:301-309, 320-327 |
| CART-09 (F7, V12) | major | rows, sheet head, stock modal | Steppers 16x16, crosses 32x32, "Очистити" 92x22, title link 27 tall | Stepper 40 hit boxes (shared N3), crosses 48 (cart, stock sheet) / 44 (stock card), "Очистити" and "Замінити всі" 44 tall, photo+text one link (>= 64 x 70), trash 44 | ProductCard.tsx:146-168 (shared); CartDrawer.tsx:306, 323; StockModal.tsx:244 |
| CART-10 (V07, F18) | major | drawer CTA, empty CTA, modal actions | Phone "large" pill 48.5 tall, 15/22.5 weight 400 next to 42 pills | Phone subtrees use `size="small"` explicitly; D8 Button fix (shared N4) covers any remaining default-large call | CartDrawer.tsx:212, 365; StockModal.tsx:318-339 |
| CART-11 (V08) | major | drawer rows 320-390 | Rows 250-356 tall: 2-line uppercase status, 20/26 title with orphan, stacked chips, wrapped trash | TR-08 row (2.2.2) | CartDrawer.tsx:48-119 |
| CART-12 (V09, F11) | major | stock modal 390x844, 320x568 | 1497 / 1781 px card in an 810 / 534 viewport; counter and CTA never together; CTA ~690 px below; cross scrolls away | D7 sheet / card with the sticky action bar (2.4.4) and the cross in the fixed bar (sheet) | StockModal.tsx:211-340 |
| CART-13 (V10, F10) | major | stock title, 320 | "Деякі товари закінчилися" breaks mid-word ("закінчил / ися") in a 114 column | Tile above the title, title full width (2.4.2) | StockModal.tsx:227-248 |
| CART-14 (V11) | major | stock modal, all phones | Three nested containers (16 margin + ring + p24, grey r24 panel, p16 cards): content inset 57 px, 3-4 line names | One level: rows between 1-px lines on white, 24 gutters (2.4.3) | StockModal.tsx:211, 225, 268, 141 |
| CART-15 (V13) | minor | stock resolving | "Замінити" (42) -> "Замінено" (22) shrinks each card by 20 px; content jumps | Same 42-px slot for both (2.4.3) | StockModal.tsx:167-181 |
| CART-16 (V14) | minor | drawer rows + summary | Off-scale phone type (14/24 captions, 16/22 chips, 20/26 title, 3-line 14/24 note, #1d1d1f summary) | Phone typescale + #2d2d2f bar (2.2.2, 2.2.3; D9, TR-18) | CartDrawer.tsx:78-90, 337-362 |
| CART-17 (V15) | minor | empty sheet, visitor + partner | Content ends at y 377, 466 px blank, no icon, 16/22 heading | TR-24 empty state (2.3) | CartDrawer.tsx:191-218 |
| CART-18 (V16) | minor | drawer row vs stock modal vs /checkout | Three phone anatomies of one product line; "40мл" vs "40 мл" | Cart rows and stock rows share ProductLine (N6); checkout adoption is an open point (section 7) | CartDrawer.tsx:48-119; StockModal.tsx:31-68; checkout/CheckoutItems.tsx:155-186 (other area) |
| CART-19 (V17) | minor | stock counter row < 640 | "Замінити всі" always wraps under the counter | Text action beside the counter in the sticky bar: one row from 360, wraps right-aligned only at 320 (2.4.4) | StockModal.tsx:256-266 |
| CART-20 (V18, F12) | minor | after trash / "Очистити"; tap on the inert header | Focus falls to body | Focus the next / previous trash or the close button (2.2.1, 2.2.2); header is covered on phones | CartDrawer.tsx:102-109, 320-327 |
| CART-21 (F13) | minor | summary, 320, LONG | "Сума замовлення" + sum wrap; orphan currency sign | Amount `shrink-0 whitespace-nowrap` (2.2.3) | CartDrawer.tsx:339-342 |
| CART-22 (F14) | minor | summary reached, all phones | "5 000" chip runs to the screen edge, covers the ring | Phone meter has no chip (2.2.3) | CartDrawer.tsx:133-145 |
| CART-23 (F16) | minor | stock modal close | Closing the modal drops the user on the page instead of the cart | Phone close reopens the cart when the issues came from the cart (2.4.1, 2.6) | CartProvider.tsx:141-147, 191 |
| CART-24 (V20, F20 part) | nit | summary / stock bar | No env(safe-area-inset-bottom) padding | `pb-[max(24px,env(safe-area-inset-bottom))]` / `pb-[max(16px,...)]` on the sticky bars; needs D12 viewport-fit=cover (shared N5) | CartDrawer.tsx:337; StockModal.tsx:317 |
| CART-25 (F9) | major | landscape phones on the DESKTOP canvas (667x375, 844x390, 932x430) | html zoom x useFitZoom -> drawer text 4.6-7.9 px, stock modal 5.5 px | DEFERRED: >= 640 is the frozen desktop band (BRIEF, D13 "no tablet layout"). Proposal for the orchestrator in section 7 (skip the fit for `(pointer: coarse) and (max-height: 500px)`) | useFitZoom.ts:30-41 (shared) |
| CART-26 (F17, V21) | minor | partner "Оформити замовлення" -> /checkout | Partner lands on the public chrome (public header, no company chip) | NOT a cart file: PlatformChrome route list / checkout shell decision (section 7) | platform/PlatformChrome.tsx (other area) |
| CART-27 (F19) | nit | stock mock | All three sold-out lines suggest the same alternative; the 3rd has the alternative's name | NO CHANGE: by design (closest match = the same product in stock, data.ts:85-103), replacements merge on purpose (CartProvider.tsx:152-164); changing the mock would change the desktop modal content | data.ts:91-103 |
| CART-28 (F20 rest) | nit | sheet | No swipe-to-close; badge appears after hydration | NO CHANGE: no master for swipe gestures (D13: no bottom sheets); the badge is client-only by design (localStorage cart, SSR has no cart) | - |

Fixed in this area or via shared needs: CART-01..CART-24 (24). Deferred /
other area / no change: CART-25..CART-28.

---------------------------------------------------------------------

## 4. Shared needs

| # | Atom / API | Status | Proposed API and classes | Used by | Why |
|---|---|---|---|---|---|
| N1 | useModalBehavior (src/components/cart/useModalBehavior.ts - physically in the cart folder, but used by AuthDrawer, filters drawers, PreviewPanel, Modal718, WelcomeModal: shared) | exists, change | In the cleanup replace `opener.focus()` with `opener.focus({ preventScroll: true })` (:78-80). Optional hardening: if `initial.current` has no client rects (display:none), focus the first `[data-autofocus]` with client rects inside the container, else the container | cart sheet, stock sheet/card, every overlay opened from a sticky header | CART-05 (F4) page jump on close |
| N2 | Header phone CartTrigger + PlatformHeader phone CartTrigger | exists, change | Header.tsx:461 `onOpen={() => { setMobileOpen(false); openCart(); }}` (the desktop trigger at :453 unchanged); PlatformHeader.tsx:63 the same with the D1 cabinet menu state | cart open from the header while a phone menu is open | CART-01 (F1) |
| N3 | QtyStepper (src/components/catalog/ProductCard.tsx:120-170; owned by the shared layer or the catalog area) | exists, change | (a) new `size="xs"`: count `text-[16px] font-bold leading-[22px] tracking-[0.16px]` (TR-15 16/22 Bold, min-w-7 via `slot="fixed"`); (b) both buttons get layout-neutral phone hit boxes: append `max-lg:relative max-lg:-m-3 max-lg:flex max-lg:size-10 max-lg:items-center max-lg:justify-center` (40 - 2 x 12 = 16 = the glyph box, so no element moves; desktop untouched) | cart rows, stock rows; also catalog cards / PDP / checkout (D3 "stepper (TR-15 hit boxes)") | CART-09 (F7), TR-15 |
| N4 | Button (ui/Button.tsx:77-91) | decided (D8), maybe in progress (polish-p1-button) | phone strings of `large` = the `small` strings; the cart phone subtrees pass `size="small"` explicitly and do not depend on it | everywhere | CART-10 |
| N5 | Root viewport (app/layout.tsx) | decided (D12), missing | `export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" }` | sticky bars `env(safe-area-inset-bottom)` | CART-24 |
| N6 | ProductLine (TR-08 line), new `src/components/ui/ProductLine.tsx` | missing | `ProductLine({ image, title, meta, status?: { label: string; tone: "positive" \| "negative" \| "brand" \| "muted" }, note?: ReactNode, grey?: boolean, href?: string, onNavigate?: () => void, trailing?: ReactNode })`. Renders the block of 2.2.2 (photo `size-16 rounded-2xl bg-bg-product`, column `flex min-w-0 flex-1 flex-col gap-1`, eyebrow `whitespace-nowrap text-[12px] font-medium uppercase leading-5` + tone (`text-positive` / `text-negative` / `text-brand` / `text-neutral-500`), name `line-clamp-2 text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900`, meta `line-clamp-2 text-body-sm text-neutral-500`, note `text-[12px] leading-4 text-neutral-500`). With `href` the photo + column is one `Link` (`flex min-w-0 flex-1 items-start gap-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`, `aria-label={title}`, img `alt=""`), else a `div`. `trailing` renders after the block inside `flex items-start` (the cart trash). Phone-only usage (callers render it inside `lg:hidden` subtrees) | cart rows, stock rows; proposed for checkout phone cards, order-detail items, returns | CART-11, CART-14, CART-18 |
| N7 | SheetBar (TR-09 bar), new `src/components/ui/SheetBar.tsx` | missing | `SheetBar({ title: ReactNode, titleAs?: "h2" \| "p", onClose: () => void, closeRef?: Ref<HTMLButtonElement>, closeLabel?: string })` -> `<div className="flex h-[66px] shrink-0 items-center justify-between gap-4 pl-6 pr-3">` + title `min-w-0 truncate text-title-lg text-neutral-900` + close `flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand` with `XMarkIcon size-6` (glyph x 342 / y 21). The cart drawer cannot use it for its close (the drawer's single close button is shared with desktop, 2.1) but mirrors its geometry; the stock sheet uses it | stock sheet; auth / filters / preview sheets (other areas) | D7 one sheet bar everywhere |
| N8 | useMediaQuery, new `src/components/ui/useMediaQuery.ts` | missing | `useMediaQuery(query: string, serverValue = false): boolean` via useSyncExternalStore on `matchMedia(query)` (subscribe to "change"); the cart calls `useMediaQuery("(min-width: 640px)")` (same query as useFitZoom LG, so 639.5-px fractional widths cannot fall between the CSS and the JS switch) | StockModal switch | 2.0 |
| N9 | useFitZoom (src/components/cart/useFitZoom.ts, shared: the phone menu uses it) | exists, NO change in this pass | only if the orchestrator accepts the CART-25 proposal | - | CART-25 |
| N10 | Toast (TR-31) | missing, NOT required now | open point: phone add-to-cart feedback and an undo for "Очистити" | - | section 7 |

Fallbacks if the shared layer does not deliver in time (the cart build
must not block): N6 -> local `src/components/cart/PhoneLine.tsx` with the
exact classes above (later swapped for the atom); N7 -> inline bar in
StockSheetPhone with the same classes; N8 -> local hook inside
StockModal.tsx; N3 -> a local `PhoneStepper` in CartSheetPhone.tsx with
the same classes (16 glyphs from catalog/icons MinusIcon / PlusIcon,
`relative -m-3 flex size-10 items-center justify-center` buttons, 16/22
Bold count `min-w-7 text-center whitespace-nowrap`).

---------------------------------------------------------------------

## 5. Files

### 5.1 Existing files to change (cart area, disjoint)

| File | Change |
|---|---|
| src/components/cart/CartDrawer.tsx | Root z (phone z-[60], desktop lg:z-40 / lg:z-[51]); scrim `max-lg:hidden`; aside phone full-screen + motion classes with lg restorers (2.1); frame ring/radius lg-only; close button phone position + 24 glyph; `max-lg:hidden` on EmptyCart root, filled body, summary; render `<CartSheetPhone onFocusClose=... />`; inertSelector `"body > header, #mobile-nav"`; desktop CartRow links `onClick={closeCart}`; desktop row-remove focus handoff (behaviour only) |
| src/components/cart/StockModal.tsx | Split: `StockModal` switch (useMediaQuery) -> `StockDialog` (today's JSX verbatim, desktop) / `StockSheetPhone`; delete IssueCard (:137-184) and the `<ul className="lg:hidden">` (:309-313) - display:none at >= 640 today |
| src/components/cart/CartProvider.tsx | usePathname close (open + issues); `issuesFrom` state + context field; no other API change |
| src/components/cart/data.ts | `itemsPhrase(n)` helper next to soldOutPhrase |

### 5.2 New files (cart area)

| File | Content |
|---|---|
| src/components/cart/CartSheetPhone.tsx | bar, head row, rows (ProductLine + trash + stepper row), PhoneMeter, summary bar, empty state; focus handoff logic (refs by line id) |
| src/components/cart/StockSheetPhone.tsx | `variant: "sheet" \| "card"` shell, head block, issue rows, sticky action bar |
| (fallback only) src/components/cart/PhoneLine.tsx | local ProductLine if N6 is not delivered |
| audit/mobile/cart/verify-phone.mjs (audit, not src) | the verify agent's flows of section 6 (suggested name) |

### 5.3 Shared files this area needs but does NOT own (section 4)

src/components/cart/useModalBehavior.ts (N1), src/components/Header.tsx
(N2), src/components/platform/PlatformHeader.tsx (N2),
src/components/catalog/ProductCard.tsx QtyStepper (N3),
src/components/ui/Button.tsx (N4), src/app/layout.tsx (N5), new
src/components/ui/ProductLine.tsx (N6), src/components/ui/SheetBar.tsx
(N7), src/components/ui/useMediaQuery.ts (N8).

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Kit: audit/mobile/kit/phone.mjs (`openPhone(..., { touch: true })`, real
`page.tap()` - not `el.click()`, gotcha 14), widths 320x568, 360x780,
375x667, 390x844, 430x932, 600x960, landscape 568x320 and 639x360. Use
`scrollTo({ behavior: "instant" })` in scripts (gotcha 10).

### 6.1 Geometry (every width unless noted)

- Layer: fixed, z-index 60, covers 0,0..vw,vh; scrim display none; aside
  x 0, y 0, width = vw, height = window.innerHeight (dvh), border 0,
  radius 0, opacity 1 when open.
- Bar 66 tall; h2 "Кошик" 22/28 600 -0.44px at x 24; close button 48x48
  at x vw-60 .. vw-12, y 9..57; its svg 24x24 at x vw-48, y 21.
- Head row y 66..110; "6 товарів" 14/20 #777779; "Очистити" box height
  44, 16/22 500 #4a4a4c, right edge at vw-16 (glyph at vw-24).
- Rows (FILLED): first line y 110; row heights 204 (320), 184 (360, 375),
  162 (390, 430, 600) +-2; photo 64x64 r16; eyebrow 12/20 500 uppercase;
  name 16/22 700; meta 14/20 #777779; total 22/28 600; trash 44x44 with
  the glyph right edge at vw-24; stepper buttons 40x40 each, glyph 16.
- Summary: sticky, bottom = viewport bottom, background rgb(45,45,47),
  top radii 32, px 24, pt 24, heights 206 (320..375), 186 or 206 at 390
  (amount-dependent note wrap), 186 (430, 600), 170 (REACHED); CTA 42 tall, full content width, 16/22 500, brand bg.
- Visible list height (summary top - 110) >= 240 at 320x568, >= 520 at
  390x844.
- Empty: tile 52 r12 ring #8e8e8f at y 114; "Кошик порожній" 22/28;
  button 42 hug; no summary in the DOM tree that is visible.
- Stock sheet (STOCK): bar 66 ("Кошик" p + close at x 342 / y 21); tile
  52 at y 90; h2 24/28 700 one line at >= 360, two lines at 320 with no
  mid-word break (check each line box contains whole words: compare
  `Range.getClientRects()` per word); rows between 1-px #d2d2d2 lines;
  action bar sticky, 176 tall (220 at 320), CTA and counter both inside
  the viewport at 320x568 and 390x844 at every scroll position.
- Stock card (STOCK1, STOCK2): card x 24, width vw-48, r32, ring 1-px
  #8e8e8f, max-height vh-48; close 44 box, glyph top-right at the 24
  inset; action bar sticky inside the card.
- Row height before vs after "Замінити" identical (+-0).

### 6.2 DOM checks (`domChecks` with the overlay open, scoped to the
overlay and the whole page)

Expected clean: overflowX, offRight, offLeft, wideElement, hScroller,
tinyText (eyebrows are 12 = the floor), inputZoom, smallTarget (every
target >= 40; the kit threshold is 40), clippedText except
`line-clamp-2` elements flagged "(ellipsis/clamp)", brokenImage,
stretchedImage, overlapText. Expected and accepted: fixedTall for the
overlay layer itself and, at heights < 640, for the sticky summary /
action bar (TR-18 by design). LONG cart at 320: no hScroller, the "+"
of the qty-999 row inside the viewport.

### 6.3 Flows

1. Open by tapping the header cart disc (public: /catalog; partner:
   /dashboard and /catalog with seed b2b): html overflow "hidden", header
   inert, focus on "Закрити кошик" with :focus-visible false.
2. Close by the cross, Escape: html overflow restored, focus back on the
   trigger; page scrollY unchanged (scroll to 1500 first, tap-focus the
   trigger, open, close; expect 1500 +-1, both with and without focus on
   the trigger) - CART-05.
3. Stepper +/- (taps on the 40 boxes 12 px outside the glyph): qty,
   line total, subtotal, header badge update; minus disabled at 1; OUT
   line stepper disabled.
4. Trash on row 1: row removed, focus on the new row 1 trash; trash on
   the last remaining row: empty state, focus on the close button.
5. "Очистити": empty state, focus on the close button; a tap 6 px below
   the close button box does NOT clear the cart (CART-08 regression).
6. Row link tap: sheet closes, URL = product href, html overflow
   restored, no drawer on the PDP; history back: drawer closed (CART-06).
7. Menu then cart (CART-01): burger, then cart disc -> menu closed, cart
   sheet visible (elementFromPoint at the centre is inside the aside);
   close -> page at the original scroll position, body position "" .
8. Hand-off: CTA (FILLED, retail and partner) -> /checkout, drawer
   closed, overflow restored.
9. Stock: STOCK -> CTA -> sheet; 3 з 3 -> Замінити x2 -> 1 з 3 (row
   heights unchanged) -> Замінити всі -> 0 з 3, button disabled, CTA
   enabled -> /checkout with shampoo-alt-1 x 6+ merged; repeat with
   "Повернутись до каталогу" -> /catalog, cart closed; repeat and close
   with the cross -> the cart sheet re-opens (from cart); PDP shampoo-2
   "Купити зараз" -> card variant (1 issue), cross -> page, no cart.
10. STOCK2 -> card variant with 2 rows; scrim tap closes.
11. Landscape 568x320 / 639x360: cart body scrolls to the end, CTA fully
   visible and tappable; summary position static; stock sheet: action bar
   static at the end, CTA tappable.
12. Rotation 390x844 -> 844x390 with the cart open: desktop drawer
   appears, still open; back to 390x844: phone sheet.
13. Escape inside the stock sheet with no field open closes it; Tab /
   Shift+Tab stay inside the sheet and the card (trap).
14. Console: zero errors / warnings (hydration included) on every run.

### 6.4 Screenshots to view (Read tool)

390x844 and 320x568: C1, C3 (top + scrolled end), C4, C5, C6, C7, C12;
S1 top / middle / end, S2, S7, S8; 568x320 C3 + S1 end. Compare the look
against the menu shot (audit/mobile/baseline/landing-phone-menu.png) for
the bar (title / cross positions) and against the footer for the dark
bar.

### 6.5 Landing / desktop pixel guard

- `node audit/mobile/kit/baseline.mjs audit/mobile/after` then
  `node audit/mobile/kit/compare.mjs audit/mobile/baseline audit/mobile/after`:
  zero diffs in every `landing-*` shot and in
  shop-1710-cart-drawer.png, cabinet-1710-cart-drawer.png (the open
  desktop drawer) and every other `*-1710-*` / `landing-1440-*` shot.
  phone-390-* diffs from other areas are not the cart's; the CLOSED cart
  must not contribute any (it is opacity 0 / pointer-events none).
- Desktop computed-style spot check on the open drawer at 1710x1117 and
  640x900: aside left/top/width/height/border-radius/translate and the
  close button box equal to the before values.

### 6.6 Desktop stock modal before/after (not in the baseline)

The BUILD agent, before editing, shoots with the desktop kit
(audit/kit/shot.mjs or a small script) at 1710x1117, 1440x900, 1024x768
and 640x900: the drawer (B2C FILLED, partner FILLED, empty) and the stock
modal (STOCK 3 of 3, after one "Замінити", resolved) into
audit/mobile/cart/desktop-before/; the verify agent re-shoots into
desktop-after/ and runs compare.mjs: zero diffs.

---------------------------------------------------------------------

## 7. Conflicts and open points for the system spec

1. D7 stock threshold. The spec implements D7 literally (card for 1-2
   issues, sheet for 3+). Computed from the 2.4 numbers (intro 737 px =
   3 lines at 294, row 350 at a 214 column): a 1-issue card is 793-821 px
   at 390 (title 1 or 2 lines; the limit 100dvh - 48 is 796 at 844 and
   619 at 667) and a 2-issue card ~1145-1170 px, so the card scrolls
   inside on most phones anyway (the sticky action bar keeps the CTA
   reachable either way); one sheet for every count would be simpler and
   consistent. Recommendation: sheet for every count on phones (change =
   one line in StockModal's variant pick).
2. Stock sheet bar text. D7 says the sheet bar carries the title. The
   dialog title (294 px at 24/28 Bold) does not fit a 66 bar at 320, so
   the bar shows "Кошик" (the flow's context) and the real title is the
   body H2. Accept, or move the title into the bar at Title Large (265 px
   - fits from 360, 2 lines in the bar at 320).
3. ProductLine (N6) ownership and adoption. Checkout's phone cards
   (checkout/CheckoutItems.tsx:155-186: 60-px photo, "за од." meta, 52
   trash) and order-detail / returns items should use the same atom
   (CART-18); the checkout spec decides; until then two anatomies remain
   (cart/stock vs checkout).
4. QtyStepper (N3) lives in the catalog area's ProductCard.tsx; the
   change is layout-neutral but touches every stepper on phones - the
   system spec must assign it to ONE owner (shared layer recommended).
5. useModalBehavior / useFitZoom live in src/components/cart/ but are
   shared infrastructure; their edits (N1) belong to the shared layer.
6. Shell specs: N2 needs the phone CartTrigger in Header.tsx and in the
   D1 cabinet header to close the phone menu; the cabinet menu overlay
   needs an id (proposal `#platform-mobile-nav`) appended to the cart's
   inertSelector. Both menus sit at z-[45] under the z-50 header; the
   cart sheet at z-[60] is above both.
7. CART-25 (F9): landscape phones >= 640 get the desktop drawer and
   modal with useFitZoom on top of the html zoom (text 4.6-7.9 px).
   Frozen band; proposal: in useFitZoom `read()`, return 1 when
   `matchMedia("(pointer: coarse) and (max-height: 500px)").matches`
   (the drawer then scrolls its list instead of shrinking). Desktop mouse
   windows unaffected; needs an orchestrator yes/no.
8. CART-26 (F17): partner hand-off to /checkout lands on the public
   chrome; checkout / PlatformChrome owners decide whether /checkout
   joins the cabinet route list for partners.
9. Add-to-cart feedback on phones: `add(id, qty, show=true)` opens the
   full-screen sheet on every card tap (desktop parity today). A TR-31
   toast ("Додано у кошик" + "Кошик" action) would be lighter on phones
   and would also host an undo for "Очистити" (CART-08 note); needs the
   shared Toast atom (N10) and a decision.
10. New copy: the head-row count "N товарів / товари / товар"
    (itemsPhrase) is a new Ukrainian string; the phone rows drop the
    "роздрібна ціна" note (kept on desktop) and turn chips into a meta
    line (the D3 catalog cards keep chips). Confirm.
11. Empty-state CTA colour: TR-24 says solid; the spec keeps accent (the
    desktop empty cart and every cart primary action are brand).
12. Safe areas: with viewport-fit=cover (N5) only the bottom inset is
    handled; landscape notch insets (left/right) are not (gutters stay
    24). Acceptable for this pass?
13. Android back with a sheet open navigates (then the sheet closes on
    the route change); a history-entry-per-sheet pattern would be a
    shared overlay decision, not done here.
14. z-[60] ties: the cart sheet shares z-60 with StockModal, WelcomeModal
    and Modal718 (portal); DOM order decides (StockModal renders after
    CartDrawer). No flow opens them together today.
