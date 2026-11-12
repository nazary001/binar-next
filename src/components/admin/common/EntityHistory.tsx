"use client";

import { useState } from "react";
import type { JournalEntityHistory, JournalRow } from "../audit/types";
import { cx, qs } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SkeletonText } from "../ui/Skeleton";
import { Timeline, type TimelineItem } from "../ui/Timeline";
import { TEXT, type Tone } from "../ui/tokens";

// "Журнал змін" of one record: the lines of the panel's journal about it
// (who changed what and when), newest first. A detail page of a record
// that has no history of its own (a product, a company, an account, a
// post) shows this block; orders and returns keep their own richer
// history and do not need it.
//
//   <EntityHistory type="product" id={product.id} />
//   <EntityHistory type="company" id={company.id} related />
//   <EntityHistory type="company" id={company.id} title="Історія змін" bare />
//
// Props
// - type, id: the journal's entity type and the record id, exactly as the
//   section's API writes them (order, return, product, customer, company,
//   customer-group, blog_post, material_file, lead, staff, role, media,
//   price-type, settings ...).
// - related: also the lines of the records that belong to this one but are
//   journaled under types of their own (adds related=1 to the request;
//   ENTITY_RELATED in audit/types.ts says which: for a company, its
//   counterparties, contracts and employees). The route keeps only the
//   related types the caller may view and ignores the flag for a type with
//   nothing related, so it is safe to pass anywhere.
// - title ("Журнал змін"); collapsedTo (5): how many lines show before
//   "Показати всі".
// - bare: no card around it (for use inside a card or a drawer).
// - refreshKey: change it after a save (the record's updatedAt) so the
//   block reloads; invalidate("/audit") does the same for every open one.
//
// A role that may not read this history gets nothing at all (the block
// renders null), so a page can place it without checking permissions.

const KIND_TONE: Record<JournalRow["actor"]["kind"], Tone> = {
  staff: "neutral",
  system: "blue",
  integration: "indigo",
  customer: "green",
};

function actorName(row: JournalRow): string {
  if (row.actor.kind === "system") return row.actor.name || "Система";
  if (row.actor.kind === "integration") return row.actor.name ? `Інтеграція: ${row.actor.name}` : "Інтеграція";
  if (row.actor.kind === "customer") return row.actor.name ? `Клієнт: ${row.actor.name}` : "Клієнт";
  return row.actor.name || "Співробітник";
}

type EntityHistoryProps = {
  type: string;
  id: string;
  related?: boolean;
  title?: string;
  collapsedTo?: number;
  bare?: boolean;
  refreshKey?: string | number | null;
  className?: string;
};

export function EntityHistory({
  type,
  id,
  related = false,
  title = "Журнал змін",
  collapsedTo = 5,
  bare = false,
  refreshKey,
  className,
}: EntityHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  // `v` only makes the key differ after a save; the route ignores it.
  // The route reads related only as "1".
  const history = useAdminQuery<JournalEntityHistory>(
    `/audit/entity?${qs({ type, id, related: related ? "1" : undefined, v: refreshKey ?? undefined })}`,
  );

  // Not allowed to read it (or the type is unknown to the journal): no block.
  if (history.error && (history.error.status === 403 || history.error.status === 400)) return null;

  const rows = history.data?.items ?? [];
  const shown = expanded ? rows : rows.slice(0, collapsedTo);
  const items: TimelineItem[] = shown.map((row) => ({
    id: row.id,
    at: row.at,
    title: <span className="font-normal">{row.summary}</span>,
    actor: actorName(row),
    tone: KIND_TONE[row.actor.kind] ?? "neutral",
  }));

  const body =
    history.loading && !history.data ? (
      <SkeletonText lines={3} />
    ) : history.error ? (
      <p className={TEXT.muted}>
        Не вдалося завантажити журнал.{" "}
        <button type="button" className="underline underline-offset-2" onClick={history.reload}>
          Спробувати ще раз
        </button>
      </p>
    ) : (
      <>
        <Timeline items={items} empty="Змін ще не було" />
        {rows.length > collapsedTo && (
          <div className="pt-3">
            <Button variant="ghost" size="sm" onClick={() => setExpanded((open) => !open)}>
              {expanded ? "Згорнути" : `Показати всі (${rows.length})`}
            </Button>
          </div>
        )}
      </>
    );

  if (bare) {
    return (
      <section className={className} aria-label={title}>
        <h3 className={cx(TEXT.cardTitle, "pb-3")}>{title}</h3>
        {body}
      </section>
    );
  }
  return (
    <Card title={title} className={className}>
      {body}
    </Card>
  );
}
