import { z } from "zod";
import { auditAs } from "@/server/admin/audit";
import { endStaffSession, staffMeOf, startStaffSession } from "@/server/admin/auth";
import { requestIp } from "@/server/admin/http";
import { findRole, findStaffByEmail, normalizeStaffEmail } from "@/server/admin/staff";
import { PASSWORD_MAX_LENGTH, burnPasswordTime, hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { collection } from "@/server/db/collections";
import { HttpError, handler, json, parseBody } from "@/server/http";

// POST /api/admin/auth/sign-in { email, password, remember? }
//
// Signs a member of staff in. One answer for every refusal (unknown e-mail,
// wrong password, blocked account), after the same amount of work, so the
// route tells nothing about which accounts exist.

const Body = z
  .object({
    email: z.string().max(320),
    password: z.string().max(PASSWORD_MAX_LENGTH),
    remember: z.boolean().optional(),
  })
  .strict();

export const POST = handler(async (request) => {
  const body = await parseBody(request, Body);
  const email = normalizeStaffEmail(body.email);
  if (!email || !body.password) throw new HttpError(400, "empty");

  const ip = clientIp(request);
  for (const limit of [
    await rateLimit("staff-signin", `${ip}|${email}`, 8, 900),
    await rateLimit("staff-signin-ip", ip, 30, 900),
  ]) {
    if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });
  }

  const staff = await findStaffByEmail(email);
  if (!staff) {
    await burnPasswordTime();
    throw new HttpError(401, "invalid");
  }
  const passwordOk = await verifyPassword(body.password, staff.passwordHash);
  const role = passwordOk && staff.isActive ? await findRole(staff.roleId) : null;
  if (!passwordOk || !staff.isActive || !role) {
    await auditAs({ id: staff._id, name: staff.name, kind: "staff" }, requestIp(request), {
      action: "staff.sign-in-refused",
      entity: { type: "staff", id: staff._id, label: staff.email },
      summary: `Невдала спроба входу: ${staff.email}`,
      meta: { reason: !passwordOk ? "password" : !staff.isActive ? "blocked" : "role" },
    });
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
  await startStaffSession(staff._id, body.remember === true, requestIp(request));
  await auditAs({ id: staff._id, name: staff.name, kind: "staff" }, requestIp(request), {
    action: "staff.sign-in",
    entity: { type: "staff", id: staff._id, label: staff.email },
    summary: `Вхід до панелі: ${staff.name}`,
  });

  return json({ ok: true, me: staffMeOf(staff, role) });
});
