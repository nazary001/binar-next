// npm run db:clone-dev                 - live "binar" -> "binar_dev"
// npm run db:clone-dev -- --to <name>  - another target (must end with "_dev")
//
// Copies the live database (MONGODB_DB, default "binar") into a development
// database on the same cluster. Local work - the admin panel, the audit
// scripts - then runs against the copy (.env.development.local points
// `next dev` at it), so nothing typed or tested locally can reach the data
// the public site reads.
//
// Needs MONGODB_ADMIN_URI: the site's runtime user may only touch the live
// database. The target is dropped and rebuilt on every run: collections,
// validators and indexes come from src/server/db/setup.ts, the documents
// are copied as they are. Three collections are deliberately left empty in
// the copy: `sessions` and `password_resets` (credentials of real visitors
// have no business in a dev database) and `rate_limits` (counters).
//
// Prints counts only, never a document.
import { MongoClient, type Document } from "mongodb";
import { ensureSchema } from "@/server/db/setup";

const SKIP = new Set(["sessions", "password_resets", "rate_limits", "staff_sessions"]);
const BATCH = 500;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const uri = process.env.MONGODB_ADMIN_URI;
  if (!uri) throw new Error("MONGODB_ADMIN_URI is not set (the copy needs the admin connection, see .env.example).");

  const sourceName = arg("from") || "binar";
  const targetName = arg("to") || "binar_dev";
  if (!/^[a-z][a-z0-9_]*_dev$/.test(targetName)) {
    throw new Error(`The target database must be named "<something>_dev" (got "${targetName}").`);
  }
  if (targetName === sourceName) throw new Error("Source and target are the same database.");

  const client = new MongoClient(uri, { appName: "binar-clone", serverSelectionTimeoutMS: 8_000 });
  await client.connect();
  try {
    const source = client.db(sourceName);
    const target = client.db(targetName);

    const names = (await source.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((name) => !name.startsWith("system."))
      .sort();
    if (names.length === 0) throw new Error(`The source database "${sourceName}" has no collections.`);

    // A clean slate: everything in the target goes, then the schema of the
    // current code is created (validators + indexes of the known collections).
    for (const { name } of await target.listCollections({}, { nameOnly: true }).toArray()) {
      if (!name.startsWith("system.")) await target.collection(name).drop();
    }
    await ensureSchema(target);

    let total = 0;
    for (const name of names) {
      if (SKIP.has(name)) {
        console.log(`${name.padEnd(24)} skipped (left empty)`);
        continue;
      }
      const from = source.collection<Document>(name);
      const to = target.collection<Document>(name);
      let copied = 0;
      let batch: Document[] = [];
      for await (const doc of from.find({}, { batchSize: BATCH })) {
        batch.push(doc);
        if (batch.length >= BATCH) {
          await to.insertMany(batch, { ordered: false, bypassDocumentValidation: true });
          copied += batch.length;
          batch = [];
        }
      }
      if (batch.length > 0) {
        await to.insertMany(batch, { ordered: false, bypassDocumentValidation: true });
        copied += batch.length;
      }

      // Indexes of a collection the schema file does not know about yet.
      const known = new Set((await to.indexes()).map((index) => index.name));
      for (const index of await from.indexes()) {
        if (!index.name || index.name === "_id_" || known.has(index.name)) continue;
        const { key, v: _v, ns: _ns, background: _background, ...options } = index as Document;
        void _v;
        void _ns;
        void _background;
        await to.createIndex(key, options);
      }

      total += copied;
      console.log(`${name.padEnd(24)} ${String(copied).padStart(6)} document(s)`);
    }
    console.log(`\n"${sourceName}" -> "${targetName}": ${total} document(s) in ${names.length} collection(s).`);
  } finally {
    await client.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error("db:clone-dev failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
