/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

const ARROW_SRC = "/figma-export/hero/arrow-up-right.svg";

type IconButtonStyle = {
  variant?: "primary" | "outlined";
  size?: "large" | "small";
  className?: string;
  iconSrc?: string;
  iconClassName?: string;
  "aria-label": string;
};

type IconAsLink = IconButtonStyle & {
  href: string;
} & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    keyof IconButtonStyle | "href"
  >;

type IconAsButton = IconButtonStyle & {
  href?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, keyof IconButtonStyle>;

export type IconButtonProps = IconAsLink | IconAsButton;

const sizeMap = {
  large: "size-[52px] rounded-[26px]",
  small: "size-[42px] rounded-[21px]",
};

const iconSizeMap = {
  large: "size-6",
  small: "size-4",
};

const variantMap = {
  primary:
    "bg-brand transition-transform duration-300 ease-out hover:rotate-12 hover:scale-105 active:scale-95",
  outlined:
    "border border-neutral-900 text-neutral-900 transition-all duration-300 hover:scale-105 hover:bg-neutral-900 hover:text-white active:scale-95",
};

export function IconButton(props: IconButtonProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "large";
  const iconSrc = props.iconSrc ?? ARROW_SRC;
  const iconClassName = props.iconClassName ?? iconSizeMap[size];

  const wrapper = `inline-flex shrink-0 cursor-pointer items-center justify-center ${sizeMap[size]} ${variantMap[variant]} ${props.className ?? ""}`.trim();
  const icon = (
    <img src={iconSrc} alt="" aria-hidden loading="lazy" decoding="async" className={iconClassName} />
  );

  if ("href" in props && typeof props.href === "string") {
    const {
      variant: _variant,
      size: _size,
      className: _className,
      iconSrc: _iconSrc,
      iconClassName: _iconClassName,
      href,
      ...rest
    } = props;
    void _variant;
    void _size;
    void _className;
    void _iconSrc;
    void _iconClassName;
    return (
      <Link href={href} className={wrapper} {...rest}>
        {icon}
      </Link>
    );
  }

  const {
    variant: _variant,
    size: _size,
    className: _className,
    iconSrc: _iconSrc,
    iconClassName: _iconClassName,
    type,
    ...rest
  } = props as IconAsButton;
  void _variant;
  void _size;
  void _className;
  void _iconSrc;
  void _iconClassName;
  return (
    <button type={type ?? "button"} className={wrapper} {...rest}>
      {icon}
    </button>
  );
}
