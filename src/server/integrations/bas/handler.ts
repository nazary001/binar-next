import "server-only";
import type { ZodType } from "zod";
import {
  BAS_LIMITS,
  type ApiKeyScope,
  type BasAcceptFlag,
  type BasEntity,
  type ExchangeAction,
  type ExchangeCounts,
  type ExchangeDirection,
  type ExchangeStatus,
} from "@/components/admin/integrations/types";
import { getSettings, type SettingsOf } from "../../admin/settings";
import { clientIp, rateLimit } from "../../auth/rate-limit";
import type { Actor, ApiKeyDoc } from "../../db/collections";
import { HttpError, handler, readJson } from "../../http";
import { apiKeyState, findApiKeyByToken, touchApiKey } from "../keys";
import { issueList } from "./contract";
import { EMPTY_COUNTS, writeExchangeLog } from "./log";

// The plumbing of every route under /api/integrations/bas/v1:
//
//   export const PUT = basHandler("bas:write", "products", async (call) => {
//     const body = await call.body(BatchEnvelope);
//     ...
//     call.note({ batchId, counts, details });
//     return json(answer);
//   });
//
// On top of handler() (error mapping, no-store; a request without an
// Origin header passes its same-origin guard, which is what a scheduled
// job of the accounting base sends) it does, in this order:
// - 401 "unauthorized" without a usable key: none, unknown, revoked or
//   expired (`reason` says which). The key is looked up by its hash.
//   There are no cookies here: staff sessions mean nothing to this API.
// - 403 "forbidden" when the key lacks the scope (`scope` names it);
// - 429 "rate" above BAS_LIMITS.callsPerMinute calls of one key a minute;
// - 403 "disabled" when the exchange is switched off, or the setting that
//   lets BAS overwrite this kind of data is (`setting` names it); ping
//   answers anyway, so BAS can check its key while the exchange is off;
// - a body helper with the 415 / 413 / 400 rules of the API (4 MB cap; a
//   UTF-8 BOM in front of the JSON is dropped by the decoder);
// and writes one exchange_log row per call: the key as the actor, how long
// it took, what the route reported through call.note().

export type BasSettings = SettingsOf<"bas">;

export type CallNote = {
  action?: ExchangeAction;
  batchId?: string | null;
  counts?: Partial<ExchangeCounts>;
  details?: { id: string; error: string }[];
  status?: ExchangeStatus;
};

export type BasCall<C = unknown> = {
  request: Request;
  context: C;
  url: URL;
  key: ApiKeyDoc;
  // How history entries and journal rows name this caller.
  actor: Actor;
  settings: BasSettings;
  // Reads and parses the JSON body.
  body<T>(schema: ZodType<T>, maxBytes?: number): Promise<T>;
  // What the journal row of this call says.
  note(info: CallNote): void;
};

// The setting that lets BAS overwrite each kind of data.
const ACCEPT_FLAG: Record<BasEntity, BasAcceptFlag | null> = {
  ping: null,
  "price-types": "acceptPrices",
  products: "acceptProducts",
  prices: "acceptPrices",
  stock: "acceptStock",
  clients: "acceptClients",
  ledger: "acceptLedger",
  "order-statuses": "acceptOrderStatuses",
  documents: "acceptDocuments",
  orders: null,
  returns: null,
};

export function acceptFlagOf(entity: BasEntity): BasAcceptFlag | null {
  return ACCEPT_FLAG[entity];
}

export function integrationActor(key: Pick<ApiKeyDoc, "_id" | "name">): Actor {
  return { id: key._id, name: `BAS: ${key.name}`.slice(0, 120), kind: "integration" };
}

// Unknown callers (no key, a wrong key) are counted per address: past the
// limit they are refused. Only a few of their calls an hour are journaled
// per address: enough to see a mistyped key while the accounting system
// is being connected, far too few for a stranger on the internet to fill
// the database with rows (this API is public: anyone can call it without
// a key).
const ANONYMOUS_PER_MINUTE = 120;
const ANONYMOUS_LOGGED_PER_HOUR = 6;

