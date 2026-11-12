# Admin panel for Binar 2000: design

Date: 2026-11-12. Status: being built. Owner's request (verbatim intent): look
through everything the site has, analyse it, and build a complete, well
thought-out admin panel in the style of the site: blog articles, accounts,
orders and everything else the site holds, an integration with Nova Poshta,
and readiness for the BAS accounting system that will be connected through
an API. Open it locally so every stage of the build is visible.

The owner skipped the question round ("go ahead, there is budget"), so every
decision below is the builder's call unless marked otherwise.

## 1. What it is

A staff area inside the same Next.js app and the same MongoDB database:

- pages under `/admin` (their own shell, zoom 1, Ukrainian UI);
- its API under `/api/admin/*` (staff session cookie, permission per route);
- a machine API for the accounting system under `/api/integrations/bas/v1/*`
  (API keys);
- uploaded files served by `/api/media/<id>`.

Sources of truth for scope: the code of the site, and the two requirement
documents in the parent folder (database + 1C/BAS exchange; the B2B cabinet).
Reference reports written before the build: `audit/admin/understand/*.md`
(design system, catalog, orders, accounts, content, client plumbing, Next 16
rules, audit kit, Nova Poshta API, BAS integration). Read the one for your
area before writing code.

## 2. Goals, non-goals, anti-goals

Goals
- Staff can run the shop without a developer: orders and returns, products,
  customers and partner companies, blog and materials, form submissions,
  settings, staff accounts and roles, a journal of every change.
- Nova Poshta works for real: key check, sender profile, city and branch
  search, waybill creation and cancellation, tracking, label printing.
- The BAS exchange is ready to be switched on: a documented JSON API both
  ways, keys, a queue of new orders, a journal of every call.
- Everything staff change shows on the site at once (cache tags) and in the
  customer's cabinet on its next session refresh.

Non-goals (now)
- Moving the catalog taxonomy (directions, categories, filters) from code to
  the database. The panel shows it and stores metadata next to it.
- A storefront redesign of any kind. Public pages stay pixel-identical unless
  a task names a change.
- Two-factor sign-in, a mail template editor, a page builder for landings.

Anti-goals
- A staff account that is also a customer account, or any reuse of the
  customer session for staff.
- A panel that edits the live database from a developer machine. Local work
  runs on the copy `binar_dev` (`.env.development.local`, `npm run db:clone-dev`).
- Secrets in the browser or in clear text in the database.
- Dead controls: a setting that nothing reads must say so in its hint.

## 3. Architecture

```
src/app/admin/                      pages (server components that guard, then render client screens)
  layout.tsx                        data-admin wrapper, noindex, force-dynamic
  login/, password/                 before the panel opens
  (panel)/layout.tsx                AdminShell (side menu, top bar, slab)
  (panel)/<section>/...             one folder per menu line
src/app/api/admin/**                Route Handlers, every one through adminHandler(permission, fn)
src/app/api/integrations/bas/v1/**  machine API (Bearer key)
src/app/api/media/[id]/route.ts     public files
src/components/admin/
  lib/                              permissions.ts, nav.ts, api.ts, query.ts, format.ts
  ui/                               the kit (tokens.ts is the visual law)
  shell/                            AdminShell, Sidebar, UserMenu, StaffProvider, NavIcon
  <section>/                        screens and widgets of a section ("use client")
src/server/admin/
  auth.ts http.ts page.ts audit.ts list.ts settings.ts secrets.ts staff.ts defaults.ts
  repos/<domain>.ts                 database access of the panel, one file per domain
src/server/integrations/
  nova-poshta/                      carrier client, directory cache, waybills, tracking
  bas/                              keys, handler, inbound appliers, queue
src/server/media/                   upload validation, storage, streaming
src/server/mail/                    providers and templates (the outbox mailer)
```

Isolation from the storefront: one root layout stays. `PlatformChrome`
renders nothing around `/admin` paths, `AuthProvider` skips the customer
session boot and the account drawer there, and `html:has([data-admin])`
switches the canvas zoom off. Links from the panel to the storefront are
plain `<a target="_blank">` (never `next/link`), so the storefront always
boots from a full load.

## 4. Security model

