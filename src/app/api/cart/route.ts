import { z } from "zod";
import { handler, json, parseBody, requireSession } from "@/server/http";
import { saveCartLines } from "@/server/repos/carts";
import { zLine } from "@/server/validate";

// PUT /api/cart { lines: [{ id, qty }], base?: [{ id, qty }] } -> 200 { lines }
// (what was stored). Errors: 400 (malformed body: not an array of lines, an
// id that is not a plain business id, a quantity that is not a whole number
// from 1 to 100 000, more than 500 lines in either array), 401 (signed out),
// 403 (another origin), 413 (body over 64 KB), 415 (not application/json).
//
// The signed-in account's whole cart, as the browser holds it (the cart
// store saves it debounced after every change). The account comes from the
// session only. `base` is the saved cart the browser last knew: with it the
// browser's changes are applied on top of the cart as it is stored now, so
// a device that missed another device's change does not undo it; without it
// the lines replace the stored cart. The stored cart keeps lines of
// existing products only, merges repeated ids and caps quantities and the
// line count (server/repos/carts.ts). There is no GET: the session
// bootstrap carries the saved cart.

const Lines = z.array(zLine).max(500);
const Body = z.object({ lines: Lines, base: Lines.optional() }).strict();

export const PUT = handler(async (request) => {
  const session = await requireSession();
  const { lines, base } = await parseBody(request, Body, 64 * 1024);
  return json({ lines: await saveCartLines(session.user._id, lines, base) });
});
