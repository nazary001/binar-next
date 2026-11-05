# Phone spec - shell-cabinet (B2B cabinet shell, < 640 px)

Area: the B2B platform shell on phones: PlatformHeader phone cluster,
the cabinet menu sheet (new, replaces the SideMenu strip), SideMenu,
PlatformFooter legal bar, CabinetPage slab, CabinetPageHead (list +
detail), SignInPrompt (signed-out cabinet routes), WelcomeModal, the
pre-hydration gate.

Author: spec agent shell-cabinet, 2026-11-05. Specification only, no
src/ edits. English; UI strings Ukrainian verbatim.

Inputs read in full: audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md
(D1-D13), audit/mobile/lang/figma-mobile-language.md (TR-01..TR-32),
audit/mobile/lang/code-mobile-recipes.md, audit/mobile/shell-cabinet/
visual-report.md (V1-V19) and functional-report.md (F1-F18), the
sibling specs docs/superpowers/specs/mobile/shell-public.md (the
PhoneMenu primitives N6 this area consumes) and dashboard.md (SN-01 /
SN-02 expectations of this area), every source file named below.
Screens viewed: visual-dashboard-390-viewport, visual-order-48291064-390-
viewport, visual-footer-320, functional-welcome-open-320x568,
visual-orders-signedout-390-viewport, visual-chip-drawer-390,
functional-surface-fresh-orders-390x844, lang/shots/menu-390,
shell-public/functional-menu-catalog-none-320x568.
Measured for this spec (read-only probe): audit/mobile/shell-cabinet/
spec/measure.mjs -> measure.json (text widths in the real Manrope /
Onest faces; quoted below as "(m)").

