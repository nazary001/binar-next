import { z } from "zod";
import { hasErrors, normalizeLogin, validateSignIn } from "@/components/auth/data";
import { burnPasswordTime, hashPassword, needsRehash, PASSWORD_MAX_LENGTH, verifyPassword } from "@/server/auth/password";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { companySwitchedOff, endSession, startSession } from "@/server/auth/session";
import { buildBootstrap } from "@/server/bootstrap";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { findUserByLogin, recordSignIn } from "@/server/repos/users";

// POST /api/auth/sign-in { login, password } -> 200 SessionBootstrap.
// Errors: 400 "empty" + fields (the drawer's field messages), 401 "invalid"
// (unknown login, wrong password, a blocked account and a partner whose
// company staff switched off all answer the same, in the same time), 429
// "rate".

const Body = z.object({
  login: z.string().max(320),
  password: z.string().max(PASSWORD_MAX_LENGTH),
});

export const POST = handler(async (request) => {
  const { login, password } = await parseBody(request, Body);
  const fields = validateSignIn({ login, password });
  if (hasErrors(fields)) throw new HttpError(400, "empty", { fields });

  const ip = clientIp(request);
  for (const limit of [
    await rateLimit("signin", `${ip}|${normalizeLogin(login)}`, 10, 900),
    await rateLimit("signin-ip", ip, 30, 900),
  ]) {
    if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });
  }

  const user = await findUserByLogin(login);
  if (!user) {
    await burnPasswordTime();
    throw new HttpError(401, "invalid");
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid || !user.isActive || (await companySwitchedOff(user))) throw new HttpError(401, "invalid");

  await recordSignIn(user._id, needsRehash(user.passwordHash) ? await hashPassword(password) : null);
  // Whatever this browser was signed in as before, that session ends here.
  await endSession();
  await startSession(user._id);
  return json(await buildBootstrap({ user, sessionId: "" }));
});
