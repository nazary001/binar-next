// The server sets a readable cookie `binar_auth=1` next to the httpOnly
// session cookie (src/server/auth/session.ts). It carries no secret; it only
// says "this browser probably has a session", so signed-out visitors never
// cause a session request and a stale local mirror is recognised without
// one. (No imports here: the auth store reads this too.)
export const SESSION_HINT_COOKIE = "binar_auth";

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)binar_auth=1(?:;|$)/.test(document.cookie);
}
