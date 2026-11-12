// The checkout's search in Nova Poshta's real directory (cities, branches,
// postomats): what the public routes /api/np/cities and /api/np/warehouses
// answer, and the input rules both the form and the routes apply. Plain
// module (no React, no server imports), so the route handlers and the
// client fields share one definition.
//
// The search exists only while the shop switches it on in the panel
// (settings novaPoshta.checkoutSearch); until then both routes answer 404
// and the form keeps its fixed lists.

// A settlement the carrier delivers to. `ref` is its city reference (the
// carrier's CityRef, 36 characters), `name` what the customer would type
// ("Київ"), `label` the carrier's full wording ("м. Київ, Київська обл.").
export type NpPublicCity = { ref: string; name: string; area: string; label?: string };

// A branch or a postomat. `name` is the carrier's own line, already in
// the "<kind> №<number>: <address>" shape the fixed lists use
// ("Відділення №12: вул. Родини Бунге, 8").
export type NpPublicPlace = { ref: string; name: string; address?: string; number?: string };

export type NpPlaceKind = "branch" | "postomat";
export const NP_PLACE_KINDS: readonly NpPlaceKind[] = ["branch", "postomat"];

export type NpListAnswer<T> = { ok: true; items: T[] };

// A carrier reference (GUID).
export const NP_REF = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// City names need two characters before the carrier's answer means
// anything; the list stays short enough to read without scrolling much.
export const NP_CITY_MIN = 2;
export const NP_CITY_MAX = 60;
export const NP_CITY_LIMIT = 10;
// A branch query may be the whole line of a picked branch, edited.
export const NP_PLACE_MAX = 120;
export const NP_PLACE_LIMIT = 20;

// Letters of any script, digits, spaces and the punctuation real names and
// addresses carry (apostrophes and quotes of every kind, dashes, "№").
const QUERY_CHARS = /^[\p{L}\p{M}\p{N}\p{Pd}\p{Pi}\p{Pf}\s'".,:;()/№#]*$/u;

// The text of a query as it is sent: trimmed, inner runs of spaces
// collapsed; null when it is longer than `max` or holds anything else
// (markup, control characters).
export function npQueryText(raw: string | null | undefined, max: number): string | null {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  if (text.length > max || !QUERY_CHARS.test(text)) return null;
  return text;
}

// What the carrier can search a branch or a postomat by: its number or a
// street. The customer may type the line as it is shown ("Відділення
// №12: вул. ...", "Поштомат №1001"), which the carrier's FindByString does
// not match, so the part before ":" is kept and the kind words and the
// weight note "(до 30 кг)" dropped ("№12", "№1001").
const KIND_WORDS = /(мобільне|вантажне|поштове|відділення|поштомат|пункт|нова\s+пошта|["«»])/giu;

export function placeSearchText(text: string): string {
  const head = text.includes(":") ? text.slice(0, text.indexOf(":")) : text;
  return head
    .toLowerCase()
    .replace(/\([^)]*\)?/g, " ")
    .replace(KIND_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
}
