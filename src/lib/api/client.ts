// The one way browser code talks to /api: JSON in, JSON out, the session
// cookie sent along, never cached, and never a thrown error - a failed or
// offline request comes back as `{ ok: false }` so a store can decide what
// to do without try / catch around every call.

export type ApiSuccess<T> = { ok: true; status: number; data: T };
export type ApiFailure = {
  ok: false;
  // 0 = the request never reached the server (offline, aborted).
  status: number;
  // The server's error code ("invalid", "fields", "unauthorized", ...),
  // "network" for status 0, "http" when the answer carried none.
  error: string;
  // The rest of the error body (e.g. `fields`).
  data: Record<string, unknown>;
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  // Sent as JSON. A body without a method means POST.
  body?: unknown;
  // Lets the request outlive the page (a save fired from `pagehide`).
  keepalive?: boolean;
  signal?: AbortSignal;
};

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const hasBody = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      credentials: "same-origin",
      cache: "no-store",
      keepalive: options.keepalive,
      signal: options.signal,
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: "network", data: {} };
  }

  let data: unknown = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }
  if (response.ok) return { ok: true, status: response.status, data: data as T };

  const record = data !== null && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    ok: false,
    status: response.status,
    error: typeof record.error === "string" ? record.error : "http",
    data: record,
  };
}
