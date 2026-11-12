// npm run db:seed                     - everything
// npm run db:seed -- --only catalog   - one or more seeders (comma separated)
// npm run db:seed -- --list           - the seeder names
//
// Loads the demo data into the `binar` database (src/server/seed/*): the
// catalog, the materials library, the blog, the two demo accounts and the
// demo company's cabinet data. Idempotent: it upserts the documents it owns
// (flagged `seed: true`) and restores the demo company to a pristine state;
// real accounts and their data are never touched.
//
// After writing it asks a running dev server (SEED_REVALIDATE_URL, default
// http://localhost:3000) to drop its cached catalog / materials / blog, so
// the pages show the new data at once. No server running is fine.
import { closeClient, getDb } from "@/server/db/client";
import { ensureSchema } from "@/server/db/setup";
import { runSeed, SEEDERS } from "@/server/seed";
import { seedContextFromEnv } from "@/server/seed/util";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function revalidateRunningServer() {
  const base = process.env.SEED_REVALIDATE_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: process.env.REVALIDATE_SECRET ? { "x-revalidate-secret": process.env.REVALIDATE_SECRET } : {},
      signal: AbortSignal.timeout(5000),
    });
    console.log(`revalidate ${base}: HTTP ${response.status}`);
  } catch {
    console.log(`revalidate ${base}: no server answered (fine when none is running)`);
  }
}

async function main() {
  if (process.argv.includes("--list")) {
    console.log(SEEDERS.map((s) => s.name).join("\n"));
    return;
  }
  const only = arg("only")
    ?.split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  // Validators first, with the admin connection when there is one; the data
  // itself is written the way the site writes it, as the runtime user.
  const runtimeUri = process.env.MONGODB_URI;
  if (process.env.MONGODB_ADMIN_URI) {
    process.env.MONGODB_URI = process.env.MONGODB_ADMIN_URI;
    await ensureSchema(await getDb());
    await closeClient();
    if (runtimeUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = runtimeUri;
  } else {
    await ensureSchema(await getDb());
  }

  const lines = await runSeed(seedContextFromEnv(), only);
  console.log(`\n${lines.length} seeder(s) done.`);
  await revalidateRunningServer();
}

main()
  .catch((error) => {
    console.error("db:seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeClient());
