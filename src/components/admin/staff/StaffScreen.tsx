"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatNumber } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { Button } from "../ui/Button";
import { Page, PageHeader } from "../ui/Page";
import { LinkTabs } from "../ui/Tabs";
import { AccountsTab } from "./AccountsTab";
import { CreateStaffModal } from "./CreateStaffModal";
import { RolesTab } from "./RolesTab";
import type { RolesAnswer } from "./types";
import { useDrawerAddress } from "./useDrawerAddress";

// /admin/staff: the people who work in the panel (?tab absent) and the
// roles (?tab=roles). A member of staff opens in a drawer from
// ?id=<staff id>, a role from ?tab=roles&id=<role id> (?id=new for a new
// one). The roles are loaded here for both tabs: the accounts tab takes
// its role filter, the counts and the limits of the signed-in person from
// them.

const BASE = "/admin/staff";

export function StaffScreen() {
  const search = useSearchParams();
  const tab = search.get("tab") === "roles" ? "roles" : "accounts";
  const roles = useAdminQuery<RolesAnswer>("/roles");
  const drawer = useDrawerAddress();
  // A new key for every opening, so the dialog starts empty each time.
  const [create, setCreate] = useState({ key: 0, open: false });

  const items = roles.data?.items;
  const people = items ? items.reduce((sum, role) => sum + role.members, 0) : undefined;

  const action =
    tab === "accounts" ? (
      <Button iconLeft={PlusIcon} onClick={() => setCreate((state) => ({ key: state.key + 1, open: true }))}>
        Додати співробітника
      </Button>
    ) : (
      <Button iconLeft={PlusIcon} onClick={() => drawer.open("new")}>
        Створити роль
      </Button>
    );

  return (
    <Page>
      <PageHeader
        title="Співробітники"
        light={people !== undefined ? formatNumber(people) : undefined}
        subtitle={
          tab === "accounts"
            ? "Хто працює в панелі, з якою роллю і коли входив востаннє"
            : "Ролі визначають, що співробітник бачить у панелі і що може змінювати"
        }
        actions={action}
        tabs={
          <LinkTabs
            label="Розділи співробітників"
            value={tab}
            items={[
              { key: "accounts", label: "Акаунти", href: BASE, count: people },
              { key: "roles", label: "Ролі", href: `${BASE}?tab=roles`, count: items?.length },
            ]}
          />
        }
      />
      {tab === "accounts" ? (
        <AccountsTab roles={roles} drawer={drawer} onCreate={() => setCreate((state) => ({ key: state.key + 1, open: true }))} />
      ) : (
        <RolesTab roles={roles} drawer={drawer} />
      )}
      <CreateStaffModal
        key={create.key}
        open={create.open}
        roles={items}
        onClose={() => setCreate((state) => ({ ...state, open: false }))}
        onOpenAccount={(id) => {
          setCreate((state) => ({ ...state, open: false }));
          drawer.open(id);
        }}
      />
    </Page>
  );
}
