import { useId, type ReactNode } from "react";
import { cx } from "../lib/format";
import { FOCUS_RING_INSET, TEXT, type ControlSize } from "./tokens";

// Field: the frame of a form control. The label above (TEXT.label), the
// control, then the error (red, role="alert") or else the hint (caption).
//
// Every control of the kit (Input, Select, Combobox, Checkbox, DateInput,
// TagInput ...) takes label / hint / error / required / optional itself and
// wraps itself in a Field when it has a label, a hint or an error, so most
// screens never use Field directly:
//
//   <Input label="Назва" value={name} onChange={setName} error={errors.name} required />
//
// Field on its own frames a control that is not part of the kit. With a
// render function it hands the ids to wire:
//
//   <Field label="Колір" hint="Як на сайті" error={error}>
//     {(ids) => <ColorPicker id={ids.id} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
//   </Field>
//
// Props
// - label: the visible name. Without a label, give the control an
//   aria-label instead.
// - hint: a line of help under the control; hidden while there is an error.
// - error: the message under the control, in red, announced (role="alert").
//   `true` marks the control invalid without a message (the message is
//   shown elsewhere, for example a group error).
// - required: a red asterisk after the label (aria-hidden); the control gets
//   aria-required. Native `required` is not used, so the browser never shows
//   its own validation bubbles.
// - optional: a quiet "необов'язково" after the label (use it in forms where
//   most fields are required). Screen readers hear it as a word of its own
//   after the label.
// - labelAction: a small action at the right of the label line ("Згенерувати").
// - meta: something at the right of the hint line (a character counter).
// - htmlFor / labelId / hintId / errorId: the ids, when the control made them.
// - labelAs: "label" (default) or "span" for a label that names a group or a
//   button-like control through aria-labelledby.
// - disabled: greys the label.
// - className: on the outer block (grid spans, widths).
//
// useFieldIds(props) gives a control the ids and the aria wiring:
//   const ids = useFieldIds(props);
//   <input id={ids.id} aria-describedby={ids.describedBy} aria-invalid={ids.invalid || undefined} />
//
// The class constants below are the field's look (the FIELD of tokens.ts,
// drawn on a wrapper so icons, prefixes and buttons can sit inside the
// pill). The wrapper takes `data-invalid`, `data-disabled`, `data-readonly`.

export type FieldError = ReactNode | boolean;

// The props every control accepts for its frame.
export type FieldControlProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: FieldError;
  required?: boolean;
  optional?: boolean;
  labelAction?: ReactNode;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
};

export type FieldIds = {
  id: string;
  labelId: string;
  hintId: string;
  errorId: string;
  // What the control's aria-describedby should be (error, else hint, plus
  // any describedby the caller passed).
  describedBy: string | undefined;
  invalid: boolean;
};

// A prop that shows something (not undefined, null, false or "").
export function present(value: unknown): boolean {
  return value !== undefined && value !== null && value !== false && value !== "";
}

// The error text to print (a bare `true` marks invalid without one).
function errorText(error: FieldError): ReactNode {
  return present(error) && error !== true ? (error as ReactNode) : null;
}

export function useFieldIds(field: Pick<FieldControlProps, "id" | "hint" | "error" | "aria-describedby">): FieldIds {
  const base = useId();
  const invalid = present(field.error);
  const errorId = `${base}-error`;
  const hintId = `${base}-hint`;
  const own = errorText(field.error) !== null ? errorId : !invalid && present(field.hint) ? hintId : null;
  return {
    id: field.id ?? `${base}-control`,
    labelId: `${base}-label`,
    hintId,
    errorId,
    describedBy: cx(field["aria-describedby"], own) || undefined,
    invalid,
  };
}

// Whether a control should wrap itself in a Field.
export function hasField(field: FieldControlProps, meta?: ReactNode): boolean {
  return present(field.label) || present(field.hint) || present(errorText(field.error ?? null)) || present(meta);
}

export type FieldProps = Omit<FieldControlProps, "id" | "aria-label" | "aria-describedby"> & {
  htmlFor?: string;
  labelId?: string;
  hintId?: string;
  errorId?: string;
  labelAs?: "label" | "span";
  meta?: ReactNode;
  disabled?: boolean;
  children: ReactNode | ((ids: FieldIds) => ReactNode);
};

