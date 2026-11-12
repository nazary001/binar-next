"use client";

import { useEffect, useState } from "react";
import { cx } from "../lib/format";
import { CommandPalette, hasCommandPalette } from "../ui/CommandPalette";
import { ConfirmHost, hasConfirmHost } from "../ui/ConfirmDialog";
import { Page, PageHeader } from "../ui/Page";
import { ToastHost, hasToastHost } from "../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING, SURFACE, TEXT } from "../ui/tokens";
import { ChartsDemo } from "./ChartsDemo";
import { CardsDemo, DataTableDemo, KeyValueDemo, PageDemo, StatesDemo, StatusDemo, TabsDemo, TimelineDemo } from "./DataDemo";
import { ChoiceDemo, ComboboxDemo, FieldDemo, FormDemo, HeightsDemo, InputsDemo, SelectDemo, TagDateDemo } from "./FormsDemo";
import { ConfirmDemo, DrawerDemo, MenuPopoverDemo, ModalDemo, ToastPaletteDemo } from "./LayersDemo";
import { MediaDemo } from "./MediaDemo";
import { AvatarTooltipDemo, BadgesDemo, ButtonsDemo, SpinnerSkeletonDemo, TonesDemo } from "./PrimitivesDemo";
import { CardsMoreDemo, DataTableMoreDemo, FiltersMoreDemo, FormsMoreDemo, LayersMoreDemo, SecretDemo, TabsMoreDemo, UploadMoreDemo } from "./Wave3Demo";

// The gallery of the admin UI kit (/admin/ui-kit, development only): one
// long page, a section per file of src/components/admin/ui, every
// component in every state with realistic data. The people who build the
// panel's screens look things up here; the audit screenshots it at 1440
// and 390.
//
//   <Gallery mountHosts />   (src/app/admin/(panel)/ui-kit/page.tsx)
//
// mountHosts: render <ToastHost />, <ConfirmHost /> and <CommandPalette />
// here, each only when no host of its kind is mounted yet (the shell will
// render them for every page; then the prop can go). Default false.

const CONTENTS: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: "Основа",
    items: [
      { id: "button", label: "Button" },
      { id: "badge", label: "Badge" },
      { id: "spinner", label: "Spinner" },
      { id: "skeleton", label: "Skeleton" },
      { id: "avatar", label: "Avatar" },
      { id: "tooltip", label: "Tooltip" },
    ],
  },
  {
    group: "Форми",
    items: [
      { id: "heights", label: "Висоти" },
      { id: "field", label: "Field" },
      { id: "input", label: "Input" },
      { id: "select", label: "Select" },
      { id: "combobox", label: "Combobox" },
      { id: "checkbox", label: "Checkbox" },
      { id: "taginput", label: "TagInput" },
      { id: "dateinput", label: "DateInput" },
      { id: "form", label: "Form" },
      { id: "forms-more", label: "Форми: нове" },
      { id: "secret", label: "OneTimeSecret" },
      { id: "media", label: "Медіа" },
      { id: "upload-more", label: "Медіа: нове" },
    ],
  },
  {
    group: "Сторінки і дані",
    items: [
      { id: "page", label: "Page" },
      { id: "card", label: "Card" },
      { id: "cards-more", label: "Плитки: нове" },
      { id: "keyvalue", label: "KeyValue" },
      { id: "tabs", label: "Tabs" },
      { id: "tabs-more", label: "Tabs: нове" },
      { id: "datatable", label: "DataTable" },
      { id: "datatable-states", label: "Стани таблиці" },
      { id: "datatable-more", label: "DataTable: нове" },
      { id: "filters-more", label: "Фільтри і BulkBar" },
      { id: "states", label: "States" },
      { id: "timeline", label: "Timeline" },
      { id: "status", label: "Статуси" },
      { id: "charts", label: "Графіки" },
    ],
  },
  {
    group: "Шари",
    items: [
      { id: "modal", label: "Modal" },
      { id: "drawer", label: "Drawer" },
      { id: "layers-more", label: "Шари: нове" },
      { id: "confirm", label: "ConfirmDialog" },
      { id: "dropdown", label: "DropdownMenu" },
      { id: "popover", label: "Popover" },
      { id: "toast", label: "Toast" },
      { id: "palette", label: "CommandPalette" },
    ],
  },
];

type Needed = { toast: boolean; confirm: boolean; palette: boolean };

// The hosts this page has to bring itself. Checked once after the first
// paint (a timer callback, so the shell's hosts, mounted in the same
// commit, have subscribed by then).
function Hosts() {
  const [needed, setNeeded] = useState<Needed | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNeeded({ toast: !hasToastHost(), confirm: !hasConfirmHost(), palette: !hasCommandPalette() });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!needed) return null;
  return (
    <>
      {needed.toast && <ToastHost />}
      {needed.confirm && <ConfirmHost />}
      {needed.palette && <CommandPalette />}
    </>
  );
}

function Contents() {
  return (
    <nav aria-label="Зміст кіту" className={cx(SURFACE.card, SURFACE.cardPadding, "flex flex-col gap-4")}>
      <p className={TEXT.cardTitle}>Зміст</p>
      <div className="grid min-w-0 gap-4 min-[640px]:grid-cols-2 xl:grid-cols-4">
        {CONTENTS.map((group) => (
          <div key={group.group} className="flex min-w-0 flex-col gap-2">
            <p className={TEXT.caption}>{group.group}</p>
            <ul className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={cx(
                      "inline-flex h-8 items-center rounded-full bg-bg-subtle px-3 text-[13px] font-medium leading-[18px] text-neutral-800 hover:bg-neutral-900 hover:text-white motion-reduce:transition-none",
                      COLOR_TRANSITION,
                      FOCUS_RING,
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function Gallery({ mountHosts = false }: { mountHosts?: boolean }) {
  return (
    <Page>
      <PageHeader
        title="UI-кіт"
        light="панелі"
        subtitle="Кожен компонент src/components/admin/ui у кожному стані. Імпорт: @/components/admin/ui."
      />
      <div className="flex min-w-0 flex-col gap-12">
        <Contents />
        <TonesDemo />
        <ButtonsDemo />
        <BadgesDemo />
        <SpinnerSkeletonDemo />
        <AvatarTooltipDemo />
        <HeightsDemo />
        <FieldDemo />
        <InputsDemo />
        <SelectDemo />
        <ComboboxDemo />
        <ChoiceDemo />
        <TagDateDemo />
        <FormDemo />
        <FormsMoreDemo />
        <SecretDemo />
        <MediaDemo />
        <UploadMoreDemo />
        <PageDemo />
        <CardsDemo />
        <CardsMoreDemo />
        <KeyValueDemo />
        <TabsDemo />
        <TabsMoreDemo />
        <DataTableDemo />
        <DataTableMoreDemo />
        <FiltersMoreDemo />
        <StatesDemo />
        <TimelineDemo />
        <StatusDemo />
        <ChartsDemo />
        <ModalDemo />
        <DrawerDemo />
        <LayersMoreDemo />
        <ConfirmDemo />
        <MenuPopoverDemo />
        <ToastPaletteDemo />
      </div>
      {mountHosts && <Hosts />}
    </Page>
  );
}
