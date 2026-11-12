import { z } from "zod";
import { startSession } from "@/server/auth/session";
import { buildBootstrap } from "@/server/bootstrap";
import { collection, type UserDoc } from "@/server/db/collections";
import { isTestMode } from "@/server/env";
import { fail, handler, json, parseBody } from "@/server/http";
import { newToken } from "@/server/ids";
import { DEMO_TODAY } from "@/server/seed/util";
import { zId, zText } from "@/server/validate";

// POST /api/dev/session - TEST MODE ONLY (BINAR_TEST_MODE=1, never in a
// production build, never on Vercel; otherwise 404).
//
// The audit scripts used to "sign in" by writing an account into
// localStorage. Now that the server owns the session they post the same
// account object here: the route makes the database agree with it (creates
// the user, or overwrites the profile fields of an existing one), signs it
// in on the caller's cookie jar and answers with the session bootstrap.
// POST /api/dev/reset undoes whatever this changed.

const Body = z
  .object({
    account: z
      .object({
        id: zId,
        type: z.enum(["b2b", "b2c"]).optional(),
        phone: zText(32).optional(),
        login: zText(254).optional(),
        company: z
          .object({ name: zText(200), edrpou: zText(32), region: zText(64), city: zText(100) })
          .partial()
          .optional(),
        person: z
          .object({
            fullName: zText(200),
            role: zText(64),
            position: zText(200),
            phone: zText(32),
            email: zText(254),
          })
          .partial()
          .optional(),
        welcomed: z.boolean().optional(),
        logo: z.string().max(600_000).optional(),
      })
      .passthrough(),
  })
  .passthrough();

const EMPTY_COMPANY = { name: "", edrpou: "", region: "", city: "" };
const EMPTY_PERSON = { fullName: "", role: "", position: "", phone: "", email: "" };

export const POST = handler(async (request) => {
  if (!isTestMode()) return fail(404, "not-found");
  const { account } = await parseBody(request, Body, 768 * 1024);

  const users = await collection("users");
  const clients = await collection("clients");
  const now = new Date();
  const existing = await users.findOne({ _id: account.id });
  // Only test accounts and the seeded demo accounts (which db:seed and
  // POST /api/dev/reset put back) may be signed in or rewritten here; a
  // real account (a sign-up, npm run user:create) is never touched, even in
  // test mode.
  if (existing && !existing.test && !existing.seed) return fail(409, "not-a-test-account");
  const type = account.type ?? existing?.type ?? "b2b";
  const company = { ...EMPTY_COMPANY, ...existing?.company, ...account.company };
  const person = { ...EMPTY_PERSON, ...existing?.person, ...account.person };

  // A partner needs a company document; a test account gets its own.
  let clientId = existing?.clientId ?? null;
  if (type === "b2b") {
    // A company that is neither test nor seed data is never reused or
    // rewritten from here (an id that happens to name a real one is
    // refused).
    clientId ??= `client-${account.id}`;
    const client = await clients.findOne({ _id: clientId });
    if (client && !client.test && !client.seed) return fail(409, "real-company");
    if (!client) {
      await clients.insertOne({
        _id: clientId,
        ...company,
        inviteToken: newToken(6),
        discountPercent: 8.4,
        creditLimits: [],
        demoToday: DEMO_TODAY,
        test: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (account.company) {
      await clients.updateOne({ _id: clientId }, { $set: { ...company, updatedAt: now } });
    }
  }

  if (existing) {
    // Login keys are left alone: a seed may reuse another account's phone
    // or e-mail, and those must stay unique.
    await users.updateOne(
      { _id: account.id },
      {
        $set: {
          type,
          company,
          person,
          clientId: type === "b2b" ? clientId : null,
          role: type === "b2b" ? (existing.role ?? "b2b_admin") : null,
          welcomed: account.welcomed ?? existing.welcomed,
          logo: account.logo ?? existing.logo,
          isActive: true,
          updatedAt: now,
        },
      },
    );
  } else {
    const doc: UserDoc = {
      _id: account.id,
      type,
      login: account.login || `dev:${account.id}`,
      phone: account.phone ?? "",
      // No real identifier: a test account cannot be opened with a password.
      loginKeys: [`dev:${account.id}`],
      passwordHash: "",
      person,
      company,
      clientId: type === "b2b" ? clientId : null,
      role: type === "b2b" ? "b2b_admin" : null,
      isActive: true,
      welcomed: account.welcomed ?? true,
      logo: account.logo ?? null,
      lastLoginAt: null,
      test: true,
      createdAt: now,
      updatedAt: now,
    };
    await users.insertOne(doc);
  }

  // Every sign-in through this route starts without a saved cart, as the
  // browser-only accounts did: an audit shot seeds the browser's cart
  // (binar-cart-v1) itself, and the first session answer merges that seed
  // in and saves it (cart store, rule a), so a cart saved by an earlier shot
  // of the same account would otherwise show up in every later one. A real
  // sign-in (POST /api/auth/sign-in) keeps the saved cart.
  await (await collection("carts")).deleteOne({ _id: account.id });
  await startSession(account.id);
  const user = await users.findOne({ _id: account.id });
  if (!user) return fail(500, "server");
  return json(await buildBootstrap({ user, sessionId: "dev" }));
});
