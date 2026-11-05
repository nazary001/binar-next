import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";

// Phones = below 640 (the lg breakpoint); the phone-only placement and
// option scrolling below key off it.
export const PHONE_QUERY = "(max-width: 639.98px)";

// Listbox plumbing shared by the pager's page-size pill (orders /
// returns / assortment, desktop), the phone SortMenu (A12) and the phone
// placement of the select menus (platform/ui Select, checkout/fields).
// Moved verbatim from platform/orders/listParts.tsx (which re-exports
// useDismiss); `close` and `placePanel` are additions.

// Closes an open popup on a pointerdown outside `ref` or on Escape.
export function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close]);
}

// Select-only combobox plumbing of the pager's page-size pill (the
// pattern of checkout/fields.tsx SelectField; the filter selects are the
// platform/ui Select):
// focus stays on the trigger, the highlighted option is announced
// through aria-activedescendant, ArrowDown / ArrowUp open the menu and
// move, Home / End jump, Enter / Space pick (or toggle), Escape and Tab
// close; options are the role=option <li>s themselves, picked on
// mousedown so the trigger's blur does not close the menu first.
export function useListbox(count: number, selectedIndex: number, onPick: (index: number) => void) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const optionId = (i: number) => `${id}-option-${i}`;

  const openMenu = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const closeMenu = () => {
    setActive(-1);
    setOpen(false);
  };
  const pick = (i: number) => {
    onPick(i);
    closeMenu();
  };

  // Keep the highlighted option visible in a scrolling menu. Phones
  // scroll the menu only: the page itself was placed by placePanel, and a
  // page-level scrollIntoView here would undo that placement (the menu can
  // be capped on a short viewport). Desktop keeps today's scrollIntoView.
  useEffect(() => {
    if (!open || active < 0) return;
    const el = document.getElementById(`${id}-option-${active}`);
    if (!el) return;
    if (window.matchMedia(PHONE_QUERY).matches) scrollWithin(el);
    else el.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const last = count - 1;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) {
          openMenu();
          return;
        }
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => Math.max(0, Math.min(last, i + step)));
        return;
      }
      case "Home":
      case "End":
        if (!open) return;
        e.preventDefault();
        setActive(e.key === "Home" ? 0 : last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open && active >= 0) pick(active);
        else if (open) closeMenu();
        else openMenu();
        return;
      case "Escape":
        if (!open) return;
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        return;
      case "Tab":
        if (open) closeMenu();
        return;
    }
  };

  const trigger = {
    role: "combobox" as const,
    "aria-haspopup": "listbox" as const,
    "aria-expanded": open,
    "aria-controls": `${id}-menu`,
    "aria-activedescendant": open && active >= 0 ? optionId(active) : undefined,
    onClick: () => (open ? closeMenu() : openMenu()),
    onKeyDown,
    onBlur: closeMenu,
  };
  const option = (i: number) => ({
    id: optionId(i),
    role: "option" as const,
    "aria-selected": i === selectedIndex,
    onMouseDown: (e: ReactMouseEvent) => {
      e.preventDefault();
      pick(i);
    },
    onMouseEnter: () => setActive(i),
  });

  return { open, active, menuId: `${id}-menu`, trigger, option, close: closeMenu };
}

// Phone placement of a popup panel (TR-11, A12 / A22): the panel is
// absolutely positioned under its anchor (its offsetParent, or the
// element passed). It stays below when it fits; it flips above (sets
// `data-flip`, which the panel's classes turn into a bottom anchor) when
// it does not fit below but fits above and there is more room above.
// Otherwise (DECISIONS round 3):
// - inside a scroller (a sheet / modal body) the scroller scrolls just
//   enough to show the panel below the anchor;
// - on the page the anchor is brought 8 px under the 66-px phone bar and
//   the panel is capped to the room left below it, down to 16 above the
//   viewport bottom (never under 140 px; it then scrolls inside). When
//   even 140 does not fit, the two margins give way first (anchor right
//   under the bar, panel down to the bottom edge). So the trigger and the
//   whole panel are on screen on a short viewport, a landscape phone or
//   with the keyboard up.
// `trigger`: a control whose hit box overhangs the anchor (the SortMenu
// trigger is 20 tall on its row with a 44 hit box) - its box counts as
// part of the anchor, so the hit box never ends up under the bar.
// The visible area is the nearest scrolling ancestor's box, or the
// viewport minus the 66-px phone header. Call it after the panel is in
// the DOM (a layout effect) and only on phones: the desktop menus keep
// today's behaviour.
const PHONE_BAR = 66;
const MARGIN = 24;
const BAR_GAP = 8;
const EDGE = 16;
const MIN_PANEL = 140;

