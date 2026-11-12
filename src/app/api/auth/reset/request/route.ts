import { after } from "next/server";
import { z } from "zod";
import { COPY, RESET_RESEND_SECONDS } from "@/components/auth/data";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { isTestMode } from "@/server/env";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { newToken } from "@/server/ids";
import { createPasswordReset, findUserByLogin } from "@/server/repos/users";

// POST /api/auth/reset/request { login } -> 200 { ok, resendAfter }.
// Errors: 400 "empty" + message (the drawer's field message), 429 "rate".
//
// The answer never tells whether the login exists: a known, active account
// gets a reset row and an outbox notice, an unknown one gets nothing, and
// both answer the same body. The writes run after the response is sent
// (next/server `after`), so the response time does not tell the two apart
// either. Besides the 5 per hour per address, an account takes at most 3
// links an hour: requests from many addresses cannot flood one person with
// messages or keep replacing the link they are about to use. Over that
// limit nothing is stored and the answer stays the same. When a mailer is
// connected it sends the link from `token` inside the same callback; the
// token is never stored in clear.
//
// In test mode only (BINAR_TEST_MODE=1 under next dev, never in a
// production build or on Vercel) the token is also returned as `devToken`
// - only for a known login, since that is the token the dev drawer redeems
// through `/?reset=demo`. A plain `next dev` (reachable from the LAN) does
// not hand out tokens.

const Body = z.object({ login: z.string().max(320) });

type Answer = { ok: true; resendAfter: number; devToken?: string };

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
      await createPasswordReset(user, token);
      answer.devToken = token;
    } else {
      after(async () => {
        try {
          const perAccount = await rateLimit("reset-user", user._id, 3, 3600);
          if (perAccount.ok) await createPasswordReset(user, token);
        } catch (error) {
          console.error("[api] reset request: storing the reset failed:", (error as Error).name);
        }
      });
    }
  }
  return json(answer);
});
