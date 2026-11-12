import Link from "next/link";
import {
  isValidElement,
  type AriaAttributes,
  type ComponentType,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SVGProps,
} from "react";
import { cx } from "../lib/format";
import { Spinner } from "./Spinner";
import { CONTROL, COLOR_TRANSITION, FOCUS_RING, type ControlSize } from "./tokens";

// Buttons of the panel: pills, as on the site and in the B2B cabinet.
//
//   <Button onClick={save} loading={saving}>Зберегти зміни</Button>
//   <Button variant="secondary" iconLeft={PlusIcon} href="/admin/products/new">Додати товар</Button>
//   <Button variant="accent" type="submit">Створити накладну</Button>
//   <Button variant="ghost" size="sm" href="/" external>Відкрити на сайті</Button>
//   <Button variant="dangerGhost" onClick={remove}>Видалити</Button>
//   <IconButton label="Редагувати" icon={PencilSquareIcon} onClick={edit} />
//   <ButtonGroup><Button variant="secondary">Скасувати</Button><Button>Зберегти</Button></ButtonGroup>
//
// Button props
// - variant: "primary" (default) black pill that inverts to white with a
//   black border on hover, the site's Button; "accent" the brand-orange
//   pill (one per screen at most: the action the page exists for);
//   "secondary" white pill with the #343435 hairline, fills black on hover;
//   "ghost" no border, a light tint on hover (toolbars, "Скасувати" in
//   dense rows); "danger" the red fill for an irreversible action in a
//   confirm; "dangerGhost" red text, for "Видалити" next to other actions.
// - size: "sm" 32, "md" 40 (default), "lg" 48 px tall; the same heights as
//   inputs and selects (CONTROL in tokens.ts), so a row of controls lines up.
// - loading: a spinner takes the place of iconLeft (or covers the label
//   when there is no icon), the width does not change, aria-busy is set and
//   clicks and submits are blocked. The button stays focusable, so the
//   keyboard focus is not lost while a request runs.
// - disabled: the cabinet's disabled pill (#e8e8e9 fill, #a5a5a5 label).
// - iconLeft / iconRight: a Heroicon component (iconLeft={PlusIcon}), sized
//   and stroked by the button; or an element (iconLeft={<PlusIcon />}) when
//   the button is rendered by a server component, which cannot pass a
//   component.
// - fullWidth: stretches to the parent's width.
// - href: renders next/link; with external, a plain <a target="_blank"
//   rel="noreferrer"> (links to the storefront are always external, so the
//   site boots from a full load). A disabled or loading link renders as an
//   inert span.
// - type: "button" by default (never an accidental submit).
// - onClick, onKeyDown, title, id, tabIndex, form, name, value and aria-*
//   go to the element (so a Button can be the trigger of a DropdownMenu or
//   a Popover: <DropdownMenu trigger={<Button ...>Експорт</Button>} />).
//
// IconButton props: label (required: becomes aria-label and title), icon,
// variant "ghost" (default) | "secondary" | "primary" | "danger" (a red
// glyph, for the trash icon of a row), size sm 32 / md 40 / lg 48, href,
// external, loading, disabled, pressed (aria-pressed for toggles), onClick,
// onKeyDown, ref, aria-controls / aria-expanded / aria-haspopup. A ghost
// IconButton that opens a layer shows a brand glyph while it is open
// (aria-expanded), the kebab of a row for example.
//
// ButtonGroup: a row of related buttons with the kit's gap; align "start",
// "end" or "between"; label gives the row role="group" with that name.

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;
export type IconSlot = IconType | ReactElement;

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "dangerGhost";

type AriaProps = Pick<
  AriaAttributes,
  | "aria-label"
  | "aria-labelledby"
  | "aria-describedby"
  | "aria-controls"
  | "aria-expanded"
  | "aria-haspopup"
  | "aria-pressed"
  | "aria-current"
>;

type CommonProps = AriaProps & {
  variant?: ButtonVariant;
  size?: ControlSize;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: IconSlot;
  iconRight?: IconSlot;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
  id?: string;
  tabIndex?: number;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
};

export type ButtonProps = CommonProps &
  (
    | { href?: undefined; external?: undefined; type?: "button" | "submit" | "reset"; form?: string; name?: string; value?: string }
    | { href: string; external?: boolean; type?: undefined; form?: undefined; name?: undefined; value?: undefined }
  );

// Hover classes are separate from the resting look, so a disabled or busy
// button simply does not get them (no specificity fight with `disabled:`).
const LOOK: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-neutral-900 text-white",
  accent: "border-transparent bg-brand text-white",
  secondary: "border-neutral-800 bg-white text-neutral-900",
  ghost: "border-transparent bg-transparent text-neutral-800",
  danger: "border-transparent bg-negative text-white",
  dangerGhost: "border-transparent bg-transparent text-negative",
};

