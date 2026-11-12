"use client";

import Link from "next/link";
import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cx, formatNumber } from "../lib/format";
import { COLOR_TRANSITION, FOCUS_RING, FOCUS_RING_INSET } from "./tokens";

// The cabinet's tab pill: a #e8e8e9 capsule holding the tabs, the open one
// a white pill with ink text (orange stays reserved for "active" in the
// menu and for "needs attention"). Counts sit after the label as small
// muted numbers. On a narrow screen the capsule scrolls sideways.
//
//   const [tab, setTab] = useState<"info" | "history">("info");
//   <Tabs label="Розділи замовлення" idBase="order" value={tab} onChange={setTab}
//     items={[{ key: "info", label: "Дані" }, { key: "history", label: "Історія", count: 12 }]} />
//   <TabPanel idBase="order" value="info" hidden={tab !== "info"}>...</TabPanel>
//
//   // Tabs that are addresses (each a page or a filter in the URL):
//   <LinkTabs label="Статус" value={status}
//     items={[{ key: "all", label: "Усі", href: "/admin/orders" }, { key: "new", label: "Нові", href: "/admin/orders?status=new", count: 7 }]} />
//
// Tabs<K>({ items, value, onChange, size? = "md", label, idBase? }):
//   role="tablist" with a roving tabindex: Tab enters on the open tab,
//   arrows / Home / End move and open (automatic activation). Disabled
//   items are skipped. Pass `idBase` (and the same one to TabPanel) to wire
//   aria-controls / aria-labelledby between a tab and its panel.
// TabPanel({ idBase, value, hidden?, children }).
// LinkTabs({ items, value, size?, label }): a <nav> of links, the open one
//   with aria-current="page".
// Sizes: the capsule is as tall as a control of the same size (CONTROL in
// tokens.ts), so tabs line up with a search or a button in one row:
// md = a 40-px capsule of 32-px items (page tabs), sm = 32 px of 24-px
// items (inside cards).

export type TabItem<K extends string> = { key: K; label: string; count?: number; disabled?: boolean };

export type TabsProps<K extends string> = {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  size?: "md" | "sm";
  label: string;
  idBase?: string;
  className?: string;
};

export function tabId(base: string, key: string): string {
  return `${base}-tab-${key}`;
}

export function panelId(base: string, key: string): string {
  return `${base}-panel-${key}`;
}

const TRACK = "inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-[#e8e8e9] p-1 scrollbar-hidden";

const ITEM: Record<"md" | "sm", string> = {
  md: "h-8 px-4 text-[14px] leading-5",
  sm: "h-6 px-3 text-[13px] leading-[18px]",
};

function itemClass(size: "md" | "sm", active: boolean, disabled: boolean): string {
  return cx(
    "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium motion-reduce:transition-none",
    COLOR_TRANSITION,
    FOCUS_RING_INSET,
    ITEM[size],
    active
      ? "bg-white text-neutral-900"
      : disabled
        ? "cursor-not-allowed text-neutral-300"
        : "cursor-pointer text-neutral-600 hover:bg-white/60 hover:text-neutral-900",
  );
}

function Count({ value }: { value: number }) {
  return <span className="text-[12px] font-medium leading-4 text-neutral-500 tabular-nums">{formatNumber(value)}</span>;
}

export function Tabs<K extends string>({ items, value, onChange, size = "md", label, idBase, className }: TabsProps<K>) {
  const fallback = useId();
  const base = idBase ?? fallback;
  const enabled = items.filter((item) => !item.disabled);
  // The tab that takes Tab focus: the open one, or the first enabled one.
  const focusKey = enabled.some((item) => item.key === value) ? value : enabled[0]?.key;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, key: K) => {
    const index = enabled.findIndex((item) => item.key === key);
    if (index < 0 || enabled.length === 0) return;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % enabled.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = enabled[next];
    const list = event.currentTarget.parentElement;
    const button = list?.querySelector<HTMLButtonElement>(`[data-tab-key="${CSS.escape(target.key)}"]`);
    button?.focus();
    button?.scrollIntoView({ block: "nearest", inline: "nearest" });
    onChange(target.key);
  };

  return (
    <div role="tablist" aria-label={label} className={cx(TRACK, className)}>
      {items.map((item) => {
        const active = item.key === value;
        const disabled = Boolean(item.disabled);
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={idBase ? tabId(base, item.key) : undefined}
            aria-controls={idBase ? panelId(base, item.key) : undefined}
            aria-selected={active}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            tabIndex={item.key === focusKey ? 0 : -1}
            data-tab-key={item.key}
            onClick={() => {
              if (!disabled && !active) onChange(item.key);
            }}
            onKeyDown={(event) => onKeyDown(event, item.key)}
            className={itemClass(size, active, disabled)}
          >
            {item.label}
            {typeof item.count === "number" && <Count value={item.count} />}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  idBase,
  value,
  hidden = false,
  children,
  className,
}: {
  idBase: string;
  value: string;
  hidden?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(idBase, value)}
      aria-labelledby={tabId(idBase, value)}
      hidden={hidden}
      tabIndex={0}
      className={cx("min-w-0 rounded-3xl", FOCUS_RING, className)}
    >
      {children}
    </div>
  );
}

export type LinkTabItem = { key: string; label: string; href: string; count?: number };

export function LinkTabs({
  items,
  value,
  size = "md",
  label,
  className,
}: {
  items: LinkTabItem[];
  value: string;
  size?: "md" | "sm";
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cx("max-w-full", className)}>
      <ul className={TRACK}>
        {items.map((item) => {
          const active = item.key === value;
          return (
            <li key={item.key} className="shrink-0">
              <Link
                href={item.href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={itemClass(size, active, false)}
              >
                {item.label}
                {typeof item.count === "number" && <Count value={item.count} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
