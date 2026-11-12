# Binar-2000: MongoDB integration (design)

Date: 2026-11-11. Status: built and verified (see section 11, "As built"). Owner of the decisions below: the
orchestrator (Claude), on the user's request "create the database on the free
tier, move our products there, make login + password for B2B and B2C accounts,
do the full Mongo integration".

Reading order for a builder: sections 1-6 are binding for everyone; section 8
holds the work packages (read yours fully and skim the others); section 9 is
how the work is verified.

Background material (read what your package names):

- `audit/mongo/recon/*.md` - one digest per subsystem of the code as it was
  BEFORE this work (verbatim types, storage keys, consumers, hazards).
- `audit/mongo/recon/next16.md` - how THIS Next.js version (16.2.6) wants
  things done. AGENTS.md is serious: read `node_modules/next/dist/docs/` for
  any API you are not sure about.
- `audit/mongo/recon/mongo.md` - driver 7.8 / Atlas M0 facts.
- `audit/mongo/recon/tz-1.txt`, `tz-2.txt` - the client's own technical specs
  (database architecture for the 1C exchange, B2B cabinet). They describe the
  long-term target; this document says which part of it is built now.

## 1. Intent

Until now every number on the site came from TypeScript mock modules bundled
into the browser, and "accounts" were records in localStorage with an unsalted
SHA-256 of the password. The site must become a real application:

- the data lives in MongoDB Atlas (project Binar, free M0 cluster `binar`,
  AWS Frankfurt, database `binar`);
- B2C buyers register and sign in with a login (e-mail or phone) + password;
  B2B partners sign in with accounts that exist in the database;
- the server is the only authority for identity, prices, order totals and
  access rules;
- NOT ONE PIXEL of the UI changes. The UI is audited 1:1 against Figma and
  guarded by a pixel-diff suite.

## 2. Goals, non-goals, anti-goals

Goals (v1, this build):

1. Catalog (products + product page content), materials library, blog: read
   from MongoDB on the server, cached, revalidated; seeded from today's mocks.
2. Accounts: sign-up (B2C), sign-in (B2C + B2B), sign-out, password reset
   tokens, password change, profile edits, logo, "welcomed" flag. Passwords as
   scrypt hashes, sessions in an httpOnly cookie backed by a `sessions`
   collection.
3. Signed-in cart persisted in the database (guest cart stays in the browser).
4. Checkout creates a real order document (guest, B2C and B2B), re-priced and
   re-validated on the server.
5. B2B cabinet (orders, returns, documents, dashboard, profile with
   counterparties / contracts / employees, "My assortment") reads and writes
   the database, scoped by the signed-in partner's company.
6. Lead forms (quiz, star checklist, partner contact) are stored.
7. The demo partner sees exactly the same cabinet as before (same orders,
   same numbers, same dates), now served from the database.

Non-goals (documented, not built now):

- 1C / BAS / KeepinCRM exchange, price-type matrix, packaging multiplicity,
  category ACL, traffic-light stock, OTP login, Google sign-in.
- Sending e-mail / SMS. Password-reset links and employee invitations are
  created and stored (collection `outbox`), nothing is delivered yet.
- File storage. Contract uploads keep metadata only (as today); materials
  files stay the two placeholders in `public/`.
- The catalog taxonomy (3 directions, 18 categories, menu, banners, crops)
  stays in code: it is Figma-tuned presentation. Products reference it by the
  same labels / slugs as today.
- Admin UI. Data is managed with the seed scripts and Atlas Data Explorer.
- Payments, stock reservation.

Anti-goals (a build that does any of these has failed):

- Any visible change: markup, class names, copy, spacing, new loading states,
  spinners, flashes of an empty state where data used to be instant.
- A secret (connection string, password hash, session token) reaching the
  browser bundle, the HTML, a log line or git.
- Trusting the browser for prices, totals, ownership or roles.
- Per-user data in prerendered HTML.

## 3. Architecture

