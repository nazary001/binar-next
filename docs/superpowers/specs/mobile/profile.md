# /profile - PHONE spec (< 640 px)

Area: "Мій профіль" (B2B cabinet): page head, section chips, logo card,
"Ваші дані", "Дані компанії", "Безпека" + password modal, counterparties
(list + 5 contract overlays + confirm), employees (list + invite / edit /
remove), empty stores, signed-out prompt.

Author: spec agent (profile), 2026-11-05. Spec only, nothing under src/
was edited. Inputs: audit/mobile/BRIEF.md, DECISIONS.md (D1..D13),
lang/figma-mobile-language.md (TR-01..TR-32), lang/code-mobile-recipes.md,
audit/mobile/profile/visual-report.md (V1..V27) and functional-report.md
(PF-01..PF-25), 14 screenshots viewed (visual-cp-390-01/02,
visual-emp-390-02, visual-modal-contracts-390, -invite-390,
-add-counterparty-ready-390, -one-contract-390, -confirm-employee-390, plus
the reports' numbers), the sibling spec docs/superpowers/specs/mobile/
dashboard.md (its shared atoms SN-01..SN-13 are reused by name here so the
system spec gets one API). Shell specs (shell-cabinet.md) did not exist
yet; the shell is assumed as D1 says.

Conventions: "phone" = < 640 (unprefixed or `max-lg:` classes), "desktop" =
`lg:` (equal to the legacy `sm:` / `md:`, all flip at 640). y values are
at 390 x 844 with the D1 shell (header 66, no side-menu strip, slab from
y 66). UI strings are Ukrainian verbatim in plain double quotes; the data
uses curly quotes in company names (ТОВ “Міротель”), keep them.

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
| S1 | SN-15 ChipTabs (`px-4`, platform/ui) | A10 ui/ChipTabs.tsx: `px-[15px]` + 1-px ring = 16, 44 hit `after:` box |
| S2 | 2.3.1 avatar `rounded-3xl` (r24) | `rounded-2xl` (r16, A-12: never rounder than desktop r19.3); edited |
| S3 | SN-05 PanelEmptyState | A14 |
| S4 | SN-07 ListPanel + KeyValueLine | A7 (ListPanel, ListRow, RowDisc, KeyValueLine); profile rows keep their own bodies (7.11) |
| S5 | SN-14 usePhone | A3 |
| S6 | SN-16 Modal718 card + `phone="sheet"` | A6 (built by F1 exactly as SN-16 a-f) |
| S7 | SN-17 fields | A26 (F2) |
| S8 | SN-18 Toast | A23 (global host z-55) |
| S9 | SN-19..SN-21 | Owned by this cluster: KebabMenu.tsx, Dropzone.tsx (A17), UploadedFileTile.tsx |
| S10 | SN-22 / PR-24 Back | A4 (Modal718 on phones) |
| S11 | SN-13 | `CABINET_SECTION_TITLE` (A20) |
| S12 | 7.1 "Дані", 7.9 new copy | O-12 |
| S13 | 7.2 JS tree split | Allowed (A3 usage rules) |
| S14 | 7.3 / 7.4 overlay classification | Accepted (A-8) |
| S15 | 7.6 empty CTA | A14 action rule |
| S16 | Build | C-profile (wave 3) |
| S17 (critique round 1) | 2.3.3 SecurityBlock `gap-6` (Пароль -> "Змінити пароль" 24) | `gap-6` + `max-lg:mt-6` on the button: last field -> action 48 (system 3.1.4 / C-41, contact form 3166:7864); card 282 -> 306; edited in place. Inside modal CARDS (M1 / M7 / M8) the last field -> actions stays 24 (compact modal exception, A6) |
| S18 (critique round 1) | 2.4.2 `ChevronRightIcon` row chevron | One row chevron on phones: `ChevronSideIcon mirrored className="size-6"` (ChevronRightIcon has the same path and may stay; A7) |
| S19 (critique round 1) | 2.4.2 `bg-neutral-40` "+ n" pill | Allowed desktop-identity colour (system 3.1.2 list) |
| S20 (critique round 1) | 2.10 "Збережено" toast on every autosave blur / Enter | A23: fired only when a value actually changed, coalesced per card (one toast 800 ms after the last blur in that card); toasts are queued while a Modal718 card / sheet is open ("Договір додано" shows when M3 closes); host z-55, not z-70 |
| S21 (critique round 1) | 2.6.1 sequential overlays (M3 -> M4 -> M3, M2 -> M4, M5 -> M3) | A4 handoff: the opener closes the old overlay and opens the next one in the same handler; the new overlay adopts the history entry (no back() + push race), so each one stays open and Back closes only the top one |
| S22 (critique round 1) | Modal718 cards with fields (M1 change password, M7, M8) | `align="top"` (A6): the card sits 24 under the top on phones so the keyboard never covers the focused field |
| S23 (critique round 1) | SN-16 pinned head / actions | A6 one-DOM recipe (title row and actions row are direct children of the scrolling card's column, `sticky` on phones, `sm:static`) |
| S24 (critique round 1) | Modal718 `phone="sheet"` bar titles | One line (A-7 revised): "Договори" and "Додати контрагента" fit 228 px at 320; any longer title passes `shortTitle` (copy O-12) |
| S25 (critique round 1) | 2.4 / 2.5 ListPanel rows | A7 revised: `ul role="list"`, no `overflow-clip` (a kebab menu flipping above the first row is not clipped), rows carry the r32 corners and the focus ring |

---------------------------------------------------------------------

## 0. The phone design in one paragraph

The phone page becomes the master's "content page" (article 3176:5609 +
blog chips 3176:5478) on the cabinet slab (D1): H2 head, then a chip row
"Дані" / "Контрагенти" / "Співробітники" (TR-13, D11) right under the
head, and only the selected group below it. "Дані" = four white r32 cards
24 apart (TR-23): logo, "Ваші дані", "Дані компанії", "Безпека".
"Контрагенти" and "Співробітники" = a hug Button/Small "add" action + one
white r32 list panel with 1-px #d2d2d2 row lines (TR-07, SN-07), empty =
TR-24 block inside the panel. The 1000-px table, the underline tabs, the
nested r24 surfaces and the 1700-px scroll to the lists disappear on
phones. Overlays: short ones are the D7 centred card (342, r32, ring
#8e8e8f, p 24, 24 cross in a 44 box, 42 pills stacked 8 apart); the two
long ones ("Договори" with 2+ contracts, "Додати контрагента") are the D7
full-screen sheet (66 bar + cross, scrolling body, sticky white action
bar). Desktop renders exactly today's tree.

---------------------------------------------------------------------

## 1. Scope

### 1.1 Routes and code

| Route | Desktop today | Phone after this spec |
|---|---|---|
| `/profile` | tab Контрагенти (default) | group "Дані" (phone default) |
| `/profile?tab=account` | = default (Контрагенти) | group "Дані" (alias, never written by the phone UI) |
| `/profile?tab=counterparties` | tab Контрагенти | group "Контрагенти" |
| `/profile?tab=employees` | tab Співробітники | group "Співробітники" |

Code: src/app/profile/page.tsx (Suspense, unchanged), src/app/profile/
layout.tsx (`data-canvas="shop"`, unchanged), src/components/platform/
profile/* (ProfileView, LogoCard, AccountForms, shared, CounterpartiesPanel,
ContractParts, EmployeesPanel, data, actions, store, api, icons) on the
platform/ui atoms (Modal718, ConfirmModal, Dropzone, UploadedFileTile,
KebabMenu, StatusPill, TableEmptyState, CabinetPage, CabinetPageHead,
SignInPrompt) and checkout/fields.tsx TextField.

### 1.2 Seeds

| Seed | How | Gives |
|---|---|---|
| S1 partner demo | `seed: "b2b"` (audit/kit/seed-b2b.json); `binar.profile.v1` absent -> ensureProfile seeds `seedProfile()` (data.ts:335-408) | 3 counterparties (1 / 1 / 3 contracts; statuses active / inactive / active), 4 employees (3 active + 1 invited), token a8f3k2 |
| S2 empty lists | S1 + `extra: {"binar.profile.v1": {"demo-b2b": {counterparties: [], employees: [], inviteToken: "a8f3k2"}}}` (functional.mjs:16 `EMPTY`) | both empty states |
| S3 fresh partner | seed with accounts[0].id = "acc-fresh", sessionId "acc-fresh" | `emptyProfile()` (data.ts:412-418): both lists empty, random token |
| S4 long data | visual.mjs:436-489 (`long`): counterparty "Товариство з обмеженою відповідальністю “Готельний комплекс Прем'єр Палац”", signatory "Шевченко-Коваленко Олександра Володимирівна", code 10 digits, status review, no contracts; invited e-mail "very.long.invitation.address.for.testing@premier-palace-hotel.com.ua" at 47.5 h; long company name in the account | wrap / clamp behaviour |
| S5 long file | upload `dogovir_postachannia_tovariv_hotelnoi_kosmetyky_2026_final_skan.pdf` (visual.mjs:174) | file-name wrap |
| S6 review contract | probe-title.mjs (status review contract) | "На розгляді" 117-px badge next to the title |
| S7 expired invite | invitedAt 49 h ago | note "Термін запрошення минув" |
| S8 visitor / B2C | `seed: "none"` / `"b2c"` | SignInPrompt (public chrome) |

### 1.3 States

Reached by the audits and specified below (ids used in sections 2 and 6):

| id | State | Section |
|---|---|---|
| P1 | "Дані" group (default), S1 | 2.3 |
| P2 | "Контрагенти" list, S1 | 2.4 |
| P3 | "Співробітники" list, S1 | 2.5 |
| P4 | empty Контрагенти (S2 / S3) | 2.4.4 |
| P5 | empty Співробітники (S2 / S3) | 2.5.4 |
| P6 | long data S4 / S5 (rows, account fields, file names) | 2.12 |
| P7 | field errors (autosave validation: ПІБ empty, phone, e-mail, ЄДРПОУ) | 2.3.2-2.3.3 |
| P8 | logo uploaded / logo errors (GIF, 6 MB, corrupt PNG) | 2.3.1 |
| P9 | kebab menu open (employee row, contract row, last row of a list) | 2.9 |
| M1 | "Змінити пароль" card: empty / errors (short, mismatch, wrong current) / busy / success | 2.6.3 |
| M2 | "Договір №..." single contract card (+ menu) | 2.6.4 |
| M3 | "Договори" sheet (2+ contracts, + menu, after add, long file) | 2.6.5 |
| M4 | "Додати договір" card: empty / bad type / too big / file picked | 2.6.6 |
| M5 | "Видалити договір?" confirm card | 2.6.7 |
| M6 | "Додати контрагента" sheet: empty / code error / ready / with file | 2.6.8 |
| M7 | "Запросити співробітника" card: empty / exists error / valid / copied | 2.6.9 |
| M8 | "Редагувати співробітника" card: active / invited / phone error / empty ПІБ / bad e-mail | 2.6.10 |
| M9 | "Видалити співробітника?" confirm card (active / invitation) | 2.6.11 |
| X1 | signed-out visitor / B2C prompt (shell-owned) | 2.1 |
| X2 | pre-hydration (partner gate, visitor) (shell-owned) | 2.1 |

Not reachable in the audits (reason) and how the verify agent handles
them:
- "Скопійовано" copy state: headless Chromium had no clipboard
  permission (fallback selected the text). Reachable with
  `context.grantPermissions(["clipboard-read", "clipboard-write"])`.
- Dropzone drag-over: no drag on touch; desktop-only state, not specified.
- Logo busy: the 1x1 PNG decodes instantly; covered by the button's
  disabled style only.
- Real iOS Safari (dvh with the keyboard, safe-area, input zoom), real
  swipe momentum, native share sheet, real file download / new tab:
  Chromium emulation only; listed in 6 as manual checks.
- Landscape 844 x 390 = desktop canvas by design (D13, no tablet layout).

---------------------------------------------------------------------

## 2. Phone layout

### 2.0 Architecture (how phone and desktop coexist)

1. ProfileView renders `null` until hydrated (ProfileView.tsx:80), so a
   JS breakpoint costs nothing (no SSR flash). It reads
   `const phone = usePhone()` (SN-14: `useSyncExternalStore` on
   `matchMedia("(min-width: 640px)")`, server snapshot false) and returns
   EITHER today's desktop JSX (lines 87-149, byte-identical, still fed
   `tab: "counterparties" | "employees"`) OR the new phone tree (2.2-2.5).
   Reason: the desktop composition (364-px left column + one 1144 card
   holding company, security, tabs and the list) and the phone
   composition (chips + one group) share no layout; a CSS-only split
   would render CompanyBlock / SecurityBlock / YouCard twice (duplicate
   ids `profile-you` / `profile-company`, duplicate autosave drafts).
2. Components rendered by BOTH trees (CardTitle, CompanyBlock,
   SecurityBlock, all overlays and their parts) get phone classes with
   `lg:` counterparts equal to today's values, or `max-lg:`-only
   additions, so desktop stays byte-identical.
3. Phone-only components (CounterpartyRow, EmployeeRow, ContractSummary in
   the new phoneParts.tsx; the `"account"` variants of LogoCard / YouCard)
   carry phone classes only (they never render >= 640).
4. Panels get `layout: "phone" | "desktop"` (default "desktop").
5. Tab model (ProfileView.tsx:35-58):
   - desktop: unchanged (`tab = params.tab === "employees" ? "employees" :
     "counterparties"`, counterparties deletes the param).
   - phone: `type PhoneTab = "account" | "counterparties" | "employees"`;
     `phoneTab = params.tab === "employees" ? "employees" : params.tab ===
     "counterparties" ? "counterparties" : "account"`; selecting "account"
     deletes `tab`, the others set it; `router.replace(url, { scroll:
     false })` as today.
   - Consequence (accepted): `/profile` opens "Дані" on a phone and
     Контрагенти on desktop; crossing 640 keeps the URL.

### 2.1 Shell (owned by shell-cabinet, D1; referenced only)

PlatformHeader 66 sticky (logo, cart disc, burger; company chip hidden
below 640), burger -> cabinet menu sheet (account row first: 32 avatar
with the uploaded logo or initials), no SideMenu strip, `CabinetPage` slab
`bg-bg-cabinet rounded-t-[32px] pb-12` from y 66 (SN-01), legal bar
#1d1d1f px 24 py 24 gap 24, Onest 14/30, wrapping (PF-23 / PR-31). Visitor
and B2C get SignInPrompt in the public chrome (X1, SN-12). Pre-hydration
(X2, PF-19) is the shell's gate. Nothing in this area changes the shell.

### 2.2 Page head + section chips (TR-03, TR-13, D9, D10, D11)

Vertical map at 390 (P1):

| y | Block | Rule |
|---|---|---|
| 66 | slab top, r32 | D1, grey slab 3094:4837 |
| 114-150 | H2 "Мій профіль" 30/36 Bold -0.6 | head pt 48 (SN-02, TR-03, article crumb 3176:6558) |
| 166-186 | subtitle "Керуйте даними акаунту та інформацією компанії" 14/20 #777779 (1 line at >= 390 content; 2 lines at 320 / 360 -> +20) | 16 (TR-03, hero 3082:3248) |
| 218-254 | chip row (one row at viewport >= 381, two rows 80 tall at 320-380) | 32 (SN-02 actions gap-8, hero body -> CTA 32) |
| 302 | first block of the group | 48 (SN-02 head pb-12, TR-03 head -> first block 48) |

Recipe (phone tree only):

```tsx
<CabinetPage className="lg:min-h-[1195px]">
  <CabinetPageHead
    title={COPY.title}
    subtitle={COPY.tagline}
    actions={
      <ChipTabs
        label="Розділи профілю"
        idPrefix="profile"
        value={phoneTab}
        onChange={selectPhoneTab}
        items={[
          { key: "account", label: COPY.tabs.account },        // NEW "Дані"
          { key: "counterparties", label: COPY.tabs.counterparties },
          { key: "employees", label: COPY.tabs.employees },
        ]}
      />
    }
  />
  <div
    data-profile="phone-body"
    role="tabpanel"
    id={`profile-panel-${phoneTab}`}
    aria-labelledby={`profile-tab-${phoneTab}`}
    className="flex flex-col gap-6 px-6 [--field-surface:#fff]"
  >
    {/* 2.3 / 2.4 / 2.5 */}
  </div>
</CabinetPage>
```

- CabinetPageHead phone variant = SN-02 (dashboard spec): section `pt-12
  pb-12 gap-8`, title block `gap-4`, H1 `text-h2` (30/36 -0.6 700),
  subtitle `text-[14px] leading-5 text-neutral-500 lg:leading-6`,
  actions `flex flex-wrap items-center gap-2`. If the shell lands a
  24-px head bottom instead, the phone body gets `pt-6` (same 48 result).
- ChipTabs (SN-15, new shared atom, TR-13 blog chips 3176:5478 / recipe
  BlogList.tsx:106): tablist `flex flex-wrap gap-2`; tab `cursor-pointer
  whitespace-nowrap rounded-[60px] border px-4 py-[7px] text-[14px]
  font-medium leading-5 outline-none transition-colors duration-300
  motion-reduce:transition-none focus-visible:ring-2
  focus-visible:ring-brand focus-visible:ring-offset-2` + active `border-transparent bg-brand
  text-white` / inactive `border-stroke-default text-neutral-800`
  (`hover:` / `active:` text-brand + border-brand). 36 tall. Measured
  widths (out/textwidths.txt, 14/500 + 2 x 17): "Дані" 64.2, "Контрагенти"
  121, "Співробітники" 131 -> 332.2 + 16 = needs 332.2 of content: ONE row
  from viewport 381 (390: 342), TWO rows at 320-380 ("Дані" + "Контрагенти"
  / "Співробітники", 8 apart = 80 tall), the master's wrapping chips.
- Semantics kept from ProfileView.tsx:60-76: role tablist + aria-label,
  roving tabindex (only the selected tab is 0), ArrowLeft / ArrowRight /
  Home / End move focus AND select, `aria-selected`, `aria-controls` on
  the selected tab only, ids `profile-tab-<key>` / `profile-panel-<key>`.
- Label "Дані" (NEW copy COPY.tabs.account): "Акаунт" (78.8 + chip) would
  need 342.8 and wrap at 390 by 0.8 px; "Дані" is the umbrella of the
  cards "Ваші дані" / "Дані компанії". See 7.1.
- Nothing above the chips depends on the group -> PR-08 (80-px jump) is
  gone by construction.

### 2.3 Group "Дані" (TR-23, D5, D6, D10)

Four white r32 cards, 24 apart, no strokes (D1 slab cards), each p 24
(card inner 294 at 390, 224 at 320, 504 at 600). Fields are the D6 / TR-21
floating-label field (46 tall, r24, 1-px #d2d2d2 ring, 16-px text),
full width, pitch 70 (gap 24). Vertical map at 390:

| y | Block | Height |
|---|---|---|
| 302-568 | logo card | 266 |
| 592-1020 | "Ваші дані" (title + pill, 5 fields) | 428 |
| 1044-1400 | "Дані компанії" (4 fields) | 356 |
| 1424-1706 | "Безпека" (2 disabled fields + button) | 282 |
| 1754 | legal bar | slab pb 48 (SN-01) |

#### 2.3.1 Logo card (LogoCard variant "account"; TR-23 logo stack, D5)

`<LogoCard logo={user.logo} variant="account" />` (variant type becomes
`"counterparties" | "employees" | "account"`; the two desktop variants are
untouched). Classes for "account":

| Element | Classes | Geometry |
|---|---|---|
| section (LogoCard.tsx:89-93) | `flex items-center justify-center overflow-clip rounded-[32px] bg-white p-6` | 342 x 266 |
| column (:94) | `flex w-full flex-col items-center gap-6` | |
| avatar (:95-99) | `relative size-[120px] shrink-0 overflow-hidden rounded-2xl bg-neutral-900 text-white` | 120, r16 (SYSTEM A-12: never rounder than the desktop r19.3) |
| person glyph (:104-106) | `absolute left-[16.5px] top-[16.5px] size-[86.6px]` | desktop 140-box proportions x 0.857 |
| uploaded logo img (:102) | unchanged `absolute inset-0 size-full object-cover` | |
| button column (:109) | `flex w-full flex-col items-center gap-4` | |
| Button (:122-129) | unchanged `size="small"` -> "Завантажити лого" 189 x 42 / "Замінити лого" | 42 |
| hint / error (:130-135) | `w-full text-center text-[12px] leading-4` + `text-neutral-500` or `text-negative` (role alert when error) | 12/16 caption (D9) |

24 + 120 + 24 + 42 + 16 + 16 + 24 = 266 (was 310 / 298 and changed with the
tab, PR-15). Same at every phone width (centred). Errors: "Підтримуються
лише PNG або JPG" / "Файл більший за 5 МБ" / "Не вдалося прочитати
зображення" replace the hint (2 lines at 320 -> +16). Busy = Button
disabled (opacity 50). A successful upload: phone toast "Лого оновлено"
(NEW copy, 2.10) and the cabinet menu sheet avatar updates (shell).

#### 2.3.2 "Ваші дані" (YouCard variant "account")

`<YouCard account={user} variant="account" onSaved={() => toast(COPY.toast.saved)} />`.
For "account": the pill AND the Роль field are shown (each desktop frame
shows only one of them; the phone has one fixed card, PR-08 / PR-15).

| Element | Classes (variant "account") | Notes |
|---|---|---|
| section (AccountForms.tsx:103-107) | `flex flex-col gap-4 overflow-clip rounded-[32px] bg-white` | |
| head (:108) | `flex flex-wrap items-center gap-x-4 gap-y-2 px-6 pb-2 pt-6` | pill drops under the title at 320 (100 + 16 + 122 > 224), PR-19 |
| h2 (:109) | SN-13 `text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900` | Title Large (D9) |
| pill (:112-116) | unchanged StatusPill tone brand size sm "Адміністратор" | 122 x 30 |
| fields wrapper (:118) | unchanged `flex flex-col gap-6 px-6 pb-6` | pitch 70 |
| fields | ПІБ, Роль, Посада, Номер телефону, Електронна пошта (the counterparties order, :119-161) | |

Title -> first field 24 (pb 8 + gap 16). Height 24 + 30 + 8 + 16 + 5 x 46 +
4 x 24 + 24 = 428 at >= 360 (title row = pill 30), 464 at 320 (title 28 +
8 + pill 30).

AutoSaveField (AccountForms.tsx:27-78) additions (all widths, behaviour
only): `onSaved` callback after `onSave` (phone tree passes the toast,
desktop passes nothing); `enterKeyHint="next"` and Enter -> focus the next
enabled input inside the closest `section` (blur on the last one with
`enterKeyHint="done"`), which also triggers the blur save (PR-21). Needs
SN-17 (TextField `enterKeyHint` + `onKeyDown` pass-through).

#### 2.3.3 "Дані компанії" and "Безпека" (CompanyBlock / SecurityBlock)

Phone tree wraps each block in its own card:

```tsx
<div data-profile="company-card" className="overflow-clip rounded-[32px] bg-white">
  <CompanyBlock account={user} onSaved={...} />
</div>
<div data-profile="security-card" className="overflow-clip rounded-[32px] bg-white">
  <SecurityBlock account={user} onNotice={(m) => toast(m)} />
</div>
```

Shared-by-both-trees class changes (desktop byte-identical):

| Element | Today | New |
|---|---|---|
| CardTitle wrapper (shared.tsx:40) | `flex items-center px-6 pb-4 pt-6 lg:h-20` | `flex items-center px-6 pb-6 pt-6 lg:h-20 lg:pb-4` (title -> field 24, TR-23) |
| CardTitle h2 (shared.tsx:42) | `text-[22px] font-bold leading-7 tracking-[-0.44px] text-neutral-900` | SN-13 `text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 lg:font-bold` |
| SecurityBlock inner (AccountForms.tsx:250) | `flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-[26px]` | `flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:items-start sm:gap-[26px]` (fields 24 apart; SYSTEM critique round 1: the "Змінити пароль" button adds `max-lg:mt-6` -> Пароль -> button 48, system 3.1.4) |

- Company fields: HALF (:169) is already `w-full` below 640 -> stacked,
  pitch 70: Назва компанії, ЄДРПОУ (numeric, max 8), Область, Місто.
  Card 24 + 28 + 24 + 4 x 46 + 3 x 24 + 24 = 356.
- Безпека: Логін (disabled, value `account.login` unchanged, PR-32
  deferred), 24, Пароль (disabled "********"), 48 (SYSTEM critique round
  1: `max-lg:mt-6`, last field -> action 48), Button/Small
  outlinedDark "Змінити пароль" 169 x 42 hug-left (`self-start`, TR-04
  one action). Card 24 + 28 + 24 + 46 + 24 + 46 + 48 + 42 + 24 = 306.
- SecurityBlock gets `onNotice?: (message: string) => void`: when given
  (phone tree), success calls `onNotice(PASSWORD_COPY.done)` ("Пароль
  змінено") and does NOT set the grey helper; when absent (desktop) the
  helper line stays as today (:256, :277-280). PR-21.
- Field values that overflow show an ellipsis while not focused
  (SN-17 `max-lg:text-ellipsis` on RING, PR-20).

### 2.4 Group "Контрагенти" (TR-07, TR-14, TR-24, SN-07)

`<CounterpartiesPanel layout="phone" accountId={user.id} list={profile.counterparties} />`
(rendered only when `profile` is non-null; one post-hydration frame shows
an empty body - no skeleton).

Vertical map at 390 (P2, S1):

| y | Block |
|---|---|
| 302-344 | Button/Small "Додати контрагента" 207 x 42, left |
| 368-898 | list panel 342 x 530: 3 rows of 176 + two 1-px lines |
| 946 | legal bar (slab pb 48) |

#### 2.4.1 Group wrapper and add action

```tsx
<div data-profile="cp-group" className="flex flex-col items-start gap-6">
  {list.length > 0 && (
    <Button type="button" size="small" data-profile="cp-add" onClick={openAdd}>{COPY.counterparties.add}</Button>  {/* focus-fallback target */}
  )}
  {list.length > 0 ? <ListPanel data-profile="cp-list" className="w-full">...rows</ListPanel> : <EmptyPanel />}
</div>
```

- No visible H2 "Контрагенти" on phones (the chip names the panel; the
  tabpanel is `aria-labelledby` the chip; PR-07 duplicate title). Desktop
  head (:425-432) unchanged.
- One action = hug Button/Small left (TR-04); hidden while the list is
  empty (the empty block owns the CTA, PR-18).

#### 2.4.2 Row (CounterpartyRow, phoneParts.tsx; TR-07 anatomy)

ListPanel (SN-07) = `ul flex flex-col rounded-[32px] bg-white px-6`, li
`[&+&]:border-t [&+&]:border-stroke-subtle` (1-px #d2d2d2 lines inset 24 =
row content width, D10 no 0.5 px). The whole row is ONE button (opens M2 /
M3 / M4 exactly like `open()` in CounterpartiesPanel.tsx:417-418):

```tsx
<button
  type="button"
  data-profile="cp-item"
  data-row-id={c.id}
  onClick={() => onOpen(c)}
  className="flex w-full cursor-pointer items-start gap-4 py-6 text-left outline-none transition-opacity active:opacity-70 motion-reduce:transition-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-brand"
>
  <span className="flex min-w-0 flex-1 flex-col gap-3">
    <span className="line-clamp-2 text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900">{c.name}</span>
    <span className="flex flex-wrap items-center gap-2">
      <StatusPill tone={COUNTERPARTY_STATUS[c.status].tone}>{COUNTERPARTY_STATUS[c.status].label}</StatusPill>
      <ContractSummary counterparty={c} />
    </span>
    <span className="flex flex-col gap-1">
      <KeyValueLine label={COPY.counterparties.heads[1]} value={c.signatory} />   {/* "Підписант" */}
      <KeyValueLine label={COPY.counterparties.heads[2]} value={c.code} />        {/* "ЄДРПОУ/ІПН" */}
    </span>
  </span>
  <ChevronRightIcon aria-hidden className="-mt-px size-6 shrink-0 text-neutral-900" />
</button>
```

- Only phrasing elements (`span`) inside the button (valid HTML).
- KeyValueLine (part of SN-07): `<span className="flex flex-wrap gap-x-2 text-[14px] leading-5"><span className="text-neutral-500">{label}</span><span className="min-w-0 whitespace-nowrap text-neutral-900">{value}</span></span>` for the code; the signatory value wraps (no nowrap).
- ContractSummary (phoneParts.tsx, all `h-[38px]` so it centres with the
  38 StatusPill when the row wraps):
  - 0 contracts: `<span className="inline-flex h-[38px] items-center whitespace-nowrap text-[14px] font-semibold leading-5 text-brand">Додати договір</span>` (COPY.contracts.add; the row then opens M4 directly - tap cue replaces the desktop hover-only grey link, PR-30);
  - 1: `inline-flex h-[38px] items-center gap-1 whitespace-nowrap text-[14px] font-semibold leading-5 text-neutral-900` + `<DocumentGlyph className="size-5 shrink-0" />` + number "№432-01";
  - n: the same with `<OrderDocumentsIcon className="size-5 shrink-0" />` + first number + `<span className="ml-1 rounded-[40px] bg-neutral-40 px-2 py-0.5 text-[14px] font-semibold leading-5">+ {n - 1}</span>`.
- Row height 24 + 22 + 12 + 38 + 12 + 44 + 24 = 176 (1-line name, badges on
  one line). 320: left column 224 - 24 - 16 = 184: "Не активний" pill
  118 + 8 + "№289-03" 79 = 205 -> wraps to 2 lines (+46). Names clamp to 2
  lines (language: names in lists clamp 2); the full name is the
  description of M2 / M3 / M4.
- Accessible name = the row text (name, status, contract, Підписант,
  ЄДРПОУ/ІПН); chevron aria-hidden.

#### 2.4.3 Interactions

- Row tap: 1 contract -> M2 card, 2+ -> M3 sheet, 0 -> M4 card (state
  machine CounterpartiesPanel.tsx:41-46 unchanged).
- Add -> M6 sheet. After save: sheet closes, the new row (appended at the
  end, actions.ts:55) is focused with `focus()` (scrolls into view; focus
  ring only for keyboard focus-visible) and toast "Контрагента додано"
  (NEW, PR-27). Implementation: `addCounterparty` already returns the
  record; keep `pendingFocusId` state; an effect on `[modal, list]` runs
  `requestAnimationFrame(() => document.querySelector(`[data-row-id="${id}"]`)?.focus())`
  after the modal state is null (runs after useModalBehavior's cleanup
  refocused the opener, so it wins).
- After a contract remove that empties the list of contracts the row
  stays (contract summary becomes "Додати договір").

#### 2.4.4 Empty (P4; TR-24, SN-05)

```tsx
<div data-profile="cp-empty" className="w-full rounded-[32px] bg-white">
  <PanelEmptyState
    icon={<OrderDocumentsIcon className="size-6 text-neutral-900" />}
    title={COPY.counterparties.emptyTitle}      // "Контрагентів ще не додано"
    text={COPY.counterparties.emptyText}        // "Додайте першого контрагента, щоб він відображався у списку."
    action={<Button type="button" size="small" onClick={openAdd}>{COPY.counterparties.add}</Button>}
  />
</div>
```

SN-05 classes: root `flex flex-col items-center px-6 py-12 text-center`,
icon tile `mb-6 flex size-[52px] items-center justify-center rounded-xl
border border-stroke-default`, title `text-title-lg text-neutral-900`
(22/28 600), text `mt-4 max-w-[294px] text-body-sm text-neutral-500`,
action `mt-8`. 390: 48 + 52 + 24 + 56 (2 lines) + 16 + 40 + 32 + 42 + 48 =
358. CTA variant solid per TR-24 (desktop uses accent; 7.6). Fixes PR-01
(visible at every width, nothing inside a 1000-px table) and PR-18 (one
CTA).

### 2.5 Group "Співробітники" (TR-07, TR-14, TR-24)

`<EmployeesPanel layout="phone" accountId={user.id} list={profile.employees} inviteToken={profile.inviteToken} />`

Vertical map at 390 (P3, S1): Button/Small "Запросити співробітника" 243 x
42 at 302 (fits 272 at 320, PR-06), 24, panel 368-1221 (rows 216 / 202 /
216 / 216 + 3 lines), legal bar at 1269.

#### 2.5.1 Group wrapper

Same as 2.4.1: `flex flex-col items-start gap-6`, add button only when the
list is non-empty, no visible H2, ListPanel `data-profile="emp-list"`.

#### 2.5.2 Row (EmployeeRow, phoneParts.tsx)

```tsx
<article data-profile="emp-item" data-row-id={e.id} tabIndex={-1} className="flex flex-col py-6 outline-none">
  <div className="flex items-start gap-4">
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <h3 className="text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900">{title}</h3>
      {!invited && e.position && <p className="text-[14px] leading-5 text-neutral-500">{e.position}</p>}
    </div>
    <KebabMenu phoneDisc className="-my-[9px] shrink-0" label={`Дії: ${title}`} items={[edit, remove]} />
  </div>
  <div className="mt-3 flex">
    <StatusPill tone={invited ? "blue" : "green"} size="sm">{invited ? "Запрошено" : "Активний"}</StatusPill>
  </div>
  {invited ? (
    <>
      <p className="mt-3 text-[14px] leading-5 text-neutral-900">{inviteNote(e.invitedAt, now)}</p>
      <div className="mt-4 flex">
        <Button type="button" size="small" variant="outlinedDark" fullWidth onClick={onResend}>Надіслати повторно</Button>
      </div>
    </>
  ) : (
    <div className="-mb-3 mt-1 flex flex-col">
      {e.phone && <a href={`tel:+38${phoneDigits(e.phone)}`} className={CONTACT}><PhoneIcon className="size-5 shrink-0" />{formatEmployeePhone(e.phone)}</a>}
      {e.email && <a href={`mailto:${e.email}`} className={CONTACT}><MailIcon className="size-5 shrink-0" /><span className="min-w-0">{e.email}</span></a>}
    </div>
  )}
</article>
```

`CONTACT = "flex min-h-11 items-center gap-3 text-[14px] leading-5 text-neutral-900 transition-colors duration-200 active:text-brand motion-reduce:transition-none focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"`.

- Name / e-mail title Title Small 16/22 Bold (D9 row ids); breaks
  anywhere (global phone rule) instead of truncating (PR-12, PR-17); the
  mail link wraps too (no `truncate`, the address IS the contact).
- Kebab = 40 outlined disc with a 44 hit box (SN-19, TR-07 row actions),
  `-my-[9px]` centres it on the 22 name line without growing the row.
- Contacts are 44-tall rows (PR-23); `mt-1` + the 12 inner top padding =
  16 visual gap under the pill; `-mb-3` keeps the row's visual bottom
  padding at 24.
- Heights: active 24 + 46 + 12 + 30 + 80 + 24 = 216; invited 24 + 22 + 12
  + 30 + 12 + 20 + 16 + 42 + 24 = 202. 320: name column 224 - 16 - 40 =
  168; "Надіслати повторно" full width 224 (label 204 fits, PR-06).
- The desktop EmployeeCard (EmployeesPanel.tsx:64-141) is desktop-only
  after this change: remove its dead `max-sm:` classes (:84, :85, :86,
  :90, :95) - they never apply >= 640, so desktop is unchanged.

#### 2.5.3 Interactions

- Kebab -> menu (220 x 92, 2.9): "Редагувати" -> M8 card, "Видалити" ->
  M9 card.
- "Надіслати повторно" -> `resendInvite` (note resets to 48 год) + phone
  toast "Запрошення надіслано повторно" (NEW, PR-27).
- Invite -> M7 card -> on submit: new row appended (actions.ts:92),
  focused (`article tabIndex=-1`) + toast "Запрошення надіслано" (NEW).
- After remove: focus goes to the add button (or the empty block CTA when
  the list became empty) (PR-25).
- tel: / mailto: links open the system apps.

#### 2.5.4 Empty (P5)

As 2.4.4 with `icon={<PersonFilledIcon className="size-6 text-neutral-900" />}`
(profile/icons.tsx), title "Співробітників ще не запрошено", text
"Запросіть співробітників, щоб додати їх до списку.", action Button/Small
"Запросити співробітника" -> M7. No head button (PR-18).

### 2.6 Overlays

#### 2.6.1 Classification (D7, TR-09, TR-17)

| Id | Overlay | Content | Phone form | Why |
|---|---|---|---|---|
| M1 | Змінити пароль | 3 fields + submit | card | D7 short (<= 3 fields) |
| M2 | Договір №... (1 contract) | 1 file row + 1 action | card | D7 short |
| M3 | Договори (2+) | unbounded list with menus + action | SHEET | list grows with every upload; 3 rows already 580 > 520 at 320 x 568 (PR-11); TR-17 long |
| M4 | Додати договір | dropzone / file + 2 actions | card | D7 short (0 fields); 512 <= 520 at 568 |
| M5 | Видалити договір? | confirm | card | D7 |
| M6 | Додати контрагента | 3 fields + upload + submit (759-891 tall) | SHEET | D7 "more than 3 fields" (4 inputs) |
| M7 | Запросити співробітника | link block + 1 field + submit | card | D7 names invite as short (600 tall at 320 x 568 -> inner scroll, 7.4) |
| M8 | Редагувати співробітника | 4 / 1 fields + submit | card | D7 names edit as short; 430 <= 520 at 568 |
| M9 | Видалити співробітника? | confirm | card | D7 |

Overlays are sequential, never stacked (the state machines switch one
modal for the next), so a sheet -> card -> sheet sequence (M3 -> M4 / M5
-> M3) is three separate opens.

#### 2.6.2 The two phone forms (shared atoms, SN-16; profile only passes props)

Card (Modal718 default on phones, D7 / TR-17): overlay `p-6` (card = vw -
48: 342 at 390, 272 at 320, 552 at 600), white r32, 1-px #8e8e8f ring,
padding 24 (rows `px-[23px] py-[23px]` + border), title 24/28 Bold -0.48
(title group may wrap, the adornment drops under the title, words never
break inside, SN-16 c), close = 24 glyph in a 44 box top-right (glyph
right edge on the content edge), description 16/24 #343435 16 under the
title, slot 24 under the head, actions 24 under the slot, Button/Small 42
full width stacked 8 apart (secondary outlinedDark first, primary last;
TR-04, D8), max-height 100dvh - 48 with inner scroll; scrim
#343435/50 + blur 4.

Sheet (Modal718 `phone="sheet"`, D7 / TR-09 menu master 3117:13578):
fixed inset-0 z-60 white, `h-dvh`; bar 66: title Title Large 22/28
SemiBold at x 24 (vertically centred), the 24 cross at x 342 / y 21 in a
48 hit box (`-mr-3`); body scrolls (`overflow-y-auto overscroll-contain`)
`px-6 pt-6 pb-6`, description (if any) first as 16/24 #343435, then 24,
then the slot; actions in a white bar pinned to the bottom (`border-t
border-stroke-subtle px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]`,
TR-18), full-width Button/Small 42. Motion opacity + translateY(-12) 400
ms ease-[cubic-bezier(0.22,1,0.36,1)], `motion-reduce:transition-none`.
Lock documentElement (useModalBehavior), focus the cross on open, Escape
closes, no scrim (covers the header).

Both forms come from Modal718 CSS (unprefixed phone classes, `sm:` desktop
strings untouched) so the desktop card stays the 718 master.

#### 2.6.3 M1 "Змінити пароль" (card)

AccountForms.tsx:289-352.
- Title "Змінити пароль" (2 lines at 320: 170 > 156 title width).
- Form `flex flex-col gap-6`: Поточний пароль, Новий пароль, Повторіть
  пароль (type password, 16 px, autocomplete current / new / new).
- Phone-only show / hide: each field gets `trailing` = the AuthDrawer eye
  toggle (AuthDrawer.tsx:263-273 recipe: 24 glyph button, `aria-label=
  "Показати пароль"`, `aria-pressed`, EyeIcon / EyeSlashIcon from
  auth/icons) when `usePhone()` is true; desktop passes no `trailing`
  (no `pr-14`, byte-identical). PR-37.
- Submit wrapper (:343) `pt-4` -> `lg:pt-4` (phone: fields -> submit 24,
  D7); SubmitButton accent full width 42 (D8), disabled solid until the 3
  fields are filled, busy disables.
- Errors under the fields 12/16 #d32f2f, 8 below (SN-17 Hint).
- Success: card closes, phone toast "Пароль змінено" (2.3.3).
- 320 x 568: 24 + 56 + 24 + 186 + 24 + 42 + 24 = 380 (fits); with three
  error lines +60.

#### 2.6.4 M2 "Договір №..." (single contract, card)

CounterpartiesPanel.tsx:260-295 (`single`).
- `title={<>{COPY.contracts.single} <span className="whitespace-nowrap">{single.number}</span></>}`
  (PR-04: the number never splits; with SN-16 c the h2 breaks only
  between words and the badge wraps under the title). 390: title 198 in
  a 226 title group -> "Договір №432-01" one line, "Діє" badge on the
  next line (8 below). 320: "Договір" / "№432-01" + badge line.
  "На розгляді" (117) behaves the same (S6).
- description = counterparty name 16/24 #343435 (wraps).
- slot = ContractTile phone recipe (2.7), actions = accent "Додати
  договір" full width 42 -> M4 (back = true).

#### 2.6.5 M3 "Договори" (2+ contracts, SHEET)

- `<Modal718 phone={single ? "card" : "sheet"} ...>`.
- Bar title "Договори"; body: description (counterparty name) 16/24
  #343435, 24, the list wrapper `<div data-profile="contract-list" className="flex flex-col lg:contents">`
  around the ContractCards (desktop: `display: contents` -> the cards stay
  direct children of the slot column with its 24 gap, byte-identical);
  phone rows are TR-25 rows with 1-px lines (2.7).
- Actions (sticky bar): accent "Додати договір" full width -> M4 (back
  true).
- Kebab on the last row: menu must stay fully visible above the bar
  (SN-19 auto-flip, or the body's bottom padding lets it scroll into
  view; verify 6.4).

#### 2.6.6 M4 "Додати договір" (card)

CounterpartiesPanel.tsx:300-340, ContractUpload 223-257.
- Title "Додати договір" (2 lines at 320), description = counterparty
  name, slot = ContractUpload, actions [Назад outlinedDark] then
  [Додати договір accent, disabled solid until a file] stacked 8 apart
  (order already TR-04).
- ContractUpload phone: the dropzone wrapper gets
  `className={file ? "max-lg:hidden" : undefined}` -> after a pick the
  zone is REPLACED by the UploadedFileTile on phones (desktop keeps zone +
  tile, Figma 4868:31339; PR-14). Error line (:241-245) stays 8 under
  the zone (`gap-2`), 12/16 #d92d20 (D6).
- Dropzone phone (SN-20, TR-26): min-h 206, r24 dashed 1-px #343435, p 24:
  52 icon tile r12 (#1d1d1f, white 24 upload glyph), 16, `phoneText`
  "Оберіть файл договору" 16/24 #777779 (NEW copy; the desktop "Перетягніть
  файл сюди або" stays >= 640), 32, Button/Small outlinedDark "Обрати
  файл" (D8 makes the default size 42), 12, `phoneHint` "PDF, PNG, JPG до
  5 МБ" 12/16 #777779 (NEW; desktop hint stays "PNG,JPG до 5МБ", 7.7).
  Zone 242 tall at 390.
- UploadedFileTile phone (SN-21): `p-4 gap-4` grey r24 tile, 48 dark
  tile r12, name 16/22 Bold 2 lines (breaks anywhere), note 14/20 #777779
  wraps ("Визначаємо номер і дату договору..."), remove = 24 cross with a
  44 hit box.
- 320 x 568: 24 + 56 + 16 + 24 + 24 + 242 + 24 + 42 + 8 + 42 + 24 = 526 ->
  6 px inner scroll at 568 only (acceptable; at 667+ fits).
- Save -> `addContract` -> M3 / M2 as today + phone toast "Договір
  додано" (NEW).

#### 2.6.7 M5 "Видалити договір?" (confirm card)

ConfirmModal (CounterpartiesPanel.tsx:466-477): title "Видалити договір?",
body "Ви впевнені, що хочете видалити договір №...? Цю дію неможливо
скасувати." 16/24 #343435; actions Скасувати (outlinedDark) / Підтвердити
(solid), 42, stacked 8 apart. After confirm: back to M3 / M2 if contracts
remain, else close with focus fallback to the row (`[data-row-id]`)
(PR-25).

#### 2.6.8 M6 "Додати контрагента" (SHEET)

CounterpartiesPanel.tsx:346-409.
- `<Modal718 phone="sheet" title="Додати контрагента" ...>`; bar title
  213.5 wide fits 224 at 320.
- Restructure so the submit can live in the sheet's sticky bar (desktop
  geometry identical): the modal component owns the form state
  (`AddCounterpartyDialog` rendered while `open`), the form gets
  `id={formId}` (useId) and drops its SubmitButton; Modal718
  `actions={<ModalActions><SubmitButton type="submit" form={formId} variant="solid" disabled={!ready}>Додати контрагента</SubmitButton></ModalActions>}`.
  Desktop: the actions row sits 40 under the slot (Modal718 inner
  `sm:gap-10`) exactly where the form's `gap-10` put the button today;
  Enter still submits (a submit button associated with `form=` is the
  form's default button). SubmitButton gains `form?: string` (shared.tsx
  :16-34, Button forwards native attrs).
- Body: Юридична назва, ЄДРПОУ / ІПН (numeric, digits only, max 10), Підписант
  (gap 24), 40, label "Додати договір" `text-[16px] font-bold
  leading-[22px] tracking-[0.16px] text-neutral-900 lg:leading-6
  lg:tracking-normal` (Title Small, D9), 24, ContractUpload (2.6.6).
- Validation on blur (PR-26, all widths, 7.8): Юридична назва empty ->
  "Вкажіть юридичну назву" (NEW), Підписант empty -> "Вкажіть підписанта"
  (NEW), code -> existing "Вкажіть 8 цифр ЄДРПОУ або 10 цифр ІПН".
- Submit -> 2.4.3 (focus new row + toast).

#### 2.6.9 M7 "Запросити співробітника" (card)

EmployeesPanel.tsx:152-261.
- Title 2 lines ("Запросити" / "співробітника"); description COPY.invite.text
  16/24 #343435 with a no-break space (U+00A0) between "запрошення" and
  the em dash in data.ts:199 (write the escape via python chr(92) per the
  memory note) so the dash never starts a line (PR-13).
- Form `flex flex-col gap-10` -> `flex flex-col gap-6 lg:gap-10`.
- Link block (`data-profile="invite-card"`, :216-242), phone classes:

| Element | Today | New |
|---|---|---|
| block (:216) | `flex flex-col overflow-clip rounded-3xl bg-bg-subtle` | `flex flex-col gap-3 overflow-clip rounded-3xl bg-bg-subtle p-4 lg:gap-0 lg:p-0` |
| head (:217) | `flex h-[72px] items-start p-6` | `flex items-start lg:h-[72px] lg:p-6` (natural height on phones) |
| title (:218) | `text-[18px] font-extrabold leading-6 tracking-[-0.36px]` | `text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900 lg:text-[18px] lg:font-extrabold lg:leading-6 lg:tracking-[-0.36px]` |
| spacers (:220, :241) | `h-[0.5px]` | add `max-lg:hidden` |
| row (:221) | `flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-start sm:gap-6` | `flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6 sm:px-6 sm:pb-6` |
| input (:222-229) | 46-px read-only field | add `max-lg:hidden` |
| NEW phone link text | - | `<p id="profile-invite-link-text" className="select-all rounded-3xl border border-stroke-subtle bg-white px-4 py-3 text-[14px] font-medium leading-5 text-neutral-900 lg:hidden">{link}</p>` (wraps; full token visible, PR-13) |
| Копіювати (:230-239) | `className="self-start"` | `className="self-start max-lg:w-full max-lg:[&>span]:flex-1"` (342-48-32 wide pill) |

- Copy fallback (:201-204): when the input is hidden, select the phone
  `<p>` with `getSelection().selectAllChildren(p)`.
- "або надішліть на пошту" (:244) `text-center text-[14px] leading-5
  text-neutral-500 lg:text-[16px] lg:leading-6`; the group `gap-6`.
- E-mail field; "Цю адресу вже додано" on a taken address (existing);
  NEW blur error "Вкажіть коректну електронну пошту" for an invalid
  address (PR-26).
- Submit "Надіслати на пошту" solid, full width, disabled solid until
  valid.
- 390 x 844: fits (~560). 320 x 568: ~600 > 520 -> inner scroll, title and
  cross scroll away unless SN-16 d (sticky card head) lands (7.4).

#### 2.6.10 M8 "Редагувати співробітника" (card)

EmployeesPanel.tsx:265-349.
- Active: ПІБ, Посада, Номер телефону, Електронна пошта; invitation:
  Електронна пошта only.
- Form `gap-10` (:306) -> `gap-6 lg:gap-10`; ModalActions + "Зберегти"
  solid full width 42.
- Blur errors (PR-26): ПІБ empty -> "Введіть ПІБ" (existing copy of
  AccountForms), e-mail invalid -> "Вкажіть коректну електронну пошту",
  phone -> existing PHONE_ERROR.
- Save -> phone toast "Зміни збережено" (NEW); focus back to the row's
  kebab (opener; KebabMenu focuses its trigger before onSelect, SN-19).
- 320 x 568 active: 24 + 56 + 24 + 4 x 46 + 3 x 24 + 24 + 42 + 24 = 450.

#### 2.6.11 M9 "Видалити співробітника?" (confirm card)

ConfirmModal (EmployeesPanel.tsx:424-435). Body copy unchanged for now
(accusative issue PR-34, 7.7). After confirm: focus fallback to the add
button (or the empty CTA).

### 2.7 Contract rows (ContractParts.tsx; TR-25, D5)

All changes keep desktop byte-identical (`lg:` = today, `max-lg:` = phone
only):

| Element | Today | New |
|---|---|---|
| FileRow tile (:18) | `relative size-[52px] shrink-0 overflow-clip rounded-xl bg-neutral-800 text-white` | `relative size-12 shrink-0 overflow-clip rounded-xl bg-neutral-800 text-white lg:size-[52px]` (48, r12, D5) |
| tile glyph (:19) | `absolute left-[14px] top-[14px] size-6` | `absolute left-3 top-3 size-6 lg:left-[14px] lg:top-[14px]` |
| file name (:22) | `truncate text-[16px] font-bold leading-6 text-neutral-900` | `text-[16px] font-bold leading-[22px] text-neutral-900 max-lg:line-clamp-2 lg:truncate lg:leading-6` (2 lines, breaks anywhere) |
| meta desktop (:23) | `flex min-w-0 flex-wrap items-center gap-1 text-[14px] leading-6 text-neutral-500` | same + `max-lg:hidden` |
| meta phone (NEW) | - | `<p className="text-[14px] leading-5 text-neutral-500 lg:hidden">` + parts as `<span className="whitespace-nowrap">19.09.2025<span className="text-[#bbbbbc]"> ·</span></span> <span className="whitespace-nowrap">0.9 МБ<span className="text-[#bbbbbc]"> ·</span></span> <span className="whitespace-nowrap">PDF</span>` (the dot is glued to the part before it, a line never starts with a dot; PR-12) |
| ACTION eye (:51-52) | `relative flex size-6 ... before:-inset-2 ... hover:text-brand` | `relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-900 text-neutral-900 transition-colors duration-200 before:absolute before:-inset-0.5 before:content-[''] hover:text-brand max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand lg:size-6 lg:rounded-none lg:border-0 lg:before:-inset-2` + EyeIcon `size-5 lg:size-6` (40 disc, 44 hit) |
| KebabMenu (:68-76) | glyph trigger | `phoneDisc` (SN-19) |
| ContractTile root (:93) | `flex items-center gap-[27px] rounded-3xl bg-bg-subtle p-6` | `flex items-start gap-2 lg:items-center lg:gap-[27px] lg:rounded-3xl lg:bg-bg-subtle lg:p-6` (plain row inside the card) |
| ContractTile actions (:95) | `flex shrink-0 flex-col items-end gap-3` | `flex shrink-0 flex-col items-end gap-2 lg:gap-3` (discs 8 apart: hit boxes 44 never overlap, PR-23) |
| ContractCard root (:129) | `flex items-start gap-[27px] rounded-3xl bg-bg-subtle p-6` | `flex items-start gap-2 border-t border-stroke-subtle py-4 first:border-t-0 lg:gap-[27px] lg:rounded-3xl lg:border-t-0 lg:bg-bg-subtle lg:p-6` |
| ContractCard left (:130) | `flex min-w-0 flex-1 flex-col justify-center gap-4` | `... gap-3 lg:gap-4` |
| number row (:131) | `flex items-center gap-4` | `flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-4` (pill wraps under the number instead of running under the kebab, PR-05) |
| number (:132) | `whitespace-nowrap text-[18px] font-extrabold leading-6 tracking-[-0.36px]` | `whitespace-nowrap text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900 lg:text-[18px] lg:font-extrabold lg:leading-6 lg:tracking-[-0.36px]` (Title Small, D9) |
| ContractCard actions (:139) | `flex shrink-0 flex-col items-end justify-between self-stretch` | `flex shrink-0 flex-col items-end gap-2 lg:justify-between lg:gap-0 lg:self-stretch` |
| card menu offset (:140) | `menuClassName="!top-[calc(100%+10.5px)]"` | `menuClassName="lg:!top-[calc(100%+10.5px)]"` (phone: 6 under the disc) |

Geometry: sheet row at 320 = 272: actions column 40 + gap 8 -> left 224 ->
file text column 224 - 48 - 16 = 160 ("dogovir_123-04.pdf" ~150 fits one
line; meta wraps after a dot). Card (M2) at 320 = 224 -> text column 112
(name 2 lines, meta 2 lines: acceptable at the floor). At 390 the M2 text
column is 182 (name and meta one line each). ContractPill (sm 30, desktop
colours, fixed 69-px "Діє") unchanged (TR-14).

### 2.8 Dropzone / upload - see 2.6.6 (SN-20, SN-21).

### 2.9 Kebab menus (KebabMenu, SN-19)

- Trigger on phones = 40 outlined disc (TR-07): `size-10 rounded-full
  border border-neutral-900 text-neutral-900` + 20 MoreIcon, hit box 44
  (`before:-inset-0.5`), open = `border-brand text-brand`; desktop glyph
  trigger unchanged (KebabMenu.tsx:136).
- Menu unchanged: 220 wide, white r24 (D5 menus r24), 0 2 6 shadow, rows
  46 (>= 44) 16/22 Medium, z-20, right edge on the trigger, 6 below.
  Flips above the trigger when the space below (to the viewport bottom or
  to the sheet's action bar) is < 98 (SN-19).
- Selecting an item focuses the trigger first, then calls onSelect (the
  modal's opener is then a live element, PR-25).
- In a card (M2) an outside tap that only closes the menu must not close
  the card (SN-16 e, PR-28).

### 2.10 Feedback (TR-31 toast, SN-18)

Phone tree only (desktop has no toast; the existing desktop helper "Пароль
змінено" stays). `toast(text)`: bottom-centred, width min(342, 100% - 48),
#2d2d2f, r24, px 24 py 12, 14/20 white, 24 above the safe area, role
status, auto-hide 3 s, above overlays (z-[70]).

| Trigger | Copy (NEW unless noted) |
|---|---|
| any autosave field saved (blur / Enter) | "Збережено" |
| password changed | "Пароль змінено" (PASSWORD_COPY.done) |
| logo uploaded | "Лого оновлено" |
| counterparty added | "Контрагента додано" |
| contract added | "Договір додано" |
| invitation sent | "Запрошення надіслано" |
| invitation resent | "Запрошення надіслано повторно" |
| employee edited | "Зміни збережено" |

All new strings go into `COPY.toast` (data.ts).

### 2.11 Focus, keyboard, scroll lock, back

- Overlays: useModalBehavior as today (html lock, Escape, Tab trap, focus
  on the cross, return focus). Fallback focus when the opener is gone
  (SN-09 extension `fallbackFocus`): removed contract -> its row;
  removed employee -> add button / empty CTA.
- Chips: arrows / Home / End; the URL updates with `replace`, no scroll.
- Fields: Enter moves to the next field (2.3.2); forms in overlays submit
  on Enter when complete (existing).
- Phone Back while an overlay is open: closes the overlay if SN-22
  (history entry) is accepted by the system spec (PR-24); otherwise
  unchanged (leaves the page; no lock leak).
- Visible focus: chips ring-2 brand + offset 2; row buttons ring-2 brand
  r16; discs ring-2 brand (phone only); the programmatic focus of a new row
  shows no ring (focus-visible heuristics).

### 2.12 Loading, error, long content

- Loading: nothing until hydrated (gate), then the head + chips; lists
  appear one frame later (useProfile seeds in an effect). No skeleton.
- Field errors: helper 12/16 #d32f2f 8 under the field (SN-17), red ring;
  the draft is kept (AutoSaveField).
- Long data (S4): counterparty name clamps to 2 lines in the row, full in
  the overlay description; signatory wraps; employee e-mail wraps
  anywhere (no ellipsis); company / person values in fields ellipsize when
  not focused (SN-17); long file names 2 lines (rows, upload tile).
- Many records: no pagination on phones (profile lists are short, not in
  D4's list); the panel just grows.
- Expired invitation (S7): note "Термін запрошення минув", pill stays blue
  (PR-36 deferred).

### 2.13 Width behaviour 320..639

| Width | Content / card inner | Chips | Notable |
|---|---|---|---|
| 320 | 272 / 224 | 2 rows (80) | subtitle 2 lines; "Ваші дані" pill under the title; cp badges wrap; M2 file text 112; M4 6-px inner scroll at 568; M7 inner scroll |
| 360 | 312 / 264 | 2 rows | subtitle 2 lines; pill beside the title |
| 375 | 327 / 279 | 2 rows | |
| 390 | 342 / 294 | 1 row | the y maps above |
| 430 | 382 / 334 | 1 row | |
| 600 | 552 / 504 | 1 row | rows / cards stretch; overlay card 552; sheet content 552 |
| 639 | 591 / 543 | 1 row | last phone width; 640 = desktop tree |

---------------------------------------------------------------------

## 3. Bugs to fix (both lenses merged; V = visual-report finding n, PF = functional)

Owner: A = this area's files, S = shared layer (section 4), SH = shell.

| id | sev | source | where | what | fix | file:line |
|---|---|---|---|---|---|---|
| PR-01 | blocker | V1, PF-01 | P4, 320-639 | empty counterparties block is laid out in the 1000-px table, invisible (blank 200-px box) | phone list group with PanelEmptyState in its own r32 panel (2.4.4) | A CounterpartiesPanel.tsx:132-168; S TableEmptyRow.tsx:26-69 untouched |
| PR-02 | blocker | V2, PF-03 | P2 | 1000-px table in a 294 scroller; status, contract, chevron off-screen; no swipe cue | TR-07 list panel, whole row is the button (2.4.2) | A CounterpartiesPanel.tsx:119-205, 433-435 |
| PR-03 | blocker | V3, PF-02 | all, 320 / 360 | underline tablist does not wrap; "Співробітники" clipped at 296 / overhangs at 360 | ChipTabs that wrap (2.2) | A ProfileView.tsx:98, 101-136 |
| PR-04 | blocker | PF-04, V12 | M2, 320-390 | h2 min-w-0 + global `overflow-wrap:anywhere` -> "Дог / овір / №1 / 00- / 26" (5 lines at 320), "№432-" / "01" at 390 | nowrap number span (A) + Modal718 title group wraps, h2 breaks between words only (S) | A CounterpartiesPanel.tsx:277-278; S Modal718.tsx:102-111 |
| PR-05 | major | V4, PF-05 | M3, 320 | "Завершений" pill runs 38 px under the kebab | number row wraps, actions column separate (2.7) | A ContractParts.tsx:127-143 |
| PR-06 | major | V5, PF-06 | P3, 320 | "Запросити співробітника" +18 past the content; "Надіслати повторно" sticks out of the card | button at page width (242 <= 272); resend full width in the row (2.5) | A EmployeesPanel.tsx:109-115, 377-380 |
| PR-07 | major | V6, PF-07 | all | lists 1700 px down, desktop underline tabs, the panel repeats the tab label as H2 | chips under the head, one group shown, no repeated H2 (2.2, 2.4.1) | A ProfileView.tsx:90-146; CounterpartiesPanel.tsx:425-432; EmployeesPanel.tsx:377-380 |
| PR-08 | major | V7, PF-07 | tab switch | logo card / "Ваші дані" follow the tab: 80-px jump (WebKit without scroll anchoring) | phone "Дані" group is tab-independent; nothing above the chips changes | A ProfileView.tsx:95-96; LogoCard.tsx:62; AccountForms.tsx:101 |
| PR-09 | major | V8 | all | slab > white r24 card > r24 table / grey r24 cards (3 levels); 20 r24 boxes, no r32 | one white r32 card / panel per block on the slab (2.3-2.5); slab top r32 (SH) | A ProfileView.tsx:92-98, LogoCard.tsx:92, AccountForms.tsx:106, EmployeesPanel.tsx:82; SH CabinetPage.tsx:12 |
| PR-10 | major | V9, PF-08 | M1-M9 | card 358 (16 gutters), cross 32, description 18/26, actions 48.5 / 15px Regular 16 apart | D7 card (SN-16 a) + D8 Button (SN-11) | S Modal718.tsx:98, 113-121, 125, 141-143, 215; Button.tsx:80-91 |
| PR-11 | major | V10, PF-08 | M3, M6 (and M7 at 568) | long content scrolls inside a centred card, title + cross scroll away, primary action below the fold | M3 / M6 = sheet with sticky bar (SN-16 b); M7 card + sticky head (SN-16 d, recommended) | A CounterpartiesPanel.tsx:274-293, 346-409; S Modal718.tsx |
| PR-12 | major | V11, PF-12 | M2, M3, P3 | file names cut to 73 / 113 / 143 px; meta wraps with a dot starting a line; employee e-mail ellipsized | 2-line names, glued-dot meta, wrapping e-mail (2.5.2, 2.7) | A ContractParts.tsx:14-34; EmployeesPanel.tsx:127-135 |
| PR-13 | minor | V13, PF-13 | M7 | title wraps in the fixed 72 head (1 px to the field at 320); token never fully visible; em dash starts a line at 320 | natural-height head, wrapping link text, full-width copy, NBSP before the dash (2.6.9) | A EmployeesPanel.tsx:216-242; data.ts:199 |
| PR-14 | minor | V14, PF-11 | M4, M6 | 270 desktop dropzone, drag copy on touch (orphan "або"), large-fallback button, zone stays after a pick, hint omits PDF | TR-26 phone zone + phone copy (SN-20), zone replaced by the file tile on phones | A CounterpartiesPanel.tsx:223-257; S Dropzone.tsx:56-58, 105-127; data.ts:194 |
| PR-15 | minor | V15 | P1 | logo card 310 / 298 (37 % of the screen), avatar 144.6 / 140 by tab | variant "account" 266 (2.3.1) | A LogoCard.tsx:61-106 |
| PR-16 | minor | V16 | all | H1 32/36, captions 14/24, titles 22/28 Bold, names 18/24 ExtraBold, 11 type combos | D9 scale: H2 30/36 (SH SN-02), 14/20, Title Large 600, Title Small 16/22 Bold | A shared.tsx:42, AccountForms.tsx:109, EmployeesPanel (phone rows), ContractParts.tsx:132, LogoCard.tsx:132; SH CabinetPageHead.tsx:68, 71 |
| PR-17 | minor | V17 | P3 | grey cards inside the white card, 24-glyph kebab, contact links 24 tall, e-mail ellipsis / mid-word break at 320 | TR-07 rows in one panel, 40 kebab disc, 44 contact rows (2.5.2) | A EmployeesPanel.tsx:80-140 |
| PR-18 | minor | V18, PF-25 | P4, P5 | two identical CTAs 150 px apart in empty states | head button hidden while empty (2.4.1, 2.5.1) | A EmployeesPanel.tsx:377-390; CounterpartiesPanel.tsx:425-432 |
| PR-19 | minor | V19 | P1, 320 | "Ваші дані" title squeezed to 94 px next to the pill (2 lines) | head `flex-wrap` (2.3.2) | A AccountForms.tsx:108-117 |
| PR-20 | minor | V20 | P1, 320 | field values cut mid-glyph without ellipsis | `max-lg:text-ellipsis` on the field (SN-17) | S fields.tsx:22-23 |
| PR-21 | minor | V21, PF-14 | P1 | autosave silent; Enter / Go does nothing; "Пароль змінено" is a grey 12-px helper | toasts (2.10), Enter -> next field (2.3.2) | A AccountForms.tsx:27-78, 242-283; S fields.tsx (props), Toast |
| PR-22 | minor | V22 | all | rhythm: head -> card 0, Безпека -> tabs 40, tabs -> title 48, page bottom 32 | head pb 48, cards 24, slab pb 48 (2.2, 2.3) | A ProfileView.tsx:101; SH CabinetPage.tsx:12, CabinetPageHead.tsx:63 |
| PR-23 | minor | V23, PF-17 | P2, P3, M2, M3, M4 | contract number buttons 98 x 24, contact links 24, kebab / eye / remove-file 24 glyphs, single-tile kebab + eye hit boxes overlap 4 px | rows are the buttons; 40 discs with 44 hits 8 apart; 44 contact rows; 44 remove hit (2.5, 2.7, SN-19, SN-21) | A ContractParts.tsx:51-52, 95-97; EmployeesPanel.tsx:117-136; S KebabMenu.tsx:136; UploadedFileTile.tsx:40-49 |
| PR-24 | minor | PF-09 | all overlays | phone Back leaves /profile instead of closing the overlay (draft lost) | optional SN-22 history entry (system decision) | S useModalBehavior.ts |
| PR-25 | minor | PF-10 | M5, M8, M9 | focus lands on <body> after menu-driven modals | KebabMenu focuses its trigger before onSelect; fallbackFocus after removals (SN-19, SN-09) | S KebabMenu.tsx:159-162; useModalBehavior.ts:78-80; A panels |
| PR-26 | minor | PF-15 | M6, M7, M8 | invalid / empty fields only grey out the submit, no message | blur helpers (2.6.8-2.6.10), all widths (7.8) | A CounterpartiesPanel.tsx:367-409; EmployeesPanel.tsx:179-349 |
| PR-27 | minor | PF-16 | P2, P3 | new counterparty / invitation lands off-screen, resend changes nothing visible | focus + scroll the new row, toasts (2.4.3, 2.5.3) | A CounterpartiesPanel.tsx:458-465; EmployeesPanel.tsx:400, 406-415 |
| PR-28 | minor | PF-18 | M2 (card with a kebab) | the outside tap that closes the menu also closes the dialog | scrim ignores a tap whose pointerdown closed a menu (SN-16 e) | S Modal718.tsx:216-220; KebabMenu.tsx:63-70 |
| PR-29 | minor | PF-19 | X2 | gate gives up after 4 s (public header + dark footer flash); visitor footer jumps 262 px | shell (gate timeout, placeholder min-height) | SH PlatformChrome.tsx:60-64; SignInPrompt.tsx:18; ProfileView.tsx:80 |
| PR-30 | minor | PF-20 | P2 | "Додати договір" / "№432-01" hover-only cues in the table | closed by PR-02 (row = button, brand "Додати договір") | A |
| PR-31 | minor | PF-23 | footer, 320 | legal copyright nowrap ends at 346 (offRight 26); legal titles look like links | shell D1 legal bar | SH PlatformFooter.tsx:31-43 |
| PR-32 | nit | V24 | P1 Безпека | Логін raw "0500000001" vs phone "+38 050 000 0001" | DEFERRED: desktop-visible value (frozen) and the Figma field shows the login as stored; 7.7 | AccountForms.tsx:249 |
| PR-33 | nit | V25 | M2 vs M3 | "Діє" green dot badge in the title vs blue pill on the cards | REJECTED: both drawn so in Figma (4868:31173 / 4868:31210), TR-14 keeps desktop badge colours | data.ts:53 |
| PR-34 | nit | V26, PF-21 | M9 | "видалити співробітника Наталія Мельник" (nominative) | DEFERRED: copy shared with the desktop modal; proposal in 7.7 | EmployeesPanel.tsx:432-434 |
| PR-35 | nit | PF-21 | P1 vs P3 | "+38 067 123 4567" vs "+380 67 123 4567" on one page | DEFERRED: both formats are Figma-drawn and desktop-visible; 7.7 | AccountForms.tsx:145; data.ts:229-233 |
| PR-36 | nit | PF-21 | S7 | expired invitation keeps the blue "Запрошено" pill | DEFERRED: no Figma state, desktop-visible; 7.7 | EmployeesPanel.tsx:96-98 |
| PR-37 | nit | PF-22 | M1 | no show / hide password | phone-only eye toggles (2.6.3) | A AccountForms.tsx:321-331 |
| PR-38 | nit | V27 | all forms | error caption 3 px under the field (D6: 8) | Hint phone `pt-2` (SN-17) | S fields.tsx:93 |
| PR-39 | nit | PF-24 | landscape 844 x 390 | desktop canvas at zoom 0.586, 9.4-px inputs | REJECTED: D13 (no tablet layout), desktop frozen | - |
| PR-40 | minor | V shell notes | shell | 10-px strip labels, strip scroll at 320, square slab corners, SignInPrompt H1 32/36 | SH (D1 / SN-01 / SN-12) | SideMenu.tsx, CabinetPage.tsx, SignInPrompt.tsx |

To fix in this pass: PR-01..PR-23, PR-25..PR-28, PR-30, PR-37, PR-38 = 30
(PR-24 conditional on SN-22; PR-29 / PR-31 / PR-40 shell; PR-32 / 34 / 35
/ 36 deferred to the orchestrator; PR-33 / PR-39 rejected with reasons).

---------------------------------------------------------------------

## 4. Shared needs (SN ids continue the dashboard spec; same atom = same id)

| id | Atom / API | Status | Needed for |
|---|---|---|---|
| SN-01 | Cabinet shell per D1 (PlatformHeader phone without chip, cabinet menu sheet with the account row avatar = uploaded logo, no SideMenu strip, `CabinetPage` `rounded-t-[32px] pb-12 lg:rounded-t-none lg:rounded-tl-[48px] lg:pb-8`, legal bar) | exists, needs change (shell-cabinet) | 2.1, PR-09, PR-22, PR-31, PR-40 |
| SN-02 | CabinetPageHead phone variant (dashboard spec: `pt-12 pb-12 gap-8`, title block `gap-4`, H1 `text-h2`, subtitle `text-[14px] leading-5 text-neutral-500 lg:leading-6`, actions `flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end lg:gap-4`). Profile passes ChipTabs as `actions` (phone tree only) | exists, needs change (shell-cabinet) | 2.2, PR-16, PR-22 |
| SN-05 | `PanelEmptyState` `{ title; text?; icon?; action?; className? }` (TR-24, classes in 2.4.4) | new (shared) | 2.4.4, 2.5.4 |
| SN-07 | `ListPanel` (`ul flex flex-col rounded-[32px] bg-white px-6`, li `[&+&]:border-t [&+&]:border-stroke-subtle`) + `KeyValueLine({ label, value, nowrap? })`. Profile rows are NOT links: profile builds its own row bodies inside ListPanel (RecordRow is href-based); the row button classes match RecordRow's Link classes | new (shared) | 2.4.2, 2.5.2 |
| SN-09 | useModalBehavior: `opener.focus({ preventScroll: true })` (dashboard) + NEW `fallbackFocus?: RefObject<HTMLElement \| null> \| (() => HTMLElement \| null)` used when the opener is disconnected; Modal718 / ConfirmModal forward it as `returnFocus` | exists, needs change | PR-25 |
| SN-11 | Button D8: `labelSize.large` / `arrowWrap.large` / `arrowIcon.large` / `plusIcon.large` phone strings = the small strings (`rounded-[24px] border px-[23px] py-[9px] text-button-md whitespace-nowrap sm:rounded-[25px] sm:py-[14px] sm:text-button-lg`, disc `size-[42px] rounded-[21px] sm:size-[52px] sm:rounded-[26px]`); every default-size profile pill (SubmitButton, ConfirmModal, ContractsModal, AddContract, Dropzone) becomes 42 / 16/22 Medium | exists, needs change (Button.tsx:80-115; landing guard) | PR-10 |
| SN-13 | Cabinet section title constant `text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 lg:font-bold` (profile CardTitle / YouCard use it) | new (optional) | 2.3 |
| SN-14 | `usePhone(): boolean` (new, e.g. `src/components/ui/usePhone.ts`): `useSyncExternalStore(subscribe to matchMedia("(min-width: 640px)") change, () => !mq.matches, () => false)` | new (shared) | 2.0, M1 eye |
| SN-15 | `ChipTabs<K extends string>` (new, `src/components/platform/ui/ChipTabs.tsx`, TR-13 / D11): props `{ items: { key: K; label: string }[]; value: K; onChange(key: K): void; label: string; idPrefix: string; className? }`; renders `div role="tablist" aria-label` `flex flex-wrap gap-2`, buttons `role="tab"` id `${idPrefix}-tab-${key}`, `aria-selected`, `aria-controls` = `${idPrefix}-panel-${key}` on the selected one, roving tabindex, Arrow / Home / End select + focus; classes in 2.2. Orders (Замовлення / Повернення) and PDP tabs reuse it | new (shared) | 2.2, PR-03, PR-07 |
| SN-16 | Modal718 phone forms: (a) card per D7: overlay `p-6 sm:p-10`; close button `-m-[10px] flex size-11 ... ` with `ClearIcon size-6 sm:size-8` (desktop keeps the 32 box: `sm:m-0 sm:size-8`); description `text-[16px] leading-6 text-neutral-800 sm:text-[20px] sm:leading-7 sm:text-neutral-900`; ModalActions `flex flex-col gap-2 sm:flex-row sm:gap-8`; (b) NEW prop `phone?: "card" \| "sheet"` (default "card"): sheet = `p-0` overlay, card `h-dvh max-h-dvh w-full rounded-none border-0 py-0` with a 66 bar (title 22/28 SemiBold + 48 cross) pinned, scrolling body `px-6 pt-6 pb-6` (description first), actions in a pinned bar `border-t border-stroke-subtle bg-white px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]`, all reset by `sm:` to today's strings; motion per 2.6.2; (c) title group `flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:flex-none sm:flex-nowrap` and h2 `[overflow-wrap:break-word]!` (important: the global phone `overflow-wrap:anywhere` is unlayered and beats utilities, globals.css:1597-1602); (d) recommended: when the card overflows, the title row is sticky (`sticky top-0 z-[1] bg-white` with the card's top padding moved into it) so the cross never scrolls away; (e) scrim closes only if the pointerdown started on the scrim and no `[role="menu"]` was open in the dialog at that moment; (f) forward `returnFocus` (SN-09) | exists, needs change (Modal718.tsx:88-143, 175-236; ConfirmModal inherits) | PR-04, PR-10, PR-11, PR-28 |
| SN-17 | checkout/fields.tsx TextField: RING + `max-lg:text-ellipsis` (unfocused overflow shows ...); Hint box `pt-2 lg:pt-[3px]` (D6 8 below; also checkout / auth on phones); new optional pass-through props `enterKeyHint`, `onKeyDown` | exists, needs change (fields.tsx:22-23, 93, 105-200) | PR-20, PR-21, PR-38 |
| SN-18 | `Toast` / `useToast()` (TR-31; generalises assortment/AssortmentView.tsx:100-106): provider-less module store + `<ToastHost/>` mounted once in the cabinet chrome, or a local hook returning `{ toast(text), node }`; node `pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom))] z-[70] flex justify-center px-6` > `pointer-events-auto w-full max-w-[342px] rounded-3xl bg-[#2d2d2f] px-6 py-3 text-center text-[14px] leading-5 text-white` role status, 3 s, `motion-reduce` | new (shared) | 2.10, PR-21, PR-27 |
| SN-19 | KebabMenu (profile is the only consumer + /ui-gallery): new `phoneDisc?: boolean` -> trigger `relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border before:absolute before:-inset-0.5 before:content-[''] max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand lg:size-6 lg:rounded-none lg:border-0 lg:before:-inset-2` + closed `border-neutral-900 text-neutral-900 lg:text-neutral-500 lg:hover:text-neutral-900` / open `border-brand text-brand`, glyph `size-5 lg:size-6`; item click: `setOpen(false); triggerRef.current?.focus(); item.onSelect()`; flip the menu above the trigger when the space below (viewport, or the nearest `[data-sheet-bar]` top) < menu height + 6 | exists, needs change (KebabMenu.tsx:127-174) | 2.5.2, 2.7, 2.9, PR-23, PR-25 |
| SN-20 | Dropzone (profile-only consumer): box `min-h-[206px] lg:h-[270px]` (today `h-[270px]`); icon `size-[52px] rounded-xl lg:size-[60px] lg:rounded-[19.286px]`; new props `phoneText?`, `phoneHint?` rendered `lg:hidden` next to the desktop strings wrapped `max-lg:hidden`; hint `text-[12px] leading-4 lg:text-[14px] lg:leading-6` | exists, needs change (Dropzone.tsx:16-32, 105-127) | 2.6.6, PR-14 |
| SN-21 | UploadedFileTile (profile-only consumer): root `gap-4 p-4 lg:gap-[27px] lg:p-6`; tile `size-12 lg:size-[52px]`, glyph `left-3 top-3 lg:left-[14px] lg:top-[14px]`; name `text-[16px] font-bold leading-[22px] max-lg:line-clamp-2 lg:truncate lg:leading-6`; note `text-[14px] leading-5 lg:truncate lg:leading-6`; remove `before:-inset-2.5 lg:before:-inset-2` (44 hit) | exists, needs change (UploadedFileTile.tsx:30-50) | 2.6.6, PR-12, PR-23 |
| SN-22 | (optional) useModalBehavior `history?: boolean`: push a same-URL history entry on open, close on popstate, `history.back()` on a programmatic close; must not fight `router.replace` of the tabs | new option, system decision | PR-24 |
| SN-12 | SignInPrompt phone composition (visitor / B2C on /profile) | exists, needs change (shell-cabinet) | X1, PR-40 |

Fallbacks if the shared layer is late: SN-05 / SN-07 / SN-14 / SN-15 /
SN-18 may be built locally in `profile/phoneParts.tsx` with exactly these
classes and swapped later (no visual change). SN-11 / SN-16 / SN-17 /
SN-19..SN-21 have no local fallback (they are the atoms themselves).
SN-19..SN-21 touch files that only profile renders on phones (plus the dev
/ui-gallery); the system spec may hand them to the profile builder.

---------------------------------------------------------------------

## 5. Files

### 5.1 Area files (disjoint from other areas)

| File | Change |
|---|---|
| src/components/platform/profile/ProfileView.tsx | `usePhone()`; desktop JSX kept verbatim; NEW phone tree (CabinetPage + CabinetPageHead with ChipTabs + phone body: "Дані" cards / panels with `layout="phone"`); PhoneTab mapping + selectPhoneTab (2.0 / 2.2); toast wiring (`onSaved`, `onNotice`) |
| src/components/platform/profile/LogoCard.tsx | variant `"account"` class set (2.3.1); optional `onUploaded` callback for the toast |
| src/components/platform/profile/AccountForms.tsx | YouCard variant `"account"` (pill + Роль, r32, flex-wrap head, SN-13 title) + `onSaved`; CompanyBlock `onSaved`; SecurityBlock `onNotice` + inner `gap-6`; AutoSaveField `onSaved`, `enterKeyHint`, Enter -> next field; ChangePasswordForm phone eye toggles (`usePhone`) and `lg:pt-4` |
| src/components/platform/profile/shared.tsx | CardTitle `pb-6 lg:pb-4` + SN-13 h2; SubmitButton `form?: string` pass-through |
| src/components/platform/profile/CounterpartiesPanel.tsx | `layout` prop; phone group (button + ListPanel of CounterpartyRow / PanelEmptyState); single-contract title nowrap span; ContractsModal `phone={single ? "card" : "sheet"}` + `lg:contents` list wrapper; ContractUpload phone zone replacement; AddContract / AddCounterparty phone copy props for the Dropzone; AddCounterparty restructure (form id + actions slot, `phone="sheet"`), blur validation; focus-new-row + toasts; fallback focus after contract removal |
| src/components/platform/profile/ContractParts.tsx | TR-25 phone classes (2.7), phone meta line, disc actions, KebabMenu `phoneDisc` |
| src/components/platform/profile/EmployeesPanel.tsx | `layout` prop; phone group (button + ListPanel of EmployeeRow / PanelEmptyState); desktop EmployeeCard loses its dead `max-sm:` classes; InviteForm phone link block (2.6.9) + copy fallback for the `<p>`; Edit form `gap-6 lg:gap-10` + blur errors; invite e-mail blur error; focus + toasts |
| src/components/platform/profile/data.ts | COPY additions: `tabs.account` "Дані"; `toast.{saved, logo, counterpartyAdded, contractAdded, inviteSent, inviteResent, employeeSaved}`; `dropzone.phoneText` "Оберіть файл договору", `dropzone.phoneHint` "PDF, PNG, JPG до 5 МБ"; errors "Вкажіть юридичну назву", "Вкажіть підписанта", "Вкажіть коректну електронну пошту" (constant); NBSP in `invite.text` (:199) |

### 5.2 New area files

| File | Content |
|---|---|
| src/components/platform/profile/phoneParts.tsx | `CounterpartyRow`, `ContractSummary`, `EmployeeRow`, `CONTACT` class constant; local fallbacks of SN-05 / SN-07 / SN-14 / SN-15 / SN-18 if the shared atoms are late |

### 5.3 Not touched by this area

src/app/profile/page.tsx and layout.tsx, profile/actions.ts (already
returns the new records), store.ts, api.ts, icons.tsx. Shared files are in
section 4 only: ui/Button.tsx, platform/ui/{Modal718, ConfirmModal,
KebabMenu, Dropzone, UploadedFileTile, CabinetPage, CabinetPageHead,
SignInPrompt, ChipTabs (new), PanelEmptyState (new), RecordRow / ListPanel
(new), index.ts}, checkout/fields.tsx, cart/useModalBehavior.ts,
ui/usePhone.ts (new), Toast (new), platform/{PlatformHeader, PlatformChrome,
PlatformFooter, SideMenu}.

---------------------------------------------------------------------

## 6. Verification checklist (fresh verify agent)

Tools: audit/mobile/kit/phone.mjs (`openPhone`, `domChecks`,
`shootSegments`, `shootViewport`, touch emulation), audit/kit/geom.mjs,
the audit scripts audit/mobile/profile/visual.mjs + functional.mjs
(re-run them: every FAIL there must be gone except the deferred /
rejected ids). Use `scrollTo({ behavior: "instant" })` (smooth scroll
tears shots) and taps, not `el.click()`, when judging focus rings.

### 6.1 Widths and states

Widths 320 x 568, 360 x 780, 375 x 667, 390 x 844, 430 x 932, 600 x 960,
639 x 900. States P1-P9, M1-M9 (1.3) with seeds S1-S7; X1 / X2 only as
shell smoke tests.

### 6.2 Measurements (390 unless stated; +-1 px)

- Head: H2 30/36 700 -0.6 at y 114; subtitle 14/20 #777779 16 below;
  chips 36 tall, 32 below; chip widths 64.2 / 121 / 131 (+-2), gap 8, one
  row at 390 / 430 / 600, two rows (80) at 320 / 360 / 375; active chip
  bg #f85a0b white text; first group block 48 under the chips (y 302).
- Gutters 24 left / right at every width; every top-level card / panel
  width = vw - 48 (272 / 312 / 327 / 342 / 382 / 552), radius 32, no
  border, white on #f5f5f5.
- "Дані": logo card 266, avatar 120 r24, button 189 x 42, caption 12/16;
  "Ваші дані" 428 (464 at 320; pill under the title at 320, beside at
  360+); company 356; security 282; cards 24 apart; legal bar 48 under the
  last card.
- Fields 46 tall, pitch 70, 16-px value text, label 12/14 floated;
  values that overflow show an ellipsis when not focused (S4 at 320).
- Контрагенти: button 207 x 42 at x 24; panel rows 176 (S1 at 390),
  1-px #d2d2d2 lines inset 24; row = ONE button (no nested buttons);
  StatusPill 38; chevron 24 at x 318..342; at 320 the badges wrap and
  nothing passes x 296 (panel content edge).
- Співробітники: button 243 x 42 (fits 272 at 320); rows 216 / 202;
  kebab disc 40 (hit 44) centred on the name line; contact rows 44 tall;
  e-mail wraps (S4: full address visible at 320); "Надіслати повторно"
  full width.
- Empty (S2): panel with icon tile 52 r12 ring #8e8e8f, title 22/28 600,
  text 14/20 #777779, CTA 42; no head button; block fully inside the
  viewport width at 320..639.
- Type audit inside main (phone): only 30/36/700, 14/20/400, 14/20/500,
  14/20/600, 22/28/600, 16/24/500 (field values), 12/14/500 (floated
  labels), 16/22/500 (buttons), 16/22/700 (row titles / numbers),
  14/22/500 (status pills), 12/16/400 (captions); no 32/36, 14/24, 18/24
  or 22/28/700 below 640.
- Cards (M1, M2, M4, M5, M7, M8, M9): card width vw - 48, r32, 1-px
  #8e8e8f, padding 24, title 24/28 700, close glyph 24 in a 44 box,
  description 16/24 #343435, actions 42 tall, 8 apart, secondary first;
  card max-height <= vh - 48; at 320 x 568 M1 / M5 / M8 / M9 fit without
  inner scroll, M4 <= 6 px scroll, M7 scrolls (and keeps the cross visible
  if SN-16 d landed).
- M2 title: "Договір №432-01" never splits inside a word or the number at
  320..639 (S1 and S6 "На розгляді"); badge on its own line when it does
  not fit.
- Sheets (M3, M6): fixed full viewport (`h-dvh`), bar 66, title 22/28 600
  at x 24, cross glyph at x 342 / y 21 (390), body scrolls, action bar
  pinned at the bottom (white, 1-px #d2d2d2 top line, pt 16, pb 16 +
  safe area), button 42 full width; the page behind does not scroll
  (documentElement overflow hidden), the header is covered.
- Contract rows (M3): number 16/22 700, pill wraps under the number when
  needed, never overlapping the 40 discs (bounding boxes disjoint at
  320); file tile 48 r12; file name <= 2 lines; meta lines never start
  with a dot; kebab + eye discs 8 apart with non-overlapping 44 hit boxes.
- Dropzone (M4 / M6) on phones: min-h 206 (242 measured), icon 52 r12,
  text "Оберіть файл договору", hint "PDF, PNG, JPG до 5 МБ", button 42;
  after a pick the zone is gone and the file tile shows (name 2 lines,
  44 remove target).
- Invite (M7): link text fully visible (wraps at 320), "Копіювати" full
  width, head natural height (title -> link 12), no line starts with the
  em dash at 320 / 360.

### 6.3 DOM checks (kit `domChecks`) expected clean at every width / state

overflowX, offRight, offLeft, wideElement, clippedText (the old main-card
298 > 272 must be gone), hScroller (no horizontal scroller anywhere on the
page), tinyText (< 12), inputZoom (< 16 px inputs), smallTarget (all
targets >= 44 except 42 pills and 40 discs that carry a 44 `::before`;
the 100 x 33 logo is the known false positive), brokenImage,
stretchedImage, overlapText. `fixedTall` is EXPECTED only while a sheet
(M3 / M6) is open. Console / page errors: none.

### 6.4 Flows (touch emulation, 390 and 320 x 568)

1. Chips: tap each; URL `?tab=` updates (Дані = no param); nothing above
   the chips moves (record the chips' rect before / after: identical);
   keyboard ArrowRight / ArrowLeft / Home / End move + select; browser
   back / forward restore the group.
2. Autosave: edit ПІБ -> blur -> toast "Збережено", value persists after
   reload; Enter in ПІБ moves focus to Роль; invalid e-mail -> helper 8
   below, draft kept, no toast.
3. Logo: upload PNG -> avatar + toast + cabinet menu avatar; GIF / 6 MB /
   corrupt -> error caption in red.
4. Password: wrong current / short / mismatch errors; eye toggles change
   `type`; success -> card closes + toast; desktop (1710) shows the grey
   helper instead and no eye.
5. Counterparties: row 1 -> M2 card (title check), kebab -> "Завантажити"
   (download event) / "Видалити" -> M5 -> confirm -> M2 closes (no
   contracts left: row shows "Додати договір", focus on the row); row 3
   -> M3 sheet: open the LAST row's kebab, the whole menu is visible
   above the action bar; "Додати договір" -> M4 card: pick PDF -> zone
   replaced by the tile -> "Додати договір" -> M3 shows 4 rows + toast;
   M4 "Назад" returns to M3 (back = true) or closes (from a row with no
   contracts); bad type (.txt) -> error line.
6. Add counterparty: open M6 sheet; empty submit disabled; blur empty name
   / signatory -> helpers; bad code -> helper; fill + file -> submit from
   the pinned bar AND via Enter in a field -> sheet closes, new row
   focused + in view, toast; new row status "На розгляді", contract
   "№...".
7. Employees: kebab -> Редагувати (M8): clear ПІБ -> helper, bad e-mail ->
   helper, save -> toast, focus back on that row's kebab; Видалити (M9)
   -> confirm -> row gone, focus on the add button; invited row resend ->
   toast; tel: / mailto: hrefs correct.
8. Invite (M7): copy with clipboard permission granted -> "Скопійовано"
   for 2 s; without permission the phone link text gets selected; taken
   address -> "Цю адресу вже додано"; invalid -> blur helper; valid
   submit -> new invited row focused + toast.
9. Empty stores (S2, S3): both empty blocks; CTA opens M6 / M7; after the
   first add the list replaces the block and the head button appears.
10. Long data (S4 / S5) at 320: no overflow, names clamp / wrap as 2.12.
11. Overlay plumbing at 320 x 568 for every M*: Escape, cross, scrim
    (cards only) close; while a kebab menu is open in M2 a tap outside
    closes only the menu (PR-28); focus returns to the opener (or the
    fallback, PR-25); html overflow restored; scroll position kept.
12. Resize 390 -> 1024 with M3 open: becomes the desktop card; and
    1024 -> 390 on `/profile` (no param): phone shows "Дані".

### 6.5 Desktop / landing pixel guard

- `node audit/mobile/kit/baseline.mjs audit/mobile/after` then
  `node audit/mobile/kit/compare.mjs audit/mobile/baseline audit/mobile/after`:
  0 differing files among cabinet-1710-profile.png,
  cabinet-1710-profile-counterparties.png,
  cabinet-1710-profile-employees.png and every landing-* shot. The three
  phone-390-cabinet-profile*.png are EXPECTED to differ (new layout).
- Desktop overlays are not in the baseline: at 1710 open M1, M2, M3, M4,
  M6 (empty + file), M7, M8, M9 and check with geom.mjs: card 718 wide,
  r48, padding 59 + 1, title 32/28 700, cross box 32, description 20/28,
  actions 52 tall with a 32 gap side by side, Dropzone 270 with "Перетягніть
  файл сюди або" and "PNG,JPG до 5МБ", contract cards #f8f8f8 r24 p 24 with
  the 18/24 ExtraBold number and the 52 file tile, invite link card 72-px
  head + 46 input, no eye toggles, no toast; `?tab=account` at 1710 shows
  the Контрагенти tab.
- 640 x 900 (first desktop width): /profile renders the desktop tree.

---------------------------------------------------------------------

## 7. Conflicts / open points for the system spec

1. Chip label "Дані" is new copy (no Figma). "Акаунт" reads better but
   the three chips then need 342.8 and wrap at 390 by 0.8 px. If the
   orchestrator prefers "Акаунт", accept a 2+1 wrap up to 391 px.
2. JS breakpoint (`usePhone`) for the ProfileView tree instead of CSS
   classes: justified by the client-only render (no SSR flash) and by the
   duplicate ids / drafts a CSS split would create. Overlays stay CSS
   (both trees share them). The system spec should allow this pattern
   for client-only cabinet views.
3. M3 "Договори" is a sheet although D7 lists "DocumentsModal with <= 3
   tiles" as short: contract rows carry menus, the list grows with every
   upload, and 3 rows already exceed 520 at 320 x 568. Single contract
   (M2) stays a card, so the overlay form switches with the count.
4. D7 names "invite" and "edit" as short cards: M7 is ~600 tall at 320 x
   568 (inner scroll, title + cross scroll away unless SN-16 d lands);
   M8 active has 4 fields (D7's "> 3 fields -> sheet" would say sheet) but
   fits 450 <= 520. Followed D7's explicit list; recommend SN-16 d (sticky
   card head) for every long card.
5. Head -> first block 48 (SN-02 `pb-12`), cards inside a group 24 apart,
   last block -> legal bar 48: same reading as the dashboard spec 7.1.
6. Empty-state CTA: TR-24 says solid (used here); the desktop empty rows
   use accent. One choice for all areas (dashboard spec 7.7).
7. Desktop-visible copy left as is (desktop frozen): Логін shown raw
   (PR-32); "видалити співробітника Наталія Мельник" (PR-34; a
   case-neutral rewrite would be "Ви впевнені, що хочете видалити
   співробітника: Наталія Мельник? Цю дію неможливо скасувати."); two
   phone formats (PR-35); expired invitation pill (PR-36, e.g. neutral
   "Термін минув"); the desktop dropzone hint "PNG,JPG до 5МБ" although
   PDF is accepted (phones get "PDF, PNG, JPG до 5 МБ"). The NBSP before
   the em dash in COPY.invite.text IS applied (affects the desktop modal
   text only if a line broke right before the dash). Orchestrator call.
8. Behaviour changes that also reach desktop (no pixel change in the
   guard, modal states are not in the baseline): blur validation helpers
   in M6 / M7 / M8 (PR-26), Enter -> next field in the account cards,
   KebabMenu focusing its trigger before the action, the scrim-tap guard,
   fallback focus. Toasts, eye toggles and the phone dropzone copy are
   phone-only.
9. Phone-only copy invented (no Figma): "Дані", "Оберіть файл договору",
   "PDF, PNG, JPG до 5 МБ", the eight toast strings (2.10), "Вкажіть
   юридичну назву", "Вкажіть підписанта".
10. Toast placement on cabinet routes (SN-18): one host for the whole
    cabinet vs per page; assortment already has a local toast that should
    move onto it.
11. RecordRow (SN-07) is link-based; profile needs button rows (open an
    overlay) and non-interactive article rows with a kebab disc. Either
    RecordRow grows `onClick` / `as` variants or ListPanel + KeyValueLine
    stay the shared part and rows are per area (this spec assumes the
    latter).
12. SN-19..SN-21 (KebabMenu, Dropzone, UploadedFileTile) are rendered on
    phones only by profile; the system spec may assign them to the
    profile builder to keep the shared queue short.
13. SN-22 (Back closes overlays) is global behaviour for every sheet /
    modal; decide once (PR-24).
14. Status colours unchanged (TR-14): the "Діє" title badge (green dot)
    and the "Діє" card pill (blue) differ as in Figma (PR-33).
15. The phone ListPanel rows use CSS 1-px borders between rows (adds 1
    px per line; dashboard spec 7.13 makes the same call).
