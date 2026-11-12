import "server-only";
import type { ZodType } from "zod";
import { getSession, type SessionContext } from "./auth/session";
import { isProduction } from "./env";

// Shared plumbing of the Route Handlers under src/app/api.
//
//   export const POST = handler(async (request) => {
//     const session = await requireSession();
//     const body = await parseBody(request, Schema);
//     ...
//     return json({ ok: true });
//   });
//
// `handler` gives every route the same behaviour:
// - a non-GET request from another origin is refused (CSRF);
// - a thrown HttpError becomes `{ ok: false, error: <code>, ...extra }` with
//   its status;
// - anything else is logged on the server and answered with a bare 500, so
//   no stack trace, query or document reaches the browser;
// - responses are never cached.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "HttpError";
  }
}

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...NO_STORE, ...headers } });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

export function fail(status: number, code: string, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, error: code, ...extra }, status);
}

// redirect() / notFound() of next/navigation work by throwing; those must
// pass through untouched.
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function handler<C = unknown>(
  fn: (request: Request, context: C) => Promise<Response>,
): (request: Request, context: C) => Promise<Response> {
  return async (request, context) => {
    try {
      if (!SAFE_METHODS.has(request.method)) assertSameOrigin(request);
      return await fn(request, context);
    } catch (error) {
      if (isNextControlFlow(error)) throw error;
      if (error instanceof HttpError) return fail(error.status, error.code, error.extra);
      console.error(`[api] ${request.method} ${new URL(request.url).pathname} failed:`, error);
      return fail(500, "server");
    }
  };
}

// Outside production the server is `next dev` on this machine (also on the
// LAN for phone previews), which answers any Host name. A web page could
// point its own DNS name at 127.0.0.1 (DNS rebinding) and then call the API
// as a same-origin page, reaching the test-mode routes. A browser always
// names the host it believes it talks to in Host and Origin, so outside
// production both must be localhost or an IP address; a rebinding page
// never is.
function isLocalHostName(hostAndPort: string): boolean {
  let name: string;
  try {
    name = new URL(`http://${hostAndPort}`).hostname;
  } catch {
    return false;
  }
  return name === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(name) || name.startsWith("[");
}

function assertLocalDevHost(request: Request, origin: string | null): void {
  const host = request.headers.get("host");
  if (host && !isLocalHostName(host)) throw new HttpError(403, "origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = "";
    }
    if (!originHost || !isLocalHostName(originHost)) throw new HttpError(403, "origin");
  }
}

// CSRF guard for cookie-authenticated mutations. A browser always sends
// Origin on a cross-site POST; when it is present it must match the host the
// request came to. Without Origin, Sec-Fetch-Site decides. A client that
// sends neither is not a browser (curl, the audit scripts) and carries no
// ambient cookies of a victim.
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!isProduction) assertLocalDevHost(request, origin);
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (!host || originHost !== host) throw new HttpError(403, "origin");
    return;
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new HttpError(403, "origin");
}

// The body as UTF-8 text, read chunk by chunk: a body without a
// Content-Length (chunked upload) is cut off as soon as it passes
// `maxBytes` instead of being buffered whole first.
async function readText(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new HttpError(413, "too-large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

// Reads a JSON body: content type checked, size capped (64 KB by default).
// The media type must be exactly application/json (parameters such as
// charset aside): "text/plain; x=application/json" is a type a cross-site
// page may send without a CORS preflight.
export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw new HttpError(415, "content-type");
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, "too-large");
  const text = await readText(request, maxBytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "json");
  }
}

// readJson + a zod schema. A body that does not match is a plain 400: the
// UI validates before sending, so only a broken or hostile client gets here.
export async function parseBody<T>(request: Request, schema: ZodType<T>, maxBytes?: number): Promise<T> {
  const parsed = schema.safeParse(await readJson(request, maxBytes));
  if (!parsed.success) throw new HttpError(400, "bad-request");
  return parsed.data;
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "unauthorized");
  return session;
}

export type PartnerContext = SessionContext & { clientId: string };

// A signed-in B2B partner; `clientId` is the company every cabinet query
// must be scoped by.
export async function requirePartner(): Promise<PartnerContext> {
  const session = await requireSession();
  if (session.user.type !== "b2b" || !session.user.clientId) throw new HttpError(403, "forbidden");
  return { ...session, clientId: session.user.clientId };
}
