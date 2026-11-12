import { ArrowPathIcon, ExclamationTriangleIcon, InboxIcon, LockClosedIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { errorMessage, type ApiFailure } from "../lib/api";
import { cx } from "../lib/format";
import { Button } from "./Button";
import { Page } from "./Page";
import { Spinner } from "./Spinner";
import { SURFACE, TEXT, TONES } from "./tokens";

// The designed "nothing to show" states of the panel. No state is left
// blank: an empty list says what to do next, a failed request offers
// "Спробувати ще раз", a role without access says whom to ask.
//
//   <EmptyState title="Замовлень ще немає" text="Нові замовлення з'являться тут." action={<Button ...>} />
//   <ErrorState failure={orders.error} onRetry={orders.reload} />
//   if (!allowed) return <Forbidden />;           // in a page (server component)
//   <LoadingBlock label="Завантажуємо замовлення" />
//   <NotFoundState backHref="/admin/orders" backLabel="До списку замовлень" />
//
// EmptyState({ icon?, title, text?, action?, size? = "md" }): centred in the
//   card it sits in; a 52-px r12 icon tile with the cabinet's hairline ring
//   (InboxIcon by default). "lg" for a whole-page empty, "md" inside cards
//   and tables.
// ErrorState({ failure?, title?, text?, onRetry? }): the text defaults to
//   errorMessage(failure); the retry button shows only with onRetry.
// Forbidden(): a whole page (it brings its own Page column) for a role
//   without the permission of the screen.
// LoadingBlock({ label? }): a quiet spinner with a label, announced politely.
// NotFoundState({ title?, text?, backHref?, backLabel? }).
//
// No hooks and no "use client": the states render in server pages too.

const ICON_TILE = "flex size-[52px] shrink-0 items-center justify-center rounded-xl";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  size?: "md" | "lg";
  className?: string;
};

export function EmptyState({ icon, title, text, action, size = "md", className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex w-full flex-1 flex-col items-center justify-center px-6 text-center",
        size === "lg" ? "min-h-[360px] py-16" : "py-12",
        className,
      )}
    >
      <span className={cx(ICON_TILE, "border border-stroke-default text-neutral-800")}>
        {icon ?? <InboxIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      </span>
      <p className={cx(size === "lg" ? TEXT.sectionTitle : TEXT.cardTitle, "mt-4")}>{title}</p>
      {text && <p className={cx(TEXT.muted, "mt-1.5 max-w-[380px]")}>{text}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export type ErrorStateProps = {
  failure?: ApiFailure | null;
  title?: ReactNode;
  text?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ failure, title = "Не вдалося завантажити дані", text, onRetry, className }: ErrorStateProps) {
  const message = text ?? (failure ? errorMessage(failure) : "Сталася помилка. Спробуйте ще раз.");
  return (
    <div role="alert" className={cx("flex w-full flex-1 flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className={ICON_TILE} style={{ backgroundColor: TONES.red.bg, color: TONES.red.text }}>
        <ExclamationTriangleIcon aria-hidden className="size-6" strokeWidth={1.7} />
      </span>
      <p className={cx(TEXT.cardTitle, "mt-4")}>{title}</p>
      <p className={cx(TEXT.muted, "mt-1.5 max-w-[380px]")}>{message}</p>
      {onRetry && (
        <Button onClick={onRetry} iconLeft={<ArrowPathIcon strokeWidth={1.7} />} className="mt-5">
          Спробувати ще раз
        </Button>
      )}
    </div>
  );
}

export function Forbidden() {
  return (
    <Page width="narrow">
      <div className={cx(SURFACE.card, "flex flex-1 flex-col items-center justify-center px-6 py-16 text-center")}>
        <span className={cx(ICON_TILE, "border border-stroke-default text-neutral-800")}>
          <LockClosedIcon aria-hidden className="size-6" strokeWidth={1.7} />
        </span>
        <h1 className={cx(TEXT.sectionTitle, "mt-4")}>Немає доступу</h1>
        <p className={cx(TEXT.muted, "mt-1.5 max-w-[420px]")}>У вашої ролі немає доступу до цього розділу.</p>
        <p className={cx(TEXT.muted, "mt-1 max-w-[420px]")}>
          Якщо доступ потрібен для роботи, попросіть адміністратора додати дозвіл вашій ролі.
        </p>
        <Button variant="secondary" href="/admin/account" className="mt-6">
          Мій акаунт
        </Button>
      </div>
    </Page>
  );
}

export function LoadingBlock({ label = "Завантаження...", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cx("flex w-full flex-1 items-center justify-center gap-3 px-6 py-12", className)}>
      <Spinner className="text-neutral-500" />
      <span className={TEXT.muted}>{label}</span>
    </div>
  );
}

export type NotFoundStateProps = {
  title?: ReactNode;
  text?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function NotFoundState({
  title = "Запис не знайдено",
  text = "Можливо, його вже видалили або адреса неточна.",
  backHref,
  backLabel = "Повернутися до списку",
  className,
}: NotFoundStateProps) {
  return (
    <EmptyState
      size="lg"
      className={className}
      icon={<MagnifyingGlassIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title={title}
      text={text}
      action={
        backHref ? (
          <Button variant="secondary" href={backHref}>
            {backLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