- Staff accounts: collection `staff` (e-mail + scrypt hash, role, active flag,
  "must change password"). Sessions: `staff_sessions`, cookie `binar_admin`
  (httpOnly, SameSite=Lax, Secure in production), token stored as SHA-256,
  12 h sliding, 30 days with "remember me". Blocked account = dead sessions.
- Roles: `staff_roles` (sets of permissions). Built-in: owner (always
  everything, not editable), admin, manager, catalog, content, viewer.
  Permission keys: `src/components/admin/lib/permissions.ts`.
- Every `/api/admin` handler is `adminHandler(<permission>, ...)`: same-origin
  guard for non-GET, 401 without a session, 403 without the permission, 403
  `password-change` until a generated password is replaced.
- Every page calls `requireStaffPage(<permission>)` itself and renders
  `<Forbidden />` when `allowed` is false. The layout is not a guard.
- Every change writes one line to `audit_log` through `audit(staff, request, {...})`
  with a Ukrainian sentence in `summary`.
- Input: zod, strict objects; ids match `zId`; nothing from a request reaches
  a MongoDB filter unvalidated; search text goes through `contains()` (escaped).
- Secrets (carrier key, ERP password, mail key): sealed with AES-256-GCM
  (`admin/secrets.ts`), stored in `...Sealed` fields, shown as a hint only,
  never returned by any route.
- Uploads: size cap 4 MB (Vercel body limit 4.5 MB), type decided by magic
  bytes, never by the name; SVG and HTML are refused; files are served with
  `X-Content-Type-Options: nosniff` and a strict CSP; private files are
  streamed only by routes that check the caller.
- Machine API: `Authorization: Bearer <key>`; keys are random, stored hashed,
  scoped, revocable; every call is logged; batches are idempotent.
- Rate limits (`rateLimit`) on sign-in, password change and the machine API.

## 5. Data model

All types live in `src/server/db/collections.ts`, validators and indexes in
`src/server/db/setup.ts`. Additions are optional fields, so documents and code
older than the panel keep working.

New collections: `staff`, `staff_sessions`, `staff_roles`, `audit_log`,
`settings`, `media`, `media_blobs`, `price_types`, `customer_groups`, `ledger`,
`api_keys`, `exchange_log`, `exchange_batches`, `exchange_queue`,
`carrier_cache`.

Extended documents (see the `...StaffFields` types): orders (history, notes,
manager, shipment, erp link; retail status widened, retail payment), returns
(history, notes, reject reason, refund, return waybill), products (ERP id,
stock, unit, packages, price map, flags, files, SEO, archive mark), clients
(ERP id, group, manager, active flag, stock display), counterparties and
contracts (ERP ids and terms), blog posts (status, dates, author, SEO,
blocks), leads (status, assignee, notes), outbox (delivery bookkeeping).

Rules that follow from how the site already works:
- `_id` is always a string business id; never an ObjectId.
- A document the seed owns carries `seed: true` and is overwritten by
  `npm run db:seed`. Any staff edit of such a document must `$unset` `seed`.
- Cabinet DTOs are built field by field (`toOrderDto` and friends): staff-only
  fields never reach customers. Keep it that way; never spread a document
  into an answer for the storefront.
- Money is a number of UAH with 2 decimals (`server/money.ts`).
- Business days are "YYYY-MM-DD" strings in Kyiv time; technical moments are
  BSON dates. The demo company lives on a fixed day (`clients.demoToday`).
- After a change of public data call `revalidatePublicData([TAG.x])`
  (`server/revalidate.ts`) in the same handler.

Settings groups (`src/server/admin/settings.ts`): `general`, `shop`, `blog`,
`catalog`, `novaPoshta`, `bas`, `mail`.

## 6. Sections of the panel

