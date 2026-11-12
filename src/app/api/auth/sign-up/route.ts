import { z } from "zod";
import { COPY, hasErrors, validateSignUp } from "@/components/auth/data";
import { PASSWORD_MAX_LENGTH } from "@/server/auth/password";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { endSession, startSession } from "@/server/auth/session";
import { buildBootstrap } from "@/server/bootstrap";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { createCustomer } from "@/server/repos/users";

// POST /api/auth/sign-up { firstName, lastName, login, password, repeat }
// -> 201 SessionBootstrap (a retail customer, signed in at once).
// Errors: 400 "fields" + fields (the form's messages), 409 "exists" (the
// e-mail or phone already opens an account), 429 "rate".
//
// The form puts no length limit on its fields, so an over-long name or login
// answers "fields" with that field's own message (no frame has a "too long"
// text) and the drawer marks the field instead of showing its generic
// alert. Only a password over PASSWORD_MAX_LENGTH stays a bare 400: no
// existing message describes it, and the hashing guard refuses it.

const NAME_MAX = 100;
const LOGIN_MAX = 320;
// Anything longer is not a typed value; the body cap (64 KB) bounds it too.
const FIELD_HARD_MAX = 4096;

const Body = z.object({
  firstName: z.string().max(FIELD_HARD_MAX),
  lastName: z.string().max(FIELD_HARD_MAX),
  login: z.string().max(FIELD_HARD_MAX),
  password: z.string().max(PASSWORD_MAX_LENGTH),
  repeat: z.string().max(PASSWORD_MAX_LENGTH),
});

export const POST = handler(async (request) => {
  const input = await parseBody(request, Body);
  const fields = validateSignUp(input);
  if (!fields.firstName && input.firstName.trim().length > NAME_MAX) fields.firstName = COPY.errors.firstName;
  if (!fields.lastName && input.lastName.trim().length > NAME_MAX) fields.lastName = COPY.errors.lastName;
  if (!fields.login && input.login.trim().length > LOGIN_MAX) fields.login = COPY.errors.loginFormat;
  if (hasErrors(fields)) throw new HttpError(400, "fields", { fields });

  const limit = await rateLimit("signup", clientIp(request), 5, 3600);
  if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });

  const user = await createCustomer(input);
  if (user === "exists") throw new HttpError(409, "exists");

  await endSession();
  await startSession(user._id);
  return json(await buildBootstrap({ user, sessionId: "" }), 201);
});
