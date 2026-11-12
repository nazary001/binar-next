import { after } from "next/server";
import { z } from "zod";
import { auditAs } from "@/server/admin/audit";
import { endStaffSession, staffMeOf, startStaffSession } from "@/server/admin/auth";
import { requestIp } from "@/server/admin/http";
import {
  findRole,
  findStaffByEmail,
  generatedPasswordExpired,
  normalizeStaffEmail,
  staffSignInBuckets,
  type SignInBucket,
  type StaffPasswordIssue,
} from "@/server/admin/staff";
import { PASSWORD_MAX_LENGTH, burnPasswordTime, hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { clientIp, rateLimit, type RateResult } from "@/server/auth/rate-limit";
import { collection, type StaffDoc } from "@/server/db/collections";
import { HttpError, handler, json, parseBody } from "@/server/http";

// POST /api/admin/auth/sign-in { email, password, remember? }
//
// Signs a member of staff in. One answer for every refusal (unknown e-mail,
// wrong password, blocked account, a generated password older than
// GENERATED_PASSWORD_TTL_HOURS), after the same amount of work: one lookup
// and one scrypt. The journal line of a refusal is written after the
// answer is sent (next/server `after`), so the response time does not tell
// a known e-mail from an unknown one either.
//
// Limits (staffSignInBuckets, 15 minutes): per e-mail from one address,
// per address, per network, and per e-mail from everywhere together, the
// last one counted the same for known and unknown e-mails. Over any of
// them: 429 "rate" { retryAfter }. When the per-account limit trips, the
// account's journal gets one line per window (Вхід до панелі), so an
// attack on an account shows in its sign-in list.

const Body = z
  .object({
    email: z.string().max(320),
    password: z.string().max(PASSWORD_MAX_LENGTH),
    remember: z.boolean().optional(),
  })
  .strict();

type RefusalReason = "password" | "blocked" | "role" | "expired";

function hit(bucket: SignInBucket): Promise<RateResult> {
  return rateLimit(bucket.scope, bucket.key, bucket.limit, bucket.windowSec);
}

// One journal line per window for an account whose limit tripped (a
// second counter with room for one hit is the latch). Unknown e-mails
// write nothing: there is no account to tell.
async function journalAccountLimit(email: string, bucket: SignInBucket, ip: string | null): Promise<void> {
  try {
    const first = await rateLimit("staff-signin-alert", email, 1, bucket.windowSec);
    if (!first.ok) return;
    const staff = await findStaffByEmail(email);
    if (!staff) return;
    await auditAs({ id: staff._id, name: staff.name, kind: "staff" }, ip, {
      action: "staff.sign-in-refused",
      entity: { type: "staff", id: staff._id, label: staff.email },
      summary: `Забагато спроб входу в акаунт ${staff.email} за ${Math.round(bucket.windowSec / 60)} хв: вхід тимчасово призупинено`,
      meta: { reason: "rate", limit: bucket.limit, windowSec: bucket.windowSec },
    });
  } catch (error) {
    console.error("[admin] sign-in: journaling the account limit failed:", (error as Error).name);
  }
}

export const POST = handler(async (request) => {
  const body = await parseBody(request, Body);
  const email = normalizeStaffEmail(body.email);
  if (!email || !body.password) throw new HttpError(400, "empty");

  const ip = clientIp(request);
  const journalIp = requestIp(request);
  const buckets = staffSignInBuckets(ip, email);
  // Every source counter counts every attempt; the account counter only
  // the attempts they let through.
  const source: RateResult[] = [];
  for (const bucket of buckets.source) source.push(await hit(bucket));
  const refused = source.find((limit) => !limit.ok);
  if (refused) throw new HttpError(429, "rate", { retryAfter: refused.retryAfter });
  const account = await hit(buckets.account);
  if (!account.ok) {
    after(() => journalAccountLimit(email, buckets.account, journalIp));
    throw new HttpError(429, "rate", { retryAfter: account.retryAfter });
  }

  const staff: (StaffDoc & StaffPasswordIssue) | null = await findStaffByEmail(email);
  if (!staff) {
    await burnPasswordTime();
    throw new HttpError(401, "invalid");
  }
  const passwordOk = await verifyPassword(body.password, staff.passwordHash);
  const expired = generatedPasswordExpired(staff);
  // The role is read only for the right, still valid password of an
  // active account.
  const role = passwordOk && staff.isActive && !expired ? await findRole(staff.roleId) : null;
  if (!role) {
    const refusal: RefusalReason = !passwordOk ? "password" : !staff.isActive ? "blocked" : expired ? "expired" : "role";
    after(() =>
      auditAs({ id: staff._id, name: staff.name, kind: "staff" }, journalIp, {
        action: "staff.sign-in-refused",
        entity: { type: "staff", id: staff._id, label: staff.email },
        summary:
          refusal === "expired"
            ? `Невдала спроба входу: ${staff.email} (тимчасовий пароль прострочено)`
            : `Невдала спроба входу: ${staff.email}`,
        meta: { reason: refusal },
      }),
    );
    throw new HttpError(401, "invalid");
  }

  const now = new Date();
  await (await collection("staff")).updateOne(
    { _id: staff._id },
    {
      $set: {
        lastLoginAt: now,
        ...(needsRehash(staff.passwordHash) ? { passwordHash: await hashPassword(body.password) } : {}),
      },
    },
  );

  await endStaffSession();
  await startStaffSession(staff._id, body.remember === true, journalIp);
  await auditAs({ id: staff._id, name: staff.name, kind: "staff" }, journalIp, {
    action: "staff.sign-in",
    entity: { type: "staff", id: staff._id, label: staff.email },
    summary: `Вхід до панелі: ${staff.name}`,
  });

  return json({ ok: true, me: staffMeOf(staff, role) });
});
