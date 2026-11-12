import "server-only";
import { createHash } from "node:crypto";
import { hashPassword } from "../auth/password";
import type { ClientDoc, UserDoc } from "../db/collections";
import { loginKeysOf } from "../repos/users";
import {
  DEMO_ACCOUNTS,
  DEMO_COMPANY,
  DEMO_CREATED_AT,
  DEMO_CREDIT_LIMITS,
  DEMO_DISCOUNT_PERCENT,
  DEMO_INVITE_TOKEN,
} from "./data/accounts";
import { DEMO_CLIENT_ID, DEMO_TODAY, replaceSeedDocs, type SeedContext } from "./util";

// Seeds the two demo accounts and the demo company.
//
// A reseed puts them back exactly as shipped: profile edits, a changed
// e-mail, a new logo, a changed or reset password made by a test are all
// undone (the documents are replaced, the password re-hashed from
// SEED_DEMO_PASSWORD). Sessions are left alone, so a signed-in browser
// stays signed in across a reseed.
export async function seedUsers(ctx: SeedContext): Promise<string> {
  const now = new Date();

  const client: ClientDoc = {
    _id: DEMO_CLIENT_ID,
    ...DEMO_COMPANY,
    inviteToken: DEMO_INVITE_TOKEN,
    discountPercent: DEMO_DISCOUNT_PERCENT,
    creditLimits: DEMO_CREDIT_LIMITS.map((row) => ({ ...row })),
    demoToday: DEMO_TODAY,
    createdAt: new Date(DEMO_CREATED_AT),
    updatedAt: now,
    seed: true,
  };

  const users: UserDoc[] = [];
  for (const demo of DEMO_ACCOUNTS) {
    const b2b = demo.type === "b2b";
    users.push({
      _id: demo.id,
      type: demo.type,
      login: demo.login,
      phone: demo.phone,
      loginKeys: loginKeysOf(demo),
      passwordHash: await hashPassword(ctx.demoPassword),
      person: { ...demo.person },
      company: { ...demo.company },
      clientId: b2b ? DEMO_CLIENT_ID : null,
      role: b2b ? "b2b_admin" : null,
      isActive: true,
      welcomed: true,
      logo: null,
      lastLoginAt: null,
      createdAt: new Date(DEMO_CREATED_AT),
      updatedAt: now,
      seed: true,
    });
  }

  const clientsLine = await replaceSeedDocs("clients", [client]);
  let usersLine: string;
  try {
    usersLine = await replaceSeedDocs("users", users);
  } catch (error) {
    // A real account took one of the demo logins (e.g. signed up with
    // partner@example.com while a test had changed the demo e-mail).
    const code = (error as { code?: unknown }).code;
    const nested = (error as { writeErrors?: { code?: unknown }[] }).writeErrors?.some((e) => e.code === 11000);
    if (code === 11000 || nested) {
      throw new Error(
        "a demo login (0500000001 / partner@example.com / 0500000002 / client@example.com) is used by another account; remove or change that account and seed again",
      );
    }
    throw error;
  }
  return `${clientsLine}; ${usersLine}${isPublicDemoPassword(ctx.demoPassword) ? `; ${PUBLIC_PASSWORD_WARNING}` : ""}`;
}

// SHA-256 of the demo password the browser mock shipped with: it is in the
// public git history, so a database seeded with it lets anyone sign in as
// the demo partner and change its password or e-mail for everyone.
const PUBLIC_DEMO_PASSWORD_SHA256 = "01462271d96f9fd08940251dba7c657deee9d3833be6fa40f78f5b44d371e9ef";
const PUBLIC_PASSWORD_WARNING =
  "WARNING: SEED_DEMO_PASSWORD is the password published in the repository history; set a new one (Vercel env and .env.local) and reseed before the site is public";

function isPublicDemoPassword(password: string): boolean {
  return createHash("sha256").update(password).digest("hex") === PUBLIC_DEMO_PASSWORD_SHA256;
}
