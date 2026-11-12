"use client";

import { Page, PageHeader } from "../ui/Page";
import { ExchangeLog } from "./ExchangeLog";

// /admin/integrations/log: the whole journal of the exchanges of every
// integration, filtered in the address bar (?system=bas&status=error ...).
export function LogScreen() {
  return (
    <Page>
      <PageHeader
        back={{ href: "/admin/integrations", label: "Інтеграції" }}
        title="Журнал обміну"
        subtitle="Кожен виклик BAS, кожна дія з Новою Поштою і кожна спроба надіслати лист. Записи зберігаються 90 днів."
      />
      <ExchangeLog />
    </Page>
  );
}
