"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";

// A record of a list that opens in a drawer from the address (?id=<id>),
// so a link can point at one record and Back closes it. The address is
// changed with the browser's own history (Next keeps useSearchParams in
// step), so opening and closing never wait for the server. The other
// parameters of the address (tab, search, filters) stay as they are.
// A drawer opened here closes with Back; one that came with the address
// (a shared link) closes by dropping ?id.

export function useDrawerAddress(name = "id") {
  const pathname = usePathname();
  const search = useSearchParams();
  const openId = search.get(name);
  // Written and read only in event handlers.
  const pushed = useRef(false);

  const address = (params: URLSearchParams) => {
    const text = params.toString();
    return text ? `${pathname}?${text}` : pathname;
  };

  const open = (id: string) => {
    const next = new URLSearchParams(window.location.search);
    next.set(name, id);
    if (new URLSearchParams(window.location.search).has(name)) {
      window.history.replaceState(null, "", address(next));
    } else {
      window.history.pushState(null, "", address(next));
      pushed.current = true;
    }
  };

  // Shows another record in the open drawer (a role that was just created).
  const replace = (id: string) => {
    const next = new URLSearchParams(window.location.search);
    next.set(name, id);
    window.history.replaceState(null, "", address(next));
  };

  const close = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    const next = new URLSearchParams(window.location.search);
    next.delete(name);
    window.history.replaceState(null, "", address(next));
  };

  return { openId, open, replace, close };
}
