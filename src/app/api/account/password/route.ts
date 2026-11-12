import { z } from "zod";
import { validatePassword } from "@/components/platform/profile/password";
import { PASSWORD_MAX_LENGTH, verifyPassword } from "@/server/auth/password";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { endUserSessions } from "@/server/auth/session";
import { handler, HttpError, json, parseBody, requireSession } from "@/server/http";
import { setPassword } from "@/server/repos/users";

// POST /api/account/password { current, next, repeat } -> 200 { ok: true }.
// Errors: 400 "fields" + fields (the profile modal's messages), 401 (signed
// out), 403 "current" (the current password is wrong), 429 "rate". A change
// ends every OTHER session of the account (this browser stays signed in)
// and every unused reset link.
//
// Each attempt costs a full scrypt run and a wrong one answers 403, so the
// attempts are limited like sign-in: 5 per 15 minutes per account (a stolen
// session cannot guess the password) and 20 per 15 minutes per address (a
// handful of free accounts cannot keep the hashing threads busy).

const Body = z.object({
  current: z.string().max(PASSWORD_MAX_LENGTH),
  next: z.string().max(PASSWORD_MAX_LENGTH),
  repeat: z.string().max(PASSWORD_MAX_LENGTH),
});

export const POST = handler(async (request) => {
  const session = await requireSession();
  const body = await parseBody(request, Body);
  const fields = validatePassword(body);
  if (Object.values(fields).some(Boolean)) throw new HttpError(400, "fields", { fields });

  for (const limit of [
    await rateLimit("pwchange", session.user._id, 5, 900),
    await rateLimit("pwchange-ip", clientIp(request), 20, 900),
  ]) {
    if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });
  }

  if (!(await verifyPassword(body.current, session.user.passwordHash))) throw new HttpError(403, "current");

  await setPassword(session.user._id, body.next);
  await endUserSessions(session.user._id, session.sessionId);
  return json({ ok: true });
});
