import "server-only";
import { collection } from "../db/collections";
import { isTestMode, isVercel } from "../env";

// Fixed-window counters in the `rate_limits` collection (a TTL index removes
// finished windows). One atomic update per hit, so parallel requests cannot
// slip past the limit together.

export type RateResult = { ok: boolean; retryAfter: number };

export async function rateLimit(scope: string, key: string, limit: number, windowSec: number): Promise<RateResult> {
  // The audit scripts sign in dozens of times a minute.
  if (isTestMode()) return { ok: true, retryAfter: 0 };

  const now = new Date();
  const fresh = new Date(now.getTime() + windowSec * 1000);
  const limits = await collection("rateLimits");
  const doc = await limits.findOneAndUpdate(
    { _id: `${scope}:${key}`.slice(0, 200) },
    [
      {
        $set: {
          // A missing or finished window starts over at 1.
          count: { $cond: [{ $gt: ["$expiresAt", now] }, { $add: ["$count", 1] }, 1] },
          expiresAt: { $cond: [{ $gt: ["$expiresAt", now] }, "$expiresAt", fresh] },
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );
  if (!doc || doc.count <= limit) return { ok: true, retryAfter: 0 };
  return { ok: false, retryAfter: Math.max(1, Math.ceil((doc.expiresAt.getTime() - now.getTime()) / 1000)) };
}

// The caller's address as the platform reports it, as a rate-limit key.
//
// Only on Vercel do x-forwarded-for / x-real-ip come from the platform (its
// edge overwrites whatever the client sent). Anywhere else (next dev, next
// start without a proxy) both are whatever the client typed - Next only
// fills x-forwarded-for in when it is missing - and trusting them would
// hand every request a fresh bucket. Off Vercel every caller therefore
// shares one key, "local": the limits hold, at the price of counting
// everyone together. `trustForwarded` exists for tests that stand in for
// Vercel.
//
// IPv6 addresses count per /64, the block one subscriber usually gets, so
// stepping through addresses inside it does not reset the limits.
export function clientIp(request: Request, trustForwarded: boolean = isVercel): string {
  if (!trustForwarded) return "local";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "";
  if (!ip) return "local";
  return ip.includes(":") ? ipv6Block(ip) : ip;
}

// "2001:db8:1:2:3:4:5:6" -> "2001:db8:1:2::/64"; an IPv4-mapped address
// ("::ffff:203.0.113.7") -> the IPv4 address. Anything unparsable stays as
// it is (bounded by the key length of rateLimit).
export function ipv6Block(raw: string): string {
  const ip = raw.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  const mapped = /^(?:0{0,4}:){0,5}:?ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (mapped) return mapped[1];
  const halves = ip.split("::");
  if (halves.length > 2) return ip;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return ip;
  const groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return ip;
  return `${groups
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(":")}::/64`;
}
