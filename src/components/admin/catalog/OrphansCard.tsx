"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useId, useState } from "react";
import { countOf, cx } from "../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SURFACE, TEXT, TONES } from "../ui/tokens";
import type { TaxonomyOrphan } from "./types";

// Products whose category matches no card of the catalog: the storefront
// leaves them out of every direction and category page. Shown on
// /admin/categories only when there are some, in the amber of "needs
// attention", each with a way into the product to pick a category.

const FIRST = 5;

export function OrphansCard({ orphans, canEdit }: { orphans: TaxonomyOrphan[]; canEdit: boolean }) {
  const headingId = useId();
  const [all, setAll] = useState(false);
  const shown = all ? orphans : orphans.slice(0, FIRST);
  const amber = TONES.amber;
  return (
    <section
      aria-labelledby={headingId}
      className={cx(SURFACE.card, SURFACE.cardPadding, "flex min-w-0 flex-col gap-4")}
      style={{ backgroundColor: amber.bg }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white [&>svg]:size-5 [&>svg]:[stroke-width:1.7]"
          style={{ color: amber.text }}
        >
          <ExclamationTriangleIcon />
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className={TEXT.cardTitle}>
            Товари поза категоріями: {orphans.length}
          </h2>
          <p className={cx(TEXT.body, "mt-1")} style={{ color: amber.text }}>
            Категорія цих товарів не збігається з жодною категорією каталогу, тому сайт не показує їх у напрямах і категоріях, лише в
            загальному списку. Відкрийте товар і оберіть йому категорію.
          </p>
        </div>
      </div>
      <ul className="flex min-w-0 flex-col rounded-2xl bg-white px-4">
        {shown.map((orphan) => (
          <li
            key={orphan.id}
            className="flex min-w-0 flex-col gap-2 border-b border-stroke-subtle py-3 last:border-b-0 min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-4"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={cx(TEXT.bodyStrong, "[overflow-wrap:anywhere]")}>{orphan.title || "Без назви"}</span>
                {orphan.archived && <Badge tone="neutral">Архів</Badge>}
              </span>
              <span className={TEXT.caption}>
                {orphan.subcategory ? `Категорія в товарі: «${orphan.subcategory}»` : "Категорію не вказано"}
              </span>
            </span>
            <Button size="sm" variant="secondary" href={`/admin/products/${encodeURIComponent(orphan.id)}`} className="self-start min-[640px]:self-auto">
              {canEdit ? "Обрати категорію" : "Відкрити товар"}
            </Button>
          </li>
        ))}
      </ul>
      {orphans.length > FIRST && (
        <Button size="sm" variant="ghost" onClick={() => setAll(!all)} className="self-start">
          {all ? "Згорнути" : `Показати всі: ${countOf(orphans.length, ["товар", "товари", "товарів"])}`}
        </Button>
      )}
    </section>
  );
}
