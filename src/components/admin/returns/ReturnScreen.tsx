"use client";

import { formatDate, formatDateTime, kyivDay } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Card } from "../ui/Card";
import { Page, PageHeader } from "../ui/Page";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState, NotFoundState } from "../ui/States";
import { ReturnStatusBadge } from "../ui/status";
import { TEXT } from "../ui/tokens";
import { ReturnActions } from "./ReturnActions";
import { LinesCard, ProcessingCard, StateBanner, WishesCard } from "./ReturnBlocks";
import { CompanyCard, HistoryCard, NotesCard, OrderCard } from "./ReturnSide";
import { returnKey, useReturnsBackHref } from "./shared";
import type { ReturnAnswer } from "./types";

// /admin/returns/<id>: one return request of a partner. A wide left column
// (what happened to it, the goods, the partner's wishes, the staff's
// record of the return) and a narrow right one (the order, the company,
// notes, history) from 1280 px; one column below that. The decisions sit
// in the head.

const COLUMNS = "grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] min-[1024px]:gap-6";
const STACK = "flex min-w-0 flex-col gap-4 min-[1024px]:gap-6";
const BACK_LABEL = "До списку повернень";

function LoadingReturn({ id, back }: { id: string; back: string }) {
  return (
    <Page>
      <PageHeader
        title="Повернення"
        light={`№${id}`}
        back={{ href: back, label: BACK_LABEL }}
        meta={<Skeleton shape="pill" className="h-7 w-48" />}
      />
      <div className={COLUMNS}>
        <div className={STACK}>
          <Card title="Товари до повернення">
            <SkeletonText lines={4} />
          </Card>
          <Card title="Побажання клієнта">
            <SkeletonText lines={2} />
          </Card>
        </div>
        <div className={STACK}>
          <Card title="Замовлення">
            <SkeletonText lines={4} />
          </Card>
          <Card title="Компанія">
            <SkeletonText lines={3} />
          </Card>
        </div>
      </div>
    </Page>
  );
}

export function ReturnScreen({ id }: { id: string }) {
  const { can } = useStaff();
  const back = useReturnsBackHref();
  const query = useAdminQuery<ReturnAnswer>(returnKey(id));
  // While another request's answer is still on screen (moving between
  // requests), show the skeleton rather than the wrong request.
  const ret = query.data?.return.id === id ? query.data.return : null;

  if (!ret) {
    if (query.error?.status === 404 || query.error?.error === "not-found") {
      return (
        <Page>
          <PageHeader title="Повернення" light={`№${id}`} back={{ href: back, label: BACK_LABEL }} />
          <Card padding="none">
            <NotFoundState
              title="Заявку не знайдено"
              text="Можливо, номер у посиланні неточний або заявку видалили."
              backHref="/admin/returns"
              backLabel={BACK_LABEL}
            />
          </Card>
        </Page>
      );
    }
    if (query.error) {
      return (
        <Page>
          <PageHeader title="Повернення" light={`№${id}`} back={{ href: back, label: BACK_LABEL }} />
          <Card padding="none">
            <ErrorState failure={query.error} onRetry={query.reload} />
          </Card>
        </Page>
      );
    }
    return <LoadingReturn id={id} back={back} />;
  }

  const editor = can("returns.edit");

  return (
    <Page>
      <PageHeader
        title="Повернення"
        light={`№${ret.id}`}
        back={{ href: back, label: BACK_LABEL }}
        meta={
          <>
            <ReturnStatusBadge status={ret.status} size="md" />
            {kyivDay(ret.createdAt) === ret.date ? (
              <span className={TEXT.muted}>
                від <span className="tabular-nums">{formatDateTime(ret.createdAt)}</span>
              </span>
            ) : (
              <>
                {/* The request carries the company's own day (a demo company
                    lives on a fixed one): both are shown then. */}
                <span className={TEXT.muted}>
                  від <span className="tabular-nums">{formatDate(ret.date)}</span>
                </span>
                <span className={TEXT.caption}>
                  надійшла <span className="tabular-nums">{formatDateTime(ret.createdAt)}</span>
                </span>
              </>
            )}
          </>
        }
        actions={editor && ret.allowedStatuses.length > 0 ? <ReturnActions ret={ret} /> : undefined}
      />

      <div className={COLUMNS}>
        <div className={STACK}>
          <StateBanner ret={ret} canEdit={editor} />
          <LinesCard ret={ret} />
          <WishesCard ret={ret} />
          <ProcessingCard ret={ret} canEdit={editor} />
        </div>
        <div className={STACK}>
          <OrderCard ret={ret} />
          <CompanyCard ret={ret} />
          <NotesCard ret={ret} canEdit={editor} />
          <HistoryCard ret={ret} />
        </div>
      </div>
    </Page>
  );
}
