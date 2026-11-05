# Auth area - PHONE SPEC (< 640 px): account sheet + welcome modal

Area: the account drawer (Figma "Authorisation NEW" 5420:38169: sign in,
errors, forgot -> link sent + 0:59 timer -> send again, /?reset=<token>
set password, sign up) + the signed-in account summary + the first-login
welcome modal (Figma 4573:35590).

Author: auth spec agent, 2026-11-05. Phase 2 (spec only, nothing under
src/ was edited). English; UI strings are Ukrainian verbatim.

Inputs read in full: audit/mobile/BRIEF.md, audit/mobile/DECISIONS.md
(D1..D13, binding), audit/mobile/lang/figma-mobile-language.md (TR-01..
TR-32), audit/mobile/lang/code-mobile-recipes.md, audit/mobile/auth/
visual-report.md (V01..V26), audit/mobile/auth/functional-report.md
(F01..F18), the shots under audit/mobile/auth/shots/ (viewed: visual-
signin-390, visual-sheet-signin-invalid, visual-sheet-linksent-timer,
visual-sheet-account-b2b-logo, visual-signup-mismatch-390-unrolled,
visual-sheet-welcome, visual-menu-visitor-390, functional-dashboard-
signed-out-prompt-390), the sources (auth/AuthDrawer.tsx, WelcomeModal.tsx,
AuthProvider.tsx, data.ts, checkout/fields.tsx, cart/useModalBehavior.ts,
cart/useFitZoom.ts, ui/Button.tsx, Header.tsx, platform/PlatformHeader.tsx,
platform/ui/SignInPrompt.tsx), and the sibling specs already present:
docs/superpowers/specs/mobile/shell-public.md (PS-xx, N1..N8, O1..O17),
cart.md (N7 SheetBar), dashboard.md. shell-cabinet.md did not exist yet.

New measurement for this spec: `audit/mobile/auth/spec-widths.mjs` ->
`audit/mobile/auth/spec-widths.txt` (natural one-line widths of every
string in the font this spec assigns; the line counts below come from it).

