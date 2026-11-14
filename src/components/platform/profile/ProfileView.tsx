"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { CabinetPage, CabinetPageHead, SignInPrompt, useHydrated } from "@/components/platform/ui";
import { ChipTabs, chipTabPanelProps } from "@/components/ui/ChipTabs";
import { showToast } from "@/components/ui/Toast";
import { usePhone } from "@/components/ui/useMediaQuery";
import { CompanyBlock, SecurityBlock, YouCard } from "./AccountForms";
import { CounterpartiesPanel } from "./CounterpartiesPanel";
import { COPY } from "./data";
import { EmployeesPanel } from "./EmployeesPanel";
import { LogoCard } from "./LogoCard";
import { useProfile } from "./store";

// «Мій профіль» - Figma «Мій профіль : Admin» 4868:30956 (frames
// 4868:30958 Контрагенти, 4868:31376 Співробітники, 1710 x 1341) inside
// the platform shell. Content column right of the 104 rail (#f5f5f5,
// r-tl 48, 1195 tall in both frames = the footer at 1287):
//   title block 144 (H2 «Мій профіль» 44/48 + 14/24 tagline);
//   body pl-40 pr-32 gap 26: the 364 left column, the same on both tabs
//   (logo card 298, gap 26, «Ваші дані» 356 with the «Адміністратор»
//   pill and four fields: the designer redrew the Контрагенти column on
//   2026-11-13, 5474:45043, like the Співробітники one, C35) and the 1144
//   white r24 card: «Дані компанії» 220,
//   «Безпека» 150, then pt-60 the tabs strip (54: «Контрагенти» 132 /
//   «Співробітники» 143, 16/22 Medium, p-16, brand text + 2-px brand
//   underline when active, over a 1-px #d2d2d2 rule) and the tab's
//   section (CounterpartiesPanel / EmployeesPanel).
// The tab is the `?tab=` query (counterparties by default). The strip is
// a WAI-ARIA tablist: only the selected tab sits in the Tab order,
// ArrowLeft / ArrowRight / Home / End move to and select a tab, and
// aria-controls is set on the selected tab only (the other panel is not
// rendered).
//
// Phones (< 640, profile spec 2.0-2.5; the Figma Platform page has no phone
// frame): a separate tree (usePhone; the view renders nothing until
// hydrated, so there is no flash) - the cabinet head with three chip tabs
// in its actions slot, "Дані" / "Контрагенти" / "Співробітники", and only
// the selected group under it: "Дані" = four white r32 cards 24 apart
// (logo, "Ваші дані", "Дані компанії", "Безпека"), the other two = the
// phone layouts of the panels. `/profile` opens "Дані" on a phone and
// "Контрагенти" on desktop (same URL, ?tab= for the other two groups).
// Desktop renders the tree below verbatim.

type Tab = "counterparties" | "employees";
type PhoneTab = "account" | Tab;

const TABS: { key: Tab; label: string }[] = [
  { key: "counterparties", label: COPY.tabs.counterparties },
  { key: "employees", label: COPY.tabs.employees },
];

const PHONE_TABS: { key: PhoneTab; label: string }[] = [
  { key: "account", label: COPY.tabs.account },
  { key: "counterparties", label: COPY.tabs.counterparties },
  { key: "employees", label: COPY.tabs.employees },
];

// Autosave feedback on phones: one "Збережено" toast 800 ms after the
// last real save (a run of Enter / blur saves gives one toast).
const SAVED_TOAST_MS = 800;

