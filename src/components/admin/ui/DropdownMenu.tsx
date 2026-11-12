"use client";

import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type MouseEvent,
  type SVGProps,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import { IconButton } from "./Button";
import { useDismiss, useFloating, type Placement } from "./floating";
import { adminRoot, floatingRoot, TriggerSlot, useClientReady, type TriggerProp } from "./overlay";
import { FOCUS_RING_INSET, SURFACE, Z } from "./tokens";

// A menu of actions opened from a button: row actions, "more" menus,
// export choices.
//
//   <DropdownMenu
//     label="Експорт"
//     trigger={<Button variant="secondary" iconRight={ChevronDownIcon}>Експорт</Button>}
//     items={[
//       { key: "csv", label: "CSV для Excel", icon: TableCellsIcon, href: adminUrl("/orders/export?format=csv") },
//       { key: "sep", divider: true },
//       { key: "h", heading: "Небезпечні дії" },
//       { key: "delete", label: "Видалити", icon: TrashIcon, tone: "danger", onSelect: remove, disabled: !can("orders.edit") },
//     ]}
//   />
//
//   <KebabMenu items={[{ key: "open", label: "Відкрити", href: `/admin/orders/${id}` }, ...]} />
//
// Props
// - trigger: a button element (its own onClick / onKeyDown / ref still run),
//   or a function (props, { open }) => element that spreads `props` on the
//   button it renders.
// - items: actions ({ key, label, icon?, onSelect?, href?, tone?, disabled?,
//   hint? }), dividers ({ key, divider: true }) and group headings
//   ({ key, heading }). `icon` is a Heroicon component (24/outline).
//   An href under /admin opens in the same tab (next/link); any other href
//   (the storefront, a download) opens in a new tab.
// - label: the menu's accessible name ("Дії із замовленням №1024").
// - placement: from ui/floating.ts, default "bottom-start".
// - minWidth: px, default 220.
// Keyboard: Enter, Space, ArrowDown open on the first item, ArrowUp on the
// last; arrows, Home, End move; typing a letter jumps to the item that
// starts with it; Enter / Space choose; Escape closes; Tab closes and
// moves on. Focus returns to the trigger after a choice or Escape.

export type MenuIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type MenuAction = {
  key: string;
  label: string;
  icon?: MenuIcon;
  onSelect?: () => void;
  href?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  // A short note on the right: a shortcut, a count.
  hint?: string;
};
export type MenuDivider = { key: string; divider: true };
export type MenuHeading = { key: string; heading: string };
export type MenuItem = MenuAction | MenuDivider | MenuHeading;

export type MenuTriggerProps = {
  ref: (node: HTMLElement | null) => void;
  id: string;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls"?: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export type DropdownMenuProps = {
  trigger: TriggerProp<MenuTriggerProps, { open: boolean }>;
  items: MenuItem[];
  label: string;
  placement?: Placement;
  minWidth?: number;
  onOpenChange?: (open: boolean) => void;
};

type Intent = "first" | "last" | "menu";

const MENU =
  "fixed overflow-y-auto p-1.5 outline-none admin-scroll max-w-[min(340px,calc(100vw-16px))] " +
  "transition-[opacity,scale] duration-150 motion-reduce:transition-none starting:scale-[0.97] starting:opacity-0";

const ROW =
  "flex h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium leading-5 " +
  "transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed";

const ROW_TONE = {
  // The slab grey: #f8f8f8 barely shows on the white menu.
  default: "text-neutral-800 hover:bg-bg-cabinet focus:bg-bg-cabinet",
  danger: "text-negative hover:bg-[#fff0f0] focus:bg-[#fff0f0]",
  disabled: "text-neutral-300",
} as const;

function isDivider(item: MenuItem): item is MenuDivider {
  return "divider" in item;
}
function isHeading(item: MenuItem): item is MenuHeading {
  return "heading" in item;
}

