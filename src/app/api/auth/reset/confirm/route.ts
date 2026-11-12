import { z } from "zod";
import { hasErrors, validateSetPassword } from "@/components/auth/data";
import { PASSWORD_MAX_LENGTH } from "@/server/auth/password";
import { endUserSessions } from "@/server/auth/session";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { findUser, redeemPasswordReset, setPassword } from "@/server/repos/users";

// POST /api/auth/reset/confirm { token, password, repeat } -> 200 { ok, login }
// (`login` prefills the sign-in form: the e-mail, else the login).
// Errors: 400 "fields" + fields (checked before the token is spent), 410
// "token" (unknown, used or expired link). A redeemed link ends every
// session of the account.

const Body = z.object({
  token: z.string().max(256),
  password: z.string().max(PASSWORD_MAX_LENGTH),
  repeat: z.string().max(PASSWORD_MAX_LENGTH),
});

export const POST = handler(async (request) => {
  const { token, password, repeat } = await parseBody(request, Body);
  const fields = validateSetPassword({ password, repeat });
  if (hasErrors(fields)) throw new HttpError(400, "fields", { fields });
  if (!token) throw new HttpError(410, "token");

  const reset = await redeemPasswordReset(token);
  if (!reset) throw new HttpError(410, "token");
  const user = await findUser(reset.userId);
  if (!user || !user.isActive) throw new HttpError(410, "token");

  await setPassword(user._id, password);
  await endUserSessions(user._id);
  return json({ ok: true, login: user.person.email || user.login });
});
