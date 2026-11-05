# Phone spec - product page (area "pdp")

Area: the product page `/catalog/[direction]/[category]/[product]` in both
skins (public B2C `PublicView`, signed-in partner `PlatformView`), below
640 px. Author: pdp spec agent, 2026-11-05. Specification only - nothing
under src/ was edited.

Inputs (all read in full): audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md
(D1-D13), audit/mobile/lang/figma-mobile-language.md (TR-01..TR-32),
audit/mobile/lang/code-mobile-recipes.md, audit/mobile/pdp/visual-report.md
(PDP-V01..V23), audit/mobile/pdp/functional-report.md (F1..F21),
docs/superpowers/specs/mobile/shell-public.md (N1..N8, PS-xx; in progress),
screenshots viewed: visual-main-390-01/02/03, visual-b2b-main-390-01,
visual-b2b-preorder-390-01, visual-b2b-main-band-card-320,
visual-main-tab-specs-390-panel, visual-main-tab-delivery-390-panel,
visual-gallery-gallery-block-390, functional-crop-promo-320-pricerow,
visual-soldout-hero-320, functional-longnotes-scent-390; product photos
probed (edge colours: hero / series / catalog shots #d5d5d5 = 213..215,
together-slippers #4e4e4e uniform, together-robe light gradient 205..229).

Source files (line numbers as of 2026-11-05):
product/ProductPageView.tsx (175 lines), product/ProductView.tsx (379),
product/BoughtTogether.tsx (164), product/ProductGridSection.tsx (119),
product/SpecTable.tsx (50), product/data.ts, catalog/ProductCard.tsx (409,
shared), catalog/B2BProductCard.tsx (306, shared), ui/Breadcrumb.tsx (52,
shared), cart/CartProvider.tsx (247, cart), cart/useModalBehavior.ts (83,
shared), ScrollUpDock.tsx (386, shell).

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
| S1 | 2.10 B2B series `phoneCard="b2b"` (C3, PDP-24) | NOT built by default: series cards keep the desktop B2C content (O-9); edited |
| S2 | 2.9 band cards with PhoneAvailability (C2) | Band and series cards use the catalog card status line (`StatusLine compactOnPhone` / B2BStatusLine phone form, A27); PhoneAvailability / PhonePrice only in the hero buy block (C-33) |
| S3 | S1 QtyStepper count (C8) | 16/22 Bold (A18); the B2B buy block passes `editable` (A-10); `label` + live count = A18 |
| S4 | 2.6 StickyBuyBar | Built on A13 StickyBar (light, `position="fixed"`, `show`); same classes; publishes `--phone-bottom-bar` |
| S5 | S4 crumbs | A19 |
| S6 | S6 CornerFab | Hidden on shop phones (C-23) |
| S7 | S7 cart contract (`buyNow`, close on route change, z-60 sheet) | Built by C-cart first; C-pdp starts after C-cart |
| S8 | S9 not-found | O-3 (not built) |
| S9 | C5 B2B white surface | Confirmed (A-11) |
| S10 | C6 B2B title | `CABINET_TITLE` (A20) |
| S11 | C7 Light + Bold H2 | Adopted for public section titles (system 3.1.1) |
| S12 | C10 promo mock stock rule | Unchanged (product question) |
| S13 | C14 z-30 sticky bar | System 3.1.5 |
| S14 | Build | C-pdp (wave 3, after C-cart; its verify after C-catalog lands the D3 cards) |
| S15 (critique round 1) | 2.4 PhotoBackdrop (blurred copy) + the multi-photo snap track | Dropped (D3; no master blurs an image; C-44). ONE static stage on phones (`max-lg:aspect-square max-lg:max-h-[342px]` added to the desktop multi stage, `object-contain` on `bg-bg-product`), switched by the thumbs (TR-30); the #d5d5d5 box shows around the square photo at 430..600; off-grey assets are re-exported onto #d5d5d5; 2.4 rewritten in place |
| S16 (critique round 1) | 2.9 WideCard photo with PhotoBackdrop | Flat `bg-bg-product` + `object-contain` (the D3 card photo); edited in place |
| S17 (critique round 1) | 2.5.1 PhoneAvailability / 2.5.2 PhonePrice caption `text-[14px] font-medium uppercase leading-5` | `text-[12px] font-medium uppercase leading-5` (+ tone) - the one uppercase size on phones (system 3.1.1, C-49); edited in place |
| S18 (critique round 1) | 2.5.2 price "Stat 30/36 Bold (Cases stat 3094:5169)" | Bold per D3 until O-15; the cited node is SemiBold (do not verify the weight against it); edited in place |
| S19 (critique round 1) | 2.6 sticky bar label `truncate` ("Додати у ко..." at 320 with a 4-digit price) | Container query on the bar row (`@container`): "Додати у кошик" / `@max-[300px]:` "У кошик" (O-12), `aria-label="Додати у кошик"` on the Button; `truncate` stays as a guard only; edited in place |
| S20 (critique round 1) | 2.6 StickyBuyBar on short viewports | A13 fixed = `[@media(max-height:499px)]:hidden` (the in-flow CTA exists); when it becomes shown it scrolls the focused control into view (`block: "nearest"`, WCAG 2.4.11) |
| S21 (critique round 1) | 7 C11 PhotoBackdrop proposal | Rejected (C-44); edited in place |

---------------------------------------------------------------------

## 0. Ground rules for this area

R1. Desktop byte-identical (D12 / BRIEF). Every edit to an EXISTING
element is one of:
  (a) append `max-lg:` classes only (desktop CSS of the element unchanged);
  (b) change an unprefixed value whose property already has an `lg:`
      counterpart on the same element (the 9 cases are listed in 5.3);
  (c) wrap / hide a desktop-only block with `max-lg:hidden` and add a
      phone-only sibling with `lg:hidden`.
  New elements are phone-only (`lg:hidden`) unless stated. Buttons are
  hidden with `max-lg:hidden` / `lg:hidden`, never `hidden lg:inline-flex`
  (Button wrapper hardcodes inline-flex).
R2. Phone typescale tokens are unlayered on phones (gotcha 1): never try
  to override a `text-*` token with a `max-lg:` utility on the same
  element. Swap the token instead (`text-title-lg lg:text-title-md`) or
  use literals.
R3. Gutters 24 (`px-6`) at every width: content 272 at 320, 342 at 390,
  382 at 430, 552 at 600 (D10). Heights from the master stay fixed,
  widths stretch (language 4).
R4. Every number below is at 390 x 844 unless a width is named.

---------------------------------------------------------------------

## 1. Scope

### 1.1 Routes and seeds

| State id | URL | Seed | Skin | What it shows |
|---|---|---|---|---|
| main | /catalog/hotels/hotelna-kosmetyka/shampoo-1 | none, b2c | public | single photo, in stock, regular price, band + series |
| promo | /catalog/hotels/odnorazovi-aksesuary/shampoo-2 | none, b2c | public | sale chip, brand price + struck price, long category label, no SKU on desktop |
| soldout | /catalog/hotels/hotelni-tapochky/shampoo-3 (also /catalog/hotels/hotelna-kosmetyka/shampoo-sold-out) | none, b2c | public | "Немає в наявності", veiled photo, single "Схожі товари", "Схожі товари в наявності" section |
| gallery | /catalog/hotels/dribne-obladnannia/shampoo-4 | none, b2c | public | 4-image gallery, in stock |
| longnotes | /catalog/hotels/hotelna-kosmetyka/shampoo-long-notes | none | public | scent tab with 3-4 line values |
| textile | /catalog/hotels/hotelni-tapochky/slippers-1, /catalog/hotels/hotelnyi-tekstyl/robe-1 | none | public | non-grey product photos (slippers #4e4e4e, robe light gradient), band = [other textile, shampoo-1] |
| b2b-main | shampoo-1 URL | b2b | platform | "ваша ціна", band with B2B cards, series |
| b2b-fx | shampoo-2 URL | b2b | platform | gallery + "ціна залежить від курсу" (no sale on B2B) |
| b2b-preorder | shampoo-3 URL | b2b | platform | "Під замовлення", veiled single photo, "Схожі товари" + B2B similar cards |
| b2b-preorder-gallery | shampoo-4 URL | b2b | platform | "Під замовлення" + veiled gallery |
| 404 | /catalog/hotels/hotelna-kosmetyka/shampoo-2 (wrong category) | any | - | notFound() |

Sub-states on every product: the four info tabs (Опис, Характеристики,
Піраміда запаху, Доставка та оплата), stepper qty 1 / 10 / 100 / 1000,
sticky bar shown / hidden, gallery image 1..4, cart drawer / stock modal
opened from the page (cart area), "Схожі товари" anchor jump.

### 1.2 Unreachable states (spec still covers them)

- B2C sale + gallery: getProductDetails keeps a sale item on the single
  photo in the shop (product/data.ts, `images = evenShampoo &&
  product.oldPrice === undefined ? gallery : single`). The track still
  carries the SaleChip (2.4).
- B2C sold out + gallery: no odd/even combination produces it (shampoo-3,
  shampoo-sold-out are single). Veil per slide covers it.
- B2B "Немає в наявності": B2B maps `!available` to "Під замовлення".
- More than 4 photos: no mock product has them (thumb rule in 2.4 wraps).
- Empty band / series / similar lists: getProductDetails always returns
  2 / 8 / 4 items; guards in 2.12.
- Real iOS Safari swipe, rubber band and safe-area insets: Chromium
  emulation only (env() is 0 until N4 viewport-fit=cover lands).
- Landscape 844 x 390: that is the desktop canvas at zoom 0.586 (by
  design, D13 no tablet layout) - out of scope.

---------------------------------------------------------------------

## 2. Phone layout, block by block

### 2.0 Page map at 390 (public main, after this spec)

```
y 0      header 66 (shell-public, unchanged)                 3082:3661 / D2
y 114    crumb: back disc 40 + "Готельна косметика"         TR-05 / 3176:6558 / N1
y 202    H1 "Шампунь для волосся і тіла" 40/42, 2 lines      TR-03 / D9
y 302    "Артикул: УН-00005301" 14/20 #777779 (16 below)     TR-03 subtitle / PDP-V17
y 370    photo stage 342 x 342 r32 (48 below)                TR-30
y 744    status "В НАЯВНОСТІ" (32 below)                     2.5
y 788    caption "РОЗДРІБНА ЦІНА (i)" + price 30/36 (24)     2.5 / V13
y 872    qty row "Кількість" + stepper (24)                  TR-15
y 936    "Купити зараз" 342 x 42, 8, "Додати у кошик" 342 x 42  TR-04 / D8
y 1076   info chips (2 rows at 390, 48 below the CTAs)       TR-13 / D11
y 1204   active panel (48 below)                             TR-27 / article 3176:6110
         panel end + 60
y ~1584  "Купують разом" dark slab, r32 top, pt 60           TR-29 / dark cap 3117:14556
         2 cards, 40 / 1-px #616162 / 40, pb 120
         "З цієї серії" white r32 top, overlaps 72, pt 60    3117:14560 overlap
         4 D3 cards 24 apart, 48, centred "Перейти в каталог", pb 60   ReadAlso 3176:6216
         footer (shell)                                      3111:14902
fixed    sticky buy bar 74 (+ safe area) at the bottom       TR-18
```

Estimated page height 390: ~6 600 (today 9 893).

### 2.1 Shell

- Public skin: shell-public unchanged (header 66, footer, legal bar).
  The corner FAB is hidden on shop-canvas phones (shell-public 2.8,
  PS-04) - this page relies on it (2.6 sticky bar sits where the FAB
  was). If that decision is reverted, see shared need S6 fallback.
- B2B skin: shell-cabinet (D1): master header 66 + burger sheet, no
  side strip, legal bar footer. The PDP surface stays WHITE on B2B
  phones (not the #f5f5f5 cabinet slab): the desktop B2B PDP is white
  (4329:56628) and the page is built of its own white / dark bands
  (open point C5). No ScrollUpDock on platform routes (PlatformChrome
  does not mount it).

### 2.2 Head: crumb, title, SKU (both skins)

Pattern: article head (3176:6558 crumb, 3176:5637 title), TR-03, TR-05,
D9, D10; shell-public 2.1 / 2.4 recipe.

Geometry (390): crumb row y 114..154 (link box 40, hit 44 via
PhoneBackCrumb `before:`), 48, H1, 16, SKU caption 20, 48 to the photo.

Crumb (both skins): ONE line = PhoneBackCrumb (shared N1) to the PARENT
category: `href = /catalog/${dir.slug}/${card.slug}`, `label =
card.label`. The current crumb is never shown on phones (the H1 repeats
it). Label truncates with an ellipsis when wider than vw - 104 (e.g.
"Одноразові аксесуари та гігієнічні набори" on promo truncates at
320..430). B2B uses the same target (today "До каталогу" -> /catalog on
desktop; phones go to the category like the public skin, TR-05 parent).

Public (ProductPageView.tsx:45-78):
```tsx
<section className="flex flex-col gap-12 pt-12 lg:gap-12 lg:pt-[72px]">   {/* gap-8 -> gap-12 (5.3 #1) */}
  <ShopCrumbs back={{ href: `/catalog/${dir.slug}/${card.slug}`, label: card.label }}>
    {/* the existing desktop children of lines 52-74, unchanged */}
  </ShopCrumbs>
  <div className="flex flex-col gap-4">
    <h1 className="text-h1 text-neutral-900 max-lg:text-balance">{product.title}</h1>
    <p className="text-body-sm text-neutral-500 lg:hidden">Артикул: {details.sku}</p>
  </div>
</section>
```
- ShopCrumbs (N1) renders the phone crumb plus the desktop trail in
  `hidden flex-wrap items-center gap-4 lg:flex` = the same row as today's
  nav (desktop identical per shell-public 2.4).
- H1 40/42 Bold -0.8 (text-h1 phone token), 2 lines at 320..430
  ("Шампунь для / волосся і тіла"), 1 line at 600; balance avoids orphans.
- SKU caption = Body Small 14/20 #777779 (D9 meta), shown in EVERY state
  including promo (PDP-V17). Desktop keeps the SKU heading inside the
  description panel (2.8).
- Head -> product block: existing `mt-12 lg:mt-20` (48) at line 80.

B2B (ProductPageView.tsx:111-143):
```tsx
<section className="flex flex-col gap-6 px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8 max-lg:gap-12 max-lg:pt-12 max-lg:pb-0">
  <ShopCrumbs back={{ href: `/catalog/${dir.slug}/${card.slug}`, label: card.label }}>
    {/* existing desktop children of lines 116-134 */}
  </ShopCrumbs>
  <div className="flex flex-col gap-4">
    <h1 className="text-[30px] font-bold leading-9 tracking-[-0.6px] text-neutral-900 max-lg:text-balance lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]">
      {product.title}
    </h1>
    <p className="text-body-sm text-neutral-500 lg:hidden">Артикул: {details.sku}</p>
  </div>
</section>
<section className="px-6 pt-6 lg:pl-10 lg:pr-8 lg:pt-8 max-lg:pt-12">  {/* 48 SKU -> photo */}
```
- B2B title = H2 token values 30/36 Bold -0.6 (D9 cabinet titles, TR-03
  maps desktop 44/48 to H2 30/36); `text-[32px] ... tracking-[-0.64px]`
  -> `text-[30px] ... tracking-[-0.6px]` (5.3 #3, lg: strings present).
  2 balanced lines at 320..430.
- With D1 (no strip) the crumb sits at 66 + 48 = 114 like the public
  skin, so both skins share one head geometry except the title size.

### 2.3 Product block grid

ProductView.tsx:289: `grid gap-10 pb-[60px] lg:gap-20 ...` ->
`grid gap-8 pb-[60px] lg:gap-20 ...` (5.3 #4): photo -> status 32 (hero
body -> CTA rhythm 32, 3082:3250; today 40). Block bottom 60 = section
padding before the dark slab (language 5).

### 2.4 Gallery (TR-30, D5, PDP-V10 / F11) - SYSTEM critique round 1

Stage: 342 x 342 r32 on #d5d5d5 at 390; at 320 272 x 272; above 390 the
height is capped at 342 and the width stretches (430: 382 x 342, 600:
552 x 342) with the photo `object-contain` on `bg-bg-product`: the square
studio photo letterboxes into the box grey (D3: "object-contain on a
background that equals the photo background", "never crop a product").
No blurred backdrop (no master blurs an image; C-44). Assets that are not
shot on #d5d5d5 (robe / slippers) are re-exported onto #d5d5d5 - an asset
fix, never a runtime effect.

ONE static stage for one and for several photos (TR-30: the stage is
switched by the thumbs; no swipe track, no counter, no dots):
```tsx
<div className={`relative isolate w-full overflow-clip rounded-[32px] bg-bg-product lg:rounded-[40px] ${
  multi ? "aspect-[627/413] max-lg:aspect-square max-lg:max-h-[342px]" : "aspect-square max-h-[342px] lg:max-h-none"}`}>
  <img key={images[active]} ... className="absolute inset-0 size-full object-cover max-lg:object-contain" />
  {out && <Veil />}
  {!b2b && <SaleChip product={product} />}
</div>
```
(the desktop multi stage keeps `aspect-[627/413]` and every desktop
class; the earlier `max-lg:hidden` + phone snap track are gone; img alt =
the product title, `${product.title}, фото ${i + 1}` for i > 0.)

Thumbnails (ProductView.tsx:91-112) - ALL photos on phones, the desktop
keeps its three "not on stage" thumbs by hiding the active one at lg:
```tsx
<div className="flex flex-wrap gap-2 lg:grid lg:grid-cols-3 lg:gap-4">       {/* 5.3 #6 */}
  {images.map((src, i) => (
    <button key={src} type="button" aria-label={`Показати фото ${i + 1}`}
      aria-current={i === active ? "true" : undefined} onClick={() => select(i)}
      className={`relative isolate aspect-square w-[calc((100%-24px)/4)] max-w-16 cursor-pointer overflow-clip rounded-2xl bg-bg-product transition-opacity duration-200 hover:opacity-80 lg:w-auto lg:max-w-none lg:rounded-[40px] ${
        i === active ? "ring-1 ring-neutral-900 ring-offset-2 lg:hidden" : ""}`}>
      <img ... className="absolute inset-0 size-full object-cover" />
      {out && <Veil />}
    </button>
  ))}
</div>
```
- Thumbs 64 x 64 r16 at >= 390 (D5 photo tile 64 = r16), 62 at 320
  ((272 - 24) / 4), gap 8, 16 under the stage (existing `gap-4`). A 5th+
  photo wraps to a second row. Desktop order is unchanged: index order
  minus the active one (it is `lg:hidden`), `rounded-[24px]` ->
  `rounded-2xl` is phone-only (`lg:rounded-[40px]`).
- Current thumb: 1-px #1d1d1f ring with a 2-px white offset (the
  outlined-control ring colour of the masters), `aria-current="true"`.
  The thumb row is the only indicator (TR-29 / TR-30).
- Keys stay `src`, nothing unmounts on tap -> focus stays on the tapped
  thumb (F11). Desktop: when the tapped thumb becomes `lg:hidden`, move
  focus to the thumb that now holds the previous image (`thumbRefs
  [prevActive].focus({ preventScroll: true })`) - behaviour only.
- `select(i)` = `setActive(i)` (no track to scroll).
- Veil (mix-blend saturation) on the stage and per thumb (each box is
  `isolate`). Sale chip `absolute right-6 top-6` on the stage.
- Tapping the photo opens nothing (no lightbox in any master; page
  pinch-zoom stays available) - F11 "opens nothing" rejected, see 3.

### 2.5 Buy block (PhoneBuyBlock, new) - TR-04, TR-15, D3, D8, V13

Replaces on phones the status line + price row + CTA pair
(ProductView.tsx:301-355). The desktop block gets `max-lg:hidden` on
the `div.flex.flex-col.gap-6` at line 301; `<PhoneBuyBlock>` is its
`lg:hidden` sibling inside the same `@container` info column.

Anatomy (390, top to bottom, `flex flex-col gap-6`):

| Row | Content | Classes | Height |
|---|---|---|---|
| status | availability only (2.5.1) | PhoneAvailability | 20 (B2B fx 44) |
| price group | caption + price (2.5.2) | PhonePrice size="hero" | 60 |
| qty row (not when out) | "Кількість" left, stepper right | `flex items-center justify-between gap-4`; label `text-[14px] font-medium leading-5 text-neutral-500` with `id="pdp-qty-label"`; `<QtyStepper qty onQty labelledBy="pdp-qty-label" />` (shared S1) | 40 |
| CTA stack | in stock: "Купити зараз" (outlinedDark) then "Додати у кошик" (solid); out: "Схожі товари" | `ref={ctaRef} className="flex flex-col gap-2"`; each `<Button size="small" className="w-full [&>span]:flex-1" ...>` (menu CTA recipe Header.tsx:634); out: `<Button href="#similar" size="small" className="w-full [&>span]:flex-1">Схожі товари</Button>` | 92 / 42 |

Total 284 (in stock), 146 (out). The pair order follows TR-04 (secondary
outlinedDark first, primary solid last, 8 apart, full width 342 = menu
Button 3117:14325). "Схожі товари" is full width too: same slot, same
width in every state (fixes the ragged right-floating button, V01/F12).

Handlers (unchanged logic): "Купити зараз" -> `if (buyNow(product.id,
qty)) router.push("/checkout")`; "Додати у кошик" -> `add(product.id,
qty)` (drawer opens, cart area). Qty state is ProductView's single
`useState(1)` shared by the desktop row, the phone block and the bar.

Out states (B2C sold out, B2B "Під замовлення"): NO qty row (dead
stepper V14/F14 removed on phones), price group kept (informative),
single "Схожі товари", no sticky bar. Desktop unchanged.

#### 2.5.1 PhoneAvailability (new, product/phoneParts.tsx)

```tsx
PhoneAvailability({ product, mode = "b2c", out, tone = "dark", className })
```
- `flex flex-col gap-1`; every unit `text-[12px] font-medium uppercase
  leading-5` (SYSTEM critique round 1: the one uppercase size on phones,
  12/20 Medium = D9 eyebrow / status line, master 3176:5546; the same as
  the catalog card status), no dot separators (they orphan at 320: V12).
- B2C: `out ? "Немає в наявності" (text-negative) : "В наявності"
  (text-positive)`.
- B2B: preorder -> `Під замовлення` + `InfoCircleIcon size-4` in
  text-negative (`flex items-center gap-1`); else "В наявності"
  text-positive and, when `product.fxPrice`, a second line `ціна
  залежить від курсу` + info glyph in text-neutral-500 (tone light:
  text-white).
- The price-type note ("роздрібна ціна") does NOT live here on phones;
  it is the caption above the price (V13: one pattern for both skins).

#### 2.5.2 PhonePrice (new, product/phoneParts.tsx)

```tsx
PhonePrice({ product, mode = "b2c", tone = "dark", size = "hero" | "card" })
```
- `flex flex-col gap-1`:
  - caption `flex items-center gap-1 text-neutral-500` (tone light
    `text-white`) > `text-[12px] font-medium uppercase leading-5` (SYSTEM critique round 1) text
    `роздрібна ціна` (b2c) / `ваша ціна` (b2b) + `InfoCircleIcon size-4`;
  - price line `flex flex-wrap items-baseline gap-x-2`:
    price `whitespace-nowrap text-[30px] font-bold leading-9
    tracking-[-0.6px]` (Stat 30/36 Bold per D3; the weight is open point O-15 - the Cases node 3094:5169 is SemiBold), colour
    sale `text-brand` / tone light `text-white` / else `text-neutral-900`;
    b2c value `formatPrice(product.price)`, b2b `formatPrice(b2bPrices(
    product).partner)`;
    struck (b2c sale only) `<s>` `whitespace-nowrap text-neutral-500`
    (tone light `text-neutral-400`): size hero `text-[18px] leading-[26px]
    tracking-[0.18px]` (Body Large), size card `text-[14px] leading-5`
    (D3 card value).
- Fits 272 at 320 for the promo (price ~95 + 8 + struck ~70); the
  struck price wraps under the price only if a future value is longer.
  Nothing passes x 296 at 320 at any qty (V02/F5: the stepper is no
  longer on this line).

### 2.6 Sticky buy bar (StickyBuyBar, new) - TR-18, PDP-V03 / F7

Shown only for in-stock products (not sold out / preorder: the
"Схожі товари" target is directly below the product block, TR-18
"only when the primary action would otherwise be off-screen").

```tsx
<div role="region" aria-label="Купівля товару" inert={!show}
  className={`fixed inset-x-0 bottom-0 z-30 border-t border-stroke-subtle bg-white px-6 pt-[15px]
    pb-[calc(16px+env(safe-area-inset-bottom))] transition-[opacity,translate] duration-300 ease-out
    motion-reduce:transition-none lg:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}>
  <div className="@container flex items-center gap-4">
    <div className="flex shrink-0 flex-col">
      <span className={`whitespace-nowrap text-title-lg ${sale ? "text-brand" : "text-neutral-900"}`}>{price}</span>
      <span className="whitespace-nowrap text-[12px] leading-4 text-neutral-500">Кількість: {qty}</span>
    </div>
    <Button size="small" fullWidth aria-label="Додати у кошик" className="[&>span]:min-w-0 [&>span]:truncate"
      onClick={() => add(product.id, qty)}>
      <span className="@max-[300px]:hidden">Додати у кошик</span>
      <span className="hidden @max-[300px]:inline">У кошик</span>   {/* SYSTEM critique round 1 */}
    </Button>
    {/* fullWidth = wrapper `flex w-full min-w-0 flex-1` + pill flex-1 (row container,
        Button.tsx:226-227); the column stacks in 2.5 use `w-full [&>span]:flex-1` instead */}
  </div>
</div>
```
- Geometry: 1 + 15 + 42 + 16 = 74 (+ safe area); white, 1-px #d2d2d2
  top line (menu divider), px 24, pt 16 visual (stroke inside), pb 16 +
  `env(safe-area-inset-bottom)` (D12, N4). Price = Title Large 22/28
  SemiBold -0.44 (D9 amounts; promo brand, no struck price); caption 12/16
  #777779 (D9 captions). Button/Small 42 solid, fills the rest (D8):
  342 - 16 - ~82 = ~244 at 390, ~174 at 320 (label needs ~168; the pill
  truncates instead of overflowing for 4-digit qty captions).
  B2B: price = partner price, same caption.
- Visibility (`show`), IntersectionObserver only (no scroll-linked
  positioning; memory rule "no scroll-linked fixed on touch"):
  - `ctaOut` = IO on PhoneBuyBlock's `ctaRef`, `rootMargin: "0px 0px
    -80px 0px"`, threshold 0: the in-flow CTAs count as visible only
    above the bar's top edge, so the bar fades out exactly as they
    reveal and fades in once they leave (top or bottom);
  - `endIn` = IO on the page-end sentinel `[data-pdp-end]` (2.11),
    `rootMargin: "0px 0px 100px 0px"`: hide 100 px before the page end
    so the series CTA and the footer are never covered;
  - `show = ctaOut && !endIn && !out`; SSR / first render `false`.
  - At load on every phone the in-flow CTAs are below the fold
    (y 936 at 390x844) -> the bar is visible from the first screen.
- z-30: under ScrollUpDock z-35 (hidden on shop phones), drawers / sheets
  z-40..60, phone menu z-45, header z-50 (code recipes 4 + shell-public
  2.10). The cart sheet opened from the bar covers it.
- No bottom padding reservation: the bar hides before the page end, so
  no control is ever permanently under it (TR-18 reservation not needed).
- Focus: the bar is `inert` while hidden; when the drawer it opened
  closes, focus returns to the fixed bar button without scrolling.
- Lives in ProductView (needs qty / add); rendered `lg:hidden`.

### 2.7 Info chips (former tab strip) - TR-13, D11, PDP-V04 / F13

Same tablist, phone look of the blog filter chips (3176:5478): 36 tall,
r60, 14/20 Medium, gap 8, wrapping, left-aligned. 2 rows at 390 (Опис +
Характеристики / Піраміда запаху + Доставка та оплата), 3 rows at 320.
48 below the CTA stack (existing `mt-12`), 48 to the panel (existing).

ProductView.tsx Tabs (121-153), appended classes only:
- wrapper 123: `+ max-lg:after:hidden` (no 1-px rule on phones);
- tablist 127: `+ max-lg:flex-wrap max-lg:gap-2 max-lg:overflow-visible`;
- tab 140: `+ max-lg:relative max-lg:inline-flex max-lg:h-9 max-lg:items-center
  max-lg:rounded-[60px] max-lg:border max-lg:px-[15px] max-lg:py-0
  max-lg:text-[14px] max-lg:leading-5 max-lg:after:absolute
  max-lg:after:inset-x-0 max-lg:after:-inset-y-1
  max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2
  max-lg:focus-visible:ring-brand max-lg:focus-visible:ring-offset-2`
  (px 15 + 1-px border = master 16; hit area 44 via the after box, the
  8-px row gap is split 4 / 4 so neighbours never overlap);
- selected 142: `+ max-lg:bg-brand max-lg:text-white` (border-brand is
  already there); unselected 143: `+ max-lg:border-stroke-default`
  (#8e8e8f ring, text-neutral-800 #343435 already there).
- Keyboard (all widths, behaviour only): roving tabindex (`tabIndex=
  {selected ? 0 : -1}`), ArrowLeft / ArrowRight (wrap), Home / End move
  focus AND select (automatic activation); tab refs array.
- Desktop: every original class stays, so the underline strip renders
  as today.

### 2.8 Panels

All panels stay in the DOM with `hidden` (aria-controls resolve).

Description (ProductView.tsx:159-172), Body Small prose in #343435
(article prose 3176:6111):
- 162 SKU heading: `+ max-lg:hidden` (the SKU moved under the H1, 2.2).
- 164 "Переваги:": `text-title-md` -> `text-title-lg lg:text-title-md`
  (phone Title Large 22/28 SemiBold -0.44 = in-card section title D9 /
  article h2 3176:6110; desktop: lg:text-title-md overrides all four
  token properties -> identical; 5.3 #7).
- 165 benefits -> `<DotList items={details.benefits} className="list-disc
  ps-6 text-body-sm" />` (2.8.1).

DotList (new, product/phoneParts.tsx) - master dot list 3165:6318:
```tsx
<ul className={`${className} max-lg:flex max-lg:list-none max-lg:flex-col max-lg:gap-2 max-lg:ps-0`}>
  {items.map((t) => (
    <li key={t} className="max-lg:flex max-lg:gap-2">
      <span aria-hidden className="flex h-5 w-6 shrink-0 items-center justify-center lg:hidden">
        <span className="size-2 rounded-full bg-brand" />
      </span>
      <span>{t}</span>
    </li>
  ))}
</ul>
```
24-px dot box with an 8-px brand dot on the first line, 8 gap, items 8
apart (one-line items; the master's 16 is for two-line items). Desktop:
the same ul / li with an inline text span = identical disc list.

Characteristics / scent / delivery - SpecTable.tsx (TR-27 key / value,
footer contact row on light 3111:14916; D5 r32):
- 28 table `rounded-3xl` `+ max-lg:rounded-[32px]` (#f8f8f8 card, 342
  wide = r32).
- 32 divider `mx-4 h-[0.5px]` `+ max-lg:mx-6 max-lg:h-px` (1-px #d2d2d2
  inset 24 = the text inset; no 0.5-px lines on phones, D10).
- 34 row `px-3` -> `px-6` (5.3 #9, `lg:px-6` present) `+ max-lg:gap-2
  max-lg:py-4`.
- 36 label `+ max-lg:px-0 max-lg:py-0 max-lg:text-[14px] max-lg:leading-5
  max-lg:font-medium max-lg:text-neutral-500` (14/20 Medium #777779; the
  `labelWeight` prop stays for desktop).
- 41 value `+ max-lg:px-0 max-lg:py-0` (16/24 #1d1d1f kept, weight per
  table as on desktop).
- One-line row = 16 + 20 + 8 + 24 + 16 = 84 (today 96; 10 characteristics
  = 849 vs 965). Long values wrap; long-notes rows grow to 3-4 lines.
- Scent label (ProductView.tsx:228-231) `flex items-center gap-3` `+
  max-lg:gap-2`, icon `size-6` `+ max-lg:size-5` (brand glyph beside a
  14/20 label).
- Delivery (242-261): group stack `gap-10` `+ max-lg:gap-12` (48 big
  blocks, D10); group title 251 `text-title-md` -> `text-title-lg
  lg:text-title-md` (5.3 #7).
- Scent intro and NotesValue unchanged (the 51-px slot is already
  desktop-only).

### 2.9 "Купують разом" dark slab - TR-29, dark cap 3117:14556 / 3117:14560

BoughtTogether.tsx:
- section 41: `pb-[112px]` -> `pb-[120px]` (5.3 #8; master dark cap pb
  120 = 48 visible + 72 overlap); pt 60, px 24, r32 top, #343435 kept.
- H2 45: `<h2 ...><span className="max-lg:font-light">Купують </span>разом</h2>`
  (section 6: phone H2 mixes Light + Bold; PDP-V22). 30/36 white.
- cards stack 49: `mt-12 flex flex-col gap-10` kept (48 H2 -> cards, 40 /
  line / 40 between cards).
- divider 58: `+ max-lg:bg-neutral-600` (#616162, the dark-surface
  divider of the footer rows; PDP-V23 - note: the token in use is
  neutral-400 = #8e8e8f, not #a5a5a5 as the visual report says).

WideCard on phones = the D3 card anatomy without a ring (it sits on the
dark slab) plus the benefits list:

| Element | Phone | Code |
|---|---|---|
| photo link 99 | 342 x 206 r32 (fixed height, width stretches; D3 / card photo 206) | `+ max-lg:aspect-auto max-lg:h-[206px]` on `bg-bg-product`; child: the img with `+ max-lg:object-contain` (SYSTEM critique round 1: no PhotoBackdrop - the flat D3 card photo; robe / slippers assets re-exported onto #d5d5d5) |
| photo -> content | 24 | article `gap-6` (existing) |
| content column 114 | gaps 24 | `+ max-lg:gap-6` |
| status | availability only | wrap the existing status (116-120) in `<div className="max-lg:hidden">`; add `<PhoneAvailability product mode={b2b ? "b2b" : "b2c"} out={out} tone="light" className="lg:hidden" />` (B2B fx = 2 lines, no orphan dot: V08 / V12) |
| title, chips | Title Large 22/28 white (2 l max, existing), white-ring chips 36 | unchanged |
| benefits 127 | DotList tone white text, brand dots | `<DotList items={benefits} className="flex list-disc flex-col gap-2 ps-6 text-body-sm text-white" />` |
| price + action | price group, 16, action row | existing row 133 `+ max-lg:hidden`; add `<div className="flex flex-col gap-4 lg:hidden"><PhonePrice product mode tone="light" size="card" /><div className="flex items-center justify-between gap-4"><QtyStepper qty={qty} onQty={setQty} tone="light" disabled={out} /> {b2b ? <B2BCartButton product qty tone="light" /> : <CartButton product out tone="light" qty />}</div></div>` |

Card height 390: 206 + 24 + 20 + 16 + 28 + 16 + 36 + 24 + 76 + 24 + 60 +
16 + 52 = 598 (today 678); at 320 nothing is jammed: action row = stepper
(108) ... 52 cart with justify-between (V08 2-px gap and the B2B cart
orphan are gone). Slab at 390 ~1 540 (today 1 693).

### 2.10 "З цієї серії" / "Схожі товари в наявності" - TR-16, D3, D4, ReadAlso 3176:6216

ProductGridSection.tsx (new props `title: ReactNode` (was string),
`phoneCard?: "b2c" | "b2b"` default `card ?? mode`, `phoneLimit = 4`):
- section 55-65: `style={{ scrollMarginTop: "var(--pdp-anchor-offset, 0px)" }}`
  (replaces `scrollMarginTop: 0`) `+ max-lg:[--pdp-anchor-offset:-30px]`:
  on phones the "#similar" jump puts the section top on the 66 header
  bottom (96 scroll-padding - 30), H2 at 66 + 60 = 126 (PDP-V15; today
  156). Desktop resolves to 0px = today.
- H2 68: titles passed as nodes: `<><span className="max-lg:font-light">З цієї </span>серії</>`,
  `<>Схожі товари <span className="max-lg:font-light">в наявності</span></>` (V22).
- head-row CTA 71: `className="shrink-0 max-lg:hidden"` (heading-row CTA
  never sits under the H2 on phones, language 6).
- desktop rows container 76: `+ max-lg:hidden`.
- phone list (new, after the rows container):
  `<div className="mt-12 flex flex-col gap-6 lg:hidden">{products.slice(0, phoneLimit).map(...)}</div>`
  rendering `<B2BProductCard>` when `phoneCard === "b2b"` else
  `<ProductCard>` - the D3 phone cards supplied by the shared / catalog
  layer (S2). 4 cards (= one desktop row; the related-list master shows
  3-4), 24 apart (D3).
- phone CTA (new): `<div className="mt-12 flex justify-center lg:hidden"><Button href={cta.href} arrow size="small">{cta.label}</Button></div>`
  - centred, 48 below the list (blog "Всі статті" 3176:6216 / "Показати
  більше" 3176:5601). Labels "Перейти в каталог" / "Переглянути всі".
- section py 60 kept (pt 60 to the H2, pb 60 to the footer, D10).
- Series callers (ProductPageView.tsx:93 and :164): `-mt-[52px]` ->
  `-mt-[72px]` (5.3 #2; desktop keeps `sm:-mt-[72px]`), r32 top kept.
- (SYSTEM O-9: NOT built by default - the B2B series keeps the desktop B2C
  cards; the prop stays available if the orchestrator opts in.) B2B series
  (ProductPageView.tsx:157-165) passes `phoneCard="b2b"`: the
  phone page shows partner-price cards right under the partner-price
  hero (PDP-V19 / F17); desktop keeps `card="b2c"` (Figma 4329:56754).
  Needs sign-off (open point C3); fallback = omit the prop.
- Similar (both skins): 4 cards, "Переглянути всі". B2B preorder similar
  uses B2B cards (mode b2b, unchanged).

### 2.11 Page end and footer

- New sentinel `<div data-pdp-end aria-hidden className="lg:hidden" />`
  (0 tall) as the last child of PublicView's fragment and of
  PlatformView's column; StickyBuyBar observes it.
- Public footer / legal bar (shell-public, unchanged); B2B legal bar
  (shell-cabinet). Last block -> footer 60 (series pb 60).

### 2.12 Variants

- Loading: static mock, SSR = public skin; the B2B pre-hydration gate
  hides the page until the platform shell mounts (works, F-report
  "What works"). Photo boxes show #d5d5d5 while images load; the bar is
  hidden on the server render.
- Error: wrong-category URL -> notFound() -> the shared not-found page
  (S9; today Next's English default, F18).
- Empty (robustness guards, new): `BoughtTogether` returns null for an
  empty `items`, and the series then drops its overlap classes (pass
  `className` only when the band rendered); `ProductGridSection` returns
  null for an empty `products`; out state with no similar products hides
  "Схожі товари" (phone and desktop keep identical behaviour for the
  mock data, which never hits these).
- Long content: H1 up to 4 balanced lines at 320 (never truncated);
  crumb label ellipsis; SKU one line; status B2B fx 2 lines; price group
  wraps the struck price; qty 1000 widens the stepper inside the
  justify-between row; bar caption "Кількість: 1000" + truncating pill;
  chips wrap (3 rows at 320); long spec / notes values wrap; long chip
  labels on cards = shared ChipsRow (S2).
- Sold out / preorder: 2.5 out rules; band and series replaced by the
  similar section (existing logic).

### 2.13 Interactions

| Trigger | Result |
|---|---|
| Crumb (phone) | category page |
| Thumb tap | track scrolls (smooth, auto with reduced motion), ring moves, desktop stage keeps in sync |
| Swipe stage | snaps to the next photo, ring follows on scroll end |
| Stepper -/+ | qty 1..n (minus disabled at 1); shared by hero, bar |
| "Купити зараз" | buyNow -> /checkout, or the stock modal (cart area; promo mock F8) |
| "Додати у кошик" (block or bar) | adds qty, opens the cart sheet (cart area, D7 full-screen) |
| "Схожі товари" | smooth scroll, section top at the header bottom |
| Chip | switches the panel (no scroll); arrows / Home / End with a keyboard |
| Band / series card photo or title | that product's PDP (client nav resets gallery / tab / qty - works today) |
| Band / series cart | adds that card's qty, opens the cart sheet |
| Series CTA | direction catalog / category page |
| Back with an overlay open | overlay closes (cart area N7 / S7) |

No sheets or modals are owned by this area; no scroll lock of its own.

---------------------------------------------------------------------

## 3. Bugs to fix (both lenses merged; every finding kept)

Sources: V = visual-report PDP-Vxx, F = functional-report Fxx.

| Id | Sev | Source | Where | What | Fix | Owner |
|---|---|---|---|---|---|---|
| PDP-01 | major | V01, F12 | ProductView.tsx:330-353 | CTA pair hugs right with `ml-auto` + flex-wrap: offset 12.8 / 52.8 px from the gutter at 390 / 430, stacked ragged 149 / 168 widths at 320 / 360, lone "Схожі товари" floats right | PhoneBuyBlock CTA stack: full-width 42 pills 8 apart (TR-04), desktop block `max-lg:hidden` (2.5) | pdp |
| PDP-02 | major | V02, F5 | ProductView.tsx:313-329; ProductCard.tsx:195, 237 | Promo price + struck + hairline + stepper is one nowrap row: "+" at x 313 (17 px into the gutter) at 320, at x 325 > 320 (clipped) for qty 100 | PhonePrice (struck price wraps, no stepper on the line) + separate qty row (2.5) | pdp |
| PDP-03 | major | V03, F7 | ProductPageView.tsx:44-83; ProductView.tsx:287-354 | No buy affordance in the first screen (CTA bottom 910-976 at 390, 932 at 320x568) and none after it (9 000 px of page) | one-line crumb (2.2) + StickyBuyBar (2.6) | pdp |
| PDP-04 | major | V04, F13 | ProductView.tsx:121-153 | 568-px tab strip clipped in 272..552: labels cut mid-word, "Доставка та оплата" hidden, selected tab invisible at 320, no fade; no arrow-key navigation, every tab a tab stop | TR-13 wrapping chips + roving tabindex / arrows (2.7) | pdp |
| PDP-05 | major | V05, F15 | ProductPageView.tsx:51-75, 115-135 | 5-level crumb wraps to 3-5 rows (116 / 154 / 176 px), rows start with "/", crumb -> H1 32 / 24 | ShopCrumbs + PhoneBackCrumb to the category, 48 to the H1 (2.2) | pdp (+ shared N1) |
| PDP-06 | major | V06, F6 | ProductCard.tsx:146-169 (QtyStepper) | +/- buttons 16 x 16 on hero, band, series (22 targets per page) and in the drawer; taps 6 px off land on the row | shared S1: 40 x 40 boxes on phones; PDP consumes it | shared |
| PDP-07 | major | V07, F9 | ProductGridSection.tsx:76-115 | "З цієї серії" = 8 unbordered 612-px cards (5 502 px, 55 % of the page), CTA under the H2, card 8 straight into the footer; similar 4 cards 3 010 px | 4 D3 cards on phones + centred CTA at the end (2.10) | pdp (+ S2 cards) |
| PDP-08 | major | V08, F9 (band) | BoughtTogether.tsx:41-64, 90-160 | Band cards with 342-px square photos (678 / 888 tall), price row jammed at 320 (2-px gap), B2B cart orphaned on its own line at 320, fx status orphan dot | D3-anatomy band card: 206 photo, availability, price group, action row (2.9) | pdp |
| PDP-09 | major | V09, F20 | ProductPageView.tsx:112, 136 | B2B title 32/36 (no token) with an orphan "і тіла", crumb -> H1 24, block rhythm 24 | 30/36 (H2 values, D9) + balance, 48 rhythm (2.2) | pdp |
| PDP-10 | major | F2, V16, (V2 shell) | ScrollUpDock.tsx:55-56, 291-363 | Corner FAB (100 x 100) covers band / series cart buttons: the tap scrolls to the top, nothing added; dark ring invisible over the #343435 slab; FAB over spec text | shell-public 2.8: CornerFab hidden on shop phones (PS-04). PDP adds no control in that corner except the bar, which needs the FAB gone (S6) | shell-public |
| PDP-11 | major | F3 | CartProvider.tsx:113-125 | "Купити зараз" adds to an existing line: qty 2 twice -> checkout with 4 | buyNow sets the line to exactly `qty` (S7) | cart |
| PDP-12 | major | F1 | CartProvider.tsx:90-111; CartDrawer.tsx:255-330; StockModal.tsx:186-205 | Back leaves the drawer / stock modal open on the previous page with html overflow hidden | close overlays on pathname change (shell-public N7, S7) | cart |
| PDP-13 | major | F4 | useModalBehavior.ts:42, 78-79 | Closing a drawer opened from the header cart scrolls the page up ~437 px (`opener.focus()` + scroll-padding 96) | `focus({ preventScroll: true })` (shell-public N2) | shared |
| PDP-14 | major | F8 | cart/data.ts:63-73; ProductView.tsx:302 | Promo PDP says "В наявності" but buying it opens "Деякі товари закінчилися" (mock rule: every promo line is sold out) | DEFERRED to the system spec / product owner: the rule is the deliberate demo trigger of the stock modal (project memory "promo line = sold out") and the modal copy reads as "sold out meanwhile". Not a phone-layout defect; options listed in C10 | system |
| PDP-15 | major | F10 | CartDrawer.tsx:296-330 | Drawer at 320 x 568 leaves a 76-px item list under the dark summary | cart sheet (D7 / TR-19) | cart |
| PDP-16 | minor | V10, F11 | ProductView.tsx:51-115 | Multi-photo stage 627:413 crops 34 % of square shots (342 x 225); thumbs 103 r24 reorder after every tap, focus falls to body, no current marker, no swipe, no position cue | square stage + scroll-snap track + all thumbs 64 r16 with a ring, keyed by src (2.4). "Tap opens nothing": rejected - no lightbox exists in any master, pinch-zoom stays | pdp |
| PDP-17 | minor | V11 | SpecTable.tsx:28-46 | Label / value same 16/24 #1d1d1f, rows 96-168, 0.5-px inset dividers, r24 | TR-27 rows (2.8) | pdp |
| PDP-18 | minor | V12 | ProductCard.tsx:51-77; B2BProductCard.tsx:52-73 | Status lines wrap with an orphan dot at 320 (sold out, B2B fx hero + band) | PDP: PhoneAvailability (stacked, no dots). Catalog cards: shared S3 | pdp + shared |
| PDP-19 | minor | V13 | ProductCard.tsx:71-76 vs B2BProductCard.tsx:141-151 | Price-type note in the status line (B2C) vs above the price (B2B) | caption directly above the price in both skins (PhonePrice) | pdp |
| PDP-20 | minor | V14, F14 | ProductView.tsx:313-334; B2BProductCard.tsx:156-181 | Disabled stepper on B2C sold out; LIVE stepper on B2B preorder with no add button | no qty row in out states on phones (2.5) | pdp |
| PDP-21 | minor | V15 | ProductGridSection.tsx:62 | "#similar" lands with the H2 90 px under the bar | `--pdp-anchor-offset` -30px on phones (2.10) | pdp |
| PDP-22 | minor | V17 | ProductView.tsx:159-172, 285 | SKU is a 20/26 Bold heading and disappears on promo | SKU caption under the H1 in every state; heading `max-lg:hidden` (2.2, 2.8) | pdp |
| PDP-23 | minor | V18 | ProductView.tsx:70-73; BoughtTogether.tsx:99 | Photo heights scale with the width (552 x 552 at 600 pushes the price to the fold) | stage capped at 342, band photos fixed 206, object-contain on `bg-bg-product` (2.4, 2.9; PhotoBackdrop dropped, critique round 1) | pdp |
| PDP-24 | minor | V19, F17 | ProductPageView.tsx:157-165 | B2B page shows partner prices in hero / band and retail cards in the series | phones: `phoneCard="b2b"` (2.10); desktop unchanged (Figma). Needs sign-off C3 | pdp |
| PDP-25 | minor | V20 | heads, ProductView.tsx:289, ProductPageView.tsx:93, BoughtTogether.tsx:41, ProductGridSection.tsx:67-71 | Rhythm off the masters: crumb -> H1 32, photo -> status 40, band overlap 52, series CTA under the H2, last card -> footer 84 | 48 / 32 / 72 / CTA at the end / 60 (2.2, 2.3, 2.9, 2.10) | pdp |
| PDP-26 | minor | F16 | ProductCard.tsx:145-171 | Quantity changes silent for screen readers; stepper group unlabelled | shared S1 (`role="group"`, `aria-labelledby`, live count) + PDP label "Кількість" | shared + pdp |
| PDP-27 | minor | F15, V06 | ProductPageView.tsx:51-75 | Crumb links 22 tall; public direction crumb is a dead span; back crumb goes to Головна | phone crumb = one 40-tall back link (D8 back disc 40, hit 44 via N1) to the category. Desktop dead direction crumb: rejected (desktop frozen; Figma 4329:51347 draws it as plain text) | pdp |
| PDP-28 | minor | F18 | src/app (no not-found.tsx) | Wrong-category URL shows Next's English 404 without the site chrome | shared S9: app/not-found.tsx in Ukrainian with the normal shell | shared |
| PDP-29 | minor | F19 | platform/PlatformFooter.tsx:16-41; SideMenu.tsx | B2B legal bar copyright ends at x 346 > 320; strip 10-px labels scroll at 320 | shell-cabinet (D1 removes the strip, legal bar wraps) | shell-cabinet |
| PDP-30 | minor | F2 (also) | ScrollUpDock.tsx:352-356 | FAB shows over the #343435 band with a near-invisible ring | same as PDP-10 | shell-public |
| PDP-31 | nit | V21 | ProductView.tsx:123-127 | Tab rule / strip end at the content edge, no fade | moot: chips replace the strip on phones (2.7) | pdp |
| PDP-32 | nit | V22 | BoughtTogether.tsx:45; ProductGridSection.tsx:68 | Section H2s Bold only (masters mix Light + Bold) | phone-only `max-lg:font-light` spans (2.9, 2.10) | pdp |
| PDP-33 | nit | V23 | BoughtTogether.tsx:58 | Band divider is neutral-400 (#8e8e8f; report says #a5a5a5), masters use #616162 on dark | `max-lg:bg-neutral-600` | pdp |
| PDP-34 | nit | F21 | - | Landscape 844 x 390 renders the zoomed desktop canvas (CTAs 31 tall) | rejected: >= 640 is the desktop by design (D13, no tablet layout) | - |
| PDP-35 | minor | spec (code reading) | BoughtTogether.tsx:38-66; ProductGridSection.tsx:218-282 | Empty band / grid render a bare heading; out state with no similar products links to nothing | guards (2.12) | pdp |

Totals: 35 findings; this area fixes 23 (PDP-01..05, 07..09, 16..25,
27 (phone part), 31..33, 35); shared / other owners 10 (06, 10, 11, 12,
13, 15, 26 (shared part, the PDP adds the label), 28, 29, 30 - routed
with the exact fix); deferred 1 (14); rejected 1 (34) plus two
sub-items rejected inside PDP-16 (lightbox) and PDP-27 (desktop dead
crumb).

---------------------------------------------------------------------

## 4. Shared needs

| # | Atom / API | Status | Proposed API and classes | Why (PDP use) |
|---|---|---|---|---|
| S1 | `QtyStepper` (catalog/ProductCard.tsx:120-172) TR-15 + a11y | CHANGE (shared; also catalog, cart, checkout) | buttons `+ max-lg:-m-3 max-lg:flex max-lg:size-10 max-lg:items-center max-lg:justify-center` (40 x 40 box centred on the 16 glyph, net footprint unchanged, boxes never overlap: 28 count + 2 x 8 gaps > 24); wrapper `role="group"` + new props `label?: string` (default "Кількість") / `labelledBy?: string` -> `aria-label` / `aria-labelledby`; count `aria-live="polite" aria-atomic="true"`. Count size per TR-15 is a system decision (C8) | hero qty row, band action row, series cards (PDP-06, PDP-26) |
| S2 | D3 phone product cards: `ProductCard`, `B2BProductCard`, `CartButton`, `B2BCartButton`, `ChipsRow` long-chip truncation (`max-w-full truncate`) | CHANGE (catalog-b2c / catalog-b2b or shared layer) | D3: 1-px #343435 ring r32, photo 342 x 206 r32 object-contain on #d5d5d5, p 24, availability, Title Large 2 l, chips, price row 30/36, action row stepper + 52 brand cart disc; B2B: partner tile full width | the PDP phone list renders these unchanged (2.10); without S2 the 4 phone cards are today's 612-px cards |
| S3 | `StatusLine` / `B2BStatusLine` phone form (no orphan dot) | CHANGE (shared) | `max-lg:` stacking: units on their own lines (`max-lg:flex-col max-lg:items-start max-lg:gap-1`), dot spans `max-lg:hidden`, leading 14/20 (`max-lg:leading-5`) | catalog cards (PDP-18 outside this area); the PDP itself uses PhoneAvailability |
| S4 | `PhoneBackCrumb`, `ShopCrumbs` (ui/Breadcrumb.tsx) | NEW (shell-public N1, exact code there) | `ShopCrumbs({ back: {href,label}, label?, children })` | head of both skins (2.2) |
| S5 | Button D8 phone fix | CHANGE (shared) | as D8 | not blocking: every new phone Button here is `size="small"`; the desktop CTAs (`size="responsive"`) are hidden on phones |
| S6 | ScrollUpDock on shop phones | CHANGE (shell-public 2.8, PS-04) | CornerFab hidden below 640 on `data-canvas="shop"` pages. Fallback if rejected (TR-18 "dock sits above the bar"): pages with a sticky bottom bar set `--phone-bottom-bar: <px>` on `<html>` while the bar shows; LAYER_BOX phone bottom becomes `max-lg:bottom-[calc(20px+var(--phone-bottom-bar,0px))]` | StickyBuyBar must not sit under the FAB (PDP-10) |
| S7 | Cart contract | CHANGE (cart area, CartProvider.tsx) | (a) `buyNow(id, qty)`: `updateLines(prev => prev.some(l => l.id === id) ? prev.map(l => l.id === id ? { ...l, qty } : l) : [...prev, { id, qty }])` then the existing stock check (PDP-11); (b) close drawer + stock modal on pathname change (N7, PDP-12); (c) phone cart sheet z-60 full screen (D7, PDP-15) | "Купити зараз", "Додати у кошик" from the page and the bar |
| S8 | Root viewport + safe area | NEW (shell-public N4) | `export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" }` | StickyBuyBar `env(safe-area-inset-bottom)` |
| S9 | Not-found page | NEW (shared / system) | `src/app/not-found.tsx`: Ukrainian copy (title "Сторінку не знайдено" + Button "На головну" / "До каталогу"), rendered inside the normal chrome, phone layout = TR-24 empty state on white | PDP-28 |
| S10 | useModalBehavior preventScroll | CHANGE (shell-public N2) | `focus({ preventScroll: true })` at 42 and 78-79 | PDP-13 |
| S11 | Shared phone atoms for status / price (OFFER) | NEW, owned by this area in `product/phoneParts.tsx` | `PhoneAvailability`, `PhonePrice`, `DotList` (APIs in 2.5, 2.8; PhotoBackdrop dropped, critique round 1) | the catalog D3 cards may import PhoneAvailability / PhonePrice so the series cards and the band cards read the same (C2); the system spec may move the file to catalog/ |

Not needed by this area: full-screen Sheet (no own overlay), ListPanel /
RecordRow, LoadMore (fixed 4 cards + CTA, no paging), filter sheet,
Modal718 phone card, CabinetPageHead phone variant (the B2B PDP head is
its own markup, 2.2).

---------------------------------------------------------------------

## 5. Files

### 5.1 Existing files (this area only)

| File | Change |
|---|---|
| src/components/product/ProductPageView.tsx | ShopCrumbs (phone crumb to the category) in both skins; public head `gap-12`; H1 + SKU caption wrapper; `max-lg:text-balance`; B2B head phone rhythm + 30/36 title; series overlap `-mt-[72px]`; H2 title nodes; `phoneCard="b2b"` on the B2B series; `[data-pdp-end]` sentinel; render the band / series only when their lists are non-empty |
| src/components/product/ProductView.tsx | grid `gap-8`; Gallery (static phone stage switched by all thumbs, ring, stage cap; critique round 1: no track, no PhotoBackdrop); desktop status / price block `max-lg:hidden` + PhoneBuyBlock; StickyBuyBar; Tabs chip classes + roving tabindex; description SKU `max-lg:hidden`, "Переваги:" token swap, DotList; scent label gap / icon; delivery gap / title token swap |
| src/components/product/BoughtTogether.tsx | pb 120; H2 Light span; divider #616162; WideCard phone photo 206 + contain on `bg-bg-product`; content gap 24; PhoneAvailability; DotList; phone price group + action row; null for empty items |
| src/components/product/ProductGridSection.tsx | `title: ReactNode`; `phoneCard`, `phoneLimit`; anchor offset var; head CTA `max-lg:hidden`; desktop rows `max-lg:hidden`; phone list + centred CTA; null for empty products |
| src/components/product/SpecTable.tsx | TR-27 phone rows (r32, 1-px inset-24 dividers, 14/20 #777779 labels, py 16, gap 8) |

### 5.2 New files (this area)

| File | Content |
|---|---|
| src/components/product/phoneParts.tsx | `PhoneAvailability`, `PhonePrice`, `DotList` (PhotoBackdrop dropped, critique round 1) |
| src/components/product/PhoneBuyBlock.tsx | `PhoneBuyBlock({ product, mode, out, qty, onQty, onBuyNow, onAdd, ctaRef })` - status, price group, qty row, CTA stack (`lg:hidden`) |
| src/components/product/StickyBuyBar.tsx | `StickyBuyBar({ product, mode, qty, onAdd, ctaRef })` - fixed bar, two IntersectionObservers, `lg:hidden` |

Untouched in this area: product/data.ts, product/icons.tsx,
app/catalog/[direction]/[category]/[product]/page.tsx.

Shared / other owners (section 4, NOT this area's edit set):
catalog/ProductCard.tsx, catalog/B2BProductCard.tsx (S1, S2, S3),
ui/Breadcrumb.tsx (S4), ui/Button.tsx (S5), ScrollUpDock.tsx (S6),
cart/CartProvider.tsx, CartDrawer.tsx, StockModal.tsx (S7),
app/layout.tsx (S8), app/not-found.tsx (S9), cart/useModalBehavior.ts
(S10), cart/data.ts (C10 decision).

### 5.3 Unprefixed changes and their desktop proof (R1 b)

| # | File:line | Change | Why desktop is identical |
|---|---|---|---|
| 1 | ProductPageView.tsx:45 | `gap-8` -> `gap-12` | `lg:gap-12` on the same element |
| 2 | ProductPageView.tsx:93, 164 | `-mt-[52px]` -> `-mt-[72px]` | `sm:-mt-[72px]` (= 640+) on the same element |
| 3 | ProductPageView.tsx:136 | `text-[32px] tracking-[-0.64px]` -> `text-[30px] tracking-[-0.6px]` (leading-9 kept) | `lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]` present |
| 4 | ProductView.tsx:289 | `gap-10` -> `gap-8` | `lg:gap-20` present |
| 5 | ProductView.tsx:99 | `rounded-[24px]` -> `rounded-2xl`; add `w-[calc((100%-24px)/4)] max-w-16` | `lg:rounded-[40px] lg:w-auto lg:max-w-none` |
| 6 | ProductView.tsx:92 | `grid grid-cols-3 gap-4` -> `flex flex-wrap gap-2 lg:grid lg:grid-cols-3 lg:gap-4` | lg: restores grid / 3 cols / 16 |
| 7 | ProductView.tsx:164, 251 | `text-title-md` -> `text-title-lg lg:text-title-md` | lg:text-title-md (later in the cascade) sets size, leading, tracking and weight; both tokens define all four |
| 8 | BoughtTogether.tsx:41 | `pb-[112px]` -> `pb-[120px]` | `lg:pb-[152px]` (b2c) / `lg:pb-[136px]` (b2b) present |
| 9 | SpecTable.tsx:34 | `px-3` -> `px-6` | `lg:px-6` present |

Also unprefixed but invisible on desktop: the thumb ring classes (only
on the active thumb, which is `lg:hidden`), new `lg:hidden` elements,
ProductGridSection `scrollMarginTop` var (resolves to 0px at lg).
Builder: Tailwind v4 may skip a new arbitrary class after a batch edit -
verify computed styles, re-save or `rm -rf .next` (project memory).

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Pre-build (builder, before the first edit): shoot a desktop "before"
set into audit/mobile/pdp/desktop-before/ with audit/kit/shot.mjs or
baseline.mjs-style full-page shots: main, promo, soldout, gallery,
longnotes, slippers-1 at 640x900, 1024x768, 1440x900, 1710x1117; the
four tabs of main at 1710; b2b-main / b2b-fx / b2b-preorder /
b2b-preorder-gallery at 1024 and 1710. After the build the same set
must diff to 0 (compare.mjs).

Widths: 320x568, 360x780, 390x844, 430x932, 600x960 (touch emulation),
plus 639x900 (last phone px) and 640x900 (first desktop px).

States: every row of 1.1 (both seeds where listed) x the four tabs.

Measurements at 390 (tolerance 1 px):
- crumb row y 114, height 40, ring x 24, label 16/22 600 #343435 one
  line; promo label ends with an ellipsis at 320..430; no "/" and no
  orange crumb visible below 640.
- H1 public y 202, 40/42 700 -0.8; B2B y 202, 30/36 700 -0.6; both 2
  lines at 320..430, no single-word last line.
- SKU 16 under the H1, 14/20 #777779, present on promo.
- stage x 24, 342 x 342 r32 at 390; 272 x 272 at 320; 382 x 342 at 430;
  552 x 342 at 600; no visible band edge at 430 / 600 (sample the
  stage edge pixels: |delta| <= 3 levels vs the photo edge), slippers-1
  / robe-1 stage edges blend (blurred backdrop).
- gallery: thumbs 64 r16 gap 8 at 390, 62 at 320, 4 in one row; the
  current thumb has the 1-px #1d1d1f ring with a 2-px white offset and
  aria-current; after tapping thumb 3 the order is unchanged and focus
  is on thumb 3.
- photo -> status 32; status 20 tall (B2B fx 44, two lines, no dot);
  caption 14/20 #777779 uppercase 24 below; price 30/36 700 -0.6 (promo
  brand rgb(248,90,11) + struck 18/26 #777779); qty row 40 with the
  label left and the stepper right edge at x 366 (296 at 320); CTA
  pills 342 x 42 (272 at 320) 8 apart, outlinedDark first.
- nothing in the buy block beyond x 366 at 390 / 296 at 320 for qty 1,
  10, 100, 1000 (promo and B2B).
- out states: no stepper, one 342 x 42 "Схожі товари", no sticky bar.
- chips: 36 tall, r60, 14/20 500, active bg brand + white text, inactive
  1-px #8e8e8f ring + #343435; 2 rows at 390, 3 at 320; 48 above and
  below; tablist has no horizontal scroll (scrollWidth = clientWidth).
- spec card r32 #f8f8f8; rows 84 tall for one-line values; label 14/20
  500 #777779 at x 48; value 16/24 #1d1d1f 8 below; dividers 1 px
  #d2d2d2 from x 48 to 342.
- description "Переваги:" 22/28 600 -0.44; dot list: 8-px brand dots in
  24 boxes, text at x 56, items 8 apart.
- dark slab: pt 60, H2 white 30/36 with "Купують " in 300 and "разом" in
  700, 48 to the first card, card photo 342 x 206 r32, divider 1 px
  rgb(97,97,98), last card -> slab end 120, next section overlaps 72
  (white r32 top starts 72 above the slab end).
- band card: action row stepper left, 52 cart right (x 314..366 at
  390, 244..296 at 320); B2B price caption "ваша ціна".
- series / similar: 4 cards only, 24 apart, H2 Light/Bold mix, no CTA
  under the H2, centred CTA 48 below the last card, section ends 60
  above the footer.
- "Схожі товари" jump: section top at y 66 +-1, H2 at y 126 +-1 (both
  skins).
- sticky bar: 74 tall at y 770..844, border-top 1 px #d2d2d2, px 24,
  price 22/28 600, caption 12/16 #777779, pill 42; visible at load,
  hidden (opacity 0, inert) while the in-flow CTA stack is above the
  bar line, visible again after scrolling past it, hidden within 100 px
  of the page end and under the cart sheet; no bar in out states.

DOM checks (kit domChecks, every state x width) expected:
- 0 overflowX, offRight, offLeft, wideElement, inputZoom, overlapText,
  brokenImage, stretchedImage, clippedText (except the shell's known
  footer ring at 320 if shell-public has not fixed it), tinyText (B2B:
  0 after D1).
- smallTarget: only the logo (known false positive, shell N5) and, until
  S2 lands, catalog card title links; the info chips report 36 tall
  (master chip height; hit area 44 via `after:`) - accepted, list them.
- hScroller: exactly 1 on gallery states (the photo track, intended);
  0 on every other state (the tab strip is gone).

Flows (raw `page.touchscreen.tap`; scroll with `behavior: "instant"`):
1. main: "+" x 2 -> qty 3 in block and bar caption; bar "Додати у кошик"
   -> cart badge +3, sheet opens; close -> scrollY unchanged.
2. main: "Купити зараз" with qty 2 twice (Back between) -> checkout qty 2
   (needs S7a).
3. promo: "Купити зараз" -> stock modal (current mock, C10).
4. soldout + b2b-preorder: "Схожі товари" -> anchor numbers above.
5. gallery: tap thumb 4 -> track scrollLeft = 3 x width, ring on 4;
   CDP touch swipe right-to-left on the stage -> next photo, ring moves;
   reduced motion -> instant.
6. chips: tap each, panel switches, no page jump; keyboard ArrowRight
   from "Опис" focuses and selects "Характеристики"; Tab leaves the
   tablist after one stop.
7. bar sequence at 390x844: y 0 visible; scroll until the CTA stack is
   at y 600 -> hidden; y 1600 -> visible; scroll to bottom -> hidden;
   open the cart sheet from the bar -> sheet covers it.
8. Back with the cart sheet open -> closes (S7b).
9. B2B: same as 1 with partner prices; series phone list shows B2B
   cards (if C3 accepted).
10. no console errors on any load or flow.

Pixel guard: `node audit/mobile/kit/baseline.mjs audit/mobile/after
"shop-1710-pdp|cabinet-1710-pdp|landing"` then `node audit/mobile/kit/
compare.mjs audit/mobile/baseline audit/mobile/after` -> 0 differing
files for shop-1710-pdp-{main,promo,out,gallery}, cabinet-1710-pdp-
b2b-main and all landing shots; plus the desktop-before set above -> 0.
The phone-390-pdp-* and phone-390-cabinet-pdp-b2b-main shots are
EXPECTED to change.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

C1. Head rhythm crumb -> H1 48 (TR-03, shell-public 2.1) is adopted here;
    catalog / checkout / materials must use the same `gap-12`, otherwise
    the PDP is the odd page out.
C2. Price-type note: the PDP moves "роздрібна ціна" / "ваша ціна" from
    the status line to a caption above the price (V13). The D3 catalog
    card should do the same on phones (import PhoneAvailability /
    PhonePrice from product/phoneParts.tsx or move them to the shared
    layer); if the catalog keeps the note in the status line, the PDP
    band cards should follow the catalog and only the hero keeps the
    caption.
C3. B2B "З цієї серії" on phones uses B2B cards (partner prices) while
    the desktop keeps the Figma B2C cards - a phone/desktop content
    difference that needs the orchestrator's yes (fallback: no
    `phoneCard` prop).
C4. Corner FAB: this spec assumes shell-public 2.8 (FAB hidden on shop
    phones). If rejected, S6 fallback var is required before the bar
    ships.
C5. B2B PDP surface stays white on phones (desktop parity, dark band +
    white overlap composition) instead of D1's #f5f5f5 cabinet slab; the
    system spec should state which platform routes are "shop" (white)
    vs "cabinet" (slab) - the B2B catalog has the same question.
C6. B2B title 30/36 (H2 values) must match the B2B catalog head
    (catalog-b2b) and CabinetPageHead (shell-cabinet).
C7. Light + Bold H2 split on phones ("Купують разом", "З цієї серії",
    "Схожі товари в наявності") - adopt for every shop section H2 or
    drop here too.
C8. Stepper count: TR-15 says 16/22 Bold, the shared QtyStepper renders
    Title Large (22/28) in the hero / cards today; S1 owner decides one
    size for all steppers.
C9. B2B "Під замовлення": partners can order it from cards (orders
    glyph) but the PDP offers only "Схожі товари" (desktop master
    4329:57756). Phones follow the desktop; an order CTA is a product
    decision.
C10. PDP-14 mock stock rule (promo = sold out at checkout). Options: (a)
    keep (demo of the stock modal, current); (b) exempt lines bought
    from their own PDP; (c) show promo PDPs as "Немає в наявності" -
    product owner decides; not a phone issue.
C11. PhotoBackdrop (blurred copy behind object-contain) - REJECTED by the
    system (critique round 1, C-44): an invented image treatment; off-grey
    photos are fixed as assets (re-exported onto #d5d5d5).
C12. Spec tables stacked (TR-27, 84 per row) vs a two-column 56-px row
    for short characteristics values (965 -> 560 instead of 849): kept
    TR-27 for consistency with order / profile key-value blocks.
C13. New UI copy (needs a native check): "Кількість", "Кількість: N",
    aria "Фото товару", "Купівля товару", "<title>, фото N".
C14. z-30 sticky bar shares the level of in-page popups (catalog sort);
    no popup exists on the PDP, but the system z table should name
    "sticky bottom bars = 30".
