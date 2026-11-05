"use client";

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ChoiceRow, RadioGroup } from "@/components/ui/ChoiceRow";
import { Sheet, SheetDivider } from "@/components/ui/Sheet";
import { DotIcon } from "@/components/platform/ui";
import {
  RETURN_DELIVERY,
  RETURN_REASONS,
  RETURN_SOLUTIONS,
  formatDate,
  formatMoney,
  formatQty,
  lineSum,
  type Order,
  type OrderItem,
} from "./data";
import type { ReturnWizardState } from "./ReturnWizardModal";

const COPY = {
  title: "Оформити повернення",
  shortTitle: "Повернення",
  close: "Закрити оформлення повернення",
  steps: ["Оберіть товари", "Причина повернення", "Рішення та доставка"],
  counter: (step: number) => `${step}/3`,
  hint: "Повертається вся доступна кількість товару.",
  selectAll: "Обрати всі товари",
  chosen: (n: number, total: number) => `Обрано: ${n} з ${total}`,
  next: "Далі",
  back: "Назад",
  send: "Надіслати запит",
  noItems: "Оберіть хоча б один товар",
  reasonError: "Оберіть причину повернення",
  solution: "Бажане рішення",
  delivery: "Варіанти зворотньої доставки",
  solutionError: "Оберіть бажане рішення",
  deliveryError: "Оберіть спосіб повернення",
  article: (article: string) => `Артикул: ${article}`,
} as const;

// «<-» of the footer back text button (heroicons-outline arrow-left 16).
function ArrowLeft16({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M7.03 3.47a.75.75 0 0 1 0 1.06L4.31 7.25H12.5a.75.75 0 0 1 0 1.5H4.31l2.72 2.72a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Parts separated by the 14-px dot; each part stays on one line and keeps
// its dot at its end, so a wrapped line never starts with a dot.
function Parts({ parts }: { parts: ReactNode[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1 whitespace-nowrap">
          {part}
          {i < parts.length - 1 && <DotIcon className="size-[14px] shrink-0" />}
        </span>
      ))}
    </span>
  );
}

const ERROR = "text-[12px] font-medium leading-4 text-negative";