function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === "auto" || oy === "scroll") return p;
  }
  return null;
}

// Scrolls the option's own menu (its offsetParent) just enough to show
// it, without touching any other scroller.
function scrollWithin(option: HTMLElement) {
  const menu = option.offsetParent as HTMLElement | null;
  if (!menu || menu.scrollHeight <= menu.clientHeight) return;
  const top = option.offsetTop;
  const bottom = top + option.offsetHeight;
  if (top < menu.scrollTop) menu.scrollTop = top;
  else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
}

export function placePanel(panel: HTMLElement, anchorEl?: HTMLElement | null, trigger?: HTMLElement | null) {
  const anchor = anchorEl ?? (panel.offsetParent as HTMLElement | null) ?? panel.parentElement;
  if (!anchor) return;
  delete panel.dataset.flip;
  panel.style.maxHeight = "";
  panel.style.overflowY = "";
  const a = anchor.getBoundingClientRect();
  const t = trigger?.getBoundingClientRect();
  const aTop = t ? Math.min(a.top, t.top) : a.top;
  const h = panel.offsetHeight;
  const scroller = scrollerOf(anchor);
  const box = scroller?.getBoundingClientRect();
  const top = box ? Math.max(box.top, 0) : PHONE_BAR;
  const bottom = box ? Math.min(box.bottom, window.innerHeight) : window.innerHeight;
  const below = bottom - a.bottom;
  const above = aTop - top;
  if (below >= h + MARGIN) return;
  if (above >= h + MARGIN && above > below) {
    panel.dataset.flip = "";
    return;
  }
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
  if (scroller) {
    // Same cap as the page branch, measured against the scroller's box:
    // the anchor is brought 8 px under its top and the panel is capped to
    // the room left (never under 140), so the trigger stays visible.
    const gap = panel.getBoundingClientRect().top - a.bottom;
    const room = Math.floor(bottom - top - BAR_GAP - (a.bottom - aTop) - gap - EDGE);
    const height = h > room ? Math.min(h, Math.max(MIN_PANEL, room)) : h;
    if (height < h) {
      panel.style.maxHeight = `${height}px`;
      panel.style.overflowY = "auto";
    }
    const need = Math.min(a.bottom + height + MARGIN - bottom, aTop - top - BAR_GAP);
    if (need > 0) scroller.scrollBy({ top: need, behavior });
    return;
  }
  // Page. `gap` = the panel's offset under the anchor (4.5 for the
  // select menus, 8 for the SortMenu), read from the layout.
  const gap = panel.getBoundingClientRect().top - a.bottom;
  const room = Math.floor(window.innerHeight - PHONE_BAR - BAR_GAP - (a.bottom - aTop) - gap - EDGE);
  const height = h > room ? Math.min(h, Math.max(MIN_PANEL, room)) : h;
  if (height < h) {
    panel.style.maxHeight = `${height}px`;
    panel.style.overflowY = "auto";
  }
  // Below 140 px of room the bar gap goes first, then the bottom edge.
  const lift = Math.min(BAR_GAP, Math.max(0, height - room));
  // Clamp to what the document can scroll (read after the cap: the
  // panel itself may be what extends the page).
  const root = document.scrollingElement ?? document.documentElement;
  const maxDown = root.scrollHeight - window.innerHeight - window.scrollY;
  const delta = Math.max(-window.scrollY, Math.min(aTop - PHONE_BAR - BAR_GAP + lift, maxDown));
  if (Math.abs(delta) >= 1) window.scrollBy({ top: delta, behavior });
}
