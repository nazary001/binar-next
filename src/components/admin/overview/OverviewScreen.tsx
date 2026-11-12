"use client";

import { InformationCircleIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Permission } from "../lib/permissions";
import { useAdminQuery } from "../lib/query";
import { cx, formatDate } from "../lib/format";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Page, PageHeader } from "../ui/Page";
import { NativeSelect } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { Tabs } from "../ui/Tabs";
import { TEXT } from "../ui/tokens";
import { AttentionBlock, AttentionSkeleton } from "./AttentionBlock";
import { KpiSkeleton, KpiTiles, type KpiKey } from "./KpiTiles";
import { RankSkeleton, RecentLeads, RecentOrders, TopCompanies, TopProducts } from "./Lists";
import { SalesCharts, SalesChartsSkeleton } from "./SalesCharts";
import { PERIOD_RUN, PERIOD_SPAN, parsePeriod } from "./shared";
import {
  DEFAULT_OVERVIEW_PERIOD,
  OVERVIEW_LIMITS,
  OVERVIEW_PERIODS,
  OVERVIEW_PERIOD_LABELS,
  type OverviewData,
  type OverviewPeriod,
  type OverviewResponse,
} from "./types";

// The overview (the dashboard), the first screen staff see. It answers, in
// this order: what needs me now (the attention block), how sales are going
// (key figures and charts), what happened lately (recent orders, best
// products and companies, recent form submissions).
//
// One request per period (GET /api/admin/overview?period=). The period
// lives in the address bar (?period=). An address without one starts on
// 30 days; when that answer holds no order and suggests a longer period,
// the screen shows that period instead, decided during render from the
// first answer (no effect), with a quiet note saying so. A period the user
// picks is always written to the address, so the switch happens only once.
//
// The answer leaves out what the role may not see (money needs
// orders.view); a missing block is simply not drawn and the grid closes
// up. While loading, the same layout stands in skeletons, shaped from the
// permissions the role holds.

const PERIOD_ITEMS = OVERVIEW_PERIODS.map((key) => ({ key, label: OVERVIEW_PERIOD_LABELS[key] }));
const PERIOD_OPTIONS = OVERVIEW_PERIODS.map((key) => ({ value: key, label: OVERVIEW_PERIOD_LABELS[key] }));

// Any of these opens at least one counter of the attention block.
const ATTENTION_PERMISSIONS: Permission[] = [
  "orders.view",
  "returns.view",
  "leads.view",
  "catalog.view",
  "content.view",
  "integrations.view",
];

function PeriodSwitch({ value, onChange }: { value: OverviewPeriod; onChange: (period: OverviewPeriod) => void }) {
  return (
    <>
      {/* Five tabs do not fit a phone: there the browser's own picker. */}
      <div className="max-[639px]:hidden">
        <Tabs<OverviewPeriod> label="Період" idBase="overview-period" items={PERIOD_ITEMS} value={value} onChange={onChange} />
      </div>
      <div className="w-full min-[640px]:hidden">
        <NativeSelect<OverviewPeriod> aria-label="Період" value={value} onChange={onChange} options={PERIOD_OPTIONS} />
      </div>
    </>
  );
}

type Sees = { money: boolean; customers: boolean; leads: boolean; attention: boolean };

function Body({ data, onPeriod }: { data: OverviewData; onPeriod: (period: OverviewPeriod) => void }) {
  const hasCompanies = data.topCompanies !== undefined;
  const hasLeads = data.recentLeads !== undefined;
  const pair = hasCompanies && hasLeads;
  const nothing =
    data.attention.length === 0 && Object.keys(data.kpis).length === 0 && !data.series && !data.recentOrders && !hasLeads;
  if (nothing) {
    return (
      <Card padding="none">
        <EmptyState
          icon={<Squares2X2Icon className="size-6" strokeWidth={1.7} />}
          title="Тут поки нічого показати"
          text="Огляд складається з розділів, до яких має доступ ваша роль. Якщо потрібні замовлення, клієнти чи заявки, попросіть адміністратора додати дозвіл."
        />
      </Card>
    );
  }
  return (
    <>
      {data.attention.length > 0 && <AttentionBlock items={data.attention} />}
      <KpiTiles kpis={data.kpis} range={data.range} trend={data.series?.map((point) => point.revenue)} />
      <SalesCharts data={data} onPeriod={onPeriod} />
      {(data.recentOrders || data.topProducts) && (
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-12 xl:gap-4">
          {data.recentOrders && <RecentOrders rows={data.recentOrders} />}
          {data.topProducts && <TopProducts rows={data.topProducts} />}
        </div>
      )}
      {(hasCompanies || hasLeads) && (
        <div className={cx("grid min-w-0 grid-cols-1 items-start gap-6", pair && "min-[1024px]:grid-cols-2 min-[1024px]:gap-4")}>
          {data.topCompanies && <TopCompanies rows={data.topCompanies} />}
          {data.recentLeads && <RecentLeads rows={data.recentLeads} />}
        </div>
      )}
    </>
  );
}

