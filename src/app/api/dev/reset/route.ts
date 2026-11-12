import { z } from "zod";
import { collection } from "@/server/db/collections";
import { isTestMode } from "@/server/env";
import { fail, handler, HttpError, json, readJson } from "@/server/http";
import { revalidatePublicData } from "@/server/revalidate";
import { runSeed, SEEDERS } from "@/server/seed";
import { seedContextFromEnv } from "@/server/seed/util";

// POST /api/dev/reset - TEST MODE ONLY (otherwise 404).
//
// Puts the demo data back: removes the accounts and companies that
// POST /api/dev/session created (with their sessions, carts, assortments,
// orders, returns and profile rows), empties the demo accounts' saved
// carts (also with only: ["users"]), then runs the seeders. The audit
// scripts call it before a run that mutates data and before every pixel
// capture. Optional JSON body: { "only": ["orders", "profile", ...] }.

const Body = z.object({ only: z.array(z.string().max(32)).max(20).optional() }).strict();

export const POST = handler(async (request) => {
  if (!isTestMode()) return fail(404, "not-found");

  let only: string[] | undefined;
  if (request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    const parsed = Body.safeParse(await readJson(request, 1024));
    if (!parsed.success) throw new HttpError(400, "bad-request");
    only = parsed.data.only;
    const unknown = (only ?? []).filter((name) => !SEEDERS.some((s) => s.name === name));
    if (unknown.length) throw new HttpError(400, "bad-request", { unknown });
  }

  const report: string[] = [];
  if (!only) {
    const users = await collection("users");
    const clients = await collection("clients");
    const testUsers = (await users.find({ test: true }, { projection: { _id: 1 } }).toArray()).map((u) => u._id);
    const testClients = (await clients.find({ test: true }, { projection: { _id: 1 } }).toArray()).map((c) => c._id);
    if (testUsers.length) {
      await (await collection("sessions")).deleteMany({ userId: { $in: testUsers } });
      await (await collection("carts")).deleteMany({ _id: { $in: testUsers } });
      await (await collection("assortments")).deleteMany({ _id: { $in: testUsers } });
      await (await collection("orders")).deleteMany({ userId: { $in: testUsers } });
      await users.deleteMany({ _id: { $in: testUsers } });
    }
    if (testClients.length) {
      await (await collection("orders")).deleteMany({ clientId: { $in: testClients } });
      await (await collection("returns")).deleteMany({ clientId: { $in: testClients } });
      await (await collection("counterparties")).deleteMany({ clientId: { $in: testClients } });
      await (await collection("employees")).deleteMany({ clientId: { $in: testClients } });
      await clients.deleteMany({ _id: { $in: testClients } });
    }
    report.push(`test accounts removed: ${testUsers.length} users, ${testClients.length} companies`);
  }

  // The demo accounts have no saved cart in the seed: whenever the users
  // seeder runs (a full reset, only: ["users"]) the carts they saved since
  // are emptied (dev/session and real sign-ins of the demo accounts save the
  // browser's cart).
  if (!only?.length || only.includes("users")) {
    const seedUsers = (
      await (await collection("users")).find({ seed: true }, { projection: { _id: 1 } }).toArray()
    ).map((u) => u._id);
    const emptied = seedUsers.length
      ? (await (await collection("carts")).deleteMany({ _id: { $in: seedUsers } })).deletedCount
      : 0;
    report.push(`demo carts emptied: ${emptied}`);
  }

  report.push(...(await runSeed(seedContextFromEnv(() => {}), only)));
  revalidatePublicData();
  return json({ ok: true, report });
});