```
Browser                                   Server (Next 16, Node runtime)        Atlas
-------                                   ------------------------------        -----
client stores (unchanged API)             src/app/api/**/route.ts               db `binar`
  auth/store, cart/store,       fetch     thin handlers: guard -> validate
  orders/store, profile/store, ---------> -> repo -> DTO
  assortment/store                        src/server/repos/*  (server-only)  -> collections
localStorage = cache/mirror only          src/server/auth/*   (sessions,
                                            password hashing, rate limits)
server components (catalog, PDP,  await   src/server/repos/catalog|materials|
  materials, blog, sitemap)     --------> blog  (unstable_cache + tags)
```

Rules:

- `src/server/**` is server-only (`import "server-only"` at the top of every
  module). Client components and the `data.ts` modules they import must never
  import from it.
- Route Handlers under `src/app/api/**` are the only write path and the only
  place a session is read. No Server Actions (they are queued one at a time
  per client, which breaks rapid cart clicks) and no `proxy.ts`.
- No `cookies()` / `headers()` in any layout or page: that would turn the 240
  prerendered routes dynamic. Pages stay static shells; per-user data arrives
  through the session bootstrap (section 5).
- Public content (catalog, materials, blog) is read in server components
  through `unstable_cache(..., { tags, revalidate: 300 })`. `cacheComponents`
  stays off. `revalidateTag(tag, "max")` needs its second argument in this
  Next version.
- Documents never cross to the client. Repos map them to plain DTOs that have
  the same shape as today's UI types (`Product`, `Order`, `Account`, ...), so
  the views do not notice the change.
- Money: numbers in UAH with at most 2 decimals, exactly as the UI types hold
  them. Every server-side sum goes through `round2` (`src/server/money.ts`).
  (Decimal128 / minor units come with the 1C price types.)
- Ids are strings and stay what they are today: `shampoo-1`, `48291064`,
  `9104`, `cp-mirotel`, `demo-b2b`. They are used as `_id`. No ObjectId.

## 4. Data model

Collections (types in `src/server/db/collections.ts`, indexes and validators
in `src/server/db/setup.ts`, both written by the foundation; a package may ADD
optional fields to its own documents, and must then update both files):

| Collection | `_id` | Holds | Package |
|---|---|---|---|
| `users` | account id | login keys, scrypt hash, type b2b/b2c, person, company (B2C), clientId + role (B2B), welcomed, logo | A |
| `sessions` | sha256(token) | userId, expiresAt (TTL) | foundation |
| `password_resets` | sha256(token) | userId, login, expiresAt (TTL), usedAt | A |
| `rate_limits` | key | count, expiresAt (TTL) | foundation |
| `outbox` | id | undelivered messages (reset links, invitations, lead notices) | foundation |
| `clients` | client id | the partner company (holding): name, edrpou, region, city, inviteToken, discountPercent, creditLimits, demoToday | A seeds, F edits |
| `counterparties` | id | clientId, legal entity, embedded contracts[] | F |
| `employees` | id | clientId, employee / invitation rows of the profile page | F |
| `products` | product id | listing fields + `details` (product page content) | B |
| `carts` | userId | lines [{id, qty}] | D |
| `assortments` | userId | lines [{id, qty}] ("My assortment" / favourites) | F |
| `orders` | order number | channel b2b/retail, owner, items (snapshots), documents, payment state, cancel request, checkout values | E |
| `returns` | return id | clientId, orderId, lines, status, withdrawnAt | E |
| `counters` | name | seq (order / return numbers) | E |
| `material_categories`, `material_files` | slug / file id | the materials library | C |
| `blog_posts` | slug | post card fields + body | C |
| `leads` | id | kind, source page, payload, contact | C |

Mapping to the client's spec (tz-1): `clients` = clients, `counterparties` +
embedded `contracts` = counterparties / contracts, `users` = users (roles
`b2b_admin` / `b2b_manager`), `assortments` = user_favorites, `orders` (items
embedded) = orders + order_items, `returns` = returns + return_items. The
ledger, price types, packaging and attribute tables are not built (non-goals).

Seed-owned documents carry `seed: true`. `npm run db:seed` upserts them and
never touches documents without the flag (real sign-ups, real orders).

## 5. Sessions and the client data flow

### 5.1 Server

