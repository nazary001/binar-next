import { NP_CITY_MAX, NP_CITY_MIN, npQueryText, type NpListAnswer, type NpPublicCity } from "@/components/checkout/novaPoshta";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { assertSameOrigin, handler, HttpError, json } from "@/server/http";
import { carrierFailed, checkoutSearchEnabled, publicCities } from "@/server/integrations/nova-poshta/public";

// GET /api/np/cities?q=<text> -> { ok: true, items: [{ ref, name, area, label? }] }
//
// The checkout's city search in Nova Poshta's directory (at most 10 rows,
// cached for 24 hours by the directory; no carrier key is involved).
// Refusals: 404 "not-found" while the shop has not switched the search on
// (settings novaPoshta.checkoutSearch), 403 "origin" for a page of another
// site, 400 "bad-request" (q shorter than 2 or longer than 60 characters,
// characters no place name has, any other parameter), 429 "rate" (60 a
// minute per address), 502 "np-unavailable" when the carrier does not
// answer or the checkout's shared budget of carrier calls for this minute
// is spent (public.ts): the form then lets the customer type the city by
// hand.

const PARAMS = new Set(["q"]);

export const GET = handler(async (request) => {
  // Only the shop's own pages may use the search (a GET passes handler()
  // without the origin check, and this one spends the carrier's time).
  assertSameOrigin(request);
  if (!(await checkoutSearchEnabled())) throw new HttpError(404, "not-found");

  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => !PARAMS.has(key)) || params.getAll("q").length !== 1) {
    throw new HttpError(400, "bad-request");
  }
  const q = npQueryText(params.get("q"), NP_CITY_MAX);
  if (q === null || q.length < NP_CITY_MIN) throw new HttpError(400, "bad-request");

  const rate = await rateLimit("np-cities", clientIp(request), 60, 60);
  if (!rate.ok) throw new HttpError(429, "rate", { retryAfter: rate.retryAfter });

  try {
    const answer: NpListAnswer<NpPublicCity> = { ok: true, items: await publicCities(q) };
    return json(answer);
  } catch (error) {
    if (carrierFailed(error)) throw new HttpError(502, "np-unavailable");
    throw error;
  }
});
