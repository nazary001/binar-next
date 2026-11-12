import "server-only";
import { rateLimit } from "@/server/auth/rate-limit";
import { HttpError, requirePartner, type PartnerContext } from "@/server/http";

// Who may change the profile lists (/api/profile/**). Not a route: Next
// only serves route.ts.
//
// - A signed-in partner (401 / 403 as requirePartner answers).
// - Its company administrator: the profile page is the admin's
//   ("Мій профіль"), and the company card is already limited to b2b_admin
//   (repos/users.ts mayEditCompany); a b2b_manager gets 403 "forbidden".
// - At most PROFILE_WRITES_PER_HOUR changes per company (429 "rate" with
//   retryAfter; off in test mode, like every rate limit). The page sends one
//   request per change, so a person never gets near it.

const PROFILE_WRITES_PER_HOUR = 120;

export async function requireProfileAdmin(): Promise<PartnerContext> {
  const session = await requirePartner();
  if (session.user.role !== "b2b_admin") throw new HttpError(403, "forbidden");
  const limit = await rateLimit("profile", `client:${session.clientId}`, PROFILE_WRITES_PER_HOUR, 3600);
  if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });
  return session;
}

// A refused invitation message of the repository (repos/profile.ts
// inviteBudget) as the route's answer.
export function rateLimited(retryAfter: number): never {
  throw new HttpError(429, "rate", { retryAfter });
}