- Password: scrypt (N=2^15, r=8, p=3, 64-byte key, 16-byte salt), encoded as
  `scrypt$15$8$3$<salt>$<hash>` (base64url). `verifyPassword` is constant
  time; unknown logins burn the same time (`burnPasswordTime`).
- Session: 32 random bytes (base64url) in cookie `binar_session` (httpOnly,
  SameSite=Lax, Secure in production, Path=/, 30 days, sliding). Only its
  SHA-256 is stored. A second cookie `binar_auth=1` (NOT httpOnly, same
  lifetime) is a non-secret hint so client code and the pre-paint gate can
  tell "probably signed in" without a request.
- Every mutating handler calls `assertSameOrigin(request)` (Origin / Host or
  Sec-Fetch-Site check) and reads JSON through `readJson` (content type +
  size cap). Handlers are wrapped in `handler(...)` which turns `HttpError`
  into `{ ok: false, error: <code> }` with the right status and hides
  internals on 500.
- Rate limits (collection `rate_limits`): sign-in 10 / 15 min per login+IP and
  30 / 15 min per IP; sign-up 5 / hour per IP; reset request 5 / hour per IP;
  leads 10 / hour per IP. Disabled in test mode.
- Ownership never comes from the request body: handlers use
  `requireSession()` / `requirePartner()` and scope every query by
  `session.user._id` or `session.clientId`.
- Query values are validated with zod before they reach a filter (no raw
  objects from JSON inside a Mongo query).

### 5.2 Bootstrap

`GET /api/session` returns `SessionBootstrap` (`src/lib/session/types.ts`):

```ts
type SessionBootstrap = { account: Account | null; data: SessionData };
type SessionData = {
  cart?: CartLine[];                 // signed-in accounts
  prices?: Record<string, number>;   // B2B: product id -> the partner's price
  orders?: OrdersPayload;            // B2B: orders, returns, credit limits, today
  profile?: ProfileData;             // B2B
  assortment?: AssortmentLine[];     // B2B
};
```

`POST /api/auth/sign-in` and `/sign-up` answer with the same object, so the UI
switches to the signed-in state with all its data already in place.

`Account` is the existing UI type. The server always sends
`passwordHash: ""` (the field stays only because the type and the gate script
check it is a string).

### 5.3 Client

The stores keep their public API (hooks and functions) and their synchronous
feel. What changes is where the data comes from:

- `src/lib/session/bootstrap.ts`: `applyBootstrap(b)` writes each domain of
  `b.data` into the per-account cache (`src/lib/session/cache.ts`,
  localStorage keys `binar.srv.<domain>.v1:<accountId>`), then commits the
  account into the auth store (`binar.auth.v1` keeps its shape:
  `{ accounts: [account], sessionId }`). Order matters: caches first, account
  last, so the first signed-in render already has data. `refreshSession()`
  fetches `/api/session` and applies it; a signed-out answer clears the local
  session and that account's caches.
- A domain may register its own applier
  (`registerDomainApplier("cart", fn)`) when a plain cache write is not
  enough (the cart merges guest lines).
- Boot (AuthProvider effect): hint cookie present -> `refreshSession()`;
  absent -> drop a stale local session. Refresh again when the tab becomes
  visible after 5 minutes.
- localStorage is a mirror for instant paint. It is never the source of
  truth: every boot revalidates it against the server.
- Mutations stay optimistic: the store applies the change locally (as today),
  then pushes it to the server (`src/lib/session/push.ts`:
  `createPushQueue()` for ordered mutations, `createDebouncedPut()` for
  whole-document saves such as the cart). If the server refuses, the client
  calls `refreshSession()` and the server state wins. No error UI is added.
- Cabinet "today": the server sends `orders.today`. For the demo company it
  is the fixed date the mocks were built around (2026-05-24), so the audited
  screens stay identical; real companies get the current Kyiv date.

## 6. Rules for every builder

1. UI freeze. Do not change JSX structure, class names, copy, or the order of
   elements. You may change imports, where a value comes from, handler
   bodies and effects. If something seems to need a visible change, stop and
   write it in your report instead.