const HOVER: Record<ButtonVariant, string> = {
  primary: "hover:border-neutral-900 hover:bg-white hover:text-neutral-900",
  accent: "hover:border-brand hover:bg-white hover:text-brand",
  secondary: "hover:border-neutral-900 hover:bg-neutral-900 hover:text-white",
  ghost: "hover:bg-bg-subtle hover:text-neutral-900",
  danger: "hover:border-negative hover:bg-white hover:text-negative",
  dangerGhost: "hover:bg-[#fff0f0]",
};

// Filled pills turn into the cabinet's disabled pill; text-only ones just fade.
const DISABLED: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-button-disabled text-neutral-300",
  accent: "border-transparent bg-button-disabled text-neutral-300",
  secondary: "border-stroke-subtle bg-white text-neutral-300",
  ghost: "border-transparent bg-transparent text-neutral-300",
  danger: "border-transparent bg-button-disabled text-neutral-300",
  dangerGhost: "border-transparent bg-transparent text-neutral-300",
};

// The 1-px border is part of the box, so every padding is one px less
// than the visual inset (the site's Button does the same). The side with
// an icon is a little tighter: an icon reads as part of the padding.
const PAD_LEFT: Record<ControlSize, string> = { sm: "pl-[13px]", md: "pl-[17px]", lg: "pl-[23px]" };
const PAD_LEFT_ICON: Record<ControlSize, string> = { sm: "pl-[9px]", md: "pl-[13px]", lg: "pl-[17px]" };
const PAD_RIGHT: Record<ControlSize, string> = { sm: "pr-[13px]", md: "pr-[17px]", lg: "pr-[23px]" };
const PAD_RIGHT_ICON: Record<ControlSize, string> = { sm: "pr-[9px]", md: "pr-[13px]", lg: "pr-[17px]" };
const GAP: Record<ControlSize, string> = { sm: "gap-1.5", md: "gap-2", lg: "gap-2" };
const ICON: Record<ControlSize, string> = { sm: "size-4", md: "size-5", lg: "size-5" };
const SPINNER: Record<ControlSize, "sm" | "md"> = { sm: "sm", md: "md", lg: "md" };

const BASE =
  "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-full border font-semibold motion-reduce:transition-none";

// Renders an icon slot at the button's icon size.
export function SlotIcon({ icon, className }: { icon: IconSlot; className: string }) {
  if (isValidElement(icon)) {
    return (
      <span aria-hidden className={cx("inline-flex shrink-0 items-center justify-center [&>svg]:size-full", className)}>
        {icon}
      </span>
    );
  }
  const Icon = icon;
  return <Icon aria-hidden strokeWidth={1.7} className={cx("shrink-0", className)} />;
}

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    children,
    className,
    onClick,
    ref,
    href,
    external,
    type,
    form,
    name,
    value,
    ...rest
  } = props;
  const inactive = disabled || loading;
  const classes = cx(
    BASE,
    CONTROL[size],
    COLOR_TRANSITION,
    FOCUS_RING,
    GAP[size],
    iconLeft || loading ? PAD_LEFT_ICON[size] : PAD_LEFT[size],
    iconRight ? PAD_RIGHT_ICON[size] : PAD_RIGHT[size],
    disabled ? DISABLED[variant] : LOOK[variant],
    !inactive && HOVER[variant],
    disabled && "cursor-not-allowed",
    loading && "cursor-progress",
    fullWidth && "w-full",
    className,
  );

  // With an icon the spinner takes its place; without one it covers the
  // label, which stays in the flow (invisible) so the width holds.
  const coverLabel = loading && !iconLeft;
  const content = (
    <>
      {loading && iconLeft ? (
        <Spinner size={SPINNER[size]} className={ICON[size]} />
      ) : iconLeft ? (
        <SlotIcon icon={iconLeft} className={ICON[size]} />
      ) : null}
      <span className={cx("min-w-0 truncate", coverLabel && "invisible")}>{children}</span>
      {iconRight && <SlotIcon icon={iconRight} className={cx(ICON[size], coverLabel && "invisible")} />}
      {coverLabel && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={SPINNER[size]} />
        </span>
      )}
    </>
  );

  // Only wrap the handler when there is one: a server component may render
  // a plain link button, and it cannot pass functions to the DOM.
  const handleClick = onClick
    ? (event: MouseEvent<HTMLElement>) => {
        if (inactive) {
          event.preventDefault();
          return;
        }
        onClick(event);
      }
    : undefined;

  if (href !== undefined) {
    if (inactive) {
      return (
        <span {...rest} role="link" aria-disabled="true" aria-busy={loading || undefined} className={classes}>
          {content}
        </span>
      );
    }
    if (external) {
      return (
        <a
          {...rest}
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={handleClick}
          className={classes}
        >
          {content}
        </a>
      );
    }
    return (
      <Link {...rest} ref={ref as Ref<HTMLAnchorElement>} href={href} onClick={handleClick} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      ref={ref as Ref<HTMLButtonElement>}
      // A busy submit button must not submit again.
      type={loading ? "button" : (type ?? "button")}
      form={form}
      name={name}
      value={value}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      className={classes}
    >
      {content}
    </button>
  );
}

