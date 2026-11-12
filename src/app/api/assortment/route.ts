import { z } from "zod";
import { handler, json, parseBody, requirePartner } from "@/server/http";
import { ASSORTMENT_MAX_LINES, saveAssortment } from "@/server/repos/assortment";
import { zLine } from "@/server/validate";

// PUT /api/assortment { lines: [{ id, qty }] } -> 200 { lines }
// Errors: 400 (not lines, more than 500, a quantity below 1), 401 (signed
// out), 403 (not a partner).
//
// "Мій асортимент" saves the whole list (debounced, after a quantity
// change or a removal). The lines belong to the signed-in user; lines of
// products the catalog does not have are dropped and repeated products
// merged. The answer is what was stored.

const Body = z.object({ lines: z.array(zLine).max(ASSORTMENT_MAX_LINES) }).strict();

export const PUT = handler(async (request) => {
  const session = await requirePartner();
  const { lines } = await parseBody(request, Body);
  return json({ lines: await saveAssortment(session.user._id, lines) });
});
