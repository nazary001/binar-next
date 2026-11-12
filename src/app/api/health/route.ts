import { getDb } from "@/server/db/client";
import { fail, handler, json } from "@/server/http";

// GET /api/health - is the database reachable from this deployment? Used
// after a deploy and by the audit scripts. Answers only up / down and the
// round-trip time; no host names, no error text.
export const GET = handler(async () => {
  const started = performance.now();
  try {
    await (await getDb()).command({ ping: 1 });
  } catch (error) {
    console.error("[api] health: database ping failed:", error);
    return fail(503, "database", { db: "down" });
  }
  return json({ ok: true, db: "up", ms: Math.round(performance.now() - started) });
});