function ipOf(request: Request): string | null {
  const ip = clientIp(request);
  return ip === "local" ? null : ip;
}

export function basHandler<C = unknown>(
  scopes: ApiKeyScope | readonly ApiKeyScope[],
  entity: BasEntity,
  fn: (call: BasCall<C>) => Promise<Response>,
  options: { direction?: ExchangeDirection; action?: ExchangeAction } = {},
): (request: Request, context: C) => Promise<Response> {
  const needed: readonly ApiKeyScope[] = typeof scopes === "string" ? [scopes] : scopes;
  return handler<C>(async (request, context) => {
    const started = Date.now();
    const url = new URL(request.url);
    const note: CallNote = { action: options.action };
    let key: ApiKeyDoc | null = null;
    // The key passed every check: its last use is stamped.
    let used = false;
    let logIt = true;
    let failure: unknown = null;

    try {
      const header = (request.headers.get("authorization") ?? "").trim();
      const bearer = /^Bearer\s+(\S+)$/i.exec(header);
      const found = bearer ? await findApiKeyByToken(bearer[1]) : null;
      if (!found) {
        const limit = await rateLimit("bas-auth", clientIp(request), ANONYMOUS_PER_MINUTE, 60);
        if (!limit.ok) {
          logIt = false;
          throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });
        }
        const journaled = await rateLimit("bas-auth-log", clientIp(request), ANONYMOUS_LOGGED_PER_HOUR, 3600);
        if (!journaled.ok) logIt = false;
        throw new HttpError(401, "unauthorized", { reason: bearer ? "unknown" : "missing" });
      }
      key = found;
      const state = apiKeyState(found);
      if (state !== "active") throw new HttpError(401, "unauthorized", { reason: state });
      if (!needed.some((scope) => found.scopes.includes(scope))) {
        throw new HttpError(403, "forbidden", { scope: needed.join(" | ") });
      }
      used = true;
      const limit = await rateLimit("bas", found._id, BAS_LIMITS.callsPerMinute, 60);
      if (!limit.ok) {
        // A runaway job of one key is refused without a row per call.
        logIt = false;
        throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });
      }

      const settings = await getSettings("bas");
      if (entity !== "ping") {
        if (!settings.enabled) throw new HttpError(403, "disabled", { setting: "enabled" });
        const flag = ACCEPT_FLAG[entity];
        if (flag && !settings[flag]) throw new HttpError(403, "disabled", { setting: flag });
      }

      const call: BasCall<C> = {
        request,
        context,
        url,
        key: found,
        actor: integrationActor(found),
        settings,
        async body<T>(schema: ZodType<T>, maxBytes: number = BAS_LIMITS.bodyBytes): Promise<T> {
          const parsed = schema.safeParse(await readJson(request, maxBytes));
          if (!parsed.success) throw new HttpError(400, "bad-request", { issues: issueList(parsed.error) });
          return parsed.data;
        },
        note(info: CallNote) {
          Object.assign(note, info);
        },
      };
      return await fn(call);
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      if (logIt) {
        const counts = { ...EMPTY_COUNTS, ...note.counts };
        let status: ExchangeStatus;
        let errorText: string | null = null;
        if (failure) {
          status = "error";
          errorText = failure instanceof HttpError ? `${failure.status} ${failure.code}` : "500 server";
        } else {
          status =
            note.status ??
            (counts.failed === 0 ? "ok" : counts.failed >= counts.received ? "error" : "partial");
        }
        const ip = ipOf(request);
        await Promise.allSettled([
          writeExchangeLog({
            at: new Date(started),
            system: "bas",
            direction: options.direction ?? "in",
            entity,
            action: note.action ?? (request.method === "GET" ? "pull" : "push"),
            status,
            counts,
            durationMs: Date.now() - started,
            actor: key ? integrationActor(key) : null,
            batchId: note.batchId ?? null,
            error: errorText,
            details: note.details ?? [],
          }),
          key && used ? touchApiKey(key._id, ip) : Promise.resolve(),
        ]);
      }
    }
  });
}
