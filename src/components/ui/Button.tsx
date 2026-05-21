/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const ARROW_SRC = "/figma-export/hero/arrow-up-right.svg";

type ButtonStyle = {
  size?: "large" | "small";
  variant?: "solid" | "outlined" | "light";
  arrow?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = ButtonStyle & {
  href: string;
} & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    keyof ButtonStyle | "href"
  >;

type ButtonAsButton = ButtonStyle & {
  href?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, keyof ButtonStyle>;

export type ButtonProps = ButtonAsLink | ButtonAsButton;

// Sizes shrink slightly on mobile so long Ukrainian labels (e.g.
// "Домовитись про зустріч" = 22 chars) fit the narrow column without
// wrapping. Desktop keeps the Figma 18-px / 52-px arrow proportions.
const labelSize = {
  large:
    "rounded-[25px] px-5 py-[12px] text-[15px] whitespace-nowrap sm:rounded-[25px] sm:px-6 sm:py-[15px] sm:text-button-lg",
  small:
    "rounded-[24px] px-5 py-[10px] text-button-md whitespace-nowrap sm:px-6",
};

const arrowWrap = {
  large: "size-[44px] rounded-[22px] sm:size-[52px] sm:rounded-[26px]",
  small: "size-[38px] rounded-[19px] sm:size-[42px] sm:rounded-[21px]",
};

const arrowIcon = {
  large: "size-5 sm:size-6",
  small: "size-4",
};

const labelVariant = {
  solid:
    "bg-neutral-900 text-white transition-all duration-300 group-enabled:group-hover:bg-neutral-800 group-enabled:group-hover:translate-x-1",
  outlined:
    "border border-white text-white transition-all duration-300 group-enabled:group-hover:bg-white group-enabled:group-hover:text-neutral-900 group-enabled:group-hover:translate-x-1",
  light:
    "bg-bg-subtle text-neutral-900 transition-all duration-300 group-enabled:group-hover:bg-white group-enabled:group-hover:translate-x-1",
};

function ButtonInner({
  size,
  variant,
  arrow,
  children,
}: Required<Pick<ButtonStyle, "size" | "variant" | "arrow">> & {
  children: ReactNode;
}) {
  return (
    <>
      <span
        className={`inline-flex items-center justify-center ${labelSize[size]} ${labelVariant[variant]}`}
      >
        {children}
      </span>
      {arrow && (
        <span
          className={`inline-flex items-center justify-center bg-brand transition-transform duration-300 ease-out group-enabled:group-hover:rotate-12 group-enabled:group-hover:scale-110 ${arrowWrap[size]}`}
        >
          <img
            src={ARROW_SRC}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className={`transition-transform duration-300 group-enabled:group-hover:translate-x-0.5 group-enabled:group-hover:-translate-y-0.5 ${arrowIcon[size]}`}
          />
        </span>
      )}
    </>
  );
}

const wrapperClass = (className?: string) =>
  `group inline-flex shrink-0 cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`.trim();

export function Button(props: ButtonProps) {
  const size = props.size ?? "large";
  const variant = props.variant ?? "solid";
  const arrow = props.arrow ?? false;

  const inner = (
    <ButtonInner size={size} variant={variant} arrow={arrow}>
      {props.children}
    </ButtonInner>
  );

  if ("href" in props && typeof props.href === "string") {
    const {
      size: _size,
      variant: _variant,
      arrow: _arrow,
      className,
      children: _children,
      href,
      ...rest
    } = props;
    void _size;
    void _variant;
    void _arrow;
    void _children;
    return (
      <Link href={href} className={wrapperClass(className)} {...rest}>
        {inner}
      </Link>
    );
  }

  const {
    size: _size,
    variant: _variant,
    arrow: _arrow,
    className,
    children: _children,
    type,
    ...rest
  } = props as ButtonAsButton;
  void _size;
  void _variant;
  void _arrow;
  void _children;
  return (
    <button
      type={type ?? "button"}
      className={wrapperClass(className)}
      {...rest}
    >
      {inner}
    </button>
  );
}
