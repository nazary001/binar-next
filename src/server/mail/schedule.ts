import "server-only";
import { after } from "next/server";
import { AUTOMATIC_RUN, deliverOutbox, type DeliverOptions } from "./deliver";

// The one module of src/server/mail that needs Next: it runs the mailer
// once the current response is sent (next/server `after`), so a request
// that writes a message never waits for the provider.
//
//   deliverAfterResponse({ ids: [id] });   // queue.ts, through a dynamic import
//   sweepOutboxSoon();                     // GET /api/admin/nav-counts
//
// Everything else in src/server/mail stays importable without Next (the
// scripts and the audit helpers run it under plain Node); they reach this
// file only through `await import("./schedule")` behind a NEXT_RUNTIME
// check (queue.ts deliverSoon), or from a route handler.

// True when the run was scheduled; false outside a request (`after` throws
// there), and then the next sweep picks the messages up.
export function deliverAfterResponse(options: DeliverOptions): boolean {
  try {
    after(async () => {
      try {
        await deliverOutbox(options);
      } catch (error) {
        console.error("[mail] a delivery run failed:", error);
      }
    });
    return true;
  } catch {
    return false;
  }
}

// The safety net without a cron: the side menu of the panel asks GET
// /api/admin/nav-counts for its badges whenever a panel page loads and
// after every change of an order, a return or a lead, and that request
// also starts an automatic run (AUTOMATIC_RUN: retries after a failure and
// messages their writer could not send), at most once per SWEEP_EVERY_MS
// per server instance. The time of the last sweep is kept on globalThis,
// not in a module variable: the dev server re-evaluates modules on every
// recompile and a route bundle may carry its own copy of a module.
export const SWEEP_EVERY_MS = 5 * 60_000;

const LAST_SWEEP = Symbol.for("binar.mail.lastSweep");
type SweepClock = { [LAST_SWEEP]?: number };

export function sweepOutboxSoon(now = Date.now()): boolean {
  const clock = globalThis as SweepClock;
  if (now - (clock[LAST_SWEEP] ?? 0) < SWEEP_EVERY_MS) return false;
  if (!deliverAfterResponse(AUTOMATIC_RUN)) return false;
  clock[LAST_SWEEP] = now;
  return true;
}
