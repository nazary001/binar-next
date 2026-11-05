# Phone spec - shell-public (public shells on shop routes)

Area: the PUBLIC chrome wherever it wraps a shop-canvas page
(`data-canvas="shop"`): Header (66-px bar, cart disc, burger + phone menu
sheet), Footer + legal bar, scroll-up (footer ring + corner FAB),
breadcrumbs, page gutters and the page-head rhythm.

Author: spec agent shell-public, 2026-11-05. Phase 2 (spec only, nothing
under src/ edited).

Inputs (all read): audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md
(D1..D13), audit/mobile/lang/figma-mobile-language.md (TR-01..TR-32),
audit/mobile/lang/code-mobile-recipes.md, audit/mobile/shell-public/
visual-report.md (V1..V14), functional-report.md (SP-F01..SP-F23), the
shots under audit/mobile/shell-public/shots/ (viewed: visual-menu-none-
390x844, -320x568, visual-fab-covers-card-cart-390, visual-montage-crops,
visual-crop-footer-socials-320, functional-menu-then-cart-390), the
Figma dumps audit/mobile/shell-public/visual-menu-frame.txt and
audit/mobile/lang/tmp/blog-article.txt, and two read-only probes written
for this spec: audit/mobile/shell-public/spec-probe.mjs (crumb label
widths, menu stack, footer row at 320 -> out/spec-probe.json) and
spec-probe2.mjs (menu motion). shell-cabinet.md did not exist when this
was written; the system spec reconciles (section 7).

Conventions: phone = < 640 px = unprefixed classes / `max-lg:`; desktop
= `lg:` (sm/md/lg all flip at 640). "390:" = CSS px at 390 x 844 unless
noted. File:line references are as of 2026-11-05. UI strings are quoted
verbatim in Ukrainian. "Guard" = audit/mobile/kit/compare.mjs over the 76
baseline shots (audit/mobile/baseline).

Frozen surfaces this area touches: Header, Footer, ScrollUpDock are the
SAME components the landing renders (D2: "exactly as the landing").
Every change below is either (a) behaviour only, (b) pixel-neutral at the
guard (landing-phone-* incl. landing-phone-menu at 390 x 844, all
*-1710-*), or (c) scoped to `:root:has([data-canvas="shop"])` below 640
(D12). Each change says which.

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
| S1 | 2.3 PhoneMenu primitives, no fit zoom, CTA dock | Confirmed as amendment A-1 (also for the cabinet menu). The landing short-phone impact is orchestrator point O-1; fallback in system risk R7 - landing behaviour SUPERSEDED by S13 (landing-safe defaults) |
| S2 | PhoneMenuCtaDock `pb-[max(16px,env(safe-area-inset-bottom))]` | `pb-[calc(16px+env(safe-area-inset-bottom))]` (one safe-area formula, system 3.1.6, C-29); edited in place |
| S3 | N1 ShopCrumbs / PhoneBackCrumb | = atom A19, built by cluster F2 in ui/Breadcrumb.tsx; also used by the B2B catalog / PDP heads, and (PhoneBackCrumb) by CabinetPageHead |
| S4 | N2 useModalBehavior preventScroll | = A2 (adds the modal stack, `fallbackFocus`, `OVERLAY_INERT`), cluster F1 |
| S5 | N3 anchor rule, N4 viewport, N5 Logo hit | = A26 (cluster F1) |
| S6 | N7 overlay contract | cart / auth phone sheets at z-60 built with the A5 constants; close on route change AND on Back (A4 useBackToClose) |
| S7 | N8 useFitZoom floor, O10 | Not built (system O-4) - SUPERSEDED by S23 (O-4 built) |
| S8 | 2.8 CornerFab hidden on shop phones; O6 disc-only hit | Hidden confirmed (C-23); O6 not built |
| S9 | 2.10 z table | = system 3.1.5 (adds 30 sticky bars, 55 toast host) |
| S10 | O1 / O2 / O3 | Defaults accepted; orchestrator point O-1 |
| S11 | O12 SignInPrompt | Built by C-shell-cabinet (system 3.3) |
| S12 | Build | Cluster C-shell-public (wave 2a): Header.tsx, Footer.tsx, ScrollUpDock.tsx, NEW PhoneMenu.tsx |
| S13 (critique round 1) | 2.3 / O1-O3: no zoom, active rows and "Контакти" -> "#contacts" on every route incl. the landing | Landing-safe defaults until O-1: these three only when `isShopOrCabinetRoute(pathname)`; on other routes the nav stack keeps `style={{ zoom: fit }}` from `useFitZoom(706, 66, "(max-width: 639px)")` exactly as Header.tsx:518-522 today, rows are never `active`, "Контакти" = "/#contacts" (system 3.2, R7) |
| S14 (critique round 1) | 2.3 PhoneMenuRow props | + `ariaLabel?: string; ariaHaspopup?: "dialog" | "menu"` -> `aria-label` / `aria-haspopup` on the rendered Link / a / button (built in wave 2a; CabinetMenu needs them) |
| S15 (critique round 1) | 2.3 lock effect writes `documentElement.style.overflow` itself | `const release = acquireScrollLock()` in the effect, `release()` in the cleanup (A2: one refcounted owner shared with every overlay) |
| S16 (critique round 1) | 2.3 `inertSelector = "body > main, body > footer"` | MENU_INERT = `body > :not(header):not(#mobile-nav):not(#cabinet-nav):not([data-toast-host])` (also inerts the landing CornerFab / ScrollUpDock, so Tab never leaves the menu) |
| S17 (critique round 1) | 2.3 PhoneMenuCtaDock; overlay scroll padding | Dock + `[@media(max-height:499px)]:static`; the overlay gets `scroll-pb-[calc(<dock height>+16px)]` (focus not obscured) |
| S18 (critique round 1) | N3 anchor rule `:where(h1,h2,h3,h4,[id]) { scroll-margin-top: 0 }` unscoped | Scoped (D12): `@media (max-width: 639.98px) { :root:has([data-canvas=shop]) :where(h1, h2, h3, h4, [id]) { scroll-margin-top: 0; } }` - landing anchors unchanged |
| S19 (critique round 1) | N4 viewport in the root layout | Segment layouts only (A26 / A-17): the root layout exports no viewport |
| S20 (critique round 1) | Back while the menu is open (closes via the pathname change, i.e. navigates) | A4 on shop / cabinet routes: Back closes the menu (same page, same scroll); rows navigate with `release({ navigate: href })`; the cart disc hands off to the cart sheet; landing routes keep today's Back until O-1 |
| S21 (critique round 1) | Guard shots | + landing-phone-menu-hotels (/hotels 390 x 844) and landing-phone-menu-short (/ 375 x 667), shot before wave 2 from the pre-shell tree (system 6.4 step 0) |
| S22 (critique round 1) | 2.8 CornerFab position in landscape | Right offsets `max(<value>, env(safe-area-inset-right))` (O-16; env() = 0 on the guard) |
| S23 (critique round 1) | S7 / N8 useFitZoom floor | O-4 BUILT in F1 for coarse pointers with the desktop media; the phone-menu caller (`(max-width: 639px)`) is unaffected |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Routes (public chrome + shop canvas marker)

