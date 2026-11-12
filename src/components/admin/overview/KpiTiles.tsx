"use client";

import { BanknotesIcon, CalculatorIcon, InboxArrowDownIcon, ShoppingBagIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { cx, formatMoney, formatNumber } from "../lib/format";
import { StatCard } from "../ui/Card";
import { Sparkline } from "../ui/charts/Sparkline";
import { PageSection } from "../ui/Page";
import { PERIOD_RUN, PREVIOUS_SPAN, deltaOf, leadsHref, ordersHref } from "./shared";
import type { KpiFigure, OverviewKpis, OverviewRange } from "./types";

// The key figures of the period: revenue on the dark tile, then orders,
// the average check, new customers and new form submissions, each with
// the change against the period before (none for "all time"). A figure the
// role may not see is absent from the answer and its tile is not drawn:
// the grid is chosen by how many tiles there are, so it always closes up.

export type KpiKey = keyof OverviewKpis;

export const KPI_ORDER: KpiKey[] = ["revenue", "orders", "averageOrder", "newCustomers", "newLeads"];

type Spec = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  money: boolean;
  href?: (range: OverviewRange | null) => string;
};

const SPECS: Record<KpiKey, Spec> = {
  revenue: { label: "Виручка", icon: BanknotesIcon, money: true, href: (range) => periodOrders(range) },
  orders: { label: "Замовлення", icon: ShoppingBagIcon, money: false, href: (range) => periodOrders(range) },
  averageOrder: { label: "Середній чек", icon: CalculatorIcon, money: true },
  newCustomers: { label: "Нові клієнти", icon: UserPlusIcon, money: false, href: () => "/admin/customers" },
  newLeads: {
    label: "Нові заявки",
    icon: InboxArrowDownIcon,
    money: false,
    href: (range) => (range && range.period !== "all" ? leadsHref(range.from, range.to) : leadsHref()),
  },
};

// The orders list filtered to the period (business days, as the KPIs).
function periodOrders(range: OverviewRange | null): string {
  return range && range.period !== "all" ? ordersHref(range.from, range.to) : ordersHref();
}

// Whole literal classes per number of tiles (phones first, then from
// 1280 px). The revenue tile, always first when present, spans the row on
// phones; a lone last tile does too, so no row is left half empty.
const GRID: Record<number, string> = {
  1: "grid-cols-2 xl:grid-cols-4",
  2: "grid-cols-2 xl:grid-cols-4",
  3: "grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-2 xl:grid-cols-4",
  5: "grid-cols-2 xl:grid-cols-3",
};

function spanOf(key: KpiKey, index: number, count: number): string | undefined {
  if (key === "revenue") {
    if (count === 5) return "col-span-2";
    return count >= 3 ? "col-span-2 xl:col-span-1" : undefined;
  }
  if (count === 4 && index === 3) return "col-span-2 xl:col-span-1";
  return undefined;
}

function format(value: number, money: boolean): string {
  return money ? formatMoney(value, { whole: true }) : formatNumber(value);
}

// Half-width tiles on a phone get a smaller figure, so "14 320 ₴" fits a
// 360-px screen without breaking.
function Figure({ text, compact }: { text: string; compact: boolean }) {
  return <span className={cx(compact && "max-[639px]:text-[24px] max-[639px]:leading-8")}>{text}</span>;
}

function hintOf(figure: KpiFigure, spec: Spec, range: OverviewRange): ReactNode {
  if (range.period === "all" || figure.previous === null) return undefined;
  // The figure never breaks inside ("0 ₴" stays on one line in a narrow tile).
  return (
    <>
      {PREVIOUS_SPAN[range.period]}: <span className="whitespace-nowrap">{format(figure.previous, spec.money)}</span>
    </>
  );
}

// `trend`: revenue per chart point, drawn as a white line on the revenue
// tile when the tile is wide (all five figures, from 640 px).
export function KpiTiles({ kpis, range, trend }: { kpis: OverviewKpis; range: OverviewRange; trend?: number[] }) {
  const keys = KPI_ORDER.filter((key) => kpis[key] !== undefined);
  if (keys.length === 0) return null;
  const line = keys.length === 5 && trend && trend.length > 1 && trend.some((value) => value > 0) ? trend : null;
  return (
    <PageSection title="Показники">
      <div className={cx("grid min-w-0 gap-3 min-[640px]:gap-4", GRID[keys.length])}>
        {keys.map((key, index) => {
          const figure = kpis[key] as KpiFigure;
          const spec = SPECS[key];
          const Glyph = spec.icon;
          const delta = deltaOf(figure);
          const span = spanOf(key, index, keys.length);
          const tile = (
            <StatCard
              key={key}
              tone={key === "revenue" ? "dark" : "white"}
              label={spec.label}
              value={<Figure text={format(figure.value, spec.money)} compact={span === undefined} />}
              delta={delta === null ? undefined : { value: Math.round(delta * 10) / 10 }}
              hint={hintOf(figure, spec, range)}
              icon={<Glyph />}
              href={spec.href?.(range)}
              className={key === "revenue" && line ? "h-full" : span}
            />
          );
          if (key !== "revenue" || !line) return tile;
          // The tile is a link: the line lies over it without catching the pointer.
          return (
            <div key={key} className={cx("relative min-w-0", span)}>
              {tile}
              <Sparkline
                values={line}
                width={240}
                height={72}
                color="#ffffff"
                label={`Виручка ${PERIOD_RUN[range.period]}, ${range.bucket === "month" ? "по місяцях" : "по днях"}`}
                className="pointer-events-none absolute right-6 bottom-6 max-[639px]:hidden"
              />
            </div>
          );
        })}
      </div>
    </PageSection>
  );
}

// The tiles while the answer loads, for the figures the role will get.
export function KpiSkeleton({ keys }: { keys: KpiKey[] }) {
  if (keys.length === 0) return null;
  return (
    <PageSection title="Показники">
      <div className={cx("grid min-w-0 gap-3 min-[640px]:gap-4", GRID[keys.length])}>
        {keys.map((key, index) => {
          const spec = SPECS[key];
          const Glyph = spec.icon;
          return (
            <StatCard
              key={key}
              tone={key === "revenue" ? "dark" : "white"}
              label={spec.label}
              value=""
              icon={<Glyph />}
              loading
              className={spanOf(key, index, keys.length)}
            />
          );
        })}
      </div>
    </PageSection>
  );
}
