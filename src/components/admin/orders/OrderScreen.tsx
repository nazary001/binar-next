"use client";

import { formatDate, formatDateTime, kyivDay } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Card } from "../ui/Card";
import { Page, PageHeader } from "../ui/Page";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState, NotFoundState } from "../ui/States";
import { ChannelBadge, OrderStatusBadge } from "../ui/status";
import { TEXT } from "../ui/tokens";
import { DocumentsCard } from "./DocumentsCard";
import { ManagerControl, PaymentButton, StatusMenu } from "./OrderActions";
import { CancelRequestBanner, CheckoutCard, DeliveryCard, ItemsCard } from "./OrderBlocks";
import { HistoryCard } from "./OrderHistory";
import { ClientCard, ErpCard, NotesCard, PaymentCard, ReturnsCard } from "./OrderSide";
import { orderKey, refreshOrderViews, useOrdersBackHref } from "./shared";
import type { OrderAnswer } from "./types";

// /admin/orders/<id>: one order of either channel. A wide left column
// (the cancel request, goods, delivery, documents, checkout form) and a
// narrow right one (customer, payment, BAS, notes, history) from 1280 px;
// one column below that.

// The two columns: the right one keeps a readable width, the left takes
// the rest.
const COLUMNS = "grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] min-[1024px]:gap-6";

function LoadingOrder({ back }: { back: string }) {
  return (
    <Page>
      <PageHeader title="Замовлення" back={{ href: back, label: "До списку замовлень" }} meta={<Skeleton shape="pill" className="h-7 w-48" />} />
      <div className={COLUMNS}>
        <div className="flex min-w-0 flex-col gap-4 min-[1024px]:gap-6">
          <Card title="Товари">
            <SkeletonText lines={5} />
          </Card>
          <Card title="Доставка">
            <SkeletonText lines={3} />
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-4 min-[1024px]:gap-6">
          <Card title="Клієнт">
            <SkeletonText lines={4} />
          </Card>
          <Card title="Оплата">
            <SkeletonText lines={3} />
          </Card>
        </div>
      </div>
    </Page>
  );
}

export function OrderScreen({ id }: { id: string }) {
  const { can } = useStaff();
  const back = useOrdersBackHref();
  const query = useAdminQuery<OrderAnswer>(orderKey(id));
  // While another order's answer is still on screen (navigating between
  // orders), show the skeleton rather than the wrong order.
  const order = query.data?.order.id === id ? query.data.order : null;

  if (!order) {
    if (query.error?.status === 404 || query.error?.error === "not-found") {
      return (
        <Page>
          <PageHeader title="Замовлення" light={`№${id}`} back={{ href: back, label: "До списку замовлень" }} />
          <Card padding="none">
            <NotFoundState
              title="Замовлення не знайдено"
              text="Можливо, номер у посиланні неточний або замовлення видалили."
              backHref="/admin/orders"
              backLabel="До списку замовлень"
            />
          </Card>
        </Page>
      );
    }
    if (query.error) {
      return (
        <Page>
          <PageHeader title="Замовлення" light={`№${id}`} back={{ href: back, label: "До списку замовлень" }} />
          <Card padding="none">
            <ErrorState failure={query.error} onRetry={query.reload} />
          </Card>
        </Page>
      );
    }
    return <LoadingOrder back={back} />;
  }

  const editor = can("orders.edit");
  const reload = () => {
    query.reload();
    refreshOrderViews();
  };

  return (
    <Page>
      <PageHeader
        title="Замовлення"
        light={`№${order.number}`}
        back={{ href: back, label: "До списку замовлень" }}
        meta={
          <>
            <OrderStatusBadge status={order.status} size="md" />
            <ChannelBadge channel={order.channel} size="md" />
            {kyivDay(order.createdAt) === order.date ? (
              <span className={TEXT.muted}>
                від <span className="tabular-nums">{formatDateTime(order.createdAt)}</span>
              </span>
            ) : (
              <>
                {/* A partner's order carries the company's own day (a demo
                    company lives on a fixed one): both are shown then. */}
                <span className={TEXT.muted}>
                  від <span className="tabular-nums">{formatDate(order.date)}</span>
                </span>
                <span className={TEXT.caption}>
                  надійшло <span className="tabular-nums">{formatDateTime(order.createdAt)}</span>
                </span>
              </>
            )}
            {!editor && order.manager && <span className={TEXT.muted}>Менеджер: {order.manager.name}</span>}
          </>
        }
        actions={
          editor ? (
            <>
              <ManagerControl order={order} />
              <PaymentButton order={order} />
              <StatusMenu order={order} />
            </>
          ) : undefined
        }
      />

      <div className={COLUMNS}>
        <div className="flex min-w-0 flex-col gap-4 min-[1024px]:gap-6">
          <CancelRequestBanner order={order} canEdit={editor} />
          <ItemsCard order={order} />
          <DeliveryCard order={order} canShip={can("shipping.edit")} onShipmentChanged={reload} />
          <DocumentsCard order={order} canEdit={editor} />
          <CheckoutCard order={order} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 min-[1024px]:gap-6">
          <ClientCard order={order} />
          <ReturnsCard order={order} />
          <PaymentCard order={order} />
          <ErpCard order={order} />
          <NotesCard order={order} canEdit={editor} />
          <HistoryCard order={order} />
        </div>
      </div>
    </Page>
  );
}
