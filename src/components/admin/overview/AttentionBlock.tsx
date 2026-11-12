"use client";

import {
  ArrowUturnLeftIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  CheckIcon,
  EnvelopeIcon,
  InboxArrowDownIcon,
  NoSymbolIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { countOf, cx, formatMoney } from "../lib/format";
import { CountBadge } from "../ui/Badge";
import { AttentionItem as AttentionRow, Card } from "../ui/Card";
import { PageSection } from "../ui/Page";
import { Skeleton } from "../ui/Skeleton";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, TONES } from "../ui/tokens";
import { ATTENTION_META, type AttentionItem, type AttentionKey } from "./types";

// "Потребує уваги": what waits for somebody right now. Only the counters
// above zero are listed, each a row that opens the filtered list; when
// nothing waits, one calm line says so. The orange counts here are the only
// brand orange on the page (the icon tiles stay neutral on purpose).
// Catalog and blog housekeeping (unlisted, out of stock, drafts) is not
// urgent: it sits under the rows as quiet links with grey counts.

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

type Row = { key: AttentionKey; icon: Icon; title: string; text: string; count: number; href: string };

const ICONS: Partial<Record<AttentionKey, Icon>> = {
  newOrders: ShoppingBagIcon,
  cancelRequests: NoSymbolIcon,
  returnsWaiting: ArrowUturnLeftIcon,
  overduePayments: BanknotesIcon,
  newLeads: InboxArrowDownIcon,
  erpQueue: ArrowsRightLeftIcon,
  outboxPending: EnvelopeIcon,
};

// The order of the rows: work on orders first, then the rest.
const URGENT: AttentionKey[] = [
  "newOrders",
  "cancelRequests",
  "returnsWaiting",
  "overduePayments",
  "newLeads",
  "erpQueue",
  "outboxPending",
];

const QUIET: AttentionKey[] = ["unlistedProducts", "unavailableProducts", "draftPosts"];

// The queue tab of the BAS page, filtered to the entries BAS refused.
const ERP_ERRORS_HREF = "/admin/integrations/bas?tab=queue&state=error";

function rowOf(item: AttentionItem): Row | null {
  const icon = ICONS[item.key];
  if (!icon) return null;
  const base = { key: item.key, icon, href: item.href };
  if (item.key === "erpQueue") {
    // Entries that only wait are BAS's normal schedule; refusals need a person.
    if (item.errors <= 0) return null;
    return {
      ...base,
      title: "Помилки обміну з BAS",
      text: item.pending > 0 ? `Ще ${countOf(item.pending, ["запис", "записи", "записів"])} у черзі` : "BAS не прийняв ці записи",
      count: item.errors,
      href: ERP_ERRORS_HREF,
    };
  }
  if (item.count <= 0) return null;
  const title = ATTENTION_META[item.key].label;
  switch (item.key) {
    case "newOrders":
      return { ...base, title, count: item.count, text: item.total ? `На суму ${formatMoney(item.total, { whole: true })}` : "Чекають на менеджера" };
    case "cancelRequests":
      return { ...base, title, count: item.count, text: "Партнери просять скасувати" };
    case "returnsWaiting":
      return { ...base, title, count: item.count, text: "Нові та на розгляді" };
    case "overduePayments":
      return { ...base, title, count: item.count, text: item.total ? `Борг ${formatMoney(item.total)}` : "Термін оплати минув" };
    case "newLeads":
      return { ...base, title, count: item.count, text: "З форм сайту, ще не опрацьовані" };
    case "outboxPending":
      // With a working mail service the queue empties by itself.
      if (item.providerReady === true) return null;
      return {
        ...base,
        title,
        count: item.count,
        text: item.providerReady === false ? "Сервіс надсилання не підключено" : "Чекають на надсилання",
      };
    default:
      return null;
  }
}

function QuietLinks({ items }: { items: AttentionItem[] }) {
  const shown = QUIET.map((key) => items.find((item) => item.key === key)).filter(
    (item): item is AttentionItem => item !== undefined && item.count > 0,
  );
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-stroke-subtle px-5 py-3.5 min-[1024px]:px-6">
      <span className={cx(TEXT.caption, "mr-1")}>Також:</span>
      {shown.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cx(
            "inline-flex h-8 items-center gap-2 rounded-full bg-bg-subtle pl-3.5 pr-1 text-[13px] font-medium leading-[18px] text-neutral-800 hover:bg-[#e8e8e9] motion-reduce:transition-none",
            COLOR_TRANSITION,
            FOCUS_RING,
          )}
        >
          {ATTENTION_META[item.key].label}
          <CountBadge value={item.count} tone="neutral" max={999} />
        </Link>
      ))}
    </div>
  );
}

export function AttentionBlock({ items }: { items: AttentionItem[] }) {
  const rows = URGENT.map((key) => items.find((item) => item.key === key))
    .map((item) => (item ? rowOf(item) : null))
    .filter((row): row is Row => row !== null);

  return (
    <PageSection title="Потребує уваги">
      <Card padding="none">
        {rows.length > 0 ? (
          <ul className="grid grid-cols-1 gap-x-2 gap-y-0.5 p-2 min-[640px]:grid-cols-2 min-[1024px]:p-3 2xl:grid-cols-3">
            {rows.map((row) => {
              const Glyph = row.icon;
              return (
                <li key={row.key} className="min-w-0">
                  <AttentionRow icon={<Glyph />} title={row.title} text={row.text} count={row.count} href={row.href} tone="neutral" />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="flex items-center gap-3 px-5 py-4 min-[1024px]:px-6">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: TONES.green.bg, color: TONES.green.text }}
            >
              <CheckIcon className="size-4" strokeWidth={2.2} />
            </span>
            <span className={TEXT.bodyStrong}>Усе опрацьовано</span>
            <span className={cx(TEXT.muted, "max-[639px]:hidden")}>Нічого не чекає на вашу дію</span>
          </p>
        )}
        <QuietLinks items={items} />
      </Card>
    </PageSection>
  );
}

// The block while the answer loads: three rows of the same shape.
export function AttentionSkeleton() {
  return (
    <PageSection title="Потребує уваги">
      <Card padding="none">
        <div className="grid grid-cols-1 gap-x-2 gap-y-0.5 p-2 min-[640px]:grid-cols-2 min-[1024px]:p-3 2xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className={cx("flex items-center gap-3 px-3 py-2.5", index === 2 && "max-[639px]:hidden")}>
              <Skeleton shape="tile" className="size-10 rounded-xl" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </span>
              <Skeleton shape="pill" className="h-6 w-8" />
            </div>
          ))}
        </div>
      </Card>
    </PageSection>
  );
}
