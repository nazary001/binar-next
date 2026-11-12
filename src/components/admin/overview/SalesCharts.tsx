"use client";

import { ChartBarIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { countOf, formatMoney, formatNumber, plural } from "../lib/format";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { AreaChart } from "../ui/charts/AreaChart";
import { DonutChart } from "../ui/charts/DonutChart";
import { formatPercent } from "../ui/charts/scale";
import { PageSection } from "../ui/Page";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/States";
import { ORDER_STATUS } from "../ui/status";
import { Tabs } from "../ui/Tabs";
import { TONES } from "../ui/tokens";
import { PERIOD_SPAN, formatBucket, shareOf } from "./shared";
import {
  OVERVIEW_CHANNEL_LABELS,
  type OverviewChannel,
  type OverviewChannelRow,
  type OverviewData,
  type OverviewPeriod,
  type OverviewSeriesPoint,
  type OverviewStatusRow,
} from "./types";

// "Динаміка продажів" (revenue or order count per day or month, partners
// and retail stacked, so the top edge is the total) and "Замовлення за
// статусами" (a donut in the badge colours of the statuses).
//
// Colours follow the entity, as everywhere in the panel: partners are the
// indigo of the "Партнер" badge, retail the ink; the brand orange is kept
// for the attention block. Statuses take the dot colour of their badge.

type Measure = "revenue" | "orders";

const MEASURES: { key: Measure; label: string }[] = [
  { key: "revenue", label: "Виручка" },
  { key: "orders", label: "Кількість замовлень" },
];

const CHANNEL_COLOR: Record<OverviewChannel, string> = {
  b2b: TONES.indigo.dot,
  retail: "#1d1d1f",
};

const CHART_HEIGHT = 300;

const money = (value: number) => formatMoney(value, { whole: true });

function valueOf(point: OverviewSeriesPoint, channel: OverviewChannel, measure: Measure): number {
  if (measure === "revenue") return channel === "b2b" ? point.b2b : point.retail;
  return channel === "b2b" ? point.b2bOrders : point.retailOrders;
}

// Under the chart: what each channel brought over the whole period.
function ChannelSummary({ rows, measure }: { rows: OverviewChannelRow[]; measure: Measure }) {
  const whole = rows.reduce((sum, row) => sum + (measure === "revenue" ? row.total : row.count), 0);
  return (
    <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-stroke-subtle pt-4">
      {rows.map((row) => {
        const part = measure === "revenue" ? row.total : row.count;
        return (
          <div key={row.channel} className="flex min-w-0 flex-col gap-1">
            <dt className="flex items-center gap-2 text-[13px] font-medium leading-[18px] text-neutral-500">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: CHANNEL_COLOR[row.channel] }} />
              {OVERVIEW_CHANNEL_LABELS[row.channel]}
            </dt>
            <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[18px] font-bold leading-6 tracking-[-0.01em] text-neutral-900 tabular-nums">
                {measure === "revenue" ? money(part) : formatNumber(part)}
              </span>
              <span className="text-[13px] leading-[18px] text-neutral-500 tabular-nums">
                {measure === "revenue"
                  ? `${countOf(row.count, ["замовлення", "замовлення", "замовлень"])}, ${formatPercent(Math.round(shareOf(part, whole) * 10) / 10)}`
                  : formatPercent(Math.round(shareOf(part, whole) * 10) / 10)}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function NoOrders({
  period,
  suggested,
  onPeriod,
}: {
  period: OverviewPeriod;
  suggested: OverviewPeriod | null | undefined;
  onPeriod: (period: OverviewPeriod) => void;
}) {
  const other = suggested && suggested !== period ? suggested : period !== "all" ? "all" : null;
  return (
    <EmptyState
      icon={<ChartBarIcon className="size-6" strokeWidth={1.7} />}
      title={period === "all" ? "Замовлень ще немає" : `За ${PERIOD_SPAN[period]} замовлень немає`}
      text={
        period === "all"
          ? "Графік з'явиться, щойно надійде перше замовлення."
          : "Графік з'явиться, щойно в цьому періоді будуть замовлення."
      }
      action={
        other ? (
          <Button variant="secondary" size="sm" onClick={() => onPeriod(other)}>
            {`Показати за ${PERIOD_SPAN[other]}`}
          </Button>
        ) : undefined
      }
      className="min-h-[300px]"
    />
  );
}

function SalesChart({ data, onPeriod }: { data: OverviewData; onPeriod: (period: OverviewPeriod) => void }) {
  const [measure, setMeasure] = useState<Measure>("revenue");
  const series = data.series ?? [];
  const channels = data.byChannel ?? [];
  const empty = series.every((point) => point.orders === 0);
  const bucket = data.range.bucket;
  const chartData = series.map((point) => ({
    x: point.x,
    b2b: valueOf(point, "b2b", measure),
    retail: valueOf(point, "retail", measure),
  }));
  const unit = bucket === "month" ? "по місяцях" : "по днях";

  return (
    <PageSection
      title="Динаміка продажів"
      description={`Партнери й роздріб, ${unit}`}
      actions={
        empty ? undefined : (
          <Tabs<Measure> label="Що показати на графіку" idBase="overview-measure" size="sm" items={MEASURES} value={measure} onChange={setMeasure} />
        )
      }
      className="min-w-0 xl:col-span-8"
    >
      <Card className="flex-1">
        {empty ? (
          <NoOrders period={data.range.period} suggested={data.suggestedPeriod} onPeriod={onPeriod} />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <AreaChart
              label={measure === "revenue" ? "Виручка партнерів і роздрібу" : "Кількість замовлень партнерів і роздрібу"}
              xLabel={bucket === "month" ? "Місяць" : "День"}
              data={chartData}
              series={[
                { key: "b2b", label: OVERVIEW_CHANNEL_LABELS.b2b, color: CHANNEL_COLOR.b2b },
                { key: "retail", label: OVERVIEW_CHANNEL_LABELS.retail, color: CHANNEL_COLOR.retail },
              ]}
              stacked
              height={CHART_HEIGHT}
              formatX={(x) => formatBucket(x, bucket)}
              formatValue={(value) => (measure === "revenue" ? money(value) : formatNumber(value))}
            />
            <ChannelSummary rows={channels} measure={measure} />
          </div>
        )}
      </Card>
    </PageSection>
  );
}

function statusMeta(status: string): { label: string; color: string } {
  const meta = (ORDER_STATUS as Record<string, { label: string; tone: keyof typeof TONES } | undefined>)[status];
  return meta ? { label: meta.label, color: TONES[meta.tone].dot } : { label: status || "Без статусу", color: TONES.neutral.dot };
}

function StatusDonut({ rows }: { rows: OverviewStatusRow[] }) {
  const shown = rows.filter((row) => row.count > 0);
  const total = shown.reduce((sum, row) => sum + row.count, 0);
  return (
    <PageSection title="Замовлення за статусами" description="Усі за період, разом зі скасованими" className="min-w-0 xl:col-span-4">
      <Card className="flex-1">
        {total === 0 ? (
          <EmptyState title="Замовлень немає" text="Тут буде видно, скільки замовлень у кожному статусі." className="min-h-[300px]" />
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <DonutChart
              label="Замовлення періоду за статусами"
              size={168}
              data={shown.map((row) => {
                const meta = statusMeta(row.status);
                return { label: meta.label, value: row.count, color: meta.color };
              })}
              centerValue={formatNumber(total)}
              centerLabel={plural(total, ["замовлення", "замовлення", "замовлень"])}
              className="xl:flex-col! xl:gap-5!"
            />
          </div>
        )}
      </Card>
    </PageSection>
  );
}

// The two charts side by side from 1280 px, stacked below.
export function SalesCharts({ data, onPeriod }: { data: OverviewData; onPeriod: (period: OverviewPeriod) => void }) {
  if (!data.series) return null;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-4">
      <SalesChart data={data} onPeriod={onPeriod} />
      <StatusDonut rows={data.byStatus ?? []} />
    </div>
  );
}

export function SalesChartsSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-4">
      <PageSection title="Динаміка продажів" description="Партнери й роздріб" className="min-w-0 xl:col-span-8">
        <Card className="flex-1">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton shape="tile" className="h-[300px] w-full" />
            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-stroke-subtle pt-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </Card>
      </PageSection>
      <PageSection title="Замовлення за статусами" description="Усі за період, разом зі скасованими" className="min-w-0 xl:col-span-4">
        <Card className="flex-1">
          <div className="flex flex-col items-center gap-5 min-[640px]:flex-row xl:flex-col">
            <Skeleton shape="circle" className="size-[168px] shrink-0" />
            <div className="flex w-full flex-col gap-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </PageSection>
    </div>
  );
}

