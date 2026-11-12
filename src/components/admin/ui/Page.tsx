import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../lib/format";
import { COLOR_TRANSITION, FOCUS_RING, TEXT } from "./tokens";

// The skeleton of every panel screen: the padded column on the grey slab,
// the page head, sections, and two layout helpers.
//
//   <Page>
//     <PageHeader
//       title="Замовлення"
//       light="1 248"
//       subtitle="Усі замовлення партнерів і роздрібу"
//       actions={<Button>Експорт CSV</Button>}
//       tabs={<LinkTabs ... />}
//     />
//     <PageSection title="Потребують уваги" actions={...}>
//       <Grid cols={{ base: 1, md: 2, xl: 4 }}>...</Grid>
//     </PageSection>
//   </Page>
//
// Page({ children, width? }): "wide" (default) keeps the content within
//   1600 px, "narrow" within 960 px and centred (forms, settings, account),
//   "full" uses all the room (wide tables). Gutters 16 px on phones, 32 px
//   from 1024 px.
// PageHeader({ title, light?, subtitle?, back?, actions?, meta?, tabs? }):
//   the h1 of the screen with an optional light run after it (counts: title
//   "Замовлення", light "1 248"); `back` is a small pill with an arrow above
//   the title; `actions` sit on the right from 1024 px and wrap under the
//   title below it; `meta` is a row under the subtitle (badges, dates);
//   `tabs` is the row under everything.
// PageSection({ title?, description?, actions?, children }): an h2 block.
//   The title block takes the free room, so the actions stay on the right
//   even under a long description (from 640 px; on phones they wrap under).
// Stack({ gap?, children }) and Grid({ cols, gap?, children }): Grid columns
//   are given per step: base (phones), sm (from 640 px), md (from 1024 px),
//   xl (from 1280 px), "2xl" (from 1536 px).
//
// No hooks: usable in server pages and client screens alike.

export type PageWidth = "full" | "wide" | "narrow";

// The max widths include the 2 x 32-px gutters, so the content itself is
// 1600 / 960 px wide.
const WIDTH: Record<PageWidth, string> = {
  full: "",
  wide: "max-w-[1664px]",
  narrow: "mx-auto max-w-[1024px]",
};

export function Page({ children, width = "wide", className }: { children: ReactNode; width?: PageWidth; className?: string }) {
  return (
    <div className={cx("flex w-full min-w-0 flex-1 flex-col px-4 py-5 min-[1024px]:px-8 min-[1024px]:py-8", WIDTH[width], className)}>
      {children}
    </div>
  );
}

export type PageHeaderProps = {
  title: ReactNode;
  light?: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  meta?: ReactNode;
  tabs?: ReactNode;
  className?: string;
};

export function PageHeader({ title, light, subtitle, back, actions, meta, tabs, className }: PageHeaderProps) {
  const hasLight = light !== undefined && light !== null && light !== false && light !== "";
  return (
    <header className={cx("flex flex-col gap-4 pb-5 min-[1024px]:pb-6", className)}>
      {back && (
        <Link
          href={back.href}
          className={cx(
            "inline-flex h-8 w-fit max-w-full items-center gap-1.5 rounded-full bg-white pl-2.5 pr-3.5 text-[13px] font-medium leading-[18px] text-neutral-800",
            "hover:bg-neutral-900 hover:text-white motion-reduce:transition-none",
            COLOR_TRANSITION,
            FOCUS_RING,
          )}
        >
          <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{back.label}</span>
        </Link>
      )}
      <div className="flex flex-col gap-4 min-[1024px]:flex-row min-[1024px]:items-start min-[1024px]:justify-between min-[1024px]:gap-8">
        <div className="min-w-0">
          <h1 className={cx(TEXT.pageTitle, "[overflow-wrap:anywhere]")}>
            {title}
            {hasLight && (
              <>
                {" "}
                <span className={cx(TEXT.pageTitleLight, "tabular-nums")}>{light}</span>
              </>
            )}
          </h1>
          {subtitle && <p className={cx(TEXT.muted, "mt-1")}>{subtitle}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">{meta}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 min-[1024px]:shrink-0 min-[1024px]:justify-end min-[1024px]:pt-0.5">
            {actions}
          </div>
        )}
      </div>
      {tabs && <div className="min-w-0">{tabs}</div>}
    </header>
  );
}

export type PageSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageSection({ title, description, actions, children, className }: PageSectionProps) {
  const hasHead = Boolean(title || description || actions);
  return (
    <section className={cx("flex min-w-0 flex-col gap-4", className)}>
      {hasHead && (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          {/* The title block takes the free room. From 640 px the
              description does not count towards its width (w-0 min-w-full:
              it fills the block but adds nothing to its size), so a long
              description wraps beside the actions instead of pushing them
              to a line of their own; only the title itself can. On phones
              the actions still go under a long description. */}
          <div className="min-w-0 flex-auto">
            {title && <h2 className={TEXT.sectionTitle}>{title}</h2>}
            {description && (
              <p className={cx(TEXT.muted, title ? "mt-1" : "", actions ? "min-[640px]:w-0 min-[640px]:min-w-full" : undefined)}>{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export type Gap = 2 | 3 | 4 | 5 | 6 | 8;

const GAP: Record<Gap, string> = { 2: "gap-2", 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6", 8: "gap-8" };

export function Stack({ gap = 6, children, className }: { gap?: Gap; children: ReactNode; className?: string }) {
  return <div className={cx("flex min-w-0 flex-col", GAP[gap], className)}>{children}</div>;
}

export type Cols = 1 | 2 | 3 | 4 | 5 | 6;

// Whole literal classes per step (Tailwind extracts nothing that is glued
// together at run time).
const BASE: Record<Cols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};
const SM: Record<Cols, string> = {
  1: "min-[640px]:grid-cols-1",
  2: "min-[640px]:grid-cols-2",
  3: "min-[640px]:grid-cols-3",
  4: "min-[640px]:grid-cols-4",
  5: "min-[640px]:grid-cols-5",
  6: "min-[640px]:grid-cols-6",
};
const MD: Record<Cols, string> = {
  1: "min-[1024px]:grid-cols-1",
  2: "min-[1024px]:grid-cols-2",
  3: "min-[1024px]:grid-cols-3",
  4: "min-[1024px]:grid-cols-4",
  5: "min-[1024px]:grid-cols-5",
  6: "min-[1024px]:grid-cols-6",
};
const XL: Record<Cols, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};
const XXL: Record<Cols, string> = {
  1: "2xl:grid-cols-1",
  2: "2xl:grid-cols-2",
  3: "2xl:grid-cols-3",
  4: "2xl:grid-cols-4",
  5: "2xl:grid-cols-5",
  6: "2xl:grid-cols-6",
};

export type GridCols = { base?: Cols; sm?: Cols; md?: Cols; xl?: Cols; "2xl"?: Cols };

export function Grid({
  cols = { base: 1 },
  gap = 4,
  children,
  className,
}: {
  cols?: GridCols;
  gap?: Gap;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid min-w-0",
        BASE[cols.base ?? 1],
        cols.sm && SM[cols.sm],
        cols.md && MD[cols.md],
        cols.xl && XL[cols.xl],
        cols["2xl"] && XXL[cols["2xl"]],
        GAP[gap],
        className,
      )}
    >
      {children}
    </div>
  );
}
