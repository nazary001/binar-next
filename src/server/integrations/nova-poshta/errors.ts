import "server-only";

// Errors of the Nova Poshta integration. Kept free of next/* imports so the
// audit scripts can run the integration under plain Node (tsx); the routes
// turn them into HTTP answers with toHttpError (./http.ts).

export type NpErrorKind = "auth" | "validation" | "transport" | "api" | "not-configured";

// A call to the carrier that did not give a usable answer.
// - auth: the key is missing, invalid or expired (re-enter the key);
// - validation: the carrier could not read the request ("Data is invalid");
// - transport: no answer (network, timeout, HTTP error, not JSON);
// - api: the carrier refused the request; `message` is its own wording;
// - not-configured: the call needs something the settings do not have
//   (`missing` names it), nothing was sent.
export class NpError extends Error {
  constructor(
    readonly kind: NpErrorKind,
    message: string,
    readonly codes: string[] = [],
    // "InternetDocument.save"
    readonly method: string = "",
    readonly missing: string[] = [],
  ) {
    super(message);
    this.name = "NpError";
  }
}

// A refusal of the shipping service itself (the order's state does not
// allow the action, a field is wrong). Same shape as HttpError, without
// depending on it.
export class ShippingError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "ShippingError";
  }
}

export function notConfigured(missing: string[]): NpError {
  return new NpError("not-configured", "Nova Poshta is not configured", [], "", missing);
}
