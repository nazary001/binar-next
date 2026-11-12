"use client";

import { formatDayMonth, formatMoney } from "../lib/format";
import { AreaChart } from "../ui/charts/AreaChart";
import { BarChart } from "../ui/charts/BarChart";
import { DonutChart } from "../ui/charts/DonutChart";
import { CHART_COLORS } from "../ui/charts/scale";
import { Sparkline } from "../ui/charts/Sparkline";
import { Card } from "../ui/Card";
import { CATEGORIES, WEEKDAYS, WEEKS } from "./demoData";
import { Section } from "./parts";

const money = (value: number) => formatMoney(value, { whole: true });

export function ChartsDemo() {
  const revenue = WEEKS.map((week) => ({ x: week.x, revenue: week.revenue }));
  return (
    <Section id="charts" title="AreaChart, BarChart, DonutChart, Sparkline" file="ui/charts/*" description="Рукописні SVG-графіки: курсор і підказка, стрілки клавіатури, прихована таблиця для екранних читачів.">
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Card title="Виручка за каналами" subtitle="12 тижнів, дві серії, накопичено">
          <AreaChart
            label="Виручка партнерів і роздрібу за 12 тижнів"
            data={WEEKS.map((week) => ({ x: week.x, b2b: week.b2b, retail: week.retail }))}
            series={[
              { key: "b2b", label: "Партнери B2B" },
              { key: "retail", label: "Роздріб" },
            ]}
            stacked
            formatX={(x) => formatDayMonth(x)}
            formatValue={(value) => money(value)}
          />
        </Card>
        <Card title="Виручка" subtitle="Одна серія">
          <AreaChart label="Виручка за 12 тижнів" data={revenue} series={[{ key: "revenue", label: "Виручка" }]} formatX={(x) => formatDayMonth(x)} formatValue={(value) => money(value)} />
        </Card>
        <Card title="Замовлення за днями тижня" subtitle="Стовпці з підписами">
          <BarChart label="Замовлення за днями тижня" data={WEEKDAYS.map((day) => (day.label === "Пт" ? { ...day, color: CHART_COLORS[1] } : day))} />
        </Card>
        <Card title="Топ категорій" subtitle="Горизонтальні смуги">
          <BarChart horizontal label="Топ категорій за виручкою" data={CATEGORIES} formatValue={money} />
        </Card>
        <Card title="Замовлення за каналами" subtitle="Частина від цілого">
          <DonutChart
            label="Замовлення за каналами"
            data={[
              { label: "Партнери B2B", value: 812, color: CHART_COLORS[0] },
              { label: "Роздріб", value: 436, color: CHART_COLORS[1] },
              { label: "Маркетплейси", value: 94, color: CHART_COLORS[2] },
            ]}
            centerValue="1 342"
            centerLabel="замовлень"
          />
        </Card>
        <Card title="Sparkline" subtitle="Тренд у плитці або рядку">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[24px] font-bold tabular-nums">48</span>
              <Sparkline values={[12, 14, 11, 18, 22, 19, 25]} label="Замовлення за 7 днів: від 12 до 25" />
            </div>
            <div className="flex items-center gap-3 rounded-3xl bg-neutral-900 px-5 py-4 text-white">
              <span className="text-[24px] font-bold tabular-nums">1,3 млн</span>
              <Sparkline values={WEEKS.map((week) => week.revenue)} color="#ffffff" />
            </div>
            <Sparkline values={[5, 5, 5, 5]} label="Без змін" />
          </div>
        </Card>
      </div>
    </Section>
  );
}
