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