Conventions: phone = unprefixed classes, desktop = `lg:` (sm/md/lg all
switch at 640, code-recipes 1). Every phone class that changes a
property the desktop relied on gets its `lg:` restore so >= 640 stays
byte-identical. y values are CSS px at 390 x 844 from the top of the
document (header 0..66). "slab" = the CabinetPage surface.

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
| S1 | 2.2 / C1 no useFitZoom for the cabinet sheet | Confirmed as amendment A-1 |
| S2 | 2.5 back -> title 48, head pb 48, first block pt 0 (C3, C4) | Confirmed (A-2, A-3); every cabinet area spec now follows this contract |
| S3 | 2.5.4 back row = BackButton | Phone back row = PhoneBackCrumb (A19) `lg:hidden` (44 hit, truncation at vw - 104); the desktop BackButton gets `max-lg:hidden` |
| S4 | CabinetPageHead API | Add `titleRef?: Ref<HTMLHeadingElement>` (returns / order-detail focus after confirm); export `CABINET_TITLE`, `CABINET_SUBTITLE`, `CABINET_SECTION_TITLE` (A20) |
| S5 | 2.8 welcome avatar 96 r12.8, glyph 70 | 120 x 120 r16 (`size-[120px] rounded-2xl`, desktop unchanged), glyph 86.6 (A-12, same as the profile logo card); edited in place; the tile is 24 taller (card 572 at 390) |
| S6 | 2.8 card numbers | = A6 phone card numbers (24 margins, p 24, title 24/28, 44 cross, 16/24 #343435); this area OWNS WelcomeModal.tsx (A-13) |
| S7 | SC-09 / 2.10 drop `notFound()` | Superseded (C-24): order-detail adds src/app/orders/[id]/not-found.tsx and keeps `notFound()` |
| S8 | SN-1 / SN-2 PhoneMenu | Built by C-shell-public; SN-2 aria pass-through included |
| S9 | SN-3 Button, SN-4 fallbackFocus, SN-6 viewport, SN-10 Modal718 | A1, A2, A26, A6 (cluster F1) |
| S10 | SN-7 / SN-8 | cart / auth clusters (A5 sheets at z-60, close on route change, A4 Back) |
| S11 | C7 global not-found | Orchestrator point O-3 (not built) |
| S12 | C9 logo avatar size | 120 r16 for both logo blocks (A-12) |
| S13 | C12 B2B catalog / PDP surfaces | White page (A-11); slab on every other cabinet route |
| S14 | C10 full-width head actions at 600 | Accepted (no cap, C-37) |
| S15 | C16 no ScrollUpDock in the cabinet | Confirmed |
| S16 | Build | Cluster C-shell-cabinet (wave 2b, after C-shell-public): PlatformHeader, SideMenu, PlatformFooter, PlatformChrome, CabinetPage, CabinetPageHead, SignInPrompt, WelcomeModal, NEW CabinetMenu.tsx + companyInitials.ts |
| S17 (critique round 1) | 2.2 account row company name `truncate` (long legal names lose their distinctive part) | `line-clamp-2` (the row grows to 48 when it wraps; the `py-4 -my-4` hit stays); `ariaLabel` keeps the full name; edited in place |
| S18 (critique round 1) | 2.2 stagger delays 80..600 (the CTA settles ~900 ms after the tap) | A-16: `delay = 40 + k * 20` for k = 0 account row (40), 1 label (60), 2..7 rows (80..180), 8 divider (200), 9..11 site rows (220..260), 12 divider (280), 13 dock (300); properties / durations / easing unchanged; the public menu keeps its timings |
| S19 (critique round 1) | 2.2 Back closes via the pathname change (Back left the page) | A4 on the cabinet menu: Back closes it (same page, same scroll); rows navigate with `release({ navigate: href })` (history [old, new]); the current row only releases; the account row (-> auth "account") and the cart disc hand off (the sheet adopts the entry); close on pathname change stays as the fallback |
| S20 (critique round 1) | 2.2 lock / inert | `acquireScrollLock()` (A2, one refcounted owner); inert = `[data-cabinet-behind]` + MENU_INERT (system 3.2: every body child except the header, the menus and `[data-toast-host]`) |
| S21 (critique round 1) | 2.7 SignInPrompt text 14/20 #777779 | `text-[16px] leading-6 text-neutral-800 lg:text-body-sm lg:text-neutral-500` (the hero body 3082:3249 of the borrowed card, T6 descriptions); desktop unchanged; the H2 -> text 16 / text -> CTA 32 rhythm stays; edited in place |
| S22 (critique round 1) | 2.8 welcome: Escape / cross / scrim close and mark welcomed | Below 640 the scrim does NOT close the card (cross, Escape and the CTA only); desktop unchanged |
| S23 (critique round 1) | SN-2 PhoneMenuRow aria pass-through | Built by C-shell-public in wave 2a (`ariaLabel?: string; ariaHaspopup?: "dialog" | "menu"`), so wave 2b type-checks |
| S24 (critique round 1) | PhoneMenu landing-safe defaults | The zoom / active-row / "/#contacts" defaults of system 3.2 concern the PUBLIC menu on landing routes only; the cabinet menu never renders on landing routes and always uses the shop variant (no zoom, active rows); SITE_ROWS keeps "/#contacts" (cabinet pages have no #contacts footer) |
| S25 (critique round 1) | 2.6 legal bar, slab | Cabinet legal bar fill #1d1d1f confirmed as the one shop / cabinet dark (C-40) |

---------------------------------------------------------------------

## 1. Scope

### 1.1 Components and their files (this area)

| Block | File | Today on phones |
|---|---|---|
| Cabinet header bar | src/components/platform/PlatformHeader.tsx:21-68 | 66 bar, logo, company chip 76 x 42 (initials only), cart disc |
| Cabinet menu sheet | NEW src/components/platform/CabinetMenu.tsx | does not exist |
| Section nav | src/components/platform/SideMenu.tsx:77-94 | 82-px horizontal strip, 10-px labels, static |
| Shell wiring + gate | src/components/platform/PlatformChrome.tsx:58-131 | swaps chrome; gate hides the whole body |
| Legal bar | src/components/platform/PlatformFooter.tsx:13-46 | 92 / 122 tall, 12/30, nowrap copyright |
| Slab | src/components/platform/ui/CabinetPage.tsx:10-16 | #f5f5f5, square, pb 32 |
| Page head | src/components/platform/ui/CabinetPageHead.tsx:18-78 | H1 32/36, subtitle 14/24, ragged actions |
| Signed-out prompt | src/components/platform/ui/SignInPrompt.tsx:16-31 | bare 262-px block, H1 32/36 |
| Welcome modal | src/components/auth/WelcomeModal.tsx:63-205 | overflowing pill, CTA below the fold |
| Initials helper | NEW src/components/platform/companyInitials.ts | inline in PlatformHeader.tsx:28-34 |

### 1.2 Routes

Platform shell (seed b2b, `audit/kit/seed-b2b.json`, "Демо Партнер"):

| Route | Head variant | Notes |
|---|---|---|
| /dashboard | list, greeting title (TitleLight "Вітаю," + company), 2 actions | dashboard area owns the title node |
| /orders, /orders?tab=returns | list, 1 action (orders tab) / none (returns tab) | |
| /orders/48291064 ... /orders/48291037 | detail: back + title + badges + 1..2 actions | StatusAction may be a hint `<p>` |
| /orders/returns/9104 ... 9093 | detail: back + title + 1 badge + 0..1 action | |
| /orders/99999999 | today: Next default 404 inside the shell | SC-09 |
| /orders/returns/1 | detail head "Повернення не знайдено" | reached |
| /profile, ?tab=counterparties, ?tab=employees | list, no actions | |
| /assortment | back + title + subtitle + 1 action | |
| /materials, /materials/catalogs | list / back + title + subtitle | PartnerMaterials |
| /catalog, /catalog/hotels, /catalog/hotels/hotelna-kosmetyka, PDP, /catalog?mine=1 | shell only (header, menu, legal bar); heads belong to catalog-b2b / pdp | |
| /ui-gallery (dev only) | CabinetPageHead samples | |

Public chrome (seed none or b2c, `audit/mobile/kit/seed-b2c.json`): the
same six cabinet routes render SignInPrompt (/dashboard, /orders,
/orders/48291064, /orders/returns/9104, /profile, /assortment).

### 1.3 States (all reached by the two audits unless marked)

| Group | States |
|---|---|
| Header | cart empty / "3" / "12" / "99+" (31.8 wide); menu closed / open; open on a scrolled page; logo with seeded `user.logo`; company names: "Демо Партнер", one word, long legal name (624 px at 16/24 SemiBold (m)), quotes, empty "  " |
| Menu (new) | open at 320x568, 360x640, 360x780, 375x667, 390x664, 390x844, 430x932, 600x960; active row per route; current-route row tap; account row -> account sheet; cart disc while open; logo while open; Back while open; Escape; rotate / resize to >= 640 (spec'd, to be verified) |
| Slab / head | full data; fresh partner (accounts[0].id = sessionId = "acc-fresh"): empty orders / returns / assortment / dashboard; not-found order / return; long company greeting |
| Legal bar | 320 (copyright wraps), 360..639 (one line) |
| SignInPrompt | visitor and B2C on the six routes at 320 and 390; "Увійти" -> sign-in drawer -> demo sign-in swaps to the cabinet on the same URL; B2C "Кабінет" -> account summary |
| Welcome modal | first partner sign-in at 320x568 / 320x640 / 360x780 / 375x667 / 390x568 / 390x844 / 430x932 / 600x960; logo empty / uploaded / replaced; wrong type error; Escape / cross / scrim; "Перейти в профіль" -> /profile; rotation to 844x390 (desktop canvas) |
| Gate | b2b with JS delayed 1.2 s and blocked (4-s fallback); visitor and B2C never gated |
| Edges | 639 / 640 (menu closes, chip + rail return), landscape 844 x 390 = desktop canvas (out of scope, frozen) |

### 1.4 Unreachable / not testable (with the reason)

| State | Reason | Substitute |
|---|---|---|
| Welcome modal from a seed alone | `welcomed:false` while already signed in does not open it; it opens only from the sign-in submit (AuthDrawer.tsx:407) | seed sessionId null + accounts[0].welcomed false, sign in 0500000001 / binar2026 |
| Real file chooser | Playwright cannot drive the OS picker | `setInputFiles` on the hidden input |
| iOS Safari rubber band, `html { overflow:hidden }` on Safari < 16, collapsing toolbars vs dvh, safe-area insets | Chromium emulation only; env() = 0 until the root `viewport` export exists (D12 / shell-public N4) | check fallbacks (insets 0) and that nothing depends on vh |
| Real slow hydration on a phone | emulated by delaying / aborting the JS chunks | gate scripts in the audit |
| Legal pages | /privacy, /terms do not exist (MATRIX open question 13) | titles stay plain underlined text (SC-21) |

---------------------------------------------------------------------

## 2. Phone layout, block by block

### 2.0 Frame (every cabinet route, 320..639)

```
y 0     header bar 66, sticky z-50, white            D1 / 3082:3661
y 66    slab #f5f5f5, top corners r32                 D1 / grey slab 3094:4837
y 114   head (pt 48)                                  D10 / TR-03
...     page blocks (owners), 24 gutters              D10
        48 before the legal bar (slab pb 48)          D10
        legal bar #1d1d1f, ~190 tall                  D1 / legal band 3111:14958
```

- No strip, no chip, no ScrollUpDock on phones (D1; the burger in the
  sticky bar keeps navigation one tap away at any scroll depth, which is
  what the dock / strip tried to solve - V6 / F3).
- Gutters 24 (`px-6`): content 272 at 320, 342 at 390, 382 at 430, 552
  at 600 (D10). Nothing in the shell has a fixed width wider than 272.
- z ladder used here (code-recipes 4 + shell-public 2.10): menu sheet 45,
  header 50, welcome modal 60, phone cart / auth sheets 60 (their areas,
  D7).
- One scroll-lock mechanism for everything this area opens:
  `document.documentElement.style.overflow = "hidden"` (D7, the
  useModalBehavior lock; keeps scrollY and the sticky header).

### 2.1 PlatformHeader phone bar (D1, TR-02, master 3082:3661)

Geometry (identical to the public phone header, shell-public 2.2):

| Element | 390 | Stretch 320..639 | Source |
|---|---|---|---|
| Bar | 0..66, px 24, white, sticky top 0 z-50 | same | 3082:3661 |
| Logo | x 24, y 16.28, 100 x 33.45 | same | 3082:3642 |
| CartTrigger box | 48 at x 274 (disc 42 brand, badge 20 #1d1d1f at the box's top right) | x = vw - 116 | Header.tsx:112-130 (shared atom) |
| Burger box | 48 at x 330 (`-mr-3`), glyph 24 at x 342 / y 21 | glyph x = vw - 48 | 3117:14330 (open = cross at the same spot) |
| Company chip | `display:none` below 640 | | D1 |

At 320: logo 24..124, cart 204..252, burger 260..308 - no collision.

Recipe (PlatformHeader.tsx):

```tsx
const [menuOpen, setMenuOpen] = useState(false);
const closeMenu = useCallback(() => setMenuOpen(false), []);   // STABLE (sheet lock dependency)
const burgerRef = useRef<HTMLButtonElement | null>(null);
const pathname = usePathname();
const [menuPath, setMenuPath] = useState(pathname);
if (menuPath !== pathname) { setMenuPath(pathname); setMenuOpen(false); }  // Header.tsx:227-231 pattern
// + matchMedia("(min-width: 640px)") change -> setMenuOpen(false)        // Header.tsx:309-316

<>
  <header className="sticky top-0 z-50 bg-white">                        {/* :37 unchanged */}
    <div className="flex h-[66px] items-center justify-between px-6 lg:h-[92px] lg:px-8">  {/* :38 unchanged */}
      <span className="contents" onClickCapture={closeMenu}><Logo /></span>  {/* shell-public H2 */}
      <div className="flex items-center gap-2 lg:gap-4">                  {/* :40 unchanged */}
        <button /* chip, :41-62 */ className="... (today's string) max-lg:hidden">...</button>
        <CartTrigger count={count} onOpen={() => { setMenuOpen(false); openCart(); }} />
        <button
          ref={burgerRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="cabinet-nav"
          aria-label={menuOpen ? "Закрити меню" : "Відкрити меню"}
          className="-mr-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-transform active:scale-90 lg:hidden"
        >
          <Burger open={menuOpen} />                                      {/* shared glyph, see 4 */}
        </button>
      </div>
    </div>
  </header>
  <CabinetMenu open={menuOpen} onClose={closeMenu} burgerRef={burgerRef} />
</>
```

Desktop: the chip keeps every class (only `max-lg:hidden` is added),
the burger and the sheet are `lg:hidden`, the cluster gap is unchanged,
the CartTrigger closure only adds a no-op `setMenuOpen(false)`. Pixel
identical.

Initials (SC-12): the chip avatar and the menu account-row avatar share
one `CompanyAvatar` (same file) and the helper in
src/components/platform/companyInitials.ts:

```ts
// Strip a spelled-out legal form, skip abbreviated legal forms and short
// lowercase connectors, take the first letter of the first two words.
const LEGAL_PREFIX =
  /^(?:товариство\s+з\s+обмеженою\s+відповідальністю|приватне\s+підприємство|фізична\s+особа[\s-]+підприємець|(?:публічне|приватне)?\s*акціонерне\s+товариство)\s+/iu;
const LEGAL_WORD = new Set(["ТОВ", "ТЗОВ", "ФОП", "ПП", "ПАТ", "ПРАТ", "АТ", "ДП", "КП"]);
export function companyInitials(name: string): string {
  const words = name.trim().replace(LEGAL_PREFIX, "").match(/\p{L}[\p{L}\p{N}'-]*/gu) ?? [];
  const kept = words.filter((w) => !LEGAL_WORD.has(w.toUpperCase()) && !/^\p{Ll}{1,2}$/u.test(w));
  return (kept.length ? kept : words).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
```

Expected: "Демо Партнер" -> "ДП" (desktop baseline unchanged), "ТОВ" + the name in
guillemets "Готель Прем'єр Палац" -> "ГП", '"Альфа" ПП' -> "А", the long legal
name -> "ГК", "Mirotel LTD" -> "ML" (Latin forms deliberately kept), ""
-> "" which renders `PersonIcon` (auth/icons.tsx) `size-5` in the 32
disc. aria-label: `company ? \`Особистий кабінет: ${company}\` :
"Особистий кабінет"`.

`CompanyAvatar`: `relative flex size-8 shrink-0 items-center
justify-center overflow-hidden rounded-full bg-neutral-900 text-[12px]
font-bold leading-none text-white` (today's chip avatar string,
PlatformHeader.tsx:50) + logo `<img ... className="absolute inset-0
size-full object-cover">` (today :52).

### 2.2 Cabinet menu sheet (D1, TR-02, TR-09, master 3117:13578 / 3117:13841)

Built on the shell-public PhoneMenu primitives (src/components/
PhoneMenu.tsx, shell-public 2.3 / N6) so the two menus share one
overlay, motion, lock, row and dock implementation. File:
src/components/platform/CabinetMenu.tsx ("use client").

Composition (D1, in order):

| # | Block | Classes / primitive | Source |
|---|---|---|---|
| 1 | Account row: 32 avatar + 12 + company name 16/24 SemiBold #343435 (1 line, ellipsis) + 16 chevron pointing right | `PhoneMenuRow` (button) with custom children, see recipe | D1, TR-02 |
| 2 | 48 | sheet nav `gap-12` | 3117:13841 |
| 3 | Label "Кабінет" 14/20 Medium #777779 | `PhoneMenuLabel` | 3146:16289 |
| 4 | 32, then rows Дашборд, Каталог, Мій асортимент, Замовлення, Матеріали, Профіль (14/20 Medium #4a4a4c, 16 arrow-up-right, pitch 52, active row brand + aria-current) | `PhoneMenuGroup` + 6 x `PhoneMenuRow` | 3117:14194 |
| 5 | 48 / 1-px #d2d2d2 / 48 | `PhoneMenuDivider` | Vector 59 3117:14206 |
| 6 | Rows Співпраця, Блог, Контакти | `PhoneMenuGroup` + 3 x `PhoneMenuRow` | group 2 3117:14259 |
| 7 | 48 / divider / 48 | `PhoneMenuDivider` | Vector 60 3117:14279 |
| 8 | Button/Small solid full width "Зробити замовлення" -> /catalog | `PhoneMenuCtaDock` + `<Button href="/catalog" size="small" className="w-full [&>span]:flex-1">` | 3117:14325, D1 |

Geometry at 390 x 844 (overlay y 66..844 = 778, stack pt 60 / pb 60):

| y | Element |
|---|---|
| 126..158 | account row (row box 32, hit 64 via `py-4 -my-4`) |
| 206..226 | "Кабінет" |
| 258 / 310 / 362 / 414 / 466 / 518 | the six cabinet rows (20 tall, hit 52) |
| 586 | divider |
| 634 / 686 / 738 | Співпраця / Блог / Контакти |
| 806 | divider (natural) |
| 854..896 natural -> stuck at 786..828 | CTA (dock: pinned 16 above the sheet bottom; content scrolls under its white band) |

Natural stack 890 > 778, so the dock is stuck at 390 x 844; the last
row "Контакти" (738..758) stays visible above the band (band top 770).
430 x 932 and 600 x 960: overlay 866 / 894 -> 430 still docks (24 px),
600 fits. 320 x 568: overlay 502, rows down to "Матеріали" visible, the
rest scrolls under the docked CTA. Type never shrinks (no zoom; see C1).

Stretch 320..639: rows span the content width (272 / 342 / 552), 24
gutters, no 480 cap (shell-public dropped `max-w-[480px]`). Longest
cabinet label "Мій асортимент" 107.7 (m) - no wrapping risk; the account
name truncates (budget at 320 = 272 - 32 - 12 - 12 - 16 = 200).

Recipe:

```tsx
const CABINET_ROWS = [
  { href: "/dashboard", label: "Дашборд", match: /^\/dashboard(\/|$)/ },
  { href: "/catalog", label: "Каталог", match: /^\/catalog(\/|$)/ },
  { href: "/assortment", label: "Мій асортимент", match: /^\/assortment(\/|$)/ },
  { href: "/orders", label: "Замовлення", match: /^\/orders(\/|$)/ },
  { href: "/materials", label: "Матеріали", match: /^\/materials(\/|$)/ },
  { href: "/profile", label: "Профіль", match: /^\/profile(\/|$)/ },
];
const SITE_ROWS = [
  { href: "/spivpratsya", label: "Співпраця" },
  { href: "/blog", label: "Блог" },
  { href: "/#contacts", label: "Контакти" },
];

export function CabinetMenu({ open, onClose, burgerRef }: {
  open: boolean; onClose: () => void; burgerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { user, openAuth } = useAuth();
  const pathname = usePathname();
  const company = user?.company.name.trim() ?? "";
  return (
    <PhoneMenuSheet id="cabinet-nav" open={open} onClose={onClose} label="Меню кабінету"
      returnFocus={burgerRef} inertSelector="[data-cabinet-behind]">
      <PhoneMenuRow open={open} delay={80}
        ariaLabel={company ? `Особистий кабінет: ${company}` : "Особистий кабінет"}
        ariaHaspopup="dialog"
        trailing={<ChevronDown16 className="size-4 shrink-0 -rotate-90 text-neutral-900" />}
        onClick={() => { burgerRef.current?.focus({ preventScroll: true }); onClose(); openAuth("account"); }}>
        <span className="flex min-w-0 items-center gap-3">
          <CompanyAvatar user={user} />
          <span className="line-clamp-2 text-[16px] font-semibold leading-6 text-neutral-800">   {/* SYSTEM critique round 1 */}
            {company || "Особистий кабінет"}
          </span>
        </span>
      </PhoneMenuRow>
      <PhoneMenuGroup>
        <PhoneMenuLabel open={open} delay={120}>Кабінет</PhoneMenuLabel>
        {CABINET_ROWS.map((r, i) => (
          <PhoneMenuRow key={r.href} href={r.href} open={open} delay={160 + i * 40}
            active={r.match.test(pathname)} onClick={onClose}>{r.label}</PhoneMenuRow>
        ))}
      </PhoneMenuGroup>
      <PhoneMenuDivider open={open} delay={400} />
      <PhoneMenuGroup>
        {SITE_ROWS.map((r, i) => (
          <PhoneMenuRow key={r.href} href={r.href} open={open} delay={440 + i * 40}
            onClick={onClose}>{r.label}</PhoneMenuRow>
        ))}
      </PhoneMenuGroup>
      <PhoneMenuDivider open={open} delay={560} />
      <PhoneMenuCtaDock open={open} delay={600}>
        <Button href="/catalog" size="small" onClick={onClose} className="w-full [&>span]:flex-1">
          Зробити замовлення
        </Button>
      </PhoneMenuCtaDock>
    </PhoneMenuSheet>
  );
}
```

`ariaLabel` / `ariaHaspopup` are a small addition to PhoneMenuRow
(section 4, SN-2). If the primitives are late, CabinetMenu copies the
exact class strings of shell-public 2.3 (overlay `fixed inset-x-0
bottom-0 z-[45] overflow-y-auto overscroll-contain bg-white
transition-[translate,opacity] duration-[400ms]
ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none
lg:hidden` + `top: var(--site-header-h, 66px)`, nav `flex min-h-full
w-full flex-col gap-12 px-6 py-[60px]`, rows `group/link relative flex
w-full cursor-pointer items-center justify-between gap-3 py-4 -my-4
text-left text-body-sm font-medium ...`) and the lock below; no fork of
behaviour is allowed.

Behaviour (inherited from PhoneMenuSheet, verified by the checklist):

| Trigger | Result |
|---|---|
| Burger | opens; glyph morphs to the cross; html overflow hidden; `[data-cabinet-behind]` (content wrapper + legal bar) inert; rows stagger in (opacity + translate-y 12 -> 0, 300 ms, delays 80..600; none with reduced motion) |
| Cross / Escape | closes; scrollY unchanged; focus on the burger |
| Cabinet / site row (other route) | closes, navigates, new page at scrollY 0; Back restores the old scroll |
| Row of the current route | closes only (no navigation, scroll kept) |
| Account row | focus to the burger, closes, opens the account sheet (`openAuth("account")`); the sheet's opener is the burger, so closing it refocuses the burger (not an inert row) |
| Cart disc | closes the menu, opens the cart (never under the sheet - shell-public PS-02 analogue) |
| Logo | closes; navigates to "/" |
| Back (history) | pathname changes -> closes; html unlocked |
| Resize / rotate to >= 640 | closes (desktop rail + chip take over) |
| Tab | logo -> cart -> burger -> account row -> rows -> CTA; nothing behind the sheet is focusable |

### 2.3 SideMenu (D1)

- Delete the phone strip `<nav ... className="scrollbar-hidden flex
  items-start gap-2 overflow-x-auto px-4 py-3 lg:hidden">`
  (SideMenu.tsx:87-92). The component returns only the desktop
  `<aside className="hidden w-[104px] shrink-0 lg:block">` (79-86,
  unchanged). ITEMS / Tile / Label stay (desktop rail).
- Result on phones: the slab starts at y 66 (82 px earlier than today);
  no tinyText, no hScroller, no clipped item at 320 (V4, V5, F4, F12,
  V19).

### 2.4 CabinetPage slab (D1, D5, D10; grey slab 3094:4837)

| Property | Phone | Desktop (unchanged) |
|---|---|---|
| Fill | #f5f5f5 `bg-bg-cabinet` | same |
| Corners | top-left + top-right r32 over the white page | tl 48, tr 0 |
| Bottom padding | 48 (last block -> legal bar, D10) | 32 |
| Height | `flex-1` - fills to the legal bar on short / empty pages | same |

Recipe (CabinetPage.tsx:12):
`flex min-w-0 flex-1 flex-col bg-bg-cabinet pb-12 rounded-t-[32px] lg:pb-8 lg:rounded-tr-none lg:rounded-tl-[48px] ${className}`.
(Equivalent to dashboard.md SN-01's `lg:rounded-t-none
lg:rounded-tl-[48px]`; this order-independent form is preferred.)
Callers' `className` values (`lg:pb-10` dashboard, `lg:min-h-[1195px]`
profile) are desktop-only and keep working.

### 2.5 CabinetPageHead (D9, D10, TR-03, TR-04, D8)

#### 2.5.1 Rhythm

| Gap | Phone | Desktop | Source |
|---|---|---|---|
| slab top -> first element (back row or title) | 48 (`py-12`) | 32 (`lg:py-8`) | TR-03 / D10, article crumb 3176:6558 |
| back row -> title | 48 (`gap-6` + back `max-lg:mb-6`) | 24 | TR-03; = public crumb -> H1 48 (shell-public 2.1) |
| title -> subtitle | 16 (`gap-4 lg:gap-2`) | 8 | TR-03 / hero 3082:3248 |
| title block -> badge row | 24 (`gap-6`) | 24 | desktop 5192:79073 (no master; kept) |
| left column -> actions | 32 (`gap-8 lg:gap-[26px]`) | 26 (row) | TR-03 / hero body -> CTA 3082:3250 |
| actions between each other | 8 (`gap-2 lg:gap-4`) | 16 | D8 / TR-04 |
| head -> first page block | 48 (`py-12` bottom) | 32 | TR-03, dashboard.md SN-02 |

Contract for page areas: the first block after the head starts with NO
top padding on phones (orders tabs / toolbars / dashboard select
already do; order detail `DetailsBody` `pt-4` must become `pt-0
lg:pt-4` - detailParts.tsx:18, order-detail area, C6).

#### 2.5.2 Type

- H1: `text-h2 text-neutral-900` = phone 30/36 Bold -0.6 (unlayered
  phone token), desktop 44/48 -0.02em 700 = today's literal
  (CabinetPageHead.tsx:68). Light runs via `TitleLight` (300). D9.
- Subtitle: `text-[14px] leading-5 text-neutral-500 lg:leading-6` (Body
  Small 14/20 #777779; desktop 14/24 kept). Not the `text-body-sm` token
  (desktop body-sm is 16/24).
- Back row: BackButton (ui/Breadcrumb BackCrumbBody: 40 ring + 16 +
  16/22 SemiBold #343435), unchanged (article crumb 3176:6559).
- h1 gets `tabIndex={-1}` and `outline-none`: the focus fallback target
  after sign-in / welcome close (SC-17). Invisible change.

#### 2.5.3 Actions slot (TR-04, D8)

- One action: hug Button/Small 42, left-aligned (e.g. orders "Зробити
  замовлення" 210 x 42, assortment "Завантажити з Excel").
- Two or more: each full content width (342 at 390, 272 at 320, 552 at
  600), 42 tall, 8 apart, in the caller's order (secondary outlined
  first, primary solid last - dashboard and order detail already pass
  them in that order).
- Labels that do not fit wrap inside the pill instead of overflowing
  (SC-24: "Запит на скасування надіслано" 242 (m) > 224 at 320).

Recipe (CabinetPageHead.tsx:75):

```tsx
<div className="flex flex-col items-start gap-2 max-lg:has-[>*+*]:items-stretch max-lg:[&>*>span:last-child]:flex-1 max-lg:[&>*>span:last-child]:whitespace-normal lg:shrink-0 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-4">
```

How it works: Button's DOM is wrapper > [arrow span] + pill span (the
pill is always the last child, ui/Button.tsx:193-213); a column flex
container stretches every action when there are 2+ (`has-[>*+*]`), and
the pill fills its wrapper. Desktop resolves to `flex flex-row
flex-wrap items-center gap-4 shrink-0 justify-end` = today. A hint
`<p>` (StatusAction "hint", OrderDetailsView.tsx:108-109) just takes the
full width. The dashboard spec's per-button `max-lg:w-full
max-lg:[&>span]:flex-1` (dashboard.md 2.2) becomes redundant but
harmless. Button sizes: list pages already pass `size="responsive"`
(42); detail pages pass the default size and get 42 from the shared
D8 Button fix (section 4, SN-3).

#### 2.5.4 Full recipe (CabinetPageHead.tsx:18-78)

```tsx
export function TitleLight({ children, line = false }: { children: ReactNode; line?: boolean }) {
  return <span className={`font-light${line ? " max-lg:block" : ""}`}>{children}</span>;
}

<section className={`flex flex-col gap-8 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-[26px] lg:py-8 lg:pl-10 lg:pr-8 ${className}`}>
  <div className="flex min-w-0 flex-col items-start gap-6">                       {/* :65 unchanged */}
    {back && <BackButton {...back} className={`max-lg:mb-6 ${back.className ?? ""}`} />}
    <div className="flex flex-col gap-4 lg:gap-2">
      <h1 tabIndex={-1} className="text-h2 text-neutral-900 outline-none">{title}</h1>
      {subtitle && <p className="text-[14px] leading-5 text-neutral-500 lg:leading-6">{subtitle}</p>}
    </div>
    {meta && <div className="flex flex-wrap items-start gap-2">{meta}</div>}     {/* :73 unchanged */}
  </div>
  {actions && <div className="... see 2.5.3 ...">{actions}</div>}
</section>
```

`TitleLight line` (new, opt-in): on phones the Light run starts its own
line. Detail titles use it so "Замовлення" / "№48291064" is a stable 2
lines at every phone width: "Замовлення " 178.9 + "№48291064" 162.8 =
341.7 (m) is 0.3 px under the 342 content at 390, i.e. it would flip
between 1 and 2 lines with font metrics (V14). Callers:
OrderDetailsView.tsx:148 and ReturnDetailsView.tsx:100 (order-detail /
returns areas) write `<TitleLight line>№{order.number}</TitleLight>`.
The dashboard greeting keeps its own title node (dashboard.md DB-07:
"Вітаю," line + company `max-lg:line-clamp-2`) - this area adds no
clamp to the h1 (nested -webkit-box clamps would fight).

#### 2.5.5 Head variants at 390 (after the change)

| Route | Map (y) | First block |
|---|---|---|
| /dashboard | H1 114..186 (2 lines, dashboard node); subtitle 202..222; actions 254..296 + 304..346 | 394 (select) |
| /orders | H1 114..150 "Мої замовлення"; subtitle 166..186; action 218..260 hug 210 | 308 (tabs) |
| /orders?tab=returns | H1 + subtitle, no actions | 234 |
| /orders/48291064 | back 114..154; H1 202..274 (2 lines); badges 298..336 (StatusPill md 38); actions 368..410 + 418..460 | 508 |
| /orders/returns/9104 | back; H1 2 lines; 1 badge; 0..1 action | 458 / 384 |
| not-found order / return | back 114..154; H1 202..274 "Замовлення не знайдено" (364.5 (m) -> 2 lines below 430) | slab continues to the legal bar |
| /profile | H1 114..150; subtitle 166..186 | 234 |
| /assortment | back 114..154; H1 202..238; subtitle 254..294 (2 lines); action 326..368 | 416 |
| /materials | H1 114..150; subtitle 166..226 (3 lines) | 274 |
| /materials/catalogs | back + H1 + subtitle | |

320: titles wrap at words ("Мої замовлення" 231.2 fits 272; "Замовлення
не знайдено" 2 lines; "Вітаю," / company per dashboard spec); full-width
actions are 272. 600: actions 552 (C10).

Today (for comparison) the first order-detail card starts at 531 (strip
82 + head 383); after: 508. The detail head itself grows to 442 because
TR-03 asks 48 / 48 / 32 / 48; the alternative (24 back -> title, as
desktop) is open point C3.

### 2.6 PlatformFooter legal bar (D1, legal band 3111:14958)

Master band (dump audit/mobile/shell-cabinet/out/fig-legal.txt): px 24,
py 24, gap 24; row 1 = mini logo 29.2 x 33.7 at y 24 + 16 + copyright
14/30 Onest (x 69.2); "Політика конфіденційності" y 81.7, "Угода про
публічну оферту" y 135.7 (54 pitch); Chilline y 189.7 (not used in the
cabinet: the desktop cabinet bar 4329:56289 has none). Cabinet fill
#1d1d1f (D1).

| | 320 | 360..639 |
|---|---|---|
| Row 1 | logo 29.2 x 33.7 + 16 + copyright wrapping to 2 lines (254.8 (m) > 226.8) = 60 tall | one line (row 300.0 <= 312) = 33.7 tall |
| Total | 24 + 60 + 24 + 30 + 24 + 30 + 24 = 216 | 189.7 |

Recipe (PlatformFooter.tsx):

```tsx
<footer data-cabinet-behind
  className="flex flex-col items-start gap-6 bg-neutral-900 px-6 py-6 text-[14px] leading-[30px] text-white sm:flex-row sm:items-center sm:justify-between lg:gap-2 lg:px-8 lg:py-3 lg:text-[12px]"
  style={{ fontFamily: "var(--font-onest)" }}>
  <div className="flex items-center gap-4 lg:gap-6">
    <Link href="/" aria-label={/* unchanged, :20 */}
      className="relative block h-[33.684px] w-[29.237px] shrink-0 before:absolute before:-inset-x-[7.4px] before:-inset-y-[5.2px] before:content-[''] lg:h-[27px] lg:w-[80px] lg:before:hidden">
      <img src="/figma-export/footer-mini-logo.svg" alt="" aria-hidden decoding="async"
        className="absolute inset-0 block size-full lg:hidden" />
      {/* the three absolute spans of :21-29 each get max-lg:hidden */}
    </Link>
    <p className="lg:whitespace-nowrap">(c) line unchanged</p>
  </div>
  <div className="flex flex-col items-start gap-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-0">
    {/* the two spans (:37-42) unchanged; whitespace-nowrap stays (each fits 272: 177.8 / 182.3 (m)) */}
  </div>
</footer>
```

Desktop check: flex-row (sm), items-center (sm), justify-between, gap 8,
px 32, py 12, 12/30, logo 80 x 27, row gap 24, nowrap copyright, titles
row wrap gap-x 24 / gap-y 0 = today. The mini logo is white (fills
`var(--fill-0, white)`) - fine on #1d1d1f. Hit box of the mini logo 44 x
44 via the pseudo element (V17).

### 2.7 SignInPrompt (signed-out cabinet routes in the public chrome; D2, D9, TR-03, TR-04)

Composition = the master hero text card without the photo band
(3082:3246 / 3176:4376: full-bleed, 1-px #8e8e8f ring top / right /
bottom, rounded right 32, px 24 py 48), 48 under the header (TR-03, no
crumb), page title + text + one action (hero H1 -> body 16 -> CTA 32).
Title size: the cabinet H2 30/36 (D9 "cabinet page titles", TR-03
mapping desktop 44/48 -> 30/36; same size before and after sign-in on
the same URL; shell-public O12 agrees).

Geometry at 390 ("Мої замовлення"):

| y | Element |
|---|---|
| 66..114 | white (48) |
| 114..376 | card x 0..390: ring t/r/b #8e8e8f, r32 right corners, inside px 24 py 48 |
| 162..198 | title 30/36 Bold -0.6 (1 line; "Деталі замовлення" / "Деталі повернення" also 1 line at 390, 2 at 320) |
| 214..254 | text 14/20 #777779 (2 lines) |
| 286..328 | Button/Small "Увійти" hug 97 x 42 (B2C: "Кабінет") |
| 376.. | white; public footer starts at >= the viewport bottom (main min-height, SC-19) |

Recipe (SignInPrompt.tsx:21-26):

```tsx
<div className="mt-12 flex flex-col items-start gap-4 rounded-r-[32px] border-y border-r border-stroke-default px-6 py-[47px] lg-shop-pad-x lg:mt-0 lg:gap-6 lg:rounded-none lg:border-0 lg:py-20">
  <h1 className="text-h2 text-neutral-900">{title}</h1>
  <p className="text-[16px] leading-6 text-neutral-800 lg:text-body-sm lg:text-neutral-500">{text}</p>   {/* SYSTEM critique round 1 */}
  <Button type="button" size="responsive" className="max-lg:mt-4" onClick={() => openAuth()}>
    {user ? "Кабінет" : "Увійти"}
  </Button>
</div>
```

Desktop: `.lg-shop-pad-x` (unlayered, from 640) beats px-6 as today;
gap 24, py 80, no border / radius / margin = today; h1 `text-h2` =
today's 44/48 -0.88 700 literal; text `lg:text-body-sm` keeps today's
desktop 16/24 (today `text-body-sm`). Pre-hydration stays `return null`
(the main min-height reserves the space, 2.9).

### 2.8 WelcomeModal (D7 short modal, TR-17, TR-23, D8, D9)

Card = the D7 short-modal card (same numbers the shared Modal718 phone
card must use, C8): centred, width 100% - 48 (342 at 390, 272 at 320,
552 at 600; desktop 718 unchanged), white, r32, 1-px #8e8e8f ring, p 24
incl. the ring, title 24/28 Bold -0.48, cross 24 in a 44 hit box,
description 16/24 #343435, one full-width action, max-height 100% of the
24-inset overlay (= 100dvh - 48) with the CTA always visible.

Phone structure: fixed head (title row + description) / scrolling body
(logo tile + second line) / CTA. The two phone-only wrappers are
`lg:contents` so the desktop column is unchanged.

Geometry at 390 x 844 (card 342 x 548, y 148..696, no scroll):

| Block | Height | Gap after | Source |
|---|---|---|---|
| padding | 24 | | D7 |
| title "Вітаємо на платформі" / "Binar-2000" (2 lines; title column 260 >= 250.2 (m)) + cross (glyph 24 flush with the inner right edge, centred on line 1) | 56 | 16 | TR-17 |
| "Раді бути вашими партнерами" 16/24 #343435 (227.9 (m), 1 line) | 24 | 24 | TR-17 description |
| tile #f8f8f8 r24, px 16 py 24: avatar 120 r16 (person glyph 86.6; SYSTEM A-12) / 24 / pill 42 full tile width / 16 / caption 12/16 | 266 | 24 | TR-23 (avatar, 24, Button, 16, caption) |
| "Додавайте співробітників та контрагентів у своєму профілі" 16/24 #343435 (2 lines) | 48 | 24 | TR-17 |
| CTA "Перейти в профіль" accent 294 x 42 | 42 | | D8, menu button 3117:14325 |
| padding | 24 | | |

Widths: tile content = card - 48 - 32 = 192 at 320 >= the pill's 188.7
("Завантажити лого" 140.7 (m) + 46 padding + 2 ring) - fits; the full
desktop label "Завантажити лого компанії" (208.6 (m)) is phone-hidden
(it needs 256.6, the root of V2 / F1). 320 x 568: card 272 x 520; head
148 (title 3 lines 84 + 16 + description 2 lines 48), CTA 42 -> body
viewport 234 of 338: the body scrolls, title / cross / CTA stay put
(V3 / F7). 375 x 667: title 3 lines; card fits without scroll.

Recipe (WelcomeModal.tsx, line refs = today):

| Line | Today | Change |
|---|---|---|
| 21-22 | `AVATAR = 144.648` used inline | keep constants for comments; avatar box moves to classes |
| 107 | overlay `... p-4 sm:p-8` | `p-6 sm:p-8` |
| 125 | card `scrollbar-hidden relative flex max-h-full w-[min(718px,100%)] flex-col gap-6 overflow-y-auto overscroll-contain rounded-[32px] border border-stroke-default bg-white p-6 ... sm:p-10 lg:gap-10 lg:rounded-[48px] lg:p-[59px]` | `p-6` -> `p-[23px]`; add `max-lg:overflow-hidden` (the card stops scrolling on phones; the body does). Everything else unchanged |
| 130 | title row `flex items-start justify-between gap-4` | `gap-0 lg:gap-4` (the 44 box carries 10 px of air) |
| 133-135 | h2 text | `Вітаємо на платформі <span className="max-lg:whitespace-nowrap">Binar-2000</span>` (no "Binar-" / "2000" break, V15) |
| 142 | close `-mr-1 -mt-1 flex size-8 ... lg:m-0`, glyph `size-8` | `-mr-[10px] -mt-2 flex size-11 ... lg:m-0 lg:size-8`, glyph `size-6 lg:size-8` (V17 / F16) |
| 147 | `text-body-sm text-neutral-900 lg:text-body-md` | `text-body-md text-neutral-800 lg:text-neutral-900` (phone 16/24 #343435, desktop 20/28 #1d1d1f = today) |
| 150 | `<div className="flex flex-col items-center">` | wrap 150-197 in `<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain lg:contents">` (phone scroll body) |
| 151 | tile `... gap-[27px] rounded-3xl bg-bg-subtle px-8 py-[30px]` | `gap-6 px-4 py-6 lg:gap-[27px] lg:px-8 lg:py-[30px]` |
| 152-155 | avatar with inline `style={{ width, height, borderRadius }}` | drop the style; `size-[120px] rounded-2xl lg:size-[144.648px] lg:rounded-[19.2864px]` (SYSTEM A-12) |
| 159 | `PersonIcon className="size-[106px]"` | `size-[86.6px] lg:size-[106px]` (SYSTEM A-12) |
| 162 | `flex w-full flex-col items-center gap-3` | `gap-4 lg:gap-3` |
| 181 | label | `<span className="lg:hidden">{logo ? "Замінити лого" : "Завантажити лого"}</span><span className="max-lg:hidden">{logo ? "Замінити лого компанії" : "Завантажити лого компанії"}</span>` |
| 185 | caption `text-[14px] leading-6` | `text-[12px] leading-4 lg:text-[14px] lg:leading-6` (TR-23 caption 12/16; error stays `text-negative` #d92d20 + role=alert) |
| 195 | line 2 `text-body-sm text-neutral-900 lg:text-body-md` | `text-body-md text-neutral-800 lg:text-neutral-900` |
| 199 | `<Button type="button" variant="accent" fullWidth ...>` | `size="responsive"` (42 on phones; `lg:` values = large) + `className="max-lg:flex-none"` (no flex-basis 0 growth in the phone column) |
| 72-78 | useModalBehavior | add `fallbackFocus: () => document.querySelector("main h1[tabindex='-1']") ?? document.querySelector("body > header a")` (SN-4); keeps `inertSelector: "body > header"` |

Interactions (unchanged logic): opens after a partner's first sign-in;
Escape / cross / scrim close and mark welcomed; the pill opens the file
input; PNG / JPG <= 5 MB -> avatar (and the chip / menu avatar) update;
other files -> caption error; "Перейти в профіль" -> /profile. Lock =
html overflow (useModalBehavior), header inert, focus on the cross at
open; on close focus goes to the opener if alive, else the page h1
(SC-17). The gate never hides it (it opens after hydration).

### 2.9 Pre-hydration gate and loading (PlatformChrome.tsx)

- Gate (V18): partners see the 66 bar during the gate on phones,
  because after D1 the public and platform phone bars are the same
  pixels (logo 24 / 16.28, cart disc x vw-116, burger x vw-60; no badge
  before hydration in either). PlatformChrome.tsx:64 `st.textContent`:
  `#platform-gate~:not(header){visibility:hidden!important}@media (min-width:640px){#platform-gate~header{visibility:hidden!important}}`
  (desktop: everything hidden exactly as today). The 4-s fallback and
  the removal effect (102-104) are unchanged. If shell-public ever adds
  phone-only pixels to the public bar, this exception must follow (C11).
- Visitors / B2C on cabinet routes (F10 / SC-19): the public-branch
  `<main>` reserves the first screen on phones so the footer never jumps
  when the prompt mounts: PlatformChrome.tsx:114
  `className={\`flex flex-1 flex-col${onPlatformRoute ? " max-lg:min-h-[calc(100dvh-var(--site-header-h,66px))]" : ""}\`}`
  with `const onPlatformRoute = isPlatformRoute(pathname)` (pathname is
  known on the server, no hydration mismatch). Landing routes keep the
  exact class string. Long public catalog / materials pages are taller
  than the viewport anyway (no effect).
- Platform branch: content wrapper PlatformChrome.tsx:124 gets
  `data-cabinet-behind` (inert target of the menu sheet); classes
  unchanged.
- Loading inside a cabinet page (views render `<div className="flex-1" />`
  or null before hydration): the slab fills the screen (`flex-1`), no
  spinner (no master). Empty / error states inside the slab belong to
  the page areas (TR-24).

### 2.10 Not found inside the cabinet (SC-09)

(SYSTEM C-24: the order-detail cluster renders this head through a route-segment
src/app/orders/[id]/not-found.tsx and KEEPS `notFound()` for the 404 status;
the "drop notFound()" fix below is superseded.)

- /orders/<unknown>: `src/app/orders/[id]/page.tsx:26` calls
  `notFound()` before OrderDetailsView, so the existing head (back "До
  замовлень" + "Замовлення не знайдено", OrderDetailsView.tsx:124-130)
  never shows; the user gets Next's English "404 | This page could not
  be found." in system font on white between the header and the legal
  bar. Fix (order-detail area, file not in this area): drop the
  `notFound()` call (keep `generateStaticParams`, `dynamicParams`
  default true) so the view renders its not-found head inside the slab,
  exactly like returns already do (/orders/returns/1 measured fine).
- Any other unknown URL under a platform section (e.g. /dashboard/x) -
  open point C7 (global branded `src/app/not-found.tsx` needs sign-off:
  it changes the desktop and landing 404 too).

### 2.11 Interaction map (what opens what on a cabinet phone)

| From | Opens | Kind | Layer | Lock / inert | Focus |
|---|---|---|---|---|---|
| Burger | cabinet menu | full-screen sheet under the bar (TR-09) | z-45 | html overflow; `[data-cabinet-behind]` inert | stays on burger; returns to burger |
| Menu account row | account summary (auth area) | full-screen sheet (D7) | z-60 (auth area) | its own | opener = burger |
| Cart disc | cart (cart area) | full-screen sheet (D7) | z-60 (cart area) | its own | opener = cart disc |
| First partner sign-in | welcome modal | centred short modal (D7) | z-60 | html overflow; header inert | cross; fallback page h1 |
| SignInPrompt button | sign-in / account drawer (auth area) | sheet (D7) | z-60 | its own | fallback page h1 after the shell swap |
| Head actions | page-owned modals / links | per area | | | |

No bottom sheets, no side drawers, no sticky bottom bars from this area
except the menu CTA dock (TR-18) (D13).

---------------------------------------------------------------------

## 3. Bugs to fix (both lenses merged, nothing dropped)

Severity: blocker / major / minor / nit. "Fix here" = this area's files.

| Id | Sev | Where | What | Fix | File:line |
|---|---|---|---|---|---|
| SC-01 (V2, F1) | blocker @320, major 360-413 | Welcome modal, all widths < 414 | "Завантажити лого компанії" nowrap pill needs 256.6 in a 174 (320) / 214 (360) / 244 (390) tile: dialog scrolls sideways at 320 (scrollWidth 313 > 286, label cut), sticks 11 px out at 360, off-centre at 390 | phone label "Завантажити лого" / "Замінити лого", tile `px-4 py-6`, card p 24 incl. ring, 24 margins (2.8) | WelcomeModal.tsx:151, 174-182 |
| SC-02 (V1, F2) | blocker @320 | Legal bar, every platform route at 320 | copyright `whitespace-nowrap` right edge 346 > 320, clipped "All rights rese"; 13.5-px right gutter at 360 | phone legal band: stacked, copyright wraps, nowrap only `lg:` (2.6) | PlatformFooter.tsx:16, 19, 31 |
| SC-03 (V3, F7) | major | Welcome modal 320 x 568 (and 390 x 568) | card scrolls inside (638 / 534), CTA at y 582-631 below the card end, scrollbar hidden | fixed head + scrolling body + always-visible CTA; avatar 96 on phones (2.8) | WelcomeModal.tsx:22, 125, 150-201 |
| SC-04 (V4, V6, F3) | major | every cabinet route | section strip = desktop rail turned sideways (not in the mobile language), static: gone after 120 px of scroll; no dock; switching section needs a scroll to the top of 2300-2800-px pages | D1 burger + cabinet menu sheet in the sticky bar (2.1, 2.2); remove the strip (2.3) | SideMenu.tsx:87-92; PlatformHeader.tsx:37-65; new CabinetMenu.tsx |
| SC-05 (V5, F4, F12, V19, F14) | minor | strip, 320-430 | 344-px strip scrolls at 320 (active "Матеріали" clipped on /materials), 10-px labels (tinyText x4), px-16 vs 24 gutters, active label grey, /profile lights nothing | resolved by SC-04 (menu rows 14/20, active brand + aria-current, "Профіль" row) | SideMenu.tsx:53, 69, 89 |
| SC-06 (V7, F18) | major | CabinetPageHead + SignInPrompt | H1 32/36 -0.64 (off the phone scale; public shop is 40/42), subtitle 14/24 | `text-h2` (30/36 -0.6 phone, today's 44/48 desktop), subtitle 14/20 (2.5.2, 2.7) | CabinetPageHead.tsx:68, 71; SignInPrompt.tsx:22 |
| SC-07 (V8, F6) | major | heads with 2 actions; detail heads | list heads 42, detail heads 48.5 / 15 px (Button large phone fallback); two actions wrap into ragged hug rows (203 / 210) | actions slot stacks full width 8 apart for 2+, hug for 1 (2.5.3); 42 via D8 Button fix (SN-3) | CabinetPageHead.tsx:75; (ui/Button.tsx:80-81 shared); OrderDetailsView.tsx:85-106, 165, ReturnDetailsView.tsx:106 use default size |
| SC-08 (V9) | major | /dashboard, long company | greeting 7 lines @320, 5 @390 (+144..216 px) | dashboard title node: "Вітаю," own line + company `max-lg:line-clamp-2` (dashboard.md DB-07); this area keeps the h1 unclamped | DashboardView.tsx:532-538 (dashboard area) |
| SC-09 (V10, F11) | major | /orders/99999999 | Next default English 404 (system font, white) inside the shell; "Failed to load resource 404" | drop `notFound()` so OrderDetailsView renders its own not-found head (2.10); global not-found = C7 | app/orders/[id]/page.tsx:26 (order-detail area) |
| SC-10 (V11) | minor | legal bar | 92 / 122 compact bar, 12/30, 80 x 27 logo, titles in one wrapping row - not the mobile legal band | 3111:14958 band on #1d1d1f: px 24 py 24 gap 24, mini logo + 16 + 14/30, each title its own row (2.6) | PlatformFooter.tsx:15-44 |
| SC-11 (V12) | minor | signed-out cabinet routes | bare 262-px block, title off-scale, reads as "footer page" | hero text card 48 under the bar, 30/36 title, 16 / 32 rhythm, main min-height (2.7, 2.9) | SignInPrompt.tsx:21-26; PlatformChrome.tsx:114 |
| SC-12 (F5, V13) | minor | chip / account avatar | initials take punctuation or the legal form ("Т" + an opening guillemet, '"П', "ТЗ"), empty name = empty disc + "Особистий кабінет:   " | `companyInitials` + PersonIcon fallback + aria-label without a dangling colon (2.1) | PlatformHeader.tsx:28-34, 46, 50-55 |
| SC-13 (V14) | minor | detail heads | 383 tall at 390; title "Замовлення / №48291064" 2 lines at 320-390, 1 at 430+ (unstable) | TitleLight `line` (stable 2 lines), stacked actions; first card 531 -> 508 (2.5.4-2.5.5) | CabinetPageHead.tsx:18-20; callers OrderDetailsView.tsx:148, ReturnDetailsView.tsx:100 |
| SC-14 (V15) | minor | welcome type | title breaks "Binar-" / "2000"; body 14/20 vs Modal718 18/26; caption 14/24 | nowrap "Binar-2000" on phones, description 16/24 #343435 (TR-17), caption 12/16 (TR-23) | WelcomeModal.tsx:133-135, 147, 185, 195 |
| SC-15 (V16) | minor | slab | square corners under the strip; pb 32 | `rounded-t-[32px]`, pb 48 (2.4) | CabinetPage.tsx:12 |
| SC-16 (V17, F16) | minor | small targets | welcome cross 32 x 32; footer logo 80 x 27; strip labels | cross 24 glyph in 44 box; footer mini-logo 44 hit (pseudo); strip gone | WelcomeModal.tsx:142; PlatformFooter.tsx:20 |
| SC-17 (F8) | minor | focus | (a) after sign-in from SignInPrompt the opener unmounts -> focus on BODY; (b) after closing the welcome modal -> BODY | h1 `tabIndex={-1}` target (2.5.2); useModalBehavior `fallbackFocus` (SN-4) used by WelcomeModal (here) and AuthDrawer (auth area) | CabinetPageHead.tsx:68; WelcomeModal.tsx:72-78; cart/useModalBehavior.ts:78-80 (shared) |
| SC-18 (F9) | minor | Back with the account sheet / cart open | previous page renders under a still-open sheet, html overflow stays hidden, header inert | providers close on pathname change (shell-public N7); the cabinet menu closes on pathname change (2.1) | auth/AuthProvider.tsx:66-116, cart/CartProvider (auth / cart areas); PlatformHeader.tsx (here) |
| SC-19 (F10) | minor | visitors on cabinet routes | server HTML = header + footer at y 66; the prompt pushes the footer ~260 down after hydration | public-branch main `max-lg:min-h-[calc(100dvh-var(--site-header-h,66px))]` on platform routes (2.9) | PlatformChrome.tsx:114 |
| SC-20 (V18) | nit | gate | whole body blank 200-400 ms, although both phone bars are identical | phone gate keeps `header` visible (2.9) | PlatformChrome.tsx:64 |
| SC-21 (F13) | minor | legal titles | underlined spans look like links but are dead | DEFERRED: no legal pages exist (MATRIX q.13); the public legal bar has the same spans (landing frozen). Turn into `<Link>`s when the pages exist | PlatformFooter.tsx:37-42 |
| SC-22 (F15) | nit | header under an open sheet | chip / cart look live but are inert under the account sheet / cart | resolved by design: phone account / cart sheets cover the bar (D7, auth / cart areas); the cabinet menu leaves the bar live (cross + cart work) | - |
| SC-23 (F17, V13 part) | nit | chip on phones | company name hidden at 430-639; chevron does not flip while the sheet is open | name: resolved (chip removed on phones, name in the account row). Chevron flip: REJECTED for this pass (desktop-only element, desktop frozen) | PlatformHeader.tsx:57, 61 |
| SC-24 (new, predicted from (m)) | minor | detail head at 320 | full-width pill label "Запит на скасування надіслано" 242 > 224 label box | actions slot lets pill labels wrap (`whitespace-normal`, 2.5.3); recommend a phone label "Запит надіслано" to the order-detail area | CabinetPageHead.tsx:75; OrderDetailsView.tsx:85-87 |

Totals: 21 to fix (SC-01..SC-20, SC-24). 19 of them in this area's
files (SC-13, SC-17 and SC-18 additionally need caller / shared /
provider changes listed in their rows), 2 only in other areas (SC-08
dashboard, SC-09 order-detail). Resolved by design elsewhere 1 (SC-22,
D7 sheets of the auth / cart areas). Deferred / rejected 2 (SC-21 dead
legal titles: no pages; SC-23 chevron flip: desktop-only, frozen).

---------------------------------------------------------------------

## 4. Shared needs

### 4a. Needed from the shared layer / other areas

| # | Atom / API | Status | Proposed API and classes | Why |
|---|---|---|---|---|
| SN-1 | PhoneMenu primitives (src/components/PhoneMenu.tsx) | NEW, provided by shell-public (its N6) | `PhoneMenuSheet({ id, open, onClose, label, returnFocus, inertSelector?, children })`, `PhoneMenuGroup`, `PhoneMenuLabel({ open, delay })`, `PhoneMenuRow({ open, delay, href?, onClick?, active?, trailing?, className? })`, `PhoneMenuDivider({ open, delay })`, `PhoneMenuCtaDock({ open, delay, children })`; classes in shell-public 2.3 | D1: the cabinet sheet = the master menu idiom; one implementation for both menus |
| SN-2 | PhoneMenuRow aria pass-through | CHANGE to SN-1 (small) | `ariaLabel?: string; ariaHaspopup?: "dialog"` -> `aria-label` / `aria-haspopup` on the rendered element | account row is a dialog opener whose accessible name must carry the company (truncated visually) |
| SN-3 | Button D8 phone fix | CHANGE ui/Button.tsx:80-81, 94, 108, 120 (shared, polish-p1-button) | `labelSize.large` phone part = the `small` string (`rounded-[24px] border px-[23px] py-[9px] text-button-md whitespace-nowrap`) with today's `sm:` values; `arrowWrap.large` / `arrowIcon.large` / `plusIcon.large` phone = small (42 / 11 / 13). Optional new prop `fullWidth?: boolean \| "phone"` ("phone" = wrapper `max-lg:flex max-lg:w-full max-lg:min-w-0`, pill `max-lg:flex-1`) | detail heads render default-size Buttons in the CabinetPageHead actions slot (48.5 / 15 px today) |
| SN-4 | useModalBehavior fallback focus | CHANGE cart/useModalBehavior.ts:15-27, 78-80 (on top of shell-public N2 preventScroll) | option `fallbackFocus?: () => HTMLElement \| null`: on close, if the opener is disconnected or inside `[inert]`, focus `fallbackFocus()` with `{ preventScroll: true }`; default undefined = today | SC-17: focus lands on BODY after the welcome modal and after the shell swap on sign-in |
| SN-5 | Menu glyphs | MOVE (shell-public moves ArrowUpRight into PhoneMenu.tsx) + EXPORT Burger | `export function Burger({ open }: { open: boolean })` from Header.tsx:166-186 (or PhoneMenu.tsx); no class change | the cabinet burger must be the same glyph + X morph (3084:3674) |
| SN-6 | Root viewport | NEW in app/layout.tsx (D12, shell-public N4) | `export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" }` | PhoneMenuCtaDock pads with env(safe-area-inset-bottom) |
| SN-7 | Overlays close on route change | CHANGE auth/AuthProvider.tsx, cart/CartProvider.tsx (auth / cart areas, shell-public N7) | render-phase pathname compare -> `setOpen(false)` | SC-18 |
| SN-8 | Phone account sheet | CHANGE auth/AuthDrawer.tsx (auth area, D7) | `openAuth("account")` shows the full-screen sheet (66 bar, Title Large title, 24 cross in a 48 box) at z-60 with the summary rows, "Перейти в профіль" (accent) and "Вийти" (outlinedDark) stacked 8 apart | the menu account row hands off to it |
| SN-9 | BackCrumbBody | EXISTS ui/Breadcrumb.tsx:17-26, keep unchanged | 40 ring + 16 gap + 16/22 SemiBold #343435 | CabinetPageHead back row = article crumb 3176:6559 |
| SN-10 | Modal718 phone card numbers | CHANGE platform/ui/Modal718.tsx (shared) | same as 2.8: p 24 incl. ring, 24 overlay margins, title 24/28, cross 24 in 44, description 16/24 #343435 | the welcome modal and the cabinet Modal718 dialogs must look identical (C8) |

### 4b. Provided by this area to other areas (consumers must not edit these files)

| API | Contract |
|---|---|
| `CabinetPageHead` (platform/ui/CabinetPageHead.tsx) | phone pt 48 / pb 48 / 24 gutters; back -> title 48; title -> subtitle 16; 24 to badges; 32 to actions; 1 action hug, 2+ full width 8 apart (secondary first); first page block starts with 0 top padding on phones; h1 is the focus fallback target |
| `TitleLight({ children, line? })` | `line` puts the Light run on its own line below 640 |
| `CabinetPage` | slab r32 top, pb 48 phone; `className` for desktop-only additions |
| `SignInPrompt({ title, text })` | unchanged props; phone hero card |
| `companyInitials(name)` + `CompanyAvatar` | for any account avatar (auth area summary may reuse) |
| `data-cabinet-behind` | marks the platform content wrapper and the legal bar (inert while the cabinet menu is open); overlays rendered elsewhere must not carry it |

---------------------------------------------------------------------

## 5. Files

This area's files (disjoint from every other area):

| File | Change |
|---|---|
| src/components/platform/PlatformHeader.tsx | phone cluster = cart + burger (`lg:hidden`), chip `max-lg:hidden`, menu state + close rules (pathname, 640, cart, logo), burger ref, CompanyAvatar, initials via companyInitials, aria-label fix; renders CabinetMenu |
| src/components/platform/SideMenu.tsx | delete the phone strip (87-92); desktop aside untouched |
| src/components/platform/PlatformFooter.tsx | phone legal band (2.6), `data-cabinet-behind`, mini logo + 44 hit, wrap rules |
| src/components/platform/PlatformChrome.tsx | gate CSS phone exception (64); public main min-height on platform routes (114); `data-cabinet-behind` on the content wrapper (124) |
| src/components/platform/ui/CabinetPage.tsx | slab phone corners + pb (12) |
| src/components/platform/ui/CabinetPageHead.tsx | phone rhythm, `text-h2`, subtitle 14/20, actions slot, h1 focus target, TitleLight `line` |
| src/components/platform/ui/SignInPrompt.tsx | phone hero card, `text-h2`, 16 / 32 rhythm |
| src/components/auth/WelcomeModal.tsx | D7 phone card, head / body / CTA structure (`lg:contents`), short pill label, avatar 96, type, cross 44, fallback focus |

New files (this area):

| File | Content |
|---|---|
| src/components/platform/CabinetMenu.tsx | the cabinet menu sheet on PhoneMenu primitives (2.2) |
| src/components/platform/companyInitials.ts | `companyInitials(name)` (2.1) |

Not this area (listed in 4a or as call sites): src/components/PhoneMenu.tsx
and Header.tsx (shell-public), ui/Button.tsx, cart/useModalBehavior.ts,
app/layout.tsx, platform/ui/Modal718.tsx (shared layer), auth/
AuthProvider.tsx + AuthDrawer.tsx (auth), cart/CartProvider.tsx (cart),
DashboardView.tsx (dashboard: title node), OrderDetailsView.tsx +
detailParts.tsx + app/orders/[id]/page.tsx (order-detail: TitleLight
line, `pt-0 lg:pt-4`, phone label, drop notFound), ReturnDetailsView.tsx
(returns: TitleLight line). Optional / gated: src/app/not-found.tsx (C7).

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Tools: audit/mobile/kit/phone.mjs (openPhone with touch, domChecks,
shootSegments, shootViewport), the audit scripts in audit/mobile/
shell-cabinet/ (visual.mjs, visual-probe.mjs, visual-heads.mjs,
functional.mjs, functional-extra.mjs, functional-welcome-widths.mjs,
functional-nojs.mjs, functional-tabs.mjs) re-run after the build, and
audit/mobile/kit/baseline.mjs + compare.mjs. Use raw
`page.touchscreen.tap(x, y)` or DOM clicks for menu / sheet flows
(Playwright `click()` auto-scroll fakes scroll jumps - memory note).
Instant scrolls only (`scrollTo({ top, behavior: "instant" })`).

Widths x heights: 320x568, 360x780 (+ 360x640), 375x667, 390x844
(+ 390x568, 390x664), 430x932, 600x960, 639x900, 640x900.

A. Header (seed b2b, every platform route)
1. Bar 66 at every width; `--site-header-h` = 66px; sticky top 0 at
   scrollY 0 / 600 / end.
2. Logo box (24, 16.28) 100 x 33.45; cart box 48 at x vw-116; burger box
   48 at x vw-60, its glyph 24 at x vw-48 / y 21; chip computed display
   none below 640, visible at 640 with the burger hidden.
3. Badge "3", "12", "99+" fully inside the 48 box, 8 px clear of the
   burger box at 320.
4. Initials: "Демо Партнер" ДП; seeded names: "ТОВ" + the guillemet-quoted
   "Готель Прем'єр Палац" ГП, '"Альфа" ПП' А, long legal name ГК, "  " -> person glyph
   and aria-label "Особистий кабінет".

B. Menu sheet
5. Open at each size: overlay top 66, z 45, bottom = vh; nav pt 60; rows
   14/20 Medium #4a4a4c, x 24, width vw-48, pitch 52, hit 52; label
   "Кабінет" 14/20 #777779; divider 1 px #d2d2d2; computed font-size
   never < 14 (no zoom).
6. 390x844 y values of 2.2 (account 126, label 206, rows 258..518,
   divider 586, rows 634..738); CTA 342 x 42 docked at 786..828 with
   "Контакти" fully visible above the band.
7. 320x568 / 360x640 / 375x667: CTA visible (docked) without scrolling;
   scroll the sheet to the end -> CTA at its natural place, nothing
   clipped; 600x960: no dock (natural).
8. Active row brand + aria-current="page": /dashboard Дашборд,
   /catalog* Каталог, /assortment Мій асортимент, /orders* Замовлення,
   /materials* Матеріали, /profile Профіль; exactly one active row.
9. html overflow "hidden" while open, restored after; content wrapper
   and legal bar have `inert` while open; scrollY unchanged by open /
   close (open at scrollY 900 -> Escape -> 900).
10. Flows: row -> new route at scrollY 0, menu closed; current-route
    row -> closes, scroll kept; account row -> account sheet open,
    focus later returns to the burger; cart disc -> menu closed + cart
    open; logo -> "/" with the menu closed; Back while open -> closed +
    unlocked; resize 390 -> 640 while open -> closed, rail visible.
11. Keyboard: Tab order logo, cart, burger, account row, rows, CTA;
    nothing behind the sheet reachable; Escape -> focus on the burger.
12. Reduced motion: no transition on the overlay / rows.

C. Slab + head
13. Slab top y 66, border-top-left/right-radius 32, bg #f5f5f5, padding
    bottom 48; legal bar starts 48 below the last block (fresh partner
    pages: slab fills to the legal bar, no white gap).
14. Head numbers of 2.5.5 at 390 (+/- 1): /orders H1 y 114 30/36 -0.6
    700, subtitle 14/20 #777779 at +16, action hug 42 at +32, tabs at
    +48; /dashboard two actions 342 x 42 8 apart (outlined first);
    /orders/48291064 back 114, H1 202 (2 lines exactly at 320, 360,
    375, 390, 430, 600), badges +24, actions 342 wide stacked; at 320
    no pill label overflows (scrollWidth <= clientWidth on every pill
    span), including the "Запит на скасування надіслано" state.
15. /orders/99999999 shows the cabinet not-found head inside the slab
    (after the order-detail fix), no English 404, no console 404.

D. Legal bar
16. 390: px 24, py 24, gap 24; mini logo 29.237 x 33.684 at x 24;
    copyright x 69.2, Onest 14/30 white; titles each on their own row
    (54 pitch); height 189.7. 320: copyright 2 lines, height 216, right
    edge <= 296; no offRight anywhere.

E. SignInPrompt (seed none and b2c)
17. Card y 114, x 0, width vw, border top / right / bottom 1 px
    #8e8e8f, right radii 32, padding 24 / 48; title 30/36 at y 162;
    text +16 14/20; button +32 42 tall hug; footer top >= vh at load
    AND after hydration (record footer y at 100 ms and 1500 ms: equal).
18. "Увійти" -> sign in demo B2B -> cabinet on the same URL, html
    unlocked, focus on the cabinet h1; B2C button reads "Кабінет".

F. Welcome modal (sessionId null + welcomed false, sign in 0500000001 / binar2026)
19. Each size: card x 24, width vw-48 (max 718 only >= 640), r32, ring
    #8e8e8f; dialog scrollWidth == clientWidth; pill label span
    scrollWidth <= clientWidth; CTA bottom <= vh - 24; title + cross
    always visible; at 390x844 no inner scroll (card 548).
20. Title lines: 2 at 390 / 430 / 600, 3 at 320 / 360 / 375, never a
    break inside "Binar-2000"; cross glyph 24 in a 44 box; description
    16/24 #343435; caption 12/16.
21. Upload PNG (setInputFiles) -> avatar + menu account avatar show the
    logo; .txt -> "Підтримуються лише PNG або JPG" in #d92d20;
    Escape / cross / scrim -> closed, focus on main h1; "Перейти в
    профіль" -> /profile.

G. Gate
22. b2b, JS delayed 1.2 s, phone: at 200 ms the header is visible
    (logo, cart, burger), everything else hidden; after hydration the
    cabinet with the identical bar (no shift: compare the bar crop
    before / after); 640 x 900: whole body hidden as today; visitor /
    B2C never gated; blocked JS -> fallback at 4 s.

H. DOM checks (domChecks at 320 / 360 / 390 / 430 / 600 on /dashboard,
/orders, /orders/48291064, /profile, /assortment, /materials, menu
open, welcome open, signed-out /orders)
23. Expected clean for the shell: overflowX, offRight, offLeft, tinyText
    (strip gone), hScroller (strip gone), fixedTall (the menu sheet is
    an intended full-height overlay - flag only if it is not
    `#cabinet-nav`), clippedText (except intentional ellipsis of the
    account name), inputZoom.
24. Accepted known flags: smallTarget on the header logo 100 x 33
    (landing-identical) and on the footer mini-logo element rect (its
    pseudo hit box is 44); page-content flags belong to the page areas.
25. 0 console errors on every load.

I. Desktop / landing pixel guard
26. `node audit/mobile/kit/baseline.mjs audit/mobile/after` then
    `node audit/mobile/kit/compare.mjs audit/mobile/baseline audit/mobile/after`:
    0 differing files. This area touches no landing-rendered markup
    except the CLOSED welcome modal (invisible) and the public-branch
    main class on platform routes only.
27. Desktop cabinet at 1440 x 900 and 1710 x 1117: /dashboard, /orders,
    /orders/48291064, /profile, /assortment, /materials, /catalog (b2b),
    signed-out /orders, legal bar crop, chip + cart cluster - identical
    to the baseline. The welcome modal open at 1440 x 900 is not in the
    baseline: the BUILD agent shoots it before editing
    (audit/mobile/shell-cabinet/desktop-before/welcome-1440.png) and the
    verify agent diffs it (0 px).

---------------------------------------------------------------------

## 7. Conflicts and open points for the system spec

| # | Topic | Detail | Recommendation |
|---|---|---|---|
| C1 | D1 "same useFitZoom(706, 66) logic" | the cabinet stack is 890 px (account row + label + 6 rows + 3 rows + CTA); zoom-to-fit would render 14-px rows at 7.9 px on 320 x 568 and shrink the 24 gutters; 706 is stale even for the public menu (shell-public O4, PS-07) | amend D1 to "PhoneMenu primitives: natural scroll + PhoneMenuCtaDock" (this spec) |
| C2 | Menu CTA duplicates a row | D1's "Зробити замовлення" -> /catalog repeats the "Каталог" row | accepted per D1 (primary action of the cabinet = place an order) |
| C3 | Detail head height | TR-03 48 / 48 / 32 / 48 makes the order-detail head 442 at 390 (first card 508, still 23 px earlier than today); back -> title 24 (desktop) would give 418 | keep 48 for consistency with the public crumb -> H1 (shell-public 2.1); revisit only if the system spec lowers it everywhere |
| C4 | Head -> first block | 48 (TR-03, dashboard SN-02) vs D10 "blocks 24 apart" | 48 below the head; 24 / 16 between sibling cards inside a section (dashboard.md open point 1) |
| C5 | WelcomeModal ownership | BRIEF lists the welcome modal under auth; the task assigns it here | this area owns WelcomeModal.tsx; auth owns AuthDrawer / AuthProvider |
| C6 | Page areas vs the head contract | order detail `DetailsBody pt-4` (detailParts.tsx:18) adds 16 on top of the head's 48; callers must use `TitleLight line` | order-detail: `pt-0 lg:pt-4`; order-detail + returns: `line` on the number |
| C7 | Global not-found | a branded src/app/not-found.tsx (cabinet head for partners on platform routes, public head otherwise) would fix /dashboard/x etc., but changes the desktop and landing 404 (no baseline) and needs new copy | orchestrator decides; minimum = SC-09 route fix |
| C8 | Modal description size | Modal718 phone description is 18/26, the welcome / TR-17 value is 16/24 #343435 | shared Modal718 phone card uses 16/24 #343435 (SN-10) |
| C9 | Logo avatar size on phones | welcome 96 (fits 375 x 667 without scroll); profile LogoCard keeps 144.648 / 140 on desktop | profile spec should use 96 on phones too, or the system spec picks one size for both logo blocks |
| C10 | Full-width head actions at 600 | 552-wide pills (menu CTA also 552) | accept (one phone rule 320..639); a cap would need to apply to every cabinet head and the menu |
| C11 | Gate exception | relies on the public and platform phone bars being pixel-identical | any phone-only change to the public bar (e.g. a hairline) must be mirrored in PlatformHeader or the exception removed |
| C12 | B2B catalog / PDP surfaces | they render inside this shell but do not use CabinetPage; D1 says the cabinet content surface is the slab | catalog-b2b / pdp specs decide white page vs slab; the menu and legal bar apply regardless |
| C13 | Lock mechanism | cabinet menu, welcome and every sheet use the html overflow lock; Safari < 16 ignores it (opaque sheets hide any background scroll) | accept (shell-public O16) |
| C14 | Detail action label at 320 | "Запит на скасування надіслано" wraps to a 2-line pill | order-detail phone label "Запит надіслано" (`lg:hidden` / `max-lg:hidden` spans) |
| C15 | Tailwind v4 arbitrary variants | `max-lg:has-[>*+*]:items-stretch`, `max-lg:[&>*>span:last-child]:*` must be emitted (stale dev server risk, memory note) and depend on Button's DOM (pill = last child) | verify computed styles; if SN-3 changes the Button DOM, switch to `fullWidth="phone"` |
| C16 | No ScrollUpDock in the cabinet | dashboard.md open point 14 | keep none: the sticky burger is the way around; no master has a corner FAB |