2. Keep each store's exported names and signatures unless your package says
   otherwise. Other files import them.
3. Server code: `import "server-only"` first; no secrets or stack traces in
   responses; validate input with zod; scope by session.
4. Next 16.2.6: `params` and `cookies()` are Promises; handlers are
   `export async function POST(request: Request, ctx: { params: Promise<{...}> })`.
   Do not add `"use server"` files, `proxy.ts`, `middleware.ts` or
   `cacheComponents`.
5. Plain ASCII punctuation in code and comments you write (no em dashes,
   smart quotes, arrows, ellipsis characters). Existing Ukrainian copy and the
   non-ASCII characters already in files stay untouched.
6. The repo mixes LF and CRLF files: keep each file's existing newline style.
7. Stay inside the files your package owns. If you need a change in a file
   owned by another package or by the foundation, describe it in your report;
   do not edit it.
8. Do not run `next build` (one build at a time is run by the orchestrator),
   do not start or stop the dev server, do not commit, do not push.
   `npx tsc --noEmit` and `npx eslint <your files>` are yours to run and must
   be clean for your files.
9. The database is shared by all builders. Seed only your own collections
   (`npm run db:seed -- --only <name>`). Never drop a collection you do not
   own.
10. Old mock datasets move to `src/server/seed/data/` (server-only, read by
   the seed script). The `data.ts` files keep types, constants, copy and pure
   helpers, so the 63 client files that import them keep compiling. A dataset
   must not stay reachable from a client bundle.
11. Business rules that the UI already implements as pure functions
   (stock check, return window, order actions, validators) stay where they
   are and are imported by the server too: one rule, two callers. The server
   result is the one that counts.

## 7. Foundation (written by the orchestrator before the packages start)

Server: `src/server/env.ts`, `db/client.ts`, `db/collections.ts`,
`db/setup.ts`, `auth/password.ts`, `auth/session.ts`, `auth/rate-limit.ts`,
`http.ts`, `ids.ts`, `money.ts`, `time.ts`, `outbox.ts`, `bootstrap.ts`,
`cache-tags.ts`, stubs `repos/*.ts` and `seed/*.ts` with fixed signatures.
Routes: `GET /api/session`, `GET /api/health`, `POST /api/revalidate`,
`POST /api/dev/session` and `POST /api/dev/reset` (test mode only).
Client: `src/lib/api/client.ts`, `src/lib/session/{types,cache,bootstrap,push}.ts`.
Scripts: `scripts/db-setup.ts`, `scripts/db-seed.ts`, `scripts/create-user.ts`
(`npm run db:setup | db:seed | user:create`).

Environment (`.env.local`, never committed): `MONGODB_URI`, `MONGODB_DB`,
`MONGODB_ADMIN_URI` (local maintenance only), `SEED_DEMO_PASSWORD`,
`REVALIDATE_SECRET`, optional `BINAR_TEST_MODE=1`.

Test mode = `NODE_ENV !== "production"` and `BINAR_TEST_MODE=1` and not on
Vercel. It enables the two `/api/dev/*` routes and switches rate limits off.

## 8. Work packages

Each package lists the files it owns. Everything else is read-only for it.

### A. Accounts

Owns: `src/app/api/auth/**`, `src/app/api/account/**`,
`src/server/repos/users.ts`, `src/server/repos/clients.ts`,
`src/server/seed/users.ts`, `src/server/seed/data/accounts.ts`,
`src/components/auth/{api.ts,store.ts,demo.ts,AuthProvider.tsx}`,
`src/components/platform/profile/api.ts`, the gate script string in
`src/components/platform/PlatformChrome.tsx`, `scripts/create-user.ts`.

Endpoints (bodies are JSON; errors are `{ ok: false, error, ... }`):

