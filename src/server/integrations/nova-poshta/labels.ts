import "server-only";
import type { LabelKind } from "@/components/admin/shipping/types";
import type { Actor } from "@/server/db/collections";
import { storedNpKey } from "./client";
import { NpError, notConfigured } from "./errors";
import { logNpExchange } from "./log";

// Printing a waybill or its marking. The carrier's print address carries
// the key in its path, so the PDF is fetched here and streamed to the
// panel: the address never reaches a browser and is never logged (an error
// names the kind of print, not the address).
//
// waybill: the A4 waybill (printDocument ... type/pdf);
// marking: the 100x100 sticker for the parcel (printMarking100x100 ... type/pdf).
// With a key the print service does not accept it answers a redirect to
// its sign-in page (seen live with a dummy key), which is read as "auth".

const PRINT_BASE = "https://my.novaposhta.ua/orders";
const LABEL_TIMEOUT_MS = 20_000;
const MAX_BYTES = 10 * 1024 * 1024;

function printUrl(ttn: string, kind: LabelKind, key: string): string {
  const number = encodeURIComponent(ttn);
  const secret = encodeURIComponent(key);
  return kind === "waybill"
    ? `${PRINT_BASE}/printDocument/orders[]/${number}/type/pdf/apiKey/${secret}`
    : `${PRINT_BASE}/printMarking100x100/orders[]/${number}/type/pdf/apiKey/${secret}`;
}

export type LabelResponse = { status: number; contentType: string; bytes: Uint8Array };
export type LabelFetcher = (url: string, signal: AbortSignal) => Promise<LabelResponse>;

const fetchLabelBytes: LabelFetcher = async (url, signal) => {
  const response = await fetch(url, { redirect: "manual", signal, cache: "no-store" });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { status: response.status, contentType: response.headers.get("content-type") ?? "", bytes };
};

let fetcher: LabelFetcher = fetchLabelBytes;

// The audit scripts replace the print service with this; null restores it.
export function setNpLabelFetcher(fn: LabelFetcher | null): void {
  fetcher = fn ?? fetchLabelBytes;
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function fetchLabel(ttn: string, kind: LabelKind, actor: Actor | null = null): Promise<Uint8Array> {
  const key = await storedNpKey();
  if (!key) throw notConfigured(["apiKey"]);
  const method = kind === "waybill" ? "print.waybill" : "print.marking";
  const started = Date.now();
  const fail = async (error: NpError): Promise<never> => {
    await logNpExchange({
      entity: "label",
      action: method,
      status: "error",
      durationMs: Date.now() - started,
      actor,
      error: `${error.kind}: ${error.message}`,
      subject: ttn,
    });
    throw error;
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LABEL_TIMEOUT_MS);
  let answer: LabelResponse;
  try {
    answer = await fetcher(printUrl(ttn, kind, key), controller.signal);
  } catch {
    // Never the caught error itself: a fetch error may quote the address.
    return fail(new NpError("transport", controller.signal.aborted ? "Timeout" : "Network error", [], method));
  } finally {
    clearTimeout(timer);
  }
  if (answer.status >= 300 && answer.status < 400) {
    return fail(new NpError("auth", "The print service did not accept the key", [], method));
  }
  if (answer.status !== 200) return fail(new NpError("api", `The print service answered HTTP ${answer.status}`, [], method));
  if (answer.bytes.length > MAX_BYTES) return fail(new NpError("api", "The print service answered a too large file", [], method));
  if (!isPdf(answer.bytes)) return fail(new NpError("api", "The print service did not answer a PDF", [], method));
  return answer.bytes;
}
