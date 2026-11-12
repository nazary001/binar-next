"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef, useSyncExternalStore } from "react";

// Hooks every panel section needs and used to copy: the window's width
// against a step, a ticking clock for relative times, and one record or
// tab kept in the address bar.
//
//   const wide = useMinWidth(1440);                 // false on the server and while hydrating
//   const now = useNow();                           // 0 until the clock runs, then Date.now() every 30 s
//   const drawer = useAddressParam("id");           // /admin/leads?id=<id>
//   <DataTable onRowClick={(row) => drawer.open(row.id)} ... />
//   <Drawer open={drawer.value !== null} onClose={drawer.clear} ...>
//
// useMinWidth(px, serverValue = false): true while the window is at least
// `px` wide (a matchMedia store). The server and the hydrating render see
// `serverValue`, so the first paint matches the server's HTML; the real
// answer follows right after hydration. Prefer Column.hideBelow (pure CSS,
// no second render) when a column only has to disappear.
//
// useNow(intervalMs = 30000): the time in ms, ticking every `intervalMs`.
// One timer per interval is shared by every component that asks for it.
// 0 on the server and in the hydrating render ("unknown": show the full
// date then), so no component calls Date.now() while rendering.
//
// useAddressParam(name): { value, open(value), set(value), clear() } for
// a parameter of the address that is not a list filter (a drawer's ?id, a
// ?tab). The address is changed with the browser's own history (Next
// keeps useSearchParams in step), so nothing waits for the server and the
// list's own parameters stay as they are.
// - open(value): a new history entry when the parameter was absent (Back
//   closes the drawer), a replaced one when it was there (the next record
//   in an open drawer).
// - set(value): always replaces (a tab switch, a record just created).
// - clear(): goes Back when this hook added the entry, otherwise replaces
//   the address without the parameter (a drawer that came with a link).
// Leave the name out of the list's query with useListParams({ exclude:
// [name] }), so opening a drawer does not reload the table.

// --- useMinWidth ---------------------------------------------------------------

export function useMinWidth(px: number, serverValue = false): boolean {
  const query = `(min-width: ${px}px)`;
  const subscribe = useCallback(
    (listener: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

// --- useNow --------------------------------------------------------------------

type Clock = { now: number; timer: number | undefined; listeners: Set<() => void> };

const clocks = new Map<number, Clock>();

function clockOf(intervalMs: number): Clock {
  let clock = clocks.get(intervalMs);
  if (!clock) {
    clock = { now: 0, timer: undefined, listeners: new Set() };
    clocks.set(intervalMs, clock);
  }
  return clock;
}

export function useNow(intervalMs = 30_000): number {
  const ms = Math.max(1000, Math.round(intervalMs));
  const subscribe = useCallback(
    (listener: () => void) => {
      const clock = clockOf(ms);
      clock.listeners.add(listener);
      if (clock.listeners.size === 1) {
        // The first subscriber starts the clock (React reads the snapshot
        // again right after subscribing, so the new time shows at once).
        clock.now = Date.now();
        clock.timer = window.setInterval(() => {
          clock.now = Date.now();
          for (const notify of [...clock.listeners]) notify();
        }, ms);
      }
      return () => {
        clock.listeners.delete(listener);
        if (clock.listeners.size === 0) {
          window.clearInterval(clock.timer);
          clock.timer = undefined;
        }
      };
    },
    [ms],
  );
  return useSyncExternalStore(
    subscribe,
    () => clockOf(ms).now,
    () => 0,
  );
}

// --- useAddressParam -------------------------------------------------------------

export type AddressParam = {
  value: string | null;
  open: (value: string) => void;
  set: (value: string) => void;
  clear: () => void;
};

export function useAddressParam(name: string): AddressParam {
  const pathname = usePathname();
  const search = useSearchParams();
  const value = search.get(name);
  // Whether this hook added the history entry; written and read only in
  // event handlers.
  const pushed = useRef(false);

  const address = (params: URLSearchParams) => {
    const text = params.toString();
    return text ? `${pathname}?${text}` : pathname;
  };

  // State null on purpose: Next's history patch then copies its own state
  // in and moves useSearchParams along (an entry that carries Next's
  // state already would be taken for one of its own and not synced).
  const open = (next: string) => {
    const params = new URLSearchParams(window.location.search);
    const had = params.has(name);
    params.set(name, next);
    if (had) {
      window.history.replaceState(null, "", address(params));
    } else {
      window.history.pushState(null, "", address(params));
      pushed.current = true;
    }
  };

  const set = (next: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set(name, next);
    window.history.replaceState(null, "", address(params));
  };

  const clear = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (!params.has(name)) return;
    params.delete(name);
    window.history.replaceState(null, "", address(params));
  };

  return { value, open, set, clear };
}