| Route | Body | Success | Errors |
|---|---|---|---|
| POST /api/auth/sign-in | {login, password} | 200 SessionBootstrap | 400 empty+fields, 401 invalid, 429 rate |
| POST /api/auth/sign-up | SignUpFields | 201 SessionBootstrap | 400 fields+fields, 409 exists, 429 rate |
| POST /api/auth/sign-out | - | 204 | - |
| POST /api/auth/reset/request | {login} | 200 {ok, resendAfter, devToken?} | 400 empty, 429 rate |
| POST /api/auth/reset/confirm | {token, password, repeat} | 200 {ok, login} | 400 fields+fields, 410 token |
| PATCH /api/account | {company?, person?, welcomed?, logo?} | 200 {account} | 400, 401, 409 exists |
| POST /api/account/password | {current, next, repeat} | 200 {ok} | 400 fields+fields, 401, 403 current |

- Login lookup: `users.loginKeys` (unique multikey index) holds every
  normalized identifier of the account: the login, the top-level phone, the
  person's e-mail. Sign-in normalizes the input with `normalizeLogin` (the
  existing helper in `auth/data.ts`, imported by the server too) and looks it
  up there. A profile e-mail edit recomputes `loginKeys`; a duplicate is 409.
- Field validation reuses `validateSignIn / validateSignUp /
  validateSetPassword` from `auth/data.ts` so the messages are identical.
- Sign-up always creates `type: "b2c"`, `welcomed: true`. Partner accounts are
  created by `npm run user:create` (and later by the CRM import): a `clients`
  document + a `users` document with `clientId` and role `b2b_admin`.
- For a B2B account `Account.company` is read from its `clients` document and
  `PATCH /api/account { company }` writes there.
- Reset: the token (32 random bytes) lives 60 minutes, single use, stored as
  SHA-256; confirming it ends every session of that user. An `outbox`
  document is written. Outside production the response carries `devToken`
  and the client keeps it as the pending reset, so `/?reset=demo` (the link
  the audit scripts use) redeems it; in production `/?reset=<token>` needs
  the real token. The answer never reveals whether the login exists.
- Changing or resetting a password re-hashes with the current parameters.
- Client side: `api.ts` keeps every exported signature (signIn, signUp,
  sendResetLink, setPassword, signOut, markWelcomed, saveLogo; `sha256` may
  go when nothing imports it) and calls the endpoints; results go through
  `applyBootstrap`. `store.ts` treats the mirror as signed in only while the
  hint cookie exists. The 450 ms fake latency goes away. `signOut`,
  `markWelcomed`, `saveLogo`, `saveCompany`, `savePerson` stay synchronous
  for the caller: local update first, request after.
- `demo.ts`: the demo password and the shared account records leave the
  bundle. `isDemoAccount` stays exported (id check) until packages E and F
  stop using it.
- Seed: users `demo-b2b` (client `client-demo`, role b2b_admin) and
  `demo-b2c` with the data of today's `DEMO_ACCOUNTS`; password from
  `SEED_DEMO_PASSWORD`. Client `client-demo`: `demoToday: "2026-05-24"`,
  `discountPercent: 8.4`.

### B. Catalog

Owns: `src/server/repos/catalog.ts`, `src/server/seed/catalog.ts`,
`src/server/seed/data/catalog.ts`, `src/components/catalog/{data.ts,registry.ts,CatalogRegistry.tsx,CatalogClient.tsx,CatalogPageView.tsx}`,
`src/components/product/data.ts`, `src/app/layout.tsx`,
`src/app/catalog/**`, `src/app/sitemap.ts`, and the product lookups inside
`src/components/cart/data.ts` and `src/components/platform/assortment/data.ts`
(only the `findProduct` / `ALL_PRODUCTS` call sites; the rest of those files
belongs to D and F), `src/app/ui-gallery/**` where it imports the datasets.