// The return wizard on phones (order-detail spec 2.10, template T5e,
// DECISIONS D7): the full-screen sheet of ui/Sheet with the Quizz Card
// (3111:14541) as the step frame - a #2d2d2f band with the «1/3» counter
// and the step title, over the white r32 panel with the 1-px #1d1d1f ring
// (px 24, pt 32, pb 48 incl. the ring). Three steps: the lines to return
// (checkbox rows, select-all), a reason per ticked line (radio rows), the
// solution + the return delivery (radio groups). The footer (pinned, static
// below 500 px of height) carries the selection count or the back text
// button and the primary pill. A premature «Далі» flags what is missing
// and focuses it. The answers live in ReturnWizardModal (`state`); only
// the step is local (back to 1 whenever the sheet closes).
export function ReturnWizardSheet({
  order,
  items,
  open,
  state,
  onClose,
  onSubmit,
}: {
  order: Order;
  items: OrderItem[];
  open: boolean;
  state: ReturnWizardState;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { selected, setSelected, reasons, setReasons, solution, setSolution, delivery, setDelivery, allSelected, toggle } =
    state;
  const uid = useId();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // The step whose «Далі» was pressed too early (its errors show).
  const [tried, setTried] = useState<0 | 1 | 2 | 3>(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const chosen = items.filter((it) => selected.has(it.id));

  // A new step starts at the top of the sheet with the focus on its title
  // (screen readers hear the step; no ring for programmatic focus).
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    if (!open) return;
    bodyRef.current?.parentElement?.scrollTo({ top: 0 });
    stepTitleRef.current?.focus({ preventScroll: true });
  }, [step, open]);

  const go = (next: 1 | 2 | 3) => {
    setTried(0);
    setStep(next);
  };

  // Focus the first control of what is missing; a radio group is scrolled
  // into view whole first, so its head and its error show too.
  const focusName = (name: string) => {
    const el = contentRef.current?.querySelector<HTMLElement>(`[name="${name}"]`);
    const group = el?.closest<HTMLElement>('[role="radiogroup"]');
    group?.scrollIntoView({ block: "start" });
    el?.focus({ preventScroll: Boolean(group) });
  };

  const next = () => {
    if (step === 1) {
      if (selected.size === 0) {
        setTried(1);
        if (items[0]) focusName(`return-item-${items[0].id}`);
        return;
      }
      go(2);
      return;
    }
    if (step === 2) {
      const missing = chosen.find((it) => !reasons[it.id]);
      if (missing) {
        setTried(2);
        focusName(`return-reason-choice-${missing.id}`);
        return;
      }
      go(3);
      return;
    }
    if (solution === "" || delivery === "") {
      setTried(3);
      focusName(solution === "" ? "return-solution-choice" : "return-delivery-choice");
      return;
    }
    onSubmit();
  };

  const footer = (
    <div className="flex items-center justify-between gap-4">
      {step === 1 ? (
        <p aria-live="polite" className="min-w-0 text-[14px] font-medium leading-5 text-neutral-500">
          {COPY.chosen(selected.size, items.length)}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => go(step === 3 ? 2 : 1)}
          className="-ml-2 flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-2 text-[16px] font-medium leading-[22px] text-neutral-700 outline-none transition-colors duration-200 hover:text-brand active:text-brand motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft16 className="size-4 shrink-0" />
          {COPY.back}
        </button>
      )}
      <Button
        size="small"
        variant={step === 3 ? "accent" : "solid"}
        aria-disabled={step === 1 ? selected.size === 0 : step === 2 ? chosen.some((it) => !reasons[it.id]) : !state.valid}
        onClick={next}
      >
        {step === 3 ? COPY.send : COPY.next}
      </Button>
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={COPY.title}
      shortTitle={COPY.shortTitle}
      closeLabel={COPY.close}
      initialFocus={stepTitleRef}
      bodyRef={bodyRef}
      footer={footer}
      closeOnDesktop={false}
      onSettled={() => {
        setStep(1);
        setTried(0);
      }}
    >
      <div className="text-[14px] leading-5 text-neutral-500">
        <Parts parts={[`№${order.number}`, formatDate(order.date)]} />
      </div>
      <div ref={contentRef} className="mt-6 overflow-hidden rounded-[32px] bg-[#2d2d2f]">
        <div className="flex items-center gap-8 p-6">
          <span className="shrink-0 text-[16px] leading-6 tabular-nums text-white">{COPY.counter(step)}</span>
          <h3
            ref={stepTitleRef}
            tabIndex={-1}
            className="min-w-0 flex-1 text-[24px] font-semibold leading-7 tracking-[-0.48px] text-white outline-none"
          >
            {COPY.steps[step - 1]}
          </h3>
        </div>
        <div className="rounded-[32px] border border-neutral-900 bg-white px-[23px] pb-[47px] pt-[31px]">
          {step === 1 && (
            <>
              <p className="text-[14px] leading-5 text-neutral-500">{COPY.hint}</p>
              {tried === 1 && selected.size === 0 && (
                <p role="alert" className={`mt-2 ${ERROR}`}>
                  {COPY.noItems}
                </p>
              )}
              <div className="mt-6 flex flex-col">
                {items.length > 1 && (
                  <>
                    <ChoiceRow
                      type="checkbox"
                      name="return-all"
                      labelTone="control"
                      checked={allSelected}
                      onChange={(on) => setSelected(on ? new Set(items.map((it) => it.id)) : new Set())}
                      label={COPY.selectAll}
                    />
                    <div aria-hidden className="my-6 h-px shrink-0 bg-stroke-subtle" />
                  </>
                )}
                <div role="group" aria-label={COPY.steps[0]} className="flex flex-col gap-10">
                  {items.map((it) => (
                    <ChoiceRow
                      key={it.id}
                      type="checkbox"
                      name={`return-item-${it.id}`}
                      checked={selected.has(it.id)}
                      onChange={(on) => toggle(it.id, on)}
                      invalid={tried === 1 && selected.size === 0}
                      label={<span className="line-clamp-2">{it.name}</span>}
                      hint={
                        <Parts
                          parts={[COPY.article(it.article), formatQty(it.qty, it.unit), formatMoney(lineSum(it))]}
                        />
                      }
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col">
              {chosen.map((it, i) => {
                const headId = `${uid}-head-${it.id}`;
                const errorId = `${uid}-error-${it.id}`;
                const missing = tried === 2 && !reasons[it.id];
                return (
                  <Fragment key={it.id}>
                    {i > 0 && <SheetDivider />}
                    <div
                      role="radiogroup"
                      aria-labelledby={headId}
                      aria-invalid={missing ? true : undefined}
                      aria-describedby={missing ? errorId : undefined}
                      data-group={it.id}
                      className="flex scroll-mt-6 flex-col"
                    >
                      <p id={headId} className="line-clamp-2 text-title-sm text-neutral-900">
                        {it.name}
                      </p>
                      <p className="mt-1 text-[14px] leading-5 text-neutral-500">
                        <Parts parts={[formatQty(it.qty, it.unit), formatMoney(lineSum(it))]} />
                      </p>
                      {missing && (
                        <p id={errorId} className={`mt-2 ${ERROR}`}>
                          {COPY.reasonError}
                        </p>
                      )}
                      <div className="mt-6 flex flex-col gap-10">
                        {RETURN_REASONS.map((r) => (
                          <ChoiceRow
                            key={r}
                            type="radio"
                            name={`return-reason-choice-${it.id}`}
                            value={r}
                            checked={reasons[it.id] === r}
                            onChange={(c) => {
                              if (c) setReasons((prev) => ({ ...prev, [it.id]: r }));
                            }}
                            invalid={missing}
                            label={r}
                          />
                        ))}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col">
              <RadioGroup
                name="return-solution-choice"
                label={COPY.solution}
                options={RETURN_SOLUTIONS.map((r) => ({ value: r, label: r }))}
                value={solution}
                onChange={setSolution}
                error={tried === 3 && solution === "" ? COPY.solutionError : undefined}
              />
              <SheetDivider />
              <RadioGroup
                name="return-delivery-choice"
                label={COPY.delivery}
                options={RETURN_DELIVERY.map((r) => ({ value: r, label: r }))}
                value={delivery}
                onChange={setDelivery}
                error={tried === 3 && delivery === "" ? COPY.deliveryError : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