export function ProfileView() {
  const hydrated = useHydrated();
  const { user } = useAuth();
  const profile = useProfile(user?.type === "b2b" ? user.id : null);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = params.get("tab") === "employees" ? "employees" : "counterparties";
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const phone = usePhone();
  const phoneTab: PhoneTab =
    params.get("tab") === "employees" ? "employees" : params.get("tab") === "counterparties" ? "counterparties" : "account";

  const selectTab = (next: Tab) => {
    const q = new URLSearchParams(params.toString());
    if (next === "counterparties") q.delete("tab");
    else q.set("tab", next);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const selectPhoneTab = (next: PhoneTab) => {
    const q = new URLSearchParams(params.toString());
    if (next === "account") q.delete("tab");
    else q.set("tab", next);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const savedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    },
    [],
  );
  const notifySaved = () => {
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => {
      savedTimer.current = null;
      showToast(COPY.toast.saved);
    }, SAVED_TOAST_MS);
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.key === tab);
    const next =
      e.key === "ArrowRight"
        ? TABS[(i + 1) % TABS.length]
        : e.key === "ArrowLeft"
          ? TABS[(i - 1 + TABS.length) % TABS.length]
          : e.key === "Home"
            ? TABS[0]
            : e.key === "End"
              ? TABS[TABS.length - 1]
              : null;
    if (!next) return;
    e.preventDefault();
    tabRefs.current[next.key]?.focus();
    if (next.key !== tab) selectTab(next.key);
  };

  // The session lives in localStorage: nothing renders until the client
  // knows who is signed in (no flash of the sign-in prompt).
  if (!hydrated) return null;

  // Visitors and retail customers: the profile is the partner cabinet.
  if (user?.type !== "b2b") {
    return <SignInPrompt title={COPY.title} text="Профіль компанії доступний в особистому кабінеті бізнес-клієнта." />;
  }

  if (phone) {
    return (
      <CabinetPage>
        <CabinetPageHead
          title={COPY.title}
          subtitle={COPY.tagline}
          actions={
            <ChipTabs
              label="Розділи профілю"
              idPrefix="profile"
              value={phoneTab}
              onChange={selectPhoneTab}
              items={PHONE_TABS}
            />
          }
        />
        <div
          data-profile="phone-body"
          {...chipTabPanelProps("profile", phoneTab)}
          className="flex flex-col gap-6 px-6 [--field-surface:#fff]"
        >
          {phoneTab === "account" ? (
            <>
              <LogoCard logo={user.logo} variant="account" onUploaded={() => showToast(COPY.toast.logo)} />
              <YouCard account={user} variant="account" onSaved={notifySaved} />
              <div data-profile="company-card" className="overflow-clip rounded-[32px] bg-white">
                <CompanyBlock account={user} onSaved={notifySaved} />
              </div>
              <div data-profile="security-card" className="overflow-clip rounded-[32px] bg-white">
                <SecurityBlock account={user} onNotice={(message) => showToast(message)} />
              </div>
            </>
          ) : (
            profile &&
            (phoneTab === "counterparties" ? (
              <CounterpartiesPanel layout="phone" accountId={user.id} list={profile.counterparties} />
            ) : (
              <EmployeesPanel
                layout="phone"
                accountId={user.id}
                list={profile.employees}
                inviteToken={profile.inviteToken}
              />
            ))
          )}
        </div>
      </CabinetPage>
    );
  }

  return (
    <CabinetPage className="lg:min-h-[1195px]">
      <CabinetPageHead title={COPY.title} subtitle={COPY.tagline} />
      <div
        data-profile="body"
        className="flex flex-col gap-6 px-6 [--field-surface:#fff] lg:flex-row lg:items-start lg:gap-[26px] lg:pl-10 lg:pr-8"
      >
        <div data-profile="left" className="flex flex-col gap-6 lg:w-[364px] lg:shrink-0 lg:gap-[26px]">
          <LogoCard logo={user.logo} variant="desktop" />
          <YouCard account={user} variant="desktop" />
        </div>
        <div data-profile="main-card" className="flex min-w-0 flex-1 flex-col overflow-clip rounded-3xl bg-white">
          <CompanyBlock account={user} />
          <SecurityBlock account={user} />
          <div className="flex flex-col pt-10 lg:pt-[60px]">
            <div className="px-6">
              <div
                role="tablist"
                aria-label="Розділи профілю"
                data-profile="tabs"
                onKeyDown={onTabKey}
                className="flex border-b border-stroke-subtle"
              >
                {TABS.map((t) => {
                  const active = t.key === tab;
                  return (
                    <button
                      key={t.key}
                      ref={(el) => {
                        tabRefs.current[t.key] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`profile-tab-${t.key}`}
                      aria-selected={active}
                      aria-controls={active ? `profile-panel-${t.key}` : undefined}
                      tabIndex={active ? 0 : -1}
                      onClick={() => selectTab(t.key)}
                      className={`-mb-px shrink-0 cursor-pointer whitespace-nowrap px-4 pt-4 text-[16px] font-medium leading-[22px] transition-colors duration-200 ${
                        active
                          ? "border-b-2 border-brand pb-[14px] text-brand"
                          : "border-b border-stroke-subtle pb-[15px] text-neutral-800 hover:text-brand"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div role="tabpanel" id={`profile-panel-${tab}`} aria-labelledby={`profile-tab-${tab}`}>
              {profile &&
                (tab === "counterparties" ? (
                  <CounterpartiesPanel accountId={user.id} list={profile.counterparties} />
                ) : (
                  <EmployeesPanel accountId={user.id} list={profile.employees} inviteToken={profile.inviteToken} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </CabinetPage>
  );
}
