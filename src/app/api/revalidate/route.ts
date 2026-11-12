import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PUBLIC_TAGS } from "@/server/cache-tags";
import { isProduction, revalidateSecret } from "@/server/env";
import { handler, HttpError, json, readJson } from "@/server/http";
import { revalidatePublicData } from "@/server/revalidate";

// POST /api/revalidate - "the database changed, show it now". Catalog,
// materials and blog pages are cached for five minutes; after an edit in
// Atlas (or a reseed) call this instead of waiting.
//
//   curl -X POST https://<site>/api/revalidate -H "x-revalidate-secret: <REVALIDATE_SECRET>"
//
// Optional JSON body: { "tags": ["catalog" | "materials" | "blog"] }.
// In production the secret is mandatory (no secret configured = closed);
// in development the route is open.

const Body = z.object({ tags: z.array(z.enum(["catalog", "materials", "blog"])).min(1).optional() }).strict();

function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const POST = handler(async (request) => {
  const expected = revalidateSecret();
  if (isProduction || expected) {
    if (!expected || !secretMatches(request.headers.get("x-revalidate-secret"), expected)) {
      throw new HttpError(401, "unauthorized");
    }
  }
  let tags = PUBLIC_TAGS;
  if (request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    const parsed = Body.safeParse(await readJson(request, 1024));
    if (!parsed.success) throw new HttpError(400, "bad-request");
    if (parsed.data.tags) tags = parsed.data.tags;
  }
  return json({ ok: true, revalidated: revalidatePublicData(tags) });
});