Figma has NO phone frame for the drawer (desktop 576 x 930) or the welcome
modal (718 card). The phone composition below is a translation: the sheet
= the phone menu master 3117:13578 via TR-09 / D7; type, cards, rows and
buttons = the mobile masters via TR-xx / D5..D10. Desktop (>= 640) and the
landing pages stay byte-identical: every phone class comes with the `lg:`
counterpart that restores today's desktop value.

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
| S1 | 2.9 Welcome modal; WelcomeModal.tsx in section 5 | Owned and built by shell-cabinet (A-13, its 2.8 wins); this 2.9 is informative; avatar 120 x 120 r16 (A-12); note added |
| S2 | N-A SheetBar | A5 SheetBar (gap-2, `sticky`) - same recipe; the 2-line titles are SUPERSEDED by S12 (bar 66, one line) |
| S3 | local useIsDesktop | A3 `useMediaQuery("(min-width: 640px)", true)` |
| S4 | AUTH-04 FINE_DESKTOP fit zoom | Deferred: landscape is the frozen desktop canvas (O-4) - SUPERSEDED by S17 (built in F1 for every caller) |
| S5 | N-B | A2 (with the modal stack and `fallbackFocus`) |
| S6 | N-C / N-D / N-E | A26 (F1 / F2) |
| S7 | N-J / C6 Back | A4 adopted: Back closes the auth sheet on phones; AUTH-05 close on pathname change stays as the fallback |
| S8 | C4 typo | O-5: keep verbatim |
| S9 | PHONE_PILL removed, GOOGLE_PILL kept | Confirmed (A-14) |
| S10 | inertSelector `"body > header, #mobile-nav"` | `OVERLAY_INERT` (adds `#cabinet-nav`, C13) |
| S11 | Build | C-auth (wave 3): AuthDrawer.tsx, AuthProvider.tsx, data.ts |
| S12 (critique round 1) | 2.1 / 2.3 / 2.6 bar 94 with a 2-line title (sign in at 320 / 360, set password at 320) | A-7 revised (D7): bar 66, ONE line; `BAR_SHORT` signin "Вхід", setPassword "Новий пароль" below 375 (O-12 copy); the sr-only DIALOG_LABEL keeps the full names; at 320 / 360 every y of 2.3 / 2.6 moves -28; edited in place |
| S13 (critique round 1) | 2.1 scroller `pb-[max(24px,env(...))]` + `max-lg:[&:has(input:focus)]:pb-[50dvh]`; 2.10 keyboard row | `pb-[calc(24px+env(safe-area-inset-bottom)+var(--kb,0px))]` (C-29 formula + the keyboard inset of 3.1.6); the focus-driven padding is deleted; edited in place |
| S14 (critique round 1) | 2.2 PHONE_FIELD_LABEL 14-px resting labels below 360 | Dropped (one resting size; truncate + the short phone label); edited in place |
| S15 (critique round 1) | 2.2 / 2.3 / 2.4 / 2.6 / 2.7 last field -> action 32 (`max-lg:mt-2`, group gap 32) | 48 (system 3.1.4 / C-41, contact form 3166:7864): sign-in pair and forgot / set-password submits `max-lg:mt-6` on the gap-6 column, sign-up actions `max-lg:mt-4` on the gap-8 group. 2.3 at 390: "Увійти" 354..396, Google 404..446, prompt 478..502, end 526; 2.4 submit 228..270; 2.6 submit 318..360; 2.7 submit 527..569. Link-sent and account actions follow a tile / card, not a field: 32 kept; edited in place |
| S16 (critique round 1) | 2.2 action order note / 7 C2 (submit + Google keep the master order) | Ratified as amendment A-15 (D8 exception: a form's submit stays adjacent to its fields; the alternative sign-in follows it) |
| S17 (critique round 1) | S4 / AUTH-04 / 2.11 landscape FINE_DESKTOP deferred | BUILT for every caller in F1 (A26: `useFitZoom` returns 1 on coarse pointers with the desktop media); the local FINE_DESKTOP media is not needed; AUTH-04 closes with it |
| S18 (critique round 1) | 2.10 focus on open / screen switch; close label "Закрити" | Confirmed as the system rule (A5: the bar title on coarse pointers, the cross on fine pointers); cross labels "Закрити вікно входу" / "Закрити особистий кабінет" (O-12) |
| S19 (critique round 1) | 2.10 "Перейти в профіль" navigates; partner first sign-in -> welcome | A4: "Перейти в профіль" uses `release({ navigate: "/profile" })` (one Back returns to the page); sign-in success opens the welcome card in the same handler (A4 handoff: the card adopts the sheet's history entry) |
| S20 (critique round 1) | 2.9 welcome scrim closes | Below 640 the welcome scrim does NOT close the card (cross, Escape and the CTA only; shell-cabinet owns it) |
| S21 (critique round 1) | 2.10 inertSelector `"body > header, #mobile-nav"` | The A2 sibling walk (S10 OVERLAY_INERT stays harmless); `layer` = the layer root (z 60 + depth) |

---------------------------------------------------------------------

## 0. The phone design in one page

- Account sheet (every auth screen): a FULL-SCREEN white sheet above the
  sticky header (z-[60], 100dvh, no scrim, no radius, no ring), entering
  like the phone menu (opacity + translateY(-12), 400 ms, ease-out-expo).
  Its own 66-px bar (shared SheetBar, D7 / TR-09) holds the SCREEN TITLE
  in Title Large 22/28 SemiBold at x 24 and the 24-px cross in a 48 hit
  box at x 342 / y 21 (= menu master cross 3117:14330). The bar is sticky
  inside the sheet's only scroller, so the title and the cross never scroll
  away. Body px 24, pt 24: subtitle Body Small 14/20 #777779, 24, form.
- Form rhythm (D6 / TR-21): shop floating-label fields 46 tall, full
  width (342 at 390), 24 apart (pitch 70); "Забули пароль?" 16 under the
  password field; 32 to the action stack; pills are Button/Small 42, 16/22
  Medium at every width, stacked 8 apart (D8); prompt row 32 below.
- Alerts / tiles: the #ffe7e5 alert and the #f8f8f8 countdown tile stay
  r24 p16 (inline message tiles, not cards) with Body Small 14/20 text;
  the account summary is a filled card #f8f8f8 r32 p24 (3085:3974) with
  TR-27 key/value rows between 1-px #d2d2d2 lines.
- Welcome modal = the D7 short-modal card: 24-px viewport margins (342 at
  390), white r32, 1-px #8e8e8f ring, inner 24, title 24/28 Bold, 24-px
  cross in a 44 box, description 16/24 #343435, the #f8f8f8 r24 logo tile
  (120 avatar on phones), one full-width accent Button/Small 42, max-height
  100dvh - 48 with inner scroll.

---------------------------------------------------------------------

## 1. Scope

### 1.1 Components, routes, entry points

| Piece | Code | Where it opens on phones (after the shell specs) |
|---|---|---|
| Account sheet (drawer on desktop) | src/components/auth/AuthDrawer.tsx (mounted once by AuthProvider on EVERY route, landing included) | public phone menu account row "Увійти" / "Особистий кабінет" (Header.tsx:583-603 today; PhoneMenuRow in shell-public 2.3, D2 keeps the row); cabinet burger sheet account row (D1, shell-cabinet) -> `openAuth("account")`; SignInPrompt "Увійти" / "Кабінет" on cabinet routes for visitors / B2C (platform/ui/SignInPrompt.tsx:27); the reset link `/?reset=<token>` on any route (AuthProvider.tsx:82-93) |
| Welcome modal | src/components/auth/WelcomeModal.tsx | after a partner's FIRST sign-in (`api.signIn` ok + `type b2b` + `!welcomed` -> `finishRegistration()`, AuthDrawer.tsx:407) |
| Provider / store | auth/AuthProvider.tsx, store.ts, api.ts (latency 450 ms, api.ts:32), data.ts (copy, validation), demo.ts (accounts) | - |

Routes used to reach the states: /catalog (public shop), / (reset link),
/dashboard and /profile (cabinet, signed in / signed out). The sheet and
the modal are route-independent; D7 accepts that they also open on the
frozen landing routes (their closed state stays byte-identical).

Seeds: none (visitor), `audit/mobile/kit/seed-b2c.json` (customer),
`audit/kit/seed-b2b.json` (partner "Демо Партнер"), welcome seed = b2b
with `accounts[0].welcomed = false` and `sessionId = null` (sign in from
the sheet; a seeded session alone never opens the modal - by design).
Demo logins: B2B 0500000001, B2C 0500000002, password binar2026.

### 1.2 States (all reached by the audits unless marked)

| # | Screen / state | How to reach on a phone | Seed | Section |
|---|---|---|---|---|
| S1 | Sign in, default | menu -> "Увійти" | none | 2.3 |
| S2 | Sign in, empty errors (both fields red + helpers) | S1 -> "Увійти" with empty fields | none | 2.3 |
| S3 | Sign in, wrong data alert | S1 -> any login + wrong password -> submit (450 ms busy) | none | 2.3 |
| S4 | Sign in, busy (submit 50 % for 450 ms) | S1 valid input, shot at +100 ms (page.clock) | none | 2.3 (reachable, not shot by the audits) |
| S5 | Sign in, prefilled after a saved password | S12 -> "Зберегти пароль" | none | 2.3 |
| S6 | Forgot, default (login carried over) | S1 -> "Забули пароль?" | none | 2.4 |
| S7 | Forgot, empty error | S6 -> "Відновити пароль" with an empty field | none | 2.4 |
| S8 | Link sent, timer 0:59 ... 0:01 | S6 with a login -> submit | none | 2.5 |
| S9 | Link sent, "send again" (two buttons) | S8 + 61 s (page.clock) | none | 2.5 |
| S10 | Set password, default | `/?reset=demo` after S8 with a KNOWN login (0500000002) | none | 2.6 |
| S11 | Set password, empty / short errors | S10 -> submit | none | 2.6 |
| S12 | Set password, mismatch (both fields red, 2-line helper) | S10 with different passwords | none | 2.6 |
| S13 | Set password, dead link alert ("Не вдалося обробити запит...") | `/?reset=demo` with no pending reset -> valid submit | none | 2.6 |
| S14 | Sign up, default (5 fields, login helper) | S1 -> "Зареєструватись" | none | 2.7 |
| S15 | Sign up, empty errors (5 helpers) | S14 -> submit empty | none | 2.7 |
| S16 | Sign up, bad login format | S14 with login "abc" | none | 2.7 |
| S17 | Sign up, mismatch | S14 with different passwords | none | 2.7 |
| S18 | Sign up, account exists alert | S14 with login 0500000001 | none | 2.7 |
| S19 | Account summary B2C (2 rows) | b2c seed -> menu -> "Особистий кабінет" | b2c | 2.8 |
| S20 | Account summary B2B (6 rows) | b2b seed -> cabinet menu account row (D1; today the chip) | b2b | 2.8 |
| S21 | Account summary B2B with logo | b2b seed + `logo` data URL | b2b | 2.8 |
| S22 | Account summary, long company / person data | b2b seed with long names | b2b | 2.8 |
| S23 | Account summary, partner without e-mail (row hidden on phones) | b2b seed with `person.email = ""` | b2b | 2.8 |
| S24 | Welcome, default (person glyph) | welcome seed -> sheet sign in 0500000001 / binar2026 | welcome | 2.9 |
| S25 | Welcome, logo uploaded ("Замінити лого") | S24 -> PNG via the file input | welcome | 2.9 |
| S26 | Welcome, file errors (type / > 5 MB / decode) | S24 -> GIF / 5 MB+ PNG | welcome | 2.9 |
| S27 | Signed-out cabinet prompt (entry only) | /dashboard, /profile with no seed | none | owned by shell-cabinet (O12 of shell-public) |

### 1.3 Unreachable or not covered (with the reason)

- Google sign-in: not implemented; the pill is an `aria-disabled`
  placeholder (AuthDrawer.tsx:184-196). Only its "coming soon" feedback is
  specified (2.3 block 9).
- Real soft keyboards (iOS / Android): Chromium cannot emulate them; the
  audits used 568-px-tall windows and height crops. The keyboard rule in
  2.10 is verified by DOM (padding present while an input is focused), not
  by a device.
- iOS autocapitalise / autocorrect (F12): attribute evidence only.
- Welcome via seed alone: by design only `submitSignin` opens it.
- Decode error of the logo ("Не вдалося прочитати зображення"): needs a
  corrupt image the file input accepts; same caption slot as S26.
- Landscape >= 640 (844 x 390): the desktop canvas (no tablet layout by
  design, BRIEF); only the double-shrink bug (AUTH-04) is fixed there.

---------------------------------------------------------------------

## 2. Phone layout, block by block

### 2.0 Widths used below

Content = viewport - 48 (D10). Bar title room = W - 92 (24 gutter, 8 gap,
48 hit box with 12 px inset). Field label room = content - 48. Welcome
inner = W - 96; welcome title column = W - 138 (44 cross box with 10 px
overhang, 8 gap). Tile inner = min(321, W - 96) - 32.

| W | content | bar title room | field label room | welcome inner | welcome title col | tile inner |
|---|---|---|---|---|---|---|
| 320 | 272 | 228 | 224 | 224 | 182 | 192 |
| 360 | 312 | 268 | 264 | 264 | 222 | 232 |
| 375 | 327 | 283 | 279 | 279 | 237 | 247 |
| 390 | 342 | 298 | 294 | 294 | 252 | 262 |
| 430 | 382 | 338 | 334 | 334 | 292 | 289 |
| 600 | 552 | 508 | 504 | 504 | 462 | 289 |

Natural widths (spec-widths.txt): bar titles at 22/600 -0.44: "Вхід до
осбистого кабінету" 279.4, "Створіть новий пароль" 238.6, "Відновлення
паролю" 218.3, "Особистий кабінет" 195.8, "Реєстрація" 117.0 -> the
sign-in title would take 2 lines at 320 / 360, set password 2 lines at
320, everything else 1 line. SYSTEM critique round 1 (S12): the bar is
always 66 with one line; below 375 sign in shows "Вхід" and set password
"Новий пароль".

### 2.1 Sheet shell (every screen) - D7, TR-09, menu master 3117:13578

Geometry at 390 x 844: layer 0,0 390 x 844; aside 0,0 390 x 100dvh; bar
0..66 at every width (one title line; SYSTEM critique round 1); body x
24..366, first element at y 90; bottom padding 24 + safe area + `--kb`
(the keyboard inset of system 3.1.6). Same at
every width 320..639: full width, content W - 48.

| Block | Phone recipe (exact) | Desktop (unchanged) | Source |
|---|---|---|---|
| Layer root (AuthDrawer.tsx:861-865) | `fixed inset-0 z-[60] lg:z-40 ${open ? "" : "pointer-events-none"}` (keeps `aria-hidden={!open} inert={!open}`) | z-40 under the 92 header | D7 sheets above the header; code recipes 4 (z ladder: full-screen sheets z-60); shell-public 2.10 |
| Scrim (866-872) | add `max-lg:hidden`: `absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 max-lg:hidden ${open ? "opacity-100" : "opacity-0"}` | as today | TR-09 (no scrim strip, no tap-to-close trap, V03) |
| Aside role=dialog (874-888) | remove the inline `top`; keep the fitted width style (desktop only). Class: `absolute bottom-0 right-0 top-0 flex h-dvh w-full flex-col overflow-hidden outline-none transition-[translate,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] max-lg:motion-reduce:transition-none lg:top-[var(--site-header-h,92px)] lg:h-auto lg:w-[576px] lg:max-w-[92vw] lg:transition-[translate] ${open ? "translate-y-0 opacity-100 lg:translate-x-0" : "-translate-y-3 opacity-0 lg:translate-x-full lg:translate-y-0 lg:opacity-100"}` | top 92 (var), bottom 0, w 576 / 92vw, translate-x slide | D7 h-dvh; TR-09 motion = Header.tsx:506-511; D12 motion-reduce; the cart sheet uses the same string (cart.md 2.1) |
| Dialog name | `aria-labelledby={labelId}` (useId in AuthDrawer) pointing at an `sr-only` span rendered by Screens: `<span id={labelId} className="sr-only">{DIALOG_LABEL[screen]}</span>`; DIALOG_LABEL (data.ts, new) = signin "Вхід до особистого кабінету", forgot + linkSent "Відновлення паролю", setPassword "Створіть новий пароль", signup "Реєстрація", account "Особистий кабінет" | same (fixes the static name on desktop too) | F15 |
| Scroller `data-auth-sheet` (892-899) | `scrollbar-hidden relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-white px-6 pb-[calc(24px+env(safe-area-inset-bottom)+var(--kb,0px))] max-lg:scroll-pt-24 lg:rounded-tl-[48px] lg:border lg:border-stroke-default lg:pb-[39px] lg:pl-[59px] lg:pr-[79px] lg:pt-[59px]` (style `--field-surface: #fff` kept) | r48 tl, 1-px #8e8e8f ring, pt 59 pl 59 pr 79 pb 39 | D7 (square full-screen sheet, safe area), V04 keyboard rule (2.10); scroll-pt keeps focused fields clear of the sticky bar |
| Old phone X (901-908) | DELETE (replaced by the bar cross) | never rendered on desktop (`lg:hidden`) | V06, F07, V13, V14 |
| Sheet bar (NEW, first child of the Screens root, AuthDrawer.tsx:532) | `<SheetBar title={BAR_TITLE[screen]} shortTitle={BAR_SHORT[screen]} titleRef={barTitleRef} onClose={closeAuth} closeLabel={screen === "account" ? "Закрити особистий кабінет" : "Закрити вікно входу"} sticky className="-mx-6 lg:hidden" />` (shared atom A5; SYSTEM critique round 1). Renders SHEET_BAR (`flex h-[66px] shrink-0 items-center justify-between gap-2 bg-white pl-6 pr-3`) + `sticky top-0 z-[1]`; title SHEET_TITLE (`min-w-0 flex-1 truncate text-title-lg text-neutral-900 outline-none`, ONE line) (tabIndex -1, data-sheet-title); close `flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand` + `XMarkIcon className="size-6"` | not rendered | D7 bar (title Title Large 22/28 SemiBold + 24 cross in a 48 box at x 342 / y 21); menu cross 3117:14330; D9 sheet titles |
| BAR_TITLE (AuthDrawer constant) | signin `COPY.signin.title`, forgot + linkSent `COPY.forgot.title` ("Відновлення паролю"), setPassword `COPY.setPassword.title`, signup `COPY.signup.title`, account `COPY.account.title` = "Особистий кабінет" (moved from the AccountScreen literal, AuthDrawer.tsx:799) ; SYSTEM critique round 1: `BAR_SHORT` = signin "Вхід", setPassword "Новий пароль" (shown below 375 through SheetBar `shortTitle`; every other title fits 228 px at 320) | - | the link-sent success heading stays in the body (2.5) |
| Body wrapper (NEW, after the bar) | `<div className="pt-6 lg:pt-0">{screens}</div>` | no box change (pt 0) | D7 body pt 24 |
| Screen title in the body (TitleBlock row, AuthDrawer.tsx:94) | `flex items-center pb-4 pt-1 max-lg:hidden` (the title lives in the bar on phones; the subtitle `<p className="text-body-sm text-neutral-500">` stays = 14/20 #777779) | 24/28 Bold row + 16/24 subtitle | V05, V06, TR-03 |

Bar geometry (SYSTEM critique round 1, D7): always 66 with ONE title
line - title line box y 19..47 at x 24, cross hit box x W-60..W-12 / y
9..57, glyph W-48..W-24 / 21..45; below 375 the sign-in and set-password
bars show BAR_SHORT ("Вхід", "Новий пароль"). The bar background is white
and covers the floating field captions scrolling under it (z-[1]).

Desktop guard for this table: the computed desktop values are identical
(top 92 via the class, bottom 0, w 576 / max 92vw, r48, ring, paddings,
translate-x, transition-property translate, z-40); the baseline shot
`shop-1710-auth-signin` must stay identical (section 6).

### 2.2 Screen atoms (shared by the screens of 2.3..2.8)

| Atom (file:line today) | Phone recipe | Desktop | Source |
|---|---|---|---|
| Subtitle (TitleBlock p, :99) | unchanged `text-body-sm text-neutral-500` = 14/20 #777779 | 16/24 | TR-03 subtitle Body Small |
| Field (TextField via LoginField / PasswordField / sign-up fields) | unchanged shop field: 46 tall, r24, 1-px #d2d2d2, px 24, 16/24 Medium value, floating 12/14 caption on white; full content width; 24 apart; helper / error line under it | same | D6 / TR-21 |
| Resting label width (PHONE_FIELD_LABEL, :173-174) | keep the truncate rule ONLY (SYSTEM critique round 1: no 14-px resting label below 360 - one resting size, 16, like every other form; the short phone label `COPY.labels.login` keeps the sign-in label whole) | no rule | V10, F14 |
| Sign-in login label in the error state (:541-542) | phones always show the SHORT label `COPY.labels.login` (the helper "Введіть дані, щоб увійти" explains); desktop keeps `COPY.labels.loginError`. Implement with a local `useIsDesktop()` = `useSyncExternalStore(subscribe to matchMedia("(min-width: 640px)"), () => matchMedia(...).matches, () => true)` | long label (5420:38180) | V10, F14 (311.7 px label never fits a phone field) |
| Login field attributes (LoginField :294-304) | keep `inputMode="email"`; add `autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next"` (needs TextField passthrough, N-D) | same attrs (no visual effect) | F12 (partly, see AUTH-33) |
| Password field attributes (PasswordField :251-262) | add `autoCapitalize="none" autoCorrect="off" spellCheck={false}`; `enterKeyHint`: "go" on the last field of a form, "next" otherwise | same | F12 |
| Eye toggle (:264-274) | add `max-lg:-m-2.5 max-lg:size-11` to the button (44 hit box centred on the 24 glyph slot at `absolute right-6 top-[11px]`, fields.tsx:201); glyph stays `size-6` | 24 box | V13, F08, TR-32 |
| Alert (:122-129) | `<div ref data-auth-alert role="alert" tabIndex={-1} className="flex w-full items-start gap-4 rounded-3xl bg-[#ffe7e5] p-4 outline-none lg:items-center">` icon `size-6 shrink-0 text-negative max-lg:-my-0.5` (centred on the first 20-px line) text `min-w-0 flex-1 text-[14px] font-normal leading-5 text-neutral-900 lg:text-[16px] lg:leading-6` | 16/24, icon centred | V09; Body Small 14/20 (D9); r24 kept: an inline message tile, desktop r24, D5 r32 is for cards / panels, never rounder than desktop (lang 9) |
| Pill padding (PHONE_PILL, :136) | DELETE the 14-px label rule (`max-[360px]:[&>span]:text-[14px]`) and the general `max-sm:[&>span]:px-[11px]`; keep ONE rule only on the Google pill: `GOOGLE_PILL = "max-[360px]:[&>span]:px-[11px]"` ("Зареєструватись з Google" 202.8 + G 24 + gap 8 + 48 = 282.8 > 272 at 320; 258.8 with px 11). Every other label fits with the standard px 24: "Отримати посилання ще раз" 266.7 <= 272 | Button/Small px 24 | V12, D8 (16/22 Medium on every phone pill) |
| WideButton (:140-163) | add a `wrapClassName?: string` prop appended to the class list of its outer wrapper div (today `flex w-full`), used for the phone margins / order below; keep `size="small" fullWidth` | unchanged | - |
| Submit busy state (:573, :598, :643, :680, :737) | replace `disabled={busy}` by `aria-disabled={busy || undefined}` + `className="aria-disabled:opacity-50"` (the handlers already return early while busy); the form gets `aria-busy={busy}` | same look (50 % for 450 ms) | F10 (focus no longer drops to body) |
| Google pill (:184-196) | keep aria-disabled + INERT_PILL + `title`; add `onClick` that shows a phone-only status caption for 3 s: wrapper `relative`, caption `<p role="status" className="pointer-events-none absolute inset-x-0 top-full mt-1 text-center text-[12px] leading-4 text-neutral-500 lg:hidden">{note ? COPY.google : ""}</p>` ("Незабаром"); absolute, so no layout shift (it sits in the 32 gap above the prompt) | tooltip only | F13 |
| "Забули пароль?" (:561-572) | row `flex h-5 justify-end max-lg:-mt-2 lg:h-[22px]` (16 under the password field); button adds `-my-3 py-3 leading-5 lg:my-0 lg:py-0 lg:leading-[22px]` (14/20 Medium #343435 underline, 107 x 20 visual, 44 hit) | 14/22, 22 tall | V13, F08, D9 labels 14/20 |
| Submit + Google pair (sign in :573-576) | wrap both in `<div className="flex flex-col gap-2 max-lg:mt-6 lg:contents">` (48 above, 8 apart on phones; `lg:contents` dissolves the wrapper on desktop; SYSTEM critique round 1) | two direct children of the gap-24 stack | D8 (stacked 8 apart) as amended by A-15 (submit first, Google second); last field / helper -> action 48 (contact form 3166:7864, system 3.1.4) |
| Prompt row (PromptRow :200-221) | row `flex flex-wrap justify-center gap-x-1 text-[16px] leading-6 lg:leading-[22px]`; action button adds `-my-2.5 py-2.5 lg:my-0 lg:py-0` (44 hit) | 16/22 | V11, V13, F08; one line from 360 (311.4 <= 312), two centred lines at 320 |

Action order (D8 / TR-04): stacked pairs of two ALTERNATIVE actions show
the secondary (outlinedDark) first and the primary (accent) last on phones
(link-sent "again", account). Implemented with CSS order on phones
(`max-lg:order-first` on the secondary wrapper or `max-lg:order-last` on
the primary), DOM order unchanged (desktop order and Tab order kept). The
FORM submit + Google pair keeps the master order (submit first): see
section 7 C2.

### 2.3 Sign in (S1..S5) - master 5420:38175 / 38180 / 38195

Geometry at 390 x 844 (S1): bar 0..66 "Вхід до осбистого кабінету" (1
line from 375; "Вхід" below 375, bar 66 everywhere - SYSTEM S12) -> subtitle 90..130 (2
lines; 496.2 px) -> 24 -> login 154..200 -> 24 -> password 224..270 -> 16
-> "Забули пароль?" 286..306 right-aligned -> 32 -> "Увійти" accent 42
338..380 -> 8 -> "Увійти з Google" outlinedDark 42 388..430 -> 32 ->
prompt 462..486 (1 line) -> 24 -> end 510 (no scroll). At 320 x 568: bar
94, subtitle 2-3 lines, prompt 2 lines -> about 560..580 tall, scrolls
0..12 px.

| # | Block | Phone recipe | Desktop | Source |
|---|---|---|---|---|
| 1 | Form (:534) | `flex flex-col gap-6 lg:gap-10` (unchanged: subtitle -> group 24) + `aria-busy={busy}` | 40 | TR-03 |
| 2 | Group (:536) | `flex flex-col gap-8 lg:gap-10` (group -> prompt 32) | 40 | TR-23 / hero body -> CTA 32 |
| 3 | Fields stack (:537) | `flex flex-col gap-6` unchanged (alert / login / password / forgot / pair) | same | D6 pitch 70 |
| 4 | Alert (S3) | 2.2 Alert, first child, 24 above the login | same slot | V09 |
| 5 | Login | 2.2 (short label on phones, attrs) | - | V10, F12 |
| 6 | Password | 2.2 (eye 44, attrs, enterKeyHint "go") | - | V13 |
| 7 | "Забули пароль?" | 2.2 (16 under the password) | - | V13 |
| 8 | Submit "Увійти" | accent WideButton inside the pair wrapper (2.2) | - | D8 |
| 9 | "Увійти з Google" | GoogleButton (GOOGLE_PILL, status caption) | - | F13 |
| 10 | Prompt "Ще не зареєстровані? Зареєструватись" | PromptRow (2.2) -> goTo("signup") | - | V11 |

Variants:
- S2 empty errors: login 46 + helper "Введіть дані, щоб увійти" (19; 1
  line at every phone width) = 65; password 65 "Введіть пароль, щоб
  увійти". Login label stays the short one on phones.
- S3 wrong data: the alert (4-5 lines at 390, 6-7 at 320) pushes the form
  down; after the failed submit the alert is focused (no visible ring,
  `outline-none`) and the scroller returns to the top (2.10).
- S4 busy: the submit at 50 % opacity for 450 ms, keeps focus.
- S5 after a saved password: login prefilled, password empty, no errors
  (optional success tile: AUTH-27, deferred).

### 2.4 Forgot password (S6, S7) - master 5420:38202

At 390: bar "Відновлення паролю" -> subtitle 90..110 (1 line, 259.8) -> 24
-> login 134..180 -> 32 -> "Відновити пароль" accent 212..254 -> 32 ->
"Повернутися до входу" text link 286..310 (phone only) -> 24 -> end 334.

| Block | Phone recipe | Desktop | Source |
|---|---|---|---|
| Form (:588) | `flex flex-col gap-6 lg:gap-10` + `aria-busy` | 40 | - |
| Login | LoginField (2.2), error = `forgotError`, `enterKeyHint="send"` | - | - |
| Submit | WideButton `wrapClassName="max-lg:mt-6"` (48 under the field; SYSTEM critique round 1) | - | system 3.1.4 (48), contact form 3166:7864 |
| Back link (NEW, phone only) | `<div className="flex justify-center max-lg:mt-2 lg:hidden"><button type="button" onClick={() => goTo("signin")} className="-my-2.5 cursor-pointer whitespace-nowrap py-2.5 text-[16px] font-bold leading-6 text-neutral-900 underline decoration-from-font [text-underline-position:from-font]">{COPY.linkSent.back}</button></div>` (178.3 x 24 visual, 44 hit) | not rendered (master has 3 blocks) | F16; mirrors PromptRow (5254:85725) |
| S7 error | "Введіть електронну пошту або номер телефону" (12/16, 1 line at 390, 2 at 320 / 360) | - | - |

### 2.5 Link sent (S8 timer, S9 again) - masters 5420:38217 / 38222

At 390 (S8): bar "Відновлення паролю" -> check 48 centred y 90..138 -> 16
-> heading "Посилання для відновлення / паролю надіслано" 22/28 centred, 2
lines 154..210 -> 12 -> body 14/20 #777779 centred, 3 lines 222..282 ->
24 -> countdown tile 306..378 -> 32 -> "Повернутися до входу" outlinedDark
410..452 -> 24.
S9: heading "Посилання надіслано" (1 line) ... body -> 32 -> outlinedDark
"Повернутися до входу" -> 8 -> accent "Отримати посилання ще раз".

| Block | Phone recipe | Desktop | Source |
|---|---|---|---|
| SuccessTitle head (:109) | `flex w-full flex-col items-center gap-4 pb-3 lg:pb-4 lg:pt-1` (check -> heading 16, heading -> body 12) | pt 4, pb 16 | card title -> body 12 (lang 5) |
| Heading h2 (:111) | `w-full text-center text-[22px] font-semibold leading-7 tracking-[-0.44px] text-balance text-neutral-900 lg:text-[24px] lg:font-bold lg:tracking-[-0.48px] lg:text-wrap` | 24/28 Bold | TR-24 success panel = Title Large; V07 |
| Timer title content (:610-618) | `{t[0]}<span className="max-lg:hidden">&nbsp;</span><br className="max-lg:hidden" /><span className="lg:hidden"> </span>{t[1]}` - no forced break and no NBSP on phones: 2 lines at 360..430 ("Посилання для відновлення" 293.5 / "паролю надіслано" 191.3), 3 balanced lines at 320, 1 line at 600 (488.7 <= 552) | NBSP + br exactly as today | V07 |
| Body (:115) | unchanged `w-full text-center text-body-sm text-neutral-500` (14/20) | 16/24 | - |
| Countdown tile `data-countdown` (:627-634) | `w-full rounded-3xl bg-bg-subtle p-4 text-[14px] font-medium leading-5 text-neutral-800 max-lg:text-center lg:flex lg:flex-wrap lg:items-center lg:gap-1 lg:leading-[22px]` (the time `whitespace-nowrap font-bold` kept, "0:59." never splits) - 2 centred lines at 390 (349.1 > 310) | left, 14/22 | V08; Body Small Medium 14/20 (D9) |
| S8 back pill (:635-637) | WideButton outlinedDark `wrapClassName="max-lg:mt-2"` (32 above) | - | TR-23 |
| S9 actions (:642-649) | `flex flex-col gap-2 max-lg:mt-2 lg:gap-6`; the outlinedDark "Повернутися до входу" WideButton gets `wrapClassName="max-lg:order-first"` (D8: secondary first, primary last); "again" keeps `data-autofocus` (desktop focus) and the busy pattern of 2.2 | gap 24, accent first | D8 / TR-04 |

### 2.6 Set password (S10..S13) - master 5420:38207

At 390: bar "Створіть новий пароль" ("Новий пароль" below 375, bar 66 - SYSTEM S12) ->
subtitle 2 lines 90..130 -> 24 -> [alert S13, 24] -> password 154..200 ->
24 -> repeat 224..270 -> 32 -> "Зберегти пароль" accent 302..344 -> 24.

| Block | Phone recipe | Desktop | Source |
|---|---|---|---|
| Form (:656) | `flex flex-col gap-6 lg:gap-10` + `aria-busy` | 40 | - |
| Fields stack (:658) | unchanged gap-6; alert (2.2) first in S13 | - | - |
| Passwords | PasswordField (2.2); repeat `enterKeyHint="go"` | - | - |
| S12 mismatch | both rings red; the repeat helper "Паролі не збігаються. Переконайтеся, що обидва поля заповнені однаково." 448.2 px -> 2 lines at 390 (field 46 + 3 + 32 = 81), 3 lines at 320 (97) | same | 5420:38248 |
| Submit | WideButton `wrapClassName="max-lg:mt-6"` (48 under the repeat field; SYSTEM critique round 1), busy pattern | - | system 3.1.4 (48) |
| Entry focus | the sheet opens on this screen (`entry: "reset"`): the dialog keeps the initial focus (no keyboard on open) | same | F17 |

### 2.7 Sign up (S14..S18) - masters 5420:38228 / 38238 / 38248

At 390 x 844 (S14): bar "Реєстрація" -> subtitle 90..110 (1 line) -> 24 ->
"Імʼя" 134..180 -> 24 -> "Прізвище" 204..250 -> 24 -> login 274..320 +
helper "Це буде ваш логін для входу у систему." (19) -> 24 -> "Пароль"
363..409 -> 24 -> "Повторіть пароль" 433..479 -> 32 -> "Зареєструватись"
accent 511..553 -> 8 -> "Зареєструватись з Google" 561..603 -> 32 ->
prompt "Вже маєте акаунт? Увійти" 635..659 (1 line, 197 px) -> 24 -> end
683 (fits 844; scrolls at 568 tall; with errors about 800).

| Block | Phone recipe | Desktop | Source |
|---|---|---|---|
| Form (:687) | `flex flex-col gap-6 lg:gap-10` + `aria-busy` | - | - |
| Group (:689) | `flex flex-col gap-8 lg:gap-10` (fields -> actions 32, actions -> prompt 32) | 40 | TR-23 |
| Fields (:690) | unchanged gap-6, alert first (S18) | - | D6 |
| Name fields | TextField + `enterKeyHint="next"`; first / last name keep the default autocapitalise (names) | - | - |
| Login | LoginField with helper (2.2 attrs) | - | F12 |
| Passwords | PasswordField; repeat `enterKeyHint="go"` | - | - |
| Actions (:736) | `flex flex-col gap-2 max-lg:mt-4 lg:gap-6` (group gap 32 + 16 = 48 under the last field / helper; submit first, Google second: C2 = A-15; SYSTEM critique round 1) | 24 | D8 as amended by A-15 |
| Google | GoogleButton with GOOGLE_PILL (needed at 320 only) | - | V12 |
| Prompt | PromptRow -> goTo("signin") | - | - |

Variants: S15 five helpers (each field 65; the login helper is replaced by
the error), S16 "Вкажіть коректну електронну пошту або номер телефону",
S17 mismatch (both password rings red, 2-3-line helper), S18 alert
"Не вдалося обробити запит..." (2 lines at 390) focused + scroller to top
after the failed submit. Long typed values stay on one line inside the
46-px input (native horizontal text scrolling); no field ever grows except
by its helper lines.

### 2.8 Account summary (S19..S23) - no master; filled card 3085:3974 + TR-27

At 390 (S20, partner "Демо Партнер"): bar "Особистий кабінет" -> subtitle
"Ви увійшли як Коваль Олена Петрівна" 90..110 -> 24 -> card 134..~683
(p24; rows Компанія / ЄДРПОУ / Регіон / Роль (2 lines) / Телефон /
Електронна пошта) -> 32 -> "Вийти" outlinedDark -> 8 -> "Перейти в
профіль" accent -> 24 (ends about 831; scrolls a few px at 844 when long
values wrap).

| Block | Phone recipe | Desktop | Source |
|---|---|---|---|
| Screen root (:798) | `flex flex-col gap-6 lg:gap-10` unchanged | - | - |
| TitleBlock | title hidden on phones (bar); subtitle 14/20 | - | 2.1 |
| Card (:800) | `flex flex-col gap-4 rounded-[32px] bg-bg-subtle p-6 lg:rounded-3xl` | r24 | D5 (342-wide card -> r32), filled card 3085:3974 (p 24) |
| Logo (:801-803) | unchanged `size-16 rounded-xl object-cover` (64, r12 = desktop identity; never rounder than desktop) | same | lang 9 mapping rule |
| Rows container (NEW wrapper around :804-809) | `<dl className="flex flex-col max-lg:divide-y max-lg:divide-stroke-subtle lg:gap-4">` | gap 16 between rows (same as today's card gap) | TR-27 rows between 1-px #d2d2d2 lines |
| Row | `<div className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 lg:gap-0.5 lg:py-0">` | gap 2, no padding | TR-27 (label, 8, value; rows py 16) |
| Label `<dt>` | `text-[14px] font-medium leading-5 text-neutral-500 lg:font-normal lg:leading-6` (14/20 Medium #777779) | 14/24 Regular | TR-27, D9 |
| Value `<dd>` | `text-[16px] leading-6 text-neutral-900 lg:text-body-sm lg:font-medium` (16/24 Regular #1d1d1f; desktop resolves to 16/24 Medium exactly as today) | 16/24 Medium | TR-27 value 16/24 |
| Empty values (S23) | phones FILTER the rows with an empty value (`const shown = desktop ? rows : rows.filter(([, v]) => v)`, useIsDesktop of 2.2) - no CSS hiding, so `divide-y` / `last:` stay correct | "-" placeholder kept | V15 |
| Actions (:811) | `flex flex-col gap-2 max-lg:mt-2 lg:gap-6`; the B2B accent "Перейти в профіль" wrapper `flex w-full max-lg:order-last` (D8 order: "Вийти" first, primary last); remove PHONE_PILL from its className; B2C shows only "Вийти" | accent first, gap 24 | D8 / TR-04 |
| Long data (S22) | values wrap (phone overflow-wrap anywhere, globals.css 1597-1602); no truncation | same | - |

### 2.9 Welcome modal (S24..S26) - D7 short modal, TR-17

(SYSTEM A-13: WelcomeModal.tsx is owned and built by shell-cabinet - its 2.8
recipe wins; this section is informative. Avatar 120 x 120 r16, A-12.)

Geometry at 390 x 844 (S24): card x 24..366 (342), vertically centred
(about y 138..706, 568 tall, no inner scroll); inner box 294 (23 padding +
1 ring). Head row: title "Вітаємо на платформі / Binar-2000" 2 lines
(252-px column, "Вітаємо на платформі" 250.2) + cross; 16; description
"Раді бути вашими партнерами" 16/24 1 line; 24; tile (full inner width,
max 321) py 24: avatar 120, 24, upload pill 42, 12, caption 12/16; 24;
closing line 16/24 2 lines; 24; CTA accent 42 full width. At 320 x 568:
card 272 wide, max-height 520, content about 640 -> scrolls inside; title 3
lines ("Вітаємо на / платформі / Binar-2000"). At 600: card 552, title 1
line, tile 321 centred.

| Block (WelcomeModal.tsx line) | Phone recipe | Desktop | Source |
|---|---|---|---|
| Fit zoom (:70) | `useFitZoom(MODAL_DESIGN_H, 80, FINE_DESKTOP)` with `FINE_DESKTOP = "(min-width: 640px) and (pointer: fine)"` (export it from AuthDrawer or data.ts) | unchanged on mouse desktops | AUTH-04 (landscape touch) |
| Layer (:104-110) | `fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-8 ...` (24 margins) | sm:p-8 | D7 width 100% - 48 |
| Card (:118-128) | `scrollbar-hidden relative flex max-h-[calc(100dvh-48px)] w-[min(718px,100%)] flex-col gap-6 overflow-y-auto overscroll-contain rounded-[32px] border border-stroke-default bg-white p-[23px] transition-[opacity,scale] duration-300 sm:p-10 lg:max-h-full lg:gap-10 lg:rounded-[48px] lg:p-[59px]` + `aria-describedby="welcome-desc"` | r48, p59, max-h-full | D7 (r32, ring #8e8e8f, p 24 incl. the inside stroke - lang 9 / Modal718 parity, max-h 100dvh - 48); same string as the stock card (cart.md 2.4) |
| Head row (:130) | `flex items-start justify-between gap-2 lg:gap-4` | gap 16 | measured: 252 column at 390 keeps 2 lines |
| Title (:131-136) | classes unchanged (24/28 Bold -0.48 phone, 32 desktop); content `Вітаємо на платформі <span className="whitespace-nowrap">Binar-2000</span>` | same text | V17, D9 modal title 24/28 Bold |
| Close (:137-145) | `-mr-[10px] -mt-[8px] flex size-11 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand max-lg:rounded-full max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand lg:m-0 lg:size-8`; icons `<XMarkIcon className="size-6 lg:size-8" />` (glyph 24 at the inner right edge, centred on the first title line: y 26..50) | 32 box, 32 glyph | D7 (cross 24 in a 44 box), V13, V14 |
| Description (:147) | `id="welcome-desc"` + `text-body-md text-neutral-800 lg:text-neutral-900` (phone 16/24 #343435; desktop 20/28 #1d1d1f as today) | 20/28 | TR-17 description 16/24 #343435 (hero body) |
| Tile (:151) | `flex w-full max-w-[321px] flex-col items-center gap-6 rounded-3xl bg-bg-subtle px-4 py-6 lg:gap-[27px] lg:px-8 lg:py-[30px]` | px 32, py 30, gap 27 | AUTH-01; r24 inner element (D5) |
| Avatar (:152-161) | drop the inline style; `relative flex size-[120px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-neutral-900 text-white lg:size-[144.648px] lg:rounded-[19.2864px]`; PersonIcon `size-[88px] lg:size-[106px]` (same 1:7.5 radius proportion) | 144.648, r 19.2864 | Block icon 120 (3085:3976); saves 25 px on short phones |
| Upload pill (:174-182) | Button small fullWidth, `aria-label={logo ? "Замінити лого компанії" : "Завантажити лого компанії"}`, children `<span className="lg:hidden">{logo ? "Замінити лого" : "Завантажити лого"}</span><span className="max-lg:hidden">{full label}</span>` (phone pill 188.7 / 157.7 wide <= tile inner 192 at 320) | full label | AUTH-01 (V01, V02, F03); visible label is a prefix of the accessible name (WCAG 2.5.3) |
| Caption (:183-190) | `w-full text-center text-[12px] leading-4 lg:text-[14px] lg:leading-6` + tone (#777779 / text-negative #d92d20) | 14/24 | D9 captions 12/16 |
| Closing line (:195-197) | `text-body-md text-neutral-800 lg:text-neutral-900` (16/24 #343435) | 20/28 | TR-17 |
| CTA (:199-201) | `size="responsive"` (42 / 16/22 Medium on phones; desktop resolves to Button/Large exactly as the default) | 52 | D8, V16 |

Behaviour (unchanged): focus on the cross at open (initial: closeRef);
Tab trap; scrim tap / Escape / cross -> closeWelcome (marks welcomed);
CTA -> goToProfile (b2b: /profile). On phones there is no visible scrim
area except the 24-px margins; tapping them closes (as today).

### 2.10 Interactions and behaviour (sheet)

| Trigger | Result on phones | Code |
|---|---|---|
| Open from the public menu row | shell-public 2.3: row focuses the burger (`preventScroll`), closes the menu (fade 400), `openAuth()`; the sheet fades/drops in at z-60 above the fading menu; html overflow hidden (useModalBehavior); header + `#mobile-nav` inert; focus on the dialog (no keyboard) | `useModalBehavior({ open, onClose: closeAuth, container: asideRef, inertSelector: "body > header, #mobile-nav" })` |
| Open from the cabinet menu account row (D1) / SignInPrompt / reset link | same sheet, entry "account" / "auto" / "reset" | shell-cabinet; AuthProvider.tsx:82-93 |
| Close | bar cross, Escape, sign-in success (`closeAuth`) or partner first login (-> welcome), sign-up success, "Вийти", "Перейти в профіль" (navigates), route change / Back | AuthProvider (AUTH-05) |
| Focus on close | the opener (the burger after a menu entry, the SignInPrompt button, the cabinet burger) with `preventScroll` (shell-public N2) | useModalBehavior |
| Screen switch (goTo) | clears all field errors and alerts; scroller `scrollTop = 0` in a layout effect keyed on `screen`; on coarse pointers the bar title (`[data-sheet-title]`, tabIndex -1) takes focus when it is rendered (`offsetParent !== null`), else the existing first-field / `data-autofocus` rule (desktop unchanged) | AuthDrawer.tsx:353-391 |
| Failed validation | rAF after the state update: first `input[aria-invalid="true"]` of the form is focused (`preventScroll`) and scrolled to the centre of the scroller (`scrollIntoView({ block: "center", behavior })`, behavior "auto" under reduced motion) | submit handlers :394-505 |
| Server alert (S3, S13, S18) | rAF: `[data-auth-alert]` focused (`preventScroll`), scroller `scrollTo({ top: 0, behavior })` so bar + subtitle + alert are visible; role=alert announces | same |
| Busy | submit `aria-disabled` + 50 %, form `aria-busy`; focus stays on the submit | 2.2 |
| Keyboard up | SYSTEM critique round 1 (3.1.6): the segment viewport `interactiveWidget: "resizes-content"` shrinks the sheet above the Android keyboard; on iOS and landing routes the scroller pads `var(--kb)` (visualViewport inset, published by `useKeyboardInset`); the `:has(input:focus)` 50dvh padding is DELETED (it collapsed on blur and moved the tapped submit away from the finger); Enter / Go submits (enterKeyHint per field) | 2.1 scroller |
| Timer | 0:59 -> 0:00 driven by `Date.now()` (page.clock in tests), then the "again" state; "Отримати посилання ще раз" restarts at 0:59 | unchanged |
| Route change / Back while open | the sheet closes in the same commit (render-phase pathname compare in AuthProvider, as Header.tsx:227-231); the welcome modal closes too (not marked welcomed) | AUTH-05 |
| Rotation across 640 | CSS swaps phone <-> desktop composition in place (no state loss) | - |
| Scroll lock | documentElement overflow hidden (useModalBehavior); `overscroll-contain` on the scroller | unchanged |

No sticky bottom action bar (TR-18) in this area: every primary action
sits directly under its fields and is reachable by the keyboard padding
rule; D7 allows the bar only when the action would otherwise be
off-screen.

### 2.11 Landscape and wide phones

- 568 x 320 (phone layout): bar 66 + a 254-px scroller; every screen
  scrolls; the welcome card max-height 272 scrolls inside. Accepted.
- 600 x 960: full-width sheet, fields 552 (D10: content 552 at 600; the
  menu's 480 cap is not copied - AUTH-26).
- 844 x 390 touch (desktop canvas): the drawer and the welcome card are
  NOT height-fitted on coarse pointers (FINE_DESKTOP media), so they keep
  zoom 1 inside the html zoom 0.586 and scroll; fixes the 0.36 total scale
  (5.8-px input text). Compatible with shell-public N8 (fit floor) if the
  system spec adopts it.

---------------------------------------------------------------------

## 3. Bugs to fix (both lenses merged)

Sources: V = visual-report, F = functional-report. Owner: AU = this
area, SP = shell-public, SC = shell-cabinet, SH = shared layer.

| ID | Sev | Sources | Where | What | Fix | File:line | Owner |
|---|---|---|---|---|---|---|---|
| AUTH-01 | blocker | V01, V02, F03 | Welcome, 320..390 (and logo state) | "Завантажити лого компанії" pill (256.6 nowrap) overflows the tile / card at 320 (label cut), sticks out at 360, off-centre at 375 / 390 | Phone label "Завантажити лого" / "Замінити лого" (full aria-label), tile `px-4 py-6`, avatar 120 (2.9) | WelcomeModal.tsx:151, 174-182 | AU |
| AUTH-02 | major | V03, F18, V26 | Every screen, all phone widths | Desktop side drawer squeezed to 92vw under a live-looking but inert header; 26..48-px scrim strip; two close positions; slide-from-right motion not in the language | Full-screen sheet z-60 with the sticky SheetBar, scrim hidden, menu motion (2.1) | AuthDrawer.tsx:861-908 | AU (+ SH N-A) |
| AUTH-03 | major | F01, F10b | Sign up / sign in submitted from a scrolled sheet, 320 / 390 x 568 | Alert or first invalid field lands above the fold; focus drops to body (submit disabled while busy) | aria-disabled busy pattern; focus + scroll to the alert / first invalid field (2.10) | AuthDrawer.tsx:394-505, 573, 598, 643, 680, 737 | AU |
| AUTH-04 | major | F02 | 844 x 390 touch (desktop canvas): drawer + welcome | Fit zoom on top of the html zoom: 0.36 total, 5.8-px text, 17-px fields | `useFitZoom(..., FINE_DESKTOP)` in both components (2.11) | AuthDrawer.tsx:846; WelcomeModal.tsx:70 | AU |
| AUTH-05 | major | F04 (PS-17) | Any route, Back with the sheet open | Page navigates, sheet stays open with typed data, html locked, header inert | Close on pathname change in AuthProvider (render-phase compare); also close the welcome modal | AuthProvider.tsx:61-94 | AU |
| AUTH-06 | minor | V04 | Input states with the soft keyboard (estimates) | Submit hidden behind the keyboard with no scroll range (390 sign up 118 px, 320 every state) | `max-lg:[&:has(input:focus)]:pb-[50dvh]` on the scroller + enterKeyHint (2.10) | AuthDrawer.tsx:898 | AU |
| AUTH-07 | minor | V05 | Every screen title | 24/28 Bold off the phone scale; sign-in title orphans "кабінету" by 0.9 px; typo "осбистого" | Titles move to the bar in Title Large 22/28 (2.1); the typo is an open point (C4) | AuthDrawer.tsx:91-102 | AU |
| AUTH-08 | minor | V06 | Every screen | 61 px of dead head space (pt 56 reserved for a floating X) | Bar + body pt 24 (2.1) | AuthDrawer.tsx:898 | AU |
| AUTH-09 | minor | V07 | Link sent, 320..390 | Forced desktop break -> 3 lines with a one-word middle line | Phone title without NBSP / br, text-balance (2.5) | AuthDrawer.tsx:609-618 | AU |
| AUTH-10 | minor | V08 | Link sent timer | Countdown left-aligned under a centred column; 14/22 off-scale | Centred, 14/20 Medium on phones (2.5) | AuthDrawer.tsx:627-634 | AU |
| AUTH-11 | minor | V09 | Sign in / set password / sign up alerts | 16/24 alert body (6..8 lines), icon centred on 6+ lines | 14/20 body, icon on the first line (2.2) | AuthDrawer.tsx:122-129 | AU |
| AUTH-12 | minor | V10, F14 | Login label 320 / 360 resting; error label every phone width | Ellipsis hides "телефон" / "номер телефону" | Short label on phones in the error state; 14-px resting labels below 360 (2.2) | AuthDrawer.tsx:173-174, 541-542 | AU |
| AUTH-13 | minor | V11 | Sign in prompt 320..390 | Prompt wraps in 2 lines while the sign-up prompt is 1 line | Full-width sheet: 1 line from 360 (311.4 <= 312); 2 centred lines only at 320; 16/24 line on phones (2.2) | AuthDrawer.tsx:200-221 | AU |
| AUTH-14 | minor | V12 | Every pill at <= 360 | 14-px pill labels (PHONE_PILL) | Delete the 14-px rule; px 11 only on the Google pill below 360 (2.2) | AuthDrawer.tsx:136, 158 | AU |
| AUTH-15 | minor | V13, F08 | Sheet + welcome | Targets: X 32, eye 24, "Забули пароль?" 107 x 22, prompt actions 22 tall, welcome X 32 (menu row 20 tall -> SP) | Bar cross 48; eye 44; forgot 44; prompt actions 44; welcome cross 44 (2.2, 2.9) | AuthDrawer.tsx:212-218, 264-274, 562-571, 901-908; WelcomeModal.tsx:137-145 | AU (menu row: SP PhoneMenuRow) |
| AUTH-16 | minor | V14 | Sheet + welcome close | 32-px XMarkIcon (2-px arms) differs from the 24 / 1.5 master cross | XMarkIcon at size-6 (1.5-px arms, about 18.5 incl. caps = the menu cross) in both | AuthDrawer.tsx:907; WelcomeModal.tsx:144 | AU |
| AUTH-17 | minor | V15 | Account summary | #f8f8f8 r24 card with 14/24 labels over 14/20 values; "-" for a missing e-mail | r32 filled card, TR-27 dl rows with #d2d2d2 lines, empty rows dropped on phones (2.8) | AuthDrawer.tsx:800-809 | AU |
| AUTH-18 | minor | V16 | Welcome CTA | Default (large) Button = 48.5 / 15 px / 400 on phones | `size="responsive"` (2.9) | WelcomeModal.tsx:199 | AU |
| AUTH-19 | minor | V17 | Welcome title 360 | "Binar- / 2000" split | nowrap span (2.9) | WelcomeModal.tsx:135 | AU |
| AUTH-20 | minor | V18 | Welcome 320 x 568, 568 x 320 | 16-px gutters (card 358 at 390); CTA below the fold in a hidden-scrollbar card | 24 margins, max-h 100dvh - 48, avatar 120, 12/16 caption; inner scroll accepted (D7) | WelcomeModal.tsx:107, 125, 152-161, 185 | AU |
| AUTH-21 | minor | V19 | 568 x 320 | Sheet 252 tall under the bar + pt 56; one field visible | Full-height sheet: 66 bar + 254 scroller (2.11) | AuthDrawer.tsx:874-899 | AU |
| AUTH-22 | minor | V20, F09 (PS-09) | Public 66 bar | No account control / signed-in cue in the phone bar | REJECTED for the bar: D2 freezes the public bar and menu (the existing account row stays and reads "Особистий кабінет" when signed in); cabinet: D1 account row with avatar at the top of the burger sheet (SC) | Header.tsx:583-603 | SP / SC |
| AUTH-23 | major | V21 (PS-07) | Phone menu at 320 x 568, 375 x 667, landscape | Fit zoom for a stale 706 stack shrinks the account row to 7..14 px | Owned by shell-public (zoom removed, sticky CTA dock) | Header.tsx:16, 216 | SP |
| AUTH-24 | minor | V22 (O12) | SignInPrompt on cabinet routes | Title 32/36 off-scale | Owned by shell-cabinet (TR-03 H2 30/36) | SignInPrompt.tsx:22 | SC |
| AUTH-25 | nit | V23 | Field helpers vs alert / welcome error | Two reds (#d32f2f helpers, #d92d20 alert) | D6: phone error caption #d92d20, 8 below - shared fields.tsx change (N-E) | fields.tsx:67, 99 | SH |
| AUTH-26 | nit | V24 | 600 px | 552-px fields while the menu caps at 480 | REJECTED: D10 sets content 552 at 600; shell-public drops the menu cap too | - | - |
| AUTH-27 | nit | V25 | Set password -> sign in | Silent save, no confirmation | DEFERRED (needs new copy, C5): optional tile #f8f8f8 r24 p16 with CheckmarkCircleIcon 24 text-positive + 14/20 "Пароль збережено. Увійдіть з новим паролем." above the login field | AuthDrawer.tsx:467-473 | AU (if approved) |
| AUTH-28 | minor | F05 | Sign in after the forgot round trip | Red ring + error label + helper stay on a filled login | goTo clears signinErrors, forgotError, signupErrors, newPasswordErrors (values kept) | AuthDrawer.tsx:386-391 | AU |
| AUTH-29 | minor | F06 | Screen switches on short screens | Scroller keeps scrollTop: the new screen opens mid-way, title under the bar | scrollTop = 0 on every screen change (layout effect) | AuthDrawer.tsx:386-391 | AU |
| AUTH-30 | minor | F07 | Long sheets (sign up 320 / 390 x 568) | The close X scrolls away (y -128) | Sticky bar (2.1) | AuthDrawer.tsx:901-908 | AU |
| AUTH-31 | minor | F10a (PS-10) | Close after a menu entry | Focus lost to body (opener row is inert) | Shell-public: the account row focuses the burger before `openAuth()`, so the opener is the burger; useModalBehavior restores with `preventScroll` (N2) | Header.tsx:587-592; useModalBehavior.ts:78-79 | SP + SH |
| AUTH-32 | minor | F11 | Menu row -> sheet | Smooth scroll-restore animates the page behind the opening drawer | Shell-public drops the body pinning (html lock, no scrollTo); the opaque phone sheet hides the page anyway | Header.tsx:296-300 | SP |
| AUTH-33 | minor | F12 | Login + password inputs | inputMode email for a phone-or-email login; no autocapitalise / autocorrect control on a revealed password | ACCEPTED in part: `autoCapitalize="none" autoCorrect="off" spellCheck={false}` + enterKeyHint on login and passwords (needs N-D). REJECTED: dropping `inputMode="email"` - the default keyboard gives no better digit access than the e-mail one on iOS / Gboard and loses the "@" key for e-mail logins | AuthDrawer.tsx:251-262, 294-304 | AU + SH |
| AUTH-34 | minor | F13 | Google pill on touch | Tap gives no feedback (hover-only title) | Phone status caption "Незабаром" for 3 s (2.2) | AuthDrawer.tsx:184-196 | AU |
| AUTH-35 | minor | F15 | Dialog name | Static "Вхід до особистого кабінету" on every screen | aria-labelledby an sr-only per-screen label (2.1) | AuthDrawer.tsx:878 | AU |
| AUTH-36 | minor | F16 | Forgot screen | No way back except closing (state lost) | Phone "Повернутися до входу" text link (2.4) | AuthDrawer.tsx:587-602 | AU |
| AUTH-37 | minor | F17 | Screen switches on touch | rAF focuses the first field -> Android keyboard pops | Coarse pointers focus the bar title instead (2.10) | AuthDrawer.tsx:353-378 | AU |
| AUTH-38 | minor | new (code read) | Welcome modal type | Description and closing line 14/20 #1d1d1f (TR-17: 16/24 #343435); caption 14/24 off-scale | 2.9 description / closing / caption recipes | WelcomeModal.tsx:147, 185, 195 | AU |
| AUTH-39 | nit | new (code read) | Welcome dialog a11y | No aria-describedby | `aria-describedby="welcome-desc"` (2.9) | WelcomeModal.tsx:118-123 | AU |

Count: 39 rows. To fix in this area (AU, alone or with a shared
dependency): AUTH-01..21, 28..30, 33 (part), 34..39 = 31. Shared /
other owners: AUTH-25 (SH), 23 + 32 (SP), 24 (SC), 31 (SP + SH).
Rejected: AUTH-22 (D2), 26 (D10), the inputMode half of 33. Deferred:
AUTH-27 (copy). Nothing dropped.

---------------------------------------------------------------------

## 4. Shared needs

| # | Atom / API | Status | Proposed API and exact classes | Why (this area) |
|---|---|---|---|---|
| N-A | SheetBar (TR-09 bar), src/components/ui/SheetBar.tsx | NEW - already proposed by cart.md N7; this area needs 4 additions | `SheetBar({ title: ReactNode, titleAs?: "h2" \| "p" = "h2", titleId?: string, titleRef?: Ref<HTMLElement>, onClose: () => void, closeRef?: Ref<HTMLButtonElement>, closeLabel?: string = "Закрити", wrap?: boolean = false, sticky?: boolean = false, className?: string })`. Root: `flex min-h-[66px] shrink-0 items-center justify-between gap-2 bg-white pl-6 pr-3` + wrap `items-start py-[19px]` (instead of items-center) + sticky `sticky top-0 z-[1]` + className. Title: `min-w-0 flex-1 text-title-lg text-neutral-900 outline-none` + (wrap ? `text-balance` : `truncate`), `tabIndex={-1}`, `data-sheet-title`. Close: `flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand` + (wrap ? `-my-2.5` : ``), `<XMarkIcon className="size-6" />` (glyph x W-48 / y 21). Root gets `data-sheet-bar` | the auth bar (2.1) needs 2-line titles (sign in 279.4 > 268 at 360), a sticky bar inside the single scroller, the title as the coarse-pointer focus target, and `-mx-6 lg:hidden` from the caller. `gap-2` (cart N7 says gap-4): title room W - 92 keeps "Вхід до осбистого кабінету" on one line from 375 (C7) |
| N-B | useModalBehavior focus without scroll | CHANGE (shell-public N2), src/components/cart/useModalBehavior.ts:42, 78-79 | `(initial?.current ?? container.current)?.focus({ preventScroll: true })`; `opener.focus({ preventScroll: true })` | closing the sheet must not move the page (AUTH-31) |
| N-C | Root viewport | NEW (shell-public N4, D12), src/app/layout.tsx | `export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" }` | `env(safe-area-inset-bottom)` in the scroller padding is 0 until then |
| N-D | TextField input attributes | CHANGE src/components/checkout/fields.tsx (TextField props :120-170, input :181-197) | new optional props `autoCapitalize?: string`, `autoCorrect?: "on" \| "off"`, `spellCheck?: boolean`, `enterKeyHint?: "enter" \| "done" \| "go" \| "next" \| "previous" \| "search" \| "send"` forwarded to `<input>` unchanged (no class change, pixel-neutral everywhere) | AUTH-33, AUTH-06 |
| N-E | Phone error caption per D6 | CHANGE src/components/checkout/fields.tsx Hint (:78-103) - owner: shared fields (checkout / profile specs must agree) | Hint `<p>` phone: `max-lg:pt-2` (8 below the ring) and error tone `max-lg:text-negative` (#d92d20), keeping `pt-[3px]` / `text-[#d32f2f]` from 640 (5420:38180 desktop exactness) | AUTH-25; also lifts the field 46 -> 70 / 86 with one / two lines instead of 65 / 81 (the y numbers in 2.3..2.7 use today's 65 / 81; re-measure if N-E lands) |
| N-F | Public menu account row contract | EXISTS in shell-public 2.3 (PhoneMenuRow) | row onClick: `burgerRef.current?.focus({ preventScroll: true }); closeMenu(); openAuth();`, label `user ? "Особистий кабінет" : "Увійти"`, 44 hit area | the visitor / B2C entry; focus return (AUTH-31) |
| N-G | Cabinet entry points | shell-cabinet (spec pending) | cabinet burger sheet account row -> focus the cabinet burger, close the sheet, `openAuth("account")` (D1); SignInPrompt Button -> `openAuth()` (O12); PlatformHeader must keep publishing `--site-header-h` (desktop drawer top) | B2B account summary on phones (S20..S23); the welcome test path (S24) |
| N-H | useFitZoom media parameter | EXISTS (cart/useFitZoom.ts:19, third argument) | no change; the auth components pass `FINE_DESKTOP` | AUTH-04 |
| N-I | Button phone sizes (D8) | polish-p1-button agent | none required here: this area always passes `size="small"` / `"responsive"` explicitly | - |
| N-J | Back gesture closes sheets (optional) | NEW proposal for the system spec, e.g. src/components/ui/useBackToClose.ts | `useBackToClose(open, onClose)`: on open push `history.pushState({ binarSheet: true }, "")`, `popstate` -> onClose; closing by other means -> `history.back()` if our entry is on top. Same hook for cart / filters / menu | AUTH-05 covers Back by closing on the pathname change (the page under the sheet still navigates back); N-J would keep the page. Risk: Next router + history entries (C6) |

Atoms this area does NOT need: ListPanel / RecordRow, LoadMore, chip tabs,
filter sheet, Modal718 phone card (the welcome card keeps its own markup;
see C8), CabinetPageHead phone variant, ProductLine.

---------------------------------------------------------------------

## 5. Files

Area files (disjoint from every other area; nobody else edits them):

| File | Change |
|---|---|
| src/components/auth/AuthDrawer.tsx | Layer / scrim / aside / scroller phone recipes with lg restorers (2.1); delete the phone X; SheetBar in the Screens root + body wrapper; BAR_TITLE + sr-only DIALOG_LABEL + aria-labelledby; TitleBlock title `max-lg:hidden`; SuccessTitle phone type + timer title spans; Alert phone type + ref/tabIndex/data attr; PHONE_PILL replaced by GOOGLE_PILL; WideButton `wrapClassName`; PHONE_FIELD_LABEL 14-px rule; useIsDesktop (labels, account rows); LoginField / PasswordField attributes + eye 44; forgot link 44; PromptRow 44 + leading; per-screen rhythm (gap-8 groups, pair wrapper, max-lg:mt-2, order); forgot back link; busy -> aria-disabled + aria-busy; goTo clears errors + scrollTop 0; coarse-pointer focus; failed-submit focus / scroll; Google status caption; AccountScreen card / dl rows / filtering / action order; useFitZoom FINE_DESKTOP; inertSelector `"body > header, #mobile-nav"`; update the header comment (lines 39-63) that still describes the 32-px phone X |
| src/components/auth/WelcomeModal.tsx | 2.9 recipes (layer, card, head gap, title nowrap, cross 44 + 24 glyph, description / closing 16/24, tile, avatar classes, short pill labels + aria-label, caption 12/16, CTA responsive, aria-describedby, FINE_DESKTOP) |
| src/components/auth/AuthProvider.tsx | usePathname + render-phase close of the sheet and the welcome modal on a pathname change (AUTH-05) |
| src/components/auth/data.ts | `COPY.account = { title: "Особистий кабінет" }`, `DIALOG_LABEL`, `COPY.welcome = { upload: "Завантажити лого компанії", replace: "Замінити лого компанії", uploadShort: "Завантажити лого", replaceShort: "Замінити лого" }`, `FINE_DESKTOP` media string (or keep it in AuthDrawer and import it in WelcomeModal) |

New area files: none under src/. (Spec helper created during this phase:
audit/mobile/auth/spec-widths.mjs -> spec-widths.txt, audit only.)

Shared files this area depends on (built by the shared layer / shells,
listed in section 4, NOT edited by the auth builder): src/components/ui/
SheetBar.tsx (N-A), src/components/cart/useModalBehavior.ts (N-B),
src/app/layout.tsx (N-C), src/components/checkout/fields.tsx (N-D, N-E),
src/components/Header.tsx + src/components/PhoneMenu.tsx (N-F),
src/components/platform/PlatformHeader.tsx + cabinet menu +
src/components/platform/ui/SignInPrompt.tsx (N-G).

Build order: N-A, N-B, N-C, N-D first; then the auth files. If N-A is late
the auth builder must wait (no local copy of the bar - it would fork the
TR-09 bar).

---------------------------------------------------------------------

## 6. Verification checklist (verify agent)

Tools: audit/mobile/kit/phone.mjs (touch contexts, `domChecks`,
`shootViewport`), page.clock for the timer, the existing flows in
audit/mobile/auth/functional.mjs and visual.mjs (adapt the selectors:
the phone X is gone, the close is `[data-sheet-bar] button[aria-label="Закрити"]`).

### 6.0 Before the build (builder, once)

Capture the desktop states that the 76-shot baseline does not cover:
`node audit/kit/auth-states.mjs` (1710 x 1117, mouse) and copy
`audit/out/auth-*.png` to `audit/mobile/auth/desktop-before/`; also shoot
the welcome modal at 1710 x 1117 and 1440 x 900 (welcome seed, sign in
from the header pill) to the same folder. After the build rerun into
`audit/mobile/auth/desktop-after/` and `node audit/mobile/kit/compare.mjs
audit/mobile/auth/desktop-before audit/mobile/auth/desktop-after` -> 0
differing files.

### 6.1 Widths and heights

320 x 568, 360 x 780, 375 x 667, 390 x 844, 390 x 568, 430 x 932,
600 x 960, landscape 568 x 320 (phone layout), plus 844 x 390 touch
(desktop canvas, AUTH-04 only).

### 6.2 States

S1..S26 of 1.2 at every width of 6.1 (S20..S23 at 320 / 390 / 600 is
enough), with touch (`hasTouch`, `isMobile`).

### 6.3 Measurements (expected)

Sheet (every state, every phone width):
- aside rect = 0, 0, W x innerHeight; z-index of the layer 60;
  `document.elementFromPoint(W/2, 30)` is inside the dialog (the header
  is covered); no element of the scrim is visible (`display: none`).
- `[data-sheet-bar]`: x 0, y 0 at scrollTop 0 AND after scrolling the
  sheet to the bottom (sticky); height 66 at every width, one title line
  (SYSTEM S12); title x 24, font 22 px / 28 px / 600 /
  -0.44 px, colour rgb(29, 29, 31).
- Close: 48 x 48 at x W-60, y 9; svg 24 x 24 at x W-48, y 21.
- Body: first element top = bar bottom + 24; left 24; width W - 48 (272 /
  312 / 327 / 342 / 382 / 552).
- Fields: 46 tall (65 / 81 / 97 with 1 / 2 / 3 helper lines; re-baseline
  if N-E lands), width W - 48, input font 16 px, 24 between fields.
- "Забули пароль?": visual 20 tall, 16 below the password field,
  right edge W - 24, hit box (button rect) >= 44 tall.
- Pills: 42 tall, width W - 48, label 16 px / 500 at every width
  (no 14 px anywhere); pair gap 8; 32 above the first pill; Google pill
  label not clipped at 320 (scrollWidth == clientWidth).
- Prompt row: 1 line at >= 360, 2 lines at 320; action button rect
  >= 44 tall; 32 below the last pill.
- Eye button rect 44 x 44, glyph 24 at the field's right 24.
- Alert: r24, p16, text 14 px / 20 px, icon top = alert top + 14.
- Link sent: heading 22 / 28 / 600 centred, 2 lines at 360..430, 3 at
  320, 1 at 600; countdown text-align center, 14 px / 20 px; back pill
  32 below the tile.
- Account: card r32, padding 24, rows separated by 1-px rgb(210, 210,
  210) lines, dt 14 / 20 / 500 rgb(119, 119, 121), dd 16 / 24 / 400; no
  "-" row on phones; "Вийти" above "Перейти в профіль", 8 apart.
- Welcome: card left 24 / width W - 48 / r32 / 1-px rgb(142, 142, 143)
  ring; content inset 24; title 24 / 28 / 700; "Binar-2000" never split;
  close rect 44 x 44, svg 24; tile padding 16 / 24; avatar 120; upload pill
  inside the tile with >= 0 px to spare at every width (pill right <= tile
  right - 16), label "Завантажити лого" / "Замінити лого"; caption 12 /
  16; CTA 42 tall full width; card height <= innerHeight - 48.

### 6.4 DOM checks (domChecks on every state)

Expected clean: overflowX, offRight, offLeft, wideElement, tinyText
(nothing < 12 px), inputZoom (all inputs 16), smallTarget (inside the
dialog: no target < 44 except the 42 pills), clippedText (no truncated
label at any width now), hScroller, brokenImage, stretchedImage,
overlapText (at scrollTop 0). Expected and accepted: `fixedTall` for the
full-height sheet (the D7 design). Console: no errors, no hydration
warnings.

### 6.5 Flows (touch taps, not el.click)

1. /catalog visitor: burger -> "Увійти" -> sheet fades in above the
   header; html overflow "hidden"; header inert; focus = dialog. Cross ->
   closed, overflow restored, focus on the burger, scrollY unchanged
   (start at 1500).
2. Sign in empty submit -> both errors; focus on the login input; the
   short label shown. Fill login + wrong password -> submit -> busy 450 ms
   (submit keeps focus, 50 %) -> alert focused, scroller at 0.
3. Same at 320 x 568 after scrolling the sheet to the bottom first.
4. "Забули пароль?" -> forgot (login carried, scrollTop 0, on touch the
   bar title focused, no input focused) -> "Повернутися до входу" link ->
   sign in with NO stale errors (AUTH-28). Forgot empty submit -> error.
5. Forgot 0500000002 -> link sent 0:59 (page.clock) -> +30 s 0:29 ->
   +31 s "again" state (two pills, back first) -> "Отримати посилання ще
   раз" -> 0:59 again. "Повернутися до входу" -> sign in.
6. /?reset=demo after step 5 -> set password (query stripped) -> empty
   -> short -> mismatch (both red) -> valid -> sign in prefilled. Fresh
   context /?reset=demo (no pending) -> valid submit -> alert.
7. Sign up empty / format / mismatch / exists (0500000001) from a
   scrolled sheet at 320 x 568 and 390 x 568 -> the first invalid field
   or the alert is in view and focused; switching sign up <-> sign in
   from the bottom always opens the other screen at scrollTop 0 with the
   bar visible.
8. Valid sign in B2C (0500000002) -> sheet closes; menu row now reads
   "Особистий кабінет" -> account S19 -> "Вийти" -> signed out.
9. B2B seed: cabinet burger -> account row (D1, or the chip until
   shell-cabinet lands) -> S20 -> "Перейти в профіль" -> /profile, sheet
   closed.
10. Back: open the sheet on /catalog/hotels (reached by client nav from
    /catalog), type a login, history.back() -> URL /catalog, sheet
    closed, overflow restored, header not inert.
11. Escape closes (keyboard), Tab cycles inside the sheet only.
12. Keyboard rule: focus any input -> the scroller's computed
    padding-bottom = 50 % of innerHeight; blur -> back to 24.
13. Welcome: welcome seed, /catalog -> menu "Увійти" (or /dashboard
    SignInPrompt) -> sign in 0500000001 / binar2026 -> welcome modal,
    focus on the cross; upload GIF -> red caption "Підтримуються лише PNG
    або JPG"; 5 MB+ PNG -> "Файл більший за 5 МБ"; small PNG -> avatar
    shows the logo, pill reads "Замінити лого"; at 320 x 568 scroll the
    card to the CTA; "Перейти в профіль" -> /profile, welcomed true.
    Repeat with Escape and the cross.
14. 844 x 390 touch: header pill "Увійти" -> the drawer has no `zoom`
    on `[data-auth-sheet]` and scrolls; same for the welcome card.
15. Google pill tap -> "Незабаром" status caption appears and fades
    after 3 s; layout below does not move.

### 6.6 Pixel guard (desktop + landing)

- `node audit/mobile/kit/baseline.mjs audit/mobile/after` then
  `node audit/mobile/kit/compare.mjs audit/mobile/baseline
  audit/mobile/after` -> 0 differing files; specifically
  `shop-1710-auth-signin.png` (open desktop drawer), `landing-phone-*`
  (closed overlays on the landing) and `landing-phone-menu.png`.
- 6.0 desktop-before / desktop-after -> 0 differing files (sign up, link
  sent timer / again, set password, account b2b / b2c, welcome).
- Desktop computed-style spot check at 1710 x 1117: aside top 92,
  width 576, sheet border-top-left-radius 48, padding 59 / 79 / 39 / 59,
  title h2 24 / 28 / 700, account card radius 24, welcome card radius 48
  and padding 59.

---------------------------------------------------------------------

## 7. Conflicts and open points for the system spec

| # | Topic | Detail | Recommendation |
|---|---|---|---|
| C1 | Bar content: screen title vs logo | The menu master bar (3117:13578) keeps the LOGO; D7 / TR-09 put the sheet title in the bar. This spec follows D7 and puts the SCREEN title there (Title Large, up to 2 lines -> bar 94 at 320 / 360 for sign in, 320 for set password). Alternative: logo bar + titles in the body (exact menu idiom, no 2-line bar) | Keep D7 (one bar recipe for cart / auth / filters / preview); the 2-line growth is the only deviation from the 66 bar |
| C2 | D8 / TR-04 order for the form pair | D8 says "secondary outlined first, primary last". The sign-in / sign-up submit stays FIRST and the Google pill second: the submit belongs directly under the fields (form convention, desktop master 5420:38175, Enter submits), and the Google pill is an alternative method, not the secondary of a pair. Pure pairs (link-sent "again", account) follow D8 | Accept the exception for forms with an alternative sign-in |
| C3 | CSS order vs DOM order | D8 order on phones is done with `max-lg:order-*`, so the phone Tab order (rare: hardware keyboards) differs from the visual order for those two pairs | Accept (desktop Tab order unchanged); alternative = phone-first DOM + `lg:flex-col-reverse` (changes the desktop Tab order) |
| C4 | Typo "осбистого" (PS-26 / O14 routed here) | Figma copy kept verbatim on purpose (data.ts:132-133). Fixing it to "особистого" changes the desktop baseline `shop-1710-auth-signin` (one word) | Recommend the fix on ALL widths (one accepted baseline diff); default if not approved: keep verbatim everywhere (no phone-only spelling) |
| C5 | New copy | AUTH-27 needs "Пароль збережено. Увійдіть з новим паролем." (proposal); AUTH-01 uses the phone labels "Завантажити лого" / "Замінити лого" (prefixes of existing strings) | Approve the phone labels (needed for the blocker); AUTH-27 only with approved copy |
| C6 | Back gesture | AUTH-05 closes the sheet on the pathname change (the page under it still goes back). Keeping the page needs history entries (N-J), which interacts with the Next router | System spec decides N-J for all sheets at once (cart, filters, menu, auth) |
| C7 | SheetBar gap | cart.md N7 proposes `gap-4`; this area needs `gap-2` (title room W - 92) to keep "Вхід до осбистого кабінету" on one line at 375; cart titles are short and unaffected | Use gap-2 in the shared atom |
| C8 | Welcome card vs Modal718 / stock card | The welcome keeps its own markup (desktop 718 / r48 / p59 already equals Modal718 desktop); the phone strings equal the stock card (cart.md 2.4: `max-h-[calc(100dvh-48px)]`, r32, ring, 24 margins) | Optional later: a shared PhoneModalCard; not needed for this pass |
| C9 | Error caption colour / offset (N-E) | D6 wants #d92d20 8 below on phones; fields.tsx is shared with checkout / profile, and the desktop helper is #d32f2f 3 below (Figma exactness) | Phone-only change in fields.tsx by the shared owner; the y numbers in 2.3..2.7 shift by +5 per helper line if it lands |
| C10 | Keyboard rule | Local CSS (`:has(input:focus)` -> pb 50dvh) instead of a visualViewport hook or `interactiveWidget: "resizes-content"` in the root viewport (that would reflow the landing on Android) | Accept the local rule; a shared `useKeyboardInset` can replace it later for all sheets |
| C11 | Landscape fit | This area disables the fit zoom on coarse pointers (FINE_DESKTOP); shell-public N8 proposes a 0.85 floor in useFitZoom for everyone | Both are compatible; if N8 lands, keep FINE_DESKTOP (drawer and welcome scroll anyway) |
| C12 | Z-order | Phone sheet z-[60] ties with StockModal / Modal718 / WelcomeModal; auth never opens together with them (sign-in closes the sheet before the welcome) | Accept (cart.md point 14 says the same) |
| C13 | Inert selector on cabinet routes | `"body > header, #mobile-nav"` may not match the PlatformHeader / cabinet sheet if they are not direct body children; on phones the opaque full-screen sheet and aria-modal cover it | shell-cabinet to confirm the selector (or expose `[data-site-header]`) |
| C14 | Desktop behaviour changes (no pixel change) | per-screen dialog name, aria-disabled busy (focus kept), focus to the first invalid field / alert after a failed submit, close on route change, coarse-pointer landscape without fit | Accept as bug fixes on all widths (the freeze is about layout and pixels) |
| C15 | Welcome reachability in tests | The welcome only opens after a sheet sign-in; the test path depends on SignInPrompt (shell-cabinet) or the public menu row (shell-public) | Use the public menu path (/catalog) as the canonical flow |
