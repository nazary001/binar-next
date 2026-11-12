import {
  NP_PLACE_KINDS,
  NP_PLACE_MAX,
  NP_REF,
  npQueryText,
  type NpListAnswer,
  type NpPlaceKind,
  type NpPublicPlace,
} from "@/components/checkout/novaPoshta";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { assertSameOrigin, handler, HttpError, json } from "@/server/http";
import { carrierFailed, checkoutSearchEnabled, publicPlaces } from "@/server/integrations/nova-poshta/public";

// GET /api/np/warehouses?cityRef=<ref>&kind=branch|postomat&q=<text>
//   -> { ok: true, items: [{ ref, name, address?, number? }] }
//
// The branches or the postomats of one city (cityRef = the `ref` of a
// /api/np/cities row), at most 20, in the carrier's number order; `q`
// (optional) narrows them by number or street, and may be the line of a
// picked row as it is shown ("Відділення №12: вул. ..."). Cached for 24
// hours by the directory; no carrier key is involved.
// Refusals: 404 "not-found" while the shop has not switched the search on,
// 403 "origin" for a page of another site, 400 "bad-request" (cityRef not
// a carrier reference, kind missing or unknown, q longer than 120
// characters or with characters no address has, any other parameter),
// 429 "rate" (60 a minute per address), 502 "np-unavailable" when the
// carrier does not answer or the checkout's shared budget of carrier calls
// for this minute is spent (public.ts).

const PARAMS = new Set(["cityRef", "kind", "q"]);

export const GET = handler(async (request) => {
  assertSameOrigin(request);
  if (!(await checkoutSearchEnabled())) throw new HttpError(404, "not-found");

  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  if (keys.some((key) => !PARAMS.has(key)) || new Set(keys).size !== keys.length) {
    throw new HttpError(400, "bad-request");
  }
  const cityRef = params.get("cityRef") ?? "";
  const kind = params.get("kind") ?? "";
  const q = npQueryText(params.get("q"), NP_PLACE_MAX);
  if (!NP_REF.test(cityRef) || !(NP_PLACE_KINDS as readonly string[]).includes(kind) || q === null) {
    throw new HttpError(400, "bad-request");
  }

  const rate = await rateLimit("np-warehouses", clientIp(request), 60, 60);
  if (!rate.ok) throw new HttpError(429, "rate", { retryAfter: rate.retryAfter });

  try {
    const answer: NpListAnswer<NpPublicPlace> = {
      ok: true,
      items: await publicPlaces(cityRef.toLowerCase(), kind as NpPlaceKind, q),
    };
    return json(answer);
  } catch (error) {
    if (carrierFailed(error)) throw new HttpError(502, "np-unavailable");
    throw error;
  }
});
