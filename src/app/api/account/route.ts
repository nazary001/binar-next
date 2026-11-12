import { z } from "zod";
import { isValidEmail } from "@/components/auth/data";
import { rateLimit } from "@/server/auth/rate-limit";
import { endUserSessions } from "@/server/auth/session";
import { handler, HttpError, json, parseBody, requireSession } from "@/server/http";
import { accountOf, emailChangeOf, mayEditCompany, noteEmailChange, patchAccount } from "@/server/repos/users";
import { zText } from "@/server/validate";

// PATCH /api/account { company?, person?, welcomed?, logo? } -> 200 { account }.
// Errors: 400 (malformed body), 401 (signed out), 403 "forbidden" (a partner
// who is not the company's admin sent `company`), 409 "exists" (the new
// e-mail already opens another account), 429 "rate" (too many e-mail
// changes).
//
// - company: the partner's company card, written to its company document;
//   a retail customer's company is ignored.
// - person: contact data; a changed e-mail becomes a sign-in identifier.
//   Because it is one (and the address reset links go to), a change is
//   limited to 5 an hour per account (the 409 answer must not become an
//   unlimited "is this e-mail registered" probe), ends every other session
//   of the account and queues a notice to the previous address.
// - welcomed: only `true` (the welcome modal was seen).
// - logo: a PNG / JPEG data URL (the 288 px square the page makes), or null
//   to remove it.

// The stored logo is the 288 px square the page makes. A photographic PNG of
// that size can reach about 330 KB (440 000 base64 characters), so the cap
// leaves room above that; the request body cap below covers it.
const LOGO_MAX_CHARS = 600_000;
const LOGO_URL = /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
const EMAIL_MAX = 254;

const Company = z
  .object({ name: zText(200), edrpou: zText(32), region: zText(64), city: zText(100) })
  .partial()
  .strict();

const Person = z
  .object({
    fullName: zText(200),
    role: zText(64),
    position: zText(200),
    phone: zText(32),
    // zod runs a refinement even after .max() failed, so the length is
    // checked here again before the e-mail rule looks at the value.
    email: zText(EMAIL_MAX).refine((value) => value.length <= EMAIL_MAX && (value === "" || isValidEmail(value))),
  })
  .partial()
  .strict();

const Body = z
  .object({
    company: Company.optional(),
    person: Person.optional(),
    welcomed: z.literal(true).optional(),
    logo: z.union([z.null(), z.string().max(LOGO_MAX_CHARS).regex(LOGO_URL)]).optional(),
  })
  .strict();

export const PATCH = handler(async (request) => {
  const session = await requireSession();
  const me = session.user;
  const patch = await parseBody(request, Body, 768 * 1024);
  if (patch.company && me.type === "b2b" && !mayEditCompany(me)) throw new HttpError(403, "forbidden");

  const newEmail = emailChangeOf(me, patch);
  if (newEmail !== null) {
    const limit = await rateLimit("email-change", me._id, 5, 3600);
    if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });
  }

  const user = await patchAccount(me, patch);
  if (user === "exists") throw new HttpError(409, "exists");
  if (newEmail !== null) {
    await endUserSessions(me._id, session.sessionId);
    await noteEmailChange(me, newEmail);
  }
  return json({ account: await accountOf(user) });
});
