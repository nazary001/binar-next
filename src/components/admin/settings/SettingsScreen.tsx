"use client";

import { useSearchParams } from "next/navigation";
import { SystemPanel } from "../system/SystemPanel";
import { Page, PageHeader } from "../ui/Page";
import { LinkTabs } from "../ui/Tabs";
import { SettingsGroupPanel, groupDef } from "./SettingsGroupForm";
import type { PlainSettingsKey } from "./types";

// /admin/settings: the four plain settings groups and the system page,
// one tab each (?tab=general|shop|blog|catalog|system; no tab = general).
// The tabs are links, so each tab has its own address (the journal links
// a settings line to its tab) and Back works; leaving a tab with unsaved
// edits asks first (useUnsavedWarning of the form).

type SettingsTab = PlainSettingsKey | "system";

const TABS: { key: SettingsTab; label: string; light: string }[] = [
  { key: "general", label: "Загальні", light: "компанії" },
  { key: "shop", label: "Магазин", light: "магазину" },
  { key: "blog", label: "Блог", light: "блогу" },
  { key: "catalog", label: "Каталог", light: "каталогу" },
  { key: "system", label: "Система", light: "системи" },
];

const SYSTEM_SUBTITLE = "Стан бази даних, файлів і середовища, перевірка перед запуском і обслуговування сайту.";

function tabOf(value: string | null): SettingsTab {
  return TABS.find((tab) => tab.key === value)?.key ?? "general";
}

export function SettingsScreen() {
  const search = useSearchParams();
  const tab = tabOf(search.get("tab"));
  const current = TABS.find((item) => item.key === tab) ?? TABS[0];
  const subtitle = tab === "system" ? SYSTEM_SUBTITLE : groupDef(tab).description;

  return (
    <Page>
      <PageHeader
        title="Налаштування"
        light={current.light}
        subtitle={<span className="block max-w-[760px]">{subtitle}</span>}
        tabs={
          <LinkTabs
            label="Розділи налаштувань"
            value={tab}
            items={TABS.map((item) => ({
              key: item.key,
              label: item.label,
              href: item.key === "general" ? "/admin/settings" : `/admin/settings?tab=${item.key}`,
            }))}
          />
        }
      />
      {tab === "system" ? (
        <SystemPanel />
      ) : (
        <div className="min-w-0 max-w-[1120px]">
          <SettingsGroupPanel key={tab} group={tab} />
        </div>
      )}
    </Page>
  );
}