- `products` documents: every field of `Product`, plus `sort` (listing
  order = today's array order; "by popularity" must not reshuffle), `listed`
  (false for the 8 extras that have a page but appear in no listing),
  `directionSlug`, `categorySlug`, `details` (the product page content that
  `getProductDetails` computes today; related products stored as ids).
- Public DTO = `Product` WITHOUT `partnerPrice`. Partner prices travel only
  in `SessionData.prices` for a signed-in partner:
  `partnerPrice ?? round2(list * (1 - client.discountPercent / 100))`.
  `b2bPrices(p).partner` reads that map first (module `registry.ts` or a
  small pricing module of yours fed from the session cache), then
  `p.partnerPrice`, then today's fallback ratio.
- Client lookups stay synchronous: the root layout (server) loads the public
  products once (`unstable_cache`, tag `catalog`) and renders
  `<CatalogRegistry products={...}>` around the providers; it primes a
  module-level registry during render, on the server and at hydration.
  `findProduct(id)` and the listing pool read the registry. Nothing in the
  cart, checkout or assortment may flash or wait.
- Server pages (`/catalog/**`, product page, sitemap, generateStaticParams,
  generateMetadata) await the repo. Canonical-path 404 rules stay as they
  are.
- The dataset code (PRODUCTS generator, extras, details maps) moves to
  `src/server/seed/data/catalog.ts`. `catalog/data.ts` and `product/data.ts`
  keep types, taxonomy, helpers, vocabularies.
- Seed must reproduce today's 140 products byte-for-byte in the DTO
  (ids, order, prices, the three special items, details, SKU strings).

### C. Content and leads

Owns: `src/server/repos/{materials,blog,leads}.ts`,
`src/server/seed/{materials,blog}.ts`, `src/server/seed/data/{materials,blog}.ts`,
`src/app/api/leads/**`, `src/app/api/materials/**`,
`src/components/materials/**`, `src/app/materials/**`,
`src/components/blog/**`, `src/app/blog/**`,
`src/components/home/QuizForm.tsx`, `src/components/hotels/StarRequestStrip.tsx`,
`src/components/spivpratsya/PartnerContactForm.tsx` (submit handlers only).
`src/app/sitemap.ts` belongs to B: tell B's verifier what you export.

- Materials and blog pages read the repos (cached, tags `materials`,
  `blog`) and pass plain props down; the client helpers become pure
  functions over the arrays they are given.
- Download access is enforced on the server:
  `GET /api/materials/files/[id]/download` checks the session against the
  same rule the UI shows today (guest: not `locked`; B2C: everything; B2B:
  not `partnerLocked`) and redirects to the stored location. The DTO does not
  carry the storage path of a file the viewer may not download. The visible
  behaviour of every card stays the same.
- Blog: each post gets its own `body` (seeded with today's shared
  ARTICLE_BODY).
- `POST /api/leads` `{ kind: "quiz" | "star-checklist" | "partner-contact",
  source, payload }`: validated, size-capped, rate-limited, stored with a
  contact summary; writes an `outbox` notice. The three forms call it from
  their existing submit handlers and keep `setSubmitted(true)` exactly as
  now (the success state must not wait for the network).

### D. Cart (wave 3)

Owns: `src/server/repos/carts.ts`, `src/app/api/cart/**`,
`src/components/cart/{store.ts,CartProvider.tsx}` and `cart/data.ts` except
the product lookups.

- Guests: unchanged, lines in `binar-cart-v1`.
- Signed in: the same local key stays the working copy; every change is
  saved with a debounced `PUT /api/cart { lines }` (also flushed on
  pagehide). The server validates ids against `products`, caps quantities
  and line count, stores `carts[userId]`.
- Sign-in / boot: the cart applier merges: local lines win, server-only
  lines are appended, the result is saved back. Sign-out keeps the local
  lines (today's behaviour).
- The stock check stays the shared pure rule (`checkStock`), synchronous in
  the UI; the server repeats it when the order is placed (package E).

### E. Orders, returns, dashboard, checkout placement (wave 3)

Owns: `src/server/repos/{orders,returns}.ts`, `src/server/seed/orders.ts`,
`src/server/seed/data/orders.ts`, `src/app/api/orders/**`,
`src/app/api/returns/**`, `src/components/platform/orders/**`,
`src/components/platform/dashboard/**`, `src/app/orders/**`,
`src/app/dashboard/**`, `src/components/checkout/CheckoutClient.tsx`
(the `place` function only).

- `SessionData.orders = { today, orders, returns, cancelRequests,
  creditLimits }` (type `OrdersPayload`, refine it in
  `src/lib/session/types.ts` if needed and tell the orchestrator).
- The store hooks keep their signatures and read the session cache. The mock
  base + local deltas model goes away: the server returns orders with their
  real state.
- Mutations: `POST /api/orders/[id]/cancel`, `POST /api/returns`,
  `POST /api/returns/[id]/withdraw`; the server re-checks `orderAction`,
  `returnableItems`, the return window against `today`.
  Ids proposed by the client (a new return id) are accepted when free,
  otherwise the server assigns the next one and the client adopts it.
- `/orders/[id]` and `/orders/returns/[id]` stop prerendering mock ids: a
  static shell for any id, the client resolves it from the store (unknown id
  = today's "not found" view).
- Documents: `GET /api/orders/[id]/documents/[docId]` checks ownership, then
  redirects to the stored file (the placeholder PDF for now).
- Dashboard numbers keep their formulas; credit limits come from
  `clients.creditLimits`; `ORDERS_TODAY` becomes the payload's `today`.
- Checkout: `POST /api/orders` `{ values, lines }` (guest allowed):
  validate with the existing `validate`, load products from the database,
  repeat the stock rule, compute the total on the server, take a number from
  `counters`, store the order (`channel: "retail"` for guests and B2C;
  `"b2b"` + clientId for a partner, visible in their cabinet as a new
  order), empty the stored cart. Response `{ ok, number }`; the success view
  shows that number. A refused order (stale price, sold out) opens the
  existing stock flow, no new UI.
- Seed: the 28 orders, 12 returns and their documents for `client-demo`,
  byte-for-byte what the mock generators produce.

### F. Profile and assortment (wave 3)

Owns: `src/server/repos/{profile,assortment}.ts`,
`src/server/seed/{profile,assortment}.ts`, `src/server/seed/data/profile.ts`,
`src/app/api/profile/**`, `src/app/api/assortment/**`,
`src/components/platform/profile/{store.ts,actions.ts}`,
`src/components/platform/assortment/{store.ts,data.ts}` except the product
lookups.

- `SessionData.profile` = `ProfileData`; `SessionData.assortment` = lines.
- The 8 profile actions keep their synchronous signatures and client-made
  ids; each one also posts to its endpoint (create / update / delete
  counterparties, contracts, employees). The server validates, scopes by
  `clientId`, enforces id uniqueness inside the company.
- Invitations: stored rows + an `outbox` document; nothing is sent.
- Assortment: `PUT /api/assortment { lines }`, debounced; selection and the
  "added" marker stay in the browser.
- Seed for `client-demo`: `seedProfile` data and `DEFAULT_LINES`.

### G. Test kit and regression (wave 4)

Owns: `audit/kit/**`, `audit/mobile/kit/**`, `audit/mongo/**`.

- `audit/kit/session.mjs`: `seedContext(context, seed)` keeps writing the old
  localStorage seed (it is still the mirror) and additionally obtains a real
  cookie through `POST /api/dev/session`. `resetDemo()` calls
  `POST /api/dev/reset`.
- `phone.mjs openPhone` and the kit scripts use it; storage assertions
  become API reads.
- The pixel guard (78 shots) is recaptured before the first package starts
  and compared after each wave; the 51 frozen shots must stay identical.

## 9. Verification

Per package: `npx tsc --noEmit`, eslint on the package files, a script under
`audit/mongo/` that exercises every endpoint of the package against the dev
server (happy path, validation errors, auth errors, cross-account access)
and prints PASS / FAIL lines.

Per wave (orchestrator): `next build`, the pixel guard, a sign-in /
catalog / cart / checkout / cabinet walk in a real browser, a security
review of the new server code, a bundle check that no dataset or secret
string is left in `.next/static`.

## 10. Deployment

- Vercel project env (Production and Preview): `MONGODB_URI` (the SRV form,
  user `binar_app`), `MONGODB_DB=binar`, `REVALIDATE_SECRET`.
- Atlas network access must allow Vercel (dynamic IPs: `0.0.0.0/0`), for
  builds as well as runtime, because catalog pages are prerendered from the
  database.
- `vercel.json` pins the functions to `fra1`, next to the cluster.
- A push to `main` deploys; if the build cannot reach the database it fails
  and the previous deployment stays live.
- Before a public launch: change the demo passwords (the old one is in the
  public repository history), connect an e-mail provider for reset links,
  move tests to a separate database.

## 11. As built (2026-11-11)

Packages A to F are built; each was checked by an independent verifier, the
auth code and the cabinet endpoints went through two security audits, and
the findings were fixed. What differs from the plan above:

- Accounts: the dev reset token (`devToken`) is returned only in test mode,
  not in every non-production run. The reset token is stored nowhere in
  clear: the `outbox` notice names the account only, so a mailer has to be
  called from the reset route itself. One live reset link per account; a
  password change kills it. An e-mail change is limited (5 per hour), ends
  the other sessions and queues a notice to the old address. Password change
  is rate limited. Only a `b2b_admin` edits the company card. Logo cap is
  600 000 characters (768 KB body).
- Catalog: the registry reaches server-rendered client components through
  React context and is written to the module only in the browser. On-screen
  partner prices are a subscription (`usePartnerPrices()`); without a price
  map the list price shows, so no discount formula ships in the bundle.
  `details` of a hand-edited product are normalized instead of crashing.
- Content: lead texts longer than their bound are clipped, not refused. The
  download redirect accepts only a same-origin path or an https URL.
- Cart: `PUT /api/cart` takes an optional `base`; the server merges three
  ways (`rebaseCartLines`), so a stale open tab cannot bring back a line
  another device removed. Sign-out waits (1.5 s at most) for a cart save on
  its way.
- Orders: the payload carries `asOf` and mutation answers `at`; the store
  re-applies its own newer changes over an older session answer. A refused
  order answers 409 `stock` or `price` with the current product facts, which
  the page adopts and shows through the existing stock modal / total.
  Return ids always come from the server counter. A partner order's
  counterparty is the company's own entity matched by EDRPOU, else the
  company name. Guest orders: 10 per hour per address, at most 10 000
  units. Return documents have their own download route. The session answer
  carries the newest 500 orders (older history needs a paged endpoint).
- Profile: caps (100 counterparties, 200 employees, 50 contracts each),
  invitation budgets and a 15 minute resend cooldown, 120 profile changes
  per company per hour, profile mutations for `b2b_admin` only. Seeded
  invitations float (`invitedAtFloating`) so the demo always reads 48 h.
- Foundation: outside production Host and Origin must be `localhost` or an
  IP literal (DNS rebinding); `clientIp()` trusts forwarded headers only on
  Vercel; JSON bodies need the exact media type and are read in capped
  chunks; `outbox` rows may expire; `tsconfig.json` excludes `audit/`.
- Tooling: `audit/kit/session.mjs` gives the audit scripts a real session
  (`POST /api/dev/session`) plus the data mirrors; `phone.mjs` uses it.

Verification on the final tree: `tsc` and `eslint` clean; `next build`
passes (219 prerendered pages, 28 API routes); package checks all green
(foundation 17, primitives 17, accounts 166, catalog 84, content 137,
cart 155, orders 163, profile 240) plus the browser walks (auth 33,
catalog 33, orders 44, profile 68); production smoke test on `next start`
29 of 29; the 78-shot pixel guard is identical to the capture taken before
the migration (0 files differ) after wave 2 and after wave 3; the client
bundle holds no connection string, secret, password, partner price or mock
dataset.

Open items (decisions for the owner, not defects):

1. Production needs `MONGODB_URI`, `MONGODB_DB`, `REVALIDATE_SECRET` in
   Vercel and Atlas network access for Vercel before the first push.
2. The demo accounts use a password that is in the public repository
   history: set a new `SEED_DEMO_PASSWORD` and reseed before going public.
3. No mail / SMS provider: reset links and invitations are queued only.
4. Retail accounts can download the materials marked `locked` (today's UI
   rule, kept). Decide whether those are for partners only.
5. Tests share the production database name; give them their own
   (`MONGODB_DB=binar_dev`) once real data exists.
6. Follow-ups noted by the audits: `__Host-` cookie prefix, a confirmation
   step for e-mail changes, per-company order numbers, paging of old
   orders, real file storage (contracts, documents, materials).