| Route | Seeds | Page owner (body) | Shell notes |
|---|---|---|---|
| /catalog | none, b2c | catalog-b2c | crumb back "Головна" |
| /catalog/hotels, /catalog/protect, /catalog/cleaning | none, b2c | catalog-b2c | crumb back "Каталог" |
| /catalog/<dir>/<cat> (e.g. hotels/hotelna-kosmetyka) | none, b2c | catalog-b2c | crumb back = direction title (long for protect/cleaning, truncates) |
| PDP: hotels/hotelna-kosmetyka/shampoo-1, odnorazovi-aksesuary/shampoo-2, hotelni-tapochky/shampoo-3, dribne-obladnannia/shampoo-4, hotelna-kosmetyka/shampoo-long-notes | none, b2c | pdp | crumb back = category label |
| /checkout (empty, with cart) | none, b2c, b2b | checkout | b2b ALSO gets the public chrome here: `PLATFORM_SECTIONS` (platform/PlatformChrome.tsx:24-33) has no checkout. Crumb back "Каталог" |
| /materials, /materials/catalogs | none, b2c | materials | crumb back "Головна" / "Матеріали" |
| /dashboard, /orders, /orders/[id], /orders/returns/[id], /profile, /assortment | none, b2c | SignInPrompt (platform/ui/SignInPrompt.tsx, shared) | public chrome, no crumb today |
| notFound() under /catalog | none | Next 404 | public chrome |

The landing routes (/, /hotels, /protect, /cleaning, /spivpratsya,
/blog, /blog/[slug]) render the same shell without the marker: frozen.

### 1.2 Shell states (all reached by the two audits unless marked)

- Header: cart empty (no badge), 1..99, "99+" (31.8 wide, fits at 320);
  visitor vs signed-in b2c vs b2b-on-/checkout - the bar is identical
  (no pill below 640, D2).
- Menu: closed; open at 320x568, 360x640, 360x780, 375x667, 390x664,
  390x750, 390x844, 412x915, 414x736, 430x932, 600x960; open on a
  scrolled page; open on its own route (/catalog, /materials); menu ->
  link; menu -> account row -> auth drawer; menu -> cart disc; logo tap
  while open; browser Back while open; Escape; burger X; rotation to
  >= 640 (closes).
- Crumbs: one per route (table 2.4); long parent labels at 320/360.
- Footer: 320 (slot overflow), 360..600 (ok), legal bar, footer ring tap.
- Scroll-up: corner FAB (visible after 0.6 viewport today; hidden on
  shop phones after this spec), footer ring.
- Overlays hosted by the header: cart drawer, auth drawer (owned by the
  cart / auth areas; contract in 2.9), drawer close focus/scroll.
- Hydration: SSR visitor shell -> client (badge appears ~10 frames
  later, no layout shift); no-JS shot (functional-ssr-catalog-390-nojs).

### 1.3 Unreachable / not testable

| State | Reason |
|---|---|
| Header "Увійти" / "Кабінет" pill | desktop nav only (Header.tsx:433-454 inside `hidden lg:flex`) |
| Real iOS Safari: rubber band, html overflow lock on Safari < 16, dvh with collapsing toolbars, safe-area insets | Chromium emulation; env() is 0 and there is no `viewport-fit=cover` yet (D12) |
| /privacy, /terms | pages do not exist (Footer.tsx:234-242 renders spans) |
| Landscape phone (844 x 390) | that is the desktop canvas (>= 640, frozen); reported as PS-20, routed |
| b2b on catalog / materials / cabinet routes | platform shell (shell-cabinet area) |
| Android hardware Back | emulated with `page.goBack()` |

---------------------------------------------------------------------

## 2. Phone layout, block by block

Top to bottom at 390 (/catalog, visitor), after this spec:

```
y 0      header bar 390 x 66, sticky z-50 (master 3082:3661)
y 114    crumb row 40 (48 under the bar)              TR-05 / 3176:6558
y 202    H1 40/42 (48 under the crumb; was 186)       TR-03 / 3176:5637
...      page body (owner areas), 24 gutters          TR-01 / D10
         last block -> footer 60                      D10
         footer 1286.4 incl. legal bar 240.6          3111:14902
```

### 2.1 Page frame, gutters, head rhythm (TR-01, TR-03, D2, D10)

Contract for every public shop page (owners apply it in their files):

- White page, no grey canvas, no extra bars (TR-01).
- Root wrapper `px-6 lg-shop-pad-x` = 24 gutters at every phone width:
  content 272 at 320, 342 at 390, 382 at 430, 552 at 600 (verified h1
  x = 24 at 320..600). Existing roots also carry `sm:px-10`, which is
  dead (`.lg-shop-pad-x` is unlayered and wins from 640); do not copy it
  into new code.
- Full-bleed exceptions: footer + legal bar (this area), PDP dark band,
  sticky bottom bars (owners, TR-18).
- Head block recipe (phone values from the article master 3176:5609:
  bar -> crumb 48, crumb -> H1 48):

  ```tsx
  <section className="flex flex-col gap-12 pt-12 lg:pt-[72px]">
    <ShopCrumbs back={{ href, label }}>{/* desktop trail, unchanged */}</ShopCrumbs>
    <h1 className="text-h1 text-neutral-900">{title}</h1>
  </section>
  ```

  Today the four heads use `gap-8 lg:gap-12` (32 on phones): change to
  `gap-12` (48 both; desktop identical). H1 = `text-h1`, 40/42 Bold
  -0.8 on phones (D9). Subtitle 16 below the H1, 14/20 #777779 (TR-03). Head ->
  first block 48 (`mt-12`). Last block -> footer 60.
- Measured on the build (unchanged): bar -> crumb 48 on every route,
  last block -> footer 60 on every route.

### 2.2 Header bar (master 3082:3661; D2 keep; TR-01)

Geometry (unchanged, verified 320..600): bar 66 tall, `px-6`; logo
100 x 33.45 at (24, 16.3); right cluster `flex items-center gap-2`:
CartTrigger 48 box (42 brand disc, badge 20 tall #1d1d1f with 1.5 white
ring, 12 Bold), then the burger 48 box with `-mr-3` so the 24 glyph sits
at x vw-48 (342 at 390, 272 at 320) / y 21. Cart box x = vw-116 (274 at
390, 204 at 320). No title, back arrow or search in the bar.

Recipe (unchanged strings): Header.tsx:333 `sticky top-0 z-50 bg-white`,
343 bar, 460 cluster, 468 burger, 112-130 CartTrigger.

Changes (behaviour only, pixel-neutral):

| # | Change | Where | Fixes |
|---|---|---|---|
| H1 | Phone CartTrigger closes the menu before opening the cart: `onOpen={() => { setMobileOpen(false); openCart(); }}`. The desktop CartTrigger (453) is untouched. | Header.tsx:461 | PS-02 |
| H2 | Logo tap closes the menu: wrap the logo as `<span className="contents" onClickCapture={closeMenu}><Logo /></span>` (display: contents keeps the flex item; Logo.tsx untouched). | Header.tsx:344 | PS-01 |
| H3 | Burger gets `ref={burgerRef}` (focus target when the sheet closes, opener for the auth drawer). | Header.tsx:462-471 | PS-10 |
| H4 | `closeMenu = useCallback(() => setMobileOpen(false), [])` - must be STABLE (it is an effect dependency of the sheet lock; an unstable callback re-runs the lock every render). | Header.tsx near 215 | - |

States: visitor and signed-in render the same bar. No hairline under the
bar (not in the master; D2).

### 2.3 Phone menu sheet (master 3117:13578 / Section_03 3117:13841; TR-09; D2)

Composition (kept exactly, D2): bar stays visible above the sheet (logo,
cart disc, burger morphs to the cross at x 342 / y 21); sheet = white
overlay under the bar; stack px 24, py 60, gap 48: group 1 = label
"Напрями" 14/20 Medium #777779 + 3 rows ("Усе для готелів", "Засоби
індивідуального захисту", "Засоби та інвентар для прибирання"); 1-px
#d2d2d2 divider; group 2 = "Каталог", "Співпраця", "Блог", "Матеріали",
"Контакти", account row ("Увійти" / "Особистий кабінет"); divider;
full-width Button/Small "Отримати пропозицію" (342 x 42, solid, no
disc). Rows 14/20 Medium #4a4a4c + 16-px arrow-up-right, pitch 52
(20 + gap 32).

