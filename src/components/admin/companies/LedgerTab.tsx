"use client";

import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { cx, formatMoney, formatNumber, qs } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { DataTable, DateCell, TwoLineCell, type Column } from "../ui/DataTable";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { PageSection } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/States";
import { FOCUS_RING, TEXT, TONES } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { docTypeLabel } from "./shared";
import { LEDGER_DOC_TYPES, type CompanyDetail, type LedgerEntryDto, type LedgerPage } from "./types";

// "Взаєморозрахунки": the settlement movements the accounting exchange
// (BAS) wrote for the company, newest first, with the running balance.
// The filters and the page live in the address bar next to ?tab=ledger,
// under the API's own names (docType, counterpartyId, page, limit).

export function LedgerTab({ company }: { company: CompanyDetail }) {
  const { can } = useStaff();
  const list = useListParams({ defaults: { limit: "50" }, keep: ["tab"] });
  const docType = list.get("docType");
  const counterpartyId = list.get("counterpartyId");
  // Only the ledger's own parameters reach the API (the tab stays out of
  // the cache key).
  const query = qs({ docType, counterpartyId, page: list.page, limit: list.limit });
  const ledger = useAdminQuery<LedgerPage>(`/companies/${encodeURIComponent(company.id)}/ledger?${query}`);

  const cpName = (id: string) => company.counterparties.find((cp) => cp.id === id)?.name ?? "Юридична особа";
  const chips: FilterChipItem[] = [
    ...(docType ? [{ key: "docType", label: `Документ: ${docTypeLabel(docType)}`, onRemove: () => list.set({ docType: null }) }] : []),
    ...(counterpartyId ? [{ key: "cp", label: `Юридична особа: ${cpName(counterpartyId)}`, onRemove: () => list.set({ counterpartyId: null }) }] : []),
  ];
  const filtered = chips.length > 0;
  const orders = can("orders.view");

  const columns: Column<LedgerEntryDto>[] = [
    { key: "date", header: "Дата", cell: (row) => <DateCell value={row.docDate} /> },
    { key: "doc", header: "Документ", cell: (row) => <TwoLineCell title={docTypeLabel(row.docType)} subtitle={row.docNumber ? `№${row.docNumber}` : "Без номера"} /> },
    {
      key: "party",
      header: "Юридична особа і договір",
      hideBelow: 1024,
      cell: (row) => (
        <span className="block max-w-[280px]">
          <TwoLineCell
            title={row.counterpartyName ?? (row.counterpartyId ? "Видалена юридична особа" : "Без юридичної особи")}
            subtitle={row.contractNumber ? `Договір ${row.contractNumber}` : row.contractId ? "Видалений договір" : "Без договору"}
          />
        </span>
      ),
    },
    {
      key: "order",
      header: "Замовлення",
      hideBelow: 640,
      interactive: true,
      cell: (row) =>
        row.orderId ? (
          orders ? (
            <Link
              href={`/admin/orders/${encodeURIComponent(row.orderId)}`}
              className={cx("rounded-md font-semibold tabular-nums underline-offset-4 hover:underline", FOCUS_RING)}
            >
              №{row.orderId}
            </Link>
          ) : (
            <span className="tabular-nums">№{row.orderId}</span>
          )
        ) : (
          <span className="text-neutral-400">-</span>
        ),
    },
    {
      key: "amount",
      header: "Сума",
      align: "right",
      cell: (row) => (
        <span className="flex flex-col items-end">
          <span className="font-semibold tabular-nums text-neutral-900">{formatMoney(row.amount)}</span>
          <span className="text-[12px] font-medium leading-4" style={{ color: row.impact === "plus" ? TONES.red.text : TONES.green.text }}>
            {row.impact === "plus" ? "збільшує борг" : "зменшує борг"}
          </span>
        </span>
      ),
    },
    {
      key: "balance",
      header: "Борг після",
      align: "right",
      hideBelow: 1280,
      cell: (row) => <span className="tabular-nums text-neutral-500">{formatMoney(row.companyBalance)}</span>,
    },
  ];

  const figures = ledger.data?.figures;
  const loadingFigures = ledger.loading && !ledger.data;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {(loadingFigures || (figures && figures.entries > 0)) && (
        <Card title="Сальдо за даними BAS" subtitle="Плюс - компанія винна, мінус - переплата.">
          {loadingFigures || !figures ? (
            <Skeleton className="h-9 w-48" />
          ) : (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-10">
              <div className="shrink-0">
                <p className={cx(TEXT.figure, "text-neutral-900")}>{formatMoney(figures.balance)}</p>
                <p className={cx(TEXT.caption, "mt-1")}>
                  {formatNumber(figures.entries)} рядків розрахунків
                </p>
              </div>
              {figures.byContract.length > 0 && (
                <ul className="grid min-w-0 flex-1 gap-2 min-[640px]:grid-cols-2 2xl:grid-cols-3">
                  {figures.byContract.map((row) => (
                    <li key={`${row.contractId ?? "none"}:${row.counterpartyId ?? "none"}`} className="flex min-w-0 items-baseline justify-between gap-3 rounded-2xl bg-bg-subtle px-4 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium leading-5 text-neutral-900">
                          {row.contractNumber ? `Договір ${row.contractNumber}` : "Без договору"}
                        </span>
                        <span className={cx(TEXT.caption, "block truncate")}>{row.counterpartyName ?? "Без юридичної особи"}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatMoney(row.balance)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      <PageSection
        title="Рух розрахунків"
        description="Документи з облікової системи: замовлення, накладні, оплати, повернення. Кожен рядок збільшує або зменшує борг компанії."
      >
        <FilterBar
          filters={
            <>
              <Select
                aria-label="Документ"
                value={docType || null}
                onChange={(next) => list.set({ docType: next })}
                clearable
                placeholder="Усі документи"
                options={LEDGER_DOC_TYPES}
                className="w-[220px]"
              />
              {company.counterparties.length > 0 && (
                <Select
                  aria-label="Юридична особа"
                  value={counterpartyId || null}
                  onChange={(next) => list.set({ counterpartyId: next })}
                  clearable
                  placeholder="Усі юридичні особи"
                  options={company.counterparties.map((cp) => ({ value: cp.id, label: cp.name }))}
                  className="w-[260px]"
                />
              )}
            </>
          }
          chips={chips}
          onReset={() => list.set({ docType: null, counterpartyId: null })}
        />
        <DataTable
          caption="Взаєморозрахунки компанії"
          columns={columns}
          rows={ledger.data?.items}
          rowKey={(row) => row.id}
          loading={ledger.loading}
          stale={ledger.stale}
          error={ledger.error}
          onRetry={ledger.reload}
          empty={
            filtered ? (
              <EmptyState
                title="Нічого не знайдено"
                text="Жоден рядок не відповідає фільтрам."
                action={
                  <Button variant="secondary" onClick={() => list.set({ docType: null, counterpartyId: null })}>
                    Скинути фільтри
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<ArrowsRightLeftIcon aria-hidden className="size-6" strokeWidth={1.7} />}
                title="Взаєморозрахунків ще немає"
                text="Рядки з'являться тут, коли обмін з BAS надішле взаєморозрахунки цієї компанії: накладні, оплати, повернення."
                action={
                  can("integrations.view") ? (
                    <Button variant="secondary" href="/admin/integrations/bas">
                      Обмін з BAS
                    </Button>
                  ) : undefined
                }
              />
            )
          }
          footer={
            <Pagination
              page={list.page}
              limit={list.limit}
              total={ledger.data?.total ?? 0}
              onPage={(page) => list.set({ page })}
              onLimit={(limit) => list.set({ limit })}
              limits={[50, 100, 200]}
            />
          }
        />
      </PageSection>
    </div>
  );
}
