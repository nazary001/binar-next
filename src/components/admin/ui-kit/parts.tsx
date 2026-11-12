import type { ReactNode } from "react";
import { cx } from "../lib/format";
import { SURFACE, TEXT } from "../ui/tokens";

// The building blocks of the kit's gallery: a section per file of the kit,
// white sample cards inside it, and labelled rows of samples.

// One file of the kit: its heading (the component names), the file it
// lives in, a line on what it is for.
export function Section({
  id,
  title,
  file,
  description,
  children,
}: {
  id: string;
  title: string;
  file: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex min-w-0 scroll-mt-24 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className={TEXT.sectionTitle}>
          {title}
        </h2>
        <p className={TEXT.muted}>
          <code className="rounded-md bg-white px-1.5 py-0.5 text-[12px] font-semibold text-neutral-800">{file}</code> {description}
        </p>
      </div>
      {children}
    </section>
  );
}

// A white card of samples with a small heading.
export function Sample({
  title,
  children,
  className,
  tone = "white",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  tone?: "white" | "slab";
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-4", tone === "white" ? SURFACE.card : "rounded-3xl border border-dashed border-stroke-subtle", SURFACE.cardPadding, className)}>
      {title && <h3 className={TEXT.cardTitle}>{title}</h3>}
      {children}
    </div>
  );
}

// A row of samples that wraps; `label` names the row on its left (above
// it on phones).
export function Row({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:gap-4">
      {label && <p className={cx(TEXT.caption, "min-[1024px]:w-32 min-[1024px]:shrink-0")}>{label}</p>}
      <div className={cx("flex min-w-0 flex-1 flex-wrap items-center gap-3", className)}>{children}</div>
    </div>
  );
}

// A grid of field samples (two columns from 640, three from 1280).
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grid min-w-0 grid-cols-1 items-start gap-x-4 gap-y-5 min-[640px]:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>;
}

// A quiet line of what a sample does or returned.
export function Note({ children }: { children: ReactNode }) {
  return <p className={cx(TEXT.caption, "tabular-nums")}>{children}</p>;
}