function BodySkeleton({ sees, can }: { sees: Sees; can: (permission: Permission) => boolean }) {
  const kpis: KpiKey[] = [
    ...(sees.money ? (["revenue", "orders", "averageOrder"] as const) : []),
    ...(sees.customers ? (["newCustomers"] as const) : []),
    ...(sees.leads ? (["newLeads"] as const) : []),
  ];
  const companies = sees.money && sees.customers;
  return (
    <>
      {sees.attention && <AttentionSkeleton />}
      <KpiSkeleton keys={kpis} />
      {sees.money && <SalesChartsSkeleton />}
      {sees.money && (
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-12 xl:gap-4">
          <RecentOrders rows={undefined} />
          <RankSkeleton title="Топ товарів" rows={OVERVIEW_LIMITS.topProducts} action={can("catalog.view")} className="xl:col-span-4" />
        </div>
      )}
      {(companies || sees.leads) && (
        <div className={cx("grid min-w-0 grid-cols-1 items-start gap-6", companies && sees.leads && "min-[1024px]:grid-cols-2 min-[1024px]:gap-4")}>
          {companies && <RankSkeleton title="Топ компаній" rows={3} />}
          {sees.leads && <RankSkeleton title="Останні заявки" rows={3} />}
        </div>
      )}
    </>
  );
}

export function OverviewScreen() {
  const { can } = useStaff();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const asked = parsePeriod(search.get("period"));
  const base = asked ?? DEFAULT_OVERVIEW_PERIOD;
  const first = useAdminQuery<OverviewResponse>(`/overview?period=${base}`);
  const firstAnswer = first.data?.overview;
  // Only an address without a period may move to the suggested one, and
  // only on the answer of its own period (not a stale one of another).
  const suggested =
    asked === null &&
    firstAnswer?.range.period === base &&
    firstAnswer.hasData === false &&
    firstAnswer.suggestedPeriod &&
    firstAnswer.suggestedPeriod !== base
      ? firstAnswer.suggestedPeriod
      : null;
  const second = useAdminQuery<OverviewResponse>(suggested ? `/overview?period=${suggested}` : null);
  const query = suggested ? second : first;
  const period = suggested ?? base;
  const data = query.data?.overview;

  const sees: Sees = {
    money: can("orders.view"),
    customers: can("customers.view"),
    leads: can("leads.view"),
    attention: can(ATTENTION_PERMISSIONS),
  };
  // Without any figure that depends on the period, the switch would do nothing.
  const timed = data ? Object.keys(data.kpis).length > 0 : sees.money || sees.customers || sees.leads;

  const choose = (next: OverviewPeriod) => {
    const params = new URLSearchParams(search.toString());
    // Written even for the default, so a chosen period is never replaced
    // by a suggestion.
    params.set("period", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const current = data && data.range.period === period ? data : undefined;
  // The range of the shown answer; a bar while it loads; nothing when the
  // request failed (the error panel below says so).
  const subtitle = !timed ? undefined : current ? (
    `з ${formatDate(current.range.from)} по ${formatDate(current.range.to)}`
  ) : query.error ? undefined : (
    <Skeleton className="mt-1.5 h-3.5 w-48" />
  );

  return (
    <Page>
      <PageHeader
        title="Огляд"
        light={timed ? PERIOD_RUN[period] : undefined}
        subtitle={subtitle}
        actions={timed ? <PeriodSwitch value={period} onChange={choose} /> : undefined}
      />

      {suggested && (
        <p className={cx(TEXT.muted, "-mt-1 mb-5 flex items-start gap-2 min-[1024px]:mb-6")}>
          <InformationCircleIcon aria-hidden className="mt-px size-[18px] shrink-0 text-neutral-400" strokeWidth={1.7} />
          {`За останні ${PERIOD_SPAN[base]} замовлень не було, показуємо за ${PERIOD_SPAN[suggested]}`}
        </p>
      )}

      {query.error && data && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white px-4 py-3">
          <span className={TEXT.body}>Не вдалося оновити дані: показано останні отримані.</span>
          <Button variant="ghost" size="sm" onClick={query.reload}>
            Спробувати ще раз
          </Button>
        </div>
      )}

      <div
        aria-busy={(query.stale && !query.error) || undefined}
        className={cx(
          "flex min-w-0 flex-col gap-6 transition-opacity duration-200 motion-reduce:transition-none min-[1024px]:gap-8",
          query.stale && "opacity-60",
        )}
      >
        {data ? (
          <Body data={data} onPeriod={choose} />
        ) : query.error ? (
          <Card padding="none">
            <ErrorState failure={query.error} onRetry={query.reload} />
          </Card>
        ) : (
          <BodySkeleton sees={sees} can={can} />
        )}
      </div>
    </Page>
  );
}
