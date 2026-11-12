// npm run db:setup       - the live database (.env.local)
// npm run db:setup:dev   - the development copy (.env.development.local)
//
// Creates the collections, validators and indexes of the database
// (src/server/db/setup.ts) and what the admin panel needs to exist: the
// built-in staff roles and the system buyer groups. Safe to run again at
// any time. Uses the admin connection when MONGODB_ADMIN_URI is set:
// changing a validator needs collMod, which the site's runtime user does
// not have.
import { ensureAdminDefaults } from "@/server/admin/defaults";
import { closeClient, getDb } from "@/server/db/client";
import { ensureSchema } from "@/server/db/setup";

async function main() {
  if (process.env.MONGODB_ADMIN_URI) process.env.MONGODB_URI = process.env.MONGODB_ADMIN_URI;
  const db = await getDb();
  const report = await ensureSchema(db);
  for (const row of report) {
    console.log(
      `${row.collection.padEnd(22)} ${row.created ? "created" : "exists "}  validator: ${row.validator.padEnd(8)} indexes: ${row.indexes}`,
    );
  }
  for (const line of await ensureAdminDefaults()) console.log(line);
  console.log(`\nDatabase "${db.databaseName}" is ready (${report.length} collections).`);
}

main()
  .catch((error) => {
    console.error("db:setup failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeClient());
