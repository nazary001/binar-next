"use client";

import { useSearchParams } from "next/navigation";
import { useAdminQuery } from "../../lib/query";
import { cx } from "../../lib/format";
import { Page, PageHeader } from "../../ui/Page";
import { Skeleton } from "../../ui/Skeleton";
import { LinkTabs } from "../../ui/Tabs";
import { ExchangeLog } from "../ExchangeLog";
import { StatePill } from "../shared";
import { basState } from "../state";
import type { BasStatusAnswer } from "../types";
import { BasDocsTab } from "./BasDocsTab";
import { BAS_TABS, basTabHref, type BasTab } from "./links";
import { BasKeysTab } from "./BasKeysTab";
import { BasQueueTab } from "./BasQueueTab";
import { BasSettingsTab } from "./BasSettingsTab";
import { BasStatusTab } from "./BasStatusTab";

// /admin/integrations/bas: the exchange with the accounting system, one
// tab per job (?tab=): how it is going, what BAS may change, the keys BAS
// signs its calls with, the queue of orders it collects, the journal of
// its calls, and the contract for the developer on the BAS side.

const LABELS: Record<BasTab, string> = {
  status: "Стан",
  settings: "Налаштування",
  keys: "Ключі доступу",
  queue: "Черга",
  log: "Журнал",
  dev: "Для розробника BAS",
};

export function BasScreen() {
  const search = useSearchParams();
  const raw = search.get("tab") ?? "status";
  const tab: BasTab = (BAS_TABS as readonly string[]).includes(raw) ? (raw as BasTab) : "status";
  const status = useAdminQuery<BasStatusAnswer>("/integrations/bas/status");
  const data = status.data;

  return (
    <Page>
      <PageHeader
        className={cx(tab === "dev" && "print:hidden")}
        back={{ href: "/admin/integrations", label: "Інтеграції" }}
        title="Обмін з BAS"
        subtitle="Облікова система сама звертається до сайту за розкладом: надсилає товари, ціни, залишки й клієнтів і забирає нові замовлення."
        meta={data ? <StatePill state={basState(data)} /> : <Skeleton shape="pill" className="h-7 w-36" />}
        tabs={
          <LinkTabs
            label="Розділи обміну з BAS"
            value={tab}
            items={BAS_TABS.map((key) => ({
              key,
              label: LABELS[key],
              href: basTabHref(key),
              count: key === "queue" ? data?.queue.pending || undefined : key === "keys" ? data?.keys.active || undefined : undefined,
            }))}
          />
        }
      />
      {tab === "status" && <BasStatusTab />}
      {tab === "settings" && <BasSettingsTab />}
      {tab === "keys" && <BasKeysTab />}
      {tab === "queue" && <BasQueueTab />}
      {tab === "log" && <ExchangeLog system="bas" keep={["tab"]} />}
      {tab === "dev" && <BasDocsTab />}
    </Page>
  );
}
