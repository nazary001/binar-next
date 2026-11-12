// npm run db:setup
//
// Creates the collections, validators and indexes of the `binar` database
// (src/server/db/setup.ts). Safe to run again at any time. Uses the admin
// connection when MONGODB_ADMIN_URI is set: changing a validator needs
// collMod, which the site's runtime user does not have.
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
  console.log(`\nDatabase "${db.databaseName}" is ready (${report.length} collections).`);
}

main()
  .catch((error) => {
    console.error("db:setup failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeClient());
