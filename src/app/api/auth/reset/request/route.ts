import { after } from "next/server";
import { z } from "zod";
import { COPY, RESET_RESEND_SECONDS } from "@/components/auth/data";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import type { UserDoc } from "@/server/db/collections";
import { isTestMode } from "@/server/env";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { newToken } from "@/server/ids";
import { sendNow } from "@/server/mail/deliver";
import { createPasswordReset, findUserByLogin } from "@/server/repos/users";

// POST /api/auth/reset/request { login } -> 200 { ok, resendAfter }.
// Errors: 400 "empty" + message (the drawer's field message), 429 "rate".
//
// The answer never tells whether the login exists: a known, active account
// gets a reset row and the mail with the link, an unknown one gets
// nothing, and both answer the same body. The writes and the mail run
// after the response is sent (next/server `after`), so the response time
// does not tell the two apart either. Besides the 5 per hour per address,
// an account takes at most 3 links an hour: requests from many addresses
// cannot flood one person with messages or keep replacing the link they
// are about to use. Over that limit nothing is stored or sent and the
// answer stays the same.
//
// The link is mailed through sendNow with the token as its secret: the
// token goes into the mail only, never into the database (the outbox keeps
// a copy without it that expires with the link). Without a mail provider
// set up in the panel the copy records that the link was not sent, and the
// storefront still shows "link sent" (it cannot tell either way).
//
// In test mode only (BINAR_TEST_MODE=1 under next dev, never in a
// production build or on Vercel) the token is also returned as `devToken`
// - only for a known login, since that is the token the dev drawer redeems
// through `/?reset=demo`. The reset and the mail are then done before the
// answer, so the audit checks see them at once. A plain `next dev`
// (reachable from the LAN) does not hand out tokens.

const Body = z.object({ login: z.string().max(320) });

type Answer = { ok: true; resendAfter: number; devToken?: string };

// The reset is stored whatever happens to the mail; a failed send is
// recorded on the outbox copy (and in the mail journal) by sendNow.
async function mailResetLink(user: UserDoc, token: string, expiresAt: Date): Promise<void> {
  try {
    await sendNow(
      "password-reset",
      user.person.email || user.phone || user.login,
      { login: user.login, userId: user._id },
      { resetToken: token },
      { expiresAt },
    );
  } catch (error) {
    console.error("[api] reset request: mailing the link failed:", (error as Error).name);
  }
}

export const POST = handler(async (request) => {
  const { login } = await parseBody(request, Body);
  if (!login.trim()) throw new HttpError(400, "empty", { message: COPY.errors.login });

  const limit = await rateLimit("reset", clientIp(request), 5, 3600);
  if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });

  const answer: Answer = { ok: true, resendAfter: RESET_RESEND_SECONDS };
  const user = await findUserByLogin(login);
  if (user && user.isActive) {
    const token = newToken();
    if (isTestMode()) {
      const { expiresAt } = await createPasswordReset(user, token);
      await mailResetLink(user, token, expiresAt);
      answer.devToken = token;
    } else {
      after(async () => {
        try {
          const perAccount = await rateLimit("reset-user", user._id, 3, 3600);
          if (!perAccount.ok) return;
          const { expiresAt } = await createPasswordReset(user, token);
          await mailResetLink(user, token, expiresAt);
        } catch (error) {
          console.error("[api] reset request: storing the reset failed:", (error as Error).name);
        }
      });
    }
  }
  return json(answer);
});
