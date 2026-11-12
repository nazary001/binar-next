"use client";

import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from "react";
import { cx } from "../lib/format";
import { useStickyBar } from "./stickyBars";
import { FLOAT_SHADOW, SURFACE, TEXT, Z } from "./tokens";

// The layout of edit screens: sections as white cards, fields in a grid,
// the buttons at the end, and the two hooks every edit form needs.
//
//   const [form, setForm] = useState(initial);
//   const dirty = useDirty(loaded, form);
//   useUnsavedWarning(dirty);
//   ...
//   <form onSubmit={save} noValidate className="flex flex-col gap-4">
//     <FormSection title="Основне" description="Що бачить покупець у картці товару.">
//       <FormGrid>
//         <Input label="Назва" value={form.name} onChange={(name) => setForm({ ...form, name })} className="col-span-full" />
//         <MoneyInput label="Ціна" value={form.price} onChange={(price) => setForm({ ...form, price })} />
//         <Select label="Одиниця" value={form.unit} onChange={(unit) => setForm({ ...form, unit })} options={UNITS} />
//       </FormGrid>
//     </FormSection>
//     <FormActions sticky status={dirty ? "Є незбережені зміни" : "Усі зміни збережено"}>
//       <Button variant="secondary" onClick={reset} disabled={!dirty}>Скасувати</Button>
//       <Button type="submit" loading={saving} disabled={!dirty}>Зберегти зміни</Button>
//     </FormActions>
//   </form>
//
// FormSection props: title, description, children (the fields), aside
// (under the description: a status, a link to the help), actions (at the
// right of the title: a small button), id (an anchor), titleAs ("h2"
// default), className. From 1280 px the title sits in a 280-px column on
// the left of the fields; below that it is above them.
//
// FormGrid props: columns (1 | 2 default | 3), children, className. One
// column below 640 px, two from 640, three from 1536 (columns 3). A field
// that needs the full row takes className="col-span-full".
//
// FormActions props: children (the buttons, the main one last), status (a
// quiet line on the left: "Є незбережені зміни"), sticky (sticks to the
// bottom of the window on a white r24 bar with the floating shadow, for
// long forms), align ("end" default | "start" | "between"), className.
// On phones the buttons share the row equally. A sticky bar registers
// itself (ui/stickyBars.ts), so the toast stack rises above it instead of
// covering its buttons.
// idle (with sticky): the form has nothing to save. Below 640 px the bar
// then shrinks to the status line alone (the buttons, all off, are left
// out), about 44 px instead of 110; it grows back with the first edit.
// From 640 px nothing changes.
//
// useDirty(initial, current): true when `current` differs from what was
// loaded, compared as JSON with sorted keys (the order of keys does not
// count, undefined fields equal missing ones). False while `initial` is
// null or undefined (nothing loaded yet).
//
// useUnsavedWarning(dirty, { message?, links? }): while dirty, the browser
// asks before the tab closes or reloads; with links (default true) a press
// on an in-panel link asks too (window.confirm), because the side menu
// would drop the edits silently. Put data-unsaved-ignore on a link that
// must not ask (a link that opens a new tab never asks).

// --- FormSection -------------------------------------------------------------------

export type FormSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
  id?: string;
  titleAs?: "h2" | "h3";
  className?: string;
};

export function FormSection({ title, description, children, aside, actions, id, titleAs = "h2", className }: FormSectionProps) {
  const headingId = useId();
  const Heading = titleAs;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cx(
        SURFACE.card,
        SURFACE.cardPadding,
        "xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-x-10",
        className,
      )}
    >
      <div className="mb-5 flex min-w-0 flex-col xl:mb-0">
        <div className="flex items-start justify-between gap-3">
          <Heading id={headingId} className={TEXT.cardTitle}>
            {title}
          </Heading>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {description && <p className={cx(TEXT.muted, "mt-1.5")}>{description}</p>}
        {aside && <div className="mt-4">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

// --- FormGrid ------------------------------------------------------------------------

export type FormGridProps = {
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
};

const COLUMNS: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 min-[640px]:grid-cols-2",
  3: "grid-cols-1 min-[640px]:grid-cols-2 2xl:grid-cols-3",
};

export function FormGrid({ columns = 2, children, className }: FormGridProps) {
  return <div className={cx("grid items-start gap-x-4 gap-y-5", COLUMNS[columns], className)}>{children}</div>;
}

// --- FormActions -----------------------------------------------------------------------

export type FormActionsProps = {
  children: ReactNode;
  status?: ReactNode;
  sticky?: boolean;
  idle?: boolean;
  align?: "start" | "end" | "between";
  className?: string;
};

const JUSTIFY: Record<NonNullable<FormActionsProps["align"]>, string> = {
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
};

export function FormActions({ children, status, sticky = false, idle = false, align = "end", className }: FormActionsProps) {
  const bar = useRef<HTMLDivElement>(null);
  useStickyBar(bar, sticky);
  // The slim phone bar needs a status to show; without one it keeps the buttons.
  const slim = sticky && idle && Boolean(status);
  return (
    <div
      ref={bar}
      data-sticky-bar={sticky ? "" : undefined}
      className={cx(
        "flex flex-col gap-3 min-[640px]:flex-row min-[640px]:flex-wrap min-[640px]:items-center",
        status ? "min-[640px]:justify-between" : JUSTIFY[align],
        sticky && cx("sticky bottom-4 rounded-3xl bg-white p-3 min-[1024px]:px-4", FLOAT_SHADOW, Z.sticky),
        slim && "max-[639px]:px-4 max-[639px]:py-3",
        className,
      )}
    >
      {status && (
        <div role="status" className={cx(TEXT.muted, "min-w-0 min-[640px]:flex-1")}>
          {status}
        </div>
      )}
      <div
        className={cx(
          "flex flex-wrap items-center gap-2 [&>*]:flex-1 min-[640px]:[&>*]:flex-none",
          align === "between" && !status && "min-[640px]:w-full min-[640px]:justify-between",
          slim && "max-[639px]:hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// --- useDirty ----------------------------------------------------------------------------

// JSON with the keys of every object sorted, so two equal forms always
// give the same text.
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry) && !(entry instanceof Date)) {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(entry as Record<string, unknown>).sort()) {
        sorted[key] = (entry as Record<string, unknown>)[key];
      }
      return sorted;
    }
    return entry;
  });
}

export function useDirty<T>(initial: T | null | undefined, current: T): boolean {
  if (initial === null || initial === undefined) return false;
  return stableJson(initial) !== stableJson(current);
}

// --- useUnsavedWarning ---------------------------------------------------------------------

export type UnsavedWarningOptions = {
  message?: string;
  links?: boolean;
};

const DEFAULT_MESSAGE = "Є незбережені зміни. Залишити сторінку без збереження?";

export function useUnsavedWarning(dirty: boolean, { message = DEFAULT_MESSAGE, links = true }: UnsavedWarningOptions = {}): void {
  const ask = useEffectEvent(() => window.confirm(message));

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // Browsers show their own text; returnValue is what asks for it.
      event.preventDefault();
      event.returnValue = "";
    };
    // Capture on the window runs before next/link's own click handler, so a
    // refused navigation never starts.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank" || link.hasAttribute("download") || link.closest("[data-unsaved-ignore]")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // A jump within the page (an anchor) loses nothing.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (ask()) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    if (links) window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (links) window.removeEventListener("click", onClick, true);
    };
  }, [dirty, links]);
}
