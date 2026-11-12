"use client";

/* eslint-disable @next/next/no-img-element */

import { ChevronRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import type { ReactNode } from "react";
import { countOf, cx, formatDate, formatDateTime, formatMoney, formatNumber, formatRelative } from "../lib/format";
import { useStaff } from "../shell/StaffProvider";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { DataTable, MoneyCell, type Column } from "../ui/DataTable";
import { PageSection } from "../ui/Page";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/States";
import { CHANNEL, LEAD_KIND, LeadStatusBadge, OrderStatusBadge, statusLabel, type LeadStatus, type OrderStatus } from "../ui/status";
import { COLOR_TRANSITION, FOCUS_RING_INSET, TEXT } from "../ui/tokens";
import { shareOf } from "./shared";
import type { OverviewRecentLead, OverviewRecentOrder, OverviewTopCompany, OverviewTopProduct } from "./types";
import { useNow } from "./useNow";

// "What happened lately": the newest orders, the best products and
// companies of the period, and the newest form submissions. Each block is
// rendered only when the answer carries it (the role may see it).

function AllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button variant="ghost" size="sm" href={href} iconRight={ChevronRightIcon}>
      {children}
    </Button>
  );
}

// --- recent orders ------------------------------------------------------------

const ORDER_COLUMNS: Column<OverviewRecentOrder>[] = [
  {
    // On a phone the customer column is hidden and its name moves under the
    // number; the column then takes the free room. The number itself never
    // truncates; the second line is sized to the column (w-0 min-w-full), so
    // a long company name cannot widen the table past the card.
    key: "number",
    header: "Номер",
    className: "w-32 max-[639px]:w-full",
    cell: (order) => (
      <span className="block">
        <span className="block whitespace-nowrap font-semibold text-neutral-900">{`№${order.number}`}</span>
        <span className={cx(TEXT.caption, "block w-0 min-w-full truncate")}>
          <span className="min-[640px]:hidden">{order.customer || statusLabel(CHANNEL, order.channel)}</span>
          <span className="max-[639px]:hidden">{statusLabel(CHANNEL, order.channel)}</span>
        </span>
      </span>
    ),
  },
  {
    key: "date",
    header: "Дата",
    width: 112,
    hideBelow: 640,
    cell: (order) => <span className="whitespace-nowrap tabular-nums">{formatDate(order.date)}</span>,
  },
  {
    // Takes whatever room is left and truncates in it (max-w-0 lets the
    // cell shrink below its text), so the sum and the status never leave
    // the card when the table shares a row with the top products.
    key: "customer",
    header: "Клієнт",
    hideBelow: 640,
    width: "100%",
    className: "max-w-0",
    cell: (order) => (
      <span className="block truncate" title={order.customer || undefined}>
        {order.customer || "-"}
      </span>
    ),
  },
  {
    // Whole hryvnias on a phone: the kopecks would push the status out of
    // the card at 390 px.
    key: "total",
    header: "Сума",
    align: "right",
    cell: (order) => (
      <>
        <span className="max-[639px]:hidden">
          <MoneyCell value={order.total} />
        </span>
        <span className="min-[640px]:hidden">
          <MoneyCell value={order.total} whole />
        </span>
      </>
    ),
  },
  { key: "status", header: "Статус", cell: (order) => <OrderStatusBadge status={order.status as OrderStatus} /> },
];

export function RecentOrders({ rows }: { rows: OverviewRecentOrder[] | undefined }) {
  return (
    <PageSection title="Останні замовлення" actions={<AllLink href="/admin/orders">Усі замовлення</AllLink>} className="min-w-0 xl:col-span-8">
      <DataTable
        caption="Останні замовлення"
        dense
        columns={ORDER_COLUMNS}
        rows={rows}
        rowKey={(order) => order.id}
        loading={rows === undefined}
        rowHref={(order) => `/admin/orders/${encodeURIComponent(order.id)}`}
        empty={<EmptyState title="Замовлень ще немає" text={"Нові замовлення з'являться тут, щойно клієнт оформить їх на сайті або в кабінеті."} />}
      />
    </PageSection>
  );
}

// --- ranked lists ---------------------------------------------------------------