// --- IconButton --------------------------------------------------------------

export type IconButtonVariant = "ghost" | "secondary" | "primary" | "danger";

export type IconButtonProps = Pick<AriaProps, "aria-controls" | "aria-expanded" | "aria-haspopup" | "aria-describedby"> & {
  label: string;
  icon: IconSlot;
  variant?: IconButtonVariant;
  size?: ControlSize;
  href?: string;
  external?: boolean;
  loading?: boolean;
  disabled?: boolean;
  pressed?: boolean;
  type?: "button" | "submit";
  title?: string;
  id?: string;
  tabIndex?: number;
  className?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
};

const ROUND: Record<ControlSize, string> = { sm: "size-8", md: "size-10", lg: "size-12" };
const ROUND_ICON: Record<ControlSize, string> = { sm: "size-[18px]", md: "size-5", lg: "size-6" };

const ICON_LOOK: Record<IconButtonVariant, string> = {
  ghost: "border-transparent bg-transparent text-neutral-700",
  secondary: "border-neutral-800 bg-white text-neutral-900",
  primary: "border-transparent bg-neutral-900 text-white",
  danger: "border-transparent bg-transparent text-negative",
};

// The ghost's open state outranks its hover (an attribute variant is more
// specific than a plain class).
const ICON_HOVER: Record<IconButtonVariant, string> = {
  ghost: "hover:bg-bg-subtle hover:text-neutral-900 aria-expanded:bg-bg-subtle aria-expanded:text-brand",
  secondary: "hover:border-neutral-900 hover:bg-neutral-900 hover:text-white",
  primary: "hover:border-neutral-900 hover:bg-white hover:text-neutral-900",
  danger: "hover:bg-[#fff0f0]",
};

const ICON_DISABLED: Record<IconButtonVariant, string> = {
  ghost: "border-transparent bg-transparent text-neutral-300",
  secondary: "border-stroke-subtle bg-white text-neutral-300",
  primary: "border-transparent bg-button-disabled text-neutral-300",
  danger: "border-transparent bg-transparent text-neutral-300",
};

// A pressed toggle (a "pinned" filter, a view switch) reads as active.
const PRESSED = "border-transparent bg-neutral-900 text-white";

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  href,
  external = false,
  loading = false,
  disabled = false,
  pressed,
  type = "button",
  title,
  className,
  onClick,
  ref,
  ...rest
}: IconButtonProps) {
  const inactive = disabled || loading;
  const classes = cx(
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border motion-reduce:transition-none",
    ROUND[size],
    COLOR_TRANSITION,
    FOCUS_RING,
    disabled ? ICON_DISABLED[variant] : pressed ? PRESSED : ICON_LOOK[variant],
    !inactive && !pressed && ICON_HOVER[variant],
    disabled && "cursor-not-allowed",
    loading && "cursor-progress",
    className,
  );
  const glyph = loading ? (
    <Spinner size={size === "sm" ? "sm" : "md"} />
  ) : (
    <SlotIcon icon={icon} className={ROUND_ICON[size]} />
  );
  const handleClick = onClick
    ? (event: MouseEvent<HTMLElement>) => {
        if (inactive) {
          event.preventDefault();
          return;
        }
        onClick(event);
      }
    : undefined;

  if (href !== undefined) {
    if (inactive) {
      return (
        <span {...rest} role="link" aria-label={label} title={title ?? label} aria-disabled="true" className={classes}>
          {glyph}
        </span>
      );
    }
    const linkProps = { ...rest, "aria-label": label, title: title ?? label, onClick: handleClick, className: classes };
    return external ? (
      <a {...linkProps} ref={ref as Ref<HTMLAnchorElement>} href={href} target="_blank" rel="noreferrer">
        {glyph}
      </a>
    ) : (
      <Link {...linkProps} ref={ref as Ref<HTMLAnchorElement>} href={href}>
        {glyph}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      ref={ref as Ref<HTMLButtonElement>}
      type={loading ? "button" : type}
      aria-label={label}
      title={title ?? label}
      aria-pressed={pressed}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      disabled={disabled}
      onClick={handleClick}
      className={classes}
    >
      {glyph}
    </button>
  );
}

// --- ButtonGroup -------------------------------------------------------------

export type ButtonGroupProps = {
  children: ReactNode;
  align?: "start" | "end" | "between";
  label?: string;
  className?: string;
};

const ALIGN: Record<NonNullable<ButtonGroupProps["align"]>, string> = {
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
};

export function ButtonGroup({ children, align = "start", label, className }: ButtonGroupProps) {
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      className={cx("flex flex-wrap items-center gap-2", ALIGN[align], className)}
    >
      {children}
    </div>
  );
}
