"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePhone } from "@/components/ui/useMediaQuery";
import type { MaterialFile } from "./data";

// Phone-only pieces of the materials pages (materials spec 2.7; built on
// the shared atoms A9 LoadMore, A14 EmptyState, A3 usePhone).

const COPY = {
  emptyTitle: "За вашим запитом нічого не знайдено.",
  emptyText: "Спробуйте змінити пошук або фільтри.",
  emptyReset: "Скинути пошук і фільтри",
} as const;

// File lists show 10 rows per batch on phones (D4); the mock folders hold
// at most 9 files, so the load-more block stays absent until the CMS feed
// lands.
export const PHONE_PAGE = 10;

// Empty result (TR-24, the catalog's copy): the desktop keeps its grey
// line (`max-lg:hidden` at the call site); phones get the centred block
// with a reset that clears the query and every filter. Public pages put it
// straight on the white page, the partner skin in a white r32 panel on the
// slab.
export function MaterialsEmpty({
  onReset,
  surface = "none",
}: {
  onReset: () => void;
  surface?: "none" | "panel";
}): React.JSX.Element {
  return (
    <EmptyState
      surface={surface}
      title={COPY.emptyTitle}
      text={COPY.emptyText}
      action={
        <Button size="small" onClick={onReset}>
          {COPY.emptyReset}
        </Button>
      }
      className="lg:hidden"
    />
  );
}

// A file list with the phone batches: the server and the desktop render
// every row; a phone shows the first 10 and a «Показати більше» block 48
// under the list. Any change of `listKey` (query, filters) starts again
// from the first batch. After a batch the first new row's open button
// takes the focus (A9).
export function MaterialsFileList({
  files,
  listKey,
  className,
  renderFile,
}: {
  files: MaterialFile[];
  listKey: string;
  className: string;
  renderFile: (file: MaterialFile) => ReactNode;
}): React.JSX.Element {
  const phone = usePhone();
  const listRef = useRef<HTMLUListElement | null>(null);
  const [batch, setBatch] = useState({ key: listKey, shown: PHONE_PAGE });
  if (batch.key !== listKey) setBatch({ key: listKey, shown: PHONE_PAGE });
  const shown = batch.key === listKey ? batch.shown : PHONE_PAGE;
  const visible = phone ? files.slice(0, shown) : files;
  return (
    <>
      <ul ref={listRef} role="list" className={className}>
        {visible.map((file) => (
          <li key={file.id}>{renderFile(file)}</li>
        ))}
      </ul>
      {phone && (
        <LoadMore
          className="mt-12 lg:hidden"
          shown={shown}
          total={files.length}
          onMore={() => setBatch((b) => ({ ...b, shown: b.shown + PHONE_PAGE }))}
          focusAfterLast={() =>
            listRef.current?.querySelectorAll("li")[shown]?.querySelector<HTMLElement>("button") ?? null
          }
        />
      )}
    </>
  );
}
