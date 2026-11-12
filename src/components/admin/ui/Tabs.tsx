"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { cx, formatNumber } from "../lib/format";
import { NativeSelect } from "./Select";
import { COLOR_TRANSITION, FOCUS_RING, FOCUS_RING_INSET, TONES, type Tone } from "./tokens";

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
// Tabs<K>({ items, value, onChange, size? = "md", label, idBase?, compactBelow? }):
//   role="tablist" with a roving tabindex: Tab enters on the open tab,
//   arrows / Home / End move and open (automatic activation). Disabled
//   items are skipped. Pass `idBase` (and the same one to TabPanel) to wire
//   aria-controls / aria-labelledby between a tab and its panel.
// TabPanel({ idBase, value, hidden?, children }).
// LinkTabs({ items, value, size?, label, compactBelow? }): a <nav> of
//   links, the open one with aria-current="page".
// Sizes: the capsule is as tall as a control of the same size (CONTROL in
// tokens.ts), so tabs line up with a search or a button in one row:
// md = a 40-px capsule of 32-px items (page tabs), sm = 32 px of 24-px
// items (inside cards).
//
// Also on both:
// - The open tab is kept in view: when the capsule scrolls sideways (a
//   phone) and the open tab is not fully visible (a link opened the last
//   one, the counts or the web font widened the tabs), the capsule, and
//   never the page, scrolls to centre it.
// - item.mark: a small dot after the label, for a tab that needs a look
//   ("has errors" in an editor). true reads "є помилки" to a screen
//   reader; a string is read instead. item.markTone: the dot's tone (red
//   by default; "brand" for "needs attention").
// - compactBelow: 640 | 768 | 1024: under that window width the capsule
//   becomes a NativeSelect of the same items (five period tabs do not fit
//   a phone). Pure CSS, so the server and the first paint already agree.
//   Counts follow the label in the select ("Нові (7)"); the select takes
//   the accessible name of the tabs.

export type TabMark = boolean | string;

export type TabItem<K extends string> = {
  key: K;
  label: string;
  count?: number;
  disabled?: boolean;
  mark?: TabMark;
  markTone?: Tone;
};

export type TabsCompactBelow = 640 | 768 | 1024;

export type TabsProps<K extends string> = {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  size?: "md" | "sm";
  label: string;
  idBase?: string;
  compactBelow?: TabsCompactBelow;
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

// The capsule hides below the step and the select shows (whole literals).
const WIDE_ONLY: Record<TabsCompactBelow, string> = {
  640: "max-[639px]:hidden",
  768: "max-[767px]:hidden",
  1024: "max-[1023px]:hidden",
};
const NARROW_ONLY: Record<TabsCompactBelow, string> = {
  640: "min-[640px]:hidden",
  768: "min-[768px]:hidden",
  1024: "min-[1024px]:hidden",
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

// The dot's colour: the tone's dot, except "brand", whose dot is white (it
// is drawn on an orange pill) and here sits on a grey or white one.
function markColor(tone: Tone): string {
  return tone === "brand" ? TONES.brand.bg : (TONES[tone] ?? TONES.red).dot;
}

function Mark({ mark, tone = "red" }: { mark: TabMark; tone?: Tone }) {
  return (
    <>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: markColor(tone) }} />
      <span className="sr-only">{typeof mark === "string" ? `, ${mark}` : ", є помилки"}</span>
    </>
  );
}

function hasMark(mark: TabMark | undefined): mark is TabMark {
  return mark !== undefined && mark !== false && mark !== "";
}

// The text of an item in the compact select.
function optionLabel(item: { label: string; count?: number; mark?: TabMark }): string {
  const count = typeof item.count === "number" ? ` (${formatNumber(item.count)})` : "";
  const mark = hasMark(item.mark) ? ` - ${typeof item.mark === "string" ? item.mark : "є помилки"}` : "";
  return `${item.label}${count}${mark}`;
}

