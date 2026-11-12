import { cookies } from "next/headers";
import { clearSessionCookies, getSession, HINT_COOKIE, SESSION_COOKIE } from "@/server/auth/session";
import { buildBootstrap } from "@/server/bootstrap";
import { handler, json } from "@/server/http";

// GET /api/session - who is signed in on this browser and what is theirs
// (lib/session/types.ts SessionBootstrap). Signed out is a normal answer
// (`account: null`), not an error; leftover cookies of an expired session
// are removed on the way so the client stops asking.
export const GET = handler(async () => {
  const session = await getSession();
  if (!session) {
    const jar = await cookies();
    if (jar.has(SESSION_COOKIE) || jar.has(HINT_COOKIE)) await clearSessionCookies();
  }
  return json(await buildBootstrap(session));
});