Geometry at 390 x 844 (expected after the change = today, guard shot
landing-phone-menu): overlay y 66..844 (778 tall); label y 126; rows
y 178 / 230 / 282 (row boxes 20, hit boxes 52: 162..214, 214..266,
266..318); divider y 350; rows 398 / 450 / 502 / 554 / 606 / 658;
divider 726; CTA 774..816; stack 810 tall, so 32 px of the bottom
padding scrolls. The master stack is 706 (4 rows in group 2); ours has
2 more rows (Матеріали + account row, +104).

Stretch 320..639: rows always span the content width (272 at 320, 552
at 600); type stays 14/20; gutters 24. No 480 cap (today
`mx-auto max-w-[480px]` puts the rows at x 84 at 600 while the logo is
at 24 - PS-14).

Short phones (available height < 810): NO zoom. Today `useFitZoom(706,
66)` shrinks the stack (0.711 at 320x568 = 10-px type, 17-px gutters,
14-px rows) and still cuts the CTA because 706 is stale (PS-07). New:
natural 14/20 type, the overlay scrolls (`overflow-y-auto
overscroll-contain`, TR-09), and the CTA block is a sticky dock at the
sheet bottom (TR-18: the primary action would otherwise be off-screen):

- 390 x 844: dock bottom 832 < 844 -> not stuck -> pixels identical.
- 375 x 667: overlay 601; CTA stuck at 609..651 (16 above the bottom
  edge); rows scroll under the dock's white band.
- 320 x 568: overlay 502; CTA stuck at 510..552.
- Fully scrolled: the dock rests at its natural place (60 above the end).

Recipe - the menu becomes primitives in a new file
`src/components/PhoneMenu.tsx` ("use client"), consumed by Header.tsx
and (read-only) by the shell-cabinet burger sheet (D1). Exact classes
(changes vs today are marked NEW):

```tsx
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const IN = "translate-y-0 opacity-100";
const OUT_UP = "translate-y-3 opacity-0";

// Overlay + nav column + lock. Today: Header.tsx:499-522.
export function PhoneMenuSheet({ id, open, onClose, label, returnFocus,
  inertSelector = "body > main, body > footer", children }: {
  id: string; open: boolean; onClose: () => void; label: string;
  returnFocus: RefObject<HTMLElement | null>; inertSelector?: string;
  children: ReactNode;
})
// <div id={id} ref={sheetRef} aria-hidden={!open} inert={!open}
//   style={{ top: "var(--site-header-h, 92px)" }}
//   className={`fixed inset-x-0 bottom-0 z-[45] overflow-y-auto overscroll-contain bg-white
//     transition-[translate,opacity] duration-[400ms] ${EASE} motion-reduce:transition-none lg:hidden
//     ${open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"}`}>
//   <nav aria-label={label} className="flex min-h-full w-full flex-col gap-12 px-6 py-[60px]">
// NEW: transition-[translate,...] (was [transform,...]: Tailwind v4
//   translate-y-* sets the `translate` property, so the 12-px slide
//   snapped - measured 60 ms after open: opacity 0.6, translate already 0);
//   motion-reduce; no `mx-auto max-w-[480px] sm:px-10`; no style.zoom.

export function PhoneMenuGroup({ children }) // <div className="flex flex-col gap-8">

export function PhoneMenuLabel({ open, delay = 80, children })
// <p style={{ transitionDelay: open ? `${delay}ms` : "0ms" }}
//   className={`text-body-sm font-medium text-neutral-500 transition-[opacity,translate] duration-300
//     motion-reduce:transition-none ${open ? IN : OUT_UP}`}>

export function PhoneMenuRow({ open, delay, href, onClick, active = false,
  trailing = <ArrowUpRight className="size-4 shrink-0" />, className = "", children }: {
  open: boolean; delay: number; href?: string; onClick?: () => void;
  active?: boolean; trailing?: ReactNode; className?: string; children: ReactNode;
})
// Link when href starts with "/", plain <a> when it starts with "#"
// (native fragment scroll), <button type="button"> otherwise.
// className = `group/link relative flex w-full cursor-pointer items-center justify-between gap-3
//   py-4 -my-4 text-left text-body-sm font-medium transition-[color,opacity,translate] duration-300
//   active:opacity-70 motion-reduce:transition-none focus-visible:outline-2
//   focus-visible:-outline-offset-2 focus-visible:outline-brand
//   ${active ? "text-brand" : "text-neutral-700 hover:text-brand"} ${open ? IN : OUT_UP} ${className}`
// aria-current={active ? "page" : undefined}
// onClick: if href === usePathname() -> e.preventDefault() (the current
//   page's row only closes the menu, keeps the scroll); then onClick?.().
// NEW vs today: py-4 -my-4 (hit 52 on the 52 pitch, pixel-neutral),
//   gap-3 instead of gap-4 (minimum gap only; keeps the 241-px cleaning
//   label on one line at 320 without the zoom, see 2.11),
//   w-full/text-left (no visual change), active state, translate in the
//   transition list, motion-reduce, focus-visible ring.

export function PhoneMenuDivider({ open, delay })
// <div style={{ transitionDelay: open ? `${delay}ms` : "0ms" }}
//   className={`h-px w-full -mb-px bg-stroke-subtle transition-opacity duration-300
//     motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`} />

export function PhoneMenuCtaDock({ open, delay = 560, children })
// <div style={{ transitionDelay: open ? `${delay}ms` : "0ms" }}
//   className={`sticky bottom-0 z-[1] -mx-6 -my-4 bg-white px-6 pt-4
//     pb-[calc(16px+env(safe-area-inset-bottom))] transition-[opacity,translate] duration-300 ${EASE}
//     motion-reduce:transition-none ${open ? IN : OUT_UP}`}>
// NEW: sticky dock. -mx-6 / -my-4 + px-6 / pt-4 / pb-4 cancel out, so the
//   Button sits on today's pixel; the white band only shows when stuck.
//   (Today: inline transitionProperty "opacity, transform", which also
//   snapped the translate.)
```

Lock (inside PhoneMenuSheet, replaces Header.tsx:239 navigatingRef and
the body-fixed effect 267-302):

```ts
useEffect(() => {
  if (!open) return;
  const root = document.documentElement;
  const prev = root.style.overflow;
  root.style.overflow = "hidden";            // same lock as useModalBehavior: keeps scrollY + sticky
  const inerted = [...document.querySelectorAll<HTMLElement>(inertSelector)]
    .filter((el) => !el.hasAttribute("inert"));
  inerted.forEach((el) => el.setAttribute("inert", ""));
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) onClose(); };
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("keydown", onKey);
    root.style.overflow = prev;
    inerted.forEach((el) => el.removeAttribute("inert"));
    const a = document.activeElement;
    if (!a || a === document.body || sheetRef.current?.contains(a)) {
      returnFocus.current?.focus({ preventScroll: true });
    }
  };
}, [open, onClose, inertSelector, returnFocus]);
```

No scroll save / restore is needed any more: scrollY never changes
while the menu is open, so dismissing keeps the place, a link lets Next
scroll the new page to 0, and Back restores the old page's scroll
(today the body lock zeroes scrollY before the navigation and history
stores 0 - PS-05).

Header.tsx after the change (data unchanged except "Контакти"):

```tsx
const [menuPathname, setMenuPathname] = useState(pathname);
if (menuPathname !== pathname) {          // Header.tsx:227-231
  setMenuPathname(pathname);
  setCatalogOpen(false);
  setMobileOpen(false);                   // NEW: logo / Back / any route change closes the sheet
}
...
<PhoneMenuSheet id="mobile-nav" open={mobileOpen} onClose={closeMenu}
  label="Мобільна навігація" returnFocus={burgerRef}>
  <PhoneMenuGroup>
    <PhoneMenuLabel open={mobileOpen} delay={80}>Напрями</PhoneMenuLabel>
    {MOBILE_DIRECTIONS.map((s, i) => (
      <PhoneMenuRow key={s.href} href={s.href} open={mobileOpen} delay={120 + i * 50}
        active={isActiveRoute(s.href, pathname)} onClick={closeMenu}>{s.label}</PhoneMenuRow>))}
  </PhoneMenuGroup>
  <PhoneMenuDivider open={mobileOpen} delay={280} />
  <PhoneMenuGroup>
    {MOBILE_LINKS.map((l, i) => (
      <PhoneMenuRow key={l.href} href={l.href} open={mobileOpen} delay={320 + i * 50}
        active={isActiveRoute(l.href, pathname)} onClick={closeMenu}>{l.label}</PhoneMenuRow>))}
    <PhoneMenuRow open={mobileOpen} delay={320 + MOBILE_LINKS.length * 50}
      onClick={() => { burgerRef.current?.focus({ preventScroll: true }); closeMenu(); openAuth(); }}>
      {user ? "Особистий кабінет" : "Увійти"}
    </PhoneMenuRow>
  </PhoneMenuGroup>
  <PhoneMenuDivider open={mobileOpen} delay={520} />
  <PhoneMenuCtaDock open={mobileOpen} delay={560}>
    <Button href="/#contact-form" size="small" onClick={closeMenu} className="w-full [&>span]:flex-1">
      Отримати пропозицію
    </Button>
  </PhoneMenuCtaDock>
