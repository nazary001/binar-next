import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { isProduction, isVercel } from "../env";

// The calls the site makes to an address staff typed in the panel: the
// push address of the BAS exchange (bas/push.ts) and the mail webhook
// (mail/provider.ts). One rule for both, at two moments:
//
//   const problem = outboundUrlProblem(value);     // on save and before every call
//   const answer = await outboundPost({ url, headers, body, timeoutMs: 10_000 });
//
// 1. The text of the address: https only; no login or password inside it;
//    no literal address of a private, loopback, link-local, CGNAT or
//    multicast network (IPv4, IPv6 and IPv4 dressed as IPv6), no *.localhost.
//    Plain http and the two test hosts (localhost, 127.0.0.1) exist for a
//    receiver under test on the developer's machine only: a production
//    build or Vercel refuses them like any other loopback address (there
//    the function's own loopback carries the platform's runtime).
// 2. Where the name really leads: the connection resolves the name through
//    a lookup hook that refuses it when any address it resolves to is one
//    of those networks, and connects to exactly the checked address (no
//    second lookup can answer differently). So a public name that points
//    at 169.254.169.254 or 10.x leads nowhere.
// 3. The call itself: POST, no redirect followed (a 3xx is answered as it
//    is), one timeout for the whole call including the answer, and at most
//    MAX_ANSWER_BYTES of the answer read (the rest is dropped and the
//    connection closed).
// Nothing here logs a header or a body. No next/* import: the tsx checks
// and the scripts run it under plain Node.

export type OutboundUrlProblem = "format" | "scheme" | "credentials" | "private" | "https";

// The developer's machine: the test receivers of the checks listen here.
const TEST_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);
export const testHostsAllowed = !isProduction && !isVercel;

// How much of an answer is ever read.
export const MAX_ANSWER_BYTES = 64 * 1024;

// --- addresses ------------------------------------------------------------------

// A dotted IPv4 address of a network the site must never call: this host,
// private networks, CGNAT, link-local (the cloud metadata service),
// benchmarking, IETF protocol assignments, multicast and reserved.
function privateIpv4(ip: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!match) return false;
  const [a, b, c, d] = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  if (a > 255 || b > 255 || c > 255 || d > 255) return true;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

// The eight 16-bit groups of an IPv6 address ("::ffff:10.0.0.1" too), or
// null when it is not one.
function ipv6Groups(ip: string): number[] | null {
  let text = ip.toLowerCase();
  const zone = text.indexOf("%");
  if (zone >= 0) text = text.slice(0, zone);
  const tail = /^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (tail) {
    const bytes = tail.slice(2, 6).map(Number);
    if (bytes.some((byte) => byte > 255)) return null;
    text = `${tail[1]}${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...new Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => Number.parseInt(group, 16));
}

const v4Of = (high: number, low: number): string => `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;

// An IPv6 address the site must never call: unspecified, loopback and
// every IPv4 address dressed as IPv6 (::/80), NAT64, the discard prefix,
// unique-local, link-local, site-local, multicast, and 6to4 of a private
// IPv4 address. Anything that does not parse is refused too.
function privateIpv6(ip: string): boolean {
  const g = ipv6Groups(ip);
  if (!g) return true;
  if (g.slice(0, 5).every((group) => group === 0)) return true;
  if (g[0] === 0x64 && g[1] === 0xff9b) return true;
  if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true;
  if ((g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0 || (g[0] & 0xff00) === 0xff00) {
    return true;
  }
  if (g[0] === 0x2002) return privateIpv4(v4Of(g[1], g[2]));
  return false;
}

// A resolved address (no brackets): IPv4 or IPv6.
export function isPrivateAddress(ip: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return privateIpv4(ip);
  return ip.includes(":") ? privateIpv6(ip) : true;
}

// The host part of a parsed URL (the parser has already turned 0x7f.1,
// 2130706433 and the like into the dotted form; IPv6 comes bracketed).
function privateHost(host: string): boolean {
  if (host.startsWith("[") && host.endsWith("]")) return privateIpv6(host.slice(1, -1));
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return privateIpv4(host);
  return host === "localhost" || host === "localhost." || /\.localhost\.?$/.test(host);
}

// Why an address cannot be called, or null when it can.
export function outboundUrlProblem(value: string): OutboundUrlProblem | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "format";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "scheme";
  if (url.username || url.password) return "credentials";
  const host = url.hostname;
  if (TEST_HOSTS.has(host)) return testHostsAllowed ? null : "private";
  if (privateHost(host)) return "private";
  if (url.protocol === "http:") return "https";
  return null;
}

// --- the call ---------------------------------------------------------------------

export type OutboundFailure = "address" | "private" | "timeout" | "network";

// address: the address breaks the rules above; private: the name resolves
// to a private address; timeout: no full answer in time; network: no
// connection or it broke. A timeout is named "TimeoutError" like the one
// of fetch.
export class OutboundError extends Error {
  readonly reason: OutboundFailure;
  constructor(reason: OutboundFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = reason === "timeout" ? "TimeoutError" : "OutboundError";
  }
}

export type OutboundRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
  // At most this much of the answer is read (MAX_ANSWER_BYTES by default).
  maxBytes?: number;
};

export type OutboundResponse = { status: number; text: string; truncated: boolean };

// Resolves like dns.lookup, but refuses a name that leads to a private
// address; the connection then uses exactly what was checked.
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) {
      callback(error, "", 0);
      return;
    }
    if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
      const refused = Object.assign(new Error(`${hostname} resolves to a private address`), { code: "EPRIVATE" });
      callback(refused, "", 0);
      return;
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
};

