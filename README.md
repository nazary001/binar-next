This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database

The site reads and writes MongoDB Atlas (project `Binar`, cluster `binar`,
database `binar`). The design is in
`docs/superpowers/specs/2026-11-11-mongodb-integration-design.md`.

Setup on a new machine:

1. Copy `.env.example` to `.env.local` and fill it in (the connection string
   of the runtime user, the demo password, a revalidate secret). The file is
   gitignored; never commit it.
2. In Atlas, Network Access must list the IP you connect from.
3. `npm run db:setup` creates collections, validators and indexes
   (idempotent).
4. `npm run db:seed` loads the demo data: catalog, materials, blog, the two
   demo accounts and the demo company's cabinet. It only overwrites the
   documents it owns (`seed: true`); real accounts and orders are never
   touched. `npm run db:seed -- --only catalog` runs one seeder,
   `-- --list` prints their names.
5. `npm run dev`.

Accounts:

- Retail customers register on the site (login = e-mail or phone, plus a
  password).
- Partner (B2B) accounts are created by an operator:
  `npm run user:create -- --type b2b --login 0501234567 --name "Surname Name" --company "Company"`
  (prints a generated password once unless `--password` is given).
- Passwords are stored only as scrypt hashes. The session is an httpOnly
  cookie backed by the `sessions` collection.

After editing catalog, materials or blog documents directly in Atlas the
pages refresh within five minutes, or at once with
`curl -X POST <site>/api/revalidate -H "x-revalidate-secret: <REVALIDATE_SECRET>"`.
`GET /api/health` tells whether a deployment can reach the database.

Deployment (Vercel): set `MONGODB_URI` (the `mongodb+srv://` form),
`MONGODB_DB` and `REVALIDATE_SECRET` in the project's environment variables
and allow Vercel in Atlas Network Access before pushing: catalog pages are
prerendered from the database, so the build needs it too. `vercel.json`
pins the functions to `fra1`, next to the cluster.

## Staff area (admin panel)

`/admin` is the panel the company's staff run the site from: orders, returns
and waybills, the catalog (products, categories, price types), companies and
customers, leads, the blog, materials and the media library, integrations
(BAS / 1C, Nova Poshta, mail), settings, staff and roles, the journal of
changes. The design is in
`docs/superpowers/specs/2026-11-12-admin-panel-design.md`.

How it is built:

- It is a document of its own. The app has no layout above its parts:
  `src/app/(site)/layout.tsx` (the public site and the cabinet) and
  `src/app/admin/layout.tsx` are two root layouts, each rendering the bare
  document of `src/app/document.tsx` (`<html>`, `<body>`, fonts, the
  stylesheet). Only the site's layout adds the search metadata, the catalog
  registry, the cart, the account, the header and the footer
  (`src/components/SiteShell.tsx`), so none of it is rendered or sent under
  `/admin`, and going from one to the other is a full page load. An address
  no route owns gets `src/app/global-not-found.tsx` (the site around the
  404 words, built once; `experimental.globalNotFound` in `next.config.ts`).
- Staff accounts are separate from customer accounts (collection `staff`,
  cookie `binar_admin`, roles with permissions). Every route under
  `/api/admin` goes through `adminHandler(permission, ...)` and every page
  checks its permission on the server.
- Every change is written to the journal (`audit_log`): who, when, what.
- Secrets typed into the panel (carrier key, ERP password, mail key) are
  stored sealed with `SECRETS_KEY` (or a key derived from
  `REVALIDATE_SECRET`).
- `/admin` is never indexed (`robots.txt`, `X-Robots-Tag`, `noindex`) and
  answers with a strict Content-Security-Policy that carries a per-request
  nonce (`src/proxy.ts`). The security headers of the whole site are in
  `next.config.ts`.

The first account of a database:

```bash
npm run admin:create -- --email you@example.com --name "Name Surname"
```

It prints a generated password once, and the panel asks to replace it at the
first sign-in (a generated password opens the account for 72 hours).
`--reset` gives an existing account a new generated password, for an owner
who can no longer sign in. The other accounts are created in the panel.

Local development runs on a copy of the database, so nothing typed locally
reaches the live data: `.env.development.local` names the copy (see
`.env.example`). `npm run db:clone-dev` copies the live database into it;
`db:setup:dev`, `db:seed:dev`, `admin:create:dev` and `user:create:dev` work
on the copy.

Integrations:

- BAS / 1C: a machine API under `/api/integrations/bas/v1/*`. The keys are
  issued in the panel (Integrations, BAS), where the last tab is a printable
  guide for the 1C developer. The site can also push each new order to an
  address of BAS.
- Nova Poshta: the API key is typed into the panel. Waybills are created
  from an order; the checkout can search the carrier's cities and branches.
- Mail: Resend or a webhook, set up in the panel. Messages are queued in the
  database and sent right after the request that wrote them. A scheduler may
  call `GET /api/cron/outbox` with `Authorization: Bearer <CRON_SECRET>` so
  that retries do not depend on the panel being open.

After a deploy that adds collections, validators or indexes, run
`npm run db:setup` against the live database.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