// One row of a ranked list: a picture, two lines, the figure on the right
// and a thin bar of the figure against the best one (the length carries
// the comparison, the number the exact value).
function RankRow({
  href,
  media,
  title,
  subtitle,
  value,
  share,
}: {
  href?: string;
  media: ReactNode;
  title: string;
  subtitle: string;
  value: string;
  share: number;
}) {
  const body = (
    <>
      {media}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cx(TEXT.bodyStrong, "min-w-0 truncate")}>{title}</span>
          <span className="shrink-0 text-[14px] font-semibold leading-5 text-neutral-900 tabular-nums">{value}</span>
        </span>
        <span className={cx(TEXT.caption, "mt-0.5 truncate tabular-nums")}>{subtitle}</span>
        <span aria-hidden className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-[#ececed]">
          <span className="block h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(2, Math.min(100, share))}%` }} />
        </span>
      </span>
    </>
  );
  const row = "flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5";
  return (
    <li className="min-w-0">
      {href ? (
        <Link href={href} className={cx(row, "hover:bg-bg-subtle motion-reduce:transition-none", COLOR_TRANSITION, FOCUS_RING_INSET)}>
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}

function Thumb({ src }: { src: string }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className="size-10 shrink-0 rounded-xl bg-bg-subtle object-cover" />
  ) : (
    <span aria-hidden className="size-10 shrink-0 rounded-xl bg-bg-cabinet" />
  );
}

export function TopProducts({ rows }: { rows: OverviewTopProduct[] }) {
  const { can } = useStaff();
  const best = rows[0]?.revenue ?? 0;
  return (
    <PageSection
      title="Топ товарів"
      actions={can("catalog.view") ? <AllLink href="/admin/products">Усі товари</AllLink> : undefined}
      className="min-w-0 xl:col-span-4"
    >
      <Card padding="none" className="flex-1">
        {rows.length === 0 ? (
          <EmptyState title="Продажів за період немає" text="Тут будуть товари, які принесли найбільше виручки." />
        ) : (
          <ol className="flex flex-col p-2" aria-label="Товари з найбільшою виручкою">
            {rows.map((product) => (
              <RankRow
                key={product.productId}
                href={can("catalog.view") ? `/admin/products/${encodeURIComponent(product.productId)}` : undefined}
                media={<Thumb src={product.image} />}
                title={product.name}
                subtitle={`Кількість: ${formatNumber(product.qty)}`}
                value={formatMoney(product.revenue, { whole: true })}
                share={shareOf(product.revenue, best)}
              />
            ))}
          </ol>
        )}
      </Card>
    </PageSection>
  );
}

export function TopCompanies({ rows, className }: { rows: OverviewTopCompany[]; className?: string }) {
  const best = rows[0]?.revenue ?? 0;
  return (
    <PageSection title="Топ компаній" actions={<AllLink href="/admin/companies">Усі компанії</AllLink>} className={cx("min-w-0", className)}>
      <Card padding="none" className="flex-1">
        {rows.length === 0 ? (
          <EmptyState title="Замовлень від партнерів немає" text="Тут будуть компанії, які замовили найбільше за період." />
        ) : (
          <ol className="flex flex-col p-2" aria-label="Компанії з найбільшою виручкою">
            {rows.map((company) => (
              <RankRow
                key={company.clientId}
                href={`/admin/companies/${encodeURIComponent(company.clientId)}`}
                media={<Avatar name={company.name} size="lg" decorative />}
                title={company.name}
                subtitle={countOf(company.orders, ["замовлення", "замовлення", "замовлень"])}
                value={formatMoney(company.revenue, { whole: true })}
                share={shareOf(company.revenue, best)}
              />
            ))}
          </ol>
        )}
      </Card>
    </PageSection>
  );
}

// --- recent leads -------------------------------------------------------------------

export function RecentLeads({ rows, className }: { rows: OverviewRecentLead[]; className?: string }) {
  const now = useNow();
  return (
    <PageSection title="Останні заявки" actions={<AllLink href="/admin/leads">Усі заявки</AllLink>} className={cx("min-w-0", className)}>
      <Card padding="none" className="flex-1">
        {rows.length === 0 ? (
          <EmptyState title="Заявок ще немає" text="Тут з'являться звернення з форм сайту: квіз, чеклист і запити на співпрацю." />
        ) : (
          <ul className="flex flex-col p-2">
            {rows.map((lead) => (
              <li key={lead.id} className="min-w-0">
                <Link
                  href={`/admin/leads?id=${encodeURIComponent(lead.id)}`}
                  className={cx(
                    "flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-bg-subtle motion-reduce:transition-none",
                    COLOR_TRANSITION,
                    FOCUS_RING_INSET,
                  )}
                >
                  <Avatar name={lead.name || "?"} size="lg" decorative />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cx(TEXT.bodyStrong, "truncate", !lead.name && "text-neutral-500")}>{lead.name || "Без імені"}</span>
                    <span className={cx(TEXT.caption, "truncate")}>
                      {statusLabel(LEAD_KIND, lead.kind)}, {now > 0 ? formatRelative(lead.createdAt, now) : formatDateTime(lead.createdAt)}
                    </span>
                  </span>
                  <LeadStatusBadge status={lead.status as LeadStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageSection>
  );
}

// --- skeletons --------------------------------------------------------------------------

// `action`: the head has an "Усі ..." link once loaded; a pill of its size
// keeps the card from moving when it arrives.
export function RankSkeleton({ title, rows, action = true, className }: { title: string; rows: number; action?: boolean; className?: string }) {
  return (
    <PageSection
      title={title}
      actions={action ? <Skeleton shape="pill" className="h-8 w-28" /> : undefined}
      className={cx("min-w-0", className)}
    >
      <Card padding="none" className="flex-1">
        <div className="flex flex-col p-2">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton shape="tile" className="size-10 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton shape="pill" className="mt-1 h-1 w-full" />
              </span>
            </div>
          ))}
        </div>
      </Card>
    </PageSection>
  );
}

