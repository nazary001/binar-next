import { endSession } from "@/server/auth/session";
import { handler, noContent } from "@/server/http";

// POST /api/auth/sign-out -> 204. Removes this browser's session row (when
// there is one) and both cookies; signed out already is fine too.
export const POST = handler(async () => {
  await endSession();
  return noContent();
});
