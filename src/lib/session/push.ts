// Sending optimistic changes to the server.
//
// The stores change their local state first (the UI never waits) and then
// tell the server. Two shapes cover every store:
//
// - createPushQueue(): discrete mutations (cancel an order, add an
//   employee). They are sent one after another in the order they were made.
// - createDebouncedSave(): "save the whole document" (the cart, the
//   assortment). Rapid changes collapse into one request with the latest
//   state.
//
// When the server REFUSES a change (4xx / 5xx) the session is refreshed and
// the server's state replaces the optimistic one - no error UI. When the
// request never arrives (offline) the local state is kept; a later save or
// the next session refresh settles it.
import type { ApiResult } from "@/lib/api/client";
import { refreshSession } from "./bootstrap";

type Task = () => Promise<ApiResult<unknown>>;

function settle(result: ApiResult<unknown>) {
  if (!result.ok && result.status !== 0) void refreshSession();
}

export type PushQueue = {
  push: (task: Task) => void;
  // Resolves when everything pushed so far has been answered.
  idle: () => Promise<void>;
};

export function createPushQueue(): PushQueue {
  let chain: Promise<void> = Promise.resolve();
  return {
    push(task) {
      chain = chain
        .then(task)
        .then(settle)
        .catch(() => {});
    },
    idle: () => chain,
  };
}

export type DebouncedSave = {
  // Something changed: save soon.
  schedule: () => void;
  // Save now if a save is pending (also wired to `pagehide`).
  flush: () => Promise<void>;
  // Forget a pending save (the account signed out).
  cancel: () => void;
};

// `save` reads the CURRENT state itself when it runs, so the request always
// carries the latest version. `keepalive` is true when the page is going
// away; pass it on to api() so the request outlives the tab.
export function createDebouncedSave(
  save: (keepalive: boolean) => Promise<ApiResult<unknown>>,
  delayMs = 400,
): DebouncedSave {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let running: Promise<void> = Promise.resolve();
  let hooked = false;

  function run(keepalive: boolean): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!dirty) return running;
    dirty = false;
    running = running
      .then(() => save(keepalive))
      .then(settle)
      .catch(() => {});
    return running;
  }

  return {
    schedule() {
      dirty = true;
      if (!hooked && typeof window !== "undefined") {
        hooked = true;
        window.addEventListener("pagehide", () => void run(true));
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void run(false), delayMs);
    },
    flush: () => run(false),
    cancel() {
      dirty = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