</PhoneMenuSheet>
```

- `MOBILE_LINKS` (Header.tsx:44-50): "Контакти" becomes `{ href:
  "#contacts", label: "Контакти" }` - every public page has the footer
  `id="contacts"` (Footer.tsx:57), so the row scrolls to the footer of
  the current page instead of leaving the shop for "/" (PS-22). The
  desktop `CONTACTS_LINK` (34) stays "/#contacts" (desktop frozen).
- Remove `useFitZoom` import, `menuFit`, `MOBILE_MENU_DESIGN_H`,
  `MOBILE_HEADER_H` (Header.tsx:11, 13-17, 216, 521) and `navigatingRef`
  (239, 537, 568, 631).
- Keep the auto-close at 640 (Header.tsx:309-316) and the burger morph.

Interactions:

| Action | Result |
|---|---|
| Burger | opens; burger becomes the X ("Закрити меню"); html overflow hidden; main + footer inert; rows stagger in (translate 12 -> 0 + opacity, 300 ms, delays 80..570) |
| X / Escape | closes; scroll unchanged; focus on the burger |
| Row (other route) | closes, navigates, new page at 0; Back returns to the old scroll |
| Row (current route, exact path) | closes only; scroll unchanged |
| "Контакти" | closes; smooth-scrolls to footer#contacts on the same page (target top 96 after the shared anchor rule, PS-18) |
| Account row | focus to the burger, closes, opens the auth drawer (opener = burger, so closing the drawer refocuses the burger) |
| Cart disc (bar) | closes the menu, opens the cart (H1) |
| Logo | closes; navigates to "/" (or scrolls "/" to top) |
| Browser Back while open | the pathname change closes the sheet; html lock released |
| Rotate / resize to >= 640 | closes (existing) |
| Tab while open | logo -> cart -> burger -> rows -> CTA; main / footer are inert so focus never goes behind the sheet |

z-order: header z-50 (bar stays live above the sheet), sheet z-45,
corner FAB z-35 (hidden on shop phones, 2.8). Opened from the header:
cart / auth sheets (2.9).

### 2.4 Breadcrumbs (TR-05; master 3176:6558 article crumb; D9)

Problem today: the full desktop trail wraps to 2-4 lines on phones
(category 116 tall at 320, PDP 154), the last orange crumb repeats the
H1 below it, three different wrap conventions (orphan "/" at line ends
vs lines starting with "/"), 16/22 Medium crumbs, 22-px tap heights,
catalog crumb is a plain div without aria-current (PS-08, PS-11, PS-12).

Phone crumb = ONE line, the master's Back button only: 40 ring + 16 +
parent label 16/22 SemiBold +0.16 #343435 (3176:6559 "Назад до блогу"
is 177 x 40). TR-05 allows "/ current" after it but drops it when the H1
repeats it - on every shop route the current crumb IS the H1, so the
phone crumb never shows "/ current" (one rule at all widths instead of a
second label that appears at 430 and vanishes at 320). The label is the
parent's own name (the same text as the desktop crumb it stands for).

| Route | Back href | Label | Label width (16/22 600, measured) | 320 budget 216 |
|---|---|---|---|---|
| /catalog | / | Головна | 65.3 | fits |
| /catalog/<dir> | /catalog | Каталог | 64.4 | fits |
| /catalog/hotels/<cat> | /catalog/hotels | Усе для готелів | 122.4 | fits |
| /catalog/protect/<cat> | /catalog/protect | Засоби індивідуального захисту | 258.6 | truncates at 320 / 360, fits from 390 (budget = vw - 104) |
| /catalog/cleaning/<cat> | /catalog/cleaning | Засоби та інвентар для прибирання | 285.4 | truncates up to 389, fits from 390 |
| PDP | /catalog/<dir>/<cat> | card.label (e.g. Готельна косметика 161.3, Одноразові аксесуари 179.2) | <= 216 for the mock data | fits (truncates if a label grows) |
| /checkout | /catalog | Каталог | 64.4 | fits |
| /materials | / | Головна | 65.3 | fits |
| /materials/<cat> | /materials | Матеріали | 84.2 | fits |

Note: on the category page the desktop draws the direction as plain
text (PlainCrumb), but /catalog/<dir> is a real route
(`directionCatalogHref`, catalog/data.ts:365), so the phone back link
targets it.

Atoms (shared layer, ui/Breadcrumb.tsx - section 4 N1):

```tsx
export function PhoneBackCrumb({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href}
      className={`group relative flex min-w-0 max-w-full items-center gap-4 self-start
        before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-[''] lg:hidden ${className}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[26px] border border-neutral-900
        text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand
        group-hover:text-white group-active:border-brand group-active:bg-brand group-active:text-white">
        <ArrowBack className="w-[21px]" />
      </span>
      <span className="min-w-0 truncate text-[16px] font-semibold leading-[22px] tracking-[0.16px]
        text-neutral-800 transition-colors duration-300 group-hover:text-brand">
        {label}
      </span>
    </Link>
  );
}

// One landmark for both trails. The desktop trail keeps its exact
// children; only its container moves into the inner div.
export function ShopCrumbs({ back, label = "Навігаційний ланцюжок", children }: {
  back: { href: string; label: string }; label?: string; children: ReactNode;
}) {
  return (
    <nav aria-label={label} className="flex min-w-0 flex-col">
      <PhoneBackCrumb href={back.href} label={back.label} />
      <div className="hidden flex-wrap items-center gap-4 lg:flex">{children}</div>
    </nav>
  );
}
```

Geometry at 390: row y 114..154 (link box 40, hit 44 via `before:`),
ring x 24..64, label x 80, one line at every width, ellipsis when the
label exceeds vw - 104. Desktop: the inner div is the same `flex
flex-wrap items-center gap-4` row at the same width, so the 1710 trail
renders byte-identical; the phone crumb is `display: none` from 640.

Call sites (owner areas apply; exact JSX):

| File (owner) | Today | Change |
|---|---|---|
| catalog/CatalogPageView.tsx:113-131 (catalog-b2c) | `section ... gap-8 pt-12 lg:gap-12 ...` + `div.flex.flex-wrap...` | `gap-12 pt-12 lg:pt-[72px]`; wrap the existing children in `<ShopCrumbs back={...}>` with back = root `{ "/", "Головна" }`, direction `{ "/catalog", "Каталог" }`, category `{ directionCatalogHref(page.dir), page.dir.title }`; add `aria-current="page"` to `Current` (46-52) |
| app/checkout/page.tsx:20-37 (checkout) | `nav aria-label="Навігація"` | `gap-12`; `<ShopCrumbs back={{ href: "/catalog", label: "Каталог" }}>` around the same children |
| materials/Hero.tsx:102-136 (materials) | `nav aria-label="Навігація"` | `gap-12`; back = last crumb with an href, else `{ "/", "Головна" }` (MaterialsHome: Головна; MaterialsCategory: `{ "/materials", "Матеріали" }`) |
| product/ProductPageView.tsx:45-78 (pdp) | `nav aria-label="Навігація"` | `gap-12`; back `{ `/catalog/${dir.slug}/${card.slug}`, card.label }` |

The B2B / cabinet crumbs (CatalogPageView PlatformTitle, ProductPageView
PlatformView, CabinetPageHead) belong to shell-cabinet / the cabinet
areas; PhoneBackCrumb is available to them (TR-05 is the same rule).

### 2.5 Page title (D9, TR-03)

`text-h1` 40/42 Bold -0.8 (already on all four public heads), 48 under
the crumb. Long titles wrap (PDP "Шампунь для волосся і тіла" 2 lines,
"Оформити замовлення" 2 lines at 320..430); never truncated.
`overflow-wrap: anywhere` (globals.css:1597-1602) breaks long words.

### 2.6 Footer (master 3111:14902; D2 keep)

Unchanged at 360..639 and on every landing route: #2d2d2f, inner top
r32, `px-6 pb-20 pt-10 gap-[60px]`; row 1 "Контакти" (40 SemiBold,
cap-trimmed) + "Відділ продажу" 14/20 Medium #777779; 48; socials row
(three 46 social buttons 19 apart + the 100-px footer ring slot,
`justify-between`); 60; contact rows 130 / 129 / 157 (1-px #616162
lines, 15-px padding absorbs the line); link rows 92 x 3; legal bar.
Total 1286.4 at 390 (master 1286.6).

320 fix (shop canvas only, D12 + D13): socials 176 + gap 16 + slot 100
= 292 > 272, so today the slot ends at x 316 (24-px gutter becomes 4)
and the ring is clipped by the footer `overflow-clip` (footer > div
scrollWidth 336 at 320, measured). Below 340 on shop routes: socials
gap 12, row gap 8 -> 3 x 46 + 2 x 12 + 8 + 100 = 270 <= 272 (slot ends
at 296).

- Footer.tsx:89 add `max-[339.98px]:[:root:has([data-canvas=shop])_&]:gap-2`
- Footer.tsx:90 add `max-[339.98px]:[:root:has([data-canvas=shop])_&]:gap-3`

The landing footer at 320 keeps its overflow (frozen, D13; open point
O5). "Відділ продажу" wraps under "Контакти" at 320 (175 + 103 > 272
even with no gap): accepted, the row is `flex-wrap` by design.

### 2.7 Legal bar (keep)

brand #f85a0b, Onest, `px-6 py-6 gap-6`: mini logo 29.2 x 33.7 + 16 +
"(c) 2026 Binar-2000. All rights reserved" 14/30, "Політика
конфіденційності" and "Угода про публічну оферту" 14/30 underlined
(still spans: pages do not exist - PS-19), Chilline 91.8 x 26.9. 240.6
tall at 390 (= master). No change.

### 2.8 Scroll-up (footer ring kept; corner FAB off on shop phones)

- Footer ring (FooterScrollUpSlot, ScrollUpDock.tsx:375-386): 100 x 100
  static ring + 43 brand disc in the socials row; tap -> smooth scroll
  to 0. Keep (master "Up Animation" 3117:12920 - the only up-arrow in
  the mobile masters).
- Corner FAB (CornerFab, ScrollUpDock.tsx:290-365): hidden below 640 on
  shop-canvas pages. Reasons: no master has a floating FAB; on shop
  pages its 100-px box sits on the right-hand action column (card cart
  disc 52 at x 314..366, stepper, pager, sort / per-page) and swallows
  those taps (elementFromPoint = "Догори", add-to-cart scrolls to top -
  PS-04); its dark ring is invisible over the dark checkout summary and
  the footer, and two up-arrows show at once on short pages (V2).
  Recipe: CornerFab wrapper (347-350) adds
  `max-lg:[:root:has([data-canvas=shop])_&]:hidden` (beats the `flex`
  of LAYER_BOX by specificity). Landing routes and >= 640 keep the FAB
  exactly as today; cabinet routes never mount the public dock.
- Optional (O6, pixel-neutral, needs sign-off): CornerFab hit area =
  the 43 disc + 4.5 (52) instead of the 100 box, for touch tablets and
  the landing: ScrollToTopButton gets `hit?: "box" | "disc"`; with
  "disc" the button is `pointer-events-none`, the disc span
  `pointer-events-auto after:absolute after:-inset-[4.5px]
  after:rounded-full after:content-['']`.

### 2.9 Overlays opened from the shell (contract with cart / auth areas)

- Cart disc and the menu account row are the openers. The menu always
  closes first (H1, account row).
- On phones the cart and auth overlays become full-screen sheets
  (D7 / TR-09, owned by the cart and auth areas): they cover the bar
  (z-[60] or a fixed sheet with its own 66 bar), which also removes the
  "header looks live but is inert" state (PS-21).
- Closing any overlay must not move the page: useModalBehavior restores
  focus with `preventScroll` (shared N2, PS-03).
- Overlays close on route change / Back (PS-17, cart + auth areas).

### 2.10 z-index on phones (after this spec)

| z | Element |
|---|---|
| 20 / 30 | in-page popups (owners) |
| 35 | ScrollUpDock (hidden on shop phones) |
| 40 | drawers today (cart, auth, filters, preview) - phone sheets move to 60 (owners, D7) |
| 45 | phone menu sheet |
| 50 | sticky header |
| 60 | modals; phone full-screen sheets (D7) |

### 2.11 Variants

- Empty / loading / error: the shell has no data states. SSR renders the
  visitor shell; the cart badge appears after hydration (absolute, no
  shift); the hidden menu says "Увійти" for a signed-in user until
  hydration - never visible because the menu cannot open before
  hydration (PS-24, accepted).
- Long content: crumb labels truncate (2.4); H1 wraps; cart badge
  "99+"; menu rows stay single-line at 320: the longest label "Засоби
  та інвентар для прибирання" measures 241.1 at 14/20 Medium
  (spec-probe3.mjs) and the row budget is 272 - gap - 16 arrow, so the
  row gap becomes `gap-3` (244 budget; was `gap-4` = 240, which wraps
  that row to 2 lines at exactly 320 once the zoom is gone). The gap is
  only a minimum inside `justify-between`, so every other width / row
  is pixel-identical.
- No-JS: bar + page + footer render; the burger and cart do nothing
  (acceptable; same as the landing).

---------------------------------------------------------------------

## 3. Bugs to fix (both lenses merged; nothing dropped)

Severity: major / minor / nit. "Area" = fixed in this area's files;
"Shared" = fixed by the shared layer (section 4) or call sites listed
there; "Routed" = another area's file; "Rejected" / "Deferred" with the
reason.

| ID | Sev | Source | Where | What | Fix | Disposition |
|---|---|---|---|---|---|---|
| PS-01 | major | SP-F01 | Header.tsx:227-231, 273-302 | Menu stays open after a route change that is not a menu link (logo tap from /materials, browser Back); closing it then scrollTo(oldY) on the NEW page (lands at 211 on "/") | `setMobileOpen(false)` in the render-phase pathname block; html-overflow lock with no scroll restore (2.3); logo wrapper `onClickCapture={closeMenu}` | Area |
| PS-02 | major | SP-F02, V4 | Header.tsx:461 | Cart disc tapped with the menu open opens the drawer UNDER the menu (z-40 < 45) and inerts the header: dead burger and disc | `onOpen={() => { setMobileOpen(false); openCart(); }}` | Area |
| PS-03 | major | SP-F03 | cart/useModalBehavior.ts:42, 78-79 | Closing the cart / auth drawer (X, scrim, Escape) jumps the page 300-440 px up: `opener.focus()` on the sticky-header disc + `scroll-padding-top: 96` | `opener.focus({ preventScroll: true })` (and the initial focus too) | Shared N2 |
| PS-04 | major | V1, V2, SP-F04 | ScrollUpDock.tsx:55-56, 290-365 | Corner FAB covers card add-to-cart / stepper / pager / sort and steals the tap (scrolls to top, cart stays empty); dark ring unreadable over the checkout summary / footer; two up-arrows at once | CornerFab hidden below 640 on shop canvas (2.8); optional disc-only hit area elsewhere (O6) | Area |
| PS-05 | major | SP-F05 | Header.tsx:279-301 | Menu link + Back loses the scroll (3000 -> 0): body `position: fixed` zeroes scrollY before navigating | html `overflow: hidden` lock (PhoneMenuSheet), no body pinning | Area |
| PS-06 | major | SP-F06, V11 | Header.tsx:533-604 | Menu rows are 20-px hit areas (14.2 at 320x568) | `py-4 -my-4` on every row (52 hit on the 52 pitch, pixel-neutral); no zoom | Area |
| PS-07 | major | V3, SP-F07 | Header.tsx:16, 216, 520-521 | Fit constant 706 is stale (stack 810): CTA below the fold at 568..780 tall, type 10-12 px, gutters 17 | drop the zoom; natural 14/20 + scrolling sheet + sticky CTA dock (2.3) | Area |
| PS-08 | major | V5, V7, SP-F09 | CatalogPageView.tsx:114-130, checkout/page.tsx:21-35, materials/Hero.tsx:103-130, ProductPageView.tsx:51-75 | Crumbs wrap to 2-4 lines, repeat the H1, orphan "/" at line ends (catalog / checkout / materials) vs lines starting with "/" (PDP) | Phone crumb = PhoneBackCrumb to the parent, one line (2.4) | Shared N1 + call sites |
| PS-09 | major | V6 | Header.tsx:584-604 | Signed-in customer has no account affordance in the phone bar; the account is the 9th menu row styled as a link | Not changed: D2 freezes the bar and the menu ("public menu rows gain nothing new except the existing account row"); a full-width account Button would change landing-phone-menu | Rejected (D2), O7 |
| PS-10 | minor | SP-F08 | Header.tsx:273-302, 587-592 | Tab leaves the open menu into the page behind; Escape leaves focus on body; account row -> auth -> X returns focus to body | inert main + footer while open; focus the burger on close; account row focuses the burger before opening auth (2.3) | Area |
| PS-11 | minor | V13, SP-F10 | CatalogPageView.tsx:46-52, 114; checkout/page.tsx:21; materials/Hero.tsx:103; ProductPageView.tsx:51 | Catalog crumbs are a div (no landmark, no aria-current); others use the generic label "Навігація" | ShopCrumbs `nav aria-label="Навігаційний ланцюжок"`; `aria-current="page"` on the catalog Current | Shared N1 + call sites |
| PS-12 | minor | V8 | same heads | Crumb -> H1 is 32 (master 48); crumbs 16/22 Medium | `gap-12` head; phone crumb label 16/22 SemiBold (master Back button) | Call sites |
| PS-13 | minor | V9, SP-F12 | Footer.tsx:89-90 | At 320 the ring slot ends at x 316 (gutter 4), ring clipped (scrollWidth 336) | shop-scoped gaps below 340 (2.6) | Area |
| PS-14 | minor | V10, SP-F23 | Header.tsx:520 | Menu column centred at x 84 at 600 (logo at 24) | drop `mx-auto max-w-[480px]` (and dead `sm:px-10`) | Area |
| PS-15 | minor | V11, SP-F16 | Header.tsx:532-604 | No current-route state in the menu; tapping "Каталог" on /catalog jumps to the top | active row `text-brand` + `aria-current="page"` (isActiveRoute, the desktop rule); exact-path row only closes the menu | Area (O2 for landing routes) |
| PS-16 | minor | V12 | Header.tsx:38-42 | "Напрями" rows lead to the landing pages, not /catalog/<dir> | Not changed: D2 (rows frozen); "Каталог" is one tap away and lists the directions | Rejected (D2) |
| PS-17 | minor | SP-F11 | cart/CartProvider.tsx:99-100, auth/AuthProvider.tsx | Cart / auth drawers survive route changes and Back (html stays locked) | close on pathname change (same render-phase pattern as Header) | Routed: cart, auth |
| PS-18 | minor | SP-F13 | globals.css:1325-1328, 1489-1491 | Anchors land 192 below the top (padding 96 + margin 96): 126-px blank band under the 66 bar | phone rule `:where(h1,h2,h3,h4,[id]) { scroll-margin-top: 0 }` -> targets at 96 | Shared N3 (O8) |
| PS-19 | major (content) | SP-F14 | Footer.tsx:234-242 | "Політика конфіденційності" / "Угода про публічну оферту" are dead spans | Blocked: no pages and no Figma frames; restore `<Link>` when they exist | Deferred (O9) |
| PS-20 | major | SP-F15 | cart/useFitZoom.ts, CartDrawer.tsx:235-238, AuthDrawer.tsx:846 | Landscape 844x390 (desktop canvas, zoom 0.586) + drawer fit zoom 0.56-0.62 -> 6-8 px text | Out of phone scope (>= 640 frozen); proposal: no fit zoom below 0.85 under `(pointer: coarse)`, drawers scroll | Deferred (O10) |
| PS-21 | minor | SP-F17 | CartDrawer.tsx:259, AuthDrawer.tsx:864 | Header looks live under an open drawer but is inert | phone sheets cover the bar (D7 / TR-09) | Routed: cart, auth |
| PS-22 | minor | SP-F18 | Header.tsx:49 | Menu "Контакти" -> "/#contacts" leaves the shop page although every page has footer#contacts | phone row href "#contacts" (plain anchor) | Area (O3) |
| PS-23 | minor | SP-F19 | cart drawer | At 320x568 the cart list shows 76 px above a 364-px dark summary; close X 32 | cart sheet layout (TR-19) | Routed: cart |
| PS-24 | nit | SP-F20 | Header.tsx:123, 602 | Hydration: badge appears late, hidden account row says "Увійти" until hydration | none: no layout shift and the menu cannot be open before hydration | Accepted |
| PS-25 | nit | SP-F21, V14 | Logo.tsx:35; crumb links | Logo hit 100 x 33.4; crumb links 22 tall | Logo: pixel-neutral `max-lg:before:absolute max-lg:before:inset-x-0 max-lg:before:-inset-y-[5.3px] max-lg:before:content-['']` (44 tall); crumbs: PhoneBackCrumb hit 44 | Shared N5 / N1 |
| PS-26 | nit | SP-F22 | auth/data.ts:132-133 | "Вхід до осбистого кабінету" typo (kept verbatim from Figma 5420:38175), reachable from the menu account row | auth area decides (recommend "особистого") | Routed: auth (O14) |
| PS-27 | nit | V14 | ScrollUpDock.tsx:56 | FAB at right / bottom 20 instead of the 24 gutter | moot on shop phones (FAB hidden); landing frozen | Rejected (moot) |
| PS-28 | minor | NEW (spec-probe2) | Header.tsx:506, 526, 543, 574, 596, 616 | Menu slide and row stagger never animate: `transition-[transform,...]` / inline "opacity, transform" do not cover the `translate` property Tailwind v4 emits for `translate-y-*` (60 ms after open: opacity 0.6, translate already 0) | transition lists use `translate` (2.3); `motion-reduce:transition-none` on every menu transition (D12) | Area |
| PS-29 | nit | V9 | Footer.tsx:73 | "Відділ продажу" wraps under "Контакти" at 320 | none: 175 + 103 > 272 even with no gap; flex-wrap fallback is the design | Accepted |

To fix in this pass: Area 12 (PS-01, 02, 04, 05, 06, 07, 10, 13, 14,
15, 22, 28) + Shared / call sites 6 (PS-03, 08, 11, 12, 18, 25) = 18.
Routed to other areas 4 (PS-17, 21, 23, 26). Rejected / deferred /
accepted 7 (PS-09, 16, 19, 20, 24, 27, 29) with reasons above.

---------------------------------------------------------------------

## 4. Shared needs

| # | Atom / API | Status | Proposed API and classes | Why |
|---|---|---|---|---|
| N1 | `PhoneBackCrumb`, `ShopCrumbs` in src/components/ui/Breadcrumb.tsx | NEW exports (BackCrumb, BackCrumbBody, Slash unchanged) | exact code in 2.4; `ShopCrumbs({ back: {href,label}, label?: string = "Навігаційний ланцюжок", children })` | one-line phone crumb (TR-05) on catalog / PDP / checkout / materials, reusable by the cabinet crumbs |
| N2 | useModalBehavior focus without scroll | CHANGE src/components/cart/useModalBehavior.ts:42, 78-79 | `(initial?.current ?? container.current)?.focus({ preventScroll: true })`; `opener.focus({ preventScroll: true })` | PS-03: every drawer / modal close jumps the page (desktop too, no pixel effect) |
| N3 | Phone anchor offset | CHANGE src/app/globals.css after 1491 | `@media (max-width: 639.98px) { :where(h1, h2, h3, h4, [id]) { scroll-margin-top: 0; } }` (keeps `html { scroll-padding-top: 96px }`, so focus-scrolling under the bar is unchanged) | PS-18 double offset; menu "Контакти" lands at 96 |
| N4 | Root viewport | NEW `export const viewport` in src/app/layout.tsx (D12) | `{ width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" }` | `env(safe-area-inset-bottom)` in PhoneMenuCtaDock is 0 until this exists |
| N5 | Logo hit area | CHANGE src/components/Logo.tsx:35 (optional, pixel-neutral) | add `max-lg:before:absolute max-lg:before:inset-x-0 max-lg:before:-inset-y-[5.3px] max-lg:before:content-['']` | PS-25 (44-px target; master logo box kept) |
| N6 | PhoneMenu primitives | PROVIDED by this area (new src/components/PhoneMenu.tsx), consumed read-only by shell-cabinet | `PhoneMenuSheet({ id, open, onClose, label, returnFocus, inertSelector?, children })`, `PhoneMenuGroup`, `PhoneMenuLabel({ open, delay })`, `PhoneMenuRow({ open, delay, href?, onClick?, active?, trailing?, className? })`, `PhoneMenuDivider({ open, delay })`, `PhoneMenuCtaDock({ open, delay, children })` - classes in 2.3 | D1 asks the cabinet burger sheet to reuse the public menu idiom and motion; one implementation keeps them identical |
| N7 | Overlay contract (cart, auth) | CHANGE in cart/CartProvider.tsx, auth/AuthProvider.tsx, CartDrawer.tsx, AuthDrawer.tsx (owners) | close on pathname change (render-phase pathname compare, like Header.tsx:227-231); phone sheets above the bar (z-[60], D7) | PS-17, PS-21 |
| N8 | Fit zoom floor for coarse pointers | PROPOSAL for cart/useFitZoom.ts (system spec decides) | in `read()`: `if (matchMedia("(pointer: coarse)").matches) return Math.max(fit, 0.85)` + inner scrolling | PS-20 landscape (desktop canvas) |

Atoms this area does NOT need: Sheet, ListPanel / RecordRow, LoadMore,
chip tabs, filter sheet, Modal718 phone card, CabinetPageHead phone
variant. The Button phone fix (D8) does not touch the shell: the menu
CTA is `size="small"` (42) already.

---------------------------------------------------------------------

## 5. Files

This area's files (disjoint from every other area):

| File | Change |
|---|---|
| src/components/Header.tsx | menu rebuilt on PhoneMenu primitives (2.3): html lock instead of body pinning, no zoom, close on route change, cart disc closes the menu, logo closes the menu, burger ref + focus return, account row focus order, active row, "#contacts" phone row, translate transitions; drop useFitZoom / navigatingRef / the two constants. Desktop nav (346-455) untouched |
| src/components/Footer.tsx | two shop-scoped `max-[339.98px]` gap classes (89, 90) |
| src/components/ScrollUpDock.tsx | CornerFab wrapper hidden below 640 on shop canvas (347-350) |
| src/components/ScrollToTopButton.tsx | only if O6 is accepted: `hit?: "box" \| "disc"` prop |

New files (this area):

| File | Content |
|---|---|
| src/components/PhoneMenu.tsx | PhoneMenuSheet (+ lock), PhoneMenuGroup, PhoneMenuLabel, PhoneMenuRow, PhoneMenuDivider, PhoneMenuCtaDock, ArrowUpRight glyph (moved from Header.tsx:135-154) |

Shared layer (section 4, not this area's edit set): ui/Breadcrumb.tsx
(N1), cart/useModalBehavior.ts (N2), app/globals.css (N3),
app/layout.tsx (N4), Logo.tsx (N5), cart/useFitZoom.ts (N8 proposal).

Call sites in other areas (owners apply 2.1 / 2.4): catalog/
CatalogPageView.tsx (catalog-b2c), app/checkout/page.tsx (checkout),
materials/Hero.tsx (materials), product/ProductPageView.tsx (pdp),
cart/CartProvider.tsx + CartDrawer.tsx (cart), auth/AuthProvider.tsx +
AuthDrawer.tsx (auth), platform/ui/SignInPrompt.tsx (shared / cabinet).

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Tools: audit/mobile/kit/phone.mjs (openPhone touch, domChecks,
shootSegments), the audit scripts in audit/mobile/shell-public/
(sweep.mjs, menu.mjs, flows.mjs, probe-*.mjs, visual.mjs,
spec-probe.mjs, spec-probe2.mjs). Use raw `page.touchscreen.tap(x, y)`
for taps that matter (locator.tap auto-scrolls under the sticky header)
and `scrollTo({ top, behavior: "instant" })` (html is smooth-scrolling).

Widths: 320, 360, 390, 430, 600 (x heights 568 / 780 / 844 / 932 / 960)
on /catalog, /catalog/hotels, /catalog/protect/<any cat>,
/catalog/cleaning/<any cat>, /catalog/hotels/hotelna-kosmetyka, PDP
shampoo-1 and shampoo-long-notes, /checkout empty + cart, /materials,
/materials/catalogs, /orders (visitor); seeds none + b2c; /checkout
also b2b.

Measurements (expected):
- Header 66 at every width; logo (24, 16.3) 100 x 33.4; burger glyph x
  vw-48, y 21; cart box x vw-116; `--site-header-h` 66px.
- Gutters: H1 x = 24, content right edge = vw-24 on every route/width.
- Crumb: exactly one line, height 40 (hit 44), y 114; ring 40 at x 24;
  label x 80, 16/22 600 +0.16 rgb(52,52,53); label text per table 2.4;
  ellipsis (scrollWidth > clientWidth) only for the protect / cleaning
  direction labels at < 390; no "/" and no orange crumb visible below
  640; `nav[aria-label="Навігаційний ланцюжок"]` present once.
- H1 y = 202 on single-line crumbs (114 + 40 + 48), 40/42 700 -0.8.
- Footer: 1286.4 at 390; at 320 socials gap 12, row gap 8, slot right
  edge 296, footer > div scrollWidth 320; at 340..639 unchanged
  (gap 19 / 16).
- Menu at 390 x 844: label y 126; rows 178/230/282 and 398..658 step
  52; row hit boxes 52 tall; dividers 350 / 726; CTA 774..816, not
  stuck; nav zoom absent; 14/20 at every height.
- Menu at 320x568, 360x640, 375x667, 390x750, 414x736: no zoom,
  row font 14 px, first row x 24, CTA fully on screen (bottom =
  innerHeight - 16) before scrolling; scroll the sheet to the end ->
  CTA at its natural place, all rows reachable.
- Menu at 600x960: first row x 24, row width 552.
- Menu at 320 (any height): every row box is 20 tall (one line; the
  cleaning row "Засоби та інвентар для прибирання" included).

Flows (each with console errors = 0):
1. Burger -> X / Escape on /catalog scrolled 1500: scrollY stays 1500;
   while open `documentElement.style.overflow === "hidden"`, body
   `position` empty, `main` and `footer` have `inert`; after close the
   burger is focused, overflow restored.
2. /catalog scroll 3000 -> menu "Матеріали" -> /materials at 0 -> Back
   -> /catalog at 3000 (+-5).
3. /materials scroll 700 -> menu -> logo tap -> "/" at 0, menu
   `aria-hidden="true"`, overflow empty.
4. /materials -> menu "Каталог" -> /catalog, scroll 600, open menu,
   Back -> /materials, menu closed, page scroll restored, no lock.
5. Cart [shampoo-1 x2] on /catalog: open menu, tap the cart disc ->
   menu closed, cart dialog visible (elementFromPoint at the centre is
   inside the cart), close the cart -> scrollY unchanged, focus on the
   disc.
6. Visitor: menu -> "Увійти" -> auth drawer -> X -> focus on the burger,
   scrollY unchanged. b2c: the row reads "Особистий кабінет".
7. /catalog: "Каталог" row colour rgb(248,90,11) + aria-current="page";
   tap -> menu closes, URL and scrollY unchanged. /catalog/hotels:
   "Каталог" active, tap -> /catalog. /checkout: no active row.
8. Menu "Контакти" on /catalog -> same URL + "#contacts", footer top
   at 96 +-2, menu closed.
9. Keyboard: Tab through the open menu never reaches main / footer.
10. Drawer close at scroll 1500 (cart X, scrim, Escape; auth X) ->
    scrollY 1500 (N2).
11. /catalog 390 scroll 2000 and 320 scroll 1500: no visible
    `button[aria-label="Догори"]` except the footer one; a raw tap on a
    card's "Додати в кошик" adds the item. Landing "/" scrolled 1500:
    the corner FAB still appears (unchanged).
12. Footer ring tap -> scrollY 0.
13. Each crumb tap navigates to the table's href.
14. Reduced motion (emulateMedia reducedMotion "reduce"): menu opens /
    closes without transitions. Normal motion: 60 ms after opening,
    the overlay `translate` is between -12px and 0 (animating).
15. Rotate 390 -> 844 x 390 with the menu open: menu closes, no lock.
16. Anchor: footer "Часті запитання" from /catalog -> "/" with #faq at
    96 +-2 (phone).

DOM checks (domChecks) expected clean for the shell: no overflowX,
offRight / offLeft (incl. footer at 320), no tinyText in the menu at
any height, no smallTarget for menu rows, crumbs, burger, cart disc
(logo only if N5 is not built - known false positive). Remaining flags
must belong to page bodies (other areas).

Guard (mandatory): `node audit/mobile/kit/baseline.mjs audit/mobile/after`
then `node audit/mobile/kit/compare.mjs audit/mobile/baseline
audit/mobile/after`: every landing-phone-* (incl. landing-phone-menu),
landing-1440-*, shop-1710-*, cabinet-1710-* = 0 differing pixels. The
phone-390-* shop shots are expected to change (crumbs, H1 at 202).
Also spot-check the 1710 crumb trails (catalog category, PDP, checkout,
materials category) against the baseline crops.

---------------------------------------------------------------------

## 7. Conflicts and open points for the system spec

| # | Topic | Detail | Recommendation |
|---|---|---|---|
| O1 | Menu changes reach the landing | PhoneMenu (no zoom, sticky dock, html lock, close-on-route, focus) is the same component on the landing; the guard shot (390 x 844) is pixel-identical, but short phones and behaviour change on landing routes too | Accept globally (shell bug fixes; a shop-only fork would give two different menus). Fallback: keep the zoom path for non-shop routes behind `isShopRoute(pathname)` |
| O2 | Active menu row on landing routes | /hotels, /protect, /cleaning, /spivpratsya, /blog would show their row in brand when the menu is open (desktop nav already does) | Accept; fallback: aria-current only, no colour |
| O3 | "Контакти" = "#contacts" | on landing routes other than "/" the row now scrolls to the same footer instead of navigating home | Accept (identical footer content) |
| O4 | D1 says the cabinet sheet uses "the same useFitZoom(706, 66) logic" | this spec removes the fit zoom (stale constant, 10-px text); the cabinet sheet is even taller (account row + 6 + 3 rows) | Amend D1: cabinet sheet = PhoneMenu primitives (natural scroll + PhoneMenuCtaDock), passing its own `inertSelector` (e.g. "body > div:has(> main), body > footer") |
| O5 | Footer 320 fix scope | shop-only per D2 / D13 leaves the landing footer clipped at 320 | Keep shop-only unless the orchestrator lifts the freeze for this 4-px shell bug (then drop the `:root:has()` part) |
| O6 | Corner FAB | hidden on shop phones only; landing keeps the FAB (and its tap-stealing ring); touch tablets on shop routes keep it | Optional disc-only hit area (pixel-neutral) for CornerFab everywhere - needs sign-off because it changes landing touch behaviour |
| O7 | Account affordance (V6 / P2a) | rejected by D2; product may still want "Увійти" / "Кабінет" as a full-width outlined Button in the sheet | Only with an explicit landing-menu exception (would change landing-phone-menu) |
| O8 | Anchor rule on phones | N3 also moves landing anchors (from 192 to 96 below the top); CatalogClient.tsx:563 `scroll-mt-[96px]` still doubles with the 96 padding (192) | Accept N3; catalog-b2c to drop `scroll-mt-[96px]` on phones or rely on D4 load-more |
| O9 | Legal links | dead spans; checkout has no link to the offer | content task (pages + frames), outside this pass |
| O10 | Landscape | SP-F15 lives on the desktop canvas (frozen) | system spec decides on N8 |
| O11 | Crumb call sites | four other areas edit their heads (2.4 table) | assign each to its owner, or one sweep agent after N1 lands; the exact JSX is fixed here |
| O12 | SignInPrompt pages in the public shell | title is 32/36 (off-scale), no crumb, `gap-6` | owner: TR-03 mapping (desktop 44/48 -> H2 30/36), title -> text 16, text -> action 32, Button size small/responsive (D8) |
| O13 | Phone sheet layering | cart / auth sheets must cover the bar on phones (z-[60]) and close on route change; until then PS-21 stays | cart + auth areas (N7) |
| O14 | Typo "осбистого" | Figma copy kept verbatim | auth area / orchestrator: fix to "особистого" |
| O15 | Safe area | PhoneMenuCtaDock uses env(safe-area-inset-bottom); 0 until N4 | shared layer builds N4 first |
| O16 | Risk: html overflow lock on iOS | the body pinning was originally added against iOS rubber-banding; Safari < 16 ignores `html { overflow: hidden }` (the page could scroll behind the OPAQUE sheet - invisible; the overlay keeps `overscroll-contain`). Not testable in Chromium | accept; same lock already used by every drawer (useModalBehavior) |
| O17 | Risk: Tailwind v4 arbitrary variants | `max-[339.98px]:[:root:has([data-canvas=shop])_&]:gap-*` and `max-lg:[:root:has(...)_&]:hidden` may not be emitted by a stale dev server (memory note); `:has()` needs Safari 15.4 / Chrome 105 (older browsers keep today's behaviour) | verify computed styles, not class strings; restart / rm .next if missing; fallback = the same selectors as unlayered rules in globals.css under `@media (max-width: 639.98px)` |