// Scrolls the capsule (never the page) so its open item is fully visible,
// centred; does nothing while it already is. Runs after the open item
// changes, and again when the capsule or its items change size (counts
// arriving, the web font coming in).
function revealOpen(box: HTMLElement | null, selector: string): void {
  const active = box?.querySelector<HTMLElement>(selector);
  if (!box || !active || box.scrollWidth <= box.clientWidth) return;
  const left = active.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
  if (left >= box.scrollLeft && left + active.offsetWidth <= box.scrollLeft + box.clientWidth) return;
  box.scrollLeft = Math.max(0, left - (box.clientWidth - active.offsetWidth) / 2);
}

function useKeepOpenInView(track: RefObject<HTMLElement | null>, selector: string, key: string) {
  // Before paint: a link to the last tab never shows the first ones first.
  useLayoutEffect(() => {
    revealOpen(track.current, selector);
  }, [track, selector, key]);

  useEffect(() => {
    const box = track.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => revealOpen(box, selector));
    observer.observe(box);
    for (const child of box.querySelectorAll(":scope > *")) observer.observe(child);
    return () => observer.disconnect();
  }, [track, selector, key]);
}

export function Tabs<K extends string>({ items, value, onChange, size = "md", label, idBase, compactBelow, className }: TabsProps<K>) {
  const fallback = useId();
  const base = idBase ?? fallback;
  const trackRef = useRef<HTMLDivElement>(null);
  const enabled = items.filter((item) => !item.disabled);
  // The tab that takes Tab focus: the open one, or the first enabled one.
  const focusKey = enabled.some((item) => item.key === value) ? value : enabled[0]?.key;
  useKeepOpenInView(trackRef, '[role="tab"][aria-selected="true"]', value);

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
    // preventScroll: the capsule is scrolled by useKeepOpenInView, not by
    // the focus (which would scroll the page too).
    button?.focus({ preventScroll: true });
    onChange(target.key);
  };

  const capsule = (
    <div ref={trackRef} role="tablist" aria-label={label} className={cx(TRACK, compactBelow ? WIDE_ONLY[compactBelow] : className)}>
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
            {hasMark(item.mark) && <Mark mark={item.mark} tone={item.markTone} />}
          </button>
        );
      })}
    </div>
  );

  if (!compactBelow) return capsule;
  return (
    <div className={cx("min-w-0", className)}>
      {capsule}
      <div className={NARROW_ONLY[compactBelow]}>
        <NativeSelect<K>
          aria-label={label}
          size={size === "sm" ? "sm" : "md"}
          value={value}
          onChange={onChange}
          options={items.map((item) => ({ value: item.key, label: optionLabel(item), disabled: item.disabled }))}
        />
      </div>
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

export type LinkTabItem = { key: string; label: string; href: string; count?: number; mark?: TabMark; markTone?: Tone };

export function LinkTabs({
  items,
  value,
  size = "md",
  label,
  compactBelow,
  className,
}: {
  items: LinkTabItem[];
  value: string;
  size?: "md" | "sm";
  label: string;
  compactBelow?: TabsCompactBelow;
  className?: string;
}) {
  const router = useRouter();
  const trackRef = useRef<HTMLUListElement>(null);
  useKeepOpenInView(trackRef, '[aria-current="page"]', value);
  return (
    <nav aria-label={label} className={cx("max-w-full", className)}>
      <ul ref={trackRef} className={cx(TRACK, compactBelow && WIDE_ONLY[compactBelow])}>
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
                {hasMark(item.mark) && <Mark mark={item.mark} tone={item.markTone} />}
              </Link>
            </li>
          );
        })}
      </ul>
      {compactBelow && (
        <div className={NARROW_ONLY[compactBelow]}>
          <NativeSelect
            aria-label={label}
            size={size === "sm" ? "sm" : "md"}
            value={value}
            onChange={(key) => {
              const item = items.find((entry) => entry.key === key);
              if (item) router.push(item.href, { scroll: false });
            }}
            options={items.map((item) => ({ value: item.key, label: optionLabel(item) }))}
          />
        </div>
      )}
    </nav>
  );
}