| Menu line | Path | View / edit permission |
|---|---|---|
| Огляд | /admin | dashboard.view |
| Замовлення | /admin/orders, /admin/orders/[id] | orders.view / orders.edit |
| Повернення | /admin/returns, /admin/returns/[id] | returns.view / returns.edit |
| Доставка | /admin/shipping | shipping.view / shipping.edit |
| Товари | /admin/products, /new, /[id] | catalog.view / catalog.edit |
| Категорії | /admin/categories | catalog.view / catalog.edit |
| Типи цін | /admin/pricing | catalog.view / catalog.edit |
| Акаунти | /admin/customers, /[id] | customers.view / customers.edit |
| Компанії | /admin/companies, /[id] | customers.view / customers.edit |
| Групи покупців | /admin/customer-groups | customers.view / customers.edit |
| Блог | /admin/blog, /new, /[id] | content.view / content.edit / content.publish |
| Матеріали | /admin/materials | content.view / content.edit |
| Медіатека | /admin/media | content.view / content.edit |
| Заявки | /admin/leads | leads.view / leads.edit |
| Інтеграції | /admin/integrations, /nova-poshta, /bas, /mail | integrations.view / integrations.edit |
| Налаштування | /admin/settings | settings.view / settings.edit |
| Співробітники | /admin/staff (accounts, roles) | staff.manage |
| Журнал дій | /admin/audit | audit.view |
| Мій акаунт | /admin/account | any signed-in member of staff |

Order life cycle staff can drive: new -> inProgress -> shipped -> received ->
completed; new/blocked/inProgress -> cancelled; any -> blocked and back. Cancel
requests of partners are approved or declined. Payment: awaiting, partial
(amount), paid, overdue (days derived from the due date). Returns: created ->
review -> approved | rejected -> inTransit -> accepted -> completed.

## 7. Integrations

Nova Poshta (API 2.0, `https://api.novaposhta.ua/v2.0/json/`): server-side
client only; the key is sealed in settings; directory answers are cached in
`carrier_cache` for 24 h; a waybill is created from an order with the sender
profile of the settings and is stored in `order.shipment`; tracking maps the
carrier's status codes to the shipment states; labels are fetched by the
server and streamed, because the carrier's print address contains the key.

BAS (the accounting system): the site owns the contract, BAS calls it on a
schedule (no inbound access to the accounting base is needed):
- BAS pushes: price types, products, prices, stock, clients with
  counterparties and contracts, settlements (ledger), order statuses,
  documents (PDF).
- BAS pulls: the queue of new orders and return requests, and acknowledges
  each with its own id and number.
- Every record carries `externalId` (the GUID in BAS); upserts are by it.
  Batches carry `batchId` and are answered identically when repeated.
- The panel shows the keys, the queue, the journal of calls, what BAS may
  overwrite, and a page for the BAS developer with the contract and a code
  sample.

Mail: messages are written to `outbox`; a provider (Resend API or a webhook)
set in the panel delivers them. Without a provider the panel shows the queue
and says that nothing is being sent.

## 8. Interface

The panel is a sibling of the site's B2B cabinet (Figma "Platform"), one
size denser. The law is `src/components/admin/ui/tokens.ts`:

- Manrope only. Ink #1d1d1f, brand #f85a0b, slab #f5f5f5, white cards,
  hairline #d2d2d2, muted #777779, the nine status tones.
- White side menu and top bar; pages on the grey slab with a 40-px rounded
  top-left corner; cards r24 without shadows; pills for buttons, inputs and
  badges; tables with the dark #343435 head and hover rows; dark tiles for
  key figures; one floating shadow for menus.
- Orange means "active" or "needs attention", never decoration.
- Page titles pair a bold word with a light run, as the cabinet does.
- Sentence case everywhere; no all-caps labels; buttons say what happens
  ("Зберегти зміни", "Опублікувати", "Створити накладну").
- Empty, loading and error states are designed, not left blank: skeleton
  rows, an empty panel with the next action, an error panel with "Спробувати
  ще раз".
- Works from 360 px: the menu becomes a drawer below 1024, tables scroll
  inside their card, forms stack.
- Keyboard: visible focus everywhere, Escape closes layers, focus returns to
  the trigger, Ctrl+K opens the search.

## 9. Conventions for builders (binding)

Language and characters
- UI copy is Ukrainian. Code, comments and identifiers are English.
- Forbidden characters in every file you write, copy included: em dash,
  en dash, the minus sign U+2212, the ellipsis character, curly quotes,
  bullets, arrows, box drawing, non-breaking and zero-width spaces, BOM.
  Use "-", "...", straight quotes; guillemets, the hryvnia sign and the
  numero sign are fine. Check with `node audit/admin/kit/ascii-check.mjs <paths>`.