export function Field({
  label,
  hint,
  error,
  required = false,
  optional = false,
  labelAction,
  htmlFor,
  labelId,
  hintId,
  errorId,
  labelAs = "label",
  meta,
  disabled = false,
  children,
  className,
}: FieldProps) {
  const own = useFieldIds({ id: htmlFor, hint, error });
  const ids: FieldIds = {
    ...own,
    labelId: labelId ?? own.labelId,
    hintId: hintId ?? own.hintId,
    errorId: errorId ?? own.errorId,
  };
  const message = errorText(error ?? null);
  ids.describedBy = message !== null ? ids.errorId : !own.invalid && present(hint) ? ids.hintId : undefined;
  const rendered = typeof children === "function" ? children(ids) : children;
  const forId = typeof children === "function" ? ids.id : htmlFor;
  const showHint = message === null && !own.invalid && present(hint);

  const labelContent = (
    <>
      {label}
      {required && (
        <span aria-hidden className="ml-0.5 text-negative">
          *
        </span>
      )}
      {/* The hidden space keeps the marker apart from the label in the
          accessible name ("Назва необов'язково", not "Названеобов'язково");
          the visible gap is the margin. */}
      {optional && (
        <span className="ml-1.5 font-medium text-neutral-500">
          <span className="sr-only"> </span>
          {"необов'язково"}
        </span>
      )}
    </>
  );
  const labelClass = cx(TEXT.label, disabled && "text-neutral-400");

  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      {(present(label) || labelAction) && (
        <div className="flex min-h-[18px] items-end justify-between gap-3">
          {present(label) ? (
            labelAs === "label" && forId ? (
              <label id={ids.labelId} htmlFor={forId} className={labelClass}>
                {labelContent}
              </label>
            ) : (
              <span id={ids.labelId} className={labelClass}>
                {labelContent}
              </span>
            )
          ) : (
            <span />
          )}
          {/* As tall as the label: a small button here overflows the line
              instead of pushing the label down from its neighbours. */}
          {labelAction && <div className="flex h-[18px] shrink-0 items-center">{labelAction}</div>}
        </div>
      )}
      {rendered}
      {(message !== null || showHint || present(meta)) && (
        <div className="flex items-start justify-between gap-3">
          {message !== null ? (
            <p id={ids.errorId} role="alert" className={FIELD_ERROR}>
              {message}
            </p>
          ) : showHint ? (
            <p id={ids.hintId} className={TEXT.caption}>
              {hint}
            </p>
          ) : (
            <span />
          )}
          {present(meta) && <div className="shrink-0">{meta}</div>}
        </div>
      )}
    </div>
  );
}

// The frame a kit control puts around itself: a Field when there is
// something to frame, the bare control otherwise.
export function FieldFrame({
  field,
  ids,
  labelAs = "label",
  meta,
  disabled,
  children,
}: {
  field: FieldControlProps;
  ids: FieldIds;
  labelAs?: "label" | "span";
  meta?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (!hasField(field, meta)) return <>{children}</>;
  return (
    <Field
      label={field.label}
      hint={field.hint}
      error={field.error}
      required={field.required}
      optional={field.optional}
      labelAction={field.labelAction}
      htmlFor={labelAs === "label" ? ids.id : undefined}
      labelAs={labelAs}
      labelId={ids.labelId}
      hintId={ids.hintId}
      errorId={ids.errorId}
      meta={meta}
      disabled={disabled}
      className={field.className}
    >
      {children}
    </Field>
  );
}

// --- The field's look ----------------------------------------------------------

export const FIELD_ERROR = "text-[12px] font-medium leading-4 text-negative";

// FIELD of tokens.ts, keyed to :focus-within and data attributes, so it
// works on a wrapper that holds the input (and on a button trigger, which
// matches :focus-within itself). Stacked variants on the invalid and
// disabled states outrank the plain hover and focus ones.
export const FIELD_SURFACE =
  "border border-stroke-subtle bg-white text-neutral-900 transition-colors duration-200 motion-reduce:transition-none " +
  "hover:border-neutral-400 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand " +
  "data-[invalid=true]:border-negative data-[invalid=true]:hover:border-negative " +
  "data-[invalid=true]:focus-within:border-negative data-[invalid=true]:focus-within:ring-negative " +
  "data-[readonly=true]:bg-bg-subtle " +
  "data-[disabled=true]:cursor-not-allowed data-[disabled=true]:bg-bg-subtle data-[disabled=true]:text-neutral-400 " +
  "data-[disabled=true]:hover:border-stroke-subtle";

// The pill of single-line controls. No w-full: a block-level flex box
// already fills a block, a grid cell or a Field, and a width the caller
// passes in className (w-40 in a toolbar row) must not fight it.
export const FIELD_BOX = "relative flex min-w-0 items-center rounded-full " + FIELD_SURFACE;

// Inner spacing per control size. Left and right are separate, so a
// control with buttons at its end can tighten the right side only.
export const FIELD_GAP: Record<ControlSize, string> = { sm: "gap-1.5", md: "gap-2", lg: "gap-2.5" };
export const FIELD_PL: Record<ControlSize, string> = { sm: "pl-3", md: "pl-4", lg: "pl-5" };
export const FIELD_PR: Record<ControlSize, string> = { sm: "pr-3", md: "pr-4", lg: "pr-5" };
// The right side when the control ends with a round button (clear, eye):
// the button's circle is concentric with the pill's end (pill radius -
// button radius - the 1-px border).
export const FIELD_PR_ACTION: Record<ControlSize, string> = { sm: "pr-[3px]", md: "pr-[3px]", lg: "pr-[5px]" };

// Icons drawn inside a field (a magnifier, the chevron).
export const FIELD_ICON: Record<ControlSize, string> = { sm: "size-4", md: "size-[18px]", lg: "size-5" };

// A round button inside a field (clear, show password, steppers).
export const FIELD_ACTION =
  "flex shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors duration-200 " +
  "hover:bg-bg-cabinet hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent " +
  "motion-reduce:transition-none " +
  FOCUS_RING_INSET;
export const FIELD_ACTION_SIZE: Record<ControlSize, string> = { sm: "size-6", md: "size-8", lg: "size-9" };
