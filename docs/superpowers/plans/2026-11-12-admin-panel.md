# Admin panel implementation plan

> For agentic workers: this plan is executed wave by wave by parallel
> subagents (the workflow harness). Each task owns the files listed for it
> and nothing else. Read the spec first.

**Goal:** a complete staff area for the Binar 2000 site: orders, catalog,
customers, content, form submissions, Nova Poshta, the BAS exchange,
settings, staff and roles, a journal of every change.

**Architecture:** pages under `/admin` are server components that guard and
render client screens; data goes through `/api/admin/*` Route Handlers
wrapped by `adminHandler(permission, fn)`; database access lives in
`src/server/admin/repos`; the look comes from one kit under
`src/components/admin/ui` built on `tokens.ts`.

**Tech stack:** Next.js 16.2.6 (App Router, Route Handlers only), React 19.2,
Tailwind v4, TypeScript strict, MongoDB 7 driver, zod 4, @heroicons/react.

**Spec:** `docs/superpowers/specs/2026-11-12-admin-panel-design.md`

## Global constraints

- Section 9 of the spec ("Conventions for builders") binds every task.
- Local work runs on the database `binar_dev`; the live database is never
  written from a developer machine.
- Shared files are edited only by the lead: `src/server/db/collections.ts`,
  `src/server/db/setup.ts`, `src/server/admin/{auth,http,page,audit,list,settings,secrets,staff,defaults}.ts`,
  `src/components/admin/lib/*`, `src/components/admin/ui/tokens.ts`,
  `src/components/admin/shell/*`, `next.config.ts`, `package.json`.
- Public pages stay pixel-identical unless a task names the change.

## Review focus

1. A route that forgets its permission or checks the wrong one: every
   `/api/admin` route answers 401 without a cookie and 403 for a role that
   lacks the permission (checked per task by its script, then by a sweep).
2. A staff edit of a seeded document that a reseed silently reverts: every
   update `$unset`s `seed`.
3. Staff-only fields leaking into a storefront answer: storefront DTOs stay
   field-by-field.
4. A public change that does not show: every write of catalog, blog or
   materials data revalidates its tag.
5. Text from a request reaching a regular expression or a MongoDB operator:
   search goes through `contains()`, ids through `zId`.

## Waves

Wave 0 (lead, done): data model, staff auth and roles, handler and page
guards, journal, settings, secrets, client data layer, shell, login.

Wave 1A, the kit (`src/components/admin/ui/**`):
- K1 primitives and forms; K2 overlays and feedback; K3 data display,
  layout and charts; K4 integrator: media widgets, the gallery page
  `/admin/ui-kit`, consistency pass.

Wave 1B, the API (`src/server/admin/repos/**`, `src/app/api/admin/**`):
- S1 orders and returns; S2 catalog and price types; S3 customers,
  companies and groups; S4 blog and materials; S5 leads, search and journal;
  S6 staff, roles and the own account; S7 overview figures; S8 media and
  settings and system; S9 Nova Poshta; S10 BAS exchange; S11 mail and outbox.

Wave 2, the screens (`src/app/admin/(panel)/**`, `src/components/admin/<section>/**`):
one task per menu section, built on the kit and the API of wave 1.

Wave 3, the storefront hooks: published-only blog reading and the block
renderer, private media in the gated download routes, the order queue for
BAS on checkout, mail on the flows that promise it, Nova Poshta search in
the checkout behind its setting, shop settings read by the cart.

Wave 4, verification: a browser sweep of every screen (screenshots and
console), a permission sweep of every route with a restricted role, type
check, lint, production build, a security review, a code review; fixes;
re-run until clean.