- This Next.js is 16.2.6 and differs from older versions: read
  `audit/admin/understand/next16-rules.md` first. `params` and `searchParams`
  are Promises; `revalidateTag` takes two arguments; no Server Actions; no
  `proxy.ts`; no `cacheComponents`.

Server
- A route file: `export const GET = adminHandler<Context>("x.view", async ({ request, context, staff, url }) => ...)`.
  Answers: `json({ ok: true, ... })`; refusals: `throw new HttpError(status, "code", extra)`.
  List answers: `{ ok: true, items, total, page, limit }` built with
  `listQuery` + `paginate` (`admin/list.ts`).
- Database access goes in `src/server/admin/repos/<domain>.ts` (first line
  `import "server-only";`), not in route files. Reuse the storefront repos
  where a function already does the job; do not change their behaviour.
- Dates in answers are ISO strings (Response.json does it); the client
  formats them with `lib/format.ts`.
- Writes: `updatedAt: new Date()`; `$unset: { seed: "" }` on seeded
  documents; a history entry where the document keeps one; `audit(...)`;
  `revalidatePublicData([...])` when public data changed.
- Never edit `collections.ts`, `setup.ts`, `settings.ts`, `permissions.ts`,
  `nav.ts`, `tokens.ts`, the shell, or another task's files. If you need a
  field, an index, a setting or a permission that is missing, say so in your
  report under "requests" and work with what exists.

Client
- Screens are client components under `src/components/admin/<section>/`;
  the page file is a server component that guards and renders the screen.
- Data: `useAdminQuery(path)`; changes: `adminApi(path, { method, body })`
  then `invalidate(prefix)`; errors: `errorMessage(result)` in a toast.
- React 19 lint rules are errors here: no `setState` in an effect body, no
  ref reads during render, no `Date.now()` / `Math.random()` during render,
  no component defined inside a component. Patterns that pass: state reset
  in the render phase behind a comparison, `useSyncExternalStore`, state
  updates inside event handlers and promise callbacks.
- Raw `<img>` needs `/* eslint-disable @next/next/no-img-element */` at the
  top of the file (the site's convention; there is no next/image here).
- Tailwind v4: build class lists from whole literals (a class glued to
  `${` is not extracted); transition `translate` / `rotate` / `scale` by
  name; `lg:` is 640 px here, so use `min-[1024px]:`, `xl:`, `2xl:`.
- No new dependencies without a strong reason (present: next, react, zod,
  mongodb, @heroicons/react).

Verification
- The dev server runs on http://localhost:3000 against `binar_dev`, in test
  mode. Never restart or kill it; never run `next build` while it runs
  unless the task says so.
- The QA member of staff: `audit/admin/.qa.json` (owner role). Helpers:
  `audit/admin/kit/admin.mjs` (`open`, `signIn`, `settle`, `shoot`),
  `audit/admin/kit/shot.mjs` (screenshots with a JSON line per page).
- API checks are node scripts in `audit/admin/checks/<task>.mjs`: sign in,
  exercise every route including refusals (401 without a cookie, 403 for a
  role without the permission, 400 for bad input), assert, and remove every
  record the script created. Test records carry ids or names starting with
  `zz-test-`.
- Type check your files: `npx tsc --noEmit -p . 2>&1 | grep -E "<your paths>"`
  (other tasks may be mid-edit; only your own files must be clean). Lint:
  `npx eslint <your files>`.
- Report what you ran and what it printed. A check you did not run is not
  a passed check.

## 10. Deployment (when the owner asks)

1. Push the code (Vercel builds from `main`).
2. `npm run db:setup` (live database: new collections, validators, indexes,
   built-in roles and groups).
3. `npm run admin:create -- --email <owner e-mail> --name "<name>"` and pass
   the printed one-time password to the owner.
4. Optional: `SECRETS_KEY` in Vercel (otherwise secrets are sealed with a key
   derived from `REVALIDATE_SECRET`).
5. In the panel: Nova Poshta key and sender, BAS key for the accountant's
   developer, mail provider.