export function outboundPost(request: OutboundRequest): Promise<OutboundResponse> {
  return new Promise<OutboundResponse>((resolve, reject) => {
    const problem = outboundUrlProblem(request.url);
    if (problem) {
      reject(new OutboundError(problem === "private" ? "private" : "address", `the address is refused: ${problem}`));
      return;
    }
    const url = new URL(request.url);
    const cap = Math.max(0, request.maxBytes ?? MAX_ANSWER_BYTES);
    const testHost = TEST_HOSTS.has(url.hostname);
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const client = url.protocol === "https:" ? httpsRequest : httpRequest;
    const call = client(
      {
        method: "POST",
        protocol: url.protocol,
        hostname: url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        headers: { ...request.headers, "Content-Length": String(Buffer.byteLength(request.body)) },
        // A connection of its own: never a pooled socket opened for
        // another name.
        agent: false,
        // The test hosts (development only) resolve to this machine.
        ...(testHost ? {} : { lookup: guardedLookup }),
      },
      (response: IncomingMessage) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const done = (truncated: boolean) =>
          finish(() =>
            resolve({ status: response.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8"), truncated }),
          );
        response.on("data", (chunk: Buffer) => {
          if (settled) return;
          const room = cap - size;
          if (chunk.length > room) {
            chunks.push(chunk.subarray(0, room));
            size = cap;
            done(true);
            // The rest is dropped, the connection closed.
            response.destroy();
            call.destroy();
            return;
          }
          chunks.push(chunk);
          size += chunk.length;
        });
        response.on("end", () => done(false));
        response.on("error", () => finish(() => reject(new OutboundError("network", "the answer broke off"))));
        response.on("aborted", () => finish(() => reject(new OutboundError("network", "the answer broke off"))));
      },
    );

    const timer = setTimeout(() => {
      finish(() => reject(new OutboundError("timeout", `no answer in ${request.timeoutMs} ms`)));
      call.destroy();
    }, request.timeoutMs);

    call.on("error", (error: NodeJS.ErrnoException) => {
      finish(() =>
        reject(
          error.code === "EPRIVATE"
            ? new OutboundError("private", "the name resolves to a private address")
            : new OutboundError("network", error.code ? `connection failed: ${error.code}` : "connection failed"),
        ),
      );
    });
    call.end(request.body);
  });
}