function enabledItems(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return [];
  return [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')];
}

function MenuRow({ item, onChoose }: { item: MenuAction; onChoose: (item: MenuAction) => void }) {
  const Icon = item.icon;
  const tone = item.disabled ? "disabled" : item.tone === "danger" ? "danger" : "default";
  const inner = (
    <>
      {Icon && (
        <Icon
          aria-hidden
          strokeWidth={1.7}
          className={cx(
            "size-5 shrink-0",
            tone === "danger" ? "text-negative" : tone === "disabled" ? "text-neutral-300" : "text-neutral-500",
          )}
        />
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.hint && <span className="shrink-0 pl-3 text-[12px] font-medium leading-4 text-neutral-400 tabular-nums">{item.hint}</span>}
    </>
  );
  const className = cx(ROW, ROW_TONE[tone], FOCUS_RING_INSET);
  // Hover moves the focus, so the mouse and the arrows share one highlight.
  const onMouseMove = (event: MouseEvent<HTMLElement>) => {
    if (document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true });
  };

  if (item.disabled) {
    return (
      <button type="button" role="menuitem" tabIndex={-1} disabled aria-disabled="true" data-label={item.label} className={className}>
        {inner}
      </button>
    );
  }
  if (item.href) {
    const inPanel = item.href.startsWith("/admin");
    const common = {
      role: "menuitem",
      tabIndex: -1,
      "data-label": item.label,
      className,
      onMouseMove,
      onClick: () => onChoose(item),
      // Space does not follow a link by itself.
      onKeyDown: (event: KeyboardEvent<HTMLAnchorElement>) => {
        if (event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      },
    };
    return inPanel ? (
      <Link href={item.href} {...common}>
        {inner}
      </Link>
    ) : (
      <a href={item.href} target="_blank" rel="noreferrer" {...common}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      data-label={item.label}
      onMouseMove={onMouseMove}
      onClick={() => onChoose(item)}
      className={className}
    >
      {inner}
    </button>
  );
}

// Splits the flat list into groups that start at a heading, so each
// labelled group is a real role="group" for screen readers.
type Block = { key: string; heading: string | null; entries: (MenuAction | MenuDivider)[] };

function toBlocks(items: MenuItem[]): Block[] {
  const blocks: Block[] = [{ key: "start", heading: null, entries: [] }];
  for (const item of items) {
    if (isHeading(item)) blocks.push({ key: item.key, heading: item.heading, entries: [] });
    else blocks[blocks.length - 1].entries.push(item);
  }
  return blocks.filter((block) => block.heading !== null || block.entries.length > 0);
}

export function DropdownMenu({ trigger, items, label, placement = "bottom-start", minWidth = 220, onOpenChange }: DropdownMenuProps) {
  const [open, setOpenState] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const ready = useClientReady();
  const anchorRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef<Intent>("menu");
  const typedRef = useRef({ text: "", at: 0 });
  const triggerId = useId();
  const menuId = useId();
  const headingPrefix = useId();

  const setOpen = useCallback(
    (value: boolean) => {
      setOpenState(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );

  useFloating(open, anchorRef, menuRef, { placement, offset: 6 });
  // Outside presses close without moving the focus (it goes where the
  // press lands). Escape is handled below, where focus can go back.
  const dismiss = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(open, [anchorRef, menuRef], dismiss);

  // Focus moves in once the menu is on screen and placed.
  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    const nodes = enabledItems(menu);
    const intent = intentRef.current;
    const target = intent === "first" ? nodes[0] : intent === "last" ? nodes[nodes.length - 1] : null;
    (target ?? menu).focus({ preventScroll: true });
  }, [open]);

  const openMenu = (intent: Intent, anchor: HTMLElement) => {
    intentRef.current = intent;
    setHost(floatingRoot(anchor));
    setOpen(true);
  };

  const closeMenu = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) anchorRef.current?.focus({ preventScroll: true });
  };

  const choose = (item: MenuAction) => {
    if (item.disabled) return;
    // Focus is back on the trigger before the action runs, so a dialog the
    // action opens returns there when it closes.
    closeMenu(!item.href);
    item.onSelect?.();
  };

  const setAnchor = useCallback((node: HTMLElement | null) => {
    anchorRef.current = node;
  }, []);

  const triggerProps: MenuTriggerProps = {
    ref: setAnchor,
    id: triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onClick: (event) => {
      if (open) closeMenu(false);
      // detail 0: the click came from Enter or Space.
      else openMenu(event.detail === 0 ? "first" : "menu", event.currentTarget);
    },
    onKeyDown: (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu(event.key === "ArrowDown" ? "first" : "last", event.currentTarget);
      }
    },
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nodes = enabledItems(menuRef.current);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => {
      if (nodes.length === 0) return;
      nodes[(next + nodes.length) % nodes.length].focus();
    };
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index < 0 ? 0 : index + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index < 0 ? nodes.length - 1 : index - 1);
        return;
      case "Home":
      case "PageUp":
        event.preventDefault();
        focusAt(0);
        return;
      case "End":
      case "PageDown":
        event.preventDefault();
        focusAt(nodes.length - 1);
        return;
      case "Escape":
        // Stops here: a modal under the menu must stay open.
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
        return;
      case "Tab":
        // Back on the trigger first, so the browser's Tab moves on from it.
        anchorRef.current?.focus({ preventScroll: true });
        setOpen(false);
        return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " ") {
      const previous = typedRef.current;
      const text = event.timeStamp - previous.at > 700 ? event.key : previous.text + event.key;
      typedRef.current = { text, at: event.timeStamp };
      const needle = text.toLocaleLowerCase("uk");
      // A single letter looks after the current item, so pressing it again cycles.
      const start = text.length === 1 ? index + 1 : Math.max(index, 0);
      for (let step = 0; step < nodes.length; step += 1) {
        const node = nodes[(start + step) % nodes.length];
        if ((node.dataset.label ?? "").toLocaleLowerCase("uk").startsWith(needle)) {
          node.focus();
          break;
        }
      }
    }
  };

  const blocks = toBlocks(items);

  return (
    <>
      <TriggerSlot trigger={trigger} props={triggerProps} state={{ open }} />
      {ready &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={onMenuKeyDown}
            style={{ minWidth }}
            className={cx(MENU, SURFACE.float, Z.dropdown)}
          >
            {blocks.map((block, blockIndex) => {
              const rows = block.entries.map((entry) =>
                isDivider(entry) ? (
                  <div key={entry.key} role="separator" className="mx-2 my-1.5 h-px bg-stroke-subtle" />
                ) : (
                  <MenuRow key={entry.key} item={entry} onChoose={choose} />
                ),
              );
              if (block.heading === null) return <div key={block.key}>{rows}</div>;
              const headingId = `${headingPrefix}-${blockIndex}`;
              return (
                <div key={block.key} role="group" aria-labelledby={headingId}>
                  <div
                    id={headingId}
                    role="presentation"
                    className={cx(
                      "px-3 pb-1 text-[12px] font-medium leading-4 text-neutral-500",
                      blockIndex === 0 ? "pt-1.5" : "pt-2.5",
                    )}
                  >
                    {block.heading}
                  </div>
                  {rows}
                </div>
              );
            })}
          </div>,
          // `host` is set by the handler that opens the menu.
          host ?? adminRoot(),
        )}
    </>
  );
}

// --- Kebab -----------------------------------------------------------------

// The round "more actions" button of table rows and cards, with its menu.
//
//   <KebabMenu label={`Дії із замовленням №${order.number}`} items={[...]} size="sm" />
//
// - label: the button's accessible name and the menu's (default "Дії").
// - size: "md" 40 px (default), "sm" 32 px for dense table rows (the
//   IconButton sizes).
// - placement: default "bottom-end" (the menu opens to the left of a row's
//   right edge).
// - disabled: nothing the role may do here.
// The button is the kit's ghost IconButton: brand glyph while the menu is
// open (aria-expanded), as every trigger of the kit shows it.
export type KebabMenuProps = {
  items: MenuItem[];
  label?: string;
  size?: "sm" | "md";
  placement?: Placement;
  disabled?: boolean;
  className?: string;
};

export function KebabMenu({ items, label = "Дії", size = "md", placement = "bottom-end", disabled = false, className }: KebabMenuProps) {
  return (
    <DropdownMenu
      label={label}
      items={items}
      placement={placement}
      trigger={(props) => (
        <IconButton {...props} label={label} icon={EllipsisVerticalIcon} size={size} disabled={disabled} className={className} />
      )}
    />
  );
}
